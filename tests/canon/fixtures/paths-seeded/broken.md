# Seeded broken targets

Live link to a file that moved: [the action plan](docs/action-plan.md).

A backticked path to the same moved file: `docs/action-plan.md`.

Case-only difference: `docs/EXISTS.md` (the file is `docs/exists.md`).

A file no one has ever built: `src/lib/pwa/cachePolicy.ts`.

A directory that exists, treated as a link: [docs](docs/).

Wrong case in a relative link: [exists](Docs/exists.md).

```
[fenced example, not a link](docs/gone-too.md)
`design/never-there.md`
```

A link that climbs out of the tree: [outside](../elsewhere/deep.md).
