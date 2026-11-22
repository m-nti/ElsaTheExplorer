# Collection & Wings (incl. Milestones & Unlocks, Chase Card, Persistence contract)

> **Status**: In Design
> **Author**: owner (decisions) + game-designer (document)
> **Last Updated**: 2026-11-22
> **Last Verified**: 2026-11-22
> **Implements Pillar**: "There is also no moment. A folder of photos is browsed; a pack is *opened*." (PRD §1) — the refactor gives the moment an archive to accumulate in.

## Summary

The collection meta turns the existing flat seen-set into an archive of collected cards: six named
wings plus the automatic shelf of New Acquisitions, per-wing progress, cosmetic frame unlocks
on wing completion, collection "outfit" milestones at 25/50/75 %, one chase card ("Das
Hauptporträt") in the Porträtsaal, "2. Auflage" stamps on second-lap pulls, and two capstone
rewards at 100 % ("Elsas Ehrenmensch / Elsa's Honorary Human", "Das Gesamtverzeichnis"). The
visitor is an
explorer and reader of a card library; the collection itself is the product. Everything is
computed client-side from the photo manifest plus three first-party localStorage keys — the
library belongs to the visitor's device, not to a server. There is no currency, no energy, no
streak, no account, and no odds the visitor can win or lose on: the deck-walk guarantee (every
card comes up before any repeats) stays untouched and is the system's moral spine. Stack
(owner-decided, one line): Svelte 5 + Vite 8 + TypeScript (strict) + Vitest + Playwright,
built locally and deployed as static files to IONOS, with `photos.php` remaining the runtime
manifest source. This is
specified as part of a **full refactor**; no legacy structure is preserved beyond the concepts
that earn their place.

> **Quick reference** — Layer: `Core` · Priority: `Vertical Slice` (wings) → `Alpha` (milestones, chase) → `Full Vision` (capstones) · Key deps: `Pack Generation, Photos Pipeline, Persistence, i18n & A11y plumbing`

## Overview

v1's only collection state is a boolean per photo ("gesehen") and a progress bar over an
undifferentiated grid. That is honest but shapeless: two visits are identical, and the only
reward for continuing is the same reward again. This document adds structure without adding
pressure. The design problem is narrow: with a guaranteed walk, *every* visitor eventually
holds everything, so all progression must be about **when**, not **whether** — which means all
rewards must be status (frames, outfits, stamps, the Ehrenmensch), never advantage, and the
only
"hard" goal (100 %) must sit behind a pile of partial-progress rewards, never in front of
them.

The register is museum-catalogue seriousness carried by the existing warm dry humour: the
archive has wings and departments, a collection with progress lines, printings with stamps,
and a diploma signed by the curator. The visitor explores and reads; nothing is asked of them.

The three loop layers served:

- **Meso (session):** a pulled card names its wing; the collection shows what's missing; a wing
  can genuinely be completed inside one visit, ending on a chime and a permanent frame.
- **Macro (return visits):** the lap restarts with provably unseen cards; the owner curates
  and keeps adding to the archive, surfacing as the arrivals line ("{n} neue Schmuckstücke
  sind da!" / "{n} new treasures have arrived!"); milestones and finally Elsas Ehrenmensch
  accumulate.
- **Micro (unchanged):** the pack ritual itself; this system only adds the "aus:" chip to it.

## Player Fantasy

*"I am exploring and completing the collection of Elsa's life, not grinding a game."* The
register is the museum catalogue and the stamp album: wings, departments, acquisitions, a
Ehrenmensch
written by the curator. MDA target aesthetics: **Discovery** (what the next pack
deals), **Challenge-light** (completing a wing), **Expression** (my collection wears its
frames), **Relatedness** (the Ehrenmensch is the owner speaking to the explorer). SDT:
**Competence** gets its first readable feedback system (per-wing lines name exactly what is
missing); **Autonomy** is preserved — reading the collection versus opening packs remains a
free choice, and both paths mark cards seen through the same routine; **Relatedness** is the
capstone. The feeling that must never appear: obligation. No mechanic in this document may be
experienced as a to-do list.

## Detailed Design

### Core Rules

**R-A · Wings are containers, not gates.** Six named wings plus one automatic shelf. Wing
membership is editorial: an optional `set` field in `photos/captions.json`, keyed by photo
filename, holding one of six slugs. Photos without a `set` field — and photos whose `set`
slug is unknown — land on the shelf `new-acquisitions`. A photo belongs to exactly one wing;
re-collecting is just an edit to `captions.json` plus reload.

Canonical slugs and display names (bilingual, stored in the copy deck, never invented at
runtime). Names are in the explorer/museum register, dry humour intact:

| Slug | DE | EN | Frame colour role |
| --- | --- | --- | --- |
| `nap-wing` | Der Ruhesaal | The Nap Wing | warm amber rim |
| `garden-annex` | Außenstelle Garten | The Garden Annex | leaf-green rim |
| `departure-hall` | Der Abfahrtsaal | The Departure Hall | asphalt-silver rim |
| `ball-room` | Der Ballsaal | The Ball Room | court-blue rim |
| `portrait-room` | Der Porträtsaal | The Portrait Room | gold glint (chase wing) |
| `guard-room` | Der Wachsaal | The Guard Room | slate rim |
| `new-acquisitions` | Neuzugänge | New Acquisitions | neutral (no frame reward) |

("Der Ballsaal" carries the bilingual pun — the room where the balls are kept. "Neuzugänge"
is the honest museum term for what the curator hasn't sorted yet; the shelf grows by itself.)

**Water canon (owner ruling, 2026-11-22):** Elsa hates water. The archive contains **no
wet-dog, rain, mud or bathing content** — no water-themed cards, copy or jokes, in any wing.
The sixth room is the Abfahrtsaal (car rides, the window-nose, arriving places), not a water
wing. The retired card-bank water jokes — "Badegast des Jahres", "Unwetterwarnung Stufe
Pfote", "nasses Hund und Stolz" — **stay retired** and are rewritten as build-phase copy
work; they must not be re-pulled from the bank at runtime.

**R-B · Seen-state is the only collection state.** A card is "gesammelt / collected"
when its photo id is in `lucky-elsa.seen.v2`. Both paths — pulled from a pack, opened from
the collection — mark seen through the single existing "card seen" routine. Copy shifts from
"gesehen/seen" to "gesammelt/collected" everywhere (progress label, tile state, dialog line);
the unseen tile state reads "noch nicht gesammelt / not yet collected". The collection itself is
renamed **"Die Sammlung" / "The Collection"**.

**R-C · Wing progress is derived, never stored as a count.** Per-wing progress is computed at
render time as `collected_in_wing / total_in_wing` from the manifest's wing membership and the
seen-set. Storage records only *completion events* (R-E), so manifest edits can never leave
stale counts behind.

**R-D · Wing completion fires once per manifest state.** When `collected_in_wing ==
total_in_wing` for a wing with `total_in_wing ≥ 1` and the wing has no stored completion
snapshot for the *current* manifest generation, the system: (1) writes a completion snapshot
(R-E), (2) unlocks the wing's frame variant for its collection tiles, (3) rings the existing
completion chime (holo-class chime; silent under sound-off), (4) announces via the live
region, e.g. DE "Der Ruhesaal ist vollständig — acht von acht gesammelt." / EN "The Nap
Wing is complete — eight of eight collected." The shelf `new-acquisitions` counts toward the
diploma but earns no frame (its membership is whatever the curator hasn't sorted).

**R-E · Storage contract (the only writes this system performs):**

```text
lucky-elsa.seen.v2   : string[]                      // photo ids, order-insensitive; v1 value migrated at boot
lucky-elsa.sets.v1   : {                             // completion snapshots only
  [wingId]: { completedAt: ISO-8601, memberCount: number, manifestStamp: string }
}
lucky-elsa.flags.v1  : {
  milestones        : string[],                     // subset of ["25","50","75"]
  lastManifestStamp : string,                       // powers the Zuwachs line (R8)
  diploma           : { completedAt: ISO-8601, cards: number, lap: number,
                        ownerLine: string } | null, // latest 100 % completion
  masterIndex       : boolean                       // "Das Gesamtverzeichnis" unlocked
}
lucky-elsa.lang.v2   : "de" | "en"                   // owned by i18n system
lucky-elsa.sound.v2  : boolean                       // owned by audio system ("Ton an/aus")
```

Key naming is ADR-0003's rule: `lucky-elsa.<concern>.v<n>`, where the suffix **is** the envelope
version and every payload is wrapped as `{ "v": n, "data": … }`. `seen` / `lang` / `sound`
therefore end in `.v2` (they had bare v1 values and are migrated at boot, idempotently);
`sets` / `flags` end in `.v1` because they were introduced after that migration and never had an
older shape. A payload shape change bumps the number and adds a migration step — never an
in-place reinterpretation. This table is the update path for the key register in ADR-0003 §2;
nothing outside it is ever stored.

`manifestStamp` is a short hash of the sorted photo id list (+ wing assignments), recomputed
on load; `lastManifestStamp` is the stamp as of the visitor's previous visit and powers R8.
A snapshot whose stamp matches the current manifest means "this completion is still current";
a mismatched snapshot is kept as history but the wing is considered open again (Edge Case E1).
All keys are first-party `localStorage`, read defensively (JSON parse in try/catch, type-check
every field, discard malformed entries), written atomically per key. Nothing else is ever
stored; nothing leaves the browser.

**R-F · Milestones (binder-spec canon).** When overall collected ratio crosses 25 %, 50 %,
75 % (see Formulas), the corresponding id is appended to `flags.milestones` (once ever per
reset cycle) and the collection outfit upgrades per the binder spec: **25 % = the gilded door
sign ("Türschild vergoldet"), 50 % = the reading lamp lit ("Leselampe angezündet"), 75 % = the
velvet rope ("Samtband gespannt")** — collection-level outfits, each with its text label, never
colour alone. The announcement copy is the pattern library's single source
`catalogue:milestone-reached { pct }` (DE *"Sammlung-Meilenstein erreicht: {pct} Prozent."* /
EN *"Collection milestone reached: {pct} per cent."*); no competing copy lives in this
document. Outfits are additive CSS inside the existing parlour palette — no new layout, no
new colours outside the wing colour roles (R-A). Milestones are **overall-collection
milestones with collection-level outfits**; per-room markers may appear inside collection rows as
a display-only affordance, but there are **no per-set milestone events and no per-set
milestone storage**.

**R-G · Chase card.** Exactly one photo in the manifest may carry `chase: true` in
`captions.json` (the curator's editorial pick). Rules: the chase card is always holo (its
rarity override is implied and does not consume the promotion pity), it renders with the
gold-glint keystone frame variant, and the Porträtsaal is only complete when the chase card
is collected. Proposed name, bilingual: **"Das Hauptporträt" / "The Portrait of Record"** —
museum-catalogue seriousness, zero lottery flavour. If no photo carries the flag, the wing
simply has no keystone and completes like any other — the system must never synthesise or
substitute a chase card.

**R-H · Second-lap stamps.** At pull time (pack or collection), if the photo id is already in
the seen-set before being marked, the pulled card renders the corner stamp **"2. Auflage" /
"2nd printing"** and the dialog shows the line "Zweite Auflage — die Sammlung kennt sie
schon." / "Second printing — the collection already knows this one." No counter is stored:
the stamp is derived from seen-state at pull time and never persisted. (Printing-stamp
language is library register; it stays.)

**R-I · Capstones at 100 %.** When all seven sections are simultaneously complete under the
current manifest: write `flags.diploma` (and refresh it on each re-completion), set
`flags.masterIndex = true`. The completion reward is the **single** 100 % surface **"Elsas
Ehrenmensch" / "Elsa's Honorary Human"** (owner canon): one certificate card in the collection
header bearing the subtitle **"Sammlung I · vollzählig" / "Collection I · all present"**, a
photo collage from the collection, the completion date, the lap number, and the curator's
closing line (a `diplomaLine` pair in `captions.json` meta, DE/EN; neutral fallback copy if
absent), shareable and savable through the existing share/save plumbing. **Per-set completion
earns frames only — per-set diplomas do not exist.** Beside it unlocks **"Das
Gesamtverzeichnis" / "The Master Index"**: one additional plaque card — Elsa's roster-wide
Fantasiewerte aggregated (see Formulas), museum-plaque framed, still explicitly labelled
"Fantasiewerte · nur zum Spaß" per PRD F2a.

**R-J · Reset (owner canon).** "Von vorn" clears **every `lucky-elsa.*` key** — collection
state (`seen.v2`, `sets.v1`, `flags.v1`) *and* preferences (`lang.v2`, the sound key
`lucky-elsa.sound.v2`) — and the page returns to its first-visit state: German default,
sound on, empty collection. It requires a one-line confirmation that names what is lost,
including language and sound (UI Requirement R7), and is idempotent: clearing already-empty
keys is a no-op, and reset never fires milestone/capstone logic as a side effect of clearing.

**R-K · Anti-grind invariants (binding on all future changes).** No currencies, no dupe
counting, no odds displayed or implied anywhere, no time pressure of any kind, no reward
changes gameplay, no reward ever expires, reset is never advantageous. Any proposed feature
that breaks one of these is out of scope regardless of its merit.

### States and Transitions

Per wing: `open → complete(current manifest) → reopened (manifest changed) → complete again`.
Per visitor overall: `first lap → lap complete (existing auto-restart) → second lap (stamps
appear) → … → 100 % → diploma issued → new photo → 99 % + "Zuwachs" → 100 % → diploma
re-issued (refreshed, never duplicated)`. Milestones and `masterIndex` are one-way flags
within a reset cycle; only reset clears them. The shelf is always "open" unless an empty
manifest makes it vacuously complete (then it grants nothing and blocks nothing — see E4).

### Interactions with Other Systems

- **Pack Generation** (provides): the **four** drawn ids in reveal order (owner canon
  2026-11-22: a pack holds 4 cards — a 2×2 grid on a phone), plus each draw's
  was-already-seen bit for R-H. Reveal order is the pack's, not this system's: the holo/rare
  climax lands in **slot 4**, in **slot 3 only** when a second rare/holo was drawn, and never
  in slot 1. Requires: pack generation must not write `sets.v1`/`flags.v1`
  — collection logic reacts to "card seen" events only.
- **Reveal Theatre** (consumes): the "aus:" chip data and the stamp bit per revealed card.
  **Mid-reveal skip (owner canon, 2026-11-22):** skipping/closing the reveal early collects
  **only the cards already revealed**; the remainder are not collected and stay unseen (they
  remain first in the unseen-first walk). The pack can be reopened immediately — no lockout,
  no partial-pack penalty.
- **Photos Pipeline** (provides): manifest with per-photo id, bilingual copy, rarity, optional
  `set`, optional `chase`, optional `diplomaLine`. Requires: `npm run photos` passes the new
  optional fields through unchanged; unknown slugs fall back to `new-acquisitions`.
- **Collection (binder)** (consumes): wing grouping, progress lines, frame states, milestone
  outfit state. Collection card opens go through the shared "card seen" routine
  (systems-index circular-dep resolution).
- **Persistence**: owns the three collection keys in R-E (`seen.v2`, `sets.v1`, `flags.v1`);
  `lang.v2` and `sound.v2` are owned by i18n and audio. No other system writes any of them
  (ADR-0003 §3: `persistence.svelte.ts` is the only module touching `Storage`).
- **i18n & A11y plumbing** (requires): every new string exists in `COPY.de`/`COPY.en` index-
  aligned; the brand name "Elsa the Explorer" stays identical in both languages, taglines
  localize; all announcements go through the existing live region; frames/stamps are
  decorative-only (never the sole carrier of state — seen-state is also conveyed by text,
  per the a11y spec, see Cross-References).

## Formulas

- **Wing progress:** `p_wing = collected_in_wing / total_in_wing`, displayed as
  `"{collected} von {total} gesammelt"` / `"{collected} of {total} collected"`.
  `total_in_wing = 0` → wing section hidden entirely (E4).
- **Overall ratio:** `p_all = |seen ∩ manifest| / |manifest|`. Milestones at
  `p_all ≥ 0.25`, `≥ 0.50`, `≥ 0.75`, each fired once per reset cycle (order-independent:
  loading a save that jumps 10 % → 60 % fires "25" and "50" in one pass, in threshold order).
- **Lap number:** `lap = 1 + (number of auto-restarts since last manual reset)`. Auto-restart
  is the existing event (seen-set cleared when the walk finishes). The diploma stores `lap`
  at completion time.
- **Diploma condition (Ehrenmensch):** `complete_all = ∀ wing w ∈ manifest: p_w = 1` where wings with
  `total_in_wing = 0` are excluded from the quantifier (E4).
- **"Das Gesamtverzeichnis" values:** for each trait key present in `photoTraits` across the
  roster, `value = round(Σ per-photo values / count)`, displayed as `{key} {value}/10`,
  capped to the 0–10 input range; traits are editorial jokes and remain labelled imaginary.
- **Example:** 64 cards, 8 in `nap-wing`, 6 seen there → `p_wing = 6/8 = 0.75`; overall
  30/64 = 0.47 → milestone "25" fired, "50" pending; Ehrenmensch not issuable.

## Edge Cases

- **E1 · New photo re-opens a completed wing.** The new photo's id changes `manifestStamp`;
  the matched snapshot is treated as history, the wing returns to `open`, its frame *stays*
  unlocked (frames are "once earned per reset cycle", tracked by the surviving snapshot's
  existence — a wing that has ever completed under the current reset cycle keeps its frame),
  and the collection progress line shows the new missing card. No re-chime until re-completion.
- **E2 · Ehrenmensch re-locks with Zuwachs.** If a new photo arrives after 100 %, the diploma
  card (if displayed) shows the note "Der Ehrenmensch wartet auf die neuen Karten. Er hat es
  nicht eilig." / "The Honorary Human is waiting for the new cards. No rush." It
  re-issues (refreshes `completedAt`, `cards`, `lap`) when 100 % is reached again. The old
  diploma is overwritten, never accumulated. A new arrival is announced once, by the Zuwachs
  line (R8), and never restated here.
- **E3 · Reset idempotence and re-fire.** Reset twice in a row: the second clears nothing and
  changes nothing. After reset, milestone and diploma logic re-fire from scratch; a wing's
  frame unlocks again on re-completion. Storage unavailable (Safari private mode): the site
  degrades exactly as v1 does — session-only state, no errors, no milestone persistence.
- **E4 · Empty or degenerate sections.** A wing with zero members is hidden, not rendered as
  "0 von 0" (the pattern library's Set Progress Line "omit" rule agrees —
  `design/ux/interaction-patterns.md`). `new-acquisitions` with zero members is likewise
  hidden; if the manifest is
  demo-cards only (< 8 real photos, existing rule), all wings derive from demo ids and the
  diploma is achievable but stamps "Beispielkarten" nowhere — the demo note copy already
  covers it. Chase flag on a demo id behaves per R-G.
- **E5 · Photo removed or renamed by the curator.** Stale seen-ids are pruned on load
  (existing v1 behaviour). A wing that drops below completion because of removal re-opens per
  E1 rules. `memberCount` snapshots keep historical display sane but never gate logic.
- **E6 · Chase photo removed from the manifest.** The Porträtsaal re-opens (E1); if the
  curator has not flagged any other photo, the wing completes without a keystone (R-G
  fallback).
- **E7 · Malformed or absent meta keys.** Defensive load: any key that fails parse/type-check
  is treated as empty and rewritten on next write. The suffix is the envelope version, so
  `.v1` and `.v2` of one concern never coexist after the boot migration (ADR-0003 §4): an
  existing `.v2` beats any leftover v1 bytes, and a future shape change introduces the next
  suffix plus a one-time import, not in-place mutation.
- **E8 · Milestone jump across reset.** Milestones fire only on *increases* within a reset
  cycle; after reset, `p_all` starts at 0, so no stale re-fire. A card opened from the
  collection while the pack dialog is open counts identically (single "card seen" routine).
- **E9 · Degenerate strategy check.** There is none to exploit: reset grants nothing, dupes
  grant nothing, completion grants status only. The unfun equilibrium to watch in playtesting
  is *compulsive re-opening* driven by wing anxiety — the mitigation is that nothing decays,
  nothing is limited, and the wing lines always name exactly what is missing (information,
  not pressure).

## Dependencies

- **Provides to:** Collection (binder) (grouping, progress, frames, outfits); Reveal Theatre (chip
  data, stamp bit); Card Detail & Share (stamp line, diploma share payload); milestone and
  completion announcements to the live region.
- **Requires from:** Photos Pipeline — optional `set`, `chase`, `diplomaLine` fields passed
  through the manifest; Pack Generation — the "card seen" event and was-already-seen bit;
  Persistence — the three-key contract (R-E); i18n & A11y plumbing — copy strings, brand
  handling, live region, reduced-motion handling for any new decoration.
- **Data flow direction:** manifest + localStorage → derived state (pure computation) →
  render + announcements; writes flow only from "card seen", wing-completion, milestone,
  capstone, and reset routines. Integration contract for programmers (enforced by the
  step-1 rebuild): *no component writes collection keys directly; all writes go through
  the collection module's five verbs (`markSeen, onWingComplete, onMilestone,
  onAllComplete, resetAll`)*. Stack (owner-decided): Svelte 5 + Vite 8 + TypeScript
  (strict) + Vitest + Playwright, built locally and deployed as static files to IONOS;
  the contracts in this document are framework-neutral — only the UI Requirements
  reference components.

## Tuning Knobs

| Knob | Category | Default | Intended range / rationale |
| --- | --- | --- | --- |
| Milestone thresholds | Curve | 0.25 / 0.50 / 0.75 | Fixed quartiles; keep symmetric so each third of the collection has one payoff. Tune only if playtests show the middle third feels flat. |
| Wing size guidance | Curve | 6–10 cards/wing | Editorial, not enforced. Below 5 a wing completes too fast to feel like progress; above 12 the meso-loop can't finish it in one sitting. |
| Shelf frame reward | Gate | none | Keep: the shelf must never be *more* rewarding to complete than a curated wing, or curating dies. |
| Chase count | Gate | exactly 1 | More than one chase dilutes it into a rarity tier — forbidden by R-K. Zero is allowed (E6). |
| Frame palette | Feel | one colour role per wing (R-A) | CSS-gradient only; tuned by eye against real photos at mobile and desktop sizes, per PRD R8's foil discipline. |
| Stamp/copy strings | Feel | see UI Requirements | Copy deck entries; both languages edited together (PRD R5); brand name exempt (fixed). |
| Ehrenmensch re-issue behaviour | Gate | refresh, never accumulate | Prevents a trophy shelf (scope) and keeps 100 % meaningful after Zuwachs. |

No knob may be implemented as a hardcoded literal in logic; curve knobs live next to the
manifest handling, feel knobs in the copy deck / CSS, so the Vitest and Playwright suites can assert on them.

## Visual/Audio Requirements

- All decoration stays inside the existing dark collector's parlour palette; frames, stamps
  and outfits are refinements of the current foil/frame system, never new surface colours.
- Frame variants: one additional CSS gradient + border treatment per wing, applied to
  collection tiles of completed wings and to the dialog print of those cards. The photo is
  never altered.
- The holo system is aligned to the approved reference study: two `repeating-linear-gradient`
  foil layers with em stops (iridescent rainbow layer + fine diagonal prong layer in overlay
  blend), a blurred `conic-gradient` rainbow bloom, a pointer-tracked `radial-gradient` mask
  driven by `--px`/`--py`, and 3D tilt/flip with `aria-pressed`. The chase gold-glint is a
  variant of this stack on the keystone card only, with a slow glare drift; disabled entirely
  under `prefers-reduced-motion` (like all foil movement today).
- Audio: wing completion and milestone re-use the existing holo chime (no new sounds; sound
  toggle and reduced-motion rules apply unchanged). No sound is required to understand state.
- Stamps ("2. Auflage") are a rotated text mark in the card's corner layer, monochrome ink,
  quiet — a rubber stamp, not a badge.

## Game Feel

- **Feedback timing:** the "aus:" chip and progress delta are readable within 0.5 s of the
  card landing (micro-feedback); wing completion is the strategic payoff inside the 2–5 min
  meso-loop and must land while the pack dialog is still open or immediately after close.
- **The sawtooth:** pack pull (rise) → wing line ticks (small release) → wing completion
  chime + frame (milestone release) → next wing re-engages at slightly higher baseline. The
  25/50/75 % outfits and the Ehrenmensch are the session- and campaign-level releases.
- **Failure recovery:** not applicable — no failure exists; the closest analogue (a pack of
  all-duplicates on lap 2+) is mitigated by the stamp itself turning the repeat into content.
- Playtest probe: after the pack dialog closes, do visitors scroll to the collection to check
  a wing line unprompted? If yes twice, the meso-loop works; if never, the kill condition in
  the brief triggers.

## UI Requirements

- **R1 · Wing chip ("aus: …"):** every pulled card in the drop row and the big-card dialog
  (the pulled-card component) shows a small chip "aus: Ruhesaal" / "from: The Nap Wing" under
  the rarity label; `new-acquisitions` cards show no chip (the shelf speaks only when spoken
  to). The chip is text-redundant: it never carries state on its own. *(Build phase:
  Vertical Slice — drop row + dialog.)*
- **R2 · Collection grouping:** the collection renders as "Die Sammlung / The Collection" with wings
  as sections, each with a divider (wing name, DE/EN per language) in fixed canonical order
  (R-A table) and its progress line "{x} von {y} gesammelt" / "{x} of {y} collected";
  `new-acquisitions` renders last; empty sections hidden. Keyboard order follows visual
  order. *(Build phase: Phase 2.)*
- **R3 · Frame unlock visuals:** on wing completion, that wing's collection tiles gain its
  frame variant (R3a) *and* the same frame appears in the dialog print (R3b); a one-line
  collection header note names the unlock; live-region announcement per R-D. Frames persist
  until reset (E1 rule) and are always accompanied by the wing's progress line reading
  "{y} von {y}". *(Build phase: R3a collection tiles — Phase 2; R3b dialog frame —
  Vertical Slice, per owner ruling.)*
- **R4 · Milestone announcements:** at 25/50/75 %, the outfit upgrade applies (R-F: door
  sign, reading lamp, velvet rope) with its text label, the announcement fires via the
  pattern library's `catalogue:milestone-reached { pct }` copy, live region, visible in both
  languages on toggle. *(Build phase: Phase 2.)*
- **R5 · Elsas Ehrenmensch composition:** at 100 %, a dedicated diploma component — canon
  name **"Elsas Ehrenmensch" / "Elsa's Honorary Human"** — renders in
  the collection header: collage of collected photos, subtitle "Sammlung I · vollzählig" /
  "Collection I · all present", completion date, lap number, the curator's `diplomaLine`
  (neutral fallback otherwise), share and save actions re-using existing plumbing;
  reduced-motion honoured; the "Gesamtverzeichnis" plaque sits beside it with its
  imaginary-stats label per PRD F2a. *(Build phase: Phase 3.)*
- **R6 · Stamp display:** the "2. Auflage" corner stamp appears on the pulled card and the
  stamp line in the dialog (R-H); collection tiles never show stamps (they are pull-history,
  not collection state); the stamp is decorative and announced nowhere separately — the
  dialog line is its text form. *(Build phase: Phase 3.)*
- **R7 · Reset semantics:** one button "Von vorn / Start over"; on press, an inline
  confirmation names exactly what is cleared — the collection, room progress (which takes the
  unlocked frames with it), the milestones, the Ehrenmensch, **language and sound**. The
  confirmation body *is* the deck's `reset.body`, quoted in full and never re-worded:
  **"Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas
  Ehrenmensch — Ton und Sprache kehren auf Standard zurück." / "This clears the Collection,
  room progress, the milestones and Elsa's Honorary Human — sound and language go back to
  default."** A shorter button label is not this string and would need its own key. Confirm
  clears every `lucky-elsa.*` key; cancel leaves everything
  untouched; the control is reachable by keyboard and announced by the live region on
  completion. No `!` anywhere in it (destructive confirmation).
- **R8 · Zuwachs line (new arrivals):** on load, if the manifest holds photo ids not
  present in the stored seen-set *that were absent from `lastManifestStamp`*, one quiet line
  above the collection, exact copy: **"{n} neue Schmuckstücke sind da!" / "{n} new treasures
  have arrived!"** (cap **44**, both languages; this is the line's single `!`, neutralised to
  `.` on the announcement path). It
  disappears once any of them is collected; it never blocks or redirects anything.
  *(Build phase: Vertical Slice — ships with the step-3 register pass.)*
- **R9 · Copy set and brand (verb + badge canon):** the **progress verb** is
  "gesammelt/collected" in every progress line (collection, per-wing, dialog) and in the tile
  state marker — collected tiles read "gesammelt" / "collected", unseen tiles read
  "noch nicht gesammelt" / "not yet collected"; the **collection tile badge** is a separate
  fixed **location label** reading **"In der Sammlung" / "In the collection"** — it names where the
  card lives, it is not a state verb, and the retired state string (the old verb) survives
  nowhere;
  everything lives in the copy deck (PRD R5 index-aligned). The collection heading becomes
  "Die Sammlung / The Collection"; the brand "Elsa the Explorer" is identical in both languages with localized
  taglines; every new string exists in `COPY.de` and `COPY.en` at the same index (PRD R5);
  German reads as *du*-register, dry and warm; **at most one `!` per surface**, never in an
  error message, a destructive confirmation or an accessibility string, and the terminal
  `!` is removed before a string enters the live region. *(Build phase:
  Vertical Slice.)*
- **R10 · Accessibility parity:** every state change in this document (seen, wing complete,
  milestone, diploma, Zuwachs, reset) is conveyed by at least one text/live-region update in
  addition to any visual treatment; frames, stamps and outfits are decorative only; the full
  requirements matrix lives in `design/accessibility-requirements.md` (separate agent — this
  document's R1–R10 are its inputs, not its replacement). *(Build phase: cross-cutting —
  every phase.)*

## Cross-References

- `design/game-brief.md` — pitch, loop layers, refactor build order, anti-grind commitments (§Avoid, §Out of scope).
- `design/gdd/systems-index.md` — dependency map, circular-dependency resolution (Collection & Wings ↔ Collection (binder)), risk table.
- `design/accessibility-requirements.md` — *(authored by the a11y agent; pending)* R1–R10 above are the design inputs to its matrix.
- `design/ux/interaction-patterns.md` — the pattern library; its Set Progress Line "omit" rule backs the empty-section rule in E4.
- `PRD.md` — F3 (rarity by photo id), F4 (promotion pity), F5/F6 (no dupes, deck walk), F2a (imaginary-stats label), §5 (privacy, tone, design), §10.4 (uploads deferred). Note: PRD terminology ("Sammelheft", "Erste Auflage") predates the Elsa the Explorer reframe; the copy decisions here supersede it pending a PRD revision.
- `/private/var/folders/.../holo-card-ref.html` — approved foil reference study (layered repeating-linear-gradients with em stops, conic rainbow bloom, pointer radial mask, tilt/flip).
- `assets/js/card-bank.js` — the copy register this document's German strings must match (port intact through the refactor).
- Future GDDs: Reveal Theatre (holo-last ordering + foil pass), Catalogue wing-grouping spec — extract from refactor stories if they grow beyond one sitting.

## Acceptance Criteria

**Functional (extend the Vitest logic suites and the Playwright UI suites):**

1. Pack of four, no dupes, unseen-first walk, ≥1 rare/holo — asserted through the refactored
   modules, not just the legacy path.
2. Reveal order across the four slots: the holo/rare climax sits in slot 4; a rare/holo sits
   in slot 3 only when the pack holds two of them; slot 1 never carries the promoted or
   highest-rarity card.
3. A photo with `set: "nap-wing"` renders the chip "aus: Ruhesaal" in DE and "from: The Nap
   Wing" after EN toggle; shelf photos show no chip.
4. Collecting all members of a wing fires exactly one completion: snapshot written, frame
   applied, chime (when sound on), live-region announcement; reloading does not re-fire.
5. Adding a photo id to a completed wing re-opens the wing (progress line shows the missing
   card), keeps the frame, and shows the Zuwachs line on next load; reaching 100 % again
   refreshes, not duplicates, the Ehrenmensch.
6. Milestones fire once each per reset cycle, in threshold order even after a large jump;
   reset clears every `lucky-elsa.*` key — `seen.v2`, `sets.v1`, `flags.v1`, `lang.v2`, the
   sound key (`sound.v2`) — the page falls back to German default and sound-on, and a second
   reset is a no-op.
7. A second-lap pull renders the "2. Auflage" stamp; first-lap pulls never do.
8. `chase: true` implies holo rendering and blocks Porträtsaal completion until seen; no
   chase flag anywhere → the wing completes without a keystone.
9. Both languages complete for every new string (0 untranslated, PRD M4); the brand name is
   "Elsa the Explorer" in both; no horizontal overflow at 320–1920 with wing sections present
   (PRD F17).
10. No code path writes `sets.v1`/`flags.v1` outside the collection module's five verbs.

**Experiential (playtest, watch 3–5 people once, do not explain — PRD M5/M6):**

11. A visitor who opens a pack scrolls to, or asks about, their wing progress at least once —
    the meso-loop is visible.
12. Nobody reads the wing meta as a chore: no one asks "do I have to…", nobody expresses
    urgency about a countdown that does not exist, and the reset confirmation reads as
    honest rather than punishing.
13. The Ehrenmensch, when reached, produces the same register of reaction as a good card — a
    laugh or a "wow, fertig" — not a taskmaster's tick.
14. Oma-level check: the wing lines and the Ehrenmensch are understandable on a phone, in German,
    with big text, in one visit, unaided.

## Open Questions

1. **Ehrenmensch share format:** shared as the composed card image, or as a deep link plus text?
   *(Recommendation: image first, clipboard link fallback — mirrors the existing share path.)*
2. **Wing names final check:** are "Ruhesaal", "Außenstelle Garten", "Abfahrtsaal",
   "Ballsaal", "Porträtsaal", "Wachsaal", "Neuzugänge" right against the real photos?
   *(Recommendation: confirm in one sitting once photos are in; slugs are stable, display
   names are cheap to change pre-launch.)*
3. **Catalogue section order:** canonical R-A order, or should completed wings float to the
   top? *(Recommendation: fixed order — a catalogue's dividers don't reorder themselves, and
   stable order is calmer for repeat visitors.)*
4. **"Das Gesamtverzeichnis" trait selection:** aggregate every trait key in the roster, or
   the curator hand-picks five? *(Recommendation: aggregate — zero editorial cost, and the
   average of jokes is itself a joke.)*
5. **Curator's diploma line:** write it when Collection I is nearly done, not now.
