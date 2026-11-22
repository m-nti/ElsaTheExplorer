/**
 * The star scale — one authority for how many stars a rarity prints and how the
 * strip is spoken (#51).
 *
 * Ruling: the strip is a **five-slot appraisal row**, filled 3 / 4 / 5
 * (common / rare / holo). It is not a 1–3 index of the rarity tiers.
 *
 * Why: the card is a museum label, and a label states a standing on a fixed
 * scale, not a count of how many buckets the catalogue happens to have. A
 * fixed-length row is also the only form in which the strip works as the
 * colour-free rarity backup `design/accessibility-requirements.md` §Color-as-
 * Only-Indicator promises: the *empty* slots carry the comparison, so a common
 * card reads "3 of 5" at a glance instead of "one star" (which reads as a tier
 * index leaking into the label), and the row's width never changes between
 * cards, so the edition credit beside it cannot re-truncate as the visitor
 * steps through the archive.
 *
 * `design/ux/card-detail.md` §12 and `design/copy/copy-deck.md` §5 state the
 * same scale. `tests/unit/card-stars.test.ts` holds the domain, the token table
 * and both documents together, so the three cannot drift apart again.
 */

import type { Locale } from "$lib/stores/i18n.svelte";
import type { RarityTier } from "./rarity";

/** Slots in the strip: the top of the scale and the row's fixed length. */
export const STAR_SCALE_MAX = 5;

/** Every count the strip may print. The scale starts at 3, never at 0. */
export type StarCount = 3 | 4 | 5;

/** Tier → filled slots. The one mapping; the token table and the face read it. */
export const RARITY_STARS: Readonly<Record<RarityTier, StarCount>> = {
  common: 3,
  rare: 4,
  holo: 5,
};

/** The only sanctioned way to fill `CardFaceModel.stars`. */
export function cardStars(tier: RarityTier): StarCount {
  return RARITY_STARS[tier];
}

/**
 * `card.stars.aria` (copy-deck §5). `{n}` is the filled count — the scale's top
 * is written into the string, because that is what a spoken label must say.
 */
export const STAR_LABEL: Readonly<Record<Locale, string>> = {
  de: "{n} von 5 Sternen",
  en: "{n} of 5 stars",
};

/** The strip's accessible name: `4 von 5 Sternen` / `4 of 5 stars`. */
export function starLabel(stars: StarCount, locale: Locale = "de"): string {
  return STAR_LABEL[locale].replace("{n}", String(stars));
}
