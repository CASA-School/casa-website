#!/bin/sh
# The tasks infra/azure/db-job.sh runs inside the database image.
set -e
case "$1" in
  migrate)
    node scripts/db/migrate.mjs
    node scripts/db/apply-sql-directory.mjs db/seeds
    node scripts/db/migrate.mjs --status
    ;;
  status) node scripts/db/migrate.mjs --status ;;
  bootstrap) node bootstrap.mjs ;;
  owner) node scripts/admin/seed-staff.mjs ;;
  *) echo "unknown task: $1" >&2; exit 2 ;;
esac
