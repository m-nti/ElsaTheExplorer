# B0/B1 Verification — scaffold + tokens/gates

> Date: 2026-11-22 · Branch: `design/explorer-foundation` · Scope: B0 + B1 only (no B2+)
> Author: full-stack build session · Skills: `test-setup` (runner/CI layout, gate order),
> `architecture-review` (ADR-0002 spike traceability below), `design-system` reviewed for
> token authority. `senior-frontend` is **not installed** in this workspace (no
> `engineering/senior-frontend` skill and no `senior-frontend` skill id); its intended
> role — typed React/Vite component hygiene — was covered directly by the ADR/art-bible
> contracts. This is a recorded deviation, not a silent skip.

## 1. What landed

| Area | Files |
| --- | --- |
| Legacy archive | `legacy/` via `git mv`: `index.html`, `assets/` (minus fonts), `demo/`, `scripts/`, `photos.json`, `.htaccess`, `robots.txt` |
| Runtime kept at root | `photos/` (data), `photos.php` (manifest), `public/fonts/` (Chivo + Ultra, moved out of `legacy/assets/`) |
| App shell | `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css` (`@layer reset, base, tokens, recipes, utilities;`) |
| Config | `vite.config.ts` (Panda + Svelte + photos dev/preview middleware), `svelte.config.js`, `tsconfig.json`, `panda.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `package.json`, `eslint.config.js`, `.stylelintrc.json`, `knip.json`, `.nvmrc` |
| Tokens | `design/tokens/tokens.ts` (palette, 4 pt spacing, 5-step type scale, rarity tier table + recipe, contrast pairs), `design/tokens/motion.ts` (all motion-sheet §3 tokens) |
| Card | `src/lib/components/CardFace.svelte` (17/46/7/15/10/5 zones, 4:5 window, recipe class, scoped foil/glitter/glint consuming `var(--tier-*)`) |
| Domain | `src/lib/domain/contrast.ts`, `card.ts`, `rarity.ts` |
| Stores | `src/lib/stores/collection.svelte.ts`, `i18n.svelte.ts`, `audio.svelte.ts` (typed runes skeleton) |
| Tests | `tests/unit/contrast.test.ts`, `tests/README.md` |
| Gates | `scripts/selector-diff.mjs`, `scripts/gate-svelte-css.mjs`, CI steps in `.github/workflows/ci.yml` |

Resolved token values: `--quiet` `#978fa0`; `--credit` `#9a8da0`. These match the art
bible's gate-resolution commit (`66faf16`). `--tier-glow-opacity` was added as the
glow's alpha dial (common 0 / rare 0.28 / holo 0.56), derived from the tier's ring value.

## 2. Exact commands and results

Environment: Node `v25.2.1`, npm `11.6.2`. Toolchain: svelte `5.59.1`, vite `8.3.8`,
typescript `6.0.3` + `@typescript/native` alias `7.0.2`, svelte-check `4.7.8`, vitest
`5.1.1`, @playwright/test `1.65.1`, @pandacss/dev `2.6.0`, sharp `0.35.5`,
stylelint `18.1.0`, knip `6.47.0`, eslint `10.15.0`.

```
$ npm install
> prepare: panda codegen
codegen: wrote 78 files to styled-system
up to date, audited 385 packages
found 0 vulnerabilities
exit 0
```

```
$ npm run check                 # svelte-check --tsgo --tsconfig ./tsconfig.json
svelte-check found 0 errors and 0 warnings
exit 0
```

```
$ npm run build                 # panda codegen && vite build
✓ 121 modules transformed.
dist/index.html                  0.87 kB │ gzip:  0.46 kB
dist/assets/index-D_JHhZ05.css  20.36 kB │ gzip:  5.10 kB
dist/assets/index-VlK8fAht.js   59.64 kB │ gzip: 23.19 kB │ map: 646.62 kB
✓ built in 305ms
exit 0
```

```
$ npm run test:unit             # vitest run --project unit
✓ |unit| tests/unit/contrast.test.ts (10 tests)
Test Files  1 passed (1)
Tests       10 passed (10)
exit 0
```

```
$ npx stylelint "src/**/*.css" "src/**/*.svelte"
exit 0
```

