"""Read how the sample's learners came in: pre-bookings and the waiting list — read-only (AppleScript).

    python3 -I scripts/filemaker/read_intake.py --stats    # counts only
    python3 -I scripts/filemaker/read_intake.py | node scripts/filemaker/import-intake.mjs [--dry-run]

SchoolMan's intake is link records (docs/schoolman/intake.md): a `PreBooking` is what someone asked for —
the course type, the level (`_ID_Level`, the band number; else `_ID_LevelStepReference`), the time of day
(`_ID_DayTimeReference` 2 vormittags, 4 nachmittags, 5 abends), a course, a visa, its state (1 ja, 2 nein,
4 u.B. — the default nobody maintains), the booking it became; a `WaitingRoom` row puts it on the waiting
list for a course. The sample's learners' (`sample.py`).

Since 2026-10-27 (mapping review, docs/schoolman/bridge-gaps.md §13) also what the enquirer asked for beyond
that: whether they are already in Germany (`_ID_Local`), the exam they asked for (`_ID_Exam`, else its kind
`_ID_ExamReference`), the course dates and the stay they wished for (`DateOffer` rows on the pre-booking: a
course period, or a stay with its kind, room and meals) and how they got in touch (`Contact`, typed as a
number or, before, as text). And the waiting list whole: a row's person, booking and course are the
pre-booking's where the row has none (369 rows since 2025 name no person, 205 not the booking it became),
and a pre-booking that names an exam sitting waits for that sitting.

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


def hhmm(value):
    m = re.match(r'\s*(\d{1,2}):(\d{2})', value or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m else None


def stamp(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


BAND = {'1': 'A1', '2': 'A2', '3': 'B1', '3,5': 'B1+', '3.5': 'B1+', '4': 'B2', '5': 'C1'}
DAYTIME = {'2': 'vormittags', '4': 'nachmittags', '5': 'abends'}
STATE = {'1': 'ja', '2': 'nein', '4': 'u.B.'}
LOCAL = {'1': 'inland', '2': 'abroad'}  # SelectionDetail „Local": Inland / Ausland
# How they got in touch (`TypeContactReference`): its number, or the label typed before there was one.
CONTACT = {'1': 'online', '2': 'email', '3': 'phone', '4': 'office',
           'online anmeldung': 'online', 'email': 'email', 'e-mail': 'email', 'email nachfrage': 'email', 'telefon': 'phone',
           'telefonische anfrage': 'phone', 'besuch im büro': 'office'}

bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())

def step(value):
    """The level step typed into the number field `_ID_LevelStepReference` („A1.1", „B1+.2"): the Data API hands
    it back without the point („A11"), FileMaker Pro as typed; the point goes back before the last digit."""
    value = value.replace(',', '.')
    return (re.sub(r'^([A-Ca-c][12]\+?)(\d)$', r'\1.\2', value) or None) if value else None


# An exam sitting as the workspace makes or finds it (exam-sittings.mjs): its kind, first day, hours, places.
parts = collections.defaultdict(list)
for r in table('SingleDateExam', '_ID_Exam', 'ZSingleDate', 'HourStart', 'HourEnd'):
    if first(r['_ID_Exam']) and iso(r['ZSingleDate']):
        parts[first(r['_ID_Exam'])].append(r)
exams = {}
for r in table('Exam', '__ID_Exam', '_ID_ExamReference', 'NumberPlace'):
    rows = parts.get(r['__ID_Exam'].strip(), [])
    starts, ends = [hhmm(p['HourStart']) for p in rows if hhmm(p['HourStart'])], [hhmm(p['HourEnd']) for p in rows if hhmm(p['HourEnd'])]
    exams[r['__ID_Exam'].strip()] = {'id': r['__ID_Exam'].strip(), 'ref': first(r['_ID_ExamReference']) or None,
                                     'day': min(iso(p['ZSingleDate']) for p in rows) if rows else None,
                                     'from': min(starts) if starts else None, 'to': max(ends) if ends else None, 'places': r['NumberPlace'].strip() or None}

# What the enquirer wished for (`DateOffer` on the pre-booking): 1 a course period, 2 a stay. Rows from before
# the kind existed (2022–2023) are course periods unless they say how to stay.
wishes = collections.defaultdict(lambda: {'course': [], 'stay': []})
for r in table('DateOffer', '__ID_DateOffer', '_ID_PreBooking', '_ID_TypeOfferReference', 'ZStartDate', 'ZEndDate', '_ID_AccommodationType', '_ID_AccommodationRoom',
               '_ID_AccommodationCatering'):
    pid, kind = first(r['_ID_PreBooking']), first(r['_ID_TypeOfferReference'])
    stay = {'type': first(r['_ID_AccommodationType']) or None, 'room': first(r['_ID_AccommodationRoom']) or None, 'catering': first(r['_ID_AccommodationCatering']) or None}
    if not pid or kind not in ('', '1', '2') or not (iso(r['ZStartDate']) or any(stay.values())):
        continue
    span = {'id': r['__ID_DateOffer'].strip(), 'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate'])}
    if kind == '2' or (not kind and any(stay.values())):
        wishes[pid]['stay'].append({**span, **stay})
    else:
        wishes[pid]['course'].append(span)
