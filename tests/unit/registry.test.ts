/**
 * Registry gate — `design/registry/entities.yaml` against the documents it indexes.
 *
 * The registry is the one machine-readable register of the facts that cross a
 * document boundary (D8, #7): the seven collection sets, the closed storage-key
 * register, the pack size, and the copy-key index. Two failure classes matter,
 * and this file catches both without a YAML dependency:
 *
 * 1. **Layout.** The file must stay readable by the game-studios
 *    `.claude/scripts/registry.sh` reader — the published layout, not one
 *    invented here. `parseRegistry` is the narrow reader for exactly that
 *    layout: a section at column 0 holding a block list (or `[]` while empty),
 *    entries at one dash column (0 or 2) with fields two past it, deeper lines
 *    belonging to the field above, quoted values holding `": "`, flow lists on
 *    one line, no tabs. An unsupported line fails with its line number, so a
 *    green suite and `registry.sh validate` cannot disagree.
 * 2. **Drift.** Every asserted value is read from the document that owns it:
 *    room codes from the archive fiction, keys from the copy deck, storage keys
 *    and envelope shape from ADR-0003, pack size from the pattern library and
 *    the deck. When an owner document changes, this gate names the entry to
 *    update instead of letting the registry rot into a second source of truth.
 *
 * No copy values live in the registry — the deck is SSOT, including the
 * one-exclamation rule (§0.4.4) — and no YAML library is added for it.
 */
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

/** The only value shapes the registry layout allows. */
class RegistryLayoutError extends Error {
  constructor(line: number, found: string, expected: string) {
    super(`design/registry/entities.yaml:${line}: ${found} — expected ${expected}`);
    this.name = "RegistryLayoutError";
  }
}

interface ParsedEntry {
  readonly section: string;
  readonly name: string;
  readonly line: number;
  readonly fields: ReadonlyMap<string, string>;
  readonly lists: ReadonlyMap<string, readonly string[]>;
}

interface ParsedRegistry {
  readonly meta: ReadonlyMap<string, string>;
  readonly sections: ReadonlyMap<string, readonly ParsedEntry[]>;
}

const KEY = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

/** The only registry-level scalars the layout has: everything else is a section. */
const META_KEYS = new Set(["version", "last_updated"]);

/**
 * Parse the registry layout. Deliberately narrow: it accepts what the registry
 * uses and reports everything else by line, which is the whole contract.
 */
