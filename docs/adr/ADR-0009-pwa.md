# ADR-0009: PWA — installable, offline-first catalogue with a bounded, versioned cache

- **Status**: **Accepted (owner decision, 2026-11-22)** — the owner delegated the decision with
  D-01 in `docs/decisions.md` ("PWA: yes … installable, offline-first … recorded in ADR-0009")
  and instructed *best-in-class, no shortcuts*. This record is the technical specification of
  that ruling, not a proposal.
- **Date**: 2026-11-22
- **Deciders**: owner (final), technical-director (author)
- **Amends**: `docs/architecture.md` v1.2 — new "PWA Layer" section (scope, SW lifecycle, cache
  schema, strategy table, offline taxonomy, install UX, build/deploy), plus the System Layer
  Map, Module Ownership, Performance Budget, Error-State Taxonomy, API Boundaries, Folder
  Structure, Known-Defect Prevention Matrix, ADR Audit and Build-Phase Checklist; and
  `docs/test-plan.md` (PWA test suite, CI gate, DoD rows, regressions).
- **Related**: `docs/adr/ADR-0001-stack.md` (Vite 8 build, static IONOS deploy, PHP optional),
  `docs/adr/ADR-0002-styling-system.md` (`theme_color`/`background_color` must derive from
  `design/tokens/tokens.ts`), `docs/adr/ADR-0008-image-derivatives.md` (fixed rendition
  ladder, `ver`-keyed immutable URLs, no-original rule), `PRD.md` §5 (privacy, performance)
  and §7 (static host, owner FTP flow), `AGENTS.md` (privacy, water canon), `design/decisions.md`
  D-01/D-08.

## Context

Elsa the Explorer is one static page on IONOS: Svelte 5 + Vite 8, no router, no SSR, no
accounts, first-party `localStorage` only, and a photo store the owner fills by FTP drop with
no redeploy (`photos.php?list=1` for the manifest, `?image=…&size=…&format=…&v=` for closed-ladder
derivatives, ADR-0008). D-01 approves an installable, offline-first PWA on top of that.

The constraints that shape every decision below:

1. **The owner's FTP drop must keep its freshness.** A cache that hides a new photo behind a
   stale manifest breaks the one workflow the product depends on (`architecture.md` principle 3).
   Offline must be an *extra* path, never the default path when the network is healthy.
2. **Originals must never reach the browser** (ADR-0008). Therefore an offline cache must never
   contain an original — not as a policy of the UI, but as a property of the cache's admission
   rules. A cache is a file store; "the UI doesn't request it" is not a guarantee.
3. **No third-party requests, no cookies, no analytics** (PRD §5/§7). The service worker may
   therefore never be a place where a tracking helper could live, and must not cache anything
   cross-origin.
4. **A pack must never be interrupted.** D-01: "no forced reload mid-pack; skipWaiting only on
   user action." A four-card reveal with sound and live-region announcements is a single
   moment; reloading under it destroys the product's one ritual.
5. **The visitor's device is not ours.** Offline storage is bounded and clearable, and the
   reset flow must be able to remove it.
6. **The build stays the repo's job, not the server's** (ADR-0001). The service worker and the
   web app manifest are build outputs, uploaded as plain static files.

Facts verified while writing this record (2026-11-22):

- **`vite-plugin-pwa` supports Vite 8** — peer range extended to `^8.0.0` upstream
  (`vite-pwa/vite-plugin-pwa#924`, merged 2026-04-29); Vite 8 + `vite-plugin-pwa` 1.2/1.3
  reported working in production for both `generateSW` and `injectManifest`. (1.x and 2.x both
  support `injectManifest`; 2.x requires Node ≥ 20.19.)
- **Lighthouse no longer has a PWA category.** It was removed in Lighthouse 12.0.0
  (April 2024, Chrome 126) when Chrome relaxed its installability criteria; Lighthouse 13.x
  ships Performance / Accessibility / Best Practices / SEO only. **The CI gate therefore cannot
  be "a Lighthouse PWA score"** — the deterministic gate is our own suite plus the browser's
  own installability verdict via CDP `Page.getInstallabilityErrors`. Lighthouse stays in CI as
  an advisory artifact for performance/a11y/best-practices (see §Validation Checklist).
