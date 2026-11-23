# Photo derivatives on Windows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `photo-derivatives` pass on `windows-latest` without weakening a single assertion: every manifest URL stays repo-relative on any host, and the static (sharp) and runtime (`photos.php`) emitters agree on EXIF orientation even when PHP's optional `exif` extension is absent.

**Architecture:** Two host-sensitive defects, two small fixes. (1) `defaultUrlPrefix()` trusts `path.relative()`, which returns an absolute path when root and target are on different volumes (CI: workspace on `D:`, temp on `C:`) — it must reject absolute results and fall back to the neutral basename. (2) `photos.php` reads orientation only through `exif_read_data()`, a shared extension that the official Windows build does not load without an ini; it must fall back to a bounded APP1/TIFF header parse so orientation never depends on the host's PHP build.

**Tech Stack:** Node 26, sharp 0.35.5, Vitest 5.1.1, PHP 8.5 (CLI), PowerShell on Windows.

**Spec:** `docs/photo-pipeline-implementation.md` §7.2 (orientation), §13.5 (parity); `docs/adr/ADR-0004-manifest-contract.md` §3 (manifest URLs); `docs/adr/ADR-0008-image-derivatives.md` §3/§5.

**Closes:** #113 · **Branch:** `fix/photo-derivatives-windows` · **Base:** `e20c3e0`

## Global Constraints

- Node 26 / npm 11; no new dependency.
- Images: never serve originals; the ladder, ceilings, manifest field set and no-original rule are unchanged.
- PRs and commits name #113; no force-push, no history rewrite.
- Every commit passes `npm run lint` and `npm run check:ts` (global rule); every push passes `npm run verify` (pre-push hook).
- No test is skipped, weakened or guarded by `process.platform` to make Windows pass.

## Review Focus

- **Cross-volume prefix** — a `--out` on another drive must yield the neutral basename, never `C:/…` or `D:/…`; pinned with `path.win32.relative()` so the rule is testable on every host.
- **PHP without `exif`** — the runtime must publish `1200×900` for the orientation-6 fixture with `php -n` (no ini, no shared extensions), not `900×1200`.
- **Orientation 5–8, not just 6** — the parser must return the tag value it finds (2–8 are all valid), and 1 for anything unreadable.
- **Malformed / non-JPEG input** — a truncated APP1 or a PNG must return orientation 1 without emitting a warning (this file turns warnings into exceptions).
- **Explicit `--url-prefix`** — a caller-supplied prefix still wins and is never rewritten.

---

### Task 1: A repo-relative manifest prefix on every host

**Files:**
- Create: `scripts/photo-urls.mjs`, `scripts/photo-urls.d.mts`
- Modify: `scripts/photo-derivatives.mjs:189-201` (prefix construction)
- Test: `tests/unit/photo-derivatives.test.ts` (new `describe("manifest URL prefix")`)

**Interfaces:**
- Produces: `isRepoRelativePrefix(rel: string): boolean`, `defaultUrlPrefix(root: string, out: string): string`
- Consumes: `node:path` (`basename`, `isAbsolute`, `relative`, `sep`)

- [ ] **Step 1: Write the failing test**

```ts
import { defaultUrlPrefix, isRepoRelativePrefix } from "../../scripts/photo-urls.mjs";

describe("manifest URL prefix", () => {
  it("keeps an in-repo output and a same-volume QA directory repo-relative", () => {
    expect(defaultUrlPrefix(ROOT, join(ROOT, "photos", "derived"))).toBe("photos/derived");
    expect(defaultUrlPrefix(ROOT, join(tmpdir(), "elsa-out"))).toBe("elsa-out");
  });

  it("refuses the absolute path path.relative returns across volumes (#113)", () => {
    const crossVolume = win32.relative("D:\\a\\repo\\repo", "C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\elsa\\derived");
    expect(crossVolume).toBe("C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\elsa\\derived");
    expect(isRepoRelativePrefix(crossVolume)).toBe(false);
    expect(isRepoRelativePrefix("C:/Users/RUNNER~1/AppData/Local/Temp/elsa/derived")).toBe(false);
    expect(isRepoRelativePrefix("..\\elsewhere")).toBe(false);
    expect(isRepoRelativePrefix("../elsewhere")).toBe(false);
    expect(isRepoRelativePrefix("derived")).toBe(true);
    expect(isRepoRelativePrefix("photos/derived")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/unit/photo-derivatives.test.ts`
Expected: FAIL — `Cannot find module .../scripts/photo-urls.mjs`.

- [ ] **Step 3: Implement the module and wire the script**

