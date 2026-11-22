#!/bin/sh
# Install cross-machine instructions and/or the IONOS lftp templates.
# Never writes a password; the netrc template contains placeholders only.
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
mode=""

case "${1:---all}" in
  --all) mode=all ;;
  --agents) mode=agents ;;
  --ionos) mode=ionos ;;
  *)
    echo "usage: $0 [--all|--agents|--ionos]" >&2
    exit 2
    ;;
esac

backup() {
  target=$1
  if [ -e "$target" ]; then
    copy="${target}.backup.$(date +%Y%m%d%H%M%S)"
    cp -p "$target" "$copy"
    echo "backed up $target -> $copy"
  fi
}

if [ "$mode" = all ] || [ "$mode" = agents ]; then
  dest_dir="$HOME/.config/opencode"
  mkdir -p "$dest_dir"
  dest="$dest_dir/AGENTS.md"
  backup "$dest"
  cp "$repo_root/docs/cross-machine/AGENTS.global.md" "$dest"
  echo "installed global instructions -> $dest"
fi

if [ "$mode" = all ] || [ "$mode" = ionos ]; then
  dest_dir="$HOME/.config/elsa/ionos"
  mkdir -p "$dest_dir"
  for file in common.lftp connect-test.lftp ls.lftp upload.lftp netrc.example check.sh check.ps1; do
    backup "$dest_dir/$file"
    cp "$repo_root/docs/cross-machine/ionos/$file" "$dest_dir/$file"
  done
  chmod +x "$dest_dir/check.sh"
  chmod 600 "$dest_dir/netrc.example"
  echo "installed IONOS templates -> $dest_dir"
  echo "next: read $repo_root/docs/cross-machine/ionos/README.md"
fi
