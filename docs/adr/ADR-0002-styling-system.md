# ADR-0002: Styling System — Panda CSS 2.0 (typed tokens + recipes, zero runtime) with bespoke foil art in Svelte-scoped CSS

- **Status**: Accepted (owner decision, 2026-11-22, ratified via 3-specialist panel)
- **Deciders**: owner; ratified on the converged recommendation of a three-specialist
  panel (ui-programmer, architecture-review, art-director — independent votes, all
  three for Panda CSS 2.0 + scoped-CSS foil + mandatory enforcement belt, all three
  against Tailwind v4 in every configuration)
- **Amends**: `docs/architecture.md` (styling layer, folder structure, CI gates)
- **Related**: `docs/adr/ADR-0001-stack.md` (toolchain), `design/accessibility-requirements.md`
  (the measured sub-4.5:1 `--quiet` token that motivates the enforcement belt)

## Context

The refactor inherits a hand-authored token stylesheet (`style.css` `:root` tokens,
hand-written foil CSS) and a measured defect that is architectural, not accidental:
a `--quiet` token shipped below 4.5:1 contrast and was consumed by components.
Root cause: token authority lives entirely in untyped CSS custom properties, so
nothing in the toolchain can reject an off-token color or a failing token value —
the failure was found by eye, after release. The styling layer for the Svelte 5
refactor must make the token system machine-enforceable while preserving the two
artistic constraints: the dark collector's parlour with the card as the only lit
object, and the 5-layer hand-authored holographic foil (rays, glitter, glare,
print frame, photo) that no utility class system can express.

Panel-verified facts (architecture voice, checked 2026-11-22):

- **Panda CSS 2.0** (released 2026-09-29) rewrote its engine in Rust (NAPI,
  `@pandacss/compiler`), reads `.svelte` files natively, ships an ESLint plugin,
  and is ESM-only. Static output: typed tokens compile to plain CSS custom
  properties; recipes compile to static CSS artifacts. Zero runtime ships to the browser.
- **TypeScript 7.1 beta restored the compiler API** with Svelte/Vue content
  mappers, so `svelte-check --tsgo` has a supported forward path alongside
  Panda's own type generation.
- **Measured evidence from the panel's evaluation**: a Panda+Tailwind
  double-engine setup produced **50 duplicate selectors** from the two preflights
  and codegen passes — the double-engine configuration is disqualified on
  measured grounds, not taste.
- AGENTS.md standing rule (updated 2026-11-22): no small-project bias — the
  best, future-proof option is taken and its complexity cost documented, even
  for a one-pager.

## Decision

Adopt **Panda CSS 2.0** as the styling layer, exactly three-part:

1. **Typed tokens in TypeScript** — `design/tokens/` is the single token source
   (palette, `--quiet` successor with the corrected value, spacing, type scale);
   `panda.config.ts` compiles them. Components never hardcode a color.
2. **Typed recipes as the ONLY sanctioned variant mechanism** — rarity variants
   (`common | rare | holo`), card sizes, and state variants are Panda recipes
   with TypeScript autocomplete and compile-time rejection of unknown variants.
   No conditional class-string concatenation anywhere.
3. **Bespoke foil art stays in Svelte component-scoped CSS** — the 5-layer foil,
   glare animation and spotlight are art, not tokens; they consume tokens
   exclusively via `var(--elsa-*)` / `var(--tier-*)` and may never redefine them.

Panda emits static CSS artifacts (`styled-system/`, generated, gitignored);
nothing runtime-CSS-in-JS reaches the browser. No Tailwind, no other engine.

**Mandatory enforcement belt (CI, not advisory):**

- Stylelint with `var()`-only consumption rule and **duplicate-selector-as-error**;
- a cross-file selector-diff check (Stylelint is per-file; duplication across
  component CSS files must be caught at repo level);
- Svelte 5 unused-CSS warnings promoted to CI errors;
- CSS byte budget in the bundle check;
- **Vitest contrast gate over `tokens.ts`** — the gate script must demonstrably
  REJECT the known sub-4.5:1 `--quiet` value (negative test) before it is trusted
  to pass anything;
