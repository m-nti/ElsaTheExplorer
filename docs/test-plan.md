# Elsa the Explorer — Test Plan (Refactor)

> **Status**: Active — binding for the Svelte 5 refactor
> **Author**: cs-qa-automation-lead
> **Last Updated**: 2026-11-22
> **Stack under test**: Svelte 5.59.1 · Vite 8.3.8 · TypeScript 7.0.2 (strict) ·
> Vitest 5.1.1 · Playwright 1.65.1 · Panda CSS 2.0 · sharp 0.35.5 (dev only)
> **Inputs**: `PRD.md` §4–§7 · `docs/architecture.md` **v1.2** (Testing Strategy, Error-State
> Taxonomy, Performance Budget, Persistence Schema, **PWA Layer**) · `docs/adr/ADR-0001-stack.md` ·
> `docs/adr/ADR-0002-styling-system.md` · **`docs/adr/ADR-0009-pwa.md`** · `design/ux/interaction-patterns.md` v2 ·
> `design/accessibility-requirements.md` (Standard tier) · `AGENTS.md`
> **Skills activated**: `qa-plan` (plan structure, story classification, DoD),
> `test-setup` (runner/CI layout), `smoke-check` (critical-path gate + verdict vocabulary)
> **Config resolved**: `automation: collaborative`, `workflow: minimal`,
> `qa.level: minimal`, `testing.strict: unset`.
> **Rigor override (recorded, deliberate)**: `qa.level: minimal` would drop the
> automated-test rows. `AGENTS.md` binds this project as a production product with
> "no small-project bias", and the owner brief for this document mandates the full
> gate set. This plan is therefore authored at **`qa.level: full`**. The override is
> intentional and is not a config drift to be "fixed" later.
> **Output of record**: this file. No test code exists yet; paths below are the
> contract that implementation must create.

---

## 1. Scope

### In scope

| Area | What is tested |
| --- | --- |
| Domain layer (`src/lib/data/`) | Pack draw invariants, rarity derivation, normalization, manifest merge, content budgets, card-view derivation |
| Persistence (`persistence.svelte.ts`) | v1→v2 migration, envelope reads, pruning, reset/wipe, storage-unavailable degradation |
| i18n (`src/i18n/`) | DE/EN key parity, placeholder parity, interaction-copy audit, language resolution |
| Design tokens (`design/tokens/tokens.ts`) | WCAG 2.2 contrast gate over the token source (including its own negative test) |
| Built app (Playwright) | Entrance → pack → reveal → detail → catalogue → language switch → reload; keyboard-only; reduced motion; focus return; error states; overflow matrix; browse inputs; reset; image delivery; axe; request privacy |
| CI | Gate order, cross-file selector diff, budget enforcement, flake policy |

### Out of scope (this plan)

- Unit tests of Svelte component internals. Components are verified through the built
  app by role and accessible name; no `data-testid`-driven component unit tests.
- `photos.php`, `photos.json` server behaviour beyond contract mocking. The PHP
  implementation is verified on the live host (PRD R9) by a separate post-deploy check;
  this plan mocks its responses.
- Cross-browser visual pixel equivalence. Visual regression is single-baseline
  (Chromium) plus a WebKit smoke run.
- Load/stress testing of IONOS. Byte budgets and request counts are proxies.
- The future upload/moderation page (PRD §10.4).

### Precedence when documents disagree

1. `PRD.md` §4–§7 (owner requirements)
2. `AGENTS.md` project facts (including the water ruling)
3. `design/accessibility-requirements.md` (committed Standard tier)
4. `docs/adr/ADR-0002` → `ADR-0001` → `ADR-0009` (PWA layer; it supersedes any earlier
   "no service worker" assumption — see §15, S1)
5. `design/ux/interaction-patterns.md` v2
6. `docs/architecture.md`

Document conflicts discovered while writing this plan are recorded in §15. They are
not silently resolved in test code.

---

## 2. Test strategy

### 2.1 Layer allocation

```
            ┌───────────────────────────────────────────────┐
  manual    │ VoiceOver/TalkBack · Coblis · real-device swipe│  ~45 min / release
            ├───────────────────────────────────────────────┤
  contract  │ image delivery · request privacy · byte budget │  hard gates
            ├───────────────────────────────────────────────┤
  e2e       │ journeys · keyboard · motion · focus · errors  │  Playwright 1.65
            │ overflow · reset · axe                         │
            ├───────────────────────────────────────────────┤
  unit      │ pack · rarity · normalize · merge · storage    │  Vitest 5
            │ i18n · contrast · budgets · card view          │  (no DOM)
            └───────────────────────────────────────────────┘
```

The pyramid is deliberately top-heavy at the **unit** layer for rules and at the
**contract** layer for bytes: those are the two places where v1's defects lived
(copied rarity, collapsed error states, oversized originals, sub-4.5:1 token).

### 2.2 Determinism rules (apply to every layer)

1. **No wall-clock dependence.** Domain functions take an injected clock where time
   matters; tests never assert on `Date.now()` directly.
2. **No unseeded randomness.** `drawPack` accepts an injected `rng: () => number`
   (default `Math.random` in production). Tests pass a seeded PRNG (mulberry32) and
   record the seed in the failure message.
3. **No shared mutable fixtures.** Every fixture is deep-frozen; a test that needs a
   mutation gets a structured clone.
4. **No arbitrary sleeps.** `page.waitForTimeout` is banned by lint in `tests/e2e/`.
   Use web-first assertions, `expect.poll`, or `page.clock`.
5. **No cross-test storage.** Every Playwright test starts with a fresh context;
   `storageState` is never reused between tests.
6. **Fixed locale/timezone/color scheme**: `de-DE`, `Europe/Berlin`, `dark`, so copy
   and date formatting are stable.

### 2.3 Environments

| Environment | Command | Used by |
| --- | --- | --- |
| Unit (node) | `vitest run --project unit` | CI gate 5, local watch |
| Built app (preview) | `vite build && vite preview --port 4173 --strictPort` | All Playwright projects |
| Mocked network | Playwright `page.route` on `**/photos.php*`, `**/photos.json*`, `**/photos/**` | Error/image/delivery suites |
| Real fixture server | `vite preview` serving `tests/fixtures/public/` | Image-contract suite only |

Playwright `webServer` starts `vite preview` from the CI build output. Tests never run
against the Vite dev server — dev-only transforms and HMR would hide build defects
(and Panda emits static artifacts at build time).

---

## 3. Toolchain configuration

### 3.1 Vitest 5

```ts
// vitest.config.ts (contract, not yet created)
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.spec.ts'], environment: 'node' } },
    ],
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/vitest.xml' },
    coverage: {
      provider: 'v8',
      include: ['src/lib/data/**', 'src/lib/stores/**', 'src/i18n/**'],
      // v2 target 90/90/95/90. Until #23 lands the suites, vitest.config.ts
      // enforces the measured B1 floor (61 lines / 50 functions / 44 branches /
      // 58 statements) as a ratchet — it may rise, never fall.
      thresholds: { lines: 90, functions: 90, branches: 95, statements: 90 },
    },
    sequence: { shuffle: true },
    // shuffle.seed is pinned in CI for reproducibility
  },
});
```

### 3.2 Playwright 1.65

```ts
// playwright.config.ts (contract, not yet created)
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'reports/playwright.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    colorScheme: 'dark',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // No serviceWorkers setting at this level: it is decided per project, below.
  },
  expect: { timeout: 5_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  webServer: [
    {
      command: 'npm run preview -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Two-build fixture server for the PWA project (§6.12). Serves build A from
      // tests/fixtures/builds/a and flips to build B on POST /__fixture/deploy-b, on
      // the same origin and scope as A — a real SW update, never a mocked one.
      command: 'node scripts/pwa-fixture-server.mjs --port 4180 --builds tests/fixtures/builds',
      url: 'http://127.0.0.1:4180/__fixture/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    // Non-PWA suites block the service worker: route mocks and request-log assertions
    // must stay deterministic (a cached shell would answer after `page.route`).
    { name: 'chromium', use: { ...devices['Desktop Chrome'], serviceWorkers: 'block' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], serviceWorkers: 'block' } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], serviceWorkers: 'block' } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'], serviceWorkers: 'block' } },
    // PWA suite (§6.12): its own origin and port, service workers allowed, serial —
    // every test shares one origin's Cache Storage, one IDB index and one registration.
    {
      name: 'pwa',
      testDir: 'tests/e2e/pwa',
      fullyParallel: false,
      workers: 1,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4180',
        serviceWorkers: 'allow',
      },
    },
  ],
});
```

**Why the service-worker setting is per project, not global.** `serviceWorkers: 'block'`
was set once for the whole config, which silently made every `E-PWA-*` test impossible to
write: with the worker blocked there is no precache, no offline shell and no update
lifecycle. It is a **determinism default for the non-PWA suites**, not a statement about
the product. Scoping it to the four browser projects keeps §6.1–§6.11 as they were and
gives the PWA suite the one setting it cannot run without.

The `pwa` project is deliberately separate in every dimension:

- **Own origin** (`:4180`, the two-build fixture server) — cache state from other suites
  can never leak in, and a `deploy-b` flip cannot break a journey test.
- **Own `testDir`** (`tests/e2e/pwa`) — gate 7's explicit `--project` list omits `pwa`, so
  only gate 10 (§8.1) runs it. A PWA failure is attributable without reading traces.
- **`workers: 1`, `retries: 0`** — the suite is stateful by nature; parallel workers would
  race on one Cache Storage. Zero retries is intentional: PWA flake must be visible and
  fixed, never retried into green (§9).
- **Fresh browser context per test** (Playwright default) — profile, Cache Storage and IDB
  start empty, which is what "visit 1" in `E-PWA-07` means. Tests that need a warm state
  seed it explicitly through `tests/e2e/pwa/support/sw.ts`, never by depending on order.
- **No in-test sleeps.** The 2.5 s deadline for `E-PWA-12` is produced by the fixture
  server (`/__fixture/delay?ms=3000`), not by `page.waitForTimeout` — gate 3's
  `no-restricted-syntax` rule stays intact.

Browser install is pinned (`npx playwright install --with-deps` in CI) and cached by
version. WebKit is required, not optional: native `<dialog>` focus cycling is a known
Safari risk (interaction-patterns Open Question). The `pwa` project is Chromium-only
because `Page.getInstallabilityErrors` is a Chromium CDP domain; WebKit's contribution to
the PWA layer is the recorded "not applicable" reason in `E-PWA-11`, plus the manual iOS
rows in §6.12.

### 3.3 Testability seams required from implementation

These are prerequisites, not preferences. A story that cannot be tested without them is
not done.

| Seam | Requirement | Why |
| --- | --- | --- |
| `drawPack(photos, seenIds, opts)` | `opts.rng` injectable; returns slots + lap/restart metadata | Deterministic invariant tests |
| `normalize(raw)` | Pure, never throws, returns `{ photos, dropped, reasons }` | Property/fuzz testing |
| `mergeManifest(base, captions)` | Pure, inputs never mutated | Fuzz + associativity tests |
| `persistence` | Storage adapter injectable (default `window.localStorage`) | Migration/wipe tests without a browser |
| `tokens.ts` | Exposes token values **and** declared usage pairs | Contrast gate can enumerate pairs |
| Components | Semantic roles + accessible names; no test-id-only hooks | Playwright role locators |
| Build | Emits `reports/size.json` (JS/CSS gzip, per-chunk) | Bundle budget gate |
| `src/lib/pwa/{cachePolicy,limits,schema}.ts` | Pure functions only — no `self`, no `caches`, no DOM: `shouldCache(request-meta, response-meta)`, `planEvictions(entries, budget)`, `pickStrategy(url, mode, hasSnapshot)`, `isCurrentSnapshot(entry)`, exported `CACHE_SCHEMA`/`LIMITS` | The cache policy is the PWA's only correctness-critical logic; it must be unit-testable without a browser (§5.9) |
| Build (PWA) | `__BUILD_HASH__` injected at build time, emitted as `data-version` on `<html>` **and** in the precache cache name | `E-PWA-04` asserts "new build" by `data-version`, never by a file mtime or a text match |
| Fixture server | `POST /__fixture/deploy-b` swaps the served build; `GET /__fixture/delay?ms=` delays a route; `GET /__fixture/state` reports the served build hash | Two-build update and 2.5 s-deadline tests without in-test sleeps or fake servers |

---

## 4. Test data

All fixtures live in `tests/fixtures/`. Committed fixtures are the deterministic text/JSON
ones; **binary image fixtures are generated at setup** into a gitignored directory (§4.2),
because a committed copy of a production photo is a permanent EXIF/GPS leak. Production
`photos/` is never read by tests and never modified.

### 4.1 Deterministic fixture manifest

`tests/fixtures/manifest.valid.json` — 8 photos, fixed ids `fx-01`…`fx-08`, fixed
`generated` stamp `2026-01-01T00:00:00.000Z`, `source: "photos"`, and the full field
matrix:

| Fixture id | Field coverage |
| --- | --- |
| `fx-01` | `caption` as **string**, `alt/name/mood/description` as `Localized`; no v2 fields (backward-compat baseline) |
| `fx-02` | `set: "nap-wing"`, `focus: {x:0.2,y:0.8}`, `chase: false` |
| `fx-03` | `chase: true`, `set: "portrait-room"`, `rarity: "rare"` (override) |
| `fx-04` | `rarity: "holo"` (override) — must beat the hash |
| `fx-05` | `focus: {x:0,y:0}` and `fx-06` `focus: {x:1,y:1}` — clamp edges |
| `fx-07` | `demo: true`, `heic: true`, `src: "photos.php?view=fx-07.heic"` — legacy shape: the `src`/`?view=` form must normalize to a bounded alias (302 → `?download=`) and is **never** rendered as an `<img>` source |
| `fx-08` | Intrinsic `common` by hash (verified at fixture creation), used for promotion tests |

