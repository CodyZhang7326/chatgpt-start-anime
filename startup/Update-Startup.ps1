param([Parameter(Mandatory=$true)][ValidateSet('rhine','voice','instrumental')][string]$AudioVariant)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$installRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ChatGPT\启动器'
$manifestPath = Join-Path $installRoot 'installation.json'
$state = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($state.Status -ne 'installed' -or [IO.Path]::GetFullPath($state.InstallRoot) -ne [IO.Path]::GetFullPath($installRoot)) { throw 'Installed launcher record does not match.' }
if (@(Get-Process -Name 'ChatGPT-Startup' -ErrorAction SilentlyContinue).Count) { throw 'Wait until the current startup animation finishes before updating.' }
& (Join-Path $PSScriptRoot 'Build-Preview.ps1') -AudioVariant $AudioVariant
$backup = Join-Path $installRoot ('versions\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$files = @('ChatGPT-Startup.exe','chatgpt-boot.mp4','installation.json')
$interactionName = 'chatgpt-boot.interaction.json'
$installedInteraction = Join-Path $installRoot $interactionName
$projectInteraction = Join-Path $taskRoot ('output\' + $interactionName)
$hadInteraction = Test-Path -LiteralPath $installedInteraction
$hadProjectInteraction = Test-Path -LiteralPath $projectInteraction
$idleName='chatgpt-permission-idle.mp4'
$installedIdle=Join-Path $installRoot $idleName
$hadIdle=Test-Path -LiteralPath $installedIdle
if($hadIdle){$files += $idleName}
if($hadInteraction){$files += $interactionName}
if($hadProjectInteraction){Copy-Item -LiteralPath $projectInteraction -Destination (Join-Path $backup 'project-previous.interaction.json') -Force}
foreach($name in $files){Copy-Item -LiteralPath (Join-Path $installRoot $name) -Destination (Join-Path $backup $name) -Force}
Copy-Item -LiteralPath (Join-Path $taskRoot 'output\chatgpt-boot.mp4') -Destination (Join-Path $backup 'project-previous.mp4') -Force
try {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'preview\ChatGPT-Startup-Preview.exe') -Destination (Join-Path $installRoot 'ChatGPT-Startup.exe') -Force
    $video = Join-Path $taskRoot ('output\chatgpt-boot-'+$AudioVariant+'.mp4')
    Copy-Item -LiteralPath $video -Destination (Join-Path $installRoot 'chatgpt-boot.mp4') -Force
    Copy-Item -LiteralPath $video -Destination (Join-Path $taskRoot 'output\chatgpt-boot.mp4') -Force
    $interactionSource = Join-Path $PSScriptRoot ('preview\' + $interactionName)
    if(Test-Path -LiteralPath $interactionSource){
        Copy-Item -LiteralPath $interactionSource -Destination $installedInteraction -Force
        Copy-Item -LiteralPath $interactionSource -Destination $projectInteraction -Force
    }else{
        if(Test-Path -LiteralPath $installedInteraction){Remove-Item -LiteralPath $installedInteraction -Force}
        if(Test-Path -LiteralPath $projectInteraction){Remove-Item -LiteralPath $projectInteraction -Force}
    }
    $idleSource=Join-Path $PSScriptRoot ('preview\'+$idleName)
    if(Test-Path -LiteralPath $idleSource){Copy-Item -LiteralPath $idleSource -Destination $installedIdle -Force}
    elseif(Test-Path -LiteralPath $installedIdle){Remove-Item -LiteralPath $installedIdle -Force}
    $state.VideoSHA256 = (Get-FileHash -LiteralPath $video -Algorithm SHA256).Hash
    $state.LauncherSHA256 = (Get-FileHash -LiteralPath (Join-Path $installRoot 'ChatGPT-Startup.exe') -Algorithm SHA256).Hash
    $state | Add-Member -NotePropertyName AudioVariant -NotePropertyValue $AudioVariant -Force
    $state | Add-Member -NotePropertyName InteractivePermission -NotePropertyValue (Test-Path -LiteralPath $installedInteraction) -Force
    $state | Add-Member -NotePropertyName AnimatedPermissionWait -NotePropertyValue (Test-Path -LiteralPath $installedIdle) -Force
    $state | Add-Member -NotePropertyName UpdatedAt -NotePropertyValue (Get-Date).ToString('o') -Force
    $state | Add-Member -NotePropertyName PreviousVersion -NotePropertyValue $backup -Force
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Output ('Updated installed startup: '+$AudioVariant)
} catch {
    foreach($name in $files){Copy-Item -LiteralPath (Join-Path $backup $name) -Destination (Join-Path $installRoot $name) -Force}
    Copy-Item -LiteralPath (Join-Path $backup 'project-previous.mp4') -Destination (Join-Path $taskRoot 'output\chatgpt-boot.mp4') -Force
    if(-not $hadInteraction -and (Test-Path -LiteralPath $installedInteraction)){Remove-Item -LiteralPath $installedInteraction -Force}
    if(-not $hadIdle -and (Test-Path -LiteralPath $installedIdle)){Remove-Item -LiteralPath $installedIdle -Force}
    if($hadProjectInteraction){Copy-Item -LiteralPath (Join-Path $backup 'project-previous.interaction.json') -Destination $projectInteraction -Force}
    elseif(Test-Path -LiteralPath $projectInteraction){Remove-Item -LiteralPath $projectInteraction -Force}
    throw
}