function parseRegistry(source: string): ParsedRegistry {
  const meta = new Map<string, string>();
  const sections = new Map<string, ParsedEntry[]>();
  let section: string | null = null;
  let sectionEmpty = false;
  let dashColumn: number | null = null;
  let current: MutableEntry | null = null;
  let pendingList: { key: string; items: string[] } | null = null;

  interface MutableEntry {
    section: string;
    name: string;
    line: number;
    fields: Map<string, string>;
    lists: Map<string, string[]>;
  }

  const splitKeyValue = (text: string, line: number): { key: string; value: string } => {
    const at = text.indexOf(": ");
    const key = at === -1 ? text.replace(/:$/, "") : text.slice(0, at);
    const value = at === -1 ? "" : text.slice(at + 2).trim();
    if (at === -1 && !text.endsWith(":")) {
      throw new RegistryLayoutError(line, `"${text}" without a key`, "key: value");
    }
    if (!KEY.test(key)) {
      throw new RegistryLayoutError(line, `the key "${key}"`, "letters, digits, _ . - only");
    }
    return { key, value };
  };

  const scalar = (raw: string, line: number): string => {
    if (raw === "") return "";
    const first = raw.slice(0, 1);
    if (first === '"' || first === "'") {
      const closer = raw.slice(-1);
      if (raw.length < 2 || closer !== first) {
        throw new RegistryLayoutError(line, `an unterminated quote (${raw})`, "the closing quote on the same line");
      }
      const inner = raw.slice(1, -1);
      return first === '"' ? inner.replace(/\\"/g, '"') : inner.replace(/''/g, "'");
    }
    if (first === "[") {
      if (!raw.endsWith("]")) {
        throw new RegistryLayoutError(line, "a flow list that runs past its line", "[a, b] on one line, or a block list");
      }
      return raw;
    }
    if (first === "{" && !raw.endsWith("}")) {
      throw new RegistryLayoutError(line, "a flow map that runs past its line", "[a, b] on one line, or a block list");
    }
    if (first === "|" || first === ">") {
      throw new RegistryLayoutError(line, "a block scalar", "a quoted or plain value on one line");
    }
    const comment = raw.indexOf(" #");
    const value = (comment === -1 ? raw : raw.slice(0, comment)).trimEnd();
    if (value.includes(": ")) {
      throw new RegistryLayoutError(line, `an unquoted value holding ": " (${value})`, "the value in quotes");
    }
    return value;
  };

  const openEntry = (text: string, indent: number, line: number): void => {
    if (section === null) {
      throw new RegistryLayoutError(line, "a list item outside a section", "a section key at column 0 above it");
    }
    if (sectionEmpty) {
      throw new RegistryLayoutError(line, `a list item under ${section}: []`, `nothing after ${section}: when it has entries`);
    }
    if (dashColumn === null) {
      if (indent !== 0 && indent !== 2) {
        throw new RegistryLayoutError(line, `a list item at column ${indent}`, "column 0 or 2");
      }
      dashColumn = indent;
    } else if (indent !== dashColumn) {
      throw new RegistryLayoutError(line, `a list item at column ${indent}`, `column ${dashColumn}, like the first entry of ${section}`);
    }
    const rest = text === "-" ? "" : text.slice(2);
    const { key, value } = splitKeyValue(rest, line);
    if (key !== "name") {
      throw new RegistryLayoutError(line, `an entry that starts with ${key}:`, "name: as the first line of each entry");
    }
    const name = scalar(value, line);
    if (name === "") {
      throw new RegistryLayoutError(line, "an entry with an empty name", "- name: <value>");
    }
    current = { section, name, line, fields: new Map(), lists: new Map() };
    pendingList = null;
    const list = sections.get(section);
    if (list === undefined) sections.set(section, [current]);
    else list.push(current);
  };

  const openField = (text: string, indent: number, line: number): void => {
    if (current === null) {
      throw new RegistryLayoutError(line, "a field before any entry", "an entry at the dash column first");
    }
    const fieldColumn = dashColumn === null ? 2 : dashColumn + 2;
    if (indent !== fieldColumn) {
      throw new RegistryLayoutError(line, `a line at column ${indent}`, `column ${fieldColumn}, two past the dash`);
    }
    const { key, value } = splitKeyValue(text, line);
    if (current.fields.has(key) || current.lists.has(key)) {
      throw new RegistryLayoutError(line, `a duplicate field ${key}:`, "one field per entry");
    }
    if (value === "") {
      current.lists.set(key, []);
      pendingList = { key, items: current.lists.get(key) as string[] };
      return;
    }
    current.fields.set(key, scalar(value, line));
    pendingList = null;
  };

  source.split("\n").forEach((raw, index) => {
    const line = index + 1;
    if (raw.includes("\t")) throw new RegistryLayoutError(line, "a tab", "spaces only");
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    const indent = raw.length - raw.trimStart().length;
    const text = raw.slice(indent);
    const isItem = text === "-" || text.startsWith("- ");

    if (isItem && (dashColumn === null || indent === dashColumn)) {
      openEntry(text, indent, line);
      return;
    }
    if (isItem) {
      const fieldColumn = dashColumn === null ? 2 : dashColumn + 2;
      if (current === null || pendingList === null || indent < fieldColumn) {
        throw new RegistryLayoutError(line, `a list item at column ${indent}`, "a field with no inline value above it");
      }
      const item = text === "-" ? "" : text.slice(2).trim();
      if (item === "") throw new RegistryLayoutError(line, "an empty list item", "- <value>");
      pendingList.items.push(scalar(item, line));
      return;
    }
    if (indent === 0) {
      const { key, value } = splitKeyValue(text, line);
      current = null;
      pendingList = null;
      if (value === "" || value === "[]") {
        const existing = sections.get(key);
        if (existing !== undefined && existing.length > 0) {
          throw new RegistryLayoutError(line, `a second ${key}: section`, "one section per key");
        }
        sections.set(key, existing ?? []);
        section = key;
        sectionEmpty = value === "[]";
        dashColumn = null;
        return;
      }
      if (meta.has(key)) throw new RegistryLayoutError(line, `a duplicate ${key}:`, "one registry-level value per key");
      if (!META_KEYS.has(key)) {
        throw new RegistryLayoutError(line, `a registry-level value ${key}:`, "version: or last_updated: at column 0");
      }
      meta.set(key, scalar(value, line));
      section = null;
      sectionEmpty = false;
      return;
    }
    openField(text, indent, line);
  });

  return { meta, sections };
}

function section(registry: ParsedRegistry, name: string): readonly ParsedEntry[] {
  const entries = registry.sections.get(name);
  if (entries === undefined) throw new Error(`registry: missing section ${name}`);
  return entries;
}

function field(entry: ParsedEntry, key: string): string {
  const value = entry.fields.get(key);
  if (value === undefined) throw new Error(`${entry.name}: missing field ${key}`);
  return value;
}

function list(entry: ParsedEntry, key: string): readonly string[] {
  const value = entry.lists.get(key);
  if (value === undefined) throw new Error(`${entry.name}: missing list ${key}`);
  return value;
}

function allEntries(registry: ParsedRegistry): readonly ParsedEntry[] {
  return [...registry.sections.values()].flat();
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) twice.add(value);
    seen.add(value);
  }
  return [...twice];
}

