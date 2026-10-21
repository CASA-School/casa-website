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
#   ./infra/azure/db-job.sh password    a new password for an existing account
#                                       (needs ADMIN_EMAIL, ADMIN_PASSWORD)
#   ./infra/azure/db-job.sh import      one SchoolMan bridge run (needs BRIDGE_URL,
#                                       BRIDGE_KEY; start it with infra/azure/bridge.sh)
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
# A job of its own per run, removed afterwards (2026-10-20): recreating one fixed name left Azure
# holding the old job's secret, and every run under that name hung before its container started.
JOB_PREFIX=caj-casa-website-db
JOB="$JOB_PREFIX-$(date -u +%m%d%H%M%S)"
ACR=acrcasaprodf8d745
ENV_ID=$(az containerapp env show -n cae-casa-prod -g rg-casa-platform-prod --query id -o tsv)
IDENTITY=$(az identity show -n id-casa-website-prod -g "$RG" --query id -o tsv)
ROOT=$(git rev-parse --show-toplevel)
TAG="db-$(git -C "$ROOT" rev-parse --short HEAD)-$(cat "$ROOT"/infra/azure/db/* "$ROOT"/db/*/*.sql "$ROOT"/scripts/filemaker/*.mjs | shasum | cut -c1-8)"
IMAGE="$ACR.azurecr.io/casa-website-db:$TAG"

secrets=()
envs=()
CPU=0.25
MEMORY=0.5Gi
TIMEOUT=900
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
  owner|password)
    : "${ADMIN_EMAIL:?set ADMIN_EMAIL}" "${ADMIN_PASSWORD:?set ADMIN_PASSWORD}"
    [ "$TASK" = password ] || : "${ADMIN_NAME:?set ADMIN_NAME}"
    secrets+=("database-url=$(az containerapp secret show -n "$APP" -g "$RG" --secret-name database-url --query value -o tsv)" "admin-password=$ADMIN_PASSWORD")
    envs+=("DATABASE_URL=secretref:database-url" "ADMIN_PASSWORD=secretref:admin-password" "ADMIN_EMAIL=$ADMIN_EMAIL" "ADMIN_NAME=${ADMIN_NAME:-}")
    ;;
  import)
    : "${BRIDGE_URL:?set BRIDGE_URL}" "${BRIDGE_KEY:?set BRIDGE_KEY}"
    secrets+=("database-url=$(az containerapp secret show -n "$APP" -g "$RG" --secret-name database-url --query value -o tsv)" "bridge-url=$BRIDGE_URL" "bridge-key=$BRIDGE_KEY")
    envs+=("DATABASE_URL=secretref:database-url" "BRIDGE_URL=secretref:bridge-url" "BRIDGE_KEY=secretref:bridge-key")
    # The learners' step holds a few thousand bookings in memory, and a whole run takes minutes. Two hours
    # since 2024 and 2025 came across (2026-10-21): the first such run writes some 9,000 bookings.
    CPU=1.0
    MEMORY=2Gi
    TIMEOUT=7200
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
  mkdir -p "$CTX/scripts/admin" "$CTX/scripts/filemaker" "$CTX/infra/azure/db"
  cp -R "$ROOT/scripts/db" "$CTX/scripts/db"
  cp "$ROOT/scripts/admin/seed-staff.mjs" "$CTX/scripts/admin/"
  cp "$ROOT"/scripts/filemaker/*.mjs "$CTX/scripts/filemaker/"
  cp -R "$ROOT/db" "$CTX/db"
  cp "$ROOT/infra/azure/db/bootstrap.mjs" "$ROOT/infra/azure/db/task.sh" "$CTX/infra/azure/db/"
  az acr build -r "$ACR" -t "casa-website-db:$TAG" -f "$ROOT/infra/azure/db/Dockerfile" "$CTX" --only-show-errors -o none
fi

echo "==> job $JOB: $TASK"
for old in $(az containerapp job list -g "$RG" --query "[?starts_with(name, '$JOB_PREFIX')].name" -o tsv 2>/dev/null); do
  running=$(az containerapp job execution list -n "$old" -g "$RG" --query "length([?properties.status=='Running'])" -o tsv 2>/dev/null || echo 0)
  [ "${running:-0}" = 0 ] && az containerapp job delete -n "$old" -g "$RG" --yes -o none 2>/dev/null || true
done
# Removed at exit only once its run has ended: a lost connection here must never stop a job in Azure
# (2026-10-20, the first bridge run was cut off in its learners' step that way).
STARTED=false
FINISHED=false
trap 'rm -rf "${CTX:-}"; if ! $STARTED || $FINISHED; then az containerapp job delete -n "$JOB" -g "$RG" --yes -o none 2>/dev/null || true; else echo "==> $JOB left running in Azure; the next run removes it" >&2; fi' EXIT
az containerapp job create -n "$JOB" -g "$RG" --environment "$ENV_ID" \
  --trigger-type Manual --replica-timeout "$TIMEOUT" --replica-retry-limit 0 \
  --parallelism 1 --replica-completion-count 1 \
  --image "$IMAGE" --registry-server "$ACR.azurecr.io" --registry-identity "$IDENTITY" \
  --mi-user-assigned "$IDENTITY" --container-name db --cpu "$CPU" --memory "$MEMORY" \
  --secrets "${secrets[@]}" --env-vars "${envs[@]}" \
  --command sh --args task.sh "$TASK" --only-show-errors -o none

EXECUTION=$(az containerapp job start -n "$JOB" -g "$RG" --query name -o tsv)
STARTED=true
echo "==> execution $EXECUTION"
status=Running
for _ in $(seq 1 $((TIMEOUT / 10))); do
  status=$(az containerapp job execution show -n "$JOB" -g "$RG" --job-execution-name "$EXECUTION" --query properties.status -o tsv 2>/dev/null || echo Unknown)
  case "$status" in Succeeded|Failed|Stopped|Degraded) FINISHED=true; break ;; esac
  sleep 10
done
echo "==> $status"
OUT=$(az containerapp job logs show -n "$JOB" -g "$RG" --execution "$EXECUTION" --container db --tail 500 2>/dev/null \
  | sed -E 's/^\{"TimeStamp":"[^"]*","Log":"//; s/"\}$//' || true)
if [ -z "$OUT" ]; then
  # A replica that has ended has no live stream; its lines reach Log Analytics a minute or two later.
  WS=$(az containerapp env show --ids "$ENV_ID" --query properties.appLogsConfiguration.logAnalyticsConfiguration.customerId -o tsv)
  for _ in $(seq 1 18); do
    OUT=$(az monitor log-analytics query -w "$WS" -o tsv --analytics-query \
      "ContainerAppConsoleLogs_CL | where ContainerJobName_s == '$JOB' | order by time_t asc, _timestamp_d asc | project Log_s" 2>/dev/null | cut -f1 || true)
    [ -n "$OUT" ] && break
    sleep 10
  done
fi
echo "${OUT:-(no output found; see Log Analytics, job $JOB)}"
[ "$status" = Succeeded ]