- axe-core in Playwright on the built bundle (already in architecture.md);
- knip for dead TypeScript exports (token/recipe surface must not rot).

## Consequences

**Positive**

- Token authority becomes compile-time: off-token colors and unknown variants are
  TypeScript errors, and token values are contrast-gated in CI — the mechanism
  that shipped the sub-4.5:1 token is closed at three independent layers.
- Recipes give the rarity system (foil strength per tier) a typed, documented,
  diffable home; the art-director's tiers are code the compiler checks.
- Zero runtime: output is static CSS custom properties + artifact classes; the
  performance budget (≤ 30 KB CSS gzip) now covers generated + scoped CSS together.
- Exit safety: because Panda already emits plain CSS custom properties, the
  fallback exit is a mechanical scripted transform, not a rewrite.

**Negative / accepted costs (documented per the no-small-project-bias rule)**

- ESM-only config: `panda.config.ts` and all styling tooling are ESM; no CJS
  interop shims. (Project is `"type": "module"` — cost is nil here.)
- Stylelint's `var()`-only rule forbids raw values inside component CSS: art CSS
  authors must reach for tokens even for one-off values, or add a token. Cost
  accepted: it is exactly the authority that was missing.
- A generated `styled-system/` directory enters the repo workflow (generated,
  gitignored, regenerated on build) — one more moving part for a solo maintainer,
  paid deliberately.
- TS 7.1 beta dependency for the compiler-API forward path: tracked as a
  build-phase checklist spike, with the ADR-0001 TS tooling fallback ladder applying.

## Spike Items (build-phase checklist — gate the first vertical slice)

1. **Vertical slice**: 3 cards + one holo variant through Panda 2.0 + Vite 8.3.8
   + `svelte-check --tsgo`; measure artifact size and build time.
2. **Stylelint config**: `var()`-only + duplicate-selector-as-error, wired into CI.
3. **Contrast gate script**: must REJECT the known sub-4.5:1 `--quiet` token
   (negative test) and pass the corrected value.
4. **Holo recipe reconciliation**: the three conflicting holo value sets from the
   v1 CSS are merged into one typed recipe; old-vs-new rendered CSS diff reviewed
   by the art-director before deletion of the old layers.
5. **Unused-CSS gate**: verify Svelte 5 unused-CSS warnings can be CI-failed
   (compiler flag/warning promotion), else the cross-file diff check covers it.
6. **Cross-file selector-diff check**: scripted repo-level duplicate-selector
   detection, since Stylelint is per-file.

## Alternatives Considered

| Alternative | Kill reason |
| --- | --- |
| **(a) Panda CSS 2.0 + scoped-CSS foil** — chosen | Only option that satisfies all three constraints at once: typed token authority (compile-time + lint), a real variant engine (recipes), and zero-runtime static output; `.svelte`-native extraction verified. |
| **(b) Tailwind v4 + cva wrappers** | Token authority sits CSS-side in arbitrary values and utilities are invisible to Stylelint — the toolchain cannot reject off-token consumption, i.e. the exact mechanism that shipped the measured sub-4.5:1 `--quiet` token; no compile-time rejection of off-token values; cva is a third-party variant layer where a first-class typed recipe engine exists. |
| **(c) Tailwind hybrid (Tailwind for layout, tokens/foil custom)** | Two styling vocabularies on one page reproduce the measured drift by construction — every author picks a lane per line; the foil needs bespoke CSS anyway, so the Tailwind half buys only the vocabulary split. |
| **(d) Panda + Tailwind double engine** | Structurally disqualified: two preflights and two codegen passes regenerate duplicate strata — **50 duplicate selectors measured** in the panel's evaluation; doubled reset behavior and doubled artifact management for zero added capability. |
| **(e) Dependency-free typed-token codegen (self-written)** | Best pure layering (tokens as TS, emit plain custom properties), but no variant engine and self-owned codegen is a permanent maintenance tax for a solo maintainer — exactly the "small-project" tradeoff the standing rule forbids. **RETAINED as the documented fallback ladder, never the default**: if Panda 2.0 blocks TS 7 / Vite 8 in practice, the exit is a mechanical scripted transform of its emitted custom properties into the fallback codegen, because Panda's output is already plain CSS custom properties. |
