"""Read some of SchoolMan's learners for the workspace — read-only (AppleScript).

    python3 -I scripts/filemaker/read_learners.py --stats    # counts only, nothing personal
    python3 -I scripts/filemaker/read_learners.py | node scripts/filemaker/import-learners.mjs [--dry-run]

Rahman, 2026-10-17: bring some learners across to see the workspace work with real data. The sample is
everyone in a course this week or starting one in the next four weeks — a `DateBooking` period that
runs then, of a booking that is not „nein" or „storno" — with all they have in SchoolMan: the person,
their e-mail addresses, phones and address, and every booking with its periods and its money — the
charges (`CostDetail`), the payments received (`PaymentIn`) and the refunds paid back to the learner
(`PaymentOut`, „Rückzahlung Student"; not rent to hosts or agency commission, which are not the
learner's account). And what SchoolMan says about them (Rahman, 2026-10-17: all the data related to
students, including the comments about them): the notes — a booking's final note (`FinalNote`), a
period's comment, the `Comment` table, the placement tests (`TestStudent`) and learning agreements
(`Agreement`) with their texts —, the work log (`WorkFlow`), the letters with their text (`Letter`), the
comments on payments and charges, and their bank accounts. Whole courses, so a course's names match its
count. Their exam bookings with the sitting (`Exam`: its exam, day and places), and their stays
(`DateAccommodation`: dates, kind, room type, meals, called off, departure confirmed) — where only as
a CASA flat's name and room; a host family stays „a host family" (hosts are people who are not
learners: their own module and a privacy decision first). Not the passport number, not the attendance
(the Klassenbuch's).

The JSON goes to stdout and straight into the importer: no personal data is written to a file.
Run the course import and the learner counts first (docs/ADMIN_WORKSPACE.md §Learners from SchoolMan).
"""
import collections, json, os, re, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column, column_chunked  # noqa: E402
from sample import sample_persons  # noqa: E402


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

bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_Student', '_ID_EnrolmentDone', '_ID_VisaRequired', '_ID_Agency',
                                                         '_ID_Corporate', '_ID_Exam', '_ID_CourseTypeReference', '_ID_Group', 'TimeStampOfCreation', 'DateOfCreation',
                                                         '_ID_PaymentThird') if b['__ID_Booking'].strip()}
periods = table('DateBooking', '__ID_DateBooking', '_ID_Booking', '_ID_Course', 'ZStartDate', 'ZEndDate')


def amount(value):
    """`1.234,56` or `72,00` or `168` → a number; None when there is none."""
    text = (value or '').strip().replace(' ', '').replace('€', '')
    if not text:
        return None
    if ',' in text:
        text = text.replace('.', '').replace(',', '.')
    try:
        return round(float(text), 2)
    except ValueError:
        return None

# The sample: whoever sits in a course from this Monday to four weeks ahead, on a booking taken (sample.py).
chosen = sample_persons(bookings, periods, today)

person_rows = table('Person', '__ID_Person', '_ID_Student', 'ZFirstName', 'ZSurName', 'ZSurName2', 'NickName', '_ID_GenderReference', 'Gender_1', 'DateOfBirth',
                    '_ID_Homeland', 'BirthPlace', 'CountryBirth_1', 'Occupation', 'MotherTongue_1', 'TimestampCreation', 'DateOfCreation', '_ID_Client')
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
taken = {b['__ID_Booking'].strip() for bs in bookings_of.values() for b in bs}

# The money of those bookings: charges, payments received, refunds to the learner.
charges_of = collections.defaultdict(list)
for r in table('CostDetail', '__ID_CostDetail', '_ID_Booking', '_ID_CostDetailReference', 'CostDetail_1', 'CostGross', 'Unit', 'CostGrossUnit', 'TimeStampOfCreation',
               'CostDetailComment_1'):
    if first(r['_ID_Booking']) in taken:
        charges_of[first(r['_ID_Booking'])].append(r)
