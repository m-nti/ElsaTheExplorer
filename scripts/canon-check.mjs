#!/usr/bin/env node
/**
 * canon-check — the canon/vocabulary gate for Elsa the Explorer.
 *
 * The collection entity is **Die Sammlung / The Collection** (owner ruling D-04b,
 * `docs/decisions.md`). "Katalog"/"Catalogue" survive only where they name the
 * archival *concept* (catalogue number, register, certificate, entry), a code
 * identifier, a copy key, or a history row. `Heft`/`Sammelheft` are retired with
 * no exception. The progress verb is `gesammelt / collected`, never
 * `katalogisiert / catalogued`. The archive contains no water content
 * (`AGENTS.md` canon, 2026-11-22). Announced, error and destructive copy carry no
 * exclamation mark (`design/copy/copy-deck.md` §0.4.4, D26).
 *
 * Rule scopes — this is the one judgement the gate makes, and it is deliberate:
 *
 * - **`any`** (every scanned line): `Heft`, the progress verb, water vocabulary.
 *   These words have no legitimate use outside a rule declaration or a history
 *   row, so they are banned in prose too.
 * - **`live`** (live-copy surfaces only): the collection *naming* rules. D-04b
 *   keeps the archival concept alive ("catalogue number", "the catalogue as an
 *   index"), and the design corpus uses that concept in prose throughout. The
 *   ban applies where a string can reach a visitor: string literals in `src/**`,
 *   quoted copy in specs, the DE/EN value cells of the copy deck, and the
 *   visitor-facing shell (`index.html`: copy-bearing attributes and text nodes).
 *
 * Scanned roots are the whole gated corpus, not a sample: every document the
 * phase owns plus the page shell. `README.md` and `index.html` are listed for
 * exactly the reason they were once excluded — they reach a visitor, so "rules
 * by care" is not a proof. Machines-only roots stay out (see `SKIP_DIRS`).
 *
 * Every exemption is an explicit, reasoned entry in
 * `scripts/canon-allowlist.json`. Each entry must still match exactly one line;
 * an entry that no longer matches is a **stale entry** and fails the gate
 * (exit 2), so the allowlist cannot rot into a blanket permission. Entries with
 * `"status": "baseline"` mark a known canon defect in a file the gate's ticket
 * may not edit. They are printed as warnings, capped by `maxBaseline`, and
 * `--strict` fails on them.
 *
 * Usage:
 *   node scripts/canon-check.mjs                # gate the repo
 *   node scripts/canon-check.mjs --strict       # fail on baseline entries too
 *   node scripts/canon-check.mjs --json         # machine-readable report
 *   node scripts/canon-check.mjs --root <dir>   # gate a fixture root (tests)
 *
 * Exit codes: 0 = clean (baseline is a warning), 1 = violations found,
 *             2 = usage or allowlist configuration error.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const DEFAULT_ROOTS = [
  "design",
  "docs",
  "src",
  "AGENTS.md",
  "PRD.md",
  "README.md",
  "index.html",
];
const DEFAULT_ALLOWLIST = "scripts/canon-allowlist.json";

/**
 * Allowlist paths are written POSIX-style (`docs/test-plan.md`) on every host,
 * but `node:path.relative()` returns `docs\test-plan.md` on Windows. Comparing
 * the two raw made every allowlisted hit report as a violation on Windows and
 * only on Windows (#67) — CI stayed green because it runs on Linux, so the gate
 * disagreed with itself between the host the owner uses and the host CI uses.
 * Normalise both sides of a comparison; on POSIX this is a no-op.
 */
const toPosix = (path) => path.split(sep).join("/");

/** Directories that are build output, dependencies, fixtures or archives. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".svelte-check",
  "styled-system",
  "reports",
  "qa-shots",
  "photos",
  "legacy",
  ".vite",
]);

/** Only text files: a binary hit would be a false positive by construction. */
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".svelte",
  ".css",
  ".json",
  ".yml",
  ".yaml",
  ".html",
]);

