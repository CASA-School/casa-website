#!/bin/zsh
# fmmenu.sh "<Menu>" "<Item>"   -- clicks a FileMaker menu item via AX (no keystrokes)
osascript - "$1" "$2" <<'EOF'
on run argv
  set mName to item 1 of argv
  set iName to item 2 of argv
  tell application "System Events"
    set fp to name of first process whose frontmost is true
    if fp is not "FileMaker Pro" then return "ABORT frontmost=" & fp
    tell process "FileMaker Pro"
      click menu bar item mName of menu bar 1
      delay 0.4
      set mi to menu item iName of menu 1 of menu bar item mName of menu bar 1
      if enabled of mi is false then
        key code 53
        return "DISABLED " & iName
      end if
      click mi
      return "clicked " & mName & " > " & iName
    end tell
  end tell
end run
EOF
