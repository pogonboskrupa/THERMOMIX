#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

echo "╔══════════════════════════════════════╗"
echo "║          ThermoChef Startup          ║"
echo "╚══════════════════════════════════════╝"

# --- Backend setup ---
BACKEND_DIR="$SCRIPT_DIR/backend"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  echo "→ Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "→ Installing backend dependencies..."
.venv/bin/pip install -q -r requirements.txt

# Install Playwright browsers if needed
if ! .venv/bin/python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); p.stop()" 2>/dev/null; then
  echo "→ Installing Playwright browsers (first time setup)..."
  .venv/bin/playwright install chromium --with-deps 2>/dev/null || true
fi

echo "→ Starting backend on http://localhost:8000 ..."
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# --- Frontend setup ---
FRONTEND_DIR="$SCRIPT_DIR/frontend"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "→ Installing frontend dependencies..."
  npm install
fi

echo "→ Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ ThermoChef is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

# Cleanup on exit
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait $BACKEND_PID $FRONTEND_PID
