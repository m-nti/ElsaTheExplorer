# Systems Index: Elsa the Explorer

> **Status**: Draft
> **Created**: 2026-11-22
> **Last Updated**: 2026-11-22
> **Source Concept**: design/game-brief.md

---

## Overview

Elsa the Explorer is a single-page static web game: a pack-opening card library with no
combat, no economy and no fail state. The visitor is an explorer and reader of an
archive-catalogue of one dog's life; the collection itself is the product. The mechanical
scope is deliberately small and every system serves one of the three loop layers from the
brief — the pack ritual (micro), the wing-completion meta (meso), and the collection
milestones that culminate in Elsas Ehrenmensch (macro). Ten systems carry the whole game.
Stack (owner-decided): **Svelte 5 + Vite 8 + TypeScript (strict) + Vitest + Playwright**,
built locally and deployed as static files to IONOS — the runtime stays server-render-free,
and `photos.php` remains the runtime manifest source so the owner's FTP-drop workflow works
with no redeploy. This is a **full refactor**: the v1 monolith is rebuilt on that stack
(behaviour-neutral step 1), and only concepts that earn their place are ported — the
photo→card pipeline, the unseen-first deck walk, holo-as-material rarity, DE/EN, and
first-party localStorage. Everything computes client-side from one photo manifest plus
three first-party localStorage keys; the only optional server component is a read-only photo
lister. The pillar everything answers to: *"There is also no moment. A folder of photos is
browsed; a pack is opened."*

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Persistence (localStorage) | Foundation | MVP | In Design (restructure) | design/gdd/collection-meta.md (data model §) | — |
| 2 | Photos Pipeline (photos.php) | Data | MVP | Implemented (extends) | — | — |
| 3 | Pack Generation | Gameplay | MVP | Implemented (ports) | — | Photos Pipeline, Persistence |
| 4 | Reveal Theatre | Presentation | MVP | In Design | — | Pack Generation, i18n & A11y plumbing |
| 5 | Collection & Wings | Progression | Vertical Slice | In Design | design/gdd/collection-meta.md | Pack Generation, Persistence, Photos Pipeline |
| 6 | Catalogue (binder) | UI | Vertical Slice | In Design | design/gdd/collection-meta.md (UI Requirements) | Collection & Wings, i18n & A11y plumbing |
| 7 | Milestones & Unlocks | Progression | Alpha | Not Started | design/gdd/collection-meta.md | Collection & Wings |
| 8 | Chase Card | Progression | Alpha | Not Started | design/gdd/collection-meta.md | Collection & Wings, Photos Pipeline |
| 9 | Card Detail & Share | UI | MVP | Implemented (ports) | — | Catalogue, i18n & A11y plumbing |
| 10 | i18n & A11y plumbing | Meta | MVP | Implemented (ports) | — (a11y spec: design/accessibility-requirements.md, separate agent) | — |

Systems marked *(inferred)*: none — all ten are named in design/game-brief.md "Your systems"
and were approved by the owner in the locked decision rounds.

---

## Categories

| Category | Description | Systems here |
|----------|-------------|--------------|
| **Foundation** | Storage and data everything reads | Persistence, Photos Pipeline |
| **Gameplay** | The system that makes the game fun | Pack Generation |
| **Progression** | How the collection grows and rewards | Collection & Wings, Milestones & Unlocks, Chase Card |
| **UI** | Player-facing displays | Catalogue, Card Detail & Share |
| **Presentation** | The feel layer on top of mechanics | Reveal Theatre |
| **Meta** | Plumbing that serves all of the above | i18n & A11y plumbing |

(Economy and Audio categories are deliberately absent: there is no currency by design, and
sound is a small feature of Reveal Theatre, not a system of its own.)

---

## Priority Tiers

| Tier | Definition | Target Milestone | Design Urgency |
|------|------------|------------------|----------------|
| **MVP** | Required for "open a pack and laugh" to work | Refactor step 1–3 | Design FIRST |
| **Vertical Slice** | One full meso-loop: pack → wing progress → wing completion | Refactor step 4 | Design FIRST |
| **Alpha** | Full meta: milestones, chase, reset semantics | Refactor step 5 | Design SECOND |
| **Full Vision** | Ehrenmensch, Gesamtverzeichnis, stamps, outfits | Refactor step 6 | Design as needed |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **Persistence (localStorage)** — the single source of visitor state; every other system reads it, nothing writes collection state except through the collection verbs.
2. **Photos Pipeline (photos.php)** — the manifest is the only input of content; wings, rarities and the chase flag all hang off photo ids.

### Core Layer (depends on foundation)

1. **Pack Generation** — depends on: Photos Pipeline (card pool), Persistence (seen-set for the unseen-first walk).
2. **Collection & Wings** — depends on: Pack Generation (what was pulled), Photos Pipeline (wing membership per photo id), Persistence (seen + wing-completion snapshots).

