# Player Journey Map: Elsa the Explorer

> **Status**: Draft (v2 — explorer reframe; supersedes the v1 gift-framing draft)
> **Author**: ux-designer
> **Last Updated**: 2026-11-22
> **Links To**: `PRD.md` (product problem, personas, functional requirements), `design/ux/interaction-patterns.md` (every interaction named below is specified there), `design/accessibility-requirements.md` (Standard tier: keyboard-complete, visible focus, 4.5:1 contrast, reduced motion, screen-reader announcements, no color-only information), `assets/js/card-bank.js` (voice of the card copy)

---

## Positioning (the frame this map is built on)

**Elsa the Explorer is a card library — a Sammelwerk — not a gift toy.** The
collection is the product. Elsa is the *collection mechanism*: every photo the
owner supplies becomes an entry in the catalogue, and it is the catalogue that
the visitor explores, reads, and eventually completes. The visitor is not a
recipient of a present; they are an **explorer of the library** — someone who
opened the door, found the catalogue richer than expected, and keeps coming back
to finish their reading. The register is museum catalogue with warm, dry
humor: plaques, entries, catalog numbers, departments, acquisitions — written
in the family's *du* voice, never marketing confetti. Where the old framing
said "look what you got," this framing says "look what's *in the collection*
— and what your expedition turned up today." The brand name
**Elsa the Explorer** is fixed in both languages; taglines localize around it.

**What carries over from the built v1** (retained, not redesigned): the
photo→card pipeline (file drop → manifest → card), the unseen-first deck walk,
holo as a *material* treatment of the photo (foil strength, not a photo
filter), full German/English parity, no-tracking first-party localStorage
persistence, static hosting on IONOS (`photos.php` remains the runtime
manifest source, `photos.json` the fallback), and no build pipeline on the
server — the refactor builds locally via Vite (Svelte 5 + TypeScript strict)
and deploys statically. Everything else is free to be redesigned.

---

## Journey Overview

A friend or family member follows a chat link expecting nothing more than
"some dog pictures," and within ten seconds is standing in a dark collector's
parlour where the pack is the only lit object — and then holding five
foil-bordered entries of the catalogue like specimens pulled from a drawer.
The first expedition is a laugh; the reveal — where the shiny card always
lands late, never first — is the moment the visitor realizes this room was
*arranged* for them. From then on the experience deepens in one direction
only: the Catalogue itself. "gesehen" becomes "gesammelt / collected";
six themed departments (Der Ruhesaal, Außenstelle Garten, Der Abfahrtsaal,
Der Ballsaal, Der Porträtsaal, Der Wachsaal) plus the automatic loose
department (Neuzugänge) slowly assemble the complete picture of a dog's
entire working life, and the visitor starts *planning* the next expedition —
"I still need a Departure Hall entry" — instead of clicking randomly. The
peak is the chase card surfacing from *Der Porträtsaal*, and the emotional
end state is the completed
catalogue: **Elsas Ehrenmensch / Elsa's Honorary Human**, the single shareable
capstone in the catalogue header, with the **Das Gesamtverzeichnis / The
Master Index** plaque beside it as the stat card that says *you read all of
her*. After
that the relationship inverts, politely: the explorer becomes a reader of a
finished library, waiting on its curator — the owner, whose next acquisition
("{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!" — copy-deck
sync 2026-11-22) reopens the Catalogue — and a second lap is walked
under "2. Auflage" stamps, the catalogue's way of stamping a repeat reader as
a regular. What sustains it is not streaks or timers — it is that every new
photo is an accession to a collection that people are actually reading.

---

## Target Player Archetype

The visitor has **no gaming literacy requirement and no genre expectations** —
they arrive from a group chat, not a store page. They are a "one-tap
explorer": if the first meaningful action is not obvious within a breath, they
close the tab, and they never read instructions before acting. They *do* read
what is printed on the card itself, because it is about someone they know; an
entry whose caption is dry, silly, and specific earns a second look and a
forward to someone else. They are collectors by instinct (sticker albums,
trading cards, museum shops) rather than by system knowledge: they understand
"the collection holds one you don't have yet" without any tutorial. They
respect a site that asks nothing of them — no login, no cookies, no consent
banner — and they feel ownership of "their" catalogue the moment its progress
survives a page reload. They lean away from challenge and toward *delight and
completion*; the design's job is to make completing the catalogue feel like
having read a wonderful book, not like finishing a chore.

---

## Journey Phases

> Seven phases tailored to Elsa the Explorer (the template's standard six are
> merged and renamed into the explorer register where natural: Orientation and
> First Mastery collapse into First Expedition / The Reveal; Habitual Play and
> Long-Term Engagement become The Return Visit and Completing the Catalogue).
> No placeholder phases are kept.

---

