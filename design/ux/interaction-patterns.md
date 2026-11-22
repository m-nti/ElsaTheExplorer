# Interaction Pattern Library

> **Status**: In Design (v2 — explorer reframe, full-refactor scope; supersedes the v1 patch-on-markup draft)
> **Author**: ux-designer
> **Last Updated**: 2026-11-22
> **Version**: 2.0
> **Engine**: None — plain Vite 8 app: **Svelte 5** (5.59.1, runes) + **TypeScript 7.0.2 strict** + **Vitest 5.1.1** + **Playwright 1.65.1**; built locally, deployed statically to IONOS (no SvelteKit, no SSR)
> **UI Framework**: Svelte 5 components + native `<dialog>` + WebAudio (synthesized, zero audio assets) + **Panda CSS (zero runtime)** for typed design tokens and variant recipes; bespoke foil art stays in Svelte component-scoped CSS (custom properties & container queries). No runtime CSS-in-JS, no utility frameworks (no Tailwind).
> **Platform**: Web, desktop + mobile browsers · **Inputs**: mouse, touch, keyboard · **No gamepad**
> **Runtime data**: `photos.php` stays the **runtime manifest source** (owner FTP-drops photos, no redeploy); `photos.json` is the static fallback. Manifest gains optional `set`, `focus`, `chase` fields, backward compatible.
> **Related Documents**:
> - `PRD.md` — product requirements (F1–F26), personas, constraints
> - `design/player-journey.md` — the explorer journey phases that consume these patterns
> - `design/accessibility-requirements.md` — Standard tier commitments this library implements (keyboard-complete, visible focus, 4.5:1 contrast, reduced motion, screen-reader announcements, no color-only information)
> - Craft reference for tilt/flip/foil: `holo-card-ref.html` (pointer radial-mask foil study) — its measured values are cited below as the tilt/foil baseline

> **Why this document exists**: Every screen spec and journey phase should be
> able to say "uses Pack-Open Button pattern" rather than re-specifying hover
> states, reveal choreography, focus handling, and screen-reader announcements
> from scratch. This library is the single source of truth for reusable
> interaction behaviors. When a screen spec references a pattern name, the
> implementer looks it up here. When the behavior changes, it changes here and
> applies everywhere.
>
> **Scope note — this is a refactor spec, not a patch list.** The current
> markup and `app.js` are the behavior reference, not the architecture. Any
> part of the flow may be redesigned; only what earns its place survives:
> the photo→card pipeline, the unseen-first walk, holo-as-material,
> DE/EN parity, no-tracking localStorage persistence, static hosting. The
> last "Open-card fit and pack theatre" block in `assets/css/style.css` is
> the active layout precedent; the earlier `.lightbox` rules are dead and the
> refactor removes them.
>
> **Status definitions**:
> - **Draft**: Interaction specified but not yet implemented or validated
> - **Stable**: Implemented, tested, and validated in at least one shipped screen
> - **Deprecated**: Being phased out — do not use in new screens

---

## Overview

**Elsa the Explorer** is a one-page card library — a Sammelwerk in a dark
collector's parlour: the room is night-dark, and the card is the only lit
object. The interaction surface is small and must stay small: one page, two
dialogs, a grid, a handful of toggles, one material system. Every pattern
below is either (a) behavior proven in v1 and carried into the refactor
because it earns its place, or (b) a decided refactor behavior (reveal order,
department progress, milestones, tilt/foil material, confirmation reset)
specified here ahead of implementation.

Non-negotiable constraints that shape every pattern:

1. **First-party only**: no cookies, no analytics, no third-party requests at
   runtime. Storage is `localStorage` keys `lucky-elsa.seen.v2`,
   `lucky-elsa.sets.v1`, `lucky-elsa.flags.v1` (collection state) plus the
   existing `lucky-elsa.lang.v2` and `lucky-elsa.sound.v2` (preferences).
2. **Bilingual everything**: every string a pattern can emit exists in the
   i18n copy deck in both languages, key-aligned. German is the default; the
   household *du* register, museum-catalogue dry humor, no marketing voice.
   The brand name **Elsa the Explorer** is fixed; taglines localize.
3. **Reduced motion is a first-class state**: with
   `prefers-reduced-motion: reduce`, all four cards render in the final grid at first paint, one soft tick, no `inert` phase, no
   foil movement, no confetti. Every pattern names its fallback explicitly.
4. **No color-only information**: rarity, progress, and state are always
   carried by text, shape, or count as well.
5. **Sound is an enhancement layer, never a gate**: synthesized WebAudio,
   toggleable, state remembered, silent when blocked.

### How to Use This Library

