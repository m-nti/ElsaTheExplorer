# ADR-0006: Testing & CI gates — Vitest/Playwright layers, budgets as build failures

- **Status**: **Accepted (owner decision, 2026-11-22)**
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.2 — "Testing Strategy", the CI-order paragraph, the Known-Defect Prevention Matrix verification column. `docs/test-plan.md` stays the test **catalogue** (IDs, cases, fixtures); this ADR fixes the architecture and gates it indexes.
- **Related**: `ADR-0001` (pinned runners), `ADR-0002` (enforcement belt), `ADR-0008` (byte ceilings), `ADR-0009` (PWA gate), `ADR-0003` (storage tests), `ADR-0005` (parity), `design/accessibility-requirements.md`

## Context

v1 was verified by `scripts/qa.mjs` — a Puppeteer smoke script with screenshots and eyeballed
assertions. It did not catch what shipped (copied rarity, collapsed error states, a sub-4.5:1
token, an original served on a thumbnail request), because each defect was structural rather than
a missing check. The answer is not more manual QA but **placements**:

- correctness-critical rules live in pure modules (`src/lib/data/`, `src/lib/pwa/`) and are
  exhaustively unit-tested;
- every budget (bytes, contrast, copy completeness, precache size) is a CI assertion;
- the built app is exercised as a visitor meets it — role/name locators, keyboard, reduced
  motion, error routes — never through component internals.

`docs/test-plan.md` already specifies the cases (U-*, E-*, T*) and the ten-gate order. This ADR
records *why* those layers exist, what each owns, and the rules that keep them honest: a gate
must be able to fail, and a failing gate must never be routed around.

## Decision

### 1. Two runners, three layers, one catalogue

| Layer | Runner | Owns | Never |
| --- | --- | --- | --- |
| Unit / property | **Vitest 5** (node, no DOM) | rules, normalize, rarity, budgets, i18n parity, migration, contrast, PWA policy | rendering, `fetch`, real storage |
| Contract | Vitest + `php -S` / HTTP harness | `photos.php` status/ceiling/header behaviour, emitter parity | mocking the thing under test |
| Integration | **Playwright 1.65** on `vite preview` (built app) | journeys, keyboard, motion, focus, errors, overflow, reset, axe, privacy, PWA | component internals; the Vite dev server |

No third runner and no component-unit-test layer: components are verified by role and accessible
name in the built app, which is the surface the visitor gets. `tests/` mirrors the split
(`unit/`, `e2e/`, `e2e/pwa/`, `fixtures/`, `php/`).

### 2. Authority when documents disagree

Precedence (test-plan §1): `PRD.md` §4–§7 → `AGENTS.md` → `design/accessibility-requirements.md`
→ ADRs → `design/ux/*` v2 → `docs/architecture.md`. A test asserts the binding behaviour; where
architecture lags a ratified UX decision, the test follows the UX spec and the stale line is
fixed, not frozen into an assertion.

One case is live: architecture still says "no swipe gestures", while
`design/ux/interaction-patterns.md` v2 *Card Browsing* defines chevrons + `←`/`→` + horizontal
swipe over one `navigateCard(±1)` path, and test-plan §6.8 asserts it. The interaction matrix
governs; the architecture sentence is a documentation defect to correct, and no test may assert
the absence of an input the UX spec requires.

### 3. Gates are binding and fail closed (ten, in order)

Typecheck (`tsc --noEmit`, `svelte-check --tsgo`) → Stylelint + cross-file selector diff + unused
CSS → ESLint → knip → jscpd → Vitest with coverage → build (`reports/size.json`) → Playwright
(chromium, webkit, mobile-chrome, mobile-safari) → axe → bundle/byte budget → PWA (precache
≤ 400 KB, `sw.js` ≤ 25 KB gzip, manifest/icons, CDP installability, `pwa` project).

No `continue-on-error`, no `|| true`, no `--passWithNoTests`, no skipped-instead-of-fixed test, no
flake quarantine without a ticket and an owner. `main` is protected; the ten checks are required.
Lighthouse is **advisory only** — its PWA category has not existed since Lighthouse 12
(ADR-0009), so it cannot gate.

### 4. Budgets are tests

