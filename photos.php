<?php
declare(strict_types=1);

/**
 * Photo derivative pipeline — spec: docs/photo-pipeline-implementation.md (pipeline 2).
 *
 *   photos.php?list=1                                   JSON manifest (v3, backward compatible)
 *   photos.php?capabilities=1[&probe=1]                  JSON capability report (no absolute paths)
 *   photos.php?image=NAME&size=tile|pack|detail[&format=jpeg|webp][&v=…]
 *                                                        fixed-rung derivative (360 / 720 / 1200)
 *   photos.php?download=NAME[&format=jpeg|webp][&v=…]    1600 px derivative, attachment
 *   photos.php?thumb=NAME                               alias → image=NAME&size=pack&format=jpeg
 *   photos.php?view=NAME                                retired: 302 → ?download=NAME (never bytes)
 *
 * No-original rule (§5): no response produced by this file may contain an
 * unprocessed source byte. Every failure is a status code with an empty body.
 * Source files are readable by this process and by nothing else.
 *
 * Friendly notes:
 * - The cache lives OUTSIDE the webroot by default (§8.1); photos/.cache is the
 *   fallback and ships with its committed deny file. The 16 shard directories,
 *   locks/ and the temp files are created by the deploy step, never by mkdir()
 *   on a request (§8.2/§8.8). A missing shard is a 503 cache_unavailable.
 * - Animated GIF/WebP/AVIF and multi-frame HEIC render frame 1 only.
 * - Renditions are fit-inside and never upscaled; the rounding formula is shared
 *   with scripts/photos.mjs through scripts/photo-ladder.json (§7.3).
 * - This file must stay free of a closing tag and of trailing output.
 */

ini_set('display_errors', '0');
ini_set('html_errors', '0');
ini_set('log_errors', '1');
ini_set('zlib.output_compression', '0');
error_reporting(E_ALL);

if (!headers_sent()) {
    header_remove('X-Powered-By');
}

// Every warning becomes an exception; image endpoints must never prepend a notice
// to image bytes. @-silenced calls (encoder return-value checks) stay silent.
set_error_handler(static function (int $number, string $message, string $file, int $line): bool {
    if ((error_reporting() & $number) === 0) {
        return true;
    }

    throw new ErrorException($message, 0, $number, $file, $line);
});

ob_start();

// Last resort: a fatal that escaped the handler becomes an empty 500, never a
// truncated image or a stack trace (§11.2).
register_shutdown_function(static function (): void {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    $error = error_get_last();
    if ($error === null) {
        return;
    }

    $fatal = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'], $fatal, true) || headers_sent()) {
        return;
    }

    http_response_code(500);
    header('Cache-Control: no-store');
    header('X-Photo-Status: internal');
    header('Content-Length: 0');
    error_log('photo: code=internal');
});

const PHOTO_DIR = __DIR__ . '/photos';
const CAPTIONS_FILE = PHOTO_DIR . '/captions.json';

const PHOTO_PIPELINE_VERSION = 2;

const PHOTO_LADDER = ['tile' => 360, 'pack' => 720, 'detail' => 1200, 'download' => 1600];
const PHOTO_IMAGE_SIZES = ['tile', 'pack', 'detail'];

const PHOTO_QUALITY = [
    'jpeg' => ['tile' => 78, 'pack' => 80, 'detail' => 82, 'download' => 85],
    'webp' => ['tile' => 72, 'pack' => 74, 'detail' => 76, 'download' => 80]
];
const PHOTO_QUALITY_FLOOR = 40;
const PHOTO_QUALITY_STEP = 4;
const PHOTO_PAPER = '#F6EFDF';

const PHOTO_MAX_SOURCE_BYTES = 20971520;   // 20 MiB
const PHOTO_MAX_SOURCE_PIXELS = 32000000;  // 32 MP acceptance cap (§10.2)
const PHOTO_MAX_SOURCE_EDGE = 8000;        // px, long edge
const PHOTO_MEMORY_BASELINE = 536870912;   // 512 MiB — §10.3 baseline when memory_limit is -1

const PHOTO_MAX_OUTPUT_BYTES = [           // delivery ceilings, KB = 1000 B (§9)
    'tile' => ['webp' => 36000, 'jpeg' => 55000],
    'pack' => ['webp' => 80000, 'jpeg' => 110000],
    'detail' => ['webp' => 150000, 'jpeg' => 210000],
    'download' => ['webp' => 350000, 'jpeg' => 500000]
];
const PHOTO_OUTPUT_GUARD_MULTIPLE = 4;     // safety discard guard, never a delivery budget (§9)

const PHOTO_LOCK_TIMEOUT_MS = 3000;
const PHOTO_LOCK_POLL_MS = 25;
const PHOTO_RENDER_BUDGET_MS = 15000;
const PHOTO_MAX_CONCURRENT = 4;

const PHOTO_CACHE_TTL_SECONDS = 3888000;   // 45 days
const PHOTO_CACHE_MAX_FILES = 4000;
const PHOTO_PRUNE_CHANCE = 64;
const PHOTO_CACHE_SHARD_HEX = 1;           // 1 hex char ⇒ 16 shards (§8.2)
const PHOTO_CACHE_SHARDS = 16;

const PHOTO_MEMORY_FRACTION = 0.70;
const PHOTO_LADDER_FILE = __DIR__ . '/scripts/photo-ladder.json';

const IMAGE_TYPES = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'avif' => 'image/avif',
    'heic' => 'image/heic',
    'heif' => 'image/heic'
];

const HEIC_TYPES = ['heic', 'heif'];

/**
 * A typed pipeline failure. The status and code are the whole contract; the
 * message is never sent to a client and never contains a path (§11.3).
 */
