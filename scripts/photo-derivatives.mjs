#!/usr/bin/env node
/**
 * Static derivative ladder — sharp 0.35.5. Local dev/QA only; never a runtime dependency.
 *
 * Spec:     docs/photo-pipeline-implementation.md §7 (render), §9 (byte caps), §13 (static parity)
 * Contract: docs/adr/ADR-0008-image-derivatives.md (ladder, no-original rule, ceilings)
 *           docs/adr/ADR-0004-manifest-contract.md §2 / §4 (manifest v2, srcset is derived)
 * Ticket:   #21 (this generator). #25 owns the CI byte-budget gate.
 *
 * What it does
 *   Reads every photo in the source directory, emits the four fixed rungs in JPEG and WebP
 *   (8 files per photo, never an original), and writes manifest v2 beside them.
 *
 * Rules it enforces (all from the spec — nothing invented here)
 *   1. Edges and start qualities come from scripts/photo-ladder.json, the single source shared
 *      with photos.php (§7.3). No edge or quality is written in this file.
 *   2. `fit = inside`, never upscale, `scale = min(1, edge / max(w, h))` (§3.3).
 *   3. EXIF orientation is applied exactly once and metadata is dropped by re-encoding (§7.2).
 *   4. Alpha is flattened onto the paper tone for JPEG; WebP keeps alpha (§3.3).
 *   5. Quality starts at the ladder value and only ever steps DOWN (4 at a time, floor 40)
 *      until the per-format byte ceiling is met; a rung that cannot meet its ceiling fails
 *      the run instead of shipping oversized bytes (§1, §9).
 *   6. No-original rule (§5): no output path, no manifest URL and no byte written by this
 *      script is a source path or a copy of a source file.
 *   7. Manifest v2 (ADR-0004 §2): `generated`, `source`, `pipeline`, `ladder`, and per photo
 *      `id`/`width`/`height`/`ver`/`images` plus the v1 metadata keys. `images` carries
 *      exactly `{jpeg, webp, w, h}` — no `srcset` (ADR-0004 §4), no extra bookkeeping.
 *   8. Idempotent: a second run over unchanged sources writes nothing — not one derivative,
 *      not the manifest. `--check` is the read-only drift gate.
 *   9. A clean run prunes rungs no current photo owns (SEC-001): a deleted or renamed photo
 *      must not leave a servable derivative behind that the manifest no longer lists.
 *
 * Usage
 *   node scripts/photo-derivatives.mjs                 # photos/ → photos/derived + photos.json
 *   node scripts/photo-derivatives.mjs --check         # read-only: verify ladder + manifest
 *   node scripts/photo-derivatives.mjs --source DIR --out DIR --manifest FILE
 *                                                      # fixtures / QA runs (used by the tests)
 *   node scripts/photo-derivatives.mjs --verbose        # + one line per written file
 *
 * Exit codes: 0 ok · 1 a photo failed, a ceiling was missed, or `--check` found drift · 2 usage
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, parse as parsePath, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const LADDER_FILE = join(ROOT, "scripts", "photo-ladder.json");

/** Fixed rendition set (§3.3), smallest first. */
const RUNGS = ["tile", "pack", "detail", "download"];
/** Fixed format set (§3.3): JPEG is the universal floor, WebP the default where supported. */
const FORMATS = ["jpeg", "webp"];
const EXTENSION = { jpeg: "jpg", webp: "webp" };

/**
 * Delivery budgets, hard per file and per format (§1, §9). KB = 1,000 bytes.
 * These are not safety caps: the 4× discard guard in §9 is a different number and is never
 * asserted as a pass condition. Mirrors docs/test-plan.md §4.3. A change here without an ADR
 * amendment is a defect.
 */
const CEILINGS = {
  tile: { webp: 36_000, jpeg: 55_000 },
  pack: { webp: 80_000, jpeg: 110_000 },
  detail: { webp: 150_000, jpeg: 210_000 },
  download: { webp: 350_000, jpeg: 500_000 },
};

/** Manifest pipeline version; bump with PHOTO_PIPELINE_VERSION in photos.php (§13.4). */
const PIPELINE_VERSION = 2;

/** Pre-decode acceptance caps, mirrored from photos.php (§10). A too-large source fails loudly. */
const MAX_SOURCE_BYTES = 20_971_520; // 20 MiB
const MAX_SOURCE_PIXELS = 32_000_000; // 32 MP
const MAX_SOURCE_EDGE = 8_000; // px, long edge

/** Quality search (§9): step down, never up, floor 40. Mirrors PHOTO_QUALITY_STEP/FLOOR. */
const QUALITY_FLOOR = 40;
const QUALITY_STEP = 4;

