# Copy Deck — Elsa the Explorer (DE/EN, canonical)

> **Status**: Draft — consolidated from the refactor documents, awaiting owner sign-off
> **Author**: writer (consolidation), from docs authored by owner + ux-designer + game-designer
> **Last Updated**: 2026-11-22
> **Canonical for**: every player-facing string in the refactor. Where another document
> quotes copy, that quote is illustrative; this deck is the string of record.
> **Sources (read-only harvest)**: `design/game-brief.md`, `design/gdd/collection-meta.md`,
> `design/ux/interaction-patterns.md`, `design/player-journey.md`,
> `design/ux/stage-landing.md`, `design/ux/pack-opening.md`,
> `design/ux/card-detail.md`, `design/ux/binder.md`,
> plus `design/accessibility-requirements.md` (a11y strings) and
> `design/art/art-bible.md` §7 (voice and type context only).
> **Precedence when documents disagree**: (1) owner rulings → (2) pattern library
> (`design/ux/interaction-patterns.md`) → (3) GDD (`design/gdd/collection-meta.md`) →
> (4) screen specs and journey. Every applied resolution is listed in §11.

---

## 0. How to use this deck

### 0.1 String discipline

- One key, one meaning, one string per language. **Never duplicate a string under a
  second key** — duplicate keys drift. Where a screen needs the same text at a smaller
  size (masthead count, serial foot), render the *same key*, do not mint a new one.
- `COPY.de` and `COPY.en` are index-aligned: a key missing in either language is a build
  defect, not a translation backlog (`localize` validate: 0 untranslated).
- Placeholders are named, never positional. No string embeds a separator, currency or
  date format; numbers and dates are formatted at render time (`Intl.NumberFormat`,
  `Intl.DateTimeFormat`) with the page language — DE `1.000`, EN `1,000`.
- Strings marked **PROPOSED** are written by this deck because no source document supplies
  them; they need an owner yes/no before build. Strings marked **NO STRING** are recorded
  as a deliberate silence so nobody "helpfully" adds an error message later.
- Strings marked **re-voiced 2026-11-22** were rewritten under the owner voice ruling
  (playful, warm, tongue-in-cheek). Their before/after pairs are collected in §15 so a
  propagation pass can follow one table instead of diffing the whole deck.

### 0.2 Source legend

| Code | Document |
| --- | --- |
| **BR** | `design/game-brief.md` (incl. owner decisions this round) |
| **GDD** | `design/gdd/collection-meta.md` |
| **PL** | `design/ux/interaction-patterns.md` (pattern library — canon for emitted copy) |
| **STG** | `design/ux/stage-landing.md` |
| **PCK** | `design/ux/pack-opening.md` |
| **CRD** | `design/ux/card-detail.md` |
| **BND** | `design/ux/binder.md` |
| **JRN** | `design/player-journey.md` |
| **A11Y** | `design/accessibility-requirements.md` |
| **EN new** | English written here because the source gives only German; same meaning, same register |
| **PROPOSED** | New string, no source; needs owner sign-off |
| **VOICE** | Owner voice ruling 2026-11-22 (playful/warm register; supersedes the zero-exclamation rule, §0.4) |

### 0.3 Verb and badge canon (binding)

| Meaning | DE | EN | Never |
| --- | --- | --- | --- |
| Progress verb | **gesammelt** | **collected** | ~~katalogisiert / catalogued~~ |
| Collected tile state | **gesammelt** | **collected** | ~~gesehen / seen~~ |
| Unseen tile state | **noch nicht gesammelt** | **not yet collected** | ~~ungesehen / unseen~~ |
| Location badge (not a state) | **In der Sammlung** | **In the collection** | used as a state verb |
| Collection | **Die Sammlung** | **The Collection** | ~~Sammelheft / binder / Heft~~ — no exception anywhere, including the Zuwachs line (§13). **Renamed 2026-11-22 (D-04b):** the former name `Katalog` / `Catalogue` is retired (§14) |
| Second-lap stamp | **2. Auflage** | **Second edition** | ~~2nd printing~~ |
| Brand | **Elsa the Explorer** | **Elsa the Explorer** | translated in either language |
| Pack size | **vier Karten** | **four cards** | ~~fünf / five~~ — **4-card canon 2026-11-22** (mobile-first); the holo/rare still lands late, now 3rd or 4th |

### 0.4 Voice law (checked line by line)

**Supersedes the 2026-11-22 zero-exclamation rule** (owner voice ruling, 2026-11-22). The
archive is not a solemn institution. It is the voice of a household that has decided its
rescued dog deserves a museum — and says so out loud, at the door, to anyone passing. The
museum apparatus stays exactly as it is *because* the household takes it far too seriously;
that is the joke, and it is a fond one.

1. **Playful, warm, tongue-in-cheek.** Fondness first: the house is devoted to Elsa and
   slightly ridiculous about her. Dry wit is the default setting. Open delight is allowed —
   an arrival may be announced with pleasure (that is what the Zuwachs line is for).
2. **Never corporate-cheerful, never sarcastic at Elsa's expense.** No motivational uplift,
   no "Juhu", no exclamation-stacked UI, no emoji — and no joke whose butt is the dog. The
   reader laughs *with* the household's devotion, never at the animal.
3. German is **du** throughout. No "Sie". English mirrors the **playfulness**, not the words:
   same warmth, same wink; idioms are re-made, never translated word for word.
4. **Exclamation marks: allowed sparingly — at most one per surface, and never in an error
   string, a destructive confirmation, or an accessibility string** (alt text, aria label or
   accessible name, live-region announcement). This **supersedes** the earlier zero-exclamation
   rule, which is retired (§13). The grep gate now checks ≤ 1 per string, not = 0.
5. **No water content** (canon, owner ruling 2026-11-22). Elsa hates water: no wet dog, rain,
   mud, bathing, puddles, towelling, "nass" — not in a card, a copy line, or a joke. The
   retired card-bank water jokes stay retired (§13).
6. **No fake Greek.** The Antiquity apparatus is fiction, not texture: no transliterated
   Greek, no invented inscriptions, no "ancient" lettering used as ornament
   (`design/narrative/greek-origin.md`).
7. **Rescue honored, never mocked.** Elsa was chosen; the copy may be proud of her and
   absurdly devoted to her, but it never jokes about where she was before, never pities her,
   and never treats her as damaged.
8. **The museum is a game, not an institution.** Plaques, wings, accessions, editions and the
   collection all stay — the household is in earnest about them, which is the joke — but the
   deck never scolds, never sounds like a compliance notice, and never charges admission.
9. **No marketing voice, no gift framing.** The collection is the product, the visitor is its
   reader. Nothing is "for you" (in the gifting sense) and nothing is a surprise.
10. **No gambling flavour.** No odds, "ultra rare", "luck", urgency, countdown or streak. The
    deck-walk guarantee is stated plainly and once.
11. **Every state change has a text carrier;** decoration (foil, frames, stamps, outfits)
    never carries meaning alone.

**Register anchors** — one noun per job. The propagation pass should not swap these:

| Noun | DE / EN | Used for | Never for |
| --- | --- | --- | --- |
| The object | Karte / card | mechanics, counts, summaries (`pack.summary`), alt text | celebration lines |
| The arrival | Schmuckstück / treasure | arrivals, the empty collection, the collection lede — the affectionate noun | a rarity, a stat, a price |
| The collection | Die Sammlung / The Collection | the whole, always this name (§0.3) | "Heft", "binder", a second name |
| The institution | das Haus / the house | the fiction's voice — plaques, rules, admissions | the brand name |

### 0.5 Character budget policy

- **Max** = absolute ceiling for the rendered string, digits counted as 1 character.
  Where a source document states a budget it is cited; where none exists the cap is
  `ceil(len(EN) × 1.4)` and marked *derived*.
- German is the **layout driver**, not English: the 40 % expansion allowance is measured
  from the EN baseline, and German usually spends it. Space-critical rows carry the check.
- Two source budgets were too small for their own canon string and are raised here with
  the reason recorded (§11, D19 and D20).
- Rows re-voiced 2026-11-22 re-derive their cap from the **new** EN baseline (same
  `ceil(len(EN) × 1.4)` rule). Where a cap moved, the row records old → new: a cap that no
  longer matches its own string stops catching anything.
- Casing: sentence case in prose; CSS supplies the small-caps tracking on eyebrows. Never
  bake `text-transform` casing into a string.