Additional fixtures:

| File | Contents | Purpose |
| --- | --- | --- |
| `manifest.invalid.json` | 5 entries: missing `id`, duplicate `id`, `caption: 42`, `focus: {x:"a"}`, `alt: null`; plus 3 valid | Drop-and-count, no half-kept |
| `manifest.empty.json` | `{ generated, source, photos: [] }` | `empty` phase, **not** `network-error` |
| `manifest.v2-extras.json` | Every optional field present, unknown future fields added | Forward compatibility |
| `manifest.max-strings.json` | Generated: `NAME_MAX`, `MOOD_MAX`, `CAPTION_MAX`, `ALT_MAX` exactly, plus +1 overflow | Budget + overflow matrix |
| `manifest.large.json` | Generated 500 entries (script, committed) | Binder/grid performance and lazy-load assertions |
| `manifest.hostile.json` | `__proto__`, `constructor`, 10 kB strings, NUL bytes, RTL + emoji names | Normalization safety, XSS non-execution |

### 4.2 Fixture images

**No fixture is a copy of a production photo.** A byte-identical copy of
`photos/elsa-01.jpg` would commit a personal image with its EXIF/XMP payload (GPS, device
model, capture time) into git history — permanent, and not revertable by deleting the file
later — and it would tie the passthrough canary to a file the owner may re-export at any
time. Diffable text fixtures stay committed (§4.1); **binary image fixtures are generated**
by `tests/fixtures/images/make-fixtures.mjs` into the gitignored
`tests/fixtures/images/generated/` at test setup (or via `npm run fixtures`). The generator
writes `tests/fixtures/image-sources.json` (also gitignored) with
`{file, bytes, sha256, width, height}` for everything it produced, and the suite reads the
source hashes and byte lengths from that ledger — never from a constant in the test file.

| File (`tests/fixtures/images/generated/`) | Spec | Purpose |
| --- | --- | --- |
| `portrait.jpg` | 1200×1600, 3:4, mid-key | Crop anchor `focus`, portrait frames |
| `landscape.jpg` | 1600×1067, 3:2, normal key | Standard tile/pack card |
| `high-key.jpg` | 1600×1200, 4:3, near-white background | Contrast/legibility of card plate over bright art |
| `stress-24mp.jpg` | **generated** 5712×4284 = **24,470,208 px (24.47 MP)**, EXIF Orientation 1, EXIF + XMP + GPS payload embedded, ~1.5–4 MB | Source-passthrough detection, byte ceiling, metadata-stripping stress, memory-ceiling case (`docs/photo-pipeline-implementation.md` §10.3) |
| `stress-24mp-orient6.jpg` | same 24,470,208 px, EXIF Orientation 6 | Rotation path at the hero pixel count (the 3.2× worst-case bitmap projection) |
| `stress-60mp.jpg` | **generated** 9000×6750 = **60,750,000 px (60.75 MP)**, valid JPEG | Above the 32 MP acceptance cap: asserts `413 source_too_many_pixels` with no decode and no source bytes (ADR-0008 checklist) |

The stress fixtures are the canaries: any UI response whose SHA-256 matches a recorded
source SHA-256, or whose byte length equals a recorded source length, is a failed delivery
assertion. The recorded value is the assertion — not a literal size copied from a photo,
which is why the old `3,983,035` constant is gone.

### 4.3 Image budget constants

`tests/fixtures/image-budgets.json` is the single place the test harness **reads** the budgets
from. It mirrors the ratified ceilings below and must not diverge from ADR-0008 / art-bible §8;
it is a mirror, not a tuning surface (a change here without an ADR amendment is a defect). It
carries budgets only; the source byte lengths and hashes it is compared against come
from the generated `image-sources.json` (§4.2).

| Tier | Consumer | Max long edge | WebP ceiling | JPEG ceiling | Rationale |
| --- | --- | --- | --- | --- | --- |
| `tile` | BinderShelf / catalogue grid | 360 px | 36,000 B (36 KB) | 55,000 B (55 KB) | 2–3 column mobile grid; doubles at DPR 2 within a 360 CSS-px cell |
| `pack` | PackTheatre drop row | 720 px | 80,000 B (80 KB) | 110,000 B (110 KB) | card art / pack theatre; one card fills a phone viewport |
| `detail` | CardDetail exhibit | 1200 px | 150,000 B (150 KB) | 210,000 B (210 KB) | Full-screen study table; still ~19× below the 3.98 MB source |
| `download` | "Foto speichern" — **explicit click only** | 1600 px | 350,000 B (350 KB) | 500,000 B (500 KB) | User-initiated download, never a rendered image |
| `global` | Any UI image response (render path) | 1200 px | 150,000 B | 210,000 B | The largest display-rung ceiling (detail); no non-download response may exceed it |

**These are the ratified ceilings** (art-bible §8, 2026-11-22; ADR-0008): hard per file, per
format, and the test must not be relaxed to a looser number. KB = 1,000 bytes. Aim ~20 % under
every ceiling; a rung at 95–100 % of its ceiling is a flagged warning, not a pass.

Ceilings are **delivery budgets**, not safety caps. The pre-decode limits (20 MiB compressed,
32 MP acceptance, 8000 px edge, 28.5 MP GD render ceiling) live in
`docs/photo-pipeline-implementation.md` §10 and are asserted as `413` cases, never as the
delivery number. The pipeline's 4× safety discard guard (§9) is likewise a safety valve for a
pathological render, not a delivery budget — the ceilings in the table above are the contract.
A tier ceiling must never be loosened to make a test pass; loosening requires an ADR amendment.

### 4.4 Deterministic copy fixture

`tests/fixtures/copy-canon.json` pins the exact strings that are declared SSOT in a
spec (reset confirmation body, progress label, empty-state instruction, the `P` hint).
It exists to make copy drift a test failure rather than a review opinion. See
contract conflict **C4** (now RESOLVED: "gesammelt/collected" is canon) before pinning the progress label.

---

## 5. Unit test plan (Vitest 5)

File paths below are contractual. Test IDs are stable and referenced by story DoD.

### 5.1 Pack draw invariants — `tests/unit/pack.draw.spec.ts`

| ID | Assertion | Notes |
| --- | --- | --- |
| U-PACK-01 | Draw returns exactly `min(4, photos.length)` slots (F1) | 0, 1, 2, 3, 4, 5, 6, 500 photos |
| U-PACK-02 | No duplicate `photoId` inside one pack (F5) | 10,000 seeded draws, 8-photo fixture |
| U-PACK-03 | Every returned `photoId` exists in the input manifest | No invented ids |
| U-PACK-04 | With ≥4 unseen, all 4 slots are unseen (F6) | 20 photos, empty seen-set |
| U-PACK-05 | With 2 unseen, both appear and the other 2 come from seen | Exhaustive over placements |
| U-PACK-06 | Seen-set is not mutated by `drawPack` | Deep-freeze input; assert unchanged |
| U-PACK-07 | A pack never repeats a photo before the whole binder has been walked | Simulate 40 consecutive packs; assert a full permutation per lap |
| U-PACK-08 | **Lap boundary**: when the draw consumes the last unseen photo, the result flags `lapComplete: true` and the next draw starts lap N+1 | Exactly at boundary, one before, one after |
| U-PACK-09 | Restart is announced at most once per lap | Flag is edge-triggered, not level-triggered |
| U-PACK-10 | Empty manifest returns `[]` and `lapComplete: false`, no throw | Empty ≠ error |
| U-PACK-11 | Fewer than 4 photos yields all of them, no placeholders | 1, 2 and 3 photos |
| U-PACK-12 | Draw is deterministic given the same `(photos, seen, seed)` | Same seed twice → identical output |
| U-PACK-13 | Different seeds produce different orders across 100 draws (not a fixed shuffle) | Guards against a constant rng |
| U-PACK-14 | Draw complexity stays linear-ish: 500 photos × 200 draws under 250 ms (node) | Advisory threshold, generous |

### 5.2 Promotion rule and reveal order — `tests/unit/pack.promotion.spec.ts`

| ID | Assertion |
| --- | --- |
| U-PROMO-01 | If the drawn four are all intrinsic `common`, **exactly one** slot has `promoted: true` (F4) |
| U-PROMO-02 | If at least one drawn card is intrinsically `rare` or `holo`, **no** slot is promoted |
| U-PROMO-03 | Never more than one promoted slot per pack |
| U-PROMO-04 | Promotion is `holo` **presentation** only; the slot's intrinsic rarity is unchanged |
| U-PROMO-05 | A one-card pack of a common card is promoted (F4 holds at minimum size) |
| U-PROMO-06 | Promotion choice is uniform over the four slots across 10,000 seeded draws (no positional bias) |
| U-PROMO-07 | Reveal order: the four slots are sorted ascending by presented rarity, so the holo/rare **climax is in slot 4**; **slot 3** carries a rare/holo only when the pack holds two of them; slot 1 never carries the promoted or highest-rarity card (with ≥ 1 common drawn, no holo is revealed first) |
| U-PROMO-08 | Two non-commons: the higher rarity is last; ties resolved deterministically by the injected rng |
| U-PROMO-09 | The ordered array is a permutation of the drawn set (no card added/dropped by ordering) |
| U-PROMO-10 | Chase card (`chase: true`) follows the same ordering rule and never outranks by rarity mutation |

### 5.3 Rarity single source of truth — `tests/unit/rarity.spec.ts`

| ID | Assertion |
| --- | --- |
| U-RAR-01 | `intrinsicRarity` is a pure function of `id` + `rarityOverride` (F3) |
| U-RAR-02 | Same id ⇒ same rarity across 10,000 calls and across a simulated module reload (**F3/M3 regression**) |
| U-RAR-03 | Threshold boundaries: roll 63→common, 64→rare, 87→rare, 88→holo, 99→holo (Pin `fnv1a` and thresholds 64/88) |
| U-RAR-04 | `rarityOverride` wins for `common`, `rare`, `holo` |
| U-RAR-05 | `rarityOverride: ''`, `null`, `undefined`, or invalid string falls back to the hash |
| U-RAR-06 | `presentedRarity(photo, null) === intrinsicRarity(photo)` |
| U-RAR-07 | `presentedRarity(photo, {promoted:true}) === 'holo'` |
| U-RAR-08 | `presentedRarity(photo, {promoted:false}) === intrinsicRarity(photo)` |
| U-RAR-09 | Promotion of a rare card (defensive) never downgrades it |
| U-RAR-10 | **Single-source invariant**: for every pack draw, for every photo, `binderCardView(photo).rarity === intrinsicRarity(photo)` (The v1 copy-bug test) |
| U-RAR-11 | Promotion cannot survive the pack: after `packs.clear()`, no binder view reports holo from promotion |
| U-RAR-12 | `PhotoRecord` is frozen: `Object.isFrozen(record)` and `Reflect.set` returns `false` |
| U-RAR-13 | Snapshot hash of the whole `photos` array is identical before and after 1,000 draws (No mutation anywhere in the draw path) |
| U-RAR-14 | A pack slot has exactly the keys `photoId`, `promoted` (no embedded record, no `rarity`) |
| U-RAR-15 | `packCardView(slot, i)` resolves the photo by id from the collection; it does not clone the record |
| U-RAR-16 | Rarity labels (DE/EN) come from the dictionary keyed by the enum; no string literals in `rarity.ts` |
| U-RAR-17 | Every rarity value is reachable from the fixture set (no dead enum branch) |

### 5.4 Persistence: migration, pruning, reset — `tests/unit/persistence.spec.ts`

Storage is a fake in-memory adapter; no jsdom required.

| ID | Assertion |
| --- | --- |
| U-PST-01 | v2 envelope shape `{v:2,data:…}` for `lang`, `sound`, `seen` |
| U-PST-02 | v1 bare array (`seen`), bare bool (`sound`), bare string (`lang`) are read leniently and mapped to v2 |
| U-PST-03 | Migration writes v2 **before** deleting v1; if the v2 write throws, v1 keys remain intact |
| U-PST-04 | Migration is idempotent: second run produces byte-identical storage |
| U-PST-05 | Corrupt JSON, wrong type, `null`, `"[]"` for `seen` → defaults, no throw |
| U-PST-06 | Invalid entries inside a v1 `seen` array (numbers, nulls, duplicates) are dropped; valid ids kept |
| U-PST-07 | Forward safety: an envelope with `v:3` is never overwritten; reads return defaults (architecture rule) |
| U-PST-08 | Unknown `lucky-elsa.*` keys are not interpreted, but are cleared by reset |
| U-PST-09 | Non-`lucky-elsa.*` keys are never touched by migration or reset |
| U-PST-10 | `pruneSeen(manifest)`: ids absent from the manifest are removed; present ids survive; order-insensitive |
| U-PST-11 | `pruneSeen` on an empty manifest clears `seen` (owner deleted all photos) |
| U-PST-12 | Pruned ids do not resurrect on the next boot |
| U-PST-13 | **Reset clears every `lucky-elsa.*` key** — asserted by enumerating the adapter after seeding 3 known + 4 stale keys (AGENTS.md binding) |
| U-PST-14 | Reset restores `lang: 'de'`, `sound: true`, `seen: []` and announces the restart |
| U-PST-15 | Reset with storage unavailable does not throw; in-memory state still resets |
| U-PST-16 | `setItem` throwing `QuotaExceededError` degrades to in-memory defaults, app keeps running, reset is disabled with explanation (store state, not UI) |
| U-PST-17 | A failed read yields defaults without a console flood (max one warning) |
| U-PST-18 | Write-through happens once per pack completion, not once per card |
| U-PST-19 | `seen` round-trips as a `Set` after reload with 500 ids |
| U-PST-20 | Storage keys are exactly the ratified set from ADR-0003; a snapshot test pins the list |