/** Paper tone for alpha flattening — from the ladder file, this only if it is absent. */
const PAPER_FALLBACK = "#F6EFDF";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"]);
const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);

/** Source subdirectories that are outputs or derived junk, never sources (§13.3). */
const RESERVED_DIRS = new Set(["derived", "thumbs", "converted", ".cache"]);

/** Bookkeeping for the skip decision and `--check`; lives beside the derivatives. */
const STATE_FILE = ".derived-state.json";

class UsageError extends Error {}
class PhotoError extends Error {}

const USAGE = `Static derivative ladder (sharp) — local dev/QA only.

  node scripts/photo-derivatives.mjs [options]

  --source DIR      source photos (default: photos)
  --out DIR         derivative output (default: <source>/derived, i.e. photos/derived)
  --manifest FILE   manifest v2 path (default: photos.json)
  --captions FILE   caption metadata (default: <source>/captions.json)
  --url-prefix P    public prefix for manifest URLs (default: <out> relative to the repo root)
  --check           read-only: verify the ladder and the manifest, exit 1 on drift
  --verbose         one line per written file
  --help            this text
`;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgv(argv) {
  const options = {
    source: "photos",
    out: null,
    manifest: "photos.json",
    captions: null,
    urlPrefix: null,
    check: false,
    verbose: false,
    help: false,
  };

  const valueFlags = new Set(["--source", "--out", "--manifest", "--captions", "--url-prefix"]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const equals = argument.indexOf("=");
    const flag = equals === -1 ? argument : argument.slice(0, equals);
    const inline = equals === -1 ? null : argument.slice(equals + 1);

    if (valueFlags.has(flag)) {
      const value = inline ?? argv[index + 1];
      if (value === undefined || value === "" || (inline === null && value.startsWith("--"))) {
        throw new UsageError(`${flag} needs a value`);
      }
      if (inline === null) index += 1;
      const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = value;
      continue;
    }

    switch (flag) {
      case "--check":
      case "--verbose":
      case "--help":
      case "-h":
        if (inline !== null) throw new UsageError(`${flag} takes no value`);
        if (flag === "--check") options.check = true;
        else if (flag === "--verbose") options.verbose = true;
        else options.help = true;
        break;
      default:
        throw new UsageError(`unknown argument: ${argument}`);
    }
  }

  return options;
}

function resolvePaths(options) {
  const source = resolve(ROOT, options.source);
  const out = options.out === null ? join(source, "derived") : resolve(ROOT, options.out);

  if (source === out) throw new UsageError("--out must differ from --source (it would overwrite sources)");
  if (out === ROOT) throw new UsageError("--out must not be the repository root");

  return {
    ...options,
    source,
    out,
    manifest: resolve(ROOT, options.manifest),
    captions: options.captions === null ? join(source, "captions.json") : resolve(ROOT, options.captions),
    urlPrefix: stripTrailingSlash(options.urlPrefix ?? defaultUrlPrefix(out)),
  };
}

/**
 * Manifest URLs must be deployable and repo-relative (§13.3: `photos/derived/tile/<id>.jpg`).
 * A QA run into a temp directory keeps a neutral prefix instead of leaking an absolute path.
 */
function defaultUrlPrefix(out) {
  const rel = relative(ROOT, out);
  if (rel === "" || rel.startsWith("..") || resolve(ROOT, rel) !== out) return basename(out);
  return rel.split("\\").join("/");
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

/** Repo-relative when the path is inside the repo, absolute otherwise (QA runs into a temp dir). */
function display(path) {
  const rel = relative(ROOT, path);
  return rel === "" || rel.startsWith("..") ? path : rel;
}

// ---------------------------------------------------------------------------
// Ladder (§7.3) — read, never re-declared
// ---------------------------------------------------------------------------

function loadLadder(file) {
  if (!existsSync(file)) {
    throw new PhotoError(`ladder file missing: ${display(file)} — it is the single source of edges/qualities`);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new PhotoError(`ladder file is not valid JSON: ${display(file)} (${error.message})`);
  }

  const edges = {};
  for (const rendition of RUNGS) {
    const edge = parsed?.[rendition]?.edge;
    if (!Number.isInteger(edge) || edge <= 0) {
      throw new PhotoError(`ladder file has no positive integer edge for "${rendition}"`);
    }
    if (edge > MAX_SOURCE_EDGE) {
      throw new PhotoError(`ladder edge "${rendition}" (${edge}) exceeds the ${MAX_SOURCE_EDGE} px source cap`);
    }
    edges[rendition] = edge;
  }

  const quality = {};
  for (const format of FORMATS) {
    quality[format] = {};
    for (const rendition of RUNGS) {
      const value = parsed?.quality?.[format]?.[rendition];
      if (!Number.isInteger(value) || value < QUALITY_FLOOR || value > 100) {
        throw new PhotoError(`ladder file has no usable ${format} quality for "${rendition}"`);
      }
      quality[format][rendition] = value;
    }
  }

  const paper =
    typeof parsed?.paper === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.paper) ? parsed.paper : PAPER_FALLBACK;

  return { edges, quality, paper, hash: contentHash(file) };
}

