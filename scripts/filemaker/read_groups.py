"""Read SchoolMan's group visits — read-only (AppleScript).

    python3 -I scripts/filemaker/read_groups.py --stats    # counts only
    python3 -I scripts/filemaker/read_groups.py | node scripts/filemaker/import-groups.mjs [--dry-run]

Rahman, 2026-10-18: map all of FileMaker before anything is pushed; group visits after the
organisations. All 52 `Group` records: the title, whether it is on (`_ID_StatusGroup`: 1 ja, 2 nein,
4 u.B.), the company or school (`_ID_Corporate`) and the agency (`_ID_Agency`), the course type, the
level (`_ID_Level`, SchoolMan's band number: 1 A1 … 5 C1, 3,5 B1+), where they come from, how many
learners and escorts (`NumberStudent`, `NumberTeacher` — a number, or a range typed as text), their
ages (`AgeStudent`, text), the stay (`ZStartDateAcco`–`ZEndDateAcco`) and the lessons
(`ZStartDateTuition`–`ZEndDateTuition`, else the span of its participants' booked periods), how they
arrive (`CommentArrival_Departure*`); which bookings and courses are the group's; the comments about it
and its work log. The participants themselves come with the learners (`sample.py` takes this year's
groups in). Not read: offers, letters, invoices and bed reservations (`DateRent`) — see
docs/schoolman/groups.md.

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column, column_chunked  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def ids(value):
    return [v.strip() for v in (value or '').split('\n') if v.strip()]


def first(value):
    found = ids(value)
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def stamp(value):
    """`15.03.2021 14:05:09` → `2021-03-15T14:05:09`; a date alone at noon."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


def numbers(value):
    """`30` → (30, 30); `4-6` or `4 – 6` → (4, 6); nothing → (None, None)."""
    found = [int(n) for n in re.findall(r'\d+', value or '')]
    return (found[0], found[-1]) if found else (None, None)


STATUS = {'1': 'confirmed', '2': 'cancelled', '4': 'open'}
LEVEL = {'1': 'A1', '2': 'A2', '3': 'B1', '3,5': 'B1+', '3.5': 'B1+', '4': 'B2', '5': 'C1', '6': 'C2'}

flags = {r['__ID_Flag'].strip(): r for r in table('Flag', '__ID_Flag', 'CountryLong_1')}


def country(flag_id):
    m = re.match(r'\s*([A-Z]{2})\s*-', (flags.get(flag_id) or {}).get('CountryLong_1') or '')
    return m.group(1) if m else None


G = ['__ID_Group', 'TitleGroup', '_ID_StatusGroup', '_ID_Platform', '_ID_CourseTypeReference', '_ID_Level', '_ID_Country', 'NumberStudent', 'NumberTeacher',
     'AgeStudent', 'ZStartDateAcco', 'ZEndDateAcco', 'ZStartDateTuition', 'ZEndDateTuition', 'CommentArrival_Departure_Short', 'CommentArrival_Departure',
     '_ID_Corporate', '_ID_Agency', 'UserName', 'TimeStampOfCreation']
groups = [g for g in table('Group', *G) if g['__ID_Group'].strip()]
known = {g['__ID_Group'].strip() for g in groups}

# The participants' bookings, and the span of their booked periods (the lessons, when the group has no dates).
bookings = collections.defaultdict(list)
group_of_booking = {}
for bid, gid in zip(column('Booking', '__ID_Booking'), column('Booking', '_ID_Group')):
    if first(gid) in known:
        bookings[first(gid)].append(bid.strip())
        group_of_booking[bid.strip()] = first(gid)
span = collections.defaultdict(list)
for bid, s, e in zip(column('DateBooking', '_ID_Booking'), column('DateBooking', 'ZStartDate'), column('DateBooking', 'ZEndDate')):
    g = group_of_booking.get(first(bid))
    if g and iso(s) and iso(e):
        span[g].append((iso(s), iso(e)))

# The courses it has to itself.
courses = collections.defaultdict(list)
for cid, gid in zip(column('Course', '__ID_Course'), column('Course', '_ID_Group')):
    if first(gid) in known:
        courses[first(gid)].append(cid.strip())

