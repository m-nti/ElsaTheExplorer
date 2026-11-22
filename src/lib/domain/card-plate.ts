/**
 * The plate's two rows — the structure D12a bought (#13, T5).
 *
 * Authority: `design/art/art-bible.md` §8 ("Zone proportions — the overflow
 * law") and `design/ux/card-detail.md` §5.3:
 *
 *   row 1: name, **one line** with `text-overflow: ellipsis`
 *   row 2: number, mood (one line, ellipsis), rarity chip — sharing the row
 *
 * Why the split is a domain function and not markup detail: the 15.5 % plate
 * band is the tightest arithmetic on the card (72.81 px at the 340 px reference,
 * 52.81 px after padding and the row gap, against a 25.65 px name line and a
 * 21 px metadata row), and the pressure order — credit → mood → print line →
 * copy clamp — is a *design* decision that must survive a refactor. Returning the
 * rows as data lets `tests/unit/card-plate.test.ts` pin the order and prove both
 * sides of the 40-character name budget without a manifest loader (there is none
 * until B3).
 *
 * It does not truncate. A 41-character name keeps all 41 characters here and the
 * one-line clamp is `text-overflow: ellipsis` in the component, so the name's
 * accessible text and its printed text never diverge.
 */
import type { CardFaceModel } from "./card";

/** The plate fields the rows are built from. */
export type PlateSource = Pick<CardFaceModel, "name" | "number" | "mood" | "rarityLabel">;

/**
 * Row 2 in render order. A labelled tuple rather than `string[]`: the chip is a
 * different element with its own foil layer, and the label makes a transposed
 * pair a type error instead of a silent swap.
 */
export type PlateMeta = readonly [number: string, mood: string, rarity: string];

export interface PlateRows {
  /** Row 1: the name, complete. The ellipsis is CSS. */
  readonly name: string;
  /** Row 2: number, mood, rarity label — one line, chip last. */
  readonly meta: PlateMeta;
}

/** The plate's rows for a model. Pure: no truncation, no locale, no formatting. */
export function plateRows(model: PlateSource): PlateRows {
  return {
    name: model.name,
    meta: [model.number, model.mood, model.rarityLabel],
  };
}