### Phase 1: Entering the Library (0–30 seconds) · *Der Eintritt*

**Emotional state on arrival**: Mild, friendly curiosity at a low baseline of
attention. The visitor tapped a link inside a chat app while doing something
else. They are not skeptical — they trust the sender — but they are
*committed to nothing*: one slow load or one confusing room and they are back
in the chat.

**Primary question the player is asking**: "What is this place, and is it
worth ten seconds?"

**Goal**: Recognize within 2 seconds that this is *Elsa the Explorer's*
catalogue of Elsa, see one obvious thing to do, and understand that the answer
to "what do I do here?" is a single object in the light.

**Key experience the game must deliver**:
The dark parlour does its one job, now with a clearer purpose: the room is
night-dark, the pack is the only lit object, and the room reads as an
*institution*, not a novelty — the wordmark (Elsa the Explorer, fixed), an
eyebrow in museum-plaque style (DE: *"Katalog I"* / EN: *"Catalogue I"* —
copy-deck sync 2026-11-22, D1/D3), and a headline that answers the question
before it is asked (DE: *"Was steckt im Katalog?"* / EN: *"What's in the
catalogue?"*, D2). German first (household language). The visitor must
never see a loader as their first impression if it can be
avoided: entries resolve from `photos.php?list=1` → `photos.json` → samples,
and the layout must not shift while any of this happens. The pack (labeled
DE: *"Pack öffnen"* / EN: *"Open a pack"* — or explorer-register alternative:
*"Auf Expedition gehen"* / *"Begin an expedition"*) and the secondary
"Zum Katalog / To the catalogue" text link (D4) give exactly two doors, not a
menu. The `P` keyboard hint and the sound toggle are visible but quiet —
affordances offered, not demands.

**Emotional state on exit**: "Oh, this is a *place*, not a page" — charmed by
the register, already reaching for the pack.

**Risk if this phase fails**: The visitor returns to the chat within ten
seconds and never mentions the link again; the family-wide word-of-mouth that
is Elsen's entire distribution never starts.

**Edge & failure paths**:
- **First visit with real photos missing (sample mode).** The library is never
  empty: demo entries load and a quiet line states it the way a museum labels
  a study collection — DE: *"Das hier sind Beispielkarten. Die echten Fotos
  fehlen noch."* / EN: *"These are sample cards. The real photos are not in
  yet."* The pack still opens; the joke still lands; the first impression is
  the reveal, not the deficiency.
- **`photos.php` down or PHP disabled.** The app silently falls back to
  `photos.json` within its 3 s timeout. The visitor must perceive *nothing*:
  no flash of error, no second loading state. This fallback is invisible by
  design; it must stay invisible (the refactor keeps this: `photos.php` is the
  runtime manifest source, the static `photos.json` the fallback).
- **Both sources down / folder truly empty.** A designed empty state that
  speaks to the one person who can fix it (the curator/owner), in their
  language, with the exact next action — DE: *"Noch keine Karten. Leg
  Elsa-Fotos in den Ordner photos und führe dann npm run photos aus."* / EN:
  *"No cards yet. Put Elsa's photos in the photos folder, then run
  npm run photos."* No "Error", no stack trace, no blame.
- **Storage refused (private window / blocked localStorage).** Everything
  still works for this visit; the catalogue simply starts empty again next
  time. No warning, no modal — a private-window visitor has chosen that
  trade-off knowingly.
- **JavaScript disabled / module load failure.** The `<noscript>` line
  explains itself — DE: *"Das Pack braucht JavaScript. Die Karten liegen
  trotzdem im Ordner photos."* / EN: *"The pack needs JavaScript. The cards
  are still in the photos folder."* (Vite builds to a small bundle; a failed
  load must degrade to this same honest line, not a blank room.)

---

### Phase 2: First Expedition (the click, the tear, 30 seconds – 2 minutes) · *Die erste Expedition*

**Emotional state on arrival**: Hovering, half-committed, curious what "five
cards" actually looks like.

**Primary question the player is asking**: "What happens if I open this?"

**Goal**: Press one obvious thing and receive an unambiguous, generous
payoff — five entries at once — with zero decisions required first.

**Key experience the game must deliver**:
The single most important interaction in the product: one press (button, pack
seal, or `P`), the pack tears open in the center of the viewport, and five
distinct entries drop in, one at a time. The feedback chain must be immediate:
the rip sound, the tear animation, the tick per card — the player must know
the press was *received* within 100 ms. Copy stays in the catalogue register,
dry where it can be; the stage sets the promise before the tear: "Ihre großen
Auftritte, kleinen Launen und seltenen Glanzmomente — ein Pack nach dem
anderen." / "Her big appearances, small moods and rare shining moments — one
pack at a time." (copy-deck sync 2026-11-22) The trigger itself becomes a status line while
working ("Pack wird geöffnet" / "Opening the pack" — explorer variant:
*"Expedition läuft"* / *"Expedition in progress"*) and blocks re-entry so a
double-click cannot double-draw. By the end of this phase the player has seen
the collection's rules *working* — five different entries, at least one shiny
— without ever having been told the rules.

