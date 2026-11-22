# UX Spec: Stage Landing (Entry Hall of the Card Library)

> **Status**: In Design
> **Author**: user + ux-designer
> **Last Updated**: 2026-11-22
> **Journey Phase(s)**: Arrival → first accession (entry point of the whole site)
> **Screen / Flow Name**: `StageLanding`
> **Platform Target**: Web — mouse / touch / keyboard (no gamepad; static IONOS site)
> **Related GDDs**: `PRD.md` §1 Problem, §3 User stories (core), §4.1 F1, F7–F13, F17, §5 Design row
> **Related ADRs**: ADR-0001 (owner decision): Svelte 5 + Vite 8 + TypeScript strict, built locally, deployed statically to IONOS; `photos.php` stays the runtime manifest source (owner FTP-drop workflow preserved). Further constraints from `PRD.md` §5 (no third-party runtime deps) and §7 (privacy, DE default)
> **Related UX Specs**: `pack-opening.md` (child, accession flow), `card-detail.md` (child, card lightbox), `binder.md` (sibling, the catalogue)
> **Accessibility Tier**: Standard
> **Template**: UX Spec

> **Positioning note (binding for copy and rationale)**: *Elsa the Explorer* is a
> **card library / Sammelwerk**, not a gift toy. The collection is the product;
> Elsa is the collection mechanism; the visitor is an explorer and reader of the
> library. The landing is the **entrance hall**: it invites exploration first and
> a new accession (pack) second. Copy stays in the museum-catalogue register with
> the established warm, dry humour — *du* register in German, no marketing voice.
> This spec is written as a **refactor**: the current DOM (`index.html` stage
> block, `.pack__seal` object) is the starting point, not a constraint. Retained
> concepts that earned their place: photo→card pipeline, unseen-first walk,
> holo-as-material, DE/EN, localStorage persistence, static hosting. Build via
> Vite 8; deploy statically to IONOS; `photos.php` stays the runtime manifest
> source (owner FTP-drop workflow preserved).

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

