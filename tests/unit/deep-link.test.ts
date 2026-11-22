import { describe, expect, it } from "vitest";
import { readPhotoParam, resolveDeepLink, withPhotoParam } from "$lib/a11y/deep-link";

const cards = [{ id: "a" }, { id: "b" }] as const;

describe("readPhotoParam", () => {
  it("reads the photo id", () => {
    expect(readPhotoParam("?photo=b")).toBe("b");
  });

  it("returns null for a missing or blank id", () => {
    expect(readPhotoParam("")).toBeNull();
    expect(readPhotoParam("?photo=")).toBeNull();
    expect(readPhotoParam("?photo=%20%20")).toBeNull();
  });
});

describe("withPhotoParam", () => {
  it("preserves unrelated params", () => {
    expect(withPhotoParam("?lang=en", "b")).toBe("?lang=en&photo=b");
  });

  it("removes the param without leaving a stray question mark", () => {
    expect(withPhotoParam("?photo=b", null)).toBe("");
    expect(withPhotoParam("?lang=en&photo=b", null)).toBe("?lang=en");
  });
});

describe("resolveDeepLink", () => {
  it("returns the card for a known id", () => {
    expect(resolveDeepLink("b", cards)).toEqual({ id: "b" });
  });

  it("returns null for an unknown id so no dialog opens", () => {
    expect(resolveDeepLink("missing", cards)).toBeNull();
    expect(resolveDeepLink(null, cards)).toBeNull();
  });
});
