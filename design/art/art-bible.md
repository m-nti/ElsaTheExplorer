# Art Bible: Elsa the Explorer

> **Status**: Draft · Reframe 3 (reveal camera; four-card pack)
> **Owned By**: art-director
> **Last Updated**: 2026-11-22
> **Art Director Sign-Off (AD-ART-BIBLE)**: APPROVED 2026-11-22 — gate re-run clean (5 findings + 3 residues fixed)

Scope note: this is a **refinement** of the shipped dark parlour look, not a redesign —
but the *product definition* has been sharpened, and with it every visual sentence below.
**Elsa the Explorer** is not a gift toy; it is a **card library**. The collection is the
product, Elsa is the collection mechanism, and the visitor is an explorer and reader of a
small, lovingly over-catalogued archive. Where the old bible said "collector's parlour",
this one says the same room with its true name: a **night library / archive whose only lit
display is the card under study**. Hex values are mapped from the shipped code
(`assets/css/style.css`, `assets/css/cards.css`); where this bible changes something, it
says so explicitly.

Brand note (actionable): the shipped wordmark, pack seal and card-back mark read
"Elsen"; the product name is **Elsa the Explorer**. The rename is an art-bible-sanctioned
change for the wordmark, `<title>`, seal word, card back and OG image.

---

## 1. Visual Identity Statement

**The rule, one line:**

> **Night library, one lit reading: all light, sheen and motion belong to the card under
> study — and within the card, to Elsa's photograph.**

The room is an archive at night: shelves, a reading table, one lamp, and a single exhibit
plate turned toward the reader. Everything else on screen is furniture that may be
beautiful but may not compete for brightness, saturation or movement. The card is not
decorated light — it is a *document being examined*, and the examination is the product.

**Supporting principles:**

1. **Light rations attention.** The brightest element is the card in focus; the most
   saturated element is the foil; the only moving elements are foil physics and the
   opening theatre. Room ambience (violet pool `rgb(111 77 142 / 20%)`, amber whisper
   `rgb(192 152 119 / 6%)`, the overhead beam, dust motes) may glow but never flicker,
   sparkle or outrank the card.
   *Design test:* at 25% screen brightness in a greyscale screenshot, the eye must still
   land on the card (or the sealed volume) first. If a button, heading or glow wins that
   test, dim it. Serves the pillar *the collection is the product*: an explorer's eye must
   always know which document is open.

2. **Rarity is a material, not a colour.** Rare and holo differ from common by *physics* —
   foil edge bands, glint sweep, etched interference, glitter planes, star count — never
   by hue alone. This is the accessibility contract (WCAG 2.2 AA, no colour-only
   information) and the library contract at once: condition of the document is legible to
   any reader, in any light.
   *Design test:* desaturate the screen and pause all animation — common, rare and holo
   must still be distinguishable by texture density, star count and the chip label
   (Häufig / Selten / Holo-Pracht). Serves the pillar *every pull holds a find*.

3. **Warm paper in a cool archive.** The building is cool (indigo-black surfaces
   `#111017`, `#1b1823`, `#211d2a`, `#2c2736`, violet ambience); everything that *means*
   something is warm (paper-white ink `#f5f0ea`, metal `#d4c2a8`, accent `#e8c9a5`, pearl
   foil, the photo). Warmth = value and meaning; coolness = structure and silence.
   *Design test:* any element that carries meaning (text, foil, rarity cue, progress) sits
   on the warm side of the palette; anything that is pure ambience sits on the cool side.
   A warm decoration or a cool label is a bug.
   Serves the **museum-catalogue register** — the "the cards' voice" hook: the archive
   speaks in dry, lovingly over-precise catalogue prose, and it is the warm-ink-on-cool-
   structure split that makes that voice feel *printed and official* rather than app-like.
   A catalogue entry is printed matter; printed matter is warm ink on cool stock.

---

## 2. Mood & Atmosphere

Six states, catalogued. Each gets an archive-register name (DE/EN, dry humour intact), its
own lighting character, adjectives and energy level; consecutive states must never share a
lighting signature. Rarity, foil and chase rules are untouched by this reframe.

| Set theme | State | Emotional target | Lighting character | Adjectives | Energy |
| --- | --- | --- | --- | --- | --- |
| **1 · Eintreten / Admittance** | Arrival (landing, `.stage`) | Entering the library after hours. Nothing is open yet; the room is waiting for a reader. | One cool overhead beam (`rgb(228 211 255/14%)`, blur 24px) from top-centre; a wide violet reading pool `rgb(111 77 142 / 20%)` beneath it; a low amber whisper `rgb(192 152 119 / 6%)` bottom-left; dust motes drifting at sleep speed. No foil colour anywhere except on the sealed volume itself. | hushed, stacks-cool, expectant, warm-dark, still | **2 / 10** |
| **2 · Aus dem Magazin / From the Stacks** | Pack anticipation (`pack-dialog` sachet) | A volume fetched from the closed stacks and set down in front of you, still wrapped. The request slip was honoured. | Light narrows to the packet: saturated foil sheen (the `118deg` band family), crimped serrated edge catching white, one seam flash. The room recedes into `rgb(8 7 12 / 90%)` + blur 18px. | crisp, fetched, paper-cold, tight-focus, tensile | **4 → 7** |
| **3 · Am Lesetisch / At the Reading Table** | The reveal (four cards, one in focus) | The reading-table moment: four documents dealt face-up one at a time, each held in focus, then the camera pulls back to lay the set out — a reader who just sat down, shown the accession. | Brightest state in the product. White flash (`pack-flash`, ≤ 0.92, one frame), jagged rainbow tear, cards entering with glint shadows; violet table glow `rgb(118 91 139 / 20%)` warms the desk. | bright, generous, dealt, giggly, shiny | **8 / 10** (the only high-energy state) |
| **4 · In den Regalen / Among the Shelves** | Browsing Die Sammlung (`.album`) | Walking the stacks. No theatre; the shelf rows are the pleasure — the *catalogue* is browsable. | Coldest, flattest state: desk surface `#15131b` with a 2% white top sheen, even dim light, tiles asleep until hover lifts them 5px. | even, archival, patient, browsable, tidy | **3 / 10** |
| **5 · Unter der Lampe / Under the Lamp** | Card detail (`.lightbox`) | The card under study: pulled from the shelf, laid under the single lamp, examined. Reverence, not excitement. | The spotlight returns: card centred on `#1d1924 → #131119`, violet halo `rgb(151 119 175 / 14%)`, everything else falls into `rgb(7 6 10 / 82%)` + blur 12px. Holo cards may glint; nothing else moves. | reverent, close-reading, glassy, warm-centred, deliberate | **4 / 10** |
| **6 · Sammlung geschlossen / The Collection Closed** | Completion (Elsas Ehrenmensch — *not built; art direction for round two*) | The collection is closed: every entry seen. The archive hands the reader a certificate and thanks them for their thoroughness. | The only state whose ambience is **warm**: an accent-gold wash (`--accent #e8c9a5`, `--metal #d4c2a8`) replaces the violet pool; plate, seal and stamp language promoted to the page; serial + "Erste Auflage" typography scaled into a catalogue-certificate. | golden, catalogued, stamped, quietly proud, complete | **6 / 10**, calm not bouncy |

Distinctness test: take one screenshot of each state, shuffle them — a viewer must put
each in its correct order from lighting alone. If two states match, change the amber/violet
ratio or the beam width before changing any hue.

---

## 3. Shape Language

