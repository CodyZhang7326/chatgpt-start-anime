param([switch]$Quiet)
$ErrorActionPreference = 'Stop'
$installRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ChatGPT\启动器'
$manifestPath = Join-Path $installRoot 'installation.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Installation record not found.' }
$state = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ([IO.Path]::GetFullPath($state.InstallRoot) -ne [IO.Path]::GetFullPath($installRoot)) { throw 'Installation directory mismatch.' }
$allowedRoots = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
$backupRoot = [IO.Path]::GetFullPath((Join-Path $installRoot 'backup')) + '\'
$shell = New-Object -ComObject WScript.Shell
$preserved = @()
foreach ($entry in $state.Shortcuts) {
    $full = [IO.Path]::GetFullPath($entry.Path)
    $allowed = @($allowedRoots | Where-Object { $full.StartsWith([IO.Path]::GetFullPath($_) + '\', [StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
    if (-not $allowed -or [IO.Path]::GetExtension($full) -ne '.lnk') { throw ('Unexpected shortcut path: ' + $full) }
    if (Test-Path -LiteralPath $full) {
        $hash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash
        $current = $shell.CreateShortcut($full)
        $owned = if ($entry.SHA256) { $hash -eq $entry.SHA256 } else { $current.TargetPath -eq $entry.Target -and $current.Arguments -eq $entry.Arguments }
        if (-not $owned) { $preserved += $full; continue }
    }
    if ($entry.Existed) {
        if (-not $entry.Backup -or -not [IO.Path]::GetFullPath($entry.Backup).StartsWith($backupRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected backup path.' }
        Copy-Item -LiteralPath $entry.Backup -Destination $full -Force
    } elseif (Test-Path -LiteralPath $full) { Remove-Item -LiteralPath $full -Force }
}
$state.Status = if ($preserved.Count) { 'restored_with_preserved_changes' } else { 'restored' }
$state | Add-Member -NotePropertyName RestoredAt -NotePropertyValue (Get-Date).ToString('o') -Force
$state | Add-Member -NotePropertyName PreservedShortcuts -NotePropertyValue @($preserved) -Force
$state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
if (-not $Quiet) {
    Add-Type -AssemblyName PresentationFramework
    $message = '已恢复默认启动入口。动画与恢复记录保留在 ' + $installRoot
    if ($preserved.Count) { $message += "`n自行修改过的快捷方式已保留。" }
    [System.Windows.MessageBox]::Show($message, 'ChatGPT 启动动画') | Out-Null
}
Write-Output ('Startup shortcuts restored. Preserved later edits: ' + $preserved.Count)
