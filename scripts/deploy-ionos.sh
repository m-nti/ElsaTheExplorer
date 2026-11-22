#!/bin/sh
# Deploy the built Elsa the Explorer site to the IONOS webspace over SFTP.
# Issue #62. Design and operator steps: docs/build/deploy-ionos.md.
# Release contract: docs/adr/ADR-0007-release-deploy.md §2 (deploy order).
#
# Modes
#   scripts/deploy-ionos.sh            dry run (default): build locally, stage, print the
#                                      exact file list in upload order. No network I/O.
#   scripts/deploy-ionos.sh --upload   build, stage, print the plan, then upload after the
#                                      operator types the remote directory name.
#
# Environment
#   IONOS_HOST   SFTP host of the IONOS webspace. Required for --upload only. A host name,
#                not a credential; it is read from the environment and never stored here.
#
# Guarantees
#   - Stages only dist/, photos.php and photos/.htaccess, in a fresh temp directory.
#   - Credentials come from ~/.netrc only (must be mode 600). Nothing is printed or written
#     into the repo; the generated lftp script contains no secret.
#   - Host key: StrictHostKeyChecking=yes against ~/.ssh/known_hosts. No auto-confirm.
#     A host that is not already in known_hosts is refused, never trusted on first use.
#   - Target is the new remote directory ehren-elsa-v2. Never the v1 ehren-elsa folder.
#   - Upload is mirror -R / put only. No mirror -e, no --delete, no remote rm, in any path.
#     The only rm is local: the temp stage directory and .DS_Store files inside it.
#   - photos/ is never synced: only photos/.htaccess is staged (runtime data stays put).

set -eu

# New remote directory, relative to the SFTP login directory. Constant on purpose.
REMOTE_DIR="ehren-elsa-v2"

die() {
  printf 'deploy-ionos: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
usage: scripts/deploy-ionos.sh [--upload]

  (no argument)  dry run: build, stage and print the file list. No network I/O.
  --upload       build, stage, print the plan, then upload after typing the remote
                 directory name (ehren-elsa-v2). Requires IONOS_HOST, a known host key
                 and ~/.netrc (mode 600).
EOF
}

MODE=dry-run
case "${1:-}" in
  "") ;;
  --upload) MODE=upload ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    die "unknown argument: $1"
    ;;
esac
if [ "$#" -gt 1 ]; then
  die "too many arguments"
fi

REPO=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO"

if [ ! -d node_modules ]; then
  die "node_modules missing; run 'npm ci' first"
fi

if [ "$MODE" = upload ]; then
  if [ -n "$(git status --porcelain)" ]; then
    die "working tree is dirty; commit or stash, then upload what is committed"
  fi
  command -v lftp >/dev/null 2>&1 || die "lftp not found (brew install lftp)"
  if [ -z "${IONOS_HOST:-}" ]; then
    die "IONOS_HOST is not set"
  fi
  case "$IONOS_HOST" in
    *[!A-Za-z0-9.-]*) die "IONOS_HOST has characters outside [A-Za-z0-9.-]" ;;
  esac
  NETRC="$HOME/.netrc"
  [ -f "$NETRC" ] || die "$NETRC not found"
  # GNU stat first: on macOS "stat -c" is invalid and fails, so BSD "stat -f" runs instead.
  # The reverse order would let GNU's "stat -f" (filesystem mode) succeed with the wrong value.
  netrc_mode=$(stat -c '%a' "$NETRC" 2>/dev/null || stat -f '%Lp' "$NETRC")
  [ "$netrc_mode" = 600 ] || die "$NETRC must be mode 600 (it is $netrc_mode)"
  # Local lookup only. An unknown host is refused; this script never accepts a new key.
  if ! ssh-keygen -F "$IONOS_HOST" -f "$HOME/.ssh/known_hosts" >/dev/null 2>&1; then
    die "$IONOS_HOST is not in ~/.ssh/known_hosts; verify the host key and add it deliberately first"
  fi
fi

# Build (local only). Vite output lands in dist/.
npm run build

[ -f dist/index.html ] || die "dist/index.html missing after build"
[ -f photos.php ] || die "photos.php missing from the repo"
[ -f photos/.htaccess ] || die "photos/.htaccess missing from the repo"
[ ! -e dist/photos ] || die "dist/ must not contain photos/ (runtime data is never shipped)"
[ ! -e dist/photos.php ] || die "dist/ must not contain photos.php (it is staged from the repo)"

WORK=$(mktemp -d "${TMPDIR:-/tmp}/elsa-deploy.XXXXXX")
trap 'rm -rf "$WORK"' EXIT INT TERM
STAGE="$WORK/stage"
mkdir -p "$STAGE/photos"

# Stage only the three allowed inputs, into a fresh directory every run.
cp -R dist/. "$STAGE/"
cp photos.php "$STAGE/photos.php"
cp photos/.htaccess "$STAGE/photos/.htaccess"
find "$STAGE" -name .DS_Store -type f -exec rm -f {} +

