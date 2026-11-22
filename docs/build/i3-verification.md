# I3 Verification — sharp static ladder + manifest v2

> Date: 2026-11-22 · Ticket **#21** · Branch `feat/i3-static-ladder` → `design/explorer-foundation`
> Author: backend build session (subagent) · **Owner: `tools-programmer`** (image pipeline &
> tooling) · **Reviewer: `security-engineer`** (path containment, no-original rule) with
> `cs-code-auditor` for the code pass.
>
> Skills activated: **`test-setup`** (fixture generation at test setup, no committed source
> photo, no CLI/test runner I invented), **`security-audit`** (path containment, symlink
> refusal, no-original rule, data exposure, supply chain), **`perf-profile`** (byte ceilings
> are the budget; every rung measured against it and reported, never asserted from memory),
> **`asset-spec`** (the ladder *is* the per-asset spec: rungs, formats, ceilings, one source of
> truth), and **`verification-before-completion`** (every claim below carries the command that
> produced it). `cs-backend-engineer` was considered and **not** staffed: this ticket adds no
> PHP — `photos.php` is untouched and was read only as the runtime contract.
> 
> **Review round 2 (security review on PR #43, verdict COMMENT, no critical/high):** SEC-001
> closed — stale derivatives are pruned on a clean run (§4.5); §6(e) corrected to match the
> fail-loud behaviour; the acceptance caps (32 MP / 8000 px / 20 MiB) now have refusal tests
> driven by a decompression bomb (§4.2, §6(l)).
>
> **Review round 3 (APPROVED at `5adbe10`, two LOW findings):** SEC-002 closed — a symlinked
> rung directory is skipped by pruning and refused by the write path (§4.5, §6(n)); SEC-003
> closed — the `pruneStale` comment now states what is actually kept; the T34 row in the
> pipeline spec (§15) corrected from `exit 0, warn` to `exit 1`, no manifest written.

---

## 1. The byte table, for a reader who is not an engineer

Every photo is copied into **four sizes** (the "rungs") in **two formats**, and each file has a
**budget** it may not exceed. The generator prints one row per rung and format:

- **rung / edge** — `tile` 360 px, `pack` 720 px, `detail` 1200 px, `download` 1600 px
  (longest edge; the ratio is always the photo's own, nothing is cropped).
- **largest file** — the biggest file at that rung out of all photos in the run.
- **budget** — the ratified ceiling for that file (ADR-0008 §1, `docs/test-plan.md` §4.3,
  1 KB = 1,000 bytes).
- **used** — how much of the budget the largest file takes.
- **verdict** — `ok` ≤ 80 %, `tight` 80–95 %, **`FLAG` > 95 %**. ADR-0008 asks for ~20 %
  headroom, so a `FLAG` is surfaced, not hidden — it is a report, not a failure.

```
Byte table — 3 photos × 4 rungs × 2 formats = 24 files
Longest edge per rung: tile 360 / pack 720 / detail 1200 / download 1600 px. Ceilings: docs/test-plan.md §4.3 / ADR-0008 §1 (KB = 1,000 B).

  rung      edge  format  largest file     budget           used   verdict
  ---------------------------------------------------------------------------
  tile       360  jpeg    33.4 KB          55.0 KB           61%   ok
  tile       360  webp    30.4 KB          36.0 KB           85%   tight
  pack       720  jpeg    107.0 KB         110.0 KB          97%   FLAG
  pack       720  webp    73.4 KB          80.0 KB           92%   tight
  detail    1200  jpeg    196.9 KB         210.0 KB          94%   tight
  detail    1200  webp    145.1 KB         150.0 KB          97%   FLAG
  download  1600  jpeg    257.8 KB         500.0 KB          52%   ok
  download  1600  webp    164.5 KB         350.0 KB          47%   ok
  ---------------------------------------------------------------------------
  used = share of the ratified budget the largest file takes; ok ≤ 80 %, tight 80–95 %,
  FLAG > 95 % — ADR-0008 wants every rung ~20 % under its ceiling, so a FLAG is not a pass.

derivatives: ok — 3 photos, 24 files, 2009.0 KB total (…/i3-evidence/derived)
```

**Read the two `FLAG` rows correctly.** The fixtures are deliberately worst-case: a synthetic
gradient with per-pixel noise, which no photograph is. They are the hardest input the encoder
can be handed, so they sit near the ceiling by construction. The real store's measured
baseline is a 61.9 KB 720 px thumbnail (ADR-0008 context), i.e. `pack` at ~56 % of its budget.
The number that matters is the invariant: **no file is ever emitted above its ceiling** — the
encoder steps quality down (never up, floor 40) until it fits, and the run **fails** rather
than shipping an oversized rung. §4 proves that with real files.

---

## 2. What landed

| File | Status | Purpose |
| --- | --- | --- |
| `scripts/photo-derivatives.mjs` | new | sharp 0.35.5 generator: four rungs × JPEG/WebP, manifest v2, `--check` drift gate, byte table |
| `tests/unit/photo-derivatives.test.ts` | new | 20 tests: manifest shape, orientation, budgets, metadata stripping, idempotency, drift, acceptance caps, stale-derivative pruning, input rejection, PHP parity |
| `docs/build/i3-verification.md` | new | this evidence |
| `knip.json` | **modified, 2 lines** | `ignoreBinaries: ["php"]` (the parity harness) and the now-stale `sharp` entry removed from `ignoreDependencies` — sharp is imported by an entry script, so knip reports it as used. Gate config only; see §8(h). |

Not touched: `package.json`, `photos.php`, `photos/`, `src/`, `docs/photo-pipeline-implementation.md`,
any ADR, the action plan.

---

## 3. Running it

```bash
# the real store: photos/ → photos/derived/ + photos.json   (owner workflow, PHP-less deploy)
node scripts/photo-derivatives.mjs

# a fixture run (what the tests do)
node scripts/photo-derivatives.mjs --source DIR --out DIR --manifest FILE

# read-only drift gate for a pre-commit / CI hook: exit 1 on any difference
node scripts/photo-derivatives.mjs --check
```

| Exit | Meaning |
| --- | --- |
| 0 | every rung written (or already current) and within budget |
| 1 | a photo failed, a ceiling was missed, or `--check` found drift |
| 2 | usage error (`--bogus`, missing value) |

---

## 4. Verification output

### 4.1 Generation, idempotency, drift gate

Fixtures generated at run time with sharp into a temp directory (never committed — §4.2 of the
test plan). Commands and output, verbatim:

```
$ node scripts/photo-derivatives.mjs --source …/i3-evidence/src --out …/i3-evidence/derived --manifest …/i3-evidence/photos.json
manifest: written …/i3-evidence/photos.json (3 photos, pipeline 2)

  <byte table as shown in §1>

derivatives: ok — 3 photos, 24 files, 2009.0 KB total (…/i3-evidence/derived)
exit 0
```

```
$ <same command again, sources untouched>
manifest: unchanged …/i3-evidence/photos.json
derivatives: ok — 3 photos, 24 files, 2009.0 KB total (…/i3-evidence/derived)
exit 0

$ diff <(stat every file: mtime size path, before) <(after)
DIFF: none — every mtime, size and hash unchanged
```

**Idempotency is byte-exact, not "probably":** `before.txt`/`after.txt` compare seconds-old
mtime, size and path for all 24 derivatives plus the manifest; the diff is empty, and the
`generated` timestamp in the manifest keeps the date of the last real change.

```
$ node scripts/photo-derivatives.mjs --check --source …/src --out …/derived --manifest …/photos.json
check: in sync — 3 photos, 24 files, every rung within its budget
exit 0
```

```
$ # drift: truncate one rung in place
  landscape.jpg 196891 -> 98445
$ node scripts/photo-derivatives.mjs --check
check: DRIFT — 1 problem(s):
  ✗ landscape.jpg: detail/landscape.jpg changed on disk (196891 B recorded, 98445 B found)
exit 1
```

A normal run repairs it and `--check` returns to `exit 0` (`reports drift … then repairs it`
in the test suite).

### 4.2 Negative proof — a corrupt input is rejected, not skipped

```
$ printf 'this is not a JPEG, it is a sentence\n' > …/corrupt/src/broken.jpg   # plus one healthy photo
$ node scripts/photo-derivatives.mjs --source …/corrupt/src --out …/corrupt/derived --manifest …/corrupt/photos.json
manifest: not written — …/corrupt/photos.json would be incomplete, and the run failed
  ✗ broken.jpg: not decodable — Input file contains unsupported image format
exit 1

manifest written? no
broken derivatives: 0
healthy derivatives: 2      # one bad drop does not stop the ladder
```

The acceptance caps are refused **from the header, before any bitmap exists** (§10). A
decompression bomb is 68 bytes on disk that *declare* 8000×8000:

```
$ <source contains bomb.png (8000×8000 declared), wide.png (9000×200), huge.jpg (21 MiB), plus one healthy photo>
$ node scripts/photo-derivatives.mjs --source …/caps/src --out …/caps/derived --manifest …/caps/photos.json
  ✗ bomb.png: 8000×8000 exceeds the 32 MP cap (§10)
  ✗ wide.png: 9000×200 exceeds the 8000 px edge cap (§10)
  ✗ huge.jpg: 22020096 B exceeds the 20 MiB source cap (§10)
exit 1        # 0 derivative bytes for any of the three, no manifest, healthy photo still rendered
```

The header read runs with `limitInputPixels: false` on purpose (§6(m)): with sharp's limit on,
a bomb is rejected as "not decodable" and the operator never learns *which* cap it broke.

Three further refusal proofs, each its own test:

- `manifest: not written` — a run with any failed photo writes **no** manifest, so a
  half-catalogue can never reach the client.
- `skip: escape.jpg (symlink)` — a symlink in the drop folder is not followed (path
  containment), the owner's file is not deleted, and the entry is absent from the manifest.
- `photo-derivatives: no photos in photos — nothing to derive` (exit 1) — an empty store fails
  loudly instead of writing an empty catalogue; `--bogus` gives exit 2.

### 4.3 Test suite

```
$ npx vitest run --project unit tests/unit/photo-derivatives.test.ts

 ✓ |unit| tests/unit/photo-derivatives.test.ts (20 tests)
   ✓ manifest v2 (4)
     ✓ emits the v2 document shape, four rungs per photo, and no transmitted srcset
     ✓ keeps width/height as the oriented source ratio and each rung's own w/h on that ratio
     ✓ preserves caption/set/focus/chase from input and invents nothing
     ✓ derives a stable slug id from the filename and dedupes collisions like the runtime
   ✓ byte budget (3)
     ✓ keeps every emitted file under the ratified per-format ceiling and prints the table
     ✓ never emits a file the size of the source and never addresses an original
     ✓ strips EXIF/GPS/ICC metadata from every emitted file (§7.2)
   ✓ idempotency and --check (4)
     ✓ rewrites nothing on a second run over unchanged sources
     ✓ reports drift and exits non-zero when a derivative changed on disk
     ✓ reports drift when the ladder changed since the last run
     ✓ re-renders when a source changed and the new version reaches the manifest
   ✓ stale derivative pruning (3)
     ✓ removes the rungs of a photo that left the source set and leaves the rest untouched   (SEC-001)
     ✓ skips a symlinked rung directory instead of pruning outside the output tree (SEC-002)
     ✓ reports a stale derivative as drift in --check without deleting it
   ✓ input rejection (5)
     ✓ refuses the acceptance caps without decoding: 32 MP, 8000 px edge and 20 MiB
     ✓ rejects an undecodable source instead of silently skipping it
     ✓ refuses to write a manifest that would be incomplete
     ✓ skips a symlinked source rather than following it out of the folder
     ✓ takes every rung edge from scripts/photo-ladder.json
   ✓ parity with photos.php (1)
     ✓ emits the same per-photo field set, ids, source dims and rung dims as ?list=1

 Test Files  1 passed (1)
      Tests  20 passed (20)
```

What the assertions pin, not just describe:

| Claim | Pinned by |
| --- | --- |
| Manifest is v2 and nothing else | exact top-level key set `{generated, ladder, photos, pipeline, source}`; `pipeline === 2`; `ladder` equals `photo-ladder.json` |
| Four rungs, exactly `{jpeg, webp, w, h}` | `Object.keys(image).sort()` per rung — extra bookkeeping fields fail the test |
| No `srcset` transmitted | absent from each entry and from the manifest text (ADR-0004 §4) |
| EXIF orientation honoured once | 900×1200 stored + orientation 6 ⇒ manifest 1200×900, `aspect` 1.3333, `tile` 360×270 |
| Never upscale | a 300×200 source stays 300×200 at every rung |
| Budgets | every one of the 24 files ≤ the ratified ceiling (constants re-declared in the test, so a loosened script fails) |
| The table is readable | each row states its budget in KB and ends in `ok`/`tight`/`FLAG` |
| No original escapes | no file equals the source size; every URL is `derived/<rung>/<id>.<ext>` and none addresses `photos/` |
| Metadata stripped | the source contains `Exif\0\0`; **no** output contains EXIF, XMP (`ns.adobe.com/xap`) or `ICC_PROFILE` |
| Idempotent | mtime+size+sha256 identical before/after the second run, manifest byte-identical |
| A retired photo leaves nothing servable (SEC-001) | deleting a source removes all 8 of its rungs, the survivor's files stay byte-identical, `prune: removed 8` is reported, and `--check` returns to green |
| Caps refuse before decode | a 68-byte PNG declaring 8000×8000 and a 21 MiB file are rejected with the named cap, zero derivative bytes, no manifest |
| `--check` gates drift | truncating a rung ⇒ exit 1 naming the file; a changed ladder hash ⇒ exit 1; a normal run repairs both |
| A replacement photo invalidates | new bytes under the same name ⇒ new `ver` in the manifest (ADR-0008 §6) |
| Runtime parity | identical per-photo field set, ids, source dims, `aspect`, and rung `w`/`h` against a real `?list=1` (§4.4) |

### 4.4 Parity with the runtime emitter (§13.5) — measured, with the CI gap named

`photos.php` resolves `photos/` and `scripts/photo-ladder.json` against its own directory, so
the harness is a throwaway copy holding the same fixtures and one include:

```
php -r '$_GET=["list"=>"1"]; include "…/photos.php";'
```

Against PHP 8.6.0 locally, for the same three fixtures, the static manifest and `?list=1`
agree on:

- document level: `pipeline`, `ladder`, photo count and ids;
- per photo: **the complete field set** (`id`, `src`, `thumb`, `view`, `download`, `filename`,
  `caption`, `alt`, `name`, `mood`, `description`, `rarity`, `demo`, `heic`, `renderable`,
  `width`, `height`, `aspect`, `ver`, `images`), `width`/`height`, `aspect`, and every rung's
  `w`/`h`.

`ver` differs **by design**: static is a sha256 prefix of the source, runtime is
`<mtime>-<size>` (§13.4). Both are ≤ 32 chars. Byte-level file parity is not asserted —
different encoders (§13.1) — and the PHP render path is not exercised here (§8(g)).

**CI gap, stated rather than implied:** the parity test is `describe.runIf(phpAvailable)`.
GitHub's runner has no PHP in the current workflow, so this gate is **local-only** until a
CI job provisions PHP (ADR-0008 requires one: "A CI job must run real PHP (`php -S`)"). When
PHP is absent the test is *skipped and reported as skipped*, never silently green.

### 4.5 Stale-derivative pruning (SEC-001)

A retired photo must not stay downloadable. Before this fix a rung owned by nobody kept
answering at its immutable URL while the manifest had already forgotten it.

```
$ # two photos rendered, then one source removed
before: alpha.jpg  alpha.webp  landscape.jpg  landscape.webp     (tile rung)
$ node scripts/photo-derivatives.mjs --source …/src --out …/derived --manifest …/photos.json
manifest: written …/photos.json (1 photos, pipeline 2)
prune: removed 8 stale file(s) no longer in the catalogue
  - tile/alpha.jpg
  - tile/alpha.webp
  - pack/alpha.jpg
  - pack/alpha.webp
  - detail/alpha.jpg
  - detail/alpha.webp
  - download/alpha.jpg
  - download/alpha.webp
derivatives: ok — 1 photos, 8 files, 1004.1 KB total (…/derived)
after:  landscape.jpg  landscape.webp

$ node scripts/photo-derivatives.mjs --check
check: in sync — 1 photos, 8 files, every rung within its budget
```

Scope of the deletion is narrow by design: only `<out>/<rung>/`, only regular files, only
`.jpg`/`.jpeg`/`.webp`, only when the stem is not a current id, and **only on a clean run** — a
failed run and `--check` never delete anything (`--check` reports the orphan as drift and exits 1).

**A rung directory that is a symlink is skipped entirely (SEC-002).** Deletion is the one
destructive step here, so it must not follow a link out of the output tree — a planted
`<out>/pack → /somewhere` would otherwise let a generator run delete `*.jpg` in `/somewhere`.
The same containment rule now applies to the write path: a rung directory that exists but is not
a real directory is refused (`refusing to write into …: it is a symlink, not a directory`)
instead of receiving derivative bytes through the link. The test proves both halves: the planted
file survives a run, and forcing a render through the link exits 1 without writing.

What pruning keeps: `.derived-state.json` (it sits above the rung directories), subdirectories,
and any file whose extension is not `.jpg`/`.jpeg`/`.webp`. A `.jpg`/`.webp` *inside* a rung
directory is removed whatever put it there — those directories are generator-owned, and an
unowned image in one is still a servable URL.

### 4.6 Full gate set

```
$ npm run verify
verify: ok canon (243 ms)
verify: ok canon-self-test (900 ms)
verify: ok typecheck
verify: ok svelte-check (1565 ms)
verify: ok stylelint (725 ms)
verify: ok selector-diff (180 ms)
verify: ok unused-css (552 ms)
verify: ok eslint (2618 ms)
verify: ok knip
verify: ok jscpd
verify: ok unit (28144 ms)
verify: ok build (2272 ms)

verify: 12 gates green in 42.1s.
```

Coverage is unchanged by this ticket: `test:unit` measures `src/lib/**` and
`design/tokens/**`, not `scripts/`, so the new suite moves no threshold (lines 61.68 % ≥ 61,
branches 44 % ≥ 44, functions 50 % ≥ 50, statements 58.28 % ≥ 58).

---

## 5. What the script does, in the spec's terms

| Rule | Where |
| --- | --- |
| Edges and start qualities come from `scripts/photo-ladder.json` only (§7.3) | `loadLadder()`, validated (positive integer edges, quality 40–100); a missing or invalid file fails the run |
| `fit = inside`, never upscale, `scale = min(1, edge / max(w, h))` (§3.3) | `scaledDimensions()`; each rendered file is asserted against the formula and the run fails on a mismatch |
| EXIF orient once, then strip (§7.2) | `.rotate()` first, no `withMetadata()`; proven by the orientation and metadata tests |
| Alpha flattened onto the paper tone for JPEG, kept for WebP (§3.3) | `.flatten({background: ladder.paper})` only on the JPEG branch |
| Quality steps down to the ceiling, floor 40, step 4 (§9) | `renderRung()`; a rung that cannot fit throws instead of shipping |
| No-original rule (§5) | nothing is copied, no manifest URL addresses `photos/`, every output path is asserted inside the output directory |
| Manifest v2, no `srcset` (ADR-0004 §2/§4) | `manifestBody()`; `images` is exactly `{jpeg, webp, w, h}` |
| Stale rungs pruned on a clean run (security review SEC-001) | `pruneStale()`; `--check` reports orphans instead of deleting |
| Acceptance caps refused before decode (§10) | `orientedSize()` reads the header, then the 20 MiB / 8000 px / 32 MP checks reject by name |
| Idempotent re-run, ladder-hash invalidation (§13.3) | `.derived-state.json` beside the derivatives (pipeline, ladder hash, per-source `ver`/size/mtime, per-rung sizes and dims) |

Manifest per photo: `id`, `width`/`height` (oriented **source** dims), `aspect`, `ver`,
`images`, the deprecated bounded aliases `src`→detail / `thumb`→pack / `view`/`download`→download,
and the v1 metadata keys. `set`/`focus`/`chase` are carried **only when present in
`captions.json`** (clamped `focus`, wrong type dropped and named on stderr).

---

## 6. Decisions and deviations (with the reason, not an apology)

**(a) `metadata()` after `.rotate()` does not report oriented dimensions in sharp 0.35.5.**
The §13.2 snippet (`sharp(source).rotate().metadata()`) returns the **stored** pair; the
oriented pair is `metadata().autoOrient`. Probed directly:

```
metadata:        { w: 900, h: 1200, o: 6, autoOrient: { width: 1200, height: 900 } }
rotate->buffer:  1200 900          # the render *is* upright
```

Following the snippet literally would publish swapped `width`/`height` and swapped rung `w`/`h`
for every EXIF-rotated iPhone photo — defect D7 (§1) reintroduced in the manifest. The script
reads `autoOrient` and the test pins it. **Intent kept, literal snippet corrected.**

**(b) `aspect` is emitted.** It is in ADR-0004 §2 (optional, "emitted convenience value") *and*
in the current `?list=1` payload, so it is part of the contract — not invented here. It is
computed as `round(width / height, 4)` exactly like `photos.php:2204`.

**(c) `srcset` is not emitted**, per ADR-0004 §4 and §13.4's own rule ("not part of the
contract … `?list=1` stopped emitting it"). §13.4's example block still shows a `srcset`
object; the ADR and the adjacent rule win, and a test asserts its absence.

**(d) `order` is not emitted.** It was a v1 static-only key; the runtime manifest does not
carry it and ADR-0004 §2 does not list it. Array position carries the order. If a consumer
needs the field, that is a contract change (ADR-0004 §5), not an emitter side-effect.

**(e) A photo this sharp build cannot decode is built as `renderable: false`, and the run
fails — so nothing reaches the manifest.** When the build has no libheif/avif, the in-memory
entry is assembled the way §13.4 wants it (the card kept, `renderable: false`, **no**
`images`/aliases, so a later manifest can never point at a file that does not exist), the owner
gets the explicit "export JPEG from Photos.app" message, and the run exits 1. That makes it the
building block of the rule in (f): **any** problem on a run suppresses the manifest write, so on
disk the outcome of a capability gap is "manifest not updated, exit 1" — never a catalogue
quietly missing a photo *or* a catalogue listing a photo it cannot serve. A *corrupt* file is
not a capability problem: it is rejected outright with no entry built at all (§4.2).

**(f) A failed run writes no manifest and no state.** A catalogue that silently omits the photo
that failed is worse than no catalogue; the next clean run writes the complete one.

**(g) The PHP **render** path is not exercised.** §13.5's parity harness (`tests/php/render-fixture.php`)
compares pixels between the two encoders; it is out of this ticket's scope and needs a CI job
with PHP. What is verified here is the **manifest contract** parity (§4.4), which is the part a
consumer sees.

**(h) `knip.json` was touched (2 lines).** `php` is now a spawned binary (the parity harness) and
sharp is now a genuinely imported dependency, so the gate reported an unlisted binary and a
stale ignore. Left unedited, `npm run verify` is red — which the standing rules do not allow.
No product code, no dependency change.

**(i) Runtime gap found: `photos.php` emits no `set`/`focus`/`chase`.** The static path
preserves them from `captions.json`; the runtime emitter does not read them yet. Consequence:
a photo with a `focus` set locally loses it on a PHP deployment. This belongs to the PHP
service owner (`cs-backend-engineer`, per the ownership table) — recorded here rather than
fixed, because `photos.php` is outside this ticket and its ADR-governed contract is not mine
to change. The parity test uses caption metadata without those extras so the mismatch is not
masked.

**(j) Fixtures are generated inside the test, not by `tests/fixtures/images/make-fixtures.mjs`.**
§13.5 names that helper; creating it is outside this ticket's file scope. The consequence is
contained: the generator lives in the test, writes only into a temp directory, and a committed
source photo is still impossible (`.gitignore` also ignores `tests/fixtures/images/generated/`).
When the fixture helper lands, the test should import it instead of duplicating the setup.

**(k) Ceilings are mirrored in the script and re-declared in the test.** Test-plan §4.3 names
`tests/fixtures/image-budgets.json` as the single read surface for budgets; that file does not
exist yet. Until it does, the ratified numbers live in two places **that check each other**
(the test fails if the script's budget is loosened). Creating the JSON is a follow-up.

**(l) The header read runs with `limitInputPixels: false`, and the caps are checked by us.**
sharp's own pixel limit makes `metadata()` throw `Input image exceeds pixel limit` on a
decompression bomb — which the script would report as "not decodable", i.e. the operator never
learns which cap the file broke, and the message points at the wrong remedy. The order is
therefore PHP's (§7.1 step 3): read the header with no pixel limit, then apply 20 MiB / 8000 px /
32 MP and name the one that failed. Nothing is decoded by that read; the render pipeline keeps
`limitInputPixels: MAX_SOURCE_PIXELS` as a second line of defence. Tested with a 68-byte PNG that
declares 8000×8000 (§4.2).

**(n) Review round 3 — SEC-002, SEC-003 and the T34 spec line.** A symlinked `<out>/<rung>`
directory is now skipped by `pruneStale()` (`lstatSync(...).isDirectory()` is false for a link)
and refused by `ensureRungDirectory()` on the write path — the second half is a disclosed
hardening of the same containment family, not part of the reported finding: writing derivative
bytes through a planted link is the same escape as deleting through it. The `pruneStale` comment
now lists what is actually kept, instead of the false "a stray owner file … is never deleted"
(a `.jpg` inside a rung directory *is* deleted, deliberately). `docs/photo-pipeline-implementation.md`
T34 said `exit 0, warn` for a build without libheif; the code exits 1 and writes no manifest, so
the row now says `exit 1, renderable:false warning` and names `node scripts/photo-derivatives.mjs`
as the command (the `npm run photos` entry does not exist yet — see (m)).

**(m) No `package.json` script entry**, per the ticket. The natural line is
`"photos:derived": "node scripts/photo-derivatives.mjs"` and `"photos:check": "node scripts/photo-derivatives.mjs --check"`.
Reported, not edited; adding them is a one-line PR once the owner picks the names (and note
`npm run photos` currently exits 1 by design — the B0 stub).

---

## 7. Handoff

- **Next (pipeline lane):** wire `--check` into CI once one of #24/#25 lands a job that can run
  it against `photos/derived` (it needs no PHP), and provision PHP for the §13.5 pixel parity.
- **PHP owner (`cs-backend-engineer`):** emit `set`/`focus`/`chase` from `captions.json` in
  `?list=1` so static and runtime agree on the extras (§6(i)).
- **Test-plan §4.2/§4.3:** create `tests/fixtures/image-budgets.json` and
  `tests/fixtures/images/make-fixtures.mjs`, then point the test at them (§6(j)/(k)).
- **Review request:** `security-engineer` (containment, no-original rule, data exposure) and
  `cs-code-auditor` (code pass) — the PR is not merged on the author's say-so.

---

## 8. References

- `docs/photo-pipeline-implementation.md` §3.3, §7.1–§7.3, §9, §13.1–§13.4
- `docs/adr/ADR-0004-manifest-contract.md` §2, §4 · `docs/adr/ADR-0008-image-derivatives.md` §1, §3, §6
- `docs/test-plan.md` §4.2 (fixtures), §4.3 (budgets) · `scripts/photo-ladder.json` · `photos.php` (contract, unmodified)
