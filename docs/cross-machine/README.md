# Cross-machine setup

Files here are safe to commit and copy to another machine. No password, token or other secret belongs in this folder.

## Contents

- `AGENTS.global.md` — snapshot of the global agent instructions. Copy it to `~/.config/opencode/AGENTS.md` on the new machine.
- `ionos/` — lftp templates for the IONOS webspace, plus a local installer.

## Install

From the repo root on the new machine:

```sh
sh docs/cross-machine/install.sh --all
```

Options: `--agents` installs only the global instructions; `--ionos` installs only the lftp templates and the local check script. The installer backs up any existing file it replaces.

## Credentials

The password is **never** in this repo. `lftp` reads it from `~/.netrc`, which must be mode `600` and stays on the machine. The template `ionos/netrc.example` shows the shape with placeholders only. Fill it locally, then:

```sh
cp ~/.config/elsa/ionos/netrc.example ~/.netrc
chmod 600 ~/.netrc
```

`~/.config/elsa/ionos/check.sh` verifies that the file exists and has mode `600` without printing its contents.

## Host key

The templates set `sftp:auto-confirm no` and use `StrictHostKeyChecking=yes`. Before the first connection, add the host key to `~/.ssh/known_hosts` after verifying its fingerprint out-of-band:

```sh
ssh-keyscan -t rsa,ecdsa,ed25519 IONOS_HOST >> ~/.ssh/known_hosts
```

Replace `IONOS_HOST`, `IONOS_USER` and `IONOS_REMOTE_DIR` in the installed local files with your values. The local files are outside the repo, so those edits stay local.

## Verification

```sh
sh ~/.config/elsa/ionos/check.sh
sh ~/.config/elsa/ionos/connect-test.lftp
```

The first checks credential-file hygiene; the second logs in, changes to the remote directory and lists it. Neither writes anything.
