# Photo Derivative Pipeline — Implementation Spec (`photos.php`)

**Status**: Proposed — implementation-ready
**Version**: 1 (spec), pipeline version `2`
**Date**: 2026-11-22
**Owner of implementation**: backend (PHP) + tooling (Node/sharp)
**Scope of this document**: the image derivative pipeline inside `photos.php`, the static
parity generator `scripts/photos.mjs`, and the contract between them.
**Audits applied**: `security-audit` (input validation, path containment, data exposure,
resource exhaustion, dependency surface), `asset-audit` (measured source inventory,
dimension/byte facts used to calibrate the caps in §10).

Binding inputs: `AGENTS.md` (FTP-drop + reload workflow, sharp 0.35.5 as dev dep, no
runtime npm), `docs/architecture.md` §"Data Contracts" / §"Performance Budget",
`PRD.md` §5 (privacy, security, performance) and §7 (solo maintainer).

This document changes **no code**. It specifies exactly what to write.

---

## 1. Why this exists (defects being fixed)

`photos.php` currently serves **original source bytes** on every failure path, which
defeats both the no-original privacy goal and the fixed rendition ladder. Verified
against the working tree:

| # | Location | Defect |
|---|---|---|
| D1 | `photos.php:345-347` | `if (!extension_loaded('gd') \|\| !is_writable(...)) serveFile($path, $mime, 86400);` — no GD or unwritable cache ⇒ **full original** at 86400 s |
| D2 | `photos.php:351-353` | `if ($thumb === null) serveFile($path, $mime, 86400);` — decode failure ⇒ **full original** |
| D3 | `photos.php:361` | trailing `serveFile($path, $mime, 86400);` after `imagedestroy()` — unreachable-by-design but live in the source |
| D4 | `photos.php:296-315` | `sendOriginal()` serves `$path` for every non-HEIC photo and for HEIC without Imagick — **originals are a public endpoint** |
| D5 | `photos.php:355-356, 431, 441, 448` | `imagedestroy()` — deprecated in PHP 8.6 (no-op since 8.0); also called on a possibly-false handle |
| D6 | `photos.php:490-526` | `imagerotate()` return value unchecked (`GdImage\|false`) → `TypeError`/notices on failure |
| D7 | `photos.php:253-266` | `?list=1` reports **raw** `getimagesize()` dimensions; EXIF-rotated photos (orientation 5–8) publish swapped width/height → CLS |
| D8 | `photos.php:339` | cache key is `md5(name\|mtime\|size)` with no rendition/format/quality/version component — cannot host a ladder |
| D9 | `photos.php:335-343` | `mkdir` + non-atomic `imagejpeg()` write into the final path; concurrent cold requests race and can serve a truncated file |
| D10 | `photos.php:18-20` | `.cache/` lives **inside the webroot** with no denial; `photos/.htaccess` denies only *server-executable* extensions, so `photos/*.jpg` (the originals) are directly fetchable and `.cache/*.jpg` is readable |
| D11 | repo inventory | `photos/elsa-01.jpg` is **5712×4284 = 24.47 MP**, i.e. already above a literal 24 MP cap (see §10.2) |
| D12 | `photos.php:43-56` | dispatch is "first param wins"; no method check, no ambiguity rejection, no capabilities probe |

Non-defects kept as-is: `safePhotoName()`, `photoPath()` (`basename` + extension
allowlist + `realpath` containment), `slugify()`, caption loading, `jsonResponse()`.

---

## 2. Decisions (summary)

| ID | Decision | Rationale |
|---|---|---|
| P1 | Three fixed display sizes **360 / 720 / 1200** plus **1600** for download. Numeric `size=` values are rejected with `400`. | One ladder the client, the static generator and the cache all agree on (architecture §Performance Budget; per-format byte ceilings, not a single "≤720" cap). |
| P2 | `?image=NAME&size=tile\|pack\|detail&format=jpeg\|webp` is the canonical endpoint; `?download=NAME` is the 1600 rung; `?thumb=` is the 720 pack alias; `?view=` is **retired** (302 → `?download=`). | Backward compatible; no client change required on first deploy; no path returns source bytes. |
| P3 | **No-original rule**: no code path in `photos.php` may emit an unprocessed source byte. Every failure is a status code, never a file. | Privacy + bandwidth + "derivatives are the product". |
| P4 | Renderer chosen per request: **GD → Imagick → 503**. HEIC/HEIF: **Imagick only**, else 415. | Shared-hosting reality; explicit, testable, no silent degradation. |
| P5 | Cache key = `sha256(pipelineVersion\|name\|mtime\|size\|rendition\|format\|quality)`; atomic temp+`rename` under a per-key `flock`. | Same-name replacement invalidates correctly; no torn reads. |
| P6 | Cache **outside the webroot** (§8.1, required); the in-webroot `photos/.cache` stays a fallback that only ships with its committed `.htaccess` deny, plus the top-level-only source deny in `photos/.htaccess`. | D10. Belt and suspenders, because `Require all denied` in `photos/.htaccess` would also block the static `photos/thumbs/` derivatives. |
| P7 | Sources: ≤ 20 MiB, ≤ 32 MP, ≤ 8000 px edge, memory-budget check before decode. | Bounded worst-case request; calibrated against the real inventory (§10.2). |
| P8 | `?capabilities=1` probe (with optional `&probe=1`) replaces any need for a `phpinfo()` upload. | The owner must be able to verify IONOS without leaving an info file behind. |
| P9 | `scripts/photos.mjs` uses **sharp 0.35.5** instead of `sips`, emitting the same ladder with the same rounding/quality/orientation rules. | Parity between local QA and runtime; removes the macOS-only dependency. |
| P10 | Long-lived caching only with a `v=` cache-buster; without `v=` the TTL is 7 days. | Otherwise the owner's same-name replacement is invisible for a year. |

---

## 3. Endpoint contract

### 3.1 Dispatch

Strict, in this order. Exactly one action may be present; two or more ⇒ `400 ambiguous_request`.

| Request | Action |
|---|---|
| `?list=1` | JSON manifest (§14) |
| `?capabilities=1[&probe=1]` | JSON capability report (§6.4) |
| `?image=NAME&size=…[&format=…][&v=…]` | derivative bytes (`tile` / `pack` / `detail`) |
| `?download=NAME[&format=…][&v=…]` | 1600 px derivative, `Content-Disposition: attachment` |
| `?thumb=NAME` | alias → `image=NAME&size=pack&format=jpeg` (720) |
| `?view=NAME` | **retired**: `302` → `?download=NAME`; never bytes, never the source |
| none / anything else | `400 unknown_request` |

Method: `GET` and `HEAD` only; anything else ⇒ `405 method_not_allowed` + `Allow: GET, HEAD`.
`HEAD` returns identical headers (including `Content-Length` of the cache file) and no body.

### 3.2 Parameters

| Param | Required | Accepted values | Rejection |
|---|---|---|---|
| `list` | — | literal `1` | any other value ⇒ `400 bad_list` |
| `capabilities` | — | literal `1` | any other value ⇒ `400 bad_capabilities` |
| `probe` | optional with `capabilities` | literal `1` | `400 bad_probe` |
| `image` | yes for image endpoints | output of `safePhotoName()`: `basename` == input, no `/` `\` NUL, no leading `.`, extension ∈ `IMAGE_TYPES` | `400 bad_name` |
| `size` | yes for `image` | `tile` \| `pack` \| `detail` (case-sensitive) | anything else, incl. `360`, `800`, `1600`, `download`, `large` ⇒ `400 bad_size` |
| `format` | no (default `jpeg`) | `jpeg` \| `webp` (case-sensitive) | anything else incl. `avif`, `png` ⇒ `400 bad_format` |
| `v` | no | `^[A-Za-z0-9._-]{1,32}$` (the `ver` value) | `400 bad_version` |
| `download` | yes for the download action | same validation as `image` | `400 bad_name` |
| `thumb` | yes for alias | same validation as `image` | `400 bad_name` |
| `view` | yes for the retired alias | same validation as `image` | `400 bad_name` |
| any unknown param | — | — | ignored **only** when it is `_` or a cache-buster listed in §3.5; otherwise `400 unknown_param` |

Parameter reading rules (each is a test case):

- Validation happens on the **raw** `$_GET` string before any filesystem call. `$_GET`
  values that are arrays (`?size[]=a`) ⇒ `400 bad_param_type`.
- No trimming, no case folding, no numeric coercion. `size=360` is not an alias for
  `tile`; arbitrary sizes are rejected **by design** — the ladder is a contract.
- `download=NAME` is the download action; it always renders the `download` rung (1600) and adds
  `Content-Disposition: attachment; filename="<slug>-1600.<ext>"`. It is not a modifier on
  `?image=` (no `download=1`): the download is a first-class action.
- Legacy alias disambiguation: `thumb` or `view` present **together with** any of
  `image`, `size`, `format` ⇒ `400 ambiguous_request`. `v` is allowed with an alias.
  `image` + `thumb` both absent but `size` present ⇒ `400 missing_image`.

### 3.3 Rendition table

| `size` / action | Long-edge target | JPEG q (start) | WebP q (start) | WebP ceiling | JPEG ceiling | Intended use |
|---|---|---|---|---|---|---|
| `tile` | 360 | 78 | 72 | ≤ 36 KB | ≤ 55 KB | binder grid, pack thumbnail strip |
| `pack` | 720 | 80 | 74 | ≤ 80 KB | ≤ 110 KB | card art window, pack theatre |
| `detail` | 1200 | 82 | 76 | ≤ 150 KB | ≤ 210 KB | `CardDetail` dialog |
| `?download=` (1600) | 1600 | 85 | 80 | ≤ 350 KB | ≤ 500 KB | "Foto speichern" |

Quality columns are the **starting** quality. The encoder lowers quality (never above the
start) until the per-format ceiling is met; a rung that cannot meet its ceiling is discarded
(§9), never shipped. KB = 1,000 bytes.

Rules:

- All JPEG output is **progressive** (`imageinterlace($im, true)` before write); WebP is
  written at the encoder's default effort.
- `fit = inside`, **never upscale**: `scale = min(1, target / max(w, h))`,
  `outW = max(1, round(w * scale))`, `outH = max(1, round(h * scale))` — identical
  formula to `scripts/photos.mjs` (§13). No cropping in the pipeline; crop framing is
  the client's `object-position` from `focus`.
- Alpha (PNG/GIF sources) is flattened onto `#F6EFDF` (the existing paper tone,
  `photos.php:445`) before JPEG encoding; WebP keeps alpha.
