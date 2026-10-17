"""Read SchoolMan's courses still running or ahead, for the workspace's courses — read-only (AppleScript).

    python3 -I scripts/filemaker/read_courses.py --stats    # counts only
    python3 -I scripts/filemaker/read_courses.py | node scripts/filemaker/import-courses.mjs [--dry-run]

Rahman, 2026-10-17: the courses SchoolMan has planned come across, read-only. A `Course` is one level
of a start (or one module, one exam preparation, one company's course): its type, dates, shift, level,
title, places, price, whether it is offered, and its hours (`DayTime`). Nothing about people.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def hhmm(value):
    m = re.match(r'\s*(\d{1,2}):(\d{2})', value or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m else None


# `LevelStepReference` is a stale text copy (an evening B2 course reads `B2.1` or `A1.1` alike): the level
# is `LevelShort` (the band) and, for an evening course, `LevelShown` — the step its link points at.
F = ['__ID_Course', '_ID_CourseTypeReference', 'ZStartDate', 'ZEndDate', '_ID_DayTimeReference', 'LevelShown', 'LevelShort',
     'CourseTitle', 'CapStudent', 'CoursePrice', '_ID_Bookable', '_ID_Active']
rows = [dict(zip(F, r)) for r in zip(*[column('Course', f) for f in F])]
today = date.today().isoformat()
live = [r for r in rows if iso(r['ZEndDate']) and iso(r['ZEndDate']) >= today]

hours = {}
for course, start, end in zip(column('DayTime', '_ID_Course'), column('DayTime', 'HourStart'), column('DayTime', 'HourEnd')):
    key = first(course)
    if key and key not in hours and hhmm(start) and hhmm(end):
        hours[key] = (hhmm(start), hhmm(end))

if '--stats' in sys.argv:
    print('running or ahead', len(live), collections.Counter(first(r['_ID_CourseTypeReference']) for r in live).most_common())
    print('with hours', sum(r['__ID_Course'] in hours for r in live))
    sys.exit(0)

out = [{
    'id': r['__ID_Course'],
    'type': first(r['_ID_CourseTypeReference']),
    'start': iso(r['ZStartDate']),
    'end': iso(r['ZEndDate']),
    'daytime': first(r['_ID_DayTimeReference']),
    'step': r['LevelShown'].strip() or None,
    'band': r['LevelShort'].strip() or None,
    'title': r['CourseTitle'].strip() or None,
    'places': r['CapStudent'].strip() or None,
    'price': r['CoursePrice'].strip() or None,
    'bookable': first(r['_ID_Bookable']) == '1',
    'active': first(r['_ID_Active']) != '2',
    'hours': hours.get(r['__ID_Course']),
} for r in live]
json.dump(out, sys.stdout, ensure_ascii=False)
