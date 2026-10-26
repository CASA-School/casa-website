"""Read attendance for the sample's bookings — read-only (AppleScript).

    python3 -I scripts/filemaker/read_attendance.py --stats    # counts only
    python3 -I scripts/filemaker/read_attendance.py | node scripts/filemaker/import-attendance.mjs [--dry-run]

The Klassenbuch writes attendance into SchoolMan (`SingleDateStudent`, docs/schoolman/klassenbuch.md): per
learner and lesson day, there or not (`_ID_Presence` 1 anwesend, 2 abwesend), why not (`_ID_Excuse` 1 krank,
2 entschuldigt, 3 unentschuldigt; else the older `_ID_Absence`, the same three), a sick note
(`_ID_IllnessDetail` 1 ärztliches Attest, 2 persönliche Krankmeldung), minutes late (`DelayMinute`), the lessons
that day, a comment. Lesson days only (an exam's rows are left out), of the sample's bookings (`sample.py`),
up to today.

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402
from sample import sample_persons  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def number(value):
    v = (value or '').strip().replace(',', '.')
    try:
        return round(float(v), 2) if v else None
    except ValueError:
        return None


ABSENCE = {'1': 'ill', '2': 'excused', '3': 'unexcused'}
SICK_NOTE = {'1': 'certificate', '2': 'self'}

today = date.today().isoformat()
bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())
ours = {bid for bid, b in bookings.items() if first(b['_ID_Person']) in chosen}

# `MakeSingleDateStudent` writes „… hat heute Geburtstag" / „… hat morgen Geburtstag" into the comment
# (mapping review 2026-10-26 §3): a birthday comes from the birth date, so only a teacher's own words stay.
BIRTHDAY = re.compile(r'^.*hat (heute|morgen) Geburtstag\W*$', re.I | re.M)


def teacher_comment(value):
    return BIRTHDAY.sub('', value or '').strip() or None


F = ['__ID_SingleDateStudent', '_ID_Booking', '_ID_SingleDateCourse', 'ZSingleDateStudent', '_ID_Presence', '_ID_Excuse', '_ID_Absence', '_ID_IllnessDetail', 'DelayMinute',
     'NumberLesson', 'Comment']
out = []
for r in table('SingleDateStudent', *F):
    booking, day = first(r['_ID_Booking']), iso(r['ZSingleDateStudent'])
    if booking not in ours or not first(r['_ID_SingleDateCourse']) or not day or day > today:
        continue
    presence = first(r['_ID_Presence'])
    late = number(r['DelayMinute'])
    out.append({'id': r['__ID_SingleDateStudent'].strip(), 'booking': booking, 'courseDay': first(r['_ID_SingleDateCourse']), 'day': day,
                'present': True if presence == '1' else False if presence == '2' else None,
                'absence': ABSENCE.get(first(r['_ID_Excuse'])) or ABSENCE.get(first(r['_ID_Absence'])),
                'sickNote': SICK_NOTE.get(first(r['_ID_IllnessDetail'])), 'late': int(late) if late and 0 < late <= 600 else None,
                'lessons': number(r['NumberLesson']), 'comment': teacher_comment(r['Comment'])})

if '--stats' in sys.argv:
    print('rows', len(out), '· present', sum(1 for o in out if o['present']), '· absent', sum(1 for o in out if o['present'] is False), '·',
          dict(collections.Counter(o['absence'] for o in out if o['absence'])), '· late', sum(1 for o in out if o['late']), '· comments', sum(1 for o in out if o['comment']))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
