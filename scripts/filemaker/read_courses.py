"""Read SchoolMan's courses still running or ahead, and those of the last eight months, for the workspace's courses — read-only (AppleScript).

    python3 -I scripts/filemaker/read_courses.py --stats    # counts only
    python3 -I scripts/filemaker/read_courses.py | node scripts/filemaker/import-courses.mjs [--dry-run]

Rahman, 2026-10-17: the courses SchoolMan has planned come across, read-only. A `Course` is one level
of a start (or one module, one exam preparation, one company's course): its type, dates, shift, level,
title, places, price, whether it is offered, and its hours (`DayTime`). Nothing about people.

The last eight months come along too (2026-10-22): Kursplanung follows a class through its levels by its
learners and warns when a teacher would take it for a fourth level running, which needs the levels before.
The public site shows only starts that have not ended.
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value or ''):
        return value
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def hhmm(value):
    m = re.match(r'\s*(\d{1,2}):(\d{2})', value or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m else None


# The level by its numbers (2026-10-27, 0093): the band (`_ID_Level`, `LevelReferenceSchool`) and, for an evening
# course, the step it teaches (`_ID_LevelStepReference`, `LevelStepReference`, matched on
# `levels.filemaker_level_step_id` in the importer). `LevelShort` and `LevelShown` are their text copies.
BAND = {'1': 'A1', '2': 'A2', '3': 'B1', '3,5': 'B1+', '3.5': 'B1+', '4': 'B2', '5': 'C1', '6': 'TD', '7': 'CH', '8': 'SK', '9': 'ND'}
# Where it runs (`_ID_Location`, `LocationReference`), the teacher's note (`CommentOnCourse`, written by the
# Klassenbuch) and an older title (`Supplement`), used where `CourseTitle` is empty — in the workspace only:
# on a one-to-one course it can name the learner.
F = ['__ID_Course', '_ID_CourseTypeReference', 'ZStartDate', 'ZEndDate', '_ID_DayTimeReference', '_ID_LevelStepReference', '_ID_Level',
     'CourseTitle', 'Supplement', 'CapStudent', 'CoursePrice', '_ID_Bookable', '_ID_Active', '_ID_Location', 'CommentOnCourse', 'DateOfChange']
rows = [dict(zip(F, r)) for r in zip(*[column('Course', f) for f in F])]
# `Course::ZStartDate`/`ZEndDate` are copies made when the course was; its periods (`DateCourse`) are the
# source (mapping review 2026-10-26 §4). A course's dates are its periods' first and last day where it has them.
periods = collections.defaultdict(list)
for course, start, end in zip(column('DateCourse', '_ID_Course'), column('DateCourse', 'ZStartDate'), column('DateCourse', 'ZEndDate')):
    if first(course) and iso(start) and iso(end):
        periods[first(course)].append((iso(start), iso(end)))
for r in rows:
    own = periods.get(first(r['__ID_Course']))
    if own:
        r['ZStartDate'], r['ZEndDate'] = min(p[0] for p in own), max(p[1] for p in own)
since = (date.today() - timedelta(days=240)).isoformat()
live = [r for r in rows if iso(r['ZEndDate']) and iso(r['ZEndDate']) >= since]

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
    'step': first(r['_ID_LevelStepReference']) or None,
    'band': BAND.get(first(r['_ID_Level'])),
    'title': r['CourseTitle'].strip() or None,
    'supplement': r['Supplement'].strip() or None,
    'location': first(r['_ID_Location']) or None,
    'note': r['CommentOnCourse'].strip() or None,
    'changed': iso(r['DateOfChange']),
    'places': r['CapStudent'].strip() or None,
    'price': r['CoursePrice'].strip() or None,
    'bookable': first(r['_ID_Bookable']) == '1',
    'active': first(r['_ID_Active']) != '2',
    'hours': hours.get(r['__ID_Course']),
} for r in live]
json.dump(out, sys.stdout, ensure_ascii=False)
