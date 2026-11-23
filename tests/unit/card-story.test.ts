/**
 * Band 4's D70 two-row plan (#70).
 *
 * Authority: the #70 ruling landed in PR #94 — `design/art/art-bible.md` §8
 * "D70 — the story clamp: three lines, two rows", mirrored in
 * `design/ux/card-detail.md` §5.3. The ruling keeps the band (19.5 %) and the
 * three-line clamp and removes the row that did not pay for itself:
 *
 *   row 1: the sentence, ≤ 3 lines (ellipsis past the third)
 *   row 2: the Fantasiewerte line, 1 line — band 4's last row, directly above
 *          band 5's chips, so the disclaimer still precedes the values in
 *          reading order and in the accessible name (F2a)
 *
 * The keyword row is retired from the card face: the card's name is the
 * heading, and a keyword sharing the label row measured 313.4 px against a
 * 308 px measure. This spec pins the shipped plan and the arithmetic that
 * pays for it, so a later CSS edit cannot quietly restore the third row.
 */
import { describe, expect, it } from "vitest";
import { emOf, tokenValue } from "./support/card-tokens";
import { CARD_ZONES } from "$lib/domain/card-zones";
import { cssRules, markupOf, readCardFace, styleOf } from "./support/cardface-source";

const source = readCardFace();
const markup = markupOf(source);
const rules = cssRules(styleOf(source));

const declarationsOf = (selector: string, property: string): string[] =>
  rules
    .filter((rule) => rule.selectors.includes(selector))
    .flatMap((rule) =>
      rule.declarations.filter((entry) => entry.property === property).map((entry) => entry.value),
    );

describe("band 4 is two rows (#70, D70)", () => {
  it("drops the keyword row from the card face", () => {
    // The per-card keyword was a second heading. `card.moment.label` still
    // names the panel in the docs; it does not print on the plate.
    expect(markup).not.toContain('class="keyword"');
    expect(markup).not.toContain("model.keyword");
    expect(rules.some((rule) => rule.selectors.includes(".keyword"))).toBe(false);
  });

  it("lays the story band out as sentence then label", () => {
    expect(declarationsOf(".story", "grid-template-rows")).toEqual(["minmax(0, 1fr) auto"]);

    const copyAt = markup.indexOf('class="copy"');
    const labelAt = markup.indexOf('class="print-line"');
    const statsAt = markup.indexOf('class="zone stats"');

    expect(copyAt).toBeGreaterThan(-1);
    expect(labelAt).toBeGreaterThan(copyAt);
    // F2a: the Fantasiewerte line precedes the values it disclaims.
    expect(statsAt).toBeGreaterThan(labelAt);
  });

  it("clamps the sentence at three lines, in both spellings", () => {
    expect(declarationsOf(".copy", "line-clamp")).toEqual(["3"]);
    expect(declarationsOf(".copy", "-webkit-line-clamp")).toEqual(["3"]);
  });

  it("keeps the label to one line with an ellipsis", () => {
    expect(declarationsOf(".print-line", "white-space")).toEqual(["nowrap"]);
    expect(declarationsOf(".print-line", "text-overflow")).toEqual(["ellipsis"]);
  });
});

describe("the band pays for three lines (#70 arithmetic)", () => {
  /**
   * The ruling's own sum, recomputed from the shipped tokens at the 340 px
   * reference: 16 padding + 4 gap + 3 × 17.55 copy + 14.85 label = 87.50 px
   * against a 91.59 px band. If any of those five values drifts the plan no
   * longer fits and this test — not a screenshot — says so first.
   */
  it("fits 3 copy lines and the label inside 19.5 % of the plate", () => {
    const lineHeight = Number(tokenValue("--elsa-line-heights-card"));
    const pad = emOf("--elsa-card-space-2");
    const gap = emOf("--elsa-card-space-1");
    const copyLine = emOf("--elsa-card-text-md") * lineHeight;
    const labelLine = emOf("--elsa-card-text-sm") * lineHeight;

    const plateInner = 340 / 0.7 - 2 * pad;
    const band = plateInner * (CARD_ZONES.story / 100);
    const need = 2 * pad + gap + 3 * copyLine + labelLine;

    expect(plateInner).toBeCloseTo(469.71, 1);
    expect(band).toBeCloseTo(91.59, 1);
    // The ruling's figure, reproduced from the tokens: 87.50 px.
    expect(need).toBeCloseTo(87.5, 1);
    expect(need).toBeLessThanOrEqual(band);
    // The 4.09 px of slack the ruling bought by dropping the keyword row.
    expect(band - need).toBeCloseTo(4.09, 1);
  });

  it("cannot fit a fourth line in the same band", () => {
    const lineHeight = Number(tokenValue("--elsa-line-heights-card"));
    const pad = emOf("--elsa-card-space-2");
    const gap = emOf("--elsa-card-space-1");
    const copyLine = emOf("--elsa-card-text-md") * lineHeight;
    const labelLine = emOf("--elsa-card-text-sm") * lineHeight;

    const plateInner = 340 / 0.7 - 2 * pad;
    const band = plateInner * (CARD_ZONES.story / 100);
    const fourLines = 2 * pad + gap + 4 * copyLine + labelLine;

    // 104.99 px vs 91.59 px: the clamp is 3 because 4 does not fit, and the
    // ruling rejected widening the band rather than raising the clamp.
    expect(fourLines).toBeGreaterThan(band);
  });
});
