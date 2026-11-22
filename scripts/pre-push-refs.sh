#!/bin/sh
# Ref check for .githooks/pre-push, extracted so it can be tested.
#
# The hook verifies HEAD's tree, so it refuses any pushed ref that does not point at
# HEAD. Annotated tags send the *tag object's* sha, which never equals HEAD, so they
# are peeled to the commit they reference; lightweight tags already send the commit.
#
# stdin: the pre-push protocol, one "local_ref local_sha remote_ref remote_sha" per line.
# argv:  the verified HEAD sha.
set -e

head=$1
[ -n "$head" ] || { echo "pre-push-refs: missing HEAD sha" >&2; exit 2; }

while read -r local_ref local_sha _remote_ref _remote_sha; do
  [ -z "$local_sha" ] && continue
  case "$local_sha" in 0000000000000000000000000000000000000000) continue ;; esac

  case "$local_ref" in
    refs/tags/*)
      target=$(git rev-parse --verify --quiet "${local_sha}^{commit}") || {
        echo "pre-push: $local_ref is not a commit tag — not verified." >&2
        exit 1
      }
      ;;
    *) target=$local_sha ;;
  esac

  if [ "$target" != "$head" ]; then
    echo "pre-push: $local_ref resolves to $target but only HEAD ($head) was verified." >&2
    echo "Push the verified commit, or bypass deliberately with SKIP_VERIFY=1." >&2
    exit 1
  fi
done