payments_of = collections.defaultdict(list)
for r in table('PaymentIn', '__ID_PaymentIn', '_ID_Booking', 'PaymentIn', '_ID_MethodPayment', 'MethodPayment_1', 'DateOfPayment', 'CostDetailReference_1', 'TimeStampOfCreation',
               'CommentPaymentIn_1', 'CommentPaymentIn_2'):
    if first(r['_ID_Booking']) in taken:
        payments_of[first(r['_ID_Booking'])].append(r)
refunds_of = collections.defaultdict(list)
for r in table('PaymentOut', '__ID_PaymentOut', '_ID_Booking', 'PaymentOut', '_ID_PaymentOutReference', 'MethodPayment_1', 'DatePaymentOut', 'ZSingleDatePayment', 'TimeStampOfCreation',
               'PaymentOutComment_1'):
    if first(r['_ID_Booking']) in taken and first(r['_ID_PaymentOutReference']) == '3':  # 3 Rückzahlung Student
        refunds_of[first(r['_ID_Booking'])].append(r)


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


def owner(r):
    """Whose row it is: the chosen person it names, else the person of the booking it names."""
    for pid in ids(r.get('_ID_Person')):
        if pid in persons:
            return pid
    b = bookings.get(first(r.get('_ID_Booking')))
    return first(b['_ID_Person']) if b and first(b['_ID_Person']) in persons else None


notes_of = collections.defaultdict(list)
# A booking's final note and a period's comment: on the booking, by nobody named.
for r in table('Booking', '__ID_Booking', 'FinalNote', 'TimeStampOfChange'):
    bid = r['__ID_Booking'].strip()
    if bid in taken and r['FinalNote'].strip():
        notes_of[first(bookings[bid]['_ID_Person'])].append({'ref': f'Booking.FinalNote:{bid}', 'booking': bid, 'author': None, 'at': stamp(r['TimeStampOfChange']), 'body': r['FinalNote'].strip()})
for r in table('DateBooking', '__ID_DateBooking', '_ID_Booking', 'CommentBooking', 'DateOfCreation'):
    bid = first(r['_ID_Booking'])
    if bid in taken and r['CommentBooking'].strip():
        notes_of[first(bookings[bid]['_ID_Person'])].append({'ref': f'DateBooking.CommentBooking:{r["__ID_DateBooking"].strip()}', 'booking': bid, 'author': None,
                                                             'at': stamp(r['DateOfCreation']), 'body': r['CommentBooking'].strip()})
for r in table('Comment', '__ID_Comment', '_ID_Person', '_ID_Booking', 'Subject', 'Comment_1', 'Comment_2', 'UserName', 'TimeStampOfCreation'):
    pid = owner(r)
    body = text(r['Subject'], r['Comment_1'], r['Comment_2'])
    if pid and body:
        notes_of[pid].append({'ref': f'Comment:{r["__ID_Comment"].strip()}', 'booking': first(r['_ID_Booking']) or None, 'author': r['UserName'].strip() or None,
                              'at': stamp(r['TimeStampOfCreation']), 'body': body})
# A test (`TestStudent` holds placement and progress tests alike, 0066): which, when, the level reached
# (`LevelShort`: A1 … C1, B1+), the result (a percentage, mostly), the tester's comment.
tests_of = collections.defaultdict(list)
for r in table('TestStudent', '__ID_TestStudent', '_ID_Person', '_ID_Booking', 'TestReference', 'DateOfTest', 'Result', 'LevelShort', 'CommentTest', 'User',
               'DateOfCreation'):
    pid = owner(r)
    if not pid:
        continue
    result = r['Result'].strip()
    pct = re.match(r'^\s*(\d{1,3})(?:[.,]\d+)?\s*%?\s*$', result)
    tests_of[pid].append({'ref': r['__ID_TestStudent'].strip(), 'booking': first(r['_ID_Booking']) or None, 'test': r['TestReference'].strip() or None,
                          'day': iso(r['DateOfTest']), 'level': r['LevelShort'].strip() or None,
                          'score': int(pct.group(1)) if pct and int(pct.group(1)) <= 100 else None, 'result': None if pct else (result or None),
                          'comment': r['CommentTest'].strip() or None, 'author': r['User'].strip() or None, 'created': stamp(r['DateOfCreation'])})
