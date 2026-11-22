/**
 * Reset orchestration gate (#27, ADR-0003 §5).
 *
 * `performReset` is the one order that counts: wipe, then clear the in-memory
 * stores, then return preferences to their defaults, then announce — in German,
 * because preferences have just gone back to German. The ports keep the order
 * assertable without importing a rune store.
 */
import { describe, expect, it } from "vitest";
import { performReset, type ResetPorts } from "$lib/stores/reset";

const LIVE_RESET = "Von vorn. Alle Karten können wieder kommen.";

function recordingPorts(clearedKeys = 3) {
  const calls: string[] = [];
  const announced: string[] = [];
  const ports: ResetPorts = {
    wipe: () => {
      calls.push("wipe");
      return clearedKeys;
    },
    resetCollection: () => {
      calls.push("resetCollection");
    },
    resetPreferences: () => {
      calls.push("resetPreferences");
    },
    translate: (key) => {
      calls.push(`translate:${key}`);
      return LIVE_RESET;
    },
    announce: (message) => {
      calls.push("announce");
      announced.push(message);
    },
  };
  return { ports, calls, announced };
}

describe("performReset", () => {
  it("wipes, resets the stores, returns the defaults, then announces", () => {
    const { ports, calls } = recordingPorts();

    performReset(ports);

    expect(calls).toEqual([
      "wipe",
      "resetCollection",
      "resetPreferences",
      "translate:live.reset.done",
      "announce",
    ]);
  });

  it("resets collection and preferences even when nothing was stored", () => {
    const { ports, calls } = recordingPorts(0);

    expect(performReset(ports).clearedKeys).toBe(0);
    expect(calls).toContain("resetCollection");
    expect(calls).toContain("resetPreferences");
  });

  it("announces the deck line exactly once", () => {
    const { ports, announced } = recordingPorts();

    expect(performReset(ports).announcement).toBe(LIVE_RESET);
    expect(announced).toEqual([LIVE_RESET]);
  });

  it("reports how many keys were cleared", () => {
    const { ports } = recordingPorts(7);
    expect(performReset(ports).clearedKeys).toBe(7);
  });
});
