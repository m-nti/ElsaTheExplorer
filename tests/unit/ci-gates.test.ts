import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/ci-gates.mjs", import.meta.url));

type Fixture = {
  gates?: unknown;
  scripts?: Record<string, string>;
  workflow?: string;
};

const dirs: string[] = [];

function fixture({ gates, scripts = { canon: "node canon.mjs" }, workflow }: Fixture): string {
  const dir = mkdtempSync(join(tmpdir(), "ci-gates-"));
  dirs.push(dir);
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(dir, ".github", "gates.json"),
    JSON.stringify(gates ?? { enforced: [{ id: "canon", script: "canon" }], pending: [] }),
  );
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts }));
  writeFileSync(
    join(dir, ".github", "workflows", "ci.yml"),
    workflow ?? "steps:\n  - run: npm run canon\n",
  );
  return dir;
}

function run(root: string) {
  return spawnSync(process.execPath, [script, root], { encoding: "utf8" });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("gate manifest", () => {
  it("passes when every enforced gate has a script and a CI step", () => {
    const result = run(fixture({}));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 enforced (canon)");
  });

  it("fails when a declared script was deleted", () => {
    const result = run(fixture({ scripts: {}, workflow: "steps:\n  - run: npm run canon\n" }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no script "canon"');
  });

  it("fails when the CI step is missing", () => {
    const result = run(fixture({ workflow: "steps:\n  - run: echo skipped\n" }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("has no bare");
  });

  it("fails on --if-present, the original false-green", () => {
    const result = run(fixture({ workflow: "steps:\n  - run: npm run --if-present canon\n" }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--if-present");
  });

  it("fails on continue-on-error, in any casing or expression form", () => {
    for (const value of ["true", "True", "${{ true }}"]) {
      const result = run(
        fixture({
          workflow: `steps:\n  - run: npm run canon\n    continue-on-error: ${value}\n`,
        }),
      );
      expect(result.status, value).toBe(1);
      expect(result.stderr).toContain("continue-on-error");
    }
  });

  it("fails when a gate step is gated on `if: false`, in any casing", () => {
    for (const value of ["false", "False", "${{ false }}"]) {
      const result = run(
        fixture({ workflow: `steps:\n  - run: npm run canon\n    if: ${value}\n` }),
      );
      expect(result.status, value).toBe(1);
      expect(result.stderr).toContain("if: false");
    }
  });

  it("fails on `|| exit 0`", () => {
    const result = run(
      fixture({ workflow: "steps:\n  - run: npm run canon || exit 0\n" }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exit 0");
  });

  it("fails on `|| :` even with a redirect before it", () => {
    const result = run(
      fixture({ workflow: "steps:\n  - run: npm run canon 2>/dev/null || :\n" }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("|| true");
  });

  it("does not accept a step whose name mentions the gate", () => {
    const result = run(
      fixture({ workflow: "steps:\n  - name: npm run canon\n    run: echo skipped\n" }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("has no bare");
  });

  it("fails when a gate is piped through a redirect and tee", () => {
    const result = run(
      fixture({ workflow: "steps:\n  - run: npm run canon 2>&1 | tee canon.log\n" }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pipes a gate");
  });

  it("fails when a gate is piped through another command", () => {
    const result = run(
      fixture({ workflow: "steps:\n  - run: npm run canon | tee canon.log\n" }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pipes a gate");
  });

  it("fails when a pending gate names no issue", () => {
    const result = run(
      fixture({
        gates: { enforced: [{ id: "canon", script: "canon" }], pending: [{ id: "pwa" }] },
      }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must name an open issue");
  });

  it("fails when a gate is both enforced and pending", () => {
    const result = run(
      fixture({
        gates: {
          enforced: [{ id: "canon", script: "canon" }],
          pending: [{ id: "canon", issue: 1 }],
        },
      }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("both enforced and pending");
  });
});
