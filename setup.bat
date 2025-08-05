@echo off
echo.
echo ========================================
echo  Sage Retirement Planning - Quick Start
echo ========================================
echo.

echo [1/4] Installing frontend dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Setting up Python backend with uv...
cd backend

echo Checking if uv is available...
uv --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: uv is not installed or not in PATH
    echo Install uv: https://docs.astral.sh/uv/getting-started/installation/
    echo   Windows:  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    pause
    exit /b 1
)

echo Installing Python dependencies with uv...
uv sync
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo [3/4] Setting up environment files...
if not exist ".env.local" (
    if exist ".env.example" (
        copy ".env.example" ".env.local"
        echo Created .env.local from template
    )
)

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env"
        echo Created backend\.env from template
        echo.
        echo IMPORTANT: Please edit backend\.env with your Azure credentials before running in live mode
    )
)

echo.
echo [4/4] Setup complete!
echo.
echo To start the application:
echo   Frontend only: npm run dev          (http://localhost:3847)
echo   Backend only:  npm run backend:dev  (http://localhost:8172)
echo   Both together: npm run dev:full
echo.
echo Run backend tests: npm run backend:test
echo.
pause
