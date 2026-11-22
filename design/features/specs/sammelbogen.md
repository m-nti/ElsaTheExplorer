# Sammelbogen / Collector Sheet — Feature Spec

> **Status**: Draft · **Author**: systems-designer · **Last Updated**: 2026-11-22
> **Revised 2026-11-22 — canon decision 3** (`mechanics.md` §3 P1–P7, `feature-slate.md` § *Open questions* 3): placeholder toggle (reversal of the earlier "no placeholders" ruling), 16 per A4 page in a fixed 4 × 4 grid, crest zero state, flat order with room labels, palette and print-hide contract.
> **Implements**: the collection as a *Sammelwerk* — what is collected can be laid on paper. The print counterpart of the collection, not a reward.
> **Depends on**: `collection-meta.md` R-B (seen-set), R-C (derived progress, never stored), Catalogue order and numbering, Photos Pipeline thumbs. **No new storage** — the sheet is derived at print time and nothing is written.
> **Build phase**: Full Vision — build-order step 6 (with the capstones; closes the "print stylesheet" gap in `interaction-patterns.md`).

## 1. Purpose

One A4 sheet (or several) of the visitor's **collected** cards: number, name, room. It exists so the archive can leave the browser and be pinned to a fridge without a screenshot. Museum-register header, page footer, no marketing.

**Decision — collected only by default, placeholders on request (reversal).** An earlier draft of this spec ruled out placeholders outright. That ruling is **reversed (2026-11-22, canon decision 3; `mechanics.md` §3 P2)** — with its reason preserved: a placeholder grid *as the default* turns the sheet into a want-list, which is the to-do pressure R-K forbids, and prints mostly-empty pages for a young collection. So the default stays **collected only**, and the want-list must be **asked for**: one labelled toggle beside the print control, **off by default**, **session-only (never persisted across visits)**, and **never printed (it is a control, §5)**. When it is on, not-yet-collected cards join the *same* flat run as labelled silhouettes. The default artifact is a trophy; the checklist is opt-in. (Retired alternative: all cards with empty slots as the only mode — better for a completionist poster, wrong for this product.)

## 2. Data Model (derived, never stored)

```ts
type PrintCard = {
  id: string; number: number; name: string; room: string; thumb: string;
  placeholder: boolean;   // true only when the toggle is on AND the card is unseen
};
type PrintSheet = {
  pages: PrintCard[][]; totalCollected: number; totalInCatalogue: number;
  includePlaceholders: boolean; zeroState: boolean;   // zeroState = (cards.length === 0)
};
```

- `cards = catalogueOrder(manifest).filter(c => includePlaceholders || seen.has(c.id))` — **one flat run** in canonical catalogue order, same numbering as the lightbox ("Nr. 07"). **No per-wing sections and no sub-headings**: the **room name is the card's label**, so the rooms stay legible without fragmenting the sheet (canon decision 3; per-wing grouping and the 64-slot wall chart are both retired).
- `placeholder` cards print a silhouette frame + `print:number`, name, room and the `print:placeholder` line in place of the photo. `print:count` and `print:opened` always report `seen.size` (truth), never `cards.length` (which includes placeholders).
- `name` / `room` = manifest name and wing display name in the active language (shelf included); never the joke line or the alt text.
- Built on every relevant render, not at click time (see §4 gesture rule). Rebuilt when the seen-set, the toggle, the language or the manifest changes.

**Formula — pagination**

`cols = 4`, `rows = 4`, `per_page = cols × rows = 16`, `pages = max(1, ceil(n / per_page))`

| Symbol | Type | Range | Description |
|---|---|---|---|
| `cols` | int | 4 (constant) | columns on A4 portrait; fixed — A3/landscape reflow the same 16-cell chunk, they never add columns |
| `rows` | int | 4 (constant) | rows per page |
| `per_page` | int | 16 (constant) | cards per printed page |
| `n` | int | 0–manifest size | cards on the sheet: `seen.size`, or `totalInCatalogue` when the toggle is on |
| `pages` | int | 1–⌈manifest size / 16⌉ | printed pages; **`n = 0` still prints 1 page** (crest zero-sheet) |

**Output range:** `pages` is clamped from below by `max(1, …)`, so the minimum is **1** (at `n = 0` and for any `n ≤ 16`): the zero state is a real page carrying the crest and the instruction line — never `pages = 0`, never an empty grid, never a disabled button. The maximum is `⌈totalInCatalogue / 16⌉` (grows with the manifest). The last page is partial; the browser is never allowed to choose the break (§5). **Worked examples:** 64 collected → `ceil(64/16) = 4` pages of **16 / 16 / 16 / 16**; 43 collected → `ceil(43/16) = 3` pages of 16 / 16 / 11; 0 collected → **1** page, 0 cards, crest + `print:empty`.

