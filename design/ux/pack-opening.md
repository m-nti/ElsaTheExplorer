# UX Spec: Pack Opening (The Accession — #pack-dialog)

> **Status**: In Design
> **Author**: user + ux-designer
> **Last Updated**: 2026-11-22
> **Journey Phase(s)**: Reward loop — request accession → wrapper theatre → five cards rise → inspect
> **Screen / Flow Name**: `PackOpening` (`#pack-dialog`)
> **Platform Target**: Web — mouse / touch / keyboard (no gamepad; static IONOS deploy)
> **Related GDDs**: `PRD.md` §4.1 F1, F4–F6, F22; §4.2 F18–F22; §5 Design row ("the pack tears open in the center of the viewport and cards reveal one at a time")
> **Related ADRs**: ADR-0001 (owner decision): Svelte 5 + Vite 8 + TypeScript strict, built locally, deployed statically to IONOS; `photos.php` stays the runtime manifest source
> **Related UX Specs**: `stage-landing.md` (parent, entry triggers), `card-detail.md` (child, opened from a selected card), `binder.md` (where the pulled cards land)
> **Accessibility Tier**: Standard
> **Template**: UX Spec

> **Positioning note (binding)**: *Elsa the Explorer* is a card library /
> Sammelwerk. A pack is an **accession** ("Neuzugang"): the wrapper theatre is
> the unboxing of new material for the catalogue, and the reveal is presented the
> way a catalogue presents new entries — each card gets its moment, the foil
> card is the find of the day. Copy stays in the museum-catalogue register with
> the warm, dry humour; *du* register in German. This spec is written as a
> **refactor**; the current `#pack-dialog` markup and the sachet keyframes in
> `style.css` ("Open-card fit and pack theatre" block) are the starting point.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

The visitor pulled the ribbon; now the site owes them a small ceremony. What
they need is a felt sequence — the wrapper arrives, strains, tears, and five
cards rise one at a time so each gets its own beat — ending in five cards they
can actually read, pick up, and send on. The reveal is the reward for coming;
without it the library is just a folder. The screen must also honour the
contract the landing made: five cards, never a duplicate among them, at least
one in foil, and nothing repeated before the whole catalogue has been through.

**The player goal** (what the player wants to accomplish):

Watch five new Elsa cards be revealed, then open at least one of them big
(M6: more than one of the five gets opened).

**The game goal** (what the game needs to communicate or capture):

Deliver the fairness contract visibly (F1, F4, F5, F6), mark the five cards
collected at the right moment, and hand the visitor naturally to the next
loop ("Noch ein Pack") or to the catalogue.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Tapping the seal / CTA / pressing `P` on the landing (or tapping "Noch ein Pack" from the card lightbox). |
| What is their emotional state? | Anticipation at its peak; attention focused; zero patience for anything between them and the cards. |
| What cognitive load are they carrying? | Low, and it must stay low — this is the leisure moment of the whole product. |
| What information do they already have? | The promise ("five cards, one shines"); repeat visitors also know their catalogue count. |
| What are they most likely trying to do? | Watch the reveal, then grab the shiniest card. |
| What are they likely afraid of? | That the moment is over too fast to read anything; that motion/sound assaults them; that tapping a card "uses it up"; that closing loses the cards. |

**Emotional design target for this screen**:

A held breath and a small gasp — "oh, look at her" — five times in a row.

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
here; the reveal is short (≈2s) and interrupting it simply skips the theatre.

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Landing CTA / seal / `P` | `stage-landing.md` §4 | Primary path |
| "Noch ein Pack" (card lightbox) | `card-detail.md` | Closes the lightbox, opens the theatre — the loop closes on itself |
| "Noch ein Pack" (this dialog's footer, new in the refactor) | Post-reveal state | Shortens the loop by one screen for the repeat-pull visitor |
| Reduced-motion path | Same triggers | Theatre skipped, five cards at once (F22) |

---

## 4. Entry & Exit Points

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| `pack:open-request` accepted | StageLanding / CardDetail | Modal fade+scale open (200ms), then theatre | draw result (5 photo refs + reveal order) from the pack system | Draw happens before the dialog opens; the dialog is pure presentation |
| `P` while dialog open | — | No-op | — | Guarded; stage hotkey suspended |

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Escape / ✕ (backdrop **only outside the reveal**) | StageLanding (or CardDetail if it is open beneath) | Modal close (200ms; instant reduced-motion) | Focus returns to `#open-pack` | **Mid-reveal skip catalogues only the cards already revealed; the remainder stay uncollected** (Ruling 1b); the pack can be reopened immediately; nothing is lost |
| Tap a revealed card | CardDetail (child modal on top) | Modal open | photo id | Parent dialog stays open underneath |
| "Noch ein Pack" (footer) | Itself (new accession) | Close-and-reopen via `pack:open-request` | — | Disabled until reveal completes |
| "Zum Katalog" (footer) | Binder section | Close + anchor scroll | — | Round-2 footer link; gives the pulled cards a destination |
| Second lap begins (catalogue exhausted) | Same dialog | Inline restart moment | Lap number derived per GDD R-H at pull time (not stored as an integer) | Announced; "2. Auflage" stamps apply from now on |

---

## 5. Layout Specification

### 5.1 ASCII Wireframe

Post-reveal, desktop (≥760px), five-across:

```
╔════════════════════════════════════════════════════════════════╗ ║ backdrop
║  Elsa the Explorer eyebrow: „1. Auflage · fünf Karten"  [ ✕ ]  ║
║  Dein Neuzugang  (dialog title, h2)                           ║
║                                                              ║
║  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      ║
║  │ plate  │ │ plate  │ │ plate  │ │ plate  │ │ plate  │      ║
║  │ photo  │ │ photo  │ │ photo  │ │ ★FOLIE │ │ photo  │      ║
║  │ strip  │ │ strip  │ │ strip  │ │ strip  │ │ strip  │      ║
║  │ moment │ │ moment │ │ moment │ │ moment │ │ moment │      ║
║  │ stats  │ │ stats  │ │ stats  │ │ stats  │ │ stats  │      ║
║  │ serial │ │ serial │ │ serial │ │ serial │ │ serial │      ║
║  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      ║
║   (card--drop ×5; reveal order: holo occupies slot 4/5)      ║
║                                                              ║
║  Wähle eine Karte. Wische für die nächste.                    ║
║  ┌──────────────────┐  ┌────────────┐  ┌───────────┐         ║
║  │  Noch ein Pack   │  │  Zum Katalog │  (footer row,   ║    ║
║  └──────────────────┘  └────────────┘   post-reveal)   ║      ║
╚════════════════════════════════════════════════════════════════╝
   confetti canvas overlays the dialog (aria-hidden)
```

Mobile (≤760px): the five cards become a horizontal **scroll-snap carousel**
(one card ≈78vw wide, neighbours peeking ≈8vw each side); the ✕, eyebrow and
footer stay fixed relative to the dialog; the hint line names the swipe.

Theatre phase (pre-reveal, both breakpoints): the drop row is empty and the
`pack-dialog__sachet` fills the centre of the dialog — the wrapper art with a
photo window, wordmark, edition line, top crimp and the serrated tear line.

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Dialog head | Eyebrow, title, ✕ | 100% × ~56px | No | Eyebrow truncates with ellipsis; ✕ is 44px hit target |
| Theatre | Wrapper sachet during the opening (hidden after) | ~min(420px, 86vw) × ~min(560px, 60svh) | No | Scales down with viewport; never scrolls |
| Drop row | Five `card--drop` cards; desktop grid 5×, mobile carousel | Desktop 100% × ~46svh; mobile ~78vw wide | **Mobile: horizontally, scroll-snap only** | Cards shrink to fit; a card never forces the dialog to scroll |
| Hint line | One instruction line | 100% × ~20px | No | Hides under 380px height (current behaviour kept) |
| Footer actions | "Noch ein Pack", "Zum Katalog" | 100% × ~52px, post-reveal only | No | Buttons wrap to 2 rows on ≤380px |
| Confetti canvas | Celebration overlay | dialog inset | No | Decorative, `aria-hidden`, skipped under reduced motion |

The dialog itself never scrolls: `max-height: calc(100svh - 36px)` with
`overflow: hidden` (current implementation kept). Everything must fit at
320×480.

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| `PackTheatre` | **Svelte 5 component** (one line: owns sachet, tear, flash, drop-row orchestration as a single mount point) | all | The whole accession flow as one boundary | Yes | Refactor of current `#pack-dialog` inner DOM |
| `.pack-dialog__head` | Header | head | Eyebrow + title + close | Yes | Yes |
| `.pack-dialog__sachet` (+ `__crimp`, `__flap`, `__photo`, `__seal-name`, `__seal-copy`, `__tear`) | Composite visual | theatre | The wrapper, adopting the reference study's top/bottom **crimps** and wrinkle streaks in addition to the current art | Yes | Yes (extended) |
| `.pack-dialog__flash` | Overlay | theatre | Tear flash frame | Yes | Yes |
| `.pack__drop` (`<ol>` of `pack__slot`) | Ordered list | drop | The five cards in reveal order | Yes | Yes |
| `CardTile` (variant `card--drop`) | **Svelte 5 component** (one line: the shared card renderer, size-variant `drop`) | drop | Each revealed card is a real `<button>` | Yes | Shared with binder + pack |
| `.pack-dialog__hint` | Text | hint | "Wähle eine Karte. Wische für die nächste." | Yes | Yes |
| `.pack-dialog__actions` | Button row | footer | "Noch ein Pack" (primary) + "Zum Katalog" (outline) | Yes | "Noch ein Pack" reuses the lightbox action label |
| `.confetti` canvas | Canvas | overlay | Celebration burst | Yes | Yes |
| `#live` live region | Status | body | Announcements | Yes | Yes |
| `2.-Auflage` stamp | Badge (on plate) | drop cards | Marks second-lap pulls — **GDD R6, Phase 3** (lap derived per R-H at pull time); catalogue tiles never show stamps (R6) | No (Phase 3) | New — defined with card-detail.md §5 |
| `.card__set-chip` ("aus: {Set}") | Chip (on drop card, below the rarity label) | drop cards | **GDD R1 — ships at Vertical Slice** on the shared `CardTile`; `new-acquisitions` cards show **no chip** (R1: the chip speaks only when the card has a room) | Yes (VS) | Shared with binder + lightbox |

**Pattern references** (`design/ux/interaction-patterns.md`): Pack-Open Button
(Primary) · Dialog Open / Close · Focus Trap (Dialog) · Card Reveal Step ·
Card Tilt & Foil Material (static on drop cards) · Close Button ·
Keyboard Shortcut · Live Region Announcement · Error State (share/empty
surfaces live in the parent specs).

**Primary focus element on open**: the dialog element itself (current behaviour
kept — `els.dialog.focus()`-equivalent), so Escape works immediately and Tab
starts at the ✕ button. After the reveal completes, focus **moves to the first
revealed card** so keyboard visitors can act without a fresh Tab walk; the
focus move is announced ("Fünf Karten: …").

### 5.4 Information Hierarchy

1. **First: the rising cards** — the reveal is the screen; nothing competes
   with it. Head and hint are visually recessive during the theatre.
2. **Second: the holo card** — rarity is a material difference (foil strength),
   and by canon it lands in slot 4 or 5, so the sequence ends on the find.
3. **Third: the hint** — one line, only after the reveal (during the theatre it
   would read as noise).
4. **Fourth: footer actions** — visible only once the pack is complete; before
   that, acting on the next loop would be premature.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Closed | Default | Dialog not rendered in a11y tree | n/a | |
| Theatre (opening) | Dialog opened, reveal pending | Sachet sequence, 900ms: arrive from below (0–18%), flex (18–42%), lift (50%), flap tears + jagged tear line + flash (46–61%), wrapper gone (100%) | Card selection + footer input locked; **✕ and `Escape` stay live** (they skip the theatre); backdrop clicks ignored | Adopt ref's tear-glow bloom on the seam |
| Revealing | After theatre / immediately under reduced motion | Cards ascend one by one — timings are the **pattern library's Card Reveal Step (SSOT)**: `index × 200 ms` stagger, ~700 ms rise + settle each; each landing gets a tick sound, non-common a chime | Card selection + footer input locked; ✕ and `Escape` stay live; backdrop clicks ignored | Holo is revealed in slot 4 or 5 (canon) |
| Populated (complete) | All five landed | Full row; hint line; footer actions fade in | Tap card → CardDetail; Tab/←→/swipe active | The only state where the pack can be left "open" indefinitely |
| Reduced motion | `prefers-reduced-motion: reduce` | **No sachet, no flash, no ascend: all five cards are present at once** (canon + F22); confetti skipped; **rip is skipped, a single soft tick marks the layout** (library) | Reveal completes immediately; sounds reduced to the single tick | Cards may still use the static foil material |
| Image failure (drop card) | A drawn photo fails to load/convert | Delegates to the **shared `CardTile` image states** (HEIC shimmer → set-coloured fallback panel); the card stays readable, the reveal never stalls | Interaction unaffected | One code path for pack, binder and lightbox images |
| Small catalogue | Catalogue < 5 photos | Row shows as many cards as exist (F1) | Same; announcement states the real count | E.g. "Drei Karten: …" |
| Second lap ("2. Auflage") | Persistence reports lap restart (catalogue exhausted; lap derived per GDD R-H at pull time) | Inline line above the drop: "Von vorn — alle Karten kommen wieder. Ab jetzt mit 2.-Auflage-Stempel." + cards pulled from now on carry the stamp on the plate | Announcement: "Das waren alle Karten. Jetzt beginnt das Pack von vorn." | Stamp display = GDD R6, Phase 3; the dialog's stamp line lives in card-detail.md §6 |
| Recovered | Dialog closed mid-reveal (Escape/✕ skip) | Dialog closes cleanly; **Ruling 1b: only the cards already revealed are collected — the remainder are NOT; the pack can be reopened immediately** | Focus returns to the trigger | A closed-early pack is never silently dropped or double-charged; the unseen remainder stays in the unseen-first pool |
| Empty | Catalogue empty | Dialog cannot open; landing shows the Empty state instead | `P`/CTA inert | Error surface belongs to the landing (stage-landing.md §6) |

---

## 7. Interaction Map

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Shift+Tab | Keyboard | Cycle: ✕ → card 1…5 → footer buttons → (wrap) | Focus ring per element; revealed cards are buttons | none | Focus trap inside the dialog (native `<dialog>`) |
| `←` / `→` | Keyboard | Move focus one card left/right among the five (roving) | Focused card lifts 4px | none | Canon keyboard support; wraps at the ends. **Flag for library addition**: roving `←/→` over a pack's five cards is a new pattern row |
| Swipe left/right | Touch | Step the carousel one card | Scroll-snap; neighbour peeks | none | Only in the mobile carousel; vertical page scroll unaffected. **Flag for library addition**: the mobile scroll-snap swipe row is a new pattern row |
| Hover | Mouse | Card tilt + foil response (pointer-driven) | Foil layers track the pointer (holo-as-material) | none | Reduced motion: static material, no spring |

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Click / tap a revealed card | Mouse/Touch | Reveal complete | Open that card in CardDetail | Child modal opens; parent stays | 200ms modal | flip/tick | Card is marked collected by the card system |
| `Enter` / `Space` on a card | Keyboard | Card focused | Open that card | same | same | same | Native button |
| Escape / ✕ | Keyboard/Mouse/Touch | anywhere | Close dialog | Modal close; focus → `#open-pack` | 200ms; instant reduced | none | Live at all times incl. mid-reveal; **backdrop click closes only after the reveal settles** — never blocks, never discards the accession |
| "Noch ein Pack" | Mouse/Touch/Keyboard | Reveal complete | Close + request new accession | Dialog reopens into theatre | 160ms gap (current timing kept) | rip | Disabled during busy |
| "Zum Katalog" | Mouse/Touch/Keyboard | Reveal complete | Close + anchor to `#katalog` | Smooth scroll | 300ms; instant reduced | none | Round-2 footer |
| `P` | Keyboard | — | **No-op while this dialog is open** | none | none | none | Prevents accidental stacked packs |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Theatre / Revealing | Card selection, footer actions, `←`/`→` disabled; **✕ and `Escape` live at all times; backdrop click ignored until the reveal settles** | The visitor must not grab a card mid-air; but dismissal must never be caged (canon 2026-11-22) |
| Populated | All inputs active | — |
| Busy ("Noch ein Pack" resolving) | Footer buttons disabled; cards of the old pack inert | One accession at a time |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Draw result (5 photo refs) | Pack system (draw rules: unseen-first F6, no in-pack repeat F5, ≥1 holo F4 via promotion, size = min(5, catalogue)) | Once per `pack:open-request` | Pack system | Ordered array of photo ids + reveal order | Catalogue < 5 → smaller pack; catalogue empty → dialog never opens |
| Reveal order | Pack system (sorts the draw so the guaranteed holo lands in slot 4 or 5; commons/rare first) | Once per draw | Pack system | Array indices | n/a — deterministic from the draw |
| Collected set (`seen.v1`) | Persistence system | Once per completed reveal (only the cards that landed — Ruling 1b) | Persistence system | id array append | Storage refused → session-only, silent |
| Lap number / "2. Auflage" flag | Persistence system — **not stored**; derived per GDD R-H at pull time from the catalogue state | Each draw on an exhausted catalogue | Persistence system (derivation) | derived integer | n/a — always derivable |
| Card content (name, mood, caption, rarity, setId, Fantasiewerte) | Card catalogue (photo → card pipeline) | On render | Card source system | photo objects | Missing copy → neutral fallback copy (F2), never invented activities |
| Sound preference | Persistence system (`sound.v1`) | Read on first sound | Persistence system | boolean | Missing → on |
| Photo image (thumb/view) | Card source system | On render | Card source system | URL (+ HEIC flag) | HEIC → in-browser conversion (F22b); failure → frame stays readable without the picture (R7) |

> **Rule**: The dialog never writes state. It renders the pack system's draw and
> fires intent events; `seen.v1` / `flags.v1` are written only by the
> persistence system, first-party, on-device. **Seen-writes happen only at
> reveal-complete — never at draw**: a drawn-but-unrevealed accession marks
> nothing; **with Ruling 1b, a mid-reveal skip writes only the already-revealed
> cards** — the reveal-complete write covers exactly the cards that landed.

---

## 9. Events Fired

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| (any entry) | `pack:opened` (system event, on draw) | `{ ids: [5], revealOrder, holoSlot: 4\|5 }` | Persistence + audio + UI | Lap context derived per GDD R-H; audio schedules rip |
| Card landed | `pack:card-landed` | `{ index, rarity }` | Audio system | tick; chime for rare/holo |
| Reveal complete | `pack:reveal-complete` | `{ ids }` | Persistence system | Writes the five ids to `seen.v1`; updates the catalogue |
| Tap a card | `card:selected` | `{ id, source: "pack" }` | Card system → CardDetail | |
| Escape / ✕ / backdrop | `pack:closed` | `{ revealed: boolean }` | UI only | Focus-return contract in §4 |
| "Noch ein Pack" | `pack:open-request` | `{ source: "repeat" }` | Pack system | |
| "Zum Katalog" | `nav:katalog` | — | UI only | |
| (none) | — | — | — | No analytics; telemetry-free by PRD decision |

---

## 10. Transitions & Animations

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|---------------|--------|----------------|---------------------------|
| Dialog open | Entry | Fade + scale 0.96→1 | 200 | ease-out | Yes | Yes — instant |
| Sachet sequence | Theatre | Arrive→flex→tear→flash→away (existing keyframes) | 900 | var(--ease) | No (but ✕/Escape skip) | **Yes — theatre removed entirely** |
| Card ascend ×5 | Revealing | Rise + settle per card — **library Card Reveal Step is the SSOT** (200 ms stagger interval, ~700 ms settle each) | per library | ease-out | No | **Yes — all five present at once** |
| Reduced-motion audio | Reveal | — | — | — | — | **n/a — rip skipped; single soft tick on layout (library)** |
| Footer fade-in | Reveal complete | Opacity + 8px rise | 240 | ease-out | Yes | Yes — instant |
| Card selection | Tap card | Parent dims, child modal opens | 200 | ease-out | Yes | Yes — instant |
| Dialog close | Exit | Fade + scale →1.02 | 200 | ease-in | Yes | Yes — instant |
| Confetti | Reveal complete (holo present = "big") | Canvas burst, gravity settle | ~1900 | n/a | Runs to end | **Yes — none** |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (✕, five cards, footer buttons)
- [x] Tab order follows visual reading order (head → cards left-to-right → footer)
- [x] Every action achievable by mouse is also achievable by keyboard (select, close, repeat)
- [x] Focus is visible at all times
- [x] Focus does not escape the screen while it is open (native dialog trap; child CardDetail traps on top)
- [x] Esc key closes or cancels (and returns focus to the trigger — never quits the site)

**Gamepad** — *out of platform target (web). Unticked by design; not an
implementation blocker for this project.*

**Mouse**
- [x] Hover states defined for all interactive elements (cards tilt+foil, buttons, ✕)
- [x] Clickable hit targets are at minimum 32x32px (44x44px preferred) — cards ≥120px, ✕ ≥36px visual/44px hit
- [x] Right-click behavior defined (native context menu — no custom handler)
- [x] Scroll wheel behavior defined in all scrollable zones (mobile carousel: horizontal wheel/trackpad pans the snap row; no other scrollable zone exists)

**Touch**
- [x] All touch targets are minimum 44x44px
- [x] Swipe gestures do not conflict with system-level swipe navigation (horizontal-only inside the dialog; browser back gesture is vertical-edge — unaffected)
- [x] All actions achievable with one hand in portrait orientation (✕ top-right within reach; footer at the bottom)
- [x] Long-press behavior defined (not used; long-press on a card falls through to the native image sheet only after the card is opened in CardDetail)

---

## 12. Accessibility

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
| Confetti colours | Decorative only | `aria-hidden`; carries no information |
| Carousel position | Current card unclear? | Neighbours peek + snap; focus/selection states are ring-based, not colour-based |

**Focus order** (Tab key sequence, numbered):

1. ✕ close button (focus starts on the dialog element itself; first Tab lands here)
2. Card 1 … 5 (left-to-right; in the mobile carousel, Tab still walks all five in reveal order)
3. "Noch ein Pack"
4. "Zum Katalog"
Cycle: wraps within the dialog. `←`/`→` move card focus as a shortcut (§7.1).
When CardDetail opens on top, focus transfers to it; on its close, focus
returns to the originating pack card (see `card-detail.md` §12).

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Dialog opens | "Das Pack geht auf." | On entry |
| Reveal complete | "{count} Karten: {names}." | Once, after the last card lands |
| Second lap | "Das waren alle Karten. Jetzt beginnt das Pack von vorn." | When the restart moment fires |
| Card selected | "{number}. {name}. {rarity}." | On entering CardDetail |
| Focus moved to first card | (part of the reveal-complete announcement) | On auto-focus move |
| Dialog closed | (no announcement — visual return is enough) | — |

**Cognitive load assessment**:

During the theatre the visitor tracks exactly one thing. After the reveal: five
cards + two footer actions = 7 items, at the 7±2 boundary by design — the hint
line is a single sentence and the footer can be ignored entirely. No timers, no
countdowns, nothing expires.

---

## 13. Localization Considerations

- DE default, EN second; brand mark "Elsa the Explorer" untranslated; all copy
  from the copy deck. Layout budgets tolerate **DE at +40 % over the EN
  baseline**.
- No RTL target; layout not mirrored.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Eyebrow "1st edition · five cards" / "1. Auflage · fünf Karten" | 24 | 34 | 40 % | n/a | Ellipsis in the head; the sachet copy duplicates it and wraps instead | Low |
| Title "Your new arrival" / "Dein Neuzugang" | 10 | 15 | 40 % | n/a | Head is single-line flex; wraps only under 320px | Low |
| Hint "Pick a card. Swipe for the next." / "Wähle eine Karte. Wische für die nächste." | 34 | 48 | 40 % | n/a | Wraps to 2 lines; hides under 380px height | Low |
| Pack announcement "{count} cards: {names}." / "{count} Karten: {names}." | 12 + names | 20 + 5×name | 40 % | n/a | Live region only — length uncapped by layout | Low (a11y only) |
| Footer "Another pack" / "Noch ein Pack" | 12 | 17 | 40 % | n/a | Button grows; wraps to own row ≤380px | Low |
| Footer "To the catalogue" / "Zum Katalog" | 16 | 22 | 40 % | n/a | same | Low |
| Lap line "Starting over — every card comes around again. From now on with the 2nd-edition stamp." | ~75 | 106 | 40 % | n/a | Wraps to 3 lines above the row | Medium — longest new string |
| Card names (5 in the reveal) | catalog-driven | 24 per name | 40 % | n/a | Name clamps to plate zone (fixed proportions, see card-detail.md §14) — never paints over the photo | Medium |

---

## 14. Acceptance Criteria

**Performance**
- [ ] Dialog opens within 100ms of trigger; theatre starts within one frame
- [ ] Reveal completes per the library's Card Reveal Step timings (SSOT: 200 ms stagger, ~700 ms settle per card, 900 ms sachet) on minimum-spec hardware; reduced-motion path completes immediately
- [ ] Pointer-driven foil on the five cards maintains ≥55fps on a 2019 mid-range phone

**Layout & Rendering**
- [ ] No horizontal overflow at 320/390/414/640/768/1024/1280/1920; the dialog never scrolls at 320×480 or 1920×1200
- [ ] All Section 6 states render correctly (theatre, revealing, populated, reduced-motion, small catalogue, second lap, recovered)
- [ ] In the mobile carousel exactly one card is centred after each snap; neighbours peek by 8vw ±2vw
- [ ] The holo card lands in slot 4 or 5 in every reveal (test over 50 draws, seeded)

**Input**
- [ ] Keyboard-only pass: open → wait → focus auto-moves to card 1 → `→` to card 4 → Enter opens CardDetail → Escape twice returns to the landing CTA
- [ ] Escape during the theatre closes cleanly; **only already-revealed cards are collected** (`seen.v1` gains exactly the landed ids — verify count), the remainder stay uncollected, and the pack reopens immediately; **✕ behaves identically mid-reveal, and a backdrop click mid-reveal does nothing** (reveal-protection check); after an Escape-skipped reveal, focus is on `#open-pack`
- [ ] Swipe on the carousel never triggers browser back/forward

**Events & Data**
- [ ] `pack:reveal-complete` fires exactly once per accession with the five ids; `seen.v1` receives them in one write
- [ ] No direct `localStorage` writes from the dialog (code review check)
- [ ] A closed-early pack never replays its reveal on the next open (fresh draw each time)

**Accessibility**
- [ ] All §12 contrast rows pass measured audits
- [ ] VoiceOver: hear "Das Pack geht auf.", then the five names, without visual cues; reduced-motion users get the same content with zero animation
- [ ] Focus is never lost outside the dialog at any point in the flow

**Localization**
- [ ] No text element overflows in German at +40 % over the EN baseline (longest catalogue name substituted)
- [ ] All strings from the copy deck; the "2. Auflage" stamp text exists in both languages

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ~~Confirm the reveal pacing numbers~~ **the pattern library is the SSOT** (200 ms stagger, ~700 ms settle); only the *feel* remains open: is 200 ms the right stagger on mobile at expedition #20? (library open question, first playtest round) | ux-designer + user | first playtest round | — |
| Should the "2. Auflage" stamp apply per-card for the whole second lap, or only until that card is next collected? | game-designer | before the set view ships | — |
| Does the footer "Zum Katalog" stay, or is the loop better served by only "Noch ein Pack"? (One CTA per screen is the safer default.) | ux-designer + user | after playtest | — |
| Chase-card handling in the draw: does the Porträtsaal chase card (Das Hauptporträt / The Portrait of Record) obey normal unseen-first, or does it get special reveal treatment (e.g. always the holo slot when drawn)? | game-designer | before draw rules ship | — |
