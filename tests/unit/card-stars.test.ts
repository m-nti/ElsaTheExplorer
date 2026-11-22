import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { RARITY_TIERS } from "@tokens";
import {
  RARITY_STARS,
  STAR_SCALE_MAX,
  cardStars,
  starLabel,
} from "$lib/domain/card-stars";
import type { RarityTier } from "$lib/domain/rarity";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), "utf8");

describe("star scale (#51)", () => {
  it("fills a five-slot row 3/4/5 and matches the rarity table", () => {
    expect(STAR_SCALE_MAX).toBe(5);
    expect(RARITY_STARS).toEqual({ common: 3, rare: 4, holo: 5 });
    for (const [tier, spec] of Object.entries(RARITY_TIERS)) {
      expect(cardStars(tier as RarityTier)).toBe(spec.stars);
    }
  });

  it("never prints a count outside 3..5", () => {
    for (const stars of Object.values(RARITY_STARS)) {
      expect(stars).toBeGreaterThanOrEqual(3);
      expect(stars).toBeLessThanOrEqual(STAR_SCALE_MAX);
    }
  });

  it("speaks the label in both languages", () => {
    expect(starLabel(4, "de")).toBe("4 von 5 Sternen");
    expect(starLabel(4, "en")).toBe("4 of 5 stars");
  });

  it("keeps the deck and the token table in step with the domain", () => {
    const deck = read("design/copy/copy-deck.md");
    expect(deck).toContain("{n} von 5 Sternen");
    expect(deck).toContain("{n} of 5 stars");
    expect(read("design/tokens/tokens.ts")).toContain("stars: 5");
  });
});