> **Resolved 2026-11-22:** ADR-0003 §2 ratifies the full key set. U-PST-20 pins exactly:
> `lucky-elsa.{lang,sound,seen}.v2`, `lucky-elsa.{sets,flags,exhibition,cardback}.v1`.
> See **C5**.

### 5.5 Contrast gate from tokens — `tests/unit/tokens.contrast.spec.ts`

The gate computes WCAG 2.2 relative luminance and contrast ratio **from
`design/tokens/tokens.ts`**, not from rendered CSS and not from a hand-maintained table.

| ID | Assertion |
| --- | --- |
| U-CON-01 | `contrastRatio(fg, bg)` matches WCAG 2.2 §1.4.3 math for a published reference pair (black/white = 21.0 ± 0.01) |
| U-CON-02 | Every token declared with role `text` or `text-muted` has at least one declared background pair |
| U-CON-03 | Every text pair ≥ 4.5:1 |
| U-CON-04 | Large-text tokens (≥ 24 px or ≥ 18.66 px bold) ≥ 3:1 |
| U-CON-05 | Focus-ring, border and progress tokens ≥ 3:1 against every surface they can sit on |
| U-CON-06 | No token is exempt without an entry in `contrastExemptions` naming the WCAG clause and a reason; the exemption list is empty at gate start |
| U-CON-07 | Alpha tokens are composited against their declared background before ratio computation |
| U-CON-08 | Failure output names token, pair, computed ratio, threshold, and the file/line of the token |
| U-CON-09 | **Negative test**: the gate REJECTS a fixture token set containing the v1 `--quiet` `#756e7d` on `--bg` `#111017` (Computed 3.86:1) |
| U-CON-10 | **Negative test**: same token on `--surface` `#211d2a` (3.36:1) and `--bg-raised` `#1b1823` (3.56:1) also rejected |
| U-CON-11 | **Negative test**: a token at exactly 4.49:1 fails; 4.50:1 passes (boundary) |
| U-CON-12 | The production token set passes with the corrected `--quiet` value (Gate must be trusted to pass) |
| U-CON-13 | No hex/rgb literal exists outside `design/tokens/` in TS/CSS sources (Pairs with Stylelint; catches bypasses) |

> The negative test is a hard requirement from ADR-0002's build-phase checklist: the
> gate must demonstrably reject the known-bad v1 value before it is trusted to pass
> anything. Do not "fix" the negative test by deleting the fixture.

### 5.6 i18n dictionary parity — `tests/unit/i18n.spec.ts`

| ID | Assertion |
| --- | --- |
| U-I18N-01 | `en.ts satisfies Dictionary` compiles under `tsc --noEmit` (a missing key is a type error) |
| U-I18N-02 | Runtime recursive key parity: identical key sets, no extras on either side |
| U-I18N-03 | No empty or whitespace-only string values |
| U-I18N-04 | Placeholder parity per key: `{count}`, `{pct}`, `{name}`, `{total}`, `{outfit}` sets are equal across DE/EN |
| U-I18N-05 | No unresolved placeholder survives `t(key, vars)`; missing vars throw in dev, render raw in prod (documented behavior) |
| U-I18N-06 | Plural/count forms: 0, 1, 2, 24 produce grammatical strings in both languages |
| U-I18N-07 | Every key passed to `announcer.say` exists in both languages (static scan of `t('…')` call sites + runtime sweep) |
| U-I18N-08 | Every state-taxonomy copy key exists: `loading`, `empty`, `network-error`, `invalid`, `thumb-failed`, `image-failed`, `share-*`, `storage-unavailable` |
| U-I18N-09 | **Interaction-copy audit**: every interaction verb/affordance in copy maps to an entry in the interaction matrix. The audit term list covers "swipe/wischen", "press/drück", "click/klick", "scroll", "drag", "tap/tippen", "reset/von vorn" (Kills the v1 "promises swiping" class) |
| U-I18N-10 | The audit fails on a seeded positive control (a string promising an unimplemented `R` reset shortcut) (Proves the audit can fail) |
| U-I18N-11 | Language resolution: `?lang=en` beats stored `de`; `?lang=de` beats stored `en`; invalid/absent param falls back to stored, then `de` |
| U-I18N-12 | `?lang=` is persisted after use (F9) |
| U-I18N-13 | No dictionary value contains a hardcoded brand alternate (the brand name is fixed; taglines localize) |
| U-I18N-14 | Copy canon fixture: reset confirmation body is the ratified `reset.body` — DE "Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück." / EN twin, cap 140 |
| U-I18N-15 | No water vocabulary in either dictionary (rain, mud, bath, wet, nass, Regen, Schlamm, Bad) (AGENTS.md canon, content audit) |
| U-I18N-16 | Departments are exactly the six canon rooms + `Neuzugänge`, in fixed order, in both languages (C7) |
| U-I18N-17 | At most one `!` per string; none in error, destructive-confirmation or accessibility strings; the terminal `!` is removed before a live region |

### 5.7 Normalization and manifest merge — `tests/unit/normalize.property.spec.ts`

Property-based tests use `fast-check` (dev dependency) with a pinned seed and
`numRuns: 10_000`. Failures print the seed and shrink to a minimal counterexample; the
shrunk case is added to `tests/fixtures/regressions/`.

**Invariants (must hold for every input, including garbage):**

| ID | Property |
| --- | --- |
| P-NORM-01 | `normalize` never throws, for any JSON value |
| P-NORM-02 | Output is always an array of schema-valid `PhotoRecord`s (validated with a runtime schema) |
| P-NORM-03 | `dropped` equals the number of input entries that produced no record; every dropped entry has a reason |
| P-NORM-04 | No half-kept entry: a record with an invalid `id` is entirely absent |
| P-NORM-05 | Idempotence: `normalize(normalize(x))` deep-equals `normalize(x)` |
| P-NORM-06 | Defaults: missing `set` → `null`; missing `focus` → `{x:0.5,y:0.5}`; missing `chase` → `false`; `''` rarity → hash-derived |
| P-NORM-07 | `focus` is clamped to `[0,1]`; `NaN`/`Infinity`/strings are rejected and defaulted, not propagated |
| P-NORM-08 | String content fields are coerced to `Localized` for both languages; a partial `Localized` follows the documented EN-fallback policy |
| P-NORM-09 | Duplicate ids keep the first occurrence, drop the rest, and count them |
| P-NORM-10 | Input order is preserved for kept entries |
| P-NORM-11 | Unknown fields are ignored (forward compatibility), never copied into the record |
| P-NORM-12 | Prototype-pollution keys (`__proto__`, `prototype`, `constructor`) are ignored; `Object.prototype` is untouched |
| P-NORM-13 | Unicode, emoji, RTL and combining marks survive unchanged; no length truncation at normalize time (truncation is `cardView`'s job) |
| P-NORM-14 | `width`/`height` are positive integers; missing values yield `null`, not `0` (0 would break CLS) |
| P-NORM-15 | `heic` is a boolean derived from the extension **and** the explicit flag; the flag wins |
| P-NORM-16 | `mergeManifest(base, captions)`: output is a permutation-preserving superset of base ids |
| P-NORM-17 | Merge precedence is deterministic: explicit photo field > captions entry > default; documented per field |
| P-NORM-18 | Merge is idempotent and associative for the same inputs |
| P-NORM-19 | Merge never mutates either input (deep-freeze assertion) |
| P-NORM-20 | Merge with an empty captions object is a deep-equal no-op |
| P-NORM-21 | Merge conflicts (caption for an unknown id) are ignored and counted, not invented into a photo |
| P-NORM-22 | A 500-entry manifest normalizes in under 50 ms (node) |

**Fuzz corpus:**

| ID | Input generator |
| --- | --- |
| F-NORM-01 | Random nested JSON (depth ≤ 6, arbitrary keys/values), 10,000 runs |
| F-NORM-02 | Mutational fuzz of `manifest.valid.json` (bit flips, key swaps, truncations), 5,000 runs |
| F-NORM-03 | `manifest.hostile.json` replayed deterministically |
| F-NORM-04 | Every entry of `manifest.invalid.json` individually, asserting exact `dropped`/reason |
| F-MERGE-01 | Random captions maps over the valid manifest, 5,000 runs |
| F-MERGE-02 | Random base manifests (0–50 entries) × random caption maps |

### 5.8 Content budgets and card views — `tests/unit/cardview.spec.ts`

Included because the overflow fix is only real if the derivation enforces it.

| ID | Assertion |
| --- | --- |
| U-CV-01 | `NAME_MAX=40`, `MOOD_MAX=48`, `CAPTION_MAX=180`, `ALT_MAX=200` are exported constants and enforced at view-build time |
| U-CV-02 | Truncation uses a single ellipsis, never mid-grapheme (emoji/combining marks) |
| U-CV-03 | Exactly-at-budget strings are not truncated; +1 is |
| U-CV-04 | `binderCardView` never carries `promoted`/presented rarity |
| U-CV-05 | `packCardView` carries slot index (1-based) and presented rarity for the accessible name |
| U-CV-06 | Accessible-name fragments come from the dictionary (number, name, rarity, seen state) |
| U-CV-07 | `focus` maps to `object-position: x*100% y*100%`; default is `50% 50%` |

### 5.9 PWA cache policy, limits and schema — `tests/unit/pwa.*.spec.ts`

`src/lib/pwa/cachePolicy.ts`, `src/lib/pwa/limits.ts` and `src/lib/pwa/schema.ts` are
pure modules (ADR-0009 §4, §9; architecture v1.2 §PWA Layer). They are the whole
correctness surface of the offline layer: everything else in the worker is plumbing.
**Target: 100 % branches on all three files** — a cache that over-admits quietly ships
originals, and one that over-evicts quietly loses the catalogue.

Three spec files, one per module, so a failure names the module:
`tests/unit/pwa.cachepolicy.spec.ts`, `tests/unit/pwa.limits.spec.ts`,
`tests/unit/pwa.schema.spec.ts`.

| ID | Assertion |
| --- | --- |
| U-PWA-01 | **Admission negatives (table-driven, every row must be rejected):** cross-origin; non-GET (`POST`, `HEAD`); `Range` request; `status !== 200` (302, 404, 500); `status === 206`; `response.type === 'opaque'`; `?download=`, `?view=`, `?capabilities=1`; a `?image=` URL with a numeric `size` or `size=orig`; a URL outside `photos.php`/`photos/thumbs/*`/`photos/derived/*`. The function returns a *reason code* per rejection, not a bare boolean — a silent `false` cannot be diagnosed in a trace |
| U-PWA-02 | **Admission positives:** `photos.php?image=…&size=tile` / `size=pack` / `size=detail` for each rendition, `photos/thumbs/…`, `photos/derived/…`, GET, 200, non-opaque. Each maps to the right cache (`tile` → `elsa-img-tile-v1`; `pack` and `detail` → `elsa-img-large-v1`) — a `detail` derivative landing in the tile pool is the failure the two-pool design exists to prevent |
| U-PWA-03 | **Content-type, credentials and cookie gates:** `Content-Type` must start with `image/` (JSON, HTML, octet-stream, missing header all rejected); `request.credentials === 'include'` rejected; an `Authorization` header rejected; a response carrying `Set-Cookie` rejected. Each of the five gates is independently load-bearing — mutate one away and a test must fail |
| U-PWA-04 | **`Vary` correctness:** accepted when absent or exactly `Accept-Encoding` (case-insensitive, list-tolerant); rejected for `Vary: *`, `Vary: Cookie`, `Vary: Accept-Language`, `Vary: Accept-Encoding, Accept-Language`. Cache key is the full URL with only `?list=1`'s `ts` and other params dropped; a `format=jpeg` and a `format=webp` URL produce **different** keys (ADR-0008's URL-encoded format negotiation is what makes this safe) |
| U-PWA-05 | **Rendition ceilings (`limits.ts`):** tile 55 KB / pack 110 KB / detail 210 KB JPEG ceilings, each + 8 KB slack. Exactly at `ceiling + 8192` bytes is admitted; `+1` is not. `Content-Length` is used when present; when absent the body is measured before the decision. Over-ceiling returns "serve but do not store" — a distinct outcome from "reject", because the visitor must still see the image |
| U-PWA-06 | **Eviction plan (`planEvictions(entries, budget)`):** byte bound only, count bound only, both at once; exact-fit admitted without eviction; eviction order is strictly ascending `lastAccess` (assert the exact surviving key set, not just the counts); an entry missing from the IDB index is treated as evictable first (self-healing); `elsa-cat-v1` is never a candidate; a tile insert never evicts a large entry and vice versa |
| U-PWA-07 | **Budget parity (both directions):** every ceiling in `limits.ts` equals `tests/fixtures/image-budgets.json` — per rendition, per format, plus entry counts (400 / 200) and byte budgets (20 MB / 32 MB / 54 MB device total). Adding a rendition to either file without the other fails; the fixture is not allowed to be the loose side |
| U-PWA-08 | **`schema.ts` invariants:** every cache name is `elsa-` prefixed and enumerable from one exported list; bumping `CACHE_SCHEMA` changes every runtime cache name (`elsa-cat-v1` → `elsa-cat-<n>`, both image pools) and **not** the precache name (that is versioned by build hash); `isCurrentSnapshot(entry)` is false for an older schema — an old snapshot is discarded, never read (ADR-0009 §10.5); the never-cached URL list is exported once and consumed by `cachePolicy`, not duplicated |
| U-PWA-09 | **Strategy selection (`pickStrategy`):** `request.mode === 'navigate'` → precache shell; `/assets/*-<hash>.{js,css}`, `/fonts/*.woff2`, `/icons/*`, `/manifest.webmanifest` → precache cache-first; photo derivative → runtime cache-first; `/photos.php?list=1` **with** snapshot → network-first with the 2.5 s deadline; **without** snapshot → pass through (no SW-level timeout — the app owns its 3 s/4 s chain and must not be double-raced); `/photos.json` → stale-while-revalidate; everything else → pass through, unstored. Table-driven over the ADR's strategy matrix, one row per resource |
| U-PWA-10 | **Theme parity with the design tokens:** `theme_color` and `background_color` in `schema.ts` (the single source the build writes into `manifest.webmanifest`) equal `tokens.bg` exactly — same literal, same case, no re-typing. The test imports `tokens.ts` and fails on any divergence, so a palette change cannot leave the install splash on the old background. Also asserts `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: 'standalone'`, `lang: 'de'`, `dir: 'ltr'`, `name: "Elsa the Explorer"`, and the absence of `prefer_related_applications` |

