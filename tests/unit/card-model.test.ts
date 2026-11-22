import { describe, expect, it } from "vitest";
import type { CardFaceModel } from "$lib/domain/card";
import { RARITY_STARS, cardStars } from "$lib/domain/card-stars";

const model = (overrides: Partial<CardFaceModel> = {}): CardFaceModel => ({
  id: "elsa-01",
  number: "No. 01",
  name: "Blickkontakt-Expertin",
  mood: "Aufmerksam",
  rarity: "holo",
  rarityLabel: "Holo-Pracht",
  stars: cardStars("holo"),
  edition: "Erste Auflage · Serie I",
  keyword: "Blickkontakt",
  story: "…",
  printLine: "Fantasiewerte · nur zum Spaß",
  stats: [{ label: "Blick", value: "98" }],
  serial: "ELSA · 0001 / 0001",
  credit: "Foto: Hausarchiv",
  renderable: true,
  photo: { src: "/img/photo-unavailable.webp", alt: "Platzhalter", width: 540, height: 720 },
  ...overrides,
});

describe("card model (#13, T3)", () => {
  it("maps every rarity to the 3/4/5 scale at runtime", () => {
    expect(RARITY_STARS).toEqual({ common: 3, rare: 4, holo: 5 });
    expect(cardStars("common")).toBe(3);
    expect(cardStars("rare")).toBe(4);
    expect(cardStars("holo")).toBe(5);
  });

  it("constructs a non-renderable card", () => {
    const card = model({ renderable: false });
    expect(card.renderable).toBe(false);
  });

  it("accepts a focus point as {x, y}, not a string", () => {
    const card = model({
      photo: { src: "/x.webp", alt: "x", width: 1, height: 1, focus: { x: 0.5, y: 0.42 } },
    });
    expect(card.photo.focus).toEqual({ x: 0.5, y: 0.42 });
  });
});