**Emotional state on exit**: Delighted and slightly possessive — "these are my
finds."

**Risk if this phase fails**: The player concludes it is "just a picture
gallery with extra clicks" and never opens a second pack.

**Edge & failure paths**:
- **Fewer than five photos exist.** The expedition returns *everything* there
  is, complete, not half-empty: five slots never show voids. A pack must never
  render a placeholder slot.
- **`photos.php` down mid-session.** The already-loaded list keeps the session
  fully functional; a re-fetch failure must not clear the catalogue or reset
  progress.
- **Reduced motion preference.** No tear animation, no stagger, no confetti:
  all five entries appear at once, immediately. The emotional beat must
  survive via copy and order, not animation.
- **Sound blocked or unavailable (autoplay policy, no WebAudio).** The reveal
  proceeds silently and identically; sound is an enhancement layer, never a
  gate.
- **Duplicated press during the opening window.** Inputs are locked for the
  ~1.5 s opening sequence; the locked state is visible (button disabled +
  label change), so "nothing happened" never reads as a bug.

---

### Phase 3: The Reveal (each card arriving, 2–5 minutes) · *Der Fund*

**Emotional state on arrival**: Watching the entries land, not yet reading
them.

**Primary question the player is asking**: "What did the expedition turn up —
and did it turn up anything *good*?"

**Goal**: Feel a small, earned escalation per card, capped by the
late-arriving highlight; leave able to name at least one entry they will
remember.

**Key experience the game must deliver**:
This is the phase the catalogue deliberately *choreographs*. The reveal order
is designed, not random: **the holo/rare card always lands 4th or 5th, never
first** — anticipation is built before the payoff, and the strongest material
arrives when attention has peaked. Each arrival gets its tick sound and a
small entrance; rarity reads instantly through foil strength and the star
strip, and never through color alone (stars count 3/4/5 + printed label
"Häufig / Selten / Holo-Pracht" — "Common / Rare / Holo glory"). When the
shuffle produced only commons, the promotion rule fires and one card becomes
holo: the "guaranteed shine" promise must be kept every single expedition,
visibly. The confetti flourish and chime close the beat. With reduced motion,
the choreography collapses to "all five at once" — which is why the printed
order and the copy carry the anticipation instead.

**Emotional state on exit**: "The fourth one — that's the one I'm sending to
Mum."

**Risk if this phase fails**: The reveal feels like a random five-image
slideshow; the player stops watching *which* card arrives and the rarity
system (and later, the departments) never becomes meaningful.

**Edge & failure paths**:
- **Promotion rule active (all commons drawn).** The promoted card is
  presented exactly like a native holo — no asterisk, no apology. The player
  must not be able to tell; curation honesty lives in the deck logic, not the
  UI.
- **Chase card in the pack.** Das Hauptporträt / The Portrait of Record — the iconic portrait of *Der Porträtsaal*
  (always holo, gold-glint frame) must land 4th/5th like any holo and read as
  *more* than a holo — its gold glint is the only frame treatment that
  outranks standard foil. Finding it is a private event worth telling someone
  about; no announcement pre-empts it.