- **iOS is the honest weak spot**: Safari caps script-writable storage for sites without recent
  interaction (≈ 7 days), so a non-installed visitor's offline copy can be evicted. The app must
  degrade to the shell-cold state, not to a broken page. Home-screen-installed apps are treated
  more favourably but are still subject to storage pressure. This is a documented limitation,
  not something the architecture can fix.

## Decision

Adopt a **single-origin, prompt-update, bounded-cache PWA**, specified in twelve parts.

### 1. Scope and non-goals

**In scope**

| Capability | Binding decision |
| --- | --- |
| Installable | `manifest.webmanifest` with `id`, `name` "Elsa the Explorer", `short_name`, `start_url: "/"`, `scope: "/"`, `display: standalone`, `lang: de`, `dir: ltr`, `background_color` + `theme_color` **generated from `design/tokens/tokens.ts`**, icons 192/512 `any` + 512 `maskable` + `apple-touch-icon` 180, `launch_handler: { client_mode: "navigate-existing" }` |
| Offline shell | App shell (HTML, content-hashed JS/CSS, self-hosted fonts, icons) precached, versioned by build hash |
| Offline catalogue | Last validated manifest kept as an application-data snapshot; renders the full binder offline with an explicit offline badge |
| Offline photos | Photo derivatives (`tile`, `pack`, `detail`) in a byte- and count-bounded LRU; originals are structurally inadmissible |
| Update prompt | New SW detected → quiet "Neue Fassung bereit" affordance → reload only on confirm; `skipWaiting()` only after user action |
| Install affordance | One quiet offer, from the second visit, dismissible once and for good; iOS instruction sheet; no nagging |

**Out of scope, explicitly** — push notifications; analytics of any kind; background sync of
personal data (there is none: the collection state is first-party `localStorage` and never
leaves the device); `share_target` (PRD forbids browser upload); `file_handlers`,
`protocol_handlers`, `shortcuts` (each adds a deep-link surface and copy with no product need);
`periodicSync`; offline mutation queues; a separate `offline.html` (the shell renders its own
offline states — a second document would duplicate every string).

### 2. Ownership and boundaries

The service worker is an **IO adapter**, exactly like `manifest.ts` or `persistence.ts`: it owns
the browser's `fetch`, `caches` and `navigator.serviceWorker` APIs and nothing else.

| Module | Owns | Must never |
| --- | --- | --- |
| `src/sw/sw.ts` | Lifecycle, `fetch` dispatch, strategy wiring, cache maintenance | Contain business/domain rules; parse manifest content beyond shape checks |
| `src/sw/catalogue.ts` | `?list=1` / `photos.json` strategies, snapshot read/write, JSON shape validation | Trust an unvalidated body; store a snapshot that fails validation |
| `src/sw/derivatives.ts` | Retinue matching, admission rules, read-through caching | Store a response that fails admission; touch `?download=` |
| `src/sw/index.svelte`-free index (`cacheIndex.ts`) | IndexedDB LRU index (`bytes`, `lastAccess`, `ver`) | Decide policy (policy is passed in) |
| `src/lib/pwa/cachePolicy.ts` | **Pure** decisions: `shouldCache`, `selectPool`, `admitByCeiling`, `planEvictions`, `normalizeCatalogueKey` | Touch `caches`, `fetch`, `indexedDB`, or any global |
| `src/lib/pwa/register.ts` | Registration (lazy), update detection, `install` events, throttled `update()` | Auto-reload; call `skipWaiting` without a user action |
| `src/lib/pwa/install.ts` | `beforeinstallprompt` capture, visit counter, affordance visibility, iOS sheet | Show anything on the first visit; open a modal unprompted |

Everything policy-shaped is pure TypeScript in `src/lib/pwa/` so it is unit-tested in Vitest
(100 % branch coverage, §Testing below); the SW file is a thin, dependency-light adapter that
imports it — the same "derive, never copy / IO at the edges" rule as the rest of the app.

### 3. Build, versioning and deploy

- **Generation**: `vite-plugin-pwa`, `strategies: 'injectManifest'`, `registerType: 'prompt'`,
  source `src/sw/sw.ts`, output `dist/sw.js`. The plugin injects `self.__WB_MANIFEST` (the
  precache list with per-file revisions); the precache itself is Workbox `precacheAndRoute`
  (atomic install, revisioned entries, `cleanupOutdatedCaches: true`) because re-implementing
  precache correctness is a bug farm, not a craft signal.
