#!/usr/bin/env python3
"""
Chivo Latin subset for the Elsa app (ticket #35; art bible §8 "≤ 30 KB per woff2, Latin subset").

Dev-only build tool. fonttools is NOT a runtime dependency; pinned versions live in
`scripts/requirements-font.txt`. Install once:

    python3 -m venv .venv-font && .venv-font/bin/pip install -r scripts/requirements-font.txt

Inputs / outputs
  source:  design/fonts/source/chivo-latin.source.woff2   (unmodified master, Omnibus-Type Chivo 2.002)
  output:  public/fonts/chivo-latin.woff2                  (shipped subset)

Code points come from `node scripts/font-glyphs.mjs --json` — the same list the coverage
test (`tests/unit/font-coverage.test.ts`) checks against, so the two cannot drift.

What is kept, and why
  - Every glyph the DE/EN copy, the src/ UI and the required umlauts/ß/typography use.
  - The whole variable `wght` axis (source 100–900). The app uses 400–700, which is inside
    the axis, so nothing the app renders changes. Limiting the axis is a further saving
    that was measured (see the PR body) but is not needed to meet the budget.
  - All OpenType layout features (`*`) — rendering-neutral.
  - Name IDs 0–6, 13, 14: copyright and licence (SIL OFL 1.1 requires the notice to
    travel with the font) plus family/style identifiers.
  - hinting dropped (the source carries none; kept explicit).

Usage:  .venv-font/bin/python scripts/subset-chivo.py [--budget 30000]
Exits non-zero if the output exceeds the budget or if a required code point is missing.
"""

import argparse
import io
import json
import os
import subprocess
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from importlib.metadata import version

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE = os.path.join(ROOT, "design/fonts/source/chivo-latin.source.woff2")
OUTPUT = os.path.join(ROOT, "public/fonts/chivo-latin.woff2")
NAME_IDS = [0, 1, 2, 3, 4, 5, 6, 13, 14]


def glyph_audit():
    run = subprocess.run(
        ["node", os.path.join(ROOT, "scripts/font-glyphs.mjs"), "--json"],
        capture_output=True, text=True, check=True, cwd=ROOT,
    )
    return json.loads(run.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget", type=int, default=30_000, help="per-font ceiling in bytes")
    args = parser.parse_args()

    audit = glyph_audit()
    unicodes = audit["codepoints"]
    fallback = set(audit["fallback"].keys())

    font = TTFont(SOURCE)
    source_cmap = font.getBestCmap()
    before = os.path.getsize(OUTPUT) if os.path.exists(OUTPUT) else None

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = NAME_IDS
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.hinting = False
    options.glyph_names = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)

    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    data = buf.getvalue()

    # Verify what was actually written, from the output bytes (not from the request).
    out = TTFont(io.BytesIO(data))
    out_cmap = out.getBestCmap()
    missing = [cp for cp in unicodes if cp not in out_cmap and chr(cp) not in fallback]
    absent_in_source = [cp for cp in unicodes if cp not in source_cmap]
    axes = [(a.axisTag, a.minValue, a.maxValue) for a in out["fvar"].axes] if "fvar" in out else []

    with open(OUTPUT, "wb") as fh:
        fh.write(data)

    print(f"fonttools {version('fonttools')} · brotli {version('brotli')}")
    print(f"source:   {os.path.relpath(SOURCE, ROOT)} ({os.path.getsize(SOURCE)} B)")
    print(f"before:   {before if before is not None else 'n/a'} B  ({os.path.relpath(OUTPUT, ROOT)})")
    print(f"after:    {len(data)} B  (budget {args.budget} B, headroom {args.budget - len(data)} B)")
    print(f"glyphs:   {len(out.getGlyphOrder())} glyph ids, {len(out_cmap)} cmap entries, "
          f"requested {len(unicodes)} code points")
    print(f"axes:     {axes}")
    print("absent from Chivo (system fallback, FALLBACK in font-glyphs.mjs): "
          + (" ".join(f"U+{cp:04X}" for cp in absent_in_source) or "none"))
    if missing:
        print("MISSING from subset (not in FALLBACK): " + " ".join(f"U+{cp:04X}" for cp in missing))
        return 1
    if len(data) > args.budget:
        print(f"OVER BUDGET by {len(data) - args.budget} B")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
