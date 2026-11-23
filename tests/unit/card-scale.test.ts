/**
 * The card's one root em scale (#89).
 *
 * Authority: `design/art/art-bible.md` §8 "Card anatomy — refactor spec"
 * ("one root em scale … express **all** card-internal dimensions … in `em`")
 * and "Type & spacing scales"; adopted by `design/ux/card-detail.md` §5.3 E.
 *
 * The rule is binary: a card-internal length that consumes a px token keeps its
 * absolute size while the card shrinks, which is exactly the class of bug #89
 * measured (bands overflow below 340 px). So this spec asserts:
 *
 * 1. the card scale is em, and each em equals its old px at the 340 px
 *    reference (the ratified look does not change);
 * 2. every `var(--elsa-*)` the component consumes resolves, and none of them is
 *    a px value — with two named exceptions: the card's own width (the input to
 *    `4cqw`) and the 3D stage depth, which the motion sheet pins as a constant;
 * 3. the em root is derived from the container, never the viewport;
 * 4. the per-width px override block the em root replaces is gone.
 */
import { describe, expect, it } from "vitest";
import {
  CARD_REFERENCE_PX,
  CSS_REFERENCE_ROOT_PX,
  elsaRefs,
  emOf,
  tokenValue,
} from "./support/card-tokens";
import { cssRules, readCardFace, styleOf } from "./support/cardface-source";

const source = readCardFace();
const css = styleOf(source);
const rules = cssRules(css);

/** Every member of the card em family, with the px it replaces at 340 px. */
const CARD_SCALE: readonly (readonly [name: string, referencePx: number])[] = [
  ["--elsa-card-space-1", 4],
  ["--elsa-card-space-2", 8],
  ["--elsa-card-space-3", 12],
  ["--elsa-card-space-6", 32],
  ["--elsa-card-text-sm", 11],
  ["--elsa-card-text-md", 13],
  ["--elsa-card-text-xl", 19],
  ["--elsa-card-rule", 1],
  ["--elsa-card-radius", 18],
  ["--elsa-card-radius-photo", 8],
  ["--elsa-card-radius-inner", 8],
  ["--elsa-card-radius-pill", 999],
];

/**
 * `--elsa-sizes-card-max` is the card's own width — the input the em root is
 * computed from, so it cannot itself be em.
 * `--elsa-tilt-perspective` is the 3D stage depth, pinned as a constant by
 * `design/art/motion-sheet.md` (§3, "the card's tilt reads the same at 180 px
 * and 340 px"); it is a camera property, not card geometry.
 */
const NON_GEOMETRY_PX = new Set(["--elsa-sizes-card-max", "--elsa-tilt-perspective"]);

describe("the card em scale (#89)", () => {
  it("is em-valued and reproduces the 340 px look", () => {
    for (const [name, referencePx] of CARD_SCALE) {
      const raw = tokenValue(name).trim();
      expect(raw, `${name} must be a plain em value`).toMatch(/^-?\d*\.?\d+em$/);

      const rendered = emOf(name);
      expect(
        Math.abs(rendered - referencePx),
        `${name}: ${raw} renders ${rendered.toFixed(2)} px at the reference, not ${referencePx} px`,
      ).toBeLessThan(0.05);
    }
  });

  it("keeps the card shadow in em too", () => {
    const shadow = tokenValue("--elsa-card-shadow");
    expect(shadow).not.toMatch(/\dpx/);
    expect(shadow).toContain("1.765em");
    expect(shadow).toContain("4.412em");
    // 24 px / 60 px of old: the drop shadow is part of the card's silhouette and
    // must shrink with it, or a 148 px card wears a 60 px halo.
    expect(1.765 * CSS_REFERENCE_ROOT_PX).toBeCloseTo(24, 1);
    expect(4.412 * CSS_REFERENCE_ROOT_PX).toBeCloseTo(60, 1);
  });

  it("consumes no px-valued token anywhere inside the card", () => {
    const refs = elsaRefs(css);
    // Not vacuous: the component really is token-driven.
    expect(refs.length).toBeGreaterThan(20);

    for (const name of refs) {
      // Resolving throws on an unpublished name, so a typo fails here too.
      const value = tokenValue(name);
      if (NON_GEOMETRY_PX.has(name)) continue;
      expect(value, `${name} is a px value consumed by the card face`).not.toMatch(
        /(^|[\s(,])-?\d*\.?\d+px\b/,
      );
    }
  });

  it("derives the em root from the container, not the viewport", () => {
    const root = rules.find((rule) =>
      rule.declarations.some((entry) => entry.property === "font-size"),
    );
    const fontSize = rules
      .flatMap((rule) => rule.declarations)
      .filter((entry) => entry.property === "font-size");

    expect(root).toBeDefined();
    expect(tokenValue("--elsa-sizes-card-root")).toBe("4cqw");
    expect(fontSize.some((entry) => entry.value === "var(--elsa-sizes-card-root)")).toBe(true);
    // `4cqw` of 340 px is the 13.6 px the scale is computed against.
    expect(CARD_REFERENCE_PX * 0.04).toBeCloseTo(CSS_REFERENCE_ROOT_PX, 5);
  });

  it("is consumed by the component — no member of the family is dead", () => {
    const refs = new Set(elsaRefs(css));
    for (const [name] of CARD_SCALE) {
      expect(refs.has(name), `${name} is declared but never consumed`).toBe(true);
    }
    expect(refs.has("--elsa-card-shadow")).toBe(true);
  });

  it("retires the px override block the em root replaces", () => {
    // The `@container (max-width: 300px)` block re-specified padding and the
    // name size for narrow cards. With one em root it is redundant — keeping it
    // would be the second, px system the refactor exists to delete.
    expect(rules.some((rule) => rule.atRules.some((at) => at.startsWith("@container")))).toBe(
      false,
    );
    expect(css).not.toMatch(/@container/);
  });
});
