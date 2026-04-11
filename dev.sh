#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# dev.sh — Seeds admin user and starts all FSDK Starter services for local dev.
#
# Services started:
#   1. Backend API  (Flask, port 5001)
#   2. Frontend     (Next.js + Turbopack, port 3000)
#
# Usage:
#   ./dev.sh              — seed admin + start everything
#   ./dev.sh --no-seed    — skip seeding, just start services
# ──────────────────────────────────────────────────────────────────────────────
set -eo pipefail
set -m  # Enable job control so subshells get their own process groups

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

SKIP_SEED=false
for arg in "$@"; do
  case "$arg" in
    --no-seed) SKIP_SEED=true ;;
  esac
done

# Colors for log prefixes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track child PIDs for cleanup
PIDS=()
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down all services...${NC}"
  # Kill entire process groups (not just the shell wrappers) so python/npm
  # grandchildren also receive the signal.
  for pid in ${PIDS[@]+"${PIDS[@]}"}; do
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  # Brief grace period, then force-kill stragglers
  sleep 1
  for pid in ${PIDS[@]+"${PIDS[@]}"}; do
    kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# ── 0. First-run setup ────────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/server/.env" ]; then
  echo -e "${YELLOW}[setup]${NC} Creating server/.env from .env.example..."
  cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
fi

# Ensure foundation-sdk is installed from local copy
if ! python3 -c "import foundation" 2>/dev/null; then
  echo -e "${YELLOW}[setup]${NC} Installing foundation-sdk..."
  pip3 install -e "$ROOT_DIR/foundation-sdk" -q
fi

mkdir -p "$ROOT_DIR/server/instance"

if [ ! -d "$ROOT_DIR/fsdk-ts/dist" ]; then
  echo -e "${YELLOW}[setup]${NC} Building fsdk-ts..."
  (cd "$ROOT_DIR/fsdk-ts" && npm install && npm run build)
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo -e "${YELLOW}[setup]${NC} Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend" && npm install --install-links)
fi

# ── 1. Seed admin + Start Backend API (port 5001) ────────────────────────────
if [ "$SKIP_SEED" = false ]; then
  echo -e "${RED}[api]${NC} Seeding admin user + starting Flask API on port 5001..."
  (cd "$ROOT_DIR/server" && python3 app.py --seed-admin; python3 app.py) </dev/null 2>&1 | sed "s/^/$(printf "${RED}[api]${NC} ")/" &
else
  echo -e "${RED}[api]${NC} Starting Flask API on port 5001 (no seed)..."
  (cd "$ROOT_DIR/server" && python3 app.py) </dev/null 2>&1 | sed "s/^/$(printf "${RED}[api]${NC} ")/" &
fi
PIDS+=($!)

# ── 2. Start Frontend (Next.js + Turbopack, port 3000) ───────────────────────
echo -e "${BLUE}[frontend]${NC} Starting Next.js dev server on port 3000..."
(cd "$ROOT_DIR/frontend" && npm run dev) </dev/null 2>&1 | sed "s/^/$(printf "${BLUE}[frontend]${NC} ")/" &
PIDS+=($!)

echo ""
echo -e "${GREEN}All services starting:${NC}"
echo "  Backend API  → http://localhost:5001"
echo "  Frontend     → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for any child to exit
wait
