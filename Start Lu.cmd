@echo off
cd /d "%~dp0"
if exist "%~dp0release\Lu-win32-x64\Lu.exe" (
  start "" "%~dp0release\Lu-win32-x64\Lu.exe"
  exit /b
)
if exist "%~dp0node_modules\electron\cli.js" (
  node "%~dp0node_modules\electron\cli.js" .
  exit /b
)
echo Lu has not been built yet. Open README.md for setup instructions.
pause