- **Second-lap entries (all seen, deck restarted).** A haul of already-seen
  cards must never feel like punishment: each repeat carries its
  "2. Auflage / Second edition" stamp as a mark of a repeat reader, and the
  restart was announced once ("Das waren alle Karten. Jetzt beginnt das Pack
  von vorn." / "That was every card. The pack starts over.").
- **Very small collection (e.g. 3 photos).** The reveal degrades gracefully:
  three entries land, all rules (no dupes, ≥1 holo) still hold, and nothing in
  the UI implies a missing fourth.
- **Announcement ordering for screen readers.** The full haul summary
  ("5 Karten: names…") arrives after the reveal completes, not during it, so
  SR users get one coherent sentence instead of five interrupted ones.

---

### Phase 4: Reading the Catalogue (the catalogue grid, 2–15 minutes) · *Im Katalog blättern*

**Emotional state on arrival**: Holding five finds and a question: "how big is
this library?"

**Primary question the player is asking**: "How much is in the collection —
and what haven't I read yet?"

**Goal**: See the whole Sammelwerk at a glance, find their own place in it,
and discover that the collection has *structure* — departments, progress, and
a visible frontier of "not yet read."

**Key experience the game must deliver**:
The catalogue grid is the Catalogue proper — the Sammelwerk made browsable.
Every entry is a real, readable specimen (openable one by one,
deep-linkable) with an accessible name that says where it stands — DE:
*"Karte 07 öffnen: Ministerin für Mittagsschlaf, gesammelt"* / EN: *"Open
card 07: Minister of Naps, collected."* The copy shift is the emotional
hinge of this phase: entries are no longer "gesehen (seen)" — they are
**"gesammelt / collected"**, collected possessions, not browsing
history. Six themed department lines (Der Ruhesaal, Außenstelle Garten, Der
Abfahrtsaal, Der Ballsaal, Der Porträtsaal, Der Wachsaal) plus the
automatic loose department **Neuzugänge / New Acquisitions** turn a flat grid
into a shaped collection: the visitor discovers that the entries group into
stories ("she has a whole gardening department") and that each department has
a frontier. Completion of a department permanently changes its frame variant
— the catalogue visibly grows richer as the visitor fills it, the way a
well-bound book ages well. The overall progress line ("Du hast 14 von 24
gesammelt" / "You have collected 14 of 24") frames the whole reading
project.

**Emotional state on exit**: The explorer has a reading plan — "next
expedition, I want a Departure Hall entry" — which is the moment browsing
becomes collecting.

**Risk if this phase fails**: The grid is scrolled past as a wall of
thumbnails; the visitor never forms department-level goals and the meta layer
is dead weight.

**Edge & failure paths**:
- **Empty catalogue (no photos at all).** Same designed empty state as
  Phase 1 — message + the one command that fixes it, addressed to the curator.
  An empty state is a starting point, not an error.
- **Completed catalogue (everything read).** The catalogue at 100 % is a
  showcase, not a dead end: every entry "gesammelt", all department lines
  closed, frames at their completed variants, and the completed-state
  affordances (Elsas Ehrenmensch, Das Gesamtverzeichnis) surfaced here and in Phase 7. The
  "Von vorn" control is visible but quiet — never positioned to be pressed by
  accident.
- **Unseen-first walk finished mid-session.** The automatic restart is
  announced ("Von vorn. Alle Karten können wieder kommen." / "Starting over.
  Every card can come up again.") and the progress line visibly resets; the
  catalogue never silently rolls over.
- **Sample or mixed collection.** The demo note ("Beispielkarten / sample
  cards") distinguishes placeholders from real entries both visually and in
  each tile's accessible name; placeholders must be replaceable by real
  photos without any player-visible migration.
- **Keyboard-only browsing.** The grid is a linear button list in DOM order;
  focus must remain visible on every tile at 4.5:1 contrast, and
  focus-driven scrolling must keep the focused tile in view.

---

### Phase 5: Studying an Exhibit (the lightbox, 1–5 minutes per card) · *Am Studiertisch*

**Emotional state on arrival**: Curious about one specific entry — usually the
newest shiny, laid out on the study table.

**Primary question the player is asking**: "What does this entry say — and can
I keep it or send it?"

**Goal**: Read the entry as a *card* — name, mood, the dry line, the
imaginary stats — tilt it, flip it like a physical object, and send it or save
it in under three taps.

**Key experience the game must deliver**:
The lightbox is the study table: the only place the entry exists at full print
quality — name plate, art window with its layered foil material, rarity
strip, the bilingual line, the three "Fantasiewerte · mit voller Überzeugung /
Imaginary stats · held with conviction" chips (copy-deck sync 2026-11-22), the serial. It responds like a real
object: tilting under the pointer so the foil catches light (keyboard users
tilt with arrow keys), and a tap (or `Enter`/`F`) flips it over — a physical
act that makes it feel like a specimen in hand, not a web page. The action
row is three verbs, no more: **"Noch ein Pack / Another pack"** (primary — or
explorer variant: *"Nächste Expedition"* / *"Next expedition"*), **"Foto
speichern / Save this photo"** (download, original resolution), **"Teilen /
Share"** (native share sheet with clipboard fallback and a status line:
"Unterwegs. / On its way." — copy-deck sync 2026-11-22). The URL carries the
entry (`?photo=<id>&lang=<lang>`), so a forwarded link opens the *same* card
in the *sender's* language for the recipient. `←`/`→` (and swipe) walk the
catalogue from inside the dialog, which quietly teaches the whole library.
Every entry studied here is marked "gesammelt" instantly, and the player must be
able to *see* that happen (tile state, progress tick) — the reading loop
closes.

**Emotional state on exit**: The entry has been *used* — saved, sent, laughed
at — which is the product's actual purpose: a library only matters if it gets
read aloud.

**Risk if this phase fails**: Entries are looked at but never leave the site;
the family-sharing loop that defines the project never spins.

**Edge & failure paths**:
- **Share unsupported or blocked.** Clipboard fallback; if even that fails
  (rare, e.g. insecure context), the message stays useful and never blamey —
  DE: *"Link konnte nicht kopiert werden. Er steht oben in der Adresszeile."*
  / EN: *"Could not copy the link. It is up in the address bar."* The user
  always gets *something they can do*.
- **Deep link to an unknown photo id** (`?photo=…` that no longer exists —
  deaccessioned photo, typo). The site opens normally with the pack in focus;
  it must not show a broken dialog, a 404, or an empty lightbox.
  (Normative for screen specs: any `?photo=` id that does not resolve opens
  the site normally — no broken dialog, no empty lightbox — focus stays with
  the pack CTA.)
- **HEIC photo that fails to convert in-browser.** The card frame, name, mood
  and line still render (the frame is readable without the picture, per PRD
  R7); the photo window shows its alt text / "Im Bild" note, and "Foto
  speichern" offers the original file.
- **Dialog closed via Escape / backdrop.** Focus returns to the card that
  opened it (or the pack trigger), never dropped at `<body>` — the reader's
  place is preserved.
- **Completed collection + share.** Sharing works identically at 0 % and
  100 %; a shared entry is the recipient's first entry too — the loop
  re-enters at Phase 1 for whoever receives it.

---

### Phase 6: The Return Visit (the second, third, fifth visit) · *Der Wiederbesuch*

**Emotional state on arrival**: "I have a catalogue somewhere. Let me check
what's new." Mild possessive anticipation — the library owes them their
reading progress.

**Primary question the player is asking**: "What's new in the Catalogue since I
was here — and how far along am I?"

**Goal**: Within one screenful, see their progress intact, spot what changed
(new accessions, new milestones, departments closer to done), and get a reason
to open exactly one more pack.

**Key experience the game must deliver**:
Persistence *is* the phase. `lucky-elsa.seen.v1` restores which entries are
"gesammelt", `lucky-elsa.sets.v1` restores department progress and earned frame
variants, `lucky-elsa.flags.v1` restores milestones (25/50/75 % catalogue
outfits, Ehrenmensch claimed); `lucky-elsa.lang.v1` restores the language so an
English-speaking reader never re-finds the toggle. The room must answer "what
is new?" at a glance, in accession language: a new-photos line — DE: **"{n} neue Schmuckstücke sind da!"** / EN: **"{n} new treasures have arrived!"** (D5) — appears only when the curator has actually added material
since the last visit, turning a file drop into a player-facing acquisitions
notice. The unseen-first guarantee makes
every return visit *consequential*: the next expedition always contains
something they haven't read (until the deck rolls over, visibly announced).
Second-lap finds carry the "2. Auflage / Second edition" stamp, which converts
repetition into seniority — a repeat reader, not a failed draw. Milestones
surface as small earned honours, not banners: a catalogue outfit upgrade at
25/50/75 % (the gilded door sign, the reading lamp, the velvet rope)
25/50/75 % is permanent and visible in the catalogue's presentation.

**Emotional state on exit**: One specific unfinished thing is in mind — "two
entries to close Außenstelle Garten."

**Risk if this phase fails**: The reader returns, sees their progress gone or
changed in a way they can't read, and the site becomes "the link someone sent
once."

**Edge & failure paths**:
- **Storage evicted (browser cleanup, iOS eviction) or new device.** The
  catalogue starts empty without apology; the first expedition rebuilds
  progress quickly thanks to unseen-first. No "welcome back" lie — never
  claim continuity that isn't there. (First-party-only storage, PRD
  constraint: no accounts, so no cross-device sync is possible by design.)
- **New photos after completion.** The highest-value edge in the game: the
  completed catalogue reopens. "{n} neue Schmuckstücke sind da!" returns, the new
  entries' department lines show fresh frontiers, Elsas Ehrenmensch quietly shows its
  earned date while progress is again below 100 %, and the new entries *pull
  first* (unseen-first). The reader's frames and stamps stay — earned things
  are never taken back.
- **Language stored, URL overridden.** `?lang=de` beats a stored English
  choice (PRD F9): a German link shared into an English speaker's chat opens
  German *once*, and that choice is stored — this must read as polite, not as
  the site "forgetting".
- **Corrupted or stale storage keys.** `pruneSeen()`-style hygiene: ids that
  no longer exist are dropped silently; department progress recomputed from
  surviving ids. The catalogue must never show ghost entries.
- **Curator accessioned 50 photos at once.** The Zuwachs line must survive
  volume (state the count, not enumerate): DE: *"12 neue Schmuckstücke sind da!"* / EN: *"12 new treasures have arrived!"* The grid with >100
  tiles needs lazy thumbnails — performance is a UX feature at this phase.

---

### Phase 7: Completing the Catalogue (100 %, Elsas Ehrenmensch) · *Das Gesamtverzeichnis*

**Emotional state on arrival**: A reader who has been circling the last two
entries for days. Anticipation with a deadline they set themselves.

**Primary question the player is asking**: "What happens when the catalogue is
complete — was the reading worth it?"

**Goal**: Receive an *artefact*, not a toast. Something permanent, personal,
and shareable that certifies the whole relationship with the collection.

**Key experience the game must deliver**:
At 100 % the catalogue declares itself complete in its own register: **Elsas
Ehrenmensch / Elsa's Honorary Human** — the **single** 100 % capstone,
presented in the catalogue header in the parlour's visual language (the
card-as-lit-object principle applied to a document; explorer framing: the
reader's own honorary title, countersigned by the collection). It is
shareable, permanent, and the only completion artefact — beside it stands the
**Das Gesamtverzeichnis / The Master Index** plaque, the catalogue's own
summary, holo-grade, holding its place of honour unchanged. Before this
point, the staircase must have been visible: 25/50/75 % catalogue outfits as
ascending honours, each department's permanent frame variant as six smaller
honours along the way. The chase card — keystone of *Der Porträtsaal* — is
the emotional midpoint of completion, not its end: a reader can hold the
chase card for weeks before the Ehrenmensch. Elsas Ehrenmensch is shareable
for a reason: it is the one artefact that says *"I read the whole collection"*
and it belongs in the family chat. The moment it is earned, the catalogue
announces it once — DE: *"Katalog komplett — Elsas Ehrenmensch ist
eingetragen."* / EN: *"Catalogue complete. Elsa's Honorary Human is
entered."* After completion, the journey intentionally becomes Phase 6's
acquisitions loop — completion is a plateau with a door, not a wall.

**Emotional state on exit**: Pride with an artefact in hand — and, if the
design works, mild impatience for the curator's next accession.

**Risk if this phase fails**: 100 % arrives as a filled progress bar and
nothing else; the reader's last emotional beat with the product is a shrug.

**Edge & failure paths**:
- **Completed catalogue, returning repeatedly.** Elsas Ehrenmensch remains
  permanently accessible (Catalogue surface), showing its earned date; it must
  never auto-dismiss, never degrade into "you already did this".
- **Completion reached, then new photos arrive.** Progress drops below
  100 %; Elsas Ehrenmensch *stays earned* (flag in `lucky-elsa.flags.v1`) while new
  department lines open. The honour's permanence is the trust contract: the
  library never retroactively takes a certificate back.
- **"Von vorn" after completion.** Reset is the one destructive act in the
  product: it clears every `lucky-elsa.*` key (the Catalogue, room progress,
  milestones, Elsas Ehrenmensch — and sound/language preferences return to their
  defaults), and its confirmation lists exactly what is lost —
  DE: *"Das löscht den Katalog, die Räume samt Fortschritt, die Meilensteine und
  Elsas Ehrenmensch — Ton und Sprache kehren auf Standard zurück."* / EN:
  *"This clears the Catalogue, room progress, the milestones and Elsa's Honorary
  Human — sound and language return to their defaults."* (copy-deck sync
  2026-11-22, D9). Focus defaults to Cancel; the confirm button is labelled with
  the action ("Alles löschen" / "Delete everything"), never "Ja".
- **Milestone parity across readers.** Two family members with different
  progress must both always have a visible next step (a department at 1 card,
  a milestone 5 % away); completion design must not assume one shared account
  — each explorer's journey is their own.
- **Elsas Ehrenmensch as the only remaining goal.** Guarded by Phase 6's loop
  design: after completion, "Zuwachs" and second-lap stamps are the retention
  layer, not the Ehrenmensch. If neither exists (curator inactive), the completed
  catalogue remains a browsable showcase — a finished library is allowed to
  rest.

---

## Critical Moments

| Moment | Phase | Emotional Target | If It Fails |
|--------|-------|-----------------|-------------|
| The first pack tear | First Expedition | Delight — "oh, this is a *place*" | Visitor reads the site as a plain gallery; second expedition unlikely |
| The shiny card landing 4th/5th | The Reveal | Anticipation paid off — "it saved the best for late" | Reveal reads as random image shuffle; rarity never becomes meaningful |
| The guaranteed shine kept (promotion) | The Reveal | Trust — "this collection keeps its promises" | An all-common pack breaks the stage copy; player suspects broken randomness |
| Discovering the departments in the Catalogue | Reading the Catalogue | Recognition — "her life has departments" | Grid stays a flat thumbnail wall; meta layer never engages |
| First "gesammelt" tick after studying an entry | Studying an Exhibit | Ownership — "that one's collected now" | Seen-state invisible; progress feels disconnected from actions |
| The foil catching light under the pointer | Studying an Exhibit | Material wonder — "this is a *thing*, not a page" | Foil reads as a static gradient; the parlour's one trick wasted |
| The first share | Studying an Exhibit | Generosity — "you have to see this entry" | Sharing fails silently; the family loop never spins |
| Returning to an intact catalogue | The Return Visit | Relief + possession — "it kept my things" | Progress loss (real or apparent) destroys all trust permanently |
| "{n} neue Schmuckstücke sind da!" | The Return Visit | Anticipation — "there are new accessions for me" | New photos land silently; the curator's work has no reader-facing moment |
| The "2. Auflage" stamp on a repeat | The Reveal | Regular's warmth — "read it, still mine" | Repeats feel like failure or broken randomness |
| A department's permanent frame completing | Reading the Catalogue | Visible growth — "the catalogue got richer" | Department completion passes unnoticed; sets feel cosmetic |
| The chase card surfacing | The Reveal | A private event worth telling someone | Chase card reads as any other holo; keystone moment wasted |
| Milestone outfit at 25/50/75 % | The Return Visit | Earned honour — "the catalogue dresses up for its readers" | Milestones arrive as noise (banners) or not at all |
| Elsas Ehrenmensch | Completing the Catalogue | Pride with an artefact — "I read all of her" | 100 % is a filled bar and a shrug; the last beat fails |
| Das Gesamtverzeichnis revealed | Completing the Catalogue | Awe at the collection itself — "look at all of it" | Capstone card feels like any other entry |

---

## Retention Hooks

> Elsa the Explorer has no analytics and no notifications — every hook below
> is player-visible and honours the PRD's privacy floor (first-party
> localStorage only, nothing leaves the browser).

