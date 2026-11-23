import { describe, expect, it } from "vitest";
import { DEFAULT_FOCUS, focusToObjectPosition } from "$lib/domain/card-photo";

describe("photo focus anchor (#13, T4)", () => {
  it("defaults to the archive's reading line", () => {
    expect(DEFAULT_FOCUS).toEqual({ x: 0.5, y: 0.42 });
    expect(focusToObjectPosition()).toBe("50% 42%");
  });

  it("maps a corner and clamps out-of-range values", () => {
    expect(focusToObjectPosition({ x: 0, y: 1 })).toBe("0% 100%");
    expect(focusToObjectPosition({ x: 2, y: -1 })).toBe("100% 0%");
  });

  it("falls back on a malformed point", () => {
    expect(focusToObjectPosition({ x: Number.NaN, y: 0.4 })).toBe("50% 42%");
  });
});
