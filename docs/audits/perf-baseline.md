# Performance Baseline — pre-refactor (Elsa the Explorer)

> **Date**: 2026-11-22
> **Scope**: current vanilla app, served by local PHP 8.6.0 (`php -S 127.0.0.1:4181`), cold/warm cache, plus puppeteer-core 25.16.0 + installed Chrome (390×844, DPR 2).
> **Departure from `perf-profile` convention**: written to `docs/audits/` (owner-named path) rather than `production/polish/`.

## Method

- Server responses: `curl` with `time_starttransfer`, response bytes and dimensions; cold-thumb run on a **temp copy** of `photos/` (`/…/elsa-perf-cold-3`, server :4199) so the real `.cache` was untouched.
- gzip: `gzip -9 -c <file> | wc -c`. **Local projection only** — the local server sends `identity`; IONOS behaviour is NOT ASSESSED.
- Runtime: puppeteer-core + Chrome, cache disabled; unthrottled and `Network.emulateNetworkConditions` at 1.6 Mbps down / 150 ms RTT.

## Server routes

| Route | Bytes | TTFB | Notes |
|---|---:|---:|---|
| `photos.php?list=1` | 6,634 | 0.87–6.9 ms warm (94 ms cold) | `Cache-Control: no-store` |
| `photos.php?thumb=elsa-01.jpg` (hit) | 61,909 | 4.7 ms | 540×720 |
| `photos.php?thumb=…` (miss) | 61,909 | **2.186 s** | GD resize of a 3.98 MB / 24.5 MP source |
| `photos.php?view=elsa-01.jpg` | **3,983,035** | 14.3 ms | byte-identical to the original |
| `photos/elsa-01.jpg` (direct) | **3,983,035** | 0.68 ms | original is publicly reachable |
| `photos/thumbs/elsa-01.jpg` (static, LCP) | **111,795** | 7.7 ms | 720×540 |

## Asset inventory (raw / gzip)

| Asset | Raw B | Gzip B |
|---|---:|---:|
| `index.html` | 11,760 | 3,464 |
| `assets/css/style.css` + `cards.css` | 65,034 | 15,711 |
| `assets/js/app.js` + `card-bank.js` | 71,517 | 20,248 |
| `chivo-latin.woff2` | 33,252 | 33,187 (pre-compressed) |
| `ultra-latin.woff2` | 15,248 | 15,098 |
| `photos/thumbs/elsa-01.jpg` | 111,795 | 107,644 |
| `assets/og.png` | 466,442 | 464,689 |
| `vendor/heic2any` | 1,351,840 | 337,743 (dynamic only) |

## Cold thumbnail generation (serialized, temp copy)

| Photo | Cold TTFB | Bytes | Dims |
|---|---:|---:|---|
| elsa-01.jpg (3.98 MB source) | 2.186 s | 61,909 | 540×720 |
| IMG_9319 / 9454 / 0018 | 0.933 / 0.359 / 0.324 s | 58,563 / 46,495 / 59,954 | 540×720 |
| IMG_0132 / 0155 / 2092 / 9949 | 0.296 / 0.275 / 0.273 / 0.259 s | 52,488 / 60,258 / 54,606 / 45,141 | 540×720 |
| 233A150F… / IMG_2225 | 0.172 / 0.062 s | 57,148 / 33,408 | 720×405 / 405×720 |
| **All ten cold, serialized** | **≈5.14 s** | **529,970 (517.5 KB)** | — |

Static `photos/thumbs/` set: 924,041 B, 10 files — **all over the legacy 45 KB target; 9/10 over the 80 KB pack ceiling.**

## Runtime (puppeteer)

| Metric | Unthrottled | 1.6 Mbps / 150 ms |
|---|---:|---:|
| FCP | 92 ms | **1,180 ms** |
| LCP (`IMG#pack-preview`) | 92 ms | **1,660 ms** |
| CLS | 0 | 0 |
| Requests | 18 | 18 |
| Bytes | 650,222 | 416,900 (LCP image still in flight) |