```
$ npx knip
exit 0                              # no unused files/exports/dependencies, no hints
```

```
$ npm run gate:selectors
selector-diff: clean (3 files, 59 selectors)
exit 0
```

```
$ npm run gate:unused-css
unused-css: clean (2 Svelte component(s))
exit 0
```

```
$ npm run lint                  # eslint .
exit 0
```

### Contrast gate — negative proof

The gate lives in `tests/unit/contrast.test.ts`; the test fixture is the shipped
`#756e7d`. Injecting that hex as `palette.quiet` and re-running the suite produces:

```
ContrastGateError: Contrast gate failed: 4 pair(s) below minimum.
[quiet-on-bg] text: #756e7d on #111017 = 3.86:1 (minimum 4.50:1)
[quiet-on-bg-raised] text: #756e7d on #1b1823 = 3.56:1 (minimum 4.50:1)
[quiet-on-surface] text: #756e7d on #211d2a = 3.36:1 (minimum 4.50:1)
[quiet-on-surface-light] text: #756e7d on #2c2736 = 2.95:1 (minimum 4.50:1)

Tests  2 failed | 8 passed (10)      exit 1
```

Restored value: `#978fa0` → 6.08 / 5.62 / 5.30 / 4.66 and the suite passes 10/10.
The suite also has an explicit “legacy hex injected into the production pair set” test.

### Other gates — negative proofs

- **Cross-file selector diff**: adding `.card-shell` to `src/App.svelte` produced
  `selector-diff: 1 selector(s) defined in more than one source file` with both
  `file:line` locations and exit 1; removing it returns clean.
- **Unused CSS**: adding an unused selector to `src/App.svelte` produced
  `unused-css: 1 unused selector warning(s)` and exit 1.
  Limitation: `CardFace.svelte` uses a dynamic recipe class (`class="card-face {rarityClass}"`),
  so Svelte conservatively suppresses unused-selector analysis for that component. The
  gate covers every other component; Stylelint and the selector diff still apply to CardFace.

### Rendered check (system Chrome, not a committed artifact)

`vite preview` + Chromium (system Chrome via Playwright) at 900×1100, 2× DPR:

- card 340 × 485.7 px (aspect `0.7`), root font 13.6 px (`4cqw` of 340), no console errors;
- photo window 160.05 × 200.06 px (`4:5`);
- every zone reports `scrollHeight === clientHeight` at 320, 390 and 1280 px viewport
  widths (no horizontal overflow at any of the three) — the 320 px pass required a
  container-query compression of the header and zero-gap stat tiles;
- story copy is clamped to one line and the print line remains visible (the 15 % zone
  budget cannot hold three lines at this card size; B2 may spend a larger zone).

## 3. ADR-0002 spike traceability

| ADR-0002 spike item | B1 status |
| --- | --- |
| 1. Vertical slice: 3 cards + a holo through Panda/Vite/`svelte-check --tsgo` | **Partial**: one sample card through Panda + Vite + `svelte-check --tsgo`; three-card slice is B2 scope. Artifact size/time measured above. |
| 2. Stylelint `var()`-only + duplicate-selector-as-error | **Done**: strict-value plugin on art-bearing properties, `no-duplicate-selectors`, `color-no-hex`, raw colour functions disallowed. |
| 3. Contrast gate must reject legacy `#756e7d` and pass corrected value | **Done**: both negative and positive tests above. |
| 4. Holo recipe reconciliation (one typed value set, visual diff) | **Typed half done**: one `RARITY_TIERS` artifact → one recipe → `--tier-*`; staticCss emits all three variants. Old-vs-new rendered diff is B2 (the old layers are archived in `legacy/`). |
| 5. Unused-CSS gate | **Done mechanically** via `scripts/gate-svelte-css.mjs` + CI step; `svelte.config.js` keeps an onwarn belt. CardFace dynamic-class limitation recorded above. |
| 6. Cross-file selector diff | **Done** via `scripts/selector-diff.mjs` + CI step. |

## 4. Budgets (art bible §8)

