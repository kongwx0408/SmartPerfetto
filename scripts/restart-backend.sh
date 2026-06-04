#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2024-2026 Gracker (Chris)
# This file is part of SmartPerfetto. See LICENSE for details.

# Quick backend-only restart (no frontend rebuild)
# Use this when you need to force-restart the backend without touching the frontend.
#
# Most backend changes DON'T need this — tsx watch auto-restarts on file save.
# Use this only for: .env changes, npm install, or if tsx watch gets stuck.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_ENV_HELPERS="$PROJECT_ROOT/scripts/node-env.sh"
SERVICE_PORT_HELPERS="$PROJECT_ROOT/scripts/service-ports.sh"
# shellcheck source=scripts/node-env.sh
. "$NODE_ENV_HELPERS"
# shellcheck source=scripts/service-ports.sh
. "$SERVICE_PORT_HELPERS"

smartperfetto_ensure_node "$PROJECT_ROOT"
BACKEND_PORT="$(smartperfetto_resolve_backend_port)"
FRONTEND_PORT="$(smartperfetto_resolve_frontend_port)"
FRONTEND_URL="$(smartperfetto_env_value FRONTEND_URL)"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:$FRONTEND_PORT}"

# Kill only the backend process
echo "Stopping backend..."
if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
  BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    sleep 1
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
      kill -9 "$BACKEND_PID" 2>/dev/null || true
    fi
  fi
fi

# Also kill any tsx/node processes on the backend port.
PORT_PIDS=$(lsof -ti "tcp:$BACKEND_PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
  echo "$PORT_PIDS" | xargs kill 2>/dev/null || true
fi
sleep 1

smartperfetto_ensure_backend_deps "$PROJECT_ROOT"

# Start backend with tsx watch (hot-reload enabled)
echo "Starting backend (tsx watch — auto-reloads on file changes)..."
cd "$PROJECT_ROOT/backend"

LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="$LOGS_DIR/backend_${TIMESTAMP}.log"

# Redirect directly to log file instead of using tee with process substitution.
# When restart-backend.sh is called headlessly (e.g., from Claude Code's Bash tool),
# the calling shell exits after the script completes. If tee's stdout is connected to
# that shell's pipe, it gets EPIPE when the backend writes — this propagates to the
# Claude Agent SDK subprocess and crashes the analysis with "exited with code 1".
PORT="$BACKEND_PORT" \
SMARTPERFETTO_BACKEND_PORT="$BACKEND_PORT" \
SMARTPERFETTO_FRONTEND_PORT="$FRONTEND_PORT" \
FRONTEND_URL="$FRONTEND_URL" \
SMARTPERFETTO_LOCK_SERVICE_PORTS=1 \
npm run dev >> "$BACKEND_LOG" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PROJECT_ROOT/.backend.pid"
ln -sf "$BACKEND_LOG" "$LOGS_DIR/backend_latest.log"

# Wait for health check
echo "Waiting for backend..."
for i in {1..15}; do
  if curl -fsS "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
    echo "Backend ready! (${i}s) PID: $NEW_PID"
    echo "Log: $BACKEND_LOG"
    echo ""
    echo "tsx watch is active — backend auto-restarts on .ts file changes."
    exit 0
  fi
  sleep 1
done

echo "WARNING: Backend not responding after 15s. Check: tail -f $BACKEND_LOG"