final class PhotoError extends RuntimeException
{
    /** @param list<string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly string $reason,
        public readonly array $headers = []
    ) {
        parent::__construct($reason);
    }
}

// ---------------------------------------------------------------------------
// Request dispatch (§3.1, §3.2)
// ---------------------------------------------------------------------------

try {
    dispatch();
} catch (PhotoError $error) {
    errorResponse($error->status, $error->reason, $error->headers);
} catch (Throwable $error) {
    error_log('photo: code=internal');
    errorResponse(500, 'internal');
}

function dispatch(): never
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET' && $method !== 'HEAD') {
        throw new PhotoError(405, 'method_not_allowed', ['Allow: GET, HEAD']);
    }
    foreach ($_GET as $value) {
        if (!is_string($value)) {
            throw new PhotoError(400, 'bad_param_type');
        }
    }

    $known = ['list', 'capabilities', 'probe', 'image', 'size', 'format', 'v', 'download', 'thumb', 'view', '_'];
    foreach (array_keys($_GET) as $key) {
        if (!in_array($key, $known, true)) {
            throw new PhotoError(400, 'unknown_param');
        }
    }

    $actionKeys = ['list', 'capabilities', 'image', 'download', 'thumb', 'view'];
    $actions = [];
    foreach ($actionKeys as $key) {
        if (array_key_exists($key, $_GET)) {
            $actions[] = $key;
        }
    }

    if (count($actions) > 1) {
        throw new PhotoError(400, 'ambiguous_request');
    }

    $action = $actions[0] ?? '';

    switch ($action) {
        case 'list':
            requireLiteral('list', '1', 'bad_list');
            rejectParams(['probe', 'image', 'size', 'format', 'v', 'download', 'thumb', 'view']);
            sendPhotoList();

        case 'capabilities':
            requireLiteral('capabilities', '1', 'bad_capabilities');
            if (array_key_exists('probe', $_GET)) {
                requireLiteral('probe', '1', 'bad_probe');
            }
            rejectParams(['image', 'size', 'format', 'v', 'download', 'thumb', 'view']);
            sendCapabilities(array_key_exists('probe', $_GET));

        case 'image':
            rejectParams(['probe'], false);
            $name = validatePhotoName(rawParam('image'));
            $size = rawParam('size', 'bad_size');
            if (!in_array($size, PHOTO_IMAGE_SIZES, true)) {
                throw new PhotoError(400, 'bad_size');
            }
            $format = parseFormat();
            $version = parseVersion();
            serveRendition($name, $size, $format, $version);

        case 'download':
            rejectParams(['probe'], false);
            if (array_key_exists('size', $_GET)) {
                throw new PhotoError(400, 'ambiguous_request');
            }
            $name = validatePhotoName(rawParam('download', 'bad_name'));
            $format = parseFormat();
            $version = parseVersion();
            serveRendition($name, 'download', $format, $version);

        case 'thumb':
            rejectParams(['probe'], false);
            if (array_key_exists('size', $_GET) || array_key_exists('format', $_GET)) {
                throw new PhotoError(400, 'ambiguous_request');
            }
            $name = validatePhotoName(rawParam('thumb', 'bad_name'));
            $version = parseVersion();
            serveRendition($name, 'pack', 'jpeg', $version);

        case 'view':
            rejectParams(['probe'], false);
            if (array_key_exists('size', $_GET) || array_key_exists('format', $_GET)) {
                throw new PhotoError(400, 'ambiguous_request');
            }
            $name = validatePhotoName(rawParam('view', 'bad_name'));
            parseVersion();
            // Retired endpoint: redirect to the 1600 rung. No filesystem access,
            // no existence oracle, never a source byte.
            redirectToDownload($name);

        default:
            if (array_key_exists('size', $_GET)) {
                throw new PhotoError(400, 'missing_image');
            }
            throw new PhotoError(400, 'unknown_request');
    }
}

/** @param list<string> $names */
function rejectParams(array $names, bool $rejectVersion = true): void
{
    foreach ($names as $name) {
        if ($rejectVersion === false && $name === 'v') {
            continue;
        }
        if (array_key_exists($name, $_GET)) {
            throw new PhotoError(400, 'unknown_param');
        }
    }
}

function requireLiteral(string $key, string $expected, string $code): void
{
    if (rawParam($key) !== $expected) {
        throw new PhotoError(400, $code);
    }
}

function rawParam(string $key, string $missingCode = 'unknown_request'): string
{
    if (!array_key_exists($key, $_GET)) {
        throw new PhotoError(400, $missingCode);
    }

    $value = $_GET[$key];
    if (!is_string($value)) {
        throw new PhotoError(400, 'bad_param_type');
    }

    return $value;
}

function parseFormat(): string
{
    if (!array_key_exists('format', $_GET)) {
        return 'jpeg';
    }

    $format = rawParam('format');
    if ($format !== 'jpeg' && $format !== 'webp') {
        throw new PhotoError(400, 'bad_format');
    }

    return $format;
}

function parseVersion(): ?string
{
    if (!array_key_exists('v', $_GET)) {
        return null;
    }

    $version = rawParam('v');
    if (preg_match('/^[A-Za-z0-9._-]{1,32}$/', $version) !== 1) {
        throw new PhotoError(400, 'bad_version');
    }

    return $version;
}

function serveRendition(string $name, string $rendition, string $format, ?string $version): never
{
    if (function_exists('set_time_limit')) {
        @set_time_limit(20);
    }

    $renditionInfo = renderRendition($name, $rendition, $format);

    serveCacheFile(
        $renditionInfo['path'],
        $renditionInfo['key'],
        $renditionInfo['mtime'],
        $rendition,
        $format,
        $name,
        $rendition === 'download',
        $version
    );
}

function redirectToDownload(string $name): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code(302);
    header_remove('X-Powered-By');
    header('Location: photos.php?download=' . rawurlencode($name));
    header('Cache-Control: no-store');
    header('X-Photo-Status: redirect');
    header('X-Photo-Pipeline: ' . PHOTO_PIPELINE_VERSION);
    header('X-Robots-Tag: noindex');
    header('Content-Length: 0');
    exit;
}

function isHeadRequest(): bool
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'HEAD';
}

function wantsJson(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';

    return is_string($accept) && stripos($accept, 'application/json') !== false;
}

/** @param list<string> $headers */
function errorResponse(int $status, string $code, array $headers = []): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    if (!headers_sent()) {
        http_response_code($status);
        header_remove('X-Powered-By');
        header('Cache-Control: no-store');
        header('X-Photo-Status: ' . $code);
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-origin');
        header('X-Photo-Pipeline: ' . PHOTO_PIPELINE_VERSION);
        header('X-Robots-Tag: noindex');
        foreach ($headers as $header) {
            header($header);
        }

        if (wantsJson()) {
            // json_encode cannot fail on two ASCII scalars.
            $body = json_encode(['error' => $code, 'pipeline' => PHOTO_PIPELINE_VERSION], JSON_THROW_ON_ERROR);
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Length: ' . strlen($body));
            if (!isHeadRequest()) {
                echo $body;
            }
        } else {
            // Empty body, never HTML (an error must not look like a document).
            header('Content-Type: text/plain; charset=utf-8');
            header('Content-Length: 0');
        }
    }

    exit;
}

function jsonResponse(array $payload, int $status = 200): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    http_response_code($status);
    header_remove('X-Powered-By');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Photo-Status: ok');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('X-Photo-Pipeline: ' . PHOTO_PIPELINE_VERSION);
    header('X-Robots-Tag: noindex');
    header('Content-Length: ' . strlen($body));

    if (!isHeadRequest()) {
        echo $body;
    }

    exit;
}

// ---------------------------------------------------------------------------
// Names, paths, source facts
// ---------------------------------------------------------------------------

function extensionOf(string $name): string
{
    return strtolower((string) pathinfo($name, PATHINFO_EXTENSION));
}

/**
 * Kept from v1: basename + extension allowlist. validatePhotoName() is the
 * strict gate for request parameters (§3.2).
 */
function safePhotoName(string $raw): ?string
{
    $name = basename($raw);

    if ($name === '' || $name === '.' || $name === '..' || $name[0] === '.') {
        return null;
    }

    if (!isset(IMAGE_TYPES[extensionOf($name)])) {
        return null;
    }

    return $name;
}

/**
 * Strict request-name validation: the input must be exactly its own basename,
 * carry no separator/NUL and name an allowed image extension.
 */
function validatePhotoName(string $raw): string
{
    if ($raw === '' || str_contains($raw, "\0") || $raw !== basename($raw)) {
        throw new PhotoError(400, 'bad_name');
    }

    $name = safePhotoName($raw);
    if ($name === null || $name !== $raw) {
        throw new PhotoError(400, 'bad_name');
    }

    return $name;
}

/**
 * Path containment (kept from v1): basename + allowlist + realpath inside
 * photos/. Returns null for absent, dotfile, bad extension or outside-root.
 */
function photoPath(string $name): ?string
{
    $name = safePhotoName($name);
    if ($name === null) {
        return null;
    }

    $path = PHOTO_DIR . '/' . $name;
    if (!is_file($path)) {
        return null;
    }

    $real = realpath($path);
    $root = realpath(PHOTO_DIR);

    if ($real === false || $root === false) {
        return null;
    }

    if (strpos($real, $root . DIRECTORY_SEPARATOR) !== 0) {
        return null;
    }

    return $real;
}

function listPhotoNames(): array
{
    if (!is_dir(PHOTO_DIR)) {
        return [];
    }

    $names = [];
    $entries = scandir(PHOTO_DIR);

    if ($entries === false) {
        return [];
    }

    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
            continue;
        }

        $path = PHOTO_DIR . '/' . $entry;
        if (is_file($path) && isset(IMAGE_TYPES[extensionOf($entry)])) {
            $names[] = $entry;
        }
    }

    natcasesort($names);

    return array_values($names);
}

function exifOrientation(string $path): int
{
    if (!function_exists('exif_read_data')) {
        return 1;
    }

    $exif = @exif_read_data($path, 'IFD0');
    if (!is_array($exif) || !isset($exif['Orientation'])) {
        return 1;
    }

    $orientation = (int) $exif['Orientation'];

    return ($orientation >= 1 && $orientation <= 8) ? $orientation : 1;
}

/**
 * Oriented source dimensions. Orientations 5–8 swap width and height so the
 * manifest and the ladder agree with the rendered result (§7.2, D7).
 *
 * @return array{0:int,1:int,2:int} [width, height, orientation]
 */
