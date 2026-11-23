/**
 * The card face's seven proportional bands, as typed data.
 *
 * Authority: `design/art/art-bible.md` §8 ("Zone proportions — the overflow
 * law", D12a) and `design/ux/card-detail.md` §5.3. The bands are percentages of
 * the **plate's inner height** (the card height minus its 2 × 8 px face
 * padding), and every column sums to exactly 100.
 *
 * Why a typed constant and not CSS custom properties: the bands are the input to
 * arithmetic that a reviewer can check (the photo window's width, the gap
 * width), and CSS cannot assert a sum. Keeping the table here lets
 * `tests/unit/card-zones.test.ts` hold the component, the art bible and the UX
 * spec to the same numbers; the component consumes these values through Panda
 * tokens, never by re-typing them.
 */

/** The seven bays: six content bands plus the distributed gutters. */
type CardZone = "plate" | "photo" | "strip" | "story" | "stats" | "foot" | "gutters";

/**
 * The full card (and the drop card, which differs only in its copy clamp).
 * Sums to 100: 15.5 + 41.5 + 5.5 + 19.5 + 8.5 + 5 + 4.5.
 */
export const CARD_ZONES: Readonly<Record<CardZone, number>> = Object.freeze({
  plate: 15.5,
  photo: 41.5,
  strip: 5.5,
  story: 19.5,
  stats: 8.5,
  foot: 5,
  gutters: 4.5,
});

/**
 * The Binder tile column (art-bible §8). Sums to 100:
 * 15.5 + 44 + 5.5 + 16 + 9 + 5.5 + 4.5.
 */
export const CARD_ZONES_TILE: Readonly<Record<CardZone, number>> = Object.freeze({
  plate: 15.5,
  photo: 44,
  strip: 5.5,
  story: 16,
  stats: 9,
  foot: 5.5,
  gutters: 4.5,
});

/** The card's width:height ratio (`sizes.card-max` = 340 × 485.71). */
const CARD_ASPECT = 0.7;

/** The face's 2 × 8 px padding, which the plate's inner height excludes. */
const FACE_PADDING = 16;

/** The photo window's width per unit of band height: the §3 4:5 (w:h) ratio. */
const WINDOW_ASPECT = 0.8;

/** The band percentages' total — the plate's inner height is 100. */
export function zoneSum(zones: Readonly<Record<CardZone, number>>): number {
  return Object.values(zones).reduce((total, percent) => total + percent, 0);
}

/**
 * The photo window's rendered width in px for a card of `cardWidth` px.
 *
 * At the 340 px reference: plate inner height 469.71 px → band 194.93 px →
 * window **155.94 px** (45.87 % of the card width). The 16 px subtraction is the
 * face padding: the band is a fraction of the *inner* height, so the un-padded
 * form overstates the window by 5.32 px and fails the art-bible figure.
 */
export function photoWidth(cardWidth: number): number {
  const plateInner = cardWidth / CARD_ASPECT - FACE_PADDING;
  return plateInner * (CARD_ZONES.photo / 100) * WINDOW_ASPECT;
}
