# Motif Sheet: The Classical Layer

> **Status**: Draft (ornament system, not a redesign) · **Owner**: art-director · **Last Updated**: 2026-11-22
> **Refines**: `design/art/art-bible.md` §3 (shape), §4 (colour/foil), §6 (environment), §7 (UI) · **Links**: `design/features/archive-fiction.md` (§0 house, §4 voice), `design/accessibility-requirements.md` (Standard)
> **Adds nothing**: no new palette, no new foil surface, no new typeface, no new motion. Where this sheet and the bible disagree, the bible wins.

## 0 · What this layer is

Elsa was found in a Greek shelter; the archive — which already files her as its own staff — has quietly adopted a classical vocabulary for its furniture. The ornaments are the **house's attempt at civic dignity**: administrative, slightly over-formal, warm. The gap between a dog and a temple is the joke, and the gap must stay: ornaments are printed *on the building*, never worn by the dog.

1. **Attributes, not deities.** No god names, no myth narration, no inscriptions. Each motif carries a *function of the archive*: the path (meander), the honour (laurel), the holdings (amphora), the order (fluting), the threshold (pediment), the domestic (olive), the kept (pomegranate).
2. **Ornament is furniture, not subject.** Rim, plate, back, plaque, certificate, stamp, screen corner — never the photo window, never over the photograph, never inside the 2 cqw halo around the window (the four registration ticks stay the window's only mark, bible §3).
3. **One signature per surface, two at most**, and the second only from the same family (leaf + leaf). Three motifs is a pattern, a pattern is wallpaper, wallpaper competes with the card.
4. **Ornament never creates a foil surface.** It may borrow the four sanctioned ones (edge rim, rarity chip, pack tear, capstone gold). A motif that needs a new foil area to be seen is deleted.

## 1 · The ornament scale

One unit derived from the card, so ornament tracks size exactly as foil does (bible §4 rule 1, §8 em root). All values are tokens (`--orn-*` in `design/tokens/`), never literals in CSS.

| Unit | Definition | W 340 (full card) | W 360 (pack rung) |
| --- | --- | --- | --- |
| `--orn-unit` | 1 cqw of the card container | 3.4 px | 3.6 px |
| meander module / stroke | 2.5 cqw / 0.5 cqw | 8.5 / 1.7 px | 9.0 / 1.8 px |
| motif body (amphora, pomegranate) | 4–8 cqw | 14–27 px | 14–29 px |
| leaf | 3 cqw | 10 px | 11 px |
| flute pitch / groove | 2 cqw / 0.4 cqw | 6.8 / 1.4 px | 7.2 / 1.4 px |
| stroke floor | 1 px device; a key line never below 1.6 px | — | — |

**LOD ladder.** Full verbosity at W ≥ 300 px. At 200–300 px silhouette only (pediment, amphora outline, pomegranate + seeds; olive leaves and flute grooves drop). Below 200 px — the 90 px shelf tile — the meander reduces to a double hairline and every other motif is removed: the tile keeps photo + pearl rim (bible §3's thumbnail rule).

**Print register.** Paper output drops the cqw unit and measures in mm at the sheet's own scale; minimums are physical, not responsive.

| Asset | Geometry | Min | Design size | Ink |
| --- | --- | --- | --- | --- |
| `brand_seal_crest_print.svg` | 24-unit integer viewBox, same drawing as the 24 px mark | 12 mm (≈ 34 pt) | 30 mm (≈ 85 pt) header | 1 (`currentColor`) |
| meander on paper (header rule) | module 2.5 mm, stroke 0.5 mm | module 2 mm / stroke 0.4 mm | header rule under the crest | 1 |

## 2 · The motifs and the seal

### 1 · Mäander / Meander — the signature
- **Where:** foil edge rim, one module strip inside the pearl band, running all four sides but *not* across the plate's text band; the card-back inset ring (replacing the plain 6 % ring); the plate header's lower rule; room/set plaque brackets; screen corners as a **diagonal pair only** (top-left + bottom-right; four would frame the viewport and fight the card).
- **Scale:** module 2.5 cqw, stroke 0.5 cqw, 5:1, strip one module tall, max 3 modules per run. Below a 1.6 px stroke the key stops reading as a key — swap to the double hairline (1 px, 1.5 px gap) instead of shrinking.
- **Foil:** the meander *is* the etch — an axis-aligned mask filled with the existing 118° band family, the dual-angle etch clipped inside the mask so the key's negative space stays empty (no flood, no glitter in the gaps). Standing test: at maximum holo tilt, 360 px, the key must read as a key and not as a bright band.
- **Backup:** geometry and greyscale only; `aria-hidden` (the number and name already identify the plate).

### 2 · Lorbeer / Laurel — the earned
- **Where:** capstone certificate (the only **closed** wreath in the product); wing-completion frame corners; the milestone badge ring (open arc, 3 leaves).
- **Scale:** leaf 3 cqw, arc radius ≥ 40 cqw; below that leaves merge — show 3 leaves and a hairline instead of a wreath.
- **Foil:** capstone/keystone only, in the **static gold glint** (no sweep, no spectrum — bible §4 keystone rule). Matte print colours on milestone outfits.
- **Rule:** open arc = in progress, closed wreath = complete, and it closes *only* on the capstone. Backup: arc state + "Flügel komplett" / "Katalog I · abgeschlossen" — never the arc alone.

### 3 · Amphora — the holdings
- **Where:** set/room plaque mark (left of the eyebrow), binder page margin, volume spine label. **Not on the card front; not on the card back** — the back keeps its single centred composition (bible §3).
- **Scale:** 8 cqw tall at plaque scale, min 24 px; silhouette only: no handles wider than the body, no painted figure work.
- **Foil:** never. Matte `--metal` at ≤ 12 % opacity, never behind text. Backup: silhouette; `aria-hidden`.

### 4 · Kannelur / Column fluting — the order
- **Where:** plaque left edge, dialog frame verticals, binder page gutter. **Flute bracket only** — 3–5 vertical grooves, capped with a hairline at both ends so it reads as a machined edge, not an unfinished drawing. No capital, no base, no entasis, no full column, ever.
- **Scale:** pitch 2 cqw, groove 0.4 cqw, max 5 grooves.
- **Foil:** never. 6–10 % white micro-relief. Backup: ribbed-edge shape; `aria-hidden`.

### 5 · Giebel / Pediment — the threshold
- **Where:** the set plaque's top edge (8° gable cut), the room header's rule, the capstone frame's crown.
- **Scale:** 10 cqw wide × 2.5 cqw rise (4:1 attic pitch — low and civic, not monumental); min 60 px wide, else it degenerates into a chevron and is removed.
- **Foil:** never on cards; the capstone crown may take one capstone-gold hairline, nothing more. Backup: a cut corner, not a colour.

### 6 · Ölzweig / Olive — the quiet register
- **Where:** capstone signature flourish beside "Die Kuratorin"; empty and closed-catalogue surfaces; the colophon. **Never on a card.**
- **Scale:** sprig 6 cqw long; 5 leaves + 3 olives max; below 20 px show 3 leaves only.
- **Foil:** never. This branch means *no performance happened* — matte ink, no sheen, no stamp. It is the only **asymmetric** motif: the human hand inside the institution. Backup: always accompanies text, never alone.

### 7 · Granatapfel / Pomegranate — the counter
- **Where:** the milestone stamp on the pearl rim (25 / 50 / 75 %), whose **visible seed count 1 / 2 / 3** is the shape notch bible §4 requires; the accession stamp in the full record.
- **Scale:** 4 cqw, min 16 px; seeds ≥ 3 px each, else the stamp falls back to a closed disc carrying the numeral.
- **Rule:** a pomegranate here is a **seal, never fruit** — no cut-open illustration, no food joke (the dog's one food register is the Leckerli file and it stays hers).
- **Foil:** print only, matte, identical tokens at every step (no step is colour-coded). Backup: seed count + "25 %" + the label — three carriers before colour.

### 8 · Brandsiegel / The print crest — the document's seal
**Not a motif.** It is the house's seal (paw crest in its circle, bible §3), and it exists in two weights from *one* geometry.
- **Files:** `brand_seal_crest_24.svg` (screen/UI, 24 px) and `brand_seal_crest_print.svg` (paper). Same 24-unit integer viewBox — the print file is the same drawing scaled to mm, never a redrawn crest.
- **Ink:** one colour, `currentColor` (the sheet's `--paper-ink #1c1a20`, ≈ 15.7:1 on `--paper #f7f4ee` — hand-computed, confirm in the contrast belt). No gradient, no foil, no pearl band, no holo spectrum (bible §4), no `mix-blend-mode`, no filter, no raster, and **no lettering**: a ring of type is mush at 12 mm, and invented lettering is banned (§6.2). The product name is real type in the sheet header.
- **Where:** the Sammelbogen header, left of the title block, page 1 only — **one seal per document**, it is a stamp, not a pattern. And the 0-collected mark at 12 mm. Never on a card, never in the footer, never repeated per page.
- **Scale:** 30 mm (≈ 85 pt) header, 12 mm (≈ 34 pt) floor — the smallest size at which the paw's toe gaps hold.
- **600 dpi survival:** minimum stroke 0.6 unit = 0.3 mm at 12 mm (≈ 7 device px, at 23.6 px/mm); minimum counter/gap 0.5 unit = 0.25 mm (≈ 6 px). Nothing thinner at any size — no hairline under 0.25 pt reaches paper.
- **Detail ladder:** 12 mm = ring + paw silhouette only; 20 mm = + one inner rule; 30 mm = + the second rule. The crest never carries the meander — the module would fall under the stroke floor.
- **Redundancy:** the crest marks *the document*, never the state. At zero, `print:empty` ("Noch keine gesammelten Karten") carries the meaning and the crest stands beside it as `aria-hidden` ornament.
- **Build:** inline the print SVG into the sheet markup (sammelbogen §4: no fetch between gesture and `window.print()`); verify it prints with "background graphics" off in Chrome and Safari.
- **Doc flag:** `sammelbogen.md` §2/§3/AC1 say `n = 0` prints nothing — so at zero the crest has exactly one home, the **on-screen** empty state. A printed 0-sheet needs that spec changed first; this sheet does not overrule it.

## 3 · Ornament hierarchy

Ranked by attention allowed, not by frequency:

1. **Meander** — signature. Always at the rim; the one motif a reader could draw from memory.
2. **Laurel** — earned. Only where something was completed, so the loudest *event* despite being rare.
3. **Pomegranate** — counter. Smallest and most frequent meaning-bearing motif; deliberately stamplike.
4. **Amphora** — set identity. Heavier in mass, quieter in contrast (12 % cap).
5. **Pediment** — structure. A cut, not an icon.
6. **Fluting** — texture. Felt at 340 px, invisible at 90 px — correct.
7. **Olive** — quiet register. The asymmetry is the point: the archive relaxes only where nothing is being claimed.

Rule: any surface shows the meander (always or never) plus **at most one** of 2–7. **Above the ranking:** the print crest is not a motif but the seal — on paper it outranks the meander, because a document carries one seal and only one.

## 4 · Foil, motion, photograph

- **No new foil surface** (§0.4): the meander rides the edge rim, the laurel rides capstone gold, nothing else foils.
- **The 118° family is untouched.** The meander's *strip* is rectilinear; its *fill* is the 118° band. Never rotate the key to 112–118° — a diagonal key reads as damage, not ornament.
- **Glint:** no motif animates. The only motion near one is the existing rim glint (5.2 s), which passes *over* the meander.
- **Reduced motion:** ornaments are static by default, so their reduced-motion state is *identical to default* — verify rather than assume, and ship no motif animation that lacks a static proof.
- **Stamps do not animate.** A milestone is applied, not performed: no scale-in, no shine; it is simply there on the next render.
- **Window law:** nothing on the photo, in the window, or in its 2 cqw halo. At 25 % brightness in greyscale, the face is still the first thing read.

## 5 · Non-colour redundancy

Only four marks may carry meaning — three motifs and the seal. Everything else is `aria-hidden` decoration.

| Motif | Means | Shape backup | Text backup | Fails if |
| --- | --- | --- | --- | --- |
| meander | "a plate of this archive" | frame geometry, present/absent | number + name already say it | it is the only identifier |
| laurel | complete vs in progress | open arc vs closed wreath | "Flügel komplett", "Katalog I · abgeschlossen" | only the arc distinguishes |
| pomegranate | which milestone | seed count 1 / 2 / 3 | "25 %" + its label | seeds are colour-coded |
| print crest | "this sheet is the archive's" | the seal itself, one ink | header title + `print:count` | it is the only mark of a state |

Ornament is never text and never a control, so SC 1.4.11 does not bind it; **SC 1.4.3 does wherever it sits behind or beside text** — hence the amphora's 12 % cap and the rule that no motif goes under a caption.

## 6 · Five things to reject

1. **Water in every disguise.** No wave scroll (the closest-looking "Greek" border after the key), dolphins, shells, trident, sea foam, Poseidon. Canon: Elsa hates water — a wave scroll is a meander that got wet.
2. **Fake Greek lettering.** No ΑΡΕΤΗ, no ΣΟΦΙΑ, no invented inscriptions, no greeked glyph rows as texture. Chivo carries no Greek; invented lettering is costume, and the register is bilingual catalogue prose or nothing.
3. **The costume.** No toga, no laurel *worn* by the dog, no sandals, no fig leaf, no drapery, no photo treatment that dresses her. Bible §5: the costume is in type, never on the dog.
4. **Kitsch columns and faux age.** No capital + base + entasis, no caryatids, no broken column, no marble-veining gradient, no ruin texture, no gold-leaf speckle, no patina. The archive's paper is new and crisp (bible §9 ref 3); fluting is a machined edge, not architecture.
5. **The sun disc.** Considered and **not adopted**: it duplicates the lamp (bible §1 rations light), and a disc with a face or rays-as-crown tips a civic joke into a cartoon. A "day" mark, if ever needed, is the pediment on an ordinary hairline.

## 7 · Open decisions

- **Pomegranate stamp** — recommended as specified (seed count as the notch). Fallback if it reads as food in review: a plain notched disc, same counts. Owner's call.
- **Screen-corner brackets** — recommended: two, diagonal. Four become a viewport frame and outrank the card.
- **Token names** (`--orn-meander-module`, `--orn-meander-stroke`, `--orn-leaf`, `--orn-flute-pitch`, `--orn-flute-groove`, `--orn-motif-body`) are minted at the build-phase token spike with measured values; this sheet specifies ratios, not final numbers.
