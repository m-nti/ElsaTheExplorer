# Mechanics Layer — Four Meta Mechanics on the Collection Loop

> **Status**: In Design · **Author**: game-designer · **Last Updated**: 2026-11-22 · **Last Verified**: —
> **Implements pillars**: "There is also no moment. A folder of photos is browsed; a pack is *opened*." (PRD §1) + owner ruling 2026-11-22: the collection is the product.
> **Canonical decisions (2026-11-22)**: reconciled with `design/features/feature-slate.md` § *Canonical decisions*. The slate wins on **scope and naming**; this document wins on **mechanical detail**. In force here: the daily surface is **Der Aushang / The Bulletin** ("Karte des Tages" is retired vocabulary, the spec's filename is historical); card backs are **identity / information surfaces unlocked by milestone state**, not a reward economy; the Sammelbogen is **collected-only by default, 16 per A4 page (4 × 4), flat catalogue order, crest instead of an empty grid at 0**; the Sonderausstellung fragment is **`#ausstellung/1/<comma-joined encodeURIComponent(ids)>` in visitor order**, its storage is **ordered photo ids only**, and **opening a work must not drop the fragment**.
> **Layer**: Meta / Progression · **Priority**: `Alpha` (Der Aushang, Sammelbogen, Sonderausstellung, Kartenrücken) → `Full Vision` (Honorary back)
> **Skills activated**: `design-system` (lenses applied: systems-designer for formulas/edges, qa-lead for acceptance)
> **Designs on top of**: `design/gdd/collection-meta.md` (collection state, wings, milestones, reset), `design/ux/interaction-patterns.md` (patterns reused by name), `design/game-brief.md` build order 1–6.

## Why this layer exists

Four visitor-facing mechanics sit on the existing collection loop without adding a fifth loop, a currency, a timer or a failure state: **Der Aushang** (the read-only daily bulletin, filed as `specs/karte-des-tages.md`), **Sonderausstellung** (a curated, shareable 1–5 card exhibition), **Sammelbogen** (a printable collector's sheet), **Kartenrücken** (identity surfaces unlocked by milestones — information, not a reward). All four are pure functions of the photo manifest, the three collection keys and at most two new *preference* keys. They exist to answer the brief's open question — does the library stay worth a second and third visit — by adding *reading* and *giving* surfaces, never *earning* pressure.

## Shared invariants (binding on all four)

| # | Invariant |
| --- | --- |
| I1 | **Determinism**: no `Math.random()`, no `Date.now()` in any formula except the calendar day. Every pick is a pure function of `(dateKey, manifestStamp, ids, label, k)`. Tests inject date + manifest. |
| I2 | **Read/write separation**: `seen.v2` is written only by the collection module's five verbs (`markSeen, onWingComplete, onMilestone, onAllComplete, resetAll`). **No mechanic here marks a card collected.** |
| I3 | **Derived, never stored**: unlocks, progress, forecast and print content are computed at render. Only *choices* persist (`exhibition.v1`, `cardback.v1`). |
| I4 | **No pressure**: no countdown, no "expires", no streak, no counter that punishes absence, no badge/dot, no locked-item checklist. Missing a day costs nothing and is not mentioned. The calendar in §1 varies **what is read**, never **what is earned**: no card, reward or milestone is gated on a date. |
| I5 | **Bilingual**: every string in `COPY.de` / `COPY.en`, index-aligned. One draw *index* serves both languages — switching language mid-read never re-rolls content. Placeholder sets must match index-by-index (tested). |
| I6 | **Reset**: R-J extended — `lucky-elsa.exhibition.v1` and `lucky-elsa.cardback.v1` join the cleared key set (Phase 5). The confirmation's loss line gains "Sonderausstellung und Kartenrücken" / "special exhibition and card backs" (owner copy decision, see Open Questions). The ratified `reset.body` (copy deck §9) **predates these two keys and does not name them** — it must be extended in the same change that ships them, never earlier; the copy deck stays untouched until then. |
| I7 | **Pack canon (owner, 2026-11-22)**: a pack holds **4 cards** — no duplicate inside it, the unseen-first walk unchanged, ≥1 holo/rare via the existing promotion rule. The holo/rare climax is revealed in **slot 4**, **slot 3** only when a second rare/holo was drawn, and never slot 1. A mid-reveal skip collects **only the cards already revealed** (at most 4). None of the four mechanics may resize, reorder, re-roll or draw from the pack, and none may weaken the skip rule. |

**New storage — the only additions in this document**

```text
lucky-elsa.exhibition.v1 : string[]              // ordered photo ids, 1–5; no envelope, no timestamp; pruned on load
lucky-elsa.cardback.v1   : { active: string }    // chosen back id; validated on read
```

Both follow R-E: JSON parse in try/catch, type-check every field, discard malformed to empty, write atomically per key. Nothing here leaves the browser.

`exhibition.v1` holds **ordered photo ids and nothing else** (canonical decision 4): the `.v1` in the key *is* the version, so there is no `{ v: 1, ids }` envelope and no `updatedAt` — a timestamp is not a fact the product needs, and it would be the only stored trace of *when* a visitor was here. The stored state is always **1–5 ids**: removing the last work **removes the key**, so "absent" and "empty" can never diverge.

## Hash & determinism helpers (shared by Der Aushang and the exhibition title)

```text
h32(s)      = FNV-1a 32-bit over UTF-8 bytes: h = 0x811C9DC5; per byte b: h ^= b; h = (h * 0x01000193) >>> 0
rnd(label,k)= h32("elsa." + label + "|" + seedInput + "|" + k)            // k = 0,1,2… stream index
pick(n,label,k): r = rnd(label,k); limit = 2^32 - (2^32 mod n)
                 while (r >= limit) { k++; r = rnd(label,k) }             // rejection sampling, deterministic
                 return r mod n
```

*Modulo bias is removed by rejection; `n ≤ ~500` so the loop virtually never iterates. Modulo-`n` on a 32-bit hash without rejection is **not** used anywhere.* `seedInput` is per-mechanic (§1: `dateKey|manifestStamp`; §2: `ids.join(",")`). `h32`/`pick` live in one pure module (`lib/hash.ts`), unit-tested against fixed vectors for `""`, `"a"`, a 64-char id and a 200-id pool.

---

## 1 · Der Aushang / The Bulletin + Elsa-Prognose

**Canon (2026-11-22).** The surface is **Der Aushang / The Bulletin**, filed as `specs/karte-des-tages.md` (filename historical); "Karte des Tages" is banned vocabulary (`archive-fiction.md` §6). The slate's kill of **calendar-driven retention** stands and is enforced by I4 — no expiring card, no daily reward, no streak, no "you missed it". The invariant below outranks every surface decision: **the bulletin collects nothing.** Internal identifiers (`elsa.tag.card`, the `tag.*` copy keys) keep their spelling — they are not player-facing.

| | |
| --- | --- |
| **Feel** | A bulletin pinned by the archive door: today's card and today's weather report on one dog. Ten seconds, dry, warm, no obligation. |
| **Loop** | **Macro** (return-visit variation, the one thing that differs between two visits) + **micro** read (~10 s). Touches no meso goal. |
| **SDT** | *Autonomy* (read or ignore — identical outcome), *Competence* (the forecast names the weakest wing = information, never a directive), *Relatedness* (Elsa's voice greets the visitor). |
| **MDA** | Discovery + Narrative. **Not** Challenge, **not** Achievement. |
| **Empty / failure** | Empty manifest → module hidden, existing Empty State speaks (never a "0 of 0" bulletin). 1 card → same card daily, forecast honest ("Bestand: 1 Karte"). Bad clock → UTC date → hidden. No error state exists. |
| **A11y** | `<section aria-labelledby>` + `<h2>`; date as `<time datetime="YYYY-MM-DD">`; three lines as `<ol>`; the card plate is `aria-hidden` decoration (its name is line 1 text). No live-region on load, no auto-update announcement; `visibilitychange` recompute is silent. Contrast on all three lines ≥ 4.5:1. Reduced motion: no entrance animation (or opacity-only ≤100 ms). |
| **Touches** | Pack: **none** (must not consume the unseen pool). Binder: one link "In der Sammlung ansehen" focuses that tile — collection, if the visitor opens it there, happens under existing rules. Detail: never opens from here. |

**Rules**

- **T1 · Pool and pick.** `pool = all manifest ids sorted lexicographically`; `n = pool.length`; `idx = pick(n, "tag.card", 0)`; the day's card is `pool[idx]`. The card is drawn from the **whole catalogue**, not from the walk cursor — the unseen-first pool is a separate structure the module never reads or writes.
- **T2 · Anti-repeat.** `iy = pick(n, "tag.card", 0)` computed with *yesterday's* `dateKey` (pure, no storage). If `idx === iy`, then `idx = (idx + 1) mod n`. `n = 1` → no bump (no alternative exists). `n ≥ 2` → cannot collide. No stored "last card".
- **T3 · Read-only module.** The component may not import `markSeen`, may not render the flip or the lightbox, may not be a catalogue tile (no `?photo` write). Code review + an import-boundary lint rule enforce this.
- **T4 · Three-line forecast.** Banks `sky`, `outlook`, `advice` (≥12 entries each, plus `stock` ×8) in the copy deck; indices `pick(|bank|, "tag.sky"|"tag.outlook"|"tag.advice", 0)`. Labels: "Lage / Conditions", "Aussichten / Outlook", "Amtliche Empfehlung / Official Advice". Line 3 is advice about *reading the archive*, never about returning tomorrow.
- **T5 · `{wing}` substitution.** Line 2 entries may contain `{wing}`. The substituted wing is `argmin p_wing` over wings with `total ≥ 1`, ties broken by the canonical R-A order, then slug. If all wings complete, `{wing}` = the day card's wing, else `new-acquisitions`, else the first canonical wing. **Case safety**: `{wing}` appears only as a standalone label followed by an em dash ("Der Ruhesaal — überwiegend ruhig."), never inside a prepositional phrase, so DE article/case can never break. Placeholder presence must match at the same index in both languages.
- **T6 · Date key.** Local device date, zero-padded `YYYY-MM-DD`. If the year falls outside `[2000, 2100]`, use the UTC date; if still invalid, hide the module. Recompute on load and on `visibilitychange` (no interval, no countdown, no "new in …").
- **T7 · At 100 %.** When `p_all === 1`: line 2 is drawn from `stock` (no `{wing}`), and the eyebrow reads **"Aus dem vollständigen Bestand" / "From the complete holdings"**. Nothing else changes: no extra card, no reward, no storage. `stock` is never used below 100 %. With Zuwachs (99 % after a new photo) the normal banks return immediately.
- **T8 · Register.** Weather-office bureaucratic, about Elsa, never about the visitor: no "come back", no "you should", at most one exclamation mark per surface and never in an error.

**States**: first visit (fully present — no unlock gate) · 0 collected · 1 card · all collected · empty manifest · storage unavailable (identical, nothing stored) · date rollover while open (`visibilitychange` swap, announced nowhere) · mid-read language switch (same indices, new strings).

**Formulas**

| Name | Expression | Variables (range) | Output | Example |
| --- | --- | --- | --- | --- |
| Day card | `pool[pick(n,"tag.card",0) (+1 if equal to yesterday)]` | `n` 1…500 | one photo id | n=64, idx=17 → `pool[17]` |
| `p_all` | from collection-meta | 0…1 | ratio | 30/64 = 0.469 |
| Wing pick | `argmin p_wing`, ties canonical | `p_wing` 0…1 | wing slug | Nap 3/8 vs Garden 4/6 → Nap |
| Estimate | — | — | — | 64 cards → 8 unseen after 1 pack |

**Boundaries walked**: `n=0` → hidden (no division). `n=1` → constant card, no bump. `p_all=0` → weakest wing = any, canonical tie-break → `nap-wing` if it has members. All wings `total=0` (empty manifest) → hidden. `p_all=1` → `stock` only. Yesterday same and `n=1` → same card, no infinite loop.

---

## 2 · Sonderausstellung (curated exhibition, 1–5 cards)

| | |
| --- | --- |
| **Feel** | "I am the curator now." One to five cards from my own collection, in my order, on a placard with a number, sent to the family chat as a small gift — not a to-do. |
| **Loop** | **Meso** (curate in one sitting, 2–5 min) + **macro** (send, receive, compare over weeks). |
| **SDT** | *Autonomy* (which cards, in what order), *Relatedness* (a gift object; the recipient sees the sender's taste), *Competence* (knowing the collection well enough to pick). |
| **MDA** | Expression + Fellowship + Narrative. |
| **Empty / failure** | 0 slots → editor empty state; share disabled until ≥1. All ids missing → gallery hidden, "Diese Ausstellung ist nicht mehr in der Sammlung." + link to the collection (not an error). Version mismatch → no import, view refused, same soft copy. Storage off → editing works in memory, share still works (hash is the truth), draft not persisted. |
| **A11y** | Tray is an `<ol>` with slot buttons; reorder only via real buttons ("Karte 3 nach vorn / Move card 3 forward"); drag is optional enhancement, never the only path. Every add/remove/reorder is announced once ("3 von 5 Karten"). After remove, focus lands on the next slot, else the add control. Read-only view is a `<section aria-labelledby>` (not a dialog), keyboard-reachable, hash arrival announced once. Targets ≥44 px. |
| **Touches** | Binder: "Sonderausstellung kuratieren / Curate an exhibition" in the tools row + "Zur Ausstellung" on collected tiles. Detail: the same add action in the action row. **Pack dialog: none** (the micro-loop stays untouched). Reuses Share Button pattern verbatim. |

**Rules**

- **X1 · Scope.** **1–5 cards, ordered.** The editor offers only `seen.v2 ∩ manifest`; the view renders any *known* id (a curated reprint may show a card no longer in the collection — it is a snapshot, and it is not silently recollected). The stored array is the visitor's order verbatim — no reordering, dedupe or sort on write.
- **X2 · Editing.** Add (cap 5: at cap the add control is disabled and reads "5 von 5"), remove, reorder. Every edit writes `exhibition.v1` immediately through one verb `setExhibition(ids)` — no draft/apply split, no undo (removal is one tap to re-add). No free-text title (X6).
- **X3 · Hash encoding (versioned, compact, tolerant).** `#ausstellung/1/<enc(id)>,<enc(id)>…`, each id `encodeURIComponent`d **before** joining with `,` (so `,`, `/`, `#` inside an id can never break parsing). Parser returns `{status:"ok"|"version"|"none", ids}`: missing/other first segment → `none`; unknown version → `version` with parsed ids retained; >5 → first 5 kept + one quiet line; duplicates → dedupe keeping first; empty ids dropped. **Order is the payload** (canon 2026-11-22): ids are **never sorted** — the visitor's arrangement *is* the exhibition, and a sorted link would make X2's reorder controls meaningless in the one artefact they exist to arrange. Malformed *encoding* (`decodeURIComponent` throws) refuses the whole payload; a well-formed id merely unknown to the manifest is dropped per id with an honest count (X5). Max canonical length = `15 + 5×64 + 4 = 339` chars, far below any browser/host limit.
- **X4 · Read-only shared view.** Hash present on load → the page renders the exhibition view above the collection: placard (X6 title, "{n} von 5 Karten"), the exhibits **in hash order**, actions **Teilen** (Share Button pattern), **Als eigene Ausstellung übernehmen**, **Zur Sammlung**. No edit/remove controls. Opening an exhibit uses the normal lightbox → normal collection (never bypasses the walk; the collection already offers this path) and **must not drop the fragment** (X9). Own hash (equal to the local draft) → shows "Bearbeiten" instead of "Übernehmen".
- **X5 · Import.** Copies resolvable ids into `exhibition.v1` in hash order, compacts slots (no gaps), opens the editor. Missing ids are dropped with one line: "{n} Karten dieser Ausstellung sind nicht mehr in der Sammlung." / "{n} cards in this exhibition are no longer in the collection." 0 resolvable → import disabled with that copy. Version ≠ 1 → no import at all.
- **X6 · Derived title.** `nr = 100 + (h32("elsa.ausstellung.v1|" + ids.join(",")) mod 900)` → **"Sonderausstellung Nr. {nr}" / "Special Exhibition No. {nr}"**. Seeded by the **ordered** ids, so each arrangement numbers itself and two arrangements of the same five are two exhibitions; no input field, no naming decision, no free-text override (owner ruling 2026-11-22).
- **X7 · URL hygiene.** Editing and leaving use `history.replaceState` (no history spam; Back never reopens an editor). **Only the exhibition view's own dismiss or "Zur Sammlung" clears the hash** — no other module may clear it, and the lightbox never touches it (X9). Ids never go in the query string — the fragment is not sent to the server (privacy) and produces no IONOS log line.
- **X8 · Local draft.** `exhibition.v1` is pruned against the manifest on load (E5 consistency), preserving order; the *shared hash* remains the durable record for a renamed photo, which is exactly why X5 reports missing ids.
- **X9 · Fragment preservation (defect fix, owner ruling 2026-11-22).** Opening a work from the shared view previously wrote the lightbox URL in a way that could drop `#ausstellung/1/…`, turning a sent exhibition into a bare catalogue on the recipient's first tap. The rule: **the lightbox's URL writer mutates only the `photo` search param on a `URL` built from `location.href`, and never assigns `location.hash`.** Never rebuild the URL from components (that silently loses the fragment), never call `history.pushState` with a hand-built string.

  ```ts
  const url = new URL(location.href);           // carries search AND hash
  url.searchParams.set("photo", id);            // opening an exhibit
  // on close: url.searchParams.delete("photo");
  history.replaceState(history.state, "", url.href);   // fragment untouched
  ```

  Corollaries: (a) the lightbox never reads the hash as an id — ids come only from X3; (b) no `history.state` snapshot of the route is needed, because the fragment is its own record, so reload and Back both restore the view; (c) `?photo` and `#ausstellung/…` are independent, so a recipient may deep-link a single exhibit *of* an exhibition, and closing it returns to the gallery; (d) "leaving the view" is an exhibition-level action (X7), never a side effect of closing a card.

**States**: editor 0 / 1–4 / 5 slots · shared view ok / partial / all-missing / version-mismatch / self · storage off · language switch mid-edit (indices untouched) · removed photo after sharing (recipient sees partial, sender's draft pruned).

**Formulas**: only X6 (hash above) — no numeric balance. Title range 100–999, `mod` bias irrelevant (cosmetic).

---

## 3 · Sammelbogen (printable collector's sheet)

| | |
| --- | --- |
| **Feel** | The collection leaves the screen: a poster for the fridge, a sheet for Oma, proof that the archive is real. A paper document, not a screenshot. |
| **Loop** | **Macro** (a physical artifact, weeks-to-months horizon) — the only surface that leaves the browser. |
| **SDT** | *Competence* (visible proof of progress), *Relatedness* (a gift object for family), *Autonomy* (choice of what prints). |
| **MDA** | Expression + Fellowship (the sheet is shown to people, not just looked at). |
| **Empty / failure** | **0 collected → still prints a real sheet**: archive crest printed in ink, the honest "0 von {total} gesammelt" line and the instruction line "Noch keine Karten gesammelt — der Bogen füllt sich mit der Sammlung." — **not** an empty grid, and not a disabled button (canon decision 3). Empty *manifest* (`total = 0`) → the print entry point is not offered; the collection's own empty state speaks. Storage off → same as a fresh visit. No error state. |
| **A11y** | Real `<button>` + a real labelled checkbox; the printable content is a *representation* of what already exists on screen, so nothing is print-only; photos keep `alt` = card name; rarity is a printed word, never colour; ink on paper ≫ 4.5:1; heading order preserved. |
| **Touches** | Entry: "Sammelbogen drucken / Print collector's sheet" in the Sammlung tools row (never inside a dialog). Reads the collection store; **writes nothing**. Pack and detail unaffected. |

**Rules**

- **P1 · What prints.** Header: "Sammelbogen / Collector's Sheet", brand, "Sammlung I · {collected} von {total} gesammelt", print date. Then **one flat run of cards in canonical catalogue order** (R-A numbering — the same sequence the binder shows), never per-wing sections or sub-headings; each card carries its **room name as a label** beside number, name and rarity word, so the rooms stay legible without fragmenting the sheet (canon decision 3). Footer: "Fantasiewerte · nur zum Spaß" is **not** printed (stats are not printed); instead the deck-walk line "Jede Karte kommt dran, bevor eine wieder auftaucht." / "Every card gets a turn before any come back around."
- **P2 · What is selected.** Collected cards only by default. One labelled checkbox beside the print control — "Noch nicht gesammelte als Platzhalter / Include not-yet-collected as placeholders" — **default off, session-only (not persisted), and never printed (it is a control, P4)**. When on, not-yet-collected cards join the same flat run in catalogue order as silhouettes labelled "noch nicht gesammelt / not yet collected". The default artifact is a trophy, not a checklist; the checklist must be asked for (canon decision 3).
- **P3 · Paper and layout (one number, fixed).** `@page { size: A4 portrait; margin: 12mm }`; **16 cards per A4 page, 4 × 4**: `grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4mm`, cell 43 mm × 58 mm (≈ 48 mm photo + 10 mm caption), which fits 186 mm × 247 mm of live area. Pagination is **chunked in the DOM, not left to the browser**: each `.print-page` wrapper holds exactly 16 cells, so `p = max(1, ceil(n / 16))` is true on paper as well as in the button copy. A3/landscape are a verified *reflow* of the same 16-cell chunk — no second stylesheet and no second count. Button copy: "Sammelbogen drucken · {n} Karten · ca. {p} Seiten".
- **P4 · Hidden in print.** Masthead nav, DE/EN + sound toggles, reset, Der Aushang, exhibition editor/actions, pack seal + primary CTA, all dialogs, `kbd` hints, share/print buttons, **the placeholder toggle**, progress-bar *fill* (count text stays), skip link, live region, footer nav, unseen tiles (unless P2). Mechanism: `.no-print { display: none !important }` plus a `@media print` block.
- **P5 · Paper palette (inverts the parlour).** Warm paper `#f7f4ee`, ink `#1c1a20` (the same two scoped tokens the spec declares, so there is one palette, not two), 0.4pt rules, photos in colour. **No** background-image, gradient, shadow, filter or transform anywhere in print; `print-color-adjust: exact` **only** on `<img>`, never on surfaces. Rationale: the parlour's near-black surfaces would flood the sheet with ink and print as mud.
- **P6 · CSS print constraints.** `break-inside: avoid` on cells and page wrappers; `break-after: avoid` on headings; `orphans: 3; widows: 3`; `overflow: visible` and `height: auto` / `min-height: 0` on every `100svh` or scroll container (the classic clipped-page bug); kill `position: fixed`, transforms, filters; sizes in mm/pt; `a[href]::after { content: none }`; the print view runs at ≥ 2× thumbnail density (43 mm ≈ 508 px at 300 dpi — the existing 2× sharp thumb covers it; a narrower thumb prints `object-fit: cover` at reduced sharpness and never as a blank cell).
- **P7 · No write path.** The sheet is a projection; printing cannot alter state, and `window.print()` is called on the same page (no popup, no new tab).

---

## 4 · Kartenrücken (identity surfaces, unlocked by milestones)

**Canon (2026-11-22).** These are **identity / information surfaces**, not a reward economy. The slate's kill of *card-back unlocks as a reward* stands; the surfaces themselves are kept. Concretely forbidden: any currency or unlock cost; a "next back" progress bar or count; a back that changes play, odds or rarity; a locked back that is named, counted, greyed or teased on **any** surface; a badge or "neu" dot; an auto-switch on unlock; and any back whose only purpose is to be collected. The back's original job is information — number, term, forecast — and the material is that same object, worn.

| | |
| --- | --- |
| **Feel** | The back of the card is a small private museum object — a door sign, a lamp, a velvet rope — and it says what this collection *is*. Choosing one is identity and taste, never power, never a purchase. |
| **Loop** | **Macro**, as identity rather than payoff: the back *records* a milestone already earned (`sets.v1`, `flags.milestones`), one-way within a reset cycle. It opens no loop of its own. |
| **SDT** | *Autonomy* (which back, or the default one), *Competence* (a back names a milestone without scoring it), *Relatedness* (a wing seal says "I finished that room"). |
| **MDA** | Expression + Discovery. **Not** Achievement, not collection-completion. |
| **Empty / failure** | Fresh reset → exactly `registry` unlocked; the picker still shows (one radio + the quiet line) rather than hiding — discoverable, no dead control. Storage off → selection is session-only in memory, no error. Unknown/future back id → `registry` silently. |
| **A11y** | `<dialog>` with `<fieldset>` + `<legend>` ("Kartenrücken / Card backs"), real radios, text labels; the preview prints the back's **name** on the specimen so the choice is never colour-only; each back's printed name ≥ 4.5:1; flip announcement becomes "Rückseite: Samtband." / "Card back: Velvet Rope."; focus returns to the tools-row trigger on close. |
| **Touches** | Binder tools row (picker), Card Flip / lightbox back face (display), Sonderausstellung placard (material). Not on tiles, not on pack cards, not in print (P4/P5). |

**Unlock table** (unlocks derived from R-E state — never stored, per I3/R-C)

| id | Unlocked when | DE / EN name | Note |
| --- | --- | --- | --- |
| `registry` | always | Registerkarte / Index Card | default + fallback |
| `sign` | `flags.milestones` ∋ `"25"` | Vergoldetes Türschild / Gilded Door Sign | echoes the R-F outfit |
| `lamp` | ∋ `"50"` | Leselampe / Reading Lamp | echoes the R-F outfit |
| `rope` | ∋ `"75"` | Samtband / Velvet Rope | echoes the R-F outfit |
| `seal:<wing>` | `sets.v1[wing]` exists (any completion this reset cycle) | Siegel: {wing} / Seal: {wing} | six variants, one CSS recipe by wing colour role; `new-acquisitions` earns **none** (matches R-A) |
| `honorary` | `flags.masterIndex === true` | Ehrenmensch / Honorary Human | Phase 6 |

- **K1 · Storage.** `lucky-elsa.cardback.v1 : { active: string }`. On read: `active ∈ unlocked()` else `registry`; rewrite **only** on the next user selection (never on read — a read must not mutate). Reset clears it (I6).
- **K2 · Picker.** "Kartenrücken" in the Sammlung tools row → native `<dialog>`. Lists **unlocked backs only** — locked ones are never listed, never counted, never greyed, never named, never teased, in the DOM or in the accessibility tree. One quiet line: "Weitere Rücken erscheinen mit der Sammlung." / "More backs appear as the collection grows." Selection writes immediately, closes, focus returns.
- **K3 · Surfaces.** (a) lightbox back face (Card Flip; the back's name joins the aria-label); (b) the picker's static preview; (c) the Sonderausstellung placard uses the active back as its material. Nowhere else.
- **K4 · No auto-switch, no badge.** An unlock never changes the active back, never adds a dot or "neu", never fires a second chime — the milestone announcement (R-D/R4) is the only event. The new back is simply present next time the picker opens. **An unlock is not an event the product celebrates**: no toast, no "freigeschaltet", no list of what remains.
- **K5 · Reduced motion.** The back is a static pattern at all times: no foil drift, no pointer tilt on the back face, flip becomes an instant swap ≤100 ms (inherits Card Flip's fallback), preview static. No unlock animation exists by design.
- **K6 · Fallback chain.** requested → `registry`; storage off → in-memory only; malformed key → `registry` and the key is left for the next write.

---

## Dependency & ship order

| # | Mechanic | Ships in (game-brief build order) | Hard dependencies | New keys | Reset change |
| --- | --- | --- | --- | --- | --- |
| 1 | Der Aushang | **Phase 4** (needs wings for `{wing}`) | `manifestStamp`, `p_wing`/`p_all`, copy deck, i18n | — | none |
| 2 | Sammelbogen | **Phase 4** (flat order + room labels; independent of milestones) | seen-set, catalogue order + numbering, 2× thumbs, print CSS | — | none |
| 3 | Sonderausstellung | **Phase 5** | binder, card detail, Share Button pattern, hash parser | `exhibition.v1` | **yes** |
| 4 | Kartenrücken (wing seals land with 4→5) | **Phase 5** | `sets.v1`, `flags.milestones`, lightbox flip, picker | `cardback.v1` | **yes** |
| 5 | Honorary back | **Phase 6** | `flags.masterIndex` | — | (covered by 4) |

Order rationale: 1 and 2 are read-only projections and can land as soon as wings exist (Phase 4) without touching storage — shipping the reading and gift surfaces before the identity surfaces keeps the archive's *reading* ahead of its *furnishing*, and neither touches the walk. 3 and 4 introduce the only new keys and therefore must ship *with* the R-J/reset extension and the confirmation copy change; they wait for Phase 5. Nothing here may ship before the Phase-3 copy swap ("gesehen" → "gesammelt"), or every new string would encode the retired verb.

**Pattern-library debt (governance):** `design/ux/interaction-patterns.md` requires new interactions to be proposed there before a screen spec uses them. Three entries are needed before the Phase-4/5 screen specs: **Bulletin** (*Der Aushang*: static read-only section), **Exhibition Tray** (add/remove/reorder list with a11y reorder), **Print Sheet** (what prints / what is hidden / paper palette). None of the three may be implemented as a one-off in a screen spec. **A fourth is owed by X9**: the lightbox's URL write must be stated in `interaction-patterns.md` as *"mutate the `photo` search param on a `URL` built from `location.href`; never assign `location.hash`"*, so the pattern and the spec cannot drift apart again.

## Top 3 risks

1. **Der Aushang short-circuits the deck walk** — the moment any surface of it marks a card collected or draws from the unseen pool, the archive's moral spine is gone. Mitigation: import-boundary lint (no `markSeen`), no flip/lightbox, a 30-date Vitest asserting `seen.v2` is byte-identical, and a review checklist item on the module.
2. **Print fidelity** — the parlour is a dark, gradient-and-foil page; printed naively it floods ink or clips. Mitigation: paper palette, `print-color-adjust` only on photos, `overflow: visible` on scroll containers, and Playwright PDF snapshots at A4 portrait, A3 and landscape as a CI gate.
3. **Identity backs turn into a checklist** — listing locked backs, adding "neu" dots or auto-switching would reintroduce exactly the to-do pressure R-K forbids, and would re-open the reward framing the owner retired. Mitigation: unlocked-only listing, no badge, no auto-switch, no count, one quiet line; experiential probe "does anyone ask what the other backs are?" — a yes is a pass (curiosity), a *worry* about earning them is a fail.

## Acceptance criteria

**Functional (Vitest unless noted; GIVEN / WHEN / THEN, boundary included)**

1. GIVEN a fixed `dateKey` + `manifestStamp`, WHEN Der Aushang renders twice, THEN the same id and the same three indices, in DE and in EN.
2. GIVEN 30 consecutive dates over a 64-card manifest, WHEN Der Aushang renders daily, THEN `seen.v2` is unchanged after all 30 (the bulletin never collects).
3. GIVEN `n ≥ 2`, WHEN two consecutive days render, THEN the card ids differ (T2 bump); GIVEN `n = 1`, THEN the same id twice and no loop.
4. GIVEN `p_all < 1`, WHEN line 2 renders, THEN `stock` is never selected; GIVEN `p_all = 1`, THEN line 2 comes from `stock` and the eyebrow is the 100 % string.
5. GIVEN a device year of 1999 or 2200, WHEN Der Aushang resolves the date, THEN it uses UTC; GIVEN an invalid `Date`, THEN the module is absent and no exception is logged.
6. GIVEN five ids, WHEN encoded and parsed, THEN the ordered id array round-trips; GIVEN a `,` or `/` inside an id, THEN parsing still yields that exact id (X3).
7. GIVEN one unknown id in a 5-card hash, WHEN the shared view opens, THEN 4 exhibits render, "1 von 5" is announced, and import copies 4 (X5).
8. GIVEN version `2`, WHEN the hash is opened, THEN no import button exists and the version notice shows; GIVEN 7 ids or duplicates, THEN output is deduped and capped at 5 with one notice.
9. GIVEN a hash on load, WHEN the page loads, THEN no request carries the ids (hash only; Playwright network log asserts a clean query string).
10. GIVEN 0 collected, WHEN print is invoked, THEN the PDF contains the header + "0 von {total}", the crest and the instruction line, and **no card grid**; GIVEN 12 collected, THEN all 12 fit on one 16-cell page (`ceil(12/16) = 1`); GIVEN 17 collected, THEN 2 pages (16 + 1).
11. GIVEN print output, WHEN inspected, THEN no nav, dialog, CTA, `kbd`, placeholder toggle, foil layer or gradient is present, and no horizontal overflow exists at A4/A3/landscape.
12. GIVEN `flags.milestones = ["25","50"]` and no wing snapshot, WHEN `unlocked()` runs, THEN it is exactly `[registry, sign, lamp]`; GIVEN one wing snapshot, THEN that seal is added; GIVEN `cardback.active = "nope"`, THEN `registry` renders and the key is not rewritten; GIVEN `rope` is still locked, WHEN any surface renders, THEN the string "Samtband" appears nowhere in the DOM or the accessibility tree.
13. GIVEN reset, WHEN it completes, THEN `exhibition.v1` and `cardback.v1` are gone and the picker shows only `registry`.
14. GIVEN reduced motion, WHEN the lightbox flips, THEN the back swaps in ≤100 ms with no tilt or drift and the back's name is announced.
15. GIVEN 5 ids in visitor order A,B,C,D,E, WHEN the link is copied and reopened, THEN the gallery renders A,B,C,D,E and never a sorted order; GIVEN the same five arranged twice, THEN the two hashes differ and the two derived numbers differ (X3/X6).
16. GIVEN a shared exhibition URL, WHEN an exhibit is opened in the lightbox and closed, THEN `location.hash` is byte-identical before and after, `?photo` is present while open and absent after close, and the gallery is still rendered (X9); GIVEN the same on reload with `?photo` still set, THEN the lightbox opens over the gallery and the hash survives.

**Experiential (playtest 3–5 people, once, do not explain — PRD M5/M6)**

17. Two of three visitors read the Prognose unprompted and smile once; nobody asks whether missing a day costs something.
18. One visitor shares an exhibition unprompted; the recipient understands it as a gift, not a task, and does not ask "what do I have to do"; the recipient opens a single work and returns to the gallery without losing it.
19. A printed Sammelbogen is kept (fridge/wall/desk) within a week, or a tester asks to print one without being shown the button.
20. Nobody asks which card backs are still locked; someone does pick a back and can name it afterwards.
21. GIVEN ≥ 4 unseen photos, WHEN each of the four mechanics is exercised in turn (bulletin render, print, exhibition share, card-back selection), THEN the next pack still draws exactly 4 distinct photos in unseen-first order with ≥ 1 rare/holo, in the canon reveal order (climax in slot 4, slot 1 never the climax), and a mid-reveal skip still collects only the cards already revealed (I7).

## Open Questions

1. **Reset copy (owner):** extend the R7 loss line with "Sonderausstellung und Kartenrücken" — or keep the line short and let the keys clear silently? *(Recommendation: extend — R-J's promise is that the line names what is lost.)*
2. **Placement of Der Aushang (owner/ux):** the stage has exactly one primary action (the pack). *(Recommendation: a quiet bulletin strip in the Sammlung header, so the daily read never competes with the pack; revisit if playtests never find it.)*
3. **Der Aushang card face (art-director):** reuse the exhibit card front, or a dedicated bulletin plate (narrower, no stat chips)? *(Recommendation: a distinct plate — it must not read as a collectible the visitor can open.)*
4. **Exhibition title** — **Resolved 2026-11-22 (owner ruling):** derived number only. No free-text field, no optional override, no moderation, no empty-title state.
5. **Print default** — **Resolved 2026-11-22 (canon decision 3):** collected-only, placeholders off by default, session-only toggle. The crest page replaces the empty grid at 0.
