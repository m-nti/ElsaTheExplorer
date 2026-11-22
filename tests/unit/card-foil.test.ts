/**
 * The five-layer foil stack (#13, T6).
 *
 * Authority: `design/art/art-bible.md` §8 rule 4 and the surface register —
 * rim, chip, photo, etch, glitter (glint and rays live inside glitter). Every
 * layer consumes `--tier-*` or `--elsa-*`; a literal colour would break the
 * single-source rule the contrast gate depends on.
 *
 * Source-level assertions are deliberate: the unit project is node-only, and
 * these are contract facts (which layers exist, what they consume, how they
 * nest). The rendered proof is T9's Playwright slice.
 */
import { describe, expect, it } from "vitest";
import { classDepths, cssRules, markupOf, readCardFace, styleOf } from "./support/cardface-source";

const LAYERS = ["foil-rim", "foil-chip", "foil-photo", "foil-etch", "foil-glitter"] as const;
const COLOUR =
  /^(color|background|background-image|box-shadow|opacity|border-color|fill|stroke|text-shadow)$/;

const source = readCardFace();
const markup = markupOf(source);
const css = styleOf(source);

describe("foil stack (#13, T6)", () => {
  it("renders exactly the five named layers", () => {
    const depths = classDepths(markup);
    for (const layer of LAYERS) expect(depths.has(layer), layer).toBe(true);
    const foilClasses = [...depths.keys()].filter((name) => name.startsWith("foil-"));
    expect(new Set(foilClasses)).toEqual(new Set(LAYERS));
  });

  it("nests the glint and rays inside the glitter layer", () => {
    const depths = classDepths(markup);
    expect(depths.get("glint")!).toBeGreaterThan(depths.get("foil-glitter")!);
    expect(depths.get("rays")!).toBeGreaterThan(depths.get("foil-glitter")!);
  });

  it("uses only tokens for colour, gradient, shadow and opacity", () => {
    for (const rule of cssRules(css)) {
      if (!rule.selectors.some((selector) => LAYERS.some((layer) => selector.includes(`.${layer}`)))) {
        continue;
      }
      // The reduced-motion override sets `opacity: 0` on purpose; it is a state,
      // not a colour, and the base rule above it already passed the token check.
      if (rule.atRules.some((at) => at.includes("prefers-reduced-motion"))) continue;
      for (const { property, value } of rule.declarations) {
        if (!COLOUR.test(property)) continue;
        expect(value, `${rule.selectors.join(", ")} { ${property} }`).toContain("var(--");
        expect(value).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      }
    }
  });
});