# Refuse any path that would need quoting; the plan and the lftp script depend on it.
if (cd "$STAGE" && find . -print) | grep -q '[^A-Za-z0-9._/-]'; then
  die "staged path with unsafe characters; rename it in the build"
fi

# Upload plan, ADR-0007 §2 order. Each line of PLAN is "<dir|file> <relative name>".
#   0. photos.php and photos/ (server-side, idempotent)
#   1. assets/ (content-hashed)
#   2. other directories (fonts/, img/, ...)
#   3. other top-level files (favicon.svg, manifest, ...)
#   4. sw.js, when present: after everything it precaches
#   5. index.html last: the switch to the new build
PLAN="$WORK/plan"
: > "$PLAN"
add_plan() {
  printf '%s %s\n' "$1" "$2" >> "$PLAN"
}

add_plan file photos.php
add_plan dir photos
if [ -d "$STAGE/assets" ]; then
  add_plan dir assets
fi
for d in $(cd "$STAGE" && find . -mindepth 1 -maxdepth 1 -type d | sed 's|^\./||' | LC_ALL=C sort); do
  case "$d" in
    assets | photos) ;;
    *) add_plan dir "$d" ;;
  esac
done
for f in $(cd "$STAGE" && find . -mindepth 1 -maxdepth 1 -type f | sed 's|^\./||' | LC_ALL=C sort); do
  case "$f" in
    index.html | sw.js | photos.php) ;;
    *) add_plan file "$f" ;;
  esac
done
if [ -f "$STAGE/sw.js" ]; then
  add_plan file sw.js
fi
add_plan file index.html

# Expand the plan into the exact file list (one line per file, upload order).
FILES="$WORK/files"
: > "$FILES"
while read -r kind name; do
  if [ "$kind" = dir ]; then
    (cd "$STAGE" && find "$name" -type f | LC_ALL=C sort) >> "$FILES"
  else
    printf '%s\n' "$name" >> "$FILES"
  fi
done < "$PLAN"

# Print the list with byte sizes, in upload order.
count=0
total=0
printf 'deploy-ionos: source %s; target sftp remote directory %s (new; no deletes)\n' \
  "$(git rev-parse --short=12 HEAD 2>/dev/null || echo unknown-commit)" "$REMOTE_DIR"
printf 'deploy-ionos: staged files in upload order:\n'
while read -r rel; do
  size=$(wc -c < "$STAGE/$rel" | tr -d ' ')
  printf '%10s  %s\n' "$size" "$rel"
  count=$((count + 1))
  total=$((total + size))
done < "$FILES"
printf 'deploy-ionos: %s files, %s bytes.\n' "$count" "$total"

if [ "$MODE" = dry-run ]; then
  printf 'deploy-ionos: dry run. Nothing was uploaded; no network I/O was done.\n'
  printf 'deploy-ionos: to upload, run: scripts/deploy-ionos.sh --upload\n'
  exit 0
fi

# ---- upload mode ----------------------------------------------------------------------
# The generated lftp script holds no secret: credentials come from ~/.netrc, host trust
# from ~/.ssh/known_hosts. Mirror -R and put only; there is no -e and no --delete.
LFTP="$WORK/upload.lftp"
{
  printf 'set sftp:auto-confirm no\n'
  printf 'set sftp:connect-program "ssh -a -x -o StrictHostKeyChecking=yes -o UserKnownHostsFile=%s/.ssh/known_hosts"\n' "$HOME"
  printf 'set cmd:fail-exit yes\n'
  printf 'set net:max-retries 2\n'
  printf 'set net:timeout 30\n'
  printf 'open "sftp://%s"\n' "$IONOS_HOST"
  printf 'mkdir -p "%s"\n' "$REMOTE_DIR"
  while read -r kind name; do
    if [ "$kind" = dir ]; then
      printf 'mirror -R --verbose "%s/%s" "%s/%s"\n' "$STAGE" "$name" "$REMOTE_DIR" "$name"
    else
      printf 'put "%s/%s" -o "%s/%s"\n' "$STAGE" "$name" "$REMOTE_DIR" "$name"
    fi
  done < "$PLAN"
  printf 'bye\n'
} > "$LFTP"

printf 'deploy-ionos: upload to sftp://%s, remote directory %s.\n' "$IONOS_HOST" "$REMOTE_DIR"
printf 'Type the remote directory name (%s) to confirm the upload: ' "$REMOTE_DIR"
if ! read -r answer < /dev/tty; then
  die "no terminal to confirm on; nothing uploaded"
fi
if [ "$answer" != "$REMOTE_DIR" ]; then
  die "confirmation did not match; nothing uploaded"
fi

lftp -f "$LFTP"
printf 'deploy-ionos: upload finished.\n'
