import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tokens } from "@tokens";

/**
 * Bible ↔ tokens parity for the card-bay zone table (#30, art-bible §8).
 *
 * Scope: the seven `sizes.zone-*` bays only. Colour parity (palette rows vs
 * the §4 bible values) is a follow-up ticket — it is not covered here.
 *
 * The §8 table is parsed by its header row. If the table moves, is renamed,
 * gains or loses a column, or a row label is not mapped, the parser throws
 * instead of silently comparing nothing.
 */

const BIBLE_PATH = fileURLToPath(new URL("../../design/art/art-bible.md", import.meta.url));

const HEADER_CELLS = ["Zone", "Full card", "Drop card", "Binder tile"] as const;

/** §8 row label prefix → the token that mirrors that bay. */
const ROW_TOKENS: ReadonlyArray<readonly [label: string, token: string]> = [
  ["Plate", "zone-header"],
  ["Photo window", "zone-photo"],
  ["Strip", "zone-strip"],
  ["Story", "zone-story"],
  ["Stats", "zone-stats"],
  ["Foot", "zone-foot"],
  ["Gutters", "zone-gutters"],
];

const EXPECTED_TOKENS = ROW_TOKENS.map(([, token]) => token).sort();

/** Percentages are compared in tenths so that column sums are exact integers. */
const SCALE = 10;
const FULL_SUM = 100 * SCALE;

type Column = "full" | "drop" | "tile";
type Bay = Record<Column, number>;
type ZoneTable = Record<string, Bay>;

const splitRow = (line: string): string[] =>
  line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

const isHeader = (line: string): boolean => {
  const cells = splitRow(line);
  return HEADER_CELLS.every((head, i) => cells[i] === head);
};

const parsePercent = (cell: string, where: string): number => {
  const [, digits] = /^\*{0,2}(\d+(?:\.\d+)?)%/.exec(cell) ?? [];
  if (digits === undefined) {
    throw new Error(`art-bible §8 zone table: ${where} is not a percentage: "${cell}"`);
  }
  return Number(digits);
};

/** Parses the §8 zone table out of the bible markdown. Throws on any structural drift. */
export const parseZoneTable = (markdown: string): ZoneTable => {
  const lines = markdown.split("\n");
  const headerRows = lines.flatMap((line, i) => (isHeader(line) ? [i] : []));
  if (headerRows.length !== 1) {
    throw new Error(
      `art-bible §8: expected exactly one zone table with header ` +
        `"| Zone | Full card | Drop card | Binder tile | Clamp rules |", found ${headerRows.length}. ` +
        `The table moved or changed — update parseZoneTable before trusting this gate.`,
    );
  }

  const [headerAt = 0] = headerRows;
  const rowLines: string[] = [];
  for (const line of lines.slice(headerAt + 2)) {
    // skip the `| --- |` separator (headerAt + 1); rows are the contiguous `|` lines after it
    if (!line.startsWith("|")) break;
    rowLines.push(line);
  }

  const table: ZoneTable = {};
  for (const line of rowLines) {
    const cells = splitRow(line);
    if (cells.length < 4) {
      throw new Error(`art-bible §8 zone table: row has ${cells.length} cells, expected ≥ 4: "${line}"`);
    }
    const [labelCell = "", fullCell = "", dropCell = "", tileCell = ""] = cells;
    const label = labelCell.replace(/\*/g, "").trim();
    const hit = ROW_TOKENS.find(([prefix]) => label.startsWith(prefix));
    if (!hit) {
      throw new Error(`art-bible §8 zone table: unmapped row "${labelCell}" — add it to ROW_TOKENS`);
    }
    const [, token] = hit;
    if (token in table) {
      throw new Error(`art-bible §8 zone table: duplicate row for ${token}`);
    }
    table[token] = {
      full: parsePercent(fullCell, `${token} / Full card`),
      drop: parsePercent(dropCell, `${token} / Drop card`),
      tile: parsePercent(tileCell, `${token} / Binder tile`),
    };
  }

  const missing = EXPECTED_TOKENS.filter((token) => !(token in table));
  if (missing.length > 0) {
    throw new Error(`art-bible §8 zone table: missing rows for ${missing.join(", ")}`);
  }
  return table;
};

/** Bay lookup that fails loudly on an unknown token rather than returning undefined. */
const bayOf = (table: ZoneTable, token: string): Bay => {
  const bay = table[token];
  if (bay === undefined) throw new Error(`art-bible §8 zone table has no bay for ${token}`);
  return bay;
};

