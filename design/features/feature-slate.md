# Feature Slate — Elsa the Explorer

> **Status**: Proposal (pre-decision) · **Author**: creative-director · **Date**: 2026-11-22
> **Basis**: `design/game-brief.md`, `design/gdd/collection-meta.md`, `design/player-journey.md`,
> `design/accessibility-requirements.md`, `AGENTS.md`
> **Horizon**: post-refactor (after build step 6). Nothing here may delay steps 1–6, and nothing here
> replaces a card, a caption or a wing the owner has not yet curated.

## How this slate was filtered

Eleven seeds met four filters in order; failing one is fatal whatever the charm.

1. **The pillar test.** The spine is *"a folder of photos is browsed; a pack is opened"* plus the honest
   walk. A feature must deepen the archive's reading, its completion, or the visitor's relationship to the
   curator — never add a second game on top.
2. **The R-K invariants** (binding on all future changes): no currencies, no dupe counting, no odds, no time
   pressure, no reward that alters gameplay, no expiring reward, reset never advantageous.
3. **The curator's hands.** One non-technical person drops photos by FTP, minutes per month. Any feature
   whose value rests on editorial labour not yet agreed is an empty room waiting to happen. Copy cost is a
   *real* effort cost here, not a footnote.
4. **The constraint floor.** Static IONOS + optional read-only PHP, no accounts, no server state, no tracking
   of any kind, first-party `localStorage` only, DE/EN parity, WCAG 2.2 AA at Standard tier, no live ops, no
   monetization.

Two tie-breakers decided the ranking: **does it add a verb the product lacks?** and **does it fill a failure
mode the design currently accepts silently?** Features that do neither are nice, and nice is not the brief.

**Binding precondition.** The brief's step-4 kill condition still governs: if testers do not check wing
progress before leaving, stop adding meta and return to curation. If that fired, this whole slate is
cancelled — the answer would be more photos, not more surfaces.

---

## The survivors

### 01 · Die Sonderausstellung — **KEEP (signature candidate)** · *seed 1, sharpened*

**Pitch** — The visitor hangs five collected cards as a special exhibition, titles it, and sends the link; the exhibition lives entirely in the URL fragment and never touches a server.
**MDA / loop** — *Expression* ▸ *Relatedness*, *Discovery* underneath. Adds the missing loop: collect → **choose five** → mount → send → hear back. Every existing verb is receive-and-read; this is the first make-and-give.
**Fiction** — A museum with wings and plaques mounts *Sonderausstellungen*. The visitor graduates from reader to guest curator — the promotion the Ehrenmensch promises and never lets them perform.
**Effort / risk** — **M**. Risk: a five-card link is a thin object if the wall label is generic — the label is the feature, not the cards. Second risk: nothing forces a recipient to care; mitigated by pack symmetry (five cards) and the sender's name on the wall.
**A11y** — Selection is an `aria-pressed` toggle on existing tiles, never drag-and-drop; the exhibition renders in catalogue order, so there is no ordering mechanic to be keyboard-hostile. Mounted view = ordered list of existing card components + heading; focus to the title on open, back to the trigger on close; live region announces "Ausstellung geöffnet: fünf Karten, kuratiert von …"; stale ids are named in text ("Drei Karten dieser Ausstellung sind nicht mehr im Katalog"), never silently dropped.
**Constraints / sharpened** — Clean, and unusually so: fragments are never sent to the server, so sharing tells IONOS nothing — not even which cards. Shared cards are already public in the catalogue (no new exposure); no public feed means no moderation, no live ops. Five cards exactly; wall label **auto-composed** from the dominant wing and card copy with an optional one-line override (owner cost ≈ 8 templates/language, visitor effort zero); a local shelf of up to eight saved exhibitions (`lucky-elsa.exhibitions.v1`) so it is a thing they own, not a one-off link; recipients walk it with `←`/`→` using the Reveal Theatre components.

### 02 · Das Elsa-Lexikon — **KEEP (sharpened to a motif glossary)** · *seeds 5 + 3 + 4*

