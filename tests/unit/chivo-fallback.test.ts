/**
 * #81 — the Chivo fallback contract.
 *
 * `font-display: swap` is the art-bible rule, so body text changes face after
 * first paint. `Ultra Fallback` (#26) fixed the wordmark; this face fixes the
 * last 0.000565: the tagline and eyebrow moved 1 px because the interim face was
 * whatever the OS supplied (`system-ui` -> Segoe UI on Windows, whose line box is
 * 133 / 100 px against Chivo's 119).
 *
 * The gate pins four things a later edit can quietly undo:
 *
 * 1. The face downloads nothing — an interim face that fetches bytes is a second
 *    font request for text that is about to be replaced.
 * 2. It sits immediately after `"Chivo"` — behind `system-ui` it is never reached,
 *    and the descriptor test would still pass while the swap still moved.
 * 3. The overrides are derived, not typed twice: metric overrides are relative to
 *    the adjusted em, so `ascent-override * size-adjust` must still be Chivo's
 *    hhea ascent. Editing one without the other is the bug this test exists for.
 * 4. `swap` and the two font URLs are unchanged — the policy and the bytes are
 *    out of scope for this ticket.
 */
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "../../panda.config";
import { tokens } from "../../design/tokens/tokens";

const faces = config.globalFontface as unknown as Record<string, Record<string, string>>;
const fallback = faces["Chivo Fallback"];
const body = tokens.fonts.body.value as string;

/** Chivo's hhea, read from `public/fonts/chivo-latin.woff2`: 940 / -250, upem 1000, lineGap 0. */
const CHIVO_ASCENT = 94;
const CHIVO_DESCENT = 25;

describe("Chivo fallback (#81)", () => {
  it("declares a fallback face that downloads nothing", () => {
    expect(fallback).toBeDefined();
    expect(fallback?.src.startsWith("local(")).toBe(true);
    expect(fallback?.src).not.toContain("url(");
    expect(fallback?.fontDisplay).toBe("swap");
    expect(fallback?.fontWeight).toBe("400 700");
  });

  it("puts the fallback immediately after Chivo in the body stack", () => {
    const [first, second] = body.split(",").map((family) => family.trim());
    expect(first).toBe('"Chivo"');
    expect(second).toBe('"Chivo Fallback"');
  });

  it("derives the overrides from Chivo's hhea and the measured advance ratio", () => {
    const sizeAdjust = Number.parseFloat(fallback?.sizeAdjust ?? "");
    expect(sizeAdjust).toBeGreaterThan(100);
    expect((Number.parseFloat(fallback?.ascentOverride ?? "") * sizeAdjust) / 100).toBeCloseTo(CHIVO_ASCENT, 1);
    expect((Number.parseFloat(fallback?.descentOverride ?? "") * sizeAdjust) / 100).toBeCloseTo(CHIVO_DESCENT, 1);
    expect(fallback?.lineGapOverride).toBe("0%");
  });

  it("keeps swap on Chivo and Ultra, and their bytes where they were", () => {
    expect(faces.Chivo?.fontDisplay).toBe("swap");
    expect(faces.Ultra?.fontDisplay).toBe("swap");
    expect(faces.Chivo?.src).toContain("/fonts/chivo-latin.woff2");
    expect(faces.Ultra?.src).toContain("/fonts/ultra-latin.woff2");
    expect(statSync(new URL("../../public/fonts/chivo-latin.woff2", import.meta.url)).size).toBeLessThanOrEqual(30_000);
  });
});
