#!/bin/bash
# Run by Rahman on his Mac, once: puts the sync's two secrets on the office server straight from his Keychain,
# without showing them — `casa-workspacesync` (WorkspaceSync's password) and `casa-schoolman-sync-key` (the
# signing key, the app's SCHOOLMAN_SYNC_KEY). Each lands in its own file, readable only by the service.
set -euo pipefail
HOST=${SYNC_HOST:-root@10.0.60.11}
KEY=${SYNC_SSH_KEY:-$HOME/.ssh/casa_klassenbuch_ed25519}
DIR=/root/docker/schoolman-sync/secrets
on() { ssh -i "$KEY" -o IdentitiesOnly=yes -o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-%C" -o ControlPersist=10m "$HOST" "$@"; }

on "mkdir -p $DIR && chown 1000:1000 $DIR && chmod 700 $DIR"
for pair in "casa-workspacesync fm_password" "casa-schoolman-sync-key schoolman_sync_key"; do
  item=${pair% *} file=${pair#* }
  security find-generic-password -s "$item" -w |
    on "umask 077 && cat > $DIR/$file && chown 1000:1000 $DIR/$file && chmod 400 $DIR/$file && test -s $DIR/$file && echo '$file stored'"
done