function sourceDimensions(string $path, string $extension): array
{
    if (in_array($extension, HEIC_TYPES, true)) {
        if (!imagickCanDecode('heic')) {
            throw new PhotoError(415, 'format_unsupported');
        }

        try {
            $image = new Imagick();
            $image->pingImage($path);
            $width = $image->getImageWidth();
            $height = $image->getImageHeight();
            $image->clear();
        } catch (Throwable $error) {
            throw new PhotoError(415, 'source_undecodable');
        }

        if ($width < 1 || $height < 1) {
            throw new PhotoError(415, 'source_undecodable');
        }

        return [$width, $height, 1];
    }

    $info = @getimagesize($path);
    if ($info === false || (int) $info[0] < 1 || (int) $info[1] < 1) {
        throw new PhotoError(415, 'source_undecodable');
    }

    $width = (int) $info[0];
    $height = (int) $info[1];
    $orientation = exifOrientation($path);

    if ($orientation >= 5 && $orientation <= 8) {
        return [$height, $width, $orientation];
    }

    return [$width, $height, $orientation];
}

/**
 * Cheap, decode-free acceptance check shared by renderRendition() and ?list=1.
 *
 * @return array{path:string,bytes:int,mtime:int,width:int,height:int,orientation:int,extension:string}
 */
function sourceFacts(string $path): array
{
    $bytes = @filesize($path);
    if ($bytes === false) {
        throw new PhotoError(404, 'not_found');
    }

    if ($bytes > PHOTO_MAX_SOURCE_BYTES) {
        throw new PhotoError(413, 'source_too_large');
    }

    $mtime = @filemtime($path);
    $extension = extensionOf($path);
    [$width, $height, $orientation] = sourceDimensions($path, $extension);

    if (max($width, $height) > PHOTO_MAX_SOURCE_EDGE) {
        throw new PhotoError(413, 'source_edge_exceeded');
    }

    if ($width * $height > PHOTO_MAX_SOURCE_PIXELS) {
        throw new PhotoError(413, 'source_too_many_pixels');
    }

    return [
        'path' => $path,
        'bytes' => $bytes,
        'mtime' => $mtime === false ? 0 : $mtime,
        'width' => $width,
        'height' => $height,
        'orientation' => $orientation,
        'extension' => $extension
    ];
}

// ---------------------------------------------------------------------------
// Ladder configuration (§7.3) — one JSON, constant fallback
// ---------------------------------------------------------------------------

/** @return array{tile:int,pack:int,detail:int,download:int} */
function ladder(): array
{
    $identity = ['tile' => 360, 'pack' => 720, 'detail' => 1200, 'download' => 1600];
    $ladder = ladderFile();

    if ($ladder === null) {
        return $identity;
    }

    $resolved = [];
    foreach ($identity as $rendition => $fallback) {
        $edge = $ladder[$rendition]['edge'] ?? null;
        $resolved[$rendition] = is_int($edge) && $edge > 0 ? $edge : $fallback;
    }

    return $resolved;
}

function qualityFor(string $format, string $rendition): int
{
    $quality = ladderFile()['quality'][$format][$rendition] ?? null;
    $fallback = PHOTO_QUALITY[$format][$rendition] ?? 80;

    return is_int($quality) && $quality >= 1 && $quality <= 100 ? $quality : $fallback;
}

function paperColorHex(): string
{
    $paper = ladderFile()['paper'] ?? null;

    return is_string($paper) && preg_match('/^#[0-9A-Fa-f]{6}$/', $paper) === 1 ? $paper : PHOTO_PAPER;
}

/** @return array<string, mixed>|null */
function ladderFile(): ?array
{
    static $config = null;
    static $loaded = false;

    if ($loaded) {
        return $config;
    }

    $loaded = true;

    if (!is_file(PHOTO_LADDER_FILE)) {
        return null;
    }

    $raw = @file_get_contents(PHOTO_LADDER_FILE);
    if ($raw === false) {
        return null;
    }

    $parsed = json_decode($raw, true);
    if (!is_array($parsed)) {
        photoLog('ladder_invalid');

        return null;
    }

    $config = $parsed;

    return $config;
}

// ---------------------------------------------------------------------------
// Encoder capability detection (§6)
// ---------------------------------------------------------------------------

/** @return array<string, bool|string> */
function gdInfo(): array
{
    static $info = null;
    if ($info !== null) {
        return $info;
    }

    $raw = function_exists('gd_info') ? gd_info() : [];
    $present = extension_loaded('gd');

    $info = [
        'present' => $present,
        'jpeg' => $present && !empty($raw['JPEG Support']) && function_exists('imagejpeg'),
        'webp' => $present && !empty($raw['WebP Support']) && function_exists('imagewebp'),
        'avif' => $present && !empty($raw['AVIF Support']) && function_exists('imageavif'),
        'png' => $present && !empty($raw['PNG Support']) && function_exists('imagepng'),
        'gif' => $present && (function_exists('imagecreatefromgif') && function_exists('imagegif'))
    ];

    return $info;
}

function gdCanDecode(string $extension): bool
{
    $info = gdInfo();
    if (!(bool) $info['present']) {
        return false;
    }

    return match ($extension) {
        'jpg', 'jpeg' => (bool) $info['jpeg'] && function_exists('imagecreatefromjpeg'),
        'png' => (bool) $info['png'] && function_exists('imagecreatefrompng'),
        'webp' => (bool) $info['webp'] && function_exists('imagecreatefromwebp'),
        'gif' => function_exists('imagecreatefromgif'),
        'avif' => (bool) $info['avif'] && function_exists('imagecreatefromavif'),
        default => false
    };
}

function gdCanEncode(string $format): bool
{
    $info = gdInfo();

    return $format === 'webp' ? (bool) $info['webp'] : (bool) $info['jpeg'];
}

/** @return array<string, bool|string> */
function imagickInfo(): array
{
    static $info = null;
    if ($info !== null) {
        return $info;
    }

    $present = extension_loaded('imagick') && class_exists('Imagick');
    $formats = $present ? imagickFormats() : [];

    $info = [
        'present' => $present,
        'version' => $present ? (string) Imagick::getVersion()['versionString'] : '',
        'heic' => $present && (in_array('HEIC', $formats, true) || in_array('HEIF', $formats, true)),
        'webp' => $present && in_array('WEBP', $formats, true),
        'avif' => $present && in_array('AVIF', $formats, true),
        'jpeg' => $present && in_array('JPEG', $formats, true),
        'png' => $present && in_array('PNG', $formats, true),
        'gif' => $present && in_array('GIF', $formats, true)
    ];

    return $info;
}

/** @return list<string> */
function imagickFormats(): array
{
    static $formats = null;
    if ($formats !== null) {
        return $formats;
    }

    if (!extension_loaded('imagick') || !class_exists('Imagick')) {
        return $formats = [];
    }

    try {
        $formats = array_map('strtoupper', Imagick::queryFormats());
    } catch (Throwable $error) {
        $formats = [];
    }

    return $formats;
}

function imagickCanDecode(string $extension): bool
{
    $info = imagickInfo();
    if (!(bool) $info['present']) {
        return false;
    }

    return match ($extension) {
        'jpg', 'jpeg' => (bool) $info['jpeg'],
        'png' => (bool) $info['png'],
        'webp' => (bool) $info['webp'],
        'gif' => (bool) $info['gif'],
        'avif' => (bool) $info['avif'],
        'heic', 'heif' => (bool) $info['heic'],
        default => false
    };
}

function imagickCanEncode(string $format): bool
{
    $info = imagickInfo();

    return $format === 'webp' ? (bool) $info['webp'] : (bool) $info['jpeg'];
}

function decoderFor(string $extension): string
{
    if (gdCanDecode($extension)) {
        return 'gd';
    }

    if (imagickCanDecode($extension)) {
        return 'imagick';
    }

    return 'none';
}

// ---------------------------------------------------------------------------
// Memory projection (§10.3)
// ---------------------------------------------------------------------------

