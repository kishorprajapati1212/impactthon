#!/bin/sh
# Free disk space used by Docker (and npm) for this project.
#
#   ./clean.sh          → safe clean: stopped containers, dangling images,
#                         Docker build cache, npm download cache.
#                         Your database volume and the images in use are kept.
#   DEEP=1 ./clean.sh   → also remove ALL unused images (mongo, redis, node,
#                         nginx are downloaded again on the next start) and the
#                         AttendX database volume (the demo college is loaded
#                         again automatically on the next start).
#
# When do you need it?  "npm error ... ENOSPC: no space left on device" during
# docker compose up --build, or `df -h` shows the disk is nearly full.
# "Permission denied"?  Run:  sh clean.sh
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed (or not on PATH)."; exit 1
fi

echo ""
echo "Disk before:"
df -h / 2>/dev/null | sed 's/^/  /' || true
docker system df 2>/dev/null | sed 's/^/  /' || true
echo ""

echo "1/4  Stopping AttendX containers..."
if [ "${DEEP:-0}" = "1" ]; then
  docker compose down --remove-orphans -v >/dev/null 2>&1 || true
else
  docker compose down --remove-orphans >/dev/null 2>&1 || true
fi

echo "2/4  Removing stopped containers and dangling images..."
docker container prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "3/4  Removing the Docker build cache..."
docker builder prune -af >/dev/null 2>&1 || true

echo "4/4  Clearing the npm download cache..."
if command -v npm >/dev/null 2>&1; then npm cache clean --force >/dev/null 2>&1 || true; fi

if [ "${DEEP:-0}" = "1" ]; then
  echo "DEEP=1  Removing all unused images and the database volume..."
  docker image prune -af >/dev/null 2>&1 || true
  docker volume prune -f >/dev/null 2>&1 || true
fi

echo ""
echo "Disk after:"
df -h / 2>/dev/null | sed 's/^/  /' || true
docker system df 2>/dev/null | sed 's/^/  /' || true
echo ""
echo "Still full? Big folders outside Docker are usually old copies of this project"
echo "with node_modules. Find them with:"
echo "  du -sh ~/*/ 2>/dev/null | sort -h | tail"
echo "  find ~ -name node_modules -type d -prune 2>/dev/null | xargs du -sh 2>/dev/null | sort -h | tail"
echo "Then start again:  ./start.sh"
