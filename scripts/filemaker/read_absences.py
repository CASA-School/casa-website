"""Read SchoolMan's staff absences — ill, holiday and other days off — for Kursplanung, read-only (AppleScript).

    python3 -I scripts/filemaker/read_absences.py --stats    # counts only
    python3 -I scripts/filemaker/read_absences.py | node scripts/filemaker/import-absences.mjs [--dry-run]

Rahman, 2026-10-17: the teachers' days off must be on the new platform, or Kursplanung plans someone
on holiday. SchoolMan keeps one row per colleague and day (`SingleDayStaff`, generated for the year);
a day marked ill (`_ID_Illness`) or on holiday (`_ID_Holiday`, made from the approved `DateHoliday`
requests, closures included) is an absence. Read from ninety days back to a year ahead. Only the staff
number, the date and the reason leave this script.

2026-10-22: a day can also be marked absent (`_ID_Absence`) with a kind (`_ID_AbsenceDetail`): 1 Tarifurlaub,
2 unbezahlter Urlaub, 3 Abbau Überstunden, 4 Sonderurlaub, 5 Krank, 6 Anderes, 7 off sick — 1,777 days
in 2026, none of which were read, so the board showed Jana, Claus and Christian free on days off („AÜ").
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def day(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


today = date.today()
since, until = today - timedelta(days=90), today + timedelta(days=366)
# SchoolMan's absence kinds (`_ID_AbsenceDetail`) as the workspace's reasons.
KIND = {'1': 'Urlaub', '2': 'Urlaub', '3': 'Überstunden', '4': 'Urlaub', '5': 'Krank', '6': 'Sonstiges', '7': 'Krank'}
F = ['__ID_SingleDayStaff', '_ID_StaffMember', 'ZSingleDay', '_ID_Illness', '_ID_Holiday', '_ID_Absence', '_ID_AbsenceDetail']
rows = []
for ref, staff, when, ill, holiday, absent, kind in zip(*[column('SingleDayStaff', f) for f in F]):
    d, staff = day(when), first(staff)
    if not d or not staff or not (since <= d <= until):
        continue
    # Ill wins over holiday, holiday over any other absence: a colleague away is not planned either way.
    reason = ('Krank' if ill.strip() == '1' else 'Urlaub' if holiday.strip() == '1'
              else KIND.get(first(kind), 'Sonstiges') if absent.strip() == '1' else None)
    if reason:
        rows.append({'ref': ref.strip(), 'staff': staff, 'date': d.isoformat(), 'reason': reason})

if '--stats' in sys.argv:
    print('absences', since, '…', until, len(rows), collections.Counter(r['reason'] for r in rows).most_common(),
          '· ahead', sum(r['date'] >= today.isoformat() for r in rows), '· colleagues', len({r['staff'] for r in rows}))
    sys.exit(0)

json.dump(rows, sys.stdout)
