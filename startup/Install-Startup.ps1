param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z0-9_.-]+![A-Za-z0-9_.-]+$')][string]$AppId
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
# Documents is outside MSIX AppData virtualization, so Explorer resolves the same path.
$installRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ChatGPT\启动器'
$manifestPath = Join-Path $installRoot 'installation.json'
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = [Environment]::GetFolderPath('Programs')
$toolsFolder = Join-Path $programs 'ChatGPT 启动工具'
$registered = @(Get-StartApps | Where-Object { $_.AppID -eq $AppId })
if ($registered.Count -eq 0) { throw 'Target application is not registered for this Windows user.' }
if (Test-Path -LiteralPath $manifestPath) {
    $existing = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($existing.Status -eq 'installed') { Write-Output ('Already installed: ' + $installRoot); return }
    throw 'An earlier installation record exists. Preserve its backup before reinstalling.'
}
& (Join-Path $PSScriptRoot 'Build-Preview.ps1')
New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
$backupRoot = Join-Path $installRoot 'backup'
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $toolsFolder -Force | Out-Null
$launcher = Join-Path $installRoot 'ChatGPT-Startup.exe'
$icon = Join-Path $installRoot 'chatgpt.ico'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'preview\ChatGPT-Startup-Preview.exe') -Destination $launcher -Force
Copy-Item -LiteralPath (Join-Path $taskRoot 'output\chatgpt-boot.mp4') -Destination (Join-Path $installRoot 'chatgpt-boot.mp4') -Force
$interactionSource=Join-Path $PSScriptRoot 'preview\chatgpt-boot.interaction.json'
if(Test-Path -LiteralPath $interactionSource){Copy-Item -LiteralPath $interactionSource -Destination (Join-Path $installRoot 'chatgpt-boot.interaction.json') -Force}
$idleSource=Join-Path $PSScriptRoot 'preview\chatgpt-permission-idle.mp4'
if(Test-Path -LiteralPath $idleSource){Copy-Item -LiteralPath $idleSource -Destination (Join-Path $installRoot 'chatgpt-permission-idle.mp4') -Force}
Copy-Item -LiteralPath (Join-Path $taskRoot 'assets\chatgpt.ico') -Destination $icon -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Restore-Startup.ps1') -Destination (Join-Path $installRoot 'Restore-Startup.ps1') -Force
Set-Content -LiteralPath (Join-Path $installRoot 'launch-app.txt') -Value $AppId -Encoding ASCII
$state = [ordered]@{
    Schema = 1; Status = 'installing'; InstalledAt = (Get-Date).ToString('o'); AppId = $AppId
    DisplayName = $registered[0].Name; InstallRoot = $installRoot; SourceRoot = $taskRoot
    VideoSHA256 = (Get-FileHash -LiteralPath (Join-Path $installRoot 'chatgpt-boot.mp4') -Algorithm SHA256).Hash
    LauncherSHA256 = (Get-FileHash -LiteralPath $launcher -Algorithm SHA256).Hash
    AnimatedPermissionWait = (Test-Path -LiteralPath $idleSource)
    Shortcuts = @()
}
function Save-State { $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8 }
$shell = New-Object -ComObject WScript.Shell
function Install-Link([string]$Path, [string]$Target, [string]$Arguments, [string]$Description) {
    $entry = [ordered]@{ Path=$Path; Existed=(Test-Path -LiteralPath $Path); Backup=$null; Target=$Target; Arguments=$Arguments; SHA256=$null }
    if ($entry.Existed) {
        $entry.Backup = Join-Path $backupRoot (([string]$state.Shortcuts.Count) + '.lnk')
        Copy-Item -LiteralPath $Path -Destination $entry.Backup -Force
    }
    $state.Shortcuts += $entry
    Save-State
    $link = $shell.CreateShortcut($Path)
    $link.TargetPath = $Target; $link.Arguments = $Arguments
    $link.WorkingDirectory = $installRoot; $link.IconLocation = $icon + ',0'
    $link.Description = $Description; $link.WindowStyle = 1
    $link.Save()
    $entry.SHA256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    Save-State
}
try {
    Save-State
    Install-Link (Join-Path $desktop 'ChatGPT.lnk') $launcher '' '播放启动动画；点击申请访问许可继续，Esc 可跳过。'
    Install-Link (Join-Path $programs 'ChatGPT（动画启动）.lnk') $launcher '' 'ChatGPT / 1080p 60 FPS / 交互式紫色人物启动动画'
    Install-Link (Join-Path $toolsFolder 'ChatGPT（直接打开）.lnk') (Join-Path $env:WINDIR 'explorer.exe') ('shell:AppsFolder\' + $AppId) '使用原始 Windows 应用入口，直接打开客户端。'
    $restoreArguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $installRoot 'Restore-Startup.ps1') + '"'
    Install-Link (Join-Path $toolsFolder '恢复默认启动.lnk') (Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe') $restoreArguments '撤销本次创建或更改的启动快捷方式，保留动画文件。'
    $state.Status = 'installed'; Save-State
    Write-Output ($state | ConvertTo-Json -Depth 6)
} catch {
    & (Join-Path $installRoot 'Restore-Startup.ps1') -Quiet
    throw
}
