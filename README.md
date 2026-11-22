# Elsa the Explorer

A card library about one dog. The committed form: a pack holds **four cards**, revealed one
after another; German is what a visitor sees first and English is one tap away; everything is
built in the repo and ships as static files to an IONOS webspace, where nothing is built or run
except `photos.php` when the host has PHP.

**Die Sammlung / The Collection** is the product; Elsa is the collection mechanism, and cards are
*gesammelt* / *collected*. The terms are fixed in both languages: **Die Sammlung / The
Collection**, **gesammelt / collected**, **Der Abfahrtsaal / The Departure Hall**.

No accounts, no analytics, no third-party requests. The only data stored anywhere is on the
visitor's own device.

## Status: v2 in progress

The app is being rebuilt on Svelte 5 + Vite 8 + TypeScript + Panda CSS. The v1 vanilla
implementation is archived in `legacy/` — kept as reference, not built, not deployed.

What exists in this tree today:

- **B0 scaffold:** toolchain, Panda codegen, ESLint/Stylelint/knip/jscpd, the CI gate chain and
  `npm run verify`. Record: `docs/build/b0-b1-verification.md`.
- **B1 tokens and gates:** the typed token source, rarity recipes, and the contrast gate with its
  negative proofs.
- A shell that renders **one sample card** (`src/App.svelte` is a B1 fixture), plus in-memory
  collection/audio/i18n stores and a handful of pure domain functions under `src/lib/domain/`.

The pack theatre, the collection, the reading room, the meta layer and the PWA are **not built
yet**. They are phases B2 to B8, one ticket each, tracked in `docs/action-plan.md` §3. Design,
copy and architecture are settled and binding; the build catches up to them. The gates that
cannot run yet are declared pending in `.github/gates.json` and are listed under *Gates* below.

Read `docs/action-plan.md` §0 before contributing: it is the delivery harness — a worktree per
ticket, a committed plan, TDD (or a named gate for a docs task), review by a dedicated agent, and
pasted evidence before any claim.

## Stack

Versions are pinned in `package.json` and `package-lock.json`; `.nvmrc` pins Node.