- **Runtime strategies are first-party.** The required semantics — a 2.5 s network deadline
  with background revalidation, a byte-bounded LRU, and `no-store` data handled as application
  data — are not expressible in Workbox's declarative options, so they are written as plain
  `fetch` handlers over the pure policy module. Workbox is used for precache only.
- **Versioning**: `__BUILD_HASH__` is defined at build time as `git rev-parse --short=12 HEAD`
  plus `-dirty` when the tree is dirty (CI without git falls back to a content hash of `dist/`).
  It is the precache cache-name suffix (`elsa-precache-<buildHash>`) and a `data-version`
  attribute on `<html>` — a test seam, not a user-facing string.
- **`manifest.webmanifest`** is emitted by the plugin from `design/tokens/tokens.ts` values, so
  the dark parlour never flashes white at launch and the token gate covers the manifest
  (`theme_color ===  tokens.bg`, `background_color === tokens.bg` asserted in Vitest).
- **Deploy order (mandatory, IONOS FTP upload of `dist/`)**: (1) `assets/` — content-hashed,
  new filenames never overwrite; (2) `icons/`, `fonts/`; (3) `manifest.webmanifest`;
  (4) `sw.js`; (5) `index.html` last. A partially uploaded `sw.js` fails its install and the
  previous worker keeps serving (fail-safe), because every file it names is already present.
- **`.htaccess` additions** (host-side, one-time):
  - `AddType application/manifest+json .webmanifest` (`mod_mime`), `ExpiresByType
    application/manifest+json "access plus 1 hours"`.
  - `sw.js` must be revalidated: `<Files "sw.js"> Header set Cache-Control "no-cache,
    must-revalidate" </Files>` — the existing `ExpiresByType application/javascript "access
    plus 1 hours"` would otherwise delay updates; `updateViaCache: 'none'` is set as well, but
    the header is the guarantee that does not depend on browser behaviour.
  - `photos.php` image responses must either always be requested with an explicit `format=`
    (the manifest contract) **or** emit `Vary: Accept`; the client always uses explicit
    `format=`, and the SW refuses to cache any response whose `Vary` names a header other than
    `Accept-Encoding` (see §9).
- **No runtime dependency enters the app bundle**: SW registration is a lazy `import()` after
  first paint (`requestIdleCallback`, 2 s fallback); only the two `beforeinstallprompt`
  listeners attach at boot. The initial-JS budget is untouched.

### 4. Cache schema

All names are `elsa-` prefixed so `activate` and the reset flow can enumerate and delete them.
`CACHE_SCHEMA` (one exported constant, `src/lib/pwa/schema.ts`) versions every runtime cache; a
data-shape change bumps it and `activate` deletes any `elsa-*` cache whose version is not current.

| Cache / store | Contents | Bound (hard) | Versioned by |
| --- | --- | --- | --- |
| `elsa-precache-<buildHash>` | `index.html`, hashed `assets/*.js|css`, fonts (`/fonts/*.woff2`), icons, `manifest.webmanifest` | **≤ 400 KB** compressed total (CI gate) | build hash (new cache per deploy; old ones deleted) |
| `elsa-cat-v1` | Validated catalogue snapshot under `/photos.php?list=1`; last `photos.json` body under `/photos.json` | ≤ **2 MB**, 2 entries | `CACHE_SCHEMA` |
| `elsa-img-tile-v1` | `tile` derivatives only | **≤ 400 entries / ≤ 20 MB** | `CACHE_SCHEMA` |
| `elsa-img-large-v1` | `pack` + `detail` derivatives | **≤ 200 entries / ≤ 32 MB** | `CACHE_SCHEMA` |
| IDB `elsa-cache-index` (v1) | `{url, cache, bytes, lastAccess, ver}` per image entry | ≤ entry count of both image caches | `CACHE_SCHEMA` |
| *not cached at all* | `?download=`, `?view=`, `?capabilities=1`, any non-GET, any cross-origin, any `Range`, any non-2xx, any opaque response | — | — |

Device budget: **≤ 54 MB of app data** (400 KB precache + 2 MB snapshot + 52 MB derivatives),
stated in the UI's reset-cache copy and asserted in CI. Two image pools — not one — so that
browsing 200 big cards can never evict the binder's tiles: the offline *catalogue* must survive
the offline *detail* habit.

