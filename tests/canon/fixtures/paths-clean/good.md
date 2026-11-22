# Clean targets

Relative link with an anchor: [test plan](docs/exists.md#section).

Backticked file with a line suffix: `docs/exists.md:12`.

Backticked file with a line set: `docs/exists.md:210,440`.

Backticked directory: `docs/`.

Link with a space in the target: [spaced](docs/with%20space.md).

A file no one has built yet: `src/lib/pwa/cachePolicy.ts`.

Template backtick: `docs/plans/YYYY-MM-DD-<slug>.md`.

Glob backtick: `src/**/*.css`.

Template directory: `tests/unit/[system]/`.

Truncated list: `docs/adr/ADR-0001…0011`.

Outbound links: [upstream](https://example.org/x) · [mail](mailto:a@example.org) · [anchor](#clean-targets).

A four-backtick block may show a three-backtick one, which is how the plans
quote a failing form:

````markdown
```
[an example inside two fences](docs/gone-too.md)
```
````
