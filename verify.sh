#!/bin/bash

# Wallfeel AI Visualizer - Verification Script
# Checks if all required files are present

echo "🔍 Verifying Wallfeel AI Visualizer Installation..."
echo ""

ERRORS=0

# Check frontend files
echo "📦 Checking Frontend..."
if [ -f "frontend/package.json" ]; then
    echo "  ✅ package.json"
else
    echo "  ❌ package.json missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "frontend/app/page.tsx" ]; then
    echo "  ✅ app/page.tsx"
else
    echo "  ❌ app/page.tsx missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "frontend/app/components" ]; then
    COMPONENTS=$(ls frontend/app/components/*.tsx 2>/dev/null | wc -l)
    echo "  ✅ $COMPONENTS components found"
else
    echo "  ❌ components directory missing"
    ERRORS=$((ERRORS + 1))
fi

# Check backend files
echo ""
echo "📦 Checking Backend..."
if [ -f "backend/main.py" ]; then
    echo "  ✅ main.py"
else
    echo "  ❌ main.py missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/r2_client.py" ]; then
    echo "  ✅ r2_client.py"
else
    echo "  ❌ r2_client.py missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/requirements.txt" ]; then
    echo "  ✅ requirements.txt"
else
    echo "  ❌ requirements.txt missing"
    ERRORS=$((ERRORS + 1))
fi

# Check RunPod files
echo ""
echo "📦 Checking RunPod Handlers..."
if [ -f "runpod/sam_handler.py" ]; then
    echo "  ✅ sam_handler.py"
else
    echo "  ❌ sam_handler.py missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "runpod/sdxl_handler.py" ]; then
    echo "  ✅ sdxl_handler.py"
else
    echo "  ❌ sdxl_handler.py missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "runpod/Dockerfile.sam" ]; then
    echo "  ✅ Dockerfile.sam"
else
    echo "  ❌ Dockerfile.sam missing"
    ERRORS=$((ERRORS + 1))
fi

# Check setup scripts
echo ""
echo "📦 Checking Setup Scripts..."
if [ -f "setup.sh" ]; then
    echo "  ✅ setup.sh"
else
    echo "  ❌ setup.sh missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "setup.bat" ]; then
    echo "  ✅ setup.bat"
else
    echo "  ❌ setup.bat missing"
    ERRORS=$((ERRORS + 1))
fi

# Check documentation
echo ""
echo "📦 Checking Documentation..."
if [ -f "README.md" ]; then
    echo "  ✅ README.md"
else
    echo "  ❌ README.md missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "GET-STARTED.md" ]; then
    echo "  ✅ GET-STARTED.md"
else
    echo "  ❌ GET-STARTED.md missing"
    ERRORS=$((ERRORS + 1))
fi

# Final result
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All files present!"
    echo "✅ Project is ready to run"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./setup.sh"
    echo "2. Edit: backend/.env"
    echo "3. Start: cd backend && python main.py"
    echo "4. Start: cd frontend && npm run dev"
    echo "5. Open: http://localhost:3000"
else
    echo "❌ $ERRORS files missing"
    echo "Please check the installation"
fi
echo "================================"