### 5. Strategy per resource (binding)

| # | Resource | Match | Strategy | Why |
| --- | --- | --- | --- | --- |
| 1 | App shell (document) | `request.mode === 'navigate'` | Precache, cache-first (`index.html`) | One page, no router; offline navigations must not touch the network. New builds arrive via the update flow, never by re-fetching the shell behind the user's back |
| 2 | JS / CSS | `/assets/*-<hash>.{js,css}` | Precache, cache-first, immutable | Content-hashed names: a hit can never be stale |
| 3 | Fonts | `/fonts/*.woff2` | Precache, cache-first | Self-hosted (no CDN); a font that misses is a visible reflow |
| 4 | Icons / manifest | `/icons/*`, `/manifest.webmanifest` | Precache, cache-first | Install dialog and launcher must work offline |
| 5 | Photo derivatives | same origin **and** (`photos.php?image=…` with `size=tile|pack|detail`, or `photos/thumbs/…`, or `photos/derived/…`) | Runtime **cache-first** into the rendition's pool, admission-gated (§9), LRU-evicted | Derivative URLs carry `&v=<ver>` and are immutable (ADR-0008): a cached byte is never wrong for that URL |
| 6 | Manifest, runtime | `/photos.php?list=1` (any `ts` param ignored) | **Network-first, 2.5 s deadline → snapshot fallback; the in-flight request keeps running and refreshes the snapshot** | Freshness first (FTP drop), instant paint second. A slow 3G response still lands — for the next load and for the `online` revalidation |
| 7 | Manifest, no snapshot yet | same | Pass through to network (no SW timeout of its own) | The app already owns its 3 s / 4 s fallback chain (`manifest.ts`); the SW must not double-race it |
| 8 | Static manifest fallback | `/photos.json` | **Stale-while-revalidate** | It is a build-time file; last-known is strictly better than nothing, and the catalogue snapshot above wins when both exist |
| 9 | Downloads | `?download=` / `?view=` / `?capabilities=1` | **Not intercepted** (`return` without `respondWith`) | `Content-Disposition` must be handled by the browser; 1600 px attachments are the largest bytes and are user-initiated only |
| 10 | Everything else (same origin) | — | Pass through, never stored | Default-deny: an unlisted URL has no caching contract |
| 11 | Cross-origin | — | Pass through, never stored | PRD §5; and there should be no such request at all (`privacy.spec.ts` already asserts zero) |

**Snapshot storage is not HTTP caching.** `?list=1` is served `Cache-Control: no-store`; the SW
does not keep that response object. It parses and validates the body, then writes **its own**
serialization under `/photos.php?list=1` in `elsa-cat-v1`. That keeps `no-store` semantics
intact (nothing is reused as an HTTP cache entry) while giving offline the data it needs. Only a
body that passes `JSON.parse` + the manifest shape check (`photos` array, `generated` string,
per-entry `id` string) is written; a malformed body never replaces a good snapshot.

**Freshness rules (the FTP-drop guarantee).**

1. Every *online* boot issues the live `?list=1` request; the snapshot is only served when the
   network is slow (> 2.5 s) or failed.
2. `window.addEventListener('online')` triggers one immediate revalidation; a changed manifest
   updates the binder in place — no reload, no prompt (data, not code).
3. The offline badge exposes an explicit "Aktualisieren" action that fetches `?list=1` with
   `cache: 'reload'`, bypassing every layer.
4. The snapshot keeps the server's `generated` stamp and response `Date`; the offline badge
   shows that date, so "the catalogue is from Tuesday" is visible, not inferred.

### 6. Service-worker lifecycle and update flow

```
install   → precache shell atomically (Workbox addAll semantics). NO skipWaiting().
            Optionally precache the current `?list=1`? NO — never; the catalogue is runtime data.
activate  → delete every elsa-* cache whose CACHE_SCHEMA ≠ current; drop stale precache caches;
            clients.claim() (so the first visit becomes controllable and offline works from visit 1)
waiting   → page detects (boot: getRegistration().waiting; live: updatefound → installed)
            → posts nothing; the quiet "Neue Fassung bereit" affordance appears
confirm   → page posts { type: 'SKIP_WAITING' } → sw skipWaiting() → controllerchange
            → page reloads ONCE (guarded by a sessionStorage flag keyed on build hash)
```

