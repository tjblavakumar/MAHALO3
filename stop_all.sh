#!/bin/bash
# MAHALO3 - Stop all services
# Usage: ./stop_all.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS_DIR="$PROJECT_DIR/.pids"

echo "🛑 Stopping MAHALO3 services..."
echo ""

stop_service() {
    local name=$1
    local pid_file="$PIDS_DIR/$name.pid"

    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            # Kill the process group to catch child processes (e.g., Next.js workers)
            kill -- -$(ps -o pgid= -p "$pid" | tr -d ' ') 2>/dev/null || kill "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null
            echo "  ✓ Stopped $name (PID $pid)"
        else
            echo "  - $name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "  - No PID file for $name"
    fi
}

stop_service "frontend"
stop_service "backend"
stop_service "github"
stop_service "confluence"
stop_service "jira"

# Also kill any orphaned processes on the known ports
for port in 5001 5002 5003 8000 3000; do
    pids=$(fuser ${port}/tcp 2>/dev/null | tr -s ' ')
    if [ -n "$pids" ]; then
        for pid in $pids; do
            kill -9 $pid 2>/dev/null
        done
        echo "  ✓ Killed process(es) on port $port"
    fi
done

rm -rf "$PIDS_DIR"

echo ""
echo "✅ All services stopped."