**If you are designing a screen**: Browse the Pattern Catalog Index below
before inventing new interactions. When a pattern fits, reference it by name
in the screen spec (e.g., "the confirm button uses Reset with Confirmation
pattern"). When no pattern fits, propose it here before the screen spec that
introduces it.

**If you are implementing**: When a spec says "use [PatternName] pattern,"
find it here. The Implementation Notes name Svelte 5 component boundaries and
runes where behavior demands it, but the state tables, roles, timings, and
target sizes are framework-light and hold regardless.

**If you are reviewing a spec**: Verify that all interactive elements
reference a pattern from this library or include their own full interaction
specification. "Standard button" is not a valid reference.

**If you are updating a pattern**: Audit all usages first (search specs for
the pattern name), and update this document before or simultaneously with any
implementation change.

---

## Pattern Catalog

### Pattern Catalog Index

| Pattern Name | Category | Description | Used In (Screens) | Status |
|-------------|----------|-------------|------------------|--------|
| Pack-Open Button (Primary) | Input | The page's one primary call-to-action: stage trigger + pack seal | Stage (entrance), Pack Dialog footer, Lightbox ("Noch ein Pack") | Draft |
| Dialog Open / Close | Navigation | Native `<dialog>` lifecycle for pack dialog and card lightbox | Pack Dialog, Card Lightbox | Draft |
| Focus Trap (Dialog) | Navigation | Focus rules while a modal dialog is open | Pack Dialog, Card Lightbox, Reset Confirmation | Draft |
| Card Reveal Step | Game-Specific | The four-card haul sequence with choreographed order | Pack Dialog | Draft |
| Card Tilt & Foil Material | Game-Specific | Holo-as-material: pointer tilt + layered foil response | Card Lightbox (exhibit card); static foil on tiles/drop cards | Draft |
| Card Flip | Game-Specific | Exhibit card flips over like a physical object | Card Lightbox | Draft |
| Card Browsing (Arrows / Swipe) | Navigation | Walk the collection from inside the lightbox | Card Lightbox | Draft |
| Pack Roving Arrows | Navigation | `←`/`→` roving over the settled drop cards, `↑`/`↓` row-jump in the 2 × 2 (pack dialog only) | Pack Dialog | Draft |
| Share Button | Input | Native share sheet with clipboard fallback | Card Lightbox, (later: Elsas Ehrenmensch) | Draft |
| Save / Download Link | Input | Download the original photo | Card Lightbox | Draft |
| Reset with Confirmation | Input / Feedback | Destructive "Von vorn" behind a one-line confirmation | Binder header | Draft |
| Language Toggle (DE / EN) | Input | Two-button pressed-state pair in the masthead | Masthead | Draft |
| Sound Toggle | Input | On/off toggle with remembered state | Masthead | Draft |
| Progress Bar | Feedback | Overall "gesammelt" progress with numeric label | Stage, Lightbox (dialog copy) | Draft |
| Set Progress Line | Feedback / Layout | Per-department progress row with frontier and completion state | The Collection (set section headers) | Draft |
| Zuwachs Accession Line | Feedback | The acquisitions notice — DE: *"{n} neue Schmuckstücke sind da!"* / EN: *"{n} new treasures have arrived!"* (cap 44; copy-deck sync 2026-11-22) | Stage, Catalogue header | Draft |
| View Toggle | Input / Navigation | Segmented Alle Karten ↔ Nach Räumen view switch | The Collection (header) | Draft |
| Collection Grid Tile | Game-Specific | Button tile in the collection grid, all states | The Collection | Draft |
| Catalogue Grid Roving Arrows | Navigation | Arrow-key roving over catalogue tiles; `Tab` still leaves the grid | The Collection (flat + grouped) | Draft |
| Keyboard Shortcut | Input | Global single-key actions (`P`, `F`, arrows) | Global (page + lightbox) | Draft |
| Close Button | Input | Icon-only dialog dismissal | Pack Dialog, Card Lightbox | Draft |
| Live Region Announcement | Feedback | The two regions of ADR-0010 §1 — `#live-status` (polite) and `#live-alert` (assertive) — for non-focus events; the share status line is plain text, the same string announced | Global, share status | Draft |
| Empty State | Feedback | Designed "nothing here yet" that tells the curator what to do | Binder grid | Draft |
| Loading State | Feedback | "Karten werden gesucht" while the manifest resolves | Stage, Binder | Draft |
| Error State | Feedback | Soft failure copy; never the reader's fault | Binder, Lightbox (share) | Draft |

---

## Patterns

### Primary Action Patterns

---

#### Pack-Open Button (Primary)

**Category**: Input
**Status**: Draft
**When to Use**: The single most important action of a screen — at most one visible at a time. The stage has exactly one ("Pack öffnen / Open a pack" — explorer-register variant under review: *"Auf Expedition gehen / Begin an expedition"*); the card lightbox has exactly one ("Noch ein Pack / Another pack" — variant: *"Nächste Expedition / Next expedition"*). This pattern also covers the **pack seal** — the big illustrated pack — which is the same action wearing the parlour's costume. Button and seal trigger the identical handler.
**When NOT to Use**: For secondary or destructive actions; more than once per screen; as the reset trigger (that is Reset with Confirmation); for the language or sound toggles.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default | Filled foil-accented surface, action label; the seal shows the lit pack with crest and series word | — | — | — | — |
| Hovered | Slight brightness lift; seal tilts toward the pointer (see Card Tilt & Foil Material) | Pointer over | Surface transition | 80 ms ease-out | none (deliberate: hover silence avoids fatigue on a chat-link site) |
| Focused | Visible focus ring, ≥3:1 contrast against adjacent colors, offset ≥2 px | Tab / Shift+Tab | Ring transition | 80 ms ease-out | none |
| Active / Pressed | Scale 0.98; seal starts its tear animation | Pointer down / Space / Enter on focused control | Opens the pack (see Card Reveal Step) | 60 ms down / 80 ms up | Pack Rip (once) |
| Opening / Busy | Label swaps to "Pack wird geöffnet / Opening the pack"; trigger and seal `disabled`; pack dialog already open | — | Haul sequence runs; re-entry locked | whole opening (~4.1 s, pack-opening §10.1) | Rip + per-card ticks |
| Disabled | Reduced-opacity fill, no hover/press affordances, `disabled` set | — | No response; label reads "Noch keine Karten / No cards yet" in empty state | — | — |
| Error | No separate error state: with no photos the trigger *is* the empty state (label + disabled) | — | Binder shows the curator-directed Empty State | — | — |

**Accessibility**:
- Real `<button type="button">`; the seal is a `<button>` with a text-bearing accessible name — DE: *"Ein Pack Elsa-Karten öffnen"* / EN: *"Open a pack of Elsa cards"* — never an unlabeled image button.
- Busy state additionally announced via the global live region: *"Das Pack geht auf."* / *"Opening the pack."*
- Target size ≥ 44 × 44 CSS px (stage trigger is larger); the seal is the largest target on the page.
- Keyboard shortcut `P` fires the same handler (see Keyboard Shortcut pattern); the hint copy — DE: *"Drück <kbd>P</kbd>, um ein Pack zu öffnen."* / EN: *"Press <kbd>P</kbd> to open a pack."* — sits directly under the button.
- Disabled state must never rely on opacity alone: the label text changes.

**Animation spec** (reduced-motion fallback): press scale and hover lift are replaced by an opacity step; the seal's tear animation is skipped and the dialog opens with cards already laid out.

**Implementation Notes** (Svelte 5): One action, two triggers — implement as a shared `openPack()` in a `deck.svelte.ts` store (runes: `$state` for `opening`), invoked by both the stage button and `<PackSeal>`. The busy lock is a single `$state.opening` read in one `$effect`-guarded handler; the label swap is a derived value. Do not use `aria-busy` on the button; the live region carries it. Haul rules (no dupes, unseen-first, ≥1 holo, reveal order) live in a pure `lib/deck.ts` module so **Vitest** can assert them; **Playwright** covers the click path.

---

#### Dialog Open / Close

**Category**: Navigation
**Status**: Draft
**When to Use**: Both modal surfaces: the **pack dialog** (title "Dein Neuzugang / Your new arrival") and the **card lightbox** (the study table). Use whenever content must be resolved in context — a haul being examined, one exhibit being read — without losing the page beneath.
**When NOT to Use**: For non-blocking feedback (use the Live Region / status line); never stack open state — the lightbox may open *over* the pack dialog, but closing order and focus must always resolve to exactly one dialog.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Opening | Dialog scales from 0.96 + backdrop fades to night-dark veil | `showModal()` from trigger | Open | 200 ms ease-out | soft single tick (modal-open variant, quieter than card ticks) |
| Active | Backdrop blocks pointer + keyboard access to the page; page behind must not scroll | — | — | — | — |
| Pack dialog — dismiss (explicit) | — | Close button (✕), or `Escape` | Dialog closes; focus returns to the stage trigger. **Live at any time, including mid-reveal — closing mid-reveal is a deliberate skip** (see below) | 160 ms ease-in | modal-close (subtle downward tick) |
| Pack dialog — mid-reveal | Tear animation running, `opening === true` | Backdrop click | **Ignored — mis-tap protection.** The backdrop is inert during the reveal; a stray tap on the veil must never kill the haul | — | — |
| Pack dialog — skip semantics | — | ✕ or `Escape` mid-reveal | Deliberate skip: the reveal stops, audio stops, cards already revealed are marked "gesammelt", the remainder is not; **the pack can be reopened immediately — no cooldown, no lock** | 160 ms ease-in | modal-close |
| Card lightbox — dismiss (explicit) | — | Close button, `Escape` | Closes; focus returns to the tile that opened it | 160 ms ease-in | modal-close |
| Card lightbox — dismiss (implicit) | — | Click on the backdrop itself (only when `event.target === dialog`) | Same as explicit close | 160 ms ease-in | modal-close |
| Inert input (pack dialog, mid-reveal) | — | Backdrop click only | Ignored; ✕ and `Escape` remain live — the close button is never disabled during the reveal | — | — |

**Accessibility**:
- Native `<dialog>` + `showModal()` only — never a `div`-based overlay. `aria-labelledby` points at the dialog's `<h2>` ("Dein Neuzugang / Your new arrival"; card name in the lightbox).
- `Escape` always closes an open dialog (native) — including mid-reveal, where it is the keyboard path for the deliberate skip.
- On close, focus returns to the trigger context — see Focus Trap (Dialog).
- Deep-link open (`?photo=<id>`): the lightbox opens on load without a prior trigger; closing it returns focus to the stage trigger.
- URL behavior: opening a card writes `?photo=<id>` (via `replaceState`); closing removes it. The pack dialog does not touch the URL. One-line rule: patch only the `photo` param on a URL built from `location.href` — `location.hash` is never assigned, so a `#ausstellung/…` fragment survives (full rule: Card Browsing → URL & fragment preservation).

**Animation spec** (reduced-motion fallback): open is `--elsa-dur-dialog-in` **200 ms** `--elsa-ease-out`, close is `--elsa-dur-dialog-out` **160 ms** `--elsa-ease-in` (faster than it opens), both from `design/art/motion-sheet.md` §3. Reduced motion: scale is dropped, opacity remains — a ~100 ms fade, no scale, both ways (motion-sheet §5).

**Implementation Notes** (Svelte 5): `<PackDialog>` and `<CardLightbox>` wrap the native `<dialog>`; keep the backdrop-click guard on the lightbox. On the pack dialog, bind the backdrop-click guard **only when `opening === false`** — during the reveal the backdrop is deliberately inert (mis-tap protection), after reveal-complete everything is live (backdrop click closes, same as the lightbox). ✕ and `Escape` are never disabled; the close handler performs the skip bookkeeping (stop audio, mark revealed cards "gesammelt", discard the rest). On the `close` event, restore focus inside a microtask after the native reset so the refocused target wins. Watch the one trap: the "Noch ein Pack" button closes the lightbox and reopens the pack dialog within ~160 ms — the focus chain must land on the reopened pack dialog, not the page.

---

#### Focus Trap (Dialog)

**Category**: Navigation
**Status**: Draft
**When to Use**: While any modal dialog is open — pack dialog, card lightbox, reset confirmation. Native `<dialog>` provides the base; this pattern specifies what must be verified on top of it.
**When NOT to Use**: Never outside a modal context. The collection grid and stage are not trapped — `Tab` walks the page freely.

**Interaction Specification**:

| Rule | Specification |
|------|---------------|
| Initial focus on open | Pack dialog → the dialog element, then first interactive control on first `Tab`. Lightbox → the dialog element (so the card content is announced first). Reset confirmation → the **Cancel** button (safer default). |
| Cycling | `Tab` / `Shift+Tab` cycle within the dialog only (native `showModal`; verify, don't assume — especially with disabled-during-reveal controls in the pack dialog). |
| Background inert | Page behind the dialog is unreachable by keyboard and click (native modal behavior). No `inert` polyfill needed while `<dialog>` is used. |
| Return focus on close | Pack dialog closes → stage trigger. Lightbox closes → the exact card in the haul that opened it, else the pack dialog's close button, else the stage trigger. Reset confirmation closes → the "Von vorn" button. |
| Focus visibility | Every focusable element inside dialogs shows the same focus ring as the page (≥3:1 contrast, ≥2 px offset). |
| Focus after state change | When a card is re-rendered (language switch), focus is re-anchored to the replacement node, never dropped. |

**Accessibility**: This pattern *is* an accessibility pattern; the rules above are the requirement, not a supplement. Screen readers announce the dialog by its title on open (native with `aria-labelledby`).

**Animation spec**: n/a — no motion.

**Implementation Notes** (Svelte 5): Manage focus targets with `bind:this` element refs held in a small `focus.svelte.ts` store (`lastTrigger`), returned to inside a `$effect` on dialog close. Safari ≤ 15 has known `<dialog>` focus quirks — verify and note; if broken, a minimal focus-trap helper is the fallback (tracked in Open Questions).

---

### Pack & Card Patterns

---

#### Card Reveal Step

**Category**: Game-Specific
**Status**: Draft
**When to Use**: Every pack opening, inside the pack dialog. This is the Sammelwerk's signature interaction and the choreography is canonical.
**When NOT to Use**: Nowhere else. The collection never animates its tiles into place as a "reveal"; that would cheapen the haul moment.

**Canonical order rule** (design canon — implemented in the draw, not the CSS): within a pack of four (**4-card canon 2026-11-22**; this rule was written for a pack of five and is renumbered, not re-designed), **the holo/rare card always lands in position 3 or 4, never first**. Draw with the existing guarantees (no dupes inside a pack, unseen-first walk, ≥1 holo via promotion), then *order* the four for reveal: commons/rare fill positions 1–2, the highest-rarity card takes position 3 or 4 (coin flip). Two non-common cards: higher rarity last. The chase card — Das Hauptporträt / The Portrait of Record — follows the same rule and outranks everything visually via its gold-glint frame (manifest `chase: true`).

**Interaction Specification**:

**The model — one card in focus, then the next, then the camera pulls back.** The reveal is no longer a staggered render of the whole row: it is a **focus beat per card** followed by a single pull-back into the settled grid (2 × 2 at ≤ 760 px, one row at ≥ 761 px). The composition — the reveal clock, beat order, and totals — is `design/ux/pack-opening.md` §10.1; the durations are the `--elsa-*` tokens of `design/art/motion-sheet.md` §3. The table below quotes those values so a reviewer does not have to open two files; **the sheet owns them, and a value changes there first.**

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Theatre (sachet) | Sachet tears at centre viewport; the stage sits at `focus(0)`, still empty and `inert` | Pack open | Tear + flash; no card on the stage yet | 900 ms ease-out (theatre keeps its own keyframes — `pack-opening.md` §10) | Pack Rip |
| Focus beat, card 1 — then ×3 | **One card** arrives in the focus frame (short edge at 74 % of the stage, anchor 50 % / 42 %): `translateY` 6 %→0, `scale` .96→1, opacity 0→1; counter reads `i von 4`; the card just left is behind the camera | Timed on the reveal clock (no user input) | Card's own line written to the live region; card **not** yet interactive (stage `inert`) | `--elsa-dur-cardin` **300**, `--elsa-ease-soft`; then `--elsa-hold-beat` **260** of stillness | Card Tick **on the settle frame**; Rare Chime / Holo Shine for a non-common |
| Hand-off / camera move, focus → focus (×3) | Dolly to the next plate's solved anchor; the next card's entrance starts while the camera is still moving, so the seam is hidden | Timed | — | `--elsa-dur-focus` **380**, `--elsa-ease-focus`; next card enters at `--elsa-overlap` 35 % (≈ **133 ms** before arrival) | none — *the camera is silent* (motion-sheet §7) |
| Highest-rarity arrival (pos. 3/4) | Strongest foil material; one 520 ms glint flourish when the holo lands (fires only after the last tile settles) | Timed | Same beat, plus the glint | `--elsa-dur-flourish` 520, once per pack, holo only; **no canvas confetti** (motion-sheet §8) | Holo Shine |
| Pull-back (`c: 1 → 0`) | The 2 × 2 / 1 × 4 becomes visible; each card travels into its own cell — 8 px lift-in, 40 ms forward stagger (max 4) | Card 4's settle frame — **no extra beat** (the settle *is* the beat) | `pack:pullback-complete` at `c = 0`; the last ~290 ms is pure stillness | `--elsa-dur-pullback` **760**, `--elsa-ease-pullback`; tile settle `--elsa-dur-tile` **260** starts at +12 % (+91 ms) and finishes before rest | per-card sound on each tile settle; **no whoosh** |
| `inert` during the reveal | The stage (and its cards) takes neither focus nor pointer events for the whole sequence; nothing that is still moving or about to be left behind is reachable | whole reveal | Mis-tap and mis-focus protection only — **✕ and `Escape` stay live** (the deliberate skip path) | — | — |
| Settled / live | Grid, all four cards interactive; stage un-`inert`ed and focus moved to card 1 in the same frame; counter `4 von 4`; hint line visible: "Tippe eine Karte an." / "Tap a card." (copy-deck sync pending: the old swipe clause has no consumer now that the reveal is not a carousel) | `pack:pullback-complete` | Cards openable → Card Lightbox | hint + footer `--elsa-dur-fade` 140 | — |
| Reduced motion | **All four cards render in their final grid at first paint** — the pull-back's final frame: no theatre, no camera, no focus sequence, no card entrance, no burst, foil static at centre | Pack open | Everything live from the first frame (no `inert` phase at all); counter reads `4 von 4`; hint and footer visible from the start | 0 ms | Rip and per-card ticks skipped; **one soft tick at t = 0**, no chime |
| Fewer than 4 photos | Haul = every photo; the focus beats simply number fewer (`i von n`); grid is `n` cells | — | Same rules, `PACK_SIZE = min(4, photos)` | same tokens | as above |
| Second lap (all seen) | Each card wears the "2. Auflage / Second edition" stamp; restart announced before the reveal: "Das waren alle Karten. Jetzt beginnt das Pack von vorn." / "That was every card. The pack starts over." | — | Same sequence | same tokens | as above |

**Pacing total** (quoted from `pack-opening.md` §10.1, not decided here): cards 1→4 ≈ 2.39 s; first card to fully live ≈ 3.15 s; from trigger to live with the 900 ms theatre ≈ 4.05 s — inside the sheet's 3.2 s reveal ceiling. A beat that needs more than its token is **cut, not stretched** (motion-sheet §3).

**Accessibility**:
- The drop row is an `<ol>` with `aria-label` "Die Karten aus diesem Pack" / "The cards in this pack"; each card is a `<button>` with a full accessible name: number, name, rarity — DE: *"Karte 04 öffnen: Hüterin der verlorenen Socken"* / EN: *"Open card 04: Keeper of the Missing Socks"*.
- **One announcement per beat, plus an authoritative summary.** Each card's line — "Karte {i} von {n}: {name}. {rarity}." — is written at that card's **settle** frame; the completion summary `pack.summary` ("{n} Karten: {names}." / "{n} cards: {names}.") is written **once, at the pull-back end**. Writes replace rather than queue (rapid polite writes), so a slow reader may hear only the last per-card line — every line is a complete sentence and the summary restates the haul, so dropping one loses nothing. Text and timing: `pack-opening.md` §12.
- Because the holo lands 3rd/4th visually, its accessible name must not bury rarity: the rarity label is part of every card's name, so an SR user hears which card shines without waiting.
- **The stage is `inert` for the theatre, the reveal and the pull-back**, so focus cannot land on a card that is still moving or about to be left behind; it is un-`inert`ed on the last settle frame and focus moves to card 1 in that same frame. The focus cycle during that window is ✕ → (disabled footer) → ✕.
- Reduced-motion layout must place the highest-rarity card *last in DOM order* of the drop, matching the visual order rule, so tab order tells the same story.
- The open trigger and seal are disabled for the whole opening; **✕ and `Escape` stay live** (deliberate skip path). The busy state is announced once via the live region.

**Animation spec** (reduced-motion fallback): specified in-table — the fallback is canonical, not an afterthought (PRD F22). **Pacing is not owned by this document**: the durations are the `--elsa-*` tokens of `design/art/motion-sheet.md` §3 (emitted from `design/tokens/motion.ts`), and their composition is `pack-opening.md` §10.1. The rows above quote them for review only — a change is authored in the sheet, and this table follows in the same commit. Entrance transitions use only `transform` + `opacity` (compositor-friendly); the glare sweep is an opacity step on a pre-positioned layer.

**Implementation Notes** (Svelte 5): The reveal lives in `<PackDialog>`; the *draw + ordering* lives in `lib/deck.ts` (pure functions, typed) — Vitest asserts: four unique ids, unseen-first, ≥1 holo after promotion, and the sorted reveal order (holo/rare in positions 3–4). The sequence is **state-driven, not a `setTimeout` chain**: one `$state` beat index advanced on each `animationend` / camera transition end, with the `{#each}` keyed by photo id and the composition reading the tokens (`var(--elsa-dur-cardin)` etc.) rather than literal milliseconds. `inert` is bound to the stage while `revealPhase !== 'settled'`; focus is placed on card 1 on the settle frame. Reduced motion renders the final grid directly with no stagger and no `inert` phase. `rarityOf()` remains the single rarity source; the promotion rule mutates the drawn card's presentation rarity, never the photo's identity.

---

#### Card Tilt & Foil Material

**Category**: Game-Specific
**Status**: Draft
**When to Use**: The exhibit card in the lightbox — the one card at full quality — where holo must behave like a *material*: tilt under the pointer, foil catching light. This is holo-as-material, the parlour's one trick, and it gets real numbers (measured in the `holo-card-ref.html` craft study, cited as `ref`).
**When NOT to Use**: Never as per-tile rAF loops on the whole catalogue grid (performance; tiles get **static foil only**). Never on pack-dialog drop cards (they get the glare sweep only). Never as the sole carrier of rarity or state. No tilt on touch devices' page scroll — the card zone owns `touch-action: none` only inside the lightbox.

**Variable system** (ref): the card root carries four custom properties, driven by one rAF physics loop — `--px` / `--py` (pointer position on the card, 0–100), `--hyp` (pointer distance from center, normalized 0–1), `--bp` (diagonal band position, %). Every foil layer is positioned by these variables; one loop drives the whole material.

**Foil layer stack** (bottom → top, ref values):

| Layer | Technique | Blend | Opacity | Driven by |
|-------|-----------|-------|---------|-----------|
| Frame holo | repeating-linear-gradient 118°, `background-size: 320%`, position `--px/--py` | multiply | .92 | pointer |
| Art holo rays | repeating gradients 112°/-38°, `background-size: 280% / 160%` | color-dodge + hard-light | `.28 + hyp × .4` | pointer |
| Glitter sheets | two canvas-generated sheets, background-position offset by `--px/--py`, **radial-gradient mask at the pointer** | color-dodge | `.4 + hyp × .55` (sheet A), lower for whole-card sheet | pointer |
| Diagonal band | white linear-gradient band at `--bp = px × 1.25 − 12` | soft-light | fixed | pointer |
| Glare | radial white highlight centered at `--px/--py` | overlay | `.28 + hyp × .62` | pointer |

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| At rest, pointer off | Idle sway: gentle continuous float — yaw `sin(t·0.42) × 13°`, pitch `sin(t·0.55) × 7° + sin(t·1.3) × 1.5°` (ref), halo slowly rotating; foil layers drift with it | — (starts after 2.6 s without pointer input) | Spring follows the sway target | continuous | none |
| Pointer move / hover | Card tilts toward the pointer: **target yaw = (x−.5)·2·17°, pitch = −(y−.5)·2·15°** (ref, degrees); all foil layers re-aim at `--px/--py`, glitter mask follows the radial highlight | Pointer over the card zone | Spring tracking: stiffness k = 150, damping c = 15 (ref) — soft but snappy, no jitter | continuous rAF | none |
| Keyboard tilt | Exhibit in the lightbox: **`↑` / `↓` step the tilt by 7° per press**, clamped to ±18° pitch / ±20° yaw (ref); same springs, same foil response. `←`/`→` are reserved for browsing and never tilt | Arrow keys `↑` / `↓` (card focus not required) | Tilt target moves; ring stays visible | spring | none |
| Drag (touch/mouse down + move) | Same tilt tracking while pressed | Pointer down + move | Tilt only — **a drag ≥ 8 px never flips** (tap threshold, ref) | spring | none |
| Flip-in-flight | Whole card lifts: `translateZ` up to ~30 px mid-flip (ref); shadow shrinks and shifts opposite the tilt; halo counter-rotates | flip (see Card Flip) | See Card Flip | spring k = 110, c = 13 | flip tick |
| Reduced motion | **No idle sway, no tilt, no foil movement**: layers rendered static at center position (`--px/--py = 50`, band at rest); the card sits flat. Reading order, copy, and star strip carry everything the material would have said | — | Static render | 0 ms | none |

**Accessibility**:
- Keyboard users get the *same* material: the focused card is `role="button"` `tabindex="0"`, and its `aria-label` advertises the capability — e.g. *"Ministerin für Mittagsschlaf. Holo-Pracht. Eingabe zum Umdrehen, ↑/↓ zum Kippen, ←/→ zum Blättern."* / *"… Enter to flip, ↑/↓ to tilt, ←/→ to browse."*
- Tilt is presentation only: no state, no progression, no information is tilt-gated. With tilt off, the exhibit is fully readable and fully usable.
- `touch-action: none` is scoped to the card zone *inside the lightbox only*; the page scroll is never hijacked.
- Drag-vs-tap threshold (8 px, ref) protects touch users from accidental flips while tilting.

**Animation spec**: this pattern *is* spring-driven motion, not keyframed — durations above are physics constants (stiffness/damping), not `transition-duration`. Reduced-motion fallback is canonical and static (see in-table); note the craft study's softer alternative (stiffer springs, k = 260 / c = 32, sway killed, tilt kept) is deliberately **not** adopted — the Standard tier's "no foil movement" commitment wins. Revisit only if accessibility-requirements.md changes.

**Implementation Notes** (Svelte 5): `<TiltCard>` (or `use:tilt` action) owns the rAF loop and writes the four custom properties; the spring integrator is a ~40-line pure function in `lib/tilt.ts`, unit-tested in Vitest for clamping and decay (headless math, no DOM). Glitter sheets are generated once per session (canvas → data-URL → CSS custom property, ref) and shared by all cards. The art window crops the photo by its manifest `focus` anchor (sharp-generated crop anchors for local dev/QA), so the exhibit shows the intended framing regardless of tilt. Pointer handlers use pointer events with capture; `prefers-reduced-motion` is **not** read here — the tilt module (and its spring loop) consumes the shared motion store (`src/lib/a11y/motion.svelte.ts`, ADR-0010 §4), which is the codebase's single `matchMedia` reader; a local read would be a second source that can disagree with the reveal's. The physics loop runs only while the lightbox is open (one instance, not per tile).

---

#### Card Flip

**Category**: Game-Specific
**Status**: Draft
**When to Use**: The exhibit card in the lightbox only. The flip is a physical act that makes the entry feel like property.
**When NOT to Use**: Binder tiles and haul cards never flip (they open the lightbox); never flip a card the reader cannot currently see.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Front (default) | Card front: name plate, art window with foil material, rarity strip, joke line, stat chips, serial | — | — | — | — |
| Flipping | `rotateY` around the card's vertical axis, with translateZ lift (see Card Tilt & Foil Material) | Tap (drag < 8 px), click, `Enter`, `Space`, or `F` (lightbox open) | Front ↔ back swap; flip state toggles | spring k = 110, c = 13 (ref) | soft tick (flip sweep ~0.16 s, ref) |
| Back | Card back: brand mark, series word, foil pattern, rosette work | same | Flip back | same spring | soft tick |
| Reduced motion | **Instant swap or 100 ms cross-fade** — no 3D rotation; the two faces must never blend illegibly | same | Same state change, no rotation | 0–100 ms | soft tick |
| Focus | `role="button"` `tabindex="0"`, `aria-pressed` reflecting flip state; focus ring on the card outline | `Tab` | — | 80 ms | none |

**Accessibility**:
- `aria-pressed` reflects flipped state; front/back faces toggle `aria-hidden` so only the visible face's content is in the accessibility tree.
- On every flip, the live region announces: DE: *"Rückseite der Karte."* / EN: *"Card back."* (front equivalent on flip back). The card's `aria-label` is rebuilt with the face name.
- Hint copy inside the lightbox carries the affordance in both languages: DE: *"Karte antippen zum Umdrehen · ← → zur nächsten"* / EN: *"Tap the card to flip · ← → for the next"* — `F` is accepted but never required knowledge.
- The whole card is the target (≥44 px equivalent; it is far larger).

**Animation spec** (reduced-motion fallback): in-table; `transform-style: preserve-3d` only on the flipping wrapper, removed under reduced motion.

**Implementation Notes** (Svelte 5): flip state is `$state` on the exhibit component; the spring integrates flip angle and tilt in the same loop (ref: one integrator, `tf` target ±180°). Enter/Space on the card are handled in the keydown branch checking the card target, *in addition to* the global `F` shortcut. `{#key}`-free: the same DOM node flips — a keyed re-render would reset the material mid-motion.

---

#### Card Browsing (Arrows / Swipe)

**Category**: Navigation
**Status**: Draft
**When to Use**: Inside the card lightbox: moving to the previous/next entry of the whole catalogue. Decided input set (owner ruling): **chevron buttons** (visible, touch parity), `←`/`→` keys, and horizontal swipe — three redundant inputs over the same `navigateCard(±1)` path, scoped to the lightbox. This quietly teaches the entire library from inside one exhibit.
**When NOT to Use**: In the pack dialog (its four cards are tapped directly, not paged); never as page-level navigation — the decided `←`/`→`/chevron scope is the lightbox only: they do nothing when no lightbox is open.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Navigating | Current exhibit replaced in place (same dialog), content swaps with a short cross-fade | `←` / `→` (keyboard); chevron buttons (pointer/touch); horizontal swipe (touch); wraps at both ends | `openCard(next)` → URL `?photo` updates, entry marked "gesammelt", title updates | 150 ms ease-out cross-fade | soft tick |
| Chevron navigation | Two icon buttons ‹ › flanking/beside the exhibit in the lightbox; **min 44 × 44 CSS px targets**; accessible names "Vorherige Karte / Previous card" and "Nächste Karte / Next card" | tap / click | Same `navigateCard(±1)` path as keys and swipe — full parity, wraps identically; hidden in single-card collections | as above | soft tick |
| At catalogue boundary | Wraps around (last → first) — no dead end, consistent with the deck-walk philosophy | same | same | as above | as above |
| Single-card collection | Browsing disabled; keys no-op | — | — | — | — |
| Reduced motion | Content swap without cross-fade (instant) | same | same | 0 ms | soft tick |
| Focus during navigation | Focus stays on the dialog element — never chases the re-rendered card | — | — | — | — |

**Accessibility**:
- Every navigation announces the new exhibit once: *"Nr. 07. Ministerin für Mittagsschlaf. Holo-Pracht."* / *"No. 07. Minister of Naps. Holo glory."*
- Swipe respects `touch-action` and never hijacks vertical page scroll; threshold ≥ ~40 px horizontal with dominant-axis check (and drag < 8 px = tap-flip, so tap/flip/drag are three distinct gestures with distinct thresholds).
- Arrow keys are swallowed (`preventDefault`) only while the lightbox is open; typing contexts are excluded via the typing guard.
- Swipe is a redundant input: every swipe destination is reachable by keyboard **and** by the chevron buttons — three inputs, one code path.
- Chevron buttons are real `<button>`s with visible focus rings; on narrow viewports they sit below the exhibit, never overlapping the action row.

**URL & fragment preservation (shared exhibition links — binding)**:
- The lightbox writes/removes **only the `photo` search param**, on a `URL` built from `location.href` (`url.searchParams.set("photo", id)` / `url.searchParams.delete("photo")`, then `history.replaceState(null, "", url)`). It must **never** assign `location.hash` and must **never** rebuild the URL from scratch.
- A `#ausstellung/…` fragment must therefore survive opening and closing a work, language switches, and card navigation (`←`/`→`, chevrons, swipe) — the URL is *patched*, never replaced.
- Only the exhibition view's own dismiss action clears the fragment; no other pattern (Dialog Open / Close, Card Browsing, Language Toggle, Pack flow) may touch it.
- **Acceptance**: the hash is byte-identical before and after opening and closing a work (Playwright: capture `location.hash` before `openCard`, compare after dialog close).

**Animation spec** (reduced-motion fallback): in-table.

**Implementation Notes** (Svelte 5): `lib/catalog.ts` derives the ordered collection (set-aware); navigation is a store method. Swipe uses pointer events with pointerdown/up deltas on the dialog (no touch library). Keep `history.replaceState` in step so browser Back always points at the last studied exhibit — Back closes nothing.

---

#### Pack Roving Arrows

**Category**: Navigation
**Status**: Draft
**When to Use**: Inside the **pack dialog** only: `←`/`→` move keyboard focus across the settled drop row, `↑`/`↓` jump a row in the 2 × 2 layout; `Enter`/`Space` opens the focused card in the lightbox. This is the pack dialog's own keyboard model — deliberately distinct from Card Browsing, which is lightbox-only.
**When NOT to Use**: In the card lightbox (that is Card Browsing's decided `←`/`→` scope — they do nothing in the pack dialog's content when the lightbox is closed… and are swallowed by the lightbox when it is open); on the collection grid (Catalogue Grid Roving Arrows); never page-scope.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Roving focus — row | Focused dealt card shows the standard focus ring (≥3:1, ≥2 px offset) | `←` / `→` — **wrap at both ends of the current row** (2 × 2: wraps within that row, it does not spill into the row below; one row: wraps at the ends of the row) | Focus moves card to card; scroll-into-view if clipped | 80 ms ring transition | none |
| Roving focus — row jump (`↑` / `↓`) | Same ring on the card the jump lands on | `↑` / `↓` — **2 × 2 layout only** (≤ 760 px); moves to the same column in the row above / below | Focus moves a row; **stops at the outer rows (no wrap)**; in the one-row desktop layout the keys are a no-op | 80 ms ring transition | none |
| Open focused card | — | `Enter` / `Space` on the focused card | Card Lightbox opens for that exhibit (URL gains `?photo=`) | per Dialog Open / Close | soft tick |
| During reveal (stage `inert`) | Cards are entering focus and travelling to their cells; the stage takes **no focus and no pointer events** until the pull-back ends | `←` / `→` / `↑` / `↓` | Ignored — the key event does not even reach the roving handler, and focus cannot land on a moving card (**✕ and `Escape` stay live** per the dismissal canon) | — | — |
| Second lap | Same roving model over stamped ("2. Auflage") cards | same | same | as above | as above |

**Accessibility**:
- Roving `tabindex` model: exactly one dealt card carries `tabindex="0"`, the rest `tabindex="-1"`; focus entering the drop row lands on the roving card. Cards remain real `<button>`s in the `<ol>` — no `role="grid"` (the list semantic carries collection order; a grid role would misstate the row-major reading of a 2 × 2 and invite a screen reader to take over arrow keys).
- Each focus move is self-announced: the card's own accessible name (number, name, rarity — e.g. *"Karte 04 öffnen: Hüterin der verlorenen Socken"*) is what the screen reader reads on focus; no extra announcements.
- `Escape` closes the dialog at any time (dismissal canon); arrow roving never traps `Tab` — `Tab` still moves out of the dialog's controls normally.
- The row map is announced, not guessed: the counter ("2 von 4") states position and the 2 × 2 is visual row-major, so `↓` never lands somewhere the visitor could not predict.
- Dealt cards are the targets (far larger than 44 × 44 CSS px).

**Animation spec**: focus movement is instant (ring transition only); reduced motion: n/a — no motion to reduce.

**Implementation Notes** (Svelte 5): one `on:keydown` handler on the drop `<ol>`; roving index is `$state`, the per-card `tabindex` derives from it; the handler is unreachable while the stage is `inert`. Navigation is **geometry-based** (nearest-card lookup from the current card's centre in the pressed direction) rather than index math, so the same handler serves the 2 × 2 and the one-row layout without knowing the column count — the same approach as Catalogue Grid Roving Arrows, minus its edge behaviour (`←`/`→` wrap, `↑`/`↓` stop). `{#each}` keyed by photo id so the roving index survives the language re-render (re-anchor to the same id, not the same array position).

---

#### Pack Scroll-Snap Swipe

> **Deprecated — no consumer (2026-11-22).** The reveal no longer lays the drop row out as a horizontal carousel: during the reveal the camera moves one card at a time, and the settled overview is a 2 × 2 grid (≤ 760 px) or a single row that fits (≥ 761 px). There is no horizontally scrolling row left for scroll-snap to snap, so this pattern has no screen that consumes it. It is kept in the library as a tombstone with its rationale, so a future screen that genuinely needs a carousel inherits the solved thresholds instead of re-deriving them — **do not reference it in a new spec without revisiting this note.** Removed from the Pattern Catalog Index. Mobile reachability is served by the settled 2 × 2 (no horizontal scrolling) plus `↑`/`↓` in Pack Roving Arrows.

**Category**: Navigation / Layout
**Status**: **Deprecated — no consumer**
**When to Use**: Nowhere in the current build. Written for a ≤ 760 px scroll-snap carousel of the dealt row, which the focus-beat reveal replaced.
**When NOT to Use**: Everywhere — see the deprecation note above. Historically: above 760 px (the row was fully visible — no carousel); in the card lightbox (its swipe is Card Browsing's ≥ ~40 px threshold over the whole catalogue, with chevrons as the visible affordance); never as the only path — keyboard parity via Pack Roving Arrows was mandatory.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Carousel (mobile) | Drop row: `overflow-x: auto`, `scroll-snap-type: x mandatory`; each slot `scroll-snap-align: center`; `touch-action: pan-x` on the row | — | — | — | — |
| Swipe / drag | Card tracks the finger; the row snaps to the nearest slot on release | horizontal swipe / drag (drag ≥ 8 px) | Native scroll-snap physics; roving focus syncs to the snapped card | native scroll | none |
| Tap | — | tap with drag < 8 px | Opens the tapped card in the lightbox | per Dialog Open / Close | soft tick |
| Keyboard parity | — | `←` / `→` (Pack Roving Arrows) | Focus moves and the row scrolls to keep the focused card snapped in view | 150 ms smooth scroll (reduced motion: instant jump) | none |
| Reduced motion | Snap behavior is user-driven scroll and stays; the keyboard-parity smooth scroll becomes an instant jump | — | — | 0 ms | none |

**Accessibility**:
- The row keeps its `<ol>` accessible name ("Die Karten aus diesem Pack / The cards in this pack"); scrolling conveys no state that isn't already in the cards' accessible names.
- `pan-x` is scoped to the row only — vertical page scroll is never hijacked; the dialog itself still scrolls vertically where needed.
- Tap (open) and drag (scroll) are distinct gestures with distinct thresholds (8 px, ref) — a swipe must never accidentally open a card, and a tap must never accidentally scroll.
- Keyboard parity is the Pack Roving Arrows model; the carousel adds no keyboard burden.

**Animation spec**: snapping is native scroll physics (not a keyframed animation); the keyboard-parity scroll is 150 ms, instant under reduced motion.

**Implementation Notes** (Svelte 5): CSS-only snapping (`scroll-snap-*` + `overflow-x` under a `@media (max-width: 760px)` or container query — container queries preferred so the dialog's own width decides). JS only for: the 8 px tap-vs-drag pointer threshold, and focus↔scroll sync (`scrollIntoView({ inline: 'center', behavior: reduceMotion ? 'instant' : 'smooth' })` on roving focus).

---

### Data-Bearing Actions

---

#### Share Button

**Category**: Input
**Status**: Draft
**When to Use**: Sending the exact exhibit currently open — button "Teilen / Share" in the lightbox action row. (Later: Elsas Ehrenmensch reuses this pattern with the capstone's URL.)
**When NOT to Use**: Anywhere a native share sheet would be the wrong granularity (never share the whole catalogue; never share from the pack dialog's four cards — share the opened exhibit).

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default | Outline button "Teilen" / "Share" | — | — | — | — |
| Hover / Focus | Standard lift + focus ring | pointer / Tab | 80 ms | — | none |
| Active | Scale 0.98 | press | share sheet opens (mobile) or clipboard write | 60 ms | none (sheet is system UI) |
| Busy | No visual busy state — `navigator.share` is modal on mobile; on desktop the operation is instant | — | — | — | — |
| Success | Status line under the actions: "Unterwegs." / "On its way." (copy-deck sync 2026-11-22) | — | Announced through `#live-status` as `live.share`; the visible line is **plain text** (no `role`, no `aria-live`) and auto-clears | visible ~3.4 s | soft success chime |
| Fallback success (clipboard) | Status line: "Link kopiert." / "Link copied." | share API unavailable | `navigator.clipboard` → `execCommand` fallback | as above | soft success chime |
| Error | Status line: "Kopieren ging nicht. Der Link steht oben in der Adresszeile — dort bekommst du ihn." / "Copying did not work. The link is up in the address bar — you can get it there." (copy-deck sync 2026-11-22; deck error wording, no `!`) | both fail | Always gives the user a usable next step | as above | soft error thud |
| Cancelled (AbortError) | Status line stays empty — a cancel is not an event | user closes the share sheet | silent | — | — |

**Accessibility**:
- The status line is a plain element with **no** `role` and **no** `aria-live`; the same string is announced through `#live-status` (`live.share`, ADR-0010 §2), so success and failure are heard once and focus never moves. Two live carriers for one event would speak it twice — the defect this rule exists to prevent.
- The button's accessible name is just "Teilen" / "Share"; what is shared is unambiguous from context (the open exhibit).
- Shared payload: title "«name» — eine Elsa-Karte / an Elsa card", text "Aus Elsas Archiv: «{name}»." / "From Elsa's archive: «{name}»." (copy-deck sync 2026-11-22), URL `?photo=<id>&lang=<lang>` — the recipient opens the same entry in the sender's language.

**Animation spec**: status line fades in 200 ms ease-out, out 200 ms ease-in; reduced motion: instant set/clear.

**Implementation Notes** (Svelte 5): Keep the three-layer fallback (`navigator.share` → `clipboard.writeText` → hidden-textarea `execCommand`) exactly as proven in v1; it is the correct vanilla stack. One shared `setShareStatus()` in the exhibit store with its clear timer — never two competing status writers.

---

#### Save / Download Link

**Category**: Input
**Status**: Draft
**When to Use**: Keeping the photo — "Foto speichern / Save this photo" in the lightbox action row; serves the *original* resolution file (`<a download>`).
**When NOT to Use**: Never for the collection tiles (no bulk download in scope); never a "save to favorites" — that is what "gesammelt" already is.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default | Outline button-styled link, `href` = original file, `download` set | — | — | — | — |
| Hover / Focus | Standard lift + focus ring | pointer / Tab | 80 ms | — | none |
| Active | Native download begins; no UI change needed | click | Browser handles progress | — | — |
| HEIC original | If the source is HEIC/HEIF and in-browser conversion failed, the link still offers the original file; the exhibit remains readable without the picture (frame + name + line render) | click | Original HEIC downloads | — | — |
| Error (missing file) | Browser's own download error — no custom UI; `href` is always a server path that exists per manifest | — | — | — | — |

**Accessibility**:
- Real `<a>` with `download` — keyboard-reachable, native semantics, no JS required for the core action.
- The file name is the photo's own filename; no invented names.
- No `target="_blank"` — the download attribute prevents navigation.

**Animation spec**: none — native browser behavior.

**Implementation Notes** (Svelte 5): `href`/`download` are derived from the current exhibit (`$derived`); the PRD open question (smaller share-friendly version) stays open — when decided, this pattern gains a variant row, not a second button.

---

#### Reset with Confirmation

**Category**: Input / Feedback
**Status**: Draft
**When to Use**: The collection header's "Von vorn / Start over" — the only destructive action in the product. Clears collection state and restarts the deck walk.
**When NOT to Use**: Anywhere else. Nothing else in Elsa the Explorer is destructive; no other control may chain this pattern.

> **Critical rule**: A reset control NEVER executes directly. It always opens
> the confirmation. There are no exceptions — including keyboard shortcuts
> (there is deliberately **no** `R` shortcut for reset).

**Structure** (Confirmation Dialog — these strings are canon / SSOT; the confirm button is labelled with the action, never "OK" / "Ja"):
- Title: "Von vorn?" / "Start over?"
- Body (one line, listing what is lost): DE: *"Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück."* / EN: *"This clears the Collection, room progress, the milestones and Elsa's Honorary Human — sound and language go back to default."* (copy-deck sync 2026-11-22)
- Confirm button: Primary-styled **destructive** — DE: *"Alles löschen"* / EN: *"Delete everything"* — labeled with the action, never "OK" / "Ja".
- Cancel button: Secondary — "Abbrechen" / "Cancel". **Default focus here.**
- Scope note (binding, per project facts): reset clears **all** `lucky-elsa.*`
  keys — collection state *and* preferences; language and sound return to
  their defaults (German, sound on). The one-line confirmation lists what is
  lost and carries the Ton-und-Sprache clause verbatim — the canon body line
  quoted above is the SSOT (copy-deck sync 2026-11-22); never restate it in a
  shorter form here.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Trigger (default) | Quiet outline button in the collection tools row; never visually loud — the danger lives in the confirmation, not the trigger | click / `Enter` | Confirmation dialog opens (Dialog Open / Close rules) | 200 ms open | soft warning tick (distinct from confirm) |
| Confirmation — default focus | Cancel focused | `showModal()` | — | — | — |
| Confirmed | — | click confirm / `Enter` | Clears all `lucky-elsa.*` keys, re-renders catalogue + progress in the default language, announces result | 160 ms close | final weighted confirm tone |
| Cancelled | — | `Escape`, backdrop click, Cancel click | Dialog closes; nothing changed; focus returns to the reset button | 160 ms close | modal-close tick |
| Result (after confirm) | Progress bar to 0, all tiles revert to unseen framing, "2. Auflage" era ends | — | Live region: "Von vorn. Alle Karten können wieder kommen." / "Starting over. Every card can come up again." | 300 ms progress transition | UI Confirm — Destructive |

**Accessibility**:
- Confirmation uses the native `<dialog>` with `aria-labelledby` on the title; the destructive nature is carried by the body line's explicit loss list (screen readers read the whole line, not just the buttons).
- Default focus on Cancel is required (safe default); `Escape` maps to cancel.
- After confirming, the announcement must not be buried: the live region receives the restart line.
- Trigger target size ≥ 44 × 44 CSS px; it must sit apart from browsing controls so mis-clicks are unlikely, and the confirmation is the safety net regardless.

**Animation spec**: dialog open/close per Dialog Open / Close; progress refills via its 300 ms transition; reduced motion: instant states, no fill animation.

**Implementation Notes** (Svelte 5): `<ResetDialog>` wraps the native dialog; `resetAll()` in the collection store clears every `lucky-elsa.*` key (stale-key hygiene included) and is the *only* writer of those keys from user intent. Vitest asserts the store clears exactly the full key set; Playwright covers trigger → confirm → progress-zero → default-language UI.

---

### Settings Toggles

---

#### Language Toggle (DE / EN)

**Category**: Input
**Status**: Draft
**When to Use**: The masthead pair of buttons — the only language control. German is default and household language; English is a full peer.
**When NOT to Use**: Never a `<select>` or dropdown (two options, one glance); never auto-detect (decision: always German first, PRD F7).

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default (unselected) | Plain text button "DE" / "EN" in the segmented pair | — | — | — | — |
| Selected (active) | Foil-accented fill + `aria-pressed="true"` | — | — | — | — |
| Hover / Focus | Lift + focus ring on either half | pointer / Tab | 80 ms | — | none |
| Press (switch) | Clicking the inactive language switches *everything immediately* | click / `Enter` / `Space` | `<html lang>` swaps; every string re-renders; open dialogs re-render; `<title>`, meta, `og:locale` update; URL gains `?lang=`; choice persists (`lucky-elsa.lang.v2`) | instant (a language switch must feel like the page was always in that language) | soft toggle click |
| Press (already active) | No-op | click | Nothing changes; no announcement | — | — |
| URL override | `?lang=de` / `?lang=en` beats stored choice and is then stored | page load | — | — | — |

**Accessibility**:
- The pair is wrapped in a group with a label — DE: *"Sprache"* / EN: *"Language"*; each button carries its own `aria-pressed` and `lang` attribute so screen readers pronounce labels correctly.
- Both buttons remain in the tab order (the pressed-pair is the simpler, correct choice here).
- Announce the switch: "Auf Deutsch umgestellt." / "Switched to English."
- Target size ≥ 44 × 44 CSS px (masthead padding counts toward the hit area).
- Contrast: selected-state fill vs. masthead background ≥ 4.5:1 for the text; the active state must also differ by *shape/weight*, not color alone.

**Animation spec**: none — instant. This is the one interaction where animation would be a defect: strings must not visibly "catch up".

**Implementation Notes** (Svelte 5): i18n as a `lang.svelte.ts` store (`$state` lang + `t(key, vars)` helper) consumed everywhere; switching is one store write and Svelte reactivity handles the re-render — including inside open dialogs. `npm run qa`-style completeness checks (Vitest: both copy decks key-aligned) stay; Playwright asserts a switch updates the `<title>` and an open dialog.

---

#### Sound Toggle

**Category**: Input
**Status**: Draft
**When to Use**: The masthead speaker button — global audio on/off.
**When NOT to Use**: Per-sound or volume controls — out of scope by design; a family site has exactly one audio decision.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| On (default) | Speaker icon with sound waves; label "Ton an" / "Sound on"; `aria-pressed="true"` | — | — | — | — |
| Off | Same icon, waves replaced by the slash; label "Ton aus" / "Sound off"; `aria-pressed="false"` | click | All WebAudio muted at the source (audio store returns null context); choice persists (`lucky-elsa.sound.v2`) | 80 ms icon swap | soft toggle click (only when switching *on*) |
| Hover / Focus | Lift + focus ring | pointer / Tab | 80 ms | — | none |
| Blocked context | If WebAudio is unavailable, the toggle still functions as a preference; no error state is shown | — | — | — | — |

**Accessibility**:
- `aria-pressed` toggle button; accessible name is the *state*, not the icon: `aria-label` "Ton / Sound", visible text carries state in words (no icon-only state).
- Icon and text swap together; the slash is shown/hidden rather than drawn over a static pair.
- Target ≥ 44 × 44 CSS px.

**Animation spec**: icon swap 80 ms opacity step; reduced motion: instant.

**Implementation Notes** (Svelte 5): audio as a singleton `audio.svelte.ts` store — master gain ~0.55 (ref), context created lazily on first user gesture, `resume()` on suspended state, all synth recipes in one module. `SoundToggle.svelte` reads/writes the store; the recipes live in Sound Standards below.

---

### Feedback Patterns

---

#### Progress Bar

**Category**: Feedback / Layout
**Status**: Draft
**When to Use**: The overall catalogue progress at the stage: "Du hast 14 von 24 gesammelt." / "You have collected 14 of 24." Also the dialog-embedded copy variant.
**When NOT to Use**: For per-department progress (that is Set Progress Line); never for anything time-based (the library has no timers).

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default (partial) | Thin foil-accented fill on a dark track; numeric label above, quiet explanatory note below: "Jede Karte kommt dran, bevor eine wieder auftaucht." / "Every card gets a turn before any come back around." | — | — | — | — |
| Value increases | Fill width animates to the new ratio; label re-renders | entry marked "gesammelt" | — | 300 ms ease-out | none (the card's own sounds cover the beat) |
| At zero | Empty track; label reads the honest count ("Du hast 0 von 24 gesammelt.") | reset / fresh start | — | 300 ms | — |
| At maximum (100 %) | Fill complete; the line is joined by the completed-catalogue affordances (Elsas Ehrenmensch in the collection header; Das Gesamtverzeichnis plaque beside it) | last entry | — | 300 ms | milestone chime |
| Loading | Label "Karten werden gesucht" / "Finding the cards"; track at 0 — the *label*, not a spinner, is the loading indicator | page load | — | — | — |
| Empty (no photos) | Label "Noch keine Karten" / "No cards yet"; track at 0 with the collection's curator-directed empty state carrying the explanation | — | — | — | — |

**Accessibility**:
- `role="progressbar"` with `aria-valuemin/max/now` kept in sync (`now = seen`, `max = total`); labelled via the visible label (`aria-labelledby`).
- The visible label is the *primary* carrier — the bar is a redundant shape: "14 von 24" in text, always.
- The copy shift is canonical: the label says **"gesammelt"**, never "gesehen": DE: *"Du hast {seen} von {total} gesammelt."* / EN: *"You have collected {seen} of {total}."*
- No animation-only progress: with reduced motion, the fill jumps instantly.

**Animation spec**: fill 300 ms ease-out; reduced motion: instant.

**Implementation Notes** (Svelte 5): fill width and `aria-valuenow` derive from the collection store (`$derived`); the refactor changes only the label copy ("gesammelt") and adds the milestone chime at crossings. Counts, never percentages — they mean more at family scale.

---

#### Set Progress Line

**Category**: Feedback / Layout
**Status**: Draft
**When to Use**: The collection's six themed department rows + the loose department, each showing name, count, and frontier. This pattern is the refactor's new meta layer made visible.
**When NOT to Use**: Not a navigation control (clicking a set row must not filter/hide the grid — the grid is one continuous list; departments are annotation, not tabs); never inside dialogs.

**Canonical departments** (design canon, order fixed; manifest `set` field assigns, `Neuzugänge` is the automatic default):

1. Der Ruhesaal / The Nap Wing — naps, duvets
2. Außenstelle Garten / The Garden Annex — garden patrols, digging
3. Der Abfahrtsaal / The Departure Hall — car rides, the window-nose, arriving places (slug `departure-hall`; the archive contains no wet-dog, rain, mud or bathing content — owner water ruling)
4. Der Ballsaal / The Ball Room — play, balls, sticks
5. Der Porträtsaal / The Portrait Room — portraits; **holds the chase card Das Hauptporträt / The Portrait of Record** (manifest `chase: true`)
6. Der Wachsaal / The Guard Room — guarding, waiting, judgment
7. Neuzugänge / New Acquisitions — automatic department for unassigned photos

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Frontier (default, incomplete) | Set name · "3 von 5 gesammelt" · mini fill bar; the unfilled remainder is visible | — | — | 300 ms fill animation on change | none |
| Just gained an entry | Count ticks up, fill animates | card of this set marked | — | 300 ms ease-out | none (card sounds suffice) |
| Department complete | Line flips to its completion state. Visible note (carries the surface's one permitted `!`): DE: *"Der Rahmen leuchtet, als hätte er gewartet!"* / EN: *"The frame is glowing, as if it had been waiting!"*; live region: DE: *"{set} ist komplett. Alle da."* / EN: *"{set} is complete. All present."* — no `!` (copy-deck sync 2026-11-22). **Exclamation rule: at most one `!` per surface; never in error, destructive-confirmation or accessibility strings; the terminal `!` is removed before a live region.** The **permanent frame variant** for this set now applies to its tiles | last card of set | Small one-time flourish + live region announcement | 300 ms + one-time flourish ~800 ms | milestone chime (set-scale, quieter than the Ehrenmensch chime) |
| Loose department | Same pattern, labeled "Neuzugänge / New Acquisitions"; completion possible and celebrated the same way | — | — | — | — |
| Milestone crossing (25/50/75 % overall) | Surfaced once via a catalogue-level flourish + live region; **milestone announcements are overall-catalogue** — copy key `catalogue:milestone-reached { pct }` (the GDD references this key; do not rename in one place only), with the outfit resolved from the milestone — SSOT: binder spec §12 (**25 % gilded door sign / Türschild, 50 % reading lamp / Leselampe, 75 % velvet rope / Samtband**): DE: *"Sammlung: {pct} Prozent geschafft — {outfit}."* / EN: *"Collection: {pct} per cent done — {outfit}."* ({outfit} resolves from the milestone — no competing copy; announced, so no `!`; copy-deck sync 2026-11-22); the outfit then persists in the collection's presentation | overall ratio crosses | one-time | one-time | milestone chime |
| 100 % overall | All lines complete; the **single capstone Elsas Ehrenmensch / Elsa's Honorary Human** is presented in the collection header; the Das Gesamtverzeichnis / The Master Index plaque stands beside it | last entry | Completion announcement once: DE: *"Sammlung komplett — Elsas Ehrenmensch ist eingetragen."* / EN: *"Collection complete — Elsa's Honorary Human is entered."* — no `!` (copy-deck sync 2026-11-22); ceremony beats in player-journey.md Phase 7 | — | Ehrenmensch chime |
| Empty department (0 cards exist in it) | **Decision: omit** — the collection only shows departments that exist in the current collection | — | — | — | — |

**Accessibility**:
- Each line is text-first: name + numeric count ("3 von 5") — the mini bar is redundant decoration, `aria-hidden`.
- Set names and counts are plain text in the page language; both languages carry the set names (key-aligned copy).
- Completion and milestone announcements go through the live region once, at the moment they happen: set completion — DE: *"{set} ist komplett. Alle da."* / EN: *"{set} is complete. All present."*; milestones — `catalogue:milestone-reached { pct }` (overall-catalogue, not per-department). At most one `!` per surface; never in error, destructive-confirmation or accessibility strings; the terminal `!` is removed before a live region.
- No color-only completion: the word "komplett / complete" carries it.

**Animation spec**: fill 300 ms ease-out; completion flourish (subtle foil brightening on the line, never page-scale confetti — the pack dialog owns the one 520 ms holo glint, and the capstone owns the confetti celebration); reduced motion: instant states, flourish becomes a plain text change.

**Implementation Notes** (Svelte 5): `<SetLine>` renders from a `sets.svelte.ts` store; data lives in `lucky-elsa.sets.v1` (per-set ids) and `lucky-elsa.flags.v1` (milestones, Ehrenmensch claimed), both recomputed defensively from `seen.v2` on load (stale-key hygiene, as `pruneSeen()` did). The loose department is automatic, never manually maintained. Container queries: full line ≥ ~480 px, compact line (name + "3/5") below. Vitest: assignment fallback to Neuzugänge; stale-id pruning.

---

#### Zuwachs Accession Line

**Category**: Feedback
**Status**: Draft
**When to Use**: Telling a returning visitor that the curator accessioned new material: the one-line notice **"{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!"** (cap 44; at `{n}` = 1 use `zuwachs.line.one`: "1 neues Schmuckstück ist da!" / "1 new treasure has arrived!"; copy-deck sync 2026-11-22). Home decision (stage copy vs. masthead line) is tracked in `design/player-journey.md` Open Questions.
**When NOT to Use**: On a first visit (nothing to compare against); when the manifest is unchanged since the stored stamp; as a modal or banner — it is quiet copy in the parlour, never an interruption.

**Trigger (GDD R8 mechanism — manifest stamp vs. stored stamp)**:
- The manifest carries a stamp (its generation timestamp or photo count) — runtime truth from `photos.php` / `photos.json`.
- The visitor's last-seen stamp lives in `lucky-elsa.flags.v1` (`lastManifestStamp`).
- On load: manifest stamp ≠ stored stamp → the line appears, counting the visitor's unseen cards in the current manifest ("new" = ids not in `seen.v2`). Equal stamps → hidden. A returning visitor with unseen cards from an *old* manifest is never nagged.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Hidden (default) | No line | manifest stamp = stored stamp | — | — | — |
| Appearing | One quiet line above the collection | load with stamp mismatch | Polite announcement once, same string via live region | 200 ms fade-in | none |
| Displayed | Line persists until dismissal | — | — | — | — |
| Dismissed | **Once any new card is gesammelt**, the line disappears and the stored stamp updates to the current manifest stamp | first new card marked | Line removed; stamp written; no announcement needed | 200 ms fade-out | none (the card's own sounds cover it) |
| Reduced motion | Instant show/hide | same | same | 0 ms | none |

**Accessibility**:
- Plain text, never color/icon-only; the count variant states a number.
- Announced politely on load, once — not repeated per navigation.
- It is a notice, not a CTA: no click target required; the collection below it is the natural next step.

**Animation spec**: 200 ms fades; reduced motion: instant show/hide.

**Implementation Notes** (Svelte 5): a `zuwachs.svelte.ts` store compares stamps on load; `lastManifestStamp` is written at dismissal. The count derives from `seen.v2` ∩ manifest ids. Vitest: mismatch → shown; dismissal → stamp written; equal stamps → hidden.

---

#### View Toggle

**Category**: Input / Navigation
**Status**: Draft
**When to Use**: The collection header's view switch between the flat list (**"Alle Karten / All cards"**) and the room-grouped view (**"Nach Räumen / By room"** — departments with their Set Progress Lines). Two options, one glance: a segmented pressed-pair like the Language Toggle.
**When NOT to Use**: Anywhere with more than two views; inside dialogs; as a persisted setting (view choice is session state — it resets to "Alle Karten" on reload; revisit only if playtests ask for persistence).

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default (unselected) | Plain text button in the segmented pair | — | — | — | — |
| Selected (active) | Foil-accented fill + `aria-pressed="true"` | — | — | — | — |
| Hover / Focus | Lift + focus ring on either half | pointer / Tab | 80 ms | — | none |
| Press (switch) | Clicking the inactive view re-renders the collection grid | click / `Enter` / `Space` | Grid re-renders flat ↔ grouped; Set Progress Lines appear only in grouped view; focus stays on the pressed toggle | instant (a view switch must feel like the grid was always laid out that way) | soft toggle click |
| Press (already active) | No-op | click | Nothing changes; no announcement | — | — |

**Accessibility**:
- Group with a label: DE: *"Ansicht"* / EN: *"View"*; each button carries `aria-pressed` and its full view name as accessible name (never icon-only).
- Both buttons stay in tab order; `Enter`/`Space` activate.
- Announce the switch once: DE: *"Nach Räumen sortiert."* / EN: *"Grouped by room."* (flat equivalent: *"Alle Karten."* / *"All cards."*).
- Active state differs by fill **and** weight, never color alone; target ≥ 44 × 44 CSS px.

**Animation spec**: none — instant re-render; reduced motion: n/a.

**Implementation Notes** (Svelte 5): a `view.svelte.ts` store (`$state<'flat' | 'rooms'>('flat')`); `{#if}` branches between the flat keyed `{#each}` and the grouped render (departments as `<section>`s, each headed by its Set Progress Line with `aria-labelledby`). Session-only — no storage key.

---

#### Collection Grid Tile

**Category**: Game-Specific
**Status**: Draft
**When to Use**: Every card in the collection grid — one button per entry, in collection order.
**When NOT to Use**: In the pack dialog (haul cards are the Card Reveal Step's slots, not tiles); tiles are never drag sources or multi-select targets (out of scope, PRD F31).

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Default ("gesammelt") | Tile with photo, name plate, star strip; quiet "gesammelt" marker (check + word, not color alone) | — | — | — | — |
| Unseen (not collected) | Same frame, photo dimmed + unseen marker; **decision: show the photo dimmed** (the collection is private; there is no spoiler to protect, and dimmed photos keep browsing pleasant) | — | — | — | — |
| Hover | Tile lifts ~4 px, static foil brightens slightly | pointer | — | 80 ms ease-out / 60 ms exit | none |
| Focused | Focus ring at ≥3:1 contrast, ≥2 px offset | Tab / Shift+Tab | scroll-into-view if clipped | 80 ms | none |
| Active / Pressed | Scale 0.98; lightbox opens | click / `Enter` / `Space` | Card lightbox opens (Dialog Open / Close); URL gains `?photo=<id>` | 60 ms / 80 ms | soft tick |
| Chase card tile | Gold-glint frame (Das Hauptporträt / The Portrait of Record — keystone of Der Porträtsaal, manifest `chase: true`); otherwise a normal tile — no special behavior | — | — | — | — |
| Department-complete frame variant | Tiles of a completed department wear the set's permanent frame variant | — | — | — | — |
| Sample / placeholder tile | Tile renders with demo content; the demo note line above the grid explains: "Das hier sind Beispielkarten. Die echten Fotos fehlen noch." / "These are sample cards. The real photos are not in yet." | — | — | — | — |
| Disabled (during pack opening) | Grid clicks ignored while `opening` — tiles keep normal visuals (no mass-disabled look); the lock lives in the handler | — | — | — | — |

**Accessibility**:
- Each tile is a `<button>` with a complete accessible name, including state: DE: *"Karte 07 öffnen: Ministerin für Mittagsschlaf, gesammelt"* / EN: *"Open card 07: Minister of Naps, collected"* — unseen cards say so ("noch nicht gesammelt" / "not yet collected").
- The grid is a `<ul>` with an `aria-label` ("Alle Karten von Elsa" / "All cards of Elsa"); tiles are `<li>` items — DOM order = collection order = tab order.
- "gesammelt" state is carried by a text marker + icon; never by color/opacity alone.
- Thumbnails lazy-load (`loading="lazy"`); tile images carry width/height to prevent layout shift (PRD NFR: no CLS).
- Focus-driven scroll: a focused tile must always be scrolled into view.

**Animation spec**: hover lift and static-foil brightening per table; entrance animation for newly accessioned tiles ("Zuwachs accession line") is a `--elsa-dur-tile` 260 ms fade-in, 40 ms stagger capped at max 4 (**capped at ~2 s total**) so 50 new tiles don't animate for 15 s; reduced motion: none of it, tiles appear instantly.

**Implementation Notes** (Svelte 5): `<BinderTile>` per entry in a keyed `{#each}`; the "gesammelt" marker derives from the collection store. One delegated click handler on the grid (`closest('[data-photo-id]')` semantics via a wrapper or per-tile handlers — Svelte's cheap listeners make per-tile fine). Focus management uses `scrollIntoView({ block: 'nearest' })` on focus. Re-visit rendering strategy only above ~200 entries (PRD §9.2).

---

#### Catalogue Grid Roving Arrows

**Category**: Navigation
**Status**: Draft
**When to Use**: On the collection grid (flat **and** grouped views): `←→↑↓` move keyboard focus tile-to-tile in the visual two-dimensional order; `Home`/`End` jump to the first/last tile; `Enter`/`Space` open the focused entry in the lightbox.
**When NOT to Use**: Inside any dialog (dialogs own their own focus loops); in the pack dialog (Pack Roving Arrows over the dealt row); never as a `Tab` trap — **`Tab` still leaves the grid**: the grid is one tab stop, arrows move inside it.

**Interaction Specification**:

| State | Visual | Input trigger | Response | Duration | Audio |
|-------|--------|---------------|----------|----------|-------|
| Roving focus | Focused tile shows the standard focus ring (≥3:1, ≥2 px offset) | `←` / `→` / `↑` / `↓` | Focus moves tile-to-tile in the visual grid order; stops at the grid's edge (no wrap — `Home`/`End` cover the jumps); scroll-into-view on every move | 80 ms ring transition | none |
| Jump to ends | — | `Home` / `End` | Focus to first / last tile, scrolled into view | instant | none |
| Open focused tile | — | `Enter` / `Space` on the focused tile | Card Lightbox opens (URL gains `?photo=<id>`, entry marked "gesammelt") | per Dialog Open / Close | soft tick |
| Grouped view ("Nach Räumen") | Same roving model; arrows follow the visual order **across department sections** (tile-to-tile, not department-to-department) | same | same | as above | none |
| Single-card catalogue | Grid is one tile; arrows no-op | — | — | — | — |
| Reduced motion | Focus movement is instant (it always was); scroll-into-view jumps without smoothing | — | — | 0 ms scroll | none |

**Accessibility**:
- Single-tab-stop composite: the grid container is one `Tab` stop (`tabindex="0"` with an accessible name — the existing "Alle Karten von Elsa / All cards of Elsa"); arrow keys move focus among the tiles via roving `tabindex`. `Tab` moves past the grid unchanged — arrows never trap keyboard users.
- Tiles stay real `<button>`s inside the `<ul>` (list semantics carry collection order); **no `role="grid"`** — a 2-D grid role would promise cell semantics the content doesn't have. The roving model is announced naturally: focusing a tile reads its full accessible name, state included ("…, gesammelt" / "…, collected").
- `Enter`/`Space` activate the focused tile (native button behavior); nothing is activation-locked to arrows.
- Every focus move scrolls the focused tile into view (`block: 'nearest'`).
- Tile targets are far larger than 44 × 44 CSS px.

**Animation spec**: focus movement is instant; scroll-into-view is smooth by default and instant under reduced motion.

**Implementation Notes** (Svelte 5): a `use:rovingGrid` Svelte action on the grid container; navigation is **geometry-based** (nearest-tile lookup from the current tile's center) rather than index math, so it survives both the flat layout and the grouped "Nach Räumen" render without knowing column counts. Roving `tabindex` derives from a `$state` focus id (keyed by photo id, so language re-renders re-anchor correctly). Vitest: geometry mapping on synthetic layouts; Playwright: arrows move focus, `Tab` exits the grid, `Enter` opens.

---

#### Keyboard Shortcut

**Category**: Input
**Status**: Draft
**When to Use**: Global single-key actions. Full canonical set (decided card-detail map):
- `P` — open a pack (page scope, no dialog open)
- `F` — flip the exhibit (lightbox scope)
- `←` / `→` — browse entries (**always, while the lightbox is open** — regardless of card focus)
- `↑` / `↓` — tilt the exhibit foil (lightbox scope; Card Tilt & Foil Material, step 7°)
- `Escape` — close the active dialog (native)
**When NOT to Use**: Never add page-scope shortcuts without updating this table; never a reset shortcut (see Reset with Confirmation); never shortcuts that conflict with browser/UI conventions (`Tab`, `Space` outside buttons, modifier combos untouched).

**Interaction Specification**:

| Scope | Key | Guard | Response | Audio |
|-------|-----|-------|----------|-------|
| Page | `P` / `p` | no dialog open, not typing, no modifier keys, photos exist, not already opening | `openPack()` | per Pack-Open Button |
| Lightbox | `F` / `f` | lightbox open, not typing | flip exhibit | per Card Flip |
| Lightbox | `←` / `→` | lightbox open, ≥2 photos | `navigateCard(±1)` — **always; card focus is irrelevant** | per Card Browsing |
| Lightbox | `↑` / `↓` | lightbox open | tilt the foil (step 7°, clamped) — card focus **not** required | none |
| Lightbox | `Enter` / `Space` on the exhibit card | target is the full card | flip | per Card Flip |
| Any dialog | `Escape` | native; ✕/Escape close at any time — backdrop clicks inert during the pack reveal only | close dialog | per Dialog Open / Close |

**Accessibility**:
- Every shortcut is *redundant*: `P` duplicates the visible button, `F` duplicates tap/click, arrows duplicate swipe. Nothing is shortcut-only.
- Shortcuts that exist are advertised in copy at their point of use: the `P` hint under the stage trigger; the arrows/flip/tilt hints inside the lightbox (both languages, `<kbd>` marked up).
- Single-letter shortcuts must not fire while typing (guard: input/textarea/select/contenteditable) or with modifier keys held.
- No announcement needed for `P` — the pack opening is its own feedback.

**Animation spec**: n/a.

**Implementation Notes** (Svelte 5): one `svelte:window on:keydown` handler with the scope branches (v1's `onKeydown` structure, carried over); the new branch is card-focused arrows → tilt store. Do not attach separate listeners per element for these keys.

---

### Supporting Patterns

> Brief specifications for the shared vocabulary every pattern above leans on.

---

#### Close Button

**Category**: Input · **Status**: Draft
**When to Use**: The icon-only `×` in both dialogs' corners. **When NOT to Use**: Anywhere a text label is needed; never the only way to close (Escape + backdrop, where applicable, are alternatives).
**States**: default (icon, aria-label "Pack schließen / Close pack" or "Diese Karte schließen / Close this card"); hover (brighten, 80 ms); focus (ring); active (scale 0.98); **never disabled in the pack dialog — the ✕ is LIVE at all times, including mid-reveal (deliberate skip path per Dialog Open / Close); backdrop clicks are inert during the reveal only**. Target ≥ 44 × 44 CSS px.
**Accessibility**: real `<button>`, `aria-label` from the copy deck (both languages), SVG `aria-hidden`. **Animation**: none beyond hover. **Notes**: keep the two instances' labels distinct — closing the pack and closing an exhibit are different acts in the copy deck.

---

#### Live Region Announcement

**Category**: Feedback · **Status**: Draft
**When to Use**: Every state change a screen-reader user must know without focus moving: pack opening, haul summary, exhibit open, flip, restart, language switch, department completion, milestones, share status. **When NOT to Use**: Anything the user just did with focus already on the result.
**Spec**: two regions owned by the announcer store (ADR-0010 §1) — `#live-status` (`role="status"`, polite) for every announcement, and `#live-alert` (`role="alert"`, assertive), which ships **empty**: it is admitted only for a critical failure the visitor must act on and cannot otherwise discover, so today it has no writer and is never reached for casually. Components never touch a region; they call `announcer.say(message, { key })`. Updates are text writes; rapid successive messages replace, never queue, and a repeated identical string is blanked then rewritten so it is announced again. While a modal `<dialog>` is open the two nodes are relocated into it (`announcer.follow` / `announcer.release`) so they are not inert — a dialog-opening line is written before `showModal()`. Errors and share results are announced here, and the visible share line (`live.share`) is plain text with no live semantics: one event, one voice. All announcement strings live in the copy deck in both languages, with a terminal `!` neutralised before the write (§0.4.4, §11 D26).
**Notes**: Keep announcements under ~2 sentences; the haul summary lists card names joined with commas ("4 Karten: A, B, C, D." / "4 cards: A, B, C, D.").

---

#### Empty State

**Category**: Feedback · **Status**: Draft
**When to Use**: The collection grid when zero photos exist. **When NOT to Use**: For transient loading.
**Spec**: Rule — every empty state has a message, the exact next action, and no blame. DE: *"Noch keine Karten. Leg Elsa-Fotos in den Ordner photos und führe dann npm run photos aus."* / EN: *"No cards yet. Put Elsa's photos in the photos folder, then run npm run photos."* The curator is the only person who can act, and the message speaks to them in the page language. The pack trigger reads "Noch keine Karten" / "No cards yet" and is disabled. Tone: friendly, factual, no "Error".

---

#### Loading State

**Category**: Feedback · **Status**: Draft
**When to Use**: While the photo manifest resolves (`photos.php?list=1` → `photos.json` → empty).
**Spec**: Text-only indicators — "Karten werden gesucht" / "Finding the cards" (stage + masthead), "Karten werden geladen…" / "Loading cards…" (grid). No spinners; the parlour's stillness is part of its character. Timeouts: 3 s (PHP) / 4 s (JSON), then the next source or the empty state — a visitor must never wait longer than ~7 s before seeing *something* interactive. Layout must not shift when content replaces the loading text (reserve line heights). Reduced motion: n/a.

---

#### Error State

**Category**: Feedback · **Status**: Draft
**When to Use**: Silent failures (manifest fallback) show *nothing*; user-visible failures show soft copy. **When NOT to Use**: Never block the experience with an error modal — the library has no modal error state by design.
**Spec**: Principle — error messages are never the reader's fault; they say what happened and what to do next. The catalogue failure is the one user-visible load error: `state.error.catalogue` — "Die Sammlung kommt gleich wieder." / "The collection will be back shortly." — on the stage, with the retry (`state.error.retry`, "Nochmal versuchen / Try again") living with the collection's Error state. Share fallback and the noscript notice are the other two visible strings, both with a usable next step. New failures (e.g., HEIC conversion) degrade silently into readable card frames, never into error text aimed at visitors.

---

## Animation Standards

> These timings apply to ALL patterns above. Consistency here is what makes the
> parlour feel like one designed room rather than a collection of effects.
>
> **Durations are tokens, not values.** Motion values are authored in
> `design/art/motion-sheet.md` §3 (source `design/tokens/motion.ts`, emitted as
> `--elsa-*`) and consumed in card/surface CSS via `var()` only. This table maps
> those tokens onto this library's surfaces and quotes their values so a reviewer
> does not need two files open; **the sheet is the SSOT — a value changes there
> first and this table follows in the same commit.** Rows with no `--elsa-*`
> token (tilt/foil springs, craft-study `ref` values) are local to this library.

| Animation Type | Duration (ms) | Easing / Physics | Notes |
|---------------|--------------|------------------|-------|
| Button hover / focus enter | 80 | ease-out | Snappy, never sluggish |
| Button hover / focus exit | 60 | ease-in | Faster exit than entry |
| Button press scale down | 60 | ease-in | Immediate acknowledgment |
| Button press scale up (release) | 80 | ease-out | Slightly bouncy |
| Dialog open (`--elsa-dur-dialog-in`) | 200 | `--elsa-ease-out` | Scale 0.96 → 1 + backdrop fade |
| Dialog close (`--elsa-dur-dialog-out`) | 160 | `--elsa-ease-in` | Faster than it opens |
| Pack sachet tear / opening | 900 | ease-out | Center viewport; theatre, outside the motion sheet's vocabulary |
| Card enters the focus frame (`--elsa-dur-cardin`) | 300 | `--elsa-ease-soft` | **Replaces the retired 200 ms stagger + 700 ms ascend**; one card at a time, transform + opacity |
| Camera, focus → focus (`--elsa-dur-focus`) | 380 | `--elsa-ease-focus` | Never simultaneous with a card in motion |
| Hand-off overlap (`--elsa-overlap`) | 133 (35 % of the camera move) | — (start offset) | Next card enters at 65 % of the dolly |
| Hold beat (`--elsa-hold-beat`) | 260 | — | Minimum stillness on a settled focus card, before the next dolly |
| Camera pull-back, `c: 1 → 0` (`--elsa-dur-pullback`) | 760 | `--elsa-ease-pullback` | The only move > 700 ms in the product; last ~290 ms is pure stillness |
| Card travels to its grid cell (`--elsa-dur-tile`) | 260 | `--elsa-ease-soft` | Runs inside the pull-back; 40 ms forward stagger, max 4 |
| Grid text-line stagger (`--elsa-stagger-line`) | 60 (interval) | linear (interval) | Max 3 lines; never on re-entry |
| Card tilt spring | — (continuous) | stiffness 150, damping 15 (ref) | Pointer-follow; yaw ±17°, pitch ±15° targets |
| Keyboard tilt step | 7° per press, clamp ±18°/±20° | same spring (ref) | On the focused exhibit card |
| Idle sway cycle | — (continuous) | sin-based, yaw ±13°, pitch ±7° (ref) | Starts after 2.6 s without pointer input |
| Card flip spring (`--elsa-dur-flip`) | 420 | stiffness 110, damping 13 (ref) | `rotateY` ±180° + translateZ lift to ~30 px mid-flip; never during a camera move |
| Card browsing content swap | 150 | ease-out | Cross-fade in lightbox |
| Progress / set fill | 300 | ease-out | Width or ratio transition |
| Tile hover lift | 80 | ease-out | ~4 px translate |
| Glare sweep (drop cards, tiles) | ~600 | linear | Single background-position step; no rAF |
| Confetti burst | ~1200 | — | **Capstone only** — never the pack dialog or a card surface (motion-sheet §8; a holo find earns the 520 ms glint) |
| Status line (share) enter / exit | 200 / 200 | ease-out / ease-in | Auto-clear after 3.4 s |
| Milestone completion flourish (`--elsa-dur-flourish`) | 520 | `--elsa-ease-out` | One glint pass, one-time, set-scale; never page-scale |
| Tile entrance ("Zuwachs") | 260 per tile | `--elsa-ease-soft` | 40 ms forward stagger, max 4 (no long queues) |

**Motion reduction overrides** (`prefers-reduced-motion: reduce` — canonical
behavior, not an afterthought):
- Pack reveal: **all four cards render in their final grid at first paint** — the
  pull-back's final frame. No sachet theatre, no camera, no focus sequence, no
  card entrance, no burst, foil static at centre (PRD F22, motion-sheet §5). The
  stage is never `inert`, so nothing is locked out during a sequence that is not
  playing. The reveal-order rule survives as DOM order (highest rarity last).
- Sound under reduced motion: rip and per-card ticks are skipped; **one soft tick
  at t = 0** carries the layout, no chime (motion-sheet §5, sound-bible).
- Tilt & foil: **fully static** — no idle sway, no pointer tilt, layers fixed
  at center position. (The craft study's damped-tilt alternative is
  deliberately not adopted; the Standard tier's "no foil movement" wins.)
- All slide/scale animations are replaced with fades at 50 % duration; the
  card flip becomes an instant swap (≤100 ms cross-fade).
- Looping/ambient motion (foil drift, motes canvas) is replaced with static
  equivalents.
- No functionality is lost: every state change still happens, only the
  movement is removed. Copy, order, and text markers carry the choreography.

---

## Sound Standards

> All audio is synthesized WebAudio — zero audio assets, consistent with the
> no-dependency constraint. The palette is deliberately small: five core
> categories cover everything. Sound respects the toggle
> (`lucky-elsa.sound.v2`, default on), requires a prior user gesture (the
> `AudioContext` resumes on the pack-open gesture), and is always an
> enhancement layer: nothing is sound-only. Master output gain ~0.55 (ref);
> the `holo-card-ref.html` study's recipes (noise bursts, sine chime with
> 2.76× overtone, exponential decay) are the starting point for the synth
> module.

| Interaction Event | Sound Category | Notes |
|------------------|---------------|-------|
| Pack open (tear) | Pack Rip | Descending filtered noise burst (~2400 → 520 Hz, ref tear) + a few micro-ticks; "foil ripping". The signature sound. |
| Card reveal (each card) | Card Tick | Very short bandpass tick per arriving card; must not fatigue across four cards or repeated expeditions. |
| Rare card reveal | Rare Chime | Two-note rising figure, quieter than holo. Distinct from the tick; reward, not alarm. |
| Holo / chase card reveal | Holo Shine | Sine chime with shimmer overtone (ref chime recipe: notes at 1318–3136 Hz + 2.76× partial, ~1.6 s decay); the "it shines" moment. Chase card uses the same sound — its gold frame is the visual differentiation, not a louder sound. |
| Milestone (department complete, 25/50/75 %) | Milestone Chime | Single warm tone, quieter than holo. Celebratory but brief — the collection changes quietly, not with fireworks. |
| Elsas Ehrenmensch earned (100 %) | Ehrenmensch Chime | The one fullest, longest tone in the palette; fires once, ever (flag-guarded). |
| Dialog open | Modal Open — soft tick | Quieter variant of Card Tick; draws attention without a new timbre family. |
| Dialog close | Modal Close — soft tick | Slightly lower pitch than open. |
| Card flip | Flip Tick | Short filtered sweep (~1400 → 4200 Hz, ref flip); same family so flipping stays "physical". |
| Toggle ON (sound, language) | UI Toggle On | Snappy click. Only on switching *on* / switching language. |
| Share success | UI Success | Soft two-note confirm. |
| Share failure | UI Error | Subtle dull thud — communicates "didn't work" without harshness; the status line carries the actual message. |
| Reset confirmed | UI Confirm — Destructive | Final, slightly weighted tone. The one "this is real" sound. |
| Reset confirmation open | UI Warning | Brief attention-catching tick, distinct from confirm. |
| Button hover / focus | **none** | Deliberate deviation from game-UI convention: on a web page opened from a chat, hover ticks read as noise. Focus silence also keeps rapid `Tab` navigation calm. |
| Confetti / celebration | none (visual only) | The holo chime already covers the beat; doubling it with a fanfare tips into marketing voice. |

---

## Gaps & Patterns Needed

- **Ehrenmensch presentation**: Elsas Ehrenmensch (the collection-header
  capstone) and the Das Gesamtverzeichnis / The Master Index plaque need a
  presentation pattern (shareable certificate surface) before the completion
  meta is built. It will likely combine Dialog Open / Close + Share Button +
  Save / Download Link; specify it as its own entry once the certificate's
  shape exists (blocked on art direction).
- **Swipe spec hardening**: the swipe thresholds in Card Browsing are design
  targets, not validated numbers — needs one touch playtest pass (Playwright
  touch emulation gets us halfway; real-device observation is the goal).
- **Print stylesheet for Elsas Ehrenmensch**: if printable, add a Print
  variant entry (what prints, what is hidden).

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Does native `<dialog>` focus cycling hold up in Safari ≤ 15 (known focus quirks)? Verify on the oldest supported Safari; if broken, a minimal focus-trap helper is needed. | ui-programmer + ux-designer | Before dialog refactor merges | Unresolved |
| Should the pack dialog's backdrop click stay protected after the reveal settles (current behavior: not bound), or close the dialog then? | ux-designer | First playtest round | **Resolved (owner ruling)**: backdrop is inert *during* the reveal (mis-tap protection); after reveal-complete everything is live — backdrop click closes, same as the lightbox. See Dialog Open / Close. |
| ~~Is 200 ms the right reveal stagger on mobile at expedition #20?~~ **Withdrawn 2026-11-22 — the reveal is one card in focus, not a stagger; see pack-opening.md §15** | — | — | withdrawn |
| Should the reset confirmation's "what is lost" line also mention that sound/language preferences reset — or is the current one-liner enough? Project facts settle the *behavior* (all keys cleared); only the copy emphasis is open. | ux-designer + owner | Before reset implementation | Unresolved |
| Tile entrance cap of ~2 s for large "Zuwachs" batches — acceptable, or should new tiles simply not animate above 10 additions? | ux-designer | First large-upload test | Unresolved |
| Does the lightbox need visible prev/next affordances (chevrons) in addition to keys/swipe for discoverability? | ux-designer | First mobile playtest | **Resolved (owner ruling): yes, chevrons** — added as a variant row in Card Browsing (touch parity with ← →, min 44 × 44 targets). Only their placement/labels need a mobile playtest look. |
| Idle sway on the exhibit card is on by default (2.6 s after last input) — confirm it reads as "alive" and not as distraction for reduced-motion-adjacent users who don't set the preference. | ux-designer | First desktop playtest | Unresolved |