### 0.6 Placeholders

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `{n}` | integer count (collected, positions, cards in a haul) | `14` |
| `{total}` | integer total in the current manifest | `24` |
| `{name}` | the card's printed name | `Wächterin der Keksdose` |
| `{names}` | card names joined with `, ` (last two joined with the language's "und"/"and") | `A, B und C` |
| `{set}` | wing display name or short name per the site note | `Der Ruhesaal` / `Ruhesaal` |
| `{rarity}` | one of the three rarity labels | `Holo-Pracht` |
| `{pct}` | milestone percentage, bare integer | `25` |
| `{outfit}` | the milestone's outfit clause | `das Türschild ist vergoldet` |
| `{mood}` | the card's mood word | `messiwoll` |
| `{key}` / `{value}` | one Fantasiewert key and its 0–10 value | `Naps` / `9` |
| `{note}` | the photo's own "Im Bild" note | `Elsa am Beet` |
| `{date}` | localised completion date, formatted at render | `22.11.2026` |
| `{lap}` | lap number at completion | `2` |

**Singleton rule**: when `{n}` is 1, use the `.one` variant of the string (`pack.summary.one`).
No string may be assembled by concatenating a noun with a count.

---

## 1. Brand and meta

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `brand.name` | Elsa the Explorer | Elsa the Explorer | 40 | n/a — untranslated in both, owner canon | BR |
| `brand.tagline` | Das Leben einer Hündin, die weiß, dass sie wichtig ist. | The life of a dog who knows she is important. | 60 | page-hero line, wraps freely; DE 55 / EN 47. **re-voiced 2026-11-22** · VOICE | BR (EN new) |
| `meta.title` | Elsa the Explorer — Das Kartenwerk | Elsa the Explorer — The Card Library | 60 | browser tab truncates ≈ 55; brand first so the cut is safe | STG §13 |
| `meta.description` | Ein Kartenarchiv für eine sehr wichtige Hündin: Pack öffnen, vier Karten lesen, die Sammlung füllen. Sechs Säle, ein Hauptporträt. Ohne Konto, ohne Tracking. | A card archive for a very important dog: open a pack, read four cards, fill the collection. Six rooms, one Portrait of Record. No account, no tracking. | 160 | search/social snippet; **4-card canon 2026-11-22**. Measured DE 157 / EN 150 — the pre-pass note said 152 / 151, a miscount, and DE was already 1 over the old 155 cap; cap raised **155 → 160** rather than cutting "sehr wichtige Hündin", which is the voice. **re-voiced 2026-11-22** · VOICE; **renamed 2026-11-22** (D-04b) | PROPOSED (STG requires OG tags but supplies no prose) |
| `meta.og.site_name` | Elsa the Explorer | Elsa the Explorer | 40 | reuses `brand.name` | BR |
| `meta.og.locale` | de_DE | en_GB | 5 | machine value, not prose | STG |
| `meta.html.lang` | de | en | 2 | machine value; drives pronunciation | A11Y |
| `stage.eyebrow` | Sammlung I | Collection I | 20 | tracked 10px caps; DE leads; D-04b rename, "1. Auflage" remains the stamp and the seal only | BR (owner decision) |

> `og:title` = `meta.title`; `og:description` = `meta.description`; `og:image` carries no
> text (art bible §8 owns the asset). Document `<title>` is `meta.title` and updates on
> language switch (STG §14).

---

## 2. Navigation and controls

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `nav.wordmark` | Elsa the Explorer | Elsa the Explorer | 40 | visible text; the link's accessible name adds the destination via `nav.wordmark.aria` | BR |
| `nav.wordmark.aria` | Elsa the Explorer — zum Eingang | Elsa the Explorer — to the entrance | 44 | n/a | PROPOSED |
| `nav.skip` | Direkt zum Pack | Skip to the pack | 20 | first tab stop; label must equal destination | STG §12 (EN new) |
| `nav.catalogue` | Zur Sammlung | To the collection | 22 | masthead + stage link + pack footer, one key (D-04b: label renamed, key unchanged) | STG, PCK |
| `nav.lang.group` | Sprache | Language | 12 | group label for the pressed pair | PL |
| `nav.lang.de` | DE | DE | 2 | never localised | PL |
| `nav.lang.de.aria` | Deutsch | German | 10 | each button carries its own `lang` | PL (EN new) |
| `nav.lang.en` | EN | EN | 2 | never localised | PL |
| `nav.lang.en.aria` | Englisch | English | 10 | | PL (EN new) |
| `nav.sound.on` | Ton an | Sound on | 10 | visible state word, never icon-only | PL |
| `nav.sound.off` | Ton aus | Sound off | 10 | | PL |
| `nav.sound.aria` | Ton | Sound | 8 | state lives in the visible label and `aria-pressed` | PL |
| `nav.view.group` | Ansicht | View | 10 | segmented pair label | PL |
| `nav.view.all` | Alle Karten | All cards | 14 | **space-critical** — segmented half at 320px; DE 12 / EN 10, +40 % of EN = 14 = cap | PL |
| `nav.view.rooms` | Nach Räumen | By room | 14 | **space-critical** — DE 12 is the driver, +40 % of EN (7) = 10 < 12 | PL |
| `nav.close.pack` | Pack schließen | Close pack | 18 | icon button's accessible name only | PL |
| `nav.close.card` | Diese Karte schließen | Close this card | 24 | distinct from the pack label — closing a haul and closing an exhibit are different acts | PL |
| `nav.card.prev` | Vorherige Karte | Previous card | 18 | chevron accessible name | PL |
| `nav.card.next` | Nächste Karte | Next card | 14 | chevron accessible name | PL |

---

## 3. Landing / entrance

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `stage.h1` | Was steckt in der Sammlung? | What's in the collection? | 40 | rendered only via its two halves below. Renamed 2026-11-22 (D-04b) from the owner-canon "im Katalog" form — the question is unchanged, only the entity's name | STG §13 (owner canon) |
| `stage.h1.line1` | Was steckt | What's in | 13 | **space-critical** — fixed two-line H1; DE 10, +40 % of EN (9) = 13 = cap | STG §13 |
| `stage.h1.line2` | in der Sammlung? | the collection? | 21 | **space-critical** — DE 17 is the driver, +40 % of EN (15) = 21; cap **19 → 21** re-derived after D-04b (a third wrapped line is the fallback) | STG §13 |
| `stage.tagline` | see `brand.tagline` | see `brand.tagline` | — | same key, no duplicate | BR |
| `stage.lede` | Vier Karten pro Pack, mindestens eine glänzt. Jede kommt einmal dran, bevor eine wiederkommt — Ordnung muss sein. | Four cards per pack, at least one shines. Every card comes up before any repeats — as is only proper. | 120 | DE 113 / EN 101 (re-measured 2026-11-22; the earlier 114/103 note was a miscount). "Vier / Four" costs nothing on the cap. **4-card canon 2026-11-22**. wraps to 4 lines max. **re-voiced 2026-11-22** · VOICE | PROPOSED from BR hooks + PL progress note |
| `stage.cta` | Pack öffnen | Open a pack | 16 | **space-critical** — DE 11 / EN 11; button grows horizontally, min-height fixed | STG, PL |
| `stage.cta.busy` | Pack wird geöffnet | Opening the pack | 20 | **space-critical** — DE 18 exceeds the 16 budget of the idle label; the button grows, never truncates | PL |
| `stage.cta.empty` | Noch keine Karten | No cards yet | 18 | **space-critical** — disabled state must change text, not only opacity | PL |
| `stage.seal.aria` | Ein Pack Elsa-Karten öffnen | Open a pack of Elsa cards | 40 | the seal is the largest target on the page; never an unlabelled image button | PL |
| `stage.seal.edition` | 1. Auflage | 1st edition | 17 | **space-critical** — printed on the seal art; letter-spacing steps down before wrapping | STG §13 |
| `stage.hint` | Drück `P`, um ein Pack zu öffnen. | Press `P` to open a pack. | 60 | `<kbd>` wraps only the key glyph; DE 31 / EN 29 | PL |
| `progress.overall` | Du hast {n} von {total} gesammelt. | You have collected {n} of {total}. | 36 + digits | **space-critical** — DE 28 with two-digit n/total; wraps to 2 lines max, number never truncates | PL, STG |
| `progress.masthead` | see `progress.overall` | see `progress.overall` | 18 + ellipsis | **space-critical** — same key, truncated by CSS inside the masthead span, full string in `title` | STG §5.3 |
| `progress.note` | Jede Karte kommt dran, bevor eine wieder auftaucht. | Every card gets a turn before any come back around. | 82 | DE 51 / EN 51; wraps to 3 lines | PL |
| `zuwachs.line` | {n} neue Schmuckstücke sind da! | {n} new treasures have arrived! | 44 | **space-critical** — DE 30 / EN 31; wraps to 2 lines. Cap **47 → 44**, re-derived from the new EN baseline (31 × 1.4); the old 47 described the retired string. The count-free variants and both "… hat Zuwachs" forms are retired (D5). The single `!` is this row's one exclamation; §8 renders it neutralised on the announcement path (D26). **re-voiced 2026-11-22** · VOICE | GDD R8, superseded by the owner voice ruling (D5) |
| `zuwachs.line.one` | 1 neues Schmuckstück ist da! | 1 new treasure has arrived! | 34 | Singular variant used at `{n}` = 1 (German "1 neue Schmuckstücke" is ungrammatical); same voice, same single `!`, same neutralisation rule. **re-voiced 2026-11-22** · VOICE | adds singular agreement to `zuwachs.line` |
| `demo.note` | Das hier sind Beispielkarten. Die echten Fotos fehlen noch. | These are sample cards. The real photos are not in yet. | 100 | DE 58 / EN 55 | PL, STG |
| `demo.mixed` | **PROPOSED** Manche Karten sind noch Beispielkarten. | **PROPOSED** Some cards are still samples. | 60 | one line above the grid; needs owner sign-off (no source string exists) | PROPOSED |

---

## 4. Pack opening

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `pack.dialog.title` | Dein Neuzugang | Your new arrival | 17 | **space-critical** — `aria-labelledby` target, single-line flex head; cap raised from 15 (D19) | PL, PCK |
| `pack.eyebrow` | 1. Auflage · vier frische Karten | 1st edition · four fresh cards | 34 | **space-critical** — DE 32 / EN 30 (measured; "vier / four" does not move the length, so the cap is unchanged and still catches); ellipsis in the head; the sachet art repeats it and wraps instead. "1. Auflage" is untouched canon; the tail is re-voiced and the count is owner canon (**4-card canon 2026-11-22**). **re-voiced 2026-11-22** · VOICE | PCK §13 |
| `pack.hint` | Tippe eine Karte an. | Tap a card. | 20 | **space-critical** — DE 20 / EN 11; DE is the driver (+40 % of EN = 16 < 20), cap **48 → 20** because the old cap described a two-gesture string. Hides under 380px height rather than shrink. The reveal is a tap-through, not a carousel: the swipe clause has no consumer and is retired (§13). **re-voiced 2026-11-22** · VOICE | PL, PCK |
| `pack.btn.another` | Noch ein Pack | Another pack | 17 | **space-critical** — DE 13 / EN 12; wraps to its own row ≤380px | PL (also the lightbox primary action) |
| `pack.btn.catalogue` | see `nav.catalogue` | see `nav.catalogue` | — | same key | PCK |
| `pack.list.aria` | Die Karten aus diesem Pack | The cards in this pack | 30 | `<ol>` label | PL |
| `pack.card.aria` | Karte {n} öffnen: {name}, {rarity} | Open card {n}: {name}, {rarity} | 24 + name + rarity | **space-critical** — name clamps to 24; rarity always spoken so a screen-reader user hears which card shines | PL |
| `pack.summary` | {n} Karten: {names}. | {n} cards: {names}. | dynamic | live region only, uncapped by layout; ≤ ~2 sentences | PL |
| `pack.summary.one` | Eine Karte: {names}. | One card: {names}. | dynamic | singleton haul (collection of one) | PROPOSED (plural rule) |
| `pack.stamp.label` | 2. Auflage | Second edition | 17 | **space-critical** — rotated corner stamp, small text; must clear 4.5:1 at 9px | GDD R-H, PL (EN per D8) |
| `pack.lap.line` | Von vorn — jede Karte kommt wieder, jetzt mit 2.-Auflage-Stempel. Das Archiv vergisst nichts. | Starting over — every card comes again, now with the second-edition stamp. The archive forgets nothing. | 106 | **space-critical, longest new string** — DE 93 / EN 103; wraps to 3 lines above the drop row. **re-voiced 2026-11-22** · VOICE | PCK §13 |
| `pack.btn.another.busy` | see `stage.cta.busy` | see `stage.cta.busy` | — | one busy string for every open-trigger | PL |

> Chase card: **no string**. Das Hauptporträt / The Portrait of Record carries its own
> manifest name; no announcement pre-empts it (JRN Phase 3), and its gold-glint frame is
> decorative (GDD R-G, R10). Do not invent a "chase" label.

---

## 5. Card detail

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `card.mood` | Laune: {mood} | Mood: {mood} | 20 + mood | **space-critical** — band 1 mood row; DE prefix 7 / EN prefix 6 | CRD §5.3 |
| `card.set.chip` | aus: {set} | from: {set} | 17 + set | **space-critical** — chip truncates the set name at 12 chars + ellipsis, full name in `title`. Shelf cards show no chip | GDD R1, CRD |
| `card.rarity.common` | Häufig | Common | 10 | printed word is the non-colour carrier for rarity | PL, JRN |
| `card.rarity.rare` | Selten | Rare | 10 | | PL, JRN |
| `card.rarity.holo` | Holo-Pracht | Holo glory | 12 | **space-critical** — plate chip; "Holo" alone is retired (D7) | JRN, CRD |
| `card.stars.aria` | {n} von 5 Sternen | {n} of 5 stars | 20 | the strip is a five-slot row filled 3/4/5 (Häufig / Selten / Holo-Pracht) — #51; the chip word repeats the tier and the count is spoken, so the row never carries rarity alone. Row width is constant across tiers, so the credit beside it cannot re-truncate | PL |
| `card.moment.label` | Elsa-Moment | The Elsa moment | 16 | band 4 keyword; small caps by CSS | CRD §5.3 |
| `card.moment.imageNote` | Im Bild: {note} | In the picture: {note} | 44 | **space-critical** — first thing to yield when band 4 is full, never the sentence | CRD §13 |
| `card.stats.label` | Fantasiewerte · mit voller Überzeugung | Imaginary stats · held with conviction | 42 | **space-critical** — DE 39 / EN 38; wraps to 2 short lines above the chips. "Fantasiewerte / Imaginary" still leads, so the values can never read as data. Must precede the values in the accessible name. Also `plaque.caption`. **re-voiced 2026-11-22** · VOICE | BR, GDD R-I, CRD |
| `card.stats.chip` | {key} {value}/10 | {key} {value}/10 | 12 + 4 | value box reserved so nothing clips (L4) | GDD Formulas |
| `card.credit` | Elsa the Explorer · 1. Auflage | Elsa the Explorer · 1st edition | 40 | **space-critical, the defect band** — DE 30 / EN 31; fixed band, never over the photo; letter-spacing steps down, then 2 short lines | CRD §13, L3 |
| `card.serial` | {n}/{total} | {n}/{total} | 12 | zero-padded to the width of `{total}` (e.g. `04/24`); formatting, not a string | CRD §5.1 |
| `card.flip.hint` | Karte antippen zum Umdrehen · ← → zur nächsten | Tap the card to flip · ← → for the next | 54 | **space-critical** — DE 46 / EN 39; hides ≤380px height | PL |
| `card.flip.back` | Rückseite der Karte. | Card back. | 22 | live region on flip | PL, CRD |
| `card.flip.front` | Vorderseite der Karte. | Card front. | 24 | live region on flip back | PL, CRD |
| `card.btn.another` | see `pack.btn.another` | see `pack.btn.another` | — | same key | CRD |
| `card.btn.save` | Foto speichern | Save this photo | 21 | **space-critical** — mobile 2-col action grid | PL, CRD |
| `card.btn.share` | Teilen | Share | 7 | **space-critical** — shortest label in the deck | PL |
| `card.share.title` | «{name}» — eine Elsa-Karte | «{name}» — an Elsa card | 40 + name | share-sheet title | PL |
| `card.share.text` | Aus Elsas Archiv: «{name}». | From Elsa's archive: «{name}». | 30 + name | share-sheet body; DE 23 / EN 25 + name. No "gezogen / pulled" — draw-and-win language is gambling-adjacent (§0.4.10) and the archive claim is warmer anyway. **re-voiced 2026-11-22** · VOICE | PL |
| `card.share.shared` | Unterwegs. | On its way. | 17 | Announced via `#live-status` as `live.share`; the visible line is **plain** (no `role`, no `aria-live`) and auto-clears ~3.4 s. Status string — no exclamation (§0.4.4). **re-voiced 2026-11-22** · VOICE | PL |
| `card.share.copied` | Link kopiert. | Link copied. | 17 | clipboard fallback success. Status string — no exclamation (§0.4.4) | PL |
| `card.share.error` | Kopieren ging nicht. Der Link steht oben in der Adresszeile — dort bekommst du ihn. | Copying did not work. The link is up in the address bar — you can get it there. | 85 | **space-critical** — DE 82 / EN 79; 2-line reserved slot; always leaves a usable next step. Plain on purpose: an error never winks (§0.4.4). **re-voiced 2026-11-22** · VOICE | PL |
| `card.aria.open` | {n}. {name}. {rarity}. | No. {n}. {name}. {rarity}. | dynamic | spoken on open; Fantasiewerte label follows the values' framing | CRD §12 |
| `card.aria.position` | {n} von {total}. | {n} of {total}. | 12 + digits | spoken on each navigation step | CRD §12 |
| `card.image.alt` | {name} | {name} | 24 | alt = the card's printed name; a failed photo degrades to a readable frame, never error text | PL Error State |
| `card.stamp.line` | Zweite Auflage — die Sammlung kennt sie schon. | Second edition — the collection already knows this one. | 80 | **space-critical** — DE 47 / EN 57; status/hint area, wraps to 2 lines. D-04b rename applied; EN keeps "Second edition" per D8/D21 | GDD R-H (EN per D21) |

---

## 6. Die Sammlung (The Collection)

### 6.1 Title and lede

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `catalogue.title` | Die Sammlung | The Collection | 15 | **space-critical** — section head wraps. D-04b: entity name, key `catalogue.title` kept | BND §13 |
| `catalogue.lede` | Jedes Schmuckstück, das es gibt — öffne eines für die ganze Geschichte. | Every treasure there is — open one for the whole story. | 100 | DE 70 / EN 55; flat view. Plants the arrival noun (§0.4 anchors) outside the arrival moment. **re-voiced 2026-11-22** · VOICE | BND §5.1 (EN new) |
| `catalogue.lede.rooms` | Die Sammlung nach Räumen. Jeder Raum wächst für sich, in Ruhe. | The collection by room. Every room grows on its own, in its own time. | 100 | DE 62 / EN 67; room view. **re-voiced 2026-11-22** · VOICE | BND §5.1 (EN new) |
| `catalogue.count` | see `progress.overall` | see `progress.overall` | 36 + digits | one overall count string for stage and collection (D6) | PL |

### 6.2 Set names (canonical order — never reorder)

The **pair** is one displayed unit; each language shows the pair in its own order so the
page language leads. The **chip** form drops the leading article — it is what follows
`aus:` / `from:` and it is the only place a short name appears.

| Slug | DE pair | EN pair | Chip DE | Chip EN | Max |
| --- | --- | --- | --- | --- | --- |
| `nap-wing` | Der Ruhesaal · The Nap Wing | The Nap Wing · Der Ruhesaal | Ruhesaal | Nap Wing | 46 |
| `garden-annex` | Außenstelle Garten · The Garden Annex | The Garden Annex · Außenstelle Garten | Außenstelle Garten | Garden Annex | 46 |
| `departure-hall` | Der Abfahrtsaal · The Departure Hall | The Departure Hall · Der Abfahrtsaal | Abfahrtsaal | Departure Hall | 46 |
| `ball-room` | Der Ballsaal · The Ball Room | The Ball Room · Der Ballsaal | Ballsaal | Ball Room | 46 |
| `portrait-room` | Der Porträtsaal · The Portrait Room | The Portrait Room · Der Porträtsaal | Porträtsaal | Portrait Room | 46 |
| `guard-room` | Der Wachsaal · The Guard Room | The Guard Room · Der Wachsaal | Wachsaal | Guard Room | 46 |
| `new-acquisitions` | Neuzugänge · New Acquisitions | New Acquisitions · Neuzugänge | — (no chip) | — (no chip) | 46 |

> **Space**: the pair is the longest fixed-space string in the collection (max 46; DE 37).
> It ellipsises with the full pair in `title`; the count sits outside the truncating span,
> so a count can never be cut. **Neuzugänge** cards carry no chip — the shelf speaks only
> when spoken to (GDD R1).

### 6.3 Progress, completion and milestones

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `set.progress.line` | {n} von {total} gesammelt | {n} of {total} collected | 36 + digits | **space-critical** — room row header; DE 17 with single digits, number never truncates | PL, GDD R2 |
| `set.row.aria` | {set}: {n} von {total} gesammelt | {set}: {n} of {total} collected | dynamic | row label; the mini bar is `aria-hidden` | PL |
| `set.complete.announce` | {set} ist komplett. Alle da. | {set} is complete. All present. | 40 | announcement string — **no `!`** (D26). At cap with the longest room name (Außenstelle Garten, 18) + 22. Roll-call warmth, still a plain fact. **re-voiced 2026-11-22** · VOICE | PL |
| `set.complete.note` | Der Rahmen leuchtet, als hätte er gewartet! | The frame is glowing, as if it had been waiting! | 50 | one-line visible note in the collection head; DE 44 / EN 48. Carries the surface's one permitted `!` (§0.4.4): it is visible, not announced, so D26 does not apply. **re-voiced 2026-11-22** · VOICE | BND §12 (EN new) |
| `milestone.25.label` | Türschild vergoldet | Door sign gilded | 27 | **space-critical** — marker label, wraps under the marker | GDD R-F, BND |
| `milestone.50.label` | Leselampe angezündet | Reading lamp lit | 27 | | GDD R-F, BND |
| `milestone.75.label` | Samtband gespannt | Velvet rope strung | 27 | | GDD R-F, BND |
| `catalogue.milestone` | Sammlung: {pct} Prozent geschafft — {outfit}. | Collection: {pct} per cent done — {outfit}. | 80 | live region + one-time flourish. **Single source** for all three thresholds — no competing copy. Announced, so no `!` (D26); the institutional "Meilenstein erreicht" is gone, the `{outfit}` grammar is untouched (DE 35 + outfit = 62, EN 34 + outfit = 57). **re-voiced 2026-11-22** · VOICE; D-04b rename (key `catalogue:milestone-reached` kept) | PL (key `catalogue:milestone-reached`) |
| `outfit.25` | das Türschild ist vergoldet | the door sign is gilded | 40 | `{outfit}` value for 25 % — the only clause the pattern library writes out | PL |
| `outfit.50` | die Leselampe ist angezündet | the reading lamp is lit | 40 | `{outfit}` value for 50 % — **PROPOSED clause** in the pattern's grammar | PROPOSED |
| `outfit.75` | das Samtband ist gespannt | the velvet rope is strung | 40 | `{outfit}` value for 75 % — **PROPOSED clause** | PROPOSED |

> **One direction only.** Milestones are overall-collection events. Per-room markers are a
> display affordance; there are no per-set milestone strings and no per-set storage
> (GDD R-F). Empty rooms render nothing at all — no "0 von 0" (GDD E4, PL omit rule). **The
> playful register does not license a line in an empty room**: silence is still the right
> amount of copy there, and a joke would be the one thing a room with nothing in it cannot
> afford.

### 6.4 Capstones (100 %)

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `capstone.title` | Elsas Ehrenmensch | Elsa's Honorary Human | 40 | **space-critical** — collection-header capstone; never wrapped mid-word | BR, GDD R-I |
| `capstone.subtitle` | Sammlung I · vollzählig | Collection I · all present | 40 | diploma subtitle; DE 22 / EN 26. "abgeschlossen" read like a closed account; "vollzählig" is the roll-call word — all accounted for. D-04b rename. **re-voiced 2026-11-22** · VOICE | GDD R-I |
| `capstone.announce` | Sammlung komplett — Elsas Ehrenmensch ist eingetragen. | Collection complete — Elsa's Honorary Human is entered. | 80 | fired once, ever, on the 100 % crossing. One sentence, em dash instead of two full stops. Announced, so no `!` (D26, §12 item 10). **re-voiced 2026-11-22** · VOICE; D-04b rename. **Propagation**: the old line is quoted in `binder.md`, `player-journey.md` and `stage-landing.md` and asserted in tests — all must follow | PL, JRN (D13) |
| `capstone.date` | Eingetragen am {date}. | Entered on {date}. | 30 | `{date}` via `Intl.DateTimeFormat`; never a hardcoded separator. Full stop is part of the string (D-05); "eingetragen" is the same verb as `capstone.announce` | GDD R-I, D-05 (EN new) |
| `capstone.myth` | Drei Tage Fahrt, dann blieb sie. Die Sammlung ist vollständig. | Three days on the road, then she stayed. The collection is complete. | 76 | **space-critical** — the Greek-origin line on the Ehrenmensch certificate, **under the name**. DE 62 / EN 68 against the ▸SC(76) budget `greek-origin.md` §6 carried (DE 62 ≤ 76, EN 68 ≤ 76 — both still fit). Replaces that document's PROPOSED second sentence, which pointed to the collection for everything else instead of closing on completeness. Visible line, never announced: no `!` (§0.4.4) — the 100 % announcement stays `capstone.announce`. Owner ruling 2026-11-22 · **D-04**, renamed by **D-04b** | `greek-origin.md` §6 (`myth:capstone`), ruled in `docs/decisions.md` D-04, D-04b |
| `capstone.lap` | **PROPOSED** Durchgang {lap} | **PROPOSED** Lap {lap} | 16 | the lap number is canon on the diploma; its label exists in no source | PROPOSED |
| `capstone.waiting` | Der Ehrenmensch wartet auf die neuen Karten. Er hat es nicht eilig. | The Honorary Human is waiting for the new cards. No rush. | 100 | shown when a new photo drops below 100 % after completion; refresh, never accumulate. "Heft" is gone: a new arrival is announced by `zuwachs.line`, never restated here. **re-voiced 2026-11-22** · VOICE | GDD E2 |
| `plaque.title` | Das Gesamtverzeichnis | The Master Index | 30 | sits beside the capstone, never per room | BR, GDD R-I |
| `plaque.caption` | see `card.stats.label` | see `card.stats.label` | — | same Fantasiewerte label; the plaque is still a joke, labelled as one | GDD R-I |

> The capstone is **one** surface at 100 %: no per-set diplomas exist in copy, and the
> retired "Diplom" wording must not return (§13). Sharing reuses `card.share.*` with the
> capstone's URL — no second share vocabulary.

### 6.5 Tiles, badges and grid

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `tile.badge.location` | In der Sammlung | In the collection | 22 | **space-critical** — location label, never a state verb; badge grows, the plate reserves the row | GDD R9, BND |
| `tile.badge.new` | NEU | NEW | 6 | new-accession marker; clears per tile once opened | BND §5.3 |
| `tile.state.collected` | gesammelt | collected | 12 | **space-critical** — text marker beside the check, never colour alone | GDD R9, PL |
| `tile.state.unseen` | noch nicht gesammelt | not yet collected | 24 | **space-critical** — DE 20 is the driver for the plate row | GDD R9, PL |
| `tile.aria.open` | Karte {n} öffnen: {name}, gesammelt | Open card {n}: {name}, collected | 24 + name | **space-critical** — name clamps at 24 | PL, JRN |
| `tile.aria.open.unseen` | Karte {n} öffnen: {name}, noch nicht gesammelt | Open card {n}: {name}, not yet collected | 24 + name + 20 | the state is spoken, not implied by dimming | PL |
| `grid.aria` | Alle Karten von Elsa | All cards of Elsa | 40 | `<ul>` label, flat view | PL |
| `grid.aria.rooms` | Die Sammlung nach Räumen | The collection by room | 40 | grouped view: sections headed by their set rows | PL |
| `view.announce.rooms` | Nach Räumen sortiert. | Grouped by room. | 40 | spoken once on switch (D11) | PL |
| `view.announce.all` | Alle Karten. | All cards. | 20 | flat equivalent | PL |

### 6.6 Lexikon term surfaced outside the cards — Reiselust

One term lives in this deck without being a card stat. It is a **label** in Der Aushang
(`design/features/specs/karte-des-tages.md` §6), which recorded an open dependency on exactly
this pair. Keys follow `archive-fiction.md` §4 (`lex:<slug>:term` / `lex:<slug>:def`).

| Key | DE | EN | Max | Where / source |
| --- | --- | --- | --- | --- |
| `lex:reiselust:term` | Reiselust | Wanderlust | 20 | the `<dt>` of the travel line in Der Aushang; DE 9 / EN 10. Owner voice ruling 2026-11-22 |
| `lex:reiselust:def` | die Neigung, im Auto ein Ziel zu vermuten. | the tendency to assume the car has a destination. | 73 | the term's disclosure; DE 46 / EN 52, cap derived `ceil(52 × 1.4)`. Owner voice ruling 2026-11-22 |

> **It is not a per-card stat.** `lex:reiselust:*` is the **forecast label for the travel
> union** (`departure-hall ∪ garden-annex`) in Der Aushang. It never appears in
> `card.stats.chip`, never becomes a `photoTraits` value on a card, and carries no
> `{value}/10` of its own — the number beside it is the union's, formatted by
> `tag:forecast:value`. This closes the "Reiselust has no Lexikon pair yet — add one to §4
> before build" gap in `karte-des-tages.md` §6, whose §6 rule 5 forbids first use without a
> definition. The wording is recorded verbatim as ruled; where `archive-fiction.md` §4
> capitalises its own definitions, that file matches this pair at write-in rather than the
> other way round — the deck is the string of record. Trait names are never synonymised at
> runtime.

---

## 7. States

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `state.loading.stage` | Karten werden gesucht | Finding the cards | 30 | the label *is* the loading indicator — no spinner in the parlour | PL, STG |
| `state.loading.grid` | Karten werden geladen… | Loading cards… | 30 | grid variant; ellipsis is part of the string | PL, BND |
| `state.empty.owner` | Noch keine Karten. Leg Elsa-Fotos in den Ordner photos und führe dann npm run photos aus. | No cards yet. Put Elsa's photos in the photos folder, then run npm run photos. | 100 | **space-critical** — DE 89 / EN 78; `npm run photos` in `<code>`, never broken mid-token. Speaks to the curator, the only person who can act | PL, STG, BND |
| `state.empty.count` | Leer, aber bereit | Empty, but ready | 18 | count-line slot only (slot-specific, not a conflict — §11 D23). Winks without promising cards exist. **re-voiced 2026-11-22** · VOICE | BND §6 (EN new) |
| `state.error.catalogue` | Die Sammlung kommt gleich wieder. | The collection will be back shortly. | 60 | the stage shows this same string; retry lives with the collection. Warm, but it states the fact and promises nothing it cannot keep — **no `!` in an error** (§0.4.4). **re-voiced 2026-11-22** · VOICE | STG, BND |
| `state.error.retry` | Nochmal versuchen | Try again | 20 | **space-critical** — DE 17 / EN 11; button grows | BND |
| `state.storage.refused` | — NO STRING — | — NO STRING — | 0 | **deliberate silence.** A private-window visitor has chosen that trade-off knowingly; the visit works, only persistence is absent. Do not add a warning | JRN Phase 1, GDD E3 |
| `state.image.failed` | — NO STRING — | — NO STRING — | 0 | the frame, name, mood and line stay readable; the photo window's alt is `card.image.alt`. Never error text aimed at a visitor | PL Error State, CRD |
| `state.noscript` | Das Pack braucht JavaScript. Die Karten liegen trotzdem im Ordner photos. | The pack needs JavaScript. The cards are still in the photos folder. | 100 | DE 73 / EN 68; `<noscript>` only, same register as the empty state | JRN Phase 1 |
| `state.paging` | — not written — | — not written — | — | Paging copy ("Zeige 1–60 von 240") waits on the owner's catalogue size and the paging decision (BND §15). Do not invent it | BND §12 (open) |

---

## 8. Accessibility announcements

All of these are writes to `#live-status` — the polite region of the two ADR-0010 §1 defines
(`#live-alert` is the assertive one and has no row here today). Rapid successive messages replace,
never queue. Every announcement is ≤ 2 sentences and uses the language of the page. Where a key is
already in another section, it is referenced — never re-keyed. The visible status line for
`live.share` is plain text with no live semantics: the region is the only voice.

| Key | DE | EN | Max | Fires when | Source |
| --- | --- | --- | --- | --- | --- |
| `live.pack.open` | Das Pack geht auf. | Opening the pack. | 30 | pack accepted, before the theatre | PL, PCK |
| `live.reveal.done` | see `pack.summary` | see `pack.summary` | dynamic | once, after the last card lands — never per card | PL |
| `live.lap.restart` | Das waren alle Karten. Jetzt beginnt das Pack von vorn. | That was every card. The pack starts over. | 80 | the deck walk restarts (before the reveal) | PL, STG |
| `live.lang.switch` | Auf Deutsch umgestellt. | Switched to English. | 40 | language switch. **Asymmetric by design**: the message is in the language just chosen | PL, STG |
| `live.reset.done` | Von vorn. Alle Karten können wieder kommen. | Starting over. Every card can come up again. | 70 | reset confirmed and re-rendered | PL, STG |
| `live.flip.back` | see `card.flip.back` | see `card.flip.back` | 22 | exhibit flips to the back | PL |
| `live.flip.front` | see `card.flip.front` | see `card.flip.front` | 24 | exhibit flips to the front | PL |
| `live.set.complete` | see `set.complete.announce` | see `set.complete.announce` | 40 | a room completes | PL |
| `live.milestone` | see `catalogue.milestone` | see `catalogue.milestone` | 80 | 25 / 50 / 75 %, once each per reset cycle, threshold order | PL |
| `live.capstone` | see `capstone.announce` | see `capstone.announce` | 80 | 100 %, once ever | PL |
| `live.zuwachs` | see `zuwachs.line` (and `zuwachs.line.one` at `{n}` = 1) | see `zuwachs.line` (and `zuwachs.line.one` at `{n}` = 1) | 44 | once per visit, on load with a manifest-stamp mismatch. Announced with the terminal `!` neutralised to `.` (D26) — the visitor hears "1 neues Schmuckstück ist da." at one, otherwise "… neue Schmuckstücke sind da." | GDD R8, voice D5 |
| `live.share` | see `card.share.*` | see `card.share.*` | 85 | share success, copy success, share failure | PL |
| `live.view` | see `view.announce.rooms` / `view.announce.all` | see `view.announce.rooms` / `view.announce.all` | 40 | view toggle | PL |

**Accessible names that are not announcements** (same rule: current language, no
icon-only state): `nav.wordmark.aria`, `nav.skip`, `nav.lang.*.aria`, `nav.sound.aria`,
`nav.close.*`, `nav.card.*`, `stage.seal.aria`, `stage.cta`, `pack.list.aria`,
`pack.card.aria`, `card.stats.chip` sequence inside `card.aria.open`, `tile.aria.open*`,
`grid.aria*`, `set.row.aria`, `progress.overall` (as the progressbar's label).

**Not announced, by decision**: the "2. Auflage" stamp (decorative; `card.stamp.line` is
its text form), the chase frame, room frames, milestone outfits, confetti. Decoration
never becomes a second voice.

---

## 9. Reset

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `reset.trigger` | Von vorn | Start over | 20 | quiet outline button in the collection tools row; never adjacent to tiles | PL, GDD R7 |
| `reset.title` | Von vorn? | Start over? | 20 | dialog `aria-labelledby` target | PL |
| `reset.body` | Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück. | This clears the Collection, room progress, the milestones and Elsa's Honorary Human — sound and language go back to default. | 140 | **space-critical** — DE 130 / EN 124; wraps to 4 lines. Cap stays 140 (raised from 128 for the owner's Ton-und-Sprache clause, D20). Frames clear with the set progress (D9). "Set-Fortschritte" → "Räume samt Fortschritt" removes the deck's only spec-sounding anglicism; full loss list and both preferences are intact. **re-voiced 2026-11-22** · VOICE | PL (owner ruling carried in BND) |
| `reset.confirm` | Alles löschen | Delete everything | 20 | **space-critical** — destructive styling; labelled with the action, never "OK"/"Ja" | PL |
| `reset.cancel` | Abbrechen | Cancel | 10 | **space-critical** — default focus lands here | PL |

> Reset clears **every** `lucky-elsa.*` key — collection state and preferences. After
> confirm the page returns to German and sound-on. `reset.body` is the only place a
> visitor is told what is lost, so it must name the capstone and the preferences; it is
> read in full by a screen reader, which is why the buttons never say "Ja". It is also the
> one string in the deck that **must not wink**: a delete dialog that jokes is a dialog the
> reader stops trusting, and the playful register is a promise about tone, never about
> accuracy.

---

## 10. Footer

| Key | DE | EN | Max | 40 % / space | Source |
| --- | --- | --- | --- | --- | --- |
| `footer.mark` | see `brand.name` | see `brand.name` | 40 | brand, untranslated | BR |
| `footer.line` | Kein Konto, keine Cookies, keine Zählung. Alles bleibt auf diesem Gerät — wo es hingehört. | No account, no cookies, no counting. Everything stays on this device — where it belongs. | 120 | DE 90 / EN 87; wraps to 2 lines. States the privacy floor unchanged; the wink is in "wo es hingehört / where it belongs". **re-voiced 2026-11-22** · VOICE | PROPOSED from BR privacy floor |
| `footer.top` | Nach oben | Back to top | 16 | anchors to `#stage`; instant under reduced motion | STG §4 |

---

## 11. Resolved divergences

Every row names the winner. "Winner" is the document whose string this deck ships.

| # | Conflict | Higher-precedence doc says | Lower doc says | Winner | Effect in this deck |
| --- | --- | --- | --- | --- | --- |
| D1 | Page eyebrow | BR (owner decision this round): eyebrow **"Katalog I"** replaces "Serie I / Erste Auflage" | STG §5.3: eyebrow "Elsa the Explorer · Das Kartenwerk" | **BR** (owner ruling) | `stage.eyebrow` = Sammlung I / Collection I (D-04b rename); "Das Kartenwerk" survives only inside `meta.title` |
| D2 | Landing H1 | STG §15 records the owner-canon resolution: H1 **"Was steckt in der Sammlung?"** (D-04b rename) | JRN Phase 1 proposes "Fünf Karten. Ein Sammelwerk." | **STG** (records an owner ruling) | `stage.h1*` |
| D3 | Series line | BR: the collection is **Katalog I** | JRN Phase 1: "Sammelwerk · Serie I" / "The Collection · Series I" | **BR** (owner ruling) | No series string exists; "Serie I" is retired (§13) |
| D4 | Secondary catalogue link | STG §5.3: text link **"Zur Sammlung"** (D-04b rename) (and PCK uses the same label in the pack footer) | JRN Phase 1: "Den Katalog ansehen" / "See the collection" | **STG** (screen spec, label shared by two screens) | `nav.catalogue` |
| D5 | New-accessions line | **Owner voice ruling 2026-11-22**: `{n} neue Schmuckstücke sind da!` / `{n} new treasures have arrived!` | GDD R8: "Das Heft hat Zuwachs: {n} neue Karten."; BR §Core loop: "Die Sammlung hat Zuwachs"; JRN Phase 6: count-free "Das Heft hat Zuwachs." | **Owner voice ruling** (supersedes GDD R8) | `zuwachs.line` re-voiced; "Heft" is retired with **no exception**, and both count-free variants plus "Die Sammlung hat Zuwachs" are retired. Playful count form is the single string for the arrival moment |
| D6 | Overall progress line | PL: **"Du hast {n} von {total} gesammelt."** (verb canon) | BND §5.1 header: "15 von 24 gesammelt" (no "Du hast") | **PL** (canon progress line) | `progress.overall` is used by stage **and** catalogue head; the short form survives only per room in `set.progress.line` |
| D7 | Holo rarity label | JRN / CRD: **"Holo-Pracht"** / "Holo glory" (PL's a11y example agrees) | A11Y feature matrix: "Häufig/Selten/Holo" | **JRN + CRD** (full label; A11Y row predates the reframe) | `card.rarity.holo` = Holo-Pracht; bare "Holo" retired in copy (still fine as an internal code value) |
| D8 | Second-lap stamp, EN | PL (and PCK §13): **"Second edition"** | GDD R-H: "2nd printing" | **PL** (pattern library outranks GDD) | `pack.stamp.label` EN = Second edition; DE "2. Auflage" unchanged everywhere |
| D9 | Reset body | PL (SSOT, and the owner ruling it carries): names the Collection, **set progress**, milestones, **Elsas Ehrenmensch**, and that **sound and language** reset | GDD R7: names "Karten im Katalog, Meilensteine, **Rahmen**, der Ehrenmensch, Sprache und Ton"; JRN Phase 7 adds "Einmal bestätigen, dann ist alles leer." | **PL** | `reset.body` = the PL line verbatim. Frames are not named separately — they clear with the set progress. See §12 for the +11-character alternative |
| D10 | Milestone announcement | PL / GDD R-F: single source `catalogue:milestone-reached { pct }` → **"Katalog-Meilenstein erreicht: {pct} Prozent — {outfit}."** | BND §12: "Die Sammlung: {pct} Prozent gesammelt. {Marker label}." | **PL** (GDD defers to it explicitly) | `catalogue.milestone` + `outfit.*`; the BND announcement string is retired |
| D11 | View-switch announcement | PL: **"Nach Räumen sortiert."** / "Grouped by room." | BND §12: "Ansicht: Nach Räumen." / "View: by room." | **PL** | `view.announce.*` |
| D12 | Room-complete announcement | PL: **"{set} ist komplett."** / "{set} is complete." | GDD R-D: "Der Ruhesaal ist vollständig — acht von acht gesammelt." | **PL** | `set.complete.announce`; the richer GDD line is retired. The count is already visible in `set.progress.line`, so nothing is lost |
| D13 | Capstone announcement | PL (and JRN Phase 7): **"Sammlung komplett. Elsas Ehrenmensch ist eingetragen."** (D-04b rename) | BND §6: "Elsas Ehrenmensch — die Sammlung ist komplett." | **PL** | `capstone.announce` |
| D14 | Garden wing spelling | Owner canon + GDD + BND §3 table: **"Außenstelle Garten"** / "The Garden Annex" | BND §5.1 wireframe: "GARTEN-ANNEXE" | **Owner canon** | One spelling only: Außenstelle Garten. The wireframe label was layout shorthand |
| D15 | Set chip form | GDD R1 example: **"aus: Ruhesaal"** — article dropped | CRD / BND templates: "aus: {Set}" with the full display name | **GDD** | Sets carry two forms: display pair (§6.2) and chip short form. `card.set.chip` uses the short form |
| D16 | Tile state text | GDD R9 (verb + badge canon): tiles read **"gesammelt" / "noch nicht gesammelt"**, and the separate badge reads **"In der Sammlung"** (a location, not a state) | BND §5.3: one badge ("In der Sammlung") plus "NEU" | **GDD** (R9 is the copy canon) | `tile.state.*` and `tile.badge.location` are three separate keys; the badge never substitutes for the state word |
| D17 | Skip-link target | STG §12: **"Direkt zum Pack"** → `#open-pack` (label and destination agree) | A11Y matrix: "Skip link to `#stage`" | **STG** | `nav.skip`; A11Y row predates the reframe |
| D18 | "gesehen / seen" | GDD R9: retired everywhere in favour of **"gesammelt / collected"** | A11Y rows quote "gesehen / seen"; BND §1 quotes seen-copy | **GDD** | No seen-string appears in this deck; the retired forms are listed in §13 so they cannot creep back |
| D19 | Pack dialog title cap | PCK §13 caps the title at **15 characters** | PCK's own canon EN string "Your new arrival" is **16** | **Canon string** (cap corrected) | `pack.dialog.title` max = 17 (16 + 1 slack). The head is a single-line flex row; it wraps only under 320px. The 15 in the spec is an arithmetic slip, not a copy decision |
| D20 | Reset body cap | BND §13 caps the modal copy at **128 characters** | The owner-mandated Ton-und-Sprache clause makes the canon EN line **124** and the DE line **131** | **Canon string** (cap raised) | `reset.body` max = 140. The 128 figure predates the clause the owner added; the modal wraps to four lines at 320px |
| D21 | Stamp dialog line, EN | PL: stamp label **"Second edition"** (D8) | GDD R-H line: "Second printing — the collection already knows this one." | **PL** (label parity) | `card.stamp.line` EN = "Second edition — …" so the corner stamp and its spoken line use one term |
| D22 | Chase treatment in copy | JRN Phase 3 / GDD R-G: **no announcement**, the gold frame is the only differentiation | — | **No conflict** | Zero chase strings exist; nothing to drift |
| D26 | Exclamation mark on an announced string | §0.4.4 (owner voice ruling): `!` allowed, at most one per surface, **never in an accessibility string** — a live-region announcement is one | `zuwachs.line` carries the ruling's `!` and §8 reuses the same key as `live.zuwachs` | **§0.4.4**, by a render-time transform | One key, one string: the announcement path renders `zuwachs.line` with the terminal `!` neutralised to `.`. Same discipline as number/date formatting (§0.1) — the deck does not mint a second key to dodge a rule. No other announced row carries a `!` (§6.3, §6.4, §5 share statuses), so this is the only case |

**Not divergences — resolved by slot** (recorded so nobody merges them later):

| # | Pair | Why both stay |
| --- | --- | --- |
| D23 | `state.empty.count` "Noch nichts da" vs `state.empty.owner` "Noch keine Karten …" | Different slots: the count line versus the message. PL fixes "Noch keine Karten" as the *trigger/empty message*; BND fixes "Noch nichts da" as the *count*. Merging them would either lose the owner instruction or make the count a paragraph |
| D24 | `meta.title` "… Das Kartenwerk" vs `brand.tagline` "Das Archiv eines Hundelebens." | Different slots: browser title versus page hero line. BR requires a localised tagline; STG fixes the document title |
| D25 | `stage.cta` "Pack öffnen" vs `pack.eyebrow` "1. Auflage · vier frische Karten" | Different slots: the action vs the accession's edition line. "1. Auflage" as the *page* eyebrow is the one that was retired (D1) |

---

## 12. Open items needing an owner ruling

> **All items in this section are RESOLVED 2026-11-22** by `docs/decisions.md` D-05 (reset body kept verbatim, 50/75 % outfit clauses approved, `demo.mixed`, `capstone.date`, CTA register, error register). Kept below for the decision record; no string in this section is open. The Gotcha Day line lives in `design/narrative/greek-origin.md` §5 as `myth:fest:arrival:time` — this deck quotes it rather than minting a duplicate key.

Nothing below blocks the deck from being implemented; each is a decision only the owner
can make. Recommended options are marked.

1. **Reset body: name the frames separately?** The canon line says "die Set-Fortschritte".
   Adding `samt Rahmen` makes it 142 characters (inside the raised 140 cap it does not
   fit; it would need 145). *Recommendation: keep the canon line* — the frames are the
   set progress's decoration, and a longer confirmation reads as a warning rather than an
   honest summary.
2. ~~**Reset body register: "Set-Fortschritte" is a mixed-language compound.**~~
   **CLOSED 2026-11-22 (voice ruling).** The item's own recommendation was adopted:
   "die Räume samt Fortschritt" (130 characters), which removes the deck's only
   spec-sounding anglicism. Recorded in `reset.body` (§9), not kept as a canon-vs-proposal
   split.
3. **`capstone.lap` has no source label.** Germany has no natural single word for a lap
   through a card walk; "Durchgang" is proposed. *Recommendation: ship "Durchgang
   {lap}"*, or drop the lap line from the diploma if it reads as bookkeeping.
4. **Milestone outfit clauses for 50 % and 75 %** are composed in the pattern language
   (only 25 % is written out). *Recommendation: approve the three parallel clauses* so all
   three announcements share one grammar.
5. **`demo.mixed`** has no source string at all (BND requires a mixed note, no document
   writes it). *Recommendation: approve the proposed one-liner*; it is the only copy in
   this deck that had to be written from nothing but a slot description.
6. **`capstone.date` wording** ("Eingetragen am"): the GDD requires a completion date but
   not its label. *Recommendation: keep* — it matches the register of the diploma
   ("eingetragen" is the same verb as the announcement).
7. **`stage.cta` register.** PL records an unresolved explorer-register alternative
   ("Auf Expedition gehen" / "Begin an expedition") and JRN asks whether it reads as
   costume. *Recommendation: keep "Pack öffnen"* — it is the label the `P` hint and the
   seal both point at, and it is the one string a first-time visitor must not have to
   interpret.
8. ~~**`state.error.catalogue` register.**~~ **CLOSED 2026-11-22 (voice ruling).** Re-voiced to
   *"Die Sammlung kommt gleich wieder." / "The collection will be back shortly."* — warm, still
   factual, no `!`. **Propagation cost**: the retired line is quoted in `stage-landing.md`
   and `binder.md` and asserted in STG §14, so that pass must update both quotes and re-point
   the test at the new string.
9. **Landing H1 was left as canon.** The pass was asked to re-voice the headline;
   `stage.h1` is unchanged because it is owner canon recorded in D2 and is already a warm
   rhetorical question. If a fuller wink is wanted, the candidate that still fits the fixed
   13/19 character halves is DE "Was wohl" / "im Katalog steckt?" and EN "What might" /
   "be in there, then?" — both are re-cuts of the same question, not a new idea.
   *Recommendation: keep the canon line*; the tagline and lede now carry the playfulness, and
   the H1 is tested in STG §13/§14.
10. **The capstone's optional `!` is unspent.** `capstone.announce` is announcement-only, so a
    `!` there would be neutralised by D26 and never seen. If the moment should land harder,
    the exclamation belongs on a *visible* capstone line (which would be a new key, and needs
    the owner's yes), not on the announcement. *Recommendation: leave it* —
    "Katalog komplett — Elsas Ehrenmensch ist eingetragen." already reads as a satisfied full
    stop.
11. **`milestone.25/50/75.label` stayed terse** ("Türschild vergoldet"). They are marker
    labels under a 27-character cap, and item 4's parallel outfit grammar depends on them.
    *Recommendation: leave them* — the warmth is in `catalogue.milestone` and `outfit.*`,
    which are the sentences a reader actually meets.

---

## 13. Retired strings and never-write list

**Retired by this refactor** — these must not appear in any new build, any test fixture
or any screenshot:

| Retired | Replaced by | Why |
| --- | --- | --- |
| Serie I / Erste Auflage (as the page eyebrow) | Sammlung I / Collection I | Owner rebrand (BR), renamed by D-04b |
| Sammelwerk · Serie I / The Collection · Series I | Sammlung I / Collection I | Owner rebrand (D3), renamed by D-04b |
| Sammelheft, binder, "das Heft" as the collection's name | Die Sammlung / The Collection | Owner canon 2026-11-22. **No exception: not even the arrival line says "Heft" any more** (D5) |
| gesehen / seen, ungesehen / unseen | gesammelt / collected, noch nicht gesammelt / not yet collected | GDD R9 |
| katalogisiert / catalogued | gesammelt / collected | Verb canon |
| Die Sammlung hat Zuwachs | {n} neue Schmuckstücke sind da! / {n} new treasures have arrived! | D5, owner voice ruling 2026-11-22 |
| Das Heft hat Zuwachs. (count-free) | the count form above | D5 — one string, one meaning |
| Das Heft hat Zuwachs: {n} neue Karten. / New in the binder: {n} new cards. | {n} neue Schmuckstücke sind da! / {n} new treasures have arrived! | D5 — the GDD R8 wording is superseded; "Heft" retires with it |
| Zero exclamation marks (the rule itself) | at most one `!` per surface; never in error, destructive-confirmation or a11y strings (§0.4.4) | Owner voice ruling 2026-11-22 — the old rule made the deck too dry. Superseded, not merely relaxed |
| Die Nassabteilung / The Wet Collection | Der Abfahrtsaal / The Departure Hall | Owner water ruling 2026-11-22 |
| "Badegast des Jahres", "Unwetterwarnung Stufe Pfote", "nasser Hund und Stolz" | — (no replacement; the card bank entries stay retired) | Owner water ruling — must not be re-pulled from the card bank at runtime |
| "Den Katalog ansehen" / "See the collection" | Zur Sammlung / To the collection | D4, renamed by D-04b |
| "Fünf Karten. Ein Sammelwerk." | Was steckt in der Sammlung? | D2, renamed by D-04b |
| fünf Karten / five cards as the **pack count** — "1. Auflage · fünf frische Karten", "Fünf Karten pro Pack", "five cards per pack" | **vier Karten / four cards** ("1. Auflage · vier frische Karten", "Vier Karten pro Pack") | Owner canon 2026-11-22 (**4-card canon**, mobile-first). The holo/rare still lands late, now **3rd or 4th** (PL §Card Reveal Step). "Fünf Karten. Ein Sammelwerk." above is retired on *both* grounds (D2 and this) |
| "Du hast alle … gesehen. Das Pack beginnt von vorn." | Das waren alle Karten. Jetzt beginnt das Pack von vorn. | A11Y/PRE-refactor lap line, superseded by PL |
| Diplom, DiplomCard, per-set Diplom | Elsas Ehrenmensch / Elsa's Honorary Human, one surface at 100 % | Owner canon (BND §15 resolved) |
| "1. Auflage" as the masthead/series label | stage.eyebrow = Sammlung I / Collection I; "1. Auflage" survives only as the seal edition and the card credit | D1, D24 |
| "Holo" as a printed rarity word | Holo-Pracht / Holo glory | D7 |
| 2nd printing | Second edition | D8 |

**Never write, in either language**

- Any water content: no wet dog, rain, mud, bathing, puddles, towelling, "nass". Elsa
  hates water; the archive contains none of it.
- More than one exclamation mark in a string, and **any** exclamation mark in an error string,
  a destructive confirmation, or an accessibility string (alt text, aria label or accessible
  name, live-region announcement). One `!` in a playful visible line is allowed — the record
  of that permission is §0.4.4, and the announcement-side handling is D26.
- Any gambling or odds language: no "chance", "odds", "luck", "ultra rare", percentages of
  pull probability, "last chance", timers, streaks.
- Any gift framing: no "surprise", no "for you", no unwrapping-as-generosity. The pack is
  an accession, the visitor is a reader.
- Any marketing voice: no "entdecke jetzt", no "das musst du sehen", no superlatives.
- Any invented fact about Elsa: captions stay photo-matched; stats stay labelled
  imaginary (`card.stats.label`) and are never presented as data.
- Any "Sie" in German.
- Any second name for the 100 % reward, the collection, or a wing. One name each, forever.

---

## 14. Parity checklist (run before string freeze)

- [ ] **No live string names the collection "Katalog"/"Catalogue"** — the entity is Die Sammlung / The Collection (D-04b). Key names (`catalogue.*`) are unchanged; only values are checked.

- [ ] Every key in §1–§10 exists in both `COPY.de` and `COPY.en`, index-aligned.
- [ ] No entry contains more than one `!`, and **no** error, destructive-confirmation or
      announcement row carries one (D26). `zuwachs.line` and `set.complete.note` are the only
      two rows that carry one at all.
- [ ] Zero occurrences of `Heft` / `binder` in either column — the arrival line included.
- [ ] Every pack-count string reads **four / vier** (**4-card canon 2026-11-22**); no `fünf` / `five` as a card count survives outside §13's retired table. The holo/rare order is stated as 3rd or 4th, never 4th or 5th.
- [ ] No entry matches the water vocabulary list (nass, Regen, Schlamm, baden, Wet
      Collection, rain, mud, bath, wet dog, Pfütze, Handtuch).
- [ ] No entry still says gesehen / seen / katalogisiert / catalogued.
- [ ] The Reiselust / Wanderlust pair (§6.6) exists in both languages and is never rendered as
      a per-card stat.
- [ ] Every `{placeholder}` in DE also appears in EN, and no EN string adds one.
- [ ] Every space-critical row passes at 320px with its longest set name and a three-digit
      `{total}` substituted, at 200 % zoom, in German.
- [ ] The same key is never rendered from two sources — masthead count, catalogue count and
      progressbar label all read `progress.overall`.
- [ ] Decoration announces nothing: no live-region string names a frame, stamp, outfit or
      confetti.
- [ ] Reset confirmation is read in full by a screen reader, and its cancel button has
      default focus.
- [ ] `localize` validate: 0 missing, 0 placeholder mismatches, 0 over-length, 0 orphans.
- [ ] `localize` freeze called before any external translation work: this deck is the
      source of record, and DE is the layout driver.

---

## 15. Voice changes (2026-11-22)

Every string this ruling rewrote, with what it replaced. The same rows carry the
**re-voiced 2026-11-22** marker in their own section; this table exists so a propagation
pass can follow one list instead of diffing the deck. DE / EN share a cell, old → new.
Caps moved only where a row says so (the Zuwachs rows), plus `meta.description`
(155 → 160, where the old note's own arithmetic was wrong). One **count** also
moved after the voice pass: the pack is **four cards** (4-card canon 2026-11-22),
so the `stage.lede` opening and the `pack.eyebrow` tail below read "vier / four".
That is owner canon, not a voice change — the registered voice is untouched.

| Key | Old | New | Why |
| --- | --- | --- | --- |
| `brand.tagline` | Das Archiv eines Hundelebens. / The archive of a dog's life. | Das Leben einer Hündin, die weiß, dass sie wichtig ist. / The life of a dog who knows she is important. | The old line described a filing cabinet. The new one is the household's actual thesis — she knows. Also feeds `stage.tagline` (same key). |
| `meta.description` | Ein Kartenarchiv über Elsa: … den Katalog vervollständigen. Sechs Säle, ein Hauptporträt. Ohne Konto, ohne Tracking. / A card archive of one dog: … complete the collection. … | Ein Kartenarchiv für eine sehr wichtige Hündin: … die Sammlung füllen. … / A card archive for a very important dog: … fill the collection. … | "complete the collection" is a compliance task; "fill" is what you do to a shelf. The subject becomes her, not the archive. Facts and privacy floor unchanged. |
| `stage.lede` | Fünf Karten pro Pack, mindestens eine glänzt. Jede kommt einmal dran, bevor eine wiederkommt. / … before any repeats. | … bevor eine wiederkommt — Ordnung muss sein. / … before any repeats — as is only proper. | The mechanic, then the wink. Both promises (one shines, no repeat before a full turn) survive word for word. The opening sentence now reads "Vier Karten pro Pack" / "Four cards per pack" (**4-card canon 2026-11-22**, mobile-first) — the old column above keeps the five-card wording as the record of this voice pass. |
| `zuwachs.line` | Das Heft hat Zuwachs: {n} neue Karten. / New in the binder: {n} new cards. | {n} neue Schmuckstücke sind da! / {n} new treasures have arrived! | The owner's benchmark line. "Schmuckstücke" is the new arrival noun; "Heft" is retired with no exception (D5). Cap 47 → 44. This row's one `!` is neutralised for the announcement by D26. |
| `pack.eyebrow` | 1. Auflage · fünf Karten / 1st edition · five cards | 1. Auflage · vier frische Karten / 1st edition · four fresh cards | Edition canon untouched; "frisch" is the market-stall warmth that fits an accession. "fünf" in the old column is this pass's starting point; the count is now four (**4-card canon 2026-11-22**), which costs 0 characters. |
| `pack.hint` | Wähle eine Karte. Wische für die nächste. / Pick a card. Swipe to see the next one. | Tippe eine Karte an, wisch zur nächsten. / Tap a card, swipe to the next. | Shorter and warmer, the verb now matches the real gesture (tap), and both gestures are still taught. |
| `pack.lap.line` | Von vorn — alle Karten kommen wieder. Ab jetzt mit 2.-Auflage-Stempel. / … From now on with the second-edition stamp. | Von vorn — jede Karte kommt wieder, jetzt mit 2.-Auflage-Stempel. Das Archiv vergisst nichts. / … The archive forgets nothing. | A second lap used to read as a system notice. "Das Archiv vergisst nichts" is affectionate and literally true. |
| `card.stats.label` (also `plaque.caption`) | Fantasiewerte · nur zum Spaß / Imaginary stats · just for fun | Fantasiewerte · mit voller Überzeugung / Imaginary stats · held with conviction | Same disclaimer, funnier: the household believes its own invented numbers. "Fantasiewerte / Imaginary" still leads, so the values cannot read as data. |
| `card.share.text` | Ich habe Elsa gezogen: «{name}». / I pulled Elsa: «{name}». | Aus Elsas Archiv: «{name}». / From Elsa's archive: «{name}». | "gezogen / pulled" is draw-and-win language, one step from the gambling flavour §0.4.10 forbids; the archive claim is warmer and true. |
| `card.share.shared` | Geteilt. / Shared. | Unterwegs. / On its way. | A status that reported a machine action now reports the card setting off. Status string — no `!`. |
| `card.share.error` | Link konnte nicht kopiert werden. Er steht oben in der Adresszeile. / Could not copy the link. It is up in the address bar. | Kopieren ging nicht. Der Link steht oben in der Adresszeile — dort bekommst du ihn. / Copying did not work. The link is up in the address bar — you can get it there. | Plain on purpose: an error never winks. Colloquial, and it still hands over the usable next step. |
| `catalogue.lede` | Jede Karte, die es gibt — öffne eine für die ganze Geschichte. / Every card there is — open one for the whole story. | Jedes Schmuckstück, das es gibt — öffne eines für die ganze Geschichte. / Every treasure there is — open one for the whole story. | Plants the arrival noun (§0.4 anchors) outside the arrival moment, so "Schmuckstück" becomes house vocabulary rather than a one-off. |
| `catalogue.lede.rooms` | Die Sammlung nach Räumen. Jeder Raum wächst für sich. / The collection by room. Every room grows on its own. | … Jeder Raum wächst für sich, in Ruhe. / … Every room grows on its own, in its own time. | "in Ruhe / in its own time" adds the patience the product is about, without promising anything timed. |
| `set.complete.announce` | {set} ist komplett. / {set} is complete. | {set} ist komplett. Alle da. / {set} is complete. All present. | A room finishing is a roll call, not an audit result. Announced — no `!` (D26); at cap with the longest room name. |
| `set.complete.note` | Sein Rahmen leuchtet im Katalog. / Its frame lights up in the collection. | Der Rahmen leuchtet, als hätte er gewartet! / The frame is glowing, as if it had been waiting! | The visible set-complete line, so the surface's one `!` lives here. The frame is decor that was waiting for its room — the household's own anthropomorphising. |
| `catalogue.milestone` | Katalog-Meilenstein erreicht: {pct} Prozent — {outfit}. / Catalogue milestone reached: {pct} per cent — {outfit}. | Katalog: {pct} Prozent geschafft — {outfit}. / Catalogue: {pct} per cent done — {outfit}. | "Meilenstein erreicht" is a corporate intranet. "geschafft / done" is a household reporting progress; the `{outfit}` grammar and the single-source rule are untouched. Announced — no `!`. |
| `capstone.subtitle` | Katalog I · abgeschlossen / Catalogue I · completed | Katalog I · vollzählig / Catalogue I · all present | "abgeschlossen" also means closed for business — wrong for a living archive. "vollzählig" is the roll-call word. |
| `capstone.announce` | Katalog komplett. Elsas Ehrenmensch ist eingetragen. / Catalogue complete. Elsa's Honorary Human is entered. | Katalog komplett — Elsas Ehrenmensch ist eingetragen. / Catalogue complete — Elsa's Honorary Human is entered. | One sentence instead of two, so it reads as satisfaction rather than a receipt. Announced — no `!`; §12 item 10 keeps the exclamation unspent. |
| `capstone.waiting` | Das Heft hat Zuwachs — der Ehrenmensch wartet auf die neuen Karten. / New cards in the collection — the Honorary Human is waiting for them. | Der Ehrenmensch wartet auf die neuen Karten. Er hat es nicht eilig. / The Honorary Human is waiting for the new cards. No rush. | Removes the last "Heft" and the duplicated arrivals line; the arrival is announced once, by `zuwachs.line`. "Er hat es nicht eilig" makes the wait affectionate. |
| `state.empty.count` | Noch nichts da / Nothing in it yet | Leer, aber bereit / Empty, but ready | The count-line slot may wink: an empty catalogue is a held breath, not a shortfall. It still promises no cards. (`state.empty.owner` keeps its curator instruction verbatim.) |
| `state.error.catalogue` | Die Sammlung lädt nicht gerade. / The collection is not loading just now. | Die Sammlung kommt gleich wieder. / The collection will be back shortly. | Warm without being jokey: states the fact and promises only what a retry can deliver. No `!` in an error (§0.4.4). |
| `reset.body` | Das löscht die Sammlung, die Set-Fortschritte, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück. / … set progress, milestones … | Das löscht die Sammlung, die Räume samt Fortschritt, die Meilensteine und Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück. / This clears the Collection, room progress, the milestones and Elsa's Honorary Human — sound and language go back to default. | Adopts §12 item 2's plainer German and drops the deck's only spec-sounding anglicism. Full loss list and both preferences intact; this is the one string that must not wink. |
| `footer.line` | Kein Konto, keine Cookies, keine Zählung. Die Bibliothek gehört diesem Gerät. / … The library belongs to this device. | Kein Konto, keine Cookies, keine Zählung. Alles bleibt auf diesem Gerät — wo es hingehört. / … Everything stays on this device — where it belongs. | Same privacy floor in plainer words. "wo es hingehört / where it belongs" is the wink: this device is where a dog's archive belongs. |
| `lex:reiselust:term` / `lex:reiselust:def` | — (no string; open dependency recorded in `karte-des-tages.md` §6) | Reiselust / Wanderlust — die Neigung, im Auto ein Ziel zu vermuten. / the tendency to assume the car has a destination. | New pair (§6.6) closing a recorded build blocker. It is the **forecast label for the travel union** in Der Aushang, never a per-card stat. |

**Deliberately unchanged under the ruling** — recorded so nobody "re-voices" them later:
`stage.h1` (owner canon, D2, and already a warm question), `milestone.25/50/75.label` (27-character
marker labels; the warmth lives in `catalogue.milestone` and `outfit.*`), `stage.cta`
("Pack öffnen" must stay the one label a first-time visitor cannot misread), `reset.confirm` /
`reset.cancel` (destructive controls name the act), `card.share.copied` (a status string),
`demo.note` / `demo.mixed` (a sample notice is not a joke opportunity), and every set name, room
name, `Die Sammlung`, `gesammelt / collected` and `Elsas Ehrenmensch`.