- Animated sources (GIF/WebP/AVIF animation) render **frame 1 only**; document it in
  the endpoint comment.
- Multi-frame HEIC: frame 1.

### 3.4 Response headers (success)

```
Content-Type: image/jpeg | image/webp
Content-Length: <bytes>
Content-Disposition: inline; filename="<slug>-<longedge>.<ext>"   (attachment for ?download=)
Cache-Control: see §3.5
ETag: "<32 hex chars>"
Last-Modified: <source mtime, RFC 1123 GMT>
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Photo-Pipeline: 2
X-Robots-Tag: noindex
```

`ETag` is derived from the **cache key + cache file size**, never from a path:
`'"' . substr(hash('sha256', $key . '|' . $bytes), 0, 32) . '"'`.
`304 Not Modified` on `If-None-Match` match; `If-Modified-Since` is honored only as a
weak fallback when `If-None-Match` is absent.

`header_remove('X-Powered-By')` on every response. No absolute filesystem path may
appear in any header, body, or log line returned to the client.

### 3.5 Cache-Control policy

| Condition | Header |
|---|---|
| display rendition, `v` present and valid | `public, max-age=31536000, immutable` |
| display rendition, `v` absent | `public, max-age=604800` |
| `?download=` (download action) | `public, max-age=31536000, immutable` (a `v` is always supplied by the client for downloads) |
| `304` | same `Cache-Control` as the 200 it revalidates |
| any error status | `no-store` |
| `?list=1`, `?capabilities=1` | `no-store` |

Rationale (P10): `immutable` + one year is correct only if the URL changes when the
bytes change. `?list=1` is `no-store`, so a same-name replacement produces new
`&v=<mtime>-<size>` URLs on the next manifest fetch. Clients that hardcode a URL get
7 days, which bounds staleness without pinning a year.

### 3.6 Status codes and error envelope

Every non-2xx/304 response has an **empty body** unless the request advertised
`Accept: application/json`, in which case it carries
`{"error":"<code>","pipeline":2}`. Never HTML, never a stack trace, never image bytes.
An `X-Photo-Status: <code>` header is set on every response (success and failure) so
QA can assert without reading bodies.

| Status | `code` | Trigger | Client behaviour |
|---|---|---|---|
| 200 | `ok` | derivative served | — |
| 304 | `not_modified` | conditional hit | use cache |
| 400 | `bad_name`, `bad_size`, `bad_format`, `bad_version`, `bad_param_type`, `ambiguous_request`, `missing_image`, `unknown_param`, `unknown_request`, `bad_list`, `bad_capabilities`, `bad_probe` | validation (unknown/numeric `size`, unknown `format`, ambiguous alias, unknown action) | programming error; never user-visible |
| 404 | `not_found` | `photoPath()` returned null (absent, dotfile, bad extension, outside root) | client: `thumb-failed` → next rung → `image-failed` |
| 413 | `source_too_large` | `filesize > 20 MiB` | owner action: re-export |
| 413 | `source_too_many_pixels` | `w*h > 32 MP` (acceptance cap) | owner action: re-export |
| 413 | `source_edge_exceeded` | `max(w,h) > 8000` | owner action: re-export |
| 415 | `source_undecodable` | corruption, truncated file, extension/content mismatch, unsupported colorspace | client: `image-failed`, printed card stays |
| 415 | `format_unsupported` | HEIC/HEIF and no Imagick HEIC delegate | client: placeholder asset |
| 503 | `no_encoder` | neither GD (for the needed output format) nor Imagick | owner action: `?capabilities=1` |
| 503 | `output_over_ceiling` | render exceeded 4× its rung ceiling after the quality floor (pathological; §9) | render discarded, one log line; never ships oversized bytes |
| 503 | `cache_unavailable` | cache dir missing/unwritable and no fallback dir | owner action: chmod |
| 503 | `busy` | `flock` deadline (3 s) or render semaphore saturated | `Retry-After: 1` |
| 503 | `memory_ceiling` | projected peak > 70 % of `memory_limit` on both renderers (§10.3) | owner action: smaller export |
| 503 | `render_timeout` | render exceeded the 15 s budget | `Retry-After: 2` |
| 500 | `internal` | invariant violation (e.g. containment assert on a cache path) | bug; body empty, one log line |

`404` is deliberately **not** distinguished from "outside root" — no existence oracle.

### 3.7 Placeholder

The endpoint itself never fabricates image bytes. The **client** owns the placeholder:

- New static asset `img/photo-unavailable.webp` (360×360, ≤ 6 KB, neutral paper tone, no
  text — text would need DE/EN). Generated once by tooling, committed, not built by PHP.
  It lives at the deploy root, **not** under `assets/`: `assets/` is scheduled for
  deletion at the end of the refactor (`docs/architecture.md` folder structure), so a new
  dependency on it would be dead on arrival.
- Client rule: `thumb` fails → try `detail`; `detail` fails → render the placeholder and
  keep the printed card readable (architecture "Single image" taxonomy). Smallest
  possible diff to `CardTile`/`CardDetail`.
- `?list=1` marks each photo `"renderable": false` when the probe shows the source cannot
  be decoded at all, so the client can skip the failing `<img>` load entirely.

---

## 4. Scope and non-goals

**In scope**: request parsing/validation, encoder detection, rendition generation, cache,
resource limits, metadata handling, static parity, tests, rollout.

**Out of scope**: card layout, `object-position`/`focus` rendering, client component
internals (only the contract bullets in §3.7 and §14.4), CDN/edge caching, image
upload (there is none — the owner uses FTP), authentication.

---

## 5. No-original rule (normative)

> **A response produced by `photos.php` must consist of bytes that were encoded by this
> pipeline during this request or a previous one. Source files are readable by the
> process and by nothing else.**

### 5.1 Exact removals

| Lines (current) | Text to delete | Replacement behaviour |
|---|---|---|
| 345-347 | `if (!extension_loaded('gd') \|\| !is_writable(dirname($cacheFile))) { serveFile($path, $mime, 86400); }` | `503 no_encoder` / `503 cache_unavailable` |
| 351-353 | `if ($thumb === null) { serveFile($path, $mime, 86400); }` | `415 source_undecodable` |
| 355-358 | `if (@imagejpeg($thumb, $cacheFile, THUMB_QUALITY)) { imagedestroy($thumb); serveFile($cacheFile, 'image/jpeg', 604800); }` | `atomicWrite()` + `serveCacheFile()`, no `imagedestroy()` |
| 360-361 | `imagedestroy($thumb); serveFile($path, $mime, 86400);` | delete entirely |
| 296-315 | whole `sendOriginal()` body | rewrite as alias (§3.1) → `detail` rendition |
| 304-312 | `if ($jpeg !== null) { serveFile($jpeg, 'image/jpeg', 604800); }` | HEIC source is rendered through the normal path; no decoder ⇒ `415 format_unsupported` |
| 314 | `serveFile($path, IMAGE_TYPES[...] ?? 'application/octet-stream', 604800);` | delete |
| 413-451 | `makeThumbnail()` (720-hardcoded, always flattens, `imagedestroy`) | replaced by `renderRendition()` (§7) |
| 490-526 | `applyExifOrientation()` (unchecked `imagerotate`) | replaced by `normalizeOrientation()` (§7.2) |
| 528-549 | `serveFile()` (accepts any path) | replaced by `serveCacheFile()` (§8.6) |

### 5.2 Structural enforcement (not a promise)

1. `serveFile()` is **renamed** `serveCacheFile(string $cachePath, ...)`. Its first
   statement resolves `realpath($cachePath)` and `realpath(CACHE_DIR)`; if the file is
   not strictly inside `CACHE_DIR`, it throws — caught by the top-level handler as
   `500 internal`. The type system cannot enforce it, so the assertion does.
2. `renderRendition()` is the only function that opens a source path, and it returns a
   **cache path** or throws a typed `PhotoError`. It never returns the source path.
3. A PHPStan/PHP-CS-Fixer rule or a `scripts/` grep gate fails CI if the token
   `readfile($path` / `serveFile(` appears with a source variable. Cheap, effective.

### 5.3 Direct-URL leak (must be fixed in the same deploy)

`photos/<name>.jpg` is currently fetchable over HTTP, which makes the endpoint rule
irrelevant. Two supported configurations:

**A — preferred: sources outside the webroot.**
`ELSAPHOTO_SOURCE_DIR=/kunden/homepages/…/photo-sources` (env) or a constant override.
`listPhotoNames()`/`photoPath()` read from that root; `realpath` containment is checked
against it. Nothing else changes.

**B — sources stay in `photos/`, access denied.**
`photos/.htaccess` gains a **top-level-only** deny (subdirectory derivatives stay
served, which the static fallback needs):

```apache
RewriteEngine On
RewriteRule "^[^/]+\.(jpe?g|png|gif|webp|avif|heic|heif)$" - [F,NC]
```

`^[^/]+` matches only files directly in `photos/`; a request for
`/photos/thumbs/x.jpg` is stripped to `thumbs/x.jpg` in per-directory context and does
not match, so generated derivatives remain reachable. Verify with `curl -I` (§12.2).
`Options -Indexes` stays. The existing "deny server-executable extensions" block stays.

---

## 6. Encoder detection

### 6.1 Detection order

```
1. Output format support     GD → Imagick → 503 no_encoder
2. Source decode support     extension-driven matrix (§6.2), GD → Imagick → 415
3. Memory feasibility        (§10.3) → possibly prefer Imagick over GD → 503 memory_ceiling
4. Render
```

### 6.2 Decode matrix

