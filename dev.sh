#!/bin/bash
# Start both backend and frontend for local development

set -e
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "Starting FSDK Starter..."
echo "  Backend:  http://localhost:5001"
echo "  Frontend: http://localhost:3000"
echo ""

(cd server && python app.py) &
(cd frontend && npm run dev) &

wait
