#!/bin/bash

echo "🎸 Installing Guitrard - Guitar Live FX"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python3 not found. Backend features will be disabled."
    SKIP_BACKEND=true
else
    echo "✅ Python3 found: $(python3 --version)"
fi

# Install Frontend
echo ""
echo "📦 Installing Frontend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed successfully"
else
    echo "❌ Error installing frontend dependencies"
    exit 1
fi

# Install Backend (optional)
if [ "$SKIP_BACKEND" != true ]; then
    echo ""
    echo "📦 Installing Backend dependencies..."
    cd backend
    pip3 install -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo "✅ Backend dependencies installed successfully"
    else
        echo "⚠️  Error installing backend dependencies (optional)"
    fi
    cd ..
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 To start the app:"
echo "   Frontend: npm start"
echo "   Backend:  cd backend && python3 app.py"
echo ""
echo "📖 Read SETUP.md for detailed configuration"
echo ""
echo "🎸 Happy rocking!"

