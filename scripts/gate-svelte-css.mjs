#!/usr/bin/env node
/**
 * Unused-CSS gate (ADR-0002 enforcement belt, spike item 5).
 *
 * Svelte emits `css_unused_selector` from the compiler, but the Vite plugin
 * treats CSS warnings as advisory in some build paths, so a warning is not a
 * reliable CI gate. This script compiles every `.svelte` file with the project
 * preprocessor and fails on that warning code — the mechanical gate the ADR
 * asks for. `svelte.config.js` keeps the same promotion as a second belt.
 *
 * Exit codes: 0 = clean, 1 = unused selector(s), 2 = usage error.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { compile, preprocess } from "svelte/compiler";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".svelte")) out.push(full);
  }
  return out;
}

const preprocessor = vitePreprocess();
const failures = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, "utf8");
  const filename = relative(ROOT, file);
  const preprocessed = await preprocess(source, preprocessor, { filename });
  const result = compile(preprocessed.code, {
    filename,
    generate: "client",
    // Keep the CSS so selectors are analysed; do not emit a JS artifact.
  });

  for (const warning of result.warnings) {
    if (warning.code === "css_unused_selector") {
      failures.push({ filename, message: warning.message });
    }
  }
}

if (failures.length > 0) {
  console.error(`unused-css: ${failures.length} unused selector warning(s)`);
  for (const failure of failures) {
    console.error(`  ${failure.filename}`);
    console.error(`    ${failure.message.split("\n")[0]}`);
  }
  process.exit(1);
}

console.log(`unused-css: clean (${walk(SRC).length} Svelte component(s))`);
