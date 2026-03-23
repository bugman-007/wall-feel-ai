@echo off
REM Wallfeel AI Visualizer - Setup Script (Windows)
REM This script sets up the development environment

echo.
echo 🎨 Wallfeel AI Visualizer - Setup Script
echo ========================================
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION%

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found. Please install Python 3.10+ from https://python.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ %PYTHON_VERSION%

REM Check Git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git not found. Please install Git from https://git-scm.com/
    exit /b 1
)
for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
echo ✅ %GIT_VERSION%

echo.
echo 📦 Setting up frontend...
cd frontend

REM Install frontend dependencies
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
) else (
    echo ✅ Node modules already installed
)

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating .env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
    ) > .env.local
    echo ✅ Created .env.local
) else (
    echo ✅ .env.local already exists
)

cd ..

echo.
echo 📦 Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo ✅ Created virtual environment
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install backend dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating .env...
    copy .env.example .env
    echo ✅ Created .env (please edit with your credentials)
) else (
    echo ✅ .env already exists
)

cd ..

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit backend\.env with your R2 credentials
echo 2. Start the backend: cd backend ^&^& python main.py
echo 3. Start the frontend: cd frontend ^&^& npm run dev
echo 4. Open http://localhost:3000 in your browser
echo.
echo 📚 Documentation:
echo - Quick Start: docs\QUICK-START.md
echo - Deployment: docs\DEPLOYMENT-GUIDE.md
echo - Testing: docs\TESTING-GUIDE.md
echo.
echo 🎉 Happy coding!
echo.
pause
