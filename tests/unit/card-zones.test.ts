import { describe, expect, it } from "vitest";
import { CARD_ZONES, CARD_ZONES_TILE, photoWidth, zoneSum } from "$lib/domain/card-zones";

describe("card zones (art-bible §8, D12a)", () => {
  it("matches art-bible §8 and sums to 100", () => {
    expect(CARD_ZONES).toEqual({
      plate: 15.5,
      photo: 41.5,
      strip: 5.5,
      story: 19.5,
      stats: 8.5,
      foot: 5,
      gutters: 4.5,
    });
    expect(zoneSum(CARD_ZONES)).toBeCloseTo(100, 5);
    expect(zoneSum(CARD_ZONES_TILE)).toBeCloseTo(100, 5);
  });

  // The sum alone cannot tell a transposed story/stats pair (16/9 vs 9/16) from
  // the ratified column, so the tile column is pinned value by value too.
  it("carries the Binder-tile column", () => {
    expect(CARD_ZONES_TILE).toEqual({
      plate: 15.5,
      photo: 44,
      strip: 5.5,
      story: 16,
      stats: 9,
      foot: 5.5,
      gutters: 4.5,
    });
  });

  it("gives a 155.94 px window at the 340 px reference", () => {
    expect(photoWidth(340)).toBeCloseTo(155.945, 2);
  });
});