**Measured duplicate LCP download:** HTML ships `photos/thumbs/elsa-01.jpg` (111,920 B), then `app.js:250` rewrites `packPreview.src` to `photos.php?thumb=elsa-01.jpg` (62,248 B) — same picture, **174,168 B** on the critical path.

## 4G projection at the new ladder (200 KB/s + ~1 RTT/file)

| Scenario | Bytes | Transfer | +1 RTT |
|---|---:|---:|---:|
| Current detail (`?view=` original) | 3,983,035 | 19.9 s | 20.1 s |
| Current 10 static thumbs | 924,041 | 4.62 s | 4.77 s |
| tile 360 WebP ≤36 KB ×10 | ≤360,000 | ≤1.80 s | ≤1.95 s |
| pack 720 WebP ≤80 KB | ≤80,000 | ≤0.40 s | ≤0.55 s |
| detail 1200 WebP ≤150 KB | ≤150,000 | ≤0.75 s | ≤0.90 s |
| download 1600 WebP ≤350 KB | ≤350,000 | ≤1.75 s | ≤1.90 s |

## Budget table

| Budget | Target | Measured | Status |
|---|---:|---:|---|
| JS gzip | ≤60 KB | 19.8 KB | OK (unminified v1 sources) |
| CSS gzip | ≤30 KB | 15.3 KB | OK locally (projection) |
| CSS uncompressed | ≤45 KB | 65,034 B | **OVER 1.45×** |
| Font per woff2 | ≤30 KB | 33,252 B | **OVER 1.11×** |
| FCP ≤200 ms | ≤200 ms | 1,180 ms throttled / 92 ms local | **OVER on 4G** |
| LCP <2.5 s | <2,500 ms | 1,660 ms (warm loopback; excludes 2.19 s cold GD) | OK with caveat |
| CLS | 0 | 0 | OK |
| Critical thumb | ≤45 KB | 111,920 / 61,909 B | **OVER** |
| First-load total | ≤250 KB | 650,222 B | **OVER 2.6×** |
| Detail never original | 0 | 3,983,035 B | **OVER** |
| IONOS gzip/brotli | — | — | NOT ASSESSED |
| Cold-cache first visit on real mobile | — | — | NOT ASSESSED |

## Confirmed defects

1. **EXIF orientation divergence** — PHP thumb applies orientation (540×720); static sharp/sips thumb does not (720×540); manifest `width`/`height` come from `getimagesize()` **unrotated** (5712×4284). Card aspect can be wrong for rotated photos.
2. **LCP attributes wrong** — `index.html` declares 720×720 for 720×540 and 540×720 files. CLS is currently 0 only because the preview is absolutely positioned; any layout change makes it a CLS liability.
3. **Manifest fallback is sequential** — `app.js:361-367`: 3,000 ms PHP timeout then 4,000 ms JSON timeout = **7 s worst case** before empty/error. (Code-confirmed; wall-clock simulation NOT ASSESSED.)

## Top 5 fixes by measured impact

1. **Stop serving the original as a detail image** — 3.98 MB → ≤210 KB JPEG / ≤150 KB WebP (−94.7 % / −96.2 % per open).
2. **Kill the double LCP fetch** — 174,168 B → 62,248 B (or ≤55 KB tile) by not hard-coding the static thumb before `app.js` rewrites it.
3. **Emit the 360/720/1200 ladder** — 10 thumbs 924 KB → ≤360 KB WebP (−61 %).
4. **Enforce per-rung byte ceilings** — worst thumb 111.8 KB vs 36/55 KB.
5. **Fix CSS + font bytes** — CSS 65 KB raw vs 45 KB; Chivo 33.3 KB vs 30 KB.

## Verdict

**WARNINGS-level non-clean**: five measured budget violations under `performance.enforce: warn`; two rows NOT ASSESSED (IONOS compression, cold-cache mobile boot) and they must not be edited out.
