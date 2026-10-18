"""Read the letters to hosts, how letters went out, and complaints — read-only (AppleScript).

    python3 -I scripts/filemaker/read_letters_extra.py --stats    # counts only
    python3 -I scripts/filemaker/read_letters_extra.py | node scripts/filemaker/import-letters-extra.mjs [--dry-run]

- `StatementLandlord`: a letter to a host about a learner's stay — its text, subject, address, day, who — for the
  sample's bookings (`sample.py`).
- `WorkFlowLetter`: per `Letter`, whether it was e-mailed (`Email_Client`, `EmailSMPT`) or printed (`Print`);
  the latest says.
- `Complaint`: a complaint about a learner's booking, for the sample.

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column, column_chunked  # noqa: E402
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


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())
ours = {bid for bid, b in bookings.items() if first(b['_ID_Person']) in chosen}

S = ['__ID_StatementLandlord', '_ID_Accommodation', '_ID_Booking', 'Subject', 'HeaderLandlord', 'HeaderAccommodation', 'DateOfEmission', 'TimeStampOfCreation', 'UserName']
statements = []
for r, body in zip(table('StatementLandlord', *S), column_chunked('StatementLandlord', 'FreeField', 500)):
    if first(r['_ID_Booking']) not in ours:
        continue
    statements.append({'ref': f'StatementLandlord:{r["__ID_StatementLandlord"].strip()}', 'place': first(r['_ID_Accommodation']) or None, 'booking': first(r['_ID_Booking']),
                       'subject': r['Subject'].strip() or None, 'header': r['HeaderLandlord'].strip() or r['HeaderAccommodation'].strip() or None,
                       'sent': stamp(r['DateOfEmission']) or stamp(r['TimeStampOfCreation']), 'author': r['UserName'].strip() or None, 'text': body, 'lang': 'de'})

VIA = {'Email_Client': 'email', 'EmailSMPT': 'email', 'EmailClient': 'email', 'Print': 'print'}
sent_via = {}
for letter, form, created in zip(column('WorkFlowLetter', '_ID_Letter'), column('WorkFlowLetter', 'FormCommunication'), column('WorkFlowLetter', 'DateOfCreation')):
    if first(letter) and form.strip() in VIA:
        sent_via[first(letter)] = VIA[form.strip()]

complaints = []
for r in table('Complaint', '__ID_Complaint', '_ID_Booking', '_ID_Person', 'ComplaintReference_1', 'Subject', 'Complaint_1', 'Complaint_2', 'CommentNote', 'UserName',
               'TimeStampOfCreation'):
    booking, person = first(r['_ID_Booking']), first(r['_ID_Person'])
    body = text(f"Beschwerde: {r['ComplaintReference_1'].strip()}" if r['ComplaintReference_1'].strip() else 'Beschwerde', r['Subject'], r['Complaint_1'], r['Complaint_2'],
                r['CommentNote'])
    if booking in ours or person in chosen:
        complaints.append({'ref': f'Complaint:{r["__ID_Complaint"].strip()}', 'booking': booking or None, 'person': person or None, 'author': r['UserName'].strip() or None,
                           'at': stamp(r['TimeStampOfCreation']), 'body': body})

if '--stats' in sys.argv:
    print('letters to hosts', len(statements), '· with a place', sum(1 for s in statements if s['place']), '· letters with how they went', len(sent_via),
          dict(collections.Counter(sent_via.values())), '· complaints', len(complaints))
    sys.exit(0)

json.dump({'statements': statements, 'sentVia': sent_via, 'complaints': complaints}, sys.stdout, ensure_ascii=False)