**Card silhouette philosophy.** The card is the library's exhibit plate; its silhouette
must read at any size, from a 90px shelf tile to the 340px under-lamp view. The silhouette
is a **trading-card rectangle in a pearl frame**: outer radius 16–18px (13px under 760px),
a 4–8px warm pearl rim (the `linear-gradient(135deg, #dfd4c5 … #a48fa4)` band from
`cards.css`), then an indigo-black inner plate. At thumbnail size only two things must
survive: the **pearl rim** (the plate's outline) and the **photo window** (the face). Two
ratios govern the card, named once here and used everywhere: **card-ratio `0.70` (w:h)** —
the card body's aspect, binding for drop, tile and full variants alike — and
**window-ratio `4:5` (w:h)** — the photo window's aspect, likewise one ratio for drop,
tile and full. Tiles keep the same anatomy scaled. One distinguishing trait per size:
thumbnail = photo + pearl rim; full card = everything.

**Plate / starfield / foil geometry.**

- **Plate** (`.card__plate`): flat, frontal, rectangular with softly cut top corners
  (8/8/4/4). A hard horizontal band — the collection header: number, name, mood, rarity
  chip on `#2c2636 → #17151c`. Never rounded into a pill, never given a border that fights
  the foil edge.
- **Starfield** (card back): radial violet haze + `repeating-conic` star rays at 8° pitch +
  concentric `repeating-radial` rings inside a 6%-inset border ring, brand mark "E" in a
  circular seal. Geometry is **centred and radial** — the back is the only centred
  composition in the product.
- **Foil**: always **diagonal**, always the same angle family — 112–118° (the recurring
  `118deg` in both CSS files, shared with the holo study's `.frame-holo` and `.holo`
  layers). Bands, etch lines, glitter planes and glare sweeps all follow it. Foil geometry
  is a *rim*, never a flood: masked to the card edge (`mask-composite: exclude`) or
  pointer-masked and capped over the photo (see §8 zone law and §4 holo material rules).
- **Registration ticks**: the 26px × 2px `#fff5e5` corner marks on the photo window
  (`.card__frame`) are a deliberate stamp/registration motif — keep them. In the library
  frame they read as plate-mount marks around a print mounted for examination; they also
  double as the "this is a document, not a screenshot" cue.

**UI shape grammar — rounded collector's furniture.**

- Radius scale only from the existing tokens: `--radius-sm 8px`, `--radius-md 16px`,
  `--radius-lg 24px`, `--radius-pill 999px`. Buttons, chips and toggles are pills; dialogs
  are 18–22px rounded slabs (glass cases); panels are 8–16px.
- Hairlines over fills: boundaries are 1px `rgb(245 240 234 / 14%)` (`--line`) or 28%
  (`--line-strong`); surfaces separate through raised background (`#1b1823 → #2c2736`) plus
  hairline, not shadows-on-everything. Shadows are for objects that float (cards, sachet,
  dialogs) — if it lies flat, it gets a hairline instead.
- Overhead light in the shape language: raised surfaces get a 1px inset top highlight
  (`inset 0 1px rgb(255 255 255 / …)`) — every "object" in the building is lit from above,
  consistently.

**Hero vs supporting shapes.** Hero shapes are the circle-based marks (paw crest in a
50px circle, card-back seal, `card__rays` sparkles ✧) and the photo window rectangle —
they carry focus. Supporting shapes are inset panels (`.card__line`, stat tiles: 7–8px
radius, 12–15% white gradients) and must stay visually quiet: no borders brighter than
`--line-strong`, no gradients steeper than 155°. If a supporting shape needs an outline
glow to be noticed, the hierarchy is wrong — promote it or delete it.

---

## 4. Color System

### The palette, mapped from the code

**Building — cool structural surfaces (never carry meaning):**

| Hex / value | Token | Role |
| --- | --- | --- |
| `#111017` | `--bg` | Night base. The archive after closing. |
| `#1b1823` | `--bg-raised` | First raised furniture (masthead glass at 72%). |
| `#211d2a` | `--surface` | Panels, skip-link, pressed states. |
| `#2c2736` | `--surface-light` | Hover fill, active lang pill, top plate tone. |
| `#15131b` / `#100f15` | (literal) | Shelf desk / colophon floor — the deepest furniture. |
| `#25212d → #16141b` | card inner (`.card::before`) | Indigo-black plate body. |
| `#2c2636 → #17151c` | card plate | The printed catalogue header band. |
| `#1f1b27`, `#30293a`, `#5a4565` | pack seal / sachet | Packet materials — violet-leaning paper from the stacks. |
| `rgb(111 77 142 / 20%)`, `rgb(151 119 175 / 14%)`, `rgb(228 211 255/14%)` | ambience | Violet pools and beam. Ambience only, **never semantic**. |

**Paper & metal — warm meaning-bearing:**

| Hex / value | Token | Role |
| --- | --- | --- |
| `#f5f0ea` | `--ink` | All primary text; solid button face; 14–28% alpha versions are the hairlines. |
| `#aaa3b2` | `--muted` | Secondary text (7.7:1 on `--bg` — the default for anything a reader must read). |
| `#978fa0` | `--quiet` | Tertiary text. **Resolved (owner, 2026-11-22): raised from the shipped `#756e7d` (3.86:1, out of spec) to `#978fa0` — 6.08:1 on `--bg`, 5.62 raised, 5.30 surface, 4.66 surface-light; passes the contrast belt on every structural surface.** |
| `#d4c2a8` / `#8e7c67` | `--metal`, `--metal-dark` | Brass: eyebrows, counters, captions ("✦" marker). Edition authority. |
| `#e8c9a5` / `#f7e0c2` | `--accent`, `--accent-bright` | Warm gold: focus rings, hover lifts, print status. **Completion/chase gold** — reserve for earned or interactive things. The Collection Closed state (§2) is its home turf. |
| `#ead7b7` / `#eccba9` / `#f0dcb9` | `--star-color` tiers | Star fill: common / rare / holo — one warm metal, three brightnesses. |

**Foil — the special material:**

| Value | Where | Meaning |
| --- | --- | --- |
| `--foil` pearl gradient `#f1d7b4 → #e6c5d3 → #d5c8ef → #eee0d2 → #f0d9b6 → #d6c6e9` | progress fill, holo rarity chip, primary button | "Special, in the archive's own taste" — pearl, quiet, warm. |
| Holo spectrum `#ff6dbd / #ffd35b / #86edbd / #67d7ff / #ad8aff` at 118° | holo card edge, sachet tear | "Chase" — full-spectrum interference. Belongs to holo cards and the pack tear only. |
| Photo-window holo `hsl(328 95% 70%) / hsl(42 100% 72%) / hsl(151 83% 66%) / hsl(198 100% 70%) / hsl(262 88% 74%)` | `.card__photo::after` | Foil *on the photograph* — pointer-driven, capped, **high-key-corrected** (see holo material rules below). |

**Card print colours** (fixed tokens on the indigo plates): name `#fbf5ed`, number
`#c4b7aa`, mood `#c5b8c6`, rarity text `#e5d7c6`, keyword `#f0d5bd`, copy `#d6cdd7`,
print-line `#b7aab8`, stat-key `#b8adbb`, stat-value `#f6eee5`, serial `#b7aaba`,
credit `#9a8da0`, stats-label `#bfb1ca`, kind `#c2b7c5`. All measured ≥ 4.5:1 against
their plate. The credit is `#9a8da0` — **5.02:1 on the body plate, 4.65:1 on the lightest header stop**; the retired `#928697` measured 4.23:1 there and is not used (see §7).

### Semantic usage

- **Foil (any) = special.** Never on a control that is not a reward (progress fill,
  rarity chip, primary action are the three sanctioned uses).
- **Gold/metal = edition & completion.** Serials, eyebrows, counters, star metal, and the
  Catalogue Closed certificate. If gold decorates ordinary chrome, chase loses meaning.
- **Violet = ambience only.** Violet must never encode a state, a rarity or a button.
- **Hue is never the only carrier:** see colourblind backups below.

### Holo material rules (informed by the holo-card study)

The CSS-foil study (`holo-card-ref.html`, §9 entry 6) confirms and sharpens the material
grammar already shipped in `cards.css`. Adopted as art direction:

1. **One scale variable.** Foil components size in `em` against a single card root font
   size (the study's `font-size: calc(var(--cw) / 25)`; our full card already has
   `container-type: inline-size`, so `font-size: 4cqw`). Etch line width (0.05em), etch
   pitch (0.3em), glitter sheet scale (10em / 7.5em) and glint geometry all track card
   size exactly — this is what makes foil feel like *material* rather than a background.
2. **Dual-angle interference.** Every foil-bearing surface carries the +45° light
   interference (white lines, ~17% alpha, 0.05em at 0.3em pitch) **and** the −45° dark
   interference (indigo `rgb(50 34 120 / 12%)`) in overlay/multiply — the study's `.etch`
   pair. One angle alone reads as "striped gradient"; the pair reads as pressed foil.
3. **Pointer-tracked, radially masked highlight.** The glitter/gleam layer follows
   `--px/--py` through a radial mask (opaque core, 35% mid, 12% tail — the study's mask
   curve). The shine is *local*: foil lights up where you look at it, never uniformly.
4. **The glint band stays a band.** The 115° specular sweep (`--bp`) is narrow (±5–7%
   full width), soft-light/screen only, opacity driven by tilt magnitude (`--hyp`).
5. **High-key photo washout fix (binding).** The study's art layer is dark art under
   `color-dodge` — on our *high-key* photos (white duvets, sunlit fur — `IMG_9319`,
   `IMG_9949` are the worst case) that blend clips to white and dissolves Elsa. Binding
   rules for foil over the photo window: `hard-light` for the colour layer (never
   `color-dodge` above 0.2 base opacity on bright photos), the counter-moving dark
   interference layer from the study (its 160%-size `-38°` layer, moving *opposite* the
   pointer — it darkens exactly where the colour layer lights), a radial mask that
   always keeps the face region below 50% mask, and the standing test: **at maximum holo
   tilt, on the whitest photo, Elsa's expression must survive.** Verify against
   `photos/IMG_9319.jpeg` and `IMG_9949.jpeg` specifically.
6. **Spectrum discipline.** The study's pastel set (`#ffc4e6 #ffe3b3 #c2ffe4 #b8e6ff
   #d6c4ff`) and our saturated set (`#ff6dbd #ffd35b #86edbd #67d7ff #ad8aff`) are two
   *strengths of one material*, not two designs: pastel = pearl-pearl (rare-tier), full
   saturation = holo. Never mix a new third palette into foil.

### The rarity tier table — one typed artifact (panel-ratified)

The per-tier numbers — foil ring opacity, photo-window interference strength, glitter
opacity, glow radius, star metal, chip treatment, gradient-text treatment — exist as
**one typed artifact**: the rarity recipes (common / rare / holo) in typed TypeScript
(`design/tokens/`, consumed through Panda CSS), emitted as `--tier-*` custom properties.
CSS may consume tier variables; CSS may **never** redefine them.

Why this is art-bible law and not an implementation preference: the legacy disease is
measured, not hypothetical. In the shipped stylesheets the same holo `--foil-strength`
shipped as **0.56, 0.42 and 1.0 in three different CSS blocks**, and Stylelint counted
**50 duplicate selectors** across `style.css` and `cards.css` — three "sources of truth"
that had already drifted against each other. Under the ratified system, adding a 4th
rarity tier is a **compile-time exhaustiveness requirement** in `design/tokens/` — not a
CSS edit, and structurally incapable of producing that drift. The bible's numeric caps
(§8 foil rules) remain the art-direction *intent*; the typed tier table is the single
place where that intent becomes numbers. **The loop closes both ways: the tier table's
initial values must sit inside the §8 numeric ranges** (§8 "Foil treatment rules").
If a measured or implementation-driven value needs to move outside a §8 range, the
range itself changes through an art-bible edit — never by drift between the tier table
and §8.

### Per-state temperature rules

Admittance: cool-dominant, small amber whisper. From the Stacks: violet paper, neutral
light. Reading Table: warmest non-capstone moment (white flash + rainbow). Shelves: coldest
state (no amber at all). Under the Lamp: warm centre in a cold frame. Catalogue Closed:
the only gold-dominant state. Rule of thumb: **amber concentration rises with emotional
payoff** — from 6% at Admittance to a gold wash at Catalogue Closed.

### UI palette vs world palette divergence

The UI borrows the building's surfaces (`--bg` family) and the paper ink
(`--ink`/`--muted`). The **card** is a divergent world of its own: pearl rim band, its own
print-colour tokens, its own gradients. The rule that keeps both readable: **no UI element
outside the card may use the card's pearl band or holo spectrum**; no card element may use
UI grey (`--muted/--quiet`) for text. The photo is the third palette — its own colours,
untouched by grading (foil over it is capped and masked per the material rules above).

### Colourblind safety — backups for every colour-coded meaning

| Meaning | Colour cue | Non-colour backups (all required) |
| --- | --- | --- |
| Rarity common/rare/holo | star metal tone, chip tint, foil strength | ① chip **text label** (Häufig / Selten / Holo-Pracht), ② **star count** in `.card__strip`, ③ **texture** (glitter planes, dual-angle etch, edge bands), ④ holo-only **rays** ✧ (static under reduced motion), ⑤ serial colour stays constant so no tier reads as "broken" |
| Progress amount | foil fill width | numeric text "3 von 24", `role="progressbar"` values, live region |
| Language active | pill fill | `aria-pressed`, uppercase DE/EN labels |
| Sound on/off | accent border | icon swap: waves ↔ slash (shipped — keep as the model pattern) |
| Focus | `--accent-bright` outline | 2px + 4px offset, non-colour by definition |
| Rare/holo in the pack row | foil strength | glint sweep + chip label; under reduced motion the static etch texture (opacity ≤ 0.3) plus label carries it |
| Sammlung slot collected / not yet | (no colour cue — deliberate) | the **sleeve-placeholder carries it by shape**: an uncollected slot shows the flat sleeved-plate silhouette with its `No.` field, a collected slot shows the actual tile — silhouette + texture, never colour; for readers the slot's aria-label states "noch nicht gesammelt / not yet collected" vs the card's entry |
| Destructive Reset | **no danger colour exists in this palette, by decision — Reset is never colour-coded red** | ① explicit text label ("Alles löschen" / "Reset everything" — words carry the danger), ② isolation: Reset lives alone in the colophon, never beside ordinary actions, ③ two-step confirmation dialog that names the consequence and requires an affirmative second action; focus moves into the dialog. Danger here is typographic and structural, not chromatic |
| Wing completion frame | gold-glint frame treatment — a glint sweep in the `--accent` family on the frame rim (Catalogue Closed gold language, earned-only per the gold rule; never the holo spectrum) | ① frame geometry: a second etched hairline plus the corner registration ticks promoted to all four corners (greyscale-legible), ② text "Flügel komplett / Wing complete" on the plate, ③ live-region announcement on unlock |
| Collection milestones 25 / 50 / 75 % — outfit cards | **no new colour tier** — the milestone is *print*, not hue: a percentage stamp + badge rendered in the card's existing print language on the pearl rim; the photograph itself stays untouched (§5: never costume the dog) | ① the percentage as text ("25 %"), ② one stamp motif whose notch count (1/2/3) differs by shape, so the steps read in greyscale, ③ constant print-colour tokens at every step — no step is colour-coded |
| Keystone frame (gold glint) | `--accent`/`#e8c9a5` glint reserved to the keystone frame — earned-only per the gold rule, distinct from rarity foils by being static geometry (glint band + etched rim, no rainbow, no spectrum) | ① etch texture + rim geometry (§4 holo rules), ② keystone label text on the plate, ③ star count and serial colour unchanged so no tier reads as "broken" |

*Gate note (AD-ART-BIBLE revision pass, 2026-11-22): the wing-completion, milestone-outfit
and keystone rows above are a prerequisite for build step 5 (Milestones & Unlocks) — no
unlock surface may ship with colour-only meaning, and these art directions must be in the
typed tokens before that step's assets exist.*

---

## 5. Character Design Direction

There is no drawn cast. The "characters" are **Elsa, as photographed** and **Elsa, as the
archive's own staff** — the bureaucratic-pet-humour persona that `card-bank.js` already
speaks in (*Ministerin für Mittagsschlaf*, *Amtliche Leckerli-Prüferin*, *Hauptverdächtige,
immer*). The reframe sharpens the relationship instead of replacing it: **the visitor is
the explorer/reader; Elsa is the head of the archive** — she catalogues herself, issues
her own classification stamps, and admits readers to her stacks. The card copy treats her
as *du*-addressed staff with self-invented gravitas; the explorer's job is to read the
catalogue and find the good pulls.

**How photos are chosen — "card-worthy" criteria (all six must hold):**

1. **Elsa is the subject**, occupying ≥ 40% of the frame; no crowd, no paw-crops, no
   photo that needs a second look to find her.
2. **One idea per photo.** The pose already contains the collection entry: *inspecting*
   (head tilt, direct gaze), *on duty* (standing/sitting at attention), *asleep on duty*
   (curled, one eye), *fieldwork* (peeking over duvet/cushion edge, digging), *accepting
   tribute* (object in mouth, bowl vigil), *holding court* (sprawled across the good
   spot).
3. **The crop survives the window.** Card windows share one aspect — the §3
   window-ratio, `4:5` (w:h) — in drop, tile and full variants alike, and anchor the
   subject at `object-position: center 42%` — faces must sit
   near the upper third in the original, or she gets scalped by the crop. Photos that need
   a different anchor get a per-photo `object-position` override in `photos/captions.json`
   (recommended addition — see §8).
4. **Light is natural.** Window light, sun patches, room light. No flash flattening, no
   heavy filters — rarity changes foil strength, **never the photo**.
5. **Background is furniture, not a subject.** Duvets, sofa, grass, hallway — max one
   human-scale prop. Two competing props kill the read at 180px shelf-tile size.
6. **It survives greyscale.** The shelf test: the tile must still say "Elsa asleep /
   Elsa watching" without colour. (This is also the light-rationing test of §1.)

**Expression/pose targets.** Direct eye contact with the camera (her signature — see
*Blickkontakt-Expertin*) or a caught candid where the *posture* speaks. Deadpan over
goofy: no costumes, no staged anthropomorphism, no Photoshop jokes — the bureaucracy is
applied *in type*, never *on the dog*.

**Disqualifiers:** motion blur, Elsa cropped out, unexplained action shots, cluttered
human environments, and anything whose joke needs a caption to be understood — the card
caption is the punchline, not the setup.

**Detail survival ("LOD") for photos:** the 1200 px detail rung (720 px pack rung) must keep fur texture and
eye catchlight at card size (340px); the ~180px shelf tile only needs silhouette + eye.
The original (dialog only, `Foto speichern`) is ungraded and uncropped.

---

## 6. Environment Design Language

**The building.** One archive at night, one lamp, no drawn furniture. The environment is
built from three surface depths plus printed ephemera:

- **Room void:** `#111017` with the fixed violet pool (`rgb(111 77 142 / 20%)` at 50% 43%)
  and the amber whisper. The void is *not* pure black — the 20% violet pool is what makes
  the stacks feel inhabited rather than "dark mode".
- **Furniture surfaces:** `--bg-raised` → `--surface` → `--surface-light`, always with the
  1px inset top highlight. These are shelves and glass cases, lit from above.
- **The reading table:** `.album` on `#15131b` with its 2% white top sheen — the felt desk
  where Die Sammlung lies open.
- **The beam:** `.ambient-beam`, a 72vw conic spotlight, blurred 24px, from top-centre —
  the archive's one overhead lamp. Its width may vary per state (narrow during From the
  Stacks, wide at Admittance); its position never moves.