The 2.5 s deadline itself is a worker-timer behaviour, not a pure-function rule: it is
asserted end-to-end in `E-PWA-12`, with `U-PWA-09` guaranteeing only that the policy
*chooses* network-first with a deadline argument. Do not try to unit-test the timer.

---

## 6. Integration test plan (Playwright 1.65)

Shared helpers: `tests/e2e/support/manifest.ts` (`mockManifest(page, fixture, opts)`),
`tests/e2e/support/images.ts` (`mockImageFailures(page, ['thumb'|'src'])`),
`tests/e2e/support/keys.ts` (typing guards), `tests/e2e/support/a11y.ts` (axe builder).

### 6.1 Golden journey — `tests/e2e/journey.spec.ts`

One test, long and linear, is intentional: it is the release's definition of "the app
works".

| ID | Step / assertion |
| --- | --- |
| E-JRN-01 | Cold load: `<html lang="de">`, German title, progress reads 0 of 8, pack trigger enabled |
| E-JRN-02 | Activate the pack trigger with a pointer click → opening state announced, trigger disabled, re-entry locked |
| E-JRN-03 | Four cards appear in the drop row (2×2 on a phone viewport); each has an accessible name containing number, name and rarity |
| E-JRN-04 | Reveal order matches the pure-function order from the same seed (DOM order = authoritative); slot 4 holds the holo/rare climax |
| E-JRN-05 | Exactly one summary announcement after reveal completion, listing four names |
| E-JRN-06 | Open one card from the pack row → detail shows that photo, at the pack tier, with presented rarity |
| E-JRN-07 | `→` steps to the next entry; the dialog stays open; URL `?photo=` updates |
| E-JRN-08 | Close via `Escape` → focus returns to the exact pack slot that opened the dialog |
| E-JRN-09 | Close the pack surface after a full reveal → progress reflects all four newly collected cards; after a mid-reveal skip → progress reflects **only** the cards revealed so far (max 4), and the remainder stay uncollected and next-first in the walk |
| E-JRN-10 | Catalogue shows all 8 tiles; the four are marked collected in text (not color alone) |
| E-JRN-11 | Language switch → title, headings, rarity labels, aria-labels, progress line switch to EN; `<html lang="en">` |
| E-JRN-12 | Reload → language, sound preference and seen-set persist; progress unchanged |
| E-JRN-13 | Reload with `?photo=fx-03&lang=de` → the right card opens in German, intrinsic rarity (not promoted) |
| E-JRN-14 | No console errors and no unhandled rejections across the run |

### 6.2 Keyboard-only — `tests/e2e/keyboard.spec.ts`

No pointer events are issued in this file. Mouse helpers are banned by lint within it.

| ID | Assertion |
| --- | --- |
| E-KBD-01 | Skip link is first in tab order and moves focus to the stage |
| E-KBD-02 | `P` opens a pack; `P` with a modifier or while typing in a field does nothing |
| E-KBD-03 | Tab order: stage trigger → pack row → catalogue tiles → toggles → reset; DOM order = visual order |
| E-KBD-04 | Every interactive element shows a visible focus ring: computed outline width ≥ 2 px, offset ≥ 2 px, ratio ≥ 3:1 against adjacent colors |
| E-KBD-05 | Focus is never lost to `<body>` during the full flow |
| E-KBD-06 | In the detail dialog, `←`/`→` browse, `F` flips, `↑`/`↓` tilt, `Esc` closes — all without card focus |
| E-KBD-07 | `Tab`/`Shift+Tab` cycle inside each open dialog; background is unreachable |
| E-KBD-08 | `R` does nothing anywhere (no reset shortcut) |
| E-KBD-09 | Chevrons are reachable by Tab and activate with `Enter`/`Space` |
| E-KBD-10 | The whole journey from 6.1 can be completed without a pointer (subset, asserted end-to-end) |

### 6.3 Reduced motion — `tests/e2e/reduced-motion.spec.ts`

`test.use({ reducedMotion: 'reduce' })` at file level; a control test asserts full
motion in the default project.

| ID | Assertion |
| --- | --- |
| E-RM-01 | All four cards are present and interactive within 100 ms of the pack action |
| E-RM-02 | No sachet/tear element, no confetti node, no stagger delays (assert `getAnimations()` on the drop row is empty or opacity-only ≤ 100 ms) |
| E-RM-03 | Foil layers are static: no rAF-driven custom-property changes over 500 ms |
| E-RM-04 | DOM order still puts the highest-rarity card last |
| E-RM-05 | All announcements still fire (opening, summary, restart) |
| E-RM-06 | Detail flip is an instant swap or ≤ 100 ms cross-fade; both faces never blend |
| E-RM-07 | Progress/set fills jump instantly; no width transition |
| E-RM-08 | Content parity: the same cards, names and rarities as full motion |
| E-RM-09 | Toggling the OS preference at runtime (emulateMedia change) is picked up live |
| E-RM-10 | Sound still plays (motion ≠ sound) — asserted via the audio-store state, not audio output |

### 6.4 Dialog focus return matrix — `tests/e2e/focus-return.spec.ts`

Every open path × every close mechanism. This matrix is the highest-value regression
net for the refactor, because v1 passed focus checks only by accident.

| ID | Open path | Close mechanism | Expected focus target |
| --- | --- | --- | --- |
| E-FOC-01 | Stage pack trigger | `Esc` | Stage pack trigger |
| E-FOC-02 | Stage pack trigger | Close (✕) | Stage pack trigger |
| E-FOC-03 | Stage pack trigger | Backdrop, after reveal complete | Stage pack trigger |
| E-FOC-04 | Pack trigger, mid-reveal | Backdrop | **Ignored** — dialog stays open (mis-tap protection) |
| E-FOC-05 | Pack trigger, mid-reveal | `Esc` | Dialog closes (deliberate skip); stage trigger |
| E-FOC-06 | Pack row card | `Esc` | That exact card button in the row |
| E-FOC-07 | Binder tile | `Esc` | That exact tile |
| E-FOC-08 | Deep link `?photo=` | `Esc` | Stage pack trigger (no opener existed) |
| E-FOC-09 | Detail "another pack" | chain | Focus lands inside the reopened pack surface, never `<body>` |
| E-FOC-10 | Reset dialog | `Esc` / Cancel / backdrop | Reset trigger |
| E-FOC-11 | Reset dialog | Confirm | Reset trigger (still in the document) |
| E-FOC-12 | Diplom | `Esc` | Its opener (pack trigger or progress area) — per implementation contract |
| E-FOC-13 | Any dialog | Language switch while open | Focus re-anchored to the replacement node, never dropped |
| E-FOC-14 | Detail | Step to next card | Focus stays on the dialog element, never chases content |
| E-FOC-15 | Any dialog | Close | Focus restoration happens after the native `close` reset (assert in the same microtask window; no 1-frame flash to body) |

### 6.5 Manifest error states — `tests/e2e/errors.manifest.spec.ts`

| ID | Mock | Assertion |
| --- | --- | --- |
| E-ERR-01 | `photos.php` 500, `photos.json` OK | App is ready, `source: static`, degraded flag set, **no error UI** |
| E-ERR-02 | `photos.php` 3 s timeout (clock), `json` OK | Same as E-ERR-01; assert fallback started after ~3 s, not earlier |
| E-ERR-03 | `photos.php` non-JSON body, `json` OK | Falls through to static |
| E-ERR-04 | Both 500 | `network-error` state, bilingual copy, retry button present and focusable |
| E-ERR-05 | Both timeout (3 s + 4 s) | `network-error` after ≤ ~7.5 s; no infinite loading |
| E-ERR-06 | Retry after E-ERR-04 with routes now OK | App recovers to ready without reload |
| E-ERR-07 | Valid manifest, `photos: []` | `empty` state, owner-directed instruction, pack trigger disabled with its empty label |
| E-ERR-08 | **Empty vs error are distinct**: E-ERR-04 and E-ERR-07 produce different headings, different copy and different actions | The v1 collapse is asserted impossible |
| E-ERR-09 | 3 invalid entries among 8 | Ready with inline "N cards were skipped (malformed)" in both languages |
| E-ERR-10 | Manifest `rarity: "legendary"` | Entry normalized to hash-derived rarity or dropped per normalize policy; never rendered raw |
| E-ERR-11 | Error copy exists in DE and EN; switching language while in error state re-renders copy | F15 |
| E-ERR-12 | `photos.json` cached 200 with stale `generated` but valid photos | Ready; no Zuwachs line unless `lastManifestStamp` differs and unseen cards exist. When shown: `{n} neue Schmuckstücke sind da!` / `{n} new treasures have arrived!` (cap 44), terminal `!` neutralised in the live region |
| E-ERR-13 | Manifest fetch abort (user navigates away) | No unhandled rejection, no state stuck in `loading` |

### 6.6 Image error states — `tests/e2e/errors.images.spec.ts`

| ID | Mock | Assertion |
| --- | --- | --- |
| E-IMG-01 | Thumb 404, `src` OK | Element falls back to `src`; no broken-image icon; layout unchanged |
| E-IMG-02 | Thumb and `src` 404 | Card frame stays fully readable (name, mood, rarity, caption); no empty hole; no error modal |
| E-IMG-03 | HEIC source, converter chunk fails | Frame readable, no visitor-facing error text, no crash; save link still offers the 1600 px download derivative (never the HEIC original) |
| E-IMG-04 | HEIC source, converter OK | Image renders; `heic2any` chunk requested **only** when a HEIC photo is actually opened |
| E-IMG-05 | Mixed: 3 of 8 images fail | Only failing items degrade; the rest render |
| E-IMG-06 | No image response ever triggers an error dialog or a toast | Error State pattern: no modal errors |
| E-IMG-07 | Image failure does not block collection, progress or navigation | Core loop survives |
| E-IMG-08 | Broken image alt text is the photo's localized alt, never the filename | F2/F10 |

### 6.7 Overflow matrix — `tests/e2e/overflow.spec.ts`

Every combination runs the stage, the pack surface, the detail dialog and the reset
dialog, with `manifest.max-strings.json` loaded (longest permitted strings).

| ID | Viewport set | Assertion |
| --- | --- | --- |
| E-OVF-01 | Portrait: 320×568, 360×640, 390×844, 414×896 | `document.scrollingElement.scrollWidth <= innerWidth` (+1 px tolerance) |
| E-OVF-02 | Landscape: 568×320, 844×390 | Same; dialog content scrolls internally, not horizontally |
| E-OVF-03 | Short laptop: 1280×720, 1366×768 | Dialog fits without clipping the close button or action row |
| E-OVF-04 | Aspect ratios: 1024×768 (4:3), 1920×1080 (16:9), 2560×1080 (21:9) | No stretched card, no dead zone, chevrons not overlapping actions |
| E-OVF-05 | 200 % browser zoom at 1280 wide (emulated via deviceScaleFactor + reduced CSS viewport) | No horizontal overflow; all text reachable |
| E-OVF-06 | Card zones at max strings | Each of the four zones: `scrollHeight <= clientHeight`, `scrollWidth <= clientWidth`; no zone sizes to content |
| E-OVF-07 | Every element's bounding box right edge ≤ viewport width; no element with negative x | Catches off-canvas focus rings and seal transforms |
| E-OVF-08 | Dialog open at 320 wide | Close button ≥ 44×44 and fully inside the viewport |
| E-OVF-09 | Long single-word name (40 chars, no spaces) | Wraps or truncates within the name plate; never pushes the grid |
| E-OVF-10 | Screenshot at 390 and 1280 for each surface | Visual evidence in `qa-shots/overflow/` |
| E-OVF-11 | Focus ring on the rightmost tile at 320 | Ring is not clipped by `overflow: hidden` |
| E-OVF-12 | No layout shift: `PerformanceObserver('layout-shift')` cumulative score = 0 on load | CLS 0 budget |

### 6.8 Browse inputs: swipe + chevrons — `tests/e2e/browse.spec.ts`

The brief and interaction-patterns v2 require all three inputs over one code path.
Note **C2**: `docs/architecture.md` still says "no swipe gestures". The plan tests the
UX spec; the architecture text is the stale document.

