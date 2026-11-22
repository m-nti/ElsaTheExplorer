# IONOS lftp setup

This folder contains templates, not working credentials. The installer copies them to `~/.config/elsa/ionos/`; edit the copies there. Nothing in this repo holds a password.

## 1. Install lftp

```sh
brew install lftp
```

## 2. Host key

The templates refuse unknown host keys. Verify the fingerprint with your host, then add it once:

```sh
ssh-keyscan -t rsa,ecdsa,ed25519 IONOS_HOST >> ~/.ssh/known_hosts
```

`StrictHostKeyChecking=yes` in `common.lftp` then prevents silent host changes.

## 3. Password

`lftp` reads `~/.netrc` when the script uses `open sftp://HOST` without `-u`. Do **not** put the password in an lftp script, a command line, a shell history entry or a repo file.

```sh
cp ~/.config/elsa/ionos/netrc.example ~/.netrc
chmod 600 ~/.netrc
```

Edit `~/.netrc` locally and replace the placeholder value. Run `check.sh` to confirm mode `600`; it never prints the file.

## 4. Local values

In `~/.config/elsa/ionos/`, replace:

- `IONOS_HOST` — the SFTP hostname
- `IONOS_USER` — the account name (also used in `~/.netrc`)
- `IONOS_REMOTE_DIR` — the remote directory to work in
- `LOCAL_STAGE_DIR` — the local staged build directory for uploads

## 5. Scripts

- `connect-test.lftp` — log in, print the working directory, change to the remote directory, list it, disconnect.
- `ls.lftp` — the same listing with file sizes.
- `upload.lftp` — staged upload only. It does **not** use `mirror -e`/`--delete`; remote files that are not in the staged directory are left alone.
- `check.sh` — verifies `~/.netrc` exists and is mode `600`.

Run a script with:

```sh
lftp -f ~/.config/elsa/ionos/connect-test.lftp
```

## 6. Deploy boundary

This is a general webspace setup, not the v2 deploy. The v2 deploy is `scripts/deploy-ionos.sh` (ticket #62), which builds and stages the app before any upload. Do not upload from a source checkout or a directory that may contain v1 leftovers.
