#!/bin/bash
source venv/bin/activate
cd server

# Export environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found"
fi

# Print environment check
echo "SUPABASE_URL set: $(if [ -n "$SUPABASE_URL" ]; then echo "YES"; else echo "NO"; fi)"
echo "SUPABASE_SERVICE_ROLE_KEY set: $(if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then echo "YES"; else echo "NO"; fi)"

# Start the server with environment variables
SUPABASE_URL="$SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" python3 -m uvicorn app.main:app --port 8000
