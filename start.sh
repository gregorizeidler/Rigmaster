#!/bin/bash

echo "🎸 Starting Guitrard - Guitar Live FX"
echo "===================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
if [ -f "backend/app.py" ]; then
    echo "🚀 Starting Backend server..."
    cd backend
    python3 app.py &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend running on http://localhost:5000"
else
    echo "⚠️  Backend not found. Running frontend only."
fi

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo ""
echo "🚀 Starting Frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Guitrard is starting..."
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for any process to exit
wait

