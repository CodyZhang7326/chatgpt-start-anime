param([string]$PackageRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PackageRoot)
$prefix = $root.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
$manifest = Get-Content -LiteralPath (Join-Path $root 'PACKAGE-MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($entry in $manifest.Files) {
    $file = [IO.Path]::GetFullPath((Join-Path $root $entry.Path))
    if (-not $file.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid manifest path.' }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw ('Missing file: ' + $entry.Path) }
    if ((Get-Item -LiteralPath $file).Length -ne $entry.Bytes -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.SHA256) { throw ('Checksum mismatch: ' + $entry.Path) }
}
Write-Output ('PASS: verified ' + $manifest.Files.Count + ' package files.')