A friend or family member has just tapped a link in the family chat. They did not
come to browse a website — they came to meet the collection. What they need in the
first five seconds is an entrance that says *there is a library here, you may read
it* — one unmistakable invitation to pull a new accession (the pack), and visible
proof that the catalogue grows with every visit (the catalogue line "3 von 24
gesammelt"). Nobody here wants to read, log in, or choose. The entrance hall
must make the first pack irresistible and make the return visit feel like walking
back into a wing that has grown since last time.

**The player goal** (what the player wants to accomplish):

Pull a new accession — five cards of Elsa — with one obvious action, without
reading anything first.

**The game goal** (what the game needs to communicate or capture):

Communicate the library's promise — five cards per accession, at least one in
foil, every card is collected once before any repeats — and surface the
visitor's catalogue progress so returning readers see the catalogue filling and
first-time visitors understand nothing is missing yet.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Reading a chat message containing the link ("I built Elsa a library"). On repeat visits: closing the tab after their last accession. |
| What is their emotional state? | Curious, impatient, zero tolerance for friction. Grandparents may be slightly anxious about "breaking something" in a museum-like place. |
| What cognitive load are they carrying? | Low — but they are on a phone, possibly one-handed. Nothing they were tracking carries over. |
| What information do they already have? | Elsa is a dog they know. Nothing about packs, foil rarities, sets or the catalogue. Repeat visitors know the loop and their own count. |
| What are they most likely trying to do? | First visit: tap the big shiny thing. Repeat visit: pull another accession and check whether the catalogue line moved. |
| What are they likely afraid of? | That nothing happens when they tap; that they need an account; that the foil motion is dizzying; that a museum register means rules and barriers ("may I touch this?"). |

**Emotional design target for this screen**:

"I found Elsa's library, the door is open, and I am invited to open the next
crate myself."

---

## 3. Navigation Position

**Screen hierarchy**:

```
Root — StageLanding (single-page site, document scroll; the entrance hall)
      ├── Child — PackOpening (#pack-dialog, modal)      → pack-opening.md
      │         └── Child — CardDetail (#card-dialog)    → card-detail.md
      └── Sibling section — Binder (#katalog, same page)   → binder.md (the catalogue)
                └── (opens CardDetail for any tile)
```

**Modal behavior**: Non-modal. The stage is the page itself; it never blocks.
Its two children are modals (native `<dialog>`), specified in their own specs.
The stage remains scrollable behind them; the dialogs themselves do not scroll
(fixed-height layouts, see `pack-opening.md` §5 and `card-detail.md` §5).

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| Direct URL (family chat link) | Visitor taps shared link | German default, `lang=de` |
| `?lang=en` / `?lang=de` | URL parameter | Beats stored preference (F9); stage renders in that language before copy paint |
| Stored language | Returning visitor | `lucky-elsa.lang.v1`, applied by the inline head script pre-render |
| `?photo=<id>` deep link | Shared card link | Stage renders normally; CardDetail opens above it after the catalogue loads |
| Wordmark click | Visitor taps "Elsa the Explorer" | Scroll back to the entrance (anchor `./`) |

---

## 4. Entry & Exit Points

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Page load | — (browser) | Instant, no transition | URL params (`lang`, `photo`) | Language resolved before app init |
| Dialog close (pack or card) | PackOpening / CardDetail | Modal returns focus | Focus lands on the accession CTA (or the originating pack card) | Specified in child specs |
| "Nach oben" footer link | Footer | Smooth scroll (instant under reduced motion) | — | Anchors to `#stage` |

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Tap "Pack öffnen" / seal / press `P` | PackOpening (#pack-dialog) | Modal open + wrapper theatre | none yet; catalogue updates happen when the accession completes | Disabled while an accession is resolving |
| Tap "Zum Katalog" | Binder section (`#katalog`) | Anchor scroll | — | Also reachable from the masthead nav |
| `?photo=` deep link resolves | CardDetail | Modal open above stage | opens card, marked collected via the card system | Only after catalogue load succeeds |
| Language switch DE/EN | Same screen, re-rendered | Instant re-copy | `lucky-elsa.lang.v1` updated by persistence | Announced in live region |

---

## 5. Layout Specification

### 5.1 ASCII Wireframe

Desktop (≥1120px wide viewport):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ambient beam + mote canvas (aria-hidden, behind everything)          │
│ ┌── masthead ─────────────────────────────────────────────────────┐  │
│ │ 🐾 ELSA THE EXPLORER    3 von 24 gesammelt   Zum Katalog DE|EN 🔊│  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌── stage (#stage, entrance hall) ───────────────────────────────┐   │
│ │  ┌── stage__copy ─────────────┐   ┌── stage__crate ─────────┐  │   │
│ │  │ KATALOG I  (eyebrow)       │   │  ╔═══════════════════╗  │  │   │
│ │  │                            │   │  ║ ╭─ foil frame ─╮  ║  │  │   │
│ │  │                            │   │  ║ │ photo teaser  │  ║  │   │
│ │  │ WAS STECKT                 │   │  ║ │   (cover)     │  ║  │   │
│ │  │ IM KATALOG?     (h1, 2 ln) │   │  ║ ╰───────────────╯  ║  │  │   │
│ │  │                            │   │  ║  🐾  ELSA THE      ║  │  │   │
│ │  │ Fünf Karten pro Pack, min- │   │  ║      EXPLORER      ║  │  │   │
│ │  │ destens eine in Folie. Jede│   │  ║  1. Auflage        ║  │  │   │
│ │  │ kommt einmal dran ...      │   │  ╚═══════════════════╝  │  │   │
│ │  │                            │   │  (button .pack__seal —   │  │   │
│ │  │ [ Pack öffnen ]  Zum Katalog │   │   the accession crate)  │  │   │
│ │  │ ┌── catalogue line ─────┐  │   │                         │  │   │
│ │  │ │ 3 von 24 gesammelt│  │   │                         │  │   │
│ │  │ │ ▰▰▰░░░░░░░░░░░░░░░░░  │  │   │                         │  │   │
│ │  │ │ Jede Karte kommt ...  │  │   │                         │  │   │
│ │  │ └───────────────────────┘  │   │                         │  │   │
│ │  │ Drück P, um ein Pack ...   │   │                         │  │   │
│ │  └────────────────────────────┘   └─────────────────────────┘  │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ┌── Der Katalog (#katalog, next fold) ─ ... ────────────────────┐   │
└──────────────────────────────────────────────────────────────────────┘
```

Mobile (≤760px): single column — copy first, crate below it, both full-width;
the seal is still ≥280px tall so it stays the visual anchor. No horizontal
scroll at 320px.

**Refactor decisions for this screen** (free to deviate from current DOM):
- The masthead count and the catalogue line show the same number from one
  source; today `#masthead-count` and `#progress-label` are separately keyed —
  the refactor keys both to one catalogue-state render.
- The binder section is anchored `#katalog` ("Zum Katalog"); `#album` and the
  interim `#regal` remain legacy alias redirects for old shared anchors.
- The pack CTA keeps its label **"Pack öffnen"** (canon, and `P` is bound to
  it), but the surrounding copy frames the pack as the **Neuzugang** — the
  crate that delivers new accessions to the catalogue.

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Ambient layer | Beam gradient + mote canvas, decorative | 100% × 100%, fixed | No | Clipped, `aria-hidden`, never receives pointer events |
| Masthead | Wordmark, catalogue count, nav (Zum Katalog, DE/EN, sound) | 100% × ~64px | No | Nav wraps on ≤380px; count truncates with ellipsis, full text in `title` |
| Hall copy | Eyebrow, H1, lede, actions, catalogue line, keyboard hint | ~55% width desktop, 100% mobile | No | Text wraps; H1 uses two fixed lines via the copy deck, both lines fit at 320px (font clamps) |
| Catalogue line | Count label, track+fill, rule note | ~100% of copy column, ~90px tall | No | Label wraps to 2 lines max; track keeps 8px height |
| Accession crate (seal) | The seal object (see 5.3) | ~min(340px, 38vw) square desktop, ~72vw mobile | No | Never overflows stage padding; image error → crest-only fallback state |
| Page scroll | Stage → Katalog → footer | document | Yes | Native scroll; no scroll hijacking |

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| `.skip-link` | Link | overlay | Jump focus straight to `#open-pack` (label and target agree) | Yes | Yes — exists, target retargeted |
| `.masthead__wordmark` | Link | Masthead | "Elsa the Explorer", return to entrance | Yes | Yes (text updated) |
| `.masthead__count` | Live text | Masthead | Compact catalogue count, mirrors the catalogue line | Yes | Yes |
| `.nav-link` ("Zum Katalog") | Link | Masthead | Anchor to the catalogue | Yes | Yes (relabelled) |
| `.lang-switch` DE/EN | Button group (`aria-pressed`) | Masthead | Switch all copy instantly | Yes | Yes |
| `.sound-toggle` | Toggle button (`aria-pressed`) | Masthead | Sound on/off, persists | Yes | Yes |
| `.stage__eyebrow` | Text | Hall copy | "Katalog I" / "Catalogue I" (D1) | Yes | Yes (copy updated) |
| `.display` H1 | Heading | Hall copy | "Was steckt im Katalog?" — the exploration invitation, two lines | Yes | Yes (copy updated) |
| `.stage__lede` | Text | Hall copy | Loop rules in one sentence, library register | Yes | Yes (copy updated) |
| `#open-pack` | Primary button | Hall copy | Text CTA, same action as the seal | Yes | Yes |
| "Zum Katalog" | Text link | Hall copy | Browse-first path for the reader persona | Yes | Yes (relabelled) |
| `#catalogue-line` (label/track/fill/note) | Progress composite | Hall copy | Collected-count + bar + unseen-first reminder | Yes | Yes (relabelled from progress block) |
| `.stage__hint` | Text + `<kbd>` | Hall copy | Teaches the `P` shortcut | Yes | Yes |
| `.pack__seal` | Large button | Stage crate | THE accession crate; opens a pack | Yes | Yes |
| `.pack__seal-art` (frame, top band, preview img, crest SVG, wordmark, edition label) | Composite visual | Inside seal | Makes the crate read as a foil-wrapped accession | Yes | Yes |
| `.pack__seal-tear` | Decorative span | Inside seal | Pre-cut tear line affordance | Yes | Yes |
| `#pack-preview` | Image | Inside seal | Photo teaser (cover of the catalogue) | Yes | Yes |
| "Das Heft hat Zuwachs: {n} neue Karten." accession line | Text | Above catalogue line, returning visitors only | Cards added since last visit, stated as a count (EN "New in the binder: {n} new cards." — D5) | No (round 2) | No — new |
| `#live` live region | Visually hidden status | Body end | Announcements | Yes | Yes |
| `EntranceHall` | **Svelte 5 component** (one line: stage shell — masthead wiring, hero copy, catalogue line, seal, catalogue-state subscription) | all | The stage as one mount boundary | Yes | Refactor of the current stage DOM |

**Pattern references** (implemented by `design/ux/interaction-patterns.md` —
spec'd here only where this screen deviates): Pack-Open Button (Primary) ·
Dialog Open / Close · Language Toggle (DE / EN) · Sound Toggle ·
Progress Bar · Keyboard Shortcut (`P`) · Live Region
Announcement · Empty State · Loading State.

**Primary focus element on open**: The skip link is first in Tab order (focus
lands on it only via Tab). After page load with no interaction, no element
holds programmatic focus. If the page loaded with `?photo=`, focus goes to the
CardDetail dialog (child spec). In the empty state, focus stays free; the
disabled CTA carries `aria-disabled` and an explanatory label.

### 5.4 Information Hierarchy

1. **First: the crate + "Pack öffnen"** — the only action that matters; 90% of
   visitors should never need to read past it (M5: everyone opens a pack unaided).
2. **Second: the catalogue line** — proves continuing is worth it; the returning
   reader's eye goes here before the headline. It is written as a museum
   catalogue entry ("3 von 24 gesammelt"), which quietly teaches the
   collection-is-the-product frame.
3. **Third: the lede** — one sentence of loop rules for those who read
   (unseen-first, ≥1 foil card). Sets expectations so a repeated card later is
   not read as a bug (R3 mitigation).
4. **Fourth: keyboard hint and the catalogue link** — for the keyboard user and the
   reader persona; both may wait below the fold of attention.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Loading (catalogue) | Page load until `photos.php`/`photos.json` resolves (≤3s/≤4s timeouts) | Catalogue label "Karten werden gesucht"; seal shows crest with placeholder photo | CTA + seal disabled; `P` inert | Must resolve or fall through to Empty or Error within 4s; no spinner layer beyond the label text |
| First visit (populated) | Catalogue loaded, `seen.v1` empty/missing | Catalogue line "0 von 24 gesammelt", bar 0; seal fully intact | All input active | The default state; German copy (F7) |
| Returning | Catalogue loaded, `seen.v1` non-empty | Catalogue line shows real count + fill; seal identical (the crate never shows fake wear — the catalogue grows instead) | All input active | Masthead count mirrors the line |
| New in the binder ("Das Heft hat Zuwachs: {n} neue Karten.") | Returning visitor; **mechanism = GDD R8 `lastManifestStamp`**: the manifest holds photo ids that were absent from the stamp of the visitor's previous visit | Line above catalogue: "Das Heft hat Zuwachs: N neue Karten." | Line disappears **once any new card is collected** (not on pack open); flag updated by persistence | **Vertical Slice (GDD R8)**; owner = persistence system |
| Sample / Mixed | All or some catalogue entries flagged `demo` | Demo/mixed note line visible in the catalogue zone | Packs work normally | Copy per `demoNote`/`mixedNote`, updated to library register |
| Empty | Catalogue resolves to 0 photos (both sources exhausted cleanly) | CTA label becomes "Noch keine Karten" and disabled; seal disabled (greyscale foil, no glow); catalogue line "Noch keine Karten" | `P`, CTA, seal inert; the catalogue shows the owner instruction ("npm run photos") | F14/F15 — owner-instruction copy lives **only** in the true-empty state, never in the failure state |
| Error (load failure) | Both fetches fail (network/server fault, non-JSON, abort) — distinct from Empty | Catalogue label "Der Katalog lädt nicht gerade."; seal greyed; stage intact (masthead, hero, hint all normal) | `P`, CTA, seal inert; a [Nochmal versuchen] retry sits with the catalogue's Error state (`binder.md` §6), which is the same failure surfaced there | Never tells a visitor to run npm commands; **the stage governs during load failure** — the stage is the entry surface and shows the failure line, while the retry affordance lives in the catalogue section; both render from one failure state |
| Storage refused | `localStorage` throws (private mode) | No visual change | Catalogue works for this visit only; no error surfaced | Silent per existing implementation |
| Reduced motion | `prefers-reduced-motion: reduce` | Seal foil static (no animated background-position), ambient motes static, no idle shimmer | Hover = static glow change only | Reduced motion never removes information, only movement |
| Seal: opening | CTA/seal activated, pack resolving | `is-opening` class: seal compresses + tear line flashes, 700ms | CTA label "Pack wird geöffnet"; all open-triggers disabled | One-shot; dialog takes over |
| Seal: image error | `#pack-preview` 404/HEIC-failed | Crest + wordmark remain, photo area shows set-coloured fallback panel | Unaffected | Never an empty white box |

---

## 7. Interaction Map

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Shift+Tab | Keyboard | Move through: skip link → wordmark → catalogue link → DE → EN → sound → CTA → catalogue link → seal → (page flow) | Visible focus ring (2px `#fff0d9` offset) per element | none | Order = visual reading order |
| `P` | Keyboard | Open pack (no dialog open, catalogue non-empty, not busy) | Seal `is-opening`, dialog opens | rip sound (if sound on) | Ignored while a dialog is open (child specs handle keys there) |
| `Enter` / `Space` on seal or CTA | Keyboard | Open pack | same as above | rip | Native button semantics |
| Scroll | Mouse/Touch/Keyboard | Page scroll to the catalogue | Native | none | No scroll-jacking |
| `Escape` | Keyboard | (No dialogs open) no-op on stage | none | none | Escape must never navigate away or reload — it only closes dialogs |

### 7.2 Action Inputs

| Input | Platform | Context (What must be focused) | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|-------------------------------|--------|----------|-----------|-----------|-------|
| Click seal / CTA | Mouse | hover on either | Open pack | Dialog opens with wrapper theatre | Seal 700ms press; theatre in dialog | Rip + ticks per card | Pack logic in pack-opening.md |
| Tap seal / CTA | Touch | — | Open pack | Same | Same; seal hover styles skipped | Same | Hit target ≥280px (seal) / ≥44px (CTA) |
| Click "Zum Katalog" / nav link | Mouse/Touch | — | Anchor to `#katalog` | Smooth scroll | 300ms; instant under reduced motion | none | |
| Click DE / EN | Mouse/Touch | — | Switch language | All visible strings swap immediately incl. `<title>`, aria-labels | Instant (no fade — F8) | none | Announced: "Auf Deutsch umgestellt." / "Switched to English." |
| Click sound toggle | Mouse/Touch | — | Toggle sound | Icon slash + label "Ton an/aus", `aria-pressed` flips | Instant | tick on enabling | Persists via `lucky-elsa.sound.v1` |
| `P` while disabled/empty | Keyboard | — | No-op | none | none | none | Guarded by busy/empty state |
| Right-click anywhere | Mouse | — | Browser context menu | Default | — | — | Defined as no custom handling |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Loading | CTA, seal, `P` disabled | An accession cannot be drawn from an unknown catalogue |
| Error (load failure) | CTA, seal, `P` disabled; language + sound + nav stay live | Same guard as Loading; failure is visible, not silent |
| Empty | CTA, seal, `P` disabled; language + sound + nav stay live | Nothing to draw; owner-facing state must stay operable |
| Seal opening (700ms) / pack resolving | CTA, seal, `P` disabled | Prevents double-open and double-sound |
| Dialog open | Stage hotkey (`P`) inactive; Tab is trapped in dialog | Focus containment (child specs) |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Card catalogue (photos, names, moods, captions, rarity, setId, demo flag) | Card source system: `photos.php?list=1` → `photos.json` → empty | On page load only | Card source system (file drop + `npm run photos`) | JSON array → normalized photo objects | Empty → Empty state; fetch/server failure after both sources → **Error state** (retry in the catalogue); PHP failure → JSON fallback silently |
| Collected set (which cards the visitor has) | Persistence system, key `lucky-elsa.seen.v1` | When a card is collected (after pack reveal / card open) | Persistence system | JSON array of ids | Missing → empty set, First-visit state |
| Set-completion snapshots (per completed room) | Persistence system, key `lucky-elsa.sets.v1` | On room completion | Persistence system | JSON map setId → {completedAt, memberCount, manifestStamp} — **snapshots only; no seen/total counts, no diploma records** | Missing → room not completed |
| Milestone/visit flags | Persistence system, key `lucky-elsa.flags.v1` | On relevant events (load, pack complete, completion) | Persistence system | JSON map {milestones, lastManifestStamp, diploma, masterIndex} — **no lap integer, no lastSeenTotal** | Missing → treated as first visit |
| Language | Persistence system, key `lucky-elsa.lang.v1` | On switch | Persistence system | `"de"` \| `"en"` | Missing → `"de"` (F7) |
| Sound preference | Persistence system, key `lucky-elsa.sound.v1` | On toggle | Persistence system | boolean | Missing → `true` |
| Cover photo for the seal preview | Card source system (first catalogue entry / setId cover) | On catalogue load | Card source system | URL | Missing → crest-only seal variant |

> **Rule**: The stage never writes `localStorage` directly. Every player action
> fires an event (Section 9); the persistence system is the only writer of
> `seen.v1` / `sets.v1` / `flags.v1` / `lang.v1` / `sound.v1`. All keys are
> first-party, on-device, no cookies (PRD privacy row).

---

## 9. Events Fired

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Tap seal / CTA / press `P` | `pack:open-request` | `{ source: "seal" \| "button" \| "keyboard" }` | Pack system | Pack system decides the draw; the stage only disables itself while busy |
| Language switch | `lang:change-request` | `{ lang }` | Persistence system | Persists + re-renders; UI re-renders on the system's confirmation |
| Sound toggle | `sound:toggle-request` | `{ on }` | Persistence system + audio system | |
| Anchor to the catalogue | `nav:katalog` | — | UI only (scroll) | No state change |
| (Vertical Slice) Zuwachs line dismissed once any new card is collected | `flags:zuwachs-ack` | `{ ackedIds }` | Persistence system | Clears the line via a flags update — dismissal key is cataloguing, not pack opening (R8) |
| (none) | — | — | — | No analytics exist on this project by explicit PRD decision; no event may add telemetry |

---

## 10. Transitions & Animations

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|---------------|--------|----------------|---------------------------|
| Page enter | Load | Ambient beam fade-in, content in place | 400 | ease-out | Yes | Yes — beam shown static, fully opaque |
| Seal hover/press | Pointer | Lift + glow (translateY −4px, shadow bloom) | 150 | ease-out | Yes | Yes — static glow change only, no movement |
| Seal opening tear | Pack request | Seal compress + tear-line flash | 700 | var(--ease) | No (one-shot) | Yes — seal state flips without animation; dialog opens immediately |
| Anchor scroll | catalogue link | Vertical smooth scroll | 300 | ease | Yes | Yes — instant jump |
| Dialog open/close | Pack/card actions | Modal fade + scale 0.96→1 | 200 | ease-out | Yes | Yes — instant show/hide |
| Language switch | DE/EN tap | Instant text swap | 0 | — | — | n/a (never animated — F8) |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone
- [x] Tab order follows visual reading order (left-to-right, top-to-bottom within each zone)
- [x] Every action achievable by mouse is also achievable by keyboard (`P` + buttons + links)
- [x] Focus is visible at all times (no element where focus ring disappears)
- [x] Focus does not escape the screen while it is open (n/a here — no modal; child dialogs trap)
- [x] Esc key closes or cancels (and does not quit the site — on stage it is a defined no-op)

**Gamepad** — *out of platform target (web, no gamepad support in scope). Left
unticked by design; not an implementation blocker for this project.*

**Mouse**
- [x] Hover states defined for all interactive elements (seal, CTA, links, lang buttons, sound toggle)
- [x] Clickable hit targets are at minimum 32x32px (44x44px preferred) — CTA ≥44px, seal ≥280px, lang buttons ≥36px visual with ≥44px hit area via padding
- [x] Right-click behavior defined (native context menu — no custom handler)
- [x] Scroll wheel behavior defined in all scrollable zones (native page scroll only)

**Touch**
- [x] All touch targets are minimum 44x44px (masthead controls padded to 44px hit height)
- [x] Swipe gestures do not conflict with system-level swipe navigation (no horizontal swipes on stage)
- [x] All actions achievable with one hand in portrait orientation (single column, seal within thumb reach)
- [x] Long-press behavior defined (not used — the OS default sheet handles saving the preview image)

---

## 12. Accessibility

> Project-wide standard: WCAG 2.2 AA target (PRD §5), Tier Standard — keyboard
> operable, visible focus, live regions, reduced motion honoured, no
> color-alone meaning.

**Text contrast requirements for this screen** (ratios computed against the
implemented tokens; "Current" is the measured/estimated value — the audit pass
column is filled by the accessibility audit before Approved):

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Catalogue label / count (near-white) | Page velvet #111017 | 4.5:1 | ≈ 12:1 | [x] |
| Catalogue note (secondary grey) | Page velvet | 4.5:1 | ≈ 7:1 | [x] |
| Lede body text | Page velvet | 4.5:1 | ≈ 10:1 | [x] |
| CTA label on pearl-gradient button | Button gradient (lightest stop governs) | 4.5:1 | verify — dark ink on light gradient | [ ] audit |
| Keyboard hint + `<kbd>` | Page velvet | 4.5:1 | verify at audit — hint renders in the muted `--muted` token, not the promoted body colour; do not assume pass | [ ] audit |
| Masthead count | Masthead strip | 4.5:1 | ≈ 9:1 | [x] |
| Seal edition label ("1. Auflage" — the seal's own edition line, no longer a duplicate of the eyebrow after D1/D25) | Seal art (dark) | 3:1 (large/graphical) | ≈ 6:1 | [x] |

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Catalogue fill colour vs track | Hue never carries the number | Count always printed as text in the label |
| DE/EN active state | Active marked by fill only | `aria-pressed` + pressed button has border + weight change, not hue alone |
| Sound on/off | Slash overlay may be faint | Text label "Ton an/aus" always present |

**Focus order** (Tab key sequence, numbered):

1. Skip link ("Direkt zum Pack" — targets `#open-pack` directly, so label and destination agree)
2. Wordmark ("Elsa the Explorer")
3. "Zum Katalog" nav link
4. DE button
5. EN button
6. Sound toggle
7. "Pack öffnen" CTA
8. "Zum Katalog" text link
9. Catalogue track (`role="progressbar"` — status only, **not** focusable, skipped)
10. Pack seal (last interactive element of the stage; Tab continues into the catalogue section per `binder.md` §12)

Cycle: natural page Tab order, no trap (no modal here).

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| Catalogue resolved (populated) | "Du hast {seen} von {total} gesammelt." via catalogue label + `#live` | After load, once |
| Pack opened (stage-side handoff) | "Das Pack geht auf." | On `pack:open-request` accepted |
| Second lap begins | "Das waren alle Karten. Jetzt beginnt das Pack von vorn." | When persistence reports the lap restart |
| Language switch | "Auf Deutsch umgestellt." / "Switched to English." | Immediately after swap |
| New in the binder (round 2) | "Das Heft hat Zuwachs: {n} neue Karten." | After load, once per visit (R8 `lastManifestStamp` mechanism) |
| Load failed | "Der Katalog lädt nicht gerade." | On error-state entry; retry lives with the catalogue's Error state |
| Empty catalogue | "Noch keine Karten." + catalogue owner instruction | Only in the true-empty state — never in the failure state |

**Cognitive load assessment**:

One primary action, one number (catalogue count), one optional sentence. Peak
concurrent streams: 3 (action, progress, promise) — well under 7±2. The lede
and hint are visually quieter than the CTA so a first-time visitor can succeed
by pointing at the brightest object. No decision is required to use the screen;
the museum register lives in the words, not in new required reading.

---

## 13. Localization Considerations

- German is the **default and primary** language (F7); English is the full
  second. The brand mark **"Elsa the Explorer" stays untranslated in both
  languages** (logo exemption, like the old "Elsen" wordmark); everything else
  lives in the `COPY.de` / `COPY.en` deck — no text baked into images.
- Layout budgets are set so **DE at +40 % over the EN baseline still fits**; DE
  strings longer than the EN baseline are the design driver.
- No RTL language is targeted (de/en only); the layout is not mirrored.
- Copy mapping is now fixed in the deck: eyebrow → "Katalog I" / "Catalogue I"
  (D1 — "Das Kartenwerk" survives only inside `meta.title`); H1 → "Was steckt im
  Katalog?" / "What's in the catalogue?" (D2); the collection is **Der Katalog /
  The Catalogue** (owner canon 2026-11-22); the lede keeps the loop rules;
  "gesehen"-copy becomes "gesammelt"-copy; document titles → "Elsa the Explorer —
  Das Kartenwerk" / "Elsa the Explorer — The Card Library" (D24).

> *Copy-deck sync 2026-11-22 (D1, D2, D5):* the page eyebrow is "Katalog I" /
> "Catalogue I"; the accession line always states the count; "1. Auflage" survives
> only as the seal's edition label and the card credit.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| H1 line 1/2 ("What's in / the catalogue?") | ~9 / 14 | 13 / 19 | 40 % | n/a | `<br>` split from the copy deck; H1 font clamps at 320px; a 3rd wrapped line is acceptable | Low |
| Lede | ~85 | 120 | 40 % | n/a | Wraps to 4 lines max | Low |
| CTA "Open a pack" / "Pack öffnen" | 11 | 16 | 40 % | n/a | Button grows horizontally, min-height fixed | Low |
| Catalogue label "{seen} of {total} collected" / "{seen} von {total} gesammelt" | ~26 | 36 + digits | 40 % | n/a | Wraps to 2 lines; track stays the same size | Medium — "gesammelt" is long; tested at 2 digits |
| Catalogue note | ~58 | 82 | 40 % | n/a | Wraps to 3 lines | Low |
| Masthead count (same string, truncated) | ~26 | 18 + ellipsis | 40 % | n/a | Ellipsis, full text in `title` | Low |
| Seal edition label ("1. Auflage" / "1st edition") | 12 | 17 | 40 % | n/a | Shrinks letter-spacing one step, then wraps | Low |
| Zuwachs line (round 2) | "New in the binder: {n} new cards." ~33 | 47 | 40 % | n/a | Wraps to 2 lines | Low |
| Empty-state CTA label ("No cards yet" / "Noch keine Karten") | 13 | 18 | 40 % | n/a | Button width auto | Low |

---

## 14. Acceptance Criteria

**Performance**
- [ ] First contentful paint of the stage within 200ms on the IONOS host over a mid-range phone connection (no blocking third-party requests — PRD §5); **test conditions**: clean cache, cold start, 4G-throttled profile, real `photos.php` present — the 200ms budget is measured to the stage shell's first paint, not to catalogue resolution
- [ ] Stage fully interactive (CTA enabled) within 500ms of catalogue resolution; the fallback chain (`photos.php` → `photos.json`) completes or gives up within 4s
- [ ] Ambient canvas maintains ≥55fps on a 2019 mid-range phone; under reduced motion it draws zero animation frames

**Layout & Rendering**
- [ ] No horizontal overflow at 320, 390, 414, 640, 768, 1024, 1280, 1920 widths (F17), portrait and landscape
- [ ] Seal and copy column never overlap at any listed width
- [ ] All Section 6 states render correctly (verified by forcing each: empty catalogue, sample-only, mixed, storage-refused stub); **load-failure is forced** by stubbing both `photos.php` and `photos.json` with 500 responses — the stage shows "Der Katalog lädt nicht gerade.", the owner instruction ("npm run photos") appears nowhere, and the retry lives in the catalogue section
- [ ] Catalogue bar fill visually matches `seen/total` to the nearest pixel

**Input**
- [ ] Tab reaches every interactive element in the §12 order; focus ring visible on each
- [ ] `P` opens the pack dialog within 100ms when allowed, and is a no-op when disabled — verified with a keyboard-only pass
- [ ] All mouse actions reproducible by keyboard (§11)

**Events & Data**
- [ ] No code path on this screen writes `localStorage` directly outside the persistence system (code review check)
- [ ] Language switch updates `<title>`, `og:locale`, all visible strings and both aria-labels within one frame, and survives reload
- [ ] Sound toggle state survives reload
- [ ] Deep link `?photo=<id>` opens the card dialog above the intact stage in the URL's language

**Accessibility**
- [ ] All §12 contrast rows pass measured audits
- [ ] Screen reader (VoiceOver) run-through: load → open pack → hear "Das Pack geht auf." and the count announcement, without visual cues
- [ ] Reduced motion: no animated beam, no seal shimmer, hover is a static state change
- [ ] 200 % browser zoom: no clipped text, no overlapping zones

**Localization**
- [ ] No text element overflows its container in German at +40 % over the EN baseline (test with the longest catalogue names substituted)
- [ ] All strings render from the copy deck — zero hardcoded display strings in markup beyond the brand mark

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ~~Confirm the library-register copy rewrites~~ **RESOLVED 2026-11-22 (owner canon):** set names fixed to the archive-rooms register, binder = Der Katalog / The Catalogue, H1 "Was steckt im Katalog?", verb "gesammelt", accession line "Das Heft hat Zuwachs: {n} neue Karten." | owner | 2026-11-22 | RESOLVED |
| Final DE/EN tone read of the revised copy (Katalog register) for drift before launch | writer + user | before launch | — |
| Should the seal preview rotate through the visitor's uncollected cards (a "what's waiting" teaser), or stay the fixed catalogue cover? | game-designer + user | before pack-opening implementation | — |
| Does the stage need a set selector in round 2 (choose which set an accession draws from), or is the draw always global across the catalogue? | game-designer | before the set view ships | — |
| ~~Should browser language auto-detect override the German default~~ **RESOLVED 2026-11-22:** never auto-detect — always German first (Language Toggle pattern decision, PRD F7; `?lang=` remains the manual override) | owner + ux-designer | 2026-11-22 | RESOLVED |
| Where does **Elsas Ehrenmensch** (the single capstone, catalogue header per owner canon) surface on the stage once earned — in the masthead count, or as a seal on the crate? | ux-designer + user | with binder.md review | — |