| ID | Assertion |
| --- | --- |
| E-BRW-01 | Chevrons render in the detail dialog, ≥ 44×44 CSS px, accessible names "Vorherige Karte"/"Nächste Karte" (and EN equivalents) |
| E-BRW-02 | Chevrons are hidden or disabled for a single-card collection |
| E-BRW-03 | Chevron click, `←`/`→`, and swipe all resolve to the same next id (parity assertion in one test) |
| E-BRW-04 | Wrapping at both ends: last → first, first → last |
| E-BRW-05 | Swipe: horizontal delta ≥ 40 px with dominant horizontal axis advances; vertical-dominant gesture scrolls the page instead |
| E-BRW-06 | Swipe below threshold (< 40 px) does nothing; a drag < 8 px is a tap (flip), not a swipe |
| E-BRW-07 | Swipe never hijacks page scroll: vertical scroll position changes during a vertical gesture |
| E-BRW-08 | Every navigation updates `?photo=` via `replaceState`; browser Back does not close the dialog |
| E-BRW-09 | Every navigation announces the new exhibit once |
| E-BRW-10 | Focus stays on the dialog element during navigation (never moves to the new card) |
| E-BRW-11 | Reduced motion: content swaps with no cross-fade; all three inputs still work |
| E-BRW-12 | Touch emulation uses real pointer events (`touchscreen`), not synthetic `TouchEvent` |
| E-BRW-13 | Navigation marks the arrived-at card collected (per spec) and progress updates |
| E-BRW-14 | Copy-hint and actual inputs agree: the hint names exactly the implemented inputs (no "swipe" copy if swipe is removed, and vice versa) |

### 6.9 Reset confirmation — `tests/e2e/reset.spec.ts`

| ID | Assertion |
| --- | --- |
| E-RST-01 | The reset control never executes directly: activating it opens a dialog |
| E-RST-02 | Default focus is the **Cancel** button |
| E-RST-03 | Dialog body lists what is lost, in the current language, including sound/language reset |
| E-RST-04 | `Esc`, backdrop click, and Cancel all close with **zero** state change (deep-compare storage before/after) |
| E-RST-05 | Confirm clears every `lucky-elsa.*` key, resets progress to 0, all tiles to unseen, language to `de`, sound to on |
| E-RST-06 | Post-reset announcement is written to the live region once |
| E-RST-07 | Reload after reset keeps the reset state |
| E-RST-08 | Reset with storage unavailable: control is disabled with an explanation, not a silent no-op |
| E-RST-09 | No keyboard shortcut triggers reset (including `R`, `Shift+R`, `Ctrl+R` handled by the browser) |
| E-RST-10 | Confirmation is not a `confirm()` browser dialog; it is the native `<dialog>` with `aria-labelledby` |

### 6.10 Accessibility audit — `tests/e2e/a11y.axe.spec.ts`

