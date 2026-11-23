/**
 * The B2 slice: five cards at five widths (#13, T9; ADR-0002 spike 1).
 *
 * This is the rendered proof the unit suite cannot give:
 * - **E-OVF-01/06/07/09** — no horizontal overflow at 320/390/768/1280/1920,
 *   DE and EN; no card box paints past the viewport; no band is taller than its
 *   grid row at any card width; the budget-length name truncates with an
 *   ellipsis instead of pushing its grid.
 * - **The story clamp (#70, D70)** — band 4 is two rows (sentence ≤ 3 lines,
 *   then the Fantasiewerte line), so the reference card affords exactly
 *   **three** whole lines and the component clamps to **three**: the third line
 *   is painted, not clipped, and a longer sentence ellipsises.
 * - **The em scale (#89)** — every card-internal length is em against the
 *   `4cqw` root, so at 148/180/220/280/340 px every zone still fits its band and
 *   the copy box still shows three whole lines. Before #89 the same run
 *   measured +30 / +14 / +9 / +1 / 0 px of stats overflow and a 0 px copy box.
 * - **E-RM-03/08** — under `prefers-reduced-motion: reduce` the foil and the
 *   tilt are static across two samples 500 ms apart, and the content is
 *   identical to full motion.
 * - **E-IMG-09** — `renderable:false` renders the printed frame and issues no
 *   request for its `photo.src`.
 *
 * The 148 px row runs the *full* column through the Binder tile's minimum width
 * — the tile band column (`CARD_ZONES_TILE`) is B5's, so that row proves width
 * behaviour only.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [148, 180, 220, 280, 340] as const;
/** The art-bible reference width: the one the arithmetic is ratified against. */
const REFERENCE_WIDTH = 340;
/** The bands of art-bible §8, in the order they stack. */
const ZONES = ["header", "photo-zone", "strip", "story", "stats", "foot"] as const;
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
/** The D70 clamp: three lines, both in the ruling and in the component. */
const COPY_LINES = 3;

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

/** Every zone of a card, in band order, so a missing band cannot pass. */
function zonesOf(card: CardMeasure): ZoneMeasure[] {
  // Svelte appends its scope hash to `class`, so match the band name rather
  // than trusting the last token.
  const byBand = new Map(
    card.zones.map((zone) => [
      zone.className.split(/\s+/).find((name) => (ZONES as readonly string[]).includes(name)),
      zone,
    ]),
  );
  return ZONES.map((band) => {
    const zone = byBand.get(band);
    expect(zone, `${card.id} renders the ${band} band`).toBeDefined();
    return zone!;
  });
}

for (const locale of ["de", "en"] as const) {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ] as const) {
    test(`no overflow and honest clamps — ${locale} at ${viewport.width} px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?slice=1&lang=${locale}`);

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
          const where = `${locale}@${viewport.width} row ${row.width} ${card.id}`;

          // E-OVF-07: nothing paints past the viewport edge.
          expect(card.faceRight, `${where}: right edge`).toBeLessThanOrEqual(
            measured.innerWidth + 1,
          );

          // The card is never wider than the band under test (or the viewport).
          expect(card.faceWidth).toBeLessThanOrEqual(Math.min(row.width, viewport.width) + 1);

          // E-OVF-06: every band fits its grid row at every width. This is the
          // #89 contract — before the em scale the stats band overran by 30 px
          // at 148 px and the copy box collapsed to 0 px.
          for (const zone of zonesOf(card)) {
            expect(
              zone.scrollHeight,
              `${where} ${zone.className}: scrollHeight ${zone.scrollHeight} vs clientHeight ${zone.clientHeight}`,
            ).toBeLessThanOrEqual(zone.clientHeight + 1);
          }

          // #70/#89: the declared clamp is three lines, and the band affords
          // three — no clipped third line at any card width.
          expect(card.copy.clamp, `${where} clamp`).toBe(COPY_LINES);
          expect(card.copy.capacity, `${where} whole lines`).toBeGreaterThanOrEqual(COPY_LINES);
          expect(card.copy.textLength, `${where} copy text`).toBeGreaterThan(0);

          // The name is a one-line ellipsis everywhere.
          expect(card.name.whiteSpace, `${where} name nowrap`).toBe("nowrap");
          expect(card.name.textOverflow, `${where} name ellipsis`).toBe("ellipsis");
        }
      }

      // E-OVF-09: the budget-length name truncates instead of pushing the grid.
      const longName = measured.rows
        .flatMap((row) => row.cards)
        .find((card) => card.id === LONG_NAME_CARD);
      expect(longName).toBeDefined();
      expect(longName!.name.scrollWidth).toBeGreaterThan(longName!.name.clientWidth);

      // E-OVF-10: visual evidence at the two viewports the #89 AC cites. The
      // other three still assert; capturing all five × two locales × four
      // engines starved the workers and turned green runs flaky.
      if (viewport.width === 320 || viewport.width === 1280) {
        const shots = join("qa-shots", "cardface");
        mkdirSync(shots, { recursive: true });
        await page.screenshot({
          path: join(shots, `slice-${locale}-${testInfo.project.name}-${viewport.width}.png`),
          fullPage: true,
        });
      }
    });
  }
}