| Item | Budget | B1 measured | Verdict |
| --- | --- | --- | --- |
| CSS total (compiled) | ≤ 45 KB uncompressed | 20.36 KB (5.10 KB gzip) | pass (45.2 %) |
| JS first load (compiled + Svelte runtime) | ≤ 60 KB | 59.64 KB (23.19 KB gzip) | **pass, flagged at 99.4 %** — no headroom; watch B2 additions |
| Fonts per woff2 | ≤ 30 KB | Chivo 33,252 B (33.25 KB), Ultra 15,248 B | **Chivo violates by 3.25 KB (10.8 %)** — subsetting is a follow-up asset task |
| First-load total | ≤ 250 KB | HTML 0.87 + CSS 20.09 + JS 59.64 + fonts 48.5 ≈ 129 KB (no LCP tile yet) | pass on current surface |

## 5. Deviations and deferred items

1. **`senior-frontend` skill missing** — not installed; `test-setup`/`architecture-review`/`design-system` loaded instead. No equivalent file was available to activate.
2. **Fonts moved to `public/fonts/`** — runtime assets cannot live only in the archived `legacy/assets/`; everything else in `assets/` moved to `legacy/`.
3. **`npm run photos` fails intentionally** — B0 archives the v1 generator at `legacy/scripts/photos.mjs`; it resolves paths against `legacy/` and would write wrong artifacts. `scripts/photos.mjs` prints the I3 deferral and exits 1.
4. **Node engine mismatch** — the machine runs Node 25.2.1; vitest/stylelint declare `^22.12 || ^24 || >=26`. `npm install` succeeds with EBADENGINE warnings. `.nvmrc` pins 24; CI uses Node 22. No gate failed.
5. **Preview port 4173 is occupied by an unrelated Python server on `127.0.0.1`** in this session; Vite preview was verified on 4175. Config pins `127.0.0.1:4173` (matching Playwright's baseURL); CI runners are clean. This is an environment conflict, not a repo defect.
6. **Vite's CSS minifier drops the standalone layer-order statement** (`@layer reset, base, tokens, recipes, utilities;`) from the emitted CSS; the source `src/app.css` has it, and emitted order is preserved by first layer occurrence (reset → base → tokens → recipes → utilities). Worth a Vite/Panda follow-up; the task’s source requirement is met.
7. **Chivo font over budget** (see §4) — inherited asset, needs subsetting.
8. **CardFace dynamic recipe class weakens unused-CSS analysis** (see §2) — accepted for B1; B2 can split the plate into a statically-classed child if the gate must cover it.
9. **No Playwright specs yet** — `npm run test:e2e` is wired but not run (B2+). CI skips it until `tests/e2e/*.spec.ts` exists.
10. **`photos.php` untouched** — runtime manifest rewrite is a later phase.

## 6. Explicitly not done (B2+)

CardFace foil stack completion (5 layers, tilt, pointer mask), three-card vertical slice,
pack theatre, catalogue, reading room, meta layer, PWA, image pipeline.

## 7. CI record

- PR **#2** (`design/explorer-foundation` → `main`), workflow `verify`.
- First run `45015230500` failed at the canon step: `scripts/canon-check.mjs` was
  missing because an in-flight canon change had added the `canon` script to
  `package.json` before its implementation was committed. Fixed in `262c5e7` by
  removing the `canon` / `canon:strict` / `test:canon` entries until the canon
  author lands them with `scripts/canon-check.mjs`; the failure is not masked.
- Re-run `45015317206`: verify pass in 29 s (install, typecheck, stylelint,
  selector diff, unused CSS, ESLint, knip, jscpd, Vitest, build; Playwright skipped
  because no e2e spec exists yet).
- **Correction (review B1, 2026-11-22):** that pass was partly false-green — every
  step used `npm run --if-present`, so the canon step reported *success* on
  `abda36e` even though `package.json` had no `canon` script. The gate manifest
  (`.github/gates.json` + `scripts/ci-gates.mjs`) now fails on a missing script, a
  missing step, `--if-present` or `|| true`, and the workflow uses plain
  `npm run <script>`. The real canon proof is the run after `f5cdb7d`.
- Commits: `7df151c` (B0/B1), `262c5e7` (CI fix).