**Cell arithmetic (why 4 × 4 is exact).** A4 portrait with 12 mm margins leaves 186 × 273 mm; header ≈ 18 mm and footer ≈ 8 mm leave **186 × 247 mm** of live area. Cell **43 mm × 58 mm** with a 4 mm gutter: `4 × 43 + 3 × 4 = 184 mm ≤ 186` and `4 × 58 + 3 × 4 = 244 mm ≤ 247` — 16 cells fit with never a cell pushed to a surprise page. Pagination is **chunked in the DOM, not browser-flowed**: each `.print-page` wrapper holds exactly 16 cells, so `pages` is true on paper as well as in the button copy.

## 3. State Machine

| State | Entry | Render | Exit |
|---|---|---|---|
| `absent` | `totalInCatalogue = 0` (empty manifest) | **no print entry point at all** — no button, no toggle; the collection's own empty state speaks | manifest gains a photo |
| `ready` | manifest non-empty, `n ≥ 0` | button **enabled, also at `n = 0`**; the placeholder toggle sits beside it (off); the hidden sheet is in the DOM with `pages` wrappers — at `n = 0` that is 1 wrapper holding the crest and `print:empty` | print → `printing` |
| `printing` | `window.print()` called | browser print dialog owns the screen | dialog closed → `ready` |
| `degraded` (overlay) | a thumb (or the crest SVG) fails to load | that card prints its frame + number, name, room, `print:placeholder`-style label — never a blank hole; a failed crest prints nothing and the header text still carries the document | resource loads |

There is **no disabled print button in any state**: at zero the button prints a real sheet (crest + instruction line). No error modal, no in-app preview: the browser's print dialog *is* the preview (see §4). Cancelling changes nothing; storage is never touched.

## 4. Interaction Map & Print Flow

| Action | Mouse | Touch | Keyboard |
|---|---|---|---|
| Include placeholders | labelled checkbox `print:toggle`, **unchecked on load** | same, ≥44 px hit area | `Tab` reaches it **before** the print button (scope is read before the action); `Space` toggles |
| Print | "Sammelbogen drucken" → `window.print()` | same, ≥44 px | `Enter` / `Space`; visible focus ring |
| Choose printer / pages | browser dialog (native) | native sheet | native |
| Cancel | browser dialog "Cancel" / `Esc` | native | `Esc` |
| Return | `afterprint` → focus back on the print button | same | same |

**Flow:** the sheet is always built in the DOM (`display:none` on screen), so the click handler calls `window.print()` **synchronously** — no `await`, no image decode, no fetch between gesture and dialog (Safari/iOS silently drop print calls after an async gap). `@media print` reveals it; the crest SVG is **inlined** for the same reason. Flipping `print:toggle` re-derives the sheet in the same task (a mode change must be visible before the gesture, never inside it). On `beforeprint`, set `document.title` to `Sammelbogen-Elsa-{date}`; on `afterprint`, restore the title and focus. `n = 0` → the button **does** open the dialog and prints the crest sheet; `absent` (empty manifest) → there is no button to press.

## 5. Print CSS Contract

```css
@page { size: A4 portrait; margin: 12mm; }
@media print {
  .masthead, .stage, .catalogue__tools, .print-controls, .print-toggle,
  dialog, .live-region, .no-print { display: none !important; }
  .print-sheet { display: block; }                 /* hidden on screen, sole print surface */
  .print-sheet { --paper: #f7f4ee; --paper-ink: #1c1a20; background: var(--paper); color: var(--paper-ink); }
  .print-grid { display: grid; grid-template-columns: repeat(4, 43mm); grid-auto-rows: 58mm; gap: 4mm; }
  .print-card { break-inside: avoid; }             /* a card never splits across pages */
  .print-page { break-inside: avoid; page-break-inside: avoid; overflow: visible; height: auto; min-height: 0; }
  .print-page + .print-page { break-before: page; break-after: auto; } /* one wrapper per page, no break after the last */
  .print-card img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-crest { color: var(--paper-ink); }        /* one ink, currentColor: no gradient, foil, filter or raster */
  .print-sheet *, .print-sheet *::before, .print-sheet *::after { animation: none !important; transition: none !important; }
  a[href]::after { content: none; }                /* no URL spill */
}
```

