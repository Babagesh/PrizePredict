#!/bin/bash
# Environment setup script for Parlay Prediction application

echo "🔧 Setting up Parlay Prediction Environment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to create .env file if it doesn't exist
create_env_file() {
    local file_path=$1
    local content=$2
    
    if [ ! -f "$file_path" ]; then
        echo "📝 Creating $file_path..."
        cat > "$file_path" << EOF
$content
EOF
        echo "✅ Created $file_path"
    else
        echo "⚠️  $file_path already exists, skipping..."
    fi
}

# Setup server environment
echo ""
echo "🔧 Setting up server environment..."

# Create server .env if it doesn't exist
create_env_file "server/.env" "# Backend Supabase credentials
SUPABASE_URL=https://pkqbhbmmmfogutrwvmpp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJoYm1tbWZvZ3V0cnd2bXBwIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTkwMDkwMjYsImV4cCI6MjA3NDU4NTAyNn0.p5EpjQgvgaljP7tRn0wqwW2oqyb_80EIJWkZFlHmJOk"

# Setup Python virtual environment
cd server
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt
echo "✅ Python dependencies installed"

cd ..

# Setup client environment
echo ""
echo "🎨 Setting up client environment..."

# Create client .env if it doesn't exist
create_env_file "client/.env" "VITE_SUPABASE_URL=https://pkqbhbmmmfogutrwvmpp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJoYm1tbWZvZ3V0cnd2bXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDkwMjYsImV4cCI6MjA3NDU4NTAyNn0.p5EpjQgvgaljP7tRn0wqwW2oqyb_80EIJWkZFlHmJOk
VITE_NEWS_API_KEY=2f2a04caf40747fcb22e16a4429ebcf5
VITE_OPENAI_API_KEY=sk-proj-1ff9tJ6GKq-KEhOUGpaTCbg6_gls5J0ESKzIHuT9vkvsqv_1O4MQ4vcKKDRaN764XGz1KEX8pTT3BlbkFJNhm7rzNm-"

# Install client dependencies
cd client
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed"
else
    echo "✅ Node.js dependencies already installed"
fi

cd ..

# Test connections
echo ""
echo "🧪 Testing connections..."

# Test backend connection
echo "Testing backend Supabase connection..."
cd server
source venv/bin/activate
export $(grep -v '^#' .env | xargs)
python -c "
from app import get_supabase
try:
    client = get_supabase()
    resp = client.table('active_parlays').select('*').limit(1).execute()
    print('✅ Backend Supabase connection successful')
except Exception as e:
    print(f'❌ Backend Supabase connection failed: {e}')
    exit(1)
"
BACKEND_TEST_RESULT=$?
cd ..

# Test frontend connection
echo "Testing frontend Supabase connection..."
cd client
if [ -f ".env" ]; then
    echo "✅ Frontend .env file exists"
else
    echo "❌ Frontend .env file missing"
    FRONTEND_TEST_RESULT=1
fi
cd ..

echo ""
echo "📋 Environment Setup Summary"
echo "============================"

if [ $BACKEND_TEST_RESULT -eq 0 ]; then
    echo "✅ Backend environment: READY"
else
    echo "❌ Backend environment: ISSUES DETECTED"
fi

if [ -f "client/.env" ]; then
    echo "✅ Frontend environment: READY"
else
    echo "❌ Frontend environment: ISSUES DETECTED"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Run './start_full_stack.sh' to start the application"
echo "2. Open http://localhost:5173 in your browser"
echo "3. Check http://localhost:8000/docs for API documentation"
echo ""
echo "🔧 Manual testing:"
echo "- Backend API: python test_backend_api.py"
echo "- Supabase connection: python test_supabase_connection.py"