`@axe-core/playwright` on the built app, tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa`.

| ID | Surface | Rule |
| --- | --- | --- |
| E-AXE-01 | Stage, DE and EN | Zero `critical`/`serious`; `moderate` may only appear in a dated baseline |
| E-AXE-02 | Pack surface mid-reveal and settled | Same |
| E-AXE-03 | Detail dialog | Same |
| E-AXE-04 | Reset dialog | Same |
| E-AXE-05 | Empty state and network-error state | Same |
| E-AXE-06 | Rendered contrast matches the token gate's math (axe `color-contrast` enabled) | Cross-check |
| E-AXE-07 | Target size: every control ≥ 24×24 (WCAG 2.5.8) and ≥ 44×44 (project commitment) where the pattern demands it | Manual geometry assertion |
| E-AXE-08 | Focus not obscured (2.4.11) and focus appearance (2.4.13) on the densest viewport | Manual assertion |
| E-AXE-09 | No duplicate landmark/heading-order violations introduced by dialogs | Same |
| E-AXE-10 | Manual: text over photos is checked by pixel sampling, not axe | axe cannot judge images |

### 6.11 Privacy and request audit — `tests/e2e/privacy.spec.ts`

| ID | Assertion |
| --- | --- |
| E-PRV-01 | Every request is same-origin; zero third-party hosts (fonts, analytics, CDNs) |
| E-PRV-02 | No cookies set, no `document.cookie` writes |
| E-PRV-03 | No `localStorage` keys outside `lucky-elsa.*` |
| E-PRV-04 | No `<img>`/CSS `url()` references a bare `/photos/<original>` path (see §7.3) |
| E-PRV-05 | `heic2any` chunk is requested only when a HEIC photo is opened |
| E-PRV-06 | No requests to `photos/captions.json` from the client |
| E-PRV-07 | `robots`/`noindex` meta present; no network request depends on it (regression guard) |

### 6.12 PWA suite — `tests/e2e/pwa/*.spec.ts`

Runs in the `pwa` Playwright project only (§3.2): its own origin on `:4180`, the
two-build fixture server, `serviceWorkers: 'allow'`, `workers: 1`, `retries: 0`. Every
test starts in a fresh browser context (empty Cache Storage, empty IDB, no registration)
and seeds whatever state it needs through the shared helper
`tests/e2e/pwa/support/sw.ts` — never by depending on a previous test's leftovers.

| Helper | Purpose |
| --- | --- |
| `waitForController(page)` | `navigator.serviceWorker.ready` + `controller` non-null; the one legal wait before any offline assertion |
| `deployBuildB(page)` / `deployBuildC(page)` | `POST /__fixture/deploy-b` — the served build flips, same origin and scope |
| `readCaches(page)` | `{ cacheName → [keys] }` from the Cache API, plus the IDB `elsa-cache-index` rows |
| `cacheStats(page)` | per-cache entry count and byte total (from the index, cross-checked against `Content-Length` of the stored bodies) |
| `seedCatalogue(page)` / `seedDerivatives(page, keys)` | explicit warm state for the tests that need it (E-PWA-02/03) |
| `goOffline(context)` / `goOnline(context)` | `context.setOffline()` + `navigator.onLine` shim, used **after** a fetch outcome is already established |
| `storedHash(page, key)` | base64 SHA-256 of a cached body, compared against the ledger in `tests/fixtures/image-sources.json` |

| ID | Spec | Setup | Assertion |
| --- | --- | --- | --- |
| **E-PWA-01** | `offline.spec.ts` — offline cold | Shell precached (`index.html` + assets in `elsa-precache-<hash>`), catalogue **never** loaded, context offline, reload | The stage renders from the precached shell; the `state.offline.nocache` copy appears in the current language ("no collection yet", one online visit needed); **no spinner**, no error dialog, no infinite retry — one action, disabled for 10 s after a failed attempt; zero unhandled console errors |
| **E-PWA-02** | `offline.spec.ts` — offline warm | Online visit → catalogue snapshot written → open a pack (progress recorded) → derivatives fetched → offline → reload | Full binder from `elsa-cat-v1`; offline badge in the meta line carrying the snapshot date (from the server's `generated`/`Date` stamp, not a client clock); pack opens offline and reveals; cached images render (`naturalWidth > 0`); progress intact after reload; DE↔EN switch works; reset dialog opens; no network request succeeds or is retried in a storm. With the clock advanced 25 h (`page.clock`), the badge states the age plainly (`state.offline.age`) and still shows no error chrome — the `catalogue-stale` row of the taxonomy, asserted rather than assumed |
| **E-PWA-03** | `offline.spec.ts` — offline image miss | Warm catalogue, then navigate to a card whose derivative was **never** fetched, offline | Card frame, name plate, printed text and foil all render; the art window shows the neutral plate — a box with real dimensions and a background, **never** an empty/collapsed box and never a broken-image glyph; no error dialog, no `state.image.failed` chrome (the `image-miss` state is deliberately silent) |
| **E-PWA-04** | `update.spec.ts` — two-build update | Build A served and installed; `deployBuildB`; a pack opened **mid-update** and left mid-reveal | `update.ready` affordance appears as one quiet footer row, only after B is in `waiting`; **no reload occurs** — `data-version` still A, the navigation count stays at 1, the open pack's DOM node identity is unchanged and the reveal completes untouched; `skipWaiting` is never posted without a gesture (spy on the message channel); dismiss → affordance gone and does not return for the same build hash across reloads, and **does** return once for build C; confirm → exactly **one** reload → `data-version` is B's hash; the reload is not repeated by a second `controllerchange` (sessionStorage guard keyed on the build hash) |
| **E-PWA-05** | `cache.spec.ts` — bounds and LRU order | Overfill: 450 distinct tile derivatives, then 250 `pack`/`detail` derivatives, in a deterministic `lastAccess` order | `elsa-img-tile-v1` ≤ 400 entries **and** ≤ 20 MB; `elsa-img-large-v1` ≤ 200 entries **and** ≤ 32 MB; device total ≤ 54 MB; the surviving key set equals the projection from the pure `planEvictions` (`U-PWA-06`) with the same inputs — oldest `lastAccess` evicted first; `elsa-cat-v1` still holds its 2 entries throughout; filling the tile pool never removed a large-pool entry and vice versa |
| **E-PWA-06** | `cache.spec.ts` — no original in cache | After the full journey (E-PWA-02 sequence) **plus** the overfill from E-PWA-05 | Key scan over every `elsa-*` cache and the IDB index: no key matches `/photos/<original>` or a bare filename under `photos/`; no key is a `?image=` URL without a ladder `size` value (`tile`, `pack` or `detail`); no key contains `download`, `view` or `capabilities`; every sampled stored body's SHA-256 differs from every recorded source hash in `tests/fixtures/image-sources.json` (sample = all entries under 400, else a seeded sample of 100); no stored body exceeds its rendition ceiling + 8 KB |
| **E-PWA-07** | `install.spec.ts` — install rules | Visit 1 in a fresh context; then visit 2; then a dismissed state; then a standalone emulation (`display-mode: standalone`); then an iOS Safari context | Visit 1: nothing — no affordance, no dialog, no layout shift (reserved line present, empty). Visit 2: exactly **one** text row with a dismiss control, in the footer/meta area, no banner/modal/popover, CLS stays 0. Dismissal is permanent: no re-appearance after reload, after a language switch, after a newer catalogue, or in a new session. `prompt()` fires **only** from the row's click (instrumented `BeforeInstallPromptEvent.prompt`), `appinstalled` removes the row; standalone shows nothing; iOS: the instruction sheet appears at most once ever and is skippable. A repo-level grep asserts no auto-opening dialog exists |
| **E-PWA-08** | `privacy.spec.ts` — cache privacy | Full journey online, then cache read; plus routes that inject `Set-Cookie`, `Vary: *`, `Vary: Accept-Language`, `credentials: 'include'`, and a cross-origin image | Zero third-party requests (inherits `E-PRV-01`, now with the SW registered) and zero cross-origin cache entries; no cookie is set by any SW-mediated request; each injected response is **served to the page but absent from every cache**; a `Vary: Accept-Encoding` response *is* stored (the gate is not simply "reject Vary"); the `format=jpeg` URL is never answered from a WebP body (byte sniff of the magic number, not the `Content-Type`) |
| **E-PWA-09** | `state.spec.ts` — reset-cache confirmation | Warm catalogue + derivatives, offline-capable | The cache action is a **separate** action inside the reset dialog with its own confirmation; Cancel/Esc leave every cache intact; confirm deletes `elsa-cat-*`, `elsa-img-*`, the IDB `elsa-cache-index` and the snapshot, while `elsa-precache-*` and the registration survive — an immediate offline reload still opens the shell; the ratified `reset.body` string is byte-identical to the copy deck (D-05) |
| **E-PWA-10** | `manifest.spec.ts` — manifest and icons | Read `dist/manifest.webmanifest`; decode each icon with `sharp` | `name` "Elsa the Explorer", `short_name`, `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `lang: "de"`, `dir: "ltr"`; `theme_color` **and** `background_color` equal `tokens.bg` (cross-checks `U-PWA-10`); icons 192 `any`, 512 `any`, 512 `maskable`, `apple-touch-icon` 180 all resolve, decode, and match their declared pixel dimensions; no `prefer_related_applications`; `manifest.webmanifest` and `sw.js` are both served at the scope root with a JS/JSON content type |
| **E-PWA-11** | `manifest.spec.ts` — browser installability | Chromium CDP session against the built app | `Page.getInstallabilityErrors` returns `[]`; WebKit records "not applicable — no installability domain" with the reason string in the run report. A skipped or `fixme`'d WebKit row is a violation of §11.2, not a pass |
| **E-PWA-12** | `manifest.spec.ts` — manifest freshness | Three routes: (a) fast fresh `?list=1`; (b) `/__fixture/delay?ms=3000` on `?list=1`; (c) `?list=1` aborted. Then a `ver` bump on one photo, then an offline→online transition | (a) the live body wins over a stale snapshot **and** the snapshot is refreshed; (b) the snapshot paints by 2.5 s while the in-flight request is left running, and its late arrival updates the snapshot for the next load (asserted on a second reload); (c) snapshot serves with the badge up; `online` triggers exactly one revalidation and the binder updates **in place** — no reload, no prompt (data, not code); a replaced photo (new `ver`, therefore a new URL) appears after one reload while offline data still serves; the `?list=1` snapshot key carries no `ts` or other param |

Deliberately **not** in this suite: the true-first-visit-with-no-connection case. No web
page can render it (the browser shows its own offline page, ADR-0009 §7), so a test
asserting otherwise would be asserting a promise the platform does not make. The manual
iOS rows below cover the platform variance.

Manual, release-checklist only (`qa.level: full` does not make these automatable):

- [ ] iOS: install from Safari via the instruction sheet, then offline reload from the
      home screen; observe the 7-day eviction degradation (`shell-cold`) once in a fresh
      container and confirm one online visit restores everything.
- [ ] Android Chrome: install from the install row, offline launch, then a two-build
      update driven by a real deploy rather than the fixture server.

---

## 7. Image delivery assertions

This is a **contract gate**, not a smoke test. It enforces the three-tier delivery
model (tile 360 / pack 720 / detail 1200), the 1600 px `download` rung as the *only*
savable asset, and the "never ship the original into the UI" rule. **No assertion in this
section names the original as a download target** — the download target is a derivative
(§7.3).

### 7.1 Harness

`tests/e2e/image-delivery.spec.ts` runs against the fixture public root so hashes are
known.

```
for each response where resourceType === 'image':
  body   = await response.body()
  bytes  = body.length
  sha256 = hash(body)
  meta   = await sharp(body).metadata()   // dev dependency, test process only
  record { url, bytes, sha256, width, height, format }
```

Then, in-page, map every `<img>`/CSS background to the response that served it:

```
await page.evaluate(() => [...document.images].map(img => ({
  src: img.currentSrc, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
  tier: img.dataset.tier ?? inferTierFromContext(img),   // tile | pack | detail
})))
```

If `data-tier` is absent, the tier is inferred from the nearest semantic ancestor
(catalogue list item, pack drop row, detail dialog). `data-tier` is a test seam, not a
styling hook.

### 7.2 Assertions

| ID | Assertion |
| --- | --- |
| E-DLV-01 | Every non-download UI image response has `bytes <= 210,000` (Largest display-rung JPEG ceiling: detail) |
| E-DLV-02 | Every tile response: long edge ≤ 360 px and `bytes <= 36,000` (WebP) / `<= 55,000` (JPEG) |
| E-DLV-03 | Every pack response: long edge ≤ 720 px and `bytes <= 80,000` (WebP) / `<= 110,000` (JPEG) |
| E-DLV-04 | Every detail response: long edge ≤ 1200 px and `bytes <= 150,000` (WebP) / `<= 210,000` (JPEG) |
| E-DLV-05 | **No response's SHA-256 equals a recorded source SHA-256** (every generated fixture, from `image-sources.json`) |
| E-DLV-06 | **No response's byte length equals a recorded source byte length** (cheap secondary canary) |
| E-DLV-07 | Aspect ratio preserved within 0.5 % of the source; no stretching |
| E-DLV-08 | Response `Content-Type` is `image/webp` for `<source type="image/webp">` requests and `image/jpeg` for the `<img>` fallback; every rung is emitted in both; never `image/heic` in the UI |
| E-DLV-09 | Decoded pixel dimensions match the declared `width`/`height` attributes (no CLS surprise) |
| E-DLV-10 | Each element requests exactly one image URL (no duplicate fetches, no 404 retry storm) |
| E-DLV-11 | Off-screen binder tiles are not requested on first paint (`loading="lazy"` respected); request count ≤ visible tiles + 1 |
| E-DLV-12 | The 24.47 MP stress fixture's three display tiers are all materially smaller than its source (each ≤ 10 % of the recorded source byte length) |
| E-DLV-13 | A 500-entry manifest stays under a request cap on first paint (e.g. ≤ 20 image requests) |
| E-DLV-14 | Images carry cache-validating headers (`ETag` or `Last-Modified`) and are not re-fetched on same-session navigation |
| E-DLV-15 | Binder image elements carry `loading="lazy"`, `decoding="async"`, `width`, `height` |
| E-DLV-16 | `naturalWidth > 0` for every visible image (a zero means a silent decode failure that layout hid) |
| E-DLV-17 | HEIC conversions are JPEG-encoded and within the same tier ceilings |

### 7.3 No-original rule

| ID | Assertion |
| --- | --- |
| E-ORG-01 | Collect **all** requests whose path matches a direct photo file: `^/photos/(?!thumbs/\|converted/\|\.cache/\|derived/)` — assert the set is empty for the whole journey |
| E-ORG-02 | No `<img src>`, `<source srcset>`, CSS `url()`, or `fetch()` targets a bare `/photos/<original>` path |
| E-ORG-03 | The save/download affordance points at the **1600 px download derivative** — static: `photos/derived/download/<id>.jpg`; runtime: `photos.php?download=<name>` — and **never** at `/photos/<original>`; no request is issued until the user activates it |
| E-ORG-04 | After an explicit download click: exactly one request to the download URL, `200`, `Content-Disposition: attachment`, long edge **1600 px** (or the source's long edge when smaller — never upscaled), **response SHA-256 ≠ the source fixture's recorded SHA-256**, **response bytes ≠ the source's recorded byte length**, and **bytes ≤ 500,000 (JPEG) / ≤ 350,000 (WebP)**. Exempt from E-DLV-02..04 only |
| E-ORG-05 | `?view=` is never used for an `<img>` in any render context (detail included), and a direct `?view=<name>` request returns **`302`** with a `?download=` `Location` — never `200`, never source bytes |
| E-ORG-06 | A heuristic backstop: any non-download image response > 210,000 B fails the run with the URL printed |
| E-ORG-07 | **The download is a derivative, not a passthrough**: fetch it twice (warm cache) and assert identical bytes, `Content-Length` == body length, and decoded pixels at the download rung (1600 px long edge for the 5712×4284 stress fixture) — never 5712×4284 themselves |
| E-ORG-08 | **`ver` changes on replacement**: replace a photo with new bytes (same name, new mtime/size) on the runtime path, re-fetch `?list=1`, and assert the photo's `ver` changed **and** every URL in its `images` block carries the new `&v=`; the old URL is a different cache entry. Static path: the regenerated `photos.json` carries the new `ver` |
| E-ORG-09 | **60 MP source → `413`**: `photos.php?image=stress-60mp.jpg&size=tile` returns `413` (`source_too_many_pixels`), `no-store`, empty/JSON body, no source bytes, and no decode attempt (timing/memory flat) |
| E-ORG-10 | **Bad parameters → `400`**: `size=800`, `size=orig`, `size=download`, `format=gif`, `thumb=x&size=pack` each return `400`, `no-store`, and never image bytes; `415` is reserved for an unsupported/corrupt **source** |

> **Contract conflict C1 — resolved by ADR-0008 (2026-11-22).** The earlier note proposed a
> width/clamp parameter (a `view&w=1200` variant) to reconcile a ≤1200 px detail tier with the
> old "dialog uses the original" behaviour. That is **withdrawn**: the ratified contract has a
> **closed ladder with no `w=`/`h=`/`q=` surface**, the dialog uses the `detail` rung
> (`?image=…&size=detail`), "Foto speichern" uses `?download=` (1600), and `?view=` `302`s to
> `?download=` — no path returns the source. `docs/architecture.md` and ADR-0008 carry this
> contract; E-DLV-02..04, E-ORG-03 and E-ORG-05 assert it. They are **not** to be loosened,
> skipped or deleted.

---

## 8. CI gates

### 8.1 Order (binding)

Fast, deterministic checks run first; evidence-producing checks run last. A failure at
any step stops the pipeline.

| # | Gate | Command (contract) | Fails when |
| --- | --- | --- | --- |
| 1a | Canon / vocabulary, then its self-tests | `node scripts/canon-check.mjs` → `vitest run --project canon` | Any live copy uses the retired collection name or the retired progress verb (canon: `docs/decisions.md` D-04b; vocabulary SSOT: `design/copy/copy-deck.md` §0); any retired binder noun; any water vocabulary from the canon list (`AGENTS.md` — water); any `!` in error, announcement, reset or aria copy; a stale, ambiguous or unreasoned entry in `scripts/canon-allowlist.json`; a baseline entry beyond the recorded `maxBaseline` |
| 1b | Markdown table integrity | `node scripts/table-integrity.mjs` | Any table row in `docs/` or `design/` whose field count differs from its header row (GFM renders the surplus cell as a phantom column, or absorbs it into the last one); a `\|` that is not escaped inside a cell counts as a boundary. No allowlist: fix the row |
| 1 | Typecheck | `tsc --noEmit` then `svelte-check --tsgo` | Any type error in `src/` or tests; TS 7 fallback per ADR-0001 is applied only by the documented alias |
| 2 | Stylelint + selector diff + unused CSS | `stylelint "src/**/*.{css,svelte}"` → `node scripts/selector-diff.mjs` → Svelte compiler warnings escalated | Raw value where `var()` is required; duplicate selector in a file; duplicate selector **across** files; unused scoped CSS |
| 3 | ESLint | `eslint .` | Lint error, including `no-restricted-syntax` for `page.waitForTimeout` in `tests/e2e/` |
| 4 | knip | `knip` | Dead token, recipe, export, or unused dependency |
| 4b | jscpd | `npx jscpd --config jscpd.json src tests scripts` | Duplicate blocks ≥50 tokens; threshold 2% lines; report in `reports/jscpd/` |
| 5 | Vitest | `vitest run --coverage` | Any unit/property/contrast/i18n/**PWA-policy** failure or coverage below threshold |
| 6 | Build | `vite build` | Build error; also emits `reports/size.json` |
| 7 | Playwright | `playwright test --project=chromium --project=webkit --project=mobile-chrome --project=mobile-safari` | Any journey, keyboard, motion, focus, error, overflow, browse or reset failure |
| 8 | axe | `playwright test tests/e2e/a11y.axe.spec.ts` (dedicated stage, reuses the build) | Any critical/serious violation; any new moderate outside the dated baseline |
| 9 | Bundle + byte budget | `node scripts/budget-check.mjs` reading `reports/size.json` + the image ledger | JS gzip > 100 KB hard cap (60 KB target reported); CSS gzip > 30 KB including `styled-system/`; any render response over its §4.3 per-format ceiling; any download response over 500,000 B JPEG / 350,000 B WebP; any original in the UI ledger |
| **10** | **PWA** | `node scripts/pwa-gate.mjs` (precache bytes, `sw.js` gzip bytes) → `node scripts/manifest-check.mjs` (manifest fields + icon decode via sharp) → `playwright test --project=pwa` | Precache total > **400 KB** compressed; `dist/sw.js` > **25 KB** gzip; a missing/misnamed manifest field or an icon that does not resolve and decode at its declared size; `Page.getInstallabilityErrors` non-empty; any `E-PWA-01..12` failure; a service-worker or precache request observed **before first paint** |

Notes:

- The brief's order is followed exactly. The cost is that a CSS byte-budget overrun is
  discovered last; mitigation: gate 6 prints a preliminary size table and gates 2–5
  run in parallel where the runner allows, so the wall-clock penalty is minutes, not
  tens of minutes.
- Gate 1a is a text scan, so it runs first: it costs under a second and a vocabulary
  regression is cheaper to fix before the typecheck/build/test stages. Its allowlist is
  a register, not a permission: every entry is line-anchored, carries a reason, and fails
  the gate when the text no longer matches. `npm run canon:strict` fails on the remaining
  design-doc baseline (issue #31); CI runs the non-strict gate until that baseline is empty.
- axe is a separate stage rather than folded into gate 7 so an a11y regression is
  attributable in the pipeline UI without reading traces.
- `LCP` tracing is advisory and never fails the pipeline (PRD §5 target, not a
  contract). CLS is a hard assertion inside Playwright, not a budget job.
- **Gate 10 is deterministic on purpose, and Lighthouse is not part of it.** Lighthouse
  12.0.0 (April 2024) **removed the PWA category**; Lighthouse 13.x ships Performance,
  Accessibility, Best Practices and SEO only. "PWA score" is therefore a metric that no
  longer exists, and anyone quoting one is quoting a retired audit. The gate asserts the
  things that can be asserted: precache and worker byte budgets, manifest/icon validity,
  CDP `Page.getInstallabilityErrors`, and the twelve `E-PWA-*` scenarios. **Lighthouse
  runs advisory only** — its artifact is attached to the run and a regression is a
  comment, never a red pipeline. Diagnostics such as `no-unload-listeners`,
  `service-worker` and `works-offline` moved out of the scored set and are not
  reintroduced here by name.
- Gate 7's explicit `--project` list deliberately omits `pwa`; gate 10 owns that project.
  Running it twice would double the slowest stage for no extra signal.

### 8.2 Cross-file selector-diff check

Stylelint is per-file and cannot see that `CardTile.svelte` and `BinderShelf.svelte`
both style `.card__plate`. `scripts/selector-diff.mjs` closes that gap:

1. Parse every `src/**/*.svelte` `<style>` block and every `src/**/*.css` with
   PostCSS (no regex parsing).
2. Extract selectors with their at-rule context (`@media`, `@container`, `@supports`).
3. Normalize whitespace and combinator spacing; keep `:global(...)` and `:root`
   separate.
4. Group by `(at-rule-context, normalized-selector)`; a selector appearing in more than
   one **file** is a violation.
5. Allowlist file `scripts/selector-allowlist.json`, each entry requiring a reason and
   an owner. Empty by default; additions are reviewed like code.
6. Exit non-zero with `file:line` for every duplicate; print the allowlist count so
   growth is visible.

Scope guard: the diff only covers component-scoped CSS plus `src/styles/`. Generated
`styled-system/` is excluded (it is build output), but the budget gate still counts its
bytes.

### 8.3 Branch protection

Required checks: every gate `.github/gates.json` declares **enforced** — thirteen today
(canon, canon self-tests, table integrity, typecheck, svelte-check, stylelint, selector
diff, unused CSS, ESLint, knip, jscpd, Vitest, build). `npm run ci:gates` fails when that
list, the `npm run` scripts and the `ci.yml` steps disagree, so the count cannot drift
again. No `continue-on-error`, no `|| true`, no `--passWithNoTests`. Gate 10 runs on every
PR (the `pwa` project plus two byte checks —
minutes, not tens of minutes); the manual iOS rows in §6.12 stay release-checklist items,
because a real device install is not a CI assertion. Nightly job adds the full
four-project Playwright matrix plus gate 10's `pwa` project across two Chromium versions
and the flaky report; PR runs use Chromium + WebKit and the two mobile profiles (they are
cheap enough at this app size). `main` is protected against direct pushes.

---

## 9. Flake policy

| Rule | Detail |
| --- | --- |
| Retries | CI: 1 retry. Local: 0. A test that only passes on retry is flaky and gets an issue. |
| Target | **≥ 95 % pass-on-first-run** per project, rolling 7 days. Below 95 % blocks new feature work until restored. |
| Quarantine | `test.fixme(true, 'issue #…')` with a linked issue; maximum 14 days, then fix or delete. Quarantined tests do not count toward the 95 %. |
| Detector | Parse JUnit XML from the last 20 runs; rank by `fail→pass` transitions. Threshold: any test with ≥ 2 transitions in 20 runs is flagged. |
| Common causes to fix, not mask | Selector instability (use roles/names), animation races (wait for the settled state, not a duration), shared fixtures (fresh context), timezone/locale drift (pinned), network timing (mock deterministically). |
| Evidence | Trace on first retry, video on failure, screenshot on failure. A flake report without a trace is not actionable. |
| Bans | `waitForTimeout`, `networkidle` waits, CSS-class selectors for behavior, `force: true` clicks, retrying assertions to hide timing. |

**The `pwa` project overrides the CI retry to `0`** (§3.2). Its failures are usually
state-ordering bugs — a stale cache, a registration from the previous test, a race with
`controllerchange` — and a retry turns each of those into a random pass on the next
attempt. The ≥ 95 % target is measured per project, so a flaky PWA spec lowers its own
number instead of hiding inside the global one.

---

## 10. Coverage targets

| Area | Target | Rationale |
| --- | --- | --- |
| `pack.ts`, `rarity.ts` | 100 % branches | The rules are the product's integrity |
| `normalize.ts`, merge | 100 % branches + property suite | The data funnel; silent corruption is the worst failure |
| `persistence` | 100 % branches | Data-loss risk |
| `cardView.ts`, budgets | 100 % branches | Overflow fix |
| `src/lib/pwa/{cachePolicy,limits,schema}.ts` | 100 % branches | A cache that over-admits ships originals; one that over-evicts loses the catalogue — both silently |
| `i18n` | 100 % key parity (not line coverage) | F8/M4 |
| Domain layer overall | ≥ 95 % branches | Gate in `vitest.config.ts` |
| Golden-path journeys | 100 % of the 14 steps in §6.1 | Release definition |
| Error states | 100 % of the taxonomy rows in `architecture.md` §Error-State Taxonomy | "Every state speaks" |
| Overflow matrix | 100 % of §6.7 viewports | F17 |
| Accessibility | 0 critical, 0 serious, < 5 moderate | Standard tier |

Mutation testing (Stryker) for `pack.ts`/`rarity.ts` is a **scheduled quarterly** job,
initially non-blocking. It is the only credible check that the tests would catch a
mutated rule; adopt it as blocking once the baseline score is known.

---

## 11. Story classification and Definition of Done

### 11.1 Classification

Stories are classified from their acceptance criteria; the type determines the
evidence. Mixed stories take the higher-risk primary type and record the secondary.

| Type | Indicators in this project | Primary evidence |
| --- | --- | --- |
| **Logic** | draw rules, rarity derivation, normalization, migration, contrast math, budgets | Vitest specs at the named paths |
| **Integration** | boot → hydrate → render, persistence round-trip, manifest fallback chain, language switch across the app | Playwright journey/error/focus specs |
| **Visual/Feel** | reveal choreography, foil material, tilt spring, confetti, reduced-motion feel | Screenshots + `getAnimations()` assertions + designer sign-off |
| **UI** | stage, pack surface, detail, grid, toggles, dialogs, states | Screenshots at 390/1280 + axe + overflow + keyboard |
| **Config/Data** | token values, Panda config, manifest fixtures, budgets | Contrast gate, budget gate, fixture validation |

### 11.2 Definition of Done — every story

A story is DONE only when **all** of the following are true. This is stricter than the
default checklist because the project is a full refactor with a committed a11y tier.

- [ ] Every acceptance criterion is mapped to a test ID in this plan (or to a manual
      check with captured evidence) in the story's traceability table.
- [ ] The required test file(s) exist at the contractual path; no test is `.only`,
      `.skip`, or `fixme` without a linked issue and an expiry date.
- [ ] New logic has a property or boundary test, not only a happy-path example.
- [ ] New copy exists in DE **and** EN; `i18n` parity is green; no water vocabulary.
- [ ] New interactive element has: a role/accessible name, keyboard operation, visible
      focus, ≥ 44×44 target (where the pattern demands it), and no color-only state.
- [ ] New animation is gated on `prefers-reduced-motion` and the reduced path is
      asserted, not assumed.
- [ ] New surface is covered by the overflow matrix at 320/390/1280 and the 200 % zoom
      check.
- [ ] axe: no new critical/serious; moderate only via a dated baseline entry.
- [ ] No new third-party request; no new storage key outside `lucky-elsa.*`.
- [ ] **Offline path asserted.** Any story that touches boot, data fetch, images, the shell
      or routing lands with the `pwa` project green for `E-PWA-01` (cold), `E-PWA-02`
      (warm) and `E-PWA-03` (image miss) — or the PR body records why the story cannot
      change them, with the run link. "We didn't run the PWA suite" is not a reason.
- [ ] **No reload without confirm.** Any story touching the worker, registration or update
      affordance keeps `E-PWA-04` green: no automatic reload, `skipWaiting` only from a
      user gesture, and an open pack survives a build landing mid-reveal.
- [ ] **No cache without a bound.** Any new `cache.put`, cache name or cached resource type
      ships with its bound in `limits.ts`, a mirror in `tests/fixtures/image-budgets.json`
      (`U-PWA-07` parity), an eviction path covered by `U-PWA-06`, and an `E-PWA-05/06`
      assertion. An unbounded cache is a NOT-done condition, not a follow-up ticket.
- [ ] Bundle budgets unchanged, or the increase is documented and approved in the PR.
- [ ] All thirteen CI gates green on the merged commit (the enforced list in
      `.github/gates.json`; `npm run verify` mirrors it locally).
- [ ] Screenshots of every touched screen captured to
      `qa-shots/<story-slug>/<viewport>.png` (UI and Visual/Feel stories).
- [ ] Code reviewed; the reviewer confirms the test IDs actually assert the AC.
- [ ] Story status updated to Complete with links to the run/report.

### 11.3 Definition of Done — by type (additional rows)

| Type | Additional mandatory evidence |
| --- | --- |
| Logic | Coverage for the touched module ≥ threshold; property/fuzz seed recorded; negative test present where the rule has a "must reject" clause (contrast especially) |
| Integration | Runs on the **built** app; no arbitrary waits; focus and announcement assertions included; both languages where copy is involved; route mocks restored |
| Visual/Feel | Before/after screenshots; `getAnimations()` proof of motion gating; designer sign-off note in `qa-shots/<story>/signoff.md` |
| UI | axe run on the new surface; keyboard-only pass; overflow screenshots; no clipped focus ring |
| Config/Data | Token pair added to the contrast gate (or explicitly exempt with a clause); budget fixture updated; no production photo modified |

### 11.4 A story is NOT done if

- A test asserts an implementation detail (class name, DOM shape) instead of behaviour.
- A flaky test was retried into green.
- A failing image/contrast/budget assertion was loosened to pass.
- The empty state or an error state has no bilingual copy.
- The reduced-motion path was "verified manually" with no automated assertion.
- The test suite grew but the pass-on-first-run rate fell below 95 %.

---

## 12. Regression checklist

Run in full before a release candidate; the starred items are the 10-minute smoke set.

### Boot and data

- [ ] *App loads to ready with the PHP manifest
- [ ] PHP 500 → static fallback, no error UI
- [ ] Both sources down → network-error + working retry
- [ ] Valid empty manifest → empty state with owner instructions, distinct from error
- [ ] Malformed entries dropped and counted; no half-kept card
- [ ] `?photo=<id>` deep link opens the right card in both languages
- [ ] `?lang=en` beats stored `de`; switch persists across reload

### Pack and rarity

- [ ] *Four cards (or all, if fewer), no duplicates — 2×2 on a phone viewport
- [ ] *Unseen-first walk; lap boundary announced once
- [ ] *≥ 1 rare/holo per pack via intrinsic rarity or exactly one promotion
- [ ] Promoted card is holo in the pack and **intrinsic** in the binder (the v1 bug)
- [ ] Same photo has the same rarity after reload, in another pack, and in a deep link
- [ ] Rarity override from the manifest wins
- [ ] Reveal order: holo/rare climax in slot 4; a rare/holo in slot 3 only when a second was drawn; never slot 1
- [ ] Mid-reveal skip collects only the revealed cards (max 4); the rest stay unseen and next-first

### Collection and detail

- [ ] *Progress counts update only after reveal completion (or the revealed subset on skip)
- [ ] Binder tile accessible name includes number, name, rarity and seen state
- [ ] Detail opens from pack slot, binder tile and deep link; rarity correct per context
- [ ] Chevrons, arrows and swipe all navigate and wrap
- [ ] `F`/Enter flips; flip state is announced
- [ ] Share: native → clipboard → visible failure; cancel is silent
- [ ] Save link offers the 1600 px download derivative without fetching it on render

### Keyboard and focus

- [ ] *`P` opens a pack; `←`/`→` browse; `Esc` closes
- [ ] Focus returns per the §6.4 matrix (all 15 rows)
- [ ] No focus loss to `<body>` anywhere
- [ ] Focus ring visible on every control, including over photos
- [ ] No keyboard trap; background inert while a dialog is open

### Motion, sound, language

- [ ] *Reduced motion: all four at once, no stagger, no confetti, no foil movement
- [ ] Sound toggles, persists, and is silent when the context is blocked
- [ ] Language switch updates title, aria-labels, rarity labels, open dialogs, `<html lang>`
- [ ] Announcements fire in the current language, once per event

### Reset and persistence

- [ ] Reset always confirms; Cancel/Esc change nothing
- [ ] Confirm clears **all** `lucky-elsa.*`; progress 0; language `de`; sound on
- [ ] Reload after reset keeps the reset
- [ ] Seen-set prunes ids removed from the manifest
- [ ] v1 keys migrate to v2 with no loss; v2 write failure leaves v1 intact
- [ ] Storage unavailable: app runs, reset disabled with explanation

### Layout and content

- [ ] *No horizontal overflow at 320/360/390/414 landscape/short laptop/4:3/16:9/21:9
- [ ] Max-length strings do not overflow the four card zones
- [ ] 200 % zoom usable at 1280
- [ ] CLS 0; every image has width/height
- [ ] Touch targets ≥ 44×44 at mobile widths
- [ ] No water-themed copy or card content (canon)

### Delivery and privacy

- [ ] Every tile ≤ 360 px / 36 KB WebP / 55 KB JPEG; pack ≤ 720 px / 80 / 110 KB; detail ≤ 1200 px / 150 / 210 KB
- [ ] Download is the 1600 px derivative (`?download=`): ≤ 350 KB WebP / 500 KB JPEG, not byte-identical to the source, `attachment`
- [ ] `?view=` returns `302` → `?download=`, never source bytes
- [ ] A 60 MP fixture returns `413`; a missing name returns `404`; both `no-store`
- [ ] A replaced photo changes `ver` and therefore every rendition URL
- [ ] No UI response matches a recorded source hash (generated 24.47 MP stress fixture)
- [ ] No request for a bare `/photos/<original>` during the journey
- [ ] Off-screen binder images are lazy-loaded
- [ ] Zero third-party requests, zero cookies, no non-`lucky-elsa` storage
- [ ] axe: 0 critical, 0 serious

### PWA (offline, update, cache)

- [ ] *Offline reload after one online visit still opens the app (shell-cold and
      catalogue-warm both)
- [ ] *A pack opens and completes offline; the offline badge carries the snapshot date
- [ ] *A build landing mid-pack never reloads the page and never interrupts the reveal
- [ ] Update confirmed by the user → exactly one reload → `data-version` is the new hash;
      a dismissed build is not offered again, a newer one is
- [ ] `?list=1` slow (> 2.5 s) still yields the snapshot on this load and a refreshed
      snapshot on the next; `online` revalidates in place with no reload
- [ ] A replaced photo (new `ver`) appears after one reload; offline data still serves
- [ ] A card that never fetched its image renders frame + printed text, not an empty box
- [ ] Cache bounds hold: tile ≤ 400 / 20 MB, large ≤ 200 / 32 MB, device total ≤ 54 MB,
      oldest `lastAccess` evicted first, `elsa-cat-v1` never evicted
- [ ] No cache key names an original; no cached body matches a recorded source hash
- [ ] Reset-cache asks before deleting, keeps the app shell, and the app still opens
      offline afterwards
- [ ] Install: nothing on visit 1, one quiet row on visit 2, dismissal permanent,
      `prompt()` only from a click, no nag anywhere
- [ ] Precache ≤ 400 KB compressed; `dist/sw.js` ≤ 25 KB gzip; no SW request before first
      paint
- [ ] Manifest fields and every icon validate; `theme_color`/`background_color` equal
      `tokens.bg`; `Page.getInstallabilityErrors` empty
- [ ] Lighthouse advisory artifact recorded — and **not** read as a "PWA score" (that
      category has not existed since Lighthouse 12.0.0)

### Manual (not automatable)

- [ ] VoiceOver + Safari: pack flow, four names, restart, language switch, dialog titles
- [ ] TalkBack + Android Chrome spot check
- [ ] Real-device swipe thresholds (the spec calls the numbers design targets)
- [ ] Coblis simulation: rarity and seen state readable in all three modes
- [ ] Windows forced-colors: no invisible text
- [ ] Sound character sanity (rip, tick, chime not fatiguing across five packs)

---

## 13. Traceability

| Requirement | Unit | Integration |
| --- | --- | --- |
| F1 four cards / all if fewer (owner canon 2026-11-22; PRD F1 reads four cards) | U-PACK-01, U-PACK-11 | E-JRN-03, E-JRN-09 |
| F2/F2a/F10 bilingual card content + imaginary stats label | U-CV-06, U-I18N-02/04 | E-JRN-06, E-JRN-13, E-IMG-08 |
| F3 rarity belongs to the photo | U-RAR-01/02/04 | E-JRN-13 |
| F4 ≥ 1 rare/holo per pack | U-PROMO-01/02/05 | E-JRN-03 |
| F5 no duplicate in a pack | U-PACK-02 | E-JRN-03 |
| F6 unseen-first + full cycle + restart | U-PACK-04/05/07/08/09 | E-JRN-09 |
| F7 German default | U-I18N-11 | E-JRN-01 |
| F8 toggle switches every string | U-I18N-01/02/07 | E-JRN-11, E-AXE-01/02 |
| F9 language persists, URL overrides | U-I18N-11/12 | E-JRN-12/13 |
| F11 binder grid buttons + seen state | U-CV-06 | E-JRN-10, E-KBD-03 |
| F12 deep link | U-RAR-10 | E-JRN-13, E-FOC-08 |
| F13 progress display | U-PST-18 | E-JRN-01/09/10 |
| F14 source resolution | P-NORM-* | E-ERR-01..06 |
| F15 empty state, right language | U-I18N-08 | E-ERR-07/08/11 |
| F16 privacy defaults | — | E-PRV-01..07 |
| F17 no horizontal overflow | U-CV-01..03 | E-OVF-01..12 |
| F18 detail with save/share/another pack | — | E-JRN-06..09, E-FOC-09 |
| F19 audio + toggle | — | E-RM-10, manual |
| F20 keyboard + focus return | — | E-KBD-01..10, E-FOC-01..15 |
| F21 live-region announcements | U-I18N-07 | E-JRN-05, E-BRW-09 |
| F22 reduced motion | — | E-RM-01..10 |
| F23 per-photo overrides | P-NORM-08/17 | E-JRN-13, E-ERR-10 |
| F24 thumbnails / tiers | — | §7 all |
| F25 share + OG | U-I18N-08 | manual + E-JRN-14 |
| F26 reset | U-PST-13/14 | E-RST-01..10 |
| **D-01 / ADR-0009 — installable offline catalogue (PRD §5 "works from the train")** | U-PWA-01..10 | E-PWA-01, E-PWA-02, E-PWA-03, E-PWA-12 |
| **ADR-0009 §4/§9 — bounded, weighted cache; originals inadmissible** | U-PWA-03..07 | E-PWA-05, E-PWA-06, U-PWA-07 parity |
| **ADR-0009 §6 — prompt update, no automatic reload** | U-PWA-08/09 | E-PWA-04 |
| **ADR-0009 §8/§9 — one quiet install offer, cache privacy** | U-PWA-10 | E-PWA-07, E-PWA-08, E-PWA-09, E-PWA-10, E-PWA-11 |
| AGENTS water canon | U-I18N-15 | manual content audit |

---

## 14. Reporting

- Unit: JUnit XML (`reports/vitest.xml`) + coverage (`reports/coverage/`).
- Playwright: HTML report, JUnit XML, traces/videos on failure.
- Release-readiness artifact: one page per release candidate summarising gates 1a–10,
  the manual checklist, and the pass-on-first-run rate for the last 20 runs.
- QA evidence: `qa-shots/<story-slug>/` for screenshots and sign-off notes.
- A gate failure is reported with the gate number, the failing test ID, and the
  artifact path. "Tests fail" is not a report.

---

## 15. Conflicts, assumptions and open questions

These are findings from writing the plan. Test code must not silently choose a side.

| ID | Conflict | Impact | Resolution needed |
| --- | --- | --- | --- |
| **C1** | **Resolved (ADR-0008).** Earlier text said CardDetail used the **original** and proposed a clamped width / `download=1` rung. The ratified contract closes the ladder: no `w=`/`h=`/`q=`, detail = `size=detail` (1200), save = `?download=` (1600), `?view=` = 302 → download | No longer blocks; E-DLV-02..04, E-ORG-03/05/09 assert the ratified contract | None. Architecture and ADR-0008 carry the closed-ladder contract; do not reintroduce a width parameter. |
| **C2** | `architecture.md` says "No swipe gestures"; interaction-patterns v2 specifies swipe **and** chevrons as three redundant inputs | Blocks E-BRW-05..07 | UX spec v2 wins (later, owner ruling on chevrons). Architecture text must be corrected. |
| **C3** | Architecture renders the pack as inline `PackTheatre`; UX v2 specifies a **pack dialog** with backdrop rules and skip semantics | Focus/backdrop tests need one surface definition | Behaviour tests are role-first; E-FOC-04/05 assume dialog semantics. Confirm the surface before implementing focus tests. |
| **C4** | Progress copy: PRD F13 and architecture say "gesehen/seen"; interaction-patterns v2 declares **"gesammelt/collected"** canon | `copy-canon.json` cannot be pinned both ways | **RESOLVED 2026-11-22** — the copy deck canonises "gesammelt/collected" and retires the old verb; pin that. |
| **C9** | Pack size: PRD/ADR/architecture said five cards; owner ruling 2026-11-22 sets **four** (mobile-first, 2×2) with sequential reveal then pull-back | Pack-size tests and copy could assert the old count | **RESOLVED** — canon is four; PRD F1/F5/F22, ADR-0001 and architecture updated; test code asserts four. |
| **C5** | Storage keys: architecture lists `{lang,sound,seen}.v2`; UX v2 also names `sets.v1` and `flags.v1` | U-PST-20 cannot pin a list | **RESOLVED 2026-11-22** — ADR-0003 §2 ratifies the key set (lang/sound/seen v2; sets/flags/exhibition/cardback v1); pin U-PST-20 to it. |
| **C6** | `qa.level` resolves to `minimal`; `AGENTS.md` and the brief require production rigor | If taken literally, most automated rows would be dropped | Recorded override to `full` (§header). No action. |
| **C7** | Architecture mentions "set" as an optional grouping; UX v2 fixes six named departments + `Neuzugänge` | U-I18N-16 and set-progress tests need the canon | Treat interaction-patterns v2 as copy SSOT; add the department names to `copy-canon.json` once confirmed. |
| **C8** | Empty-state copy references `npm run photos` (a Node workflow), while AGENTS.md says owners FTP-drop and `photos.php` is runtime truth | Copy may instruct a workflow the owner does not use | UX/writer: confirm the owner-facing instruction; test asserts the chosen copy. |

### Assumptions

1. `vite preview` serves the built app with SPA fallback for `?photo=` deep links.
2. The built app can be pointed at a fixture public root via a build-time base/env flag,
   so hashes are known to the image suite.
3. `sharp` is available in the Playwright test process (dev dependency) to decode
   response dimensions.
4. Playwright's clock API can drive the 3 s/4 s fetch timeouts deterministically.
5. `fast-check` may be added as a dev dependency (property tests are mandated here).
6. Binary image fixtures are **generated** at setup (§4.2), not committed: a checked-in copy
   of a production photo would leak its EXIF/GPS payload into git history for good. The
   generator's ledger (`tests/fixtures/image-sources.json`) is gitignored too, because its
   hashes move with the sharp/libvips build.

### Superseded assumptions

**S1 — "the app ships no service worker" (SUPERSEDED 2026-11-22 by ADR-0009).** Earlier
drafts of this plan, and the pre-refactor app, assumed an online-only product: no service
worker, no Cache Storage, no install path, and a `serviceWorkers: 'block'` that was a
statement about the product. **ADR-0009 (owner decision D-01) reverses that premise**:
the app is installable and offline-first, with a bounded, versioned cache. Everything in
this document that inherited the old assumption is now wrong in the same way, and the
corrections are these:

- `serviceWorkers: 'block'` is a **determinism default for the non-PWA suites only**
  (§3.2). It is not a product fact, and it must not be widened back to a global setting —
  that single line is what made every offline assertion unwritable.
- Any test asserting "no service worker is registered", "no Cache Storage exists", or
  "the network is the only source of the shell" is a **v1 assertion and therefore a
  defect**, exactly like the v1 conflicts in C1–C5. `architecture.md` v1.2 and ADR-0009
  are the sources; the older test-plan text is not.
- "Offline" is not a single state to test. It is the taxonomy in §6.12 — cold, warm,
  stale, image-miss — and each row has a distinct, falsifiable assertion. A single
  "works offline" checkbox would pass while three of the four states are broken.
- Privacy gains a boundary it did not have before: the cache is now a place data can
  leak to, so `E-PWA-06` (no original in any cache) and `E-PWA-08` (credentials,
  `Set-Cookie`, `Vary`) are privacy tests first and cache tests second.
- Lighthouse cannot arbitrate any of this: its PWA category was removed in Lighthouse
  12.0.0 (April 2024), so the PWA gate (§8.1 gate 10) is byte budgets, manifest/icon
  validation, CDP installability and the twelve `E-PWA-*` specs — with Lighthouse
  advisory only.

### Open questions

1. Should the detail tier be 1200 px or the source's natural size capped at 1600? The
   brief says 1200; the art direction may want more for the exhibit.
2. Is the tile tier 360 px a long-edge cap or a square-crop cap? The crop-anchor model
   suggests long edge; confirm with the art pipeline.
3. Do 500-photo manifests need virtualization before the request cap in E-DLV-13 is
   enforceable? If so, that is a story, not a test tweak.
4. Is `Diplom` focus return to the pack trigger or to the progress line (E-FOC-12)?
5. ~~Does the pack skip path mark revealed cards only?~~ **RESOLVED 2026-11-22** — owner ruling: only the cards already revealed are collected; the remainder are not. The pack holds four cards and can be reopened immediately. U-PACK-09, E-JRN-09 and E-JRN-10 assert this.

---

## Appendix A — Fixture manifest skeleton

```jsonc
{
  "generated": "2026-01-01T00:00:00.000Z",
  "source": "photos",
  "photos": [
    {
      "id": "fx-01",
      "src": "photos/fx-01.jpg",
      "thumb": "photos/thumbs/fx-01.jpg",
      "view": "photos/fx-01.jpg",
      "filename": "fx-01.jpg",
      "caption": "Eine Zeile für fx-01.",
      "alt": { "de": "Elsa auf dem Sofa", "en": "Elsa on the sofa" },
      "name": { "de": "Hüterin der Sofaecke", "en": "Keeper of the Sofa Corner" },
      "mood": { "de": "ruhig", "en": "calm" },
      "description": { "de": "…", "en": "…" },
      "rarity": "",
      "demo": false,
      "heic": false,
      "width": 1200,
      "height": 1600
    }
    // fx-02 … fx-08 per §4.1
  ]
}
```

## Appendix B — Commands

```bash
# fast local loop
npx vitest run tests/unit/pack.draw.spec.ts
npx vitest run --coverage

