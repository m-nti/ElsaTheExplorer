# UX Spec: Der Katalog (Sammelwerk / Binder — #katalog)

> **Status**: In Design
> **Author**: user + ux-designer
> **Last Updated**: 2026-11-22
> **Journey Phase(s)**: Browse & collect — the library's reading room and progress home
> **Screen / Flow Name**: `BinderShelf` (section `#katalog`)
> **Platform Target**: Web — mouse / touch / keyboard (no gamepad; static IONOS deploy)
> **Related GDDs**: `PRD.md` §3 ("look through every card in the binder"), §4.1 F11, F13, F15; §4.2 F26; §5 Design row; edge cases (browse over opening)
> **Related ADRs**: ADR-0001 (owner decision): Svelte 5 + Vite 8 + TypeScript strict, built locally, deployed statically to IONOS; `photos.php` stays the runtime manifest source (owner FTP-drop workflow preserved); manifest gains optional `set`, `focus`, `chase` fields, backward compatible
> **Related UX Specs**: `stage-landing.md` (parent page), `pack-opening.md` (where pulls come from), `card-detail.md` (opened from any tile)
> **Accessibility Tier**: Standard — committed in `design/accessibility-requirements.md`
> **Template**: UX Spec

> **Positioning note (binding)**: *Elsa the Explorer* is a card library /
> Sammelwerk. This section **is the product**: the catalogue where the collection
> lives. The visitor is an explorer and reader of the library — for them the
> catalogue is browsable like an archive's rooms, not a scoreboard. Museum-catalogue
> register, warm dry humour, *du* register in German. This spec is written as a
> **refactor**: the current `#album` grid is the starting point; the target view
> (set rooms) is new. Copy mapping used throughout: Sammelheft → **Der Katalog**
> (EN: "The Catalogue"; owner canon, binding 2026-11-22); seen-copy → **"gesammelt"**
> (collected) as the progress verb **and the tile's state word** — the **"Im Katalog"**
> badge is the tile's *location* label and never stands in for the state (D16);
> new-photos line → **"{n} neue Schmuckstücke sind da!"** (EN: "{n} new treasures
> have arrived!"; D5 — copy-deck sync 2026-11-22: the count is required, and both
> "… hat Zuwachs" forms are retired).

**Set register (archive-rooms register, six rooms + loose — owner canon, binding 2026-11-22):**

| # | Theme | DE | EN | Notes |
|---|-------|----|----|-------|
| 1 | Naps, duvets, sofa | Der Ruhesaal | The Nap Wing | |
| 2 | Garden patrols, digging | Außenstelle Garten | The Garden Annex | |
| 3 | Car rides, window-nose, arriving | Der Abfahrtsaal | The Departure Hall | slug `departure-hall` — **owner canon 2026-11-22: Elsa hates water; no wet-dog, rain, mud or bathing content exists** (legacy water jokes retired) |
| 4 | Play, balls, sticks | Der Ballsaal | The Ball Room | bilingual pun intended |
| 5 | Portraits | Der Porträtsaal | The Portrait Room | holds the **chase card: Das Hauptporträt / The Portrait of Record** |
| 6 | Guarding, waiting, judgment | Der Wachsaal | The Guard Room | |
| 7 | Loose/unassigned cards | Neuzugänge | New Acquisitions | fallback for photos without a `set` field |

---

## 1. Purpose & Player Need

**What player need does this screen serve?**

Some visitors prefer reading to pulling — they want to walk the catalogue and look
at every card one by one (F11, PRD edge case). Others come back the next day to
check what grew: the catalogue must show, at a glance, how far the collection is
filled — per room and in total — and make any card reachable in one tap. The
catalogue is also where the library's honours live: a finished room is visibly
different, milestone by milestone, and the single capstone — **Elsas Ehrenmensch /
Elsa's Honorary Human** — appears in the catalogue header once the whole
catalogue reaches 100 %. The reader should feel the collection growing under their hands,
not be graded by it.

**The player goal** (what the player wants to accomplish):

Browse every card, open any of them big, and see exactly how much of the
library is collected — per set and overall.

**The game goal** (what the game needs to communicate or capture):

Show per-set and total progress (F13), reward completion visibly (frame
variants, overall-catalogue milestones 25/50/75 %, frame unlocks, and the
single capstone Elsas Ehrenmensch with the Das Gesamtverzeichnis plaque), mark
what is collected vs. waiting, and give the visitor a clear, confirmed way to
start over (F26) without ever risking an accidental wipe.

---

## 2. Player Context on Arrival

