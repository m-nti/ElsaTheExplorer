#!/bin/sh
# Verify credential-file hygiene without reading or printing the password.
set -eu

netrc="$HOME/.netrc"

if [ ! -f "$netrc" ]; then
  echo "missing: $netrc" >&2
  echo "copy ~/.config/elsa/ionos/netrc.example to ~/.netrc and fill it locally" >&2
  exit 1
fi

if [ "$(uname)" = "Darwin" ]; then
  mode=$(stat -f '%Lp' "$netrc")
else
  mode=$(stat -c '%a' "$netrc")
fi

if [ "$mode" != "600" ]; then
  echo "unsafe mode $mode on $netrc; expected 600" >&2
  echo "fix with: chmod 600 ~/.netrc" >&2
  exit 1
fi

echo "credential file present with mode 600"