function memoryLimitBytes(): int
{
    static $bytes = null;
    if ($bytes !== null) {
        return $bytes;
    }

    $raw = trim((string) ini_get('memory_limit'));
    if ($raw === '' || $raw === '-1') {
        return $bytes = -1;
    }

    $unit = strtolower(substr($raw, -1));
    $value = (int) $raw;

    $bytes = match ($unit) {
        'g' => $value * 1024 * 1024 * 1024,
        'm' => $value * 1024 * 1024,
        'k' => $value * 1024,
        default => $value
    };

    return $bytes > 0 ? $bytes : -1;
}

function effectiveMemoryLimit(): int
{
    $limit = memoryLimitBytes();

    return $limit > 0 ? $limit : PHOTO_MEMORY_BASELINE;
}

function allowedRenderBytes(): int
{
    $allowed = (int) floor(effectiveMemoryLimit() * PHOTO_MEMORY_FRACTION) - memory_get_usage(true);

    return max(0, $allowed);
}

function hasRotation(int $orientation): bool
{
    return $orientation >= 5 && $orientation <= 8;
}

function projectedPeakBytes(int $width, int $height, int $orientation): int
{
    $factor = hasRotation($orientation) ? 3.2 : 2.2;

    return (int) floor($width * $height * 4 * $factor) + 8388608;
}

function gdMaxPixels(): int
{
    $available = allowedRenderBytes() - 8388608;

    return $available > 0 ? (int) floor($available / (4 * 3.2)) : 0;
}

// ---------------------------------------------------------------------------
// Cache directory, keys, shards (§8)
// ---------------------------------------------------------------------------

function cacheCandidates(): array
{
    $candidates = [];

    if (defined('PHOTO_CACHE_DIR')) {
        $candidates[] = (string) PHOTO_CACHE_DIR;
    }

    $environment = getenv('ELSAPHOTO_CACHE_DIR');
    if (is_string($environment) && $environment !== '') {
        $candidates[] = $environment;
    }

    // Primary: one level above the webroot (this file sits at the webroot root).
    $candidates[] = dirname(__DIR__) . '/elsa-photo-cache';

    // Fallback: in-webroot, ships with its committed deny file (§8.1 config B).
    $candidates[] = PHOTO_DIR . '/.cache';

    return $candidates;
}

function resolveCacheDir(): ?string
{
    static $resolved = false;
    static $dir = null;

    if ($resolved) {
        return $dir;
    }

    $resolved = true;

    foreach (cacheCandidates() as $candidate) {
        $real = realpath($candidate);
        if ($real === false || !is_dir($real) || !is_writable($real)) {
            continue;
        }

        return $dir = $real;
    }

    return null;
}

function photoCacheDir(): string
{
    $dir = resolveCacheDir();
    if ($dir === null) {
        throw new PhotoError(503, 'cache_unavailable');
    }

    return $dir;
}

function cacheInsideWebroot(string $cacheDir): bool
{
    $webroot = realpath(__DIR__);
    if ($webroot === false) {
        return false;
    }

    return $cacheDir === $webroot || strpos($cacheDir, $webroot . DIRECTORY_SEPARATOR) === 0;
}

function cacheKey(
    string $name,
    int $mtime,
    int $bytes,
    string $rendition,
    string $format,
    int $quality,
    string $renderer
): string {
    $material = PHOTO_PIPELINE_VERSION
        . '|' . $name
        . '|' . $mtime
        . '|' . $bytes
        . '|' . $rendition
        . '|' . $format
        . '|' . $quality
        . '|' . $renderer;

    return substr(hash('sha256', $material), 0, 40);
}

function cacheTarget(string $key, string $format): string
{
    $root = photoCacheDir();
    $shard = dechex((int) hexdec(substr($key, 0, PHOTO_CACHE_SHARD_HEX)));
    $dir = $root . '/' . $shard;

    // §8.8: never mkdir on the request path. A missing shard is a 503 and the
    // deploy skeleton (§16.1 step 0) is what fixes it.
    if (!is_dir($dir) || !is_writable($dir)) {
        photoLog('cache_unavailable', 'shard=' . $shard);

        throw new PhotoError(503, 'cache_unavailable');
    }

    return $dir . '/' . $key . '.' . extensionForFormat($format);
}

function extensionForFormat(string $format): string
{
    return $format === 'webp' ? 'webp' : 'jpg';
}

function mimeForFormat(string $format): string
{
    return $format === 'webp' ? 'image/webp' : 'image/jpeg';
}

// ---------------------------------------------------------------------------
// Rendition generation (§7)
// ---------------------------------------------------------------------------

/**
 * @return array{path:string,key:string,mtime:int}
 */
function renderRendition(string $name, string $rendition, string $format): array
{
    $path = photoPath($name);
    if ($path === null) {
        throw new PhotoError(404, 'not_found');
    }

    $facts = sourceFacts($path);
    $edge = ladder()[$rendition] ?? 0;
    if ($edge < 1) {
        throw new PhotoError(400, 'bad_size');
    }

    [$outWidth, $outHeight] = scaledDimensions($facts['width'], $facts['height'], $edge);
    $quality = qualityFor($format, $rendition);
    $renderers = chooseRenderers($facts, $format);

    $lastError = null;
    foreach ($renderers as $index => $renderer) {
        $key = cacheKey(
            $name,
            $facts['mtime'],
            $facts['bytes'],
            $rendition,
            $format,
            $quality,
            $renderer
        );
        $target = cacheTarget($key, $format);

        if (is_file($target)) {
            return ['path' => $target, 'key' => $key, 'mtime' => $facts['mtime']];
        }

        try {
            renderInto(
                $target,
                $key,
                $renderer,
                $facts,
                $rendition,
                $format,
                $outWidth,
                $outHeight,
                $quality
            );
        } catch (PhotoError $error) {
            $lastError = $error;
            $hasFallback = isset($renderers[$index + 1]);
            $retryable = ['source_undecodable', 'no_encoder', 'output_over_ceiling'];
            if ($hasFallback && in_array($error->reason, $retryable, true)) {
                continue;
            }

            throw $error;
        }

        return ['path' => $target, 'key' => $key, 'mtime' => $facts['mtime']];
    }

    throw $lastError ?? new PhotoError(503, 'no_encoder');
}

/**
 * @param array{path:string,bytes:int,mtime:int,width:int,height:int,orientation:int,extension:string} $facts
 * @return list<string> renderer class names, preferred first
 */
function chooseRenderers(array $facts, string $format): array
{
    $extension = $facts['extension'];
    $renderers = [];

    if (gdCanDecode($extension) && gdCanEncode($format)) {
        $renderers[] = 'gd';
    }

    if (imagickCanDecode($extension) && imagickCanEncode($format)) {
        $renderers[] = 'imagick';
    }

    if ($renderers === []) {
        if (in_array($extension, HEIC_TYPES, true)) {
            throw new PhotoError(415, 'format_unsupported');
        }

        throw new PhotoError(503, 'no_encoder');
    }

    $peak = projectedPeakBytes($facts['width'], $facts['height'], $facts['orientation']);
    if ($peak > allowedRenderBytes()) {
        // GD holds whole bitmaps in memory; Imagick's pixel cache is disk-backed.
        if (in_array('imagick', $renderers, true)) {
            return ['imagick'];
        }

        photoLog('memory_ceiling', 'peak=' . $peak);
        throw new PhotoError(503, 'memory_ceiling');
    }

    return $renderers;
}

/** @return array{0:int,1:int} */
function scaledDimensions(int $width, int $height, int $edge): array
{
    if ($width < 1 || $height < 1) {
        throw new PhotoError(415, 'source_undecodable');
    }

    $scale = min(1, $edge / max($width, $height));

    return [max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale))];
}

/**
 * @param array{path:string,bytes:int,mtime:int,width:int,height:int,orientation:int,extension:string} $facts
 */
