#!/bin/zsh
# add_fields.sh <Table> <field> … : the fields added to the existing Sync_<Table> layout, every binding checked.
set -u
T=$1; shift; NAME="Sync_$T"; HERE=${0:A:h}; LIB=$HERE; OUT=${HERE:h:h:h}/output/filemaker-layouts; mkdir -p $OUT
die() { echo "STOP $T: $*"; exit 1; }
front() { osascript -e 'tell application "System Events" to set frontmost of process "FileMaker Pro" to true' >/dev/null; sleep 0.4; }
menu() { front; local r; r=$($LIB/fmmenu.sh "$1" "$2"); [[ $r == clicked* ]] || die "menu $1 > $2: $r"; }
copy_to() { menu "Edit" "Select All"; sleep 0.4; osascript -l JavaScript $HERE/pbxml2.js sentinel x >/dev/null; menu "Edit" "Copy"; sleep 1
  osascript -l JavaScript $HERE/pbxml2.js read "$1" | grep -q "^XML2 bytes" || die "copy gave no layout objects"; }
python3 -I $HERE/gen_xml2.py "$T" "$@" > $OUT/$NAME.extra.xml2.xml || die "no XML"
osascript -e "tell application \"FileMaker Pro\" to go to layout \"$NAME\" of document \"SchoolMan.fmp12\"" >/dev/null || die "go to layout failed"
sleep 1
R=$(osascript -e 'tell application "System Events" to tell process "FileMaker Pro" to get name of (first button of window 1 whose description is "Layout Menu")')
[[ $R == $NAME ]] || die "on $R, not $NAME"
menu "View" "Layout Mode"; sleep 1.2
copy_to $OUT/$NAME.before.xml2.xml
front
osascript -l JavaScript $HERE/pbxml2.js write "$OUT/$NAME.extra.xml2.xml" >/dev/null
TYPES=$(osascript -l JavaScript -e 'ObjC.import("AppKit"); ObjC.deepUnwrap($.NSPasteboard.generalPasteboard.types).join(",")')
[[ $TYPES == *dyn.ah62d4rv4gk8zuxnqgk* && $TYPES != *text* ]] || die "clipboard holds $TYPES"
menu "Edit" "Paste"; sleep 1.5
copy_to $OUT/$NAME.after2.xml2.xml
python3 -I - $OUT/$NAME.before.xml2.xml $OUT/$NAME.extra.xml2.xml $OUT/$NAME.after2.xml2.xml <<'PY' || die "bindings differ"
import re, sys
b, e, a = (open(p).read() for p in sys.argv[1:4])
pick = lambda s: sorted(re.findall(r'<Field name="([^"]+)" id="(\d+)"[^>]*table="([^"]+)"', s))
sys.exit(0 if pick(a) == sorted(pick(b) + pick(e)) and a.count('<Object ') == b.count('<Object ') + e.count('<Object ') else 1)
PY
menu "Layouts" "Save Layout"; sleep 1
echo "OK $NAME: $# fields added, bindings checked, saved"
