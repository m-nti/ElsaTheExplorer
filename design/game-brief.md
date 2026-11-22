# Game Brief: Elsa the Explorer

## In your words

The owner's own words, verbatim from `PRD.md` §1–§3, plus the decisions locked this round.
Nothing is rewritten; every line is sourced. Lines the owner did not say are marked
*(guessed)* or *(inferred (strong))*.

**On the problem (PRD §1, verbatim):**

> "I have hundreds of Elsa photos that nobody gets to enjoy, because sharing them is either
> work for me or boring for them."

> "There is also no moment. A folder of photos is browsed; a pack is *opened*. The photos want
> one reason to be looked at again, and the family wants one reason to look."

**On the pack (PRD §1, verbatim):**

> "four cards, revealed one after another gives a small payoff per click and something to keep and compare, without
> pretending to be a product. Each supplied photo gets its own title and caption, so it becomes
> 'my' card rather than the fourth picture in a folder."

**On the audience (PRD §2, personas, verbatim):**

- Collector (owner): "Get photos in front of people with as little admin as possible, and not
  expose them publicly."
- Die Oma: "See a picture of the dog, no login, no fuss, big text."
- Der Freundeskreis: "Something fun to open a few times, and to send on."

**On the visitor's wishes (PRD §3, user stories, verbatim):**

> "As a visitor, I want to tap one big thing and get four cards, revealed one after another, so that I do not have
> to decide where to look."

> "As a visitor, I want a pack to hold cards I have not had yet, so that opening another one is
> worth it."

> "As a visitor, I want each card to say something silly and specific, so that there is a reason
> to laugh and to send it on."

> "As a visitor, I want at least one card in every pack to shine, so that opening a pack feels
> like a find."

> "As a visitor, I want to look through every card in the binder if I prefer browsing over
> opening packs."

**Owner decisions this round (close paraphrase, not quotes):** working title **Elsa the
Explorer**, used as the page/brand name in both languages with per-language taglines;
positioning is a **card library** — an archive-catalogue of Elsa's life where the collection
itself is the product and Elsa is the collection mechanism; the visitor is an explorer and
reader of that library; full refactor of the app is authorized with only the earning concepts
retained; sets become wings/chapters of the archive in the explorer register; the completion
reward is canonized as **Elsas Ehrenmensch / Elsa's Honorary Human**.

**Pitch:** An archive of one dog's whole life, collected on cards — open a pack, explore the
wings, and help complete Collection I. *(inferred (strong) — built from the owner's "no moment"
line, the library positioning and the locked meta scope.)*

**Genre:** Collectible card library (pack-opening collection meta), no battles, no deck. *(inferred (strong))*

**Controls:** One big button and a keyboard: click/`P` opens a pack, `←`/`→` walk the revealed
cards, `Enter` opens a card big, the collection grid is plain buttons, `DE`/`EN` and a sound
toggle sit in the header. Touch is first-class; `Esc` closes dialogs.

**Question:** Does exploring the library — guaranteed but unordered — stay fun across the
*second* and *third* visit, once the wings have names, progress, and one portrait of record
to wait for? *(inferred (strong))*

**Hooks:** (1) The pack ritual: tear, four cards, the shiniest lands last. (2) The cards'
voice: dry museum-catalogue titles like "Wächterin der Keksdose" with photo-matched imaginary
stats. (3) An archive that is *honestly* completable — the deck-walk guarantees every card
arrives; the visitor is never gambling, only exploring.

