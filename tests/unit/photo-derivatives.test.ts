import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type Sharp } from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Static derivative ladder — manifest v2 + byte budgets (ticket #21).
 *
 * Spec: docs/photo-pipeline-implementation.md §3.3 (rungs + ceilings), §7.2 (orientation,
 * metadata), §9 (byte budgets), §13.3/§13.4 (static layout, manifest v2).
 * Contract: docs/adr/ADR-0004-manifest-contract.md (§2 fields, §4 no transmitted `srcset`),
 * ADR-0008 (§1 ladder + ceilings, §3 no-original rule).
 *
 * Every image here is generated at test setup (docs/test-plan.md §4.2): a committed source
 * photo would be a permanent EXIF/GPS leak. Fixtures live in a temp directory, never in the
 * repo, and nothing is ever read from `photos/`.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "photo-derivatives.mjs");
const LADDER_FILE = join(ROOT, "scripts", "photo-ladder.json");

type Rung = "tile" | "pack" | "detail" | "download";

const RUNGS: Rung[] = ["tile", "pack", "detail", "download"];
const FORMATS = ["jpeg", "webp"] as const;

const LADDER = JSON.parse(readFileSync(LADDER_FILE, "utf8")) as Record<Rung, { edge: number }> & {
  quality: Record<"jpeg" | "webp", Record<Rung, number>>;
  paper: string;
};

/**
 * The ratified delivery budgets, written out again on purpose
 * (docs/test-plan.md §4.3 / ADR-0008 §1, KB = 1,000 B). A loosened number inside the script
 * fails here — this copy is the gate, not a mirror edited together with it.
 */
const CEILINGS: Record<Rung, { jpeg: number; webp: number }> = {
  tile: { jpeg: 55_000, webp: 36_000 },
  pack: { jpeg: 110_000, webp: 80_000 },
  detail: { jpeg: 210_000, webp: 150_000 },
  download: { jpeg: 500_000, webp: 350_000 },
};

type RungImage = { jpeg: string; webp: string; w: number; h: number };
type PhotoEntry = {
  id: string;
  filename: string;
  width: number;
  height: number;
  aspect: number;
  ver: string;
  renderable: boolean;
  heic: boolean;
  demo: boolean;
  caption: unknown;
  alt: unknown;
  name: unknown;
  mood: unknown;
  description: unknown;
  rarity: string;
  src?: string;
  thumb?: string;
  view?: string;
  download?: string;
  images?: Record<Rung, RungImage>;
  set?: string | null;
  focus?: { x: number; y: number };
  chase?: boolean;
  [extra: string]: unknown;
};
type Manifest = {
  generated: string;
  source: string;
  pipeline: number;
  ladder: Record<Rung, number>;
  photos: PhotoEntry[];
  [extra: string]: unknown;
};

const EXT = { jpeg: "jpg", webp: "webp" } as const;

const roots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "elsa-derivatives-"));
  roots.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixtures — generated, deterministic, never a real photo
// ---------------------------------------------------------------------------

/** A gradient with a numeric pattern: high-entropy enough that the byte budgets are exercised. */
function gradient(width: number, height: number): Sharp {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      data[offset] = (x * 7 + y * 3) % 256;
      data[offset + 1] = (y * 5) % 256;
      data[offset + 2] = (x * 11) % 256;
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } });
}

type Fixtures = { rotated: Buffer; landscape: Buffer; alpha: Buffer };

const fixtures: Fixtures = { rotated: Buffer.alloc(0), landscape: Buffer.alloc(0), alpha: Buffer.alloc(0) };