**Texture philosophy — procedural only.** All environment texture is generated in CSS:
the 256px nap-weave tile (`body::before`, `overlay`, ≤ 18% opacity — the same technique
the holo study uses for its velvet), gradients, `repeating-*` patterns. **No raster environment textures**: procedural grain
matches "printed paper in a night archive" better than photographic texture would. The
asset budget is spent on photographs, not decoration. The
paper/foil feel comes from the *interaction* of patterns (weave × dual-angle etch ×
glint), not from any single texture.

**Paper & foil as materials.** Paper is the nap weave + cream pearl band + crimp lines
(the sachet's serrated `repeating-linear-gradient` edge). Foil is the 118° band family
with dual-angle interference and a pointer-tracked highlight (§4). Both must stay
*materials*: they respond to tilt and light like a physical object, never flatten into
UI gradients.

**Surfaces introduced by build step 4 (visual direction).**
- **Wing progress line** (`{x} von {y} gesammelt`): Label type step, tabular figures, `--muted` on the room header; a 2 px `--metal-dark` rule under it at 40 % width, filling with `--metal` as the room progresses. No colour-only state: the numerals are the carrier.
- **"aus: [Wing]" chip**: Chip type step on the plate's edition strip; 1 px `--line-strong` outline, `--chip-text` on the pearl stop, 2 px radius, never foil-filled (rarity owns foil). Reads as a printed stamp, not a button.
- **"In der Sammlung" badge**: Location label on the tile's lower-left, Label step, `--muted`, sitting on a 60 % `--surface` scrim so it survives any photo; never the only collected indicator — the tile's collected state also carries the desaturated sleeve and the accessible name.

**Die Sammlung as an object.** The album is the library's collection: pages = grid cells
(4 → 3 → 2 columns), tiles = sleeved plates waiting on the shelf, the "Von vorn" button =
closing the collection and starting a new lap. The progress bar is the ledger line under
the page; a restarted lap is announced by the ledger, not a modal.

**Prop density rule: max three ambient elements per state** — the beam, one colour pool,
and the motes. Anything more turns the archive into a stage set. No illustrated shelves,
no windows, no skirting boards: the building is implied by light and material, not drawn.

**Environmental storytelling through printed ephemera.** The archive is furnished by
*print*: set numbers (`No.` fields), serials, the paw crest in its circle, "Erste Auflage ·
Serie I", corner registration ticks, the "Fantasiewerte · nur zum Spaß" disclaimer as a
regulatory fine-print label. The story the building tells: *someone catalogues this dog
with the seriousness of a state archive — and loves her.* Never add story props that
state it louder than the cards do.

---

## 7. UI/HUD Visual Direction

### Art view

**Diegetic vs screen-space.** Two registers, kept separate:
- *Diegetic objects:* the sealed volume, the sachet theatre, the cards themselves, the
  confetti — physical things with weight, tilt, shadows and material response.
- *Screen-space furniture:* masthead, dialogs, buttons, progress. Dialogs are **glass
  cases**: dark blurred backdrop (`rgb(7 6 10 / 82%)` + blur) = examining a document
  through lit glass from the dark room. Furniture never animates physically (no bouncing
  buttons); objects always do.

**Typography — the Ultra/Chivo pairing.**

- **Chivo** (self-hosted `chivo-latin.woff2`, `font-display: swap`, weights 400–700) is
  the voice of everything functional: all card text, all UI, all copy. Its tight tracking
  at display sizes (`letter-spacing: -0.06em…-0.075em`) is the current headline language.
- **Ultra** (`ultra-latin.woff2` — *shipped in `assets/fonts/` but not yet wired into any
  CSS; wiring it is the pending action*) is the **print face**: reserved for surfaces that
  represent the *printed brand*, not the interface — the pack seal word (renamed to
  "Elsa the Explorer" or its DE short form), the card-back brand mark, the Catalogue
  Closed headline, optionally the wordmark. Rules: Ultra never below 20px, never in body
  copy or the card plate (card names stay Chivo for small-size legibility), never more
  than a word or two at a time. If a future surface can't decide between the two: if it
  could exist *printed on paper in the building*, Ultra is allowed; if the reader needs
  it to *operate the site*, Chivo.
- **Type scale (px, not rem — root-size independence and print parity):** display 86 / 52 / 34; card name 19
  (drop 13–16, full 16–22 `cqw` clamp); lede 19; body 16; UI small 13/12; captions 11;
  metadata floor 9 (see UX view for the 8px flag); eyebrows 10 with `0.14em` uppercase
  tracking; **Label 13/500** (`0.01em`, room progress lines and "In der Sammlung");
  **Chip 12/600** (`0.02em`, the "aus: [Wing]" chip). Both emitted from `tokens.ts`
  `fontSizes.label` / `fontSizes.chip`. Line-height: display ≤ 1.0, card body 1.3–1.4, UI body 1.5.

**Iconography.** One family only: 24-grid, 2px round-cap strokes (close, speaker waves
and slash) plus exactly one filled mark — the paw crest. On-card the only permitted
"gem" is the 7px rotated-square keyword bullet (`.card__keyword::before`). Sparkles (✧)
are foil physics, not icons — they may never mark a control.

**Motion feel — one reading at a time.** The room's light moves; the furniture does not
perform. Exactly one hero motion per moment, and it always ends with something newly
legible. The reveal is a **virtual camera** — `scale` + `translate` on one stage wrapper,
never a pile of card animations: one plate in focus, the camera dollies to the next, and
when the set is complete it **pulls back** into a 2 × 2 grid on mobile / a single row on
desktop. Intimacy first, overview last; the camera's closeness *is* the emotional beat.
Focus scale is derived (the focused plate fills 74 % of the stage's short edge, clamped
1.25–2.40) and the translate is *solved* onto the 50 % / 42 % anchor — the same 42 % as
the photo crop, so the reading line never shifts between one card and four. The pull-back
is the only move above 700 ms (760 ms, monotonic, no overshoot); the whole four-card
reveal is ≈ 2.8 s.

> **Motion values: `design/art/motion-sheet.md` is the SSOT.** Durations, curves, stagger,
> hand-off overlap and the per-surface rules live there; this bible states intent, the
> sheet states the numbers, code consumes the sheet's tokens. The wrapper theatre that
> precedes the reveal is unchanged in feel and stays timed by `pack-opening.md` until that
> spec is rewritten.

Springiness stays where it is physical: the tilt/foil spring under the pointer (target +
stiffness + damping; idle sway only when the pointer rests; keyboard arrows nudge the same
targets). The choreography never bounces — a camera that overshoots reads handheld, and
the archive is a tripod. Every animation still has a physical rationale: the packet
*flexes before it tears*, a card is *set down* rather than flown in, foil *sweeps because
light moved*. The one licensed decoration is the confetti burst: **a single small burst,
≤ 1.2 s, once per pack and only when a holo is present**. The capstone may run the larger
celebration, still inside state 6's calm register. No burst on an ordinary pull, a tile
entrance or a milestone. Nothing loops except holo glint (`--elsa-dur-glint`, 5.2 s) and rays (`--elsa-dur-rays`, 35 s), both
frozen under reduced motion. UI never enters a card's motion budget.

### UX view (readability, contrast, targets, reduced motion) — measured

Contrast measured against shipped values (WCAG relative-luminance):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--ink #f5f0ea` on `--bg #111017` | 16.7:1 | pass (body) |
| `--muted #aaa3b2` on `--bg` | 7.7:1 | pass (body) — **the default for all essential small text** |
| `--quiet #978fa0` on `--bg` | **6.08:1** | resolved value (shipped `#756e7d` measured 3.86:1 and is retired). 5.62 on raised, 5.30 on surface, 4.66 on surface-light — passes the Vitest contrast gate. Used for `progress__note`, `stage__hint`, `print__hint` at 10–11px |
| card copy tokens on plates | 7.1–13.5:1 | pass |
| credit `#9a8da0` at 8px | 5.02:1 body / 4.65:1 header | raised from `#928697` (4.23:1 on the lightest header stop) and now passes on every plate it can sit on |

Rules and flags:

1. **`--quiet` resolved (owner decision, 2026-11-22).** The token must pass 4.5:1 like
   every other text token — **no decorative or redundant-text exemption class exists.**
   The value is now **`#978fa0`** (6.08:1 on `--bg`, 5.62 raised, 5.30 surface, 4.66
   surface-light); the Vitest contrast belt enforces it. The retired `#756e7d` (3.86:1)
   is out of spec and unused. Its users (`progress__note`, `stage__hint`, `print__hint`)
   inherit the raised token — no string moves, and no string is exempt.
2. **Metadata floor.** 8px text (`.card__credit`, drop-card stat keys at 7px) is below
   what the Oma persona should have to read. Floor: 9px for anything on a card, 10px for
   anything a control depends on. Recommend raising drop stat-keys 7→9px at the next pass.
3. **Target sizes.** Buttons ≥ 44px desktop (48 shipped) / ≥ 38px mobile (shipped);
   WCAG 2.2 AA minimum is 24px so shipped values pass, but the close buttons (36px) should
   reach ≥ 40px where layout allows. Keyboard operability already full — adopt the
   study's explicit keyboard-tilt affordance (arrows nudge foil, Enter flips) as the
   reference pattern for any new tilt surfaces.
4. **Focus.** 2px `--accent-bright` outline, 4px offset (16.7:1) — never weakened; card
   focus uses `#fff0d9` at the same geometry.
5. **Reduced motion.** Theatre fully disabled (sachet hidden, confetti off) and the
   four cards render directly in their final 2 × 2 / row frame — **the pull-back's last
   frame, reached without a camera**, with no focus sequence (motion-sheet §5). Foil
   animations frozen to static ≤ 0.3 opacity, tilt targets zeroed (the study's
   reduced-motion model: targets snap to zero, springs stiffen). Rarity survives via
   texture + stars + chip label (§4). Any *new* animation ships its reduced-motion state
   in the same commit.
6. **Live feedback.** Status strings go through `role="status"` (`print__status`, `#live-status`)
   — keep; new flows (Catalogue Closed) inherit this.

**Explicit art-direction vs readability conflicts (and the standing decision):**

- **Foil over the photo vs photo legibility.** Art wants foil on the photograph (it is
  the chase fantasy); readability wants Elsa's face clean — and our photos are high-key,
  where the study's `color-dodge` approach would wash them out. Decision: the §4 material
  rules are binding — `hard-light`, counter-dark interference, radial mask keeping the
  face under 50% mask, caps (`--photo-foil` 0.08 rare / ≤ 0.32 holo). **Standing test:**
  at maximum holo tilt on the whitest photo, Elsa's expression must be identifiable — if
  not, lower the cap, never the art's ambition elsewhere.
- **Gradient name text vs contrast.** Rare/holo names are `background-clip: text`
  gradients; mitigated by the mandated `drop-shadow(0 1px rgb(0 0 0 / 55%))`. Keep the
  shadow whenever the gradient changes.
- **Reveal length vs "Oma just wants the dog".** The one-card-at-a-time focus sequence
  plus the pull-back (≈ 2.8 s for four cards) is the product's signature; reduced motion
  already bypasses it. Recommendation (owner decision): a tap-to-skip into the overview
  during the sachet phase. Art direction holds the choreography sacred for the default
  path; the reader's bypass lives outside it.
- **8–10px metadata vs Standard contrast tier.** Covered by rules 1–2 above; where the
  fine-print aesthetic and the 4.5:1 floor disagree, the floor wins and the *aesthetic*
  keeps its size-contrast look via colour tokens, not by shrinking further.

---

## 8. Asset Standards

**Constraint frame:** Vite build, static deploy to IONOS (Svelte 5 + Vite 8 + TypeScript
strict, plain Vite app, no SvelteKit/SSR). **Styling system (ADR-0002, ratified by a
3-specialist panel): Panda CSS 2.0** — Rust engine, typed tokens and typed rarity
recipes, static artifact output, zero runtime. Design tokens (`--space-*`, type scale,
palette) and the rarity tier table live in **typed TypeScript** (`panda.config.ts` /
`design/tokens/`); **recipes are the only sanctioned variant mechanism** (no
`.card--drop`-style class ladders). Bespoke foil art stays in **Svelte component-scoped
CSS** that consumes tokens only via `var(--elsa-*)` / `var(--tier-*)` and may never
redefine them. No runtime CSS-in-JS; utility frameworks are rejected — **Tailwind v4 was
panel-evaluated and rejected** (utilities are invisible to Stylelint, bypass token
authority, and cannot express the 5-layer foil art). Token-codegen remains the documented
fallback only. The enforcement belt is mandatory CI: Stylelint (`var()`-only values in
scoped CSS, duplicate selectors as errors), a cross-file selector-diff check, Svelte
unused-CSS warnings escalated to errors, a Vitest contrast gate computing WCAG ratios
from `tokens.ts` (a sub-4.5:1 token fails the build), and knip for dead tokens/exports.
Images ship through the Vite asset pipeline with derivative generation (Node/sharp for
local dev and QA only, producing the **same four-rung ladder** as the runtime encoder);
`photos.php` remains the **runtime manifest source** and runtime derivative source
(owner FTP-drops photos, no redeploy; optional `set` / `focus` / `chase`
manifest fields stay backward compatible). No external requests, everything self-hosted.
**Full refactor authorized** for the card anatomy and asset structure below: nothing in
the current CSS is sacred except the material language worth keeping (the pearl band, the
118° band family, the dual-angle etch, the plate/desk surface ramp, the warm/cool split).

### Styling authority — the panel rule and the surface register

**The rule (panel-proposed, art-bible-ratified):**

> Every numeric value in card art CSS must resolve to a named token or a
> recipe-emitted `--tier-*` variable. Any literal color, length, or opacity in art CSS
> requires an inline `/* art: <reason> */` waiver and an entry in the surface register
> below. The rarity tier's numeric identity lives in exactly one typed artifact — CSS
> may consume tier variables, never redefine them.

The register lists every CSS surface where bespoke art (and therefore permitted literals,
each behind a waiver) is authored. Everything **not** in the register is token-only by
default. It starts with the five ratified surfaces and grows during the build — a new
surface joins only through this table:

| Surface | Scope | Status |
| --- | --- | --- |
| CardFace foil stack | Svelte component CSS | to fill during build |
| Pointer mask (glitter/gleam) | Svelte component CSS | to fill during build |
| Tilt (spring physics surface) | Svelte component CSS | to fill during build |
| Pack theatre (sachet, tear, flash) | Svelte component CSS | to fill during build |
| Parlour shell (room void, beam, motes, desk) | global layer via Panda | to fill during build |

### Image pipeline (photos) — the delivery contract

**Supersedes** the retired 720px display cap and the "JPEG-only, no WebP" note (both
withdrawn 2026-11-22 by owner decision). PRD §5's "display copies capped at 720 px" is
replaced by the ladder below; every other §5 constraint (privacy, IONOS, no build on
the server) still binds.

**Why it changed — measured baseline** (local PHP 8.6 + GD, 2026-11-22). A 3.98 MB
5712×4284 original produced a 540×720 JPEG q82 at **61.9 KB** from `photos.php?thumb=`
— already over this bible's then-current **45 KB tile target (retired 2026-11-22; the
ratified tile ceiling is 36 KB WebP / 55 KB JPEG)** — and ten such thumbs totalled
**517.5 KB**. The reading room's `?view=` handed the client **3,983,035 bytes** (the
original), and originals are directly reachable under `/photos/`. The runtime encoder was
the budget problem, not the art.

