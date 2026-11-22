#!/usr/bin/env node
/**
 * Glyph audit for the Chivo subset (ticket #35; art bible §8 font budget).
 *
 * Single source of truth for the code points the shipped Chivo woff2 must cover.
 * Both the subsetter (`scripts/subset-chivo.py`) and the coverage test
 * (`tests/unit/font-coverage.test.ts`) take their list from here, so they cannot drift.
 *
 * Sources:
 *   - copy: DE/EN columns of the string-of-record tables in design/copy/copy-deck.md,
 *     sections 1–10 (copy-deck §0.1). Sections 0 and 11–15 are rules, decisions and
 *     retired strings, not player-facing copy.
 *   - src: every non-ASCII character in src/** and index.html (rendered UI glyphs).
 *   - policy: printable ASCII 0x20–0x7E (copy uses all of it but Q; Q is kept for
 *     names and future copy).
 *   - required: the umlauts, ß and typographic punctuation the ticket names.
 *
 * Usage:  node scripts/font-glyphs.mjs --json
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));

export const REQUIRED = "ÄÖÜäöüß„“”‘’–—…";

/**
 * Characters the copy or src uses that Chivo does not contain. They render through
 * the system fallback stack. The coverage test fails if an entry becomes present in
 * the font (the entry is stale) or if a copy/src character is missing and not listed.
 */
export const FALLBACK = {
  "←": "card.flip.hint (copy-deck §5): \"← → zur nächsten\"",
  "→": "card.flip.hint (copy-deck §5): \"← → zur nächsten\"",
  "★": "CardFace.svelte star glyph (UI, not copy)",
};

const COPY_SECTIONS = [1, 10];
const KEY_HEADERS = new Set(["key", "slug"]);
const STRING_HEADERS = new Set(["de", "en", "de pair", "en pair", "chip de", "chip en"]);

/** Cells of the DE/EN string columns in copy-deck tables, sections 1–10. */
export function copyDeckCells(markdown) {
  const cells = [];
  let section = -1;
  let columns = null;
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = /^## (\d+)\./.exec(line);
    if (heading) {
      section = Number(heading[1]);
      columns = null;
      continue;
    }
    if (!line.startsWith("|")) {
      columns = null;
      continue;
    }
    const split = (row) => row.slice(1, row.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (columns === null) {
      const header = split(line).map((h) => h.toLowerCase());
      const isStringTable = KEY_HEADERS.has(header[0] ?? "") && header.some((h) => STRING_HEADERS.has(h));
      const next = lines[i + 1] ?? "";
      if (isStringTable && /^\|\s*-{3,}/.test(next) && section >= COPY_SECTIONS[0] && section <= COPY_SECTIONS[1]) {
        columns = header.map((h, idx) => (STRING_HEADERS.has(h) ? idx : -1)).filter((idx) => idx >= 0);
        i++; // skip the separator row
      } else {
        columns = [];
      }
      continue;
    }
    for (const idx of columns) {
      const cell = split(line)[idx];
      if (cell !== undefined) cells.push(cell);
    }
  }
  return cells;
}

/** Every non-whitespace, non-control code point in a string. */
export function printableCodePoints(text) {
  const out = new Set();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp > 0x20 && cp !== 0x7f && !/\s/u.test(ch)) out.add(cp);
  }
  return out;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(ts|svelte|css|js|mjs)$/.test(name)) files.push(path);
  }
  return files;
}

export function collectGlyphs(root = ROOT) {
  const copyMd = readFileSync(join(root, "design/copy/copy-deck.md"), "utf8");
  const copyCps = new Set();
  for (const cell of copyDeckCells(copyMd)) for (const cp of printableCodePoints(cell)) copyCps.add(cp);

  const srcCps = new Set();
  const srcFiles = [...walk(join(root, "src")), join(root, "index.html")];
  for (const file of srcFiles) {
    for (const cp of printableCodePoints(readFileSync(file, "utf8"))) if (cp > 0x7e) srcCps.add(cp);
  }

  const policy = new Set();
  for (let cp = 0x20; cp <= 0x7e; cp++) policy.add(cp);
  const required = [...REQUIRED].map((c) => c.codePointAt(0));

  const all = new Set([...policy, ...required, ...copyCps, ...srcCps]);
  const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  return {
    codepoints: [...all].sort((a, b) => a - b),
    copy: [...copyCps].filter((cp) => cp > 0x7e).sort((a, b) => a - b).map((cp) => ({ cp, hex: hex(cp), char: String.fromCodePoint(cp) })),
    src: [...srcCps].sort((a, b) => a - b).map((cp) => ({ cp, hex: hex(cp), char: String.fromCodePoint(cp) })),
    required: [...REQUIRED],
    srcFiles: srcFiles.map((f) => relative(root, f)),
    fallback: FALLBACK,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--json")) {
    console.error("usage: node scripts/font-glyphs.mjs --json");
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(collectGlyphs(), null, 2)}\n`);
}