for w in wishes.values():
    for spans in w.values():
        spans.sort(key=lambda s: (s['start'] or '', s['id']))

contacts = collections.defaultdict(set)
for r in table('Contact', '_ID_PreBooking', '_ID_TypeContactReference'):
    for value in re.split(r'[\n\r]+', r['_ID_TypeContactReference'] or ''):
        way = CONTACT.get(value.strip().lower())
        if first(r['_ID_PreBooking']) and way:
            contacts[first(r['_ID_PreBooking'])].add(way)

pre = []
prebookings = {}  # every pre-booking, for the waiting list
for r in table('PreBooking', '__ID_PreBooking', '_ID_Person', '_ID_CourseTypeReference', '_ID_Level', '_ID_LevelStepReference', '_ID_DayTimeReference', '_ID_Course',
               '_ID_VisaRequired', '_ID_StatusPreBooking', '_ID_Booking', '_ID_Local', '_ID_Exam', '_ID_ExamReference', 'UserName', 'Timestamp.Creation', 'DateOfCreation'):
    key = r['__ID_PreBooking'].strip()
    prebookings[key] = r
    if first(r['_ID_Person']) not in chosen:
        continue
    visa = first(r['_ID_VisaRequired'])
    exam = exams.get(first(r['_ID_Exam']))
    pre.append({'id': key, 'person': first(r['_ID_Person']), 'courseType': first(r['_ID_CourseTypeReference']) or None,
                'band': BAND.get(first(r['_ID_Level'])), 'step': step(first(r['_ID_LevelStepReference'])), 'daytime': DAYTIME.get(first(r['_ID_DayTimeReference'])),
                'course': first(r['_ID_Course']) or None, 'visa': True if visa == '1' else False if visa == '2' else None,
                'state': STATE.get(first(r['_ID_StatusPreBooking'])), 'booking': first(r['_ID_Booking']) or None, 'author': r['UserName'].strip() or None,
                'created': stamp(r['Timestamp.Creation']) or stamp(r['DateOfCreation']),
                'local': LOCAL.get(first(r['_ID_Local'])),
                'exam': {'ref': exam['ref'], 'day': exam['day']} if exam else None,
                'examType': None if exam else first(r['_ID_ExamReference']) or None,
                'contact': sorted(contacts.get(key, ())),
                'wish': wishes[key] if key in wishes else None})

waiting = []
unplaced = collections.Counter()
for r in table('WaitingRoom', '__ID_WaitingRoom', '_ID_Person', '_ID_PreBooking', '_ID_Course', '_ID_Booking', 'Timestamp.Creation', 'DateOfCreation', 'UserName'):
    # The row's own person, booking and course, else its pre-booking's (mapping review 2026-10-27 §6); a
    # pre-booking that names no course but an exam sitting waits for that sitting.
    p = prebookings.get(first(r['_ID_PreBooking']), {})
    person = first(r['_ID_Person']) or first(p.get('_ID_Person'))
    course = first(r['_ID_Course']) or first(p.get('_ID_Course'))
    exam = None if course else exams.get(first(p.get('_ID_Exam')))
    if person not in chosen:
        unplaced['person outside the sample'] += 1
        continue
    if not course and not exam:
        unplaced['neither a course nor an exam'] += 1
        continue
    waiting.append({'id': r['__ID_WaitingRoom'].strip(), 'person': person, 'course': course or None, 'exam': exam,
                    'booking': first(r['_ID_Booking']) or first(p.get('_ID_Booking')) or None,
                    'joined': stamp(r['Timestamp.Creation']) or stamp(r['DateOfCreation']), 'author': r['UserName'].strip() or None,
                    'wish': wishes[first(r['_ID_PreBooking'])]['course'] if first(r['_ID_PreBooking']) in wishes else []})

if '--stats' in sys.argv:
    print('pre-bookings', len(pre), dict(collections.Counter(p['state'] for p in pre)), '· became a booking', sum(1 for p in pre if p['booking']),
          '· in Germany / abroad', sum(p['local'] == 'inland' for p in pre), '/', sum(p['local'] == 'abroad' for p in pre),
          '· an exam', sum(bool(p['exam'] or p['examType']) for p in pre), '· how in touch', sum(bool(p['contact']) for p in pre),
          '· wished dates', sum(bool(p['wish'] and p['wish']['course']) for p in pre), '· wished stay', sum(bool(p['wish'] and p['wish']['stay']) for p in pre))
    print('waiting-list rows', len(waiting), '· for a course', sum(bool(w['course']) for w in waiting), '· for an exam', sum(bool(w['exam']) for w in waiting),
          '· booked', sum(1 for w in waiting if w['booking']), '· left out', dict(unplaced))
    sys.exit(0)

json.dump({'preBookings': pre, 'waiting': waiting}, sys.stdout, ensure_ascii=False)
