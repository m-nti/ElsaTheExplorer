# Deploy to IONOS — `scripts/deploy-ionos.sh`

Issue #62 (I7). Release contract: [ADR-0007](../adr/ADR-0007-release-deploy.md) §2 (deploy order)
and §4 (rollback). This script replaces the old FTP upload script, which was not reproducible
and trusted the SFTP host key on first use.

## What it stages and uploads

The script builds with `npm run build` and stages **only** these inputs, into a fresh temporary
directory on every run:

| Source | Staged as | Notes |
| --- | --- | --- |
| `dist/` | the site root | Vite output: `index.html`, `assets/`, `fonts/`, `img/`, `favicon.svg`, and `sw.js` once the PWA ships |
| `photos.php` | `photos.php` | runtime manifest source, versioned in the repo |
| `photos/.htaccess` | `photos/.htaccess` | the only file from `photos/` |

Nothing else leaves the repo. `photos/` contents (originals, thumbs, captions, the derivative
cache) are runtime data. They are never uploaded, never overwritten and never deleted by this
script.

## The two modes

### Dry run (default, no argument)

```sh
scripts/deploy-ionos.sh
```

Builds locally, stages, and prints the exact file list in upload order, with byte sizes and a
total. It performs **no network I/O**. It does not run `ssh`, `ssh-keygen`, `lftp` or any other
network client, and it needs no credentials, no host and no `known_hosts` entry. Use it to review
what would go out before any upload.

### Upload (`--upload`)

```sh
IONOS_HOST=<sftp host from the IONOS control panel> scripts/deploy-ionos.sh --upload
```

In order, the script:

1. Refuses a dirty working tree, so the upload matches a commit.
2. Checks that `lftp` is installed and that `IONOS_HOST` is set and well-formed.
3. Checks that `~/.netrc` exists and is mode `600`. The credentials come only from there.
4. Checks that `IONOS_HOST` is already in `~/.ssh/known_hosts`. An unknown host is refused. It is
   never trusted on first use.
5. Builds and stages, then prints the same file list as the dry run.
6. Asks you to type the remote directory name, `ehren-elsa-v2`. Anything else uploads nothing.
7. Runs `lftp` with the generated script (`mirror -R` and `put` only, in ADR-0007 order).

## Operator steps before the first upload

1. **Verify the host key out of band.** Get the SFTP host fingerprint from the IONOS control
   panel or IONOS documentation. Do not take it from the network. Then add the key to
   `~/.ssh/known_hosts` deliberately (for example `ssh-keyscan -H <host>` and compare the
   fingerprint before you accept it). The script never adds keys itself.
2. **Credentials in `~/.netrc` only**, mode 600:
   ```
   machine <sftp host>
   login <login>
   password <password>
   ```
   Never put a login or password in the repo, in the script, in a shell history line, or in a
   PR.
3. **Dry run first**, and read the list. `scripts/deploy-ionos.sh`.
4. **Owner go.** Upload needs the owner's explicit approval of the target directory.

## Safety properties (enforced in the script)

| Property | How it is enforced |
| --- | --- |
| Target is new | `REMOTE_DIR` is the constant `ehren-elsa-v2`. The v1 `ehren-elsa` folder is never named. |
| No remote delete | Only `mirror -R` and `put`. No `mirror -e`, no `--delete`, no remote `rm`. Old files stay on the server. |
| Host key checked | `sftp:connect-program "ssh -a -x -o StrictHostKeyChecking=yes …"`, `sftp:auto-confirm no`. |
| No secret in files | The generated lftp script holds no credential. Login comes from `~/.netrc`, host trust from `known_hosts`. |
| `photos/` untouched | Only `photos/.htaccess` is staged, and `photos/` is never mirrored as a whole. |
| Typed confirmation | The remote directory name must be typed on `/dev/tty`. |
| Idempotent staging | Each run builds a fresh temp stage. Nothing from a previous run is reused. |

## Upload order

Per ADR-0007 §2, so a half-finished deploy never leaves a new `index.html` pointing at missing
files:

1. `photos.php`, `photos/` (`.htaccess`).
2. `assets/`, the content-hashed bundle.
3. Other directories (`fonts/`, `img/`, …).
4. Other top-level files (`favicon.svg`, the manifest, …).
5. `sw.js`, when present. Its precache must already be on the server.
6. `index.html`, last. This is the switch to the new build.

## Rollback

ADR-0007 §4: re-upload the archived previous artefact in the same order. Do not touch `photos/`.
This script does not delete old files, so the previous build's hashed assets remain on the server
and rollback needs no delete. Keep the previous `dist/` as `release/<version>-<hash>/` until the
next release is verified.

## Follow-ups (not in this ticket)

- The cache skeleton `photos/.cache/` (deny files, `locks/`, 16 shard directories) that ADR-0007
  §1 requires is not staged here. The issue scopes the script to `dist/` plus the two photo
  files. It needs its own ticket before the first production upload.
- `robots.txt` and `photos.json` from ADR-0007 §1 are not produced yet.
- Live verification after upload (ADR-0007 §5) is a separate checklist. This script does not run it.

## Checks

```sh
sh -n scripts/deploy-ionos.sh          # syntax
shellcheck scripts/deploy-ionos.sh     # lint (optional, recommended)
scripts/deploy-ionos.sh                # dry run: list only, no network I/O
npm run verify                         # repo gates
```
