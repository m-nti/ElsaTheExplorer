# UX Spec: Card Detail (The Reading Room — #card-dialog lightbox)

> **Status**: In Design
> **Author**: user + ux-designer
> **Last Updated**: 2026-11-22
> **Journey Phase(s)**: Inspect & share — the payoff of every pull and browse
> **Screen / Flow Name**: `CardDetail` (`#card-dialog`)
> **Platform Target**: Web — mouse / touch / keyboard (no gamepad; static IONOS deploy)
> **Related GDDs**: `PRD.md` §4.1 F2, F2a, F3, F12; §4.2 F18, F20, F21, F23, F25; §5 Design row ("Elsa's photographs remain the art. Rarity changes the foil strength, not the photo.")
> **Related ADRs**: ADR-0001 (owner decision): Svelte 5 + Vite 8 + TypeScript strict, built locally, deployed statically to IONOS; `photos.php` stays the runtime manifest source; manifest gains optional `set`, `focus`, `chase` fields, backward compatible
> **Related UX Specs**: `pack-opening.md` (parent when opened from a pull), `binder.md` (parent when opened from a tile), `stage-landing.md` (deep-link parent)
> **Accessibility Tier**: Standard — committed in `design/accessibility-requirements.md`
> **Template**: UX Spec

> **Positioning note (binding)**: *Elsa the Explorer* is a card library /
> Sammelwerk. This screen is the **reading room**: one card under the
> spotlight, read like a catalogue entry — plate, plate photograph, edition
> line, the Elsa-Moment, the (openly imaginary) Fantasiewerte, the serial.
> The card is the only lit object in the room. Museum-catalogue register, warm
> dry humour, *du* register in German. This spec is written as a **refactor**;
> the current `#card-dialog` and the active "Open-card fit and pack theatre"
> block in `style.css` are the starting point.