**Pitch** — The archive grows a glossary: ~20 recurring terms of dog life — *Deckenbindung*, *Sofakomfort*, *Stockrecht*, *Fensternase*, *Krümelaufsicht* — each illustrated by two to four cards and defined in the catalogue's deadpan register.
**MDA / loop** — *Discovery* ▸ *Expression*, *Relatedness* at the end. Adds a cross-link loop: read a card → meet a term → follow it to cards you haven't collected → read those. It turns a linear catalogue into the small network a real catalogue is.
**Fiction** — Every serious catalogue has an index and a glossary; the glossary is where an institution admits what it cares about. *"Deckenbindung, die — der Zustand, in dem eine Decke nicht mehr dem Menschen gehört."*
**Effort / risk** — **M** (one view + one optional manifest field + copy). Risk: copy cost — 20 terms × 4 strings is one honest sitting that competes with the owner's scarcest resource. Mitigation: ship with 8 terms seeded from the existing card-bank jokes; terms appear only when a `terms` entry exists, so a half-curated glossary is a smaller glossary, never a broken room. Second risk: overlap with *Das Gesamtverzeichnis* — clean split, the Verzeichnis is numbers, the Lexikon is vocabulary.
**A11y** — Real `<dl>` semantics, an alphabetical in-page index as a list of links, no hover reveals, no colour-only "belegt durch" state (it reads "belegt durch 2 von 3 Karten"); card-back content extends the existing flip announcements.
**Constraints / sharpened** — Clean: one optional `terms` field passed through by `photos.php`, no new state beyond the seen-set. **Kills the per-card definition** (60 entries is admin the owner will not pay) in favour of motifs. **Absorbs seed 3's forecast**: the card back becomes an information surface — number, the card's term, and *Elsa-Prognose*, a deterministic one-liner seeded by (date, card id): *"Heute günstig für Sofa. Ungünstig für Staubsauger."* Nothing expires and nothing is rewarded when you look. **Absorbs seed 4**: the back is content, not a cosmetic unlock.

### 03 · Der Katalogausweis — **KEEP (reframed)** · *seed 9*

**Pitch** — A short copy-pasteable "catalogue pass" encoding the visitor's collection, so a new phone or a wiped browser isn't a restart — no account, no server, no sync.
**MDA / loop** — *Competence* and trust, not delight. It adds no loop; it **protects** the macro loop by making investment survivable.
**Fiction** — A reader's library card. A document the archive issues to a person — the most museum-shaped possible answer to "where did my progress go?"
**Effort / risk** — **S/M**. Risk: manifest drift (prune unknown ids with a count, never a silent loss), and a 100 % pass sent to a friend spelling the Ehrenmensch — the owner's call, so the pass must name what it holds before it is copied ("34 gesammelte Karten, 2 Meilensteine").
**A11y** — Labelled textarea, copy/paste buttons, plain-language validation error, `role="status"` confirmation, and a **confirmation before import overwrites local progress** reusing the R7 reset pattern and naming what would be replaced; focus defaults to Cancel.
**Constraints / sharpened** — Clean: no account, no server, nothing transmitted until the visitor deliberately pastes it. **Kills seed 9's "duplicate sheet" framing** — dupe counting is an R-K violation and there is no dupe economy here. Compact index encoding (card ordinal, base36) keeps a full pass to ~150–250 characters.

### 04 · Der Sammelbogen — **KEEP (sharpened to a sticker sheet)** · *seed 2*

**Pitch** — A printable sheet, one page per wing: collected cards as filled slots, missing ones as numbered empty slots with their names — the sticker album the collection descends from.
**MDA / loop** — *Sensation*, *Expression*. The loop is offline: print → fridge → fill in by hand → come back to see what's still missing. The only feature that leaves the browser and the only one Oma can hold.
**Fiction** — A Sammelwerk with a Sammelbogen is the genre's own ancestor; an archive issuing a printed sheet is nineteenth-century museum behaviour, not marketing.
**Effort / risk** — **S/M** (one print route, `@media print`, a paper palette). Risk: mixed aspect ratios and print resolution (2× thumbnails suffice at A4); risk it reads as homework — mitigated by printing only what is *collected*, with missing slots honestly numbered.
**A11y** — The on-screen sheet is the accessible artefact; print is an additional route, never the only one. Print CSS must invert to ink-on-paper (the parlour palette prints blank), carry a real document title, use card names as alt text, and mark collected state with a word or drawn tick — never a colour fill. Answers the open question "should the Ehrenmensch be printable?" — one route serves both.
**Constraints / sharpened** — Clean: pure CSS print, no dependency, nothing to approve per print. One page per wing (6–10 slots is the album unit) plus the Ehrenmensch diploma as the final page — not a design-your-own-poster tool.

