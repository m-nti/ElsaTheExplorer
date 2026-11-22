# Elsa the Explorer — agent instructions

A card library about Elsa (the dog): the collection is the product, Elsa is the
collection mechanism. Full refactor in progress on a decided stack.

## Standing rule — activate relevant skills before any task

Before starting work, inventory the installed game-studios skills
(`~/.config/opencode/skills/`) and activate every skill relevant to the task at
hand (via the `skill` tool, or by reading its `SKILL.md`). Name the activated
skills in the final report. Skipping a relevant skill is a reportable defect.

## Project facts (binding)

- **Product**: Elsa the Explorer — a card library / Sammelwerk. NOT a gift toy.
  Museum-catalogue register with warm dry humor. DE/EN from the start.
- **Stack (owner-approved, newest majors, verified 2026-11-22)**: Svelte 5
  (5.59.1) + Vite 8.3.8 + TypeScript 7.0.2 (strict, native compiler) + Vitest
  5.1.1 + Playwright 1.65.1 + @sveltejs/vite-plugin-svelte 7.3.1 + sharp 0.35.5
  (dev). Plain Vite app, no SvelteKit, no SSR. Static deploy to IONOS.
- **Photos pipeline**: `photos.php` stays the runtime manifest source (owner
  FTP-drops photos, no redeploy). Node/sharp scripts generate thumbnails and
  crop anchors for local dev/QA only. Manifest gains optional `set`, `focus`,
  `chase` fields, backward compatible.
- **Data**: first-party localStorage only (`lucky-elsa.*`), no accounts, no
  analytics, no tracking. Reset clears all keys with confirmation.
- **Canon — water (owner ruling, 2026-11-22)**: **Elsa hates water. The archive
  contains NO wet-dog, rain, mud or bathing content — no water-themed cards, copy
  or jokes.** The sixth room is **Der Abfahrtsaal / The Departure Hall** (car
  rides, the window-nose, arriving places), replacing Die Nassabteilung / The
  Wet Collection everywhere. Legacy card-bank water jokes (e.g. "Badegast des
  Jahres", "Unwetterwarnung Stufe Pfote") are retired and must be rewritten in
  the build phase.
- **Visual**: refine the dark collector's parlour — the card is the only lit object in the
  room. **Styling system (ADR-0002, ratified by a 3-specialist panel): Panda CSS 2.0**
  (Rust engine; typed tokens + typed rarity recipes, static artifact output, zero runtime)
  with **bespoke foil art in Svelte component-scoped CSS** that may consume tokens only via
  `var()`. Enforcement belt is mandatory CI: Stylelint (`var()`-only values in scoped CSS,
  duplicate selectors as errors), a cross-file selector-diff check, Svelte unused-CSS
  warnings escalated to errors, a Vitest contrast gate computing WCAG ratios from
  `tokens.ts` (a sub-4.5:1 token fails the build), knip for dead tokens/exports. No runtime
  CSS-in-JS; utility frameworks (Tailwind v4 et al.) evaluated and rejected. Accessibility
  tier: **Standard** (committed in `design/accessibility-requirements.md`).

## Standing rule — no small-project bias

Treat this as a production product, always. When choosing tooling, architecture or
process: pick the **best, future-proof, scalable** option; "overkill" and "too much
for a small project" are NOT valid reasons to downgrade a decision. If a choice adds
real capability, take it and pay its (documented) complexity cost — via an ADR with
the fallback ladder spelled out.
- **Constraints from PRD.md §5/§7 remain binding** (privacy, IONOS, solo
  maintainer).

## Where things live

- `design/` — game brief, GDDs, UX specs, art bible, accessibility
  (authored by studio agents; `/ux-review` validates specs against
  `design/ux/interaction-patterns.md` and the committed a11y tier)
- `docs/architecture.md`, `docs/adr/` — architecture and decisions
- Framework source, templates and skills:
  `~/.config/opencode/game-studios/source/.claude/`
- CSS note: the LAST "Open-card fit and pack theatre" block in
  `assets/css/style.css` is the active layout; earlier `.lightbox` rules are
  dead (full refactor will remove them).