# What SchoolMan says about it: the comments on the group (not those on one of its people, which come
# with the learner) and its work log.
notes = collections.defaultdict(list)
for r in table('Comment', '__ID_Comment', '_ID_Group', '_ID_Person', 'Subject', 'Comment_1', 'Comment_2', 'UserName', 'TimeStampOfCreation'):
    body = text(r['Subject'], r['Comment_1'], r['Comment_2'])
    if first(r['_ID_Group']) in known and not first(r['_ID_Person']) and body:
        notes[first(r['_ID_Group'])].append({'ref': f'Comment:{r["__ID_Comment"].strip()}', 'author': r['UserName'].strip() or None, 'at': stamp(r['TimeStampOfCreation']),
                                             'body': body})
log = collections.defaultdict(list)
W = ['__ID_Workflow', '_ID_Group', '_ID_Person', 'UserName', 'TimeStampOfCreation']
wf = [dict(zip(W, r)) for r in zip(*[column('WorkFlow', f) for f in W])]
wf_text, wf_comment = column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'CommentWorkflow', 5000)
for r, line, comment in zip(wf, wf_text, wf_comment):
    if first(r['_ID_Group']) in known and not first(r['_ID_Person']) and text(line, comment):
        log[first(r['_ID_Group'])].append({'ref': r['__ID_Workflow'].strip(), 'author': r['UserName'].strip() or None, 'at': stamp(r['TimeStampOfCreation']),
                                           'text': text(line, comment)})

out = []
for g in groups:
    gid = g['__ID_Group'].strip()
    learners, learners_to = numbers(g['NumberStudent'])
    escorts, escorts_to = numbers(g['NumberTeacher'])
    age_from, age_to = numbers(g['AgeStudent'])
    booked = span.get(gid)
    course_from, course_to = iso(g['ZStartDateTuition']), iso(g['ZEndDateTuition'])
    if not course_from and booked:
        course_from, course_to = min(s for s, _ in booked), max(e for _, e in booked)
    out.append({
        'id': gid,
        'name': g['TitleGroup'].strip(),
        'status': STATUS.get(first(g['_ID_StatusGroup']), 'open'),
        'company': first(g['_ID_Corporate']) or None,
        'agency': first(g['_ID_Agency']) or None,
        'courseType': first(g['_ID_CourseTypeReference']) or None,
        'level': LEVEL.get(first(g['_ID_Level'])),
        'country': country(first(g['_ID_Country'])),
        # A range typed as the number („4-6") is planned at its top; the range stays in the note.
        'participants': learners_to,
        'escorts': escorts_to,
        'ranges': text(f"Teilnehmende laut SchoolMan: {g['NumberStudent'].strip()}" if learners != learners_to else '',
                       f"Begleitpersonen laut SchoolMan: {g['NumberTeacher'].strip()}" if escorts != escorts_to else ''),
        'ageFrom': age_from,
        'ageTo': age_to,
        'arrival': iso(g['ZStartDateAcco']),
        'departure': iso(g['ZEndDateAcco']),
        'courseFrom': course_from,
        'courseTo': course_to if course_from else None,
        'travel': text(g['CommentArrival_Departure_Short'], g['CommentArrival_Departure']) or None,
        'created': stamp(g['TimeStampOfCreation']),
        'createdBy': g['UserName'].strip() or None,
        'bookings': sorted(bookings[gid]),
        'courses': sorted(courses[gid]),
        'notes': notes[gid],
        'log': log[gid],
    })

if '--stats' in sys.argv:
    by = collections.Counter(g['status'] for g in out)
    print('groups', len(out), '·', ', '.join(f'{k} {v}' for k, v in sorted(by.items())), '· without a name', sum(not g['name'] for g in out))
    print('with a company', sum(bool(g['company']) for g in out), '· an agency', sum(bool(g['agency']) for g in out), '· a level', sum(bool(g['level']) for g in out),
          '· a country', sum(bool(g['country']) for g in out), '· learners', sum(g['participants'] is not None for g in out), '· ages', sum(g['ageFrom'] is not None for g in out))
    print('stay dates', sum(bool(g['arrival']) for g in out), '· lesson dates', sum(bool(g['courseFrom']) for g in out), '· travel', sum(bool(g['travel']) for g in out))
    print('bookings', sum(len(g['bookings']) for g in out), '· courses', sum(len(g['courses']) for g in out), '· comments', sum(len(g['notes']) for g in out),
          '· work log', sum(len(g['log']) for g in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