/**
 * Canon rules. `scope: "live"` rules run only inside live-copy segments; a
 * global pattern is required because every hit is enumerated per line.
 *
 * The two *entity* rules match compounds, because a compound names the
 * collection exactly as the bare word does: "Kartenkatalog" and
 * "cardcatalogue" are the retired name written as one word (D-04b). The head is
 * matched **word-finally** — German and English both put the head last — so
 * "Katalogkarte"/"Katalogkarten" (the archival instrument) stay legal, and a
 * prefix of *lowercase* letters keeps mixed-case identifiers out of scope:
 * `seedCatalogue`, `totalInCatalogue`, `normalizeCatalogueKey`. A bare lowercase
 * German "katalog" is not a compound head and not a noun, so it is left alone
 * (`#katalog`, `nav:katalog` are ids, and `INLINE_EXEMPTIONS` covers the
 * URL-shaped ones anyway). All-caps English headings are matched explicitly so
 * the rule cannot silently lose a case form when the `i` flag is dropped.
 */
const RULES = [
  {
    id: "entity-de",
    scope: "live",
    label: 'German "Katalog"/compound naming the collection (canon: Die Sammlung)',
    pattern:
      /(?<![A-Za-zÄÖÜäöüß])Katalog(?:es|en|e|s)?(?![A-Za-zÄÖÜäöüß])|(?<![A-Za-zÄÖÜäöüß])[A-ZÄÖÜ]?[a-zäöüß]+katalog(?:es|en|e|s)?(?![A-Za-zÄÖÜäöüß])/g,
  },
  {
    id: "entity-en",
    scope: "live",
    label:
      'English "catalogue"/"catalog"/compound naming the collection (canon: The Collection)',
    pattern:
      /(?<![A-Za-z])(?:[Cc][Aa][Tt][Aa][Ll][Oo][Gg](?:[Uu][Ee])?)s?(?![A-Za-z])|(?<![A-Za-z])[A-Z]?[a-z]+(?:catalogue|catalog)s?(?![A-Za-z])/g,
  },
  {
    id: "verb-de",
    scope: "any",
    label: 'Progress verb "katalogisiert" (canon: gesammelt)',
    pattern: /\bkatalogisiert\w*/gi,
  },
  {
    id: "verb-en",
    scope: "any",
    label: 'Progress verb "catalogued"/"cataloged" (canon: collected)',
    pattern: /\b(?:catalogued|cataloged)\b/gi,
  },
  {
    id: "heft",
    scope: "any",
    label: '"Heft"/"Sammelheft" (retired with no exception)',
    pattern: /\b(?:Sammel)?Heft(?:e|en|s)?\b/g,
  },
  {
    id: "water-de",
    scope: "any",
    label: "German water vocabulary (canon: Elsa hates water)",
    pattern:
      /\b(?:Regen|Regens|regnen|regnet|verregnet|Schlamm\w*|Nass\w*|nass\w*|Nässe\w*|durchnässt\w*|Bad|Bade\w*|Wanne\w*)\b/g,
  },
  {
    id: "water-en",
    scope: "any",
    label: "English water vocabulary (canon: Elsa hates water)",
    pattern:
      /\b(?:wet|wets|wetted|wetting|rain|rains|rained|raining|rainy|mud|muds|muddy|bath|baths|bathe|bathes|bathing|bathroom)\b/gi,
  },
];

const RULE_IDS = new Set([...RULES.map((rule) => rule.id), "bang"]);

/** Copy keys that must never carry an exclamation mark (§0.4.4, D26). */
const NO_BANG_KEY =
  /^(?:state\.error|state\.offline|reset\.|live\.|aria\.|a11y\.|announce\.|set\.complete\.announce|capstone\.announce)/;

/**
 * Inline exemptions — the archival *concept* D-04b keeps alive. These are
 * structural (the term is part of a compound or a key, not a name), so they are
 * not repeated in the allowlist; every prose-shaped exemption still is.
 */