function contentHash(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function listSources(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const photos = [];
  const skipped = [];

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith(".")) continue;
    if (RESERVED_DIRS.has(name) && entry.isDirectory()) continue;

    if (entry.isSymbolicLink()) {
      // The drop folder is data, not code: a symlink is a containment question this pipeline
      // does not need to answer (the sources are plain phone photos). Skipped, and said out loud.
      if (IMAGE_EXTENSIONS.has(extname(name).toLowerCase())) skipped.push({ name, reason: "symlink" });
      continue;
    }

    if (!entry.isFile()) continue;
    if (!IMAGE_EXTENSIONS.has(extname(name).toLowerCase())) continue;
    photos.push(name);
  }

  // Numeric-aware, case-insensitive, and tie-broken by code point so two names that compare
  // equal at primary strength (e.g. `a b.jpg` vs `a-b.jpg`) still have one fixed order.
  photos.sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0),
  );

  return { photos, skipped };
}

/** Mirrors photos.php slugify(): umlauts transliterated, ASCII, lowercase, single dashes, ≤ 80. */
function slugify(value) {
  return value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** `-2`, `-3`, … on collision, exactly like photos.php and the archived v1 generator. */
function uniqueId(base, used) {
  const stem = base === "" ? "photo" : base;
  let id = stem;
  let attempt = 2;
  while (used.has(id)) {
    id = `${stem}-${attempt}`;
    attempt += 1;
  }
  used.add(id);
  return id;
}

/**
 * Every path this script writes or reads must stay inside its declared directory.
 * The id is already slug-safe; this is the belt for a future change that stops being true.
 */
function resolveInside(base, ...segments) {
  const target = resolve(base, ...segments);
  const rel = relative(base, target);
  if (rel.startsWith("..") || resolve(base, rel) !== target) {
    throw new PhotoError(`refusing to touch a path outside ${basename(base)}/: ${segments.join("/")}`);
  }
  return target;
}

// ---------------------------------------------------------------------------
// Rendering (§3.3, §7.2, §7.3)
// ---------------------------------------------------------------------------

/** §3.3 rounding formula, shared with photos.php so a rung cannot land at a different ratio. */
function scaledDimensions(width, height, edge) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Oriented source dimensions = the aspect-ratio authority (ADR-0004 §2).
 *
 * sharp 0.35.5 does not report rotated dimensions through `metadata()` even when the
 * pipeline carries `.rotate()`; it reports them as `metadata().autoOrient`. Reading
 * `width`/`height` here would swap the ratio of every EXIF-rotated phone photo — the exact
 * CLS defect D7 in §1. `autoOrient` is the oriented pair, `width`/`height` the stored pair.
 * Pinned by the orientation-6 fixture test.
 *
 * `limitInputPixels: false` is deliberate: this is the header read that must happen *before*
 * the acceptance caps are applied (§7.1 step 3 — PHP's `getimagesize` has no pixel limit).
 * With sharp's limit on, a decompression bomb would be rejected as "not decodable" instead of
 * naming the cap it violates. Nothing is decoded here; the render pipeline still passes
 * `limitInputPixels: MAX_SOURCE_PIXELS` as the second line of defence.
 */
async function orientedSize(source) {
  const meta = await sharp(source, { failOn: "error", limitInputPixels: false }).metadata();
  const oriented = meta.autoOrient ?? { width: meta.width, height: meta.height };
  if (!Number.isInteger(oriented.width) || !Number.isInteger(oriented.height)) {
    throw new PhotoError("source has no readable dimensions");
  }
  return { width: oriented.width, height: oriented.height };
}

/** One encode attempt at one quality. `.rotate()` first: orient, then everything written is upright. */
function encode(source, rendition, format, quality, ladder) {
  const edge = ladder.edges[rendition];
  const resized = sharp(source, { failOn: "error", limitInputPixels: MAX_SOURCE_PIXELS })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" });

  return (format === "jpeg"
    ? resized.flatten({ background: ladder.paper }).jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: "4:2:0",
      })
    : resized.webp({ quality, effort: 4 })
  ).toBuffer({ resolveWithObject: true });
}

