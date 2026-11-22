# Verify credential-file hygiene on Windows without reading or printing the password.
# The POSIX "mode 600" check is meaningless on NTFS; the security boundary is the ACL.
$ErrorActionPreference = 'Stop'
$netrc = Join-Path $env:USERPROFILE '.netrc'

if (-not (Test-Path -LiteralPath $netrc)) {
  Write-Error "missing: $netrc`ncopy $env:USERPROFILE\.config\elsa\ionos\netrc.example to $netrc and fill it locally"
  exit 1
}

$acl = Get-Acl -LiteralPath $netrc
$currentSid = ([Security.Principal.WindowsIdentity]::GetCurrent()).User.Value
$allowed = @($currentSid, 'S-1-5-18', 'S-1-5-32-544')  # me, SYSTEM, Administrators

$bad = @()
foreach ($ace in $acl.Access) {
  if ($ace.AccessControlType -ne 'Allow') { continue }
  $sid = $null
  try { $sid = $ace.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value } catch { $sid = $ace.IdentityReference.Value }
  if ($allowed -notcontains $sid) { $bad += "$($ace.IdentityReference) $($ace.FileSystemRights)" }
}

if ($bad.Count -gt 0) {
  Write-Error ("unsafe ACL on {0}:`n  {1}`nrestrict with: icacls `"{0}`" /inheritance:r /grant:r `"${env:USERNAME}:(F)`" /grant:r `"*S-1-5-18:(F)`" /grant:r `"*S-1-5-32-544:(F)`"" -f $netrc, ($bad -join "`n  "))
  exit 1
}

Write-Output "credential file present with restricted NTFS ACL"
