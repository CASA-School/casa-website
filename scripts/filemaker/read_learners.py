"""Read some of SchoolMan's learners for the workspace — read-only (AppleScript).

    python3 -I scripts/filemaker/read_learners.py --stats    # counts only, nothing personal
    python3 -I scripts/filemaker/read_learners.py | node scripts/filemaker/import-learners.mjs [--dry-run]

Rahman, 2026-10-17: bring some learners across to see the workspace work with real data. The sample is
everyone in a course this week or starting one in the next four weeks — a `DateBooking` period that
runs then, of a booking that is not „nein" or „storno" — with all they have in SchoolMan: the person,
their e-mail addresses, phones and address, and every booking with its periods. Whole courses, so a
course's names match its count. Not the passport number, not the money (it stays SchoolMan's), not
the attendance (the Klassenbuch's).

The JSON goes to stdout and straight into the importer: no personal data is written to a file.
Run the course import and the learner counts first (docs/ADMIN_WORKSPACE.md §Learners from SchoolMan).
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def ids(value):
    """A FileMaker key may hold several ids, one per line."""
    return [v.strip() for v in (value or '').split('\n') if v.strip()]


def first(value):
    found = ids(value)
    return found[0] if found else ''


def iso(value):
    """`15.03.2021` (or a timestamp starting with it) → `2021-03-15`."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def stamp(value):
    """`15.03.2021 14:05:09` → `2021-03-15T14:05:09`; a date alone at noon."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


today = date.today()
monday = today - timedelta(days=today.weekday())
until = today + timedelta(days=28)
NOT_TAKEN = {'2', '3'}  # _ID_EnrolmentDone: 2 nein, 3 storno

bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_Student', '_ID_EnrolmentDone', '_ID_VisaRequired', '_ID_Agency',
                                                         '_ID_Corporate', '_ID_Exam', '_ID_CourseTypeReference', 'TimeStampOfCreation', 'DateOfCreation') if b['__ID_Booking'].strip()}
periods = table('DateBooking', '__ID_DateBooking', '_ID_Booking', '_ID_Course', 'ZStartDate', 'ZEndDate')

# The sample: whoever sits in a course from this Monday to four weeks ahead, on a booking taken.
chosen = set()
for p in periods:
    b = bookings.get(first(p['_ID_Booking']))
    s, e = iso(p['ZStartDate']), iso(p['ZEndDate'])
    if b and s and e and s <= until.isoformat() and e >= monday.isoformat() and first(b['_ID_EnrolmentDone']) not in NOT_TAKEN and first(b['_ID_Person']):
        chosen.add(first(b['_ID_Person']))

person_rows = table('Person', '__ID_Person', '_ID_Student', 'ZFirstName', 'ZSurName', 'ZSurName2', 'NickName', '_ID_GenderReference', 'Gender_1', 'DateOfBirth',
                    '_ID_Homeland', 'BirthPlace', 'CountryBirth_1', 'Occupation', 'MotherTongue_1', 'TimestampCreation', 'DateOfCreation')
seen = collections.Counter(r['__ID_Person'].strip() for r in person_rows)
twice = {k for k, n in seen.items() if n > 1}
persons = {r['__ID_Person'].strip(): r for r in person_rows if r['__ID_Person'].strip() in chosen and r['__ID_Person'].strip() not in twice}

# Nationality: SchoolMan's `Flag`, whose long name starts with the ISO code („EG - Egypt"); else its German name.
flags = {r['__ID_Flag'].strip(): r for r in table('Flag', '__ID_Flag', 'CountryLong_1', 'Country_1')}


def nationality(flag_id):
    f = flags.get(flag_id)
    if not f:
        return None
    m = re.match(r'\s*([A-Z]{2})\s*-', f['CountryLong_1'] or '')
    return m.group(1) if m else (f['Country_1'].strip() or None)


def owned(rows):
    """Rows of a chosen person, by their person id."""
    out = collections.defaultdict(list)
    for r in rows:
        for pid in ids(r.get('_ID_Person')):
            if pid in persons:
                out[pid].append(r)
                break
    return out


emails = owned(table('Email', '_ID_Person', 'Email', '_ID_Use', 'TimeStampOfCreation'))
phones = owned(table('Phone', '_ID_Person', 'Phone', 'AreaCode', '_ID_Use', 'TimeStampOfCreation'))
addresses = owned(table('Address', '_ID_Person', 'Street', 'HouseNumber', 'ZPostCode', 'City', 'ZCountry_1', 'TimeStampOfCreation'))

periods_of = collections.defaultdict(list)
for p in periods:
    periods_of[first(p['_ID_Booking'])].append(p)
bookings_of = collections.defaultdict(list)
for bid, b in bookings.items():
    pid = first(b['_ID_Person'])
    if pid in persons:
        bookings_of[pid].append(b)

out = []
for pid, p in persons.items():
    gender = first(p['_ID_GenderReference']) or {'Herr': '1', 'Frau': '2', 'Divers': '3'}.get(p['Gender_1'].strip(), '')
    out.append({
        'personId': pid,
        'studentId': first(p['_ID_Student']) or None,
        'firstName': p['ZFirstName'].strip(),
        'lastName': p['ZSurName'].strip() or None,
        'secondLastName': p['ZSurName2'].strip() or None,
        'nickname': p['NickName'].strip() or None,
        'gender': gender or None,
        'birthDate': iso(p['DateOfBirth']),
        'nationality': nationality(first(p['_ID_Homeland'])),
        'birthPlace': p['BirthPlace'].strip() or None,
        'birthCountry': p['CountryBirth_1'].strip() or None,
        'occupation': p['Occupation'].strip() or None,
        'motherTongue': p['MotherTongue_1'].strip() or None,
        'created': stamp(p['TimestampCreation']) or stamp(p['DateOfCreation']),
        'emails': [{'address': r['Email'].strip(), 'use': first(r['_ID_Use']), 'created': stamp(r['TimeStampOfCreation'])} for r in emails[pid] if r['Email'].strip()],
        'phones': [{'number': ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x), 'use': first(r['_ID_Use']), 'created': stamp(r['TimeStampOfCreation'])}
                   for r in phones[pid] if r['Phone'].strip()],
        'addresses': [{'street': ' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), 'postcode': r['ZPostCode'].strip(), 'city': r['City'].strip(),
                       'country': r['ZCountry_1'].strip(), 'created': stamp(r['TimeStampOfCreation'])} for r in addresses[pid]],
        'bookings': [{
            'id': b['__ID_Booking'].strip(),
            'created': stamp(b['TimeStampOfCreation']) or stamp(b['DateOfCreation']),
            'enrolment': first(b['_ID_EnrolmentDone']) or None,
            'visa': first(b['_ID_VisaRequired']) == '1',
            'payer': 'agency' if first(b['_ID_Agency']) else 'company' if first(b['_ID_Corporate']) else 'self',
            'exam': bool(first(b['_ID_Exam'])),
            'type': first(b['_ID_CourseTypeReference']) or None,
            'periods': [{'id': r['__ID_DateBooking'].strip(), 'course': first(r['_ID_Course']) or None, 'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate'])}
                        for r in periods_of[b['__ID_Booking'].strip()]],
        } for b in bookings_of[pid]],
    })

if '--stats' in sys.argv:
    all_b = [b for x in out for b in x['bookings']]
    all_p = [r for b in all_b for r in b['periods']]
    print('learners', len(out), '· skipped: duplicated person keys', len(chosen & twice), '· chosen without a person row', len(chosen - set(persons) - twice))
    print('bookings', len(all_b), '· exam', sum(b['exam'] for b in all_b), '· without a period', sum(not b['periods'] for b in all_b),
          '· enrolment', collections.Counter(b['enrolment'] for b in all_b).most_common())
    print('periods', len(all_p), '· without dates', sum(not (r['start'] and r['end']) for r in all_p), '· inverted', sum(bool(r['start'] and r['end'] and r['end'] < r['start']) for r in all_p))
    print('with e-mail', sum(bool(x['emails']) for x in out), '· phone', sum(bool(x['phones']) for x in out), '· address', sum(bool(x['addresses']) for x in out),
          '· birth date', sum(bool(x['birthDate']) for x in out), '· nationality', sum(bool(x['nationality']) for x in out), '· created', sum(bool(x['created']) for x in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
