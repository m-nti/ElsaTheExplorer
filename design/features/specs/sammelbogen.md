# Sammelbogen / Collector Sheet — Feature Spec

> **Status**: Draft · **Author**: systems-designer · **Last Updated**: 2026-11-22
> **Implements**: the collection as a *Sammelwerk* — what is collected can be laid on paper. The print counterpart of the catalogue, not a reward.
> **Depends on**: `collection-meta.md` R-B (seen-set), R-C (derived progress, never stored), Catalogue order and numbering, Photos Pipeline thumbs. **No new storage** — the sheet is derived at print time and nothing is written.
> **Build phase**: Full Vision — build-order step 6 (with the capstones; closes the "print stylesheet" gap in `interaction-patterns.md`).

## 1. Purpose

One A4 sheet (or several) of the visitor's **collected** cards: number, name, room. It exists so the archive can leave the browser and be pinned to a fridge without a screenshot. Museum-register header, page footer, no marketing.

**Decision — collected only, no placeholders.** Recommendation and rationale: a placeholder grid turns the sheet into a want-list, which is the to-do pressure R-K forbids; it also prints mostly-empty pages for a young collection and invites "why is this blank". The sheet is a **record of what exists**, not a shopping list. (Rejected alternative: all cards with empty slots — better for a completionist poster, wrong for this product.)

## 2. Data Model (derived, never stored)

```ts
type PrintCard = { id: string; number: number; name: string; room: string; thumb: string };
type PrintSheet = { pages: PrintCard[][]; totalCollected: number; totalInCatalogue: number };
```

- `cards = catalogueOrder(manifest).filter(id => seen.has(id))` — canonical catalogue order, same numbering as the lightbox ("Nr. 07").
- `name` / `room` = manifest name and wing display name in the active language (shelf included); never the joke line or the alt text.
- Built on every relevant render, not at click time (see §5 gesture rule). Rebuilt when the seen-set, language or manifest changes.

**Formula — pagination**

`per_page = cols × rows`, `pages = max(1, ceil(n / per_page))`

| Symbol | Type | Range | Description |
|---|---|---|---|
| `cols` | int | 5 (constant) | columns on A4 portrait |
| `rows` | int | 4 (constant) | rows per page |
| `per_page` | int | 20 (constant) | cards per sheet |
| `n` | int | 0–manifest size | collected cards |
| `pages` | int | 0 or 1–⌈n/20⌉ | printed pages; `n = 0` prints nothing (button unavailable) |

**Output range:** `n = 0` → no sheet at all (not an empty sheet); otherwise 1 page minimum, last page partial. **Worked example:** 64 collected → `ceil(64/20) = 4` pages: 20 / 20 / 20 / 4 cards.

## 3. State Machine

| State | Entry | Render | Exit |
|---|---|---|---|
| `unavailable` | `n = 0` | button disabled, `print:empty` line, no sheet in DOM | first card collected |
| `ready` | `n ≥ 1` | button enabled; hidden sheet built in the DOM | print → `printing` |
| `printing` | `window.print()` called | browser print dialog owns the screen | dialog closed → `ready` |
| `degraded` (overlay) | a thumb fails to load | that card prints its frame + number, name, room (never a blank hole) | thumb loads |

No error modal, no in-app preview: the browser's print dialog *is* the preview (see §4). Cancelling changes nothing.

## 4. Interaction Map & Print Flow

| Action | Mouse | Touch | Keyboard |
|---|---|---|---|
| Print | "Sammelbogen drucken" → `window.print()` | same, ≥44 px | `Enter` / `Space`; visible focus ring |
| Choose printer / pages | browser dialog (native) | native sheet | native |
| Cancel | browser dialog "Cancel" / `Esc` | native | `Esc` |
| Return | `afterprint` → focus back on the print button | same | same |

**Flow:** the sheet is always built in the DOM (`display:none` on screen), so the click handler calls `window.print()` **synchronously** — no `await`, no image decode, no fetch between gesture and dialog (Safari/iOS silently drop print calls after an async gap). `@media print` reveals it. On `beforeprint`, set `document.title` to `Sammelbogen-Elsa-{date}`; on `afterprint`, restore the title and focus. `n = 0` → the button never opens the dialog.

## 5. Print CSS Contract

```css
@page { size: A4 portrait; margin: 12mm; }
@media print {
  .masthead, .stage, .catalogue__tools, dialog, .live-region, .no-print { display: none !important; }
  .print-sheet { display: block; }                 /* hidden on screen, sole print surface */
  .print-sheet { --paper: #f7f4ee; --paper-ink: #1c1a20; background: var(--paper); color: var(--paper-ink); }
  .print-card { break-inside: avoid; }             /* a card never splits across pages */
  .print-page + .print-page { break-before: page; }/* one wrapper per page, no break after the last */
  .print-card img, .print-card__rarity { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-sheet *, .print-sheet *::before, .print-sheet *::after { animation: none !important; transition: none !important; }
  a[href]::after { content: none; }                /* no URL spill */
}
```

