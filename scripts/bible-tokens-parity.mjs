#!/usr/bin/env node
/**
 * bible-tokens-parity — the art bible may not quote a colour the tokens do not hold.
 *
 * Why this exists (#30): the AD-ART-BIBLE pass found `design/art/art-bible.md`
 * quoting `--quiet #756e7d` and credit `#928697` while `design/tokens/tokens.ts`
 * had already shipped the raised `#978fa0` / `#9a8da0`. The Vitest contrast gate
 * enforces the tokens, so both shipped values passed every check — nothing could
 * see that the *document* had gone stale. A rule without a gate erodes, so the
 * rule is a gate.
 *
 * Declaration shapes this reads, and only these:
 *
 * 1. **Palette rows** — a table row whose first cell is nothing but hex values
 *    and whose second cell is nothing but backticked `--token` names, paired by
 *    position (`| `#d4c2a8` / `#8e7c67` | `--metal`, `--metal-dark` |`). Reading
 *    exactly two columns is deliberate: the `--quiet` row's *role* cell names
 *    the retired `#756e7d` to explain why it moved, and a parser that scanned
 *    the whole line would read that explanation as the declaration and cry
 *    drift forever.
 * 2. **Inline spans** — one code span holding `--token #value`
 *    (`` `--quiet #978fa0` ``), which is how §2 and §7 restate the palette.
 *
 * Anything else is prose. A token nobody declares is not silently trusted either:
 * `REQUIRED_TOKENS` is the coverage floor, so deleting a row fails the gate as
 * `undeclared` instead of shrinking the surface down to a pass.
 *
 * Usage:
 *   node scripts/bible-tokens-parity.mjs                  # gate this repository
 *   node scripts/bible-tokens-parity.mjs --json           # machine-readable report
 *   node scripts/bible-tokens-parity.mjs --bible <file> --tokens <file>
 *
 * Exit codes: 0 = every declaration agrees, 1 = drift / undeclared / unknown /
 *             conflict, 2 = usage error (a path that does not exist).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HEX = /^#[0-9a-f]{6}$/i;
const TOKEN = /^--([a-z0-9-]+)$/i;

/**
 * The coverage floor: tokens the art bible must declare somewhere. It is a floor,
 * not a whitelist — a declaration outside this list is still checked (and an
 * unknown name still fails). It exists so that deleting a row cannot turn the
 * gate green.
 */
export const REQUIRED_TOKENS = Object.freeze([
  // Building — cool structural surfaces.
  "bg",
  "bg-raised",
  "surface",
  "surface-light",
  // Paper & metal — warm and meaning-bearing.
  "ink",
  "muted",
  "quiet",
  "metal",
  "metal-dark",
  "accent",
  "accent-bright",
  // Card print colours: every `print-*` key `tokens.ts` publishes.
  "print-name",
  "print-paper",
  "print-ink",
  "print-number",
  "print-mood",
  "print-rarity",
  "print-keyword",
  "print-copy",
  "print-line",
  "print-stat-key",
  "print-stat-value",
  "print-serial",
  "print-credit",
  "print-stats-label",
  "print-kind",
]);

/** `printCredit` → `print-credit`, the name the bible writes and the map key. */
export function toTokenName(key) {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Read the `palette` object literal out of `design/tokens/tokens.ts`.
 *
 * A source parse, not an import: `tokens.ts` imports `@pandacss/dev` and an
 * extensionless `./motion`, so it is not loadable by bare Node. The canon test
 * pins this parser to the real typed export, which is what keeps the shortcut
 * honest — the parser cannot drift from the module without a red test.
 *
 * @param {string} source contents of `design/tokens/tokens.ts`
 * @returns {Map<string, { value: string, line: number }>}
 */
export function parsePalette(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^export const palette = \{\s*$/.test(line));
  if (start === -1) throw new Error("tokens.ts: no `export const palette = {` block found");

  const palette = new Map();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\}\s*as const;/.test(line)) break;
    const entry = /^\s*([A-Za-z][A-Za-z0-9]*):\s*"([^"]*)",?\s*$/.exec(line);
    if (entry === null) continue;
    palette.set(toTokenName(entry[1]), { value: entry[2].toLowerCase(), line: index + 1 });
  }

  if (palette.size === 0) throw new Error("tokens.ts: the palette block is empty");
  return palette;
}

