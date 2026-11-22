# UX Spec: Pack Opening (The Accession — #pack-dialog)

> **Status**: In Design
> **Author**: user + ux-designer
> **Last Updated**: 2026-11-22
> **Journey Phase(s)**: Reward loop — request accession → wrapper theatre → four cards revealed one at a time under a spotlight → camera pulls back into the settled grid → inspect
> **Screen / Flow Name**: `PackOpening` (`#pack-dialog`)
> **Platform Target**: Web — mouse / touch / keyboard (no gamepad; static IONOS deploy)
> **Pack size (owner ruling, 2026-11-22 — binding)**: **4 cards.** The holo lands **slot 3 or slot 4, never first**. The reveal is **one card in focus at a time** — a row of cards appearing side by side is explicitly rejected ("shows cards horizontally at the same time" was the defect).
> **Related GDDs**: `PRD.md` §4.1 F1, F4–F6, F22; §4.2 F18–F22; §5 Design row ("the pack tears open in the center of the viewport and cards reveal one at a time")
> **Related ADRs**: ADR-0001 (owner decision): Svelte 5 + Vite 8 + TypeScript strict, built locally, deployed statically to IONOS; `photos.php` stays the runtime manifest source
> **Related UX Specs**: `stage-landing.md` (parent, entry triggers), `card-detail.md` (child, opened from a selected card), `binder.md` (where the pulled cards land)
> **Accessibility Tier**: Standard
> **Template**: UX Spec

> **Positioning note (binding)**: *Elsa the Explorer* is a card library /
> Sammelwerk. A pack is an **accession** ("Neuzugang"): the wrapper theatre is
> the unboxing of new material for the collection, and the reveal is presented the
> way a catalogue presents new entries — each card gets its moment, the foil
> card is the find of the day. Copy stays in the museum-catalogue register with
> the warm, dry humour; *du* register in German. This spec is written as a
> **refactor**; the current `#pack-dialog` markup and the sachet keyframes in
> `style.css` ("Open-card fit and pack theatre" block) are the starting point.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

The visitor pulled the ribbon; now the site owes them a small ceremony. What
they need is a felt sequence — the wrapper arrives, strains, tears — and then
**one card at a time**, each alone under the light, before the camera pulls back
and the four settle into a contact sheet they can actually read, pick up, and
send on. A row of cards appearing side by side is not a reveal; it is a dump,
and it is withdrawn. The reveal is the reward for coming; without it the library
is just a folder. The screen must also honour the contract the landing made:
four cards, never a duplicate among them, at least one in foil, and nothing
repeated before the whole catalogue has been through.

**The player goal** (what the player wants to accomplish):

Watch four new Elsa cards be revealed one by one, then open at least one of
them big (M6: more than one of the four gets opened).

**The game goal** (what the game needs to communicate or capture):

Deliver the fairness contract visibly (F1, F4, F5, F6), mark the four cards
collected at the right moment, and hand the visitor naturally to the next
loop ("Noch ein Pack") or to the catalogue.

> **Motion authority**: every duration, curve, camera value and reduced-motion
> behaviour in this spec comes from `design/art/motion-sheet.md` (owner:
> art-director). On **timing or movement** that sheet wins; on **layout, order and
> copy** this spec wins. Where this document restates a number it is quoting the
> sheet's token, named in parentheses — never a local value.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Tapping the seal / CTA / pressing `P` on the landing (or tapping "Noch ein Pack" from the card lightbox). |
| What is their emotional state? | Anticipation at its peak; attention focused; zero patience for anything between them and the cards. |
| What cognitive load are they carrying? | Low, and it must stay low — this is the leisure moment of the whole product. |
| What information do they already have? | The promise ("four cards, one shines"); repeat visitors also know their catalogue count. |
| What are they most likely trying to do? | Watch the reveal, then grab the shiniest card. |
| What are they likely afraid of? | That the moment is over too fast to read anything; that the cards are thrown at them all at once; that motion/sound assaults them; that tapping a card "uses it up"; that closing loses the cards. |

**Emotional design target for this screen**:

A held breath and a small gasp — "oh, look at her" — four times in a row, then
the quiet satisfaction of the set laid out: *this is what I acquired*.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Root — StageLanding
      └── Parent — PackOpening (#pack-dialog, modal)
            └── Child — CardDetail (#card-dialog, opens on top) → card-detail.md
```

**Modal behavior**: Modal (native `<dialog>.showModal()`). Blocks the page
behind it; requires explicit dismiss. **Dismissal canon (owner, 2026-11-22 —
the library's Dialog Open / Close now agrees): `Escape` and the ✕ button are
live at all times, including mid-reveal; backdrop clicks are ignored during
the reveal** (the haul must never be killed by a stray click, but the visitor
is never caged). A half-revealed pack is
never lost (see §6 Recovered). Undismissable-by-design would be indefensible
here; the reveal is short (≈3.1 s from the first card, ≈4.1 s including the
900 ms wrapper theatre) and interrupting it simply skips the theatre.

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Landing CTA / seal / `P` | `stage-landing.md` §4 | Primary path |
| "Noch ein Pack" (card lightbox) | `card-detail.md` | Closes the lightbox, opens the theatre — the loop closes on itself |
| "Noch ein Pack" (this dialog's footer, new in the refactor) | Post-reveal state | Shortens the loop by one screen for the repeat-pull visitor |
| Reduced-motion path | Same triggers | Theatre and camera skipped, four cards already in the settled grid (F22) |

---

## 4. Entry & Exit Points

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| `pack:open-request` accepted | StageLanding / CardDetail | Modal fade+scale open (`--elsa-dur-dialog-in`, 200 ms), then theatre | draw result (4 photo refs + reveal order) from the pack system | Draw happens before the dialog opens; the dialog is pure presentation |
| `P` while dialog open | — | No-op | — | Guarded; stage hotkey suspended |

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Escape / ✕ (backdrop **only outside the reveal**) | StageLanding (or CardDetail if it is open beneath) | Modal close (`--elsa-dur-dialog-out`, 160 ms; instant reduced-motion) | Focus returns to the **trigger**: the lightbox's "Noch ein Pack" when this dialog opened from CardDetail, else `#open-pack` (Focus Trap ladder) | **Mid-reveal skip catalogues only the cards already revealed; the remainder stay uncollected** (Ruling 1b); the pack can be reopened immediately; nothing is lost |
| Tap a revealed card | CardDetail (child modal on top) | Modal open | photo id | Parent dialog stays open underneath |
| "Noch ein Pack" (footer) | Itself (new accession) | Close-and-reopen via `pack:open-request` | — | Disabled until reveal completes |
| "Zur Sammlung" (footer) | Binder section | Close + anchor scroll | — | Round-2 footer link; gives the pulled cards a destination |
| Second lap begins (catalogue exhausted) | Same dialog | Inline restart moment | Lap number derived per GDD R-H at pull time (not stored as an integer) | Announced; "2. Auflage" stamps apply from now on |

---

## 5. Layout Specification

### 5.1 ASCII Wireframe

#### The stage model (one container, one camera)

The reveal is **a camera moving over a laid-out plate**, not four independent
card animations (motion-sheet §2). Three consequences that shape every number
below:

1. **One stage container** — `.pack-stage` — is the camera viewport:
   `overflow: hidden`, `contain: layout paint`, one composited layer for the
   duration of the sequence only. It holds the light pool, the counter and **one
   world plane**.
2. **The world plane is already the final grid.** `.pack-stage__world` contains
   the 2×2 (≤760 px) or 1×4 (≥761 px) arrangement from the first paint, in DOM
   order 1→4. Cards **never change position and never animate out** — the
   previous card is simply left behind by the camera ("nothing exits backwards",
   motion-sheet §2). What the owner asked for as *"the layout zooms out and the
   cards move into their final arrangement"* and *"the camera pulls back"* is
   one event seen from two sides: the arrangement is already the truth, the
   camera stops hiding it.
3. **Focus is a camera state, not a card state.** A single `--focus` index
   `i ∈ {−1, 0..3}` (with `−1` = before the first beat) selects one of two
   composed states: `focus(i)` (`c = 1`) and `overview` (`c = 0`). The camera
   transform is written on the world plane only:
   `translate3d(var(--cam-tx), var(--cam-ty), 0) scale(var(--cam-scale))` with
   `transform-origin: 0 0`. Cards inside carry **no** camera transform.

**Solved camera, never tuned** (motion-sheet §2): the world point that must
land on the stage anchor is the focused card's **photo-window centre**; the
anchor is **50 % / 42 %** of the stage box (the same 42 % as
`object-position: center 42%`, so the reading line never shifts between focus
and overview). With `p` = the card's photo-window centre in world coordinates,
`a` = the anchor, `s = --cam-scale`:

```
--cam-tx:  calc(var(--anchor-x) - var(--cam-scale) * var(--focus-x))
--cam-ty:  calc(var(--anchor-y) - var(--cam-scale) * var(--focus-y))
```

`--focus-x` / `--focus-y` are the focused card's photo-window centre, written
inline per step (4 small style writes for the whole reveal, no layout reads —
motion-sheet §6 "measure once, before the sequence"). Pull-back interpolates
both camera axes by closeness `c(τ) = 1 − ease-pullback(τ)`: at `c = 1` the
values above, at `c = 0` scale `1` and translation `0`.

**Focus scale is derived, not chosen** (motion-sheet §2): the focused plate's
short edge fills **74 %** of the stage's short edge, clamped `[1.25, 2.40]`.
It falls out of the card size, so the card size is set by the layout and the
scale is computed:

```
--cam-focus: clamp(1.25, calc(0.74 * min(var(--stage-w), var(--stage-h)) / var(--card-w)), 2.40)
```

| Stage | Layout | `--card-w` | `--cam-focus` at 390 × 420 | at 1100 × 420 |
|-------|--------|-----------|---------------------------|----------------|
| ≤ 760 px dialog | 2 × 2 | `min(calc(var(--card-h) / 1.42), calc((100% - var(--gap)) / 2))`, `--card-h: calc((var(--stage-h) - var(--gap)) / 2)` | ≈ 144 px → **2.00** | — |
| ≥ 761 px dialog | 1 × 4 | `min(calc(0.74 * var(--stage-h) / 1.3), calc((100% - 3 * var(--gap)) / 4))` | — | ≈ 239 px → **1.30** |

The sheet's measured reference values (**≈ 1.9** for 2 × 2, **≈ 1.3** for one
row) are what these formulas produce at the reference breakpoints; the clamp is
the sheet's camera cap 2.40. On a 320 × 480 dialog the derivation lands at
≈ 2.34 — still inside the cap; *shrink the card, not the room* (motion-sheet
§6).

**What the focus frame shows.** At `c = 1` the visible world window is
`stage / --cam-focus` (≈ 195 × 210 px at 390 × 420). The focused card fills it;
the following facts are deliberate:

- cards **not yet revealed** are `opacity: 0` — not dimmed, *absent*. Nothing
  leaks early, so the frame holds exactly one plate (the owner's defect: "cards
  horizontally at the same time").
- cards **already revealed** stay at `opacity: 1` where the camera left them;
  at the focus framing at most **~13 px** of a neighbouring cell's edge can
  peek (gap + margin). That rim is context, not a row — and the light pool
  (`--elsa` radial highlight, static geometry, `aria-hidden`) keeps the eye on
  the centre. No parallax, no tilt, no foil drift during the reveal.
- the **counter** (`1 von 4` … `4 von 4`) sits in the stage's top-left corner,
  outside the world plane, so the camera cannot scale or pan it. The motion
  sheet names it as a required element and requires it to survive reduced
  motion, so it is present for the whole dialog lifetime; `aria-hidden="true"`
  (the live region carries the same fact in words).

#### Wireframe A — reveal, card 2 of 4 in focus, mobile (c = 1)

```
╔══════════════════════════════════════════════════╗
║ Elsa the Explorer · 1. Auflage · vier frische … [✕]║
║ Dein Neuzugang                                    ║
║ ┌── .pack-stage (camera viewport, clipped) ─────┐ ║
║ │ 1 von 4                            · light ·  │ ║
║ │                ┌──────────────┐               │ ║
║ │                │   ┌──────┐   │  ← card 2      │ ║
║ │                │   │photo │   │    photo-window│ ║
║ │                │   ├──────┤   │    centre on   │ ║
║ │                │   │ name │   │    50 % / 42 % │ ║
║ │                │   │★★★   │   │               │ ║
║ │                │   │moment│   │  card 1 is off │ ║
║ │                │   └──────┘   │  -frame left;  │ ║
║ │                └──────────────┘  cards 3–4 at  │ ║
║ │                                   opacity 0    │ ║
║ └───────────────────────────────────────────────┘ ║
║            (hint and footer still absent)         ║
╚══════════════════════════════════════════════════╝
```

#### Wireframe B — settled, mobile ≤ 760 px (c = 0): 2 × 2

```
╔══════════════════════════════════════════════════╗
║ Elsa the Explorer · 1. Auflage · vier frische … [✕]║
║ Dein Neuzugang                                    ║
║ ┌── .pack-stage (c = 0, cards at rest) ─────────┐ ║
║ │ 4 von 4                                       │ ║
║ │   ┌──────────┐      ┌──────────┐              │ ║
║ │   │    1     │      │    2     │              │ ║
║ │   │  photo   │      │  photo   │              │ ║
║ │   │  name    │      │  name    │              │ ║
║ │   │  ★★      │      │  ★★★     │              │ ║
║ │   └──────────┘      └──────────┘              │ ║
║ │   ┌──────────┐      ┌──────────┐              │ ║
║ │   │  ★★FOLIE │      │    4     │              │ ║
║ │   │    3     │      │  photo   │              │ ║
║ │   │  photo   │      │  name    │              │ ║
║ │   │  name    │      │  ★★★★    │              │ ║
║ │   └──────────┘      └──────────┘              │ ║
║ └───────────────────────────────────────────────┘ ║
║ Tippe eine Karte an.                              ║
║ ┌──────────────────┐  ┌───────────────┐           ║
║ │  Noch ein Pack   │  │  Zur Sammlung  │           ║
║ └──────────────────┘  └───────────────┘           ║
╚══════════════════════════════════════════════════╝
   (card--drop ×4; holo occupies slot 3 OR slot 4, never 1 or 2)
```

#### Wireframe C — settled, desktop ≥ 761 px (c = 0): 1 × 4

```
╔════════════════════════════════════════════════════════════════════════╗
║ Elsa the Explorer · 1. Auflage · vier frische Karten             [ ✕ ] ║
║ Dein Neuzugang                                                         ║
║ ┌── .pack-stage (c = 0) ────────────────────────────────────────────┐  ║
║ │ 4 von 4                                                          │  ║
║ │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                     │  ║
║ │  │   1    │ │   2    │ │   3    │ │ ★FOLIE │                     │  ║
║ │  │ photo  │ │ photo  │ │ photo  │ │ photo  │                     │  ║
║ │  │ strip  │ │ strip  │ │ strip  │ │ strip  │                     │  ║
║ │  │ moment │ │ moment │ │ moment │ │ moment │                     │  ║
║ │  │ stats  │ │ stats  │ │ stats  │ │ stats  │                     │  ║
║ │  │ serial │ │ serial │ │ serial │ │ serial │                     │  ║
║ │  └────────┘ └────────┘ └────────┘ └────────┘                     │  ║
║ └──────────────────────────────────────────────────────────────────┘  ║
║ Tippe eine Karte an.                                                   ║
║ ┌──────────────────┐  ┌───────────────┐                                ║
║ │  Noch ein Pack   │  │  Zur Sammlung  │                                ║
║ └──────────────────┘  └───────────────┘                                ║
╚════════════════════════════════════════════════════════════════════════╝
```

**Both breakpoints, reduced motion (`prefers-reduced-motion: reduce`)**: the
same frame as B / C at first paint — no theatre, no camera, no card entrance.
This is the *final frame of the choreography*, composed deliberately
(motion-sheet §1.5), not a stripped leftover: pool at rest, counter `4 von 4`,
hint and footer visible.

**Theatre phase** (pre-reveal, both breakpoints, full-motion only): the
`.pack-stage` is empty except the light pool and the
`pack-dialog__sachet` — the wrapper art with a photo window, wordmark, edition
line, top crimp and the serrated tear line. The theatre is *replaced* by the
stage in one cut at its end; there is no zoom-out before the first card
(motion-sheet §2, forbidden axis).

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Dialog head | Eyebrow, title, ✕ | 100% × ~56px | No | Eyebrow truncates with ellipsis; ✕ is 44px hit target |
| Theatre | Wrapper sachet during the opening (removed at the cut) | ~min(420px, 86vw) × ~min(560px, 60svh) | No | Scales down with viewport; never scrolls |
| **Stage** (`.pack-stage`) | **The camera viewport.** Holds the world plane (2×2 / 1×4), the light pool and the counter. `overflow: hidden`, `contain: layout paint` | ≤760 px: 100% × `clamp(300px, 56svh, 460px)`; ≥761 px: 100% × `clamp(280px, 46svh, 420px)` | **Only under 420 px stage height** (see below) | Cards are sized from the stage, so the default frame never clips a card and never forces the dialog to scroll |
| Stage counter | `1 von 4` … `4 von 4`, inside the stage, outside the world plane | ~64 × 18 px, top-left | No | Fixed; never scaled or panned by the camera; `aria-hidden` |
| Light pool | Radial highlight behind the focus card (`.pack-stage__pool`) | stage inset | No | Decorative, `aria-hidden`, static geometry, opacity-only; absent under reduced motion |
| Hint line | One instruction line: "Tippe eine Karte an." | 100% × ~20px | No | Hides under 380px height (current behaviour kept) |
| Footer actions | "Noch ein Pack", "Zur Sammlung" | 100% × ~52px, post-reveal only | No | Buttons wrap to 2 rows on ≤380px |

**The dialog itself never scrolls.** `max-height: calc(100svh - 36px)` with
`overflow: hidden` (current implementation kept). The one exception is the
**very short viewport** (stage height < 420 px — a 320 × 480 dialog is exactly
this tier): two rows at legible width cannot fit inside 300 px of stage, and
fitting them by shrinking the card would break the card's printed text. So at
that tier the **stage alone** becomes a contained scroller
(`overflow-y: auto; overscroll-behavior: contain`), while head, hint and footer
stay outside it and never move. That is a stage that scrolls, not a trap: the
✕ never leaves the screen, `Escape` always works, and focus-scroll-into-view
keeps the focused card fully visible (§7.1). Above 420 px of stage height
nothing in this dialog scrolls at all.

Arithmetic for the tier boundary: a 2 × 2 needs
`2 × card_h + gap ≤ stage_h`, and `card_h = card_w × 1.42` with
`card_w ≥ 132 px` (the floor at which the plate's smallest printed line stays
legible). `2 × (132 × 1.42) + 12 = 387 px` — hence 420 px as the generous
threshold rather than 387.

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| `PackTheatre` | **Svelte 5 component** (one line: owns the phase machine — `theatre → revealing → pulling-back → settled` — the sachet, the cut, the camera and the reveal clock as a single mount point) | all | The whole accession flow as one boundary | Yes | Refactor of current `#pack-dialog` inner DOM |
| `.pack-dialog__head` | Header | head | Eyebrow + title + close | Yes | Yes |
| `.pack-dialog__sachet` (+ `__crimp`, `__flap`, `__photo`, `__seal-name`, `__seal-copy`, `__tear`) | Composite visual | theatre | The wrapper, adopting the reference study's top/bottom **crimps** and wrinkle streaks in addition to the current art | Yes | Yes (extended) |
| `.pack-dialog__flash` | Overlay | theatre | Tear flash frame | Yes | Yes |
| **`.pack-stage`** | **Container** (camera viewport) | stage | Clips the camera, owns `--cam-tx/--cam-ty/--cam-scale` and the `--focus` index; `inert` while `phase !== "settled"` | Yes | New |
| **`.pack-stage__world`** | Plane (grid) | stage | The 2×2 / 1×4 arrangement in DOM order 1→4; carries the single camera transform; `transform-origin: 0 0` | Yes | New |
| **`.pack-stage__pool`** | Decoration | stage | Light pool behind the focus card (radial, static geometry, opacity-only) | Yes | New |
| **`.pack-stage__count`** | Text (`aria-hidden`) | stage | `1 von 4` … `4 von 4` — the motion sheet's required counter | Yes | New |
| `CardTile` (variant `card--drop`) | **Svelte 5 component** (one line: the shared card renderer, size-variant `drop`) | stage | Each revealed card is a real `<button>`; renders its frame + printed text synchronously, photo async | Yes | Shared with binder + pack |
| `.pack-dialog__hint` | Text | hint | "Tippe eine Karte an." (the swipe half is withdrawn — there is no carousel) | Yes | Yes |
| `.pack-dialog__actions` | Button row | footer | "Noch ein Pack" (primary) + "Zur Sammlung" (outline) | Yes | "Noch ein Pack" reuses the lightbox action label |
| `#live-status` live region | Status | body | Announcements (per card + completion) | Yes | Yes |
| `2.-Auflage` stamp | Badge (on plate) | stage cards | Marks second-lap pulls — **GDD R6, Phase 3** (lap derived per R-H at pull time); catalogue tiles never show stamps (R6) | No (Phase 3) | New — defined with card-detail.md §5 |
| `.card__set-chip` ("aus: {Set}") | Chip (on drop card, below the rarity label) | stage cards | **GDD R1 — ships at Vertical Slice** on the shared `CardTile`; `new-acquisitions` cards show **no chip** (R1: the chip speaks only when the card has a room) | Yes (VS) | Shared with binder + lightbox |

**Withdrawn from this screen**: the `.confetti` canvas. Motion-sheet §8 lists
"confetti on every pull" as a defect and grants confetti to the capstone at
most; a holo find earns the glint flourish instead (`--elsa-dur-flourish` =
520 ms, one pass across static geometry). **Flagged for the owner** (§15).

**Pattern references** (`design/ux/interaction-patterns.md`): Pack-Open Button
(Primary) · Dialog Open / Close · Focus Trap (Dialog) · **Card Reveal Step (the
stage + camera choreography lives there; the motion sheet is its timing SSOT)**
· Pack Roving Arrows (2 × 2 extension) · Card Tilt & Foil Material (static on
drop cards — **no tilt, no parallax during the reveal**) · Close Button ·
Keyboard Shortcut · Live Region Announcement · Error State (share/empty
surfaces live in the parent specs). **`Pack Scroll-Snap Swipe` is no longer
used by this screen** — the ≤760 px layout is a 2 × 2, so there is nothing to
swipe.

**Primary focus element on open**: the dialog element itself (current behaviour
kept — `els.dialog.focus()`-equivalent), so Escape works immediately and Tab
starts at the ✕ button. Throughout the reveal the stage is `inert`, so Tab
cannot reach a moving card. **On the last frame of the pull-back** focus moves
to **card 1** (§7.3); the move is part of the completion announcement, not an
extra one.

### 5.4 Information Hierarchy

1. **First: the focused card** — the camera is the screen; nothing competes with
   it. Head, hint and footer are visually recessive during the theatre and the
   reveal (the hint does not exist yet).
2. **Second: the holo card** — rarity is a material difference (foil strength),
   and by canon it lands in slot 3 or 4, so the sequence ends on the find.
3. **Third: the set** — only at the pull-back does the visitor see all four at
   once, and that is the point of the pull-back: intimacy becomes ownership.
4. **Fourth: the hint** — one line, only after the pull-back (during the reveal
   it would read as noise).
5. **Fifth: footer actions** — visible only once the pack is complete; before
   that, acting on the next loop would be premature.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Closed | Default | Dialog not rendered in a11y tree | n/a | |
| Theatre (opening) | Dialog opened, reveal pending | Sachet sequence, 900 ms: arrive from below (0–18%), flex (18–42%), lift (50%), flap tears + jagged tear line + flash (46–61%), wrapper gone (100%). Stage empty apart from the light pool; counter at `0 von 4` | Card selection + footer input locked; **✕ and `Escape` stay live** (they skip the theatre); backdrop clicks ignored | 900 ms is the one duration the motion sheet does not token — inherited from v1 and outside the reveal clock |
| Revealing (focus staging) | Theatre ends (or dialog opens with reduced motion off) | Camera at `c = 1` on card 1; each card enters the focus frame in turn (`--elsa-dur-cardin` 300 ms); the previous card is left where it stands and never animates out; counter `1 von 4` → `4 von 4` | Stage is **`inert`**: cards are not buttons yet, `Tab` reaches only ✕; ✕/`Escape` skip; backdrop clicks ignored | Holo is revealed in slot 3 or 4 (canon). No tilt, no parallax, no foil drift |
| Pulling back | Last card settled (t ≈ 2.39 s) | Camera `c: 1 → 0` over `--elsa-dur-pullback` (760 ms): the 2 × 2 / 1 × 4 becomes visible, the light pool fades out over `--elsa-dur-fade` (140 ms), each card gets one ≤ 8 px settle (`--elsa-dur-tile` 260 ms, 40 ms stagger, +12 % offset) | Still `inert` until the last staggered settle; skipping is still allowed and, at this point, costs nothing — all four are already revealed and already written | The only move in the product longer than 700 ms. Camera is silent |
| Settled (complete) | Pull-back's last settle | Final grid, hint line, footer actions, counter stays `4 von 4`; pool gone | `inert` removed; all four cards focusable from the same frame; focus lands on card 1; arrows/`Tab`/click active; backdrop click now closes | The only state where the pack can be left "open" indefinitely |
| Reduced motion | `prefers-reduced-motion: reduce` | **No sachet, no camera, no focus sequence**: all four cards are present in the final grid at first paint — the pull-back's final frame, composed deliberately. Pool absent, foil static, counter `4 von 4`, hint + footer visible | Reveal completes immediately; **one soft tick at t = 0**; no per-card ticks, no chime; focus on card 1 | Canon + F22 + motion-sheet §5. The counter must survive here |
| Image slow or failed | A drawn photo is slow, fails to load or fails to convert | The **frame and its printed text render synchronously** — plate, name, rarity, moment, stats, serial — with the photo area in its shared `CardTile` shimmer, then the photo or the set-coloured fallback panel. **Never an empty box**, and the reveal clock never waits for pixels | Interaction unaffected; the camera pace never stalls on a network | `loading="eager"`, `decoding="async"`, `fetchpriority="high"` on cards 1–2 |
| Compressed stage | Stage height < 420 px (320 × 480 is this tier) | 2 × 2 at ≥ 132 px card width does not fit; the **stage alone** becomes a contained vertical scroller | Head, hint and footer never scroll; ✕ and `Escape` always live; focus-scroll-into-view on the focused card | No scroll trap: the scroll container is the stage, not the dialog (§5.2) |
| Small catalogue | Catalogue < 4 photos | Grid re-flows without empty cells: 3 → 1, 2 on top and 3 centred beneath; 2 → 1 × 2; 1 → one centred card. Desktop 1 × n | Same rules; announcement states the real count | E.g. "Drei Karten: …" |
| Second lap ("2. Auflage") | Persistence reports lap restart (catalogue exhausted; lap derived per GDD R-H at pull time) | Inline line above the stage: "Von vorn — jede Karte kommt wieder, jetzt mit 2.-Auflage-Stempel. Das Archiv vergisst nichts." + cards pulled from now on carry the stamp on the plate | Announcement: "Das waren alle Karten. Jetzt beginnt das Pack von vorn." | Stamp display = GDD R6, Phase 3; the dialog's stamp line lives in card-detail.md §6 |
| Recovered | Dialog closed mid-reveal (Escape/✕ skip) | Dialog closes cleanly; **Ruling 1b: only the cards already revealed are collected — the remainder are NOT; the pack can be reopened immediately** | Focus returns to the trigger | A card counts as revealed at its own `--elsa-dur-cardin` settle. A skip during the pull-back therefore collects all four |
| Empty | Catalogue empty | Dialog cannot open; landing shows the Empty state instead | `P`/CTA inert | Error surface belongs to the landing (stage-landing.md §6) |

---

## 7. Interaction Map

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Shift+Tab | Keyboard | Cycle: ✕ → card 1…4 → footer buttons → (wrap) | Focus ring per element | none | Focus trap inside the dialog (native `<dialog>`). **During the reveal the stage is `inert`, so the cycle is ✕ → footer-disabled → wrap** |
| `←` / `→` | Keyboard | Move focus one card back/forward in DOM (reveal) order, **wrapping within the visual row** | Focused card shows the ring; the camera does **not** move | none | Roving model (Pack Roving Arrows). In the 2 × 2, `←` from card 1 wraps to card 2, not card 4; the one-row desktop layout wraps at the row ends |
| `↑` / `↓` | Keyboard | **2 × 2 only** (≤ 760 px): move focus a row −/+ (± 2 in DOM order) | Ring moves; card scrolls into view if the stage is in the compressed tier | none | No-op on the 1 × 4 desktop row (a row-jump would be a lie). Sanctioned by exposure, not forced: a visitor who never presses it loses nothing |
| Hover | Mouse | Nothing during the reveal. After settle: the focused/hovered card's **static** foil brightens | No tilt, no parallax, no pointer-tracked foil on drop cards | none | Motion-sheet §4/§8: no idle motion during the reveal; tilt belongs to the lightbox's exhibit card |

**Swipe is gone from this screen.** The ≤760 px layout is a 2 × 2 contact sheet,
so there is no carousel to swipe — `Pack Scroll-Snap Swipe` is marked
Deprecated in the pattern library. Vertical swipe inside the compressed stage
is the contained scroll only (§5.2); it can never reach the page behind the
dialog.

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Click / tap a revealed card | Mouse/Touch | `phase === "settled"` | Open that card in CardDetail | Child modal opens; parent stays | `--elsa-dur-dialog-in` 200 ms | soft tick | Card is marked collected by the card system |
| `Enter` / `Space` on a card | Keyboard | Card focused | Open that card | same | same | same | Native button |
| Escape / ✕ | Keyboard/Mouse/Touch | anywhere | Close dialog | Modal close; focus → the trigger (see §4) | `--elsa-dur-dialog-out` 160 ms; instant reduced | none | Live at all times incl. mid-reveal; **backdrop click closes only after the pull-back's last settle** — never blocks, never discards the accession |
| "Noch ein Pack" | Mouse/Touch/Keyboard | `phase === "settled"` | Close + request new accession | Dialog reopens into theatre | 160 ms gap (current timing kept) | rip | Disabled during busy and during the reveal |
| "Zur Sammlung" | Mouse/Touch/Keyboard | `phase === "settled"` | Close + anchor to `#katalog` | Smooth scroll | 300 ms; instant reduced | none | Round-2 footer |
| `P` | Keyboard | — | **No-op while this dialog is open** | none | none | none | Prevents accidental stacked packs |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Theatre / Revealing / Pulling back | The stage is `inert` (cards unreachable by pointer **and** Tab), footer actions `disabled`; **✕ and `Escape` live at all times; backdrop click ignored until the last settle** | The visitor must not grab a card mid-flight, and must never tab into a card that is about to be left behind; but dismissal must never be caged (canon 2026-11-22) |
| Settled | All inputs active; **the frame in which the last settle lands is also the frame where `inert` is removed and focus moves to card 1** | One transition, one input-unlock moment — no half-live stage |
| Busy ("Noch ein Pack" resolving) | Footer buttons disabled; cards of the old pack inert | One accession at a time |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Draw result (4 photo refs) | Pack system (draw rules: unseen-first F6, no in-pack repeat F5, ≥1 holo F4 via promotion, size = min(4, catalogue)) | Once per `pack:open-request` | Pack system | Ordered array of photo ids + reveal order | Catalogue < 4 → smaller pack; catalogue empty → dialog never opens |
| Reveal order | Pack system (sorts the draw so the guaranteed holo lands in **slot 3 or 4 — never first**; commons/rare fill 1–2; two non-commons → the higher rarity last) | Once per draw | Pack system | Array indices | n/a — deterministic from the draw |
| Collected set (`seen.v2`) | Persistence system | Once per completed reveal (only the cards that landed — Ruling 1b) | Persistence system | id array append | Storage refused → session-only, silent |
| Lap number / "2. Auflage" flag | Persistence system — **not stored**; derived per GDD R-H at pull time from the collection state | Each draw on an exhausted catalogue | Persistence system (derivation) | derived integer | n/a — always derivable |
| Card content (name, mood, caption, rarity, setId, Fantasiewerte) | Card catalogue (photo → card pipeline) | On render | Card source system | photo objects | Missing copy → neutral fallback copy (F2), never invented activities |
| Sound preference | Persistence system (`sound.v2`) | Read on first sound | Persistence system | boolean | Missing → on |
| Photo image (thumb/view) | Card source system | On render | Card source system | URL (+ HEIC flag) | HEIC → in-browser conversion (F22b); failure → frame stays readable without the picture (R7) |

> **Rule**: The dialog never writes state. It renders the pack system's draw and
> fires intent events; `seen.v2` / `flags.v1` are written only by the
> persistence system, first-party, on-device. **Seen-writes happen only at
> reveal-complete — never at draw**: a drawn-but-unrevealed accession marks
> nothing; **with Ruling 1b, a mid-reveal skip writes only the already-revealed
> cards** — "revealed" means the card's own `--elsa-dur-cardin` settle has run,
> so a skip after the last card settles (i.e. any moment during the pull-back)
> collects all four, and the reveal-complete write covers exactly the cards that
> landed. The collection write fires at the **last card's settle**, not at the
> end of the camera: the pull-back is theatre, and a visitor who closes during it
> must not lose a find they already saw.

---

## 9. Events Fired

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| (any entry) | `pack:opened` (system event, on draw) | `{ ids: [4], revealOrder, holoSlot: 3\|4 }` | Persistence + audio + UI | Lap context derived per GDD R-H; audio schedules rip |
| Card settles in the focus frame (×4) | `pack:card-landed` | `{ index, rarity, settledAt }` | Audio system | Fires on the **settle** frame, never on the start (motion-sheet §7.1): tick; chime for rare/holo |
| Last card settles (t ≈ 2.39 s) | `pack:reveal-complete` | `{ ids, revealed: 4 }` | Persistence system | Writes the four ids to `seen.v2` in one write; updates the catalogue. **Before the camera** — the pull-back is presentation, not collection |
| Camera reaches `c = 0` and the last tile settles | `pack:pullback-complete` | `{ focus: null }` | UI only | Marks the frame where `inert` is removed and focus moves to card 1; the hook a Playwright timing assertion waits on |
| Tap a card | `card:selected` | `{ id, source: "pack" }` | Card system → CardDetail | |
| Escape / ✕ / backdrop | `pack:closed` | `{ revealed: 0–4, skippedMidReveal: boolean }` | UI only | Focus-return contract in §4. The count, not a boolean, is what the persistence system needs for Ruling 1b |
| "Noch ein Pack" | `pack:open-request` | `{ source: "repeat" }` | Pack system | |
| "Zur Sammlung" | `nav:katalog` | — | UI only | |
| (none) | — | — | — | No analytics; telemetry-free by PRD decision |

---

## 10. Transitions & Animations

Every duration and curve below is a token from `design/art/motion-sheet.md` §3
(written `--elsa-*`), emitted from `design/tokens/motion.ts` and consumed via
`var()` only. This section does not tune them; it composes them.

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|---------------|--------|----------------|---------------------------|
| Dialog open | Entry | Fade + scale 0.96→1 (`--elsa-dur-dialog-in`) | 200 | `--elsa-ease-out` | Yes | Yes — ~100 ms fade, no scale |
| Sachet sequence | Theatre | Arrive→flex→tear→flash→away (existing keyframes) | 900 | `var(--ease)` | No (but ✕/Escape skip) | **Yes — theatre removed entirely** |
| Cut to stage | Theatre end | No transition — the sachet is replaced by the stage in one frame; camera already at `focus(0)` | 0 | — | — | n/a |
| Light pool in | Reveal start | Opacity 0→1 on static geometry | 140 | `--elsa-ease-out` | — | Yes — absent |
| **Card enters the focus frame (×4)** | Per beat | `translateY` 6 %→0, `scale` .96→1, opacity 0→1 (`--elsa-dur-cardin`) | **300** | `--elsa-ease-soft` | No | **Yes — skipped; cards are already in their cells** |
| **Camera, focus → focus (×3)** | After each hold | Dolly: `--cam-tx` / `--cam-ty` (scale constant at `--cam-focus`) (`--elsa-dur-focus`) | **380** | `--elsa-ease-focus` | No | Yes — skipped |
| **Hand-off overlap (×3)** | Inside each camera move | Next card's entrance starts when the camera is **65 %** through (`--elsa-overlap` 35 % = **133 ms** before arrival) | 133 | — (start offset) | — | Yes — skipped |
| **Hold beat (×3)** | On each settled card | Stillness before the next dolly (`--elsa-hold-beat`) | **260** | — | — | Yes — skipped |
| **Camera pull-back (`c: 1 → 0`)** | Card 4 settled | Scale `--cam-focus`→1, translate→0, one camera: the 2 × 2 / 1 × 4 becomes visible (`--elsa-dur-pullback`) | **760** | `--elsa-ease-pullback` | No | **Yes — no camera; the overview is simply the layout** |
| Pool out | Pull-back start | Opacity 1→0 on static geometry | 140 | `--elsa-ease-out` | Yes | Yes — absent |
| Per-card tile settle (×4) | Pull-back +12 % (91 ms) | `translateY` 8 px→0 into its own cell (`--elsa-dur-tile`), 40 ms forward stagger (`--elsa-stagger-tile`, max 4) | 260 | `--elsa-ease-soft` | No | Yes — none |
| Hint + footer fade-in | Last settle frame | Opacity + 8 px rise (`--elsa-dur-fade`) | 140 | `--elsa-ease-out` | Yes | Yes — instant |
| Counter | Each beat | Text swap only (`1 von 4` → `4 von 4`), no motion | 0 | — | — | Stays; reads `4 von 4` from first paint |
| Reduced-motion tick | Reveal start | Single soft tick at t = 0, no per-card ticks, no chime | — | — | — | **n/a — this IS the reduced-motion path** |
| Card selection | Tap card | Parent dims, child modal opens (`--elsa-dur-dialog-in`) | 200 | `--elsa-ease-out` | Yes | Yes — instant |
| Dialog close | Exit | Fade + scale → 1.02 (`--elsa-dur-dialog-out`) | 160 | `--elsa-ease-in` | Yes | Yes — instant |
| Holo glint flourish | Card 3 or 4 settles (holo only) | One pass across static geometry (`--elsa-dur-flourish`) | 520 | `--elsa-ease-out` | Runs to end | **Yes — none** |
| ~~Confetti~~ | — | **Withdrawn from this screen** (motion-sheet §8/§9: capstone-only) | — | — | — | — |

### 10.1 The reveal clock (composed, in ms)

`t = 0` is the first frame after the theatre cut.

| t | Beat | Token / rule |
|---|------|--------------|
| 0 | Card 1 enters the focus frame; announce `1 von 4`; pool fades in | `--elsa-dur-cardin` 300, `--elsa-dur-fade` 140 |
| 300 | Card 1 settled → **tick 1** | settle frame (`pack:card-landed`) |
| 560 | Camera dolly → card 2 | hold 260 + `--elsa-dur-focus` 380 |
| 807 | Card 2 enters (camera at 65 %) | `--elsa-overlap` 133 ms before arrival |
| 940 | Camera on card 2 | |
| 1107 | Card 2 settled → **tick 2** | |
| 1200 | Camera dolly → card 3 | hold from arrival + 380 |
| 1447 | Card 3 enters | |
| 1580 | Camera on card 3 | |
| 1747 | Card 3 settled → **tick 3**; if the holo is in slot 3: chime + glint | settle frame |
| 1840 | Camera dolly → card 4 | hold + 380 |
| 2087 | Card 4 enters | |
| 2220 | Camera on card 4 | |
| 2387 | Card 4 settled → **tick 4** / **holo shine**; **`pack:reveal-complete` + the one `seen.v2` write** | settle frame |
| 2387 | Camera pull-back begins in the *same* frame (no extra beat: the card's own settle is the beat) | `--elsa-dur-pullback` 760 |
| 2478 | Per-card 8 px settle begins (+12 % of the pull-back) | `--elsa-dur-tile` 260, 40 ms stagger |
| 2858 | Last tile settled — **stillness begins** (289 ms of still frame before the camera stops) | `--elsa-hold-beat` satisfied as stillness |
| 3147 | Camera at `c = 0`; `pack:pullback-complete`; stage un-`inert`; focus → card 1; hint + footer fade in | `--elsa-dur-fade` 140 |
| 3287 | Fully settled, all inputs live | |

**Totals.** Cards 1→4: **2.39 s**. Camera work: 3 × 380 + 760 = **1.90 s**.
Reveal, first card to fully live: **3.15 s**. Whole screen from trigger to live
(with the 900 ms theatre): **≈ 4.05 s**.

### 10.2 Budget check and the one conflict with the brief

- **The sheet's clock budget** is ≤ 3.2 s for "card-in + holds + 3 camera moves
  + pull-back + tile settle". 3.15 s is inside it. ✓
- **The owner brief** asked for each reveal 350–450 ms (**✓** `--elsa-dur-focus`
  = 380), a 100–150 ms hand-off (**✓** 133 ms = 35 % of 380), a pull-back of
  600–700 ms (**✗** 760) and a total ≤ 2.8 s (**✗** 3.15 s).
- The pull-back is the sheet's longest move on purpose ("the only move > 700 ms")
  and 760 ms is repeated as a value in its §2 and §3; the total follows from
  300 + 3 × 260 + 3 × 380 + 167 + 760. Neither number is free to be tuned here.
  **Flagged for the owner** (§15): accept 3.15 s, or authorise cutting one hold
  beat (→ 2.89 s) and the pull-back to 700 ms (→ 2.83 s) with the art director,
  which is the only way to reach 2.8 s.
- The sheet's own arithmetic only admits holds counted **from the camera's
  arrival**, not from the card's settle: holding 260 ms after each settle puts
  the reveal at **4.09 s** and breaks its own 3.2 s budget. This spec counts
  from arrival, which leaves 93 ms of still frame after a card has settled
  before the dolly. Recorded in §15 for the art director to confirm or re-token.
- Readings of two sheet lines that cannot all be true at once, and the reading
  taken: (a) "+12 % so tiles settle just after the camera" vs (b) "the
  pull-back's last 120 ms has no secondary movement" vs (c) ≤ 3.2 s. This spec
  takes (b) as binding (it is a Principle, sheet §1.6) and (c) as the budget, so
  the tile settle **starts** at +12 % and finishes before the camera comes to
  rest; the last 289 ms is pure stillness.

### 10.3 Reduced motion (the final frame, composed)

`prefers-reduced-motion: reduce` — all four cards render directly in their grid
cells at first paint, as the pull-back's final frame (sheet §5): no theatre, no
camera, no focus sequence, no card entrance, no pool, no glint, no confetti.
Foil is static at centre. The counter reads `4 von 4`, and the hint and footer
are visible from the start. **One soft tick at t = 0**; no per-card ticks and no
chime (the rip is skipped). Nothing the choreography would have told the visitor
is lost: DOM order still puts the holo last, the counter states the count, the
rarity chip and stars state the find, and the live region announces the haul in
one sentence.

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (✕, four cards, footer buttons)
- [x] Tab order follows visual reading order (head → card 1→4 in reveal order → footer). In the 2 × 2 the DOM order *is* the row-major reading order (1, 2 / 3, 4), so `Tab` never zig-zags
- [x] Every action achievable by mouse is also achievable by keyboard (select, close, repeat)
- [x] Focus is visible at all times
- [x] Focus does not escape the screen while it is open (native dialog trap; child CardDetail traps on top)
- [x] Esc key closes or cancels (and returns focus to the trigger — never quits the site)

**Gamepad** — *out of platform target (web). Unticked by design; not an
implementation blocker for this project.*

**Mouse**
- [x] Hover states defined for all interactive elements (cards: static foil brightening only; buttons, ✕). No tilt on drop cards, at any time
- [x] Clickable hit targets are at minimum 32x32px (44x44px preferred) — cards ≥120px wide, ✕ ≥36px visual/44px hit
- [x] Right-click behavior defined (native context menu — no custom handler)
- [x] Scroll wheel behavior defined in all scrollable zones (compressed stage, < 420 px: vertical wheel pans it, `overscroll-behavior: contain`; no other scrollable zone exists)

**Touch**
- [x] All touch targets are minimum 44x44px
- [x] Swipe gestures do not conflict with system-level swipe navigation (the screen has **no horizontal gesture at all** now — nothing to conflict; a vertical drag inside the compressed stage is contained and never reaches the page)
- [x] All actions achievable with one hand in portrait orientation (✕ top-right within reach; footer at the bottom)
- [x] Long-press behavior defined (not used; long-press on a card falls through to the native image sheet only after the card is opened in CardDetail)

---

## 12. Accessibility

> Tier Standard per `design/accessibility-requirements.md`; WCAG 2.2 AA target.

**Text contrast requirements for this screen**:

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Dialog title / eyebrow | Dialog velvet gradient | 4.5:1 | ≈ 11:1 | [x] |
| Hint line | Dialog velvet | 4.5:1 | verify at audit — hint renders in the muted `--muted` token, not the promoted body colour; do not assume pass | [ ] audit |
| Card plate text (drop variant) | Indigo plate gradient | 4.5:1 | ≈ 10:1 | [x] |
| Card copy/moment text | Plate on parchment card face | 4.5:1 | ≈ 9:1 | [x] |
| Footer button labels | Button surfaces | 4.5:1 | verify at audit (primary = dark ink on pearl gradient) | [ ] audit |
| "2. Auflage" stamp text | Plate stamp chip | 4.5:1 | ≥ 4.5 required (small text) | [ ] audit |

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Holo/rare vs common | Hue-only difference would fail | Foil is a *material* difference (texture, glare band, glitter) **and** the rarity chip prints the word; stars count differs (3/4/5) |
| "Which card is in focus?" | A spotlight carried by brightness/hue alone would fail | Focus is a *position* fact: the card is centred and 74 % of the short edge, the counter reads `2 von 4`, and the announcement names the card. The counter is also the colour-free answer to "how many are there?" |
| Stage counter | Low-contrast small text is the likely failure, not hue | Prints a numeral and a word ("2 von 4"), sits on the pool-free stage background, must pass 4.5:1 like every other text row |
| Light pool | Decorative only | `aria-hidden`; carries no information |

**Focus order** (Tab key sequence, numbered):

1. ✕ close button (focus starts on the dialog element itself; first Tab lands here)
2. Card 1 … 4 (in reveal order = DOM order; in the 2 × 2 that is row-major)
3. "Noch ein Pack"
4. "Zur Sammlung"
Cycle: wraps within the dialog. `←`/`→` move card focus as a shortcut (§7.1);
`↑`/`↓` jump a row in the 2 × 2 only.
**During the theatre, the reveal and the pull-back the stage is `inert`**, so the
cycle is ✕ → (disabled footer) → ✕: focus cannot land on a card that is still
moving or about to be left behind. On the last settle frame the stage is
un-`inert`ed and focus moves to card 1 in the same frame.
When CardDetail opens on top, focus transfers to it; on its close, focus
returns to the originating pack card (see `card-detail.md` §12).

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Dialog opens | "Das Pack geht auf." | On entry |
| Card revealed (×4) | "Karte {i} von {n}: {name}. {rarity}." | At each card's **settle** frame (its own beat; the region is written once per beat, so a slow reader hears the last one it can keep up with and the summary below is authoritative) |
| Reveal complete | "{n} Karten: {names}." | Once, at the **pull-back end** — the sentence a visitor needs if every per-card line was too fast |
| Reduced motion | "{n} Karten: {names}." only | At open; no per-card lines (nothing was revealed one at a time) |
| Mid-reveal skip | "{k} von {n} Karten gesammelt." | Before the dialog closes (the 160 ms close cannot outrun a polite write) |
| Second lap | "Das waren alle Karten. Jetzt beginnt das Pack von vorn." | When the restart moment fires |
| Card selected | "Nr. {number}. {name}. {rarity}." | On entering CardDetail |
| Focus moved to first card | (no separate line — card 1's own accessible name is read on focus) | On the focus move |
| Dialog closed | (no announcement — visual return is enough) | — |

> **Pacing risk, flagged.** Four polite writes inside 2.4 s is at the edge of
> what a screen reader can voice; the library's rule is that rapid writes
> replace rather than queue, so a visitor may hear only the last two. Every
> per-card line is therefore a complete sentence, and the completion summary
> restates the whole haul — dropping any single line loses no information. See
> §15 for the VoiceOver check that must confirm this before ship.

**Cognitive load assessment**:

During the theatre and each reveal beat the visitor tracks exactly one thing —
one card, one number. After the pull-back: four cards + two footer actions = 6
items, comfortably inside 7±2 by design — the hint line is a single sentence and
the footer can be ignored entirely. No timers, no countdowns, nothing expires,
and the stage unlocks only once, on a frame the visitor can see arriving.

**Text legibility under the camera, flagged for the audit**: at `c = 1` the
focused card is painted at its grid size and scaled by `--cam-focus` (≈ 2.0 on
mobile, ≈ 1.3 on desktop). Promoted compositor layers are not re-rasterised, so
the plate's smallest printed line (11 px) is measured at up to 2 × its raster
size during the beat. It is a transient (the settled grid is 1:1 and crisp), but
it must be **screenshotted at 320 / 390 px and read at 2 ×** before ship. If it
fails, the fix belongs to the art director and is *shrink the card, not the
room* (motion-sheet §6) — i.e. lower `--cam-focus` by enlarging the grid card,
never by shrinking the type.

---

## 13. Localization Considerations

- DE default, EN second; brand mark "Elsa the Explorer" untranslated; all copy
  from the copy deck. Layout budgets tolerate **DE at +40 % over the EN
  baseline**.
- No RTL target; layout not mirrored.
- **Copy-deck sync required for this revision** (4-card pack). Keys are
  unchanged — only values move. The three reveal keys this revision needs are
  now deck rows with their caps (#74); the deck is the string SSOT, so B4
  renders them rather than declaring spec-local strings:
  - `pack.eyebrow` — the number word changes: EN *"1st edition · four fresh
    cards"* / DE *"1. Auflage · vier frische Karten"*.
  - `pack.hint` — the swipe half is dead (no carousel): EN *"Tap a card."* /
    DE *"Tippe eine Karte an."*.
  - `pack.count` — **copy deck §4**, cap 12; `{i} von {n}` / `{i} of {n}`,
    used visually in the stage counter.
  - `pack.card.revealed` — **copy deck §4**, live region only (uncapped by
    layout): "Karte {i} von {n}: {name}. {rarity}." / "Card {i} of {n}: {name}.
    {rarity}."
  - `pack.skipped` — **copy deck §4**, live region only (uncapped by layout):
    "{k} von {n} Karten gesammelt." / "{k} of {n} cards collected."
  - `pack.announcement` keeps its `{n}` placeholder (now always 4).
- **Copy-deck sync 2026-11-22**: the eyebrow, hint and lap line below carry the
  copy deck's winning variants; the pack announcement uses `{n}` per the deck
  placeholder table (renamed from the former `count` placeholder).

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Eyebrow "1st edition · four fresh cards" / "1. Auflage · vier frische Karten" | 29 | 34 | 40 % | n/a | Ellipsis in the head; the sachet copy duplicates it and wraps instead | Low |
| Title "Your new arrival" / "Dein Neuzugang" | 10 | 17 | 40 % | n/a | Head is single-line flex; ceiling is 17, not 15 (D19 — the 15 was an arithmetic slip); wraps only under 320px | Low |
| Hint "Tap a card." / "Tippe eine Karte an." | 11 | 20 | 40 % | n/a | Wraps to 2 lines; hides under 380px height | Low |
| **Counter** "{i} of {n}" / "{i} von {n}" | 6 | 12 | 40 % | n/a | Single line, no wrap, no truncation — the digits are the point; `font-variant-numeric: tabular-nums` so the swap never reflows | Low |
| **Card revealed** "Card {i} of {n}: {name}. {rarity}." | 18 + name | 24 + name | 40 % | n/a | Live region only — length uncapped by layout | Low (a11y only) |
| **Skipped** "{k} of {n} cards collected." | 24 | 34 | 40 % | n/a | Live region only | Low (a11y only) |
| Pack announcement "{n} cards: {names}." / "{n} Karten: {names}." | 12 + names | 20 + 4×name | 40 % | n/a | Live region only — length uncapped by layout | Low (a11y only) |
| Footer "Another pack" / "Noch ein Pack" | 12 | 17 | 40 % | n/a | Button grows; wraps to own row ≤380px | Low |
| Footer "To the collection" / "Zur Sammlung" | 16 | 22 | 40 % | n/a | same | Low |
| Lap line "Starting over — every card comes again, now with the second-edition stamp. The archive forgets nothing." (D8) | ~98 | 106 | 40 % | n/a | Wraps to 3 lines above the row | Medium — longest new string |
| Card names (4 in the reveal) | catalog-driven | 24 per name | 40 % | n/a | Name clamps to plate zone (fixed proportions, see card-detail.md §14) — never paints over the photo | Medium |

---

## 14. Acceptance Criteria

> **Replaced 2026-11-22** for the four-card, one-card-in-focus model. The
> withdrawn set (five cards, carousel snap, slots 4/5, 200 ms stagger, swipe
> assertions) tested the row-of-cards reveal the owner ruled out. Every primary
> row below is binary and names where it is measured; §14.2 keeps the gates that
> were never about that model.
>
> **Cross-reference note (2026-11-22, resolved in this review):** §9 fires
> `pack:card-landed`, the tick and the per-card announcement on the **settle**
> frame; §12 now says the same. §9 + §14 remain authoritative if they ever drift.

### 14.1 Primary criteria (11 — the ten required gates, with the clock and the compositing halves of gate 3 split)

**Draw & reveal order**
- [ ] The pack contains **exactly four distinct cards**, and the holo/rare lands **slot 3 or slot 4 — never first**; verified over **50 seeded draws** (seed and draw log kept with the test, so the run is repeatable)
- [ ] Cards reveal **one at a time in focus** — no frame shows two cards fully side by side (only the ≤ ~13 px neighbour sliver §5.1 permits at focus framing); `pack:card-landed` fires once per card at that card's own settle, the live region announces each card as it lands ("Karte {i} von {n}: {name}. {rarity}."), and the completion summary ("{n} Karten: {names}.") fires **exactly once**, after the last card

**Motion & clock**
- [ ] Pull-back completes **≤ 3.2 s** from the frame the first card is visible, measured at `pack:pullback-complete` on minimum-spec hardware
- [ ] The same beat animates **transform and opacity only** (no layout property animated, no `top`/`left`/`width`/`margin` tweening) and produces **no layout thrash**: one `getBoundingClientRect` batch per frame, zero forced synchronous layout during the beat (Performance panel shows no repeated forced reflow)

**Stage, focus & skip**
- [ ] `.pack-stage` carries `inert` through the theatre, the reveal and the whole pull-back; `inert` is removed on the **last settle frame**, focus lands on **card 1** in that same frame, and all four cards are then reachable by keyboard in reading order (1 → 2 → 3 → 4; row-major in the 2 × 2)
- [ ] Skip (✕ / `Escape`) mid-reveal collects **only the already-revealed cards** (`seen.v2` gains exactly those ids — count verified), leaves the remainder uncollected, and the pack **reopens immediately**; a backdrop click during the reveal does **nothing** and closes only after the last settle

**Degraded & narrow paths**
- [ ] With `prefers-reduced-motion: reduce`: no camera, no theatre, **all four cards present in the final grid at first paint**, exactly **one soft tick**, no per-card ticks, **no confetti**
- [ ] A slow or failed photo (throttled to 3G / 404) still renders the **card frame plus its printed text** — plate, name, rarity, numbering — never an empty box and never a bare alt-text hole
- [ ] The compressed-stage tier (stage height < 420 px) is fully usable at **320 × 480**: the stage alone scrolls, head/hint/footer never scroll, ✕ and `Escape` stay live, and the focused card scrolls fully into view

**Data & collection**
- [ ] `seen.v2` is written at the **last card's settle**, *before* the camera moves — `pack:reveal-complete` precedes the first pull-back frame, so closing at any moment during the pull-back loses nothing (all four stay collected)
- [ ] **No horizontal swipe is required anywhere** in the flow; no horizontal gesture is bound on this screen (nothing can collide with browser back/forward)

### 14.2 Carried over unchanged (6)

**Layout & rendering**
- [ ] No horizontal overflow at 320/390/414/640/768/1024/1280/1920; the dialog never scrolls at 320×480 or 1920×1200
- [ ] All §6 states render correctly (Theatre, Revealing, Pulling back, Settled, Reduced motion, Compressed stage, Recovered, Empty)

**Accessibility & data**
- [ ] All §12 contrast rows pass measured audits — including the hint line, footer labels and the "2. Auflage" stamp, which are marked *audit* not *pass*
- [ ] VoiceOver walkthrough identifies all four cards and their rarities from speech alone, with no visual cues; the pacing half of this check is the §15 VoiceOver row
- [ ] No direct `localStorage` writes from the dialog (code-review check); `seen.v2` is written only through the persistence system

**Localization**
- [ ] No text element overflows in German at +40 % over the EN baseline (longest catalogue name substituted); all strings come from the copy deck, with the "2. Auflage" stamp text present in both languages

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ~~Is 200 ms the right stagger on mobile at expedition #20?~~ **Withdrawn 2026-11-22 — there is no carousel and no stagger any more**; the timing question now lives in the pull-back and total-clock rows below | — | — | withdrawn |
| **Pull-back 760 ms vs the owner brief's 600–700 ms.** The motion sheet repeats 760 in its §2 and §3 ("the only move > 700 ms") and calls it deliberate; the brief asked for 600–700. Keep 760, or re-token the sheet to 700 and cut one 260 ms hold to stay inside the 3.2 s budget? | art-director + user | before motion-sheet freeze | — |
| **Total reveal clock ≈ 3.15 s** (§10.1) against the brief's **≤ 2.8 s**. Accept 3.15 s, or authorise the only path that reaches 2.8 s — one hold beat out (→ 2.89 s) plus the pull-back to 700 (→ 2.83 s)? Note the sheet's own budget is ≤ 3.2 s, not 2.8 s. | user (owner) + art-director | before motion-sheet freeze | — |
| **Hold-from-arrival arithmetic.** The sheet's holds reach its own ≤ 3.2 s budget only if counted **from the camera's arrival**, not from the card's settle; counting 260 ms after each settle gives 4.09 s and breaks the sheet's own budget. This spec counts from arrival (93 ms of still frame after a settle). Confirm that reading, or re-token the hold. | art-director | before motion-sheet freeze | — |
| **Tile offset vs "the last 120 ms is stillness".** Three sheet lines cannot all be true: "+12 % so tiles settle just after the camera", "the pull-back's last 120 ms has no secondary movement", and the ≤ 3.2 s budget. This spec takes stillness as binding (tiles finish 289 ms before the camera rests). Confirm, or move the tile start earlier. | art-director | before motion-sheet freeze | — |
| **Camera-scaled 11 px type at 320 / 390 px.** The plate's smallest printed line is painted at grid size and scaled up to ≈ 2 × (`--cam-focus`), on promoted layers that are not re-rasterised. Is it legible? Needs a screenshot-and-read audit during the beat; if it fails, the fix is to lower `--cam-focus` (enlarge the grid card), never to shrink the type. | art-director + accessibility-specialist | before ship | — |
| **SR announcement pacing under VoiceOver.** Four polite per-card writes inside 2.4 s plus one completion line: does VoiceOver replace, drop or queue them, and is the completion summary sufficient alone if the per-card lines are lost? Needs a real device test, not a DOM inspection. | accessibility-specialist | before ship | — |
| **Confetti ownership.** The `.confetti` canvas is withdrawn from this screen (motion-sheet §8 reserves confetti for the capstone). Who owns the capstone burst, and is the pack screen ever allowed to fire one — including on a full-collection moment? | art-director + ux-designer | before the capstone ships | — |
| Should the "2. Auflage" stamp apply per-card for the whole second lap, or only until that card is next collected? | game-designer | before the set view ships | — |
| Does the footer "Zur Sammlung" stay, or is the loop better served by only "Noch ein Pack"? (One CTA per screen is the safer default.) | ux-designer + user | after playtest | — |
| Chase-card handling in the draw: does the Porträtsaal chase card (Das Hauptporträt / The Portrait of Record) obey normal unseen-first, or does it get special reveal treatment (e.g. always the holo slot when drawn)? | game-designer | before draw rules ship | — |