**The ladder.** Longest edge, per image, on the wire, compressed. Ceilings are hard limits,
not targets (KB = 1,000 bytes): the encoder searches quality/effort per image until the
ceiling is met, and no rung ships above its number. These are **delivery budgets**. They are
distinct from the **safety caps** — 20 MiB compressed input, 32 MP acceptance, 8000 px edge,
28.5 MP GD rendering ceiling at a 512 MiB host — which bound input and render cost and live in
`docs/photo-pipeline-implementation.md` §10. A safety cap is never a delivery number.

| Rung | Longest edge | Served to | WebP ceiling | JPEG ceiling | Loading |
| --- | --- | --- | --- | --- | --- |
| **tile** | 360 px | Sammlung grid tiles; pack-seal preview | **≤ 36 KB** | **≤ 55 KB** | lazy — except the one preloaded seal preview |
| **pack** | 720 px | card face in the pack reveal / pack theatre | **≤ 80 KB** | **≤ 110 KB** | eager on pack open |
| **detail** | 1200 px | reading room (card detail dialog) | **≤ 150 KB** | **≤ 210 KB** | eager on open |
| **download** | 1600 px | optional "save to device" | **≤ 350 KB** | **≤ 500 KB** | on demand only — never preloaded |
| **original** | 5712×4284 and up | never as an image | — | — | see "Never an original" |