| Source ext | GD function | GD requirement | Imagick format | Notes |
|---|---|---|---|---|
| `jpg`, `jpeg` | `imagecreatefromjpeg` | `gd_info()['JPEG Support']` | `JPEG` | |
| `png` | `imagecreatefrompng` | `PNG Support` | `PNG` | flatten alpha |
| `webp` | `imagecreatefromwebp` | `WebP Support` | `WEBP` | animated ⇒ frame 1 |
| `gif` | `imagecreatefromgif` | always (bundled) | `GIF` | frame 1 |
| `avif` | `imagecreatefromavif` | `AVIF Support` | `AVIF` | PHP ≥ 8.1 |
| `heic`, `heif` | **none** | — | `HEIC` (libheif delegate) | `Imagick::queryFormats('HEIC')` non-empty **and** a real decode of a fixture succeeds at probe time |

`gd_info()` is read once per request into a static. `Imagick::queryFormats()` is
called only when GD cannot satisfy the request (it is not free).

### 6.3 When neither can decode

`415 format_unsupported` (HEIC without delegate) or `415 source_undecodable` (corrupt).
Never fall through to the original. Consequence for the client: the `heic.ts` /
`heic2any` path becomes **dead for runtime-served photos** — the static pipeline
converts HEIC to JPEG (§13), so it stays dead there too. `heic.ts` may be deleted in the
Svelte rewrite; note it in the ADR that records this pipeline.

### 6.4 Capability probe

`GET photos.php?capabilities=1` → `200`, `Cache-Control: no-store`,
`Content-Type: application/json`, `X-Photo-Pipeline: 2`. Shape (exact keys — the QA
harness asserts them):

```jsonc
{
  "pipeline": 2,
  "php": "8.6.x",
  "limits": { "source_bytes": 20971520, "source_pixels": 32000000, "source_edge": 8000,
              "render_budget_ms": 15000, "lock_timeout_ms": 3000, "max_concurrent": 4 },
  "ladder": { "tile": 360, "pack": 720, "detail": 1200, "download": 1600 },
  "formats": ["jpeg", "webp"],
  "gd": { "present": true, "jpeg": true, "webp": true, "avif": true, "png": true, "gif": true },
  "imagick": { "present": true, "version": "7.1.x", "heic": false, "webp": true, "avif": false },
  "decoders": { "jpg": "gd", "png": "gd", "webp": "gd", "gif": "gd", "avif": "gd", "heic": "none" },
  "memory": { "limit_bytes": 536870912, "peak_headroom_bytes": 52105216,
              "gd_max_pixels": 28540927, "fraction": 0.7 },
  "cache": { "dir": "elsa-photo-cache", "inside_webroot": false, "shards": 16,
             "writable": true, "files": 412, "bytes": 24117248 },
  "placeholder": "img/photo-unavailable.webp",
  "pruning": { "ttl_seconds": 3888000, "max_files": 4000 }
}
```

Rules:

- **No absolute paths.** `cache.dir` is the directory *name* only; `inside_webroot` is a
  boolean. This is the one place the owner could leak hosting layout — don't.
- `cache.inside_webroot` is `false` on a correct production deploy (§8.1) and `shards` is
  the compile-time shard count (16), so a mismatch with §8.2 is visible from the probe.
- `memory.gd_max_pixels` is the computed GD ceiling for *this* host (§10.3), not the
  32 MP acceptance cap: the owner sees which photos need Imagick or a re-export.
- `&probe=1` additionally performs a real 1×1 encode per advertised
  format and a real decode of a bundled fixture per decoder, returning
  `"probe": {"jpeg":"ok","webp":"ok","heic":"fail"}`, `"verified": "<iso8601>"`.
  Probe results are memoized in `.cache/.capabilities.json` for 3600 s, invalidated by
  `PHOTO_PIPELINE_VERSION` and by PHP minor-version change. If the cache is unwritable,
  the probe runs live and the response carries `"cached": false`.
- Probe must cost < 200 ms and must not touch `photos/`.

---

## 7. Rendition generation

### 7.1 `renderRendition()` contract

```
renderRendition(string $name, string $rendition, string $format): string  // cache path
```

Steps, in order (each failure throws a typed error, never returns a source path):

1. `photoPath($name)` → null ⇒ `404 not_found`.
2. `filesize` ⇒ `> 20 MiB` ⇒ `413 source_too_large`.
3. `getimagesize` (fast header read, no decode) ⇒ false ⇒ `415 source_undecodable`.
   Dimensions ⇒ `> 8000` edge ⇒ `413 source_edge_exceeded`; `> 32 MP` ⇒
   `413 source_too_many_pixels`.
4. Compute the cache key (§8.3), path (§8.2). Fast path: `is_file` ⇒ return it
   (after `chmod`-safe read check).
5. Choose renderer (§6.1/§6.3). Neither ⇒ `503 no_encoder` / `415`.
6. Memory feasibility (§10.3) ⇒ `503 memory_ceiling`.
7. Acquire the per-key `flock` (§8.4). On acquire, **re-check** `is_file` (another
   request may have won while we waited) — return it if present.
8. Decode → normalise orientation (§7.2) → flatten alpha → resize with the shared
   rounding formula → encode to a temp file in the target directory → verify
   (`getimagesize` of the produced file matches expected dims ±0, and `filesize`
   ≤ `PHOTO_MAX_OUTPUT_BYTES[rendition]`) → `chmod(0644)` → `rename()` → release lock.
9. Return the cache path.

Any throwable from GD/Imagick is caught and mapped: `ImagickException` ⇒
`415 source_undecodable` (decode phase) or `503 no_encoder` (encode phase, e.g. missing
delegate). Temp files are unlinked in a `finally`.

### 7.2 Orientation and metadata

**Orientation** — read EXIF *before* decoding (or via Imagick auto-orient), apply
exactly once, then the output is upright with orientation tag 1:

| EXIF | Operation |
|---|---|
| 1 | none |
| 2 | flip horizontal |
| 3 | rotate 180° |
| 4 | flip vertical |
| 5 | rotate 270° + flip horizontal |
| 6 | rotate 270° |
| 7 | rotate 90° + flip horizontal |
| 8 | rotate 90° |

GD path: read `exif_read_data($path, ['Orientation'])` guarded by
`function_exists('exif_read_data')`; **check every `imagerotate()`/`imageflip()`
return** (`GdImage|false`); on `false` ⇒ `415 source_undecodable`.
Imagick path: `$im->autoOrientImage()` (or `setImageOrientation(TOPLEFT)` after
`rotateImage`), then `$im->setImageOrientation(Imagick::ORIENTATION_TOPLEFT)`.

**Metadata stripping** (PII: iPhone photos carry GPS):

- GD path: re-encoding drops all APPn/XMP/ICC/GPS automatically. Assert it: the
  produced JPEG must contain no `Exif\0\0`, no `http://ns.adobe.com/xap`, no
  `ICC_PROFILE` — a byte scan of the output in the test harness (§13.4).
- Imagick path: `$im->stripImage()` **after** orientation and colour handling, and
  before `writeImage()`. Verify with `Imagick::getImageProfile()` being empty.
- Colour: if the source carries an ICC profile and Imagick is the renderer, transform
  to sRGB (`transformImageColorspace`) **before** stripping; the GD path cannot, so
  wide-gamut iPhone photos may shift slightly — documented limitation, and a reason
  the Imagick path is preferred for detail/download when available.
- Never copy IPTC/XMP "Caption"/"Artist" into the output.

### 7.3 Encoder settings

| Renderer | JPEG | WebP |
|---|---|---|
| GD | `imagejpeg($im, $tmp, q)`, `imageinterlace($im, true)` before write | `imagewebp($im, $tmp, q)` |
| Imagick | `setImageFormat('jpeg')`, `setImageCompressionQuality(q)`, `setInterlaceScheme(INTERLACE_PLANE)`, `setSamplingFactors(['2x2','1x1','1x1'])` | `setImageFormat('webp')`, `setImageCompressionQuality(q)` |
| sharp (static) | `sharp(...).jpeg({ quality: q, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })` | `.webp({ quality: q, effort: 4 })` |

Qualities: §3.3 table, as `const`s (§11.1) shared by PHP and the static generator via a
single JSON file `scripts/photo-ladder.json` read by both — one number, two languages,
no drift. (PHP reads it with `json_decode(file_get_contents(__DIR__.'/scripts/photo-ladder.json'))`
at boot with a hardcoded fallback if absent; the file is small and opcache-friendly.)

---

## 8. Cache

### 8.1 Location

**Primary requirement: the cache lives OUTSIDE the webroot.** A cache inside `photos/` is
readable by anyone who requests a name, unless a deny file protects it — and a deny file is
one forgotten FTP upload away from publishing every derivative, `download` rungs of private
photos included. Outside-the-webroot is therefore the requirement, not the nicety; the
in-webroot variant is a documented fallback with an explicit deny file.

1. **Outside the webroot (required for a production deploy).**
   `PHOTO_CACHE_DIR` constant or `ELSAPHOTO_CACHE_DIR` env set to a writable directory that
   is not reachable over HTTP — **recommended value `../elsa-photo-cache`**
   (`/kunden/homepages/…/elsa-photo-cache` on IONOS, one level above the document root).
   `realpath(CACHE_DIR)` containment (§5.2) is checked against that path, and
   `?capabilities=1` must report `"cache": { "inside_webroot": false }`.

2. **Fallback only: `photos/.cache` inside the webroot, and only together with the deny
   file.** Config B is accepted when the FTP account cannot create a sibling directory
   above the document root. The cache then **must** contain:

   ```apache
   # photos/.cache/.htaccess  — tracked in git, uploaded with every deploy
   <IfModule mod_authz_core.c>
     Require all denied
   </IfModule>
   <IfModule !mod_authz_core.c>
     Deny from all
   </IfModule>
   ```

   This file is **committed** (`.gitignore` carries an explicit `!photos/.cache/.htaccess`
   negation) and is uploaded by the normal FTP-from-repo deploy, so the fallback cannot be
   silently missing from a deploy. Verification, both sides:

   ```sh
   git check-ignore -v photos/.cache/.htaccess   # prints the "!" negation rule
   git check-ignore -q  photos/.cache/.htaccess  # exit 1 = NOT ignored
   curl -s -o /dev/null -w '%{http_code}\n' https://HOST/photos/.cache/   # 403, never 200
   ```

