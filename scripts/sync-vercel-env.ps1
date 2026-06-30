<#
.SYNOPSIS
    Syncs all .env.local variables to Vercel Production environment.
    Run this once when setting up a new Vercel project or after losing env vars.

.USAGE
    cd randevu-sistemi
    .\scripts\sync-vercel-env.ps1

.NOTE
    Requires Vercel CLI to be installed and logged in (vercel whoami).
    Values are read from .env.local — keep that file up to date.
#>

$envFile = Join-Path $PSScriptRoot "..\\.env.local"

if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found at $envFile"
    exit 1
}

Write-Host "Reading .env.local..."
$lines = Get-Content $envFile -Encoding UTF8

$errors = @()
$success = @()

foreach ($line in $lines) {
    # Skip comments and blank lines
    if ($line -match '^\s*#' -or $line.Trim() -eq '') { continue }

    if ($line -match '^([^=]+)=(.*)$') {
        $key   = $Matches[1].Trim()
        $value = $Matches[2].Trim()

        Write-Host "  -> $key" -NoNewline

        $result = vercel env add $key production --value $value --yes --force 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK]" -ForegroundColor Green
            $success += $key
        } else {
            Write-Host "  [FAIL]" -ForegroundColor Red
            $errors += $key
        }
    }
}

Write-Host ""
Write-Host "Done: $($success.Count) added, $($errors.Count) failed." -ForegroundColor Cyan
if ($errors.Count -gt 0) {
    Write-Host "Failed keys: $($errors -join ', ')" -ForegroundColor Yellow
    Write-Host "Try adding these manually: vercel env add KEY production"
}
