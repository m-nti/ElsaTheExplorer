# Elsa the Explorer

Elsa is a dog. This is her collection: four cards to a pack, each one *gesammelt* / collected, the museum growing a room at a time. She has not read the plaques. She trusts us.

**Die Sammlung / The Collection** is the product. Elsa is the collection mechanism.

German first; English one tap away. No accounts, no analytics, no third-party requests; the only data kept is on the visitor's own device.

## House rules

- Four cards to a pack. None repeats inside it, and at least one shines.
- German speaks to the visitor as *du*. English keeps the same warmth and wink.
- **No water.** Elsa hates it: no wet-dog, rain, mud or bathing content, and no water jokes. The sixth room is **Der Abfahrtsaal / The Departure Hall**.
- We take the plaques, editions and rooms entirely seriously. Elsa does not, but she allows it.
- No marketing voice, no gift framing, no invented measurements, no gambling.

The voice law and the full vocabulary live in `design/copy/copy-deck.md` §0.4. `npm run canon` keeps them honest.

## Stack

Svelte 5 + Vite 8 + TypeScript 7 (strict, native compiler) + Panda CSS 2. No SvelteKit, no SSR; the build is static. Vitest covers unit and canon tests, Playwright the browser, sharp the local image derivatives. Versions are pinned in `package.json`, the lockfile and `.nvmrc` (Node 26).

## Run it

```sh
npm ci
npm run dev       # http://localhost:5173
npm run verify    # the enforced gate chain, in CI order
```

`npm run build` writes `dist/`; `npm run preview` serves it on <http://127.0.0.1:4173>. `npm run verify` reads `.github/gates.json`, and `npm run ci:gates` proves that list and CI agree. A push runs the same chain through `.githooks/pre-push`: clean tree, linux lockfile check, `verify`. A deliberate skip is `SKIP_VERIFY=1`, named in the pull request.

## Photos

Photos are not release content; they are runtime data. The owner drops files into `photos/`, and nothing is rebuilt. `photos.php` serves the manifest and the derivatives (tile, pack, detail, download), never an original. The ladder is fixed at 360 / 720 / 1200 / 1600 px. Captions, alt text and the bilingual name live in `photos/captions.json`; `photos/captions.example.json` shows the shape.

`scripts/photos.mjs` is the local sharp counterpart and is never uploaded. `npm run dev` and `npm run preview` serve `/photos/*` through a dev-only middleware with the same containment rules, so local QA needs no PHP.

## Deploy

`dist/` goes to the IONOS document root. `photos.php`, `photos/.htaccess` and the derivative-cache skeleton are versioned and safe to upload at any time; assets go first, `index.html` last. Never delete and upload in one pass. The release contract is `docs/adr/ADR-0007-release-deploy.md`.

## Privacy

First-party `localStorage` only, under `lucky-elsa.*`: what was already opened, language, sound, milestones. No accounts, no cookies, no analytics, no tracking, no external fonts or CDNs. Reset clears every key it owns, after a confirmation. The guarantees are `PRD.md` §5/§7.

## Where things live

| Path | What is in it |
| --- | --- |
| `AGENTS.md` | the binding project instructions |
| `PRD.md` | why this exists, personas, scope, non-functional requirements |
| `design/` | brief, GDDs, UX specs, art bible, copy deck, tokens, accessibility tier |
| `design/tokens/tokens.ts` | the typed token source; WCAG ratios are computed and gated here |
| `docs/architecture.md` | layers, contracts, persistence, PWA, performance budget |
| `docs/adr/` | the decisions |
| `docs/superpowers/plans/` | the delivery harness and the plan per ticket |
| `docs/test-plan.md` | test IDs, fixtures, gate order, definition of done |
| `docs/decisions.md` | owner rulings |
| `docs/photo-pipeline-implementation.md` | the `photos.php` contract and the static generator |
| `docs/cross-machine/` | setup for another machine, including the IONOS lftp templates |

Private project. The photographs are personal and are not in the repository; no licence to them is granted or implied.
