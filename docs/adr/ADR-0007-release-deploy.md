# ADR-0007: Release — versioned static artefact, ordered IONOS deploy, one-build rollback

- **Status**: **Accepted (owner decision, 2026-11-22)**
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.2 — the PWA layer's "Build, versioning and deploy" is the technical source for §2–§3; this ADR adds the release unit, version identity, rollback and live verification that the architecture leaves to process.
- **Related**: `ADR-0001` (build in the repo, FTP upload, PHP optional), `ADR-0008` (host probe, byte checklist), `ADR-0009` (deploy order, `.htaccess`, `__BUILD_HASH__`), `ADR-0003` (no downgrade path), `PRD.md` §5/§7, `docs/decisions.md` D-09

## Context

The product deploys as plain files to an IONOS shared webspace: the owner uploads over FTP or the
webspace explorer, and **nothing is built or run on the server** (PRD §5/§7). No staging, no
shell, no cron, no database, one webspace, one operator. Two things make this more than copying
files:

1. **The PWA makes upload order load-bearing.** A `sw.js` uploaded before its assets fails its
   install; an `index.html` uploaded before its hashed JS is a blank page. ADR-0009 fixes the
   order; the release process must enforce it.
2. **The photo store is data, not code.** The owner drops photos whenever they like. A release
   must never overwrite, delete or "sync" `photos/`, and a photo drop must never need a release.

v1's release was "upload everything, open it on a phone". That is still the spirit, but it is not
sufficient once cached workers, hashed assets and a derivative cache exist. The target: a release
that is **reproducible from a tagged commit**, **verifiable without analytics**, and **reversible
with one re-upload**.

## Decision

### 1. The release unit

One git tag plus the artefact built from it:

- `npm ci && npm run build` (`panda codegen && vite build`) → `dist/`;
- archive `release/<version>-<buildHash>/` kept as the rollback source; `dist/` is never
  hand-edited and never rebuilt on the server;
- server-side files versioned in the repo, uploaded only when changed: `photos.php`,
  `.htaccess`, `robots.txt`, `photos.json`, and the `photos/.cache/` skeleton (deny files,
  `locks/`, 16 pre-created shard directories — required because an FTP deploy has no shell and
  the pipeline forbids `mkdir()` on the request path).

`photos/` and the cache **contents** are runtime data: never in a release, never deleted by one.

### 2. Deploy order (mandatory)

0. `.htaccess`, `photos.php`, cache skeleton — idempotent, safe at any time; no loaded client is
   invalidated.
1. `assets/` — content-hashed; a new filename never overwrites an old one.
2. `fonts/`, `icons/`, `manifest.webmanifest`.
3. `sw.js` — every asset it precaches is already present.
4. `index.html` — **last**. It is the switch: it names the new bundle and the new `data-version`.

Old hashed assets are retained for **one previous build** and deleted in the following release,
so a mid-session visitor (or a rollback) never meets a missing chunk. Deleting and uploading in
one pass is forbidden.

### 3. Version identity

| Identity | Source | Purpose |
| --- | --- | --- |
| Product version | `package.json` semver (`2.0.0` today), git tag `v<x.y.z>` | release notes, rollback selection |
| Build hash | `__BUILD_HASH__` = `git rev-parse --short=12 HEAD` (+ `-dirty`), content hash in CI | precache name `elsa-precache-<hash>`, `data-version` on `<html>` |
| Manifest contract | v2 (ADR-0004) | independent of product version |
| Cache schema | `CACHE_SCHEMA` (ADR-0009) | independent; a bump is the whole cache migration |

Semver applies to the app: patch = copy/fix, minor = feature, major = a change a returning
visitor would notice as a different product. `CHANGELOG.md` starts at first release, one entry per
tag (added / changed / fixed / host actions). There is **no version endpoint**: identity is
observable from `data-version` and the precache name, keeping the no-extra-request budget intact.

### 4. Rollback (one re-upload, no data loss)

Trigger: site down, an original served, wrong-language or missing copy, install/update broken, or
a live byte ceiling breached. Then:

1. Re-upload the archived previous artefact in the **same order** (assets → metadata → `sw.js` →
   `index.html`). Never patch a single live file.
2. Do **not** touch `photos/`, `captions.json` or the derivative cache — rollback is code-only.
3. PWA behaviour: the older worker installs and its `activate` deletes newer `elsa-*` caches whose
   schema is not current — acceptable, it is a cache, not the collection. Storage is forward-safe:
   a newer `lucky-elsa.*` envelope is kept and read as defaults, never overwritten (ADR-0003 §4.5),
   so rolling code back cannot destroy a collection.
