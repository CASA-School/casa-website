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
# avoids staging local caches and tool state. ACR then applies .dockerignore
# to the staged copy before building the image.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
echo "==> staging build context in $STAGE"
rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.next' \
      --exclude 'output' --exclude 'tmp' --exclude 'coverage' \
      --exclude 'playwright-report' --exclude 'test-results' \
      --exclude '.playwright-cli' --exclude '.claude' --exclude '.gstack' \
      --exclude '.agentic' --exclude '.vercel' --exclude '.neon' \
      --exclude '*.tsbuildinfo' --exclude '.DS_Store' \
      --exclude 'public/media/casa/editorial-2026' \
      --include '.env.example' --exclude '.env*' ./ "$STAGE"/

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
  # Migrations first (2026-10-09): the new code may rely on them, and 0016's
  # sign-in throttle fails closed without its table. The database is private,
  # so they run as a job inside Azure; a failed migration stops the release here.
  if az containerapp secret list -n "$APP" -g "$WEBSITE_RG" --query "[].name" -o tsv | grep -qx database-url; then
    echo "==> migrations"
    MIGLOG="$(mktemp)"
    if ! ./infra/azure/db-job.sh migrate > "$MIGLOG" 2>&1; then
      tail -40 "$MIGLOG" >&2
      echo "migrations failed; $APP not updated" >&2
      exit 1
    fi
    grep -E 'Applying [0-9]|migration\(s\) applied|Pending' "$MIGLOG" | sed 's/^F /    /' || true
    rm -f "$MIGLOG"
  fi
  echo "==> updating $APP"
  az containerapp update -n "$APP" -g "$WEBSITE_RG" --image "$IMAGE" -o none
else
  echo "==> creating $APP"
  ENV_ID="$(az containerapp env show -n "$ENV_NAME" -g "$PLATFORM_RG" --query id -o tsv)"
  # minReplicas 1 (2026-10-09): scale-to-zero made the first visitor after a
  # quiet spell wait ~19 s and emptied the image cache every time. One warm
  # replica costs a few euros a month; see docs/AZURE_DEPLOYMENT_PLAN.md.
  az containerapp create -n "$APP" -g "$WEBSITE_RG" \
    --environment "$ENV_ID" --image "$IMAGE" \
    --registry-server "${ACR}.azurecr.io" --registry-identity "$IDENTITY_ID" \
    --user-assigned "$IDENTITY_ID" \
    --target-port 3000 --ingress external --transport auto \
    --min-replicas 1 --max-replicas 2 --cpu 0.5 --memory 1.0Gi \
    --env-vars NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 -o none
fi

FQDN="$(az containerapp show -n "$APP" -g "$WEBSITE_RG" \
  --query properties.configuration.ingress.fqdn -o tsv)"
echo "==> live at https://${FQDN}/"
curl -s -o /dev/null -w "==> GET / -> %{http_code} in %{time_total}s\n" "https://${FQDN}/"

# Warm the new revision: render every page in the sitemap once and ask the image
# optimizer for every photograph at the widths browsers actually request, so no
# visitor pays for the first conversion. The sitemap lists canonical
# casa-bremen.de URLs; only their paths are used, against this app's own FQDN.
#
# Since 2026-10-09 the optimizer's cache is an Azure Files share mounted at
# /app/.next/cache/images (storage `website-image-cache` on the environment), so
# it survives releases and is shared by every replica: after the first fill,
# only new photographs cost an encode. Two at a time, because 942 encodes four
# at a time on half a CPU left real visitors' images queued for over a minute.
echo "==> warming pages and images"
WARM="$(mktemp)"
curl -s "https://${FQDN}/sitemap.xml" | grep -o '<loc>[^<]*</loc>' \
  | sed -E 's#<loc>https?://[^/]+##; s#</loc>##' > "$WARM.pages" || true
while read -r page; do
  curl -s --max-time 60 -H 'Accept: text/html' "https://${FQDN}${page:-/}"
done < "$WARM.pages" \
  | grep -oE '/_next/image\?url=[^"& ]+(&amp;|&)w=[0-9]+(&amp;|&)q=[0-9]+' \
  | sed 's/&amp;/\&/g' \
  | grep -E '&w=(64|96|128|256|384|640|750|828|1080|1200|1920)&' \
  | sort -u > "$WARM" || true
# Warming is best effort: a slow page or a failed request must never fail a release.
xargs -P 2 -I{} curl -s -o /dev/null --max-time 120 -H 'Accept: image/webp,image/*,*/*;q=0.8' "https://${FQDN}{}" < "$WARM" || true
echo "==> warmed $(wc -l < "$WARM.pages" | tr -d ' ') pages and $(wc -l < "$WARM" | tr -d ' ') image sizes"
rm -f "$WARM" "$WARM.pages"

# IndexNow (2026-10-10): tell Bing, and the answer engines that read its index
# (ChatGPT search, Copilot), which pages exist, right after a release. Only once
# casa-bremen.de itself serves this app: before the domain moves the key file is
# not there, the check fails and nothing is sent. The key is public by design
# (public/f96d21f5c67fb77d927970a72dd502f6.txt); it only proves the request comes from the site's owner.
INDEXNOW_KEY="f96d21f5c67fb77d927970a72dd502f6"
if [ "$(curl -s --max-time 10 "https://casa-bremen.de/$INDEXNOW_KEY.txt")" = "$INDEXNOW_KEY" ]; then
  URLS="$(curl -s "https://casa-bremen.de/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed -E 's#</?loc>##g' | python3 -c 'import sys, json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
    -d "{\"host\":\"casa-bremen.de\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"https://casa-bremen.de/$INDEXNOW_KEY.txt\",\"urlList\":$URLS}" || true)"
  echo "==> IndexNow: $STATUS"
else
  echo "==> IndexNow skipped: casa-bremen.de does not serve this app yet"
fi