3. Neither usable ⇒ `503 cache_unavailable`. **Fail closed.** Never degrade to
   per-request in-memory generation: unbounded CPU on a shared host is a worse failure
   than an honest 503, and it would silently bypass the ladder limits.

What the repo ships and what it does not: `.cache/.gitkeep`, `.cache/.htaccess`,
`.cache/locks/.gitkeep` and one `.gitkeep` per shard directory (16, §8.2) are tracked —
they are the deploy skeleton, because §8.8 forbids `mkdir()` on the request path and an FTP
deploy has no shell. Everything else under `photos/.cache/` (derivatives, `.capabilities.json`,
`.prune.*`, `locks/*.lock`) is ignored and never committed. The old cache *contents* and
`photos/converted/` are deleted from the repo once the new pipeline ships (`converted/` is
superseded by the ladder); the skeleton stays.

### 8.2 Layout

```
<cache>/                    # outside the webroot (primary, §8.1) or photos/.cache (fallback)
  .htaccess                 # fallback only; tracked in git, uploaded on deploy
  .gitkeep
  .capabilities.json
  .prune.lock
  locks/<key>.lock
  <h>/<key>.jpg             # ONE hex char of the key ⇒ 16 shard dirs, both formats per shard
  <h>/<key>.webp
  .tmp.<key>.<pid>.<rand>   # transient, same directory as its target
```

Sharding: `h = substr($key, 0, 1)` — **16 shards** (one hex character). At the
`PHOTO_CACHE_MAX_FILES` cap of 4 000 entries the worst case is `ceil(4000 / 16) = 250`
entries per directory, which is far inside what ext4/IONOS handles; 256 shards
(two hex chars) would bound it at 16 entries for no benefit and cost 240 extra directories
that must all pre-exist. **Both formats of a key share one shard** (`a/<key>.jpg` and
`a/<key>.webp`) — sharding is by key, not by extension.

Shard width is a constant (`PHOTO_CACHE_SHARD_HEX = 1`); widening it later is safe but
invalidates the whole cache (files land in new directories) — acceptable, it is derived
data.

**Every directory in this tree must exist before the first request.** §8.8 forbids
`mkdir()` on the request path, so a missing shard directory is a `503 cache_unavailable`,
not a silent `mkdir`. Creation is a deploy step, not a runtime behaviour; the repo tracks
the 16 shard dirs plus `locks/` via `.gitkeep` (§8.1), and §16.1 step 0 has the command
that (re)creates them for an out-of-webroot cache.

Cache files are mode `0644`, directories `0755` — PHP runs as the FTP user on IONOS, so no
group tricks are needed; do **not** create `0777`.

### 8.3 Key

```
material = "2" || "|" || name
        || "|" || sourceMtime          (integer seconds, stat)
        || "|" || sourceSize           (bytes, stat)
        || "|" || rendition            (tile|pack|detail|download)
        || "|" || format               (jpeg|webp)
        || "|" || quality              (integer from the ladder)
        || "|" || rendererClass        ("gd"|"imagick")
key = substr(hash('sha256', material), 0, 40)
```

- `pipelineVersion` first: bumping it orphans the whole cache (safe; pruning cleans it).
- `rendererClass` is included because GD and Imagick produce different bytes for the
  same quality; without it, a host that gains Imagick starts serving stale GD output
  that the ETag claims is current. Including it makes the switch a clean invalidation.
- `mtime` + `size` gives same-name replacement detection for free (D8). FTP preserves
  the *local* mtime on upload, so a genuinely new file always differs in at least one of
  the two; if both matched (byte-identical rewrite) the cached derivative is correct
  anyway.
- Filename component is the **full** `NAME` (already `basename`-safe), so
  `Elsa.JPG` and `elsa.jpg` are distinct keys — matching the filesystem on a
  case-insensitive host would be nice-to-have, not worth an extra `stat`.

### 8.4 Concurrency (`flock`)

```
lockPath = <cache>/locks/<key>.lock
fh = fopen(lockPath, 'c'); chmod 0644
deadline = now() + 3000 ms
loop:
  if flock(fh, LOCK_EX | LOCK_NB) → acquired, break
  if now() >= deadline → 503 busy (Retry-After: 1)
  usleep(25000)                      // 25 ms
on acquire:
  if is_file(target) → flock(LOCK_UN), serve         // double-check
  render → atomicWrite
finally: flock(fh, LOCK_UN); fclose(fh)
```

- Lock files are never deleted on the hot path (deleting a lock file while another
  process holds it is the classic lost-mutex race). They are removed by pruning.
- `LOCK_NB` + poll (not blocking `LOCK_EX`) so a hostile client cannot pin a FPM worker
  for the full `max_execution_time`.
- **Render semaphore**: a global cap of 4 concurrent *encodes*, implemented as 4 slot
  files `<cache>/locks/slot.0..3` acquired with the same non-blocking protocol. If all
  four are held past the 3 s deadline ⇒ `503 busy`. This bounds CPU on a 2-vCPU shared
  plan regardless of how many URLs are hammered.

### 8.5 Atomic write

```
tmp = dirname(target) . '/.tmp.' . basename(target) . '.' . getmypid() . '.' . bin2hex(random_bytes(4))
write (encoder writes directly to $tmp)
verify dims + byte cap
chmod(tmp, 0644)
rename(tmp, target)          // same directory ⇒ same filesystem ⇒ atomic
```

`rename()` across filesystems is not atomic; keeping the temp beside the target
guarantees same-FS. `fsync` is not used (PHP has no portable handle access after GD
writes by path; the rename is the visibility barrier that matters).

### 8.6 Delivery

`serveCacheFile($cachePath, $mime, $maxAge, $etag, $disposition)`:

- asserts containment in `CACHE_DIR` (§5.2);
- emits the headers of §3.4, handles `If-None-Match` → 304, `HEAD` → headers only;
- `readfile()` on the cache path only.

### 8.7 Pruning (bounded, opportunistic, never blocking)

Trigger: on a successful serve, with probability `1/64` (and always when
`filecount > 4000`), attempt `<cache>/.prune.lock` with `LOCK_EX|LOCK_NB`. If not
acquired, skip silently — a request must never wait for maintenance.

Sweep (single pass over one of the 16 shards per run, round-robin index stored in
`.prune.state`; bounded to 200 `unlink` calls per run so no request does bulk I/O):

1. `.tmp.*` older than 600 s ⇒ delete (crash leftovers).
2. `.lock` files with no corresponding cache file and mtime older than 3600 s ⇒ delete.
3. if total files > 4000: delete cache files with the oldest `mtime` until ≤ 3800.
4. files with `mtime` older than 45 days ⇒ delete.

Owner-facing alternative documented in `README`: delete the cache directory over FTP
after a bulk photo replacement. Always safe — it is derived data.

### 8.8 Writability checks

Per request, once: `is_dir($dir) && is_writable($dir)`. Do **not** `mkdir` on the hot
path (`photos.php:335-337` does today and silently half-fails); directory creation is a
deploy step — §16.1 step 0 for an out-of-webroot cache, the tracked `.gitkeep` skeleton
(§8.1) for the in-webroot fallback — and the capability probe reports the truth. A failed
`fopen`/`rename` still maps to `503 cache_unavailable` rather than a fatal.

---

## 9. Time and output caps

- `set_time_limit(20)` at the top of image actions (guarded by
  `function_exists('set_time_limit')`; shared hosts may disable it).
- Measured render budget 15 s; exceeded ⇒ `503 render_timeout`.

**Two separate byte concepts — never conflated:**

1. **Delivery budgets (the contract, ratified 2026-11-22).** Per file, hard, per format:

   | Rung | WebP ceiling | JPEG ceiling |
   |---|---:|---:|
   | `tile` | 36 KB | 55 KB |
   | `pack` | 80 KB | 110 KB |
   | `detail` | 150 KB | 210 KB |
   | `download` | 350 KB | 500 KB |

   The encoder searches quality downward from the start quality (§3.3) until the ceiling is
   met; a rung is never shipped above its ceiling. This is what CI and the release checklist
   assert (`Content-Length ≤ ceiling`).

2. **Safety discard guard (not a product budget).** If a render still exceeds **4×** its
   ceiling after the quality search reaches its floor — a pathological encoder or a corrupt
   source — the temp file is unlinked, one `error_log` line names the rung and the byte count,
   and the response is `503` (`output_over_ceiling`), never a shipped oversized image and
   never the source. Guard values: tile 220 KB, pack 440 KB, detail 840 KB, download 2,000 KB.

   The guard is a safety valve, not a delivery budget: it must never be asserted as the pass
   condition in a test or a checklist. The largest legitimate delivery number in this document
   is the 500 KB JPEG download ceiling.

---

## 10. Resource safety

### 10.1 Constants

```php
const PHOTO_PIPELINE_VERSION   = 2;
const PHOTO_LADDER             = ['tile' => 360, 'pack' => 720, 'detail' => 1200, 'download' => 1600];
const PHOTO_MAX_SOURCE_BYTES   = 20971520;   // 20 MiB
const PHOTO_MAX_SOURCE_PIXELS  = 32000000;   // 32 MP  — see §10.2
const PHOTO_MAX_SOURCE_EDGE    = 8000;       // px, long edge
const PHOTO_MAX_OUTPUT_BYTES   = [   // delivery ceilings, per format, KB = 1000 B (§9)
    'tile'     => ['webp' => 36000,  'jpeg' => 55000],
    'pack'     => ['webp' => 80000,  'jpeg' => 110000],
    'detail'   => ['webp' => 150000, 'jpeg' => 210000],
    'download' => ['webp' => 350000, 'jpeg' => 500000],
];
const PHOTO_OUTPUT_GUARD_MULTIPLE = 4;       // safety discard guard = 4 × ceiling (§9)
const PHOTO_LOCK_TIMEOUT_MS    = 3000;
const PHOTO_LOCK_POLL_MS       = 25;
const PHOTO_RENDER_BUDGET_MS   = 15000;
const PHOTO_MAX_CONCURRENT     = 4;
const PHOTO_CACHE_TTL_SECONDS  = 3888000;    // 45 days
const PHOTO_CACHE_MAX_FILES    = 4000;
const PHOTO_PRUNE_CHANCE       = 64;
const PHOTO_MEMORY_FRACTION    = 0.70;       // of memory_limit — see §10.3
const PHOTO_CACHE_SHARD_HEX    = 1;          // 1 hex char ⇒ 16 shards (§8.2)
```

