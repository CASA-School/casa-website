"""Read-only access to SchoolMan through FileMaker Pro on this Mac (AppleScript).

FileMaker Pro must be open with `SchoolMan.fmp12` (the live file on the office
Mini). Nothing here writes: AppleScript `cell … of every record` reads a whole
column, and no script, field or record is ever set. Values stay in memory —
callers print counts, never a person's data (docs/FILEMAKER_MIGRATION.md §Method).
"""
import subprocess

DOCUMENT = 'SchoolMan.fmp12'
_RS = chr(30)  # record separator: field values may hold line breaks


def _run(script: str) -> str:
    result = subprocess.run(['osascript', '-'], input=script, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip()[:200])
    return result.stdout.rstrip('\n')


def column(table: str, field: str) -> list[str]:
    """Every value of one stored field, in record order; empty for missing."""
    out = _run(f'''
with timeout of 900 seconds
  tell application "FileMaker Pro"
    tell document "{DOCUMENT}"
      set vals to cell "{field}" of every record of table "{table}"
    end tell
  end tell
end timeout
set AppleScript's text item delimiters to (ASCII character 30)
return vals as text
''')
    return ['' if v == 'missing value' else v for v in out.split(_RS)]


def count(table: str) -> int:
    return int(_run(f'tell application "FileMaker Pro" to tell document "{DOCUMENT}" to count of records of table "{table}"'))