4. Retain two previous builds (assets + `sw.js` + `index.html`) for 30 days; after that, rebuild
   from the tag — which is why the tag and lockfile must be pushed. If a release changed the
   derivative contract, old URLs stay valid by construction (`ver`, ADR-0008/0004).

### 5. Release gates (evidence attached)

1. All ten CI gates green on the tagged commit (ADR-0006); PR reviewed per `AGENTS.md`.
2. **Live verification after upload** (no analytics, so checks are explicit): `curl` assertions
   on the origin — `sw.js` `Cache-Control: no-cache`, `.webmanifest` served as
   `application/manifest+json`, HTTPS, `X-Content-Type-Options`, no directory listing,
   `/photos/<file>` denied (or the documented residual exposure), `?view=` 302 → `?download=`, the
   400/404/415/413/503 taxonomy, every rendition `Content-Length ≤` its ceiling **and** ≠ source
   size, and a `ver` bump after a replacement photo.
3. CDP `Page.getInstallabilityErrors` empty against the live URL; precache and `sw.js` byte
   budgets read from the live build.
4. One manual phone pass (DE + EN: pack → detail → save/share → reload) plus the iOS row from
   ADR-0009's checklist.
5. Lighthouse advisory only, artefact attached.
6. **If a gate cannot run, the release does not go out** — name the gate and why.

### 6. Mechanism and cadence

Manual, human-triggered: a scripted idempotent upload with a file manifest and `--dry-run`
(`lftp mirror -R` or `scripts/deploy.mjs`) run by the owner from the archived artefact, or a
manual-dispatch CI job with FTP secrets. A merge to `main` never deploys. Cadence follows the
owner's changes, not sprints; photo drops are independent. A staging subdomain on the same
webspace is recommended and recorded as an owner item (D-09 domain); until it exists the
rehearsal is local — `npm run preview` + `php -S` + gates 9/10 against the same artefact.

## Consequences

**Positive** — any release is reproducible from a tag and reversible with one re-upload; the
artefact, not the working tree, ships. Upload order has a reason (worker install atomicity), so a
half-finished deploy degrades to the previous worker instead of a white page. Live verification is
concrete and scriptable without RUM, cookies or third parties, so the privacy position and M8
survive. Data and code are separated: the owner can drop photos at any time and a rollback cannot
touch them.

**Negative / accepted costs** — FTP remains a manual step and the largest human-risk surface;
mitigated by a dry-run manifest, ordered steps and one-build retention, not eliminated. Two
artefacts must be kept and found under pressure. No staging host means a live-verification failure
is found in production; the checks catch it in minutes and rollback is one re-upload, but a
staging subdomain is the real fix (pending owner). A rollback after a `CACHE_SCHEMA` bump empties
returning visitors' offline caches; they re-warm on the next online visit. `.htaccess`/`photos.php`
changes need host-level care and stay in the probe list.

## Performance Implications

Repeat visitors fetch the shell zero times (ADR-0009); a release changes only hashed names plus
`sw.js`, so the payload is new chunks on the next visit, gated by the update affordance. Keeping
one previous generation costs a few hundred KB of webspace and prevents broken sessions. A
rollback re-downloads the previous chunks once, within the same budgets. No release step adds a
runtime request, font or third-party call.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| Auto-deploy on merge to `main` | A merge would go live with no rehearsal and no owner intent; no staging, no atomic swap, so a bad merge is instantly public. |
| Drag-and-drop in the webspace explorer | Cannot enforce order or exclude `node_modules`/`scripts`, and invites partial uploads — the exact failure the order rule prevents. |
| `git pull` / build on the host | No shell, no Node, and server builds are forbidden (PRD §5). |
| Third-party deploy/CDN service | A third-party dependency on the critical path and a privacy/complexity cost for one static page. |
| `/version.json` endpoint | One more request and cache surface for information already in `data-version`; it would also need its own `.htaccess` exception. |
| Blue/green directories with a symlink swap | Not available without shell access; ordered upload is the achievable equivalent. |
| Never delete old assets | Unbounded growth and an ever-larger upload surface; one-generation retention is the bounded compromise. |
| Rollback by reverting the commit and rebuilding | Slower under pressure and needs a clean toolchain at the worst moment; the archived artefact is tested bytes. |

## References

- `docs/adr/ADR-0009-pwa.md` §3 (build, `.htaccess`, deploy order), `ADR-0008` (host probe, live byte checklist)
- `docs/adr/ADR-0006-testing-ci.md` (the ten gates), `ADR-0003` (forward-safe storage)
- `docs/architecture.md` v1.2 — Folder Structure, PWA Layer, Build-Phase items 6–8
- `docs/test-plan.md` §8, §12, §6.12 manual iOS rows · `PRD.md` §5/§7/§10.3 · `docs/decisions.md` D-09 · `AGENTS.md`