Aim ~20% under every ceiling; a rung at 95–100% of ceiling is a flag, not a pass.

**Formats.** WebP is the default, JPEG the **mandatory fallback** — every rung is
emitted in both and served through `<picture>` (`<source type="image/webp">` + `<img>`
JPEG). AVIF may be added **only after host + client verification** is recorded (encoder
present on IONOS, correct `Accept` negotiation, Safari/iOS decode path tested); until
then it is an unverified proposal, never a rung. SVG stays for icons/crest/textures,
PNG only for `og.png` (1200×630).

**Two encoders, one ladder — and only one manifest.** `photos.php` remains the
**runtime manifest** (`?list=1`) and the runtime derivative source: the owner FTP-drops
a file, the ladder is generated server-side on first request and cached, **no redeploy**
(owner time is the scarcest resource — that rationale is unchanged). Node/sharp
generates the **same** ladder locally for dev and QA. Both encoders must be
contract-compatible: identical orientation normalization, identical aspect
preservation (no server-side crop), identical `focus` semantics, identical rung
dimensions and format set — so a locally-QA'd crop lands identically in production.
Manifest fields stay backward compatible; `focus` feeds the per-photo crop anchor,
`set` groups cards by catalogue section, `chase` hand-pins the holographic ones.

**Never an original as an image.** No rung may be served by falling back to the source
file. This is a live defect today: `photos.php` serves the untouched original whenever
GD is absent, the cache directory is unwritable, thumbnail creation fails, or
`imagejpeg` fails — which is how a 3.98 MB file reaches a card window. The contract:
on encoder failure, cache failure or memory exhaustion, respond with the **designed
image-error state** (`design/ux/card-detail.md`: the set-coloured fallback panel with
the plate crest — the card stays fully readable without the picture), never the source
bytes. An original **never** leaves the host as an image: the only outward path is the
explicit `?download=` action, which serves the **1600 px download derivative**, and the
retired `?view=` endpoint `302`s to that derivative. There is no "save original" action and
no field that addresses `photos/<file>`. A derivative that cannot be produced is a visible,
designed absence; a silent promotion of the original to fill the hole is the failure mode.

