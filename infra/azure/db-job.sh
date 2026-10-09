#!/usr/bin/env bash
#
# Runs a task against the website's database, inside Azure.
#
#   ./infra/azure/db-job.sh migrate     apply pending migrations, then the seeds
#   ./infra/azure/db-job.sh status      list applied and pending migrations
#   ./infra/azure/db-job.sh bootstrap   first setup of a new server (needs
#                                       ADMIN_DATABASE_URL and APP_DB_PASSWORD)
#   ./infra/azure/db-job.sh owner       the first workspace account (needs
#                                       ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD)
#
# The server psql-casa-website-f8d745 (Belgium Central, 2026-10-09) has no public
# access; it sits in the private data network next to the student app's, so a
# laptop cannot reach it. This builds a small image with the migration runner
# and the SQL (infra/azure/db/Dockerfile), and runs it once as a Container Apps
# job in the site's own environment. The job is recreated on every run with only
# the secrets that task needs, so no admin credential stays behind.
#
# Run migrations BEFORE deploy.sh when a release brings new ones: the site's
# code may already rely on them (0016's sign-in throttle fails closed without
# its table).

set -euo pipefail

TASK="${1:-status}"
RG=rg-casa-website-prod
APP=ca-casa-website
JOB=caj-casa-website-db
ACR=acrcasaprodf8d745
ENV_ID=$(az containerapp env show -n cae-casa-prod -g rg-casa-platform-prod --query id -o tsv)
IDENTITY=$(az identity show -n id-casa-website-prod -g "$RG" --query id -o tsv)
ROOT=$(git rev-parse --show-toplevel)
TAG="db-$(git -C "$ROOT" rev-parse --short HEAD)-$(cat "$ROOT"/infra/azure/db/* "$ROOT"/db/*/*.sql | shasum | cut -c1-8)"
IMAGE="$ACR.azurecr.io/casa-website-db:$TAG"

secrets=()
envs=()
case "$TASK" in
  migrate|status)
    secrets+=("database-url=$(az containerapp secret show -n "$APP" -g "$RG" --secret-name database-url --query value -o tsv)")
    envs+=("DATABASE_URL=secretref:database-url")
    ;;
  bootstrap)
    : "${ADMIN_DATABASE_URL:?set ADMIN_DATABASE_URL}" "${APP_DB_PASSWORD:?set APP_DB_PASSWORD}"
    secrets+=("admin-database-url=$ADMIN_DATABASE_URL" "app-db-password=$APP_DB_PASSWORD")
    envs+=("ADMIN_DATABASE_URL=secretref:admin-database-url" "APP_DB_PASSWORD=secretref:app-db-password")
    ;;
  owner)
    : "${ADMIN_EMAIL:?set ADMIN_EMAIL}" "${ADMIN_NAME:?set ADMIN_NAME}" "${ADMIN_PASSWORD:?set ADMIN_PASSWORD}"
    secrets+=("database-url=$(az containerapp secret show -n "$APP" -g "$RG" --secret-name database-url --query value -o tsv)" "admin-password=$ADMIN_PASSWORD")
    envs+=("DATABASE_URL=secretref:database-url" "ADMIN_PASSWORD=secretref:admin-password" "ADMIN_EMAIL=$ADMIN_EMAIL" "ADMIN_NAME=$ADMIN_NAME")
    ;;
  *)
    echo "unknown task: $TASK" >&2
    exit 2
    ;;
esac

if ! az acr repository show-tags -n "$ACR" --repository casa-website-db -o tsv 2>/dev/null | grep -qx "$TAG"; then
  echo "==> building $IMAGE"
  CTX=$(mktemp -d)
  trap 'rm -rf "$CTX"' EXIT
  mkdir -p "$CTX/scripts/admin" "$CTX/infra/azure/db"
  cp -R "$ROOT/scripts/db" "$CTX/scripts/db"
  cp "$ROOT/scripts/admin/seed-staff.mjs" "$CTX/scripts/admin/"
  cp -R "$ROOT/db" "$CTX/db"
  cp "$ROOT/infra/azure/db/bootstrap.mjs" "$ROOT/infra/azure/db/task.sh" "$CTX/infra/azure/db/"
  az acr build -r "$ACR" -t "casa-website-db:$TAG" -f "$ROOT/infra/azure/db/Dockerfile" "$CTX" --only-show-errors -o none
fi

echo "==> job $JOB: $TASK"
az containerapp job delete -n "$JOB" -g "$RG" --yes -o none 2>/dev/null || true
az containerapp job create -n "$JOB" -g "$RG" --environment "$ENV_ID" \
  --trigger-type Manual --replica-timeout 900 --replica-retry-limit 0 \
  --parallelism 1 --replica-completion-count 1 \
  --image "$IMAGE" --registry-server "$ACR.azurecr.io" --registry-identity "$IDENTITY" \
  --mi-user-assigned "$IDENTITY" --container-name db --cpu 0.25 --memory 0.5Gi \
  --secrets "${secrets[@]}" --env-vars "${envs[@]}" \
  --command sh --args task.sh "$TASK" --only-show-errors -o none

EXECUTION=$(az containerapp job start -n "$JOB" -g "$RG" --query name -o tsv)
echo "==> execution $EXECUTION"
status=Running
for _ in $(seq 1 90); do
  status=$(az containerapp job execution show -n "$JOB" -g "$RG" --job-execution-name "$EXECUTION" --query properties.status -o tsv)
  case "$status" in Succeeded|Failed|Stopped|Degraded) break ;; esac
  sleep 10
done
echo "==> $status"
az containerapp job logs show -n "$JOB" -g "$RG" --execution "$EXECUTION" --container db --tail 300 2>/dev/null \
  | sed -E 's/^\{"TimeStamp":"[^"]*","Log":"//; s/"\}$//' || echo "(logs not available yet; see Log Analytics)"
[ "$status" = Succeeded ]
