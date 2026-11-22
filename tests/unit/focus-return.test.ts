import { describe, expect, it } from "vitest";
import { selectFocusTarget } from "$lib/a11y/focus";
import { FocusReturnStore } from "$lib/a11y/focus.svelte";

const usable = (value: string) => value !== "disabled" && value !== "gone";

describe("selectFocusTarget", () => {
  it("prefers the opener", () => {
    expect(selectFocusTarget(["tile", "cta", "stage"], usable)).toBe("tile");
  });

  it("skips an unusable opener and falls to the CTA", () => {
    expect(selectFocusTarget(["disabled", "cta", "stage"], usable)).toBe("cta");
  });

  it("falls to the stage when the CTA cannot take focus", () => {
    expect(selectFocusTarget([null, "disabled", "stage"], usable)).toBe("stage");
  });

  it("returns null rather than inventing a target", () => {
    expect(selectFocusTarget([undefined, null], usable)).toBeNull();
  });
});

describe("FocusReturnStore", () => {
  it("captures one opener per surface and forgets it on demand", () => {
    const store = new FocusReturnStore();
    const tile = { id: "tile-1" } as unknown as HTMLElement;
    store.capture("card", tile);
    expect(store.peek("card")).toBe(tile);
    store.forget("card");
    expect(store.peek("card")).toBeUndefined();
  });

  it("treats a null opener as the deep-link case, clearing a stale opener", () => {
    const store = new FocusReturnStore();
    store.capture("card", { id: "stale" } as unknown as HTMLElement);
    store.capture("card", null);
    expect(store.peek("card")).toBeUndefined();
  });

  it("keeps surfaces independent", () => {
    const store = new FocusReturnStore();
    const opener = { id: "a" } as unknown as HTMLElement;
    store.capture("pack", opener);
    store.capture("card", null);
    expect(store.peek("pack")).toBe(opener);
    expect(store.peek("card")).toBeUndefined();
  });
});
