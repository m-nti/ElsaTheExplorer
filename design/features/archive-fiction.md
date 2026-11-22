# Archive Fiction: The House, Its Rooms, and Its Register

> **Status**: Draft (fiction layer for the refactor) · **Author**: narrative-director · **Last Updated**: 2026-11-22
> **Links To**: `design/game-brief.md` · `design/gdd/collection-meta.md` (R-A, R-E, R-G, R-H, R-I) · `design/player-journey.md` · `design/ux/binder.md` (§6 states) · `design/ux/card-detail.md` · `design/art/art-bible.md` (§1–2) · `assets/js/card-bank.js` (voice of the card copy) · `photos/captions.json`
> **Purpose**: the fiction that makes accession, rooms, progress and failure read as a world instead of a UI. This document owns *what the house is*; screen specs own *where a line appears*; the copy deck owns *the pair*. Strings marked **SSOT** are restated here only to be quoted, never changed — where this document would change one, it is listed as a decision in §7.
> **Markers**: `▸SC(n)` = space-critical, maximum characters in German (English may run ~10 % longer). Key grammar: `arch:<slot>`, `room:<slug>:<slot>`, `lex:<slug>:<term|def>`, `curator:<slot>`; `card:<id>:*` already exists. Every string is one copy-deck entry in DE and EN at one index.

---

## 0 · The House

**Core concept (one sentence):** a night archive in a small building with a single purpose — to keep a record of one dog's working life, card by card, without ever asking the reader for anything. (DE: *Ein Haus mit einem Zweck: das Leben einer Hündin verzeichnen, Karte für Karte.* / EN: *A house with one purpose: to record one dog's life, card by card.*)

**Rules — what the house can and cannot do**

1. It holds **one volume** (Sammlung I), **seven places** (six rooms and one shelf), and **one curator**. There is no other staff, no visitors' book and **no clock**: nothing in the house measures how long the reader has been away.
2. Nothing leaves. A card that is filed stays filed; a number once used is never reissued; an honour once earned is not taken back (the one exception is the reader returning their own reading card — §5).
3. The house never addresses the reader as a customer, never asks for anything, and never congratulates itself.
4. The house does not know the reader's name and never will — no accounts, no name field, no greeting that implies recognition. Warmth is carried by precision, not by familiarity.
5. It is open at night and the card is the only lit object (art bible §1). Every line in this document is written to be *read under that lamp*: short, printed, quiet.

**History (short, and all of it usable):** Sammlung I began when someone stopped showing photos and started numbering them. The numbering outgrew the drawer, so a house was built around the drawer — six rooms for what Elsa does, one shelf for what has not been sorted yet. The sixth room stood empty for a while; since the rebuilding it is the Abfahrtsaal. The house considers this normal: archives change rooms, not subjects.

**Connections:** wings and progress — `collection-meta.md` R-A/R-C; persistence and the reading-card model — R-E/R-J; chase card — R-G; stamps — R-H; capstone — R-I; surfaces — `binder.md`, `card-detail.md`, `stage-landing.md`.
**Player relevance:** the reader is not the subject and not the client. Elsa explored; the reader reads what she brought back (§3). That single division gives the title its meaning and keeps the visitor from competing with the dog.

---

## 1 · The Accession System

