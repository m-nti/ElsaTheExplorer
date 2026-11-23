/**
 * The plate's two-row structure (#13, T5).
 *
 * Authority: `design/art/art-bible.md` §8 ("Zone proportions — the overflow
 * law", D12a) and `design/ux/card-detail.md` §5.3: **row 1 is the name, one line
 * with ellipsis; row 2 is the number, the mood (one line, ellipsis) and the
 * rarity chip.** The D12a ruling is what makes row 2 affordable at 15.5 %: the
 * mood no longer costs a band, it costs a line.
 *
 * The domain function is pure so the structure is provable at both sides of the
 * 40-character budget without a manifest loader (there is none until B3). The
 * ellipsis itself is CSS — `plateRows` never truncates, because truncating in
 * JavaScript would make the name's accessible text differ from the printed one.
 */
import { describe, expect, it } from "vitest";
import { plateRows } from "$lib/domain/card-plate";
import { cssRules, markupOf, readCardFace, styleOf } from "./support/cardface-source";

/** The copy-deck budget for a card name. */
const NAME_BUDGET = 40;

/** Exactly at the budget. */
const NAME_AT_BUDGET = "Blickkontakt-Expertin-der-Ersten-Auflage";

/** One over the budget (U-CV-03): the clamp must not hide the name. */
const NAME_OVER_BUDGET = "Schlafplatz-Expertin-des-Hausarchivs-Zwei";

const model = (name: string) => ({
  name,
  number: "No. 01",
  mood: "Aufmerksam",
  rarityLabel: "Holo-Pracht",
});

describe("card plate rows (#13, T5)", () => {
  it("puts the name in row 1 and number, mood and chip in row 2", () => {
    const rows = plateRows(model(NAME_AT_BUDGET));

    expect(rows.name).toBe(NAME_AT_BUDGET);
    expect(rows.meta).toEqual(["No. 01", "Aufmerksam", "Holo-Pracht"]);
  });

  it("keeps a 40-character name on one row", () => {
    expect(NAME_AT_BUDGET).toHaveLength(NAME_BUDGET);

    const rows = plateRows(model(NAME_AT_BUDGET));

    expect(rows.name).toBe(NAME_AT_BUDGET);
    expect(rows.name).not.toContain("\n");
    expect(rows.meta).toHaveLength(3);
    for (const value of rows.meta) expect(value).not.toContain("\n");
  });

  it("keeps a 41-character name on one row — one over the budget", () => {
    expect(NAME_OVER_BUDGET).toHaveLength(NAME_BUDGET + 1);

    const rows = plateRows(model(NAME_OVER_BUDGET));

    // Not truncated here: the one-line clamp is `text-overflow: ellipsis`.
    expect(rows.name).toBe(NAME_OVER_BUDGET);
    expect(rows.name).not.toContain("\n");
    expect(rows.meta).toHaveLength(3);
    for (const value of rows.meta) expect(value).not.toContain("\n");
  });
});

describe("CardFace plate and photo band (#13, T5)", () => {
  const source = readCardFace();
  const rules = cssRules(styleOf(source));
  const ruleFor = (selector: string) => rules.find((rule) => rule.selectors.includes(selector));
  const valueOf = (selector: string, property: string) =>
    ruleFor(selector)?.declarations.find((declaration) => declaration.property === property)?.value;

  it("renders the two rows in name-then-metadata order", () => {
    const markup = markupOf(source);
    const nameAt = markup.indexOf('class="name"');
    const metaAt = markup.indexOf('class="plate-meta"');

    expect(nameAt).toBeGreaterThan(-1);
    expect(metaAt).toBeGreaterThan(nameAt);
    expect(source).toContain("plateRows(model)");
    expect(valueOf(".header", "grid-template-rows")).toBeDefined();
  });

  it("fills the zone-photo band with no block padding", () => {
    // The band's height is the plate grid's `zone-photo` row — one token, one
    // declaration; repeating it on the band would be a second source.
    expect(valueOf(".plate", "grid-template-rows")).toContain("var(--elsa-sizes-zone-photo)");

    const band = ruleFor(".photo-zone");
    expect(band).toBeDefined();
    const properties = band?.declarations.map((declaration) => declaration.property) ?? [];
    expect(properties).not.toContain("padding");
    expect(properties).not.toContain("padding-block");
    expect(properties).not.toContain("padding-top");
    expect(properties).not.toContain("padding-bottom");
  });

  it("distributes the 4.5% gutters bay as the five row gaps", () => {
    // art-bible §8: the seven bays sum to 100, so the six content rows sum to
    // 95.5 % and the remaining 4.5 % is the gap between them (0.9 % each).
    expect(valueOf(".plate", "row-gap")).toBe("calc(var(--elsa-sizes-zone-gutters) / 5)");
  });

  it("gives the window the 4:5 token ratio and the focus anchor", () => {
    expect(valueOf(".window", "aspect-ratio")).toBe("var(--elsa-aspect-ratios-window)");
    expect(source).toContain("focusToObjectPosition(model.photo.focus)");
  });
});
