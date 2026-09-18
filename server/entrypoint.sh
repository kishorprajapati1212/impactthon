#!/bin/sh
set -e

echo ""
echo "════════════════════════════════════════════════════════"
echo "  AttendX API — starting container"
echo "════════════════════════════════════════════════════════"
echo "  MONGODB_URI = ${MONGODB_URI:-not set}"
echo "  PORT        = ${PORT:-3000}"
echo "════════════════════════════════════════════════════════"
echo ""

# AUTO_SEED=true seeds ONLY if DB is empty (never wipes unless FORCE_SEED=true)
if [ "${AUTO_SEED}" = "true" ] || [ "${FORCE_SEED}" = "true" ]; then
  echo "🌱 Running seeder (safe: skips if data exists unless FORCE_SEED=true)..."
  FORCE_SEED="${FORCE_SEED:-false}" node seed/seed.js || echo "⚠️ seed skipped/failed — continuing"
  echo ""
fi

PORT="${PORT:-3000}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Starting API                                       ║"
echo "║  Health : http://127.0.0.1:${PORT}/health                ║"
echo "║  UI     : http://127.0.0.1:5173                        ║"
echo "║  IDX    : Ports panel → 5173 (UI) · 3000 (API)         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

exec node index.js
