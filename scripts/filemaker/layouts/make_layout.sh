#!/bin/zsh
# make_layout.sh <Table> : one Sync_<Table> layout in the open SchoolMan (FileMaker Pro, Layout mode), every check
# on the way; stops at the first one that fails and leaves FileMaker as it is.
set -u
T=$1; NAME="Sync_$T"; RESUME=${2:-}; HERE=${0:A:h}; LIB=$HERE; OUT=${HERE:h:h:h}/output/filemaker-layouts; mkdir -p $OUT
front() { osascript -e 'tell application "System Events" to set frontmost of process "FileMaker Pro" to true' >/dev/null; sleep 0.4; }
menu() { front; local r; r=$($LIB/fmmenu.sh "$1" "$2"); [[ $r == clicked* ]] || die "menu $1 > $2: $r"; }
die() { echo "STOP $T: $*"; exit 1; }
python3 -I $HERE/gen_xml2.py "$T" > $OUT/$NAME.xml2.xml || die "no XML"
WANT=$(grep -c '<Object type="Field"' $OUT/$NAME.xml2.xml)
if [[ $RESUME != --from-copy ]]; then
front
R=$($LIB/fmmenu.sh "Layouts" "New Layout/Report...") ; [[ $R == clicked* ]] || die "menu: $R"
sleep 1.5
R=$(osascript - "$T" "$NAME" <<'OSA'
on run argv
  set t to item 1 of argv
  set nm to item 2 of argv
  tell application "System Events"
    tell process "FileMaker Pro"
      if not (exists window "New Layout/Report") then return "no dialog"
      set w to window "New Layout/Report"
      set p to pop up button 1 of w
      click p
      delay 0.8
      set n to 0
      set mNames to name of every menu item of menu 1 of p
      repeat with i in mNames
        if (i as text) is t then set n to n + 1
      end repeat
      if n is not 1 then
        key code 53
        delay 0.3
        click button "Cancel" of w
        return "table found " & n & " times"
      end if
      click menu item t of menu 1 of p
      delay 0.6
      set value of text field 1 of w to nm
      delay 0.3
      -- the device row, then the type row: the leftmost big button of each (Computer, then Form)
      repeat with rowAbove in {true, false}
        set bs to every button of w
        set bestI to 0
        set bestX to 100000
        repeat with i from 1 to count of bs
          set sz to size of (item i of bs)
          set ps to position of (item i of bs)
          if (item 1 of sz) = 155 and (item 2 of sz) = 121 and ((item 2 of ps) < 300) = (rowAbove as boolean) and (item 1 of ps) < bestX then
            set bestX to item 1 of ps
            set bestI to i
          end if
        end repeat
        if bestI = 0 then return "no big button (upper row " & rowAbove & ")"
        click item bestI of bs
        delay 1
      end repeat
      if (value of p) is not t or (value of text field 1 of w) is not nm then return "dialog values " & (value of p) & " / " & (value of text field 1 of w)
      click button "Finish" of w
      delay 2
      if exists window "New Layout/Report" then return "dialog still open"
      return "made"
    end tell
  end tell
end run
OSA
); [[ $R == made ]] || die "new layout: $R"
osascript -e "tell application \"System Events\" to tell process \"FileMaker Pro\" to get name of every UI element of window 1" | grep -q "$NAME" || die "not on $NAME after making it"
# paste the fields, the clipboard checked first
front
osascript -l JavaScript $HERE/pbxml2.js write "$OUT/$NAME.xml2.xml" >/dev/null
TYPES=$(osascript -l JavaScript -e 'ObjC.import("AppKit"); ObjC.deepUnwrap($.NSPasteboard.generalPasteboard.types).join(",")')
[[ $TYPES == *dyn.ah62d4rv4gk8zuxnqgk* && $TYPES != *text* ]] || die "clipboard holds $TYPES"
R=$($LIB/fmmenu.sh "Edit" "Paste"); [[ $R == clicked* ]] || die "paste: $R"
sleep 1.5
fi
# copy back and compare every binding
front
menu "Edit" "Select All"; sleep 0.4
osascript -l JavaScript $HERE/pbxml2.js sentinel $T >/dev/null
menu "Edit" "Copy"; sleep 1
osascript -l JavaScript $HERE/pbxml2.js read "$OUT/$NAME.after.xml2.xml" | grep -q "^XML2 bytes" || die "copy back gave no layout objects"
python3 -I - "$OUT/$NAME.xml2.xml" "$OUT/$NAME.after.xml2.xml" <<'PY' || die "bindings differ"
import re, sys
w, a = (open(p).read() for p in sys.argv[1:3])
pick = lambda s: sorted(re.findall(r'<Field name="([^"]+)" id="(\d+)"[^>]*table="([^"]+)"', s))
names = lambda s: sorted(re.findall(r'<Name>([^<]+)</Name>', s))
ok = pick(a) == pick(w) and names(a) == names(w) and a.count('<Object ') == w.count('<Object ')
sys.exit(0 if ok else 1)
PY
# off the staff's layout menus, then saved
front
menu "Layouts" "Layout Setup..."; sleep 1.2
R=$(osascript - "$NAME" <<'OSA'
on run argv
  tell application "System Events"
    tell process "FileMaker Pro"
      set w to window "Layout Setup"
      set g to tab group 1 of w
      if value of text field "Layout Name" of g is not (item 1 of argv) then
        click button "Cancel" of w
        return "setup shows " & (value of text field "Layout Name" of g)
      end if
      set c to checkbox "Include in layout menus" of g
      if value of c is 1 then click c
      delay 0.3
      if value of c is not 0 then return "still in menus"
      click button "OK" of w
      delay 0.8
      return "hidden"
    end tell
  end tell
end run
OSA
); [[ $R == hidden ]] || die "layout setup: $R"
front
R=$($LIB/fmmenu.sh "Layouts" "Save Layout"); [[ $R == clicked* ]] || die "save: $R"
sleep 1
osascript -e 'tell application "System Events" to tell process "FileMaker Pro" to get name of every window' | grep -qv "FileMaker Pro," || true
echo "OK $NAME: $WANT fields bound, hidden from menus, saved"