function renderInto(
    string $target,
    string $key,
    string $renderer,
    array $facts,
    string $rendition,
    string $format,
    int $outWidth,
    int $outHeight,
    int $quality
): void {
    $lock = acquireLock($key);
    $slot = null;
    $temporary = '';

    try {
        // Double-check under the lock: another request may have rendered while
        // we waited.
        if (is_file($target)) {
            return;
        }

        $slot = acquireRenderSlot();
        $deadline = microtime(true) + PHOTO_RENDER_BUDGET_MS / 1000;
        $temporary = temporaryPathFor($target);

        $encode = prepareEncoder($renderer, $facts, $format, $outWidth, $outHeight);

        $ceiling = PHOTO_MAX_OUTPUT_BYTES[$rendition][$format];
        writeWithinCeiling($encode, $temporary, $quality, $rendition, $ceiling, $outWidth, $outHeight);

        if (microtime(true) > $deadline) {
            throw new PhotoError(503, 'render_timeout', ['Retry-After: 2']);
        }

        @chmod($temporary, 0644);

        if (!@rename($temporary, $target)) {
            throw new PhotoError(503, 'cache_unavailable');
        }

        $temporary = '';
    } finally {
        if ($temporary !== '' && is_file($temporary)) {
            @unlink($temporary);
        }

        if ($slot !== null) {
            releaseRenderSlot($slot);
        }

        releaseLock($lock);
    }
}

/**
 * Returns the encoder as a closure (quality, temp path) => bool. The prepared
 * image stays in scope until the closure is released.
 */
function prepareEncoder(string $renderer, array $facts, string $format, int $outWidth, int $outHeight): Closure
{
    if ($renderer === 'imagick') {
        $image = imagickPrepare($facts, $format, $outWidth, $outHeight);

        return static function (int $quality, string $path) use ($image): bool {
            if ($quality > 0) {
                $image->setImageCompressionQuality($quality);
            }

            try {
                $image->writeImage($path);

                return true;
            } catch (ImagickException $error) {
                return false;
            }
        };
    }

    $image = gdPrepare($facts, $format, $outWidth, $outHeight);

    return static function (int $quality, string $path) use ($image, $format): bool {
        if ($format === 'webp') {
            return @imagewebp($image, $path, $quality);
        }

        imageinterlace($image, true);

        return @imagejpeg($image, $path, $quality);
    };
}

/**
 * Encodes downward from the start quality until the delivery ceiling is met.
 * A rung is never shipped above its ceiling (§9).
 *
 * @param Closure(int, string): bool $encode
 */
function writeWithinCeiling(
    Closure $encode,
    string $temporary,
    int $startQuality,
    string $rendition,
    int $ceiling,
    int $expectedWidth,
    int $expectedHeight
): void {
    $checkedDimensions = false;
    $bytes = 0;

    for ($quality = $startQuality; $quality >= PHOTO_QUALITY_FLOOR; $quality -= PHOTO_QUALITY_STEP) {
        if (is_file($temporary)) {
            @unlink($temporary);
        }

        if (!$encode($quality, $temporary)) {
            @unlink($temporary);
            throw new PhotoError(503, 'no_encoder');
        }

        clearstatcache(true, $temporary);
        $size = @filesize($temporary);
        if ($size === false) {
            throw new PhotoError(503, 'cache_unavailable');
        }

        if (!$checkedDimensions) {
            $info = @getimagesize($temporary);
            if (
                $info === false
                || (int) $info[0] !== $expectedWidth
                || (int) $info[1] !== $expectedHeight
            ) {
                @unlink($temporary);
                throw new PhotoError(500, 'internal');
            }
            $checkedDimensions = true;
        }

        $bytes = $size;
        if ($bytes <= $ceiling) {
            return;
        }
    }

    @unlink($temporary);
    photoLog(
        'output_over_ceiling',
        'rendition=' . $rendition
        . ' bytes=' . $bytes
        . ' ceiling=' . $ceiling
        . ' guard=' . ($ceiling * PHOTO_OUTPUT_GUARD_MULTIPLE)
    );

    throw new PhotoError(503, 'output_over_ceiling');
}

function temporaryPathFor(string $target): string
{
    return dirname($target)
        . '/.tmp.'
        . basename($target)
        . '.'
        . getmypid()
        . '.'
        . bin2hex(random_bytes(4));
}

// ---------------------------------------------------------------------------
// GD renderer
// ---------------------------------------------------------------------------

function gdPrepare(array $facts, string $format, int $outWidth, int $outHeight): GdImage
{
    $image = gdDecode($facts['path'], $facts['extension']);

    if (!imageistruecolor($image)) {
        imagepalettetotruecolor($image);
    }

    $image = gdOrient($image, $facts['path']);

    $width = imagesx($image);
    $height = imagesy($image);
    if ($width < 1 || $height < 1) {
        throw new PhotoError(415, 'source_undecodable');
    }

    $target = @imagecreatetruecolor($outWidth, $outHeight);
    if (!($target instanceof GdImage)) {
        throw new PhotoError(503, 'no_encoder');
    }

    if ($format === 'webp') {
        // Keep alpha: copy channel values instead of compositing them away.
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        if ($transparent === false) {
            throw new PhotoError(503, 'no_encoder');
        }
        imagefilledrectangle($target, 0, 0, $outWidth, $outHeight, $transparent);
    } else {
        // JPEG has no alpha: flatten onto the paper tone (§3.3).
        imagealphablending($target, true);
        $paper = imagecolorallocate($target, 246, 239, 223);
        if ($paper === false) {
            throw new PhotoError(503, 'no_encoder');
        }
        imagefilledrectangle($target, 0, 0, $outWidth, $outHeight, $paper);
    }

    if (!@imagecopyresampled($target, $image, 0, 0, 0, 0, $outWidth, $outHeight, $width, $height)) {
        throw new PhotoError(415, 'source_undecodable');
    }

    return $target;
}

function gdDecode(string $path, string $extension): GdImage
{
    $image = match ($extension) {
        'jpg', 'jpeg' => @imagecreatefromjpeg($path),
        'png' => @imagecreatefrompng($path),
        'webp' => @imagecreatefromwebp($path),
        'gif' => @imagecreatefromgif($path),
        'avif' => @imagecreatefromavif($path),
        default => false
    };

    if (!($image instanceof GdImage)) {
        throw new PhotoError(415, 'source_undecodable');
    }

    return $image;
}

/**
 * Applies EXIF orientation exactly once; every GD return value is checked
 * (§7.2, D6). Rotation angles follow the spec table, which matches EXIF
 * semantics (imagerotate() rotates counter-clockwise).
 */
function gdOrient(GdImage $image, string $path): GdImage
{
    $orientation = exifOrientation($path);
    if ($orientation === 1) {
        return $image;
    }

    $current = $image;

    switch ($orientation) {
        case 2:
            gdFlip($current, IMG_FLIP_HORIZONTAL);
            break;

        case 3:
            $current = gdRotate($current, 180);
            break;

        case 4:
            gdFlip($current, IMG_FLIP_VERTICAL);
            break;

        case 5:
            $current = gdRotate($current, 270);
            gdFlip($current, IMG_FLIP_HORIZONTAL);
            break;

        case 6:
            $current = gdRotate($current, 270);
            break;

        case 7:
            $current = gdRotate($current, 90);
            gdFlip($current, IMG_FLIP_HORIZONTAL);
            break;

        case 8:
            $current = gdRotate($current, 90);
            break;
    }

    return $current;
}

function gdRotate(GdImage $image, int $degrees): GdImage
{
    $rotated = @imagerotate($image, $degrees, 0);
    if (!($rotated instanceof GdImage)) {
        throw new PhotoError(415, 'source_undecodable');
    }

    return $rotated;
}

function gdFlip(GdImage $image, int $mode): void
{
    if (@imageflip($image, $mode) === false) {
        throw new PhotoError(415, 'source_undecodable');
    }
}

// ---------------------------------------------------------------------------
// Imagick renderer
// ---------------------------------------------------------------------------

