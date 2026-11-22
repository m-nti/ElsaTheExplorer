# ADR-0011: Card frame and content budgets — the seven-bay grid, its content ceilings, and the byte budgets that bound them

- **Status**: **Accepted (owner delegated, D-08)** — 2026-11-22. There is no `Proposed` phase
  for this record: the owner delegated the foundation ADR set, and D-08
  (`docs/decisions.md`: "No technical shortcuts … If a decision is between faster and better,
  choose better") makes the stricter reading the ruling rather than a recommendation.
- **Studio ownership** (`AGENTS.md`, ownership matrix): studio owners **`art-director`** (the
  visual budget: bays, foil layers, print face) and **`technical-artist`** (what the rendering
  stack can actually hold); cross-check **`cs-design-lead`**. Every number below traces either
  to `design/art/art-bible.md` §8 or to a recorded build measurement — none is a preference.
- **Deciders**: owner (final, delegated), technical-director (author), art-director (visual
  budget — review gate)
- **Amended**: 2026-11-22 — **D12a (#47)** supersedes the §1 bay table (see the note under it).
  The byte budgets in §5–§7 are unchanged by that ruling. **D70 (#70)** adds **R6**: band 4's
  two-row plan and the story clamp. No bay percentage moves.
- **Amends**: `docs/architecture.md` — "Performance Budget" (a metric column: which figure is
  gzip, which is minified, which is only a target), "Component Breakdown — `CardTile.svelte`"
  (its four-zone prose and `budgets.ts` path), ADR Audit and Required ADRs (the 0011 row).
- **Related**: ADR-0002 (typed tokens/recipes; CSS byte budget), ADR-0004 (manifest `focus`),
  ADR-0008 (rendition ladder, no-original rule), ADR-0009 (precache and `sw.js` budgets),
  art-bible §3/§5/§7/§8, `design/ux/card-detail.md` §5.3 and L1–L6,
  `docs/test-plan.md` §4.3/§5.8/§6.7/§8, `docs/build/b0-b1-verification.md` §2/§4,
  issues #13 (B2 implements), #24 (e2e), #25 (gate 9), #30 (bible↔tokens parity), #35 (Chivo).

## Context

The v1 defect class was the card overflowing its own frame: a credit line painted over the
photograph, a stat value clipped at the bottom, text crossing the foil edge. The fix is
structural — a fixed bay grid whose text clamps inside its band — and art-bible §8 authorizes
the full refactor ("Zone proportions — the overflow law"). Three things are still missing, and
each has already produced drift:

1. **No record ratifies the grid as a component contract.** The bible's §8 table
   (seven bays: 15 / 31 / 4.5 / 22 / 13 / 4.5 / 10 % — the pre-D12a values) and the shipped
   component disagreed in both count and values — before #47, `tokens.ts` carried six values
   (17 / 46 / 7 / 15 / 10 / 5 %) which `CardFace.svelte` consumes as six `grid-template-rows`.
   Two "sources of truth" that differ is the exact pre-condition of the v1 defect class, and #30
   (bible↔tokens parity) will make it a red gate.
2. **The budget numbers are stated in two incompatible metrics.** "60 KB" is a *minified*
   ceiling in art-bible §8 and a *gzip* target in `docs/architecture.md` and gate 9 of the test
   plan; "CSS ≤ 45 KB" is uncompressed in the bible and "≤ 30 KB" gzip in gate 9. The muddle is
   already propagating: issue #35 states "JS is also at 99.4% of its 60 KB gzip budget", but
   99.4% is the *minified* ratio (59.64 of 60 kB) — the gzip figure is 38.6 %. A budget that can
   be quoted in whichever metric suits is not a budget.
3. **The measured baseline has one real breach and nobody is told.** B1 measured the Chivo
   woff2 at 33,252 B against a 30 KB ceiling, and no enforced gate looks at bytes at all
   (`.github/gates.json`: `budget` is `pending`, issue #25). The breach is visible only in a
   report's prose.

What is at stake is narrow and load-bearing: where a card is readable, and what a phone
downloads before it shows one. Both are decided by numbers, so the numbers get one home.

## Decision

### 1. The frame: seven bays

Percentages of the **card plate's inner height** (the card face minus its padding). The table below
is the **pre-D12a** state, kept for the record; the blockquote after it supersedes it. An
AD-ART-BIBLE sign-off governs these numbers, so ADR-0011 ratifies them rather than editing them
(a percentage is not the technical director's to move).

| Bay | Full card | Drop card | Binder tile | Clamp rules (upper bound) | Source |
| --- | --- | --- | --- | --- | --- |
| Plate (number / name / mood / rarity chip) | **15 %** | 17 % | 16 % | name ≤ 2 lines, number 1, mood 1 (ellipsis) | art-bible §8 |
| Photo window | **31 %** | 36 % | 42 % | fixed band; window holds 4:5 (w:h) inside the band; foil caps apply | art-bible §8 + §3 |
| Strip (edition + stars) | **4.5 %** (min 24 px) | 5 % | 5 % | stars never wrap; kind truncates | art-bible §8 |
| Copy panel (keyword / copy / print line) | **22 %** | 18 % | 16 % | keyword 1, copy ≤ 3 (≤ 2 on drop), print ≤ 2 | art-bible §8 |
| Stats (label + 3 tiles) | **13 %** | 12 % | 11 % | key 1 line, value 1 line; bar decorative | art-bible §8 |
| Foot (serial / credit) | **4.5 %** (min 22 px) | 5 % | 5 % | serial 1; credit is first to be hidden | art-bible §8 |
| Gutters (distributed 4–8 px steps) | **10 %** | 7 % | 5 % | never collapses; the foil edge keeps its margin | art-bible §8 |

> **Superseded 2026-11-22 (D12a, #47):** the table above is the pre-ruling state. The art
> director's pass sets plate 15.5 / photo 41.5 / strip 5.5 / story 19.5 / stats 8.5 / foot 5 /
> gutters 4.5 (sum 100; tile 15.5 / 44 / 5.5 / 16 / 9 / 5.5 / 4.5). The photo window fills its
> band with no block padding, giving 155.94 px = 45.87 % of card width at the 340 px reference.
> The plate is two rows; the name clamps to one line with ellipsis. `design/art/art-bible.md` §8
> is the authority. **R6 (D70, #70) supersedes the clamp column above** for band 4: the story panel
> is two rows and the sentence clamps at three lines, with no bay percentage moving.

Pre-ruling, each column sums to exactly 100 % (15+31+4.5+22+13+4.5+10 = 100;
17+36+5+18+12+5+7 = 100; 16+42+5+16+11+5+5 = 100). The **reference card** used for every pixel
figure in this record is
340 × 485.7 px — the token maximum `sizes.card-max`, measured at B1
(`docs/build/b0-b1-verification.md` §2: "card 340 × 485.7 px (aspect `0.70`), root font
13.6 px (`4cqw` of 340)"; the same section records the "photo window 160.05 × 200.06 px
(`4:5`)"). Its plate is 469.7 px tall (485.7 − 2 × 8 px `spacing-2` padding).

**R1 — the percentages are size-free; the px floors are stated at the reference size.** Bays are
proportions and hold at every card size. The px floors (strip ≥ 24, foot ≥ 22), the 9 px
metadata floor (art-bible §7 rule 2) and the smallest shipped card type step (11 px,
`fontSizes.sm`) are stated at the reference card and scale with the `4cqw` root below it. Cost:
at the 180 px `card-min` the root is 7.2 px (53 % of reference), so those floors become
≈ 12.7 / 11.6 / 4.8 / 5.8 px — legal because a tile of that size is a silhouette surface, not a
reading surface (art-bible §5: "the ~180px shelf tile only needs silhouette + eye"), and its
content reaches assistive tech through the tile's accessible name.

**R2 — the minimum card width.** The table is valid for card widths **180–340 px**
(`sizes.card-min` … `sizes.card-max`, `design/tokens/tokens.ts`). Below 180 px art-bible §3
removes the text bays altogether ("thumbnail = photo + pearl rim"); above 340 px no card exists
(`CardFace.svelte`: `width: min(100%, var(--elsa-sizes-card-max))`). Cost: a binder cell narrower
than 180 px shows the thumbnail anatomy, so anything that must be *read* on a phone comes from
the detail dialog, not the tile.

**R3 — floors outrank percentages, and the deficit has one designated payer.** Where a px floor
exceeds its percentage (it does, below), the grid does not overflow: the difference comes out of
the **gutters** bay first — the only content-free bay — down to a 4 px minimum per gap, and only
then from the copy clamp, per the height-pressure order. No bay may fall below its floor and no
text may be clipped to satisfy the arithmetic. Cost: at the reference card the gutters give up
3.7 px (10 % → 9.2 %), i.e. five gaps of ≈ 8.6 px instead of 9.4 px — above R3's own 4 px
floor (and above the bible's 4–8 px step, which is part of why the old table was superseded). Under D12a the rule is **dormant**: the new bands carry the floors with no
payer (strip 5.5 %, foot 5 %), so no gutters-as-payer case arises.

### 2. What may overflow: nothing

The law, in the forms a test can read:

- **No layout overflow, anywhere.** Every bay's `scrollHeight ≤ clientHeight` and
  `scrollWidth ≤ clientWidth` at maximum permitted strings, and no element's box may leave the
  card's inner edge (art-bible §8: "text that doesn't fit clamps, never clips, never crosses a
  zone boundary, never pushes a neighbour"). `overflow: hidden` stays as the belt, **not the
  plan** — which is why the assertion compares `scroll` against `client` rather than trusting
  the clip (`E-OVF-06`).
- **No bay sizes to its content.** Fixed `grid-template-rows` plus `min-height: 0` on every bay;
  a bay that grows is the defect, not the fix.
- **Paint-outside is legal and is not layout.** Three things are drawn outside the card box and
  must not be clipped: the tier glow (`box-shadow` on `.card-face::after`), the card shadow, and
  the keyboard focus outline (2 px `--accent-bright` at 4 px offset, art-bible §7 rule 4). They
  are decorative or non-layout, `aria-hidden` where they are decorative, and `E-OVF-11` asserts
  the ring survives `overflow: hidden`.
- **Safe area = the pearl rim.** Content is inset from the foil edge by at least the rim's own
  width: **4 px** as measured (`.foil` uses `padding: var(--elsa-spacing-1)` in
  `CardFace.svelte`), **7 px** for holo per `design/ux/card-detail.md` L5. The tier recipe does
  not emit a rim width yet, so the 7 px holo case is an open item for #13 — recorded here so it
  is a task, not a surprise.

### 3. Ratios, window, and the focus anchor

| Item | Value | Source |
| --- | --- | --- |
| Card body aspect (w:h), all variants | **0.70** | art-bible §3 ("binding for drop, tile and full variants alike"), §8; `aspectRatios.card` |
| Photo window aspect (w:h) | **4:5** | art-bible §3 window-ratio, §5, §8; `aspectRatios.window` |
| Window sizing inside the band | height-driven: the window fills its band (**no block padding**), width follows the 4:5 ratio | 155.94 px wide in the 41.5 % band at the 340 px reference (D12a); the pre-ruling 160.05 × 200.06 was measured in a 46 % band with 8 px padding |
| Crop anchor, default | **`center 42%`** | art-bible §3/§5/§8; `sizes.photo-anchor`; `CardPhoto.focus` doc comment |
| Per-photo anchor | manifest `focus: {x,y}` in 0…1, clamped, wrong type drops the entry | ADR-0004 |
| Anchor → CSS | `object-position: {x·100}% {y·100}%` | test-plan `U-CV-07` |
| Crop owner | CSS only (`object-fit: cover`); encoders resize and never pre-crop, so one derivative serves tile, card and dialog | art-bible §8 "Crop, orientation, metadata"; ADR-0008 |

**R4 — one "no opinion" value for the anchor: `center 42%`.** Two documents used to default it
to the 50 % centre (ADR-0004's field row, `{x,y}` = 0.5 / 0.5; test-plan `U-CV-07` "default is `50% 50%`")
while the art bible, the token and the view model all said `center 42%`. Both are restated now:
`U-CV-07` in #56, ADR-0004's field row under amendment A-1 (#63). The bible wins on
grounds it states: faces sit high in Elsa's photographs, and 42 % is "the same 42 % as the photo
crop, so the reading line never shifts between one card and four" (art-bible §7, the reveal
camera's solved translate target). Cost: two one-line doc restatements (ADR-0004's default row,
`U-CV-07`'s last clause). Rationale for a single value: two
different "no opinion" anchors (manifest-neutral 50 %, render-neutral 42 %) is exactly the
`--foil-strength` 0.56/0.42/1.0 drift this project already paid for.

**R5 — one card silhouette: the 0.58 sub-380 px ratio is retired.** `card-detail.md` L2 carries
"`aspect-ratio: 0.70` (0.58 below 380 px width)"; art-bible §3 binds 0.70 for every variant and
size, and a second silhouette would move every bay boundary between breakpoints. Cost: mobile
cards are shorter than the 0.58 leg would have made them (h = 1.43 w, not 1.72 w), which
*reduces* vertical pressure on the dialog — the opposite of the defect class.

### 4. Content budgets

Character ceilings are enforced at view-build time, truncating with a single ellipsis and never
mid-grapheme; the CSS clamps are the last line of defence, never the plan.

| Field | Ceiling | Source |
| --- | --- | --- |
| `name` | `NAME_MAX = 40` chars | `docs/architecture.md` (CardTile), test-plan `U-CV-01` |
| `mood` | `MOOD_MAX = 48` | same |
| `caption` / story | `CAPTION_MAX = 180` | same |
| `caption` / story, **rendered on the card face** | **≤ 3 lines** on the full and drop card, **≤ 2** on the binder tile; **96-char** authored ceiling (German binding) | art-bible §8 D70; `design/ux/card-detail.md` §5.3 L7 |
| `alt` | `ALT_MAX = 200` | same |
| edition, serial, stat key/value, credit; the Fantasiewerte line | one line each, ellipsis; the Fantasiewerte line ellipsises to its leading word and is never removed | art-bible §8 clamp column, R6 |
| Height-pressure order (what leaves a band first) | credit → mood → copy clamp tightens (3 → 2 lines) → the Fantasiewerte line ellipsises | art-bible §8, R6 |

**R6 — the story clamp is three lines, and band 4 is two rows (D70, #70).** The clamp column and
the band arithmetic disagreed because they described different row plans. Three sub-rows (keyword,
sentence, print line) leave **37.89 px** for copy — 91.59 − 16 padding − 8 gaps − 2 × 14.85 — which is
**2.16 lines** at 17.55 px, so a third line overruns its row by **14.76 px** and clips rather than
ellipsises. The "need 88.80 px" figure this record's source row carried was the **two-line** stack:
16 + 8 + 14.85 + 35.10 + 14.85. The ruling keeps the band and the three-line clamp and removes the
row that does not pay for itself: the sentence (≤ 3) plus the Fantasiewerte line (1) need **87.50 px**
of 91.59 → **4.09 px** slack. The keyword leaves the card face — the card's name is the heading, and
sharing the disclaimer's row was measured at **313.4 px** against a 308 px measure, so it cannot be
merged either. The binder tile clamps at **2** (16 % = 75.15 px, 40.30 px for copy); the drop card
shares the plate and therefore the clamp. Cost: no bay percentage moves and the copy contract is
unchanged, but `card.moment.label` and `card.moment.imageNote` stop rendering on the plate. Cost if
wrong: the two fallbacks are worse and both need another amendment — a two-line clamp ellipsises four
of the five measured German sentences, and a three-line band with three rows needs 22.64 %, taken
from the photograph (−7.6 % window) one day after D12a made it the largest band.

The photo band and the plate **name** never yield. `ALT_MAX` is a byte of accessibility, not
decoration: the alt text is the card's content for a reader who cannot see the window.

### 5. Byte budgets per surface

Every row names its metric. "KB" means 1,000 bytes throughout (ADR-0008).

| Surface | Budget | Metric | Gate / enforcement | Source |
| --- | --- | --- | --- | --- |
| tile rendition (360 px) | 36,000 B WebP / 55,000 B JPEG | per file, hard | gate 9 (pending, #25) | test-plan §4.3; art-bible §8; ADR-0008 §1 |
| pack rendition (720 px) | 80,000 B / 110,000 B | per file, hard | gate 9 | same |
| detail rendition (1200 px) | 150,000 B / 210,000 B | per file, hard | gate 9 | same |
| download (1600 px, explicit click only) | 350,000 B / 500,000 B | per file, hard | gate 9 | same |
| any image on the render path | ≤ the detail ceiling (150,000 / 210,000 B) | per response | gate 9 (`global` row) | test-plan §4.3 |
| CSS, shipped (scoped + `styled-system/`) | **30 KB gzip** | gzip | gate 9 | `docs/architecture.md` Performance Budget; ADR-0002; test-plan §8 gate 9 |
| CSS, uncompressed | ≤ 45 KB | minified, pre-gzip | none today | art-bible §8 |
| JS first load (incl. Svelte runtime) | **100 KB gzip hard cap**, 60 KB gzip target reported | gzip | gate 9 | `docs/architecture.md`; test-plan §8 gate 9; ADR-0009 |
| JS first load | **≤ 60 KB** | minified, pre-gzip | none today | art-bible §8 |
| Font, per woff2 (Latin subset) | **≤ 30 KB** | file bytes | none today (#35 AC) | art-bible §8 |
| Precache total | **≤ 400 KB** | compressed | gate 10 (pending, #19) | ADR-0009 §4, Performance Implications; `docs/architecture.md` |
| Service worker bundle | **≤ 25 KB gzip** | gzip | gate 10 | ADR-0009 |
| First-load total (HTML + CSS + JS + font + seal tile) | ≤ 250 KB | composite | none (target) | art-bible §8 |
| Image rungs, aim | ~20 % under each ceiling; 95–100 % of a ceiling is a **flag**, not a pass | per file | gate 9 report | art-bible §8; test-plan §4.3 |

The image numbers are not new: they are the ADR-0008 ladder, mirrored in test-plan §4.3
(`tests/fixtures/image-budgets.json`) and asserted from that fixture. ADR-0011 adds no ceiling to
them — it fixes *which* metric each non-image ceiling is stated in, which is the part that had
drifted.

### 6. Baseline — what B1 measured, and the one value that is over

| Item | Budget | Measured | Of budget | Verdict | Source |
| --- | --- | --- | --- | --- | --- |
| CSS gzip | 30 KB | **5.10 kB** | 17.0 % | pass | b0-b1 §2 build log; re-measured identical at `66afb4f` |
| CSS minified | 45 KB | **20.36 kB** | 45.2 % | pass | same |
| JS gzip | 60 KB target / 100 KB cap | **23.19 kB** (recorded) / **23.16 kB** (re-measured) | 38.6 % / 23.2 % | pass | b0-b1 §2 (`index-VlK8fAht.js`); re-measure at `66afb4f` (`index-Bw6oe3Ym.js`) |
| JS minified | 60 KB | **59.64 kB** (recorded) / **59.61 kB** (re-measured) | **99.4 %** | **flag — 0.4 % headroom, no room for B2** | b0-b1 §2, §4 ("pass, flagged at 99.4 %") |
| Chivo `chivo-latin.woff2` | 30 KB | **33,252 B (33.25 KB)** | **110.8 %** | **OVER — by 3,252 B (10.8 %)** | b0-b1 §4; `public/fonts/` |
| Ultra `ultra-latin.woff2` | 30 KB | **15,248 B (15.25 KB)** | 50.8 % | pass | b0-b1 §4; `public/fonts/` |
| HTML | — | 0.87 kB (0.46 kB gzip) | — | not budgeted | b0-b1 §2 |
| First-load total | 250 KB | ≈ 129 KB | 51.6 % | pass (no LCP tile yet) | b0-b1 §4 |

**The value that is over is the Chivo font**: 33,252 B against a 30 KB per-font ceiling. It is
inherited from v1 and its fix is glyph subsetting, tracked as **#35** ("Subset Chivo font to meet
30 KB budget", which also carries the acceptance criterion "Budget gate enforces the per-font
ceiling"). The JS *minified* figure is not over but is a flag: 59.61 of 60 kB leaves 0.39 kB, so
the B2 slice (three cards, pack theatre, foil completion) cannot add code without paying for it.

Two source-document nits, recorded so nobody re-derives them: the recorded JS figure is 23.19 kB
gzip / 59.64 kB minified and a re-measure at `66afb4f` gives 23.16 / 59.61 (a different bundle
hash; the difference is 0.03 kB, not a regression), and b0-b1 §4's first-load sum reads "CSS
20.09" where the build printed 20.36 kB — a transposition in the report, not a build difference.

### 7. Enforcement — gates, ratchets, targets

**Which gate fails the build.** Gate numbering is `docs/test-plan.md` §8.1; gate 9 is the byte
gate ("Bundle + byte budget", `scripts/budget-check.mjs`), gate 10 the PWA byte gate.

| Value | Fails the build when | Gate | Live today? |
| --- | --- | --- | --- |
| CSS gzip | > 30 KB | 9 | **no** — `budget` is `pending`, issue #25 |
| JS gzip | > 100 KB cap (60 KB target reported only) | 9 | **no** — #25 |
| Any rendered image response | > its per-format §4.3 ceiling | 9 | **no** — #25 |
| Download response | > 500,000 B JPEG / 350,000 B WebP | 9 | **no** — #25 |
| Any original served to the UI | first occurrence | 9 (ledger) | **no** — #25; also `E-PWA-06`, ADR-0008 |
| Precache total | > 400 KB compressed | 10 | **no** — issue #19 |
| `dist/sw.js` | > 25 KB gzip | 10 | **no** — #19 |
| Font, per woff2 | > 30 KB | none — #35's AC adds it to gate 9 | **no** |
| Bay overflow, CLS, strings over budget | any failure | 7 (`E-OVF-06`, `E-OVF-12`), 5 (`U-CV-01/03`) | **no** — Playwright suite is #24 |

That table is the honest state, not a wish: `.github/gates.json` enforces thirteen steps today
(canon, its self-test, table-integrity, typecheck, svelte-check, stylelint, selector-diff,
unused-css, eslint, knip, jscpd, unit, build) and lists `e2e`, `axe`, `budget`, `pwa` as `pending`
against issues #24, #24, #25, #19.
**No enforced step measures bytes**, which is why the Chivo breach is visible only in a report.
Until #25 lands, review is the gate; after it lands, this table is the gate.

**Ratchets** — values that may only fall, in the tighter of their two metrics; a rise needs an
ADR amendment, not a review comment:

- **JS minified: 59.61 kB** (0.39 kB under the art-bible ceiling). B2 additions must be paid for
  by deletion or by lazy-loading (the dictionary is the documented first suspect,
  `docs/architecture.md` "JS budget rationale").
- **Chivo: 33,252 B** — already over; #35 must bring it to ≤ 30,000 B and it may never grow
  while over.

Every other row is budget-bound rather than ratcheted: CSS has 24.9 KB of gzip headroom and 24.6
kB minified, so a CSS ratchet at 5.10 KB would block legitimate work while the budget permits it.

**Targets — reported, never gating:** the 60 KB gzip JS target; first-load total ≤ 250 KB; image
rungs aimed ~20 % under ceiling (95–100 % flags); LCP < 2.5 s mid-tier mobile (art-bible §8).

**Explicitly not budgeted here:**

- **Lighthouse.** Advisory artifact only. Its PWA category was removed in Lighthouse 12.0.0, so
  no PWA score exists to gate (ADR-0009 Context; test-plan §8 gate 10 note). A performance or
  accessibility regression is a comment, never a red pipeline.
- **LCP as a gate.** LCP < 2.5 s is a PRD §5 target; test-plan §8.1: "`LCP` tracing is advisory
  and never fails the pipeline".
- **A composite first-load number as a gate.** Its parts (CSS, JS, font, tile) are gated
  individually; the sum is a target so that one surface cannot hide behind another's headroom.
- **Frame time and animation cost.** No FPS budget exists for a static page; motion durations and
  curves are `design/art/motion-sheet.md`'s authority, not a byte or zone budget.
- **CLS as a budget job.** CLS = 0 is a hard Playwright assertion inside `E-OVF-12`, not a byte
  threshold — listed here so nobody demotes it to "advisory" alongside LCP.

### 8. Assertions this contract is testable by

| Assertion | ID | Status |
| --- | --- | --- |
| Each of the four card surfaces: bay `scrollHeight ≤ clientHeight`, `scrollWidth ≤ clientWidth`, no bay sizes to content | `E-OVF-06` | specified, suite pending (#24) |
| No horizontal document overflow at 320–2560 px viewports, 200 % zoom; no off-canvas box | `E-OVF-01..05`, `E-OVF-07` | specified, suite pending (#24) |
| 40-char single-word name wraps or truncates in the plate, never pushes the grid | `E-OVF-09` | specified, suite pending (#24) |
| Focus ring on the outermost tile is not clipped by `overflow: hidden` | `E-OVF-11` | specified, suite pending (#24) |
| Cumulative layout shift = 0 on load (media carry oriented `width`/`height`) | `E-OVF-12` | specified, suite pending (#24) |
| Character ceilings exported and enforced at view-build time; +1 truncates, exactly-at-budget does not | `U-CV-01`, `U-CV-03` | specified, suite pending (#23) |
| Truncation is one ellipsis, never mid-grapheme | `U-CV-02` | specified, suite pending (#23) |
| `focus` maps to `object-position: x·100% y·100%`; absent → `center 42%` | `U-CV-07` (last clause restated, R4) | specified, R4 restated (#56, #63) |
| Every image response ≤ its per-format ceiling and byte length ≠ the source's | gate 9, `E-PWA-06`, ADR-0008 checklist | gate pending (#25) |
| **Bay percentages equal between `tokens.ts` and art-bible §8** | — (parity check) | **missing** — #30 covers colours; extend it to `sizes.zone-*` |
| **No text baseline crosses the foil's inner edge** (card-detail L5) | — | **missing** — a geometry check, proposed as `E-OVF-13` with #13/#24 |

The two missing rows are the reason this record exists: without the parity check, the six-value
token table can silently outlive the seven-bay contract; without the rim check, "nothing crosses
the foil edge" is an opinion.

### 9. Findings from the arithmetic (for the art-director review — findings 1 and 4 closed by D12a)

These are derived from the pre-ruling numbers at the reference card (bays × 469.7 px, line-height
1.35 from `lineHeights.card`). They are not art-direction changes — they are places where §8's
own columns disagreed with each other, surfaced rather than resolved silently.

| Finding | Arithmetic | Effect | Owner of the fix |
| --- | --- | --- | --- |
| The 15 % plate could not hold its own clamp column — **resolved (D12a, #47)** | band 70.5 px − 16 px padding − 8 px gaps = **46.5 px** available; number + name (1 line) + mood = **55.4 px**; number + name (2 lines) + mood = **81 px** | At the reference card the plate rendered **number + one name line** (40.5 px), `mood` dropped by the pressure order. D12a answers it: plate **15.5 %** in **two rows** holds number + name + mood **and the rarity chip** with **6.16 px slack** (52.81 px content vs 46.65 px need), and the name clamps to one line with ellipsis | closed by #47 (art-director) |
| The strip and foot px floors overrun 100 % | 4.5 % = 21.1 px vs floors 24 / 22 px → **+3.73 px** on a 469.7 px plate | Resolved by R3 (gutters absorb 3.73 px); without R3 the plate would clip the foot by 3.7 px. Moot under D12a — the new bands (strip 5.5 %, foot 5 %) carry the floors with no payer | technical-director (R3, ruled above) |
| The 22 % copy bay holds 2 story lines, not 3 — **closed by D70 (#70)** | 103.3 − 24 = **79.3 px**; keyword + 3 lines + print = **82.4 px** → 3 lines need **22.6 %**. At D12a's 19.5 % the same three-row stack leaves **37.89 px** = 2.16 lines, and the "need 88.80" row was the two-line stack | The clamp was never arithmetically true: three sub-rows plus three lines needs 22.64 %. D70 buys the third line by removing the keyword row — two rows leave 56.74 px against 52.65 px needed, 4.09 px slack — and leaves every bay percentage alone | closed by #70 (art-director + ux-designer) |
| The 31 % photo band shrank the lit object by a third — **resolved (D12a, #47)** | 145.6 px band − 16 px padding = 129.6 px tall → **103.7 px wide** vs the **160.05 px** measured in the 46 % band | The photograph — "all light, sheen and motion belong to the card under study — and within the card, to Elsa's photograph" (art-bible §1), "the only lit object in the room" (`card-detail.md` §5.3 item C) — would have lost 35 % of its width. D12a answers it: photo **41.5 %** with no block padding gives **155.94 px = 45.87 %** of card width, a **2.6 %** reduction from 160.05 px, not 35 % | closed by #47 (art-director) |

The last row was the one to read twice, and it is the reason this record exists in the form it
does. ADR-0011 ratifies §8 because the bay table is the art director's instrument; the tension
between §1's "the photograph is the lit object" and the pre-ruling 31 % was surfaced rather than
silently resolved, and the visual owner then resolved it — **D12a / #47** moves the band to 41.5 %
and keeps a 155.94 px window. The ADR records that ruling; it did not derive it.

## Consequences

**Positive**

- One grid, one owner, one test. The seven-bay table is the contract, `tokens.ts` is a mirror of
  it, and #30 extended by one row turns "the bible and the code agree" from review discipline into
  a red gate.
- Every byte budget now names its metric, so "we are at 99.4 %" and "we are at 38.6 %" can no
  longer both be cited about the same 60 KB. The metric ambiguity that reached issue #35 cannot
  recur silently.
- The overflow defect class is closed against the *string* axis as well as the box axis:
  character ceilings at build time, clamps in CSS, `scroll`-vs-`client` assertions in e2e, and a
  declared order for what leaves a band. A future content edit cannot re-open it by being long.
- The measured baseline is written down with the breach named, so the Chivo overrun has a
  record, an issue (#35) and an acceptance criterion that includes the gate.

**Negative / accepted costs**

- **Both pre-ruling losses are withdrawn (D12a, #47).** The plate holds number + name + mood in two
  rows with 6.16 px slack, and the photograph shrinks **2.6 %** (160.05 → 155.94 px) rather than the
  35 % the pre-ruling table implied; findings 1 and 4 in §9 are closed.
- **The ruling is the visual owner's**; the ADR ratifies it rather than deriving it.
- **R6 costs the card face its keyword row (D70).** `card.moment.label` ("Elsa-Moment") and
  `card.moment.imageNote` no longer render on the plate; the sentence clamps at 3 lines on the full
  and drop card and 2 on the tile, and the Fantasiewerte line is band 4's last row, directly above
  the chips. No bay percentage moved, and the copy contract (96 characters authored) is unchanged —
  it was always a three-line contract, and the spec now says so.
- **#47 (D12a) has merged**; the bands in `design/art/art-bible.md` §8 are the contract, and §1's
  table is the superseded pre-ruling state. #13 (B2) implements §8.
- **Two ratchets bite immediately**: JS may not grow before B2 pays for growth by deletion or
  lazy-loading, and Chivo may not grow at all. Both are deliberate — the alternative is discovering
  the ceiling at release.
- **The byte gate does not exist yet.** Until #25 lands, this ADR is enforced by review and by the
  baseline table. That is a weaker guarantee than the record claims for itself, and it is stated
  rather than implied.
- **`CardFace.svelte` still renders six rows** until #13 lands: the token mirror is correct
  after #47 (`tokens.ts:342-348`, seven bays incl. `zone-gutters`), but the component's
  `grid-template-rows` still lists 17 / 46 / 7 / 15 / 10 / 5 % and no gutters bay. #13 replaces
  the rows; #30 adds the parity test. ADR-0011 does not fix code; it names the gap.

## Performance Implications

- **Delivery bytes, the numbers that reach a phone**: tile ≤ 55,000 B JPEG / ≤ 36,000 B WebP, pack
  ≤ 110,000 / ≤ 80,000, detail ≤ 210,000 / ≤ 150,000, download ≤ 500,000 / ≤ 350,000 (test-plan
  §4.3, ADR-0008). A pack of four cards at the pack rung is bounded at 4 × 80,000 B WebP worst
  case; the detail dialog at 150,000 B WebP replaces the 3.98 MB source that v1 served.
- **Application bytes**: CSS 5.10 kB gzip and JS 23.16 kB gzip measured today, against 30 KB and a
  100 KB cap — 83 % and 77 % of headroom. The binding constraint on JS is the *minified* ceiling
  (99.4 % used), which is why §5 budgets both metrics: a page can be far under its wire budget
  and still at its code budget.
- **Precache**: ≤ 400 KB compressed total (ADR-0009) must hold the shell, hashed JS/CSS, fonts
  (48.5 kB today, 33.25 kB of it Chivo), icons and the manifest — the two fonts are 12 % of that
  envelope on their own, so #35 buys precache headroom, not just tidiness.
- **Layout stability**: zero CLS is a hard assertion, carried by oriented `width`/`height` on every
  derivative (manifest-reported, ADR-0008) and by the fixed bay grid — a bay that sizes to content
  is both the overflow defect and a CLS source.
- **Runtime cost of the frame**: none. The grid is static CSS, the foil is masked gradients with no
  layout contribution, and no budget here adds a request, a decoder or a dependency.

## Alternatives Considered

1. **Ratify the shipped six-zone split (17 / 46 / 7 / 15 / 10 / 5) instead of §8's seven bays.**
   Rejected: the photograph's 46 % band produces the card that already works, but the six-zone
   split has no gutters bay, so the 4–8 px gutter steps are implicit padding and invisible to any
   percentage assertion — and it is not the table the art director signed. Ratifying code over the
   bible also inverts the authority that AD-ART-BIBLE exists to protect. Cost of the choice taken:
   the findings in §9 become real.
2. **Move the plate to 17 % inside this ADR.** Rejected: the bay table is art direction. A
   technical record that edits a percentage converts every future visual debate into a technical
   one and leaves the bible stale — the exact drift #30 is being built to catch.
3. **One JS budget in one metric ("60 KB gzip") to end the confusion.** Rejected: it silently
   loosens a ratified art-bible ceiling by roughly 2.5× on the wire (60 KB gzip ≈ 150 kB
   minified). Keeping both metrics with an explicit "the tighter binds" is stricter than either
   single reading, and it costs one sentence to explain.
4. **Keep the byte budgets as prose targets and let perf review catch regressions.** Rejected on
   the project's own evidence: the sub-4.5:1 `--quiet` token shipped precisely because a rule
   lived in review rather than in a gate (ADR-0002's Context), and the Chivo breach is already
   sitting in a report with no gate to fail.
5. **Set ratchets at every measured value (CSS gzip 5.10 kB, HTML 0.87 kB, …).** Rejected: a
   ratchet only earns its friction where a surface has no headroom. A 5.10 kB ratchet under a
   30 KB budget would block legitimate work and invite the waiver habit that erodes gates; the
   two surfaces at or over their ceilings are the ones that need it.
6. **Budget the composite first-load total instead of its parts.** Rejected: a composite hides
   which surface grew, so a CSS regression can be paid for by a JS saving and pass. Parts are
   gated; the sum is a target.
7. **Let the validator decide "valid card width" empirically per viewport.** Rejected: the
   contract needs a stated range (180–340 px) to test against, otherwise "no overflow" is true
   only for the viewports someone remembered to add.

## Validation Checklist

Each line is either an existing test ID or an explicit gap with its ticket.

- [ ] Seven bays in `tokens.ts` match art-bible §8 one-for-one, and each column sums to 100 %
      (parity check; #30 extended, #13 implements).
- [ ] `E-OVF-06` green at maximum permitted strings on all four surfaces; `scroll`-vs-`client` on
      every bay, not just the card box (#24).
- [ ] Band 4 renders **≤ 3 lines** with no clipped partial line at every width in the geometry
      sweep, DE and EN (2 on the tile), and the Fantasiewerte line is present whenever stats are
      (`E-OVF-06` extended; D70 / #70, proved by T9's slice).
- [ ] `E-OVF-01..05`, `E-OVF-07`, `E-OVF-09`, `E-OVF-11`, `E-OVF-12` green — no document overflow,
      no off-canvas box, no clipped focus ring, CLS 0 (#24).
- [ ] `U-CV-01`, `U-CV-02`, `U-CV-03` green: ceilings exported, single ellipsis, +1 truncates (#23).
- [ ] `U-CV-07` green **with the R4 restatement**: absent `focus` → `center 42%`, not `50% 50%`.
- [ ] Rim intersection check exists and is green: no text baseline crossing the foil edge, 4 px
      common / 7 px holo (proposed `E-OVF-13`; #13 for the 7 px rim, #24 for the test).
- [ ] `scripts/budget-check.mjs` fails on: CSS gzip > 30 KB, JS gzip > 100 KB, any render response
      over its §4.3 ceiling, download over 500,000 B JPEG / 350,000 B WebP, any original in the
      ledger, and **any woff2 > 30 KB** (#25, #35).
- [ ] A seeded overrun of each row above turns gate 9 red — negative proof recorded, as the
      contrast gate required of itself (#25).
- [ ] Precache ≤ 400 KB compressed and `dist/sw.js` ≤ 25 KB gzip are asserted, not measured by hand
      (#19).
- [ ] Chivo ≤ 30,000 B with DE/EN glyph coverage and no missing diacritics (#35).
- [ ] JS minified ≤ 60 kB after B2, or the addition is paid for by a deletion or a lazy `import()`
      (ratchet; #13).
- [ ] `docs/architecture.md` "Performance Budget" carries the metric column from §5, and
      `card-detail.md` L2/L6 no longer state 0.58 or `≤ 720 px` (stale against ADR-0008).

## Sources

Every number in this record comes from one of these, and the table rows name which:

- `design/art/art-bible.md` — §3 (ratios, silhouette, window-ratio, anchor), §5 (photo
  selection, LOD), §7 (type scale, floors, pressure), §8 (bay table, clamps, content budgets,
  rendition ladder, byte budgets, em root).
- `docs/test-plan.md` — §4.3 (image budget constants), §5.8 (`U-CV-*`), §6.7 (`E-OVF-*`), §8.1
  (gates 1a–10 and the advisory notes).
- `docs/architecture.md` — Performance Budget, Known-Defect Prevention Matrix, ADR Audit,
  Required ADRs.
- `docs/adr/ADR-0002-styling-system.md` (CSS gzip budget, token authority),
  `ADR-0004-manifest-contract.md` (`focus`), `ADR-0008-image-derivatives.md` (ladder, 1 KB =
  1,000 B, no-original), `ADR-0009-pwa.md` (precache, `sw.js`, device budget).
- `design/tokens/tokens.ts` — `sizes.zone-*`, `sizes.card-min|card-max|photo-anchor|card-root`,
  `aspectRatios`, `radii`, `lineHeights`, `fontSizes`.
- `src/lib/components/CardFace.svelte`, `src/lib/domain/card.ts` — the shipped frame, rim width,
  window sizing, `CardPhoto.focus`.
- `docs/build/b0-b1-verification.md` — §2 build log and rendered check, §4 budget table, §5
  deviations 7–8.
- `.github/gates.json` — which gates are enforced and which are `pending` (#19, #24, #25).
- `docs/decisions.md` D-08; `AGENTS.md` ownership matrix and canon.
- Measurements taken for this record: `npm run build` at `66afb4f` (Node 26.13.1) → CSS
  20.36 kB / 5.10 kB gzip (bundle hash unchanged), JS 59.61 kB / 23.16 kB gzip; `public/fonts/`
  byte sizes (33,252 B and 15,248 B).
- Measurements taken for R6 (#70, 2026-11-22) — Chromium 159 via Playwright,
  `public/fonts/chivo-latin.woff2` with the font load asserted before any read, against the 308 px
  story measure at 13 px / 1.35: German sentences of 92 / 98 / 103 / 124 characters render three
  lines, 89 characters renders two; the 38-character Fantasiewerte line is **205.1 px** at 11 px; a
  12-character keyword plus that line is **313.4 px** against 308 px; the ruled two-row band needs
  **87.50 px** of 91.59 and the rejected three-row band leaves 37.89 px for copy.
