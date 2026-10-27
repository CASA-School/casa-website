#!/usr/bin/env bash
# The bridge from the workspace's copy of SchoolMan, every five minutes (docs/FILEMAKER_BRIDGE.md §9):
# a scheduled Container Apps job running `task.sh bridge-mirror` in the database image. The sync service on
# the office network keeps the copy current; this brings the copy into the workspace. A run with nothing
# new in the copy ends at once.
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
  az containerapp job update -n "$JOB" -g "$RG" --image "$IMAGE" --replica-timeout 7200 -o none
  echo "==> $JOB now runs $TAG"
else
  az containerapp job create -n "$JOB" -g "$RG" --environment "$ENV_ID" \
    --trigger-type Schedule --cron-expression "*/5 * * * *" --replica-timeout 7200 --replica-retry-limit 0 \
    --parallelism 1 --replica-completion-count 1 \
    --image "$IMAGE" --registry-server "$ACR.azurecr.io" --registry-identity "$IDENTITY" \
    --mi-user-assigned "$IDENTITY" --container-name db --cpu 1.0 --memory 2Gi \
    --secrets "database-url=$DB_URL" --env-vars "DATABASE_URL=secretref:database-url" "TZ=Europe/Berlin" \
    --command sh --args task.sh bridge-mirror --only-show-errors -o none
  echo "==> $JOB made: every five minutes, $TAG"
fi
