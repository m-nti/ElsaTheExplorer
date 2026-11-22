import { describe, expect, it } from "vitest";
import { tileAlt, tileNumberLabel } from "$lib/domain/tile";

describe("tileAlt", () => {
  it("uses the manifest description when present", () => {
    expect(tileAlt({ alt: "Elsa schläft auf einer grünen Decke." }, "Deckenhöhlen-Späherin")).toBe(
      "Elsa schläft auf einer grünen Decke.",
    );
  });

  it("falls back to the printed name when the manifest alt is empty", () => {
    expect(tileAlt({ alt: "" }, "Deckenhöhlen-Späherin")).toBe("Deckenhöhlen-Späherin");
  });

  it("treats a whitespace-only alt as missing", () => {
    expect(tileAlt({ alt: "   " }, "Deckenhöhlen-Späherin")).toBe("Deckenhöhlen-Späherin");
  });

  it("never returns untrimmed text", () => {
    expect(tileAlt({ alt: "  Elsa am Beet.  " }, "x")).toBe("Elsa am Beet.");
  });
});

describe("tileNumberLabel", () => {
  it("reads the printed number without its plate prefix", () => {
    expect(tileNumberLabel("No. 01")).toBe("01");
  });

  it("keeps a bare number unchanged", () => {
    expect(tileNumberLabel("03")).toBe("03");
  });
});
