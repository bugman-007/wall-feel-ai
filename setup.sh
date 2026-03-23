#!/bin/bash

# Wallfeel AI Visualizer - Setup Script
# This script sets up the development environment

set -e  # Exit on error

echo "🎨 Wallfeel AI Visualizer - Setup Script"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.10+ from https://python.org/"
    exit 1
fi
PYTHON_CMD=$(command -v python3 || command -v python)
echo "✅ Python $($PYTHON_CMD --version)"

# Check Git
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git from https://git-scm.com/"
    exit 1
fi
echo "✅ Git $(git --version)"

echo ""
echo "📦 Setting up frontend..."
cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo "✅ Node modules already installed"
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created .env.local"
else
    echo "✅ .env.local already exists"
fi

cd ..

echo ""
echo "📦 Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
    echo "✅ Created virtual environment"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install backend dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env..."
    cp .env.example .env
    echo "✅ Created .env (please edit with your credentials)"
else
    echo "✅ .env already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env with your R2 credentials"
echo "2. Start the backend: cd backend && python main.py"
echo "3. Start the frontend: cd frontend && npm run dev"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "- Quick Start: docs/QUICK-START.md"
echo "- Deployment: docs/DEPLOYMENT-GUIDE.md"
echo "- Testing: docs/TESTING-GUIDE.md"
echo ""
echo "🎉 Happy coding!"