- **Layout:** A4 portrait, 12 mm margins, **fixed 4-column grid** (not `1fr`): `repeat(4, 43mm)` columns of **58 mm** rows, 4 mm gutter — 16 cells per page, arithmetic in §2. Header block ~18 mm (crest 30 mm page 1, left of the title block), footer ~8 mm. Caption under each cell: `print:number`, name, then **room as the label line**, together ≥ 7 pt; the name may wrap to two lines, the room line shrinks first, **no ellipsis** (print has no hover for a tooltip).
- **Page wrappers break correctly:** the builder emits one `.print-page` per 16 cells and nothing relies on browser flow; `break-before: page` only on wrappers *after* the first, `break-inside: avoid` on the wrapper and on every cell, and every `100svh`/scroll ancestor is neutralised (`overflow: visible`, `height: auto`, `min-height: 0`) — the classic clipped-last-page bug.
- **What prints:** header title, brand, **the crest (page 1 only, one seal per document — `motif-sheet.md` §2.8)**, `print:count`, per card `print:number`, name, room label; footer `print:page`, `print:date`. At `n = 0`: crest (12 mm mark) + `print:empty` instruction line, **never an empty grid and never a lone header on a blank sheet**. Nothing else prints — no buttons, **no placeholder toggle or any other control (`print-controls`, `print-toggle` are print-hidden and must also be absent from the DOM copy the print sheet renders)**, no foil, no dialogs, no progress bars, no "2. Auflage" stamps (pull history, not collection state).
- **Colour decision:** the sheet is a light paper document, not the dark parlour — a full-bleed `#111017` page is an ink flood and prints poorly on home printers. `--paper #f7f4ee` / `--paper-ink #1c1a20` are two tokens scoped to `.print-sheet` (≈ 15.7:1, one palette, not two), so a dark sheet is a token change if the owner overrules. Photos keep exact colour; rarity is a printed word, never colour. `print-color-adjust: exact` on `<img>` only — never on surfaces, never on the crest (it uses `currentColor`).
- Images are built eagerly (not `loading="lazy"`) with width/height set, so `window.print()` does not race the network; 43 mm ≈ 508 px at 300 dpi, which the existing 2× sharp thumb covers.

## 6. Accessibility

- **Print is not a screen-reader path.** A printed sheet is inert: no reading order, no semantics, no live region. The accessible alternative is the on-screen catalogue, which carries the same information (names, numbers, rooms, collected state). The spec does not weaken the collection to make print work.
- The print button is a real `<button>` whose accessible name states the scope: "Sammelbogen drucken — nur gesammelte Karten". **It has no disabled state** (there is none to have, §3): at zero it prints the crest sheet, and the name stays honest because the scope is still "collected cards only". The zero state is communicated by the sheet, not by a dead control.
- The placeholder toggle is a real `<input type="checkbox">` with its own `<label>` text (`print:toggle`) — never a styled `div` with `aria-pressed`, never a switch that hides its state. **Unchecked on load, session-only: no `lucky-elsa.*` key is written, read or reset for it, and its state is dropped on reload.** Its accessible name states the artifact change ("Noch nicht gesammelte als Platzhalter"), and flipping it announces the new sheet size through the polite live region.
- The hidden sheet is `display: none` at screen widths and `aria-hidden="true"`, so its duplicate text never reaches the accessibility tree.
- **The crest** is inline SVG with `aria-hidden="true"` on the printed sheet — it marks the *document*, never the state (`motif-sheet.md` §2.8), and at zero `print:empty` carries the meaning. `print:crestAlt` is the text alternative for the one place the crest *is* exposed to assistive tech (the on-screen zero state), so no surface ever presents an unlabelled graphic.
- Announce `print:opened` via the polite live region *before* calling `window.print()`; the browser dialog itself is not announced by the page. `{n}` is the collected count, never the placeholder-inflated card count.
- No motion anywhere in the sheet; `prefers-reduced-motion` has nothing to disable. Text is never replaced by an image — every printed fact is selectable text.

## 7. Copy Keys (DE / EN placeholders)

| Key | DE | EN |
|---|---|---|
| `print:action` / `actionHint` | Sammelbogen drucken / Nur gesammelte Karten. | Print collector sheet / Collected cards only. |
| `print:toggle` | Noch nicht gesammelte als Platzhalter | Include not-yet-collected as placeholders |
| `print:empty` | Noch keine Karten gesammelt — der Bogen füllt sich mit der Sammlung. | No cards collected yet — the sheet fills itself from the catalogue. |
| `print:crestAlt` | Brandsiegel: Pfote im Kreis | Archive seal: paw in a ring |
| `print:placeholder` | noch nicht gesammelt | not yet collected |
| `print:opened` | Druckdialog geöffnet. {n} gesammelte Karten. | Print dialog open. {n} collected cards. |
| `print:title` | Sammelbogen | Collector Sheet |
| `print:count` | {collected} von {total} gesammelt | {collected} of {total} collected |
| `print:number` | Nr. {number} | No. {number} |
| `print:page` / `date` | Seite {page} von {pages} / Stand: {date} | Page {page} of {pages} / As of: {date} |

