#!/bin/sh
# The container's start: the two secrets from their files into the environment, never into the compose file
# or the log, then the service.
set -eu
FM_PASSWORD=$(cat /run/schoolman-sync/fm_password)
SCHOOLMAN_SYNC_KEY=$(cat /run/schoolman-sync/schoolman_sync_key)
export FM_PASSWORD SCHOOLMAN_SYNC_KEY
exec node /app/scripts/schoolman-sync/sync.mjs "$@"