# single e2e spec against a local build
npm run build && npx playwright test tests/e2e/journey.spec.ts --project=chromium

# PWA suite only (own fixture origin on :4180, service workers allowed)
npx playwright test --project=pwa
npx playwright test tests/e2e/pwa/offline.spec.ts --project=pwa   # one spec

# gate 10 alone
node scripts/pwa-gate.mjs && node scripts/manifest-check.mjs \
  && npx playwright test --project=pwa

# full gate locally (same order as CI)
npm run canon && npm run check && npx stylelint "src/**/*.{css,svelte}" \
  && node scripts/selector-diff.mjs && npx eslint . && npx knip \
  && npx jscpd --config jscpd.json src tests scripts \
  && npx vitest run --coverage && npm run build \
  && npx playwright test && npx playwright test tests/e2e/a11y.axe.spec.ts \
  && node scripts/budget-check.mjs && node scripts/pwa-gate.mjs \
  && node scripts/manifest-check.mjs && npx playwright test --project=pwa
```

## Appendix C — Test ID conventions

| Prefix | Layer |
| --- | --- |
| `U-` | Unit (Vitest), stable per file |
| `P-` | Property-based invariant |
| `F-` | Fuzz generator |
| `E-` | End-to-end (Playwright) |
| `U-PST` | Persistence |
| `U-CON` | Contrast |
| `U-RAR` / `U-PROMO` / `U-PACK` | Rarity / promotion / draw |
| `U-CV` | Card view and budgets |
| `E-DLV` / `E-ORG` | Image delivery / original-origin rule |
| `E-FOC` / `E-KBD` / `E-RM` | Focus / keyboard / reduced motion |
| `E-ERR` / `E-IMG` | Manifest errors / image errors |
| `E-OVF` / `E-BRW` / `E-RST` | Overflow / browse / reset |
| `U-PWA` / `E-PWA` | PWA cache policy (Vitest) / PWA lifecycle (Playwright `pwa` project, §6.12) |

---

**Verdict: COMPLETE** — test plan written to `docs/test-plan.md`; no code or other
document was modified.
