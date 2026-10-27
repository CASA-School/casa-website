"""Read the history and notes no other step reads for their record — read-only (AppleScript).

    python3 -I scripts/filemaker/read_history.py --stats    # counts only
    python3 -I scripts/filemaker/read_history.py | node scripts/filemaker/import-history.mjs [--dry-run]

Completeness review 2026-10-27 (money-letters §F, §G):

- `ProcessReference`: the kinds of a history line. The workspace keeps its own names
  (`history_processes`, 0094); a kind SchoolMan adds later comes across with SchoolMan's names.
- `WorkFlow` lines that name a place to stay (`_ID_Accommodation`, or a stay `_ID_DateAccommodation` of one):
  the place's history — a letter to the host, the authority told of a departure, „stay or leave". A line about
  a learner the workspace does not hold stays in SchoolMan (as on an organisation); the learner's own lines
  come with the learners as well.
- `Comment` rows on a course alone (`_ID_Course`, none of a person, booking, group, offer, party or place):
  the notes on that class.

Notes on a party (`Comment._ID_Management`, `_ID_Corporate`, `_ID_Agency` …) are not read: SchoolMan keeps
credentials in some of them, and they come only after a screen (docs/schoolman/bridge-gaps.md, decision 7).

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


def ids(value):
    return [v.strip() for v in (value or '').split('\n') if v.strip()]


def first(value):
    found = ids(value)
    return found[0] if found else ''


def stamp(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


processes = [{'id': r['__ID_ProcessReference'].strip(), 'de': r['ProcessReference_1'].strip() or None, 'en': r['ProcessReference_2'].strip() or None}
             for r in table('ProcessReference', '__ID_ProcessReference', 'ProcessReference_1', 'ProcessReference_2') if r['__ID_ProcessReference'].strip().isdigit()]

bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), date.today())

# A place's history: the lines that name it, or one of its stays.
place_of_stay = {r['__ID_DateAccommodation'].strip(): first(r['_ID_Accommodation']) for r in table('DateAccommodation', '__ID_DateAccommodation', '_ID_Accommodation')}
W = ['__ID_Workflow', '_ID_Person', '_ID_Booking', '_ID_Accommodation', '_ID_DateAccommodation', 'UserName', 'TimeStampOfCreation', '_ID_ProcessReference', '_ID_History',
     '_ID_SerialNumberInvoice']
wf = [dict(zip(W, r)) for r in zip(*[column('WorkFlow', f) for f in W])]
log = collections.defaultdict(list)
skipped = collections.Counter()
for r, line, comment in zip(wf, column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'CommentWorkflow', 5000)):
    place = first(r['_ID_Accommodation']) or next((place_of_stay[s] for s in ids(r['_ID_DateAccommodation']) if place_of_stay.get(s)), '')
    body = text(line, comment)
    if not place or not body:
        continue
    process = first(r['_ID_ProcessReference'])
    person = first(r['_ID_Person']) or first(bookings.get(first(r['_ID_Booking']), {}).get('_ID_Person'))
    if person and person not in chosen:
        skipped['about a learner not here'] += 1
        continue
    if process == '13':
        skipped['staff matter'] += 1
        continue
    log[place].append({'ref': r['__ID_Workflow'].strip(), 'at': stamp(r['TimeStampOfCreation']), 'author': r['UserName'].strip() or None, 'text': body[:4000],
                       'process': process if process.isdigit() else None, 'typed': first(r['_ID_History']) == '1',
                       'invoice': first(r['_ID_SerialNumberInvoice']) or None})

# A class's notes: comments on a course and nothing else.
OTHER = ('_ID_Person', '_ID_Booking', '_ID_Group', '_ID_Offer', '_ID_Accommodation', '_ID_Management', '_ID_Corporate', '_ID_Agency', '_ID_Institution', '_ID_Editorial',
         '_ID_Internship')
course_notes = []
for r in table('Comment', '__ID_Comment', '_ID_Course', *OTHER, 'Subject', 'Comment_1', 'Comment_2', 'UserName', 'TimeStampOfCreation'):
    body = text(r['Subject'], r['Comment_1'], r['Comment_2'])
    if first(r['_ID_Course']) and body and not any(first(r[f]) for f in OTHER):
        course_notes.append({'ref': f'Comment:{r["__ID_Comment"].strip()}', 'course': first(r['_ID_Course']), 'author': r['UserName'].strip() or None,
                             'at': stamp(r['TimeStampOfCreation']), 'body': body})

out = {'processes': processes, 'places': [{'place': p, 'log': sorted(lines, key=lambda x: (x['at'] or '', x['ref']))} for p, lines in sorted(log.items())],
       'courseNotes': course_notes}

if '--stats' in sys.argv:
    print('kinds of history line', len(processes), '· places with history', len(log), '· lines', sum(len(v) for v in log.values()),
          '· with a kind', sum(1 for v in log.values() for x in v if x['process']), '· left out', dict(skipped))
    print('notes on a course', len(course_notes), 'on', len({n['course'] for n in course_notes}), 'courses')
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
