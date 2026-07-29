@echo off
SETLOCAL EnableDelayedExpansion
:: Force script to recognize its own folder
cd /d "%~dp0"
TITLE ClearInvoice DEBUG RUNNER

:: --- CONFIGURATION ---
SET "BACKEND_DIR=Backend"
SET "FRONTEND_DIR=Frontend"
SET "VENV_NAME=.venv"

echo ====================================================
echo           DEBUGGING CLEARINVOICE SETUP
echo ====================================================

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (echo [FAIL] Python missing. & pause & exit /b)
echo [OK] Python detected.

:: 2. Check Node
node -v >nul 2>&1
if %errorlevel% neq 0 (echo [FAIL] Node.js missing. & pause & exit /b)
echo [OK] Node.js detected.

:: 3. Backend Setup
echo.
echo [STEP 1] Entering %BACKEND_DIR%...
cd /d "%~dp0%BACKEND_DIR%" || (echo Backend folder not found! & pause & exit /b)

if not exist "%VENV_NAME%\" (
    echo Creating Virtual Env...
    python -m venv %VENV_NAME%
)
echo Activating Virtual Env and installing requirements...
call %VENV_NAME%\Scripts\activate
if exist "requirements.txt" (
    call pip install -r requirements.txt
)
echo [BACKEND DONE] 
pause

:: 4. Frontend Setup
echo.
echo [STEP 2] Entering %FRONTEND_DIR%...
cd /d "%~dp0%FRONTEND_DIR%" || (echo Frontend folder not found! & pause & exit /b)

if not exist "node_modules\" (
    echo Installing npm packages...
    call npm install
)
echo [FRONTEND DONE]
pause

:: 5. Execution
echo.
echo [STEP 3] Attempting to launch servers...
echo Check the new windows that pop up for errors.

:: Launch Backend
:: We use /k so the window stays open even if the python script crashes
start "ClearInvoice Backend" cmd /k "cd /d %~dp0%BACKEND_DIR% && call %VENV_NAME%\Scripts\activate && echo Backend starting... && python manage.py runserver"

:: Launch Frontend
start "ClearInvoice Frontend" cmd /k "cd /d %~dp0%FRONTEND_DIR% && echo Frontend starting... && npm run dev"

echo.
echo ====================================================
echo IF WINDOWS CLOSED: Read the messages above.
echo IF WINDOWS ARE OPEN: Setup is complete.
echo ====================================================
pause