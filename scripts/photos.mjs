#!/usr/bin/env node
/**
 * Photo pipeline entry point — deferred to phase I3.
 *
 * B0 archived the v1 generator at `legacy/scripts/photos.mjs`; it resolves its
 * paths against `legacy/`, so running it from the repository root would write a
 * second, empty `legacy/photos.json` and a `legacy/photos/thumbs/` directory.
 * The replacement (sharp 0.35.5, the 360/720/1200/1600 ladder, manifest `ver` +
 * `images`) is specified in `docs/photo-pipeline-implementation.md` and is not
 * part of B0/B1. Fail loudly instead of producing wrong artifacts.
 */

console.error(
  "[photos] Deferred to I3: the sharp ladder + manifest v2 are not implemented yet.\n" +
    "         The v1 generator is archived at legacy/scripts/photos.mjs.\n" +
    "         Spec: docs/photo-pipeline-implementation.md §2–§3.",
);

process.exitCode = 1;
