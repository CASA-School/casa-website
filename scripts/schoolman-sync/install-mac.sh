#!/bin/zsh
# The SchoolMan sync service on this Mac, started at login and kept running by launchd (docs/FILEMAKER_BRIDGE.md §9).
# Since 2026-10-31 it runs on the office server (scripts/schoolman-sync/server/); this is the way back, never
# both. The Mac must be on and in the office network (or the VPN); FileMaker Pro need not be open. Secrets stay in the Keychain: `casa-workspacesync` (WorkspaceSync's password, added by
# Rahman) and `casa-schoolman-sync-key` (the signing key, the same as the app's SCHOOLMAN_SYNC_KEY).
#
#   scripts/schoolman-sync/install-mac.sh <FM_CERT_SHA256>      install or update, and start
#   scripts/schoolman-sync/install-mac.sh --off                  stop and remove
set -eu
LABEL=de.casa-bremen.schoolman-sync
PLIST=~/Library/LaunchAgents/$LABEL.plist
LOG=~/Library/Logs/casa-schoolman-sync.log

if [ "${1:-}" = --off ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "stopped and removed"
  exit 0
fi
PIN=${1:?the FileMaker Server certificate fingerprint (the service prints it on its first run)}
SYNC=${0:A:h}/sync.mjs
NODE=$(command -v node)
for item in casa-workspacesync casa-schoolman-sync-key; do
  security find-generic-password -s $item >/dev/null 2>&1 || { echo "Keychain item $item is missing"; exit 1; }
done

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$SYNC</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>FM_CERT_SHA256</key><string>$PIN</string>
    <key>TZ</key><string>Europe/Berlin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "running; the log is $LOG"
