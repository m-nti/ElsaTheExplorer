# #26 — LCP image fetch: before and after

> **Date**: 2026-11-22 · **Branch**: `fix/m1-lcp-duplicate-fetch` · **Base**: `6b9c50a`
> **Owner**: `performance-analyst` · **Cross-check**: `cs-frontend-engineer`
> **Method**: built artifact (`npm run build` → `dist/`), served by `vite preview`,
> measured with Playwright 1.65.1 + the installed Chrome/WebKit at 390 × 844 DPR 2 and
> at the Playwright desktop/phone device profiles. Every response byte count is the
> decoded body length; layout shifts come from a buffered `layout-shift` observer that
> keeps each entry's `sources`.

## What the ticket asserted, and what this branch shows

The ticket carries the pre-refactor measurement: `index.html` shipped
`photos/thumbs/elsa-01.jpg` (111,920 B) and `app.js:250` then repointed the same element
at `photos.php?thumb=…` (62,248 B) — **174,168 B and two requests for one picture**.

That defect no longer exists in the v2 app, and not by accident of measurement: the shell
ships **no image and no image preload**, and `CardFace` renders `model.photo.src` once.
The remaining work was to prove it, to stop the shell from being able to reintroduce it,
and to fix the one acceptance criterion that measurably failed (CLS, which was the display
face swapping, not the picture).

## Before and after

| Measurement | Legacy (v1, audited) | This branch, before | This branch, after |
|---|---:|---:|---:|
| Image requests for the first-view picture | 2 | 1 | 1 |
| Bytes for that picture | 174,168 | 1,636 | 1,636 |
| Requests for any one URL | 2 | 1 | 1 |
| `fetchpriority` on the picture | absent | absent | `high` |
| `loading` on the picture | absent | absent | `eager` |
| Declared vs decoded pixels | 720 × 720 vs 720 × 540 | 540 × 720 vs 540 × 720 | 540 × 720 vs 540 × 720 |
| Layout shift with the picture as a source | not instrumented | 0 | 0 |
| Total CLS (390 × 844) | 0 (baseline) | 0.0075 | 0.0006 |

The legacy column is the audited measurement in `docs/audits/perf-baseline.md`; the source
photos and `photos/thumbs/` are not committed, so it was not re-measured here. The v2
picture is the 1,636 B `photo-unavailable.webp` placeholder because the manifest pipeline
is not wired to a card surface yet (B3 / #14 owns the seal preview); it is well inside
every rung ceiling, and the 62,248 B PHP thumb remains unmeasured as an LCP element.

## The single request, as measured

```
/img/photo-unavailable.webp   image  200  1,636 B  image/webp  no-cache
naturalWidth 540 = width 540 · naturalHeight 720 = height 720
```

First view on that run: 7 requests, 133,677 B in total, no duplicate URL. The picture's
`Content-Type` is WebP, so `E-DLV-02`'s tile ceiling of 36,000 B applies — 1,636 B is
inside it.

LCP is advisory (`docs/test-plan.md` §8.1) and the element is viewport-dependent: at
390 × 844 the entry is `IMG.photo` (cold Chrome, 2,056 ms on loopback), at 1280 × 720 it
is `H1.wordmark`. The spec therefore asserts "if the LCP is an image, it is this image"
rather than pinning an element that changes with width.

## Why CLS was not zero, and what was changed

Attribution first: with only the Ultra font blocked, CLS was `0`; with only Chivo blocked
it was `0.0052`; with nothing blocked `0.0075`. The shift sources named the wordmark text
box (moving 2-14 px) — the Ultra `font-display: swap` swap, not the image.

The fix is a metric-matched interim face, not a change to the loading policy: `Ultra
Fallback` (Georgia / Times New Roman) with `size-adjust: 140.41 %` (measured advances at
100 px: Ultra 1070.75 / Georgia 762.60) and `ascent-override: 71.9 %`,
`descent-override: 19.2 %` — those overrides are relative to the adjusted em, so they are
Ultra's `101 % / 27 %` divided by `1.4041`. `font-display: swap` stays, as the art bible
requires.

Result: the wordmark no longer moves at all. The residual `0.0006` comes from the **Chivo**
swap on three text nodes (tagline and eyebrow move 1 px; the credit label re-measures
80 → 89 px). Chivo's interim face is whatever the OS supplies, so a metric-matched Chivo
fallback needs per-platform verification before it can be trusted — filed as **#81**
rather than guessed at here.

## What now fails if the defect returns

| Gate | Where | Catches |
|---|---|---|
| `tests/unit/lcp-contract.test.ts` | Vitest `unit` (enforced chain) | a shell image the app rewrites; a preload whose URL the app never renders; more than one image preload |
| `tests/e2e/lcp.spec.ts` | Playwright (`E-DLV-09`, `E-DLV-10`, `E-DLV-02`) | two requests for one element; declared ≠ decoded pixels; a response over the rung ceiling; a picture-sourced layout shift; a preload that disagrees with the rendered URL |

The unit gate's negative proof is the legacy pair itself: the audit runs over
`legacy/index.html` plus `legacy/assets/js/app.js` and must find `#pack-preview` rewritten,
so a green run is never a green run over nothing.

## NOT ASSESSED

- **Font substitution on Linux CI.** The `0.0006` residual and the `0.005` guardrail were
  measured on Windows with Georgia; a CI runner substituting a different serif may shift
  more. The picture-sourced assertion (`imageShifts === 0`) is platform-independent; the
  total-page guardrail is not yet verified off Windows. Gate 7 (Playwright) is still
  pending under #24, so nothing in CI runs this spec today.
- **IONOS compression and cold-cache mobile boot** — unchanged from `perf-baseline.md`;
  this ticket does not touch the host.
- **The 62,248 B PHP derivative as an LCP element** — no v2 surface renders a manifest
  photo yet, so the ticket's "174 KB → 62 KB" cannot be reproduced here; the branch proves
  one request, and the gate holds the shape until B3 supplies the real URL.
