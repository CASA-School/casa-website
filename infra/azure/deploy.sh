#!/usr/bin/env bash
#
# Build and deploy the CASA website to Azure Container Apps.
#
# Provisioned 2026-08-20. This is the script the first deploy was performed with,
# kept so the next one is not archaeology. It is idempotent: `az acr build`
# produces a new tag, and `containerapp update` rolls a new revision.
#
#   ./infra/azure/deploy.sh              # build the current HEAD and roll it out
#   ./infra/azure/deploy.sh --build-only # push the image, do not touch the app
#
# Requires: az CLI, logged in to the CASA tenant (`az login`), containerapp
# extension. Does NOT require a local Docker daemon — the image is built by ACR.
set -euo pipefail

SUBSCRIPTION="f8d745fc-c2dc-4ad9-a3a8-e9da556b69ab"   # Azure subscription 1
PLATFORM_RG="rg-casa-platform-prod"                    # shared: ACR, env, logs
WEBSITE_RG="rg-casa-website-prod"                      # this app only
ACR="acrcasaprodf8d745"
ENV_NAME="cae-casa-prod"
APP="ca-casa-website"
IDENTITY="id-casa-website-prod"
REPO="casa-website"

cd "$(dirname "$0")/../.."
TAG="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain)" ] || TAG="${TAG}-dirty"

echo "==> subscription"
az account set --subscription "$SUBSCRIPTION"

# ACR's tar packer walks .git even though it excludes it, and dies on the stale
# fsmonitor unix socket some checkouts carry ("tarfile: unsupported type").
# Staging a copy without .git is cheaper than touching a developer's .git, and it
# also guarantees the build context matches .dockerignore exactly.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
echo "==> staging build context in $STAGE"
rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.next' \
      --exclude 'output' --exclude 'playwright-report' --exclude 'test-results' \
      --exclude '.env.local' ./ "$STAGE"/

echo "==> building $REPO:$TAG in $ACR (linux/amd64)"
az acr build --registry "$ACR" --platform linux/amd64 \
  --image "$REPO:$TAG" --image "$REPO:latest" \
  --file Dockerfile "$STAGE"

# Deploy the digest, not the tag. A tag is a moving pointer; a revision pinned to
# a digest is the same bytes on every replica and on every rollback.
DIGEST="$(az acr repository show --name "$ACR" --image "$REPO:$TAG" --query digest -o tsv)"
IMAGE="${ACR}.azurecr.io/${REPO}@${DIGEST}"
echo "==> image $IMAGE"

if [ "${1:-}" = "--build-only" ]; then
  echo "==> --build-only, not updating $APP"
  exit 0
fi

IDENTITY_ID="$(az identity show -n "$IDENTITY" -g "$WEBSITE_RG" --query id -o tsv)"

if az containerapp show -n "$APP" -g "$WEBSITE_RG" >/dev/null 2>&1; then
  echo "==> updating $APP"
  az containerapp update -n "$APP" -g "$WEBSITE_RG" --image "$IMAGE" -o none
else
  echo "==> creating $APP"
  ENV_ID="$(az containerapp env show -n "$ENV_NAME" -g "$PLATFORM_RG" --query id -o tsv)"
  # minReplicas 0 is deliberate: a brochure site with no session traffic should
  # cost nothing while idle, and a cold start is an acceptable trade for that.
  # See docs/AZURE_DEPLOYMENT_PLAN.md.
  az containerapp create -n "$APP" -g "$WEBSITE_RG" \
    --environment "$ENV_ID" --image "$IMAGE" \
    --registry-server "${ACR}.azurecr.io" --registry-identity "$IDENTITY_ID" \
    --user-assigned "$IDENTITY_ID" \
    --target-port 3000 --ingress external --transport auto \
    --min-replicas 0 --max-replicas 2 --cpu 0.5 --memory 1.0Gi \
    --env-vars NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 -o none
fi

FQDN="$(az containerapp show -n "$APP" -g "$WEBSITE_RG" \
  --query properties.configuration.ingress.fqdn -o tsv)"
echo "==> live at https://${FQDN}/"
curl -s -o /dev/null -w "==> GET / -> %{http_code} in %{time_total}s\n" "https://${FQDN}/"
