/**
 * The B2 slice: five cards at five widths (#13, T9; ADR-0002 spike 1).
 *
 * This is the rendered proof the unit suite cannot give:
 * - **E-OVF-01/07/09** — no horizontal overflow at 320 and 1280, DE and EN; no
 *   card box paints past the viewport; the budget-length name truncates with an
 *   ellipsis instead of pushing its grid.
 * - **The copy clamp (#70), pinned at the reference width** — the story band
 *   affords exactly **two** whole lines at 340 px (38 px box ÷ 17.55 px line),
 *   and the component clamps to **one**. One home is a deliberate
 *   under-report, never a clipped line: the test fails if the clamp ever
 *   exceeds the band's capacity without an ADR changing the band.
 * - **E-RM-03/08** — under `prefers-reduced-motion: reduce` the foil and the
 *   tilt are static across two samples 500 ms apart, and the content is
 *   identical to full motion.
 * - **E-IMG-09** — `renderable:false` renders the printed frame and issues no
 *   request for its `photo.src`.
 *
 * **Known blocker (#89).** Below 340 px the card's bands overflow: the em root
 * is set but every inner dimension is a px token, so the type does not scale
 * with the card (art-bible §8's em-scale refactor is unimplemented). At 220 px
 * the story copy box is 4 px — a clipped partial line — and the stats band is
 * 9 px short. The sub-reference test below asserts the contract and is marked
 * `test.fail` against #89; when the em scale lands it turns red ("passed
 * unexpectedly") until the marker is removed, which is the tripwire we want.
 * The 148 px row is the Binder tile's minimum width run through the *full*
 * column — the tile band column (`CARD_ZONES_TILE`) is B5's, so that row proves
 * width behaviour only.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [148, 180, 220, 280, 340] as const;
/** The art-bible reference width: the one the arithmetic is ratified against. */
const REFERENCE_WIDTH = 340;
const CARD_IDS = [
  "haeufig-01",
  "selten-02",
  "elsa-01",
  "langname-04",
  "unbelichtet-05",
] as const;
const LONG_NAME_CARD = "langname-04";
const HOLO_CARD = "elsa-01";
const PRINTED_CARD = "unbelichtet-05";
const FOIL_LAYERS = ["foil-rim", "foil-chip", "foil-photo", "foil-etch", "foil-glitter"] as const;
/** Identical in both motion modes (E-RM-08). */
const DE_NAMES = [
  "Sitzplatz-Expertin",
  "Geräusch-Archivarin",
  "Blickkontakt-Expertin",
  "Blickkontakt-Expertin-der-Ersten-Auflage",
  "Unbelichtete Kandidatin",
] as const;

interface ZoneMeasure {
  readonly className: string;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

interface CardMeasure {
  readonly id: string;
  readonly render: string;
  readonly faceRight: number;
  readonly faceWidth: number;
  readonly zones: readonly ZoneMeasure[];
  readonly copy: {
    readonly clamp: number;
    /** Whole line boxes the copy's own box can show. */
    readonly capacity: number;
    readonly clientHeight: number;
    readonly textLength: number;
  };
  readonly name: {
    readonly whiteSpace: string;
    readonly textOverflow: string;
    readonly scrollWidth: number;
    readonly clientWidth: number;
  };
}

interface RowMeasure {
  readonly width: number;
  readonly cards: readonly CardMeasure[];
}

interface PageMeasure {
  readonly scrollWidth: number;
  readonly innerWidth: number;
  readonly rows: readonly RowMeasure[];
}

async function measure(page: Page): Promise<PageMeasure> {
  return page.evaluate(() => {
    const toNumber = (value: string): number => Number.parseFloat(value) || 0;

    const cards = (row: Element): CardMeasure[] =>
      [...row.querySelectorAll<HTMLElement>("[data-slice-card]")].map((cell) => {
        const face = cell.querySelector<HTMLElement>(".card-face");
        const copy = cell.querySelector<HTMLElement>(".copy");
        const name = cell.querySelector<HTMLElement>(".name");
        if (!face || !copy || !name) throw new Error("card anatomy missing");
        const box = face.getBoundingClientRect();
        const copyStyle = getComputedStyle(copy);
        const lineHeight = toNumber(copyStyle.lineHeight) || 1;

        return {
          id: cell.dataset.sliceCard ?? "",
          render: face.dataset.render ?? "",
          faceRight: box.right,
          faceWidth: box.width,
          zones: [...face.querySelectorAll<HTMLElement>(".zone")].map((zone) => ({
            className: zone.className,
            scrollHeight: zone.scrollHeight,
            clientHeight: zone.clientHeight,
          })),
          copy: {
            // `-webkit-line-clamp` is the shipped longhand; `line-clamp` is the
            // standard one. Whichever the engine honours, the clamp is known.
            clamp: Math.max(
              toNumber(copyStyle.webkitLineClamp),
              toNumber(copyStyle.getPropertyValue("line-clamp")),
            ),
            capacity: Math.floor(copy.clientHeight / lineHeight + 0.05),
            clientHeight: copy.clientHeight,
            textLength: (copy.textContent ?? "").trim().length,
          },
          name: {
            whiteSpace: getComputedStyle(name).whiteSpace,
            textOverflow: getComputedStyle(name).textOverflow,
            scrollWidth: name.scrollWidth,
            clientWidth: name.clientWidth,
          },
        };
      });

    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      rows: [...document.querySelectorAll<HTMLElement>("[data-slice-width]")].map((row) => ({
        width: Number(row.dataset.sliceWidth),
        cards: cards(row),
      })),
    };
  });
}