Rules that are not negotiable:

- **No automatic reload, ever.** No `registerType: 'autoUpdate'`, no reload on `controllerchange`
  without a recorded user confirmation.
- **No update check mid-threshold.** Checks run at boot and on `visibilitychange` → visible,
  throttled to once per 60 minutes per session (plus the boot check). A pack in progress is
  never interrupted; the affordance is a footer line, not a banner over the cards.
- **`skipWaiting` only from a user gesture** on the affordance. The waiting worker otherwise
  activates when the last client closes — the browser's own, safe default.
- **Dismissal is per build.** `lucky-elsa.update.v1 = { v: 1, data: "<buildHash>" }`; the same
  waiting build is not offered twice. A newer build is offered once again.
- **First-visit control**: because `clients.claim()` runs at activation, the app is offline-capable
  after the *first* successful visit — not the second. (Claiming does not reload the page and
  cannot interrupt a pack; `skipWaiting` can, which is why it is user-gated.)

### 7. Offline and degraded states (taxonomy)

`navigator.onLine` is a lie on captive portals and flaky radio; **fetch outcome is the
authority**, `onLine` is only a hint for the badge.

| State | Trigger | Behaviour | Copy key (writer owns) |
| --- | --- | --- | --- |
| `shell-cold` | Shell cached, **no** catalogue snapshot, network down | Shell renders; the stage shows "no catalogue yet" and says one online visit is needed. No spinner, no retry storm (one action, disabled for 10 s after a failure) | `state.offline.nocache` |
| `catalogue-warm` | Snapshot exists, live request failed or exceeded 2.5 s | Full binder from snapshot; explicit **offline badge** in the meta line with the snapshot date; pack opening, reveal, detail, language switch, progress and reset all work | `state.offline.badge`, `state.offline.date` |
| `catalogue-stale` | `catalogue-warm` **and** snapshot age > 24 h | Same, plus the badge states the age plainly. Still no error chrome | `state.offline.age` |
| `image-miss` | Card image not in cache **and** network down | Card frame + name plate + printed text + foil; the art window shows the frame's neutral plate, **never an empty box**, never an error dialog (matches the existing `image-failed` silence in the copy deck) | — (deliberately silent, per `state.image.failed`) |
| `update-waiting` | New SW in `waiting` | Quiet footer affordance, dismissible per build | `update.ready`, `update.reload`, `update.dismiss` |
| `online-restored` | `online` event or a successful request | Badge clears; one manifest revalidation; a polite live-region announcement once per transition | `state.online.restored` |

A **true first visit with no prior connection cannot render anything** — no web page can; the
browser shows its own offline page. `shell-cold` is the state a PWA owner actually meets
(installed or previously visited, catalogue never successfully loaded), and the ADR says so
rather than promising more than the platform allows.

### 8. Install UX — one quiet offer, never a nag

- **Visibility rule** (all must hold): `visits ≥ 2` (`lucky-elsa.visits.v1`, incremented at most
  once per tab session via `sessionStorage` `lucky-elsa.session.v1`), not already running
  standalone (`display-mode: standalone` or `navigator.standalone`), not dismissed
  (`lucky-elsa.install.v1`), and either a captured `beforeinstallprompt` or an iOS device.
- **Affordance**: a single text row in the footer/meta area ("Auf dem Gerät ablegen" —
  `install.cta`), with a dismiss control. Not a banner, not a modal, not a popover, no animation
  beyond its own insertion, no layout shift (it occupies a reserved line).
- **`beforeinstallprompt`**: `preventDefault()`, store the event, show the affordance.
  `prompt()` is called **only** from the affordance's click; `userChoice.outcome === 'dismissed'`
  persists the dismissal (`install.dismissed`), which is permanent — never ask again;
  `appinstalled` removes the affordance and the stored event.
- **iOS**: no prompt event exists. Detect iOS Safari not running standalone → a one-time
  instruction sheet ("Teilen → Zum Home-Bildschirm") as a native `<dialog>` with focus return,
  shown at most once ever (`install.ios.shown`), skippable.
- **Hard no-nag tests**: visit 1 shows nothing; nothing appears without a user gesture; the
  affordance never repeats after dismissal; no auto-opening dialog exists in the codebase.