beforeAll(async () => {
  // 900×1200 stored with EXIF orientation 6 ⇒ upright 1200×900 (the D7 class of bug).
  fixtures.rotated = await gradient(900, 1200).jpeg({ quality: 85 }).withMetadata({ orientation: 6 }).toBuffer();
  fixtures.landscape = await gradient(1200, 900).jpeg({ quality: 85 }).toBuffer();
  fixtures.alpha = await sharp({
    create: { width: 300, height: 200, channels: 4, background: { r: 12, g: 200, b: 40, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
}, 60_000);

const CAPTIONS_WITH_EXTRAS = {
  "rotated.jpg": {
    name: { de: "Gedreht", en: "Rotated" },
    alt: { de: "Ein Testbild.", en: "A test image." },
    rarity: "rare",
    set: "abfahrt",
    focus: { x: -0.5, y: 1.5 },
    chase: true,
  },
  "landscape.jpg": "Ein einfacher Satz",
};

/** Captions without the collection extras, for the runtime-parity comparison (PHP emits neither). */
const CAPTIONS_PLAIN = {
  "rotated.jpg": { name: { de: "Gedreht", en: "Rotated" }, alt: { de: "Ein Testbild.", en: "A test image." } },
};

type RunDirs = { source: string; out: string; manifest: string };

/** A fresh run directory per test, so one test can never inherit another's state. */
function runDir(
  name: string,
  options: { fixtures?: Array<keyof Fixtures | "captions">; captions?: Record<string, unknown> | null } = {},
): RunDirs {
  const base = join(tempRoot(), name);
  const source = join(base, "source");
  mkdirSync(source, { recursive: true });

  const wanted = options.fixtures ?? ["rotated", "landscape", "alpha"];
  for (const key of wanted) {
    if (key === "captions") continue;
    writeFileSync(join(source, `${key}.${key === "alpha" ? "png" : "jpg"}`), fixtures[key]);
  }

  const captions = options.captions === null ? null : (options.captions ?? CAPTIONS_WITH_EXTRAS);
  if (captions !== null) writeFileSync(join(source, "captions.json"), `${JSON.stringify(captions, null, 2)}\n`);

  return { source, out: join(base, "derived"), manifest: join(base, "photos.json") };
}

function run(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", timeout: 120_000 });
}

function generate(dirs: RunDirs, extra: string[] = []) {
  return run(["--source", dirs.source, "--out", dirs.out, "--manifest", dirs.manifest, ...extra]);
}

function manifestOf(file: string): Manifest {
  return JSON.parse(readFileSync(file, "utf8")) as Manifest;
}

function photo(manifest: Manifest, filename: string): PhotoEntry {
  const found = manifest.photos.find((entry) => entry.filename === filename);
  if (found === undefined) throw new Error(`${filename} is missing from the manifest`);
  return found;
}

function rungFile(dirs: RunDirs, id: string, rung: Rung, format: "jpeg" | "webp"): string {
  return join(dirs.out, rung, `${id}.${EXT[format]}`);
}

function filesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const target = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesIn(target));
    else out.push(target);
  }
  return out.sort();
}

/** Content + size + mtime per file — "rewrites nothing" needs all three. */
function snapshot(dir: string, extraFiles: string[] = []): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of [...filesIn(dir), ...extraFiles]) {
    const stats = statSync(file);
    map.set(file, `${stats.size}:${stats.mtimeMs}:${createHash("sha256").update(readFileSync(file)).digest("hex")}`);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Manifest v2 (ADR-0004 §2, §13.4)
// ---------------------------------------------------------------------------

describe("manifest v2", () => {
  it("emits the v2 document shape, four rungs per photo, and no transmitted srcset", () => {
    const dirs = runDir("shape");
    const result = generate(dirs);

    expect(result.status, result.stderr).toBe(0);

    const manifest = manifestOf(dirs.manifest);

    expect(Object.keys(manifest).sort()).toEqual(["generated", "ladder", "photos", "pipeline", "source"]);
    expect(manifest.source).toBe("photos");
    expect(manifest.pipeline).toBe(2);
    expect(Number.isNaN(Date.parse(manifest.generated))).toBe(false);
    expect(manifest.ladder).toEqual({
      tile: LADDER.tile.edge,
      pack: LADDER.pack.edge,
      detail: LADDER.detail.edge,
      download: LADDER.download.edge,
    });
    expect(manifest.photos).toHaveLength(3);

    for (const entry of manifest.photos) {
      expect(entry.images, `${entry.filename} has no images block`).toBeDefined();
      expect(Object.keys(entry.images ?? {}).sort()).toEqual([...RUNGS].sort());

      for (const rung of RUNGS) {
        const image = (entry.images as Record<Rung, RungImage>)[rung];
        expect(Object.keys(image).sort(), `${entry.id}.${rung} carries extra fields`).toEqual(["h", "jpeg", "w", "webp"]);
        expect(image.jpeg).toBe(`derived/${rung}/${entry.id}.jpg`);
        expect(image.webp).toBe(`derived/${rung}/${entry.id}.webp`);
        expect(image.w).toBeGreaterThan(0);
        expect(image.h).toBeGreaterThan(0);
      }

      // Deprecated bounded aliases point at rungs, never at a file (ADR-0004 §3).
      expect(entry.src).toBe(`derived/detail/${entry.id}.jpg`);
      expect(entry.thumb).toBe(`derived/pack/${entry.id}.jpg`);
      expect(entry.view).toBe(`derived/download/${entry.id}.jpg`);
      expect(entry.download).toBe(`derived/download/${entry.id}.jpg`);

      // ADR-0004 §4: srcset is composed by the component, never transmitted.
      expect(entry).not.toHaveProperty("srcset");
    }

    expect(readFileSync(dirs.manifest, "utf8")).not.toContain("srcset");
  }, 30_000);

  it("keeps width/height as the oriented source ratio and each rung's own w/h on that ratio", () => {
    const dirs = runDir("orientation");
    expect(generate(dirs).status).toBe(0);

    const manifest = manifestOf(dirs.manifest);
    const rotated = photo(manifest, "rotated.jpg");

    // Stored 900×1200 with EXIF orientation 6 ⇒ upright 1200×900 (spec §1 D7, §7.2).
    expect([rotated.width, rotated.height]).toEqual([1200, 900]);
    expect(rotated.aspect).toBe(1.3333);
    expect(rotated.images?.tile).toMatchObject({ w: 360, h: 270 });
    expect(rotated.images?.detail).toMatchObject({ w: 1200, h: 900 });

    // A source smaller than a rung is never upscaled (§3.3).
    const alpha = photo(manifest, "alpha.png");
    expect([alpha.width, alpha.height]).toEqual([300, 200]);
    for (const rung of RUNGS) expect(alpha.images?.[rung]).toMatchObject({ w: 300, h: 200 });

    // The written files agree with the manifest — a ratio that only exists in JSON is not a ratio.
    const tile = statSync(rungFile(dirs, rotated.id, "tile", "jpeg"));
    expect(tile.size).toBeGreaterThan(0);
  }, 30_000);

  it("preserves caption/set/focus/chase from input and invents nothing", () => {
    const dirs = runDir("metadata");
    const result = generate(dirs);

    expect(result.status, result.stderr).toBe(0);

    const manifest = manifestOf(dirs.manifest);
    const rotated = photo(manifest, "rotated.jpg");
    const landscape = photo(manifest, "landscape.jpg");
    const alpha = photo(manifest, "alpha.png");

    expect(rotated.name).toEqual({ de: "Gedreht", en: "Rotated" });
    expect(rotated.rarity).toBe("rare");
    expect(rotated.set).toBe("abfahrt");
    expect(rotated.chase).toBe(true);
    // focus is clamped to 0..1, not dropped (ADR-0004 §2).
    expect(rotated.focus).toEqual({ x: 0, y: 1 });

    // A string caption entry keeps the v1 meaning.
    expect(landscape.caption).toBe("Ein einfacher Satz");

    // Absent in captions.json ⇒ absent in the manifest, so static and runtime cannot disagree.
    expect(alpha).not.toHaveProperty("set");
    expect(alpha).not.toHaveProperty("focus");
    expect(alpha).not.toHaveProperty("chase");
    expect(alpha.rarity).toBe("");
  }, 30_000);

  it("derives a stable slug id from the filename and dedupes collisions like the runtime", () => {
    const dirs = runDir("ids", { fixtures: ["landscape"], captions: null });
    writeFileSync(join(dirs.source, "same name.jpg"), fixtures.landscape);
    writeFileSync(join(dirs.source, "same-name.jpg"), fixtures.alpha);
    writeFileSync(join(dirs.source, "Über Élsa ß.jpg"), fixtures.landscape);

    expect(generate(dirs).status).toBe(0);

    const ids = manifestOf(dirs.manifest).photos.map((entry) => entry.id);
    // "same name.jpg" sorts before "same-name.jpg" by code point; both slug to `same-name`.
    expect(ids).toEqual(["landscape", "same-name", "same-name-2", "ueber-elsa-ss"]);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Byte budget (§1, §9, docs/test-plan.md §4.3)
// ---------------------------------------------------------------------------

describe("byte budget", () => {
  it("keeps every emitted file under the ratified per-format ceiling and prints the table", () => {
    const dirs = runDir("budget");
    const result = generate(dirs);

    expect(result.status, result.stderr).toBe(0);

    const manifest = manifestOf(dirs.manifest);
    let checked = 0;

    for (const entry of manifest.photos) {
      for (const rung of RUNGS) {
        for (const format of FORMATS) {
          const bytes = statSync(rungFile(dirs, entry.id, rung, format)).size;
          expect(bytes, `${entry.id} ${rung}.${format} is over its ceiling`).toBeLessThanOrEqual(CEILINGS[rung][format]);
          expect(bytes).toBeGreaterThan(0);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(24);

    // The printed table must state the budget it measured against: someone who is not an
    // engineer should be able to check one row without reading the code.
    for (const rung of RUNGS) {
      for (const format of FORMATS) {
        const row = result.stdout
          .split("\n")
          .find((line) => line.trimStart().startsWith(`${rung} `) && line.includes(format));
        expect(row, `byte table has no ${rung} ${format} row`).toBeDefined();
        expect(row).toContain((CEILINGS[rung][format] / 1000).toFixed(1));
        expect(/ (ok|tight|FLAG)$/.test(row?.trimEnd() ?? ""), `no verdict on the ${rung} ${format} row`).toBe(true);
      }
    }
  }, 30_000);

  it("never emits a file the size of the source and never addresses an original", () => {
    const dirs = runDir("no-original");
    expect(generate(dirs).status).toBe(0);

    const manifest = manifestOf(dirs.manifest);
    for (const entry of manifest.photos) {
      const sourceBytes = statSync(join(dirs.source, entry.filename)).size;
      for (const rung of RUNGS) {
        for (const format of FORMATS) {
          expect(statSync(rungFile(dirs, entry.id, rung, format)).size).not.toBe(sourceBytes);
        }
      }

      // No manifest URL may address the source folder or an original: every URL is a rung
      // of the derivative ladder and nothing else.
      for (const rung of RUNGS) {
        expect(entry.images?.[rung].jpeg).toBe(`derived/${rung}/${entry.id}.jpg`);
        expect(entry.images?.[rung].webp).toBe(`derived/${rung}/${entry.id}.webp`);
      }
      expect(JSON.stringify(entry.images)).not.toMatch(/photos\//);
      expect(JSON.stringify(entry.images)).not.toContain(dirs.source);
    }
  }, 30_000);

  it("strips EXIF/GPS/ICC metadata from every emitted file (§7.2)", () => {
    const dirs = runDir("metadata-strip");
    expect(generate(dirs).status).toBe(0);

    const entry = photo(manifestOf(dirs.manifest), "rotated.jpg");

    // The source does carry EXIF orientation — otherwise this test proves nothing.
    expect(readFileSync(join(dirs.source, "rotated.jpg")).includes(Buffer.from("Exif\0\0"))).toBe(true);

    for (const rung of RUNGS) {
      for (const format of FORMATS) {
        const file = rungFile(dirs, entry.id, rung, format);
        const bytes = readFileSync(file);
        expect(bytes.includes(Buffer.from("Exif\0\0")), `${file} carries EXIF`).toBe(false);
        expect(bytes.includes(Buffer.from("http://ns.adobe.com/xap")), `${file} carries XMP`).toBe(false);
        expect(bytes.includes(Buffer.from("ICC_PROFILE")), `${file} carries an ICC profile`).toBe(false);
      }
    }
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Idempotency + the --check drift gate (§13.3 re-render rule)
// ---------------------------------------------------------------------------

describe("idempotency and --check", () => {
  it("rewrites nothing on a second run over unchanged sources", () => {
    const dirs = runDir("idempotent");

    const first = generate(dirs);
    expect(first.status, first.stderr).toBe(0);
    const before = snapshot(dirs.out, [dirs.manifest]);

    const second = generate(dirs);
    expect(second.status, second.stderr).toBe(0);

    expect(second.stdout).toContain("manifest: unchanged");
    expect(second.stdout).not.toContain("rendered ");

    expect([...snapshot(dirs.out, [dirs.manifest]).entries()]).toEqual([...before.entries()]);

    const check = generate(dirs, ["--check"]);
    expect(check.status, check.stderr).toBe(0);
    expect(check.stdout).toContain("check: in sync");
  }, 30_000);

  it("reports drift and exits non-zero when a derivative changed on disk", () => {
    const dirs = runDir("drift");
    expect(generate(dirs).status).toBe(0);

    const victim = rungFile(dirs, "landscape", "detail", "jpeg");
    const bytes = readFileSync(victim);
    writeFileSync(victim, bytes.subarray(0, Math.floor(bytes.length / 2)));

    const check = generate(dirs, ["--check"]);
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("DRIFT");
    expect(check.stderr).toContain("detail/landscape.jpg");

    // A normal run repairs it, and --check is green again.
    expect(generate(dirs).status).toBe(0);
    const repaired = generate(dirs, ["--check"]);
    expect(repaired.status, repaired.stderr).toBe(0);
  }, 30_000);

  it("reports drift when the ladder changed since the last run", () => {
    const dirs = runDir("ladder-drift");
    expect(generate(dirs).status).toBe(0);

    // A quality or edge change invalidates every rung at once (§13.3). The recorded ladder
    // hash is what carries that fact into --check.
    const stateFile = join(dirs.out, ".derived-state.json");
    const state = JSON.parse(readFileSync(stateFile, "utf8")) as { ladder: string };
    state.ladder = "0".repeat(64);
    writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);

    const check = generate(dirs, ["--check"]);
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("ladder changed");
  }, 30_000);

  it("re-renders when a source changed and the new version reaches the manifest", async () => {
    const dirs = runDir("source-change", { fixtures: ["landscape"], captions: null });
    expect(generate(dirs).status).toBe(0);

    const before = photo(manifestOf(dirs.manifest), "landscape.jpg").ver;

    // The owner's FTP-drop replacement: same name, different bytes.
    writeFileSync(join(dirs.source, "landscape.jpg"), await gradient(1200, 900).flop().jpeg({ quality: 70 }).toBuffer());

    expect(generate(dirs).status).toBe(0);
    const after = photo(manifestOf(dirs.manifest), "landscape.jpg").ver;

    expect(after).not.toBe(before);
    expect(generate(dirs, ["--check"]).status).toBe(0);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Negative proofs — a broken input must fail, not be skipped
// ---------------------------------------------------------------------------

describe("input rejection", () => {
  it("rejects an undecodable source instead of silently skipping it", () => {
    const dirs = runDir("corrupt", { fixtures: ["landscape"], captions: null });
    writeFileSync(join(dirs.source, "broken.jpg"), "this is not a JPEG, it is a sentence\n");

    const result = generate(dirs);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("broken.jpg");
    expect(result.stderr).toContain("not decodable");

    // The broken photo produced nothing, and no manifest claims it exists.
    expect(existsSync(rungFile(dirs, "broken", "detail", "jpeg"))).toBe(false);
    expect(existsSync(dirs.manifest)).toBe(false);

    // The healthy photo still rendered — one bad drop does not stop the ladder.
    expect(existsSync(rungFile(dirs, "landscape", "tile", "jpeg"))).toBe(true);
  }, 30_000);

  it("refuses to write a manifest that would be incomplete", () => {
    const dirs = runDir("incomplete", { fixtures: ["landscape"], captions: null });
    writeFileSync(join(dirs.source, "broken.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const result = generate(dirs);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("manifest: not written");
    expect(existsSync(dirs.manifest)).toBe(false);
  }, 30_000);

  it("skips a symlinked source rather than following it out of the folder", () => {
    const dirs = runDir("symlink", { fixtures: ["landscape"], captions: null });
    const outside = join(tempRoot(), "outside.jpg");
    writeFileSync(outside, fixtures.alpha);
    symlinkSync(outside, join(dirs.source, "escape.jpg"));

    const result = generate(dirs);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain("skip: escape.jpg (symlink)");
    expect(existsSync(rungFile(dirs, "escape", "tile", "jpeg"))).toBe(false);

    expect(manifestOf(dirs.manifest).photos.map((entry) => entry.filename)).toEqual(["landscape.jpg"]);
    // The pipeline does not delete owner files, not even a symlink it refuses to read.
    expect(lstatSync(join(dirs.source, "escape.jpg")).isSymbolicLink()).toBe(true);
  }, 30_000);

  it("takes every rung edge from scripts/photo-ladder.json", () => {
    const dirs = runDir("ladder-edges", { fixtures: ["landscape"], captions: null });
    expect(generate(dirs).status).toBe(0);

    const manifest = manifestOf(dirs.manifest);
    const entry = photo(manifest, "landscape.jpg");

    // landscape is 1200×900: tile 360 ⇒ 360×270, pack 720 ⇒ 720×540, detail 1200 ⇒ 1200×900.
    expect(entry.images?.tile).toMatchObject({ w: LADDER.tile.edge, h: Math.round((900 * LADDER.tile.edge) / 1200) });
    expect(entry.images?.pack).toMatchObject({ w: LADDER.pack.edge, h: Math.round((900 * LADDER.pack.edge) / 1200) });
    expect(manifest.ladder).toEqual({
      tile: LADDER.tile.edge,
      pack: LADDER.pack.edge,
      detail: LADDER.detail.edge,
      download: LADDER.download.edge,
    });
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Parity with the runtime emitter (§13.5) — needs php on PATH, skipped honestly otherwise
// ---------------------------------------------------------------------------

const phpAvailable = spawnSync("php", ["-v"], { encoding: "utf8" }).status === 0;

describe.runIf(phpAvailable)("parity with photos.php", () => {
  it("emits the same per-photo field set, ids, source dims and rung dims as ?list=1", () => {
    const dirs = runDir("parity", { fixtures: ["rotated", "landscape", "alpha"], captions: CAPTIONS_PLAIN });
    expect(generate(dirs).status).toBe(0);

    // photos.php resolves `photos/` and `scripts/photo-ladder.json` against its own directory,
    // so a throwaway copy holding the same fixtures is the whole harness: one include, one manifest.
    const harness = join(tempRoot(), "php");
    mkdirSync(join(harness, "photos"), { recursive: true });
    mkdirSync(join(harness, "scripts"), { recursive: true });
    writeFileSync(join(harness, "photos.php"), readFileSync(join(ROOT, "photos.php")));
    writeFileSync(join(harness, "scripts", "photo-ladder.json"), readFileSync(LADDER_FILE));

    const staticManifest = manifestOf(dirs.manifest);
    for (const entry of staticManifest.photos) {
      writeFileSync(join(harness, "photos", entry.filename), readFileSync(join(dirs.source, entry.filename)));
    }
    writeFileSync(join(harness, "photos", "captions.json"), readFileSync(join(dirs.source, "captions.json")));

    const php = spawnSync("php", ["-r", '$_GET=["list"=>"1"]; include $argv[1];', join(harness, "photos.php")], {
      encoding: "utf8",
      timeout: 60_000,
    });

    expect(php.status, php.stderr).toBe(0);

    const runtime = JSON.parse(php.stdout) as Manifest;

    expect(runtime.pipeline).toBe(staticManifest.pipeline);
    expect(runtime.ladder).toEqual(staticManifest.ladder);
    expect(runtime.photos.map((entry) => entry.id).sort()).toEqual(staticManifest.photos.map((entry) => entry.id).sort());

    for (const runtimeEntry of runtime.photos) {
      const staticEntry = photo(staticManifest, runtimeEntry.filename);

      // Same field set. `ver` differs by design (§13.4: runtime `mtime-size`, static sha256).
      expect(Object.keys(staticEntry).sort()).toEqual(Object.keys(runtimeEntry).sort());
      expect(typeof staticEntry.ver).toBe("string");
      expect(staticEntry.ver.length).toBeLessThanOrEqual(32);

      expect([staticEntry.width, staticEntry.height]).toEqual([runtimeEntry.width, runtimeEntry.height]);
      expect(staticEntry.aspect).toBe(runtimeEntry.aspect);

      for (const rung of RUNGS) {
        expect(staticEntry.images?.[rung]).toMatchObject({
          w: runtimeEntry.images?.[rung]?.w,
          h: runtimeEntry.images?.[rung]?.h,
        });
      }
    }
  }, 30_000);
});