| Budget | Assertion |
| --- | --- |
| JS ≤ 60 KB target / 100 KB cap gzip; CSS ≤ 30 KB incl. `styled-system/` | gate 9 reads `reports/size.json` |
| Each rendition ≤ its own-format ceiling **and** ≠ source bytes | gate 9 + `php -S` job; live re-check in ADR-0007 |
| Every text token ≥ 4.5:1 | Vitest contrast gate over `design/tokens/tokens.ts`, **with a negative test** that must reject the legacy `--quiet` |
| 0 untranslated strings | compile-time parity (ADR-0005) + runtime parity test |
| No third-party request, no non-`lucky-elsa` key | Playwright request/storage audit |
| Precache ≤ 400 KB, `sw.js` ≤ 25 KB, 0 SW bytes before first paint | gate 10 |

A budget without a mechanism that can fail is documentation; every row names one.

### 5. Testability seams are a delivery requirement

`drawPack(photos, seenIds, { rng })` takes an injected PRNG; time-dependent code takes a clock;
`persistence` takes a storage adapter; `normalize` is pure and never throws; the build emits
`reports/size.json` and `data-version`; `src/lib/pwa/*` policy modules import nothing global. A
story whose logic cannot be tested without a browser-shaped hack is not done — the seam ships
with the feature.

### 6. Determinism and fixture privacy

No wall-clock assertions, no unseeded randomness (seed in the failure message), frozen fixtures,
no `page.waitForTimeout` (lint rule), fresh context per test, fixed `de-DE`/`Europe/Berlin`/`dark`,
`page.clock` for time. Service workers are **blocked** in the four standard projects and
**allowed** only in the `pwa` project on its own origin/port — blocking globally would make every
offline test unwritable. Binary image fixtures are generated at setup into a gitignored directory;
a production photo (EXIF/GPS) is never committed, and byte assertions read the generated ledger.

### 7. Coverage and ownership

Vitest coverage on `src/lib/data/**`, `src/lib/stores/**`, `src/i18n/**`: ≥ 90 % lines/functions/
statements, ≥ 95 % branches, 100 % for cache policy. Coverage is a floor, not a goal. Each story
ships its tests and evidence; qa-automation owns the harness and gate wiring, domain authors own
their rules. Story DoD and the "not done if" list live in test-plan §11.

## Consequences

**Positive** — v1's defect classes cannot return silently; the pure-module placement pays twice
(fast unit tests, a thin browser layer a trace can explain); the PHP contract job measures the
byte/no-original claim instead of asserting it in prose; gate 10 removes the "PWA score" blind
spot.

**Negative / accepted costs** — real CI wall clock (four browser projects, PHP job, serial PWA
suite), mitigated by fast-checks-first ordering and a dedicated PWA port; three environments to
keep green, where a broken harness reads as a product failure; Playwright majors are planned
upgrades; coverage thresholds invite tests of trivial code, hence the scoped 100 % rule; some
assertions are Chromium-only (`getInstallabilityErrors`), with WebKit contributing a recorded
"not applicable" and manual iOS rows — an honest limitation, not a silent skip.

## Performance Implications

The suite is the slowest feedback loop by design: unit tests in seconds, built-app suite in
minutes, PWA serial. It ships nothing. The 60 MP fixture is generated, not committed; live byte
verification lives in the release checklist (ADR-0007), not on the host.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| Keep `qa.mjs` (Puppeteer smoke) | No runner, parallelism, web-first assertions or trace viewer; cannot express route mocks, keyboard runs or cache assertions — and v1's defects passed it. |
| Jest | A second transform pipeline; Vite/Vitest share the config and the ESM/TS story. |
| Cypress | Weaker SW control, no CDP installability, a second browser protocol for no gain. |
| Vitest browser mode alone | Cannot drive offline/install lifecycles, CDP, or a two-build swap. |
| Component unit tests (Testing Library) | The failure modes are integration-shaped (focus return, live regions, overflow); role/name e2e covers them. |
| Mocks only, no real PHP | Cannot prove `Content-Length ≤ ceiling ≠ source` or the 302/413/415 paths ADR-0008 requires. |
| Coverage as the primary signal | Numbers invite getter tests; the named invariants are the contract. |
| Advisory budgets | v1's sub-4.5:1 token shipped under warning-only enforcement. |

## References

- `docs/test-plan.md` — layers, IDs, fixtures, gates 1–10, flake policy, story DoD, §15 conflicts
- `docs/architecture.md` v1.2 — Testing Strategy, CI order, Performance Budget, Defect Matrix
- `docs/adr/ADR-0002`, `ADR-0008`, `ADR-0009`, `ADR-0003`, `ADR-0005`
- `design/ux/interaction-patterns.md` v2 · `design/accessibility-requirements.md` · `AGENTS.md`