| Hook Type | Hook Description | Systems That Deliver It |
|-----------|-----------------|------------------------|
| **Session Start** | "What's new in the Catalogue?" — the catalogue changed since last visit, and the room says so in one line | Unseen-first deck walk, acquisitions line "{n} neue Schmuckstücke sind da! / {n} new treasures have arrived!", department lines with fresh frontiers, `lucky-elsa.sets.v1` / `lucky-elsa.flags.v1` restoring earned state |
| **Session End** | An expedition always ends with something unfinished: a department one card short, a milestone a few percent away, a chase card still out there | Department progress lines, 25/50/75 % milestones, chase card as long-tail goal, guaranteed ≥1 holo per pack keeping the next haul promising |
| **Daily Return** | Not time-gated — event-gated: the curator's accession is the "new material" moment | "{n} neue Schmuckstücke sind da!", unseen-first guarantee making the first expedition after an upload fully fresh, 2. Auflage stamps rewarding returns even with nothing new |
| **Long-Term** | Completion as a keepsake, then the second lap as seniority | Department frame variants (permanent), catalogue outfits, Elsas Ehrenmensch + Das Gesamtverzeichnis, 2. Auflage stamps, the Ehrenmensch's earned date |

---

## Player Progression Feel

**Primary feeling: a portrait assembling itself.** Progression in Elsa the
Explorer is story revelation crossed with keepsake-collecting: the reader
should feel they are slowly assembling the complete picture of one dog's
working life, entry by entry, and that the collection itself — the Sammelwerk
— is physically growing more splendid around the photos.

