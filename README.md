# Dissect: Sports Analytics & Parlay Platform

This document provides instructions for setting up and running the Dissect application, which consists of a React frontend and FastAPI backend with Supabase integration.

## Prerequisites

- Node.js (v16+) for the client
- Python 3.10+ for the server
- A Supabase account and project with tables set up

## Project Structure

```
├── client/               # Frontend React application
├── server/               # Backend FastAPI application
│   ├── app/              # Python backend code
│   ├── sql/              # SQL migration files for Supabase
│   └── requirements.txt  # Python dependencies
└── start_server.sh       # Server startup script
```

## Setup Instructions

### Step 1: Backend Setup

1. **Create a virtual environment and activate it:**

```bash
# From project root
python3 -m venv venv
source venv/bin/activate
```

2. **Install backend dependencies:**

```bash
pip install -r server/requirements.txt
```

3. **Configure Supabase:**
   - Create a Supabase project at https://supabase.com
   - Run the SQL migration files in the `server/sql/` directory in order (001, 002, etc.)
   - Create a `.env` file in the `server/` directory:

```properties
# server/.env
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-dashboard"
```

> **IMPORTANT:** Use the service role key (not the anon key) for the backend.

### Step 2: Frontend Setup

1. **Install frontend dependencies:**

```bash
cd client
npm install
```

2. **Configure frontend environment:**
   - Create a `.env` file in the `client/` directory:

```properties
# client/.env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
VITE_NEWS_API_KEY=your-news-api-key  # Optional
VITE_OPENAI_API_KEY=your-openai-key  # Optional
```

## Running the Application

### Start the Backend Server

Use the provided script which automatically loads environment variables:

```bash
# From project root
./start_server.sh
```

The server will run at http://localhost:8005.

> If you need to change the port, edit the `start_server.sh` file.

### Start the Frontend Development Server

```bash
cd client
npm run dev
```

The client will run at http://localhost:5173.

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/parlays/predict` - Generate parlay recommendations
- `POST /api/parlays/submit` - Submit a parlay for simulation
- `GET /api/parlays/history` - Get parlay history
- `GET /api/parlays/submitted` - Get recently submitted parlays

## Troubleshooting

### Common Issues

1. **500 Error on /api/parlays/history**
   - Check if Supabase credentials are correct in `server/.env`
   - Make sure you're using the service role key, not the anon key
   - Verify that the SQL migrations have been run in Supabase

2. **Python command not found**
   - Use `python3` instead of `python` if your system uses Python 3 as default

3. **Address already in use error**
   - Change the port number in `start_server.sh` if 8005 is already in use

4. **CORS errors in browser console**
   - Verify that the frontend is running on port 5173, which is allowed in CORS settings
   - If using a different port, update the CORS settings in `server/app/main.py`

### Checking Connectivity

1. Test backend health:
```bash
curl http://localhost:8005/health
```

2. Test Supabase connection:
```bash
source venv/bin/activate
cd server
python -c "from app import get_supabase; print(get_supabase().table('history_parlays').select('count').execute())"
```

## Deployment Notes

This setup is for development purposes. For production deployment:

1. Use proper process managers (PM2, systemd, etc.) rather than `start_server.sh`
2. Configure proper security for the Supabase service role key
3. Set up HTTPS for secure communication