/** Strict token read: the token must be exactly `N%` or `N.N%`. */
const tokenPercent = (token: string): number => {
  const raw: unknown = (tokens.sizes as Record<string, { value: unknown } | undefined>)[token]?.value;
  const [, digits] = typeof raw === "string" ? (/^(\d+(?:\.\d+)?)%$/.exec(raw) ?? []) : [];
  if (digits === undefined) {
    throw new Error(`tokens.sizes["${token}"] is not a plain percentage: ${JSON.stringify(raw)}`);
  }
  return Number(digits);
};

const columnSum = (table: ZoneTable, column: Column): number =>
  Object.values(table).reduce((sum, bay) => sum + Math.round(bay[column] * SCALE), 0);

const bible = parseZoneTable(readFileSync(BIBLE_PATH, "utf8"));

describe("art-bible §8 ↔ tokens zone parity (#30)", () => {
  it("parses all seven §8 bays from the zone table", () => {
    expect(Object.keys(bible).sort()).toEqual(EXPECTED_TOKENS);
  });

  it("tokens define exactly the seven §8 bays — no extras, none missing", () => {
    const zoneTokens = Object.keys(tokens.sizes)
      .filter((key) => key.startsWith("zone-"))
      .sort();
    expect(zoneTokens).toEqual(EXPECTED_TOKENS);
  });

  it.each(EXPECTED_TOKENS)("%s equals the §8 full-card value", (token) => {
    expect(tokenPercent(token)).toBe(bayOf(bible, token).full);
  });

  for (const column of ["full", "drop", "tile"] as const) {
    it(`the §8 ${column} column sums to exactly 100`, () => {
      expect(columnSum(bible, column)).toBe(FULL_SUM);
    });
  }

  it("the token bays sum to exactly 100%", () => {
    const sum = EXPECTED_TOKENS.reduce((acc, token) => acc + Math.round(tokenPercent(token) * SCALE), 0);
    expect(sum).toBe(FULL_SUM);
  });

  it("the drop card is the full column (§8: the 17/36 split was drift)", () => {
    for (const token of EXPECTED_TOKENS) {
      expect(bayOf(bible, token).drop).toBe(bayOf(bible, token).full);
    }
  });

  it("Binder tile column carries its own photo band (44%) and differs from full", () => {
    const photo = bayOf(bible, "zone-photo");
    expect(photo.tile).toBe(44);
    expect(photo.tile).not.toBe(photo.full);
  });
});

describe("zone-table parser fails loudly on drift", () => {
  const header = "| Zone | Full card | Drop card | Binder tile | Clamp rules |";
  const separator = "| --- | --- | --- | --- | --- |";
  const rows = [
    "| Plate (name) | **15.5%** | 15.5% | 15.5% | x |",
    "| Photo window | **41.5%** | 41.5% | 44% | x |",
    "| Strip (edition) | **5.5%** (min 24px) | 5.5% | 5.5% | x |",
    "| Story / copy | **19.5%** | 19.5% | 16% | x |",
    "| Stats (label) | **8.5%** | 8.5% | 9% | x |",
    "| Foot (serial) | **5.0%** (min 22px) | 5.0% | 5.5% | x |",
    "| Gutters | **4.5%** | 4.5% | 4.5% | x |",
  ];
  const doc = (...lines: string[]) => lines.join("\n");

  it("parses a well-formed table", () => {
    const table = parseZoneTable(doc("intro", header, separator, ...rows, "outro"));
    expect(bayOf(table, "zone-photo")).toEqual({ full: 41.5, drop: 41.5, tile: 44 });
    expect(Object.keys(table)).toHaveLength(7);
  });

  it("throws when the header is renamed or its columns move", () => {
    const moved = "| Zone | Drop card | Full card | Binder tile | Clamp rules |";
    expect(() => parseZoneTable(doc(moved, separator, ...rows))).toThrow(/expected exactly one zone table/);
  });

  it("throws when the table is absent", () => {
    expect(() => parseZoneTable("# no table here")).toThrow(/found 0/);
  });

  it("throws when two zone tables exist", () => {
    expect(() => parseZoneTable(doc(header, separator, ...rows, "", header, separator, ...rows))).toThrow(
      /found 2/,
    );
  });

  it("throws on an unmapped row label", () => {
    const bad = rows.map((r) => r.replace("Gutters", "Gap"));
    expect(() => parseZoneTable(doc(header, separator, ...bad))).toThrow(/unmapped row/);
  });

  it("throws when a bay is missing", () => {
    expect(() => parseZoneTable(doc(header, separator, ...rows.slice(1)))).toThrow(/missing rows for zone-header/);
  });

  it("throws on a non-percentage cell", () => {
    const bad = rows.map((r) => r.replace("**41.5%**", "forty"));
    expect(() => parseZoneTable(doc(header, separator, ...bad))).toThrow(/not a percentage/);
  });
});
