@echo off
pushd "%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0startup\Deploy-Startup.ps1"
set "deployExit=%ERRORLEVEL%"
popd
pause
exit /b %deployExit%