- **Layout:** A4 portrait, 12 mm margins, 5 × 4 grid, 34 mm cards (5:3.5 ratio), 4 mm gutter; header block ~18 mm, footer ~8 mm. Name/number/room under each card, ≥7 pt: the name wraps to two lines, the room line shrinks first, no ellipsis (print has no hover for a tooltip).
- **What prints:** header title, `print:count`, per card `print:number`, name, room; footer `print:page`, `print:date`. Nothing else — no buttons, no foil, no dialogs, no progress bars, no "2. Auflage" stamps (pull history, not collection state).
- **Colour decision:** the sheet is a light paper document, not the dark parlour — a full-bleed `#111017` page is an ink flood and prints poorly on home printers. Photos and rarity strips keep exact colour; the paper palette is two tokens scoped to `.print-sheet`, so a dark sheet is a token change if the owner overrules.
- Images are built eagerly (not `loading="lazy"`) with width/height set, so `window.print()` does not race the network.

## 6. Accessibility

- **Print is not a screen-reader path.** A printed sheet is inert: no reading order, no semantics, no live region. The accessible alternative is the on-screen catalogue, which carries the same information (names, numbers, rooms, collected state). The spec does not weaken the catalogue to make print work.
- The print button is a real `<button>` whose accessible name states the scope: "Sammelbogen drucken — nur gesammelte Karten". Disabled state is text ("Noch keine gesammelten Karten"), never opacity alone.
- The hidden sheet is `display: none` at screen widths and `aria-hidden="true"`, so its duplicate text never reaches the accessibility tree.
- Announce `print:opened` via the polite live region *before* calling `window.print()`; the browser dialog itself is not announced by the page.
- No motion anywhere in the sheet; `prefers-reduced-motion` has nothing to disable. Text is never replaced by an image — every printed fact is selectable text.

## 7. Copy Keys (DE / EN placeholders)

| Key | DE | EN |
|---|---|---|
| `print:action` / `actionHint` | Sammelbogen drucken / Nur gesammelte Karten. | Print collector sheet / Collected cards only. |
| `print:empty` | Noch keine gesammelten Karten. | No collected cards yet. |
| `print:opened` | Druckdialog geöffnet. {n} gesammelte Karten. | Print dialog open. {n} collected cards. |
| `print:title` | Sammelbogen | Collector Sheet |
| `print:count` | {collected} von {total} gesammelt | {collected} of {total} collected |
| `print:number` | Nr. {number} | No. {number} |
| `print:page` / `date` | Seite {page} von {pages} / Stand: {date} | Page {page} of {pages} / As of: {date} |

`{room}` reuses the wing display names (R-A); `{date}` is the local calendar date, never a timestamp.

## 8. Acceptance Criteria (binary)

1. GIVEN 0 collected, WHEN the catalogue renders, THEN the print button is disabled with `print:empty`, and no `.print-sheet` exists in the DOM.
2. GIVEN 3 collected, WHEN print is activated, THEN the sheet holds exactly 3 cards, zero placeholders, 1 page.
3. GIVEN 64 collected, WHEN the sheet is built, THEN it has 4 pages with 20 / 20 / 20 / 4 cards in canonical catalogue order, no card split across a page.
4. GIVEN an uncollected card in the manifest, WHEN the sheet is built, THEN it does not appear.
5. GIVEN the screen view, WHEN inspected, THEN `.print-sheet` is `display:none` and `aria-hidden="true"`; the accessibility tree contains no duplicate.
6. GIVEN print emulation, THEN masthead, stage, tools, dialogs, live region and all foil/animation are absent from the output, and card images keep colour (`print-color-adjust: exact`).
7. GIVEN a thumb that fails to load, WHEN printed, THEN that card still shows number, name and room (no blank hole, no broken-image icon).
8. GIVEN DE and EN, THEN every printed string follows the active language and the brand reads "Elsa the Explorer" in both.
9. GIVEN the print dialog is cancelled, THEN focus returns to the print button and no storage key changed.
10. GIVEN keyboard only, WHEN tabbing, THEN the button is reachable with a visible ring and `Enter`/`Space` opens the dialog.
11. GIVEN the click handler, WHEN it runs, THEN `window.print()` is called in the same task (no `await`/promise before it).

## 9. Build Phase

Full Vision, build-order step 6. Order: sheet builder (pure, Vitest: filtering, order, pagination, `n=0`) → print CSS token layer + page wrappers (Playwright print emulation) → button/flow + announcements → broken-image fallback → DE/EN print copy check. Requires only the catalogue and seen-set; do not couple it to the Ehrenmensch component.