/** Split a GFM row into cells, dropping the outer pipes. */
function cells(line) {
  const parts = line.trim().split(/(?<!\\)\|/);
  if (parts.length > 0 && parts[0].trim() === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

/**
 * A cell's values, in order: backticks stripped, split on the separators the
 * bible uses between values, whitespace trimmed off every part.
 *
 * The trim matters: `String#split` only consumes the whitespace *around* a
 * matched separator, so a cell with no separator at all comes back as
 * `" #111017 "` — untrimmed, and therefore never a hex value.
 */
function values(cell) {
  return cell
    .replace(/`/g, "")
    .split(/\s*(?:,|→|\/)\s*/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/** A cell that is nothing but hex values, in order; otherwise `null`. */
function hexList(cell) {
  const parts = values(cell);
  if (parts.length === 0) return null;
  return parts.every((part) => HEX.test(part)) ? parts.map((part) => part.toLowerCase()) : null;
}

/** A cell that is nothing but `--token` names, in order; otherwise `null`. */
function tokenList(cell) {
  const parts = values(cell).map((part) => TOKEN.exec(part));
  if (parts.length === 0 || parts.some((match) => match === null)) return null;
  return parts.map((match) => match[1].toLowerCase());
}

/**
 * Every colour declaration the bible makes, in document order.
 *
 * @param {string} source contents of `design/art/art-bible.md`
 * @returns {{ token: string, value: string, line: number, shape: "row" | "inline" }[]}
 */
export function parseBible(source) {
  const declarations = [];

  source.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;

    for (const match of line.matchAll(/`--([a-z0-9-]+)\s+(#[0-9a-f]{6})`/gi)) {
      declarations.push({
        token: match[1].toLowerCase(),
        value: match[2].toLowerCase(),
        line: lineNumber,
        shape: "inline",
      });
    }

    if (!line.trimStart().startsWith("|")) return;
    const row = cells(line);
    if (row.length < 2) return;
    const values = hexList(row[0]);
    const tokens = tokenList(row[1]);
    // Pairing by position is only meaningful when the counts match; a row that
    // names three values and two tokens is prose, not a declaration.
    if (values === null || tokens === null || values.length !== tokens.length) return;

    tokens.forEach((token, at) => {
      declarations.push({ token, value: values[at], line: lineNumber, shape: "row" });
    });
  });

  return declarations;
}

/**
 * Compare the bible's declarations against the token source.
 *
 * @param {{ bibleSource: string, tokensSource: string }} input
 * @returns {{
 *   status: "clean" | "drift",
 *   checked: number,
 *   missing: string[],
 *   violations: {
 *     token: string,
 *     line: number,
 *     problem: "drift" | "unknown-token" | "conflict" | "undeclared",
 *     bibleValue?: string,
 *     tokenValue?: string,
 *   }[],
 * }}
 */
export function checkParity({ bibleSource, tokensSource }) {
  const palette = parsePalette(tokensSource);
  const declarations = parseBible(bibleSource);
  const violations = [];
  const declared = new Map();
  let checked = 0;

  for (const declaration of declarations) {
    const { token, value, line } = declaration;
    const tokenEntry = palette.get(token);

    if (tokenEntry === undefined) {
      violations.push({ token, line, problem: "unknown-token" });
      continue;
    }

    const earlier = declared.get(token);
    if (earlier !== undefined && earlier.value !== value) {
      violations.push({
        token,
        line,
        problem: "conflict",
        bibleValue: value,
        tokenValue: earlier.value,
        note: `declared again on line ${earlier.line} as ${earlier.value}`,
      });
      continue;
    }

    declared.set(token, { value, line });
    checked += 1;

    if (value !== tokenEntry.value) {
      violations.push({
        token,
        line,
        problem: "drift",
        bibleValue: value,
        tokenValue: tokenEntry.value,
      });
    }
  }

  const missing = REQUIRED_TOKENS.filter((token) => !declared.has(token));
  for (const token of missing) {
    violations.push({ token, line: 0, problem: "undeclared" });
  }

  return {
    status: violations.length === 0 ? "clean" : "drift",
    checked,
    missing,
    violations,
  };
}

function usage(message) {
  if (message) console.error(`bible-tokens-parity: ${message}`);
  console.error(
    "usage: bible-tokens-parity [--bible <file>] [--tokens <file>] [--json]",
  );
  return 2;
}

function main(argv) {
  const root = resolve(import.meta.dirname, "..");
  const options = {
    bible: resolve(root, "design/art/art-bible.md"),
    tokens: resolve(root, "design/tokens/tokens.ts"),
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--bible") options.bible = resolve(argv[(index += 1)] ?? "");
    else if (arg === "--tokens") options.tokens = resolve(argv[(index += 1)] ?? "");
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") return usage();
    else return usage(`unknown argument: ${arg}`);
  }

  for (const [label, path] of [
    ["bible", options.bible],
    ["tokens", options.tokens],
  ]) {
    if (!existsSync(path)) {
      return usage(`the ${label} file does not exist: ${path}`);
    }
  }

  let report;
  try {
    report = checkParity({
      bibleSource: readFileSync(options.bible, "utf8"),
      tokensSource: readFileSync(options.tokens, "utf8"),
    });
  } catch (error) {
    console.error(`bible-tokens-parity: ${error.message}`);
    return 2;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report.status === "clean" ? 0 : 1;
  }

  if (report.status === "clean") {
    console.log(
      `bible-tokens-parity: clean (${report.checked} declarations, ` +
        `${REQUIRED_TOKENS.length} required tokens agree with tokens.ts)`,
    );
    return 0;
  }

  const file = options.bible;
  console.error(
    `bible-tokens-parity: ${report.violations.length} problem(s) — the bible and tokens.ts disagree`,
  );
  for (const violation of report.violations) {
    if (violation.problem === "undeclared") {
      console.error(
        `  undeclared ${file}  --${violation.token}  no palette row or inline value declares it`,
      );
      continue;
    }
    if (violation.problem === "unknown-token") {
      console.error(
        `  unknown-token ${file}:${violation.line}  --${violation.token}  tokens.ts has no such palette key`,
      );
      continue;
    }
    if (violation.problem === "conflict") {
      console.error(
        `  conflict ${file}:${violation.line}  --${violation.token}  ${violation.bibleValue} here, ` +
          `${violation.tokenValue} ${violation.note ?? "earlier"}`,
      );
      continue;
    }
    console.error(
      `  drift ${file}:${violation.line}  --${violation.token}  bible ${violation.bibleValue} ` +
        `!= token ${violation.tokenValue}`,
    );
  }
  console.error("Fix the document (or raise the token through an art-bible edit), never the gate.");
  return 1;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
