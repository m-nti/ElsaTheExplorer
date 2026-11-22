import { describe, expect, it } from "vitest";
import {
  assertContrastPairs,
  composite,
  ContrastGateError,
  contrastRatio,
  evaluateContrastPairs,
  InvalidColorError,
  meetsMinimum,
  parseColor,
  type ContrastPair,
} from "$lib/domain/contrast";
import { contrastExemptions, contrastPairs, palette } from "@tokens";

/** The shipped v1 token. It measured 3.86:1 on `--bg`; it must never pass. */
const LEGACY_QUIET = "#756e7d";

const legacyQuietPairs: readonly ContrastPair[] = [
  { id: "legacy-quiet-on-bg", fg: LEGACY_QUIET, bg: palette.bg, minimum: 4.5, role: "text" },
  {
    id: "legacy-quiet-on-bg-raised",
    fg: LEGACY_QUIET,
    bg: palette.bgRaised,
    minimum: 4.5,
    role: "text",
  },
  {
    id: "legacy-quiet-on-surface",
    fg: LEGACY_QUIET,
    bg: palette.surface,
    minimum: 4.5,
    role: "text",
  },
  {
    id: "legacy-quiet-on-surface-light",
    fg: LEGACY_QUIET,
    bg: palette.surfaceLight,
    minimum: 4.5,
    role: "text",
  },
];

function catchGateError(pairs: readonly ContrastPair[]): ContrastGateError {
  try {
    assertContrastPairs(pairs);
  } catch (error) {
    if (error instanceof ContrastGateError) return error;
    throw error;
  }
  throw new Error("Expected the contrast gate to reject these pairs");
}

describe("WCAG 2.2 contrast maths", () => {
  it("matches the published black-on-white reference pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
  });

  it("measures the shipped legacy --quiet exactly as the baseline recorded it", () => {
    expect(contrastRatio(LEGACY_QUIET, palette.bg)).toBeCloseTo(3.86, 2);
    expect(contrastRatio(LEGACY_QUIET, palette.bgRaised)).toBeCloseTo(3.56, 2);
    expect(contrastRatio(LEGACY_QUIET, palette.surface)).toBeCloseTo(3.36, 2);
  });

  it("composites a translucent foreground before measuring", () => {
    const ink = parseColor("rgb(245 240 234 / 28%)");
    const bg = parseColor(palette.bg);
    const flattened = composite(ink, bg);

    expect(flattened.a).toBe(1);
    expect(flattened.r).toBeGreaterThan(bg.r);
    expect(flattened.r).toBeLessThan(ink.r);
    expect(contrastRatio("rgb(245 240 234 / 28%)", palette.bg)).toBeLessThan(
      contrastRatio(palette.ink, palette.bg),
    );
  });

  it("rejects malformed colours instead of guessing", () => {
    expect(() => contrastRatio("not-a-colour", palette.bg)).toThrow(InvalidColorError);
    expect(() => contrastRatio("#fff", "rgb(0 0 0 / 50%)")).toThrow(InvalidColorError);
  });
});

describe("the gate rejects the legacy --quiet token (negative test)", () => {
  it("fails every structural surface and names token, pair, ratio and threshold", () => {
    const error = catchGateError(legacyQuietPairs);

    expect(error.failures).toHaveLength(4);
    expect(error.failures.map((failure) => failure.id)).toEqual([
      "legacy-quiet-on-bg",
      "legacy-quiet-on-bg-raised",
      "legacy-quiet-on-surface",
      "legacy-quiet-on-surface-light",
    ]);

    const first = error.failures[0];
    expect(first?.ratio).toBeCloseTo(3.86, 2);
    expect(first?.minimum).toBe(4.5);
    expect(error.message).toContain("legacy-quiet-on-bg");
    expect(error.message).toContain(LEGACY_QUIET);
    expect(error.message).toContain(palette.bg);
    expect(error.message).toContain("3.86:1");
    expect(error.message).toContain("4.50:1");
  });

  it("also rejects the legacy value when injected into the production pair set", () => {
    const injected = contrastPairs.map((pair) =>
      pair.id.startsWith("quiet-on-") ? { ...pair, fg: LEGACY_QUIET } : pair,
    );

    const failures = evaluateContrastPairs(injected);
    expect(failures.length).toBeGreaterThanOrEqual(4);
    expect(failures.every((failure) => failure.fg === LEGACY_QUIET)).toBe(true);
    expect(() => assertContrastPairs(injected)).toThrow(ContrastGateError);
  });

  it("fails at 4.49:1 and passes at exactly 4.50:1 (threshold boundary)", () => {
    expect(meetsMinimum(4.49, 4.5)).toBe(false);
    expect(meetsMinimum(4.5, 4.5)).toBe(true);
    expect(meetsMinimum(4.51, 4.5)).toBe(true);
  });
});

describe("the production token set", () => {
  it("passes the gate with the raised --quiet value", () => {
    expect(() => assertContrastPairs(contrastPairs)).not.toThrow();
    expect(contrastPairs.length).toBeGreaterThan(30);
  });

  it("measures the raised --quiet at or above 4.5:1 on every structural surface", () => {
    for (const pair of contrastPairs.filter((candidate) => candidate.id.startsWith("quiet-on-"))) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(ratio, pair.id).toBeGreaterThanOrEqual(4.5);
    }

    expect(contrastRatio(palette.quiet, palette.bg)).toBeCloseTo(6.08, 2);
    expect(contrastRatio(palette.quiet, palette.surfaceLight)).toBeCloseTo(4.66, 2);
  });

  it("declares no exemptions at gate start, and every declared exemption is justified", () => {
    expect(contrastExemptions).toHaveLength(0);
    for (const exemption of contrastExemptions) {
      expect(exemption.clause.trim()).not.toBe("");
      expect(exemption.reason.trim()).not.toBe("");
    }
  });
});
