#!/bin/bash
# Full-stack startup script for the Parlay Prediction application

echo "🚀 Starting Parlay Prediction Full-Stack Application"
echo "=================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo "⏳ Waiting for $service_name to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start after $max_attempts seconds"
    return 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check ports
echo "🔍 Checking ports..."
check_port 8000 || { echo "❌ Backend port 8000 is in use. Please stop the existing service."; exit 1; }
check_port 5173 || { echo "❌ Frontend port 5173 is in use. Please stop the existing service."; exit 1; }

# Start backend server
echo ""
echo "🔧 Starting Backend Server..."
cd server

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment and start server
source venv/bin/activate

# Check environment variables
if [ ! -f ".env" ]; then
    echo "❌ No .env file found in server directory"
    echo "Please create server/.env with:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Verify environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing required environment variables in server/.env"
    echo "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✅ Environment variables loaded"

# Start backend in background
echo "🚀 Starting backend server on port 8000..."
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

# Wait for backend to be ready
if wait_for_service "http://localhost:8000/health" "Backend API"; then
    echo "✅ Backend is running (PID: $BACKEND_PID)"
else
    echo "❌ Failed to start backend"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo ""
echo "🎨 Starting Frontend..."
cd ../client

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Check client environment
if [ ! -f ".env" ]; then
    echo "❌ No .env file found in client directory"
    echo "Please create client/.env with:"
    echo "VITE_SUPABASE_URL=your_supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=your_anon_key"
    exit 1
fi

echo "🚀 Starting frontend development server on port 5173..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
if wait_for_service "http://localhost:5173" "Frontend"; then
    echo "✅ Frontend is running (PID: $FRONTEND_PID)"
else
    echo "❌ Failed to start frontend"
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Full-stack application is running!"
echo "=================================================="
echo "📊 Backend API: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait
