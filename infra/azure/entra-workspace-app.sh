#!/usr/bin/env bash
# Microsoft sign-in for the staff workspace: the "CASA Workspace" app
# registration in CASA's own Entra ID tenant (docs/ADMIN_WORKSPACE.md,
# §Signing in).
#
#   ./infra/azure/entra-workspace-app.sh            create it and wire the Container App
#   ./infra/azure/entra-workspace-app.sh --local    also write the three values to .env.local
#
# Single tenant (only CASA accounts), the authorization-code flow with PKCE,
# and only the sign-in scopes: openid, profile, email. The workspace reads the
# id token once and keeps no Microsoft token. The client secret goes to the
# Container App as a secret, never into the repository; it lasts two years —
# rerun with SECRET_ONLY=1 to issue a new one.
#
# Redirect addresses: the admin host, and localhost for development.
set -euo pipefail

NAME="${NAME:-CASA Workspace}"
APP="${APP:-ca-casa-website}"
RG="${RG:-rg-casa-website-prod}"
REDIRECTS=(
  "https://admin.casa-bremen.de/auth/microsoft/callback"
  "http://localhost:3000/admin/auth/microsoft/callback"
  "http://localhost:3027/admin/auth/microsoft/callback"
)
GRAPH=00000003-0000-0000-c000-000000000000
OPENID=37f7f235-527c-4136-accd-4a02d197296e
PROFILE=14dad69e-099b-42c9-810b-d002981feec1
EMAIL=64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0

tenant=$(az account show --query tenantId -o tsv)
app_id=$(az ad app list --display-name "$NAME" --query "[0].appId" -o tsv)

if [ -z "$app_id" ]; then
  echo "==> creating the app registration \"$NAME\""
  app_id=$(az ad app create --display-name "$NAME" --sign-in-audience AzureADMyOrg \
    --web-redirect-uris "${REDIRECTS[@]}" --query appId -o tsv)
  az ad app permission add --id "$app_id" --api "$GRAPH" \
    --api-permissions "$OPENID=Scope" "$PROFILE=Scope" "$EMAIL=Scope" >/dev/null
  az ad sp create --id "$app_id" >/dev/null
  az ad app permission admin-consent --id "$app_id"
else
  echo "==> \"$NAME\" exists ($app_id); keeping it"
  [ "${SECRET_ONLY:-0}" = 1 ] || az ad app update --id "$app_id" --web-redirect-uris "${REDIRECTS[@]}"
fi

echo "==> issuing a client secret (two years)"
secret=$(az ad app credential reset --id "$app_id" --display-name workspace-sign-in --years 2 --append --query password -o tsv)

echo "==> wiring $APP"
az containerapp secret set -n "$APP" -g "$RG" --secrets microsoft-client-secret="$secret" >/dev/null
az containerapp update -n "$APP" -g "$RG" --set-env-vars \
  AUTH_MICROSOFT_TENANT_ID="$tenant" \
  AUTH_MICROSOFT_CLIENT_ID="$app_id" \
  AUTH_MICROSOFT_CLIENT_SECRET=secretref:microsoft-client-secret >/dev/null

if [ "${1:-}" = "--local" ]; then
  env_file="$(cd "$(dirname "$0")/../.." && pwd)/.env.local"
  {
    echo ""
    echo "# Microsoft sign-in for the workspace (infra/azure/entra-workspace-app.sh)"
    echo "AUTH_MICROSOFT_TENANT_ID=$tenant"
    echo "AUTH_MICROSOFT_CLIENT_ID=$app_id"
    echo "AUTH_MICROSOFT_CLIENT_SECRET=$secret"
  } >> "$env_file"
  echo "==> written to $env_file"
fi

echo "==> done. The sign-in page shows \"Sign in with Microsoft\" once the new revision is live."