test("the reference card holds its bands (340 px, #70 pinned)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?slice=1&lang=de");

  const cards = cardsOf(await measure(page), REFERENCE_WIDTH);
  expect(cards).toHaveLength(CARD_IDS.length);

  for (const card of cards) {
    expect(card.faceWidth).toBeCloseTo(REFERENCE_WIDTH, 0);

    // E-OVF-06: no zone is taller than its band at the reference width.
    for (const zone of zonesOf(card)) {
      expect(
        zone.scrollHeight,
        `${card.id} ${zone.className}: scrollHeight vs clientHeight`,
      ).toBeLessThanOrEqual(zone.clientHeight + 1);
    }

    // #70/D70: band 4 is two rows, so it affords **three** whole lines and the
    // component clamps to **three**. The old three-row plan afforded 2.16 lines
    // and clipped the third mid-glyph; the keyword row that caused it is gone.
    expect(card.copy.capacity, `${card.id} whole lines in the story band`).toBe(COPY_LINES);
    expect(card.copy.clamp, `${card.id} clamp`).toBe(COPY_LINES);
    expect(card.copy.clamp).toBeLessThanOrEqual(card.copy.capacity);
  }
});

test("sub-reference widths honour the bands (#89, em scale)", async ({ page }) => {
  // #89: with every card-internal length in em against the `4cqw` root, a card
  // at 148 px is the 340 px card at 0.435 × — the same fit, not a px layout in
  // a smaller box. Before the refactor this run measured +30 px of stats
  // overflow at 148 px and a 0 px copy box; the contract below is what failed.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?slice=1&lang=de");

  const measured = await measure(page);

  for (const width of WIDTHS) {
    for (const card of cardsOf(measured, width)) {
      for (const zone of zonesOf(card)) {
        expect(
          zone.scrollHeight,
          `${width}px ${card.id} ${zone.className}`,
        ).toBeLessThanOrEqual(zone.clientHeight + 1);
      }
      // Not even a sliver: a 4 px copy box is a glyph cut in half.
      expect(card.copy.capacity, `${width}px ${card.id} whole lines`).toBeGreaterThanOrEqual(
        COPY_LINES,
      );
    }
  }
});

test("the holo card carries the five foil layers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?slice=1&lang=de");

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
  await page.goto("/?slice=1&lang=de");
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
  await page.goto("/?slice=1&lang=de");

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
  await face.hover({ position: { x: box!.width * 0.9, y: box!.height * 0.5 } });
  await expect.poll(async () => (await tilt()).y).not.toBe("0deg");

  // Leaving the card returns the rest frame.
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await tilt()).y).toBe("0deg");
});

test.describe("reduced motion (E-RM-03, E-RM-08)", () => {
  test.use({ reducedMotion: "reduce" });

  test("the final frame is static and the content is unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/?slice=1&lang=de");

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
