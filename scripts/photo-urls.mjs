#!/usr/bin/env node
/**
 * Manifest URL prefixes — host-independent by contract.
 *
 * Spec:     docs/photo-pipeline-implementation.md §13.3 / §13.4
 * Contract: docs/adr/ADR-0004-manifest-contract.md §3, ADR-0008 §5
 * Ticket:   #113
 *
 * `defaultUrlPrefix()` is what the generator uses when `--url-prefix` is absent:
 * `<out>` relative to the repository when that is a real relative path, and the
 * neutral basename otherwise. A QA run into a temp directory must never ship a
 * machine path.
 *
 * `path.relative()` is not a containment test: on Windows it returns the **target**
 * path, unchanged and absolute, when the two paths are on different volumes. The
 * windows-latest job checks out on `D:` while TEMP lives on `C:`, so the naive
 * version emitted `C:/Users/RUNNER~1/…/derived/tile/a.jpg` (#113). The guard lives
 * here, exported, so the rule is asserted on every host instead of only where two
 * volumes happen to exist.
 */

import { basename, isAbsolute, relative, sep } from "node:path";

/** A Windows drive prefix, matched even when this host's path module is POSIX. */
const DRIVE = /^[A-Za-z]:/;

/**
 * True when `rel` is a relative path that stays inside the root it came from.
 * Both separators are rejected explicitly: a Windows-shaped result must not pass
 * a POSIX host's `isAbsolute()`, and the rule is the same in either direction.
 */
export function isRepoRelativePrefix(rel) {
  if (rel === "" || isAbsolute(rel) || DRIVE.test(rel)) return false;
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\")) return false;
  return true;
}

/**
 * Public prefix for manifest URLs: `<out>` relative to `root`, POSIX separators.
 * Anything that cannot be expressed as a relative path keeps the directory's
 * basename — deployable and machine-neutral, which is all a QA prefix needs.
 */
export function defaultUrlPrefix(root, out) {
  const rel = relative(root, out);
  if (!isRepoRelativePrefix(rel)) return basename(out);
  return rel.split(sep).join("/");
}
