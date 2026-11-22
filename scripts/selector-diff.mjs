#!/usr/bin/env node
/**
 * Cross-file selector-diff gate (ADR-0002 enforcement belt).
 *
 * Stylelint is per-file: `no-duplicate-selectors` catches a selector repeated
 * inside one stylesheet, but not the same selector redefined across
 * component-scoped `<style>` blocks — the exact class of drift that shipped a
 * holo `--foil-strength` as 0.56 / 0.42 / 1.0 in three blocks.
 *
 * Contract: every selector in every Svelte style block and every CSS file
 * under `src/` must be unique across the whole app. Svelte's scoping
 * hash makes cross-component selector reuse *behaviourally* different, so a
 * repeated selector is treated as a redefinition that needs a shared recipe or
 * a token, not a copy.
 *
 * Exit codes: 0 = clean, 1 = duplicates found, 2 = usage error.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const EXTENSIONS = new Set([".css", ".svelte"]);

/** Collect candidate files without a glob dependency. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    const dot = entry.name.lastIndexOf(".");
    if (dot !== -1 && EXTENSIONS.has(entry.name.slice(dot))) out.push(full);
  }
  return out;
}

/** Strip comments and strings so braces inside either do not split rules. */
function stripNoise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/** Extract `<style>` blocks from a Svelte SFC, preserving line offsets. */
function svelteStyles(source) {
  const blocks = [];
  const re = /<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(source)) !== null) {
    const body = match[2] ?? "";
    const offset = source.slice(0, match.index).split("\n").length - 1;
    blocks.push({ css: body, lineOffset: offset + (match[0].split("\n").length - body.split("\n").length) + 1 });
  }
  return blocks;
}

/** Flatten nested rules into their effective selector paths. */
function selectorsFrom(css) {
  const clean = stripNoise(css);
  const found = [];
  let buffer = "";
  const stack = [];
  let line = 1;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === "\n") line += 1;

    if (char === "{") {
      const head = buffer.trim();
      buffer = "";
      if (head.startsWith("@")) {
        stack.push({ atRule: head, selector: null });
        continue;
      }
      const parent = [...stack].reverse().find((frame) => frame.selector)?.selector;
      const selector = parent ? head.split(",").map((part) => `${parent} ${part.trim()}`).join(", ") : head;
      const inKeyframes = stack.some(
        (frame) =>
          frame.atRule?.startsWith("@keyframes") ||
          frame.atRule?.startsWith("@-webkit-keyframes"),
      );
      stack.push({ atRule: null, selector, line });

      if (!inKeyframes) {
        for (const part of selector.split(",")) {
          const normalized = part.trim().replace(/\s+/g, " ");
          if (normalized) found.push({ selector: normalized, line });
        }
      }
      continue;
    }

    if (char === "}") {
      stack.pop();
      buffer = "";
      continue;
    }

    if (char === ";") {
      buffer = "";
      continue;
    }

    buffer += char;
  }

  return found;
}

const files = walk(SRC);
const seen = new Map();

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const blocks = file.endsWith(".svelte")
    ? svelteStyles(source)
    : [{ css: source, lineOffset: 0 }];
  const relativeFile = relative(ROOT, file);

  for (const block of blocks) {
    for (const { selector, line } of selectorsFrom(block.css)) {
      const location = {
        file: relativeFile,
        at: `${relativeFile}:${block.lineOffset + line}`,
      };
      const previous = seen.get(selector) ?? [];
      seen.set(selector, [...previous, location]);
    }
  }
}

/*
 * Cross-file only: same-file repeats are normal composition (base rule, state
 * rule, media query) and are Stylelint's job. The gap this gate closes is the
 * same selector owned by two different components.
 */
const duplicates = [...seen.entries()].filter(
  ([, locations]) => new Set(locations.map((location) => location.file)).size > 1,
);

if (duplicates.length > 0) {
  console.error(
    `selector-diff: ${duplicates.length} selector(s) defined in more than one source file`,
  );
  for (const [selector, locations] of duplicates) {
    console.error(`  ${selector}`);
    for (const location of locations) console.error(`    ${location.at}`);
  }
  process.exit(1);
}

console.log(`selector-diff: clean (${files.length} files, ${seen.size} selectors)`);
