@echo off
setlocal enabledelayedexpansion

:: PharmaLink Service Manager - Batch Version
:: Standalone CMD script for managing PharmaLink services

title PharmaLink Service Manager v1.0

:: Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Colors
set "COLOR_DEFAULT=07"
set "COLOR_HEADER=0B"
set "COLOR_SUCCESS=0A"
set "COLOR_ERROR=0C"
set "COLOR_WARNING=0E"

:MAIN_MENU
cls
color %COLOR_HEADER%
echo.
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║                                                                  ║
echo  ║   ██████╗ ██╗  ██╗ █████╗ ██████╗ ███╗   ███╗ █████╗            ║
echo  ║   ██╔══██╗██║  ██║██╔══██╗██╔══██╗████╗ ████║██╔══██╗           ║
echo  ║   ██████╔╝███████║███████║██████╔╝██╔████╔██║███████║           ║
echo  ║   ██╔═══╝ ██╔══██║██╔══██║██╔══██╗██║╚██╔╝██║██╔══██║           ║
echo  ║   ██║     ██║  ██║██║  ██║██║  ██║██║ ╚═╝ ██║██║  ██║           ║
echo  ║   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝           ║
echo  ║                        LINK                                      ║
echo  ║                                                                  ║
echo  ║            Integrated Service Management Console                 ║
echo  ║                                                                  ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.
color %COLOR_DEFAULT%
echo  ┌────────────────────────────────────────────────────────────────┐
echo  │                      SERVICE CONTROLS                         │
echo  ├────────────────────────────────────────────────────────────────┤
echo  │                                                                │
echo  │   [1]  Start Backend API          (Express.js - Port 3000)    │
echo  │   [2]  Start Frontend App         (Vite+React - Port 5173)    │
echo  │   [3]  Start ML Service           (FastAPI    - Port 8000)    │
echo  │                                                                │
echo  ├────────────────────────────────────────────────────────────────┤
echo  │                                                                │
echo  │   [4]  Install ^& Start Backend                                 │
echo  │   [5]  Install ^& Start Frontend                                │
echo  │   [6]  Install ^& Start ML Service                              │
echo  │                                                                │
echo  ├────────────────────────────────────────────────────────────────┤
echo  │                      BATCH OPERATIONS                         │
echo  ├────────────────────────────────────────────────────────────────┤
echo  │                                                                │
echo  │   [7]  Start ALL Services                                     │
echo  │   [8]  Install ^& Start ALL Services                           │
echo  │                                                                │
echo  ├────────────────────────────────────────────────────────────────┤
echo  │                                                                │
echo  │   [0]  Exit                                                   │
echo  │                                                                │
echo  └────────────────────────────────────────────────────────────────┘
echo.
set /p "choice=  Enter your choice [0-8]: "

if "%choice%"=="1" goto START_BACKEND
if "%choice%"=="2" goto START_FRONTEND
if "%choice%"=="3" goto START_ML
if "%choice%"=="4" goto INSTALL_BACKEND
if "%choice%"=="5" goto INSTALL_FRONTEND
if "%choice%"=="6" goto INSTALL_ML
if "%choice%"=="7" goto START_ALL
if "%choice%"=="8" goto INSTALL_ALL
if "%choice%"=="0" goto EXIT

echo.
color %COLOR_ERROR%
echo  [ERROR] Invalid choice. Please try again.
color %COLOR_DEFAULT%
timeout /t 2 >nul
goto MAIN_MENU

:: ============================================================================
::                           START SERVICES
:: ============================================================================

:START_BACKEND
cls
echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   Starting Backend API Service...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%backend
echo  Command:   npm run dev
echo  Port:      3000
echo.
start "PharmaLink Backend (Port 3000)" cmd /k "cd /d "%SCRIPT_DIR%backend" && npm run dev"
echo  [OK] Backend started in new window.
echo.
pause
goto MAIN_MENU

:START_FRONTEND
cls
echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   Starting Frontend Application...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%frontend
echo  Command:   npm run dev
echo  Port:      5173
echo.
start "PharmaLink Frontend (Port 5173)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"
echo  [OK] Frontend started in new window.
echo.
pause
goto MAIN_MENU

:START_ML
cls
echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   Starting ML Service...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%ml_service
echo  Command:   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo  Port:      8000
echo.
start "PharmaLink ML Service (Port 8000)" cmd /k "cd /d "%SCRIPT_DIR%ml_service" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo  [OK] ML Service started in new window.
echo.
pause
goto MAIN_MENU

:: ============================================================================
::                        INSTALL & START SERVICES
:: ============================================================================

:INSTALL_BACKEND
cls
echo.
color %COLOR_WARNING%
echo  ═══════════════════════════════════════════════════════════════
echo   Installing ^& Starting Backend API Service...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%backend
echo  Commands:  npm install ^&^& npm run dev
echo  Port:      3000
echo.
start "PharmaLink Backend - Installing (Port 3000)" cmd /k "cd /d "%SCRIPT_DIR%backend" && echo Installing dependencies... && npm install && echo. && echo Starting server... && npm run dev"
echo  [OK] Backend installation started in new window.
echo.
pause
goto MAIN_MENU

