#!/bin/sh
# Wipe the database and load the demo college again (password 123456 for everyone).
#
#   ./reseed.sh                       → wipe + reseed (containers must be running)
#   SEED_HISTORY=false ./reseed.sh    → accounts and classes only, no past lectures
#
# "Permission denied"?  Either run it through the shell:   sh reseed.sh
#                       or make it executable once:         chmod +x reseed.sh start.sh
# Not running yet?      WIPE_DATA=1 ./start.sh   (drops the volume, rebuilds, auto-seeds)
# Without this script:  docker compose exec -e FORCE_SEED=true server node seed/seed.js
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed (or not on PATH). Install Docker Desktop / Docker Engine first."
  exit 1
fi

# Can we talk to Docker at all? (Linux: the user may need sudo or the docker group)
if ! err="$(docker compose ps 2>&1 >/dev/null)"; then
  case "$err" in
    *ermission\ denied*|*EACCES*)
      echo "Docker refused the connection: permission denied."
      echo "  Run it with sudo:            sudo sh reseed.sh"
      echo "  …or allow your user once:    sudo usermod -aG docker \$USER   (then log out and back in)"
      ;;
    *)
      echo "Docker is not reachable: $err"
      echo "Start Docker Desktop (or the docker service) and try again."
      ;;
  esac
  exit 1
fi

if ! docker compose ps --status running --services 2>/dev/null | grep -qx server; then
  echo "The API container is not running. Start everything with:  ./start.sh"
  echo "…or wipe + start in one go with:                           WIPE_DATA=1 ./start.sh"
  exit 1
fi

echo "Deleting ALL data and loading the demo college…"
docker compose exec -e FORCE_SEED=true -e SEED_HISTORY="${SEED_HISTORY:-true}" server node seed/seed.js
echo "Done. Log out and log in again - old browser sessions belong to deleted accounts."
