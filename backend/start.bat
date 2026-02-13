@echo off
REM Demarre le serveur backend TapTapGo (Windows)
REM Cherche: venv, py/python dans PATH, puis Python dans chemins Windows courants.

set PORT=8000
set PY=
set PYEXE=

cd /d "%~dp0"
set BACKEND=%~dp0
set ROOT=%BACKEND:~0,-1%
for %%I in ("%ROOT%") do set ROOT=%%~dpI
set ROOT=%ROOT:~0,-1%

REM 1. Venv du projet
if exist "%BACKEND%venv\Scripts\python.exe" set PYEXE=%BACKEND%venv\Scripts\python.exe
if "%PYEXE%"=="" if exist "%BACKEND%.venv\Scripts\python.exe" set PYEXE=%BACKEND%.venv\Scripts\python.exe
if "%PYEXE%"=="" if exist "%ROOT%\venv\Scripts\python.exe" set PYEXE=%ROOT%\venv\Scripts\python.exe
if "%PYEXE%"=="" if exist "%ROOT%\.venv\Scripts\python.exe" set PYEXE=%ROOT%\.venv\Scripts\python.exe

REM 2. PATH: py, python, python3
if "%PYEXE%"=="" where py >nul 2>nul && set PY=py
if "%PYEXE%"=="" if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PYEXE%"=="" if "%PY%"=="" where python3 >nul 2>nul && set PY=python3

REM 3. Chemins Windows courants
if "%PYEXE%"=="" if "%PY%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set PYEXE=%LOCALAPPDATA%\Programs\Python\Python313\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set PYEXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set PYEXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%ProgramFiles%\Python313\python.exe" set PYEXE=%ProgramFiles%\Python313\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%ProgramFiles%\Python312\python.exe" set PYEXE=%ProgramFiles%\Python312\python.exe
if "%PYEXE%"=="" if "%PY%"=="" if exist "%ProgramFiles%\Python311\python.exe" set PYEXE=%ProgramFiles%\Python311\python.exe

if "%PYEXE%"=="" if "%PY%"=="" (
    echo.
    echo Erreur: Python introuvable.
    echo.
    echo Si le projet marchait hier: fermez Cursor et rouvrez-le, ou lancez start.bat depuis un autre terminal.
    echo Sinon: installez Python depuis https://www.python.org/downloads/ et cochez "Add to PATH".
    echo.
    echo Voir: backend\README.md
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
if defined PYEXE (
    echo Python trouve ^(fichier^). Demarrage du serveur ^(port %PORT%^)...
    "%PYEXE%" -m uvicorn server:app --reload --port %PORT%
) else (
    echo Demarrage du serveur ^(port %PORT%^) avec: %PY% -m uvicorn ...
    "%PY%" -m uvicorn server:app --reload --port %PORT%
)
pause