### 05 · Der Grundriss — **KEEP (small, and it earns its space)** · *new*

**Pitch** — A small floor plan of the seven rooms in the catalogue header; a room lights when its wing completes, and the 25/50/75 % furniture — door sign, reading lamp, velvet rope — is drawn *into* the plan.
**MDA / loop** — *Discovery*, *Fantasy*, *Competence* at a glance. Adds no loop; it gives existing rewards a home and the archive a shape.
**Fiction** — "Der Katalog" is a building with named rooms. A plan is how a visitor learns this is a place and not a list — the cheapest way to make seven names architectural.
**Effort / risk** — **S**. Risk: chrome competing with the progress lines, and the temptation to add a "you are here" token — that makes it a game map and is forbidden; it is a plaque, not a HUD. Second risk: decoration if rooms complete invisibly; it must change visibly on completion or it dies.
**A11y** — `aria-hidden` decorative SVG *plus* the same information in the existing progress lines (never SVG-only); interactive rooms are named buttons with a text list beside the plan; no hover-only reveals; existing milestone announcements carry the events.
**Constraints / sharpened** — Clean; reuses wing colour roles and existing tokens only (Panda token discipline, no new colours), and stays quiet to honour "the card is the only lit object": hairline stroke, one lit room at a time. A header plaque (~240×140) that replaces scattered milestone chrome with one legible object — not a page, not a nav surface.

### 06 · Das Lesetagebuch — **KEEP (trimmed to notable events)** · *seeds 8 + 12*

**Pitch** — A short local reading diary in the archive's voice — wing completions, milestones, the chase card, the diploma — plus a "Katalogbrief" button that turns it into a message for the family chat.
**MDA / loop** — *Relatedness* ▸ *Narrative*. Adds the dimension the collection lacks: time. *"14. März — Der Ruhesaal ist vollständig. Acht von acht gesammelt."*
**Fiction** — An archive keeps an accessions log; a reader keeps a marginal note. Two chronologies, one book — and only one of them is the visitor's.
**Effort / risk** — **S**. Risk: it reads as surveillance if it logs everything. Trimmed hard: **notable events only** — no pack counts, no visit counts, no absences, no "you haven't been here in three weeks" (a guilt mechanic, forbidden). Capped at ~40 entries; reset clears it.
**A11y** — Reversed `<ol>` of `<time>`-stamped items, plain text, no chart; the Katalogbrief is a selectable text block with a copy button and status line, never an image of text.
**Constraints / sharpened** — Clean, but `lucky-elsa.journal.v1` must join the R-E contract and **R7's named-lost list** — the reset copy changes with this feature. **Merges seed 12 (Katalogbrief) in as the share payload** rather than shipping a second social feature: progress, one wing still open, one card recommendation, one term.

### 07 · Die Chronik — **CONDITIONAL (below the line)** · *seed 7*