function imagickPrepare(array $facts, string $format, int $outWidth, int $outHeight): Imagick
{
    $heic = in_array($facts['extension'], HEIC_TYPES, true);

    try {
        $image = new Imagick();
        // [0] selects frame 1 for animated and multi-frame sources.
        $image->readImage($facts['path'] . '[0]');

        if (method_exists($image, 'autoOrientImage')) {
            $image->autoOrientImage();
        }
        $image->setImageOrientation(Imagick::ORIENTATION_TOPLEFT);

        if ($image->getImageColorspace() !== Imagick::COLORSPACE_SRGB) {
            $image->transformImageColorspace(Imagick::COLORSPACE_SRGB);
        }

        $image->resizeImage($outWidth, $outHeight, Imagick::FILTER_LANCZOS, 1, false);

        if ($format === 'webp') {
            $image->setImageFormat('webp');
        } else {
            $image->setImageBackgroundColor(new ImagickPixel(paperColorHex()));
            if (defined('Imagick::ALPHACHANNEL_REMOVE')) {
                $image->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
            }
            $image->setImageFormat('jpeg');
            $image->setImageCompression(Imagick::COMPRESSION_JPEG);
            $image->setInterlaceScheme(Imagick::INTERLACE_PLANE);
            $image->setSamplingFactors(['2x2', '1x1', '1x1']);
        }

        // Orientation applied, colour normalised: strip GPS/XMP/ICC/IPTC before
        // the first write (§7.2).
        $image->stripImage();

        return $image;
    } catch (Throwable $error) {
        photoLog($heic ? 'format_unsupported' : 'source_undecodable');

        throw new PhotoError(415, $heic ? 'format_unsupported' : 'source_undecodable');
    }
}

// ---------------------------------------------------------------------------
// Locks and the render semaphore (§8.4)
// ---------------------------------------------------------------------------

/**
 * @return resource
 */
function acquireLock(string $key)
{
    $directory = photoCacheDir() . '/locks';
    if (!is_dir($directory) || !is_writable($directory)) {
        photoLog('cache_unavailable', 'dir=locks');

        throw new PhotoError(503, 'cache_unavailable');
    }

    $path = $directory . '/' . $key . '.lock';
    $handle = @fopen($path, 'c');
    if ($handle === false) {
        throw new PhotoError(503, 'cache_unavailable');
    }

    @chmod($path, 0644);

    $deadline = microtime(true) + PHOTO_LOCK_TIMEOUT_MS / 1000;

    while (true) {
        if (@flock($handle, LOCK_EX | LOCK_NB)) {
            return $handle;
        }

        if (microtime(true) >= $deadline) {
            fclose($handle);
            photoLog('busy', 'lock');

            throw new PhotoError(503, 'busy', ['Retry-After: 1']);
        }

        usleep(PHOTO_LOCK_POLL_MS * 1000);
    }
}

/**
 * @param resource $handle
 */
function releaseLock($handle): void
{
    @flock($handle, LOCK_UN);
    fclose($handle);
}

/** @return array<int, resource> */
function &renderSlotHandles(): array
{
    static $handles = [];

    return $handles;
}

function acquireRenderSlot(): int
{
    $handles = &renderSlotHandles();

    $directory = photoCacheDir() . '/locks';
    if (!is_dir($directory) || !is_writable($directory)) {
        throw new PhotoError(503, 'cache_unavailable');
    }

    $deadline = microtime(true) + PHOTO_LOCK_TIMEOUT_MS / 1000;

    while (true) {
        for ($index = 0; $index < PHOTO_MAX_CONCURRENT; $index++) {
            $handle = @fopen($directory . '/slot.' . $index, 'c');
            if ($handle === false) {
                throw new PhotoError(503, 'cache_unavailable');
            }

            if (@flock($handle, LOCK_EX | LOCK_NB)) {
                $handles[$index] = $handle;

                return $index;
            }

            fclose($handle);
        }

        if (microtime(true) >= $deadline) {
            photoLog('busy', 'semaphore');

            throw new PhotoError(503, 'busy', ['Retry-After: 1']);
        }

        usleep(PHOTO_LOCK_POLL_MS * 1000);
    }
}

function releaseRenderSlot(int $index): void
{
    $handles = &renderSlotHandles();

    $handle = $handles[$index] ?? null;
    if ($handle === null) {
        return;
    }

    @flock($handle, LOCK_UN);
    fclose($handle);
    unset($handles[$index]);
}

// ---------------------------------------------------------------------------
// Delivery (§3.4, §3.5, §8.6)
// ---------------------------------------------------------------------------

function serveCacheFile(
    string $cachePath,
    string $key,
    int $sourceMtime,
    string $rendition,
    string $format,
    string $name,
    bool $attachment,
    ?string $version
): never {
    // Structural no-original assertion (§5.2): only a file strictly inside the
    // cache root can ever be delivered.
    $root = realpath(photoCacheDir());
    $real = realpath($cachePath);
    if ($root === false || $real === false || strpos($real, $root . DIRECTORY_SEPARATOR) !== 0) {
        photoLog('internal', 'containment');

        throw new PhotoError(500, 'internal');
    }

    $bytes = @filesize($real);
    if ($bytes === false) {
        throw new PhotoError(503, 'cache_unavailable');
    }

    $etag = '"' . substr(hash('sha256', $key . '|' . $bytes), 0, 32) . '"';
    $cacheControl = cacheControlFor($rendition, $version);

    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    header_remove('X-Powered-By');
    header('Cache-Control: ' . $cacheControl);
    header('ETag: ' . $etag);
    header('X-Photo-Status: ok');
    header('X-Photo-Pipeline: ' . PHOTO_PIPELINE_VERSION);
    header('X-Robots-Tag: noindex');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');

    if ($sourceMtime > 0) {
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $sourceMtime) . ' GMT');
    }

    if (isNotModified($etag, $sourceMtime)) {
        http_response_code(304);
        exit;
    }

    http_response_code(200);
    header('Content-Type: ' . mimeForFormat($format));
    header('Content-Length: ' . $bytes);

    $slug = slugify((string) pathinfo($name, PATHINFO_FILENAME));
    if ($slug === '') {
        $slug = 'photo';
    }

    $disposition = $attachment ? 'attachment' : 'inline';
    $filename = $slug . '-' . (ladder()[$rendition] ?? 0) . '.' . extensionForFormat($format);
    header('Content-Disposition: ' . $disposition . '; filename="' . $filename . '"');

    if (!isHeadRequest()) {
        readfile($real);
    }

    maybePrune($root);

    exit;
}

function cacheControlFor(string $rendition, ?string $version): string
{
    if ($rendition === 'download') {
        return 'public, max-age=31536000, immutable';
    }

    if ($version !== null && $version !== '') {
        return 'public, max-age=31536000, immutable';
    }

    return 'public, max-age=604800';
}

function isNotModified(string $etag, int $sourceMtime): bool
{
    $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? null;
    if (is_string($ifNoneMatch) && $ifNoneMatch !== '') {
        foreach (explode(',', $ifNoneMatch) as $candidate) {
            $candidate = trim($candidate);
            if (str_starts_with($candidate, 'W/')) {
                $candidate = substr($candidate, 2);
            }
            if ($candidate === '*' || $candidate === $etag) {
                return true;
            }
        }

        return false;
    }

    $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? null;
    if (!is_string($ifModifiedSince) || $ifModifiedSince === '' || $sourceMtime < 1) {
        return false;
    }

    $since = strtotime($ifModifiedSince);

    return $since !== false && $sourceMtime <= $since;
}

// ---------------------------------------------------------------------------
// Opportunistic pruning (§8.7) — bounded, never blocking
// ---------------------------------------------------------------------------