`print:empty` is **one string with two homes** — the on-screen zero state and the printed crest sheet use it verbatim, so the instruction is never paraphrased into a second one-off sentence. `{room}` reuses the wing display names (R-A) as the card label; `{date}` is the local calendar date, never a timestamp. `print:toggle` and `print:placeholder` are the only new *card-level* strings introduced by the placeholder mode; both are ink-on-paper-legal and index-aligned.

## 8. Acceptance Criteria (binary)

1. GIVEN 0 collected on a non-empty manifest, WHEN the collection renders, THEN the print button is **enabled** and the sheet in the DOM is exactly **1 `.print-page`** containing the monochrome crest **and** the `print:empty` instruction line — no empty grid, no `pages = 0`, no disabled button.
2. GIVEN 0 collected, WHEN printed, THEN the crest prints at 12 mm in one ink (`currentColor` = `#1c1a20`), survives with "background graphics" off, and the sheet is not blank (the instruction line is present).
3. GIVEN the crest on any sheet, THEN it appears **once**, in the page-1 header (30 mm) or as the zero-state mark (12 mm) — never on page 2+, never on a card, never in the footer; it carries no lettering and no gradient/foil/filter.
4. GIVEN 3 collected, WHEN the sheet is built, THEN it holds exactly 3 cards, zero placeholders, in **1 page**.
5. GIVEN 64 collected, WHEN the sheet is built, THEN it has exactly **4 `.print-page` wrappers of 16 cards each** in canonical catalogue order, laid out 4 × 4 in 43 × 58 mm cells, with no card split across a page.
6. GIVEN an uncollected card in the manifest, WHEN the toggle is **off**, THEN it does not appear on the sheet nor in its cell count.
7. GIVEN the sheet is built, THEN the cards form **one flat run with no per-wing sections or sub-headings**, and each card's label line is its room name.
8. GIVEN a fresh page load, THEN the placeholder toggle is **unchecked**; after toggling it on and reloading, it is unchecked again and **no `lucky-elsa.*` key was written** by the toggle.
9. GIVEN the toggle on, WHEN the sheet is built, THEN the previously uncollected cards appear in their catalogue positions as labelled placeholders (`print:placeholder`), `print:count` still reports collected only, and the page count is `max(1, ceil(total/16))`.
10. GIVEN the screen view, WHEN inspected, THEN `.print-sheet` is `display:none` and `aria-hidden="true"`; the accessibility tree contains no duplicate.
11. GIVEN print emulation, THEN masthead, stage, tools, dialogs, live region, all foil/animation **and the placeholder toggle/controls** are absent from the output, and card images keep colour (`print-color-adjust: exact`).
12. GIVEN a thumb that fails to load, WHEN printed, THEN that card still shows number, name and room (no blank hole, no broken-image icon); a crest that fails to load leaves the header text intact.
13. GIVEN an empty manifest (`total = 0`), THEN no print button and no toggle exist in the DOM.
14. GIVEN DE and EN, THEN every printed string follows the active language and the brand reads "Elsa the Explorer" in both.
15. GIVEN the print dialog is cancelled, THEN focus returns to the print button and no storage key changed.
16. GIVEN keyboard only, WHEN tabbing, THEN the toggle is reachable before the button, both have visible rings, `Space` toggles and `Enter`/`Space` opens the dialog.
17. GIVEN the click handler, WHEN it runs, THEN `window.print()` is called in the same task (no `await`/promise before it).

## 9. Build Phase

Full Vision, build-order step 6. Order: **sheet builder (pure, Vitest: filtering, flat order + room label, pagination `max(1, ceil(n/16))`, `n = 0` → 1 crest page, toggle on/off, toggle never persisted)** → **inline crest SVG + print token layer (`#f7f4ee` / `#1c1a20`) + `.print-page` chunking of 16 cells (Playwright print emulation: page count, crest once, no toggle in output)** → button/flow + placeholder toggle (session-only, unchecked on load) + announcements → broken-image fallback → DE/EN print copy check (both homes of `print:empty`). Requires only the collection and the seen-set; do not couple it to the Ehrenmensch component.

*This revision resolves the doc flag in `motif-sheet.md` §2.8* — `n = 0` no longer "prints nothing", so the crest has a home on paper as well as in the on-screen empty state.
