#!/usr/bin/env bash
# AttendX — run WITHOUT Docker (laptop, Project IDX / Firebase Studio, Codespaces)
#
#   ./dev.sh            → installs deps if needed, seeds the demo college when the
#                         DB is empty, starts the API (3000) and the UI (5173)
#   FORCE_SEED=true ./dev.sh   → wipe + reload the demo college first
#   ./dev.sh --reseed          → same as FORCE_SEED=true
#
# The UI reaches the API on its OWN origin under /api/* (Vite proxy), so there
# is no CORS to configure. In a cloud IDE open ONLY the 5173 preview.
set -euo pipefail
cd "$(dirname "$0")"

[ "${1:-}" = "--reseed" ] && export FORCE_SEED=true

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

# ── .env file (copied from the example the first time) ───────────────────
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  say "created server/.env from .env.example (MongoDB on localhost:27017)"
fi
# Make sure the API seeds when the DB is empty (never wipes without FORCE_SEED)
grep -q '^AUTO_SEED=' server/.env || echo 'AUTO_SEED=true' >> server/.env
# Load it so this script sees MONGODB_URI / PORT (dotenv does the same for the API)
set -a; . ./server/.env; set +a

# ── dependencies ─────────────────────────────────────────────────────────
command -v node >/dev/null || { echo "Node.js 18+ is required (https://nodejs.org)"; exit 1; }
[ -d server/node_modules ]   || { say "installing server dependencies";   (cd server   && npm install --no-audit --no-fund); }
[ -d frontend/node_modules ] || { say "installing frontend dependencies"; (cd frontend && npm install --no-audit --no-fund); }

# ── MongoDB reachable? ───────────────────────────────────────────────────
MONGO_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/attendx_db}"
if ! (cd server && MONGODB_URI="$MONGO_URI" node -e '
  import("mongoose").then(async ({default: m}) => {
    try { await m.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 }); await m.disconnect(); process.exit(0); }
    catch (e) { console.error("   " + e.message); process.exit(1); }
  });'); then
  cat <<MSG

MongoDB is not reachable at: $MONGO_URI
  • Laptop:  start MongoDB (brew services start mongodb-community / sudo systemctl start mongod)
             or run only the database in Docker:  docker run -d -p 27017:27017 --name attendx-mongo mongo:7
  • IDX / Firebase Studio: .idx/dev.nix already enables MongoDB — run "Firebase Studio: Rebuild environment"
  • Atlas:   put your mongodb+srv:// URL into server/.env (MONGODB_URI=…)
MSG
  exit 1
fi

# ── seed (skips when data exists unless FORCE_SEED=true) ─────────────────
say "demo data"
(cd server && FORCE_SEED="${FORCE_SEED:-false}" node seed/seed.js) || echo "   (seed skipped)"

# ── run both ─────────────────────────────────────────────────────────────
API_PORT="${PORT:-3000}"
UI_PORT="${UI_PORT:-5173}"
UI_HOST="${UI_HOST:-0.0.0.0}"
say "starting API on :$API_PORT and UI on :$UI_PORT  (Ctrl+C stops both)"
(cd server && PORT="$API_PORT" npm run dev) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT INT TERM
sleep 2
cd frontend && API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:$API_PORT}" npm run dev -- --host "$UI_HOST" --port "$UI_PORT"
