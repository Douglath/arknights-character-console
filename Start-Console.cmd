@echo off
setlocal
cd /d "%~dp0"
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 goto use_py
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if not errorlevel 1 goto use_python
echo Python 3.10 or newer was not found.
echo Install Python from https://www.python.org/downloads/
echo Enable the Python launcher or add Python to PATH, then run this file again.
pause
exit /b 1

:use_py
py -3 "%~dp0roster\serve.py" %*
goto finished

:use_python
python "%~dp0roster\serve.py" %*

:finished
set "console_exit=%errorlevel%"
if not "%console_exit%"=="0" pause
exit /b %console_exit%