function capture(match: RegExpExecArray | null, group: number, what: string): string {
  const value = match?.[group];
  if (value === undefined) throw new Error(`could not read ${what}`);
  return value;
}

/** `| slug | DE pair | EN pair | chip DE | chip EN | max |` from copy deck §6.2. */
interface DeckSetName {
  readonly de: string;
  readonly en: string;
  readonly chipDe: string;
  readonly chipEn: string;
}

function deckSetNames(source: string): Map<string, DeckSetName> {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith("### 6.2 Set names"));
  if (start === -1) throw new Error("copy deck §6.2 not found");
  const names = new Map<string, DeckSetName>();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("### ")) break;
    const match = /^\|\s*`([a-z-]+)`\s*\|/.exec(line);
    if (match === null) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    names.set(capture(match, 1, "a set slug"), {
      de: cells[2] ?? "",
      en: cells[3] ?? "",
      chipDe: cells[4] ?? "",
      chipEn: cells[5] ?? "",
    });
  }
  return names;
}

/** Every keyed row of copy deck sections 1–10, mapped to the deck section it sits in. */
function deckCopyKeys(source: string): Map<string, string> {
  let sectionNumber = 0;
  let group: string | null = null;
  const keys = new Map<string, string>();
  for (const line of source.split("\n")) {
    const heading = /^## (\d+)\. /.exec(line);
    if (heading !== null) {
      sectionNumber = Number(capture(heading, 1, "a deck section"));
      group = null;
      continue;
    }
    const subheading = /^### (\d+\.\d+) /.exec(line);
    if (subheading !== null) {
      if (sectionNumber !== 6) continue;
      group = capture(subheading, 1, "a deck subsection");
      continue;
    }
    if (sectionNumber < 1 || sectionNumber > 10) continue;
    const row = /^\|\s*`([^`]+)`\s*\|/.exec(line);
    if (row === null) continue;
    const key = capture(row, 1, "a copy key");
    if (key.startsWith("{")) continue;
    group ??= String(sectionNumber);
    if (keys.has(key)) throw new Error(`copy deck repeats the key ${key}`);
    keys.set(key, group);
  }
  return keys;
}

/** ADR-0003 §2 — the closed register: version, data cell, owner, storage. */
interface AdrKeyRow {
  readonly version: number;
  readonly data: string;
  readonly owner: string;
  readonly storage: string;
}

/** Markdown emphasis and table escapes around a cell are formatting, not content. */
function plainCell(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\\\|/g, "|")
    .trim();
}

function adrKeyRegister(source: string): Map<string, AdrKeyRow> {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith("### 2. Ratified key register"));
  if (start === -1) throw new Error("ADR-0003 §2 not found");
  const rows = new Map<string, AdrKeyRow>();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("### 3.")) break;
    const match = /^\|\s*`([a-z]+\.v\d+)`\s*\|\s*(\d+)\s*\|/.exec(line);
    if (match === null) continue;
    // A data cell may hold a pipe (`'de' | 'en'`), so split and take the owner
    // from the last non-empty cell; everything between is the data cell.
    const cells = line.split("|");
    const lastIndex = cells.reduce((last, cell, cellIndex) => (cell.trim() === "" ? last : cellIndex), 0);
    const data = plainCell(cells.slice(3, lastIndex).join("|"));
    rows.set(capture(match, 1, "an ADR key"), {
      version: Number(capture(match, 2, "an ADR key version")),
      data,
      owner: plainCell(cells[lastIndex] ?? ""),
      storage: data.includes("sessionStorage") ? "sessionStorage" : "localStorage",
    });
  }
  return rows;
}

/** GDD R-A — `| slug | DE | EN | frame |`, with the parenthetical stripped. */
function gddFrames(source: string): Map<string, string> {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith("| Slug | DE | EN | Frame colour role |"));
  if (start === -1) throw new Error("GDD R-A set table not found");
  const frames = new Map<string, string>();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.startsWith("|")) break;
    const match = /^\|\s*`([a-z-]+)`\s*\|/.exec(line);
    if (match === null) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    frames.set(capture(match, 1, "a GDD set slug"), (cells[4] ?? "").replace(/\s*\(.*\)$/, ""));
  }
  return frames;
}

/** ADR-0003 §4 — the v1 keys that were bare, so their v2 form is enveloped (§1). */
function adrBareV1Concerns(source: string): readonly string[] {
  const start = source.indexOf("### 4. Migration");
  const end = source.indexOf("### 5. Reset");
  if (start === -1 || end === -1) throw new Error("ADR-0003 §4 not found");
  const concerns = new Set<string>();
  for (const match of source.slice(start, end).matchAll(/`([a-z]+)\.v1`/g)) {
    concerns.add(capture(match, 1, "a v1 concern"));
  }
  return [...concerns];
}

const REGISTRY = read("design/registry/entities.yaml");
const DECK = read("design/copy/copy-deck.md");
const ADR = read("docs/adr/ADR-0003-state-persistence.md");
const GDD = read("design/gdd/collection-meta.md");
const FICTION = read("design/features/archive-fiction.md");
const PATTERNS = read("design/ux/interaction-patterns.md");

const CANONICAL_SLUGS = [
  "nap-wing",
  "garden-annex",
  "departure-hall",
  "ball-room",
  "portrait-room",
  "guard-room",
  "new-acquisitions",
] as const;

let registry: ParsedRegistry;

beforeAll(() => {
  registry = parseRegistry(REGISTRY);
});

describe("the layout reader", () => {
  it("accepts the shape the registry uses", () => {
    expect(() => parseRegistry("entities:\n  - name: x\n    status: active\n")).not.toThrow();
  });

  it("rejects a tab in the indent", () => {
    expect(() => parseRegistry("entities:\n\t- name: x\n")).toThrow(RegistryLayoutError);
  });

  it("rejects an unquoted value holding ': '", () => {
    expect(() => parseRegistry("entities:\n  - name: x\n    payload: a: b\n")).toThrow(/unquoted value/);
  });

  it("rejects a dash at a second column", () => {
    expect(() => parseRegistry("entities:\n  - name: a\n - name: b\n")).toThrow(/list item at column/);
  });

  it("rejects a field that is not two past the dash", () => {
    expect(() => parseRegistry("entities:\n  - name: x\n   status: active\n")).toThrow(/column 4/);
  });

  it("rejects a list item with no field above it", () => {
    expect(() => parseRegistry("entities:\n  - name: x\n      - orphan\n")).toThrow(/no inline value/);
  });

  it("rejects an entry under an empty section", () => {
    expect(() => parseRegistry("entities: []\n  - name: x\n")).toThrow(/when it has entries/);
  });

  it("rejects a stray registry-level scalar", () => {
    expect(() => parseRegistry('entities:\n  - name: x\nrevised: ""\n')).toThrow(/registry-level value/);
  });
});

describe("design/registry/entities.yaml", () => {
  it("parses under the published layout", () => {
    expect([...registry.sections.keys()]).toEqual([
      "entities",
      "items",
      "formulas",
      "constants",
      "storage_keys",
      "copy_keys",
    ]);
    expect(registry.meta.get("version")).toBe("1");
  });

  it("keeps the documented empty sections explicit", () => {
    expect(section(registry, "items")).toHaveLength(0);
    expect(section(registry, "formulas")).toHaveLength(0);
  });

  it("uses only active or deprecated statuses", () => {
    for (const entry of allEntries(registry)) {
      expect(["active", "deprecated"]).toContain(field(entry, "status"));
    }
  });

  it("names only paths that exist", () => {
    for (const entry of allEntries(registry)) {
      const source = entry.fields.get("source");
      if (source !== undefined) {
        expect(existsSync(new URL(`../../${source}`, import.meta.url)), `${entry.name}: ${source}`).toBe(true);
      }
      for (const path of entry.lists.get("referenced_by") ?? []) {
        expect(existsSync(new URL(`../../${path}`, import.meta.url)), `${entry.name}: ${path}`).toBe(true);
      }
    }
  });

  it("registers the six rooms and the automatic shelf, in canonical order", () => {
    const entities = section(registry, "entities");
    expect(entities.map((entry) => entry.name)).toEqual([...CANONICAL_SLUGS]);
    expect(entities.map((entry) => field(entry, "order"))).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(entities.map((entry) => field(entry, "kind"))).toEqual([
      "room",
      "room",
      "room",
      "room",
      "room",
      "room",
      "shelf",
    ]);
  });

  it("keeps ids unique: slugs, codes, orders and copy-key groups", () => {
    const entities = section(registry, "entities");
    expect(duplicates(entities.map((entry) => entry.name))).toEqual([]);
    expect(duplicates(entities.map((entry) => field(entry, "code")))).toEqual([]);
    expect(duplicates(entities.map((entry) => field(entry, "order")))).toEqual([]);
    expect(duplicates(section(registry, "copy_keys").map((entry) => entry.name))).toEqual([]);
    expect(duplicates(section(registry, "storage_keys").map((entry) => entry.name))).toEqual([]);
  });

  it("takes each room code from the archive fiction", () => {
    const codes = new Map<string, string>();
    for (const match of FICTION.matchAll(/`([a-z-]+)` · code `([A-Z]{3})`/g)) {
      codes.set(capture(match, 1, "a room slug"), capture(match, 2, "a room code"));
    }
    expect([...codes.keys()]).toEqual([...CANONICAL_SLUGS]);
    for (const entity of section(registry, "entities")) {
      expect(field(entity, "code"), entity.name).toBe(codes.get(entity.name));
    }
  });

  it("matches the deck's canonical set names and chips, and marks every name provisional", () => {
    const names = deckSetNames(DECK);
    expect([...names.keys()]).toEqual([...CANONICAL_SLUGS]);
    for (const entity of section(registry, "entities")) {
      const deck = names.get(entity.name);
      expect(deck, entity.name).toBeDefined();
      if (deck === undefined) continue;
      expect(field(entity, "display_de")).toBe(deck.de.split(" · ")[0]);
      expect(field(entity, "display_en")).toBe(deck.en.split(" · ")[0]);
      expect(field(entity, "chip_de")).toBe(deck.chipDe === "— (no chip)" ? "" : deck.chipDe);
      expect(field(entity, "chip_en")).toBe(deck.chipEn === "— (no chip)" ? "" : deck.chipEn);
      expect(field(entity, "name_status"), `${entity.name}: GDD Open Question 2 is still open`).toBe("provisional");
    }
    expect(GDD).toContain("## Open Questions");
    expect(GDD).toContain("Wing names final check");
  });

  it("marks exactly one chase wing and one unassigned-card fallback", () => {
    const entities = section(registry, "entities");
    const chase = entities.filter((entry) => field(entry, "chase_wing") === "true");
    const fallback = entities.filter((entry) => field(entry, "default_for_unassigned") === "true");
    expect(chase.map((entry) => entry.name)).toEqual(["portrait-room"]);
    expect(fallback.map((entry) => entry.name)).toEqual(["new-acquisitions"]);
    expect(GDD).toContain("chase: true");
    expect(GDD).toContain("land on the shelf `new-acquisitions`");
  });

  it("earns frames on the six rooms and none on the shelf, while the shelf counts", () => {
    const frames = gddFrames(GDD);
    expect([...frames.keys()]).toEqual([...CANONICAL_SLUGS]);
    for (const entity of section(registry, "entities")) {
      const isRoom = field(entity, "kind") === "room";
      expect(field(entity, "earns_frame"), entity.name).toBe(isRoom ? "true" : "false");
      expect(field(entity, "counts_toward_diploma"), entity.name).toBe("true");
      expect(field(entity, "frame"), `${entity.name}: GDD R-A frame colour role`).toBe(frames.get(entity.name));
    }
  });

  it("only names a document that actually names the entry", () => {
    // Constants are referenced by value, not by name (pack_size is "four cards"
    // in prose), so they are checked for path existence only.
    const named = [...section(registry, "entities"), ...section(registry, "storage_keys")];
    for (const entry of named) {
      for (const path of list(entry, "referenced_by")) {
        expect(read(path).includes(entry.name), `${path} does not name ${entry.name}`).toBe(true);
      }
    }
  });

  it("gives each set its three room lore keys, as archive-fiction names them", () => {
    const surfaces = new Set<string>();
    for (const match of FICTION.matchAll(/`room:<slug>:(plaque|door|closed)`/g)) {
      surfaces.add(capture(match, 1, "a room copy surface"));
    }
    expect([...surfaces].sort()).toEqual(["closed", "door", "plaque"]);
    for (const entity of section(registry, "entities")) {
      expect(list(entity, "copy_keys")).toEqual(["plaque", "door", "closed"].map((surface) => `room:${entity.name}:${surface}`));
    }
  });
});

describe("pack size", () => {
  it("is the 4-card canon, and the documents agree", () => {
    const packSize = section(registry, "constants").find((entry) => entry.name === "pack_size");
    expect(packSize).toBeDefined();
    if (packSize === undefined) return;
    expect(field(packSize, "value")).toBe("4");
    expect(field(packSize, "unit")).toBe("cards");

    const drawn = /PACK_SIZE\s*=\s*min\(\s*(\d+)\s*,\s*photos\s*\)/.exec(PATTERNS);
    expect(capture(drawn, 1, "PACK_SIZE in design/ux/interaction-patterns.md")).toBe("4");

    const deckRow = DECK.split("\n").find((line) => line.startsWith("| Pack size |"));
    expect(deckRow).toContain("vier Karten");
    expect(deckRow).toContain("four cards");
  });
});

describe("storage keys", () => {
  it("is exactly ADR-0003 §2, the closed set", () => {
    const register = adrKeyRegister(ADR);
    const stored = section(registry, "storage_keys");
    expect(stored.map((entry) => entry.name).sort()).toEqual([...register.keys()].sort());
  });

  it("agrees with the ADR on version, storage, payload, owner and envelope shape", () => {
    const register = adrKeyRegister(ADR);
    const bareV1 = adrBareV1Concerns(ADR);
    expect([...bareV1].sort()).toEqual(["lang", "seen", "sound"]);

    for (const entry of section(registry, "storage_keys")) {
      const row = register.get(entry.name);
      expect(row, entry.name).toBeDefined();
      if (row === undefined) continue;
      expect(field(entry, "version"), entry.name).toBe(String(row.version));
      expect(entry.name.endsWith(`.v${row.version}`), `${entry.name}: the suffix is the envelope version`).toBe(true);
      expect(field(entry, "storage"), entry.name).toBe(row.storage);
      expect(field(entry, "envelope"), `${entry.name}: enveloped only if it once existed bare`).toBe(
        bareV1.includes(entry.name.slice(0, entry.name.indexOf("."))) ? "true" : "false",
      );
      // The ADR writes session.v1's storage inside its data cell; the registry
      // keeps it in `storage` instead, which the line above already gates.
      const payload = row.data.endsWith(" in sessionStorage")
        ? row.data.slice(0, -" in sessionStorage".length)
        : row.data;
      expect(field(entry, "payload"), `${entry.name}: ADR-0003 §2 data`).toBe(payload);
      expect(field(entry, "owner"), `${entry.name}: ADR-0003 §2 owner`).toBe(row.owner);
    }
  });
});

describe("copy-key index", () => {
  it("indexes every deck key once, in the deck's own group", () => {
    const deck = deckCopyKeys(DECK);
    const indexed = new Map<string, string>();
    for (const group of section(registry, "copy_keys")) {
      const keys = list(group, "keys");
      expect(keys.length, `${group.name} is empty`).toBeGreaterThan(0);
      expect(keys, group.name).toEqual([...new Set(keys)]);
      for (const key of keys) {
        expect(indexed.has(key), `${key} is indexed twice`).toBe(false);
        indexed.set(key, field(group, "deck_section"));
      }
    }
    expect(indexed.size).toBe(deck.size);
    expect([...indexed.entries()].sort()).toEqual([...deck.entries()].sort());
  });

  it("routes the set names through the deck group that owns them", () => {
    const setNames = section(registry, "copy_keys").find((entry) => entry.name === "collection_set_names");
    expect(setNames).toBeDefined();
    if (setNames === undefined) return;
    expect(list(setNames, "keys")).toEqual([...CANONICAL_SLUGS]);
    expect(field(setNames, "deck_section")).toBe("6.2");
  });
});
