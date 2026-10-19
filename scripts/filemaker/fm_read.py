"""Read-only access to SchoolMan through FileMaker Pro on this Mac (AppleScript).

FileMaker Pro must be open with `SchoolMan.fmp12` (the live file on the office
Mini). Nothing here writes: AppleScript `cell … of every record` reads a whole
column, and no script, field or record is ever set. Values stay in memory —
callers print counts, never a person's data (docs/schoolman/README.md, Method).
"""
import subprocess
import time

DOCUMENT = 'SchoolMan.fmp12'
_RS = chr(30)  # record separator: field values may hold line breaks
# FileMaker answers „object not found" (-1728), a timeout (-1712) or a lost connection (-609) now and
# then while it is busy or in use; the same read a few seconds later works (2026-10-20, first bridge run).
_PASSING = ('-1728', '-1712', '-609')


def _run(script: str) -> str:
    for attempt in range(4):
        result = subprocess.run(['osascript', '-'], input=script, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.rstrip('\n')
        error = result.stderr.strip()
        if attempt == 3 or not any(code in error for code in _PASSING):
            raise RuntimeError(error[:200])
        time.sleep(5 * (attempt + 1))


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


def column_chunked(table: str, field: str, size: int = 500) -> list[str]:
    """`column` for a long text field (a letter's body), read in ranges of records: all at once is
    more than AppleScript hands back (error -1741)."""
    total, out = count(table), []
    for start in range(1, total + 1, size):
        end = min(start + size - 1, total)
        chunk = _run(f'''
with timeout of 900 seconds
  tell application "FileMaker Pro"
    tell document "{DOCUMENT}"
      set vals to cell "{field}" of records {start} thru {end} of table "{table}"
    end tell
  end tell
end timeout
set AppleScript's text item delimiters to (ASCII character 30)
return vals as text
''')
        values = ['' if v == 'missing value' else v for v in chunk.split(_RS)]
        out.extend(values if end > start else [chunk if chunk != 'missing value' else ''])
    return out