/** Every card in one measured row, or a failure naming the row. */
function cardsOf(measured: PageMeasure, width: number): readonly CardMeasure[] {
  const row = measured.rows.find((entry) => entry.width === width);
  expect(row, `row ${width} rendered`).toBeDefined();
  return row!.cards;
}

for (const locale of ["de", "en"] as const) {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 320, height: 640 },
  ] as const) {
    test(`no overflow and honest clamps — ${locale} at ${viewport.width} px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?lang=${locale}`);

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      // Every row rendered, so a missing width cannot pass silently.
      await expect(page.locator("[data-slice-width]")).toHaveCount(WIDTHS.length);

      const measured = await measure(page);

      // E-OVF-01: the page never scrolls horizontally.
      expect(
        measured.scrollWidth,
        `${locale}@${viewport.width}: page scrollWidth ${measured.scrollWidth} vs ${measured.innerWidth}`,
      ).toBeLessThanOrEqual(measured.innerWidth + 1);

      for (const row of measured.rows) {
        expect(row.cards, `row ${row.width} card count`).toHaveLength(CARD_IDS.length);

        for (const card of row.cards) {
          // E-OVF-07: nothing paints past the viewport edge.
          expect(
            card.faceRight,
            `${locale}@${viewport.width} row ${row.width} ${card.id}: right edge`,
          ).toBeLessThanOrEqual(measured.innerWidth + 1);

          // The card is never wider than the band under test (or the viewport).
          expect(card.faceWidth).toBeLessThanOrEqual(Math.min(row.width, viewport.width) + 1);

          // The declared clamp is what ships: one line (#70). It is pinned at
          // the reference width below; here it must at least be declared.
          expect(card.copy.clamp, `${card.id} clamp`).toBe(1);
          expect(card.copy.textLength, `${card.id} copy text`).toBeGreaterThan(0);

          // The name is a one-line ellipsis everywhere.
          expect(card.name.whiteSpace, `${card.id} name nowrap`).toBe("nowrap");
          expect(card.name.textOverflow, `${card.id} name ellipsis`).toBe("ellipsis");
        }
      }

      // E-OVF-09: the budget-length name truncates instead of pushing the grid.
      const longName = measured.rows
        .flatMap((row) => row.cards)
        .find((card) => card.id === LONG_NAME_CARD);
      expect(longName).toBeDefined();
      expect(longName!.name.scrollWidth).toBeGreaterThan(longName!.name.clientWidth);

      // E-OVF-10: visual evidence, one per locale and viewport.
      const shots = join("qa-shots", "cardface");
      mkdirSync(shots, { recursive: true });
      await page.screenshot({
        path: join(shots, `slice-${locale}-${testInfo.project.name}-${viewport.width}.png`),
        fullPage: true,
      });
    });
  }
}

test("the reference card holds its bands (340 px, #70 pinned)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=de");

  const cards = cardsOf(await measure(page), REFERENCE_WIDTH);
  expect(cards).toHaveLength(CARD_IDS.length);

  for (const card of cards) {
    expect(card.faceWidth).toBeCloseTo(REFERENCE_WIDTH, 0);

    // E-OVF-06: no zone is taller than its band at the reference width.
    for (const zone of card.zones) {
      expect(
        zone.scrollHeight,
        `${card.id} ${zone.className}: scrollHeight vs clientHeight`,
      ).toBeLessThanOrEqual(zone.clientHeight + 1);
    }

    // #70: the story band affords **two** whole lines here (38 px box at
    // 17.55 px per line); the component clamps to **one**. A clamp of three —
    // what art-bible §8 and UX §5.3 still claim — would paint a cut glyph, so
    // raising the clamp needs the band ruling first, not a CSS edit.
    expect(card.copy.capacity, `${card.id} whole lines in the story band`).toBe(2);
    expect(card.copy.clamp, `${card.id} clamp`).toBe(1);
    expect(card.copy.clamp).toBeLessThanOrEqual(card.copy.capacity);
  }
});

