"""Count SchoolMan's learners per course and week, for the courses still running or ahead — read-only (AppleScript).

    python3 -I scripts/filemaker/read_course_learners.py --stats   # counts only
    python3 -I scripts/filemaker/read_course_learners.py | node scripts/filemaker/import-course-learners.mjs [--dry-run]

Rahman, 2026-10-17: the course list should show how many learners sit in each course, week by week,
as SchoolMan's `Course_List` does. While bookings are still made in SchoolMan, those numbers are there.
A learner in a course is a booking period (`DateBooking`) on it: its course, first and last day. A
week counts the bookings whose period overlaps it (Monday to Sunday). Only numbers leave this script —
no name, no booking number.

Read facts (2026-10-17): a period's booking carries `_ID_StatusStudent` (Rookie, Runner, Unicorn,
LastDance — new, continuing, … last course), never a cancelled state; `_ID_StatusBooking` and
`_ID_Active` are empty on current bookings. A cancelled booking has no period on the course.
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def day(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None


today = date.today()
courses = {}
for cid, start, end in zip(column('Course', '__ID_Course'), column('Course', 'ZStartDate'), column('Course', 'ZEndDate')):
    s, e = day(start), day(end)
    if s and e and e >= today:
        courses[cid] = (s, e)

weeks = collections.defaultdict(set)  # (course, monday) → bookings
for booking, course, start, end in zip(column('DateBooking', '_ID_Booking'), column('DateBooking', '_ID_Course'), column('DateBooking', 'ZStartDate'), column('DateBooking', 'ZEndDate')):
    course, booking = first(course), first(booking)
    if course not in courses or not booking:
        continue
    s, e = day(start), day(end)
    if not s or not e or e < s:
        continue
    c_start, c_end = courses[course]
    monday = c_start - timedelta(days=c_start.weekday())
    while monday <= c_end:
        if s <= monday + timedelta(days=6) and e >= monday:
            weeks[(course, monday)].add(booking)
        monday += timedelta(days=7)

rows = [{'course': c, 'monday': m.isoformat(), 'n': len(b)} for (c, m), b in sorted(weeks.items())]

if '--stats' in sys.argv:
    print('courses running or ahead', len(courses), '· with learners', len({r['course'] for r in rows}), '· course weeks', len(rows))
    print('learners in a course this week', sum(r['n'] for r in rows if r['monday'] == (today - timedelta(days=today.weekday())).isoformat()))
    sys.exit(0)

json.dump(rows, sys.stdout)
