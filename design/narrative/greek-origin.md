# The Greek Origin — A Pantheon of One

> **Status**: Draft · **Author**: world-builder · **Last Updated**: 2026-11-22
> **Canon Level**: **Provisional** — the facts underneath (shelter rescue in Greece; picked up on the night of 14 May at 02:00 at a petrol station near Dortmund, the last station of a three-day journey) are **Established** owner canon; this myth layer is Provisional pending `narrative-director` sign-off.
> **Visible To Player**: **Discoverable** — four quiet surfaces, never front-loaded, never explained.
> **Cross-References**: `design/features/archive-fiction.md` (§0 house, §2 rooms, §3 voices, §4 Lexikon, §6 naming) · `design/game-brief.md` · `design/gdd/collection-meta.md` (R-I capstone) · `design/art/art-bible.md` (§1–2) · `design/copy/copy-deck.md` (§0.4 voice)
> **Source**: owner facts, 2026-11-22 (rescue in Greece; three-day journey; pickup 14 May, 02:00, petrol station near Dortmund) + this document for the myth layer. Nothing here is quoted as established by an earlier narrative document.
> **Purpose**: the household's affectionate mythology — a pantheon of one — layered *over* the archive, never replacing it. The catalogue stays the product; the myth is a margin note for a reader who looks twice.

---

## 0 · Frame: how a myth sits in an archive

**Two words, kept apart.** *Das Haus* is the archive and its register. *Der Haushalt* is the people it belongs to. The myth belongs to the household and is filed by the house; it never becomes a department, a room or a rule.

**Rules — binding.**

1. **A pantheon of one.** One goddess, no other gods, no cycle, no genealogy, no second deity implied anywhere. The word *Pantheon* never ships player-facing.
2. **The myth never explains itself.** No string says "we call her a goddess". The reader infers it from epithets, relics and one plaque. An explained myth is a costume.
3. **One myth line per screen.** Plaque, accession note, epithet, capstone: one, never two. If a myth line competes with a catalogue line for space, the catalogue wins.
4. **The myth mints nothing.** No card, no number, no room, no progress, no state. It is written in the register's own hand and accessioned like anything else — which is the joke, and the reason it stays small.

`myth:frame:lede` — **core concept, no surface allocated** (copy bank, never rendered as filler) — DE *"Ein Haushalt, eine Göttin, ein Katalog."* / EN *"One household, one goddess, one catalogue."* · ▸SC(46)

---

## 1 · Die Ankunft / The Arrival

Told in one place only: the record of the card the curator designates as the first (never the card face, never the pack). Three days of road, a last stop, a time — and no sea, no ferry, no harbour anywhere in it. The journey is endured, not enjoyed, and the shelter is a building, not a congregation.

| Key | DE | EN | Space |
| --- | --- | --- | --- |
| `myth:origin:title` | Die Ankunft | The Arrival | ▸SC(16) |
| `myth:origin:found` | Gefunden wurde sie in einem Haus voller Türen, in dem sie zu niemandem gehörte. | She was found in a house full of doors, where she belonged to no one. | ▸SC(96) |
| `myth:origin:aktion` | Eine klammheimliche Aktion: drei Tage Fahrt, letzte Station, eine Tankstelle bei Dortmund, 14. Mai, zwei Uhr nachts. | A hush-hush operation: three days on the road, last stop, a petrol station near Dortmund, 14 May, two in the morning. | ▸SC(120) |
| `myth:origin:claimed` | Dort wurde sie beansprucht — mit einer Decke, einer Leine und einem Napf. | There she was claimed — with a blanket, a leash and a bowl. | ▸SC(84) |
| `myth:origin:close` | Das ist die ganze Legende. Sie ist kurz, weil sie geprüft wurde. | That is the whole legend. It is short because it has been checked. | ▸SC(80) |

**What the legend must not do:** pity her, praise the rescuers, name the shelter or any person, imply she was adored there, inflate the pickup into a raid, or make the journey an adventure. She was found, she travelled, she was claimed at a petrol station at two in the morning. Flat facts, warm because they are true; the operation is a household word, the record stays flat.

---

## 2 · Epithets — a jurisdiction, not a compliment

Seven, no more. Each replaces a sentence; none is a slogan. An epithet may sit in the record or on a card's epithet line, never in a card name (names are offices — `archive-fiction.md` §6).

| Key | DE | EN | Meaning | Used at |
| --- | --- | --- | --- | --- |
| `myth:epithet:rescued` | Die Gerettete | The Rescued | the first fact, not an achievement; rescue named plainly, once | founding plaque, provenance line |
| `myth:epithet:arrived` | Die Angekommene | She Who Arrived | the second fact, the one that stuck | Abfahrtsaal, Ankunftstag, capstone |
| `myth:epithet:nap` | Herrin des Ruhesaals | Lady of the Nap Wing | jurisdiction over sleep; work done lying down | Ruhesaal cards, solstice ritual |
| `myth:epithet:departure` | Herrin des Abfahrtsaals | Lady of the Departure Hall | departures, window noses, the door that opens | Abfahrtsaal cards |
| `myth:epithet:guard` | Wächterin des Wachsaals | Warden of the Guard Room | vigilance; the eyebrow that reports | Wachsaal cards |
| `myth:epithet:garden` | Inspektorin der Außenstelle | Inspector of the Garden Annex | grounds, finds, border traffic | Außenstelle cards |
| `myth:epithet:unbribed` | Die Unbestechliche | The Unbribed | the bowl's independence; a treat buys nothing | bowl cards, the bowl's relic entry |

