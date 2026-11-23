# IONOS lftp setup

This folder contains templates, not working credentials. The installer copies them to `~/.config/elsa/ionos/`; edit the copies there. Nothing in this repo holds a password.

## 1. Install lftp

```sh
brew install lftp
```

### Windows

```powershell
choco install lftp -y
```

If the Chocolatey package fails (locked package or no administrator shell), install it
user-locally:

1. Download `lftp-4.9.2.win64-openssl.zip` and extract it to
   `%USERPROFILE%\.local\lftp`.
2. Create `%APPDATA%\npm\lftp.cmd`:

```bat
@echo off
set "HOME=%USERPROFILE%"
"%USERPROFILE%\.local\lftp\bin\lftp.exe" %*
```

The `HOME` line is required. Cygwin `lftp` otherwise resolves `~` to
`/home/<user>`, so both `source ~/.config/elsa/ionos/common.lftp` and `~/.netrc`
are not found. Use the `.cmd` shim (not the `.exe` directly) so every invocation
gets the right `HOME`.

Run `docs/cross-machine/install.sh` from **Git Bash** on Windows:

```sh
sh docs/cross-machine/install.sh --ionos
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

On Windows, `chmod` is a no-op on NTFS, so the ACL is the real boundary. Restrict it
and run the ACL check:

```powershell
icacls "$env:USERPROFILE\.netrc" /inheritance:r /grant:r "$env:USERNAME:(F)" /grant:r "*S-1-5-18:(F)" /grant:r "*S-1-5-32-544:(F)"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.config\elsa\ionos\check.ps1"
```

`check.sh` detects Git Bash / MSYS / Cygwin and delegates to `check.ps1` automatically.
The PowerShell check fails without printing the file when any principal outside the
current user, SYSTEM, or Administrators has an `Allow` ACE.

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
- `check.sh` — verifies `~/.netrc` exists and is mode `600` (on Windows, delegates to `check.ps1`).
- `check.ps1` — the Windows ACL check: current user, SYSTEM and Administrators only.

Run a script with:

```sh
lftp -f ~/.config/elsa/ionos/connect-test.lftp
```

## 6. Deploy boundary

This is a general webspace setup, not the v2 deploy. The v2 deploy is `scripts/deploy-ionos.sh` (ticket #62), which builds and stages the app before any upload. Do not upload from a source checkout or a directory that may contain v1 leftovers.