### 9. Privacy and security invariants

| Invariant | Mechanism |
| --- | --- |
| Same-origin only | First line of every handler: `url.origin !== self.location.origin → return` (no `respondWith`). Cross-origin responses are never stored. |
| No third-party requests | Unchanged from PRD §5; `privacy.spec.ts` still asserts zero. The SW cannot introduce one — it has no `importScripts` from a remote origin and the built SW is fully self-contained. |
| Cache partitioning | Cache Storage is origin-scoped; the app is never framed (`X-Frame-Options: SAMEORIGIN`). Partitioning is therefore a browser guarantee we rely on and do not work around; no cache name is shared with any other origin. |
| No credentials in cache | Bypass when `request.credentials === 'include'` or an `Authorization` header is present; never store a response carrying `Set-Cookie`. The app sends neither. |
| `Vary` correctness | Cache key is the full request URL (the only normalization: `?list=1` drops `ts` and other params, because the endpoint ignores them and always returns the whole catalogue). A response whose `Vary` names anything other than `Accept-Encoding` — or is `Vary: *` — is not cached. Format negotiation is **URL-encoded** (`format=jpeg|webp`) per ADR-0008, so a WebP body can never be served for a JPEG URL. |
| Opaque / partial / error | Never cached: `response.type === 'opaque'`, `status !== 200`, `206`, `Range` requests. |
| Originals are inadmissible | Five-gate admission (below), so even a compromised or misconfigured server cannot push source bytes into the cache. |
| Clear-cache in the reset flow | `reset` dialog gains an explicit second action (`reset.cache.cta`) with its own confirmation: clears `elsa-cat-*`, `elsa-img-*`, the IDB index, and the catalogue snapshot. The precached **app shell is kept** (it is the app, not data) and the SW is not unregistered. The ratified `reset.body` string is untouched (D-05). |
| Schema change → version bump | `CACHE_SCHEMA` constant; `activate` deletes non-current `elsa-*` caches; a snapshot from an older schema is discarded, not read. |

**Derivative admission (all five must pass, checked before any `cache.put`):**

1. URL is in the allowlist: same origin, `photos.php` with `image=` **and** a ladder
   `size=tile|pack|detail` (never `download`, never a numeric size), or `photos/thumbs/*`,
   or `photos/derived/*`.
2. `status === 200`, `type !== 'opaque'`, GET only.
3. `Content-Type` starts with `image/`.
4. Size ≤ the rendition's ceiling + 8 KB slack (`src/lib/pwa/limits.ts`, mirrored by
   `tests/fixtures/image-budgets.json` with a parity test): tile 55 KB, pack 110 KB, detail
   210 KB (JPEG ceilings; WebP is smaller). `Content-Length` is used when present, otherwise the
   body is measured before storing. Over the ceiling → serve it, **do not store it**.
5. No `Set-Cookie`; `Vary` absent or `Accept-Encoding` only.

**Eviction** (`planEvictions(entries, budget)` — pure, unit-tested): on each insert, if
`bytes + newSize > maxBytes` or `count + 1 > maxEntries`, evict by ascending `lastAccess` until
both hold, then write. The index is updated in one IDB transaction; a lost index entry is
self-healing (the entry is treated as evictable first). Eviction never touches `elsa-cat-v1` and
never evicts from the other pool.

### 10. Degradation ladder (what happens when the PWA cannot do its job)

1. No SW support (old browser, private mode where registration fails) → the app runs exactly as
   today, online-only. No error UI, no console flood.
2. SW registered but precache incomplete → install fails; old SW (or none) keeps serving; the
   app is online-only until the next successful visit.
3. Storage quota exceeded / `QuotaExceededError` → the derivative cache stops growing (evictive
   insert), the app continues; the install affordance is hidden (an install that cannot cache is
   a broken promise).
4. iOS 7-day eviction → `shell-cold` state, one online visit restores everything.
5. Snapshot invalid after a schema bump → discarded, refetched; never partially read.

## Consequences

**Positive**

- The catalogue opens on a train. The shell costs zero network on repeat visits; LCP improves
  rather than degrades, because registration is deferred past first paint.
- Offline is *bounded* and *inspectable*: fixed cache names, hard byte/count caps, a pure policy
  module that a unit test can exhaust, and a clear-cache action with confirmation.