### Feature Layer (depends on core)

1. **Milestones & Unlocks** — depends on: Collection & Wings (wing completions, overall ratio).
2. **Chase Card** — depends on: Collection & Wings (keystone-of-wing completion rule), Photos Pipeline (the flagged photo).

### Presentation Layer (depends on features)

1. **Catalogue (binder)** — depends on: Collection & Wings (grouping, progress lines), Milestones & Unlocks (frames, outfits), i18n & A11y plumbing.
2. **Reveal Theatre** — depends on: Pack Generation (the five draws and their order), i18n & A11y plumbing (reduced motion, live regions).
3. **Card Detail & Share** — depends on: Catalogue (the selected card), Reveal Theatre (stamp, chip rendering shared).

### Polish Layer (depends on everything)

1. **i18n & A11y plumbing** — depends on: everything it announces; maintained cross-cutting, tested last but designed first.

---

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Collection & Wings | Vertical Slice | Core | game-designer | S |
| 2 | Reveal Theatre (holo-last + foil pass) | Vertical Slice | Presentation | game-designer + technical-artist | S |
| 3 | Milestones & Unlocks | Alpha | Feature | game-designer | S |
| 4 | Chase Card | Alpha | Feature | game-designer | S |
| 5 | Catalogue (wing grouping + UI requirements) | Vertical Slice | Presentation | game-designer + ux-designer | M |
| 6 | Persistence (meta key contract extension) | Alpha | Foundation | game-designer + lead-programmer | S |

collection-meta.md (written) covers orders 1, 3, 4, 6. Orders 2 and 5 are small enough to be
specified inside refactor stories; if either grows, give it its own GDD before building.

---

## Circular Dependencies

- **Collection & Wings ↔ Catalogue**: the Catalogue renders wing progress (reads) and is also
  an alternate collection surface (catalogue opens mark cards seen, which writes). Resolution:
  the write path goes only through Pack Generation's "card seen" routine; the Catalogue calls
  that routine and never writes storage directly. No code cycle.
- No other circular chains found.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|------------------|------------|
| Module refactor | Technical | Rebuilding on Svelte 5 + TypeScript strict can silently break the working v1 behaviours | Behaviour-neutral step 1 with the Vitest + Playwright suites green before and after; the deck-walk, promotion pity and language persistence are explicitly asserted |
| Collection & Wings | Design | Wing meta could tip the register from museum-catalogue to grind (what §Avoid forbids) | Hard rules: no currencies, no dupe economy, all rewards are cosmetic status; the deck-walk guarantee is non-negotiable |
| Chase Card | Design | A single chase card can drift into gambling flavour for younger visitors | The chase is temporal, never probabilistic: fixed holo rarity, arrives when the lap reaches it; no odds are ever shown or implied |
| Milestones & Unlocks | Scope | "Outfit" upgrades could balloon into a redesign of the parlour | Owner decision: refine, don't rebrand; outfits are divider/ribbon/watermark additions inside the existing CSS system |
| Photos Pipeline | Data | Wing membership is owner editorial work; unsorted photos could leave wings half-empty | Optional `set` field with automatic "Neuzugänge" bucket; the site is fully functional while curating is half-done |
| Rebrand | Design | "Elsa the Explorer" as fixed brand name must not read as a translated product | Owner decision: brand stays English in both languages; taglines localize ("das Archiv eines Hundelebens." / "the archive of a dog's life."); copy register stays *du*-register, dry, warm |
| Persistence | Data | Meta keys outliving manifest changes (photos removed/renamed) | Snapshot completion at completion time; prune stale ids on load (existing pattern); reset clears everything |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 10 |
| Design docs started | 1 (collection-meta.md, covers 4 systems) |
| Design docs reviewed | 0 |
| Design docs approved | 0 |
| MVP systems designed | 10/10 (6 implemented in v1, 4 specified in collection-meta.md / refactor stories) |
| Vertical Slice systems designed | 2/4 (Collection & Wings yes; Reveal Theatre and Catalogue specs pending as refactor stories) |

---

## Next Steps

- [ ] Review and approve this systems enumeration
- [ ] Write the step-1 rebuild story (Svelte 5 + TypeScript scaffold, behaviour-neutral, gated on the Vitest + Playwright suites)
- [ ] Write refactor stories for Reveal Theatre (holo-last + foil pass to the reference study) and the rebrand/register changes
- [ ] Run `/design-review` on collection-meta.md
- [ ] A11y agent: author design/accessibility-requirements.md; cross-check its matrix against the UI Requirements in collection-meta.md
- [ ] Validate the register (museum-catalogue, not grind) with the 2–3 family testers from the brief's build order step 2