/**
 * Encode one rung, stepping quality down until the ceiling is met (§9).
 * Throws rather than shipping an oversized file — "a rung is never shipped above its ceiling".
 */
async function renderRung(source, rendition, format, ladder) {
  const ceiling = CEILINGS[rendition][format];
  let quality = ladder.quality[format][rendition];

  for (;;) {
    const encoded = await encode(source, rendition, format, quality, ladder);
    if (encoded.info.size <= ceiling) return { ...encoded.info, data: encoded.data, quality, ceiling };
    if (quality - QUALITY_STEP < QUALITY_FLOOR) {
      throw new PhotoError(
        `${rendition}.${EXTENSION[format]} is still ${encoded.info.size} B at quality ${quality} ` +
          `(ceiling ${ceiling} B) — refusing to ship an over-budget rung`,
      );
    }
    quality -= QUALITY_STEP;
  }
}

/** Atomic write: temp file in the target directory, then rename (§13.3). */
function writeAtomic(target, data) {
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, data);
    renameSync(temporary, target);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

/**
 * Remove derivative files that no current photo owns (SEC-001 on PR #43).
 *
 * Without this, deleting or renaming a photo leaves its rungs behind: they are still valid
 * immutable URLs at `photos/derived/<rung>/<old-id>.jpg`, and a static host will serve them
 * forever — a retired photo stays publicly downloadable while the manifest pretends it is
 * gone. The no-original rule does not cover this; it is a *stale derivative* leak.
 *
 * Scope of the deletion is deliberately narrow:
 *   - only inside `<out>/<rung>/`, only regular files, only `.jpg`/`.jpeg`/`.webp`
 *   - only when the file's stem is not the id of a photo in the current run
 *   - only on a clean run (a failed run touches nothing, not even stale files)
 * `.derived-state.json`, unknown extensions and subdirectories are left alone, so a stray
 * owner file in the output tree is never deleted by a generator run.
 */
function pruneStale(out, ids, { dryRun = false } = {}) {
  const removed = [];

  for (const rendition of RUNGS) {
    const dir = join(out, rendition);
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (![".jpg", ".jpeg", ".webp"].includes(extname(entry.name).toLowerCase())) continue;
      if (ids.has(parsePath(entry.name).name)) continue;

      if (!dryRun) unlinkSync(resolveInside(out, rendition, entry.name));
      removed.push(`${rendition}/${entry.name}`);
    }
  }

  return removed;
}


// ---------------------------------------------------------------------------
// Captions (v1 metadata retained — ADR-0004 §2, §13.4)
// ---------------------------------------------------------------------------

function loadCaptions(file) {
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    // A typo must not silently blank every caption: this is local tooling, so say so and stop.
    throw new PhotoError(`cannot read ${basename(file)}: ${error.message}`);
  }
}

function localizable(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "";
  const out = {};
  for (const language of ["de", "en"]) {
    if (typeof value[language] === "string") out[language] = value[language].trim();
  }
  return out;
}

/** Same six keys as photos.php captionFor(), so one catalogue normalizes identically. */
function metadataFor(captions, filename) {
  const entry = captions[filename];

  if (typeof entry === "string") {
    return { caption: entry.trim(), alt: "", name: "", mood: "", description: "", rarity: "", extras: { ignored: [] } };
  }

  if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
    return {
      caption: localizable(entry.caption ?? ""),
      alt: localizable(entry.alt ?? ""),
      name: localizable(entry.name ?? ""),
      mood: localizable(entry.mood ?? ""),
      description: localizable(entry.description ?? ""),
      rarity: ["common", "rare", "holo"].includes(entry.rarity) ? entry.rarity : "",
      extras: collectionExtras(entry),
    };
  }

  return { caption: "", alt: "", name: "", mood: "", description: "", rarity: "", extras: { ignored: [] } };
}

/**
 * The collection fields ADR-0004 §2 added (`set`, `focus`, `chase`) are *preserved from
 * input*, never invented: absent in captions.json ⇒ absent in the manifest, so the static
 * emitter cannot disagree with the runtime one. A wrongly typed field is dropped and named.
 */
