#!/bin/sh
# One-command start with clear URLs (local + IDX)
set -e
cd "$(dirname "$0")"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  AttendX — docker compose up --build"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  After start, open:"
echo "    UI  →  http://127.0.0.1:5173"
echo "    API →  http://127.0.0.1:3000/health"
echo ""
echo "  Project IDX: open Ports panel and Ctrl+click:"
echo "    port 5173  = Frontend"
echo "    port 3000  = API"
echo ""
echo "  Mongo logs are SILENCED (on purpose)."
echo "  You should see attendx-server + attendx-frontend lines."
echo "════════════════════════════════════════════════════════"
echo ""

docker compose up --build "$@"
