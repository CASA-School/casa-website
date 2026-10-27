"""Read SchoolMan's weekly plans and lesson days of the courses still running or ahead, and of the last eight months — read-only (AppleScript).

    python3 -I scripts/filemaker/read_lesson_days.py --stats    # counts only
    python3 -I scripts/filemaker/read_lesson_days.py | node scripts/filemaker/import-lesson-days.mjs [--dry-run]

Rahman, 2026-10-17: SchoolMan generates every lesson day of a course (`SingleDateCourse`) from its weekly
plan (`WeekDay`), and a day is where things change — another teacher (`_ID_PersonSubstituted` keeps who
was replaced), another room (the day's room calendar, `SingleDateOccupancy`, keeps the room it replaced),
a day called off. Both come across for the courses the course import brought (docs/ADMIN_WORKSPACE.md
§Lesson days). Only numbers, dates and hours: a teacher is SchoolMan's staff number, a room its
classroom number; no name, no lesson content, no attendance.

Read facts (2026-10-17): weekdays are numbered 1 Sunday … 7 Saturday (`DayNameReference`); a day's
`_ID_Particularity` is 20 Vertretung, 21 Zusammenlegung, 22 Verschiebung or 23 Ausfall
(`SelectionDetail`); `_ID_Holiday` marks a day inside a closure (Easter 2027), which is not a lesson;
`_ID_PersonSubstituted` and `_ID_StaffMember` are staff numbers. A day's room is on the day or, more
often, only on its room-calendar row.

The last eight months come along too (2026-10-22), the same window as the course import: who taught a
class in its earlier levels is what Kursplanung's three-levels rule reads.

CASA's closures as SchoolMan's calendar keeps them (2026-10-27, 0093): a day of `SingleDayCalendar` with
`_ID_Holiday` 1 that is not a legal holiday is a closure day; a closure runs over the weekends and legal
holidays inside it and begins and ends on a weekday.
"""
import collections, json, os, re, sys
from datetime import date, timedelta

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


def lessons(value):
    try:
        n = float(first(value).replace(',', '.'))
        return n if n >= 0 else None
    except ValueError:
        return None


def weekday(ref):
    """SchoolMan's 1 Sunday … 7 Saturday as ISO 1 Monday … 7 Sunday."""
    n = int(ref) if ref.isdigit() else 0
    return None if not 1 <= n <= 7 else (7 if n == 1 else n - 1)


MARK = {'20': 'cover', '21': 'merged', '22': 'moved', '23': 'off'}
since = (date.today() - timedelta(days=240)).isoformat()
ends = dict(zip(column('Course', '__ID_Course'), column('Course', 'ZEndDate')))
live = {c for c, end in ends.items() if iso(end) and iso(end) >= since}

classrooms = [{'id': i, 'city': c.strip() or None, 'number': n.strip() or None}
              for i, c, n in zip(column('Classroom', '__ID_Classroom'), column('Classroom', 'CityClassRoom'), column('Classroom', 'NumberRoom.Text'))]

W = ['_ID_Course', '_ID_WeekDayReference', 'HourStart', 'HourEnd', 'NumberLesson', '_ID_StaffMember', '_ID_ClassRoom']
plans = []
for r in (dict(zip(W, v)) for v in zip(*[column('WeekDay', f) for f in W])):
    course, day = first(r['_ID_Course']), weekday(first(r['_ID_WeekDayReference']))
    if course in live and day and hhmm(r['HourStart']) and hhmm(r['HourEnd']):
        plans.append({'course': course, 'weekday': day, 'from': hhmm(r['HourStart']), 'to': hhmm(r['HourEnd']), 'lessons': lessons(r['NumberLesson']),
                      'teacher': first(r['_ID_StaffMember']) or None, 'room': first(r['_ID_ClassRoom']) or None})

O = ['_ID_SingleDateCourse', '_ID_Classroom', '_ID_ClassroomSubstituted']
occupancy = {}
for r in (dict(zip(O, v)) for v in zip(*[column('SingleDateOccupancy', f) for f in O])):
    if first(r['_ID_SingleDateCourse']):
        occupancy.setdefault(first(r['_ID_SingleDateCourse']), (first(r['_ID_Classroom']) or None, first(r['_ID_ClassroomSubstituted']) or None))

F = ['__ID_SingleDateCourse', '_ID_Course', 'ZSingleDateCourse', 'HourStart', 'HourEnd', 'NumberLesson', '_ID_StaffMember', '_ID_PersonSubstituted',
     '_ID_Classroom', '_ID_Holiday', '_ID_Particularity']
days, closed = [], 0
for r in (dict(zip(F, v)) for v in zip(*[column('SingleDateCourse', f) for f in F])):
    course, on = first(r['_ID_Course']), iso(r['ZSingleDateCourse'])
    if course not in live or not on:
        continue
    if first(r['_ID_Holiday']):
        closed += 1
        continue
    room, replaced_room = occupancy.get(r['__ID_SingleDateCourse'], (None, None))
    days.append({'id': r['__ID_SingleDateCourse'], 'course': course, 'date': on, 'from': hhmm(r['HourStart']), 'to': hhmm(r['HourEnd']),
                 'lessons': lessons(r['NumberLesson']), 'teacher': first(r['_ID_StaffMember']) or None, 'replaced': first(r['_ID_PersonSubstituted']) or None,
                 'room': first(r['_ID_Classroom']) or room, 'replacedRoom': replaced_room, 'mark': MARK.get(first(r['_ID_Particularity']))})


def closures_of(rows):
    """SchoolMan's calendar days → closure ranges (`from`, `to`), weekdays at both ends."""
    kind = {}
    for r in rows:
        on = iso(r['ZSingleDayCalendar'])
        if not on:
            continue
        legal, holiday = first(r['_ID_LegalHoliday']) == '1', first(r['_ID_Holiday']) == '1'
        kind[on] = 'closed' if holiday and not legal else 'legal' if legal else 'open'
    out, run = [], []

    def close():
        days = [d for d in run if date.fromisoformat(d).weekday() < 5]
        if days and any(kind[d] == 'closed' for d in days):
            out.append({'from': days[0], 'to': days[-1]})

    for on in sorted(kind):
        if kind[on] == 'open' and date.fromisoformat(on).weekday() < 5:
            close()
            run = []
        else:
            run.append(on)
    close()
    return out


closures = closures_of({'ZSingleDayCalendar': d, '_ID_Holiday': h, '_ID_LegalHoliday': l}
                       for d, h, l in zip(column('SingleDayCalendar', 'ZSingleDayCalendar'), column('SingleDayCalendar', '_ID_Holiday'),
                                          column('SingleDayCalendar', '_ID_LegalHoliday')))

if '--stats' in sys.argv:
    print('closures', len(closures), '· from', closures[0]['from'] if closures else None, '· to', closures[-1]['to'] if closures else None)
    print('courses running or ahead', len(live), '· with a weekly plan', len({p['course'] for p in plans}), '· plan rows', len(plans))
    print('lesson days', len(days), '· in a closure, left out', closed, '· marks', collections.Counter(d['mark'] for d in days).most_common())
    print('with a teacher', sum(bool(d['teacher']) for d in days), '· replaced', sum(bool(d['replaced']) for d in days),
          '· with a room', sum(bool(d['room']) for d in days), '· room replaced', sum(bool(d['replacedRoom']) for d in days))
    sys.exit(0)

json.dump({'classrooms': classrooms, 'plans': plans, 'days': days, 'closed': closed, 'closures': closures}, sys.stdout, ensure_ascii=False)
