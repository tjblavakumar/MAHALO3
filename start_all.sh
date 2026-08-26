#!/bin/bash
# MAHALO3 - Start all services
# Usage: ./start_all.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS_DIR="$PROJECT_DIR/.pids"
mkdir -p "$PIDS_DIR"

echo "🚀 Starting MAHALO3 services..."
echo ""

# --- Mock Jira ---
echo "  [1/5] Starting Mock Jira on :5001..."
cd "$PROJECT_DIR/mock-services/jira"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5001 &
echo $! > "$PIDS_DIR/jira.pid"
deactivate

# --- Mock Confluence ---
echo "  [2/5] Starting Mock Confluence on :5002..."
cd "$PROJECT_DIR/mock-services/confluence"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5002 &
echo $! > "$PIDS_DIR/confluence.pid"
deactivate

# --- Mock GitHub ---
echo "  [3/5] Starting Mock GitHub on :5003..."
cd "$PROJECT_DIR/mock-services/github"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 5003 &
echo $! > "$PIDS_DIR/github.pid"
deactivate

# --- Backend ---
echo "  [4/5] Starting Backend on :8000..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
echo $! > "$PIDS_DIR/backend.pid"
deactivate

# --- Frontend ---
echo "  [5/5] Starting Frontend on :3000..."
cd "$PROJECT_DIR/frontend"
npm run dev -- -p 3000 &
echo $! > "$PIDS_DIR/frontend.pid"

# Wait for services to be ready
sleep 3

echo ""
echo "✅ All services started!"
echo ""
echo "  📋 Mock Jira:       http://localhost:5001"
echo "  📄 Mock Confluence:  http://localhost:5002"
echo "  🐙 Mock GitHub:     http://localhost:5003"
echo "  ⚙️  Backend:         http://localhost:8000"
echo "  🌐 Frontend:        http://localhost:3000"
echo ""
echo "  To stop all: ./stop_all.sh"
