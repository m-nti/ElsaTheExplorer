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
| `npm run check:paths` | Internal links and backticked repo paths must resolve (issue #61) |
| `npm run gate:plan-status` | A plan may not call a merged PR "in review"; warns without `gh` |

## Gate order (CI)

1. `ci:gates` — the manifest ratchet: every declared gate has a script and a step
2. `tsc --noEmit` (`npm run check:ts`)
3. `svelte-check --tsgo` (`npm run check`)
4. Stylelint on scoped CSS (`npm run stylelint`)
5. Cross-file selector diff (`npm run gate:selectors`)
6. Unused CSS via the Svelte compiler (`npm run gate:unused-css`)
7. ESLint (`npm run lint`)
8. knip (`npm run knip`)
9. jscpd (duplicate code)
10. Vitest, including the contrast gate (`npm run test:unit`); coverage attaches when the domain/store suites land
11. Build (`npm run build`)
12. Playwright (skipped by CI until the first spec exists)

Document gates run before the compilers: `canon` + its self-tests, `gate:tables`,
`check:paths`, `gate:plan-status`.


## Data rules

- Tests never read `photos/` and never commit a production photo. Image fixtures are
  generated into a gitignored directory when the image-contract suite lands
  (`docs/test-plan.md` §4.2).
- Unit tests are deterministic: no wall clock, no unseeded randomness, no sleeps.
- The contrast gate is tested in both directions: the production token set passes and the
  legacy `#756e7d` is rejected (including an injected-into-production-set case).