- **Beginning**: The catalogue is a stranger — a grid of entries, a few
  "gesammelt" ticks. Progress feels like *sampling the holdings*: "I've read
  five of her."
- **Middle**: The departments have names and personalities; the reader catches
  themselves saying "Außenstelle Garten is missing its digging entry." The frames
  have started to change as departments complete — the catalogue is visibly
  richer than on day one, and the reader did that. Progress feels like
  *knowing* her.
- **End**: The catalogue is a finished artefact: six complete department
  lines, the chase card home, outfits earned, Ehrenmensch on the wall. Progress has
  become *possession and testimony* — and the "2. Auflage" stamps on the
  second lap read as a regular reader's marginalia in a book already read.

Progression must never feel like *power*, *speed*, or *skill*: there are no
numbers to optimise, no timers to beat. The only scoreboard is the catalogue,
and its only competitor is the family member in the same chat thread.

---

## Anti-Patterns to Avoid

- **Gift-warping the register**: The product is a library the visitor
  *explores*, not a present they unwrap-and-forget. Copy must never say
  "surprise!" or frame the pack as generosity directed at the visitor; the
  generosity is the *collection's*, and the visitor is its reader. (The pack
  tear stays — it is how specimens are issued — but its copy speaks of
  expeditions and finds, not gifts.)
