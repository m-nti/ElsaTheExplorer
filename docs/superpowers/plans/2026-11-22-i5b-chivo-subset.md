# I5b — Chivo subset to the 30 KB ceiling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `public/fonts/chivo-latin.woff2` at or under the 30,000 B per-font ceiling from art bible §8, keeping the rendered type identical, and make the ceiling a failing gate instead of a table in a document.

**Architecture:** A declared repertoire in `scripts/fonts.json` drives a reproducible regeneration from a vendored source (`assets/fonts/chivo-latin-source.ttf`, the un-subsetted latin cut the 33,252 B file came from). `scripts/font-budget.mjs` enforces three things in CI: every font under `public/fonts/` is declared and under the ceiling, the shipped font still maps every declared codepoint, and the font covers every character the shipped copy actually types.

**Tech Stack:** Node 26, `subset-font` 2.9.0 (HarfBuzz subsetter), `fontverter` 2.1.0 + `harfbuzzjs` 1.6.4 (woff2 → sfnt, cmap read), Vitest 5.1.1.

**Spec:** issue #35, `design/art/art-bible.md` §8, `docs/build/b0-b1-verification.md` §4, `docs/audits/perf-baseline.md`.

## Global Constraints

- Budget is decimal: 30 KB = 30,000 B (the unit b0-b1-verification and perf-baseline use, where 33,252 B reads as 33.25 KB / 10.8 % over).
- Rendered type must not change: outlines, advance widths, kerning pairs and the `wght` 100–900 axis are preserved for every kept glyph.
- DE/EN copy and the UI's actual character set must keep full coverage; a missing glyph is a red gate.
- No new runtime dependency: the subsetter is dev-only and the site still ships two static woff2 files.
- Canon: this plan describes bytes, not copy — it adds no user-facing string, no water content,
  no banned register nouns and no exclamation mark.

## Review Focus

- **A glyph used only in a comment** — the corpus scan strips comments, or a `→` in a JSDoc block fails the gate for a symbol no user sees.
- **A symbol Chivo never had** — the ★ rarity star is drawn by the fallback stack today; the gate must treat it as declared fallback, not as a regression.
- **A new font dodging the ceiling** — an undeclared woff2 under `public/fonts/` must fail, or the ceiling is opt-in.
- **Regeneration from the wrong source** — subsetting the shipped woff2 in place is lossy; the vendored source is the only input.
- **Caption data outside the subset** — owner-dropped captions are the one surface that changes without a code review; the corpus includes `photos/captions.json`.

---

### Task 1: The byte gate fails at 33,252 B

**Files:**
- Create: `scripts/fonts.json`, `scripts/font-budget.mjs`
- Test: `tests/unit/font-budget.test.ts`

**Interfaces:**
- Produces: `node scripts/font-budget.mjs [root]` → exit 0 or 1; reads `scripts/fonts.json` (`budgetBytes`, `corpus[]`, `fonts[]`).

- [x] **Step 1: Write the failing test** — fixtures for 33,252 B (fail), 30,000 B (pass), 30,001 B (fail), undeclared file, missing file; plus the real tree.
- [x] **Step 2: Run it — expected FAIL** on the real tree: `font-budget: public/fonts/chivo-latin.woff2 is 33,252 B — 3,252 B (10.8 %) over the 30,000 B ceiling`.
- [x] **Step 3: Implement the gate** (bytes, declared-codepoint coverage, corpus coverage, undeclared-file check).
- [x] **Step 4: Run the fixtures** — 5/6 green, the real tree red for the measured reason.
- [x] **Step 5: Commit** with `#35`.

### Task 2: Regenerate Chivo inside the ceiling

**Files:**
- Create: `assets/fonts/chivo-latin-source.ttf`, `scripts/font-subset.mjs`
- Modify: `scripts/fonts.json`, `public/fonts/chivo-latin.woff2`

- [x] **Step 1: Vendor the source** — decompress the shipped woff2 to sfnt (lossless; 300 glyphs, `wght` 100–900).
- [x] **Step 2: Declare the repertoire** — ASCII printable, Latin-1 letters, editorial punctuation; exclusions and the ★ fallback documented in `scripts/fonts.json`.
- [x] **Step 3: Implement `fonts:subset`** — HarfBuzz subset of the source, fail if the result exceeds the budget.
- [x] **Step 4: Run it** — `29,368 B (was 33,252 B, −3,884 B)`; `gate:fonts` green, 195/195 declared codepoints mapped.
- [x] **Step 5: Prove the rendering is unchanged** — 0 outline/advance mismatches for all 195 codepoints at wght 100/400/500/700/900; 0 kerning pairs lost among kept glyphs.
- [x] **Step 6: Commit** with `#35`.

### Task 3: Wire the gate into CI and verify the tree

**Files:**
- Modify: `package.json`, `package-lock.json`, `.github/gates.json`, `.github/workflows/ci.yml`
- Create: `docs/build/i5b-verification.md`

- [x] **Step 1: Add `gate:fonts` + `fonts:subset` scripts and the three dev-only font packages** (exact versions, lockfile generated with the pinned npm 11.6.2).
- [x] **Step 2: Enforce it in CI** — `tests/unit/font-budget.test.ts` runs the gate inside the
      existing `test:unit` gate, so a regression is red without touching `ci.yml`. The dedicated
      `font-budget` manifest entry is **#99**: this session's push token has no `workflow` scope, and
      GitHub rejects any push that edits `.github/workflows/*`.
- [x] **Step 3: Record the evidence** — byte table, glyph set, fidelity checks, diacritics specimen.
- [x] **Step 4: Run the full gate set** (`npm run verify`) and the build.
- [x] **Step 5: Commit, push, open the PR** with `Closes #35` and request the `cs-frontend-engineer` cross-check.