**Intent:** no goal to reach · soft or no failure · payoff builds *(you said, PRD §1: "without
pretending to be a product"; this round: the collection itself IS the product — so the "goal"
is completion of a collection, pursued at the visitor's own pace, with no fail state)*.

## Look and references

- Look: the existing dark collector's parlour, refined — night-dark plum-black room, soft
  overhead spotlight; the card is the only lit object in the room. Pearl-metal frames,
  indigo-black card plates, layered iridescent foil with diagonal glare and procedural
  glitter. Elsa's photographs remain the art; rarity changes the foil strength, never the
  photo. The foil system is anchored by the approved reference study
  (`/private/var/folders/.../holo-card-ref.html`): two `repeating-linear-gradient` foil
  layers with **em stops** (iridescent rainbow + fine diagonal prongs), a blurred
  `conic-gradient` rainbow bloom behind the card, a **pointer-tracked radial mask**
  (`--px`/`--py` custom properties), and a 3D tilt/flip with `aria-pressed` state. Every
  figure drawn (the paw-print SVG mark), never emoji.
- References: physical TCG pack ritual (the tear, the one-at-a-time reveal, the shiniest card
  held back to close the pack); stamp collecting (wings, printings, the "2. Auflage" stamp,
  a completion certificate for finishing the collection); the museum catalogue register (wings, departments,
  acquisitions, plaques).
- View: 2D, one static page. · Camera: fixed; the pack tears open centre-viewport, cards
  reveal one at a time into the drop row.

## First minute

The link lands in the family chat. The page opens in German into the dark parlour: one lit
pack under a spotlight, "Elsa the Explorer — das Archiv eines Hundelebens.", one big button.
One tap (or `P`): the wrapper tears, four cards rise one at a time — commons first, a rare,
and the holographic card lands last, at the peak. A chime, a confetti burst in the set's own
colours. The visitor taps one card big, reads "Wächterin der Keksdose" and its
"Fantasiewerte · nur zum Spaß", laughs, and shares it straight back into the chat. Taught by
doing; the only text is the card's own voice.

## Challenge

The exploration is the challenge, and it is gentle by design: 48–80 real cards, organised
into six named wings plus the growing shelf of New Acquisitions; a lap guarantees every card
comes up, but the *order* does not. A session feels non-trivial because the missing cards for
the Abfahrtsaal refuse to be summoned — you open packs and take what the archive deals.
The one card that cannot be rushed is the Portrait of Record in the Porträtsaal: it arrives
when the lap reaches it, never by odds. There is no loss and no cost of failure; what changes
over time is structure, not difficulty — wing progress lines, frame unlocks at wing
completion, collection outfits at 25/50/75 %, and Elsas Ehrenmensch at 100 %.

## Core loop

- **Micro (~20 s):** tear a pack → four cards, holo-last → tap one card big, read its joke →
  share it back into the chat.
- **Meso (~2–5 min):** pulled cards are collected into wings; the "aus:" chip and wing
  progress lines turn a lucky pull into "one closer to the Abfahrtsaal"; a wing can
  genuinely be completed within one sitting — that completion chimes and dresses its cards
  in their frame.
- **Macro (days–weeks):** the lap continues tomorrow with provably unseen cards; the owner
  curates and keeps adding to the archive, and the collection greets the visitor with
  "{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!"; milestones and
  finally Elsas Ehrenmensch accumulate.
  Nothing expires, so the loop never pressures.

## Goal & fail state

- No fail state exists and none should: a pack can always be opened, forever, and the archive
  only ever grows. *(you said — PRD §1: the photos want one reason to be looked at again;
  this round: the library belongs to the visitor's device, not to a server)*
- **A session feels complete when:** the visitor has opened at least one pack, laughed at one
  card, shared at most one, and can see one honest step forward ("Abfahrtsaal · 4 von 7
  gesammelt") that names what is still missing. Elsas Ehrenmensch at 100 % is the
  capstone, not the wall; every wing milestone before it rewards partial progress.

## Features

Marked against the **refactor target state**: `[x]` = concept survives from v1 and is ported
in step 1 of the build order; `[ ]` = new or changed. Legacy code itself is not preserved —
step 1 restructures everything.

- [x] Pack of four cards, no dupes inside a pack, every card seen once before the lap restarts (unseen-first deck walk — retained concept)
- [x] Holo-as-material rarity: rarity fixed per photo id; at least one rare/holo per pack via promotion pity (retained concept)
- [x] Card voice: bilingual name, mood, caption, photo-matched imaginary stats, labelled as such
- [x] DE default, EN toggle, persisted and URL-overridable (retained concept)
- [x] First-party localStorage only; no cookies, no analytics, nothing leaves the browser (retained concept)
- [x] Static deploy to IONOS; build runs locally via Vite; runtime stays server-render-free; `photos.php` remains the runtime manifest source, so the owner's FTP-drop workflow still works with no redeploy (retained concept, new toolchain)
- [ ] Test harness port: Vitest for logic, Playwright for UI checks (replaces the puppeteer-core `npm run qa`)
- [ ] **Svelte 5 rebuild:** port the logic into typed core modules (persist, i18n, manifest, packs, theatre, catalogue, card) and rebuild the UI as Svelte 5 components, behaviour-neutral, Vitest + Playwright suites green before and after
- [ ] Rebrand to **Elsa the Explorer**: wordmark, `<title>`, OG tags, "Sammlung I" eyebrow replacing "Serie I/Erste Auflage"; per-language taglines
- [ ] Holo-last reveal ordering in the pack
- [ ] "aus: [Wing]" chip on pulled cards and in the dialog
- [ ] Collection rename + copy register: binder becomes "Die Sammlung / The Collection"; "gesehen" → "gesammelt" (progress verb + tile state) everywhere, both languages; tile badge "In der Sammlung / In the collection" as location label
- [ ] "{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!" new-arrivals line (cap 44)
- [ ] Six named wings + New Acquisitions; `set` field in `captions.json`, optional
- [ ] Collection grouped by wings with per-wing progress lines
- [ ] Wing-completion frame unlocks + chime + announcement
- [ ] Collection-wide outfit milestones at 25/50/75 % (overall collection; per-room markers display-only affordance)
- [ ] Reset covers every `lucky-elsa.*` key — language and sound included — with a confirmation that names them
- [ ] Chase card "Das Hauptporträt / The Portrait of Record" with gold-glint keystone frame
- [ ] "2. Auflage" stamps on second-lap pulls
- [ ] "Elsas Ehrenmensch / Elsa's Honorary Human" at 100 %: composed, shareable, curator's closing line
- [ ] "Das Gesamtverzeichnis" stat-card plaque unlock alongside the Ehrenmensch

## Your systems

- Persistence (localStorage) · in the slice *(three-key contract; restructured in step 1)*
- Photos Pipeline (photos.php) · in the slice *(extends with optional `set`/`chase` fields)*
- Pack Generation · in the slice *(deck-walk, promotion pity, no dupes — ported, then hardened)*
- Reveal Theatre · thin stand-in *(stagger, sound, confetti exist; holo-last ordering and the reference-study foil pass are the refactor's new work)*
- Collection & Wings · thin stand-in *(the flat seen-set exists; wings, progress, frames are built in the refactor)*
- Milestones & Unlocks · later *(build order step 5; spec: design/gdd/collection-meta.md)*
- Chase Card · later *(build order step 6; spec: design/gdd/collection-meta.md)*
- Collection (binder) · thin stand-in *(grid, deep links, dialog walk exist; wing grouping and rename are the refactor)*
- Card Detail & Share · in the slice
- i18n & A11y plumbing · in the slice *(a11y spec: design/accessibility-requirements.md, separate agent)*

*(marks are (guessed) — chosen by design from the built state and the locked scope.)*

## Keep

- The cards' voice — dry, warm, bureaucratic-pet humour with museum-catalogue seriousness;
  "Sie hat den Stock gefunden. Es ist jetzt ihrer." Never rewritten to sound like marketing.
- The foil and the parlour — dark velvet room, the card as the only lit object; rarity changes
  the foil, never the photo; the reference study's foil stack is the target quality bar.
- The honest walk — every card comes up before any repeats; nothing is gated behind odds.
- The owner's curatorial life — adding to the archive stays drop-and-reload, minutes per
  month; curating wings is optional and always half-finished is fine.
- The privacy floor — no cookies, no analytics, no third-party requests; the library belongs
  to the visitor's device, not to a server.

## Avoid

- No accounts, no login, no server state — the library belongs to the visitor's device, not
  to a server *(you said — PRD §7 out of scope; reframed this round)*.
- No tracking of any kind, including privacy-friendly analytics *(you said — PRD §5)*.
- No gambling flavour: no odds-lottery, no "ultra rare!!!", no currencies, no pity-race; the
  deck-walk guarantee is the moral spine of the archive *(you said — tone of voice; inferred
  (strong): the "tasteful chase" framing)*.
- No emoji art, no exclamation-mark confetti, no marketing voice *(you said — PRD §5 tone row)*.
- No energy, streaks, countdowns or expiring cards — an archive never takes anything back
  *(inferred (strong))*
- No invented facts about Elsa: stats stay visibly imaginary, captions stay photo-matched
  *(you said — PRD F2a, R6)*.
- No "gift toy" framing anywhere in copy or design rationale *(owner decision this round: the
  collection itself is the product; the register is museum-catalogue, not present-giving)*.

## Out of scope

- Any server state, database, cron, or login *(PRD §7)*.
- Multiplayer, leaderboards, comments, reactions, trading — needs moderation and a data
  model; the family chat is the social layer *(PRD F28/F31)*.
- Visitor upload with moderation — decided for its own round (PRD §10.4), not part of this
  refactor.
- Currencies, shops, crafting-from-dupes, energy, streaks, daily rewards.
- Languages beyond DE/EN *(PRD F33)*.
- Analytics of any kind *(PRD §5: "a number nobody needs")*.
- A redesign away from the dark collector's parlour *(owner decision this round: refine, don't rebrand — the rebrand is the name and register, not the room)*.
- Any runtime server dependency: the built site is static files on IONOS; no server state at runtime *(the toolchain builds locally via Vite; `photos.php` stays a read-only manifest source, so content updates never require a redeploy)*.

## Build order

A refactor, not a patch series: each step lands on a restructured codebase, and behaviour
only changes where a step says so.

1. **Rebuild scaffold (behaviour-neutral).** Stand up Svelte 5 + Vite 8 + TypeScript
   (strict) + Vitest + Playwright; port the logic into typed core modules — `persist`,
   `i18n`, `manifest`, `packs`, `theatre`, `catalogue`, `card` — with the collection
   verbs (`markSeen, onWingComplete, onMilestone, onAllComplete, resetAll`) as the only
   writers of collection state; rebuild the UI as Svelte 5 components; port the qa checks
   to Vitest (logic) and Playwright (UI), green before and after. This step proves the
   structure everything else builds on, and the deploy stays static files to IONOS with
   `photos.php` as the runtime manifest source.
2. **The theatre bet (core-fun first).** Holo-last reveal ordering, and the foil pass aligned
   to the reference study's stack. The cheapest big feel win; verify with 2–3 family testers
   before continuing.
3. **Rebrand + register.** Elsa the Explorer wordmark/title/OG, "Sammlung I" eyebrow,
   "Die Sammlung / The Collection" rename, "gesehen" → "gesammelt" copy swap, "aus:" chip,
   "{n} neue Schmuckstücke sind da!" / "{n} new treasures have arrived!" line. One sitting.
4. **Wings.** Six named wings + New Acquisitions; `set` field in `captions.json` (optional);
   collection grouped by wings with per-wing progress lines. The meso-loop becomes real.
5. **Milestones & unlocks.** Wing frames, 25/50/75 % collection outfits (overall; per-room
   markers display-only), reset covering every `lucky-elsa.*` key — language and sound
   included — with a confirmation that names them.
6. **Capstones.** The Portrait of Record (chase), "2. Auflage" stamps, Elsas Ehrenmensch,
   the Gesamtverzeichnis plaque.

---
**Kill condition:** if, after step 4 ships, testers do not check their wing progress before
leaving, stop adding meta and return to curation (more photos, better captions).

**Who it's for / what they feel:** the explorer of a small family archive — a 60-second laugh
that leaves one honest line of collection progress behind; Oma feels no fuss, the friend feels
the pull of the missing cards.

**Games you love / don't:** *(guessed)* Love physical TCG pack ritual (the tear, the held-back
shiny) and real museum catalogues and stamp albums (wings, printings, the completion
certificate); don't love gacha mobile games (the odds theatre is exactly what the deck-walk
exists to refuse).