All are `const` (or a `PhotoConfig` value object) so the capability probe, the tests and
the static generator can read the same numbers.

### 10.2 The 24 MP question (measured, not assumed)

The brief's target was "~24 MP". Measured inventory (`asset-audit`, `sips -g`):

| File | Dimensions | Pixels |
|---|---|---|
| `photos/elsa-01.jpg` | 5712 × 4284 | **24 470 208 (24.47 MP)** |
| `photos/233A150F-….jpg` | 3840 × 2160 | 8.29 MP |
| `photos/IMG_*.jpeg` (×6) | 4032 × 3024 | 12.19 MP |
| `photos/IMG_9949.jpeg` | 3024 × 4032 | 12.19 MP |

A literal 24 000 000 cap would **reject the repo's own hero photo on day one**
(24,470,208 px). The cap is therefore set to **32 MP**, which accepts every current asset
with 31 % margin, and the documented owner guidance is *export at ≤ 6000 px long edge*.
iPhone 48 MP ProRAW (`8064 × 6048` = 48.8 MP) is rejected by both caps with `413` plus a
message telling the owner to re-export — that is the correct outcome for a shared host, and
it is better than a fatal OOM.

**32 MP is an input-acceptance cap, not a render promise.** What GD can actually render is
decided by §10.3: at the required 512 MiB baseline the GD ceiling is **28.5 MP** in the
worst case (orientation-rotated), so sources between 28.5 and 32 MP must take the Imagick
path. Every current asset — max 24.47 MP — renders on GD alone, so the two sections agree:
"covers every current asset" is true for acceptance (§10.2) *and* for rendering (§10.3).

Byte cap 20 MiB likewise clears the largest current file (3.98 MB) with room for a
48 MP JPEG that the owner later downscales.

### 10.3 Memory ceiling

Policy, stated once so every section can point at it:

| Quantity | Value | Derived from |
|---|---|---|
| Minimum host `memory_limit` for a production deploy | **512 MiB** | §16.3 checklist row; gives 49.69 MiB headroom over the hero (arithmetic below) |
| Hard floor for the 24.47 MP hero on GD (no headroom) | **448 MiB** | needs 323,704,422 B / 0.70 = 462,434,889 B = 441 MiB, rounded up to a real `memory_limit` value |
| Allowance used by the projection | **70 %** of `memory_limit` | `PHOTO_MEMORY_FRACTION` |
| Largest source GD renders, worst-case orientation | **28.5 MP** | at 512 MiB, after the 8 MiB parse margin |
| Largest accepted source | **32 MP** | `PHOTO_MAX_SOURCE_PIXELS`; 28.5–32 MP ⇒ Imagick |

GD holds a full truecolor bitmap: `4 × w × h` bytes, plus a rotated copy on orientations
5–8, plus the target. Projection:

```
peakBytes = w*h*4 * (orientation has a rotation ? 3.2 : 2.2) + 8 MiB   // parse margin
allowed   = memory_limit_bytes * PHOTO_MEMORY_FRACTION - memory_get_usage(true)
if peakBytes > allowed:
    if imagick available and imagick not yet tried → use Imagick (disk-backed pixel cache)
    else → 503 memory_ceiling
```

**Exact arithmetic for the hero (the largest current asset, §10.2):**

```
w*h            = 5712 × 4284            = 24,470,208 px
one bitmap     = 24,470,208 × 4 B       = 97,880,832 B   (93.34 MiB)
peak, rotated  = 97,880,832 × 3.2       = 313,218,662 B
               + 8 MiB parse margin     = 321,607,270 B  (306.71 MiB)   ← the worst case
allowed @512M  = 536,870,912 × 0.70     = 375,809,638 B
               − 2,097,152 B base use   = 373,712,486 B  (356.4 MiB)
headroom       = 373,712,486 − 321,607,270 = 52,105,216 B (49.69 MiB)  ✅ passes
allowed @256M  = 268,435,456 × 0.70 − 2,097,152 = 185,807,667 B
               → GD ceiling (185,807,667 − 8,388,608) / 12.8 = 13.9 MP  ❌ hero rejected
```

So the earlier 256 MiB baseline was incoherent: it projected 306.71 MiB of bitmaps against
a 153.6 MiB allowance and rejected the hero on a GD-only host. 512 MiB with a 70 % fraction
is the requirement; **below 448 MiB the hero cannot render on GD at all**, and on an
Imagick-less host that is a `503 memory_ceiling` with an owner-facing "re-export at
≤ 6000 px" message.

The GD pixel ceiling is computed, not guessed, so it follows the host:
`gd_max_pixels = floor((memory_limit × 0.70 − memory_get_usage − 8 MiB) / (4 × 3.2))`.
`?capabilities=1` publishes it (§6.4), so a 256 MiB host is told *which* photos will 503
before a visitor finds out, and the owner's `download` rung keeps working through Imagick
when Imagick exists.

Read `memory_limit` with `ini_get`, parse `256M`/`-1` forms (`-1` ⇒ unlimited on paper,
still apply the render budget). Never `ini_set` the limit upward — on shared hosting it
is usually not permitted, and silently raising it is how you get a 500 that kills the
whole FPM pool instead of one request.

`display_errors` off + strict handler (§11.2) converts "Allowed memory size exhausted"
into a 503 body rather than a truncated image.

---

## 11. PHP 8.6 hardening

### 11.1 Language level

- `declare(strict_types=1);` stays; every new function carries scalar param types and a
  return type. No `mixed` returns from public helpers.
- Typed exception: `final class PhotoError extends RuntimeException` with
  `public readonly int $status` and `public readonly string $code`; the top-level
  handler maps it to §3.6.
- `imagedestroy()` **removed everywhere**. GD objects are freed by refcount; use
  `unset($im)` (and set to `null` in `finally`) if you want determinism inside a loop.
  Removal sites: `photos.php:356, 360, 431, 441, 448`.
- `GdImage` returns checked: `imagecreatefrom*`, `imagerotate`, `imagecreatetruecolor`,
  `imagecrop`, `imagescale` may return `false`; `imagecreatetruecolor` may also throw
  `ValueError` for non-positive dimensions — validate dimensions before calling.
- No dynamic properties, no `create_function`, no `${}` interpolation.
- `match` over `if/else` chains for size/format/orientation tables (exhaustive, and a
  missing arm is a `UnhandledMatchError` the tests catch).

### 11.2 Never emit notices

```php
ini_set('display_errors', '0');
ini_set('html_errors', '0');
ini_set('log_errors', '1');
ini_set('zlib.output_compression', '0');   // never compress image bytes in PHP
error_reporting(E_ALL);
set_error_handler(static function (int $no, string $msg, string $file, int $line): bool {
    throw new ErrorException($msg, 0, $no, $file, $line);
});
ob_start();                                 // then ob_end_clean() before any header/body
register_shutdown_function(...);            // last-resort: if a fatal escaped, emit 500 with empty body
```

- A warning anywhere becomes an exception ⇒ `500 internal`, empty body, one log line.
  For image endpoints a 500 is far better than a JPEG with a PHP notice prepended
  (which browsers happily render as a broken image).
- `ob_start()` protects against a stray `require`/BOM printing before `header()`; call
  `ob_end_clean()` at the start of every response function and again in the shutdown
  handler.
- `X-Powered-By` removed; recommend `expose_php=0` in `.htaccess`
  (`php_flag expose_php off` — guarded by `<IfModule mod_php.c>`).
- File must contain **no** closing `?>` and no trailing newline after it (there is none
  today — keep it that way).

### 11.3 Output discipline

- Image endpoints: no `echo`, only `readfile()` of a cache path. `Content-Length` always
  set (also on `HEAD`), so clients can assert byte caps without downloading.
- XML/JSON endpoints: `json_encode` with `JSON_THROW_ON_ERROR`, `JSON_UNESCAPED_SLASHES`;
  `list=1` stays `no-store`.
- Logging: `error_log()` only, one line, `code=… name=<sanitised> rendition=… dir=<cache|source>`
  — never the absolute path, never a query string with a filename from a failed
  containment check (that is attacker-controlled).

### 11.4 Per-request budget summary

| Resource | Bound | Enforcement |
|---|---|---|
| Wall clock | 20 s hard, 15 s render budget | `set_time_limit`, `microtime` checks |
| Memory | 70 % of `memory_limit`, projected | pre-decode projection (§10.3); requires `memory_limit` ≥ 512 MiB for GD-only rendering of the hero |
| Source bytes | 20 MiB | `filesize` before decode |
| Source pixels | 32 MP / 8000 px edge | header dims before decode |
| Output bytes | per rendition | post-encode check |
| Concurrency | 4 encodes | semaphore slots |
| Lock wait | 3 s | non-blocking poll |
| Disk | 4000 files | pruning |

---

## 12. Verification probes (owner-facing)

### 12.1 Capabilities

`GET /photos.php?capabilities=1&probe=1` is the only supported way to learn what the
host can do. No `phpinfo()` upload, no temp file left behind. Record the JSON in the
release checklist (§16.3).

### 12.2 Leak checks (run after every deploy)

```sh
# originals must be unreachable (403 or 404, never 200)
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/photos/elsa-01.jpg
# cache must be unreachable
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/photos/.cache/
# the fallback deny file must be deployed and effective (fallback config B only — in
# config A the cache is outside the webroot and both of these 404, which is also a pass)
curl -s -o /dev/null -w '%{http_code}\n' https://HOST/photos/.cache/.htaccess   # 403
# the ladder must be exact
curl -s https://HOST/photos.php?image=elsa-01.jpg\&size=tile | identify -format '%wx%h\n' -
# arbitrary sizes must be rejected
curl -s -o /dev/null -w '%{http_code}\n' 'https://HOST/photos.php?image=elsa-01.jpg&size=800'   # 400
# the retired view endpoint must redirect to the download derivative, never the source
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://HOST/photos.php?view=elsa-01.jpg'   # 302 ...?download=elsa-01.jpg
curl -sL 'https://HOST/photos.php?view=elsa-01.jpg' | wc -c   # <= 500000, never the source size
```

