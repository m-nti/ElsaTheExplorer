# Test Infrastructure

**Stack**: Svelte 5 + Vite 8 + TypeScript 7 (svelte-check via TS 6 + `@typescript/native`) ·
Vitest 5 · Playwright 1.65 · Panda CSS 2.0
**CI**: `.github/workflows/ci.yml`
**Setup**: B0/B1 scaffold, 2026-11-22

## Layout

```
tests/
  unit/            # Vitest, node environment, pure domain/token tests
    contrast.test.ts
  e2e/             # Playwright, built app through `vite preview`
```

## Commands

| Command | What it runs |
| --- | --- |
| `npm run test:unit` | Vitest `unit` project (`tests/unit/*.test.ts`) |
| `npm run test` | Alias for the full Vitest run (same project until integration lands) |
| `npm run test:e2e` | Playwright against `vite preview` on `127.0.0.1:4173` |
| `npm run check` | `svelte-check --tsgo` (compiler API via `@typescript/native` 7) |
| `npm run check:ts` | `node ./node_modules/@typescript/native/bin/tsc --noEmit` — the 7.0.2 compiler by path, not `.bin/tsc` (install order) |
| `npm run gate:contrast` | The token contrast gate alone |

## Gate order (CI)

1. `tsc --noEmit` (`npm run check:ts`)
2. `svelte-check --tsgo` (`npm run check`)
3. Stylelint on scoped CSS (`npm run stylelint`)
4. Cross-file selector diff (`npm run gate:selectors`)
5. Unused CSS via the Svelte compiler (`npm run gate:unused-css`)
6. ESLint (`npm run lint`)
7. knip (`npm run knip`)
8. jscpd (duplicate code)
9. Vitest, including the contrast gate (`npm run test:unit`); coverage attaches when the domain/store suites land
10. Build (`npm run build`)
11. Playwright (skipped by CI until the first spec exists)

## Data rules

- Tests never read `photos/` and never commit a production photo. Image fixtures are
  generated into a gitignored directory when the image-contract suite lands
  (`docs/test-plan.md` §4.2).
- Unit tests are deterministic: no wall clock, no unseeded randomness, no sleeps.
- The contrast gate is tested in both directions: the production token set passes and the
  legacy `#756e7d` is rejected (including an injected-into-production-set case).