| Question | Answer |
|----------|--------|
| What was the player just doing? | Scrolled down from the landing after a pack; navigated via "Zum Katalog"; or landed directly on a deep-linked card (dialog above). Repeat visitors often come only for this section. |
| What is their emotional state? | Calm, browsing pace — the opposite of the pack's anticipation. After a good pull: pride, wanting to see the card "filed". |
| What cognitive load are they carrying? | Low while browsing; higher while scanning for "what am I missing" — the design must answer that per room without counting. |
| What information do they already have? | Their own pulls; nothing about set membership unless they read the chips. The owner additionally knows the folder workflow. |
| What are they most likely trying to do? | Tap through cards; check the count; after new photos arrive, find what's new; completionists: find the empty slots. |
| What are they likely afraid of? | That "Von vorn" deletes something precious (it only clears the visitor's own catalogue); that an unfinished room is a scolding; that the page is endless to scroll. |

**Emotional design target for this screen**:

A quiet reading room with the lights on — "so much of her is already here, and
there is more to find."

---

## 3. Navigation Position

**Screen hierarchy**:

```
Root — StageLanding (document)
      └── Sibling section — BinderShelf (#katalog)
            ├── Child — CardDetail (#card-dialog, modal) → card-detail.md
            └── Child — ResetConfirm (modal, own spec §6)
```

**Modal behavior**: Non-modal section of the page. Its children are modals:
CardDetail (existing spec) and the reset confirmation (new; blocks until
answered, Escape/„Abbrechen" cancels). Nothing in the catalogue is undismissable.

**Reachability — all entry points**:

| Entry Point | Triggered By | Notes |
|-------------|-------------|-------|
| "Zum Katalog" (nav or landing link) | Anchor scroll | Primary path |
| Scroll past the fold | Page scroll | Natural discovery |
| After a pack ("Zum Katalog" footer) | `pack-opening.md` §4 | Freshly pulled cards are highlighted once |
| `?photo=<id>` deep link | CardDetail auto-open | Catalogue renders underneath; the tile is scrolled into view after the dialog closes |

---

## 4. Entry & Exit Points

**Entry table**:

| Trigger | Source Screen / State | Transition Type | Data Passed In | Notes |
|---------|----------------------|-----------------|----------------|-------|
| Anchor / scroll / post-pack footer | StageLanding / PackOpening | Smooth scroll | — | Instant under reduced motion |
| Catalogue load completes | — (async) | Grid fills in place | photo array | Loading state precedes |
| New-photos detection | Persistence system (flags) | Accession line renders | **GDD R8 `lastManifestStamp`** vs manifest | **Vertical Slice** |

**Exit table**:

| Exit Action | Destination | Transition Type | Data Returned / Saved | Notes |
|-------------|------------|-----------------|----------------------|-------|
| Tap/Enter a tile | CardDetail | Modal open | photo id; URL gains `?photo=` | Tile stays scroll-anchored behind |
| Dialog close | Back to the catalogue | Modal close | focus returns to the originating tile | §12 |
| Toggle view (Alle Karten ↔ Nach Räumen) | Same section, other view | Crossfade (skipped reduced-motion) | view choice is session-only (not persisted — open question §15) | |
| "Von vorn" → confirm | Same section, reset state | Confirmation modal → instant reset | `lucky-elsa.*` cleared by persistence | See §6 Reset states |
| "Nochmal versuchen" | Same section, retry load | In-place reload of the catalogue | — | Error state only |

---

## 5. Layout Specification

### 5.1 ASCII Wireframes

**View A — "Alle Karten" (flat grid; the refactor of today's grid, default view):**

```
┌────────────────────────────────────────────────────────────────────┐
│ ALLE KARTEN        Du hast 15 von 24 gesammelt  [Räume|Alle]    │
│ Jedes Schmuckstück, das es gibt — öffne eines für die …            │
│ 3 neue Schmuckstücke sind da!                   (round 2, when new)│
│                                                     [ Von vorn ]   │
│ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐       │
│ │plate   ││plate   ││plate   ││plate   ││plate   ││plate   │       │
│ │photo   ││photo   ││photo   ││photo   ││photo   ││photo   │       │
│ │strip   ││strip   ││strip   ││strip   ││strip   ││strip   │       │
│ │gesammelt││        ││gesammelt││NEU    ││gesammelt││         │      │
│ └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘       │
│   ... 6–8 per row desktop, 2 per row mobile, lazy thumbnails ...   │
└────────────────────────────────────────────────────────────────────┘
```

**View B — "Nach Räumen" (target set view; sets as rows with dividers):**

```
┌────────────────────────────────────────────────────────────────────┐
│ DER KATALOG · NACH RÄUMEN   Du hast 15 von 24 gesammelt  [Räume|Alle]  │
│ Die Sammlung nach Räumen. Jeder Raum wächst für sich, in Ruhe.    │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 🐾 RUHESAAL · The Nap Wing              7 von 8 ▰▰▰▰▰▰▰░ 25%✦│   │
│ │  ────────────────────────────────────────────────────────    │   │
│ │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌ ─ ─ ┐          │   │
│ │  │tile││tile││tile││tile││tile││tile││tile││     │          │   │
│ │  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└ ─ ─ ┘          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 🐾 AUSSENSTELLE GARTEN · The Garden Annex  12 von 12 ▰▰▰▰▰▰▰▰  │   │
│ │   ──── complete: gilt frame variant on all tiles ──────────── │   │
│ │  ┌────┐┌────┐…┌────┐                                        │   │
│ │  │tile││tile│  │tile│   ← gilt frame variant (announcement)│   │
│ │  └────┘└────┘  └────┘└───────┘                                │   │
│ └──────────────────────────────────────────────────────────────┘   │
│   ... Abfahrtsaal · Ballsaal · Porträtsaal (chase: Das
│   ...    Hauptporträt) ... Wachsaal ...                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 🐾 NEUZUGÄNGE · New Acquisitions        2 von 2 ▰▰▰▰▰       │   │
│ │  ┌────┐┌────┐                                                │   │
│ │  └────┘└────┘   (loose row; omitted when empty)              │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

Set row anatomy (both views share the tile): row header (crest + set name
DE · EN + per-set count + per-set bar + milestone marker), a divider rule,
then the row's tiles; a completed row's tiles carry the **frame variant**
(gilt frame + one-line unlock announcement — there is **no per-set Diplom
tile**; the single capstone lives in the catalogue header, §6). In "Alle
Karten" the set appears only as the `aus:` chip on each tile.

*Copy-deck sync 2026-11-22 (D5, D6, D14, D16):* both view heads read
`progress.overall` ("Du hast 15 von 24 gesammelt" / "You have collected 15 of 24");
the second room is **Außenstelle Garten** — the wireframe's "GARTEN-ANNEXE" was
layout shorthand; and each tile plate carries the state word **gesammelt / noch
nicht gesammelt** with the **Im Katalog** location badge and **NEU** beside it.

### 5.2 Layout Zones

| Zone Name | Description | Approximate Size | Scrollable? | Overflow Behavior |
|-----------|-------------|-----------------|-------------|-------------------|
| Section head | Title, lede, total count, view toggle, "Von vorn", Zuwachs line | 100% × ~120px | No | Toggle + button wrap; Zuwachs line wraps to 2 lines |
| Set row header | Set identity + per-set progress + milestone marker | 100% × ~56px | No | Bilingual name truncates with ellipsis; count never truncates |
| Divider rule | Between header and tiles | 100% × 1px | No | — |
| Tile grid / row tiles | `CardTile`s | 6–8 per row desktop (min tile 148px), 2 per row mobile | **Vertical (page)**; rows lazy-render below fold | Tiles scale down to 128px min before count per row changes; thumbs `loading="lazy"` |
| Capstone surface (header) | Elsas Ehrenmensch + Das Gesamtverzeichnis plaque at 100 % catalogue | Head zone, below the count line | No | Absent until 100 %; never per-room |
| Empty / error block | Owner instruction or retry | Grid area | No | — |

Catalogue size guard (PRD §9.2): above ~200 photos the flat view paginates or
infinite-scrolls per 60 tiles with a count line ("Zeige 1–60 von 240"); set
rows are unaffected (per-set counts stay small). Owner decides the threshold —
open question §15.

### 5.3 Component Inventory

| Component Name | Type | Zone | Purpose | Required? | Reuses Existing Component? |
|----------------|------|------|---------|-----------|---------------------------|
| `BinderShelf` | **Svelte 5 component** (one line: section shell — head, toggle, view switching, catalogue-state wiring) | section | Owns the view state machine | Yes | Refactor of `#album` |
| `.album__head` (title, lede, count) | Header | head | Identity + total progress | Yes | Yes (relabelled) |
| `.view-toggle` | Segmented control (`aria-pressed` ×2) | head | Alle Karten ↔ Nach Räumen | Yes | New |
| `ShelfRow` | **Svelte 5 component** (one line: one set — header, divider, tiles, milestone markers; **GDD R2, Phase 2**) | set view | Per-set presentation | Yes | New |
| `.shelf__milestone` | Marker chip | row header | Reading-room upgrade marker — **row affordance only**; the milestone announcements themselves are overall-catalogue (§6) | Phase 2 | New |
| `CardTile` (variant `card--tile`) | **Svelte 5 component** (one line: shared card renderer, size-variant `tile`) | grids | Every card is a real `<button>` | Yes | Shared with pack-opening |
| `.tile__badge` ("Im Katalog" / "In the catalogue" — **location label, not a state string**; "NEU") | Badge | on tile | Location label + new marker (the state word is separate) | Yes | Exists as seen-tag, copy + behaviour updated |
| `.tile__set-chip` ("aus: {Set}") | Chip | on tile | Set membership (flat view) — GDD R1 | Vertical Slice | New |
| `.shelf__gilt` | Frame variant | completed rows | Completion frame on tiles — GDD R3a | Phase 2 | CSS variant of `.card` |
| `EhrenmenschCapstone` | **Svelte 5 component** (one line: the single 100 % capstone — Elsas Ehrenmensch collage in the catalogue header, "Das Gesamtverzeichnis" plaque beside it) | head | Capstone honour | Phase 3 (Full Vision) | New (replaces the former per-set DiplomCard) |
| `#reset-lap` + `ResetConfirmDialog` | Button + **Svelte 5 modal component** (one line: accessible confirm before persistence wipes) | head | Start over with confirmation | Yes | Button exists; dialog is new |
| `#album-count` | Live text | head | Total count | Yes | Yes |
| `#demo-note` | Note | head | Sample/mixed notice | Yes | Yes |
| `#live` live region | Status | body | Announcements | Yes | Yes |

**Pattern references** (`design/ux/interaction-patterns.md`): Collection Grid
Tile · Set Progress Line · Progress Bar · Reset with Confirmation ·
Card Browsing (Arrows / Swipe) (tiles hand off to CardDetail) · Dialog Open /
Close · Focus Trap (Dialog) · Empty State · Loading State · Error State ·
Live Region Announcement · Language Toggle (via masthead).

**Primary focus element on open**: the view toggle (first interactive element
of the section) when focus arrives via anchor jump; when arriving by scroll,
no focus move happens. After CardDetail closes, focus returns to the
originating tile. In the empty state, focus goes to the retry/instruction
block.

### 5.4 Information Hierarchy

1. **First: the count line** ("Du hast 15 von 24 gesammelt") — the one number that
   answers "how is my library doing".
2. **Second: the catalogue itself** — cards are the content; the view toggle
   sits with the count so switching is one glance away.
3. **Third: per-set progress + milestones** — visible per row header, but
   quieter than the tiles.
4. **Fourth: "Von vorn" and the demo note** — necessary, deliberately
   de-emphasised; the destructive control never competes with the collection.

---

## 6. States & Variants

| State Name | Trigger | What Changes Visually | What Changes Behaviorally | Notes |
|------------|---------|----------------------|--------------------------|-------|
| Loading | Catalogue not yet resolved | Count line "Karten werden geladen"; single placeholder line | Tiles inert (none exist yet) | Current behaviour kept |
| Populated — flat view | Catalogue loaded, view A | Grid of all tiles; badges "Im Katalog"/"NEU"; `aus:` chips (round 2) | Tap → CardDetail; toggle active | Default view |
| Populated — set view | View B | One row per set in §3 order (loose row last); per-set bars | Same tile actions | **Empty rooms are OMITTED — hidden, never rendered as "0 von 0"** (R2 canon) |
| Newly pulled | Return from a pack this visit | The five fresh tiles get a one-time highlight (soft ring, ~1.5s) | none | Session-only; skipped reduced-motion |
| New in the catalogue ("{n} neue Schmuckstücke sind da!") | **Mechanism = GDD R8 `lastManifestStamp`**: the manifest holds photo ids absent from the stamp of the visitor's previous visit | "N neue Schmuckstücke sind da!" above the grid (copy-deck sync 2026-11-22, D5); new tiles carry "NEU" | Line disappears **once any new card is collected**; NEU badge clears per tile once opened | **Vertical Slice (GDD R8)**; owner = persistence system |
| Catalogue milestones | **Overall-catalogue** collected count crosses 25/50/75 % first time | Header line + marker swap: 25 % gilded door sign ("Türschild vergoldet"), 50 % reading lamp lit ("Leselampe angezündet"), 75 % velvet rope ("Samtband gespannt") — each with its text label, never colour alone | Announcement "Katalog: {pct} Prozent geschafft — {outfit}." / "Catalogue: {pct} per cent done — {outfit}." from the **`catalogue.milestone` single source** (§12), emitted on `catalogue:milestone-reached` (copy-deck sync 2026-11-22 — "Meilenstein erreicht" retired, no `!`); acknowledged in `flags.v1` so it never re-fires | Phase 2; per-room markers remain row affordances only |
| Set complete | Per-set collected = total | Row header shows full bar; that room's tiles switch to the **gilt frame variant** + one-line unlock note in the catalogue header | Announcement "{set} ist komplett. Alle da." / "{set} is complete. All present." (copy-deck sync 2026-11-22 — `set.complete.announce`; the visible frame note `set.complete.note` is where the surface's one `!` lives, never the announcement) | Phase 2 — no per-set Diplom tile; frame persists until reset |
| Everything complete | Whole catalogue at 100 % | **Elsas Ehrenmensch / Elsa's Honorary Human** capstone renders in the catalogue header (collage of collected photos, "Katalog I · vollzählig" / "Catalogue I · all present", completion date, lap number); the **"Das Gesamtverzeichnis"** plaque sits beside it, separate | Announcement "Katalog komplett — Elsas Ehrenmensch ist eingetragen." / "Catalogue complete — Elsa's Honorary Human is entered." (copy-deck sync 2026-11-22 — one sentence, em dash, no `!`) | Phase 3 (Full Vision); GDD R5 composition; reduced motion honoured |
| Chase card (Porträtsaal — Das Hauptporträt / The Portrait of Record) | Catalogue flags `chase: true` | Tile renders as holo material with a **gold-glint keystone frame** (GDD R-G) | Normal unseen-first draw otherwise | Special reveal treatment undecided (§15) |
| Sample / Mixed | Catalogue flagged `demo` | Demo/mixed note replaces the Zuwachs slot | Tiles work | F15 register: owner-directed copy |
| Empty (catalogue truly empty) | Both sources resolve to 0 photos | Owner instruction block: "Noch keine Karten. Leg Elsa-Fotos in den Ordner photos und führe dann npm run photos aus." with the command in `<code>` | Count "Leer, aber bereit" / "Empty, but ready" (copy-deck sync 2026-11-22 — count-line slot only; the owner instruction stays verbatim) | Distinguishes from error (below) |
| Error (load failed) | Both fetches fail non-emptily — network/server fault | "Der Katalog kommt gleich wieder." / "The catalogue will be back shortly." + [Nochmal versuchen] button (copy-deck sync 2026-11-22 — `state.error.catalogue`; no `!` in an error) | Retry re-runs the load chain | New in refactor; never tells a visitor to run npm commands |
| Reset confirm | "Von vorn" tapped | Modal per the **reset SSOT (copy deck §9: title, body, buttons)**: title "Von vorn?" / "Start over?"; body DE "Das löscht den Katalog, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück." / EN "This clears the Catalogue, room progress, the milestones and Elsa's Honorary Human — sound and language go back to default." (copy-deck sync 2026-11-22: `reset.body` is the single source — the spec-sounding "Set-Fortschritte" is gone, and the retired per-set diploma wording does not return); confirm "Alles löschen" / "Delete everything" (destructive-styled, never "Ja"); cancel "Abbrechen" / "Cancel", **default focus** | Only confirm clears; Escape/Abbrechen cancels | F26; persistence clears **all** `lucky-elsa.*` keys — collection state and preferences (canon 2026-11-22) |
| Reset done | Confirm accepted | Count returns to 0; badges reset; frame variants gone; **"Ehrenmensch zurückgesetzt"** (capstone cleared); language returns to German default (all keys cleared) | Announcement "Von vorn. Alle Karten können wieder kommen." | |
| Reduced motion | System setting | No crossfade, no highlight pulse, no lamp/gilt animation — variants applied statically | unchanged | Variants never rely on animation to be legible |

---

## 7. Interaction Map

### 7.1 Navigation Inputs

| Input | Platform | Action | Visual Response | Audio Cue | Notes |
|-------|----------|--------|-----------------|-----------|-------|
| Tab / Shift+Tab | Keyboard | Toggle → tiles (row by row) → Von vorn → (page flow) | Focus ring per tile | none | Tiles are buttons; DOM order = visual order per row |
| `←` / `→` | Keyboard | Move focus between tiles within the current row (roving; wraps at row ends into the next row's first tile) | Focused tile lifts | none | Roving shortcut; Tab still steps one tile at a time. **Flag for library addition**: grid roving `←→↑↓` is a new pattern row |
| `↑` / `↓` | Keyboard | Move focus a full row up/down | same | none | Only in grid/set tile focus |
| Scroll | Mouse/Touch/Keyboard | Page scroll | Native | none | Lazy tiles load ≥200px before viewport entry |
| `Escape` | Keyboard | Closes an open child modal | Focus returns to the tile | none | No effect on the section itself |

### 7.2 Action Inputs

| Input | Platform | Context | Action | Response | Animation | Audio Cue | Notes |
|-------|----------|---------|--------|----------|-----------|-----------|-------|
| Click / tap a tile | Mouse/Touch | any | Open CardDetail | Modal; URL gains `?photo=` | 200ms | tick | Card gets collected via the card system |
| `Enter`/`Space` on tile | Keyboard | tile focused | same | same | same | same | Native button |
| Click view toggle | Mouse/Touch/Keyboard | head | Switch view | Crossfade 180ms; instant reduced-motion | 180ms | none | Announced (§12) |
| Click "Von vorn" | Mouse/Touch/Keyboard | head | Open ResetConfirm | Modal blocks the section | 200ms | none | Never resets without confirmation |
| Confirm "Alles löschen" / "Delete everything" | Mouse/Touch/Keyboard | modal | Clear everything | Reset state; announcement | instant | none | Persistence writes the clears; the confirm never reads "Ja" (library SSOT) |
| Click "Nochmal versuchen" | Mouse/Touch/Keyboard | error state | Retry load chain | Loading state again | — | none | Max silent retries: 1 auto + manual |
| Hover a tile | Mouse | — | Tilt + foil response | Pointer-driven material | spring | none | Reduced motion: static |

### 7.3 State-Specific Behaviors

| State | Input Restriction | Reason |
|-------|------------------|--------|
| Loading | Tiles n/a; toggle disabled | Nothing to show yet |
| Error | Only retry active | Fail loudly and recoverably, or not at all |
| ResetConfirm open | Section input blocked by modal | Confirmation must be answered |
| Reset done | Brief: tiles disabled until re-render (~1 frame) | Atomic re-render; no half-reset flicker |

---

## 8. Data Requirements

| Data Element | Source System | Update Frequency | Who Owns It | Format | Null / Missing Handling |
|--------------|--------------|-----------------|-------------|--------|------------------------|
| Card catalogue + set membership (`set`, `chase`) | Card source system (`photos.php` → `photos.json` → empty) | Page load (and after retry) | Card source system | photo objects with optional `set` field | Missing `set` → Neuzugänge (loose row); catalogue empty → owner instruction |
| Collected set | Persistence system (`seen.v1`) | On each card open / pack reveal | Persistence system | id array | Missing → nothing collected |
| Set-completion snapshots | Persistence system (`sets.v1`, **GDD R-E contract**): snapshots only `{completedAt, memberCount, manifestStamp}` per completed room | On room completion | Persistence system | JSON map | Missing → room not completed; **no seen/total counts, no milestoneAcks, no frameUnlocked, no diploma in sets.v1** |
| Capstone record (100 % reached) | Persistence system (`flags.v1` `diploma` field) | When the catalogue reaches 100 % | Persistence system | {date, lap} | Missing → capstone not rendered |
| Milestone/visit flags | Persistence system (`flags.v1`, **GDD R-E contract**): `{milestones, lastManifestStamp, diploma, masterIndex}` | On relevant events | Persistence system | JSON map | Missing → first-visit defaults; **no lap integer, no lastSeenTotal** |
| Thumbnail / display URLs | Card source system (thumbs; ≤720px display copies) | Render | Card source system | URL | Missing thumb → falls back to src; HEIC → browser conversion |
| Crop anchor | Card source system (manifest `focus` field; default center 42%) | Render | Card source system | {x,y} percentages | Missing → default anchor |

> **Rule**: The catalogue never writes state. Badges, bars, frames and milestones
> are renders of persistence-owned data; every mutation (open card, confirm
> reset) fires an event to the owning system.

---

## 9. Events Fired

| Player Action | Event Fired | Payload | Receiver System | Notes |
|---------------|-------------|---------|-----------------|-------|
| Tile activated | `card:selected` | `{ id, source: "binder", view }` | Card system → CardDetail | |
| View toggle | `binder:view-change` | `{ view: "flat" \| "rooms" }` | UI only | Session state |
| "Von vorn" | `reset:requested` | — | UI (opens ResetConfirm) | |
| Confirm | `reset:confirmed` | `{ keys: "all" }` | Persistence system | Clears all `lucky-elsa.*` keys |
| Cancel | `reset:cancelled` | — | UI only | |
| Retry | `catalogue:reload-request` | — | Card source system | |
| (system) milestone first-crossed | `catalogue:milestone-reached` | `{ pct }` | Persistence (ack) + audio + UI | Overall-catalogue milestone; fired by persistence on seen change |
| (system) set complete | `sets:completed` | `{ setId }` | Persistence + audio + UI | Frame-unlock record in `sets.v1` (no diploma payload — capstone is separate) |
| (none) | — | — | — | No analytics, ever |

---

## 10. Transitions & Animations

| Transition | Trigger | Direction / Type | Duration (ms) | Easing | Interruptible? | Skipped by Reduced Motion? |
|------------|---------|-----------------|---------------|--------|----------------|---------------------------|
| Grid fill-in | Catalogue resolved | Tiles appear in place (no cascade in the catalogue — the room is already lit) | 0–150 | ease-out | Yes | Yes |
| View switch | Toggle | Crossfade A↔B | 180 | ease | Yes | Yes — instant swap |
| Tile hover | Pointer | Lift + foil tilt | spring | — | Yes | Yes — static |
| Fresh-pull highlight | Return from pack | Soft ring pulse | ~1500, once | ease | Yes | Yes — static ring, no pulse |
| Milestone marker change | First crossing | Marker swap (label + icon) | 200 | ease | Yes | Yes — instant |
| Frame unlock | Row completes | That room's tiles gain the gilt frame variant | 200 | ease | Yes | Yes — instant |
| Capstone reveal | 100 % catalogue | Ehrenmensch collage + Gesamtverzeichnis plaque fade/rise in under the header | 300 | ease-out | Yes | Yes — instant |
| Reset modal | Von vorn | Fade + scale | 200 | ease-out | Yes | Yes — instant |
| Zuwachs line | New photos | Line slides in above grid | 240 | ease-out | Yes | Yes — instant |

---

## 11. Input Method Completeness Checklist

**Keyboard**
- [x] All interactive elements are reachable using Tab and arrow keys alone (toggle, every tile, reset, retry)
- [x] Tab order follows visual reading order (head → first row's tiles left-to-right → subsequent rows → tools)
- [x] Every action achievable by mouse is also achievable by keyboard
- [x] Focus is visible at all times (tiles have per-tile rings, not just container rings)
- [x] Focus does not escape the screen while it is open (n/a — section; child modals trap)
- [x] Esc key closes or cancels (child modals; not the section itself)

**Gamepad** — *out of platform target (web). Unticked by design; not an
implementation blocker for this project.*

**Mouse**
- [x] Hover states defined for all interactive elements (tiles, toggle, buttons)
- [x] Clickable hit targets are at minimum 32x32px (44x44px preferred) — tiles ≥148px, toggle segments ≥44px, reset ≥44px
- [x] Right-click behavior defined (native context menu; no custom handler)
- [x] Scroll wheel behavior defined in all scrollable zones (page scroll; lazy loading never hijacks it)

**Touch**
- [x] All touch targets are minimum 44x44px (2-per-row mobile keeps tiles ≥150px wide)
- [x] Swipe gestures do not conflict with system-level swipe navigation (no horizontal swipes; vertical scroll is native)
- [x] All actions achievable with one hand in portrait orientation (head tools at top, tiles below — thumb zone honoured; reset stays reachable but never adjacent to tiles)
- [x] Long-press behavior defined (not used; native image sheet after opening in CardDetail)

---

## 12. Accessibility

> Tier Standard per `design/accessibility-requirements.md`; WCAG 2.2 AA target.

**Text contrast requirements for this screen**:

| Text Element | Background Context | Required Ratio | Current Ratio | Pass? |
|--------------|-------------------|---------------|---------------|-------|
| Count line / total | Page velvet | 4.5:1 | ≈ 12:1 | [x] |
| Set row header name + count | Row header panel (slightly raised velvet) | 4.5:1 | ≈ 10:1 | [x] |
| Milestone marker label | Row header | 4.5:1 | ≥ 4.5 required (small text) | [ ] audit |
| Tile plate text (tile variant) | Indigo plate | 4.5:1 | ≈ 10:1 | [x] |
| Badges "Im Katalog" / "NEU" | Badge chip on tile | 4.5:1 | ≥ 4.5 required | [ ] audit |
| Zuwachs line / demo note | Page velvet | 4.5:1 | ≈ 8:1 | [x] |
| ResetConfirm modal copy | Modal velvet | 4.5:1 | ≈ 11:1 | [x] |

**Colorblind-unsafe elements and mitigations**:

| Element | Colorblind Risk | Mitigation |
|---------|----------------|------------|
| Collected vs not-yet-collected tile | Hue-only difference would fail | Text state "gesammelt" / "noch nicht gesammelt" beside the check (the "Im Katalog" badge is a location label, never the state); not-yet-collected tiles additionally show a desaturated photo + dashed frame — three non-colour channels |
| Gilt frame variant | Gold reads as "special" by hue | Frame texture change + count line in the header reads "12 von 12" |
| Milestone markers | Icon-only would fail | Every marker carries its text label |
| Capstone vs normal tiles | — | The capstone is a distinct header object with its own label ("Elsas Ehrenmensch") |

**Focus order** (Tab key sequence, numbered):

1. View toggle — "Alle Karten"
2. View toggle — "Nach Räumen"
3. First row's tiles, left-to-right (flat view: the grid's first six tiles; set view: the first room's tiles)
4. … all remaining rows in order
5. "Von vorn" (head tools)
6. (flat view:) the sequence restarts at the toggle only via Shift+Tab; page Tab continues to the footer

Cycle: natural page order, no trap. Roving `←→↑↓` is a shortcut over the same
order, never a replacement. When CardDetail or ResetConfirm opens, focus
transfers into the modal and returns to the originating tile on close.

**Screen reader announcements for key state changes**:

| State Change | Announcement Text | Announcement Timing |
|--------------|------------------|---------------------|
| View switch | "Nach Räumen sortiert." / "Grouped by room." | After the swap |
| New in the catalogue | "{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!" | Once per visit |
| Catalogue milestone first-crossed | "Katalog-Meilenstein erreicht: {pct} Prozent — {outfit}." | On the count change that crosses it |
| Set complete | "{Set} ist komplett." (the room's frame note is visible copy, `set.complete.note`, not an announcement) | On completion |
| Everything complete | "Katalog komplett. Elsas Ehrenmensch ist eingetragen." | Once, at 100 % |
| Reset confirmed | "Von vorn. Alle Karten können wieder kommen." | Immediately |
| Load failed | "Der Katalog lädt nicht gerade." | On error state entry |

> *Copy-deck sync 2026-11-22 (D10–D13):* the announcements above are the deck's
> single-source strings; the former "Der Katalog: … Prozent gesammelt", "Ansicht:
> Nach Räumen." and "Elsas Ehrenmensch — der Katalog ist komplett." phrasings are
> retired.

**Cognitive load assessment**:

The flat view is one grid + one number. The set view adds one header per row
— at seven rooms that is 7 headers + 1 total = 8 streams, at the 7±2 edge;
mitigated because each header is scanned (not read) and the total count never
moves position. The reset modal isolates its decision completely. Nothing
requires comparison across rooms to act.

---

## 13. Localization Considerations

- DE default, EN second; brand mark untranslated; copy deck only. Layouts
  tolerate **DE at +40 % over the EN baseline**.
- Set names are bilingual pairs printed together ("Neuzugänge · New
  Acquisitions") — the pair is one string unit in the copy deck so they never
  drift.
- No RTL target.

| Text Element | English Baseline Length | Max Characters | Expansion Budget | RTL Behavior | Overflow Behavior | Risk |
|--------------|------------------------|----------------|-----------------|--------------|-------------------|------|
| Section title "The Catalogue" / "Der Katalog" | 11 | 15 | 40 % | n/a | Head wraps | Low |
| Lede | ~70 | 100 | 40 % | n/a | Wraps to 2 lines | Low |
| Count "You have collected {n} of {total}." / "Du hast {n} von {total} gesammelt." | ~30 | 36 + digits | 40 % | n/a | Wraps to 2 lines; number never truncates | Low |
| Set name pair (e.g. "New Acquisitions · Neuzugänge"; longest "The Garden Annex · Außenstelle Garten") | ~30 | 46 | 40 % | n/a | Ellipsis; full name in `title`; count sits outside the truncating span | Medium — longest fixed-space string |
| Milestone labels ("Velvet rope strung" / "Samtband gespannt"; "Gilded door sign" / "Türschild vergoldet") | ~19 | 27 | 40 % | n/a | Wraps under the marker | Low |
| Location badge "In the catalogue" / "Im Katalog" (not a state string); "NEW" / "NEU" — **R9 copy canon** | 16 / 3 | 22 / 6 | 40 % | n/a | Badge grows; tile plate reserves the row (fixed zones, card-detail.md §14) | Low |
| Set chip "from: {Set}" / "aus: {Set}" | 12 + set | 17 + set | 40 % | n/a | Chip truncates the set name at 12 chars + ellipsis | Medium |
| Zuwachs "New in the catalogue: {n} new treasures have arrived!" / "{n} neue Schmuckstücke sind da!" | 31 | 44 | 40 % | n/a | Wraps to 2 lines | Low |
| Reset modal copy + buttons | ~90 / 14 / 7 | 140 / 20 / 10 | 40 % | n/a | Modal copy wraps to 4 lines; buttons stack | Medium |
| Owner instruction + `npm run photos` | ~70 | 100 | 40 % | n/a | Wraps; code string never breaks mid-token | Low |

---

## 14. Acceptance Criteria

**Performance**
- [ ] Section interactive within 500ms of catalogue resolution; first six tiles' thumbs visible in the first paint after resolution
- [ ] Lazy tiles load ≥200px before viewport entry with no layout shift (reserved tile boxes)
- [ ] Scroll through a fully populated 100-tile grid at ≥55fps on a 2019 mid-range phone

**Layout & Rendering**
- [ ] No horizontal overflow at 320/390/414/640/768/1024/1280/1920; tiles never drop below 128px width
- [ ] Both views render all §6 states correctly (loading, populated, per-set variants, milestones, complete, Zuwachs, sample/mixed, empty, error, reset)
- [ ] Set rows keep their header aligned with their tiles at every width (no orphaned header after a wrap)
- [ ] The loose row is omitted (not shown as an empty shell) when it holds no cards

**Input**
- [ ] Keyboard-only pass: toggle both views, open three tiles, reach and cancel "Von vorn", confirm reset — all without a mouse
- [ ] Roving arrows never leave the tile area; Tab and arrows never fight (arrows only when a tile has focus)
- [ ] Reset never clears anything without an explicit confirm click (Escape and Abbrechen verified)

**Events & Data**
- [ ] `reset:confirmed` clears every `lucky-elsa.*` key (verify all keys gone) and the UI re-renders to 0 in one frame
- [ ] Milestone events fire exactly once per threshold for the **overall catalogue** (25/50/75 %, event `catalogue:milestone-reached`; re-fire test: reload, re-cross — no repeat)
- [ ] Empty rooms are omitted from the set view entirely (no "0 von 0" headers rendered, including the loose row)
- [ ] A tile opened from the catalogue leaves `?photo=` in the URL and removes it on close
- [ ] No direct `localStorage` writes from this section (code review check)

**Accessibility**
- [ ] All §12 contrast rows pass measured audits
- [ ] VoiceOver walk: switch views, hear the view announcement, open a tile, hear the card announcement, close, focus back on the tile
- [ ] Reduced motion: view switch, highlight, frame unlock, capstone reveal and milestone swaps are instant; no information is animation-gated
- [ ] 200 % zoom: row headers and tiles never overlap; the toggle stays usable

**Localization**
- [ ] No text overflows in German at +40 % over the EN baseline, including the longest set-name pair and the reset modal
- [ ] All strings from the copy deck; set-name pairs never rendered from different sources

> *Copy-deck sync 2026-11-22 (D6, D20):* the count string is `progress.overall`
> ("Du hast {n} von {total} gesammelt."); the reset modal's ceiling is 140
> characters — the owner's Ton-und-Sprache clause overruns the old 128.

---

## 15. Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ~~Confirm the explorer-register set names~~ **RESOLVED 2026-11-22 (owner canon):** set names fixed to the archive-rooms register (§3 table: Der Ruhesaal/The Nap Wing, Außenstelle Garten/The Garden Annex, **Der Abfahrtsaal/The Departure Hall** — *water ruling: Elsa hates water, Die Nassabteilung/The Wet Collection was replaced and no wet content exists* —, Der Ballsaal/The Ball Room, Der Porträtsaal/The Portrait Room with the chase card Das Hauptporträt/The Portrait of Record, Der Wachsaal/The Guard Room, Neuzugänge/New Acquisitions); binder = Der Katalog / The Catalogue | owner | 2026-11-22 | RESOLVED |
| Should the view choice persist across visits (`flags.v1`) or stay session-only? (Session-only keeps the landing promise intact; persistence serves returning readers.) | ux-designer + user | with first playtest | — |
| Paging threshold for the flat view (~200 photos, PRD §9.2): paginate per 60, or virtualize? Owner's real catalogue size decides | user + frontend | when the catalogue exceeds 150 | — |
| Chase-card special treatment in the draw and in the catalogue (always the holo slot? etched chase mark on Das Hauptporträt?) | game-designer | before draw rules ship | — |
| ~~Does the Diplom open as a CardDetail card or deserve its own honours page?~~ **RESOLVED 2026-11-22 (owner canon):** single capstone **Elsas Ehrenmensch / Elsa's Honorary Human** in the catalogue header at 100 %, with the "Das Gesamtverzeichnis" plaque beside it; per-set diplomas do not exist | owner + ux-designer | 2026-11-22 | RESOLVED |
