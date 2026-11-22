#!/usr/bin/env node
/**
 * Font delivery gate — the per-font byte ceiling from art bible §8, plus the
 * glyph repertoire the archive actually needs.
 *
 * Why: `public/fonts/chivo-latin.woff2` shipped at 33,252 B against a 30 KB
 * ceiling and nothing failed — the budget was a table in a document, not a
 * gate. This script turns it into a red build: every font under `public/fonts/`
 * must be declared in `scripts/fonts.json`, must be at or under the budget, and
 * must still carry every codepoint the manifest declares *and* every character
 * the shipped copy actually contains.
 *
 * Usage: node scripts/font-budget.mjs [root]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import fontverter from "fontverter";
import * as harfbuzz from "harfbuzzjs";

const root = resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(resolve(root, "scripts/fonts.json"), "utf8"));
const budget = manifest.budgetBytes;
const textExtensions = new Set([".svelte", ".ts", ".css", ".html", ".json", ".md"]);

if (!Number.isInteger(budget) || budget <= 0) {
  console.error("font-budget: scripts/fonts.json needs a positive integer budgetBytes");
  process.exit(1);
}

const errors = [];
const warnings = [];

/** Expand `["U+0020-007E", "U+00A7"]` into a sorted codepoint list. */
function expandRanges(ranges = []) {
  const codepoints = new Set();
  for (const range of ranges) {
    const match = /^U\+([0-9A-F]{4,6})(?:-([0-9A-F]{4,6}))?$/i.exec(range.trim());
    if (!match) {
      errors.push(`malformed range "${range}" — expected U+XXXX or U+XXXX-YYYY`);
      continue;
    }
    const from = Number.parseInt(match[1], 16);
    const to = match[2] ? Number.parseInt(match[2], 16) : from;
    if (to < from) {
      errors.push(`inverted range "${range}"`);
      continue;
    }
    for (let codepoint = from; codepoint <= to; codepoint += 1) codepoints.add(codepoint);
  }
  return codepoints;
}

/**
 * Remove comments so a symbol in prose (a `→` in a JSDoc note) is not mistaken
 * for a rendered glyph. Block comments are unambiguous; a whole-line `//` is
 * stripped too, inline `//` is kept because it is usually a URL (`https://`).
 */
function stripComments(text, extension) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
  if (extension !== ".json" && extension !== ".css") {
    out = out.replace(/^[ \t]*\/\/.*$/gm, "");
  }
  return out;
}

function collectFiles(target) {  const path = resolve(root, target);
  let stats;
  try {
    stats = statSync(path);
  } catch {
    errors.push(`corpus entry "${target}" does not exist`);
    return [];
  }
  if (stats.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    collectFiles(join(target, entry.name)),
  );
}

/** Codepoints the font actually maps, read through HarfBuzz (woff2 -> sfnt first). */
async function fontCodepoints(file) {
  const buffer = readFileSync(resolve(root, file));
  const sfnt = await fontverter.convert(buffer, "sfnt");
  const face = new harfbuzz.Face(new harfbuzz.Blob(sfnt));
  return new Set(face.collectUnicodes());
}

const declared = new Set();
for (const font of manifest.fonts ?? []) {
  if (!font.id || !font.file) {
    errors.push(`malformed font entry: ${JSON.stringify(font)}`);
    continue;
  }
  if (declared.has(font.file)) errors.push(`duplicate font file declaration: ${font.file}`);
  declared.add(font.file);
}

// A new webfont cannot dodge the ceiling by not being listed.
let shipped = [];
try {
  shipped = readdirSync(resolve(root, "public/fonts")).filter((name) =>
    [".woff2", ".woff", ".ttf", ".otf"].includes(extname(name).toLowerCase()),
  );
} catch {
  errors.push("public/fonts/ does not exist");
}
for (const name of shipped) {
  const relative = `public/fonts/${name}`;
  if (!declared.has(relative)) errors.push(`${relative} is shipped but not declared in scripts/fonts.json`);
}

