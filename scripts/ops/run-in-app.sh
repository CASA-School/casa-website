#!/bin/zsh
# Runs a local Node script inside the live Container App, where DATABASE_URL reaches the
# private database (a laptop cannot). For READ-ONLY queries: counts and aggregates, never
# names, addresses or message text in the output. Needs `az login`.
#
# Usage: ./scripts/ops/run-in-app.sh scripts/ops/queries/site-activity.js ['2026-10-29 16:39']
# The optional second argument is set as globalThis.SINCE (a Europe/Berlin timestamp).
#
# Why it looks like this: `az containerapp exec` needs a TTY (script provides one), it sends
# the command in a URL that fails above about 2000 characters (so the code is gzipped), and
# it strips quotes (so the decoder uses String.fromCharCode and reads its payload from argv).
setopt err_exit
js=$1
since=${2:-}
[[ -f $js ]] || { print -u2 "no such file: $js"; exit 1; }
src=$(cat $js)
[[ -n $since ]] && src="globalThis.SINCE = '$since';"$'\n'"$src"
b64=$(print -r -- $src | gzip -9 -c | base64 | tr -d '\n')
(( ${#b64} < 1800 )) || { print -u2 "script too long for exec (${#b64} chars gzipped+base64); split it"; exit 1; }
code='eval(require(String.fromCharCode(122,108,105,98)).gunzipSync(Buffer.from(process.argv[1],String.fromCharCode(98,97,115,101,54,52))).toString())'
timeout 120 script -q /dev/null az containerapp exec -n ca-casa-website -g rg-casa-website-prod \
  --command "node -e $code $b64" 2>&1 | tr -d '\r'
