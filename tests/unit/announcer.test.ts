/**
 * Announcer gate (#27, ADR-0010 §2).
 *
 * The reset's only feedback is one polite line. Two properties make it audible:
 * a repeated identical string is blanked then rewritten (screen readers announce
 * a *change*), and no `!` reaches the region (§0.4.4 / D26). The store resolves
 * its region, so the node project can assert both without a DOM.
 */
import { describe, expect, it } from "vitest";
import { AnnouncerStore } from "$lib/a11y/announcer.svelte";

class FakeRegion {
  #text: string | null = "";
  writes = 0;

  get textContent(): string {
    return this.#text ?? "";
  }

  set textContent(value: string | null) {
    this.#text = value;
    this.writes += 1;
  }
}

describe("AnnouncerStore.say", () => {
  it("writes the message into the polite region", () => {
    const region = new FakeRegion();
    new AnnouncerStore(() => region).say("Von vorn. Alle Karten können wieder kommen.");

    expect(region.textContent).toBe("Von vorn. Alle Karten können wieder kommen.");
    expect(region.writes).toBe(1);
  });

  it("blanks and rewrites an identical message so it is announced twice", () => {
    const region = new FakeRegion();
    const announcer = new AnnouncerStore(() => region);

    announcer.say("Von vorn.");
    announcer.say("Von vorn.");

    expect(region.textContent).toBe("Von vorn.");
    expect(region.writes).toBe(3);
  });

  it("replaces a different message in one write", () => {
    const region = new FakeRegion();
    const announcer = new AnnouncerStore(() => region);

    announcer.say("Eins.");
    announcer.say("Zwei.");

    expect(region.textContent).toBe("Zwei.");
    expect(region.writes).toBe(2);
  });

  it("never lets an exclamation mark reach the region", () => {
    const region = new FakeRegion();
    new AnnouncerStore(() => region).say("Von vorn!");

    expect(region.textContent).toBe("Von vorn.");
  });

  it("is a no-op when the region is absent", () => {
    const announcer = new AnnouncerStore(() => null);
    expect(() => announcer.say("Von vorn.")).not.toThrow();
  });
});
