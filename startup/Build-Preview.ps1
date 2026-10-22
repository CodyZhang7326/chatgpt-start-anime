param([ValidateSet('approved','rhine','voice','instrumental')][string]$AudioVariant = 'approved')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $PSScriptRoot 'preview'
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
$framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$compiler = Join-Path $framework 'csc.exe'
$source = Join-Path $PSScriptRoot 'StartupPlayer.cs'
$executable = Join-Path $buildDir 'ChatGPT-Startup-Preview.exe'
$references = @('PresentationCore.dll','PresentationFramework.dll','WindowsBase.dll') | ForEach-Object { '/reference:' + (Join-Path $framework ('WPF\' + $_)) }
$references += '/reference:' + (Join-Path $framework 'System.Xaml.dll')
$icon = Join-Path $taskRoot 'assets\chatgpt.ico'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /utf8output ('/out:' + $executable) ('/win32icon:' + $icon) @references $source
if ($LASTEXITCODE -ne 0) { throw 'Startup preview compilation failed.' }
$videoName = if($AudioVariant -eq 'approved'){'chatgpt-boot.mp4'}else{'chatgpt-boot-'+$AudioVariant+'.mp4'}
Copy-Item -LiteralPath (Join-Path $taskRoot ('output\'+$videoName)) -Destination (Join-Path $buildDir 'chatgpt-boot.mp4') -Force
Copy-Item -LiteralPath $icon -Destination (Join-Path $buildDir 'chatgpt.ico') -Force
$interactionSource = Join-Path $taskRoot ('output\' + $videoName.Replace('.mp4','.interaction.json'))
$interactionTarget = Join-Path $buildDir 'chatgpt-boot.interaction.json'
if(Test-Path -LiteralPath $interactionSource){Copy-Item -LiteralPath $interactionSource -Destination $interactionTarget -Force}
elseif(Test-Path -LiteralPath $interactionTarget){Remove-Item -LiteralPath $interactionTarget -Force}
$idleTarget=Join-Path $buildDir 'chatgpt-permission-idle.mp4'
if((Test-Path -LiteralPath $interactionSource) -and ((Get-Content -LiteralPath $interactionSource -Raw | ConvertFrom-Json).idleSHA256)){
    Copy-Item -LiteralPath (Join-Path $taskRoot 'output\chatgpt-permission-idle.mp4') -Destination $idleTarget -Force
}elseif(Test-Path -LiteralPath $idleTarget){Remove-Item -LiteralPath $idleTarget -Force}
Write-Output ('Built preview only: ' + $executable)