function maybePrune(string $root): void
{
    if (random_int(1, PHOTO_PRUNE_CHANCE) !== 1) {
        return;
    }

    $handle = @fopen($root . '/.prune.lock', 'c');
    if ($handle === false) {
        return;
    }

    if (!@flock($handle, LOCK_EX | LOCK_NB)) {
        fclose($handle);

        return;
    }

    try {
        pruneSweep($root);
    } catch (Throwable $error) {
        photoLog('prune_failed');
    } finally {
        @flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function pruneSweep(string $root): void
{
    $now = time();
    $budget = 200;

    $stateFile = $root . '/.prune.state';
    $index = 0;
    if (is_file($stateFile)) {
        $stored = @file_get_contents($stateFile);
        if (is_string($stored) && ctype_digit(trim($stored))) {
            $index = ((int) trim($stored)) % PHOTO_CACHE_SHARDS;
        }
    }
    @file_put_contents($stateFile, (string) (($index + 1) % PHOTO_CACHE_SHARDS), LOCK_EX);

    $cacheFiles = [];
    $total = 0;

    for ($shard = 0; $shard < PHOTO_CACHE_SHARDS; $shard++) {
        $directory = $root . '/' . dechex($shard);
        if (!is_dir($directory)) {
            continue;
        }

        $entries = @scandir($directory);
        if ($entries === false) {
            continue;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $full = $directory . '/' . $entry;
            $mtime = @filemtime($full);
            if ($mtime === false) {
                continue;
            }

            if (str_starts_with($entry, '.tmp.')) {
                if ($shard === $index && $budget > 0 && $now - $mtime > 600) {
                    if (@unlink($full)) {
                        $budget--;
                    }
                }
                continue;
            }

            if (preg_match('/^[0-9a-f]{40}\.(?:jpg|webp)$/', $entry) !== 1) {
                continue;
            }

            $total++;
            $cacheFiles[] = ['path' => $full, 'mtime' => $mtime];
        }
    }

    // Orphan lock files (no derivation left to protect).
    $locksDir = $root . '/locks';
    if (is_dir($locksDir) && $budget > 0) {
        $entries = @scandir($locksDir);
        if ($entries !== false) {
            foreach ($entries as $entry) {
                if ($budget <= 0) {
                    break;
                }
                if (preg_match('/^([0-9a-f]{40})\.lock$/', $entry, $match) !== 1) {
                    continue;
                }
                $lockPath = $locksDir . '/' . $entry;
                $mtime = @filemtime($lockPath);
                if ($mtime === false || $now - $mtime < 3600) {
                    continue;
                }
                $shard = dechex((int) hexdec(substr($match[1], 0, PHOTO_CACHE_SHARD_HEX)));
                $candidate = $root . '/' . $shard . '/' . $match[1] . '.jpg';
                if (is_file($candidate) || is_file(substr($candidate, 0, -4) . '.webp')) {
                    continue;
                }
                if (@unlink($lockPath)) {
                    $budget--;
                }
            }
        }
    }

    // Age-based expiry.
    foreach ($cacheFiles as $file) {
        if ($budget <= 0) {
            break;
        }
        if ($now - $file['mtime'] > PHOTO_CACHE_TTL_SECONDS && @unlink($file['path'])) {
            $budget--;
        }
    }

    // Size-based cap.
    if ($total > PHOTO_CACHE_MAX_FILES && $budget > 0) {
        usort($cacheFiles, static fn (array $a, array $b): int => $a['mtime'] <=> $b['mtime']);
        $remaining = $total;
        foreach ($cacheFiles as $file) {
            $target = (int) floor(PHOTO_CACHE_MAX_FILES * 0.95);
            if ($remaining <= $target || $budget <= 0) {
                break;
            }
            if (@unlink($file['path'])) {
                $remaining--;
                $budget--;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Capability probe (§6.4)
// ---------------------------------------------------------------------------

function sendCapabilities(bool $probe): never
{
    $cacheDir = resolveCacheDir();
    $gd = gdInfo();
    $imagick = imagickInfo();
    $ladder = ladder();
    $memoryLimit = memoryLimitBytes();

    $decoders = [];
    foreach (['jpg', 'png', 'webp', 'gif', 'avif', 'heic'] as $extension) {
        $decoders[$extension] = decoderFor($extension);
    }

    $worstPeak = 0;
    foreach (listPhotoNames() as $filename) {
        $path = photoPath($filename);
        if ($path === null) {
            continue;
        }
        try {
            $facts = sourceFacts($path);
        } catch (PhotoError $error) {
            continue;
        }
        $worstPeak = max(
            $worstPeak,
            projectedPeakBytes($facts['width'], $facts['height'], $facts['orientation'])
        );
    }
    $headroom = max(0, allowedRenderBytes() - $worstPeak);

    $stats = $cacheDir === null ? ['files' => 0, 'bytes' => 0] : cacheStats($cacheDir);

    $payload = [
        'pipeline' => PHOTO_PIPELINE_VERSION,
        'php' => PHP_VERSION,
        'limits' => [
            'source_bytes' => PHOTO_MAX_SOURCE_BYTES,
            'source_pixels' => PHOTO_MAX_SOURCE_PIXELS,
            'source_edge' => PHOTO_MAX_SOURCE_EDGE,
            'render_budget_ms' => PHOTO_RENDER_BUDGET_MS,
            'lock_timeout_ms' => PHOTO_LOCK_TIMEOUT_MS,
            'max_concurrent' => PHOTO_MAX_CONCURRENT
        ],
        'ladder' => $ladder,
        'formats' => ['jpeg', 'webp'],
        'gd' => [
            'present' => (bool) $gd['present'],
            'jpeg' => (bool) $gd['jpeg'],
            'webp' => (bool) $gd['webp'],
            'avif' => (bool) $gd['avif'],
            'png' => (bool) $gd['png'],
            'gif' => (bool) $gd['gif']
        ],
        'imagick' => [
            'present' => (bool) $imagick['present'],
            'version' => (string) $imagick['version'],
            'heic' => (bool) $imagick['heic'],
            'webp' => (bool) $imagick['webp'],
            'avif' => (bool) $imagick['avif']
        ],
        'decoders' => $decoders,
        'memory' => [
            'limit_bytes' => $memoryLimit,
            'peak_headroom_bytes' => $headroom,
            'gd_max_pixels' => gdMaxPixels(),
            'fraction' => PHOTO_MEMORY_FRACTION
        ],
        'cache' => [
            'dir' => $cacheDir === null ? '' : basename($cacheDir),
            'inside_webroot' => $cacheDir !== null && cacheInsideWebroot($cacheDir),
            'shards' => PHOTO_CACHE_SHARDS,
            'writable' => $cacheDir !== null,
            'files' => $stats['files'],
            'bytes' => $stats['bytes']
        ],
        'placeholder' => 'img/photo-unavailable.webp',
        'pruning' => [
            'ttl_seconds' => PHOTO_CACHE_TTL_SECONDS,
            'max_files' => PHOTO_CACHE_MAX_FILES
        ]
    ];

    if ($probe) {
        $probeResult = capabilityProbe($cacheDir);
        $payload['probe'] = $probeResult['probe'];
        $payload['verified'] = $probeResult['verified'];
        $payload['cached'] = $probeResult['cached'];
    }

    jsonResponse($payload);
}

/** @return array{files:int,bytes:int} */
function cacheStats(string $root): array
{
    $files = 0;
    $bytes = 0;

    for ($shard = 0; $shard < PHOTO_CACHE_SHARDS; $shard++) {
        $directory = $root . '/' . dechex($shard);
        if (!is_dir($directory)) {
            continue;
        }

        $entries = @scandir($directory);
        if ($entries === false) {
            continue;
        }

        foreach ($entries as $entry) {
            if (preg_match('/^[0-9a-f]{40}\.(?:jpg|webp)$/', $entry) !== 1) {
                continue;
            }

            $size = @filesize($directory . '/' . $entry);
            if ($size === false) {
                continue;
            }

            $files++;
            $bytes += $size;
        }
    }

    return ['files' => $files, 'bytes' => $bytes];
}

/**
 * @return array{probe:array<string,string>,verified:string,cached:bool}
 */
function capabilityProbe(?string $cacheDir): array
{
    $stateFile = $cacheDir === null ? null : $cacheDir . '/.capabilities.json';
    $minor = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;

    if ($stateFile !== null && is_file($stateFile)) {
        $raw = @file_get_contents($stateFile);
        if (is_string($raw)) {
            $parsed = json_decode($raw, true);
            if (
                is_array($parsed)
                && ($parsed['pipeline'] ?? null) === PHOTO_PIPELINE_VERSION
                && ($parsed['php'] ?? null) === $minor
                && is_array($parsed['probe'] ?? null)
                && is_string($parsed['verified'] ?? null)
                && time() - (int) ($parsed['time'] ?? 0) < 3600
            ) {
                return [
                    'probe' => $parsed['probe'],
                    'verified' => $parsed['verified'],
                    'cached' => true
                ];
            }
        }
    }

    $probe = [];
    foreach (['jpeg', 'webp', 'png', 'gif', 'avif'] as $format) {
        $probe[$format] = probeRoundTrip($format);
    }
    $probe['heic'] = imagickCanDecode('heic') ? 'ok' : 'fail';

    $verified = gmdate('c');

    if ($stateFile !== null) {
        $temporary = $stateFile . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(4));
        $body = json_encode(
            [
                'pipeline' => PHOTO_PIPELINE_VERSION,
                'php' => $minor,
                'probe' => $probe,
                'verified' => $verified,
                'time' => time()
            ],
            JSON_UNESCAPED_SLASHES
        );
        if (is_string($body) && @file_put_contents($temporary, $body) !== false) {
            @chmod($temporary, 0644);
            if (!@rename($temporary, $stateFile)) {
                @unlink($temporary);
            }
        }
    }

    return ['probe' => $probe, 'verified' => $verified, 'cached' => false];
}

function probeRoundTrip(string $kind): string
{
    $family = $kind === 'jpeg' ? 'jpeg' : $kind;
    if (!gdCanEncode($family) || !gdCanDecode($kind === 'jpeg' ? 'jpg' : $kind)) {
        return 'fail';
    }

    $temporary = @tempnam(sys_get_temp_dir(), 'photo-probe');
    if ($temporary === false) {
        return 'fail';
    }

    try {
        $image = @imagecreatetruecolor(1, 1);
        if (!($image instanceof GdImage)) {
            return 'fail';
        }

        $paper = imagecolorallocate($image, 246, 239, 223);
        imagefilledrectangle($image, 0, 0, 1, 1, $paper === false ? 0 : $paper);

        $written = match ($family) {
            'jpeg' => @imagejpeg($image, $temporary, 80),
            'webp' => @imagewebp($image, $temporary, 80),
            'png' => @imagepng($image, $temporary),
            'gif' => @imagegif($image, $temporary),
            'avif' => @imageavif($image, $temporary, 80),
            default => false
        };

        if (!$written) {
            return 'fail';
        }

        $decoded = match ($kind) {
            'jpeg' => @imagecreatefromjpeg($temporary),
            'webp' => @imagecreatefromwebp($temporary),
            'png' => @imagecreatefrompng($temporary),
            'gif' => @imagecreatefromgif($temporary),
            'avif' => @imagecreatefromavif($temporary),
            default => false
        };

        if (!($decoded instanceof GdImage)) {
            return 'fail';
        }

        return imagesx($decoded) === 1 ? 'ok' : 'fail';
    } finally {
        @unlink($temporary);
    }
}

// ---------------------------------------------------------------------------
// Manifest (§14.1) — backward-compatible superset of v2
// ---------------------------------------------------------------------------

function sendPhotoList(): never
{
    $captions = loadCaptions();
    $photos = [];
    $used = [];
    $ladder = ladder();

    foreach (listPhotoNames() as $filename) {
        $base = pathinfo($filename, PATHINFO_FILENAME);
        $id = slugify($base);
        if ($id === '') {
            $id = 'photo';
        }

        $unique = $id;
        $attempt = 2;
        while (isset($used[$unique])) {
            $unique = $id . '-' . $attempt;
            $attempt++;
        }
        $used[$unique] = true;

        $extension = extensionOf($filename);
        $isHeic = in_array($extension, HEIC_TYPES, true);
        $path = PHOTO_DIR . '/' . $filename;

        $width = 1200;
        $height = 1200;
        $renderable = false;
        $version = (string) @filemtime($path) . '-' . (string) @filesize($path);

        try {
            $facts = sourceFacts($path);
            $width = $facts['width'];
            $height = $facts['height'];
            $renderable = decoderFor($extension) !== 'none';
        } catch (PhotoError $error) {
            // Unlisted size/decoder problem: the card stays, the photo is marked
            // not renderable and the client shows the placeholder.
            $renderable = false;
        }

        $meta = captionFor($captions, $filename);
        $encodedName = rawurlencode($filename);
        $encodedVersion = rawurlencode($version);

        $detailUrl = 'photos.php?image=' . $encodedName . '&size=detail&format=jpeg&v=' . $encodedVersion;
        $packUrl = 'photos.php?image=' . $encodedName . '&size=pack&format=jpeg&v=' . $encodedVersion;
        $downloadUrl = 'photos.php?download=' . $encodedName . '&v=' . $encodedVersion;

        $images = [];
        foreach (['tile', 'pack', 'detail', 'download'] as $rendition) {
            [$renditionWidth, $renditionHeight] = scaledDimensions($width, $height, $ladder[$rendition]);
            $images[$rendition] = [
                'jpeg' => 'photos.php?image=' . $encodedName . '&size=' . $rendition . '&format=jpeg&v=' . $encodedVersion,
                'webp' => 'photos.php?image=' . $encodedName . '&size=' . $rendition . '&format=webp&v=' . $encodedVersion,
                'w' => $renditionWidth,
                'h' => $renditionHeight
            ];
        }
        // The download rung is a first-class action, not an ?image=&size= value.
        $images['download']['jpeg'] = $downloadUrl . '&format=jpeg';
        $images['download']['webp'] = $downloadUrl . '&format=webp';

        $photos[] = [
            'id' => $unique,
            'src' => $detailUrl,
            'thumb' => $packUrl,
            'view' => $downloadUrl,
            'download' => $downloadUrl,
            'filename' => $filename,
            'caption' => $meta['caption'],
            'alt' => $meta['alt'],
            'name' => $meta['name'],
            'mood' => $meta['mood'],
            'description' => $meta['description'],
            'rarity' => $meta['rarity'],
            'demo' => false,
            'heic' => $isHeic,
            'renderable' => $renderable,
            'width' => $width,
            'height' => $height,
            'aspect' => round($width / max(1, $height), 4),
            'ver' => $version,
            'images' => $images
        ];
    }

    jsonResponse([
        'generated' => date('c'),
        'source' => 'photos',
        'pipeline' => PHOTO_PIPELINE_VERSION,
        'ladder' => $ladder,
        'photos' => $photos
    ]);
}

// ---------------------------------------------------------------------------
// Captions (kept from v1)
// ---------------------------------------------------------------------------

function slugify(string $value): string
{
    $value = strtr($value, [
        'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss',
        'Ä' => 'Ae', 'Ö' => 'Oe', 'Ü' => 'Ue'
    ]);

    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($converted !== false) {
        $value = $converted;
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');

    return substr($value, 0, 80);
}

function loadCaptions(): array
{
    if (!is_file(CAPTIONS_FILE)) {
        return [];
    }

    $raw = @file_get_contents(CAPTIONS_FILE);
    if ($raw === false) {
        return [];
    }

    $parsed = json_decode($raw, true);

    return is_array($parsed) ? $parsed : [];
}

function localizableField($value)
{
    if (is_string($value)) {
        return trim($value);
    }

    if (!is_array($value)) {
        return '';
    }

    $localized = [];
    foreach (['de', 'en'] as $language) {
        if (isset($value[$language]) && is_string($value[$language])) {
            $localized[$language] = trim($value[$language]);
        }
    }

    return $localized;
}

function captionFor(array $captions, string $filename): array
{
    $entry = $captions[$filename] ?? null;

    if (is_string($entry)) {
        return ['caption' => trim($entry), 'alt' => '', 'name' => '', 'mood' => '', 'description' => '', 'rarity' => ''];
    }

    if (is_array($entry)) {
        $rarity = isset($entry['rarity']) && in_array($entry['rarity'], ['common', 'rare', 'holo'], true)
            ? $entry['rarity']
            : '';

        return [
            'caption' => localizableField($entry['caption'] ?? ''),
            'alt' => localizableField($entry['alt'] ?? ''),
            'name' => localizableField($entry['name'] ?? ''),
            'mood' => localizableField($entry['mood'] ?? ''),
            'description' => localizableField($entry['description'] ?? ''),
            'rarity' => $rarity
        ];
    }

    return ['caption' => '', 'alt' => '', 'name' => '', 'mood' => '', 'description' => '', 'rarity' => ''];
}

// ---------------------------------------------------------------------------
// Logging (§11.3) — code + fixed tokens only, never a path or a raw query
// ---------------------------------------------------------------------------

function photoLog(string $code, string $detail = ''): void
{
    error_log('photo: code=' . $code . ($detail === '' ? '' : ' ' . $detail));
}
