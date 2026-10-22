param([string]$AppId)
$ErrorActionPreference = 'Stop'
if (-not $AppId) {
    $candidates = @(Get-StartApps | Where-Object { $_.AppID -match '^OpenAI\.(Codex|ChatGPT)_[A-Za-z0-9]+!' })
    if ($candidates.Count -ne 1) {
        Get-StartApps | Where-Object { $_.Name -match 'ChatGPT|Codex' } | Format-Table Name, AppID | Out-Host
        throw 'Cannot select a unique app. Run Get-StartApps, then startup\Deploy-Startup.ps1 -AppId "YOUR_APP_ID".'
    }
    $AppId = $candidates[0].AppID
}
Write-Output ('Target application: ' + $AppId)
& (Join-Path $PSScriptRoot 'Install-Startup.ps1') -AppId $AppId
