# ADR-0001: Stack — Svelte 5 + Vite 8 + TypeScript 7 (strict, native) + Vitest/Playwright

- **Status**: Accepted (owner decision, 2026-11-22)
- **Date**: 2026-11-22
- **Deciders**: owner (approved stack), Technical Director (record)
- **Note**: the toolchain validation work in Consequences (svelte-check `--tsgo` in
  daily use, editor language-server behaviour, bundle-budget measurement) is
  recorded as build-phase checklist items in `docs/architecture.md` — validation
  items, not status blockers for this ADR.
- **Related**: `docs/adr/ADR-0002-styling-system.md` (Accepted — Panda CSS 2.0 joins
  the toolchain; token/recipe source of truth, enforcement belt and its fallback
  ladder are recorded there)
- **Supersedes**: the v1 no-build constraint interpretation ("five files, no pipeline");
  PRD §5 Maintainability is reinterpreted, not abandoned — see Consequences.

## Context

Elsa the Explorer is a card library / Sammelwerk: one page, four-card pack opening,
binder, big-card dialog, bilingual DE/EN, first-party localStorage only, static deploy
to IONOS shared webspace with optional PHP (`photos.php` manifest + image services).
The owner adds photos by FTP drop + reload, with no redeploy and no build step on
the server. The owner is a solo maintainer whose time is the scarcest resource (PRD §7).

The v1 implementation is a 1780-line vanilla `app.js` (plus `card-bank.js`, two CSS
files, one `index.html`). It works, but it has structurally unfixable defects:
card content overflowing fixed frames, holo promotion applied to a *copy* of the
photo object so rarity diverges between pack and binder (app.js:905), fetch-failure
and empty-archive collapsing into one UI state, a below-4.5:1 `--quiet` token, and
copy promising swipe navigation that does not exist. A full refactor was decided;
nothing about the current code is sacred, but PRD §5/§7 constraints bind:
privacy (no cookies/analytics/CDNs), IONOS static hosting, PHP optional but never
required, file-drop photo workflow, WCAG 2.2 AA, bilingual from day one.

The stack below was owner-approved and version-verified against npm on 2026-11-22:
Svelte 5.59.1, Vite 8.3.8, TypeScript 7.0.2 (strict, native/Go compiler),
@sveltejs/vite-plugin-svelte 7.3.1, Vitest 5.1.1, @playwright/test 1.65.1,
sharp 0.35.5 (dev), svelte-check 4.7.8. Plain Vite app — no SvelteKit, no SSR.

## Decision

Adopt the pinned stack as the exclusive toolchain:

- **Svelte 5 (runes)** for UI: components + `.svelte.ts` class stores
  (`$state`/`$derived`/`$effect`). Chosen for its small runtime, scoped styles with
  global tokens, and runes as a coherent state model that enforces the
  "derive, never copy" rule (see `docs/architecture.md` — pack slots hold
  `photoId` + `promoted`, never copied records).
- **Vite 8** as the only build pipeline: dev server, HMR, production bundle,
  `$lib` alias. The build step exists **in the repo only** — the server still
  receives plain static files, so the owner's FTP workflow and "PHP optional,
  never required" survive untouched.
- **TypeScript 7.0.2, strict** (native compiler) everywhere including
  `.svelte` script blocks. Verification performed for this ADR: the
  `svelte-check@4.7.8` package ships `--tsgo` and `--tsgo-experimental-api`
  flags (inspected in its published dist on 2026-11-22), so `.svelte` files are
  type-checked by the TS 7 native compiler. svelte-check documents that TS 7
  support additionally requires TypeScript 6 installed side-by-side (npm alias,
  e.g. `typescript6@npm:typescript@^6`) for its language-service path.
- **Vitest 5** for the pure domain layer (pack rules, rarity derivation,
  manifest normalization, storage migration, i18n parity).
- **Playwright 1.65** for flows, keyboard/reduced-motion runs, error-state mocks,
  overflow checks, axe-core contrast, third-party-request audit. Replaces the v1
  `legacy/scripts/qa.mjs` puppeteer smoke test.
- **sharp 0.35.5 (dev)** for thumbnails/crop anchors in `scripts/photos.mjs` —
  dev/QA only; the runtime pipeline remains `photos.php` (+ `photos.json` fallback).
