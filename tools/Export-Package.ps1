param([string]$DestinationRoot)
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
if (-not $DestinationRoot) { $DestinationRoot = Join-Path $sourceRoot 'export' }
$name = 'ChatGPT-Startup-Deploy-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$packageRoot = Join-Path ([IO.Path]::GetFullPath($DestinationRoot)) $name
if (Test-Path -LiteralPath $packageRoot) { throw 'Export directory already exists.' }
New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
$rootFiles = @('index.html','terminal.html','operator.html','archives.html','workspace.html','server.cjs','package.json','requirements.txt','DEPLOY.md','preview.cmd','web-preview.cmd','install.cmd','.gitignore')
foreach ($file in $rootFiles) { Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination (Join-Path $packageRoot $file) }
foreach ($folder in @('assets','startup','tools','third-party')) {
    $folderRoot = Join-Path $sourceRoot $folder
    if (-not (Test-Path -LiteralPath $folderRoot -PathType Container)) { continue }
    foreach ($file in Get-ChildItem -LiteralPath $folderRoot -Recurse -File) {
        if ($file.Name -match '\.(log|pyc|lnk)$' -or $file.FullName -match '[\\/]__pycache__[\\/]') { continue }
        if ($folder -eq 'startup' -and $file.Directory.Name -eq 'preview' -and $file.Name -notin @('ChatGPT-Startup-Preview.exe','chatgpt-boot.mp4','chatgpt-boot.interaction.json','chatgpt-permission-idle.mp4','chatgpt.ico')) { continue }
        $relative = $file.FullName.Substring($sourceRoot.Length + 1)
        $target = Join-Path $packageRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $target
    }
}
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'output'), (Join-Path $packageRoot 'docs') -Force | Out-Null
foreach ($file in @('chatgpt-boot.mp4','chatgpt-boot-instrumental.mp4','chatgpt-boot-voice.mp4','chatgpt-boot-poster.png','chatgpt-boot-rhine.mp4','chatgpt-boot-rhine-poster.png','chatgpt-boot.interaction.json','chatgpt-boot-rhine.interaction.json','chatgpt-permission-idle.mp4','chatgpt-chibi-pages-review.png','chatgpt-chibi-wave-review.png')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot ('output\' + $file)) -Destination (Join-Path $packageRoot ('output\' + $file))
}
$originalNotes = Join-Path $sourceRoot 'docs\PROJECT-NOTES.md'
if (-not (Test-Path -LiteralPath $originalNotes)) { $originalNotes = Join-Path $sourceRoot 'README.md' }
Copy-Item -LiteralPath $originalNotes -Destination (Join-Path $packageRoot 'docs\PROJECT-NOTES.md')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'DEPLOY.md') -Destination (Join-Path $packageRoot 'README.md')
# Windows PowerShell 5.1 needs a BOM to read non-ASCII source reliably.
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
Get-ChildItem -LiteralPath $packageRoot -Recurse -File -Filter '*.ps1' | ForEach-Object {
    [IO.File]::WriteAllText($_.FullName, [IO.File]::ReadAllText($_.FullName), $utf8Bom)
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$entries = @(Get-ChildItem -LiteralPath $packageRoot -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{ Path = $_.FullName.Substring($packageRoot.Length + 1).Replace('\','/'); Bytes = $_.Length; SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
})
$defaultHash = (Get-FileHash -LiteralPath (Join-Path $packageRoot 'output\chatgpt-boot.mp4') -Algorithm SHA256).Hash
$instrumentalHash = (Get-FileHash -LiteralPath (Join-Path $packageRoot 'output\chatgpt-boot-instrumental.mp4') -Algorithm SHA256).Hash
$voiceHash = (Get-FileHash -LiteralPath (Join-Path $packageRoot 'output\chatgpt-boot-voice.mp4') -Algorithm SHA256).Hash
$rhineHash = (Get-FileHash -LiteralPath (Join-Path $packageRoot 'output\chatgpt-boot-rhine.mp4') -Algorithm SHA256).Hash
$variant = if ($defaultHash -eq $rhineHash) { 'rhine' } elseif ($defaultHash -eq $instrumentalHash) { 'instrumental' } elseif ($defaultHash -eq $voiceHash) { 'voice' } else { 'custom' }
$manifest = [ordered]@{ Schema = 1; ExportedAt = (Get-Date).ToString('o'); DefaultAudioVariant = $variant; Files = $entries }
[IO.File]::WriteAllText((Join-Path $packageRoot 'PACKAGE-MANIFEST.json'), ($manifest | ConvertTo-Json -Depth 6), $utf8)
[IO.File]::WriteAllText((Join-Path $packageRoot 'SHA256SUMS.txt'), (($entries | ForEach-Object { $_.SHA256 + '  ' + $_.Path }) -join "`n") + "`n", $utf8)
& (Join-Path $packageRoot 'tools\Verify-Package.ps1') -PackageRoot $packageRoot
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = $packageRoot + '.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($packageRoot, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $true)
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText(($zipPath + '.sha256'), ($zipHash + '  ' + [IO.Path]::GetFileName($zipPath) + "`n"), $utf8)
[ordered]@{ PackageRoot = $packageRoot; ZipPath = $zipPath; Files = $entries.Count; ZipBytes = (Get-Item -LiteralPath $zipPath).Length; SHA256 = $zipHash } | ConvertTo-Json
