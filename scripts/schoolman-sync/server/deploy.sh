#!/bin/bash
# The SchoolMan sync service on the office server (CT 103), from this checkout: copies the service's files,
# then (re)starts its container. The secrets must be there first (secrets.sh). docs/schoolman/MIGRATION.md §5.
#
#   scripts/schoolman-sync/server/deploy.sh          copy and (re)start
#   scripts/schoolman-sync/server/deploy.sh --off    stop it (the Mac's install-mac.sh is the way back)
set -euo pipefail
HOST=${SYNC_HOST:-root@10.0.60.11}
KEY=${SYNC_SSH_KEY:-$HOME/.ssh/casa_klassenbuch_ed25519}
DIR=/root/docker/schoolman-sync
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)
# One connection for all steps: SSH over the office VPN drops when several open in a row.
on() { ssh -i "$KEY" -o IdentitiesOnly=yes -o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-%C" -o ControlPersist=10m "$HOST" "$@"; }

if [ "${1:-}" = --off ]; then
  on "cd $DIR && docker compose down"
  exit 0
fi
on "mkdir -p $DIR/app $DIR/state $DIR/secrets && chown 1000:1000 $DIR/state $DIR/secrets && chmod 700 $DIR/secrets"
on "test -s $DIR/secrets/fm_password && test -s $DIR/secrets/schoolman_sync_key" || { echo "The secrets are not on the server yet: scripts/schoolman-sync/server/secrets.sh"; exit 1; }
COPYFILE_DISABLE=1 tar -C "$ROOT" --no-xattrs --no-mac-metadata -cf - \
  scripts/schoolman-sync/sync.mjs scripts/schoolman-sync/signature.mjs scripts/schoolman-sync/server/run.sh scripts/filemaker/sync-layouts.json |
  on "rm -rf $DIR/app.new && mkdir $DIR/app.new && tar -C $DIR/app.new -xf - && rm -rf $DIR/app && mv $DIR/app.new $DIR/app"
on "cat > $DIR/compose.yaml" < "$HERE/compose.yaml"
on "cd $DIR && docker compose up -d --force-recreate && sleep 20 && docker compose ps && docker logs --tail 5 schoolman-sync"
