#!/usr/bin/env node
/**
 * Point git at the committed hooks directory (#45, AC 7) — the second half of
 * `npm run prepare`.
 *
 * Shell-free on purpose. `panda codegen && git config … || true` parses as
 * `(codegen && config) || true`, which swallows a failing codegen; the obvious
 * brace fix, `{ git config … || true; }`, is bash-only and fails under
 * `cmd.exe`, which npm uses for lifecycle scripts on Windows. Node behaves the
 * same under cmd.exe, sh and PowerShell, so the grouping lives here instead of
 * in a shell string.
 *
 * A failing `git config` (no git, or a tarball install outside a repository) is
 * not an install failure — there is simply no hook path to set. The codegen is
 * a separate `&&` link in the npm script, so its failure still fails `prepare`.
 */
import { spawnSync } from "node:child_process";

spawnSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