**Der Porträtsaal bleibt ohne Epitheton.** A portrait needs no byname — the one room where she looks back is already the whole sentence.

Epithet line: `card:<id>:epithet` carries the epithet alone, no punctuation but the name, ▸SC(30) DE / 30 EN; one per screen; **no slot exists yet** (D-3).

---

## 3 · Domains and relics

`myth:domain:lede` — DE *"Zuständig ist sie für Schlaf, Wachsamkeit, Grundstücksprüfung und Abfahrten; Ankünfte fallen mit an."* / EN *"Her portfolio is sleep, vigilance, grounds inspection and departures; arrivals come with the job."* · ▸SC(130)

The four relics are accessioned as equipment. In the household they are the *Heiligtümer*; the register keeps its own word, and that contrast is the whole joke.

| Key | Relic | Im Register | DE | EN |
| --- | --- | --- | --- | --- |
| `myth:relic:blanket` | Die Decke | Gerät, textil | Das älteste Stück der Sammlung. Undatiert, weil es älter ist als das Datieren. | The oldest piece in the collection. Undated, because it predates dating. |
| `myth:relic:leash` | Die Leine | Gerät, Führung | Das einzige Stück, das nach draußen weist. | The only object that points outdoors. |
| `myth:relic:bowl` | Der Napf | Gerät, Keramik | Das einzige Gefäß im Haus mit einer eigenen Meinung. | The only vessel in the house with an opinion. |
| `myth:relic:seat` | Der Rücksitz | Gerät, mobil | Der einzige Ausstellungsort, der sich bewegt. | The only display case that moves. |

`myth:relic:note` — DE *"Vier Stücke, alle als Gerät verzeichnet. Das Haus ist beim Wort geblieben."* / EN *"Four pieces, all recorded as equipment. The house has kept to the word."* · ▸SC(92)

---

## 4 · Das eine Verbot / The one refusal

Stated once, in the Lexikon margin or the origin record — never as a warning, an error, or a rule with reasons. Water is the one thing the goddess refuses, and the house has stopped negotiating.

| Key | DE | EN | Space |
| --- | --- | --- | --- |
| `myth:taboo:lede` | Wasser wird nicht verzeichnet. | Water is not catalogued. | ▸SC(32) |
| `myth:taboo:line` | Die Göttin verweigert es. Das Haus hat aufgehört zu fragen. | The goddess refuses it. The house has stopped asking. | ▸SC(66) |

No sea, no rain, no bathing, no wet dog, no boat appears in any myth string. The refusal is the only mention water ever gets, and it is a refusal, not an image.

---

## 5 · Feste / Festivals

Two dates, both display-only. **No festival creates state:** nothing is stored, counted, streaked or rewarded, and no surface may imply a reward. If a later screen wants a date badge, `game-designer` defines the mechanic first; this document authorises copy only.

| Key | DE | EN | Note |
| --- | --- | --- | --- |
| `myth:fest:arrival:name` | Der Ankunftstag | Arrival Day | 14 May, the end of the operation |
| `myth:fest:arrival:line` | Am 14. Mai wird nicht gefeiert; es wird verzeichnet, dass sie da ist. | On 14 May the house does not celebrate; it records that she is here. | one sentence, no thanks |
| `myth:fest:arrival:time` | Um zwei wird eine Kerze angezündet — die Stunde der klammheimlichen Aktion, sonst nichts. | At two a candle is lit — the hour of the hush-hush operation, nothing else. | the pickup hour, kept small |
| `myth:fest:arrival:note` | Ein Tag im Jahr, kein Zähler. Das Datum steht im Herkunftsvermerk. | One day a year, no counter. The date is in the provenance note. | the anti-streak clause |
| `myth:fest:solstice:name` | Die Sonnenwende | The Solstice | longest day |
| `myth:fest:solstice:line` | Die Sonnenwende wird im Liegen begangen: der längste Tag, der wärmste Fleck, keine Verpflichtung. | The solstice is observed lying down: the longest day, the warmest patch, no obligations. | ties to *Sonnenplatz* |
| `myth:fest:solstice:note` | Die Vorhänge bleiben offen, bis sie wandert. | The curtains stay open until she moves. | the spot moves, not her |

**No festival grants anything. Feste sind Daten, keine Belohnungen.** / *Festivals are dates, not rewards.* (`myth:fest:rule`)

---

## 6 · How the myth appears in the archive

