# I6 — Versioned deploy files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three server-side files ADR-0007 §1 names but the tree does not carry — root `.htaccess`, `robots.txt`, `photos.json` — so deploy step 0 can be followed from this repository.

**Architecture:** Static artefact to an IONOS document root, no server build, one operator (ADR-0007). The three files are versioned in the repo and uploaded alone in deploy step 0; they are never part of `dist/`. One Vitest gate in the existing `unit` project reads them and proves the deny rules, headers and manifest shape instead of trusting a review.

**Tech Stack:** Apache 2.4 `.htaccess` (mod_rewrite, mod_headers, mod_mime, mod_expires), robots exclusion syntax, JSON manifest v2, Vitest 5 (node environment).

**Spec:** `docs/adr/ADR-0007-release-deploy.md` §1–§2, `docs/adr/ADR-0008-image-derivatives.md` §1/§3/§5, `docs/adr/ADR-0009-pwa.md` §3, `docs/adr/ADR-0004-manifest-contract.md` §2/§4, `PRD.md` §5/§7, `docs/architecture.md` Folder Structure.

**Closes:** #39 · **Branch:** `feat/i6-deploy-files` · **Base:** `origin/main` `846de1c`

## Global Constraints

- Files added: root `.htaccess`, `robots.txt`, `photos.json` — nothing else ships. No deploy, no FTP, no credentials.
- `photos/` originals stay unreachable; `photos/thumbs/` and `photos/derived/` stay reachable, because the PHP-less static fallback renders from them (ADR-0004 §3).
- `photos.php` stays reachable and keeps its own `Cache-Control`, `ETag` and error taxonomy (ADR-0008 §2).
- No `ExpiresByType image/<raster>` entry: a derivative URL is immutable only when it carries `&v=` (ADR-0008 §1/§6), so the TTL belongs to the emitter, not the server.
- Canon (`AGENTS.md`): at most one `!` per surface and none here; no water content; `Der Abfahrtsaal`; no `Heft`; no `Katalog`/`Catalogue` in new prose.
- JSON has no comment syntax: `photos.json` is emitted by `scripts/photo-derivatives.mjs` (ADR-0004 §1), so its ADR provenance is asserted by the gate, not written into the body.
- The gate lives in `tests/unit/` (already the enforced `unit` gate) — no `gates.json`/`ci.yml` change, so there is no new gate to keep in sync.

## Review Focus

- **A deny rule that also catches the fallback.** `^photos/[^/]+` must match direct children only; if it matches `photos/thumbs/…` or `photos/derived/…`, the PHP-less deploy renders no art at all. The gate asserts both directions.
- **The script-deny rule catching `photos.php`.** It lives at the document root, not under `photos/`. The gate asserts `photos.php` is allowed while `photos/x.php` is forbidden.
- **A cache rule leaking.** `photos/.cache` must be forbidden as a directory, as a trailing-slash request and as a file inside it, including a case variant.
- **An unguarded directive.** Every block that needs a module sits inside `<IfModule>`, or a host without it answers 500 to the whole site. The gate asserts the guard structure.
- **`photos.json` drifting from the runtime emitter.** A stale `pipeline` or `ladder` makes the static fallback advertise a shape `photos.php` no longer emits. The gate cross-reads both sources.

---

### Task 1: Deny rules, headers and the noindex pair

**Files:**
- Create: `.htaccess`
- Create: `robots.txt`
- Test: `tests/unit/deploy-files.test.ts`

**Interfaces:**
- Produces: `requestDecision(path)` in the test — evaluates the parsed `RewriteRule` set of the root and `photos/` files against a document-root-relative path and returns `"forbidden" | "allowed"`. Task 2 reuses the file-level readers only.

- [ ] **Step 1: Write the failing test**

```ts
it("forbids an original in photos/ at the document root", () => {
  expect(requestDecision("photos/elsa-01.jpg")).toBe("forbidden");
  expect(requestDecision("photos/elsa-01.HEIC")).toBe("forbidden");
});

it("keeps the static fallback and the runtime service reachable", () => {
  expect(requestDecision("photos/thumbs/elsa-01.jpg")).toBe("allowed");
  expect(requestDecision("photos/derived/tile/elsa-01.webp")).toBe("allowed");
  expect(requestDecision("photos.php")).toBe("allowed");
});
```