- The owner's workflow is protected structurally: network-first on every online boot, a 2.5 s
  deadline that still lets the slow response land for next time, an `online` revalidation, and a
  manual "Aktualisieren" that bypasses everything.
- Originals cannot enter the cache even if the server misbehaves — admission rule 4 makes a
  4 MB source fail on size before it becomes a cache entry.
- The update flow cannot cost a pack: no auto-reload path exists in the code, so the failure
  mode is "the visitor sees a quiet line and ignores it."

**Negative / accepted costs**

- **A second code path to keep correct.** The SW is a fetch layer over the app; a cache bug is
  an "app is wrong" bug, not a "slow" bug. Mitigation: the strategy logic is pure and
  100 %-branch-tested; the SW file is thin; every cache behaviour has a Playwright test against
  the built app with `setOffline(true)`.
- **Storage on the visitor's device**: up to ~54 MB. Justified by the product (an offline photo
  catalogue) and capped; the reset-cache action is the escape hatch.
- **`vite-plugin-pwa` + `workbox-precaching` are build-time dependencies** (no runtime payload
  enters the app bundle). Pinned exactly, like every other tool in ADR-0001; the fallback is a
  ~60-line first-party Vite plugin emitting `self.__WB_MANIFEST` from `build.manifest` and a
  hand-written precache installer — recorded so a plugin regression is a day, not a redesign.
- **iOS eviction is a real limitation** (~7 days without use for non-installed sites). The app
  degrades honestly; it cannot do better without an Apple-side policy change.