function collectionExtras(entry) {
  const extras = {};
  const ignored = [];

  if (typeof entry.set === "string" || entry.set === null) extras.set = entry.set;

  if (entry.focus !== null && typeof entry.focus === "object" && !Array.isArray(entry.focus)) {
    const x = Number(entry.focus.x);
    const y = Number(entry.focus.y);
    if (Number.isFinite(x) && Number.isFinite(y)) extras.focus = { x: clamp01(x), y: clamp01(y) };
    else ignored.push("focus");
  }

  if (typeof entry.chase === "boolean") extras.chase = entry.chase;

  return { ...extras, ignored };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// ---------------------------------------------------------------------------
// State — what makes a re-run free (§13.3 re-render rule; ticket: rewrites nothing)
// ---------------------------------------------------------------------------

function statePath(out) {
  return join(out, STATE_FILE);
}

function loadState(out) {
  const empty = { pipeline: null, ladder: null, photos: {}, manifest: null };
  const file = statePath(out);
  if (!existsSync(file)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return {
      pipeline: parsed?.pipeline ?? null,
      ladder: parsed?.ladder ?? null,
      manifest: parsed?.manifest ?? null,
      photos: parsed?.photos !== null && typeof parsed?.photos === "object" ? parsed.photos : {},
    };
  } catch {
    return empty;
  }
}

/** True only when the ladder, the source bytes and every expected output are still the same. */
function isFresh(entry, photo) {
  if (entry === undefined) return false;
  if (entry.ver !== photo.ver || entry.bytes !== photo.bytes || entry.mtimeMs !== photo.mtimeMs) return false;
  if (entry.id !== photo.id) return false;

  for (const rendition of RUNGS) {
    for (const format of FORMATS) {
      const recorded = entry.sizes?.[rendition]?.[format];
      if (!Number.isInteger(recorded) || recorded > CEILINGS[rendition][format]) return false;
      const file = photo.files[rendition][format];
      if (!existsSync(file) || statSync(file).size !== recorded) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Manifest v2 (ADR-0004 §2, §13.4) — no `srcset`, ever; `images` is exactly jpeg/webp/w/h
// ---------------------------------------------------------------------------

function manifestBody({ photos, ladder, urlPrefix, generated }) {
  const entries = photos.map((photo) => {
    const renderable = photo.renderable;
    const entry = { id: photo.id };

    // Deprecated bounded aliases (ADR-0004 §2/§3): each points at a rung, never at a file.
    for (const [key, rendition] of [["src", "detail"], ["thumb", "pack"], ["view", "download"], ["download", "download"]]) {
      if (renderable) entry[key] = `${urlPrefix}/${rendition}/${photo.id}.jpg`;
    }

    Object.assign(entry, {
      filename: photo.filename,
      caption: photo.metadata.caption,
      alt: photo.metadata.alt,
      name: photo.metadata.name,
      mood: photo.metadata.mood,
      description: photo.metadata.description,
      rarity: photo.metadata.rarity,
      demo: false,
      heic: HEIC_EXTENSIONS.has(extname(photo.filename).toLowerCase()),
      renderable,
      width: photo.width,
      height: photo.height,
      aspect: Math.round((photo.width / Math.max(1, photo.height)) * 10_000) / 10_000,
      ver: photo.ver,
    });

    if (renderable) {
      entry.images = Object.fromEntries(
        RUNGS.map((rendition) => [
          rendition,
          {
            jpeg: `${urlPrefix}/${rendition}/${photo.id}.jpg`,
            webp: `${urlPrefix}/${rendition}/${photo.id}.webp`,
            w: photo.images[rendition].w,
            h: photo.images[rendition].h,
          },
        ]),
      );
    }

    for (const [key, value] of Object.entries(photo.metadata.extras)) {
      if (key !== "ignored") entry[key] = value;
    }

    return entry;
  });

  return {
    generated,
    source: "photos",
    pipeline: PIPELINE_VERSION,
    ladder: Object.fromEntries(RUNGS.map((rendition) => [rendition, ladder.edges[rendition]])),
    photos: entries,
  };
}

/**
 * `generated` is the only field allowed to differ between two otherwise-identical runs, so it
 * is excluded: a no-op run keeps the timestamp of the last real change and writes nothing.
 */
function fingerprint(body) {
  const rest = {};
  for (const [key, value] of Object.entries(body)) if (key !== "generated") rest[key] = value;
  return createHash("sha256").update(JSON.stringify(rest)).digest("hex");
}

function existingFingerprint(file) {
  try {
    return fingerprint(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Byte table — read by a non-engineer owner: bytes, KB, budget, share used, verdict
// ---------------------------------------------------------------------------

const KB = (bytes) => (bytes / 1000).toFixed(1);

function verdict(share) {
  if (share > 0.95) return "FLAG";
  if (share > 0.8) return "tight";
  return "ok";
}

function printByteTable(photos, edges, verbose) {
  const renderable = photos.filter((photo) => photo.renderable);
  const edgeLine = RUNGS.map((rendition) => `${rendition} ${edges[rendition]}`).join(" / ");

  console.log(`\nByte table — ${renderable.length} photos × 4 rungs × 2 formats = ${renderable.length * 8} files`);
  console.log(`Longest edge per rung: ${edgeLine} px. Ceilings: docs/test-plan.md §4.3 / ADR-0008 §1 (KB = 1,000 B).`);
  console.log("");
  console.log("  rung      edge  format  largest file     budget           used   verdict");
  console.log("  ---------------------------------------------------------------------------");

  for (const rendition of RUNGS) {
    for (const format of FORMATS) {
      const sizes = renderable.map((photo) => photo.sizes[rendition][format]).filter((size) => Number.isInteger(size));
      if (sizes.length === 0) continue;

      const largest = Math.max(...sizes);
      const ceiling = CEILINGS[rendition][format];
      const share = largest / ceiling;

      console.log(
        `  ${rendition.padEnd(9)} ${String(edges[rendition]).padStart(4)}  ${format.padEnd(6)}  ` +
          `${`${KB(largest)} KB`.padEnd(15)}  ${`${KB(ceiling)} KB`.padEnd(15)}  ` +
          `${`${Math.round(share * 100)}%`.padStart(4)}   ${verdict(share)}`,
      );
    }
  }

  console.log("  ---------------------------------------------------------------------------");
  console.log("  used = share of the ratified budget the largest file takes; ok ≤ 80 %, tight 80–95 %,");
  console.log("  FLAG > 95 % — ADR-0008 wants every rung ~20 % under its ceiling, so a FLAG is not a pass.");

  if (verbose) {
    console.log("");
    for (const photo of photos) {
      for (const rendition of RUNGS) {
        for (const format of FORMATS) {
          const image = photo.images[rendition];
          console.log(
            `  ${photo.id} ${rendition}.${EXTENSION[format]} ${image.w}×${image.h} ` +
              `${photo.sizes[rendition][format] ?? "-"} B${photo.quality[rendition]?.[format] ? ` q${photo.quality[rendition][format]}` : ""}`,
          );
        }
      }
    }
  }
}

function totalBytes(photos) {
  let total = 0;
  for (const photo of photos) {
    for (const rendition of RUNGS) {
      for (const format of FORMATS) total += photo.sizes[rendition][format] ?? 0;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(argv) {
  const options = resolvePaths(parseArgv(argv));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const ladder = loadLadder(LADDER_FILE);

  if (!existsSync(options.source)) {
    throw new PhotoError(`source directory not found: ${display(options.source)}`);
  }

  const listing = listSources(options.source);
  if (listing.photos.length === 0) {
    throw new PhotoError(`no photos in ${display(options.source)} — nothing to derive`);
  }
  for (const skipped of listing.skipped) console.warn(`skip: ${skipped.name} (${skipped.reason})`);

  const captions = loadCaptions(options.captions);
  const previous = loadState(options.out);

  const photos = [];
  const problems = [];
  const ignoredFields = [];

  // `--check` is the drift gate: a ladder or pipeline change invalidates every rung at once
  // (§13.3), so it is reported before the per-file walk.
  if (options.check) {
    if (previous.ladder !== ladder.hash) {
      problems.push("ladder changed since the last run — re-run without --check to re-render every rung");
    }
    if (previous.pipeline !== PIPELINE_VERSION) {
      problems.push(`pipeline version changed (${previous.pipeline ?? "none"} → ${PIPELINE_VERSION}) — re-run without --check`);
    }
  }
  const used = new Set();

  for (const filename of listing.photos) {
    const source = resolveInside(options.source, filename);
    const stats = statSync(source);

    if (stats.size > MAX_SOURCE_BYTES) {
      problems.push(`${filename}: ${stats.size} B exceeds the 20 MiB source cap (§10)`);
      continue;
    }

    const ver = contentHash(source).slice(0, 16);
    const id = uniqueId(slugify(parsePath(filename).name), used);
    const metadata = metadataFor(captions, filename);
    if (metadata.extras.ignored.length > 0) ignoredFields.push(`${filename}: ${metadata.extras.ignored.join(", ")}`);

    let size;
    try {
      size = await orientedSize(source);
    } catch (error) {
      // A build without the decoder (libheif/avif) is a capability fact, not a corrupt photo:
      // the card stays in the catalogue as non-renderable (§13.4) with no image URL, and the
      // run still fails so the gap cannot pass unnoticed (§13.2).
      const extension = extname(filename).toLowerCase();
      const decodable = HEIC_EXTENSIONS.has(extension) ? sharp.format.heif?.input?.file : extension === ".avif" ? sharp.format.avif?.input?.file : true;
      if (!decodable) {
        console.warn(
          `warn: ${filename} needs libheif/avif support this sharp build lacks — listed as renderable:false.\n` +
            "      Export JPEG from Photos.app (File ▸ Export ▸ JPEG) into the source folder and re-run.",
        );
        photos.push({
          filename, id, ver, width: 0, height: 0,
          bytes: stats.size, mtimeMs: Math.round(stats.mtimeMs),
          renderable: false, metadata, files: {}, images: {}, sizes: {}, quality: {},
        });
        problems.push(`${filename}: no derivative possible in this build (renderable:false)`);
      } else {
        problems.push(`${filename}: not decodable — ${error.message}`);
      }
      continue;
    }

    if (Math.max(size.width, size.height) > MAX_SOURCE_EDGE) {
      problems.push(`${filename}: ${size.width}×${size.height} exceeds the ${MAX_SOURCE_EDGE} px edge cap (§10)`);
      continue;
    }
    if (size.width * size.height > MAX_SOURCE_PIXELS) {
      problems.push(`${filename}: ${size.width}×${size.height} exceeds the 32 MP cap (§10)`);
      continue;
    }

    const files = {};
    for (const rendition of RUNGS) {
      files[rendition] = {};
      for (const format of FORMATS) {
        files[rendition][format] = resolveInside(options.out, rendition, `${id}.${EXTENSION[format]}`);
      }
    }

    const photo = {
      filename, id, ver, size,
      bytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      width: size.width,
      height: size.height,
      renderable: true,
      metadata,
      files,
      images: {},
      sizes: {},
      quality: {},
    };

    if (options.check) {
      await checkPhoto(photo, previous, ladder, options.out, problems);
      photos.push(photo);
      continue;
    }

    const entry = previous.photos[filename];
    if (entry !== undefined && isFresh(entry, photo)) {
      photo.images = entry.images;
      photo.sizes = entry.sizes;
      photo.quality = entry.quality ?? {};
      if (options.verbose) console.log(`unchanged  ${filename} → ${id}`);
      photos.push(photo);
      continue;
    }

    try {
      for (const rendition of RUNGS) {
        const expected = scaledDimensions(size.width, size.height, ladder.edges[rendition]);
        photo.images[rendition] = { w: expected.width, h: expected.height };
        photo.sizes[rendition] = {};
        photo.quality[rendition] = {};

        for (const format of FORMATS) {
          const target = photo.files[rendition][format];
          mkdirSync(dirname(target), { recursive: true });

          const rendered = await renderRung(source, rendition, format, ladder);
          if (rendered.width !== expected.width || rendered.height !== expected.height) {
            throw new PhotoError(
              `${rendition}.${EXTENSION[format]} came out ${rendered.width}×${rendered.height}; ` +
                `§3.3 formula says ${expected.width}×${expected.height}`,
            );
          }

          writeAtomic(target, rendered.data);
          photo.sizes[rendition][format] = rendered.size;
          photo.quality[rendition][format] = rendered.quality;
          if (options.verbose) {
            console.log(
              `rendered   ${relative(options.out, target)} ${rendered.width}×${rendered.height} ` +
                `${rendered.size} B q${rendered.quality}`,
            );
          }
        }
      }
    } catch (error) {
      problems.push(`${filename}: ${error.message}`);
      continue;
    }

    photos.push(photo);
  }

  // Manifest — written only when the body actually changed, and only for a clean run: a
  // half-written catalogue that silently omits the photo that failed is worse than none.
  const body = manifestBody({ photos, ladder, urlPrefix: options.urlPrefix, generated: new Date().toISOString() });
  const current = fingerprint(body);
  const manifestChanged =
    options.check || problems.length > 0
      ? existingFingerprint(options.manifest) !== current
      : !existsSync(options.manifest) || existingFingerprint(options.manifest) !== current;

  if (options.check) {
    if (!existsSync(options.manifest)) problems.push(`${display(options.manifest)} is missing`);
    else if (manifestChanged) problems.push(`${display(options.manifest)} is out of date — catalogue or ladder changed`);
  } else if (problems.length > 0) {
    console.error(`\nmanifest: not written — ${display(options.manifest)} would be incomplete, and the run failed`);
  } else if (manifestChanged) {
    writeAtomic(options.manifest, `${JSON.stringify(body, null, 2)}\n`);
    console.log(`\nmanifest: written ${display(options.manifest)} (${body.photos.length} photos, pipeline ${PIPELINE_VERSION})`);
  } else {
    console.log(`\nmanifest: unchanged ${display(options.manifest)}`);
  }

  if (photos.length > 0) printByteTable(photos, ladder.edges, options.verbose);

  // Stale derivatives are reported by --check (drift) and removed by a clean run (SEC-001).
  const ids = new Set(photos.filter((photo) => photo.renderable).map((photo) => photo.id));

  if (options.check) {
    for (const stale of pruneStale(options.out, ids, { dryRun: true })) {
      problems.push(`stale derivative ${stale} — no current photo owns it; run without --check to prune`);
    }
  } else if (problems.length === 0) {
    const removed = pruneStale(options.out, ids);
    if (removed.length > 0) {
      console.log(`\nprune: removed ${removed.length} stale file(s) no longer in the catalogue`);
      for (const file of removed.slice(0, 12)) console.log(`  - ${file}`);
      if (removed.length > 12) console.log(`  … and ${removed.length - 12} more`);
    }
  }

  if (!options.check && problems.length === 0) {
    writeState(options.out, { ladder, manifest: current, photos });
  }

  if (ignoredFields.length > 0) {
    console.warn(`\nignored caption fields (wrong type, ADR-0004 §2): ${ignoredFields.join("; ")}`);
  }

  if (problems.length > 0) {
    console.error(`\n${options.check ? "check: DRIFT" : "derivatives: FAILED"} — ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    return 1;
  }

  const files = photos.filter((photo) => photo.renderable).length * RUNGS.length * FORMATS.length;
  if (options.check) {
    console.log(`\ncheck: in sync — ${photos.length} photos, ${files} files, every rung within its budget`);
  } else {
    console.log(
      `\nderivatives: ok — ${photos.length} photos, ${files} files, ${KB(totalBytes(photos))} KB total ` +
        `(${display(options.out)})`,
    );
  }

  return 0;
}

/**
 * `--check` never writes and never renders: it compares recorded state, file sizes and the
 * header dimensions of each derivative against what the ladder says they must be.
 */
async function checkPhoto(photo, previous, ladder, out, problems) {
  const entry = previous.photos[photo.filename];

  for (const rendition of RUNGS) {
    const dims = scaledDimensions(photo.width, photo.height, ladder.edges[rendition]);
    photo.images[rendition] = { w: dims.width, h: dims.height };
    photo.sizes[rendition] = {};
  }

  if (entry === undefined) {
    problems.push(`${photo.filename}: no recorded derivative state — run without --check`);
    return;
  }
  if (entry.ver !== photo.ver) {
    problems.push(`${photo.filename}: source changed since the last run (ver ${entry.ver} → ${photo.ver})`);
    return;
  }

  for (const rendition of RUNGS) {
    for (const format of FORMATS) {
      const target = photo.files[rendition][format];
      const rel = relative(out, target);

      if (!existsSync(target)) {
        problems.push(`${photo.filename}: missing ${rel}`);
        continue;
      }

      const bytes = statSync(target).size;
      const ceiling = CEILINGS[rendition][format];
      photo.sizes[rendition][format] = bytes;

      if (bytes > ceiling) problems.push(`${photo.filename}: ${rel} is ${bytes} B, over its ${ceiling} B ceiling`);
      const recorded = entry.sizes?.[rendition]?.[format];
      if (recorded !== undefined && recorded !== bytes) {
        problems.push(`${photo.filename}: ${rel} changed on disk (${recorded} B recorded, ${bytes} B found)`);
      }

      try {
        // Header parse only — the same job `getimagesize()` does in PHP (§7.1).
        const meta = await sharp(target).metadata();
        if (meta.width !== photo.images[rendition].w || meta.height !== photo.images[rendition].h) {
          problems.push(
            `${photo.filename}: ${rel} is ${meta.width}×${meta.height}, ladder says ` +
              `${photo.images[rendition].w}×${photo.images[rendition].h}`,
          );
        }
      } catch {
        problems.push(`${photo.filename}: ${rel} is not a readable image`);
      }
    }
  }
}

function writeState(out, { ladder, manifest, photos }) {
  const state = {
    pipeline: PIPELINE_VERSION,
    ladder: ladder.hash,
    manifest,
    photos: Object.fromEntries(
      photos
        .filter((photo) => photo.renderable)
        .map((photo) => [
          photo.filename,
          {
            id: photo.id,
            ver: photo.ver,
            bytes: photo.bytes,
            mtimeMs: photo.mtimeMs,
            sizes: photo.sizes,
            quality: photo.quality,
            images: photo.images,
          },
        ]),
    ),
  };

  const target = statePath(out);
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  if (existsSync(target) && readFileSync(target, "utf8") === serialized) return;
  mkdirSync(dirname(target), { recursive: true });
  writeAtomic(target, serialized);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof UsageError) {
      console.error(`photo-derivatives: ${error.message}\n\n${USAGE}`);
      process.exitCode = 2;
      return;
    }
    console.error(`photo-derivatives: ${error instanceof Error ? error.message : String(error)}`);
    if (process.env.PHOTO_DEBUG === "1" && error instanceof Error && error.stack) console.error(error.stack);
    process.exitCode = 1;
  });