test("sub-reference widths honour the bands — expected failure until #89", async ({ page }) => {
  // #89: the em scale from art-bible §8 is not applied, so below 340 px the
  // type keeps its px size while the bands shrink. This test states the
  // contract the slice owes; it fails today and is marked expected.
  test.fail(true, "blocked by #89 — card-internal sizes are px, so the bands overflow below 340 px");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=de");

  const measured = await measure(page);
  for (const width of WIDTHS.filter((entry) => entry < REFERENCE_WIDTH)) {
    for (const card of cardsOf(measured, width)) {
      for (const zone of card.zones) {
        expect(
          zone.scrollHeight,
          `${width}px ${card.id} ${zone.className}`,
        ).toBeLessThanOrEqual(zone.clientHeight + 1);
      }
      // Not even a sliver: a 4 px copy box is a glyph cut in half.
      expect(card.copy.capacity, `${width}px ${card.id} whole lines`).toBeGreaterThanOrEqual(1);
    }
  }
});

test("the holo card carries the five foil layers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=de");

  const holo = page.locator(`[data-slice-width="340"] [data-slice-card="${HOLO_CARD}"]`).first();

  for (const layer of FOIL_LAYERS) {
    await expect(holo.locator(`.${layer}`).first(), layer).toHaveCount(1);
  }
  // The chip layer is the second non-colour rarity backup, so it is scoped to
  // the chip rather than washed across the plate.
  await expect(holo.locator(".chip .foil-chip")).toHaveCount(1);
});

test("E-IMG-09: renderable:false prints the frame and requests no image", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=de");
  await page.waitForLoadState("load");

  const printed = page
    .locator(`[data-slice-width="340"] [data-slice-card="${PRINTED_CARD}"]`)
    .first();

  await expect(printed.locator('[data-render="printed"]')).toHaveCount(1);
  await expect(printed.locator("img")).toHaveCount(0);
  await expect(printed.locator(".printed-caption")).toBeVisible();

  // The listener is not vacuous: the rendered cards did fetch the placeholder.
  expect(requested.some((url) => url.includes("photo-unavailable.webp"))).toBe(true);
  // The printed card's own source is never requested.
  expect(requested.filter((url) => url.includes("never-requested.webp"))).toEqual([]);
});

test("tilt follows the pointer and releases at rest (E-KBD-06 tilt input)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?lang=de");

  const face = page
    .locator(`[data-slice-width="340"] [data-slice-card="${HOLO_CARD}"] .card-face`)
    .first();

  // The 340 px row is below the fold: pointer coordinates are viewport-based.
  await face.scrollIntoViewIfNeeded();
  const box = await face.boundingBox();
  expect(box).not.toBeNull();

  const tilt = () =>
    face.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        x: style.getPropertyValue("--elsa-tilt-x").trim(),
        y: style.getPropertyValue("--elsa-tilt-y").trim(),
        transform: style.transform,
      };
    });

  expect((await tilt()).y).toBe("0deg");

  // Near the card's right edge the yaw leaves zero.
  await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height * 0.5);
  await expect.poll(async () => (await tilt()).y).not.toBe("0deg");

  // Leaving the card returns the rest frame.
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await tilt()).y).toBe("0deg");
});

test.describe("reduced motion (E-RM-03, E-RM-08)", () => {
  test.use({ reducedMotion: "reduce" });

  test("the final frame is static and the content is unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/?lang=de");

    const face = page
      .locator(`[data-slice-width="340"] [data-slice-card="${HOLO_CARD}"] .card-face`)
      .first();

    // E-RM-08: the same five cards, names and rarities as full motion.
    const names = await page.locator(".card-face .name").evaluateAll((nodes) =>
      nodes.slice(0, 5).map((node) => node.textContent?.trim() ?? ""),
    );
    expect(names).toEqual([...DE_NAMES]);
    await expect(page.locator('.card-face[data-rarity="holo"]').first()).toHaveAttribute(
      "data-rarity",
      "holo",
    );

    // E-RM-03: no animation survives, and nothing moves between two samples
    // 500 ms apart. The tilt stays at rest even under the pointer.
    const animations = await face.evaluate(
      (element) => element.getAnimations({ subtree: true }).length,
    );
    expect(animations).toBe(0);

    await face.scrollIntoViewIfNeeded();
    const box = await face.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height * 0.5);

    const sample = () =>
      face.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          transform: style.transform,
          x: style.getPropertyValue("--elsa-tilt-x").trim(),
          y: style.getPropertyValue("--elsa-tilt-y").trim(),
        };
      });

    const first = await sample();
    await page.waitForTimeout(500);
    const second = await sample();

    expect(first.transform).toBe("none");
    expect(second.transform).toBe(first.transform);
    expect(first.x).toBe("0deg");
    expect(second.x).toBe(first.x);
    expect(second.y).toBe(first.y);
  });
});