`isRepoRelativePrefix` rejects `""`, absolute paths (`isAbsolute`, plus `/^[A-Za-z]:/` so a POSIX test host also rejects `C:/…`), `..` and `..<sep>` prefixes. `defaultUrlPrefix(root, out)` returns the normalised `relative()` when the predicate accepts it, else `basename(out)`. `photo-derivatives.mjs` imports it and calls `defaultUrlPrefix(ROOT, out)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/unit/photo-derivatives.test.ts`
Expected: PASS, and the manifest shape test still asserts `derived/<rung>/<id>.jpg`.

- [ ] **Step 5: Mutation check (recorded in the PR)**

Temporarily make `defaultUrlPrefix` return the raw `relative()` and re-run the file: the new test must fail on `C:/…`. Restore, re-run green. Paste both outputs in the PR.

- [ ] **Step 6: Commit**

```bash
git add scripts/photo-urls.mjs scripts/photo-urls.d.mts scripts/photo-derivatives.mjs tests/unit/photo-derivatives.test.ts
git commit -m "fix(#113): keep manifest URLs repo-relative across volumes"
```

---

### Task 2: Orientation is explicit and host-independent

**Files:**
- Modify: `photos.php:539-599` (orientation read), `photos.php:148-159` (no-dispatch guard)
- Modify: `tests/unit/photo-derivatives.test.ts:359-380` (fixture contract), `:806-857` (parity)
- Modify: `docs/photo-pipeline-implementation.md` §7.2 (one sentence: the fallback)

**Interfaces:**
- Produces: `jpegExifOrientation(string $path): int`, `tiffOrientation(string $tiff): int`; `exifOrientation()` keeps its signature.
- Consumes: `PHOTO_NO_DISPATCH` constant guard (spec §13.5's promised no-dispatch mode) so a CLI test can call the functions directly.

- [ ] **Step 1: Write the failing tests**

(a) The orientation fixture test asserts the real orientation instead of trusting the comment:

```ts
const meta = await sharp(fixtures.rotated).metadata();
expect(meta.orientation).toBe(6);
expect([meta.width, meta.height]).toEqual([900, 1200]); // stored
expect(meta.autoOrient).toMatchObject({ width: 1200, height: 900 }); // upright
```

(b) The parity test runs the PHP harness twice — default ini and `php -n` — and asserts the oriented pair explicitly:

```ts
const runtime = phpManifest(harness, []);            // whatever extensions the host loads
const bare = phpManifest(harness, ["-n"]);           // no ini, no shared extension
for (const manifest of [runtime, bare]) {
  const rotated = photo(manifest, "rotated.jpg");
  expect([rotated.width, rotated.height]).toEqual([1200, 900]);
  expect(rotated.aspect).toBe(1.3333);
}
```

(c) Direct parser cases via `php -n -r` with `PHOTO_NO_DISPATCH`: orientation 6 fixture → 6; orientation 8 fixture → 8; XMP-APP1-before-Exif fixture → 6; truncated APP1 → 1; PNG → 1.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit tests/unit/photo-derivatives.test.ts`
Expected: FAIL — `[900, 1200]` vs `[1200, 900]` for the `-n` run on a host without `exif` (reproduced locally with PHP 8.5 NTS: `no-ini rotated 900x1200 aspect=0.75`, `with-exif 1200x900 aspect=1.3333`).

- [ ] **Step 3: Implement the fallback**

`exifOrientation()` tries `exif_read_data()` when the function exists; on any unusable result it calls `jpegExifOrientation()`, which walks at most 64 JPEG segments, reads at most one APP1 payload (≤ 64 KiB), and hands `Exif\0\0`-prefixed payloads to `tiffOrientation()` (II/MM, magic 42, IFD0 tag `0x0112`). Everything else returns 1. `PHOTO_NO_DISPATCH` wraps the dispatch call so tests can include the file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit tests/unit/photo-derivatives.test.ts`
Expected: PASS on this host with `php -n`.

- [ ] **Step 5: Commit**

```bash
git add photos.php tests/unit/photo-derivatives.test.ts docs/photo-pipeline-implementation.md
git commit -m "fix(#113): read EXIF orientation without the PHP exif extension"
```

---

### Task 3: Gates and evidence

- [ ] `npm run lint` — 0 errors.
- [ ] `npm run check:ts` — 0 errors.
- [ ] `npm run test:unit` — 0 failures (coverage ratchet unchanged).
- [ ] `npx vitest run --project unit` under a cross-volume temp (`subst E:` + `TEMP=E:\tmp`) — reproduces the CI topology; 0 failures.
- [ ] `php -n` parity run in the suite — green (proves no extension dependency).
- [ ] Push; open PR `Closes #113`; request `security-engineer` (image pipeline) and `cs-code-auditor`; watch `gh pr checks`.