# A learning agreement: its kind, its texts, the recommendation, the level and how long.
for r in table('Agreement', '__ID_Agreement', '_ID_Person', '_ID_Booking', 'TypeAgreement_1', 'Subject', 'Agreement_1', 'Agreement_2', 'Agreement_3', 'Agreement_4',
               'Agreement_5', 'AgreementComment_1', 'Recommendation', 'Level', 'LengthDuration', 'UserName', 'DateOfCreation'):
    pid = owner(r)
    if not pid:
        continue
    tail = ' · '.join(x for x in (f"Empfehlung: {r['Recommendation'].strip()}" if r['Recommendation'].strip() else '', f"Niveau {r['Level'].strip()}" if r['Level'].strip() else '',
                                  r['LengthDuration'].strip()) if x)
    notes_of[pid].append({'ref': f'Agreement:{r["__ID_Agreement"].strip()}', 'booking': first(r['_ID_Booking']) or None, 'author': r['UserName'].strip() or None,
                          'at': stamp(r['DateOfCreation']),
                          'body': text(r['TypeAgreement_1'] or r['Subject'], r['Agreement_1'], r['Agreement_2'], r['Agreement_3'], r['Agreement_4'], r['Agreement_5'],
                                       r['AgreementComment_1'], tail)})

# The work log, line by line (its text read in ranges: there are more than 100,000).
log_of = collections.defaultdict(list)
W = ['__ID_Workflow', '_ID_Person', '_ID_Booking', 'UserName', 'TimeStampOfCreation']
wf = [dict(zip(W, r)) for r in zip(*[column('WorkFlow', f) for f in W])]
wf_text, wf_comment = column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'CommentWorkflow', 5000)
for r, line, comment in zip(wf, wf_text, wf_comment):
    pid = owner(r)
    if pid and text(line, comment):
        log_of[pid].append({'ref': r['__ID_Workflow'].strip(), 'booking': first(r['_ID_Booking']) or None, 'author': r['UserName'].strip() or None,
                            'at': stamp(r['TimeStampOfCreation']), 'text': text(line, comment)})

# The letters, with what they said.
letters_of = collections.defaultdict(list)
L = ['__ID_Letter', '_ID_Person', '_ID_Booking', 'ScriptName', 'ScriptParameter', 'Subject', 'AddressHeader', 'Email', 'Date_LetterSent', 'DateOfEmission',
     'TimeStampOfCreation', 'UserName']
lt = [dict(zip(L, r)) for r in zip(*[column('Letter', f) for f in L])]
for r, body in zip(lt, column_chunked('Letter', 'FreeField', 1000)):
    pid = owner(r)
    if pid:
        letters_of[pid].append({'ref': r['__ID_Letter'].strip(), 'booking': first(r['_ID_Booking']) or None, 'script': r['ScriptName'].strip() or None,
                                'lang': 'en' if r['ScriptParameter'].strip() in ('En', '2') else 'de', 'subject': r['Subject'].strip() or None,
                                'header': r['AddressHeader'].strip() or None, 'email': r['Email'].strip() or None,
                                'sent': stamp(r['Date_LetterSent']) or stamp(r['DateOfEmission']) or stamp(r['TimeStampOfCreation']), 'author': r['UserName'].strip() or None,
                                'text': body})

# The sittings of their exam bookings: which exam, which day, how many places.
def short_day(value):
    """`B2 telc | 13.11.26` → `2026-11-13`: the day after the exam's name."""
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', value or '')
    if not m:
        return None
    year = int(m.group(3))
    return f'{year + 2000 if year < 100 else year}-{int(m.group(2)):02d}-{int(m.group(1)):02d}'


exams = {r['__ID_Exam'].strip(): r for r in table('Exam', '__ID_Exam', '_ID_ExamReference', 'Exam.ZSingleDate_OneLine', 'NumberPlace')}

