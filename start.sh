#!/bin/sh
# One-command start with clear URLs (local + IDX).
# Always rebuilds the images from the files in THIS folder, so you never see
# an old UI from a previous build.
#
#   ./start.sh            → rebuild changed layers + start
#   FRESH=1 ./start.sh    → full rebuild without Docker cache (use this if the
#                           browser still shows an old screen)
#   WIPE_DATA=1 ./start.sh → also delete the database, so the demo college
#                           (Nihal, Jeel, Ritik, Darshit · Sahil, Jatin · Admin)
#                           is loaded fresh on start. Password for all: 123456
#
# "Permission denied"?  Run it through the shell:  sh start.sh
#                       or make it executable once: chmod +x start.sh reseed.sh clean.sh
#   ./clean.sh            → free Docker disk space ("no space left on device")
set -e
cd "$(dirname "$0")"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  AttendX - starting (frontend v$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' frontend/package.json))"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  After start, open:"
echo "    UI  →  http://127.0.0.1:5173        (it reaches the API via /api - no CORS)"
echo "    API →  http://127.0.0.1:5173/api/health   or  http://127.0.0.1:3000/health"
echo ""
echo "  Project IDX / Firebase Studio / Codespaces: open ONLY port 5173."
echo "  (No Docker there?  ./dev.sh - or rebuild the environment, .idx/dev.nix does it all)"
echo ""
echo "  Mongo logs are SILENCED (on purpose)."
echo "  Still seeing the OLD admin screen? Run:  FRESH=1 ./start.sh"
echo "  then hard-refresh the browser (Ctrl+Shift+R)."
echo "  Want the demo data reset?         Run:  WIPE_DATA=1 ./start.sh   (or ./reseed.sh)"
echo "  Script says 'permission denied'?  Run:  sh start.sh   /   sh reseed.sh"
echo "  'no space left on device' during build? Run:  ./clean.sh"
echo "  Logins (password 123456, email = <firstname>@attendx.com):"
echo "    admin@ · teachers sahil@ jatin@ meet@ … · students nihal@ jeel@"
echo "    ritik@ darshit@ (CE·A 2024) yash@ (CE·B 2024) dev@ (CE·A 2025) …"
echo "    Student logins wait for the mentor's Accept (Login approvals)."
echo "════════════════════════════════════════════════════════"
echo ""

# Disk check: a Docker build needs ~2 GB free. On small machines (cloud IDEs
# such as Project IDX) old build cache and dangling images from earlier
# rebuilds are the usual reason for "ENOSPC: no space left on device".
free_kb="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "$free_kb" ] && [ "$free_kb" -lt 2097152 ]; then
  echo "  Low disk space: $((free_kb / 1024)) MB free on /. Removing dangling images and old build cache..."
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --keep-storage 1GB >/dev/null 2>&1 || true
  free_kb="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}')"
  echo "  Now $((free_kb / 1024)) MB free. If the build still fails with ENOSPC run:  ./clean.sh   (or  DEEP=1 ./clean.sh)"
  echo ""
fi

# Stop containers from any previous build of this project (same names).
if [ "${WIPE_DATA:-0}" = "1" ]; then
  echo "  WIPE_DATA=1 → removing the database volume (all data is deleted)…"
  docker compose down --remove-orphans -v >/dev/null 2>&1 || true
else
  docker compose down --remove-orphans >/dev/null 2>&1 || true
fi

if [ "${FRESH:-0}" = "1" ]; then
  echo "  FRESH=1 → rebuilding images without cache…"
  docker compose build --no-cache --pull
fi

docker compose up --build --force-recreate "$@"