> **Known defect this spec must fix (binding; defect history — the pre-rename
> build's credit string is quoted verbatim)**: in the current card-detail
> lightbox the card content overflows its frame — the "Elsen · Erste Auflage"
> credit **overlaps the photo**, the **last stat value is clipped** at the
> card's bottom edge, and **text crosses the foil edge**. The fix is specified
> as hard layout requirements in §5.3: the card reserves fixed proportions for
> its zones, and **content never paints outside them at any viewport**.

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

The visitor is holding the card they pulled or found — this is the moment the
whole product pays for. What they need is to *read* it properly: the name, the
mood, the moment's sentence, the photo large and undisturbed. Then they want to
keep it (save the photo) or send it on (share), or move to the next card
without leaving the reading room. The screen must also honour the card's
identity (F3): the same photo always shows the same name, rarity and text,
here, after a reload, and in a deep link. And it must be honest about the
Fantasiewerte — they are jokes, visibly labelled, never real measurements.

**The player goal** (what the player wants to accomplish):

Read every zone of one card without anything being cut off, then save or share
it, or step to the next card.

**The game goal** (what the game needs to communicate or capture):

Present the full card anatomy with stable proportions, mark the card
collected, capture the share/save intent, and keep the card's identity stable
across languages, sessions and deep links.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Tapping a rising card in the pack flow; tapping a tile in the collection; or opening a shared deep link (`?photo=`). |
| What is their emotional state? | Peak interest in exactly one object; slightly breathless after a pull, calm after browsing. |
| What cognitive load are they carrying? | Low — one card. But they may be mid-conversation in a chat app, so glances must suffice. |
| What information do they already have? | The card's face from tile/pack size; nothing more. Deep-link visitors may know nothing except the link worked. |
| What are they most likely trying to do? | Read the sentence, look at the photo properly, send it to someone, or flip it to see the back "like a real card". |
| What are they likely afraid of? | That text is cut off (the current defect trains this fear); that tapping the card does something destructive; that "Teilen" posts publicly somewhere; that the next card loses this one. |

**Emotional design target for this screen**:

The hush of opening a framed piece — everything on the card is legible, and
the foil quietly proves this one is special.

---

## 3. Navigation Position

**Screen hierarchy**:

```
Root — StageLanding
      ├── PackOpening (#pack-dialog)  ──┐
      ├── BinderShelf (#katalog)       ──┤── CardDetail (#card-dialog, modal on top)
      └── (deep link ?photo=<id>)     ──┘
```

**Modal behavior**: Modal (native `<dialog>.showModal()`), on top of its
parent when one is open. Dismissable at all times — Escape, ✕, backdrop
click. `←`/`→` step through the **entire catalogue** while open (canon), so
the reading room is also a reading *path*: no visitor is ever cornered into
closing to continue browsing.

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Pack card selection | `pack-opening.md` §7.2 | Parent dialog stays open underneath |
| Binder tile activation | `binder.md` §7.2 | Tile scroll-anchored behind |
| Deep link `?photo=<id>` | Shared link / reload | Opens after catalogue load, in the URL's language; **an id not present in the collection (deep-linked-away photo) silently does NOT open the dialog — the stage renders intact and focus stays with the pack CTA; the URL param is left untouched** |
| `←`/`→`/chevrons from another card | Within this dialog | The dialog never closes while navigating |

---

## 4. Entry & Exit Points

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Card selected | PackOpening / BinderShelf | Modal fade+scale 200ms | photo id | Card marked collected on open |
| Deep link resolved | Page load | Modal open | photo id, lang | URL keeps `?photo=` until close |
| Chevron / `←`/`→` | Within dialog | In-place card swap | target photo id | Wraps at both catalogue ends |

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Escape / ✕ / backdrop | Parent (PackOpening, BinderShelf, or stage) | Modal close 200ms (instant reduced-motion) | Focus returns to the **originating card button**; if none (deep link), to the stage CTA | Focus-return contract is binary-tested (§14) |
| "Noch ein Pack" | PackOpening (new accession) | Close + `pack:open-request` | — | Disabled while a pack resolves |
| "Foto speichern" | Browser download | Native download sheet | original file, `download` attribute | Page state unchanged |
| "Teilen" | Share sheet / clipboard | Native UI | deep-link URL | Status line reports the result (§7.2) |

---

## 5. Layout Specification

### 5.1 ASCII Wireframe

Desktop (≥1120px, ≥850px tall — side-by-side layout, current behaviour kept):

```
╔══════════════════════════════════════════════════════════════════╗
║                                                          [ ✕ ]  ║
║   ┌──────────────┐   ┌────────────────────────────────┐          ║
║   │              │   │ ┌────────────────────────────┐ │          ║
║   │  Noch ein    │   │ │ PLATE  Nr 04 · name (foil) │ │          ║
║   │  Pack        │   │ │        Laune · aus: Ruhesaal  │ │  ← plate │
║   │              │   │ ├────────────────────────────┤ │          ║
║   │  Foto        │   │ │        PHOTO WINDOW        │ │  41.5%   │
║   │  speichern   │   │ │      (focus-anchored)      │ │   height │
║   │              │   │ ├────────────────────────────┤ │          ║
║   │  Teilen      │   │ │ Elsa the Explorer · 1. Aul │ │  ← credit│
║   │              │   │ │ ★★★★☆        (own band!)   │ │   strip  │
║   │  (status)    │   │ ├────────────────────────────┤ │          ║
║   │              │   │ │ ELSA-MOMENT                │ │          ║
║   │  (hint)      │   │ │ „Sie hat den Garten neu    │ │          ║
║   │              │   │ │  sortiert. Nach ihr."      │ │          ║
║   └──────────────┘   │ │ Im Bild: Elsa am Beete     │ │          ║
║                      │ ├────────────────────────────┤ │          ║
║  ‹                 ›  │ Fantasiewerte · nur zum Spaß│ │          ║
║   (chevrons, mid-    │ │ [Spaß 7/10][Naps 9/10][X]  │ │ ← stats  │
║    edges)            │ ├────────────────────────────┤ │          ║
║                      │ │ 04/24      Elsa the Ex ·1A │ │ ← serial │
║                      │ └────────────────────────────┘ │   foot   ║
║                      └────────────────────────────────┘          ║
║    card slot: min(340px, 38vw, (100svh − chrome) × 0.70)         ║
╚══════════════════════════════════════════════════════════════════╝
```

Mobile (≤760px): single column — ✕, card, then the action row as a 2-column
grid ("Noch ein Pack" full-width on top), status and hint beneath; chevrons
overlay the card's vertical midline at the dialog edges.

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Dialog chrome | ✕ row, actions row, status, hint | ~30–34svh combined | No | Buttons wrap to 2 rows ≤380px; hint hides ≤380px height |
| Card slot | The full card (`card--full`) | width = fit formula (§5.3 L1); height = width / 0.70 | No | **Never scrolls, never clips zones — zones are proportioned to fit (L2–L5)** |
| Chevron zones | ‹ › over the dialog edges, vertically centred on the card | 44×44px each | No | Hidden at catalogue size 1 |
| Status line | Share/save feedback — plain text with no live semantics; the same string is announced through `#live-status` (ADR-0010 §2) | 1 line | No | Wraps to 2 lines; reserves min-height to avoid reflow |
| Confetti/halo dressing | Halo behind card + ground shadow + glare band | around the card | No | Decorative, `aria-hidden`, static under reduced motion |

The dialog never scrolls (`overflow: hidden`, current behaviour kept);
everything fits from 320×480 up.

### 5.3 Card Zones and the Overflow Fix (binding layout requirements)

The card face is a **fixed set of proportional bands**. These requirements are
binary and testable; they exist to kill the reported defect permanently.

**Bands — seven bays (six content + gutters), percentages of the card plate's inner height.**
These are the D12a values from `design/art/art-bible.md` §8, which is the authority; the
photograph is the only lit object, so it takes the largest content band.

| Bay | % | Content and clamp |
|---|---|---|
| 1 · plate | **15.5** | row 1: name, **one line with ellipsis**; row 2: number, mood (one line), rarity chip |
| 2 · photo window | **41.5** | 4:5 window filling its band (no block padding), `object-position` from the focus anchor; nothing overlaps it |
| 3 · credit strip | **5.5** | edition credit + stars, own row, never painted over the photo |
| 4 · story | **19.5** | keyword + sentence (≤ 3 lines) + "Im Bild" note |
| 5 · stats | **8.5** | Fantasiewerte label + 3 stat chips, every value inside its chip |
| 6 · foot | **5.0** | serial + credit + edition |
| 7 · gutters | **4.5** | five gaps, never collapses; the foil edge keeps its margin |

At the 340 × 485.71 px reference the plate's inner height is 469.71 px and the photo window is
**155.94 px wide (45.87 % of card width)**. Tile cards use the Binder-tile column from §8
(15.5 / 44 / 5.5 / 16 / 9 / 5.5 / 4.5).

**L1 — Fit formula owns the chrome, not a magic number.**
The card slot width is `min(340px, 38vw, (100svh − chrome) × 0.70)` where
`chrome` = the *measured* heights of the ✕ row, actions row, status line,
hint line and all gaps (custom property, updated by ResizeObserver; the
current constants −300px/−270px/−260px are the starting point and may stand
only where they are provably ≥ the measured chrome on every breakpoint).
Rationale: the defect class "stat clipped at the bottom" comes from the slot
being sized for a chrome estimate that broke at small heights.

**L2 — Every zone is a band in a fixed grid.**
`card--full` keeps `aspect-ratio: 0.70` (the 0.58 narrow-width variant is retired, ADR-0011 R5)
and lays its seven bays out on `grid-template-rows` with the proportions above; zones may
shrink their *inner* font (§5.3 zone rules) but may never push, overlap or starve a neighbour. Absolute positioning inside a band may not escape the
band. Decorative foil layers (rays, glitter, glare) may cover the card but
never carry content.

**L3 — The credit strip is its own band.**
Fix: "Elsen · Erste Auflage" credit + stars live in band 3, a reserved row
between photo and Elsa-Moment. It must not be absolutely positioned or
negative-margined over the photo window (current failure mode). At every
viewport the strip's bounding box does not intersect the photo's.

**L4 — Stat chips reserve their value height.**
Each stat chip reserves the full glyph box of its value ("10/10") plus the
mini bar; the stats band's `min-content` height includes the tallest possible
value; the serial foot is a fixed min-height band. Fix for "last stat value
clipped": the lowest text baseline of the last stat must sit ≥2px above the
card's inner bottom edge at every viewport.

**L5 — Nothing crosses the foil edge.**
All content bands are inset from the card's foil frame by at least the frame
padding (4px common / 7px holo). No text baseline may cross the foil's inner
edge (current failure mode: text over the foil frame). Verified per §14 by
scripted geometry checks, not by eyeballing.

**L6 — Zoom & crop rules.**
The photograph uses `object-fit: cover` with a **focus anchor**: the manifest's
optional `focus` field `{x, y}` percentages, default `center 42%` (faces sit
high in Elsa's photos). There is no in-card user zoom in this round — pinch
zooms the page (browser default, allowed and unblocked). Display copies are the
`detail` rung (1200 px) per ADR-0008 — `view` is the deprecated download alias, not
a display rendition; the **original** is used only by "Foto speichern". A photo
zoom/magnify affordance is deliberately deferred (§15).

**Holo / foil treatment — adopted from the reference study** (`holo-card-ref.html`,
the layered-CSS foil reference; the current implementation shares its lineage —
what follows is what the card should additionally adopt):

| # | Adopt | Reference mechanic | Why it earns its place |
|---|-------|--------------------|------------------------|
| A | **Keyboard foil tilt** | Arrow keys nudge the tilt target ±7°/step, clamped ±18°/±20° | The card reserves `←`/`→` for card navigation (canon). **Split:** `←`/`→` navigate cards; `↑`/`↓` tilt the foil while the card has focus. Keyboard visitors get the same material life as pointer users. |
| B | **Tap-vs-drag discrimination** | `pointerdown` captures; movement < 8px on release = tap (flip); ≥ 8px = tilt drag | Touch users currently risk accidental flips while aiming to tilt. Also sets `touch-action: none` on the card zone only — the dialog never scrolls, so page behaviour is unaffected. |
| C | **Halo + ground shadow** | Conic rainbow halo (blur 60px, opacity tracks tilt energy) behind the card; elliptical ground shadow that counter-shifts with tilt | "The card is the only lit object in the room" — this dressing is the light source. Static under reduced motion; `aria-hidden`. |
| D | **Spring flip** | Flip angle runs through the same spring as tilt (`k=110/c=13`, reduced `200/30`) with a `translateZ` lift at 90° | Replaces the flat 700ms CSS transition; flip and tilt share one physical system, and reduced motion collapses both to instant. |
| E | **em-scaled card typography** | Card root `font-size` derived from the card width (cqw); every zone sized in `em` | The card scales as **one unit** — this is the mechanism that makes L2's fixed bands safe at any size (the reference's card never overflows for this reason). |
| F | **Etched corner brackets** | SVG corner ornaments inside the frame | Museum-plate register; decorative, `aria-hidden`, one code path for all rarities. |
| G | **Pointer spring + idle sway constants** | `k=150/c=15` (reduced `260/32`), idle sway ±7°/±13° after 2.6s idle | Already implemented in `app.js` (`bindCardShine`) — kept verbatim as the spec'd behaviour. Reduced motion: no sway, springs settle instantly. |
| H | **Glare band + radial glare + twin glitter sheets** | `--bp` band, `--px/--py` radial, two canvas glitter sheets | Already present — kept; holo strength remains a **material** difference by rarity, never a label alone. |

### 5.4 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| `CardDetail` | **Svelte 5 component** (one line: dialog shell — chrome rows, card slot, chevrons, status/hint, focus + key handling) | dialog | The reading room | Yes | Refactor of `#card-dialog` |
| `CardFace` (variant `card--full`) | **Svelte 5 component** (one line: the seven-bay card renderer shared with tiles/pack via size variants) | card slot | The full card | Yes | Refactor of `cardElement(size="full")` |
| `.card__plate` (+ number, name, mood, rarity chip) | Composite | band 1 | Identity | Yes | Yes |
| `.card__set-chip` ("aus: {Set}") | Chip | band 1 | Set membership — **GDD R1, Vertical Slice** (also on drop cards); `new-acquisitions` cards show no chip | Yes (VS) | New |
| `.card__stamp` ("2. Auflage") | Stamp chip | band 1 | Second-lap pulls — **GDD R6, Phase 3** (lap derived per R-H at pull time); decorative, the dialog stamp line is its text form | Phase 3 | New |
| `.card__wing-frame` | Frame variant | card frame (band-independent) | **GDD R3b — completed-room frame variant on the seven-bay face (Vertical Slice)**: the same gilt frame the room's tiles wear, rendered around the dialog card; **decorative only (R10)** — announced nowhere, carries no state | Yes (VS) | Same frame tokens as `.shelf__gilt` |
| `.card__photo` (+ img, rays, frame, focus anchor) | Composite | band 2 | The photograph is the art | Yes | Yes |
| `.card__strip` (credit + stars) | Band | band 3 | Edition + rarity stars | Yes | Yes (moved into its own band per L3) |
| `.card__line` (Elsa-Moment, copy, "Im Bild") | Panel | band 4 | The card's story | Yes | Yes |
| `.card__stats-label` + `.card__stats` | Label + 3 chips | band 5 | Fantasiewerte, openly imaginary (F2a) | Yes | Yes (per L4) |
| `.card__foot` (serial + credit + edition) | Band | band 6 | Catalogue position | Yes | Yes |
| `.card__halo` / `.card__ground-shadow` | Decorative | around card | Adopted dressing (§5.3 C) | Round 1 (dressing) | New |
| `.card__corner` ×4 | Decorative SVG | frame | Adopted brackets (§5.3 F) | Phase 2 | New |
| `#open-another` | Primary button | actions | "Noch ein Pack" | Yes | Yes |
| `#save-card` | Download link | actions | "Foto speichern" (original) | Yes | Yes |
| `#share-card` | Button | actions | "Teilen" (`navigator.share` → clipboard fallback) | Yes | Yes |
| `.card-nav` ‹ › | Buttons | chevron zones | Prev/next card (mouse/touch parity with `←`/`→`) | Yes | New (refactor) |
| `#share-status` | Live status | status | Share/save feedback | Yes | Yes |
| `.print__hint` | Text | hint | Key legend ("← →", "F umdrehen") | Yes | Yes (updated) |
| `.lightbox__close` | Button | chrome | ✕ | Yes | Yes |

**Pattern references** (`design/ux/interaction-patterns.md`): Card Tilt & Foil
Material · Card Flip · Card Browsing (Arrows / Swipe) · Dialog Open / Close ·
Focus Trap (Dialog) · Share Button · Save / Download Link · Pack-Open Button
(Primary, "Noch ein Pack") · Close Button · Keyboard Shortcut ·
Live Region Announcement · Error State (share failure, image error).

**Primary focus element on open**: the dialog element itself (current
behaviour kept), so Escape works immediately. On close: focus returns to the
originating card button (pack card / catalogue tile); with no originating card
(deep link), to `#open-pack`.

### 5.5 Information Hierarchy

1. **First: the card** — the only lit object; every band readable at a glance.
2. **Second: the photo** — the photograph stays the strongest colour on the
   card (PRD design row); foil strengthens it, never covers it.
3. **Third: the actions** — reachable without crossing the card; on mobile
   they sit *below* the card in reading order.
4. **Fourth: status + hint** — quiet lines that never shift layout (status
   reserves its height).

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Populated (front) | Card opened | Six bands rendered; tilt/foil live; actions active | `←→` navigate, `↑↓` tilt, tap/`F`/`Enter`/`Space` flip, Escape closes | Default |
| Flipped (back) | Flip gesture | Back face: brand mark "ELSA THE EXPLORER", monogram medallion, edition line, rosette pattern, foil | Same inputs; `aria-pressed="true"` | Announced (§12) |
| Navigating | `←`/`→`/chevron | Card swaps in place (**150ms crossfade — the library's Card Browsing is the SSOT**, instant reduced-motion); dialog stays open | URL `?photo=` updates; announcement "{number} von {total}" | Wraps at catalogue ends (whole catalogue per the library decision); skipped when catalogue size = 1 |
| HEIC converting | Photo is HEIC and server conversion unavailable | Photo window shows a soft shimmer; frame + all text bands fully intact | Interaction unaffected | F22b; failure → Image error |
| Image error | Photo fails to load/convert | Frame shows the set-coloured fallback panel with the plate crest; **card remains readable without the picture** (R7) | Actions unaffected | Never an empty white box |
| Share success | `navigator.share` resolved | Status: "Geteilt." | — | §12 announcements |
| Share copied | Clipboard fallback succeeded | Status: "Link kopiert." | — | Status clears after 3.4s (current timing kept) |
| Share failed | Clipboard refused | Status: "Link konnte nicht kopiert werden. Er steht oben in der Adresszeile." | — | Failure is never silent |
| Completed-room frame | Opened card belongs to a completed room | The **gilt frame variant (R3b, VS)** renders around the card face — decorative only (R10) | — | Same frame tokens as the room's tiles |
| Capstone plaque | The capstone surface is opened for study (header component, not a catalogue card) | Grand frame treatment; **no Fantasiewerte band** — bands 4–5 collapse and the photo grows to compensate | Serial band reads "Sammlung I · abgeschlossen" | Phase 3 (Full Vision); **Elsas Ehrenmensch / Elsa's Honorary Human** per owner canon; per-set diplomas do not exist |
| Second lap | Opened card was pulled after lap restart | "2. Auflage" stamp on the plate **(GDD R6, Phase 3)** + the dialog's stamp line beneath the actions: "Zweite Auflage — die Sammlung kennt sie schon." / "Second printing — the collection already knows this one." | — | Stamp is decorative (R10); the dialog line is its text form; catalogue tiles never show stamps |
| Chase / gold-glint | Opened card is Das Hauptporträt (`chase: true`, GDD R-G) | **Gold-glint keystone frame** around the face — same material family as the room tile's frame, saturated for the dialog stage | — | Decorative (R10); never announced as rarity |
| Reduced motion | System setting | No tilt spring, no idle sway, no flip animation (instant), halo/shadow static, foil material static | All inputs unchanged | Canon: foil movement off; information identical |
| Deep link | `?photo=` | Card opens pre-announced; closing returns focus to `#open-pack`; **unknown id → dialog never opens, stage intact, focus stays with `#open-pack`** | URL cleaned on close (only when the card opened) | F12 |

---

## 7. Interaction Map

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| `←` / `→` | Keyboard | Previous/next card (wraps over the whole catalogue — **scope per the library's Card Browsing decision**: the lightbox browses the entire catalogue, never only the current pack) | In-place crossfade 150ms | tick | Canon F20; disabled when the collection has 1 card |
| `↑` / `↓` | Keyboard | Nudge foil tilt while the card has focus (§5.3 A) | Foil/glare track the nudge | none | Adopted from the reference; does not collide with `←→` |
| `Tab` / `Shift+Tab` | Keyboard | Walk: dialog → ✕ → ‹ → card → › → Noch ein Pack → Foto speichern → Teilen → (wrap) | Focus ring per element | none | Card is `role="button"` `tabindex="0"` |
| Drag (pointer/touch) | Mouse/Touch | Tilt the card | Foil layers + glare + halo track; spring settles | none | Grab cursor on the card zone |
| Horizontal swipe on the card | Touch | Tilt only — **never** navigation | see above | none | Gesture conflict resolved: navigation has dedicated chevrons on touch; the card surface belongs to tilt/flip (§5.3 B) |

### 7.2 Action Inputs

| Input | Platform | Context | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|---------|--------|----------|-----------|-----------|-------|
| Tap / click the card | Mouse/Touch | front or back | Flip the card | Spring flip with lift | ~500ms spring; instant reduced | flip | Tap-vs-drag per §5.3 B |
| `Enter`/`Space`/`F` on the card | Keyboard | card focused | Flip | same | same | same | `F` also works dialog-wide (current behaviour kept) |
| ‹ / › chevrons | Mouse/Touch | any | Prev/next card | Crossfade swap | 150ms | tick | 44×44px hit targets; **library Card Browsing chevron affordance** (resolves the library's discoverability open question — touch users get visible navigation without a hint surface) |
| "Noch ein Pack" | Mouse/Touch/Keyboard | any | Close + new accession | Dialog hands off to PackOpening | 160ms gap | rip | Disabled while busy |
| "Foto speichern" | Mouse/Touch/Keyboard | any | Download the original | Browser download sheet | none | none | Filename = photo filename |
| "Teilen" | Mouse/Touch/Keyboard | any | `navigator.share` → clipboard fallback | Status line updates (§6) | none | none | URL carries `lang` + `photo` (current behaviour kept) |
| Escape / ✕ / backdrop | Keyboard/Mouse/Touch | any | Close | Modal close; focus-return contract (§4) | 200ms; instant reduced | none | Never blocks |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Navigation swap (150ms) | Double-tap `←→` queues, doesn't skip frames | Keeps the swap legible without feeling laggy |
| Share pending | "Teilen" disabled until sheet resolves | One share at a time |
| HEIC converting | Photo-related inputs unaffected; flip allowed | Never cage the visitor for a decode |
| Reduced motion | None | Movement is removed, not capability |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Card content (name, mood, sentence, "Im Bild", Fantasiewerte, rarity) | Card catalogue (photo → card pipeline; per-photo bilingual overrides; bank fallback) | On open / navigate / language switch | Card source system | photo object | Missing copy → neutral fallback copy (F2), never invented activities |
| Rarity | Card source system (from the photo's own id — F3) | Stable per photo | Card source system | `common\|rare\|holo` | n/a — identity must not drift |
| Set membership / chase flag / edition stamp | Card catalogue (`set`, `chase`) + persistence (`flags.v1` lap) | On open | Card source system / persistence respectively | string / boolean | Missing set → no chip; missing stamp → none |
| Focus anchor | Card source system (manifest `focus`) | On render | Card source system | {x,y}% | Missing → `center 42%` |
| Display image / original | Card source system (`detail` 1200 px on open / `download` 1600 px on save; never the original) | On open | Card source system | URL (+ HEIC flag) | HEIC → conversion; failure → fallback panel |
| Collected set | Persistence system (`seen.v2`) | On open (idempotent if already present) | Persistence system | id array | Storage refused → session-only, silent |
| Share URL | Persistence system (lang) + current photo id | On share | Persistence system owns lang; the dialog composes the URL | absolute URL | n/a |
| Catalogue position | Card source system (index of id) | On open/navigate | Card source system | {number, total} | n/a |

> **Rule**: The dialog never writes state. Opening marks the card collected
> via the card/persistence systems; share/save fire intent events; `←→`
> navigation reads the catalogue.

---

## 9. Events Fired

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Card opened | `card:opened` | `{ id, source: "pack"\|"binder"\|"deeplink"\|"nav" }` | Persistence (seen) + audio + UI | Seen-write is idempotent |
| Flip | `card:flip` | `{ id, to: "front"\|"back" }` | Audio system | flip sound |
| Navigate | `card:navigate` | `{ from, to, wrap: boolean }` | UI + persistence (seen for the new card) | |
| Tilt (keyboard) | `card:tilt` | `{ id, axis }` | UI only | No persistence |
| "Teilen" | `share:requested` → `share:result` | `{ method: "sheet"\|"clipboard" }` → `{ ok, method }` | UI (status) | No analytics |
| "Foto speichern" | `save:requested` | `{ id }` | Browser (native download) | UI state unchanged |
| "Noch ein Pack" | `pack:open-request` | `{ source: "lightbox" }` | Pack system | |
| Close | `card:closed` | `{ id, focusTarget }` | UI only | Focus contract |
| (none) | — | — | — | No analytics, ever |

---

## 10. Transitions & Animations

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|---------------|--------|----------------|---------------------------|
| Dialog open | Entry | Fade + scale 0.96→1 | 200 | ease-out | Yes | Yes — instant |
| Flip | Tap/`F`/Enter | Spring rotateY 0→180° with translateZ lift (§5.3 D) | ~500 spring | spring k=110/c=13 | Yes (re-flip mid-air) | **Yes — instant face swap** |
| Tilt idle/pointer | Pointer/focus | Spring rx/ry toward target; halo + shadow counter-move | continuous | spring k=150/c=15 | Yes | **Yes — static material, no sway** |
| Card navigation | `←→`/chevrons | Crossfade + 8px horizontal drift toward the travel direction | 150 | ease-out | Yes | Yes — instant swap |
| HEIC swap | Conversion done | Photo crossfade | 200 | ease | Yes | Yes |
| Status line | Share result | Text appears in reserved slot | 0 (no shift — height reserved) | — | — | n/a |
| Dialog close | Exit | Fade + scale →1.02 | 200 | ease-in | Yes | Yes — instant |
| Confetti | On open from a fresh holo pull (parent decides) | Canvas burst | ~1900 | n/a | Runs to end | **Yes — none** |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (✕, chevrons, card, three actions)
- [x] Tab order follows visual reading order (chrome → card → actions on mobile; chrome → card → side rail on desktop)
- [x] Every action achievable by mouse is also achievable by keyboard (flip = `F`/Enter/Space, navigate = `←→` + Tab-to-chevron, tilt = `↑↓`)
- [x] Focus is visible at all times
- [x] Focus does not escape the screen while it is open (native dialog trap; parent traps beneath)
- [x] Esc key closes (and returns focus per the §4 contract — never quits the site)

**Gamepad** — *out of platform target (web). Unticked by design; not an
implementation blocker for this project.*

**Mouse**
- [x] Hover states defined for all interactive elements (card tilt, buttons, chevrons, ✕)
- [x] Clickable hit targets are at minimum 32x32px (44x44px preferred) — actions ≥42px, chevrons 44px, ✕ ≥36px visual/44px hit
- [x] Right-click behavior defined (native context menu on the card image = OS save path; no custom handler)
- [x] Scroll wheel behavior defined in all scrollable zones (the dialog has none; wheel over the card nudges nothing — tilt is pointer-position-driven)

**Touch**
- [x] All touch targets are minimum 44x44px (actions row is a 2-col grid with ≥38px buttons **padded to 44px hit height** — current 38px visual is kept with expanded hit slop)
- [x] Swipe gestures do not conflict with system-level swipe navigation (card surface = tilt/flip with 8px discrimination; navigation uses chevrons, never edge swipes)
- [x] All actions achievable with one hand in portrait orientation (actions at the bottom, chevrons at the card's midline)
- [x] Long-press behavior defined (native image context sheet on the card photo — OS default, not intercepted)

---

## 12. Accessibility

> Tier Standard per `design/accessibility-requirements.md`; WCAG 2.2 AA target.

**Text contrast requirements for this screen**:

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Plate name (rare/holo foil gradient text) | Indigo plate gradient | 4.5:1 at **every gradient stop** | verify — gradient text is the audit's hardest case; drop-shadow required as the second channel | [ ] audit |

**Foil-name gradient under reduced motion (audit target)**: with
`prefers-reduced-motion: reduce`, the gradient text's `background-position`
animation is replaced by a **static gradient rendered at one fixed, flattering
stop** chosen by art sign-off — the stop must itself pass the 4.5:1 row above,
so the audit can check a single rendered frame instead of an animated range.
(Pending art-director sign-off — see §15.)

**Rides the open art-direction gap**: the "Das Gesamtverzeichnis" plaque
(binder.md §6) shares this dialog's foil/frame token set — its exact frame
treatment follows the same art sign-off; nothing in this spec's geometry
requirements depends on it.
| Plate number / mood / rarity chip | Plate | 4.5:1 | ≈ 10:1 | [x] |
| Credit strip text + stars | Parchment band | 4.5:1 | ≥ 4.5 required (8–10px type is the risk) | [ ] audit — smallest text on the card |
| Elsa-Moment copy | Panel | 4.5:1 | ≈ 9:1 | [x] |
| Fantasiewerte label + stat values | Label: muted on velvet; values on chip | 4.5:1 | values ≈ 12:1; label ≥ 4.5 required | [ ] audit |
| Serial foot | Card face | 4.5:1 | ≥ 4.5 required | [ ] audit |
| Action buttons | Pearl/outline surfaces | 4.5:1 | verify primary (dark ink on light) | [ ] audit |
| Status line | Dialog velvet | 4.5:1 | ≈ 10:1 | [x] |
| Keyboard hint `.print__hint` | Dialog velvet | 4.5:1 | verify at audit — hint renders in the muted `--muted` token, not the promoted body colour; do not assume pass | [ ] audit |

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Rarity | Hue-only foil would fail | Foil is material (texture/glare/glitter) **and** the chip prints the word; the strip prints five slots, filled 3/4/5 (Häufig / Selten / Holo-Pracht) |
| Flipped state | Back/front confusion | `aria-pressed`, distinct faces, and the flip is announced |
| Holo dressing (halo, glitter) | Decorative | `aria-hidden`; carries no information |

**Focus order** (Tab key sequence, numbered):

1. Dialog element (initial focus)
2. ✕ close
3. ‹ previous chevron
4. Card (`role="button"`; `↑↓` tilt, Enter/Space/`F` flip while focused)
5. › next chevron
6. "Noch ein Pack"
7. "Foto speichern"
8. "Teilen"
Cycle: wraps within the dialog. `←→` are dialog-level shortcuts for chevron
actions (canon); `↑↓` tilt only while the card has focus. On close, focus
returns to the originating card button, else `#open-pack`.

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Card opened | "{number}. {name}. {rarity}." — e.g. "Nr. 07. Ministerin für Mittagsschlaf. Holo-Pracht." (library format) | On open (current behaviour kept) |
| Navigation | "{number} von {total}." (then the new card's open announcement) | On each `←→`/chevron step |
| Flip to back / front | "Rückseite der Karte." / "Vorderseite der Karte." | On flip |
| Share sheet resolved | "Geteilt." | On success |
| Clipboard fallback | "Link kopiert." | On success |
| Share failed | "Link konnte nicht kopiert werden. Er steht oben in der Adresszeile." | On failure — never silent |
| Fantasiewerte | Label precedes the values in the card's `aria-label` ("Fantasiewerte · nur zum Spaß: …") | Part of the open announcement (F2a) |
| "Noch ein Pack" while busy | Button is disabled with label "Pack wird geöffnet" state carried by the parent | On attempt |

**Cognitive load assessment**:

One card, three actions, one hint line = 5 streams, comfortably under 7±2.
The card's own `aria-label` composes all face content in one string so a
screen-reader visitor reads the card like a catalogue entry without Tab-walking
six text nodes. The Fantasiewerte are explicitly framed as jokes before the
numbers are read (F2a), preventing misreading them as data.

---

## 13. Localization Considerations

- DE default, EN second; brand mark untranslated; copy deck only. Layouts
  tolerate **DE at +40 % over the EN baseline** — with the card's fixed bands,
  German is the binding constraint, not English.
- No RTL target.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Card name | catalog-driven | 24 (2 lines in band 1) | 40 % | n/a | Wraps to 2 lines; then font steps down one cqw clamp (never truncates a name) | Medium — **HIGH PRIORITY for localization**: band 1 is fixed |
| Mood ("Laune: …") | catalog-driven | 20 | 40 % | n/a | Wraps inside band 1's mood row | Low |
| Credit strip "Elsa the Explorer · 1. Auflage" | ~28 | 40 | 40 % | n/a | Fixed band per L3; letter-spacing steps down, then wraps to 2 short lines — **never** overlaps the photo | Medium — **HIGH PRIORITY**: the defect zone |
| Elsa-Moment sentence | catalog-driven | 96 (band clamp) | 40 % | n/a | Wraps within band 4; band 4 is 19.5 % and the copy clamps at 3 lines; the font steps down once; last resort drops the "Im Bild" line to keep the sentence | Medium — **HIGH PRIORITY** |
| "Im Bild: …" note | ~30 | 44 | 40 % | n/a | First thing to yield (see above); never the sentence | Low |
| Fantasiewerte label ("Imaginary stats · just for fun" / "Fantasiewerte · nur zum Spaß") | 30 | 42 | 40 % | n/a | Wraps to 2 short lines above the chips | Low |
| Stat keys + values | manifest-driven | key 12, value 4 | 40 % | n/a | Key wraps inside the chip (L4 reserves the value box) | Low |
| Stamp line (dialog, Phase 2) "Second printing — the collection already knows this one." / "Zweite Auflage — die Sammlung kennt sie schon." | ~57 | 80 | 40 % | n/a | Status/hint area wraps to 2 lines | Low |
| Action buttons ("Another pack"/"Noch ein Pack", "Save this photo"/"Foto speichern", "Share"/"Teilen") | 12/15/5 | 17/21/7 | 40 % | n/a | Mobile 2-col grid: buttons wrap to their own rows rather than shrink below 44px hit height | Medium — **HIGH PRIORITY**: mobile actions row |
| Status messages (§12) | 12–60 | 17–85 | 40 % | n/a | Reserved slot wraps to 2 lines | Low |
| Hint line ("Tap to flip · ← → for the next" / "Karte antippen zum Umdrehen · ← → zur nächsten") | ~38 | 54 | 40 % | n/a | Wraps to 2 lines; hidden ≤380px height | Low |
| Set chip "from: {Set}" / "aus: {Set}" | 12 + set | 17 + set | 40 % | n/a | Chip truncates the set name at 12 chars + ellipsis; `title` carries the full name | Medium |

---

## 14. Acceptance Criteria

**The overflow defect — binary geometry criteria (the spec's core purpose):**
- [ ] At every viewport in {320×480, 320×568, 390×844, 414×896, 640×480, 768×1024, 1024×768, 1280×800, 1280×900, 1920×1080, 1920×1200}, portrait and landscape: **the credit strip's bounding box does not intersect the photo window's** (fixes the "Elsen · Erste Auflage" overlap)
- [ ] Same viewport sweep: **the lowest text baseline of the last stat value sits ≥2px above the card's inner bottom edge** (fixes the clipped stat)
- [ ] Same viewport sweep: **no content band extends beyond the card frame's inner border** — nothing crosses the foil edge (fixes defect 3)
- [ ] These three checks run as scripted Playwright geometry assertions (bounding-box intersection + baseline math) on every build — CI, not eyeballs
- [ ] At 200 % browser zoom the same three assertions pass

**Performance**
- [ ] Dialog opens within 100ms of trigger with the card's first paint
- [ ] Pointer tilt maintains ≥55fps on a 2019 mid-range phone; reduced motion draws zero tilt/flip animation frames
- [ ] Card navigation swap completes within 150ms of the keypress (library SSOT)

**Layout & Rendering**
- [ ] The dialog never scrolls at any listed viewport; all seven bays visible simultaneously
- [ ] All §6 states render correctly (front, flipped, navigating, HEIC converting, image error, share states, completed-room frame, capstone plaque, reduced motion, deep link)
- [ ] A deep link with an id that is not in the collection (removed or mistyped photo) opens **no dialog**: the stage renders intact, focus remains on `#open-pack`, and no `seen.v2` write occurs
- [ ] Photo crop honours the `focus` anchor; the card renders the `detail` rung (1200 px), never the original; "Foto speichern" delivers the original filename
- [ ] Holo cards show the adopted halo + ground shadow dressing; reduced motion shows both static

**Input**
- [ ] Keyboard-only pass: open → read card → `←` wraps to the collection end → `→` back → `F` flips → `↑↓` tilt → Escape returns focus to the originating card button (assert `document.activeElement`)
- [ ] Touch pass: tap flips, an 8px+ drag tilts without flipping, chevrons navigate; no browser back-swipe is triggered from the card surface
- [ ] From the pack flow, closing returns focus to the same pack card; from the collection, to the same tile; from a deep link, to `#open-pack`

**Events & Data**
- [ ] `card:opened` fires once per open; `seen.v2` gains the id (idempotent re-open test)
- [ ] Share URL always carries `lang` and `photo`; clipboard fallback text matches the copy deck in the current language
- [ ] No direct `localStorage` writes from this dialog (code review check)
- [ ] The same photo renders the same name/rarity/text after reload and in a deep link (F3 test)

**Accessibility**
- [ ] All §12 contrast rows pass measured audits, including every gradient stop of the foil name
- [ ] VoiceOver pass: open → hear number/name/rarity + Fantasiewerte framing → flip → hear front/back → share → hear the status — without visual cues
- [ ] Reduced motion: flip is instant, foil static, halo static; no information is motion-gated
- [ ] The card is fully operable with keyboard only, mouse only, and touch only

**Localization**
- [ ] German at +40 % over the EN baseline passes the §14 geometry sweep with the longest catalogue name, sentence and Fantasiewerte substituted
- [ ] All strings from the copy deck; the "2. Auflage" stamp, its dialog stamp line, and the "aus:" chip exist in both languages

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Photo zoom affordance (pinch-to-inspect inside the card) — deferred this round; revisit with real photos | ux-designer + user | after first playtest | — |
| Keyboard tilt discoverability: is `↑↓` hint-worthy in the dialog hint line, or learnable? (Hint line has one row budget.) | ux-designer | with playtest | — |
| Should `←→` from a pack-opened card step within the five pulled cards only, or the whole catalogue (current + canon)? Canon says the lightbox browses; confirm no playtest confusion | game-designer + ux-designer | with playtest | — |
| Share text: card sentence or printed name only (PRD §9.7)? | user | before launch | — |
| ~~Diplom: CardDetail render vs. dedicated honours view~~ **RESOLVED 2026-11-22 (owner canon):** the capstone **Elsas Ehrenmensch / Elsa's Honorary Human** lives in the collection header (binder.md §6); this dialog renders it only for study via the capstone-plaque state | owner + ux-designer | 2026-11-22 | RESOLVED |
| Foil name gradient: cap animation of `background-position` under "no motion" preference — static gradient at a fixed flattering stop needs art sign-off | art-director | with art bible pass | — |