# Their stays; a place and a room by name only when it is one of CASA's own flats.
places = {r['__ID_Accommodation'].strip(): r for r in table('Accommodation', '__ID_Accommodation', '_ID_SchoolFlatShare', 'SearchfieldAccommodation.Institution')}
rooms = {r['__ID_Room'].strip(): r for r in table('Room', '__ID_Room', 'RoomName')}
stays_of = collections.defaultdict(list)
for r in table('DateAccommodation', '__ID_DateAccommodation', '_ID_Booking', 'ZStartDate', 'ZEndDate', '_ID_AccommodationType', '_ID_AccommodationRoom',
               '_ID_AccommodationCatering', '_ID_Accommodation', '_ID_Room', '_ID_EnrolmentDone', '_ID_DepartureConfirmed'):
    bid = first(r['_ID_Booking'])
    if bid not in taken:
        continue
    place = places.get(first(r['_ID_Accommodation']), {})
    flat = first(place.get('_ID_SchoolFlatShare')) == '1'
    stays_of[bid].append({
        'id': r['__ID_DateAccommodation'].strip(), 'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate']),
        'type': first(r['_ID_AccommodationType']) or None, 'room': first(r['_ID_AccommodationRoom']) or None, 'catering': first(r['_ID_AccommodationCatering']) or None,
        'enrolment': first(r['_ID_EnrolmentDone']) or None, 'departure': first(r['_ID_DepartureConfirmed']) or None,
        'place': first(r['_ID_Accommodation']) or None, 'flat': flat,
        # „Die Biber – CASA WG" → „Die Biber": the stay's kind already says CASA WG.
        'placeName': re.sub(r'\s*[–-]\s*CASA\s*WG$', '', re.sub(r'[\s|]+$', '', place.get('SearchfieldAccommodation.Institution', ''))).strip() or None if flat else None,
        'roomId': first(r['_ID_Room']) or None,
        'roomName': rooms.get(first(r['_ID_Room']), {}).get('RoomName', '').strip() or None if flat else None,
    })

banks_of = collections.defaultdict(list)
for r in table('BankAccount', '__ID_BankAccount', '_ID_Person', 'AccountOwner', 'IBAN.Text', 'SWIFT.Text', 'BIC', 'BankName', 'TimestampOfCreation'):
    pid = owner(r)
    if pid and r['IBAN.Text'].strip():
        banks_of[pid].append({'ref': r['__ID_BankAccount'].strip(), 'holder': r['AccountOwner'].strip() or None, 'iban': r['IBAN.Text'].strip(),
                              'bic': (r['SWIFT.Text'] or r['BIC']).strip() or None, 'bank': r['BankName'].strip() or None})

out = []
for pid, p in persons.items():
    gender = first(p['_ID_GenderReference']) or {'Herr': '1', 'Frau': '2', 'Divers': '3'}.get(p['Gender_1'].strip(), '')
    out.append({
        'personId': pid,
        'studentId': first(p['_ID_Student']) or None,
        # SchoolMan's customer number (0061), copied onto their bookings there.
        'customerNumber': first(p['_ID_Client']) or None,
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
            # A company pays unless SchoolMan's „Zahlung durch Dritte" (`_ID_PaymentThird`, shown only with a
            # company) says Nein (2): then the learner owes, the company is only theirs (2026-10-21).
            'payer': 'agency' if first(b['_ID_Agency']) else 'company' if first(b['_ID_Corporate']) and first(b['_ID_PaymentThird']) != '2' else 'self',
            'exam': {'id': first(b['_ID_Exam']), 'ref': first(exams.get(first(b['_ID_Exam']), {}).get('_ID_ExamReference')) or None,
                     'day': short_day(exams.get(first(b['_ID_Exam']), {}).get('Exam.ZSingleDate_OneLine')),
                     'places': exams.get(first(b['_ID_Exam']), {}).get('NumberPlace', '').strip() or None} if first(b['_ID_Exam']) else None,
            'stays': stays_of[b['__ID_Booking'].strip()],
            'type': first(b['_ID_CourseTypeReference']) or None,
            'periods': [{'id': r['__ID_DateBooking'].strip(), 'course': first(r['_ID_Course']) or None, 'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate'])}
                        for r in periods_of[b['__ID_Booking'].strip()]],
            'charges': [{'id': r['__ID_CostDetail'].strip(), 'ref': first(r['_ID_CostDetailReference']) or None, 'label': r['CostDetail_1'].strip() or None,
                         'comment': r['CostDetailComment_1'].strip() or None,
                         'amount': amount(r['CostGross']), 'units': amount(r['Unit']), 'unitAmount': amount(r['CostGrossUnit']), 'created': stamp(r['TimeStampOfCreation'])}
                        for r in charges_of[b['__ID_Booking'].strip()]],
            'payments': [{'id': f"PaymentIn:{r['__ID_PaymentIn'].strip()}", 'amount': amount(r['PaymentIn']), 'method': first(r['_ID_MethodPayment']) or None,
                          'methodLabel': r['MethodPayment_1'].strip() or None, 'date': iso(r['DateOfPayment']), 'for': r['CostDetailReference_1'].strip() or None,
                          'comment': text(r['CommentPaymentIn_1'], r['CommentPaymentIn_2']) or None,
                          'created': stamp(r['TimeStampOfCreation'])} for r in payments_of[b['__ID_Booking'].strip()]]
                        # A refund paid back to the learner is money out of their account: a payment below zero.
                        + [{'id': f"PaymentOut:{r['__ID_PaymentOut'].strip()}", 'amount': -abs(amount(r['PaymentOut']) or 0), 'method': None,
                            'methodLabel': r['MethodPayment_1'].strip() or None, 'date': iso(r['DatePaymentOut']) or iso(r['ZSingleDatePayment']), 'for': 'Rückzahlung',
                            'comment': r['PaymentOutComment_1'].strip() or None,
                            'created': stamp(r['TimeStampOfCreation'])} for r in refunds_of[b['__ID_Booking'].strip()]],
        } for b in bookings_of[pid]],
        'notes': notes_of[pid],
        'tests': tests_of[pid],
        'log': log_of[pid],
        'letters': letters_of[pid],
        'banks': banks_of[pid],
    })