| Surface | Key | Wording DE | Wording EN | Budget |
| --- | --- | --- | --- | --- |
| Founding plaque — entrance/colophon, no heading | `myth:plaque` | Dieses Haus verzeichnet eine Hündin, die aus dem Süden kam und blieb. | This house records a dog who came from the south and stayed. | ▸SC(90) |
| Accession note — record footer of the designated first card | `myth:accession` | Zugang aus Griechenland. Gerettet, aufgenommen, verzeichnet. | Accessioned from Greece. Rescued, taken in, recorded. | ▸SC(72) |
| Epithet line — record only until a slot exists | `card:<id>:epithet` | {epithet} | {epithet} | ▸SC(30) |
| Capstone — one line above the signature, **PROPOSED** | `myth:capstone` | Sie kam aus dem Süden. Alles Weitere steht im Katalog. | She came from the south. Everything else is in the catalogue. | ▸SC(76) |

**Budget of the layer:** three surfaces ship quietly (plaque, accession note, epithets); the capstone line appears only at completion and only if D-2 is approved. The myth never enters room door paragraphs, pack copy, progress lines, error states or card captions. Nothing in the register is rewritten; the accession note rides on a real photo card and the myth mints none of its own. `myth:frame:lede`, `myth:domain:lede` and `myth:relic:note` are reserved legend lines: banked until a surface is authorised, never rendered as filler.

---

## 7 · Canon, sensitivity and voice gates

| Gate | Binding rule | Check |
| --- | --- | --- |
| Rescue honoured | flat facts: found, travelled, claimed; no pity, no farce, no comic rescue | every origin string above |
| No mock religion | no rite, prayer, altar, clergy, congregation; *Göttin* at most once per screen, never in a card name | grep `Göttin` ≤ 1 per string set |
| No water | water named only in `myth:taboo:*`, as refusal; no sea, rain, bathing, wet dog, boat | grep water vocabulary outside §4 = 0 |
| Rescue reality | no name, date, place or claim about the shelter, staff or finder; only "Griechenland" is named | no proper noun but Greece |
| Address | German `du`; Elsa in third person; no first-person claim about her feelings | no formal `Sie` address; no "ich" at all |
| Punctuation | zero exclamation marks, both languages | `!` absent from every cell |
| No fake Greek | no Greek script, no transliteration, no invented ancient names | Latin script only |
| Localisation | one key = one DE + one EN string at one index; German is the layout driver | missing EN = build defect, not backlog |

Canon level per surface: plaque and accession note **Provisional** (Discoverable); epithets **Provisional** (Discoverable); capstone line **Under Review** (Hidden until completion).

---

## 8 · Five temptations to reject

| Temptation | Why it fails | Do instead |
| --- | --- | --- |
| Greek letters, meander borders, "Greek" typefaces | kitsch, unreadable, and fake text is forbidden; the archive has its own type | plain German and English in the archive's existing typesetting |
| Toga, laurel wreath, marble statue | costume, and it turns the rescue into a joke about her | the blanket, the leash, the bowl, the back seat |
| Zeus, Athena, Poseidon cameos | imports a pantheon she is not in; the sea god would break the water canon twice | a pantheon of one; no other gods, ever |
| Sea motifs — waves, anchors, harbours, "the crossing" | violates the water ruling and makes the journey a pleasure | road, door, hallway, back seat: land only |
| "Worshippers", *Gläubige*, *Anbeter*, "her followers" | implies a congregation and flatters the household | *das Haus*, *der Haushalt*, one reader — no flock |

---

## 9 · Cross-references, contradictions, decisions

**Checked 2026-11-22 against `archive-fiction.md`, `copy-deck.md` §0.4 and `art-bible.md` §1–2 — no contradiction introduced.** No existing document mentions a Greek origin (grep: 0 hits), so this adds canon rather than changing it. Room names and codes (`RUH GAR ABF BAL POR WAC NEU`), the water ruling and every SSOT string are quoted, not altered. `du`, no exclamation marks, no water imagery outside the refusal — verified across all cells above. The capstone line is PROPOSED and leaves every existing diploma field untouched.

**Decisions for the owner / `narrative-director`:**

- **D-1 · Record the origin in the archive's history.** Recommend one sentence in `archive-fiction.md` §0 and `game-brief.md`; `narrative-director` owns both documents and this file does not edit them. Cost: one line each.
- **D-2 · Capstone line.** Ship `myth:capstone` above the signature, or drop it. It is the only myth string that touches the completion state, so it needs ND and owner approval.
- **D-3 · Epithet slot.** `card:<id>:epithet` does not exist in `card-detail.md`. `ux-designer` must authorise a slot and its 30-character budget before any epithet line ships; until then §2 is a copy bank, not a layout. Flagged to `game-designer` as a display-only rule with no state.
- **D-4 · Adoptionstag date.** Owner supplies it; no date is invented here. Until then the strings say "der Tag der Ankunft" / "the day she arrived" and the date lives in the accession note.