- **Repetition experienced as failure**: Every repeat pull must carry the
  "2. Auflage" stamp and the restart announcement. Never present a second lap
  as a regression — no "you've seen all this" framing, no reset prompts pushed
  at completed readers.
- **Progress loss without a word**: "Von vorn" is the only destructive action,
  and it must confirm with a one-line summary of exactly what is lost. Storage
  failures degrade silently *forward* (session works, nothing claimed about
  persistence) — never with an alarming warning the player cannot act on.
- **Rules invisible until they seem broken**: The unseen-first walk, the
  no-dupes rule, and the ≥1-holo guarantee must be stated in quiet copy ("Es
  gehen alle einmal durch, bevor das Pack von vorn beginnt" / "Every card gets
  a turn before any come back around") *before* the player has a reason to
  doubt the shuffle. Fairness that can't be perceived reads as unfairness.
- **Rarity told by color alone**: Foil strength is never the only signal —
  star counts and printed labels ("Häufig / Selten / Holo-Pracht") carry the
  same information for colorblind visitors, screen readers, and reduced-motion
  sessions.
- **The tutorial wall**: The library must never open with instructions. Rules
  surface as one-line copy in context (the `P` hint, the pack-dialog hint, the
  progress note). Progressive disclosure: the chase card, promotion rule, and
  department system are discovered, not announced.
- **Completion as content ceiling**: At 100 % the design must hand the reader
  to the Phase-6 loop (Zuwachs, second lap) or to a restful showcase — never
  to an empty celebration screen implying "that's all".
- **Honours that can be taken back**: Frame variants, outfits, stamps and the
  Ehrenmensch are permanent once earned (`flags.v1`). New accessions may reopen
  progress; they may never retroactively demote anything.
- **The curator's work made invisible**: A file drop that produces no
  reader-facing moment ("{n} neue Schmuckstücke sind da!") wastes the scarcest resource
  in the project (the owner's time) and the most valuable retention event.

---

## Validation Questions

> Elsa the Explorer validates by watching, not measuring: 3–5 family/friend
> testers, watched once, unexplained (PRD M5). These questions structure those
> sessions.

**Entering the Library (0–30 s)**
- [ ] "Without touching anything — what do you think this site is?"
- [ ] "What would you do first, and why that?"

**First Expedition / The Reveal (first 5 min)**
- [ ] "Which card was your favourite, and when did you know it was coming?"
- [ ] "Did anything feel random in a way you didn't trust?"
- [ ] (Reduced-motion tester) "Did the expedition still feel like an event?"

**Reading the Catalogue (10–30 min)**
- [ ] "Point to something you haven't read yet. How did you know?"
- [ ] "Do the departments mean anything to you? Which one do you care about?"
- [ ] "What does 'gesammelt' mean to you, in your own words?"

**Studying an Exhibit**
- [ ] "Send me one card. Talk me through how you did it."
- [ ] "Read this card out loud to me. What did you keep from it?"
- [ ] "Show me what you'd do with the card before reading it." (tilt/flip discovery)

**The Return Visit (2nd session, ≥1 day later)**
- [ ] "What did you expect to find when you opened the link again?"
- [ ] "Is there anything you were looking forward to pulling?"
- [ ] "Have you told anyone about this? What did you say?" (PRD M6 proxy)

**Completing the Catalogue / General**
- [ ] "If you finished everything, what would you want the site to give you?"
- [ ] "If you had to stop right now, what would you come back for?"
- [ ] "Is there anything the library isn't letting you do that you wish it would?"

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Does the entrance survive a slow IONOS first load — does the pack render before the visitor bails? (Watch sessions; no analytics exists or will.) | ux-designer | First watched-session round | Unresolved |
| Is the holo-lands-4th/5th reveal order *felt* by testers, or only by the design? Ask in session 1 before telling anyone. | ux-designer | First watched-session round | Unresolved |
| Does "gesammelt" read as possession to German visitors, or is the location badge "Im Katalog" clearer as the carry? (Copy A/B by watching, not by tracking.) | ux-designer + owner | First watched-session round | Unresolved |
| Do the explorer-register alternatives ("Auf Expedition gehen", "Nächste Expedition") beat the neutral register ("Pack öffnen", "Noch ein Pack") for German visitors — or do they read as costume? | ux-designer + owner | First copy pass before refactor merge | Unresolved |
| Should Elsas Ehrenmensch be printable (browser print stylesheet) in addition to shareable? | ux-designer + ui-programmer | Before completion meta implementation | Unresolved |
| Does the chase card need its own reveal beat (gold glint flourish) or does that break the "never announced" principle? | game-designer + ux-designer | Before Der Porträtsaal implementation | Unresolved |
| Is "{n} neue Schmuckstücke sind da!" placed correctly — stage copy vs. masthead line — for it to be seen on return? | ux-designer | First returning-visit test | Unresolved |
| Above roughly how many entries does the completed-catalogue showcase need paging or virtualisation to stay fast on a phone? (PRD §9.2 puts the question at ~200.) | ui-programmer + ux-designer | Before any large upload | Unresolved |