**Crop, orientation, metadata.**
- **The 4/5 window stays** (§3 window-ratio) and the card body keeps ratio `0.70` —
  unchanged by this ladder. Crops stay in code: `object-fit: cover`,
  `object-position` from the manifest's `focus` anchor (default `center 42%`), so one
  derivative serves tile + card + detail through the same CSS crop. Both encoders
  **preserve aspect** — they resize, they do not pre-crop, or the CSS crop would
  double-crop.
- **EXIF orientation is normalized before resize**, so portrait shots are not rotated
  once at 360 px and thrice elsewhere.
- **The manifest reports oriented width/height per rung** — the source of the
  `width`/`height` attributes, which is what keeps CLS at zero without layout
  guessing.
- **GPS/EXIF/XMP is stripped from every public derivative** (re-encoding does this;
  it must not be added back). Originals carry GPS: under PRD §5 privacy ("photos not
  indexed or listable") a directly reachable original is a metadata leak, so
  `/photos/*` must not behave as a public image path — see below.

**Loading policy (LCP).** Exactly one image is preloaded: the **pack-seal preview** at
the 360 rung, `fetchpriority="high"`. Binder tiles are lazy (`loading="lazy"` +
`decoding="async"`). The pack reveal is eager the moment the pack opens; the detail
rung is eager on dialog open; the download rung is on demand only and never preloaded.

**HOST-VERIFIED-PENDING — do not assume locally.** All of the following are unverified
on IONOS and must be measured there before they are relied on, with the result recorded
in this section: GD present and enabled; `imagewebp`/`imageavif` support and their
compiled versions; PHP memory limit vs a 24.47 MP decode (a 5712×4284 source needs
~98 MB just for the true-colour buffer before resize — today's silent fallback is
plausibly the memory kill), against the 512 MiB host baseline and the 28.5 MP GD rendering
ceiling (a 32 MP source is accepted but 28.5–32 MP needs Imagick); max execution time on
first-request encoding; cache
directory writability and quota; and whether a host-level rule can deny direct
`/photos/*.jpg|jpeg` access while PHP still reads the directory. Until each is
measured, the ladder's runtime half is a proposal, not a fact.

**What this costs the owner:** nothing new in the workflow — same FTP drop, same
manifest, ladder generated on first request. The bytes it buys: reading-room detail
**3,983,035 B → ≤ 210 KB JPEG (−94.6%)**; ten Sammlung tiles **517.5 KB → ≤ 360 KB
worst case (−30%)** and less still as WebP; LCP seal preview **61.9 KB → ≤ 55 KB JPEG,
≤ 36 KB WebP**. Eight cached files per photo — four rungs × WebP and JPEG — instead of
one, trivial against the host quota, and the reason the ceilings can be hard.

### Naming convention

`[category]_[name]_[variant]_[size].[ext]` for all **added static assets**:
`ui_btn_primary_foil.svg`, `env_texture_nap_256.png` (if ever rasterised),
`brand_seal_crest_24.svg`, `og_social_default_1200.png`, `vfx_confetti_gold_small.svg`.
**Documented exception:** the photo pipeline keeps the owner-facing naming
(`photos/<original-file>` + `photos/deriv/<slug>-<edge>.<webp|jpg>`) because "drop the
file and reload" is the scarcest-resource workflow. Slugs are lowercase, ASCII,
hyphen-free ids. Derivatives are named by rung edge (`elsa-01-360.webp`,
`elsa-01-1200.jpg`), so a directory listing reads as the ladder itself.
Rename wave assets follow the same convention: `brand_wordmark_explorer.svg`,
`brand_seal_explorer_24.svg`, `og_social_explorer_1200.png`.

### Card anatomy — refactor spec (authorized full refactor)

**Architecture change (adopted from the study): one root em scale.** The full card already
declares `container-type: inline-size`; add `font-size: 4cqw` on `.card--full` (the
study's `calc(width/25)` in container-query form) and express **all** card-internal
dimensions — zone paddings, radii, plate band, etch line width/pitch, star size, serial
size — in `em`. This kills the entire class of px-mismatch bugs behind the known defect
(credit colliding with the photo, clipped stat, text crossing the foil edge), and deletes
the duplicated px override blocks that re-specify `.card--full` at ≤ 760px and
≤ max-height 780px. The foil geometry becomes intrinsically resolution-independent: an
0.05em etch line on a 340px card and a 90px tile are the *same* physical foil.

**Zone proportions — the overflow law (unchanged, now enforced by the em root).**
Inner height = 100%. Grid rows are percentage bands with hard clamps:

| Zone | Full card | Drop card | Binder tile | Clamp rules |
| --- | --- | --- | --- | --- |
| Plate (number/name/mood/rarity) | **15%** | 17% | 16% | name ≤ 2 lines (`-webkit-line-clamp: 2`), number 1, mood 1 (ellipsis) |
| Photo window | **31%** | 36% | 42% | fixed band; window holds the §3 window-ratio (4:5 w:h) inside the band; `object-position` per-photo; foil caps apply |
| Strip (edition + stars) | **4.5%** (min 24px) | 5% | 5% | stars never wrap; kind truncates |
| Copy panel (keyword/copy/print) | **22%** | 18% | 16% | keyword 1, copy ≤ 3 (≤ 2 on drop, already clamped), print ≤ 2 |
| Stats (label + 3 tiles) | **13%** | 12% | 11% | key 1 line, value 1 line; bar decorative |
| Foot (serial/credit) | **4.5%** (min 22px) | 5% | 5% | serial 1; credit is first to be hidden under height pressure |
| Gutters (distributed 4–8px steps) | **10%** | 7% | 5% | never collapses; the foil edge keeps its margin |

Height-pressure order (what gets cut first, in order): credit → mood → print line →
copy clamp tightens. The photo band and the plate name never cut. The card body keeps
the §3 card-ratio `0.70` in every variant. The frame wins: zones reserve fixed
proportions; text that doesn't
fit clamps, never clips, never crosses a zone boundary, never pushes a neighbour.

**Material language retained through the refactor** (non-negotiable inventory): the pearl
rim band gradient; the `#2c2636 → #17151c` plate ramp; the 118° band family and its
saturated/pastel stop sets (§4); the dual-angle etch pair; the corner registration ticks;
the paw crest in its circle; the card-back starfield grammar. Everything else
(px sizing, duplicated breakpoints, per-variant font-size ladders) is refactorable.

### Type & spacing scales

- Type scale: 9 / 10 / 11 / 12 / 13 / 16 / 19 / 34 / 52 / 86 px (display uses `clamp()`
  against viewport, shipped). Card-internal sizes switch to `em` against the card root
  (refactor above); the cqw clamps remain as the root derivation.
- Spacing: the existing 4-based scale `--space-1…9` (4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 /
  104). 8pt grid with one 4px half-step; inside the card, spacing derives from the em
  root in quarter-em steps.
- Radii: 8 / 16 / 24 / pill (UI); card 16–18 outer / 8–12 inner / 8 photo.

### Foil treatment rules

1. Foil lives in three sanctioned places: card edge rim, rarity chip, photo window
   (pointer-masked, capped) — plus the pack tear at the moment of tearing. Nothing else.
2. Angle is always 112–118°; spectral stops are the fixed sets in §4 (no ad-hoc hues).
3. Strength by rarity is art-direction *intent* — common 0 / rare `--foil-strength 0.28`
   / holo 0.42–0.56; photo foil 0.08 rare / ≤ 0.32 holo — and its **numeric identity lives
   only in the typed tier table** (§4, "The rarity tier table"), consumed as
   `--tier-*` variables. Caps are art direction, not implementation detail — raising them
   needs an art-bible change, never a CSS edit.
4. Every foil-bearing surface carries the dual-angle etch pair at em scale (§4 rule 2)
   and a pointer-tracked radially masked highlight (§4 rule 3). Foil without interference
   texture is a gradient, not a material, and is a defect.
5. Motion: glint sweeps only (5.2s rare / holo), rays only on holo, glitter is
   pointer-parallax, never autonomous scroll-driven. Under reduced motion: static,
   opacity ≤ 0.3, no sweep, no rays rotation, tilt targets zeroed (shipped and
   study-confirmed — preserve).
6. The foil never covers the plate text zone: name gradients keep their black
   drop-shadow; chip text on foil is `#211d27` (16.5:1 on the foil's light stops).

### Performance budget (Vite build, static deploy)

| Item | Budget | Notes |
| --- | --- | --- |
| Fonts | ≤ 30KB per woff2, Latin subset | Preload Chivo only; Ultra lazy-loads with first seal/back render (`font-display: swap`). |
| CSS total (all shipped CSS, compiled by Vite) | ≤ 45KB uncompressed | Panda-emitted static artifacts + component-scoped foil art; the em-root refactor must *net-reduce* this (delete the duplicated override blocks). If a feature pushes past budget, it must delete an old one. |
| JS first load (compiled app bundle) | ≤ 60KB | Budget measured on the **compiled, minified bundle** including the Svelte runtime; `heic2any` loads only for HEIC sources. |
| LCP element (pack seal + preview tile) | ≤ 55KB JPEG / ≤ 36KB WebP (tile rung); **LCP < 2.5s** on mid-tier mobile | Only this image is preloaded (`fetchpriority="high"`, 360 rung); seal is CSS-drawn. |
| First-load total (HTML+CSS+JS+font+seal tile) | ≤ 250KB | Binder tiles lazy; pack reveal eager on open; reading-room detail eager on dialog open; download rung on demand only. |
| Layout | Zero CLS | Derivatives carry oriented `width`/`height` from the manifest; new media must too. |

Trade-off recorded and re-decided: the retired JPEG-only pipeline bought small files
with one 720px copy serving every surface — and still overran its own 45KB target at
61.9KB per thumb while handing 3.98MB originals to the reading room. The four-rung
ladder keeps the owner's zero-tooling workflow (same FTP drop, no redeploy, ladder
generated on first request) **and** takes back the bytes: −94.6% on the reading-room
detail, −30% worst case on ten Sammlung tiles. The cost paid is encoder capability and
four cached files per photo instead of one; the cost no longer paid is shipping
originals as if they were card art.

---

## 9. Reference Direction

1. **Physical TCG holo foils (1990s–2000s trading-card chases).**
   *Take:* the *material logic* — rarity as physics (edge interference bands, one bright
   glint sweep across an otherwise calm surface, foil density as the rarity dial, photos
   staying sharp under the sheen).
   *Avoid:* full-bleed rainbow floods over the art, licensed-card chrome and stat bars
   copied literally, and the "everything sparkles" escalation — the foil's power is
   scarcity.
2. **Museum object plaques / archival labels.**
   *Take:* restrained caption typography — small tracked-out uppercase eyebrows
   (`0.14em`), number-plus-title hierarchy, the credit line set small and quiet, neutral
   grey-on-dark restraint. The card plate is already half plaque; in the library frame,
   push that reading — the card is a mounted specimen with its label.
   *Avoid:* institutional sterility — pure white cases, clinical spacing, the sense of a
   gallery instead of a night archive. This is a home with a catalogue, not a wing.
3. **Stamp collecting (sheets, perforations, cancellations, edition marks).**
   *Take:* edition language ("Erste Auflage · Serie I"), serials, corner registration
   ticks, the perforated tear as a *physical* act (the sachet's crimp/serrated flap), and
   the DPI-honest fine-print of the "Fantasiewerte" disclaimer — bureaucratic texture is
   the persona's costume.
   *Avoid:* philatelic clutter (dense frames, crest noise) and sepia "aged paper" kitsch —
   the archive's paper is *new and crisp*, printed yesterday.
4. **Panini sticker albums (the empty-slot binder).**
   *Take:* the completion drive — the binder grid as catalogue pages, unseen-first
   ordering as the "still missing" pull, and the Catalogue Closed certificate as the
   full-album pride moment (§2's only gold state).
   *Avoid:* licensed gloss, upsell language, and duplicate-shame ("doppelt — zum Tauschen")
   guilt: this catalogue never makes a repeat feel like failure, it starts a new lap.
5. **Dark-room photo printing (safelight, prints coming up in the developer tray).**
   *Take:* the emotional model of the reveal — images *emerging* from darkness one at a
   time, the card as a freshly-made print, "Foto speichern" semantically framed as
   keeping the print. The single-warm-light-in-darkness grammar of §2 is safelight logic.
   *Avoid:* a literal red safelight wash (it would grade Elsa's photos), heavy vignette
   clichés, and "grainy film" filters — the product's grain is procedural and
   architectural, not nostalgic.
6. **`holo-card-ref.html` — the CSS-foil study (MYTHIC "Lumidrake"; working reference,
   the direct ancestor of `cards.css`).**
   *Take, specifically:* ① the **em-based interference scale** — one card-root font size
   (`calc(var(--cw)/25)`) driving every foil dimension (0.05em etch lines at 0.3em pitch,
   10em/7.5em glitter sheets, parallax offsets of ±0.025em/0.045em) so texture tracks
   physical card size (adopt into §8's refactor); ② the **masked pointer highlight** —
   glitter and glare following `--px/--py` through a three-stop radial mask
   (`#000 → 35% → 12%`), shine as a *local* event; ③ the **dual-angle etch pair**
   (+45° white / −45° indigo, overlay blend) that makes foil read as pressed material;
   ④ the **counter-moving dark interference layer** over the art window (160%-size,
   −38°, positioned opposite the pointer) — the correct tool for our high-key photo
   washout fix (§4 rule 5); ⑤ the **spring-physics tilt model** (target + stiffness +
   damping, idle sway after pointer rest, keyboard-arrow nudging the same targets,
   reduced-motion snapping targets to zero) for card tilt; ⑥ its accessibility
   scaffolding — double-ring `focus-visible`, `aria-pressed` flip, live-region flip
   announcements.
   *Avoid:* its **sci-fi/genre language** entirely — the crystal-wyrm subject, starfield
   nebula art, "MYTHIC/Prism Tide" fantasy naming, rune-like logotype tracking
   (`.42em`), and the decorative cost-gem diamond — our product's genre is a household
   archive, and its humour is dry. Avoid its **full-bright rainbow on every surface**
   (rainbow frame + rainbow halo + rainbow text button simultaneously): here the
   spectrum is rationed to holo cards, the tear moment, and nothing else. Avoid its
   heavy corner vignette (`.75` black at edges) — our room glows violet, it does not
   tunnel. And avoid its `color-dodge` over dark art as a universal recipe: our photos
   are high-key and need the hard-light + counter-dark treatment instead.

---

*End of art bible. Changes to the one-line rule, the zone table (§8), the holo material
rules (§4), or the product name require a new AD-ART-BIBLE sign-off.*