:INSTALL_FRONTEND
cls
echo.
color %COLOR_WARNING%
echo  ═══════════════════════════════════════════════════════════════
echo   Installing ^& Starting Frontend Application...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%frontend
echo  Commands:  npm install ^&^& npm run dev
echo  Port:      5173
echo.
start "PharmaLink Frontend - Installing (Port 5173)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && echo Installing dependencies... && npm install && echo. && echo Starting server... && npm run dev"
echo  [OK] Frontend installation started in new window.
echo.
pause
goto MAIN_MENU

:INSTALL_ML
cls
echo.
color %COLOR_WARNING%
echo  ═══════════════════════════════════════════════════════════════
echo   Installing ^& Starting ML Service...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Directory: %SCRIPT_DIR%ml_service
echo  Commands:  pip install -r requirements.txt ^&^& uvicorn ...
echo  Port:      8000
echo.
start "PharmaLink ML Service - Installing (Port 8000)" cmd /k "cd /d "%SCRIPT_DIR%ml_service" && echo Installing dependencies... && pip install -r requirements.txt && echo. && echo Starting server... && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo  [OK] ML Service installation started in new window.
echo.
pause
goto MAIN_MENU

:: ============================================================================
::                          BATCH OPERATIONS
:: ============================================================================

:START_ALL
cls
echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   Starting ALL PharmaLink Services...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.

echo  [1/3] Starting ML Service (Port 8000)...
start "PharmaLink ML Service (Port 8000)" cmd /k "cd /d "%SCRIPT_DIR%ml_service" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 >nul

echo  [2/3] Starting Backend API (Port 3000)...
start "PharmaLink Backend (Port 3000)" cmd /k "cd /d "%SCRIPT_DIR%backend" && npm run dev"
timeout /t 2 >nul

echo  [3/3] Starting Frontend App (Port 5173)...
start "PharmaLink Frontend (Port 5173)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   All services started successfully!
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Access Points:
echo  ─────────────────────────────────────────────────────────────
echo    Frontend:   http://localhost:5173
echo    Backend:    http://localhost:3000
echo    ML Service: http://localhost:8000
echo    ML Docs:    http://localhost:8000/docs
echo  ─────────────────────────────────────────────────────────────
echo.
pause
goto MAIN_MENU

:INSTALL_ALL
cls
echo.
color %COLOR_WARNING%
echo  ═══════════════════════════════════════════════════════════════
echo   Installing ^& Starting ALL PharmaLink Services...
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.

echo  [1/3] Installing ^& Starting ML Service (Port 8000)...
start "PharmaLink ML Service - Installing (Port 8000)" cmd /k "cd /d "%SCRIPT_DIR%ml_service" && echo Installing ML dependencies... && pip install -r requirements.txt && echo. && echo Starting ML server... && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 >nul

echo  [2/3] Installing ^& Starting Backend API (Port 3000)...
start "PharmaLink Backend - Installing (Port 3000)" cmd /k "cd /d "%SCRIPT_DIR%backend" && echo Installing Backend dependencies... && npm install && echo. && echo Starting Backend server... && npm run dev"
timeout /t 3 >nul

echo  [3/3] Installing ^& Starting Frontend App (Port 5173)...
start "PharmaLink Frontend - Installing (Port 5173)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && echo Installing Frontend dependencies... && npm install && echo. && echo Starting Frontend server... && npm run dev"

echo.
color %COLOR_SUCCESS%
echo  ═══════════════════════════════════════════════════════════════
echo   All installation processes started!
echo  ═══════════════════════════════════════════════════════════════
color %COLOR_DEFAULT%
echo.
echo  Each service is installing in its own window.
echo  Please wait for installations to complete.
echo.
echo  Access Points (after installation):
echo  ─────────────────────────────────────────────────────────────
echo    Frontend:   http://localhost:5173
echo    Backend:    http://localhost:3000
echo    ML Service: http://localhost:8000
echo    ML Docs:    http://localhost:8000/docs
echo  ─────────────────────────────────────────────────────────────
echo.
pause
goto MAIN_MENU

:: ============================================================================
::                               EXIT
:: ============================================================================

:EXIT
cls
echo.
color %COLOR_HEADER%
echo  ╔══════════════════════════════════════════════════════════════════╗
echo  ║                                                                  ║
echo  ║                    Thank you for using                           ║
echo  ║                 PharmaLink Service Manager                       ║
echo  ║                                                                  ║
echo  ╚══════════════════════════════════════════════════════════════════╝
color %COLOR_DEFAULT%
echo.
echo  NOTE: Any started services will continue running in their windows.
echo        Close those windows manually to stop the services.
echo.
timeout /t 3 >nul
exit /b 0
