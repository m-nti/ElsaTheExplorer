/**
 * Copy drift gate for the reset surface (#27).
 *
 * The copy deck is the source of record; the typed dictionary is the runtime.
 * This test reads the deck's own rows (§8 announcements, §9 reset) and pins the
 * dictionary to them byte for byte, so a re-voiced deck line and a missed
 * dictionary edit cannot ship as two different strings. It also enforces the
 * row's own character budget and §0.4.4 (no `!` on a destructive or announced
 * string).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DICTIONARIES, LOCALES } from "$lib/stores/dictionary";

interface DeckRow {
  readonly de: string;
  readonly en: string;
  readonly max: number;
}

const DECK = readFileSync(new URL("../../design/copy/copy-deck.md", import.meta.url), "utf8");

/** Rows of `## 8.` and `## 9.` only — §11 repeats `reset.body` as a divergence record. */
function deckRows(): Map<string, DeckRow> {
  const rows = new Map<string, DeckRow>();
  let section = "";
  for (const line of DECK.split("\n")) {
    const heading = /^## (\d+)\./.exec(line);
    if (heading !== null) {
      section = heading[1] ?? "";
      continue;
    }
    if (section !== "8" && section !== "9") continue;
    const row = /^\|\s*`([^`]+)`\s*\|/.exec(line);
    if (row === null) continue;
    const key = row[1] ?? "";
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    // | key | DE | EN | max | note | source | — a repeated key keeps its first row.
    if (rows.has(key)) continue;
    rows.set(key, { de: cells[1] ?? "", en: cells[2] ?? "", max: Number(cells[3]) });
  }
  return rows;
}

const RESET_KEYS = [
  "reset.trigger",
  "reset.title",
  "reset.body",
  "reset.confirm",
  "reset.cancel",
  "reset.unavailable",
  "live.reset.done",
] as const;

describe("reset copy", () => {
  it("reads the deck rows it claims to pin", () => {
    const rows = deckRows();
    for (const key of RESET_KEYS) expect(rows.get(key), `${key} missing from the deck`).toBeDefined();
  });

  it("matches the deck's rows byte for byte in both languages", () => {
    const rows = deckRows();
    for (const key of RESET_KEYS) {
      const row = rows.get(key);
      if (row === undefined) continue;
      expect(DICTIONARIES.de[key], `${key} DE`).toBe(row.de);
      expect(DICTIONARIES.en[key], `${key} EN`).toBe(row.en);
    }
  });

  it("keeps every reset string inside its deck budget", () => {
    const rows = deckRows();
    for (const key of RESET_KEYS) {
      const row = rows.get(key);
      if (row === undefined) continue;
      expect(row.de.length, `${key} DE budget`).toBeLessThanOrEqual(row.max);
      expect(row.en.length, `${key} EN budget`).toBeLessThanOrEqual(row.max);
    }
  });

  it("carries no exclamation mark on a destructive or announced string", () => {
    for (const locale of LOCALES) {
      for (const key of RESET_KEYS) {
        expect(DICTIONARIES[locale][key], `${key} ${locale}`).not.toContain("!");
      }
    }
  });

  it("registers the same keys in every locale", () => {
    const [first, ...rest] = LOCALES.map((locale) => Object.keys(DICTIONARIES[locale]).sort());
    for (const keys of rest) expect(keys).toEqual(first);
  });
});
