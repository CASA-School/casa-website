#!/usr/bin/env bash
# The bridge from the workspace's copy of SchoolMan (docs/FILEMAKER_BRIDGE.md §9): a Container Apps job
# running `task.sh bridge-mirror` in the database image. The sync service on the office network keeps the
# copy current; this brings the copy into the workspace.
#
# Since 2026-10-28 (migration 0099, Rahman: the Azure costs) the website starts the job when a batch
# changed the copy, with its managed identity, which may start this one job and nothing else (the role
# „CASA bridge job starter"); the schedule only starts it once an hour, to catch a start that never came
# and to run every step once a night. A run does only the steps whose SchoolMan tables changed and a
# reader loads only the columns it reads: 0.75 vCPU and 1.5 GiB (the learners' reader peaks near 0.9 GB).
#
#   ./infra/azure/schoolman-job.sh          create the job, or point it at this checkout's importers
#   ./infra/azure/schoolman-job.sh --off    remove it (the copy stays; bridge.sh still works)
#
# Run it again after a change to scripts/filemaker or db/: it builds the image for this checkout, as
# db-job.sh does, under the same tag. Two hours a run at most: a run that has to write every learner
# again (after a change to their fingerprint) takes about 55 minutes, and the first one was cut off at
# 55 (2026-10-27); the other runs end after a minute or two, or at once when nothing changed.
set -euo pipefail

RG=rg-casa-website-prod
APP=ca-casa-website
ACR=acrcasaprodf8d745
JOB=caj-casa-website-schoolman
CRON="7 * * * *"
CPU=0.75
MEMORY=1.5Gi
ROLE="CASA bridge job starter"

if [ "${1:-}" = --off ]; then
  az containerapp job delete -n "$JOB" -g "$RG" --yes -o none
  echo "==> $JOB removed"
  exit 0
fi

ENV_ID=$(az containerapp env show -n cae-casa-prod -g rg-casa-platform-prod --query id -o tsv)
IDENTITY=$(az identity show -n id-casa-website-prod -g "$RG" --query id -o tsv)
ROOT=$(git rev-parse --show-toplevel)
# The same tag as db-job.sh, so one image serves both.
TAG="db-$(git -C "$ROOT" rev-parse --short HEAD)-$(cat "$ROOT"/infra/azure/db/* "$ROOT"/db/*/*.sql "$ROOT"/scripts/filemaker/*.mjs "$ROOT"/scripts/filemaker/*.py "$ROOT"/scripts/filemaker/*.json | shasum | cut -c1-8)"
IMAGE="$ACR.azurecr.io/casa-website-db:$TAG"
if ! az acr repository show-tags -n "$ACR" --repository casa-website-db -o tsv 2>/dev/null | grep -qx "$TAG"; then
  echo "==> building $IMAGE"
  CTX=$(mktemp -d)
  trap 'rm -rf "$CTX"' EXIT
  mkdir -p "$CTX/scripts/admin" "$CTX/scripts/filemaker" "$CTX/infra/azure/db"
  cp -R "$ROOT/scripts/db" "$CTX/scripts/db"
  cp "$ROOT/scripts/admin/seed-staff.mjs" "$CTX/scripts/admin/"
  cp "$ROOT"/scripts/filemaker/*.mjs "$ROOT"/scripts/filemaker/*.py "$ROOT"/scripts/filemaker/*.json "$CTX/scripts/filemaker/"
  cp -R "$ROOT/db" "$CTX/db"
  cp "$ROOT/infra/azure/db/bootstrap.mjs" "$ROOT/infra/azure/db/task.sh" "$CTX/infra/azure/db/"
  az acr build -r "$ACR" -t "casa-website-db:$TAG" -f "$ROOT/infra/azure/db/Dockerfile" "$CTX" --only-show-errors -o none
fi

DB_URL=$(az containerapp secret show -n "$APP" -g "$RG" --secret-name database-url --query value -o tsv)
if az containerapp job show -n "$JOB" -g "$RG" -o none 2>/dev/null; then
  az containerapp job secret set -n "$JOB" -g "$RG" --secrets "database-url=$DB_URL" -o none
  az containerapp job update -n "$JOB" -g "$RG" --image "$IMAGE" --replica-timeout 7200 \
    --cron-expression "$CRON" --cpu "$CPU" --memory "$MEMORY" -o none
  echo "==> $JOB now runs $TAG"
else
  az containerapp job create -n "$JOB" -g "$RG" --environment "$ENV_ID" \
    --trigger-type Schedule --cron-expression "$CRON" --replica-timeout 7200 --replica-retry-limit 0 \
    --parallelism 1 --replica-completion-count 1 \
    --image "$IMAGE" --registry-server "$ACR.azurecr.io" --registry-identity "$IDENTITY" \
    --mi-user-assigned "$IDENTITY" --container-name db --cpu "$CPU" --memory "$MEMORY" \
    --secrets "database-url=$DB_URL" --env-vars "DATABASE_URL=secretref:database-url" "TZ=Europe/Berlin" \
    --command sh --args task.sh bridge-mirror --only-show-errors -o none
  echo "==> $JOB made: started by the website, hourly as a fallback, $TAG"
fi

# The website may start this job, and nothing more.
SUB=$(az account show --query id -o tsv)
JOB_ID=$(az containerapp job show -n "$JOB" -g "$RG" --query id -o tsv)
if [ -z "$(az role definition list --name "$ROLE" --query '[0].name' -o tsv)" ]; then
  az role definition create -o none --role-definition "{
    \"Name\": \"$ROLE\",
    \"Description\": \"Starts a Container Apps job and reads it; nothing else (the SchoolMan bridge, infra/azure/schoolman-job.sh).\",
    \"Actions\": [\"Microsoft.App/jobs/read\", \"Microsoft.App/jobs/start/action\"],
    \"AssignableScopes\": [\"/subscriptions/$SUB/resourceGroups/$RG\"]
  }"
  echo "==> role „$ROLE\" defined"
  sleep 20
fi
PRINCIPAL=$(az identity show -n id-casa-website-prod -g "$RG" --query principalId -o tsv)
if [ -z "$(az role assignment list --assignee "$PRINCIPAL" --scope "$JOB_ID" --role "$ROLE" --query '[0].id' -o tsv)" ]; then
  az role assignment create --assignee-object-id "$PRINCIPAL" --assignee-principal-type ServicePrincipal \
    --role "$ROLE" --scope "$JOB_ID" -o none
  echo "==> the website may start $JOB"
fi
if [ "$(az containerapp show -n "$APP" -g "$RG" --query "properties.template.containers[0].env[?name=='SCHOOLMAN_BRIDGE_JOB'].value | [0]" -o tsv)" != "$JOB_ID" ]; then
  az containerapp update -n "$APP" -g "$RG" --set-env-vars "SCHOOLMAN_BRIDGE_JOB=$JOB_ID" -o none
  echo "==> $APP starts $JOB when SchoolMan changed"
fi
