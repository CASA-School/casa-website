"""Read how the sample's learners came in: pre-bookings and the waiting list — read-only (AppleScript).

    python3 -I scripts/filemaker/read_intake.py --stats    # counts only
    python3 -I scripts/filemaker/read_intake.py | node scripts/filemaker/import-intake.mjs [--dry-run]

SchoolMan's intake is link records (docs/schoolman/intake.md): a `PreBooking` is what someone asked for —
the course type, the level (`_ID_Level`, the band number; else `_ID_LevelStepReference`), the time of day
(`_ID_DayTimeReference` 2 vormittags, 4 nachmittags, 5 abends), a course, a visa, its state (1 ja, 2 nein,
4 u.B. — the default nobody maintains), the booking it became; a `WaitingRoom` row puts it on the waiting
list for a course. The sample's learners' (`sample.py`).

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


def stamp(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


BAND = {'1': 'A1', '2': 'A2', '3': 'B1', '3,5': 'B1+', '3.5': 'B1+', '4': 'B2', '5': 'C1'}
DAYTIME = {'2': 'vormittags', '4': 'nachmittags', '5': 'abends'}
STATE = {'1': 'ja', '2': 'nein', '4': 'u.B.'}

bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())

def step(value):
    """The level step typed into the number field `_ID_LevelStepReference` („A1.1", „B1+.2"): the Data API hands
    it back without the point („A11"), FileMaker Pro as typed; the point goes back before the last digit."""
    value = value.replace(',', '.')
    return (re.sub(r'^([A-Ca-c][12]\+?)(\d)$', r'\1.\2', value) or None) if value else None


pre = []
course_of = {}  # a pre-booking's course, for the waiting list
for r in table('PreBooking', '__ID_PreBooking', '_ID_Person', '_ID_CourseTypeReference', '_ID_Level', '_ID_LevelStepReference', '_ID_DayTimeReference', '_ID_Course',
               '_ID_VisaRequired', '_ID_StatusPreBooking', '_ID_Booking', 'UserName', 'Timestamp.Creation', 'DateOfCreation'):
    course_of[r['__ID_PreBooking'].strip()] = first(r['_ID_Course'])
    if first(r['_ID_Person']) not in chosen:
        continue
    visa = first(r['_ID_VisaRequired'])
    pre.append({'id': r['__ID_PreBooking'].strip(), 'person': first(r['_ID_Person']), 'courseType': first(r['_ID_CourseTypeReference']) or None,
                'band': BAND.get(first(r['_ID_Level'])), 'step': step(first(r['_ID_LevelStepReference'])), 'daytime': DAYTIME.get(first(r['_ID_DayTimeReference'])),
                'course': first(r['_ID_Course']) or None, 'visa': True if visa == '1' else False if visa == '2' else None,
                'state': STATE.get(first(r['_ID_StatusPreBooking'])), 'booking': first(r['_ID_Booking']) or None, 'author': r['UserName'].strip() or None,
                'created': stamp(r['Timestamp.Creation']) or stamp(r['DateOfCreation'])})

waiting = []
for r in table('WaitingRoom', '__ID_WaitingRoom', '_ID_Person', '_ID_PreBooking', '_ID_Course', '_ID_Booking', 'Timestamp.Creation', 'DateOfCreation', 'UserName'):
    # Since 2025 the row names its pre-booking, whose course it is (mapping review 2026-10-26 §6).
    course = first(r['_ID_Course']) or course_of.get(first(r['_ID_PreBooking']))
    if first(r['_ID_Person']) not in chosen or not course:
        continue
    waiting.append({'id': r['__ID_WaitingRoom'].strip(), 'person': first(r['_ID_Person']), 'course': course, 'booking': first(r['_ID_Booking']) or None,
                    'joined': stamp(r['Timestamp.Creation']) or stamp(r['DateOfCreation']), 'author': r['UserName'].strip() or None})

if '--stats' in sys.argv:
    print('pre-bookings', len(pre), dict(collections.Counter(p['state'] for p in pre)), '· became a booking', sum(1 for p in pre if p['booking']),
          '· waiting-list rows with a course', len(waiting), '· booked', sum(1 for w in waiting if w['booking']))
    sys.exit(0)

json.dump({'preBookings': pre, 'waiting': waiting}, sys.stdout, ensure_ascii=False)
