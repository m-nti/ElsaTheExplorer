#!/usr/bin/env node
/**
 * Regenerate the shipped webfonts from their vendored sources.
 *
 * Why a script and not a one-off download: the subset is a delivery decision
 * (repertoire in `scripts/fonts.json`) and has to be reproducible when copy
 * adds a character. Subsetting the *shipped* woff2 in place would be lossy —
 * a glyph dropped once can never come back — so the un-subsetted source lives
 * at `assets/fonts/chivo-latin-source.ttf` (the upstream Google Fonts latin
 * cut, decompressed byte-for-byte from the woff2 that shipped at 33,252 B).
 *
 * Outlines, advance widths, kerning and the variable `wght` axis are preserved
 * by HarfBuzz's subsetter; only unused glyphs and their `gvar`/`HVAR` data go.
 *
 * Usage: npm run fonts:subset
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import subsetFont from "subset-font";

const root = resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(resolve(root, "scripts/fonts.json"), "utf8"));

function expandRanges(ranges = []) {
  const codepoints = [];
  for (const range of ranges) {
    const match = /^U\+([0-9A-F]{4,6})(?:-([0-9A-F]{4,6}))?$/i.exec(range.trim());
    if (!match) throw new Error(`malformed range "${range}"`);
    const from = Number.parseInt(match[1], 16);
    const to = match[2] ? Number.parseInt(match[2], 16) : from;
    for (let codepoint = from; codepoint <= to; codepoint += 1) codepoints.push(codepoint);
  }
  return codepoints;
}

let generated = 0;
for (const font of manifest.fonts ?? []) {
  if (!font.source) {
    console.log(`fonts:subset: skip ${font.file} — no vendored source (${font.repertoire ?? "inherited"})`);
    continue;
  }
  const source = readFileSync(resolve(root, font.source));
  const codepoints = expandRanges(font.ranges);
  const text = [...new Set(codepoints)].map((codepoint) => String.fromCodePoint(codepoint)).join("");
  const output = await subsetFont(source, text, { targetFormat: "woff2" });

  const outPath = resolve(root, font.file);
  let before = 0;
  try {
    before = statSync(outPath).size;
  } catch {
    // First generation: nothing to replace.
  }
  writeFileSync(outPath, output);

  const delta = before === 0 ? "" : ` (was ${before.toLocaleString("en-US")} B, ${output.length - before > 0 ? "+" : ""}${(output.length - before).toLocaleString("en-US")} B)`;
  console.log(
    `fonts:subset: ${font.file} ${codepoints.length} codepoints → ` +
      `${output.length.toLocaleString("en-US")} B${delta}`,
  );
  generated += 1;

  if (output.length > manifest.budgetBytes) {
    console.error(
      `fonts:subset: ${font.file} is ${output.length.toLocaleString("en-US")} B — over the ` +
        `${manifest.budgetBytes.toLocaleString("en-US")} B budget; trim the repertoire in scripts/fonts.json`,
    );
    process.exit(1);
  }
}

console.log(`fonts:subset: ${generated} font(s) regenerated — run \`npm run gate:fonts\` to verify`);