const INLINE_EXEMPTIONS = [
  // `catalogue.title`, `catalogue:milestone-reached`, `catalogue.ts`, `lib/catalog.ts`
  /\bcatalogue[.:][A-Za-z0-9_.:-]+/gi,
  /\bcatalog[.:][A-Za-z0-9_.:-]+/gi,
  // member/key access: `state.error.catalogue`, `nav.catalogue`
  /\b[A-Za-z0-9_$-]+\.(?:catalogue|catalog)s?\b/gi,
  // catalogue number / register / certificate / entry / card
  /\bcatalogue[\s-]+(?:number|numbers|register|certificate|entry|entries|card|catalogue)\b/gi,
  // museum catalogue, archive catalogue, card catalogue
  /\b(?:museum|archive|card)[\s-]+catalogue\b/gi,
  // Katalog-Nummer / Katalog-Register / Katalog-Zertifikat
  /\bKatalog(?:-|\s)+(?:Nummer|Register|Zertifikat|Eintrag|Karten|Karte)\b/g,
  // URL-shaped ids, not copy: `#katalog`, `/kartenkatalog`, `?catalog=1`.
  // The anchor ids in `design/ux/*` are identifiers even when quoted.
  /[#?&/][A-Za-z0-9_./-]*(?:katalog|catalogue|catalog)[A-Za-z0-9_./-]*/gi,
];

function usage(message) {
  if (message) console.error(`canon-check: ${message}`);
  console.error(
    "usage: canon-check [--root <dir>] [--allowlist <file>] [--strict] [--json]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  const options = { root: process.cwd(), allowlist: null, strict: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = resolve(argv[(index += 1)] ?? "");
    else if (arg === "--allowlist") options.allowlist = resolve(argv[(index += 1)] ?? "");
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") usage();
    else usage(`unknown argument: ${arg}`);
  }
  return options;
}

function walk(target, out = []) {
  if (!existsSync(target)) return out;
  let entries;
  try {
    entries = readdirSync(target, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(target, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const dot = entry.name.lastIndexOf(".");
    if (dot === -1) continue;
    if (!TEXT_EXTENSIONS.has(entry.name.slice(dot).toLowerCase())) continue;
    out.push(full);
  }
  return out;
}

function readScanFiles(root, roots) {
  const files = [];
  for (const rootEntry of roots) {
    const target = resolve(root, rootEntry);
    if (!existsSync(target)) continue;
    // A root may be a directory or a single file (PRD.md, AGENTS.md).
    if (statSync(target).isDirectory()) {
      for (const file of walk(target)) files.push(file);
    } else {
      const dot = target.lastIndexOf(".");
      if (dot !== -1 && TEXT_EXTENSIONS.has(target.slice(dot).toLowerCase())) files.push(target);
    }
  }
  return [...new Set(files)].sort();
}

function exemptSpans(text) {
  const spans = [];
  for (const pattern of INLINE_EXEMPTIONS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      spans.push([match.index, match.index + match[0].length]);
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  return spans;
}

function insideSpans(index, length, spans) {
  return spans.some(([start, end]) => index >= start && index + length <= end);
}

/**
 * HTML: which attributes carry copy, and every attribute assignment (markup).
 *
 * `class`/`id`/`href` values are identifiers and are masked, never scanned; the
 * copy-bearing attributes are the ones a visitor can read (`meta description`
 * through `content`, an `alt`, an `aria-label`). Text nodes are scanned too —
 * an `<h1>Der Katalog</h1>` reaches the visitor just as the meta description
 * does, and a surface that is "scanned" but half-read is the blind spot this
 * was written to close.
 */
const HTML_ATTRIBUTE =
  /(?:^|[\s<])([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')/g;
const copyAttributeNames = new Set([
  "aria-description",
  "aria-label",
  "aria-roledescription",
  "alt",
  "content",
  "placeholder",
  "title",
  "value",
]);

/**
 * Live segments of one HTML line: the copy-bearing attribute values (in place)
 * and the visible text between tags.
 */
function htmlSegments(line) {
  const segments = [];
  const hidden = new Array(line.length).fill(false);
  const hide = (from, to) => {
    for (let index = from; index < to; index += 1) hidden[index] = true;
  };

  HTML_ATTRIBUTE.lastIndex = 0;
  let match;
  while ((match = HTML_ATTRIBUTE.exec(line)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? "";
    hide(match.index, match.index + match[0].length);
    if (!copyAttributeNames.has(name) || value === "") continue;
    const at = match[0].lastIndexOf(value);
    segments.push({ text: value, offset: match.index + (at === -1 ? 0 : at) });
  }

  // Mask the remaining markup by spans, not by parsing: a tag that spans several
  // lines (`<meta` on one line, `content=` on the next) must not be read as prose.
  for (const tag of line.matchAll(/<[^>]*>/g)) hide(tag.index, tag.index + tag[0].length);

  let start = -1;
  for (let index = 0; index <= line.length; index += 1) {
    const visible = index < line.length && !hidden[index];
    if (visible && start === -1) start = index;
    if (visible || start === -1) continue;
    const raw = line.slice(start, index);
    const text = raw.trim();
    if (text !== "") segments.push({ text, offset: start + raw.indexOf(text) });
    start = -1;
  }
  return segments;
}

/**
 * Mask the regions of an HTML file whose text is not visitor copy:
 * `<script>` and `<style>` bodies and `<!-- … -->` comments.
 *
 * Why a state machine and not a tag regex: those regions span lines, and their
 * bodies carry no markup at all, so a per-line tag mask reads them as text
 * nodes — `content: "Der Katalog"` in a stylesheet and a German string in a
 * module script both looked like page copy. The state is per file and is passed
 * back in, so a block opened on one line stays masked until its close.
 *
 * Every masked character is replaced by a space, so byte offsets — and with
 * them the reported columns — are identical to the raw line. The opening and
 * closing delimiters are masked too; a stray `>` after a close is inert.
 */
function maskHtmlRegions(line, state) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (state === "script" || state === "style" || state === "comment") {
      const close = state === "comment" ? "-->" : `</${state}`;
      // The open tag matches case-insensitively, so the close must too: `</SCRIPT>`
      // would otherwise leave the rest of the file masked (a silent false negative).
      const end = line.toLowerCase().indexOf(close, i);
      if (end === -1) return { masked: out + " ".repeat(line.length - i), state };
      out += " ".repeat(end + close.length - i);
      i = end + close.length;
      state = "text";
      continue;
    }
    const lt = line.indexOf("<", i);
    if (lt === -1) return { masked: out + line.slice(i), state };
    out += line.slice(i, lt);
    const rest = line.slice(lt);
    if (rest.startsWith("<!--")) {
      state = "comment";
      i = lt;
      continue;
    }
    if (/^<script\b/i.test(rest)) {
      state = "script";
      i = lt;
      continue;
    }
    if (/^<style\b/i.test(rest)) {
      state = "style";
      i = lt;
      continue;
    }
    const gt = line.indexOf(">", lt);
    if (gt === -1) return { masked: out + line.slice(lt), state };
    out += line.slice(lt, gt + 1);
    i = gt + 1;
  }
  return { masked: out, state };
}

/** Only the page shell is HTML; `.htm` is accepted because a host may serve it. */
function isHtmlFile(file) {
  return file.endsWith(".html") || file.endsWith(".htm");
}

/**
 * The live-copy surfaces of a line, as `{ text, offset }` segments.
 *
 * - `src/**`: string literals only. A module named `catalogue` or a local
 *   `const catalog` is code, not copy; only the text a visitor can be shown is
 *   in scope.
 * - copy deck: the DE and EN value cells of a keyed row.
 * - HTML: copy-bearing attribute values and text nodes (see `htmlSegments`).
 * - other docs: quoted strings — `"…"`, `*"…"*`, and German „…“.
 */
function liveSegments(line, file, relativeFile) {
  if (relativeFile === "src" || relativeFile.startsWith(`src${sep}`)) {
    const segments = [];
    const literal = /"([^"\\\n]{1,500})"|'([^'\\\n]{1,500})'|`([^`\\\n]{1,500})`/g;
    let match;
    while ((match = literal.exec(line)) !== null) {
      const text = match[1] ?? match[2] ?? match[3] ?? "";
      if (text === "") continue;
      segments.push({ text, offset: match.index + 1 });
    }
    return segments;
  }
  if (file.endsWith("copy-deck.md")) {
    const row = /^\|\s*`([^`]+)`\s*\|(.*)$/.exec(line);
    if (!row) return [];
    const cells = row[2].split("|");
    const segments = [];
    for (const cell of [cells[0] ?? "", cells[1] ?? ""]) {
      const text = cell.trim();
      if (text === "") continue;
      const offset = line.indexOf(text);
      segments.push({ text, offset: offset === -1 ? 0 : offset });
    }
    return segments;
  }
  if (file.endsWith(".html") || file.endsWith(".htm")) return htmlSegments(line);
  const segments = [];
  const quoted = /"([^"\n]{1,500})"|„([^“\n]{1,500})“/g;
  let match;
  while ((match = quoted.exec(line)) !== null) {
    const text = match[1] ?? match[2] ?? "";
    segments.push({ text, offset: match.index + 1 });
  }
  return segments;
}

/** Collect rule hits for one line. */
function scanLine(line, file, relativeFile, lineNumber) {
  const hits = [];
  const fullSpans = exemptSpans(line);
  const live = liveSegments(line, file, relativeFile);

  for (const rule of RULES) {
    const targets =
      rule.scope === "live"
        ? live.map((segment) => ({
            text: segment.text,
            offset: segment.offset,
            spans: exemptSpans(segment.text),
          }))
        : [{ text: line, offset: 0, spans: fullSpans }];

    for (const target of targets) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(target.text)) !== null) {
        if (match[0].length === 0) rule.pattern.lastIndex += 1;
        if (insideSpans(match.index, match[0].length, target.spans)) continue;
        hits.push({
          file,
          line: lineNumber,
          column: target.offset + match.index + 1,
          rule: rule.id,
          term: match[0],
        });
      }
    }
  }
  return hits;
}

/** Table rows in the copy deck: | `key` | DE | EN | cap | notes | refs | */
function copyDeckBangHit(line, file, lineNumber) {
  const row = /^\|\s*`([^`]+)`\s*\|(.*)$/.exec(line);
  if (!row) return null;
  const key = row[1].trim();
  if (!NO_BANG_KEY.test(key)) return null;
  const cells = row[2].split("|");
  for (const raw of [cells[0] ?? "", cells[1] ?? ""]) {
    // History is not a live value: strikethrough and inline code are exempt.
    const value = raw.replace(/~~[\s\S]*?~~/g, "").replace(/`[^`]*`/g, "");
    if (value.includes("!")) {
      return {
        file,
        line: lineNumber,
        column: line.indexOf("!") + 1,
        rule: "bang",
        term: "!",
        key,
      };
    }
  }
  return null;
}

/** Dictionary literals in src/: "key": "value". */
function sourceBangHits(line, file, lineNumber) {
  const hits = [];
  const literal = /["']([a-z][\w.:-]*)["']\s*:\s*["'`]([^"'`]*)["'`]/g;
  let match;
  while ((match = literal.exec(line)) !== null) {
    const key = match[1];
    const value = match[2];
    if (!NO_BANG_KEY.test(key)) continue;
    if (!value.includes("!")) continue;
    hits.push({
      file,
      line: lineNumber,
      column: line.indexOf("!", match.index) + 1,
      rule: "bang",
      term: "!",
      key,
    });
  }
  return hits;
}

function loadAllowlist(path) {
  if (!existsSync(path)) return { entries: [], maxBaseline: 0, errors: [] };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      entries: [],
      maxBaseline: 0,
      errors: [`allowlist is not valid JSON (${path}): ${error.message}`],
    };
  }
  const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  const errors = [];
  for (const entry of entries) {
    if (typeof entry.file !== "string" || typeof entry.match !== "string") {
      errors.push("every allowlist entry needs `file` and `match` strings");
      continue;
    }
    if (entry.status !== "allowed" && entry.status !== "baseline") {
      errors.push(
        `allowlist entry for ${entry.file} has status "${entry.status}" (expected "allowed" or "baseline")`,
      );
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      errors.push(`allowlist entry for ${entry.file} ("${entry.match}") needs a reason`);
      continue;
    }
    if (entry.rule && !RULE_IDS.has(entry.rule)) {
      errors.push(`allowlist entry for ${entry.file} names unknown rule "${entry.rule}"`);
      continue;
    }
    if (entry.status === "baseline" && entry.issue === undefined) {
      errors.push(
        `baseline entry for ${entry.file} ("${entry.match}") must name the tracking issue`,
      );
    }
  }
  return {
    entries,
    maxBaseline: Number.isInteger(parsed.maxBaseline) ? parsed.maxBaseline : Number.POSITIVE_INFINITY,
    errors,
  };
}

/**
 * Apply the allowlist. An entry covers every hit on the single line it matches
 * (or only its named rule when `rule` is set). Stale and ambiguous entries are
 * configuration errors: the allowlist must not outlive the text it excuses.
 */
function applyAllowlist(violations, sources, entries, root) {
  const byFile = new Map();
  for (const entry of entries) {
    if (!byFile.has(entry.file)) byFile.set(entry.file, []);
    byFile.get(entry.file).push(entry);
  }

  const covered = new Set(); // `${file}:${line}:${rule}`
  const used = new Set();
  const errors = [];

  for (const [file, fileEntries] of byFile) {
    const absolute = resolve(root, file);
    if (!sources.has(absolute)) {
      errors.push(`allowlist names a file the scan never read: ${file}`);
      continue;
    }
    const lines = sources.get(absolute);
    for (const entry of fileEntries) {
      const matches = [];
      for (let index = 0; index < lines.length; index += 1) {
        if (lines[index].includes(entry.match)) matches.push(index + 1);
      }
      if (matches.length === 0) {
        errors.push(
          `stale allowlist entry: ${file} no longer contains "${entry.match}" (${entry.status})`,
        );
        continue;
      }
      if (matches.length > 1) {
        errors.push(
          `ambiguous allowlist entry: "${entry.match}" appears on ${file} lines ${matches.join(", ")}; use a longer match`,
        );
        continue;
      }
      used.add(entry);
      for (const violation of violations) {
        if (toPosix(relative(root, violation.file)) !== toPosix(file) || violation.line !== matches[0]) continue;
        if (entry.rule && violation.rule !== entry.rule) continue;
        covered.add(`${violation.file}:${violation.line}:${violation.rule}`);
      }
    }
  }

  const active = violations.filter(
    (violation) => !covered.has(`${violation.file}:${violation.line}:${violation.rule}`),
  );

  return { active, errors, used };
}

function describe(violation, root) {
  const file = relative(root, violation.file);
  return `  ${violation.rule.padEnd(10)} ${file}:${violation.line}:${violation.column}  ${violation.term}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const allowlistPath = options.allowlist ?? resolve(options.root, DEFAULT_ALLOWLIST);
  const { entries, maxBaseline, errors: allowlistErrors } = loadAllowlist(allowlistPath);

  if (allowlistErrors.length > 0) {
    if (options.json) {
      process.stdout.write(
        JSON.stringify({ status: "error", errors: allowlistErrors }, null, 2) + "\n",
      );
    } else {
      console.error(`canon-check: allowlist problem(s) in ${relative(options.root, allowlistPath)}`);
      for (const error of allowlistErrors) console.error(`  ${error}`);
    }
    process.exit(2);
  }

  const files = readScanFiles(options.root, DEFAULT_ROOTS);
  const sources = new Map();
  const violations = [];
  let lineCount = 0;

  for (const file of files) {
    const raw = readFileSync(file);
    if (raw.includes(0)) continue; // binary
    const text = raw.toString("utf8");
    const lines = text.split(/\r?\n/);
    const relativeFile = relative(options.root, file);
    const firstSegment = relativeFile.split(sep)[0];
    sources.set(file, lines);
    lineCount += lines.length;
    // HTML only: script/style/comment bodies are masked before scanning, with the
    // state carried across lines. `sources` keeps the raw text for the allowlist.
    let htmlState = "text";
    for (let index = 0; index < lines.length; index += 1) {
      let line = lines[index];
      if (isHtmlFile(file)) {
        const masked = maskHtmlRegions(line, htmlState);
        line = masked.masked;
        htmlState = masked.state;
      }
      const lineNumber = index + 1;
      const hits = scanLine(line, file, firstSegment, lineNumber);
      if (file.endsWith("copy-deck.md")) {
        const bang = copyDeckBangHit(line, file, lineNumber);
        if (bang) hits.push(bang);
      }
      if (firstSegment === "src" && file.endsWith(".ts")) {
        hits.push(...sourceBangHits(line, file, lineNumber));
      }
      // Two identical copy cells, or a rule hit inside two segments, must not
      // double-count: a hit is a (file, line, column, rule) fact.
      const seen = new Set();
      for (const hit of hits) {
        const key = `${hit.rule}:${hit.line}:${hit.column}`;
        if (seen.has(key)) continue;
        seen.add(key);
        violations.push(hit);
      }
    }
  }

  const { active, errors, used } = applyAllowlist(violations, sources, entries, options.root);

  if (errors.length > 0) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ status: "error", errors }, null, 2) + "\n");
    } else {
      console.error(`canon-check: allowlist problem(s) in ${relative(options.root, allowlistPath)}`);
      for (const error of errors) console.error(`  ${error}`);
      console.error("Fix the allowlist entry (or the text) before the gate can run.");
    }
    process.exit(2);
  }

  const usedEntries = entries.filter((entry) => used.has(entry));
  const baseline = usedEntries.filter((entry) => entry.status === "baseline");
  const allowed = usedEntries.filter((entry) => entry.status === "allowed");
  const baselineHits = violations.filter((violation) =>
    baseline.some(
      (entry) =>
        toPosix(relative(options.root, violation.file)) === toPosix(entry.file) &&
        sources.get(resolve(options.root, entry.file))?.[violation.line - 1]?.includes(entry.match),
    ),
  );

  if (baseline.length > maxBaseline) {
    active.push({
      file: allowlistPath,
      line: 1,
      column: 1,
      rule: "baseline",
      term: `${baseline.length} baseline entries (cap ${maxBaseline})`,
    });
  }

  if (options.json) {
    process.stdout.write(
      JSON.stringify(
        {
          status: active.length === 0 ? "clean" : "violations",
          files: files.length,
          // The gated surface, by path: "index.html is scanned" is an assertion
          // a test can make, not a claim in a comment. POSIX on every host, so
          // the report, the allowlist and the tests speak one path dialect (#67).
          scanned: files.map((file) => toPosix(relative(options.root, file))),
          lines: lineCount,
          rules: [...RULES.map((rule) => rule.id), "bang"],
          allowlist: {
            allowed: allowed.length,
            baseline: baseline.length,
            maxBaseline,
            baselineHits: baselineHits.length,
          },
          violations: active.map((violation) => ({
            file: toPosix(relative(options.root, violation.file)),
            line: violation.line,
            column: violation.column,
            rule: violation.rule,
            term: violation.term,
          })),
        },
        null,
        2,
      ) + "\n",
    );
  } else if (active.length > 0) {
    const fileCount = new Set(active.map((violation) => violation.file)).size;
    console.error(
      `canon-check: ${active.length} violation(s) in ${fileCount} file(s) — canon: Die Sammlung / The Collection, no Heft, no water`,
    );
    for (const violation of active) console.error(describe(violation, options.root));
    console.error(
      "Every hit is either rewritten or recorded in scripts/canon-allowlist.json with a reason.",
    );
  } else if (options.strict && baselineHits.length > 0) {
    console.error(
      `canon-check: ${baselineHits.length} baseline canon defect(s) — --strict fails on them`,
    );
    for (const violation of baselineHits) console.error(describe(violation, options.root));
  } else {
    const parts = [
      `canon-check: clean (${files.length} files, ${lineCount} lines, ${RULES.length + 1} rules)`,
      `${allowed.length} allowlisted line(s)`,
    ];
    if (baseline.length > 0) {
      const issues = [...new Set(baseline.map((entry) => entry.issue))].join(", #");
      parts.push(`${baseline.length} known defect(s) in the baseline (issue #${issues})`);
    }
    console.log(parts.join(" · "));
    if (baseline.length > 0) {
      console.log(
        "  baseline is a ratchet: it may shrink, never grow. `npm run canon:strict` fails on it.",
      );
    }
  }

  process.exit(active.length === 0 && !(options.strict && baselineHits.length > 0) ? 0 : 1);
}

main();