if '--stats' in sys.argv:
    all_b = [b for x in out for b in x['bookings']]
    all_p = [r for b in all_b for r in b['periods']]
    print('learners', len(out), '· skipped: duplicated person keys', len(chosen & twice), '· chosen without a person row', len(chosen - set(persons) - twice))
    print('bookings', len(all_b), '· exam', sum(bool(b['exam']) for b in all_b), '· without a period', sum(not b['periods'] for b in all_b),
          '· enrolment', collections.Counter(b['enrolment'] for b in all_b).most_common())
    print('periods', len(all_p), '· without dates', sum(not (r['start'] and r['end']) for r in all_p), '· inverted', sum(bool(r['start'] and r['end'] and r['end'] < r['start']) for r in all_p))
    ch = [c for b in all_b for c in b['charges']]
    pa = [p for b in all_b for p in b['payments']]
    print('charges', len(ch), '· without an amount', sum(c['amount'] in (None, 0) for c in ch), '· sum', round(sum(c['amount'] or 0 for c in ch), 2),
          '· payments', len(pa), '· refunds', sum(p['id'].startswith('PaymentOut:') for p in pa), '· sum', round(sum(p['amount'] or 0 for p in pa), 2),
          '· without a date', sum(not p['date'] for p in pa))
    st = [s for b in all_b for s in b['stays']]
    print('exam bookings', sum(bool(b['exam']) for b in all_b), 'by exam kind', collections.Counter((b['exam'] or {}).get('ref') for b in all_b if b['exam']).most_common(),
          '· stays', len(st), 'on', sum(bool(b['stays']) for b in all_b), 'bookings · in a CASA flat', sum(s['flat'] for s in st))
    print('notes', sum(len(x['notes']) for x in out), '· log lines', sum(len(x['log']) for x in out), '· letters', sum(len(x['letters']) for x in out),
          '(with text', sum(bool(l['text'].strip()) for x in out for l in x['letters']), ') · bank accounts', sum(len(x['banks']) for x in out))
    print('with e-mail', sum(bool(x['emails']) for x in out), '· phone', sum(bool(x['phones']) for x in out), '· address', sum(bool(x['addresses']) for x in out),
          '· birth date', sum(bool(x['birthDate']) for x in out), '· nationality', sum(bool(x['nationality']) for x in out), '· created', sum(bool(x['created']) for x in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
