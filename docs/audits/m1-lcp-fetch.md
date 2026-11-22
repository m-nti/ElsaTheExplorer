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

## #81 — the last 0.0006, and why it took two faces

> **Branch**: `fix/m1b-chivo-fallback` · **Base**: `985c678` · **Owner**: `performance-analyst`
> · **Cross-check**: `cs-frontend-engineer`. Same method, with one correction: the font is
> held until the first frame has painted and then released. On loopback Chivo sometimes
> wins the race against first paint, and the same page then reports **0 with the defect
> present** — the measurement below is the worst case, every run.

| Measurement | Before | After |
|---|---:|---:|
| CLS, cold first view 390 × 844 DPR 2 (Chromium) | 0.000565 | **0** |
| CLS, cold first view 1280 × 720 (Chromium) | 0.000305 | **0** |
| Layout-shift entries at either viewport | 2 sources per entry | none |
| Chivo bytes | 29,368 B | 29,368 B (unchanged) |
| `font-display` | `swap` | `swap` (both faces) |
| Rendered pixels, final state (Chivo loaded) | — | byte-identical, 0 differing pixels at both viewports |

Shift sources before, 390 × 844 — vertical only, 1 px each:

| Node | Previous rect | Current rect |
|---|---|---|
| eyebrow text (`Sammelwerk · Erste Auflage`) | y 32, h 13 | y 33, h 13 |
| tagline text (`Die Sammlung ist…`) | y 169.5, h 34.5 | y 170.5, h 34.5 |

Chivo's `hhea` is **940 / −250 at 1000 upem, no line gap** (read from
`public/fonts/chivo-latin.woff2` with `fontverter`), so the interim face has to declare
`ascent-override: 94 %` and `descent-override: 25 %` *of the adjusted em* — i.e. divided by
`size-adjust`. The old interim face was Segoe UI through `system-ui`, whose line box is
133 per 100 px against Chivo's 119: the 1 px is that difference, rounded.

**The advance ratio is not one number.** Measured at 100 px (canvas `measureText`, the
shipped subset):

| Case | Chivo | Arial | Ratio | Resulting `size-adjust` |
|---|---:|---:|---:|---:|
| sentence copy (`Die Sammlung ist das Produkt…`) | 3268.149 | 3095.654 | 1.0557 | **105.57 %** |
| tracked uppercase (`SAMMELWERK · ERSTE AUFLAGE`, 11 px / 600 / 0.14 em) | 212.969 | 220.15 | 0.9672 | **96.72 %** |

Chivo's caps are *narrower* than Arial's while its sentence copy is *wider*. One face
therefore cannot serve both: with `Chivo Fallback` alone the centred eyebrow line moved
7.95 px (CLS 0.000121) because a centred line's start moves by half the advance change.
The fix ships two `local()` faces — `Chivo Fallback` (body, 105.57 %) and
`Chivo Label Fallback` (tracked labels, 96.72 %), selected by the `fonts.body` and
`fonts.label` tokens — each with the same `94 / 25` hhea division:

| Face | `size-adjust` | `ascent-override` | `descent-override` | `line-gap-override` |
|---|---:|---:|---:|---:|
| `Chivo Fallback` | 105.57 % | 89.04 % | 23.68 % | 0 % |
| `Chivo Label Fallback` | 96.72 % | 97.19 % | 25.85 % | 0 % |

Arial is the base because `local("Arial")` resolves to Arial on Windows/macOS and to
Liberation Sans on Linux, which is advance-compatible with Arial (same 1854/434/67 hhea
and identical advances). Both faces are `local()`-only: **zero new bytes**, and the font
budget gate is unchanged.

The `.eyebrow` is the only surface that needed `fonts.label`; every other tracked label
sits in a left-anchored box, where an advance change moves nothing.

## What now fails if this returns

| Gate | Where | Catches |
|---|---|---|
| `tests/unit/chivo-fallback.test.ts` | Vitest `unit` (enforced chain) | a fallback that downloads bytes; a fallback behind `system-ui` in the stack; a `size-adjust` edited without re-deriving the overrides; a `swap` removed; the label face losing its narrower ratio |
| `tests/e2e/lcp.spec.ts` | Playwright | CLS ≠ 0 at 390 × 844 and 1280 × 720 (forced late swap); a fallback whose line box, baseline or advance stops matching Chivo on Chromium *and* WebKit |

The e2e measurement now forces the swap (holds the font until the first frame paints).
That is the point: the pre-fix spec reported `0.0006` on one run and `0` on the next
because the font sometimes won the race — a gate that passes without the fix is not a gate.

## NOT ASSESSED

- **A Linux browser run.** No Linux runner is available here (Docker absent; Playwright
  gate #24 still pending). The argument for Linux is the `local("Liberation Sans")`
  fallback and Arial's advance compatibility, not a measurement. The metric assertion
  runs in CI only once #24 lands.
- **WebKit CLS.** Safari exposes no `layout-shift` entry type, so `cls === 0` is
  unmeasurable there and those two tests are skipped by name on WebKit. The metric test
  runs on WebKit and carries the claim. WebKit also resolves `local("Arial")` at weight
  600 to the Bold instance: the label advance is then 2 % wide = a 2.2 px centred move,
  below the 3 px threshold Chromium uses before reporting a shift at all.
- **The credit label at 80 → 89 px** that #26 recorded. On this branch's first view the
  credit is not rendered at either acceptance viewport (the stage card was replaced by the
  binder grid in B2), so it could not be re-measured; the body face covers it by ratio.

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
