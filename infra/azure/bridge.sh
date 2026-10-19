#!/usr/bin/env bash
#
# One run of the SchoolMan bridge (2026-10-19; docs/FILEMAKER_BRIDGE.md §8): brings SchoolMan's current
# data into the live workspace's database.
#
#   ./infra/azure/bridge.sh                      every step
#   ./infra/azure/bridge.sh --only staff,day     some steps (they keep their order)
#   ./infra/azure/bridge.sh --local-first        import into this Mac's database (.env.local) first, and
#                                                send the same sealed bundle to Azure only if that worked
#
# Run on the office Mac, with SchoolMan open in FileMaker Pro and `az` signed in to CASA's tenant.
#   1. The readers read SchoolMan (read-only) and the result is sealed under a key made for this run.
#   2. The sealed bundle goes to a private blob container, written through a link valid for two hours.
#   3. An import job inside Azure (db-job.sh import), the only place that reaches the database, fetches
#      it with a read-and-delete link, writes it in, records the run and deletes the bundle.
#   4. Here the bundle is deleted again in any case; db-job.sh removes the job, which held the key.
# The key and the links live in this shell and in the job only; the storage key is never printed.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SUBSCRIPTION=f8d745fc-c2dc-4ad9-a3a8-e9da556b69ab
RG=rg-casa-website-prod
ACCOUNT=stcasawebsitef8d745
CONTAINER=bridge

ONLY=()
LOCAL_FIRST=false
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY=(--only "${2:?--only needs step names}"); shift 2 ;;
    --local-first) LOCAL_FIRST=true; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

osascript -e 'tell application "FileMaker Pro" to get name of every document' 2>/dev/null | grep -q SchoolMan \
  || { echo "Open SchoolMan in FileMaker Pro first." >&2; exit 1; }
az account set --subscription "$SUBSCRIPTION"

STORAGE_KEY=$(az storage account keys list -n "$ACCOUNT" -g "$RG" --query "[0].value" -o tsv)
store() { az storage "$@" --account-name "$ACCOUNT" --account-key "$STORAGE_KEY" --only-show-errors; }
store container create -n "$CONTAINER" --public-access off -o none

BLOB="schoolman-$(date -u +%Y%m%dT%H%M%SZ).bin"
# Two hours from when each link is made: reading SchoolMan and a local import can take a while.
sas() { store blob generate-sas -c "$CONTAINER" -n "$BLOB" --permissions "$1" --expiry "$(date -u -v+2H +%Y-%m-%dT%H:%MZ)" --https-only -o tsv; }
BASE="https://$ACCOUNT.blob.core.windows.net/$CONTAINER/$BLOB"
KEY=$(openssl rand -hex 32)

TMP=$(mktemp -d)
cleanup() {
  rm -rf "$TMP"
  store blob delete -c "$CONTAINER" -n "$BLOB" -o none 2>/dev/null || true
}
trap cleanup EXIT

echo "==> reading SchoolMan"
if $LOCAL_FIRST; then
  # Sealed on disk only for this run, in a folder removed at exit.
  BRIDGE_KEY="$KEY" node scripts/filemaker/bridge-pack.mjs --file "$TMP/bundle.bin" ${ONLY[@]+"${ONLY[@]}"}
  echo "==> importing into this Mac's database first"
  ( set -a; . ./.env.local; set +a; BRIDGE_KEY="$KEY" node scripts/filemaker/bridge-unpack.mjs --file "$TMP/bundle.bin" ) \
    || { echo "The local import failed; nothing was sent to Azure." >&2; exit 1; }
  store blob upload -c "$CONTAINER" -n "$BLOB" -f "$TMP/bundle.bin" -o none
else
  BRIDGE_KEY="$KEY" BRIDGE_UPLOAD_URL="$BASE?$(sas cw)" node scripts/filemaker/bridge-pack.mjs ${ONLY[@]+"${ONLY[@]}"}
fi

echo "==> importing in Azure"
BRIDGE_KEY="$KEY" BRIDGE_URL="$BASE?$(sas rd)" ./infra/azure/db-job.sh import
