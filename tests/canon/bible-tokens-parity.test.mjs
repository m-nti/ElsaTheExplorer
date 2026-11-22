/**
 * bible-tokens-parity — gate self-tests.
 *
 * #30 exists because the AD-ART-BIBLE pass found the bible quoting the retired
 * `--quiet #756e7d` and the retired credit `#928697` while `tokens.ts` had
 * already shipped the raised values. Nothing failed. These tests are the proof
 * that the gate now fails on that exact class of drift, in both directions:
 *
 * - the bible moved and the token did not,
 * - the token moved and the bible did not.
 *
 * They also pin the *parser* to the typed module: `parsePalette` must read every
 * key of the exported `palette`, including the `rgb(… / 14%)` hairlines that are
 * not hex, so the script's lightweight parser cannot quietly disagree with
 * `design/tokens/tokens.ts`. The last case gates this repository.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { palette } from "@tokens";
import { parsePalette, REQUIRED_TOKENS } from "../../scripts/bible-tokens-parity.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(here, "..", "..");
const script = join(repoRoot, "scripts", "bible-tokens-parity.mjs");
const biblePath = join(repoRoot, "design", "art", "art-bible.md");
const tokensPath = join(repoRoot, "design", "tokens", "tokens.ts");

const dirs = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Run the gate. `argv` is passed through; the caller reads exit code + report. */
function run(argv) {
  const result = spawnSync(process.execPath, [script, ...argv], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return {
    code: result.status,
    stderr: result.stderr,
    report: result.stdout.trim() === "" ? null : JSON.parse(result.stdout),
  };
}

/**
 * Seed a divergence: copy the bible and the token source into a temporary
 * directory, apply the mutators, run the gate with `--json`, and return the
 * exit code plus the parsed report.
 */
function seed({ bible = (text) => text, tokens = (text) => text } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "bible-parity-"));
  dirs.push(dir);
  const bibleFile = join(dir, "art-bible.md");
  const tokensFile = join(dir, "tokens.ts");
  writeFileSync(bibleFile, bible(readFileSync(biblePath, "utf8")));
  writeFileSync(tokensFile, tokens(readFileSync(tokensPath, "utf8")));
  const { code, report } = run(["--bible", bibleFile, "--tokens", tokensFile, "--json"]);
  return { code, report };
}

/** The quiet palette row as the bible writes it. */
const QUIET_ROW = "| `#978fa0` | `--quiet` |";

describe("seeded divergence — the bible moved", () => {
  it("fails when the bible still quotes the retired --quiet value", () => {
    const { code, report } = seed({
      bible: (text) => text.replace(QUIET_ROW, "| `#756e7d` | `--quiet` |"),
    });

    expect(code).toBe(1);
    expect(report.status).toBe("drift");
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        token: "quiet",
        problem: "drift",
        bibleValue: "#756e7d",
        tokenValue: "#978fa0",
      }),
    );
  });
});

describe("seeded divergence — the token moved", () => {
  it("fails when the token source changes and the bible does not", () => {
    const { code, report } = seed({
      tokens: (text) => text.replace('quiet: "#978fa0"', 'quiet: "#9a929f"'),
    });

    expect(code).toBe(1);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        token: "quiet",
        problem: "drift",
        bibleValue: "#978fa0",
        tokenValue: "#9a929f",
      }),
    );
  });
});

describe("the gate fails closed instead of skipping", () => {
  it("reports a required declaration that was deleted, never a pass", () => {
    // `--bg-raised` is declared exactly once, so removing its row leaves no
    // declaration behind: the floor must report it, not shrink to a pass.
    const { code, report } = seed({
      bible: (text) => text.replace(/^\| `#1b1823` \| `--bg-raised`.*\r?\n/m, ""),
    });

    expect(code).toBe(1);
    expect(report.missing).toContain("bg-raised");
    expect(report.violations).toContainEqual(
      expect.objectContaining({ token: "bg-raised", problem: "undeclared" }),
    );
  });

  it("still counts a token as declared when another surface restates it", () => {
    // §7 restates --quiet inline; deleting the §4 row alone leaves the token
    // declared, so this must not report it missing.
    const { report } = seed({
      bible: (text) => text.replace(/^\| `#978fa0` \| `--quiet`.*\r?\n/m, ""),
    });
    expect(report.missing).not.toContain("quiet");
  });

  it("rejects a token name the palette does not hold", () => {
    const { code, report } = seed({
      bible: (text) => `${text}\n\n| \`#ead7b7\` | \`--star-color\` | Star fill. |\n`,
    });

    expect(code).toBe(1);
    expect(report.violations).toContainEqual(
      expect.objectContaining({ token: "star-color", problem: "unknown-token" }),
    );
  });

  it("rejects two declarations of one token that disagree", () => {
    const { code, report } = seed({
      bible: (text) => `${text}\n\n\`--quiet #9a929f\`\n`,
    });

    expect(code).toBe(1);
    expect(report.violations).toContainEqual(
      expect.objectContaining({ token: "quiet", problem: "conflict" }),
    );
  });

  it("does not read a retired value quoted inside a role cell as the declaration", () => {
    const { report } = seed({});
    expect(report.violations.some((violation) => violation.token === "quiet")).toBe(false);
  });

  it("exits 2 on a path that does not exist instead of reporting clean", () => {
    const { code, stderr } = run(["--bible", join(repoRoot, "design/no-such-bible.md")]);
    expect(code).toBe(2);
    expect(stderr).toContain("no-such-bible.md");
  });
});

describe("seeded divergence — the credit regressed", () => {
  it("fails when the credit quote regresses to the retired 8px value", () => {
    const { code, report } = seed({
      bible: (text) => text.replace("`#9a8da0`", "`#928697`"),
    });

    expect(code).toBe(1);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        token: "print-credit",
        problem: "drift",
        bibleValue: "#928697",
        tokenValue: "#9a8da0",
      }),
    );
  });
});

describe("this repository", () => {
  it("declares every required token and every declaration agrees with tokens.ts", () => {
    const { code, report } = run(["--json"]);

    expect(code).toBe(0);
    expect(report.status).toBe("clean");
    expect(report.missing).toEqual([]);
    expect(report.checked).toBeGreaterThanOrEqual(REQUIRED_TOKENS.length);
  });
});

describe("the parser is pinned to the typed module", () => {
  it("reads every key of the exported palette, hairlines included", () => {
    const parsed = parsePalette(readFileSync(tokensPath, "utf8"));

    expect(parsed.size).toBe(Object.keys(palette).length);
    for (const [key, value] of Object.entries(palette)) {
      const token = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      expect(parsed.get(token)?.value, key).toBe(value.toLowerCase());
    }
  });

  it("declares a coverage floor that names quiet, metal and the print tokens", () => {
    expect(REQUIRED_TOKENS).toContain("quiet");
    expect(REQUIRED_TOKENS).toContain("metal");
    expect(REQUIRED_TOKENS).toContain("print-credit");
    expect(REQUIRED_TOKENS.filter((token) => token.startsWith("print-")).length).toBeGreaterThanOrEqual(15);
  });
});