const rows = [];
for (const font of manifest.fonts ?? []) {
  if (!font.id || !font.file) continue;
  const absolute = resolve(root, font.file);
  let bytes;
  try {
    bytes = statSync(absolute).size;
  } catch {
    errors.push(`${font.file} is declared but missing`);
    continue;
  }

  if (bytes > budget) {
    const over = bytes - budget;
    errors.push(
      `${font.file} is ${bytes.toLocaleString("en-US")} B — ${over.toLocaleString("en-US")} B ` +
        `(${((over / budget) * 100).toFixed(1)} %) over the ${budget.toLocaleString("en-US")} B ceiling`,
    );
  }

  const codepoints = await fontCodepoints(font.file).catch((error) => {
    const detail = error instanceof Error ? error.message : String(error);
    if (font.ranges?.length || font.corpusCheck) errors.push(`${font.file} could not be decoded: ${detail}`);
    else warnings.push(`${font.file} could not be decoded (no repertoire declared): ${detail}`);
    return new Set();
  });
  const wanted = expandRanges(font.ranges);
  const missingFromFont = [...wanted].filter((codepoint) => !codepoints.has(codepoint));
  if (missingFromFont.length > 0) {
    errors.push(
      `${font.file} is missing ${missingFromFont.length} declared codepoint(s): ` +
        missingFromFont.map((c) => `U+${c.toString(16).toUpperCase().padStart(4, "0")}`).join(", "),
    );
  }

  // The repertoire must also cover what the shipped copy actually types, not
  // just what the manifest claims — otherwise the manifest can drift from the UI.
  // Comments are stripped first: a `→` in a JSDoc block is not a rendered glyph.
  const fallback = expandRanges((font.fallback ?? []).flatMap((entry) => entry.ranges ?? []));
  const usedFallback = new Map();
  const missingFromCopy = new Map();
  if (font.corpusCheck) {
    for (const file of (manifest.corpus ?? []).flatMap(collectFiles)) {
      if (!textExtensions.has(extname(file).toLowerCase())) continue;
      const text = stripComments(readFileSync(file, "utf8"), extname(file).toLowerCase());
      text.split("\n").forEach((line, index) => {
        for (const character of line) {
          const codepoint = character.codePointAt(0);
          if (codepoint < 0x20 || codepoint === 0x7f) continue;
          if (codepoints.has(codepoint)) continue;
          const relative = file.slice(root.length + 1).replace(/\\/g, "/");
          if (fallback.has(codepoint)) {
            if (!usedFallback.has(codepoint)) usedFallback.set(codepoint, `${relative}:${index + 1}`);
            continue;
          }
          if (!missingFromCopy.has(codepoint)) {
            missingFromCopy.set(codepoint, { character, where: `${relative}:${index + 1}` });
          }
        }
      });
    }
  }
  for (const [codepoint, { character, where }] of missingFromCopy) {
    errors.push(
      `${font.file} has no glyph for U+${codepoint.toString(16).toUpperCase().padStart(4, "0")} ` +
        `("${character}") used at ${where}`,
    );
  }
  for (const [codepoint, where] of usedFallback) {
    const label = `U+${codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
    console.log(`font-budget: ${font.file} leaves ${label} to the fallback stack (declared) at ${where}`);
  }

  rows.push({
    file: font.file,
    bytes,
    codepoints: codepoints.size,
    declared: wanted.size,
  });
}

for (const row of rows) {
  const percent = ((row.bytes / budget) * 100).toFixed(1);
  console.log(
    `font-budget: ${row.file} ${row.bytes.toLocaleString("en-US")} B ` +
      `/ ${budget.toLocaleString("en-US")} B (${percent} %) · ` +
      `${row.codepoints} codepoints mapped · ${row.declared} declared`,
  );
}

if (warnings.length > 0) for (const warning of warnings) console.warn(`font-budget: warning: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`font-budget: ${error}`);
  process.exit(1);
}

console.log(`font-budget: ${rows.length} font(s) within the ${budget.toLocaleString("en-US")} B ceiling`);
