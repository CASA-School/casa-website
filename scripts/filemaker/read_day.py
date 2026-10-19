"""Read SchoolMan's calendar day for the Tagesplan — read-only (AppleScript).

    python3 -I scripts/filemaker/read_day.py --stats    # counts only, nothing personal
    python3 -I scripts/filemaker/read_day.py | node scripts/filemaker/import-day.mjs [--dry-run]

Rahman, 2026-10-19: FileMaker's calendar, the screen the team opens first, becomes the Tagesplan
(migration 0071). Three things come across:

1. The day's to-dos colleagues write on the calendar — `WorkFlow` rows with a calendar day
   (`ZSingleDayCalendar`) from thirty days back to 180 days ahead. The text is `Workflow_1`, the times
   `HourStart`/`HourEnd` (an end before the start is dropped), the author the FileMaker account that
   wrote it (`UserName`). Only rows on the shared calendar (`_ID_PublicCalendar` = 1): the other rows
   with a calendar day are SchoolMan's database, staff (HHRR) and exam notes, or private ones (2).
   Done when ticked (`_ID_Completed` = 1; 2 is SchoolMan's „no", like every 1/2 flag there) or when the
   follow-up says „erledigt"/„done"; otherwise open.
2. Who works at reception (front office, `StaffMember._ID_ShiftReception` = 1) and who in the office
   behind it (active administration, `_ID_ActiveAdministration` = 1, not reception). Active staff only.
3. Reception's usual week: per weekday (1 Monday … 7 Sunday), the most frequent from–to of each
   reception colleague's days in the office (`SingleDayStaff`) over the last ten weeks, on days with
   both times and neither ill nor on holiday — when it happened on at least two days.

The JSON goes to stdout and straight into the importer: nothing is written to a file. `--stats` prints
counts and SchoolMan's flag values only.
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column, column_chunked  # noqa: E402

BODY_MAX = 2000
SHIFT_MIN_DAYS = 2


def day(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def hhmm(value):
    """`9:30`, `09:30:00` or `14` → `09:30` / `14:00`; anything else → None."""
    m = re.fullmatch(r'(\d{1,2})(?::(\d{2}))?(?::\d{2})?', first(value))
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2) or 0)
    return f'{hour:02d}:{minute:02d}' if hour < 24 and minute < 60 else None


def steady(name, read):
    """Columns of one table read while nobody adds or removes a record in between: SchoolMan is live, so
    the id column is read again afterwards and the read is repeated if it moved (rows would misalign)."""
    for _ in range(3):
        ids = column(name, KEY[name])
        cols = read()
        if column(name, KEY[name]) == ids and all(len(c) == len(ids) for c in cols):
            return cols
    sys.exit(f'{name} kept changing while it was read; nothing read. Try again in a moment.')


def table(name, *fields):
    cols = steady(name, lambda: [column(name, f) for f in fields])
    return [dict(zip(fields, row)) for row in zip(*cols)]


KEY = {'WorkFlow': '__ID_Workflow', 'StaffMember': '__ID_StaffMember', 'SingleDayStaff': '__ID_SingleDayStaff'}


today = date.today()
stats = collections.Counter()

# 1. The calendar's to-dos. The two text fields are long, so they are read in ranges of records.
since, until = today - timedelta(days=30), today + timedelta(days=180)
W = ['__ID_Workflow', 'ZSingleDayCalendar', 'HourStart', 'HourEnd', '_ID_Completed', '_ID_PublicCalendar', 'UserName']
*cols, texts, follow_ups = steady('WorkFlow', lambda: [column('WorkFlow', f) for f in W]
                                 + [column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'FollowUp', 5000)])
workflow = [dict(zip(W, row)) for row in zip(*cols)]

flags = {'completed': collections.Counter(), 'public': collections.Counter()}
tasks = []
for r, text, follow_up in zip(workflow, texts, follow_ups):
    d = day(r['ZSingleDayCalendar'])
    if not d:
        continue
    stats['calendar rows (all years)'] += 1
    if not since <= d <= until:
        continue
    stats['in range'] += 1
    completed, public = r['_ID_Completed'].strip(), r['_ID_PublicCalendar'].strip()
    flags['completed'][completed or '(empty)'] += 1
    flags['public'][public or '(empty)'] += 1
    if public != '1':
        stats['skipped: not on the shared calendar'] += 1
        continue
    body = text.strip()
    if not body:
        stats['skipped: no text'] += 1
        continue
    if len(body) > BODY_MAX:
        body = body[:BODY_MAX - 1].rstrip() + '…'
        stats['text shortened'] += 1
    start, end = hhmm(r['HourStart']), hhmm(r['HourEnd'])
    if end and (not start or end < start):
        end = None
        stats['end dropped'] += 1
    followed_done = bool(re.search(r'erledigt|done', follow_up, re.I))
    done = completed == '1' or followed_done
    if followed_done and completed != '1':
        stats['done by follow-up only'] += 1
    tasks.append({'id': first(r['__ID_Workflow']), 'date': d.isoformat(), 'start': start, 'end': end, 'body': body,
                  'status': 'done' if done else 'open', 'author': r['UserName'].strip() or None})

# 2. Front office and back office. SchoolMan's flags are 1 yes, 2 no, empty unset.
S = ['__ID_StaffMember', '_ID_ShiftReception', '_ID_ActiveAdministration', '_ID_ActiveStaff']
desks = []
for s in table('StaffMember', *S):
    if first(s['_ID_ActiveStaff']) != '1':
        continue
    if first(s['_ID_ShiftReception']) == '1':
        desks.append({'staff': first(s['__ID_StaffMember']), 'desk': 'front'})
    elif first(s['_ID_ActiveAdministration']) == '1':
        desks.append({'staff': first(s['__ID_StaffMember']), 'desk': 'back'})

# 3. Reception's usual week, from the last ten weeks of days in the office.
front = {d['staff'] for d in desks if d['desk'] == 'front'}
window = today - timedelta(weeks=10)
seen = collections.defaultdict(collections.Counter)  # (staff, weekday) → Counter of (start, end)
for r in table('SingleDayStaff', '_ID_StaffMember', 'ZSingleDay', 'HourStart', 'HourEnd', '_ID_Illness', '_ID_Holiday'):
    staff, d = first(r['_ID_StaffMember']), day(r['ZSingleDay'])
    if staff not in front or not d or not window <= d <= today:
        continue
    if r['_ID_Illness'].strip() == '1' or r['_ID_Holiday'].strip() == '1':
        continue
    start, end = hhmm(r['HourStart']), hhmm(r['HourEnd'])
    if start and end and end > start:
        seen[(staff, d.isoweekday())][(start, end)] += 1
shifts = []
for (staff, weekday), pairs in sorted(seen.items()):
    (start, end), days = pairs.most_common(1)[0]
    if days >= SHIFT_MIN_DAYS:
        shifts.append({'staff': staff, 'weekday': weekday, 'start': start, 'end': end, 'days': days, 'of': sum(pairs.values())})

if '--stats' in sys.argv:
    status = collections.Counter(t['status'] for t in tasks)
    print('tasks', since, '…', until, '·', ', '.join(f'{k} {v}' for k, v in stats.items()))
    print('  to import', len(tasks), '· done', status['done'], '· open', status['open'], '· ahead', sum(t['date'] >= today.isoformat() for t in tasks),
          '· with a start', sum(bool(t['start']) for t in tasks), '· with an end', sum(bool(t['end']) for t in tasks),
          '· authors', len({t['author'] for t in tasks if t['author']}), '· no author', sum(not t['author'] for t in tasks))
    print('  _ID_Completed in range', dict(flags['completed']), '· _ID_PublicCalendar in range', dict(flags['public']))
    print('desks', dict(collections.Counter(d['desk'] for d in desks)))
    print('shifts', len(shifts), 'weekday shifts for', len({s['staff'] for s in shifts}), 'of', len(front), 'reception colleagues',
          '· weekdays', dict(sorted(collections.Counter(s['weekday'] for s in shifts).items())),
          '· share of the usual pair', round(sum(s['days'] for s in shifts) / max(1, sum(s['of'] for s in shifts)), 2),
          '· weekdays seen below the minimum', sum(1 for p in seen.values() if p.most_common(1)[0][1] < SHIFT_MIN_DAYS))
    sys.exit(0)

json.dump({'tasks': tasks, 'desks': desks, 'shifts': shifts}, sys.stdout, ensure_ascii=False)