| Piece | Version | Notes |
| --- | --- | --- |
| Node | 26 (`.nvmrc`, `engines: >=26`) | npm 11.6.2 declared in `packageManager` |
| Svelte | 5.59.1 | runes-based stores; no SvelteKit, no SSR |
| Vite | 8.3.8 | plain app build, with `@sveltejs/vite-plugin-svelte` 7.3.1 |
| TypeScript | 7.0.2 | native compiler via the `@typescript/native` alias, strict |
| TypeScript (check) | 6.0.3 | the API `svelte-check --tsgo` runs against |
| Panda CSS | 2.6.0 | typed tokens and rarity recipes, static output, no runtime CSS-in-JS |
| Vitest | 5.1.1 | two projects: `unit` and `canon` |
| Playwright | 1.65.1 | end-to-end against `vite preview`; the suite is pending (#24) |
| sharp | 0.35.5 | **dev-only** image generator for local QA, never shipped |

Also present: ESLint 10, Stylelint 18, knip 6, jscpd 5.

## Local workflow

```bash
npm ci            # pinned install; the lockfile must install on linux/x64 too
npm run dev       # Vite dev server on http://localhost:5173
npm run verify    # every enforced gate, in CI order, stopping at the first failure
```

`npm run verify` reads `.github/gates.json` and runs the scripts CI runs; `npm run ci:gates`
proves the two lists agree, so a gate cannot be skipped by a typo. Paste its last line when you
report — a green run is evidence, an intended run is not.

| Command | What it does |
| --- | --- |
| `npm run build` | `panda codegen && vite build` → `dist/` |
| `npm run preview` | serves `dist/` on <http://127.0.0.1:4173> (Playwright's base URL) |
| `npm run check` | `svelte-check --tsgo` |
| `npm run check:ts` | `tsc --noEmit` |
| `npm run test:unit` | Vitest `unit` project with coverage |
| `npm run test:canon` | the canon gate's own self-tests |
| `npm run canon` | the vocabulary/canon gate (see *Canon*) |
| `npm run canon:strict` | the same gate as a ratchet: the known-defect baseline fails it |
| `npm run photos` | the sharp derivative generator — **not implemented yet**; it fails loudly until I3 (#21) |

### Pre-push hook

`npm run prepare` sets `git config core.hooksPath .githooks`, so every push runs
`.githooks/pre-push`:

1. the working tree must be clean — the hook verifies the tree, but the push sends the commit;
2. `npm run lockfile:check` proves the lockfile still installs on CI's linux/x64 platform;
3. `npm run verify` runs the full enforced gate set.

A deliberate bypass is `SKIP_VERIFY=1 git push`. It is for a hotfix, and it must be named in the
pull request; a red CI run on work pushed with the hook skipped is attributed, not shrugged at.

## Gates

Twelve gates are enforced and run by `npm run verify`: `canon` · `canon-self-test` · `typecheck`
· `svelte-check` · `stylelint` · `selector-diff` · `unused-css` · `eslint` · `knip` · `jscpd` ·
`unit` · `build`.

Four are **pending** in `.github/gates.json` with their ticket, and cannot report success:
`e2e` and `axe` (#24), `budget` (#25), `pwa` (#19). Nothing in this README claims them.

## Photos

Photos are **runtime data**, not release content. The owner drops new files into `photos/` over
FTP and reloads; nothing is rebuilt and nothing is redeployed.

- `photos.php` is the runtime manifest source, implemented to the contract in
  `docs/photo-pipeline-implementation.md` §3 and `docs/adr/ADR-0008-image-derivatives.md`:
  `?list=1` returns the manifest, `?image=NAME&size=tile|pack|detail&format=jpeg|webp` returns a
  derivative, `?download=NAME` is the 1600 px rung. `?thumb=` is the 720 alias; `?view=` is
  retired and answers with a redirect, never bytes.
- **No-original rule:** no code path returns an unprocessed source byte — a failure is a status
  code, never a file. Originals are never served to the UI, and a release never overwrites,
  deletes or syncs `photos/`.
- The ladder is fixed at 360 / 720 / 1200 / 1600 px, JPEG with WebP where the host can encode it.
  Numeric `size=` values are rejected by design.
- Per-photo copy — bilingual name, mood, caption, alt text — lives in `photos/captions.json`;
  `photos/captions.example.json` shows the shape.
- `scripts/photos.mjs` is the Node/sharp counterpart for **local dev and QA only** and is never
  uploaded. It is a fail-loud placeholder until the sharp ladder and manifest v2 land in I3
  (#21); the specification is the same document as above.
- `npm run dev` and `npm run preview` serve `/photos/*` through a dev-only Vite middleware with
  the same containment rules as the PHP layer, so local QA needs no PHP at all.

## Deploy

The artefact is `dist/` from `npm run build`, uploaded to the IONOS document root over FTP. No
staging, no shell, no cron, no database, one operator.

1. The server-side files versioned in the repo — `photos.php`, `photos/.htaccess` and the
   derivative-cache skeleton (`photos/.cache/`, committed with its deny file) — safe at any
   time.
2. `assets/` (content-hashed), then `fonts/`, `icons/`, `manifest.webmanifest`.
3. `sw.js` — only after every asset it precaches.
4. `index.html` **last**, because it names the new bundle.

Never delete and upload in one pass; keep the previous build's hashed assets for one release.
Rollback is re-uploading the previous `release/<version>-<hash>/` artefact. Release unit, version
identity and live checks: `docs/adr/ADR-0007-release-deploy.md`; PWA deploy order:
`docs/adr/ADR-0009-pwa.md`.

`photos.php` is the only server-side code, and it is only used when the host has PHP. Its host
capabilities (GD/WebP/Imagick, memory limit, writable cache directory) are external facts
verified on the webspace at first deploy (I4, #22), not knowable from the repo. The PWA (offline
shell, derivative cache, quiet update) is specified in ADR-0009 but its gate is pending (#19), so
treat it as a plan, not a shipped feature.

## Privacy

Storage is first-party `localStorage` only, under the `lucky-elsa.*` namespace (ADR-0003): what
was already opened, language, sound, milestones. No accounts, no cookies, no analytics, no
tracking, no external fonts or CDNs. Reset clears every key it owns, after a confirmation. The
guarantees and the non-goals are `PRD.md` §5/§7. Persistence attaches to the stores in a later
phase; today the store is in-memory (see *Status*).

## Canon

- The entity is **Die Sammlung / The Collection**; the progress verb is **gesammelt /
  collected**. No other name is used for it.
- A pack holds **four cards**, none repeated inside the pack, at least one rare or holographic.
- German addresses the reader as *du* — the informal you, never *Sie*; English is plain and warm.
  No marketing voice, no invented measurements.
- **No water content.** Elsa hates water: no water-themed cards, copy, jokes or rooms. The sixth
  room is **Der Abfahrtsaal / The Departure Hall**.

`npm run canon` enforces that vocabulary in `design/`, `docs/`, `src/`, `PRD.md` and `AGENTS.md`,
with reasoned exemptions in `scripts/canon-allowlist.json`. It does not scan this README, so the
rules here hold by care, not by gate.

## Where the documents live

| Path | What is in it |
| --- | --- |
| `AGENTS.md` | the binding project instructions: canon, workflow, reviews, board |
| `PRD.md` | why this exists, personas, scope, non-functional requirements |
| `design/` | game brief, GDDs, UX specs, art bible, copy deck, tokens, accessibility tier |
| `design/tokens/tokens.ts` | the typed token source of truth; WCAG ratios are computed and gated here |
| `docs/architecture.md` | layers, data contracts, persistence, PWA, performance budget, folder structure |
| `docs/adr/` | ADR-0001 to ADR-0009: stack, styling, persistence, manifest, i18n, testing, release, images, PWA |
| `docs/action-plan.md` | the harness (§0) and every phase, ticket and status |
| `docs/superpowers/plans/` | one committed plan per ticket, with the mandatory header |
| `docs/test-plan.md` | test IDs, fixtures, gate order, definition of done |
| `docs/decisions.md` | owner rulings (D-01 to D-09) |
| `docs/photo-pipeline-implementation.md` | the `photos.php` endpoint contract and the static generator |
| `docs/build/` | build-phase verification records |

## Licence and content

Private project. The photographs are personal and are not part of the repository; no licence to
them is granted or implied.