- **Two documents lag this ADR** and need owner edits (same pattern as ADR-0008's PRD R4 note):
  `PRD.md` §7 assumption 2 ("No build pipeline, no database, **no service worker**") is
  superseded by D-01; and `PRD.md` §5 Compatibility/PWA is silent on install, so the
  architecture is binding until the PRD is restated. `docs/test-plan.md`'s `serviceWorkers:
  'block'` default is now scoped to the non-PWA suites (a documented change, not a silent one).
- **Lighthouse cannot gate this.** The category was removed in Lighthouse 12; anyone who asks
  "is the PWA score green?" is asking about a metric that no longer exists. The deterministic
  suite plus CDP installability is the answer, and the ADR says why.

## Performance Implications

| Budget | Value | Enforced by |
| --- | --- | --- |
| Precache total (compressed) | **≤ 400 KB** | CI reads the injected `__WB_MANIFEST` + emitted files |
| Service worker bundle (gzip) | **≤ 25 KB** | CI size check on `dist/sw.js` |
| Initial app JS | unchanged (≤ 60 KB target / 100 KB cap) | registration is a lazy `import()` after first paint |
| First visit, added bytes before LCP | **0** — precache starts after first paint / idle | Playwright: no `sw.js` or precache request in the LCP window |
| Repeat visit network for shell | **0 requests** | Playwright request log, offline reload |
| Offline catalogue (all tiles) | ≤ 20 MB | tile pool cap |
| Device app data total | **≤ 54 MB** | cache-bounds test sums entry sizes |
| Cache admission | every cached image ≤ its rendition ceiling | UI-observed `Cache` iteration + `Content-Length` |

Latency: `?list=1` renders within 2.5 s worst case when a snapshot exists (deadline), normally
in one round trip; offline navigations are cache reads with no network attempt at all.

## Alternatives Considered

| Alternative | Why rejected |
| --- | --- |
| **`generateSW` (Workbox declarative config)** | Cannot express the required byte-bounded LRU, the 2.5 s deadline with background revalidation, or 5-gate admission. It would produce a config that *looks* like the strategy table and cannot honour the columns. |
| **Fully hand-written precache** (no Workbox at all) | Reimplements revisioning, atomic install and cache cleanup — the exact places where a subtle bug silently serves a mixed-version app. Workbox is used for the one job it is unambiguously better at. |
| **`registerType: 'autoUpdate'`** | Violates D-01 ("no forced reload mid-pack"). Rejected on product grounds, not engineering ones. |
| **Single unbounded image cache with `ExpirationPlugin`** | Count-only bound: 200 detail images can be 50 MB+ and the tile set can be evicted entirely, so the offline *catalogue* breaks while the offline *detail* works. Two pools with byte caps is the fix. |
| **`Cache-Control`-driven caching only (no SW)** | No offline shell, no offline catalogue, no bounded derivative store, no update prompt. Not a PWA. |
| **Cache the `no-store` manifest response as-is** | Semantically wrong (we would be reusing a response the server forbade caching) and structurally fragile (a malformed body replaces a good one). App-data snapshot + validation is correct. |
| **Third-party caching layer / CDN** | Zero third-party requests (PRD §5/§7). |
| **Server-rendered offline page (`offline.html`)** | A second document duplicates every string and every state; the shell already knows how to say "no catalogue yet". |
| **`?download=` cache-first** | The 1600 px attachment is the largest byte class and is user-initiated; caching it doubles storage for no offline benefit. |
| **Push / background sync / periodicSync** | Explicitly out of scope (D-01); no personal data leaves the device, so there is nothing to sync. |

## Validation Checklist

Before the PWA layer ships (each line is a test ID in `docs/test-plan.md`):

- [ ] **Manifest**: `name` "Elsa the Explorer", `short_name`, `id: "/"`, `start_url: "/"`,
      `scope: "/"`, `display: standalone`, `lang: de`, `dir: ltr`; `theme_color` and
      `background_color` **equal `tokens.bg`**; icons 192/512 `any` + 512 `maskable` +
      `apple-touch-icon` 180 all resolve and decode (sharp); no `prefer_related_applications`.
      (`E-PWA-10`, `U-PWA-10`)
- [ ] **Browser installability**: CDP `Page.getInstallabilityErrors` returns `[]` on Chromium
      against the built app; WebKit reports "not applicable" with a recorded reason.
      (`E-PWA-11`)
- [ ] **Offline cold**: shell cached, catalogue never loaded → offline reload shows the shell and
      the "no catalogue yet" copy, no spinner, no error dialog. (`E-PWA-01`)
- [ ] **Offline warm**: visit, open a pack, offline reload → full binder, offline badge with the
      snapshot date, pack opens offline, cached images render, progress intact. (`E-PWA-02`)
- [ ] **Offline image miss**: a card whose derivative was never fetched renders frame + printed
      text, art window not empty, no error chrome. (`E-PWA-03`)
- [ ] **Update flow**: build B deployed → "Neue Fassung bereit" appears quietly; **no** reload
      without confirm; a pack opened mid-update is never interrupted; confirm → one reload →
      new `data-version`. (`E-PWA-04`)
- [ ] **Cache bounds**: over-filling derivatives keeps `elsa-img-tile-v1` ≤ 400/20 MB and
      `elsa-img-large-v1` ≤ 200/32 MB; LRU order is oldest-first; `elsa-cat-v1` never evicted.
      (`E-PWA-05`, `U-PWA-03..06`)
- [ ] **No original in the cache**: after a full journey + overfill, no cache key matches
      `/photos/<original>` and no cached body's SHA-256 equals a recorded source hash.
      (`E-PWA-06`)
- [ ] **Install UX**: nothing on visit 1; affordance on visit 2 only; dismissal is permanent;
      `prompt()` only from a click; iOS sheet at most once. (`E-PWA-07`)
- [ ] **Privacy**: zero third-party requests and zero cross-origin cache entries; credentials and
      `Set-Cookie` responses bypass; `Vary` outside `Accept-Encoding` bypasses. (`E-PWA-08`)
- [ ] **Reset cache**: confirmation required; clears `elsa-*` data caches and the snapshot; keeps
      the app shell so the app still opens offline; `reset.body` unchanged. (`E-PWA-09`)
- [ ] **Freshness**: a replaced photo (new `ver`) appears after one reload while offline data
      still serves; a slow (> 2.5 s) `?list=1` still updates the snapshot for the next load.
      (`E-PWA-12`)
- [ ] **Budgets**: precache ≤ 400 KB compressed, `dist/sw.js` ≤ 25 KB gzip, no SW/precache request
      before first paint. (`CI gate 10`)
- [ ] **Lighthouse**: run advisory (performance/accessibility/best-practices); the PWA category
      does not exist since Lighthouse 12 and is **not** a gate. Record the report artifact.
- [ ] **Manual, iOS**: installed from the home screen via the instruction sheet; offline reload;
      7-day-eviction degradation accepted and observed at least once in a fresh container.