**Pitch** — A year-grouped chronology of Elsa's life from an optional `date` field, with an explicit "undatiert" tail for everything the curator hasn't dated.
**MDA / loop** — *Narrative*, *Discovery*; the payload is puppy-Elsa beside grown-Elsa, the strongest single feeling available in this archive.
**Fiction** — A museum chronology is one of its oldest exhibits. Perfect fit — that is not the problem.
**Effort / risk** — **M**, and the risk is why it sits below the line: **the value is entirely the dates, and dates are the admin task the owner is least likely to keep.** `photos.php` can attempt EXIF on JPEGs, but the owner's phone shoots HEIC, so most photos need a hand-entered date or land in "undatiert". Mis-dated photos are worse than none.
**A11y** — Year-heading `<ol>` with `<time datetime>`, never a horizontally scrolling timeline widget; the "undatiert" bucket is visible, not a hidden default.
**Constraints / gate** — Clean (a read of the owner's own files, no tracking) but it adds a manifest field and a permanent editorial obligation. **Gate**: ship only if at least ~70 % of the manifest gets dated; otherwise cancel rather than defer, and free the name.

### 08 · Offline-PWA — **DEFER (infrastructure, not a feature)** · *seed 10*

**Pitch** — Installable, shell and thumbnails cached, so the archive opens on a train.
**MDA / loop** — None. It protects access; no aesthetics, no loop.
**Fiction** — Weakest fit of the set: a museum you can carry is nice, but the parlour's fiction is a *place*, not an app.
**Effort / risk** — **M**, and the highest operational risk per unit of delight here. The service worker must never serve a stale manifest, because the owner's whole workflow is *drop photo, reload, see it* — get that wrong once on a family phone and a dropped photo appears to have failed. iOS install is obscure, and with no push the only benefit is a page that already fits in cache.
**A11y** — No new surface, but a stale bundle can serve the wrong language strings, and offline failure must say so in text rather than showing a dead room.
**Constraints / gate** — Permitted, not required. **Revisit trigger**: two independent reports of failed loads on mobile data. Not before.

---

## Killed, explicitly

| Seed | Verdict | Why |
|---|---|---|
| **3 · Karte des Tages** | **KILLED as a surface** | A daily card is an *expiring* card; the brief forbids expiring content and daily rewards, and it makes the calendar the retention driver instead of the curator's accessions — the exact inversion the design refuses. The deterministic mechanism survives as *Elsa-Prognose* on the card back (02), where nothing is missed by not looking. |
| **4 · Card-back unlocks** | **KILLED as a reward** | A cosmetic you only see when you flip is a reward most visitors never see, and it splits the cosmetic grammar ("rarity changes the foil, never the photo"). Milestones already pay out in furniture, and the Grundriss now hosts it. The back survives as an information surface. |
| **6 · Vermisste Karte** | **KILLED outright** | It cannot coexist with the honest walk: a card the deck must deliver cannot be hidden, and a card hidden from the catalogue makes "64 von 64" a lie. It invents a fact about Elsa and hands the solo curator an obligation on a schedule they never agreed to. A secret contradicts this product's whole trust contract. |
| **9 · Tauschcode as dupe sheet** | **FRAMING KILLED** | Dupe counting is an R-K violation; there is no dupe economy and no tradeable scarcity — repeats are *stamps*, not inventory. Mechanism kept as a save pass (03). |
| **12 · Katalogbrief** (own addition) | **MERGED** | Not enough for its own surface; as the Lesetagebuch's share payload it costs nearly nothing and gives the diary a reason to exist. |

---

## Ranking (top 6)

| # | Feature | Aesthetic | Loop layer | Effort | Why here |
|---|---|---|---|---|---|
| 1 | **Sonderausstellung** | Expression, Relatedness | Macro (new verb) | M | The only feature that changes what the visitor *can do*. Converts a readership into curators; the share object is a genuine gift. Best cost-to-charm in the slate. |
| 2 | **Elsa-Lexikon** | Discovery, Expression | Meso + Macro | M | Deepens the thing already good — the voice — and creates the only cross-link loop. Highest ceiling; ships thin (8 terms) without looking broken. |
| 3 | **Katalogausweis** | (trust) | Protects Macro | S/M | Fills a failure the design accepts silently: storage eviction destroys months of reading. Unglamorous, and it must ship *before* the features that ask for more investment. |
| 4 | **Sammelbogen** | Sensation, Expression | Offline | S/M | The only artefact that leaves the browser and reaches Oma. Cheapest emotional win per line of code. |
| 5 | **Grundriss** | Discovery, Fantasy | (carrier) | S | Makes the archive a building and gives the 25/50/75 % furniture one legible home. Identity-bearing, low risk. |
| 6 | **Lesetagebuch** | Relatedness, Narrative | Macro (time) | S | Gives the collection a fourth dimension and produces the Katalogbrief for free. Charm, not mechanics. |
| — | *Chronik* | Narrative | Macro | M | **Below the line**: strongest single feeling in the archive, gated on editorial labour not yet agreed. |
| — | *Offline-PWA* | — | — | M | **Deferred**: infrastructure with the worst operational risk and the least delight. |

**If only one ships, ship #1.** If only two, #1 and #3 — one to make the visitor an author, one to make sure they don't lose what they authored.

---

## The signature feature: **Die Sonderausstellung**

Not the biggest (the Lexikon is), not the cheapest (the Grundriss is). It is the one that would make this
product *talked about*.

**It adds the missing verb.** Every visitor action today is receive-and-read: open, look, collect. The
archive is generous but passive, and a passive archive plateaus at 100 %. Five cards to *hang* turns
completion from an ending into a qualification — you finish the catalogue, then you have something to say
with it.

**It turns a private object social.** The family chat is this product's only distribution and only social
layer (PRD F28/F31). A shared card is a joke; a shared *exhibition* is a position — "these five, and here's
why" — which is a thing people reply to. No feed, no server, no moderation.

**It fits the constraint floor, which is rare.** The exhibition encodes into the fragment browsers never
transmit, so sharing a curated set is invisible even to the host's logs. A static archive has no business
being able to do this; it can, and it costs nothing.

**The moment to design for:** Oma opens a link in the family chat and finds five cards lit in a row under a
wall label — *"Omas Ausstellung · Fünf Karten, alle aus dem Ruhesaal. Der Katalog bittet, nicht zu lange
hinzusehen."* — and walks them with one thumb.

**The one way it fails:** a generic wall label. If the label reads like a template, the exhibition is five
thumbnails with a heading and nobody sends it twice. The label — dominant wing, the selection's shared
traits, one optional line from the sender — *is* the feature. Build it last, test it first.

**How we'll know** (no analytics exists or will): within two weeks, someone sends an exhibition link into
the family chat unasked, and someone replies with a card of their own. We ask; we don't measure.

---

## Sequencing, and what must not happen

1. **Katalogausweis** first — the safety net ships before the features that ask for deeper investment.
2. **Grundriss** and **Sammelbogen** — both S-tier, both identity, both zero risk to the curator loop.
3. **Elsa-Lexikon** — copy sitting first (8 terms), view second; DE and EN authored together so the
   glossary never ships half-translated.
4. **Sonderausstellung** — last of the core six, and only if the kill condition hasn't fired.
5. **Lesetagebuch** — with the R7 reset-copy change in the same PR.
6. **Chronik** only on an explicit dating commitment; **PWA** only on its named trigger.

**What must not happen:** no second completion axis, no second currency-shaped number, no reason to visit on
a schedule, no new thing the owner must maintain weekly. This slate is additive to the *archive*, never to
the *chore* — and none of it ships before the refactor's six steps are done.

## If approved, these cascade

- **`collection-meta.md` R-E / R-J / R7** — `journal.v1` and `exhibitions.v1` join the storage contract and
  the reset list; the confirmation copy must name them.
- **Photos pipeline** — optional `terms` (and `date`, if Chronik is greenlit) passed through by
  `photos.php`; `sharp` untouched.
- **Copy deck** — ~8 exhibition templates, 8–20 terms × 4 strings, ~40 forecast lines, revised reset copy;
  index-aligned DE/EN or it doesn't ship.
- **`accessibility-requirements.md`** — one matrix row per feature; the print route and the
  import-confirmation are the two needing real test cases.
- **`systems-index.md`** — Sonderausstellung and Elsa-Lexikon are Feature/UI-layer systems; the rest are
  presentation additions, not systems.

## Open questions for the owner

1. **Lexikon scope** — 8 seeded terms, or one 20-term sitting? *(Recommendation: 8, then grow by
   accession — the glossary should arrive the way the wings did.)*
2. **Names in exhibition links** — "Kuratiert von Oma" travels in the URL. Acceptable? *(Recommendation:
   optional field, with copy that says plainly the name travels in the link.)*
3. **Sammelbogen unit** — one page per wing, or one for the whole catalogue? *(Recommendation: per wing;
   6–10 slots is the album, 64 is a wall chart.)*
4. **Chronik gate** — will photos get dates at upload? If no, the feature is cancelled, not deferred.
