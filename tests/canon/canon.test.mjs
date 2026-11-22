/**
 * canon-check — gate tests.
 *
 * The gate is a CLI whose exit code is the contract, so every case spawns it and
 * asserts (exit code, parsed report). The fixtures under `fixtures/` are the
 * seeded failures; the last case runs the gate against this repo, so any new
 * canon drift in `design/ docs/ src/ AGENTS.md PRD.md README.md index.html`
 * fails CI.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const script = join(repoRoot, "scripts/canon-check.mjs");

/** Run the gate and return exit code plus the parsed JSON report. */
function run(argv) {
  const result = spawnSync(process.execPath, [script, "--json", ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  const parsed = result.stdout.trim() === "" ? null : JSON.parse(result.stdout);
  return { code: result.status, report: parsed, stderr: result.stderr };
}

function fixture(name, extra = []) {
  return run(["--root", join(here, "fixtures", name), ...extra]);
}

describe("canon-check: seeded failure", () => {
  it("flags every forbidden family and exits 1", () => {
    const { code, report } = fixture("seeded");
    expect(code).toBe(1);
    expect(report.status).toBe("violations");
    const rules = new Set(report.violations.map((violation) => violation.rule));
    expect(rules).toEqual(
      new Set([
        "entity-de",
        "entity-en",
        "verb-de",
        "verb-en",
        "heft",
        "water-de",
        "water-en",
        "bang",
      ]),
    );
    expect(
      report.violations.some(
        (violation) => violation.file === "src/copy.ts" && violation.rule === "entity-de",
      ),
    ).toBe(true);
  });

  it("reports file, line and rule for every hit", () => {
    const { report } = fixture("seeded");
    for (const violation of report.violations) {
      expect(violation.file).toMatch(/\.(md|ts)$/);
      expect(violation.line).toBeGreaterThan(0);
      expect(violation.column).toBeGreaterThan(0);
      expect(violation.rule).toBeTruthy();
    }
  });
});

describe("canon-check: clean run", () => {
  it("passes a corpus that only uses the archival concept and key names", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.violations).toEqual([]);
  });

  it("passes the real repo", () => {
    const { code, report } = run([]);
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.allowlist.baseline).toBeLessThanOrEqual(report.allowlist.maxBaseline);
  });

  it("scans the page shell and the readme (D12)", () => {
    const { report } = run([]);
    expect(report.scanned).toContain("index.html");
    expect(report.scanned).toContain("README.md");
    expect(report.scanned).toHaveLength(report.files);
  });
});

describe("canon-check: scanned surfaces (D12)", () => {
  it("reads index.html: a copy attribute and a text node are both live", () => {
    const { code, report } = fixture("unscanned-surface");
    expect(code).toBe(1);
    const hits = report.violations.filter((violation) => violation.file === "index.html");
    // Two distinct lines: the <meta content> value and the <h1> text node. One
    // hit would prove only that the file is opened, not that both surfaces are
    // read — the half-scanned surface is the blind spot this closes.
    expect(new Set(hits.map((violation) => violation.line)).size).toBeGreaterThan(1);
    expect(hits.every((violation) => violation.rule === "entity-de")).toBe(true);
    expect(hits.map((violation) => violation.term)).toContain("Kartenkatalog");
  });

  it("leaves markup that is not copy alone — ids, class hooks, attributes", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.scanned).toContain("index.html");
  });
});

describe("canon-check: masked HTML regions (D12)", () => {
  it("treats an uppercase closing tag as a close", () => {
    const { report } = fixture("masked-regions");
    const hits = report.violations.filter((violation) =>
      violation.file.endsWith("c-uppercase.html"),
    );
    // </SCRIPT> must close the masked region; the live copy on line 4 must be read.
    expect(hits.map((violation) => violation.line)).toEqual([4]);
  });

  it("never reads a <style>, <script> or comment body as copy", () => {
    const { code, report } = fixture("masked-regions");
    expect(code).toBe(1);
    const hits = report.violations.filter((violation) => violation.file === "index.html");
    // Only the three live surfaces after the masked block: the <h1> text node,
    // the alt and the aria-label. A hit on lines 5–17 would mean a masked region
    // was read as copy — the blind spot this closes.
    expect(hits.map((violation) => violation.line)).toEqual([20, 21, 22]);
    expect(new Set(hits.map((violation) => violation.rule))).toEqual(new Set(["entity-de"]));
  });

  it("still fails real copy and copy attributes in the same file", () => {
    const { report } = fixture("masked-regions");
    const terms = report.violations
      .filter((violation) => violation.file === "index.html")
      .map((violation) => violation.term);
    expect(terms).toContain("Kartenkatalog");
    expect(terms).toContain("Katalog");
  });

  it("resets the masking state per file, not per run", () => {
    const { report } = fixture("masked-regions");
    expect(
      report.violations.filter((violation) => violation.file === "design/a-open-comment.html"),
    ).toEqual([]);
    expect(
      report.violations
        .filter((violation) => violation.file === "design/b-live.html")
        .map((violation) => violation.line),
    ).toEqual([1]);
  });
});