- **No i18n dependency, no CSS framework**: typed first-party dictionary
  (`de.ts` master, `en.ts satisfies Dictionary`); foil/holo stays hand-authored
  CSS against `styles/tokens.css`.

## Consequences

**Positive**

- The four structural defects become type-level or test-level impossibilities
  (frozen records, pack slots, discriminated manifest status, token-only colors,
  interaction-copy audit) rather than discipline.
- Typed dictionary makes "0 untranslated strings" (M4) a compile error, not a review task.
- Strict TS 7 across `.ts` and `.svelte` gives one checker, one language, zero
  `.js` drift; the native compiler keeps the check fast enough to be always-on.
- Component-scoped styles + global tokens preserve the v1 aesthetic contract
  (dark collector's parlour, hand-authored foil) while killing dead CSS (the
  superseded `.lightbox` block goes away with the old files).

**Negative / risks**

- **TS 7 tooling risk (stated honestly, not assumed away).** The CLI path is
  *verified* (svelte-check 4.7.8 `--tsgo`), but svelte-check requires TS 6
  side-by-side via npm alias, and the editor language server (Svelte VS Code
  extension) may lag TS 7 in daily use. **Fallback, explicit:** if `--tsgo`
  misbehaves in practice, type-check `src/**/*.ts` with the native
  `tsc --noEmit` and run `svelte-check` against the aliased TS 6 for `.svelte`
  files — same strictness, two invocations, documented in the CI script. If TS 7
  itself blocks Svelte tooling entirely (not observed as of 2026-11-22), the
  reversible step is pinning TS 6.x — a version pin, not a stack change.
- **Build step reintroduced.** The v1 "five files carry the product" (PRD §5)
  becomes "five source modules + one build". Mitigation: `npm run build` +
  FTP the `dist/` remains a minutes-per-month workflow; the *server-side*
  no-build constraint (PRD §5 Hosting) is still fully honoured.
- **New-major risk concentration.** Vite 8, plugin-svelte 7, TS 7 and Vitest 5
  are all current majors; a regression in any one lands on this project.
  Mitigation: exact versions pinned in `package.json` (verified compatible set,
  2026-11-22), lockfile committed.
- **Runes learning curve** for contributors used to v1's imperative DOM code.
  Mitigation: `docs/architecture.md` fixes the store/component pattern;
  components stay small and prop-driven.

**Performance implications**

- Budget: ≤ 60 KB gzip initial JS (100 KB hard cap), ≤ 30 KB CSS, LCP < 2.5 s
  mobile. The v1 app was ~55 KB unminified; Svelte 5's runtime plus the app must
  fit the same envelope. If the budget tightens, the dictionary ships per-language
  and the theatre animation code is the first to slim down. No runtime dependency
  may be added without a size justification (dependency audit in review).

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| **Keep vanilla (refactor in place)** | Lowest tooling risk, but the defects are structural: without a component frame and a pure rules layer, every fix is a convention that the next edit can silently violate. The 1780-line file is the defect vector itself; splitting it by hand rebuilds a worse Svelte. The typed dictionary and audit tests are also not achievable at equal cost without a compiler. |
| **Preact + Signals (~4 KB)** | Tiny runtime and signals are attractive, but it trades away scoped styles (back to global CSS discipline by hand), has no component-level `.svelte.ts`-equivalent store pattern, and the typed bilingual UI would need JSX ergonomics reinvented. The runtime size win is marginal against a budget the Svelte app already fits, and the project needs component structure more than 3 KB. |
| **Lit 3 (Web Components)** | Good for widget libraries; for a single tightly choreographed page it adds shadow-DOM friction against the global token/foil system (tokens must pierce or be re-declared per shadow root), and its reactivity model offers nothing the runes pattern doesn't already give with better TS integration. |
| **Vue 3 (Composition API + `<script setup>`)** | Closest runner-up: mature, typed, scoped styles, signals-like refs. Rejected because Svelte 5's compiler approach yields smaller output, avoids the runtime VDOM cost entirely, and the owner-approved decision was already Svelte; the refactored `.svelte.ts` store pattern maps 1:1 onto the "derive, never copy" rule more explicitly than Vue's reactivity. |
| **SvelteKit** | Explicitly out: it brings SSR machinery the IONOS static host cannot run as designed, the adapter output is more than "static files + FTP", and it currently conflicts with TS 7's peer range (`sveltejs/kit#17537`). Plain Vite gives everything this one-pager needs. |
