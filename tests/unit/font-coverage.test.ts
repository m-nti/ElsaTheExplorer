import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Chivo subset gate — ticket #35, art bible §8 ("≤ 30 KB per woff2, Latin subset").
 *
 * The test reads the shipped `public/fonts/chivo-latin.woff2` directly: it parses the
 * WOFF2 table directory, brotli-decompresses the table stream and reads the `cmap`
 * table. No manifest is trusted. The required code points come from
 * `scripts/font-glyphs.mjs`, the single source of truth shared with the subsetter.
 */

const FONT = fileURLToPath(new URL("../../public/fonts/chivo-latin.woff2", import.meta.url));
const GLYPHS = fileURLToPath(new URL("../../scripts/font-glyphs.mjs", import.meta.url));

/** Per-font ceiling from the art bible §8 table: 30 KB, read as 30,000 bytes (the stricter reading). */
const FONT_BUDGET_BYTES = 30_000;

// WOFF2 known-table index → tag (WOFF2 spec §5.1, 63 entries).
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca",
  "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
  "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
  "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

type Table = { tag: string; transformed: boolean; origLength: number; storedLength: number };

function readBase128(buf: Buffer, pos: { at: number }): number {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[pos.at++];
    if (byte === undefined) throw new Error("woff2: truncated UIntBase128");
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error("woff2: UIntBase128 overflow");
}

/** Returns the decompressed table stream and the directory, in stored order. */
export function readWoff2Tables(buf: Buffer): { tables: Table[]; stream: Buffer } {
  if (buf.toString("latin1", 0, 4) !== "wOF2") throw new Error("not a woff2 file");
  const numTables = buf.readUInt16BE(12);
  const totalCompressed = buf.readUInt32BE(20);
  const pos = { at: 48 };
  const tables: Table[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos.at++] ?? 0;
    const known = flags & 0x3f;
    let tag: string;
    if (known === 63) {
      tag = buf.toString("latin1", pos.at, pos.at + 4);
      pos.at += 4;
    } else {
      tag = KNOWN_TAGS[known] ?? "";
    }
    const version = (flags >> 6) & 0x03;
    const transformed =
      tag === "glyf" || tag === "loca" ? version !== 3 : tag === "hmtx" ? version === 1 : false;
    const origLength = readBase128(buf, pos);
    const storedLength = transformed ? readBase128(buf, pos) : origLength;
    tables.push({ tag, transformed, origLength, storedLength });
  }
  const stream = brotliDecompressSync(buf.subarray(pos.at, pos.at + totalCompressed));
  return { tables, stream };
}

/** Code points mapped to a non-zero glyph by the first Unicode cmap subtable we can read. */
export function mappedCodePoints(cmap: Buffer): Set<number> {
  const count = cmap.readUInt16BE(2);
  const mapped = new Set<number>();
  let chosen = -1;
  let preferred = -1;
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(offset);
    const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!isUnicode) continue;
    // Prefer format 12 (full Unicode) over format 4 when both exist.
    if (format === 12 || (format === 4 && chosen < 0)) {
      chosen = offset;
      preferred = format;
      if (format === 12) break;
    }
  }
  if (chosen < 0) throw new Error("cmap: no Unicode subtable");
  if (preferred === 12) {
    const groups = cmap.readUInt32BE(chosen + 12);
    for (let g = 0; g < groups; g++) {
      const base = chosen + 16 + g * 12;
      const start = cmap.readUInt32BE(base);
      const end = cmap.readUInt32BE(base + 4);
      const glyph = cmap.readUInt32BE(base + 8);
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) mapped.add(c);
    }
    return mapped;
  }
  const segCount = cmap.readUInt16BE(chosen + 6) / 2;
  const endCodes = chosen + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;
  for (let s = 0; s < segCount; s++) {
    const end = cmap.readUInt16BE(endCodes + s * 2);
    const start = cmap.readUInt16BE(startCodes + s * 2);
    const delta = cmap.readUInt16BE(idDeltas + s * 2);
    const rangeOffset = cmap.readUInt16BE(idRangeOffsets + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (c + delta) & 0xffff;
      } else {
        const at = idRangeOffsets + s * 2 + rangeOffset + (c - start) * 2;
        const raw = cmap.readUInt16BE(at);
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyph !== 0) mapped.add(c);
    }
  }
  return mapped;
}

export function woff2CmapCodePoints(buf: Buffer): Set<number> {
  const { tables, stream } = readWoff2Tables(buf);
  let at = 0;
  for (const table of tables) {
    const length = table.storedLength;
    if (table.tag === "cmap") {
      if (table.transformed) throw new Error("cmap: unexpected transform");
      return mappedCodePoints(stream.subarray(at, at + length));
    }
    at += length;
  }
  throw new Error("woff2: no cmap table");
}

type GlyphAudit = {
  codepoints: number[];
  copy: { cp: number; hex: string; char: string }[];
  src: { cp: number; hex: string; char: string }[];
  required: string[];
  fallback: Record<string, string>;
};

function audit(): GlyphAudit {
  const run = spawnSync(process.execPath, [GLYPHS, "--json"], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`font-glyphs failed: ${run.stderr}`);
  return JSON.parse(run.stdout) as GlyphAudit;
}

const hex = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

describe("Chivo subset — font coverage and budget (ticket #35)", () => {
  const font = readFileSync(FONT);
  const cmap = woff2CmapCodePoints(font);
  const glyphs = audit();
  const fallback = new Set(Object.keys(glyphs.fallback));

  it("stays within the 30 KB per-font budget (art bible §8)", () => {
    expect(font.byteLength, `chivo-latin.woff2 is ${font.byteLength} B`).toBeLessThanOrEqual(
      FONT_BUDGET_BYTES,
    );
  });

  it("covers every copy and src character, except the listed system-fallback glyphs", () => {
    const missing = glyphs.codepoints.filter((cp) => !cmap.has(cp) && !fallback.has(String.fromCodePoint(cp)));
    const where = (cp: number) => {
      const inCopy = glyphs.copy.some((c) => c.cp === cp);
      const inSrc = glyphs.src.some((c) => c.cp === cp);
      return [inCopy ? "copy-deck" : "", inSrc ? "src" : ""].filter(Boolean).join("+") || "policy/required";
    };
    expect(
      missing.map((cp) => `${String.fromCodePoint(cp)} ${hex(cp)} (${where(cp)})`),
      "copy/src characters missing from the Chivo subset",
    ).toEqual([]);
  });

  it("covers every required umlaut, ß and typographic quote/dash/ellipsis", () => {
    const missing = [...glyphs.required].filter((c) => !cmap.has(c.codePointAt(0) ?? -1));
    expect(missing, "required glyphs missing from the subset").toEqual([]);
  });

  it("keeps the FALLBACK list honest: each listed glyph is absent from the font", () => {
    const stale = [...fallback].filter((c) => cmap.has(c.codePointAt(0) ?? -1));
    expect(stale, "FALLBACK entries now present in the font — remove them").toEqual([]);
  });

  it("covers all printable ASCII (copy policy)", () => {
    const missing: number[] = [];
    for (let cp = 0x20; cp <= 0x7e; cp++) if (!cmap.has(cp)) missing.push(cp);
    expect(missing.map(hex)).toEqual([]);
  });
});