plus: `robots.txt` disallows every agent, the root file sets `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Robots-Tag: noindex`, `AddType application/manifest+json .webmanifest`, a `sw.js` `no-cache` block, and no `ExpiresByType image/` line.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/deploy-files.test.ts --project unit`
Expected: FAIL — `ENOENT: no such file or directory, open '…/.htaccess'`

- [ ] **Step 3: Write `.htaccess` and `robots.txt`**

`.htaccess`: `Options -Indexes`; `mod_rewrite` rules for direct `photos/` originals, `photos/.cache`, scripts under `photos/` and dotfiles; `mod_mime` `application/manifest+json`; `mod_headers` nosniff / referrer / frame / permissions / `X-Robots-Tag` and the `sw.js` revalidation block; `mod_expires` for HTML, JS, CSS, JSON, webmanifest, SVG, WOFF2 only. Each block opens with the ADR sentence it implements.

`robots.txt`: a comment naming ADR-0007 §1 and PRD §7, then `User-agent: *` / `Disallow: /`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/deploy-files.test.ts --project unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .htaccess robots.txt tests/unit/deploy-files.test.ts docs/superpowers/plans/2026-11-22-i6-deploy-files.md
git commit -m "feat(deploy): add the root deny rules and robots.txt (#39)"
```

### Task 2: The static manifest fallback

**Files:**
- Create: `photos.json` (emitted, never hand-written)
- Modify: `tests/unit/deploy-files.test.ts`

**Interfaces:**
- Consumes: `read("photos.php")`, `read("scripts/photo-ladder.json")`, `read("docs/adr/ADR-0007-release-deploy.md")` from Task 1's file readers.
- Produces: nothing further; this is the last task.

- [ ] **Step 1: Extend the failing test**

```ts
it("emits the manifest contract the runtime emitter emits", () => {
  expect(manifest.source).toBe("photos");
  expect(manifest.pipeline).toBe(runtimePipelineVersion()); // photos.php PHOTO_PIPELINE_VERSION
  expect(manifest.ladder).toEqual(ladderEdges());           // scripts/photo-ladder.json
});
```

plus: every advertised URL under `src|thumb|view|download|images.*` matches `^photos/derived/`, no `srcset` key exists (ADR-0004 §4), and `ver` is at most 32 characters.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/deploy-files.test.ts --project unit`
Expected: FAIL — `ENOENT … 'photos.json'`

- [ ] **Step 3: Emit the file with the real script**

Run: `node scripts/photo-derivatives.mjs --source photos --out "$env:TEMP/elsa-empty" --manifest photos.json --url-prefix photos/derived`
Expected: `manifest: written photos.json (0 photos, pipeline 2)` — the repository carries no source photo, and the owner's photos are runtime data (ADR-0007 §1). The same command with the owner's store populated regenerates it before an upload.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/deploy-files.test.ts --project unit`
Expected: PASS

- [ ] **Step 5: Run the full local gate set**

Run: `npm run verify`
Expected: the last line names the enforced gate count and the run exits 0.

- [ ] **Step 6: Commit and open the PR**

```bash
git add photos.json tests/unit/deploy-files.test.ts
git commit -m "feat(deploy): ship photos.json as the static manifest fallback (#39)"
git push -u origin feat/i6-deploy-files
gh pr create --title "feat(deploy): versioned deploy files (#39)" --body "Closes #39"
```

## Self-review

- **Spec coverage:** ADR-0007 §1 names five versioned server-side items; `photos.php`, `photos/.htaccess` and the `photos/.cache/` skeleton already exist and are asserted, the three missing ones are added. ADR-0008 §3 deny, ADR-0009 §3 headers/MIME/cache, PRD §7 noindex, ADR-0004 manifest shape — one gate row each.
- **Step scan:** every step names a command and the output that means it passed.
- **Type consistency:** one reader (`read`), one decision function (`requestDecision`), used by both tasks.
- **Review Focus:** each of the five lines has a test in Task 1 or Task 2.
- **Proportion:** no code body is transcribed; the gate is the deliverable, not a copy of the files.