describe("canon-check: copy-bearing HTML attributes (D12)", () => {
  it("reads alt, aria-label, title, placeholder and value", () => {
    const { code, report } = fixture("html-attributes");
    expect(code).toBe(1);
    const hits = report.violations.filter((violation) => violation.file === "index.html");
    // One per attribute, on the attribute's own line: a rule that reads only
    // `content` would pass this file with a single hit.
    expect(hits.map((violation) => violation.line)).toEqual([6, 8, 9, 10, 11]);
    expect(hits.every((violation) => violation.rule === "entity-de")).toBe(true);
    expect(hits.map((violation) => violation.term)).toEqual([
      "Katalog",
      "Katalog",
      "Katalog",
      "Katalog",
      "Katalog",
    ]);
  });

  it("reads an attribute value past the 500-character mark", () => {
    const { code, report } = fixture("long-attribute");
    expect(code).toBe(1);
    const hits = report.violations.filter((violation) => violation.file === "index.html");
    expect(hits.map((violation) => violation.term)).toContain("Kartenkatalog");
    expect(hits[0]?.column).toBeGreaterThan(500);
  });
});

describe("canon-check: bare-word case forms (D12)", () => {
  it("flags CataLog and cataLOGUE", () => {
    const { code, report } = fixture("case-forms");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-en")
      .map((violation) => violation.term);
    expect(terms).toContain("CataLog");
    expect(terms).toContain("cataLOGUE");
  });

  it("leaves mixed-case identifiers alone", () => {
    const { report } = fixture("case-forms");
    // Only the two seeded lines; the `seedCatalogue`/`totalInCatalogue` line is
    // code, and a case-insensitive rule must not turn it into copy.
    expect(report.violations.map((violation) => violation.line)).toEqual([3, 4]);
  });
});

describe("canon-check: compound naming (D12)", () => {
  it("flags a German compound the `\\bKatalog\\b` rule could not reach", () => {
    const { code, report } = fixture("compound-de");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-de")
      .map((violation) => violation.term);
    expect(terms).toContain("Kartenkatalog");
    expect(terms).toContain("Kartenkataloges");
  });

  it('flags the English compound `cardcatalogue`', () => {
    const { code, report } = fixture("compound-en");
    expect(code).toBe(1);
    const terms = report.violations
      .filter((violation) => violation.rule === "entity-en")
      .map((violation) => violation.term);
    expect(terms).toContain("cardcatalogue");
    expect(terms).toContain("archivecatalogue");
  });
});

describe("canon-check: allowlist discipline", () => {
  it("excuses exactly one reasoned line", () => {
    const { code, report } = fixture("allowlisted");
    expect(code).toBe(0);
    expect(report.allowlist.allowed).toBe(1);
    expect(report.allowlist.baseline).toBe(0);
  });

  it("applies an entry whose `file` key uses the Windows separator", () => {
    // The key is data, not host output: an author on a Windows checkout writes
    // `design\spec.md`, a Linux author writes `design/spec.md`, and both must
    // cover the same line. Before the fix the comparison normalised only the
    // scanned path, so this entry covered nothing and the row read as a defect.
    const { code, report } = fixture("backslash-allowlist");
    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.allowlist.allowed).toBe(1);
  });

  it("counts a Windows-keyed baseline row instead of painting it green", () => {
    // `--strict`, `baselineHits` and the cap all read `entry.file`; a key in the
    // other host's shape must still resolve to its row, or a known defect stops
    // being counted and the ratchet reports a pass it did not earn.
    const { code, report } = fixture("backslash-baseline");
    expect(code).toBe(0);
    expect(report.allowlist.baseline).toBe(1);
    expect(report.allowlist.baselineHits).toBe(1);
  });

  it("fails a stale entry — the allowlist must not outlive the text", () => {
    const { code, report } = fixture("stale");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
    expect(report.errors.join("\n")).toMatch(/stale allowlist entry/);
  });

  it("fails a baseline entry that names no tracking issue", () => {
    const { code, report } = fixture("no-issue");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
  });

  it("rejects an entry without a reason", () => {
    const { code, report } = fixture("no-reason");
    expect(code).toBe(2);
    expect(report.status).toBe("error");
    expect(report.errors.join("\n")).toMatch(/needs a reason/);
  });
});