---

## 13. Static parity — `scripts/photos.mjs` → sharp

### 13.1 Why

`sips` is macOS-only, so a Linux CI runner (or the owner's future machine) produces no
derivatives at all, and local QA cannot reproduce the runtime ladder. sharp 0.35.5 is
already the planned dev dependency (`AGENTS.md`, ADR-0001). Parity target: *same rungs,
same rounding, same orientation semantics, same quality numbers* — not
byte-identical files (different encoders), which is why §13.4 asserts dimensions
exactly and pixels within a tolerance.

### 13.2 Script changes

Replace `imageSize()` + `convertHeic()` + `makeThumbnail()` (`photos.mjs:76-131`) with:

```
import sharp from "sharp";
import ladder from "./photo-ladder.json" with { type: "json" };

async function render(source, outPath, rendition) {
  const target = ladder[rendition].edge;
  await sharp(source, { failOn: "error", limitInputPixels: 32_000_000 })
    .rotate()                              // EXIF auto-orient, then metadata is dropped
    .resize({ width: target, height: target, fit: "inside",
              withoutEnlargement: true, kernel: "lanczos3" })
    .flatten({ background: ladder.paper }) // no-op when opaque
    .jpeg({ quality: ladder.quality.jpeg[rendition], progressive: true,
            mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(outPath);
}

async function meta(source) {
  const m = await sharp(source).rotate().metadata();   // rotate() before metadata ⇒ oriented dims
  return { width: m.width ?? 1200, height: m.height ?? 1200 };
}
```

Hard requirements:

- `limitInputPixels: 32_000_000` and `failOn: "error"` mirror the PHP caps; a too-large
  file fails the build with a readable message instead of silently truncating.
- `.rotate()` **before** `.resize()` and **before** `metadata()` — sharp writes no EXIF,
  so this is exactly the PHP "orient then strip" order.
- Kernel `lanczos3` is sharp's default; state it explicitly so a future default change
  cannot move the ladder.
- No `sips` calls remain. `child_process` import is dropped.
- HEIC: sharp needs libheif. Probe at startup:
  `sharp.format.heif.input.file` (and `.avif`). If unavailable, print
  `HEIC sources will be skipped: this sharp/libvips build has no libheif. Export JPEG
  from Photos.app (File ▸ Export ▸ JPEG) and re-run.` and **skip the file** rather than
  emitting a broken entry. This is the honest failure mode: the build must not produce a
  `photos.json` that points at a nonexistent derivative.
- `sharp` is imported lazily inside `main()` only when `photos/` is non-empty, so
  `npm run demo` / `npm run og` stay usable without it.

### 13.3 Static output layout

Predictable names (the runtime uses hashed cache names; the static deploy cannot, because
it has no PHP to compute them):

```
photos/derived/tile/<id>.jpg       photos/derived/tile/<id>.webp
photos/derived/pack/<id>.jpg       photos/derived/pack/<id>.webp
photos/derived/detail/<id>.jpg     photos/derived/detail/<id>.webp
photos/derived/download/<id>.jpg   photos/derived/download/<id>.webp
```

- `<id>` is the **existing manifest id** (`slugify` + dedupe, `photos.mjs:53-74`), so a
  renamed source file yields a stable public URL and a renamed card id only once.
- `photos/thumbs/` and `photos/converted/` are no longer written. Keep the old
  directories deployed until the client is verified on the ladder, then delete them
  (rollback safety).
- Re-render rule: skip when the derivative `mtime >= source mtime` **and** the
  `photo-ladder.json` content hash recorded in `.derived-state.json` is unchanged. A
  ladder change (new quality, new rung) therefore invalidates everything once.
- Write with `writeFileSync` to `<file>.tmp` then `renameSync` — the repo is not
  concurrently written, but the rule costs nothing and keeps `npm run photos` safe to
  interrupt.
- Total budget check: warn if `photos/derived` exceeds 30 MB (733 visitors per GB is
  the owner's bandwidth reality on shared hosting).

### 13.4 `photos.json` contents (manifest v2)

Backward-compatible superset. Every existing key keeps its meaning; `thumb` and `view`
now point at rungs of the ladder.

```jsonc
{
  "generated": "2026-11-22T10:00:00.000Z",
  "source": "photos",              // "photos" | "demo" | "mixed"  (unchanged)
  "pipeline": 2,                   // NEW: ladder/pipeline version
  "ladder": { "tile": 360, "pack": 720, "detail": 1200, "download": 1600 },  // NEW
  "photos": [
    {
      "id": "elsa-01",
      "src":  "photos/derived/detail/elsa-01.jpg",   // deprecated alias → detail rung (1200)
      "thumb": "photos/derived/pack/elsa-01.jpg",    // deprecated alias → pack rung (720)
      "view": "photos/derived/download/elsa-01.jpg", // deprecated alias → download rung (1600), matches ?view= 302 target
      "filename": "elsa-01.jpg",
      "caption": { "de": "…", "en": "…" },
      "alt":     { "de": "…", "en": "…" },
      "name":    { "de": "…", "en": "…" },
      "mood":    { "de": "…", "en": "…" },
      "description": { "de": "…", "en": "…" },
      "rarity": "",
      "demo": false,
      "heic": false,
      "renderable": true,                    // NEW: false ⇒ client shows the placeholder asset
      "width": 5712,                         // SOURCE dimensions, EXIF-oriented — aspect ratio authority
      "height": 4284,
      "aspect": 1.3333,                      // NEW: width/height, 4 dp — lets the client reserve space
      "ver": "9f2c…",                        // NEW: source version (static: sha256 prefix; runtime: mtime-size) ⇒ cache-buster, travels as &v=
      "images": {                            // NEW: everything the client needs, no string building
        "tile":     { "jpeg": "photos/derived/tile/elsa-01.jpg",
                      "webp": "photos/derived/tile/elsa-01.webp", "w": 360, "h": 270 },
        "pack":     { "jpeg": "photos/derived/pack/elsa-01.jpg",
                      "webp": "photos/derived/pack/elsa-01.webp", "w": 720, "h": 540 },
        "detail":   { "jpeg": "photos/derived/detail/elsa-01.jpg",
                      "webp": "photos/derived/detail/elsa-01.webp", "w": 1200, "h": 900 },
        "download": { "jpeg": "photos/derived/download/elsa-01.jpg",
                      "webp": "photos/derived/download/elsa-01.webp", "w": 1600, "h": 1200 }
      },
      "srcset": {
        "tile": "photos/derived/tile/elsa-01.jpg 360w, photos/derived/pack/elsa-01.jpg 720w",
        "detail": "photos/derived/pack/elsa-01.jpg 720w, photos/derived/detail/elsa-01.jpg 1200w"
      },
      "set": null, "focus": { "x": 0.5, "y": 0.5 }, "chase": false   // v2 extras, unchanged
    }
  ]
}
```

Rules:

- `width`/`height` are the **oriented source** dimensions (`5712×4284` for the hero), the
  aspect-ratio authority — never a rendition size. Each rendition carries its own `w`/`h`
  (oriented), so a component cannot render a rung at the wrong ratio.
- `renderable: false` entries still appear in the manifest (the card exists, the photo
  does not render) — dropping them would silently shrink the collection when one HEIC
  fails.
- `ver` is the source version: static mode uses a sha256 prefix of the source, runtime uses
  `<mtime>-<size>`; both are ≤ 32 chars and both travel as the `&v=` URL parameter (§3.5).
- Ladder values are read from `scripts/photo-ladder.json`; `photos.json` carries them so
  a client one deploy ahead of the server still knows the rungs.
- The `srcset` block above is **not part of the contract**: ADR-0004 §4 makes `srcset`/`sizes`
  a component concern derived from `images.*` + `w`/`h`, so no emitter may transmit it
  (§14.1). It is still emitted by `?list=1` today; dropping it there is part of the same
  contract change, and no consumer may read it in the meantime.

### 13.5 Parity test (`npm run photos:parity`, CI)

Fixture: `tests/fixtures/images/generated/` — 3 files (JPEG portrait with EXIF orientation 6,
PNG with alpha, WebP) plus optionally a HEIC when libheif exists. **Every one of them is
generated by `tests/fixtures/images/make-fixtures.mjs` at test setup and is never a copy of
an owner photo** (test plan §4.2: a committed personal photo is a permanent EXIF/GPS leak);
the generated files live in a gitignored directory and the harness records their hashes in
its own run, not in the repo.

1. Run the sharp generator → capture dims/bytes/sha256 of every derivative.
2. Run a PHP CLI harness (`php -d memory_limit=512M tests/php/render-fixture.php`) that
   requires `photos.php`'s functions in a "no-dispatch" mode and renders the same
   fixtures into a temp cache.
3. Assert: **dimensions equal, exactly**, for all 12 combinations (3 fixtures × 4 rungs);
   output bytes within ±25 %; mean absolute pixel difference ≤ 2/255 on the JPEG rungs
   (PSNR ≥ 40 dB); both outputs carry no EXIF/GPS/ICC; both are progressive.
4. Determinism: each side runs twice, byte-identical per side (encoder determinism), and
   the ladder JSON hash is recorded — so an accidental quality bump shows up as a diff,
   not as a mystery.

---

## 14. Manifest versioning and client contract

### 14.1 Runtime `?list=1` (manifest v2)

Same shape as §13.4 with URLs pointing at the endpoint:

```jsonc
"src":   "photos.php?image=elsa-01.jpg&size=detail&format=jpeg&v=1712-4182933",
"thumb": "photos.php?image=elsa-01.jpg&size=pack&format=jpeg&v=1712-4182933",
"view":  "photos.php?download=elsa-01.jpg&v=1712-4182933",
"download": "photos.php?download=elsa-01.jpg&v=1712-4182933",
```

**Manifest level** — once per document, beside `generated` / `source` / `photos[]`:
`pipeline: 2` (int, rendition pipeline version) and `ladder`. Both describe the catalogue's
rendition set, not a single photo, so neither is repeated inside `photos[]` (ADR-0004 §2).

**Per photo** — `renderable`, `ver` (runtime `ver` is `<mtime>-<size>`, ≤ 32 chars — a
cache-buster, not a security token) and `images` with `jpeg`/`webp` URLs and per-rung `w`/`h`.
`images.download` is the canonical download URL; the top-level `download` above is an
**accepted synonym** that `normalize()` folds into `images.download` (ADR-0004 §2), so a
consumer reads one field and the two can never disagree.

`?list=1` computes `renderable` from the decode matrix and the
size caps **without decoding** (`getimagesize` + `filesize`), so listing stays cheap; a
photo that fails at render time still 415s, and the client's error path covers it.

No `srcset` is emitted at either level — the client derives it from `images.*` and each rung's
`w`/`h` (ADR-0004 §4).

`?list=1` keeps `Cache-Control: no-store` — it is the invalidation channel for
`immutable` image URLs.

### 14.2 Compatibility guarantees

| Consumer | Guarantee |
|---|---|
| Existing `app.js` (`?list=1`, `photo.thumb`, `photo.view`) | works unchanged: `thumb` → 720 pack rung, `view` → the `?download=` URL (same bytes the retired `?view=` now 302s to) |
| `?thumb=NAME` hardcoded anywhere | works unchanged (720 pack alias) |
| `?view=NAME` hardcoded | works, now `302` → `?download=` (1600) — documented behaviour change; never the source |
| `photos.json` v2 consumers | v3 is additive; unknown keys ignored |
| Old cached JS asking for originals | follows the `302` to the 1600 download derivative; no error, bounded payload |

### 14.3 Required client changes (small, listed for the frontend hand-off)

1. Drop the `thumb → src` fallback that assumed `src` is the original; both are
   derivatives now. Use `thumb` → `detail` → placeholder.
2. Compose `srcset`/`sizes` in the component from `images.*` plus each rung's `w`/`h`, and
   reserve space from `width`/`height` (CLS). No `srcset` field arrives from the manifest —
   ADR-0004 §4 derives it precisely so data cannot choose URLs or break the typed ratio.
3. "Foto speichern" uses `?download=NAME` (1600) — no longer "the original". Copy must not
   promise "original"/"Original" any more (interaction-copy audit).
4. Remove the `heic.ts`/`heic2any` path for manifest photos (§6.3).

### 14.4 ADR hooks

- **ADR-0004** (manifest v2 contract, **Accepted 2026-11-22**) ratifies `pipeline`, `ladder`,
  `renderable`, `ver`, `images` and the `width`/`height` = oriented-**source** ratio semantics.
  It settles `srcset` **against** this document's original ask: derived client-side from
  `images.*` + `w`/`h`, never transmitted (ADR §4). Further field changes go through that ADR,
  not a PHP patch (ADR §5).
- **ADR-0008** (Accepted) records: rendition ladder, no-original rule, cache
  strategy, GD/Imagick detection order, sharp-for-parity. The fallback ladder is:
  Imagick-only → GD-only → static `photos.json` + `photos/derived` (PHP can be absent
  entirely, per `architecture.md`).

---

## 15. Test matrix

PHP CLI harness (`tests/php/`) drives the functions; the HTTP column names the
Playwright/curl assertion. Every row is a release gate item.

| # | Case | Setup | Request | Expected | Assertions |
|---|---|---|---|---|---|
| T01 | ladder, GD | GD+JPEG, clean cache | `image=a.jpg&size=tile` | 200 | `360×270`, `image/jpeg`, progressive, **≤ 55,000 B (55 KB)**, `X-Photo-Status: ok` |
| T02 | ladder, all rungs | same | `size=` tile/pack/detail; `?download=a.jpg` | 200 | long edge exactly 360/720/1200/1600 (no upscale on small source: long edge = source) |
| T03 | WebP | GD+WebP | `format=webp&size=pack` | 200 | `image/webp`, RIFF header, **≤ 80,000 B (80 KB)** |
| T04 | GD absent, Imagick present | `php -d disable_functions=…` or a build without gd | any | 200 | served via Imagick, `X-Photo-Pipeline: 2`, cache key contains `imagick` |
| T05 | GD + Imagick absent | neither extension | any | **503** `no_encoder` | empty body, `no-store`, **no source bytes**, `X-Photo-Status` |
| T06 | cache unwritable | `chmod 0555 .cache` | any | **503** `cache_unavailable` | no original bytes, no temp files created, capability probe reports `writable:false` |
| T07 | corrupt source | truncated JPEG in `photos/` | any | **415** `source_undecodable` | no bytes, no cache file, no notice in body |
| T08 | extension/content mismatch | PNG bytes named `.jpg` | any | **415** | no bytes, no `imagejpeg` warning leak |
| T09 | oversized bytes | 25 MiB JPEG | any | **413** `source_too_large` | rejected on `filesize` only (no decode: assert via timing/memory flat) |
| T10 | oversized pixels | 6000×6000 (36 MP) | any | **413** `source_too_many_pixels` | no decode attempted |
| T11 | oversized edge | 9000×1000 | any | **413** `source_edge_exceeded` | |
| T12 | HEIC, Imagick+libheif | fixture `.heic` | `size=pack` | 200 | `image/jpeg`, upright, no EXIF |
| T13 | HEIC, no libheif | same fixture | `size=pack` | **415** `format_unsupported` | **not** the original HEIC; `renderable:false` in `?list=1` |
| T14 | EXIF orientation 6 | 4032×3024 + Orientation 6 | `size=tile` | 200 | **270×360** (not 360×270), pixels upright vs a reference |
| T15 | EXIF 1/3/8 | three fixtures | `size=pack` | 200 | dims + visual match reference; orientation tag absent |
| T16 | GPS stripped | generated JPEG with a GPS EXIF + XMP payload (test plan §4.2 — never a committed personal photo) | `size=detail` | 200 | output contains no `Exif\0\0`, no GPS IFD, no XMP, no ICC |
| T17 | same-name replacement | replace `a.jpg` (new mtime+size), keep cache | `size=tile&v=old` / no `v` | 200 new bytes | new cache key, old file pruned later; `ETag` differs; `v=old` still returns new bytes (URL is only a browser-cache buster) |
| T18 | concurrent cold | wipe key, 10 parallel curls | `size=detail` | 10×200 | identical bytes, exactly one render (log count), no `.tmp.*` left, p99 < 6 s |
| T19 | lock timeout | hold `flock` in a harness, request | any | **503** `busy` | `Retry-After: 1`, ≤ 3.5 s, no source bytes |
| T20 | render budget | pathological huge source inside caps | any | **503** `render_timeout` \| `memory_ceiling` | bounded wall clock, no fatal |
| T21 | conditional GET | warm cache, `If-None-Match` | any | **304** | no body, same `Cache-Control`, `Content-Length` absent |
| T22 | HEAD parity | warm cache | `-I` | 200 | `Content-Length` == GET length, no body, no `Content-Type` drift |
| T23 | method | — | `POST` | **405** | `Allow: GET, HEAD` |
| T24 | traversal | — | `image=../photos.php`, `..%2fphotos.php`, `/etc/passwd`, `a.jpg%00.png`, `.hidden.jpg`, `image=a/../../b.jpg` | **400/404** | never 200, never a PHP file's source, no path in body |
| T25 | alias ambiguity | — | `thumb=a.jpg&size=pack` | **400** `ambiguous_request` | |
| T26 | arbitrary size | — | `size=800`, `size=360`, `size=large` | **400** `bad_size` | ladder is a contract |
| T27 | compress | — | `?image=a.jpg&size=pack` with `Accept-Encoding: gzip` | 200 | `Content-Encoding` absent, byte length == `Content-Length` |
| T28 | no leakage | — | any error + any success | — | response headers/body contain no absolute path, no `X-Powered-By` |
| T29 | no-original proof | — | `?view=a.jpg` | **302** | `Location: ?download=a.jpg`; followed response is a 1600 derivative (≤ 500,000 B), bytes ≠ source bytes; source `curl /photos/a.jpg` is 403/404 (§12.2) |
| T30 | capabilities | fresh + probe | `?capabilities=1&probe=1` | 200 | exact key set of §6.4; no absolute paths; `probe` statuses present; second call `cached:true` |
| T31 | notice-free | `error_reporting(E_ALL)`, warnings forced | any error path | mapped status | body contains no `Warning:`, `Notice:`, `Deprecated:`, no `<br />` |
| T32 | pruning | 4100 cache files seeded | 200 requests | 200 | file count converges ≤ 4000, no request > 500 ms p95 regression, `.prune.lock` respected |
| T33 | static parity | §13.5 harness | — | pass | exact dims, pixel tolerance, metadata-free |
| T34 | static build without libheif | sharp format probe false + a HEIC fixture | `npm run photos` | exit 0, warn | HEIC entry skipped with `renderable:false`, no dangling URL |
| T35 | cache skeleton missing | delete one shard dir (e.g. `<cache>/7`) on a clean cache, cold request | `image=a.jpg&size=tile` | **503** `cache_unavailable` | **no `mkdir` attempt** (assert the dir is still absent), no fatal, no source bytes, one `error_log` line naming the shard |
| T36 | 60 MP rejection | generated 9000×6750 (60.75 MP) fixture | `image=big.jpg&size=tile` | **413** `source_too_many_pixels` | rejected on header dims only, no decode, no source bytes, `no-store` |
| T37 | ratified ceilings | warm cache, all rungs × both formats | `size=` tile/pack/detail × `format=` jpeg/webp; `?download=` | 200 | every `Content-Length ≤` its own ceiling: tile 36,000/55,000; pack 80,000/110,000; detail 150,000/210,000; download 350,000/500,000 B |

CI wiring: T01–T37 in the PHP harness job (PHP 8.6 CLI with GD+Imagick, plus a matrix run
with GD only and with neither); T33–T34 in the Node job; T21/T22/T23/T27/T29/T31 as curl
assertions against `php -S` in the same job (no Apache dependency for CI; the `.htaccess`
rows are verified manually per §16.3).

---

## 16. Rollout

### 16.1 Deploy order (no window where a client breaks)

0. **Create the cache skeleton — once per deploy target, never on the request path
   (§8.2, §8.8).** For the primary out-of-webroot cache, 16 shards from one hex char:

   ```sh
   cache="${ELSAPHOTO_CACHE_DIR:-../elsa-photo-cache}"
   mkdir -p "$cache/locks"
   for h in 0 1 2 3 4 5 6 7 8 9 a b c d e f; do mkdir -p "$cache/$h"; done
   chmod 0755 "$cache" "$cache"/*/
   ```

   Idempotent, safe to re-run after a cache wipe, and it must run **before** the first
   request: a missing shard dir is a `503 cache_unavailable`, by design. For the in-webroot
   fallback the same 16 directories arrive with the repo upload (tracked `.gitkeep`,
   §8.1) — no shell needed.

1. **Ship the static ladder first.** `scripts/photos.mjs` (sharp) → `photos/derived/**` +
   `photos.json` v3. Old clients ignore the new keys; `thumb`/`view` now point at static
   derivatives. If this step fails, nothing is lost — PHP is untouched.
2. **Ship `photos.php` v2** in the same FTP session as the new `photos/.htaccess` and
   `photos/.cache/.htaccess` (the deny rules and the code must land together, otherwise
   there is a window where originals are blocked but `?view=` still serves them, or vice
   versa — either order is safe *as a pair*, because v2's `?view=` is a 302 to
   `?download=` and never reads the source). `photos/.cache/.htaccess` is committed
   (`.gitignore` negation), so a normal "upload the tree" deploy carries it; do not
   exclude `.cache/` from the upload in the FTP client's filters.
3. **Verify** with §12.2 + T29 + T35 on the live host, and record `capabilities.cache.*`.
4. **Ship the client** changes (§14.3), verify, then delete `photos/thumbs/` and
   `photos/converted/` in a later session.
5. **Record** the capability JSON in the release checklist.

Keep a copy of the current `photos.php` locally (`docs/` is not the place; use the FTP
client's history or a git tag). Rollback = restore the file; the new cache directory is
derived data and can be deleted at any time, so rollback never needs a schema step.

### 16.2 Backward compatibility summary

- All three old query forms keep working.
- `photos.json` v3 is additive; v2 consumers see the same keys with the same roles.
- The only intentional behaviour changes: `?view=` now `302`s to `?download=` (1600; was the
  original), and `?thumb=` is a 720 JPEG even when GD is missing (was: original).
- PHP remains optional: without `photos.php`, the static ladder serves everything.

### 16.3 IONOS verification checklist (must be filled in, not ticked from memory)

| Check | How | Expected | Recorded value |
|---|---|---|---|
| PHP version ≥ 8.6 | `?capabilities=1` → `php` | `8.6.x` | |
| GD present | `capabilities.gd.present` | `true` | |
| GD JPEG / WebP / AVIF | `capabilities.gd.*` | jpeg `true` (required), webp expected `true`, avif informational | |
| Imagick present + version | `capabilities.imagick` | present `true`; version recorded | |
| Imagick HEIC delegate | `&probe=1` → `probe.heic` | `ok` or `fail` — if `fail`, the owner must export JPEG (documented in README) | |
| Imagick WebP delegate | `probe.webp` | `ok` | |
| `memory_limit` | `capabilities.memory.limit_bytes` + `.gd_max_pixels` | **≥ 512 MiB** (baseline, §10.3); 448 MiB is the bare floor for the 24.47 MP hero on GD; below that the hero needs Imagick or a re-export | |
| `memory.gd_max_pixels` | `?capabilities=1` | ≥ 24.47 MP, i.e. the hero renders on GD; record the exact MP ceiling | |
| `max_execution_time` | temp `?capabilities=1` field or host panel | ≥ 30 s | |
| `set_time_limit` allowed | probe with a deliberate slow request | no fatal | |
| Cache dir writable | `capabilities.cache.writable` | `true`; if the cache is not writable, set `ELSAPHOTO_CACHE_DIR` outside the webroot | |
| Cache outside the webroot (primary) | `capabilities.cache.inside_webroot == false` | `false`; `true` is accepted only if the two deny-file/skeleton rows below are recorded and verified | |
| `.cache/.htaccess` uploaded (fallback only) | `git check-ignore -q photos/.cache/.htaccess` (exit 1) + §12.2 curl | tracked in git; `403` — never `200`/`404`-by-luck | |
| Cache skeleton present | `capabilities.cache.shards == 16` and a cold request returns `200`, not `503 cache_unavailable` | 16 shard dirs + `locks/` exist before the first request (§8.2, §16.1 step 0) | |
| Originals unreachable | §12.2 curl for `photos/*.jpg` | `403`/`404` | |
| `mod_rewrite` available (config B) | the deny rule actually returns 403 | `403` | |
| `flock` supported on the cache FS | T18 on the live host | one render, no 503 storm | |
| `rename()` same-FS | T01 twice on live | second request served from cache (no `.tmp` growth) | |
| Disk quota headroom | panel | ≥ 200 MB free after 4 000 cache files | |
| FTP mtime preserved | upload a modified file, re-open | `v=` changes in `?list=1` | |
| FTP drop needs no redeploy | add a photo, reload `/` | new card appears (FTP + reload, PRD §7) | |
| Browser HEIC | Safari + Chrome on the ladder URLs | both 200 JPEG/WebP (no heic2any needed) | |

### 16.4 Post-deploy monitoring (no analytics — server-side only)

- `error_log` lines tagged `photo:` for `busy`, `memory_ceiling`, `source_undecodable`,
  `cache_unavailable`. The owner reads them over FTP when a card looks broken.
- A weekly glance at cache size (`?capabilities=1` → `cache.bytes`). > 200 MB ⇒ lower
  `PHOTO_CACHE_TTL_SECONDS` or delete the directory.

---

## 17. Risks and open decisions

| # | Risk / decision | Mitigation / status |
|---|---|---|
| R1 | IONOS may lack the Imagick HEIC delegate (common) → HEIC cards need a manual export | Handled honestly: `415` + `renderable:false` + placeholder + README instruction. Owner decision pending: export JPEG on drop (recommended) vs. accept a missing card. |
| R2 | `memory_limit` below 448 MiB makes the 24.47 MP hero unrenderable on GD, and below 512 MiB the GD ceiling drops under the documented 28.5 MP (§10.3) | Imagick disk-backed cache is tried second; otherwise `503 memory_ceiling` with an actionable "re-export at ≤ 6000 px" message. §16.3 requires the real limit **and** `memory.gd_max_pixels` recorded, so the caps are validated against the host, not assumed. |
| R3 | 32 MP acceptance vs the brief's "~24 MP" | **Settled by the ratified contract** (32 MP acceptance, 28.5 MP GD rendering ceiling). Justified by measurement (§10.2): a literal 24 MP cap would reject the repo's own hero (24.47 MP). No further owner decision; a hard 24 MP cap would require re-exporting the hero and an ADR amendment. |
| R4 | `photos/.htaccess` deny rule (config B) could 403 the derivatives if the regex is written wrong | Mitigated by the `^[^/]+` per-directory scoping and by T29/T12.2 running after every deploy; config A (outside webroot) removes the risk entirely. |
| R5 | WebP-only delivery would shrink bytes ~25 %, but Safari < 14 lacks it | Always negotiated: WebP is the default where the client advertises it, JPEG is the mandatory fallback through `<picture>`; the client opts in per `<picture>` from `images.*.webp`. Ladder produces both. |
| R6 | `flock` on a network filesystem can be unreliable | Verify in §16.3; fallback is `503 busy` (fail closed), never a torn file. |
| R7 | Copy still says "Original" in DE/EN for the save action | Must be rewritten in the same client PR (§14.3.3) — the interaction-copy audit will catch it otherwise. |
| R8 | sharp/libvips HEIC support differs per platform | `sharp.format` probe + skip-and-warn (§13.2); never emit a dangling URL. |

---

## 18. Definition of done

- [ ] `photos.php` contains no `serveFile()`, no `imagedestroy()`, and no code path that
      emits a source byte (grep gate in CI).
- [ ] `?image=…&size=tile|pack|detail&format=jpeg|webp[&v=…]` and
      `?download=NAME[&format=…][&v=…]` implemented; per-format ceilings enforced (§9);
      arbitrary sizes and `format=avif` rejected with `400`.
- [ ] `?thumb=` (720 alias) and `?view=` (302 → `?download=`) behave per §3.1; ambiguity rejected;
- [ ] `?capabilities=1[&probe=1]` returns the §6.4 shape with no absolute paths.
- [ ] Ladder is byte-checked at 360/720/1200/1600 with `withoutEnlargement` semantics.
- [ ] Cache: out-of-webroot default with a tracked in-webroot deny file as fallback,
      16 pre-created shards (never `mkdir` on the request path), keyed by §8.3, `flock` +
      atomic rename, pruning bounded, unwritable/missing skeleton ⇒ `503` (never originals).
- [ ] `memory_limit` ≥ 512 MiB recorded together with `memory.gd_max_pixels` (§10.3, §16.3);
      the hero renders on GD on the recorded host.
- [ ] Orientation normalised on both renderers; GPS/EXIF/XMP/ICC stripped and asserted.
- [ ] All T01–T35 green; T33/T34 in CI; T29 verified on the live host.
- [ ] `scripts/photos.mjs` uses sharp only; `sips` gone; `photos.json` v3 per §13.4.
- [ ] §16.3 checklist filled in with real values from `?capabilities=1&probe=1`.
- [ ] ADR-0004 amended + new pipeline ADR accepted.

---

## 19. References

- `photos.php` (current implementation, line numbers in §1/§5.1)
- `scripts/photos.mjs` (current static generator)
- `docs/architecture.md` — Data Contracts, Performance Budget, Error-State Taxonomy
- `docs/adr/ADR-0001-stack.md` (sharp 0.35.5 as dev dependency)
- `AGENTS.md` — FTP-drop workflow, canon (no water content), no small-project bias
- `PRD.md` §5 (privacy/security/performance), §7 (solo maintainer, PHP optional)
- Skills applied while authoring: `security-audit` (path containment, data exposure,
  resource exhaustion, dependency surface), `asset-audit` (measured source inventory:
  dimensions/bytes used to calibrate §10.2)