A card carries **three identifiers that must never be confused**: the volume, the accession number (identity), and the impression (the reader's copy). The stamp `2. Auflage` is the third one and says nothing about the card's age or rarity.

| Part | What it is | Printed as | Example | Space |
| --- | --- | --- | --- | --- |
| **Volume** | the collection itself; stays `I` until the curator closes it | `Sammlung I` / `Collection I` | Sammlung I | ▸SC(11) |
| **Zugangsnummer** | the card's identity, derived from the file name, never re-minted | 5 digits, zero-padded | `02345` | ▸SC(5) |
| **Prüfbuchstabe** | check letter; catches a mistyped digit, and reads as a number should | `-` + letter, alphabet without `I` and `O` | `K` | ▸SC(2) |
| **Signatur** | where it stands: room code + number (records and dialog only) | `RUH 02345` | RUH 02345 | — |
| **Auflage** | the impression the reader is holding; `1.` is never printed | `2. Auflage` | 2. Auflage | ▸SC(10) |

**Print line on the card** (`card:<id>:serial`) — DE `Sammlung I · 02345` / EN `Collection I · 02345` · ▸SC(18). Quiet, monospace, warm ink, in the slot the serial already occupies. The check letter and the shelf mark live in the full record (dialog footer / "Datensatz"), never on the face.

**What the number means.** It says *where the card stands*, not when it arrived, how rare it is, or how good it is. Low numbers are not older and not better; the archive numbers by the hand that filed it. This is the anti-gambling clause in fiction form: a number can never be read as a score.

**How it is minted (and why it stays stable).** The number is a pure function of the photo id — the file name — and of nothing else:

```text
serial(id) = pad5(1 + (fnv1a32(utf8(id)) mod 99999))      // 00001–99999
check(id)  = "ABCDEFGHJKLMNPQRSTUVWXYZ"[serial(id) mod 24] // no I, no O
```

Consequences, all binding:

- **Adding photos cannot move a number.** No index, no ordinal, no arrival counter exists anywhere, so the collection can grow in the middle without renumbering anything.
- **Renaming a photo = deaccession + accession.** The old number becomes vacant and the card arrives under a new one. This is the single most important rule for the curator: rename before the photos reach the family, or accept the renumbering.
- **Removing a photo retires its number.** Absent ids are pruned (R-E); the number is not reissued, and the house does not announce the vacancy.
- **Re-adding the same file name restores the same number.** The id is the identity, which is why the archive never needs a ledger.
- **Uniqueness is asserted, not assumed.** At 80 cards a collision is ~3 % likely over the collection's lifetime; a Vitest check asserts uniqueness of `serial` across the current manifest, and `serial` in `captions.json` is the curator's override for the degenerate case. Never renumber a live card to fix a collision.
- **Numbers are engraved, not counted.** `02345` — leading zero, check letter — is what a printed number is supposed to look like, and it is the only decoration the house allows itself.

**The volume.** `Sammlung I` is a proper name and survives translation in meaning, not in spelling: DE `Sammlung I`, EN `Collection I` (matches R-I's subtitle `Sammlung I · vollzählig` / `Collection I · all present`). **Sammlung II does not exist and is not promised;** it may be opened only when the curator declares I closed. Never print `Erste Auflage` as a series label — that word now belongs to the stamp.

**The impression.** `2. Auflage` (SSOT copy) is stamped on any pull of an already-collected card. It is always `2.`, never `3.` or `17.`: the house notes *that* you have read a card, not how often (`R-H`, no counter stored). Diegetically it is the reader's copy being reprinted, which is why the photo does not change and the number does not change. Line in the dialog (SSOT): DE *"Zweite Auflage — die Sammlung kennt sie schon."* / EN *"Second printing — the collection already knows this one."*

**Study collection.** Demo/sample entries are not accessioned: no number, no shelf mark, and a `Probe` / `Specimen` mark ▸SC(7) (`arch:sample:mark`). They remain fully playable and count exactly as today (E4) — this is a display rule only, never a progress rule.

---

## 2 · Room Lore

One place per room: **plaque** (room header, short), **door** (the paragraph — room header lede, share text, screen-reader description), **closed** (reserved for a rooms-index surface; the collection omits empty rooms per R2/E4, so a closed line is never rendered into the grid today).

- **Der Ruhesaal** `nap-wing` · code `RUH` · plaque ▸SC(60) — DE *"Der Ruhesaal — wo die meiste Arbeit im Liegen geschieht."* / EN *"The Nap Wing — where most of the work happens lying down."*
  - door — DE *"Hier hängt alles, was mit Schlaf zu tun hat: Sofas, Decken, der Zusammenbruch um drei. Ein Hund, der so viel liegt, arbeitet — das Haus hat es geprüft."* / EN *"Everything to do with sleep hangs here: sofas, duvets, the three o'clock collapse. A dog who lies down this much is working; the house has checked."*
  - closed — DE *"Der Ruhesaal ist leer. Der Rest der Sammlung schläft woanders."* / EN *"The Nap Wing is empty. The rest of the collection is sleeping elsewhere."*
- **Außenstelle Garten** `garden-annex` · code `GAR` · plaque ▸SC(60) — DE *"Außenstelle Garten — zuständig für Grundstück, Fundstücke und Grenzverkehr."* / EN *"The Garden Annex — in charge of grounds, finds and border traffic."*
  - door — DE *"Die Außenstelle verwaltet, was Elsa draußen findet und was sie draußen für ihres hält: Stöcke, Laub, den Vorgarten. Sie ist die einzige Abteilung mit einem Zaun."* / EN *"The annex keeps what Elsa finds outside and what she considers hers out there: sticks, leaves, the front garden. It is the only department with a fence."*
  - closed — DE *"Die Außenstelle hat noch keine Stücke. Der Zaun ist trotzdem ihrer."* / EN *"The annex holds nothing yet. The fence is hers regardless."*
- **Der Abfahrtsaal** `departure-hall` · code `ABF` · plaque ▸SC(60) — DE *"Der Abfahrtsaal — für Abfahrten, Fensternasen und Ankünfte."* / EN *"The Departure Hall — for departures, window noses and arrivals."*
  - door — DE *"Der Saal sammelt das Fahren: die Nase am Fenster, die Tür, die endlich aufgeht, den Parkplatz, der wie ein Ziel aussieht. Angekommen wird auch, aber nur nebenbei."* / EN *"This hall collects the driving: the nose at the window, the door that finally opens, the car park that looks like a destination. Arriving happens too, but only in passing."*
  - closed — DE *"Noch keine Abfahrt verzeichnet. Der Motor läuft schon."* / EN *"No departure on record yet. The engine is already running."*
- **Der Ballsaal** `ball-room` · code `BAL` · plaque ▸SC(60) — DE *"Der Ballsaal — ein Saal, ein Ball, klare Verhältnisse."* / EN *"The Ball Room — one hall, one ball, clear arrangements."*
  - door — DE *"Der Ballsaal ist der größte Raum des Hauses und für genau einen Ball eingerichtet. Was hier hängt, ist Beschaffung, Besitz und gelegentlich Verlust."* / EN *"The Ball Room is the largest room in the house and is furnished for exactly one ball. What hangs here is procurement, possession and the occasional loss."*
  - closed — DE *"Der Ballsaal wartet auf den Ball. Der Ball wartet unter dem Sofa."* / EN *"The Ball Room waits for the ball. The ball waits under the sofa."*
- **Der Porträtsaal** `portrait-room` · code `POR` · plaque ▸SC(60) — DE *"Der Porträtsaal — der einzige Raum, in dem sie zurückblickt."* / EN *"The Portrait Room — the only room where she looks back."*
  - door — DE *"Hier hängen die Bilder, in denen Elsa den Leser ansieht und nicht das Objekt. Der Saal ist klein, die Sitzungen waren lang, und in der Mitte hängt das Hauptporträt."* / EN *"Here hang the pictures in which Elsa looks at the reader rather than the object. The room is small, the sittings were long, and the Portrait of Record hangs in the middle."*
  - closed — DE *"Der Porträtsaal ist noch nicht gehängt. Das Hauptporträt bleibt vorerst im Depot."* / EN *"The Portrait Room is not hung yet. The Portrait of Record stays in storage for now."*
- **Der Wachsaal** `guard-room` · code `WAC` · plaque ▸SC(60) — DE *"Der Wachsaal — Dienst nach Vorschrift, und die Vorschrift ist ihre."* / EN *"The Guard Room — duty as ordered, and the orders are hers."*
  - door — DE *"Der Wachsaal dokumentiert den Dienst: Tür, Fenster, Geräusche im Flur und die eine Augenbraue, die alles meldet. Die Schicht endet nie, ruht aber gelegentlich."* / EN *"The Guard Room documents the duty: door, window, noises in the hallway, and the one eyebrow that reports everything. The shift never ends, though it occasionally rests."*
  - closed — DE *"Der Wachsaal ist unbesetzt. Das ist verdächtig."* / EN *"The Guard Room is unmanned. That is suspicious."*
- **Neuzugänge** `new-acquisitions` · code `NEU` · plaque ▸SC(60) — DE *"Neuzugänge — noch keinem Saal zugeteilt."* / EN *"New Acquisitions — not yet assigned to a wing."*
  - door — DE *"Das Regal für alles, was neu im Haus ist und noch keinen Saal hat. Es wächst von selbst, wird irgendwann einsortiert und beschwert sich nie."* / EN *"The shelf for everything new in the house that has no wing yet. It grows by itself, gets filed eventually, and never complains."*
  - closed — DE *"Die Neuzugänge sind abgearbeitet. Das kommt selten vor."* / EN *"New Acquisitions is cleared. That rarely happens."*

Keys: `room:<slug>:plaque`, `room:<slug>:door`, `room:<slug>:closed`. The shelf is a shelf, not a seventh room — never call it a Saal, and it earns no frame (R-D).

---

## 3 · The Curator, the Voice, and the Reader

**Two voices, one handwriting.** The **house** speaks in the running register: plaques, Lexikon, progress lines, stamps, empty and error states — third person about Elsa, present tense, first person plural only when the institution acts (*"das Haus hat es geprüft"*). The **curator** speaks only where she signs: the accession note and the diploma. Her first person singular (*"Ich habe sie aufgenommen, als…"*) appears at most once per document, which is what makes it worth reading.

**Who writes what.** Card names, moods, captions, alt text, `diplomaLine` and the accession note are the curator's (via `photos/captions.json`); the indexed fallbacks in `card-bank.js` are also authored copy. **No prose on a card is ever generated at runtime.** A card without a caption has no caption; the house does not improvise.

**Voice law** (binding on every string in this document and in the copy deck): `du`, never `Sie`; **at most one `!` per surface**, never in an error message, a destructive confirmation or an accessibility string (the terminal `!` is removed before a string enters the live region), and card names carry none (§6); one joke per card — the name is the second; no diminutives, no "süß/knuffig", no marketing warmth, no "wir freuen uns", no question put to the reader, no emoji, no first-person claim about Elsa's feelings. Warmth comes from precision and from noticing the right detail.

**The reader is a reader.** The printed role is **die Leserin, der Leser** — in prose, always `du`. Not *Gast* (hospitality, gift framing), not *Nutzer* (software), not *Sammler* (that is the curator). And **expedition language belongs to Elsa**: the title says she is the explorer, so the visitor's click is not an expedition. The four cards are what the archive deals, not what the reader hunted. (This settles the open question in `player-journey.md` §Open Questions in favour of the neutral register: keep `Pack öffnen` / `Open a pack`; do not ship `Auf Expedition gehen`.)

### Elsas Ehrenmensch — how the capstone addresses the reader

Fixed form (names SSOT from R-I; fields and fallback are new):

| Field | DE | EN |
| --- | --- | --- |
| Title | `Elsas Ehrenmensch` | `Elsa's Honorary Human` |
| Subtitle | `Sammlung I · vollzählig` | `Collection I · all present` |
| Issued for | `Ausgestellt für: die Leserin, den Leser` | `Issued to: the reader` |
| Date label | `Ausgestellt am {date}` | `Issued on {date}` |
| Pass label | `Durchgang {n}` | `Reading {n}` |
| Signature | `Die Kuratorin` | `The Curator` |

`curator:diploma:line` — the neutral fallback, used when `captions.json` meta has no `diplomaLine`:
DE *"Du hast alle Karten gelesen. Das Haus hat es vermerkt. — Die Kuratorin"* / EN *"You have read every card. The house has noted it. — The Curator"*

Rules for the curator's own line, when she writes it: address the reader as `du`; certify the reading, do not thank them; no `Herzlichen Glückwunsch`, no `Danke für deine Treue`, no pride on the reader's behalf; ≤ 180 characters; one sentence and a signature. The certificate has **no name field and never will** — "die Leserin, den Leser" is the address that includes everyone without asking.

---

## 4 · Elsa-Lexikon

A **legend, not a page**: each term is a disclosure attached to the stat it defines in the card dialog, and the full set doubles as the legend of *Das Gesamtverzeichnis*. One canonical pair per key — these strings are the SSOT for trait names, and `photoTraits` in `card-bank.js` must match them exactly (see D-2). Each definition is one sentence; the flatness is the joke.

| Term DE / EN | Definition DE | Definition EN |
| --- | --- | --- |
| Schlafmodus / Nap mode | Betriebszustand mit geschlossenen Augen; die Ohren bleiben angemeldet. | An operating state with the eyes closed; the ears remain clocked in. |
| Deckenbindung / Duvet loyalty | Das Verhältnis zwischen Elsa und einer Decke, an dem keine dritte Person beteiligt ist. | The relationship between Elsa and a duvet, to which no third party is a party. |
| Blickkontakt / Eye contact | Wie lange sie deinen Blick hält, ohne wegzusehen; bei Essbarem deutlich länger. | How long she holds your gaze without looking away; considerably longer where food is involved. |
| Aufmerksamkeit / Attention | Der Teil ihrer Aufmerksamkeit, der gerade nicht dem Geräusch im Flur gilt. | The share of her attention not currently assigned to a noise in the hallway. |
| Sofakomfort / Sofa comfort | Wie gut ein Sofa ist, gemessen daran, ob sie freiwillig darauf schläft. | How good a sofa is, measured by whether she chooses to sleep on it. |
| Höhlenfaktor / Cave factor | Die Bereitschaft, unter etwas zu liegen, das streng genommen zu klein ist. | The willingness to lie under something that is, strictly speaking, too small. |
| Spähblick / Sneaky peek | Der Blick unter der Decke hervor, der den Raum prüft, ohne ihn zu verlassen. | The look from under the duvet that inspects the room without leaving it. |
| Kuschelfaktor / Cuddle factor | Wie viel Nähe sie hergibt, ohne dass es nach Aufgabe aussieht. | How much closeness she gives up without it looking like surrender. |
| Versteckspiel / Hide-and-seek | Ihr Anteil am Spiel: sie versteckt sich, du suchst, sie gewinnt. | Her half of the game: she hides, you look, she wins. |
| Kuschelmodus / Cuddle mode | Der Kuschelfaktor als Zustand: leicht einzuschalten, schwer wieder aus. | The cuddle factor as a state: easy to switch on, hard to switch off. |
| Wachsamkeit / Vigilance | Die Grundeinstellung des Wachsaals; wird nie abgeschaltet, nur leiser gestellt. | The Guard Room's default setting; never switched off, only turned down. |
| Deckenrand / Duvet edge | Die Position genau auf der Kante der Decke, damit beide Seiten etwas von ihr haben. | The position exactly on the duvet's edge, so both sides get some of her. |
| Geduld / Patience | Wartezeit vor dem Napf, gemessen in Blicken. | Waiting time in front of the bowl, measured in looks. |
| Pfoten-Parkplatz / Paw parking | Die Fläche, die eine einzelne Pfote dauerhaft auf einem Menschen beansprucht. | The area a single paw permanently claims on a human being. |
| Ruhemodus / Rest mode | Wie Schlafmodus, aber mit offener Tür und einem Ohr im Flur. | Like nap mode, but with the door open and one ear in the hallway. |
| Ein-Auge-Wache / One-eye watch | Die Schicht, in der ein Auge schläft und das andere die Lage beurteilt. | The shift in which one eye sleeps while the other assesses the situation. |
| Kissenversteck / Cushion hideout | Ein Versteck, in das genau ein Hund passt, wenn man die Kissen mitzählt. | A hiding place that fits exactly one dog, if you count the cushions. |
| Unauffälligkeit / Stealth | Die Fähigkeit, unbemerkt im Raum zu sein, die sie selbst überschätzt. | The ability to be unnoticed in a room, which she overestimates. |
| Sonnenplatz / Sunspot | Ein Stück Boden, das wandert; sie weiß vorher, wohin. | A patch of floor that moves; she knows in advance where it is going. |
| Reiselust / Wanderlust | Die Neigung, im Auto ein Ziel zu vermuten. | The tendency to assume the car has a destination. |

Keys: `lex:<slug>:term`, `lex:<slug>:def`. Trait names are never synonymised at runtime and never paraphrased in a second string. `Reiselust / Wanderlust` is the **forecast label for Der Aushang's travel union** (`Abfahrtsaal ∪ Außenstelle Garten`, `karte-des-tages.md` §2) — never a per-card stat, and never a second string.

---

## 5 · Failure and Edge Fiction

The house has one manner in every failure: state the fact, do not console, do not blame, and never pretend a loss is a gain.

| Situation | The house's rule | String |
| --- | --- | --- |
| Catalogue truly empty | The existing owner instruction (SSOT, `binder.md` §6) stays verbatim beneath a closed-catalogue line. An empty house is a closed house, not an error. | `arch:catalogue:closed` — DE *"Die Sammlung ist noch nicht eröffnet."* / EN *"The collection is not open yet."* ▸SC(38) |
| Sample / study collection | The canonical sample note stays (SSOT). The card's own mark is `Probe` / `Specimen`; no number is printed. | `arch:sample:mark` ▸SC(7) |
| Image missing, HEIC unconverted, 404 | The plate still renders (PRD R7). The photo window says the picture is absent and the card is not. | `arch:image:missing` — DE *"Abbildung fehlt. Die Karte ist vollständig."* / EN *"Image missing. The card is complete."* ▸SC(38) |
| Deep link to an unknown id | **Silence.** The site opens normally with the pack in focus (canon); no line, no dialog, no apology. The absent card is not narrated. | — |
| Card deaccessioned (photo removed) | Nothing is announced. The number is vacant and stays vacant; the house does not keep a book of vacancies. | `arch:number:vacant` — reserved, not rendered today: DE *"Diese Nummer ist frei. Sie wird nicht neu vergeben."* / EN *"This number is vacant. It will not be reissued."* |
| Storage refused (private window) | **No string.** The house simply does not keep a reading card this visit; claiming continuity it lacks is the only failure that would matter. | — |
| Fewer than four cards / promotion / skip | No new copy. Slots never show voids; the promoted card is never asterisked (canon). | — |
| New photos arrive | Accession notice: the deck's `zuwachs.line`, quoted here and changed nowhere. `arch:zuwachs` is an **alias** of `zuwachs.line` — one string, one meaning, one copy-deck entry (copy deck §15, D5). | `arch:zuwachs` = `zuwachs.line` — DE *"{n} neue Schmuckstücke sind da!"* / EN *"{n} new treasures have arrived!"* ▸SC(44) |
| Reader resets | Canonical confirmation and announcement stay unchanged (SSOT). Diegetically the reader hands back **their reading card**; the archive's holdings are untouched — which is literally true, and is why reset is not a tragedy. One quiet line may follow. | `arch:reset:note` — DE *"Neue Lesekarte. Die Sammlung steht wieder offen."* / EN *"A new reading card. The collection is open again."* ▸SC(48) |

The reading-card model governs all five failure paths at once: what the reader loses is a copy; what the house holds never changes. Say it once, in the Lexikon margin if a surface ever needs to, and never again as reassurance.

---

## 6 · Naming Rules for Future Rooms and Cards

**Rooms.** A room is a *place in a building*, named for what Elsa does there — never for a mood, an abstraction, or a trait of the reader.

1. German name is a compound noun with a definite article ending in `-saal`, `-stelle` or `-zugänge`; English is a plain noun phrase with `Wing`, `Room`, `Hall`, `Annex` or `Acquisitions`. The pair is one string unit.
2. 3-letter room code, derived from the German name, unique, **never reused** (`RUH GAR ABF BAL POR WAC NEU`).
3. Every room ships with: plaque (≤ 60), door paragraph (1–2 sentences), closed line, one frame colour role, and 6–10 cards.
4. A sixth-and-seventh room may be added only if the photos demand it; seven places is a house, twelve is a website.
5. The shelf `Neuzugänge` is never promoted to a room and never earns a frame.

**Cards.** A card name is **an office a dog holds**, not a description of a photograph.

1. Pattern: `Wächterin der Keksdose`, `Ministerin für Mittagsschlaf`, `Amtliche Leckerli-Prüferin` — title, ministry, or post. If it could caption a stock photo, it is wrong.
2. ≤ 28 characters DE / 30 EN on the plate (▸SC(28)); no `!` in a card name; no adjective of quality; no first person; no rarity word in the name.
3. Caption: 1–2 sentences, present tense, third person `sie`, photo-matched, never explaining its own joke, never mentioning the camera or the photographer, never inventing a fact (PRD R6).
4. Mood: lowercase, 2–4 words, adjectival (*"stur und munter"*, *"wach, aber nur innerlich"*).
5. New stat keys are defined in §4 **before** first use; one canonical DE/EN pair per key, no synonyms.

**Banned vocabulary** (in both languages): `Serie`, `Set`, `Deck`, `Kollektion`, `Karte des Tages`, `Heft`, `Erste Auflage` as a series label, `ultra`, `legendär`, `sammle sie alle`, `Glückwunsch` outside the diploma ban, `Danke` as a closing, and any word for water.

---

## 7 · Contradictions Check and Decisions

**Checked against existing canon — no contradiction introduced:** room display names and slugs match `collection-meta.md` R-A exactly, and the codes `RUH GAR ABF BAL POR WAC NEU` are new but derived from those names; the chase card is named `Das Hauptporträt` / `The Portrait of Record` (R-G) everywhere above; the capstone name, subtitle, stamp line and reset copy are quoted, not rewritten; empty rooms stay omitted (R2/E4), so §2's closed lines are marked reserved; no water word and no `Sie` appears in any string above; at most one `!` per surface and never in error, destructive-confirmation or accessibility strings — the sanctioned surface here is the Zuwachs line, whose `!` is removed before the live region; the `2. Auflage` stamp, the `aus:` chip and the `In der Sammlung` badge keep their SSOT wording.

**Findings in existing copy (reported, not edited here):**
- `card-bank.js` still carries retired water content: `Badegast des Jahres` / `Bather of the Year`, `Unwetterwarnung, Stufe Pfote` / `Weather Warning, Paw Level`, *"Nass bis auf die Haut…"*, *"Nach dem Regen riecht sie nach nassem Hund und Stolz."*, mood `tropfnass` / `soaking wet`, and *"die Wiese klebt"* (mud-adjacent). All must be rewritten in the build phase per the water canon.
- Trait drift: `Wachsamkeit` maps to EN `One-eye watch` on `IMG_0155`, which collides with `Ein-Auge-Wache`. §4 fixes the pairs; `card-bank.js` follows.
- ~~Accession-notice wording conflicts: `game-brief.md` says *"Die Sammlung hat Zuwachs"*, `collection-meta.md` R8 and `binder.md` say *"Das Heft hat Zuwachs"*.~~ **RESOLVED 2026-11-22** to the copy-deck winner (owner voice ruling, D5): `{n} neue Schmuckstücke sind da!` / `{n} new treasures have arrived!`. Both *"Das Heft hat Zuwachs"* and *"Die Sammlung hat Zuwachs"* are retired (§13).

**Decisions for the owner (recommendation, then owner's call):**
- **D-1 · Zuwachs wording — RESOLVED 2026-11-22** to the copy-deck winner (D5, `zuwachs.line`): `{n} neue Schmuckstücke sind da!` / `{n} new treasures have arrived!`. The earlier recommendation (`Die Sammlung hat Zuwachs: {n} neue Karten.`) is withdrawn — the owner voice ruling retired that form together with `Heft`, with no exception. Cost: one copy-deck entry in two languages, plus the propagation pass listed in the findings above.
- **D-2 · Trait SSOT.** Adopt §4 as the canonical pair list and align `photoTraits` in the build phase. Cost: one pass over ten photo entries.
- **D-3 · Reader role.** Adopt *Leser:in* + neutral CTA and drop the expedition variants from the candidate copy. Cost: none; it removes a costume risk.
- **D-4 · Diploma field labels.** `Durchgang {n}` / `Reading {n}` for what R-I calls the lap number, plus the fallback line in §3. Cost: two labels.
- **D-5 · Room door copy placement.** Ship plaques now (headers); hold the door paragraphs for a rooms-index surface or the share text, so no long prose lands in the collection header. Owner/producer decides scope.

**Open, deliberately unanswered:** whether Sammlung II will ever exist; the curator's own `diplomaLine` (write it when Collection I is nearly done); whether the Lexikon ever becomes a browsable page (recommendation: no — a legend that stays a legend costs nothing and never competes with the cards).
