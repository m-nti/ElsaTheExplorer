# ADR-0008: Image Derivatives — fixed rendition ladder, no-original rule, `ver`-keyed cache

- **Status**: Proposed (awaiting owner confirmation; only the owner moves this to Accepted)
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.1 — "`photos.php` runtime endpoints — derivative
  contract", "Manifest shape", Performance Budget, Error-State Taxonomy, Known-Defect
  Prevention Matrix, Folder Structure, API Boundaries
- **Related**: `docs/adr/ADR-0001-stack.md` (host + PHP optional), `design/art/art-bible.md`
  §8 (amended 2026-11-22: 360/720/1200/1600 ladder, WebP default + JPEG fallback),
  `PRD.md` §5 (performance, security) and R4 (needs restating), `AGENTS.md` (photo pipeline)

## Context

`photos.php` is the runtime manifest source: the owner FTP-drops photos into `photos/` and
reloads, with no redeploy (PRD §7; architecture principle 3 — "the owner's file drop is the
API"). That constraint is non-negotiable, so no image decision may require a build step on
the owner's side.

Measured on 2026-11-22, from the real photo store:

- one original is **3.98 MB** (5712×3840);
- the PHP thumbnail path produced a **540×720, 61.9 KB** image — **1.6 %** of the source;
- `?view=` served the **full 3.98 MB**, and that endpoint is what the card grid and the
  detail dialog were using. That is a **~64× overdraw** on the single most frequent image
  request in the app, on mobile data, against a PRD that demands "feels instant on mobile";
- the manifest emitted `src: "photos/<file>"` for non-HEIC photos and
  `view: "photos.php?view=NAME"` for all of them, so **originals were reachable from the UI
  by design**, and also directly at `/photos/` (bypassing PHP entirely);
- the thumbnail endpoint had no safe failure mode: every error branch fell through to
  `serveFile($path)` (photos.php:346 / 352 / 361), so a failed encode, an absent GD build or
  an unwritable cache directory caused a **thumbnail request to deliver the original**;
- the derivative cache key was `md5(name | mtime | size)` — it contains no rendition,
  format, quality or pipeline version, so changing encoder settings silently kept serving
  files produced under the old settings forever;
- PHP 8.6 emits deprecation notices for `imagedestroy()` (photos.php:356/360/431/441/448);
  with `display_errors` on (a common default on shared hosting), those notices are printed
  **into the image response** and corrupt otherwise-valid bytes.

The architectural problem is not "images are slow". It is that the image surface was
**open-ended**: any caller could ask for the source, any failure could produce the source,
and no setting of size or quality was closed enough to have a byte budget or a test.

## Decision

Close the surface. `photos.php` becomes the only renderer of photo bytes and never serves an
original. Six parts, all binding:

### 1. Fixed rendition ladder (no arbitrary parameters)

| Rendition | Longest edge | Formats | Byte ceiling |
| --- | --- | --- | --- |
| `tile` | 360 | jpeg 78 / webp 72 | ≤ 45 KB |
| `pack` | 720 | jpeg 80 / webp 74 | ≤ 120 KB |
| `detail` | 1200 | jpeg 82 / webp 76 | 150 KB target / **210 KB cap** |
| `download` | 1600 | jpeg 85 / webp 80 | 350 KB target / **500 KB cap** |

`?image=NAME&size=tile|pack|detail&format=jpeg|webp` — nothing else is accepted; an unknown
size or format is `415`. WebP is the default where the client advertises it or asks
explicitly; JPEG is the fallback and the default elsewhere. Ceilings come from the art-bible
§8 amendment (ratified 2026-11-22), so art direction and architecture name the same numbers.

### 2. Endpoint set

- `?list=1` — manifest (unchanged contract, `no-store`).
- `?image=NAME&size=…&format=…` — fixed rendition, `public, max-age=31536000, immutable`.
- `?thumb=NAME` — compatibility alias for `size=pack&format=jpeg` (720 px); deprecated.
- `?download=NAME` — explicit 1600 px JPEG, `Content-Disposition: attachment`.
- `?view=NAME` — **retired**: `302` → `?download=NAME`, never source bytes.

### 3. No-original rule

Every error path returns an error body or a neutral placeholder, never the source. No
manifest field addresses `photos/<file>`. Error taxonomy: `404` missing, `415`
unsupported/corrupt, `413` over configured byte/pixel limits, `503` encoder/cache failure
with `Retry-After`, `405` for anything but `GET`/`HEAD`; `no-store` on all errors; no server
paths, exception text or source dimensions in any body. Direct `/photos/<file>` access is
denied via `.htaccess` and/or a store above the webroot (HOST-VERIFIED-PENDING).

### 4. Pre-decode safety limits

Compressed ≤ 20 MiB; ≤ 24 MP and either edge ≤ 8000 px; decode-memory guard
(`w × h × 4 × 1.5` against the PHP limit minus headroom) → `413` before any bitmap exists;
`GET`/`HEAD` only; EXIF orientation normalized; EXIF/GPS stripped by re-encode; extension
**and** signature allowlist; `basename` + `realpath` inside the store only.

### 5. Cache contract

Key = `sha256(source identity | mtime | size | rendition | format | quality | pipeline
version)`. Per-rendition `flock`, render into `<key>.<pid>.tmp`, atomic `rename()`, bounded
wait (~2 s: then serve the existing file, else `503` + `Retry-After`). Cache outside the
webroot where the host allows, else `photos/.cache/` with `.htaccess` deny. Opportunistic
pruning (age + total-size cap) on a small random fraction of misses — no cron.

### 6. Manifest: `ver` + `images`

Each photo gains `ver` (short hash of `mtime` + `size`) and an `images` block with per-rendition
URLs and per-rendition `w`/`h`; `src`/`thumb`/`view` remain emitted as deprecated bounded
renditions. `ver` travels in every URL (`&v=`) so a replacement photo produces new URLs and
invalidates browser/CDN caches without a redeploy — which is what makes a one-year immutable
`max-age` safe on a mutable FTP drop folder.

## Consequences

**Positive**

- The card grid and dialog request bounded bytes: measured pack rendition is 61.9 KB against
  a 3.98 MB original, so the dominant image request drops by ~64×.
- Byte budgets become testable: a closed ladder is the precondition for the CI assertion.
- Failure modes are exempt from the original by construction, not by branch discipline.
- Replacements invalidate caches correctly on the first reload after the FTP drop.
- Metadata (EXIF/GPS) stops leaving the server in UI renditions.

**Negative / accepted costs**

- **PHP becomes load-bearing for bytes**, not just the manifest. Without PHP the deployment
  degrades to sharp pre-built `photos/thumbs/` — still bounded, but only at one size, so the
  no-PHP path is a lower-quality fallback. PHP remaining "optional" is preserved in the
  sense of "the site still works", not "the site is identical".
- First hit per photo+rendition costs CPU (up to four renders per new photo); steadied by the
  persistent cache and the lock.
- Cache pruning is opportunistic, so disk use is bounded in expectation, not exactly.
- Host capabilities are unknown until deploy (HOST-VERIFIED-PENDING): GD `imagewebp`/`imageavif`,
  `memory_limit`, writable directory above the webroot, `.htaccess` deny. Each has a fallback
  (JPEG only; lower pixel ceiling; `photos/.cache/`; documented residual exposure).
- If `.htaccess` deny is unsupported **and** the store cannot move above the webroot,
  `/photos/<file>` remains reachable by a determined visitor. Documented exposure, not a
  solved one — the UI never requests it, but the URL exists.
- `normalize.ts` grows a security-relevant job: it must treat any `photos/<file>` or
  cross-origin URL in `images` as untrusted and drop the block (counting it), and must not
  render a legacy `src` that points at a file.
- A CI job must run real PHP (`php -S`) — the derivative bound cannot be asserted against
  mocks.
- Two documents now lag this ADR and need owner edits: `PRD.md` R4 ("original only in the
  dialog and in 'Foto speichern'") and the AGENTS.md photo-pipeline line ("sharp … dev/QA
  only").

## Performance Implications

- Dominant image request: 3.98 MB → 61.9 KB measured (pack). Tile and detail are bounded by
  table; the download path is user-initiated only.
- No change to CLS: renditions preserve the source aspect ratio and `CardTile` keeps its
  fixed window; `width`/`height` still describe the source ratio.
- Server: one render per photo+rendition, then disk reads; concurrent cold hits collapse to
  one render via `flock`.
- Network: `immutable` + `ver` means repeat visits read from cache with zero revalidation.

## Alternatives Considered

1. **Keep serving originals (`?view=` as-is).** Rejected on measurement: ~64× overdraw on the
   app's most frequent image request, contradicts PRD §5 performance and R4's spirit, and the
   dialog does not need 5712 px on a phone.
2. **Build-time-only derivatives (sharp into the repo).** Rejected: it breaks the owner's FTP
   drop → reload workflow (PRD §7). It survives only as the static fallback for a PHP-less
   deployment.
3. **Arbitrary `w=` / `h=` / `q=` parameters.** Rejected: unbounded transcode surface → CPU and
   disk amplification, unbounded cache cardinality, and no number that a test can bound. This
   is the specific decision that makes the byte budget enforceable.
4. **Third-party image CDN / external derivative service.** Rejected: zero third-party
   requests is a structural privacy rule (PRD §5/§7), audited in Playwright.
5. **Stream derivatives without a cache.** Rejected: CPU on every request, no immutable
   caching, no stable byte guarantee, and no way to serve a concurrent herd.
6. **AVIF-first / WebP-only.** Rejected as the *only* path: decode and encoder support vary by
   device and by host GD build; negotiated WebP with JPEG fallback keeps a universal floor.
7. **Moving the photo store out of the repo entirely.** Not a decision this ADR can take — the
   owner's FTP target is fixed. The cache is the part that moves.

## Validation Checklist

Before this ADR moves to Accepted:

- [ ] Each rendition measured ≤ its ceiling **and** `≠ filesize(source)` (CI: `php -S` + real
      `photos.php`; release checklist: live IONOS).
- [ ] `?image=…&size=orig` / `size=huge` / `format=gif` → `415`, `no-store`, no image bytes.
- [ ] Missing name → `404`; a 60 MP fixture → `413`; both `no-store`, neither leaks a path.
- [ ] Forced encoder/cache failure → `503` + `Retry-After`, **never** the source.
- [ ] `?view=` → `302` to `?download=`, response body byte-identical to the download rendition.
- [ ] N concurrent cold requests produce **one** render (lock observed), no torn files.
- [ ] Replacing a photo changes `ver` and therefore every rendition URL.
- [ ] EXIF-rotated fixture renders upright; GPS tags absent from output.
- [ ] `imagedestroy()` removed everywhere; `display_errors=0` for image endpoints; under
      `error_reporting=E_ALL` the response still starts with the JPEG/WebP magic number and
      matches its declared `Content-Length`.
- [ ] Manifest validates: `images` optional, `ver` optional, legacy `photos/<file>` `src`
      normalized but never rendered.
- [ ] Playwright request log shows **zero** requests to `photos/<file>` in every flow.
- [ ] Host probe results (GD/WebP/AVIF, `memory_limit`, cache placement, `.htaccess` deny)
      recorded in this ADR's Consequences.