describe("canon-check: baseline ratchet", () => {
  it("warns but passes by default", () => {
    const { code, report } = fixture("baseline");
    expect(code).toBe(0);
    expect(report.allowlist.baseline).toBe(1);
    expect(report.allowlist.baselineHits).toBeGreaterThan(0);
  });

  it("fails under --strict", () => {
    const { code } = fixture("baseline", ["--strict"]);
    expect(code).toBe(1);
  });

  it("fails when the baseline grows past maxBaseline", () => {
    const { code, report } = fixture("overcap");
    expect(code).toBe(1);
    expect(report.violations.some((violation) => violation.rule === "baseline")).toBe(true);
  });
});

describe("canon-check: report paths", () => {
  it("reports POSIX paths on every host", () => {
    // The allowlist is written `design/art/art-bible.md`; a host that reported
    // `design\art\art-bible.md` would match no entry and a clean tree would read
    // as 128 violations. The report is the gate's contract, so it is host-neutral.
    const { report } = run([]);
    expect(report.scanned.filter((path) => path.includes("\\"))).toEqual([]);
  });
});

describe("canon-check: Svelte template surface (D12b)", () => {
  const svelteHits = () => {
    const { report } = fixture("svelte-template");
    return report.violations.filter((violation) => violation.file === "src/App.svelte");
  };

  it("flags template text for the German and the English entity rule", () => {
    const { code } = fixture("svelte-template");
    expect(code).toBe(1);
    const rules = svelteHits()
      .filter((violation) => violation.line === 7 || violation.line === 8)
      .map((violation) => `${violation.line}:${violation.rule}`);
    expect(rules).toEqual(["7:entity-de", "8:entity-en"]);
  });

  it("flags copy-bearing attributes: alt, aria-label, title, placeholder", () => {
    const lines = svelteHits()
      .filter((violation) => violation.line > 8 && violation.line < 16)
      .map((violation) => violation.line);
    expect(lines).toEqual([11, 13, 14, 15]);
  });

  it("never reads a <script>, <style> or comment body as copy", () => {
    // Line 3 (script literal) and line 20 (stylesheet content) are the ones a
    // string-literal reader would flag; a hit on them is the false positive this
    // masks. Line 25 proves the state closes.
    expect(svelteHits().map((violation) => violation.line)).toEqual([
      7, 8, 11, 13, 14, 15, 25,
    ]);
  });

  it("leaves class/id hooks alone", () => {
    const terms = svelteHits().map((violation) => violation.term);
    expect(terms).not.toContain("katalog-grid");
    expect(terms).not.toContain("katalog-liste");
    expect(svelteHits().some((violation) => violation.line === 6)).toBe(false);
  });

  it("keeps the archival concept legal in Svelte markup", () => {
    const { code, report } = fixture("clean");
    expect(code).toBe(0);
    expect(report.scanned).toContain("src/Clean.svelte");
  });
});

describe("canon-check: the real tree (D12b)", () => {
  it("names every Svelte template whose text it read", () => {
    // `scanned` already listed the file before #49; this is the assertion that the
    // *template* was read, so a regression to markup-only is a red test.
    const { report } = run([]);
    expect(report.templates).toEqual([
      "src/App.svelte",
      "src/lib/components/CardFace.svelte",
    ]);
  });

  it("keeps the real tree clean and the baseline empty", () => {
    const { code, report } = run([]);
    expect(code).toBe(0);
    // main after #72: the #31 baseline burned down to zero; this ticket adds no entry.
    expect(report.allowlist.maxBaseline).toBe(0);
    expect(report.allowlist.baseline).toBe(0);
  });
});
