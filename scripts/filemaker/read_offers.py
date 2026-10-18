"""Read SchoolMan's offers — read-only (AppleScript).

    python3 -I scripts/filemaker/read_offers.py --stats    # counts only
    python3 -I scripts/filemaker/read_offers.py | node scripts/filemaker/import-offers.mjs [--dry-run]

Rahman, 2026-10-18: map all of FileMaker before anything is pushed; offers after the groups. Every
`Offer` that is not a template, whose recipient the workspace has: a group visit's offers, those to an
agency or a company (the organisations reader takes those parties in), and those to a learner of the
sample (`sample.py`) — through the offer's person, its booking or its pre-booking. For each: the
recipient as the offer named it (the contact person, the e-mail, the postal address), the title
(`Subject`), the asked-for dates (`DateOffer`: the stay, else the course), the lines (`CostDetailSample`:
the line type, the label and its detail in the letter's language, the quantity and the typed price), the
letters that went out with their frozen text, its comments and work log, and what became of it as far as
SchoolMan says (an invoice; the group's state). The answers are worked out in import-offers.mjs.

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


def number(value):
    """`145`, `145,00`, `1.234,50` → a float; nothing → None."""
    v = (value or '').strip().replace(' ', '').replace('€', '')
    if not v:
        return None
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return None


def people(value):
    found = [int(n) for n in re.findall(r'\d+', value or '')]
    return found[-1] if found else None


today = date.today()

# The sample's people: an offer to a learner comes across only for them.
bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Group') if b['__ID_Booking'].strip()}
chosen = sample_persons(bookings, table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate'), today)
prebookings = {r['__ID_PreBooking'].strip(): first(r['_ID_Person']) for r in table('PreBooking', '__ID_PreBooking', '_ID_Person')}

groups = {g['__ID_Group'].strip(): g for g in table('Group', '__ID_Group', 'TitleGroup', '_ID_StatusGroup', 'NumberStudent', 'NumberTeacher', 'ZStartDateAcco', 'ZEndDateAcco')}
persons = {p['__ID_Person'].strip(): p for p in table('Person', '__ID_Person', 'ZFirstName', 'ZSurName', '_ID_GenderReference')}
addresses = {a['__ID_Address'].strip(): a for a in table('Address', '__ID_Address', 'Street', 'HouseNumber', 'ZPostCode', 'City', 'ZCountry_1')}

O = ['__ID_Offer', '_ID_ActiveTemplate', '_ID_Group', '_ID_Agency', '_ID_Corporate', '_ID_Person', '_ID_Booking', '_ID_PreBooking', '_ID_Address', 'Email', 'Subject',
     '_ID_Invoice', 'UserName', 'TimeStampOfCreation', 'DateOfCreation']
offers = [o for o in table('Offer', *O) if o['__ID_Offer'].strip()]

skipped = collections.Counter()


def recipient(o):
    """Who the offer is for, as the workspace can have them: a group, an agency, a company, a sample learner."""
    if first(o['_ID_Group']) in groups:
        return 'group'
    if first(o['_ID_Agency']):
        return 'agency'
    if first(o['_ID_Corporate']):
        return 'company'
    pid = first(o['_ID_Person']) or first(bookings.get(first(o['_ID_Booking']), {}).get('_ID_Person')) or prebookings.get(first(o['_ID_PreBooking']), '')
    if pid:
        return 'learner' if pid in chosen else None
    return None


def person_of(o):
    return first(o['_ID_Person']) or first(bookings.get(first(o['_ID_Booking']), {}).get('_ID_Person')) or prebookings.get(first(o['_ID_PreBooking']), '') or None


kept = {}
for o in offers:
    if first(o['_ID_ActiveTemplate']) == '1':
        skipped['template'] += 1
        continue
    who = recipient(o)
    if not who:
        skipped['recipient not here'] += 1
        continue
    kept[o['__ID_Offer'].strip()] = (o, who)

# The asked-for periods of the offer: 1 Kurs, 2 Unterkunft.
periods = collections.defaultdict(dict)
for r in table('DateOffer', '_ID_Offer', '_ID_TypeOfferReference', 'ZStartDate', 'ZEndDate'):
    oid = first(r['_ID_Offer'])
    if oid in kept and iso(r['ZStartDate']):
        periods[oid].setdefault(first(r['_ID_TypeOfferReference']), (iso(r['ZStartDate']), iso(r['ZEndDate'])))

# The lines, in their typed order.
lines = collections.defaultdict(list)
for r in table('CostDetailSample', '__ID_CostDetailSample', '_ID_Offer', '_ID_CostDetailReference', 'CostDetail_1', 'CostDetail_2', 'CostDetailComment_1',
               'CostDetailComment_2', 'Unit', 'CostGrossUnit', '_ID_Sort'):
    oid = first(r['_ID_Offer'])
    if oid in kept:
        lines[oid].append({'id': r['__ID_CostDetailSample'].strip(), 'ref': first(r['_ID_CostDetailReference']) or None,
                           'label': {'de': r['CostDetail_1'].strip(), 'en': r['CostDetail_2'].strip()},
                           'detail': {'de': r['CostDetailComment_1'].strip(), 'en': r['CostDetailComment_2'].strip()},
                           'quantity': number(r['Unit']), 'unitAmount': number(r['CostGrossUnit']), 'sort': number(r['_ID_Sort'])})
for oid in lines:
    lines[oid].sort(key=lambda l: (l['sort'] is None, l['sort'] or 0, int(l['id']) if l['id'].isdigit() else 0))

# The letters that went out, with their text.
letters = collections.defaultdict(list)
L = ['__ID_Letter', '_ID_Offer', 'ScriptName', 'ScriptParameter', 'Subject', 'AddressHeader', 'Date_LetterSent', 'DateOfEmission', 'TimeStampOfCreation', 'UserName']
lt = [dict(zip(L, r)) for r in zip(*[column('Letter', f) for f in L])]
for r, body in zip(lt, column_chunked('Letter', 'FreeField', 1000)):
    oid = first(r['_ID_Offer'])
    if oid in kept:
        letters[oid].append({'ref': r['__ID_Letter'].strip(), 'script': r['ScriptName'].strip() or None,
                             'lang': 'en' if r['ScriptParameter'].strip() in ('En', '2') else 'de' if r['ScriptParameter'].strip() else None,
                             'subject': r['Subject'].strip() or None, 'header': r['AddressHeader'].strip() or None,
                             'sent': stamp(r['Date_LetterSent']) or stamp(r['DateOfEmission']) or stamp(r['TimeStampOfCreation']), 'author': r['UserName'].strip() or None,
                             'text': body})

# What is said about it: comments and work-log lines on the offer alone (those on a learner, a booking or
# a group come with them).
notes = collections.defaultdict(list)
for r in table('Comment', '__ID_Comment', '_ID_Offer', '_ID_Person', '_ID_Booking', '_ID_Group', 'Subject', 'Comment_1', 'Comment_2', 'UserName', 'TimeStampOfCreation'):
    oid = first(r['_ID_Offer'])
    body = text(r['Subject'], r['Comment_1'], r['Comment_2'])
    if oid in kept and body and not (first(r['_ID_Person']) or first(r['_ID_Booking']) or first(r['_ID_Group'])):
        notes[oid].append({'ref': f'Comment:{r["__ID_Comment"].strip()}', 'author': r['UserName'].strip() or None, 'at': stamp(r['TimeStampOfCreation']), 'body': body})
log = collections.defaultdict(list)
W = ['__ID_Workflow', '_ID_Offer', '_ID_Person', '_ID_Booking', '_ID_Group', 'UserName', 'TimeStampOfCreation']
wf = [dict(zip(W, r)) for r in zip(*[column('WorkFlow', f) for f in W])]
wf_text, wf_comment = column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'CommentWorkflow', 5000)
for r, line, comment in zip(wf, wf_text, wf_comment):
    oid = first(r['_ID_Offer'])
    if oid in kept and text(line, comment) and not (first(r['_ID_Person']) or first(r['_ID_Booking']) or first(r['_ID_Group'])):
        log[oid].append({'ref': r['__ID_Workflow'].strip(), 'author': r['UserName'].strip() or None, 'at': stamp(r['TimeStampOfCreation']), 'text': text(line, comment)})

out = []
for oid, (o, who) in kept.items():
    g = groups.get(first(o['_ID_Group']))
    contact = persons.get(first(o['_ID_Person'])) if who != 'learner' else None
    learner = person_of(o) if who == 'learner' else None
    a = addresses.get(first(o['_ID_Address']))
    # The stay asked for, else the course; a group's own dates when the offer has none.
    span = periods[oid].get('2') or periods[oid].get('1') or ((iso(g['ZStartDateAcco']), iso(g['ZEndDateAcco'])) if g else (None, None))
    out.append({
        'id': oid,
        'recipient': who,
        'group': first(o['_ID_Group']) or None,
        'groupName': g['TitleGroup'].strip() if g else None,
        'groupStatus': first(g['_ID_StatusGroup']) if g else None,
        'participants': people(g['NumberStudent']) if g else None,
        'escorts': people(g['NumberTeacher']) if g else None,
        'agency': first(o['_ID_Agency']) or None,
        'company': first(o['_ID_Corporate']) or None,
        'person': learner,
        'contact': {'firstName': contact['ZFirstName'].strip() or None, 'lastName': contact['ZSurName'].strip() or None,
                    'gender': first(contact['_ID_GenderReference']) or None} if contact else None,
        'email': o['Email'].strip() or None,
        'address': {'street': ' '.join(x for x in (a['Street'].strip(), a['HouseNumber'].strip()) if x), 'postcode': a['ZPostCode'].strip(), 'city': a['City'].strip(),
                    'country': a['ZCountry_1'].strip()} if a else None,
        'title': o['Subject'].strip() or None,
        'arrival': span[0],
        'departure': span[1],
        'invoiced': bool(first(o['_ID_Invoice'])),
        'created': stamp(o['TimeStampOfCreation']) or stamp(o['DateOfCreation']),
        'createdBy': o['UserName'].strip() or None,
        'lines': lines[oid],
        'letters': sorted(letters[oid], key=lambda x: (x['sent'] or '', x['ref'])),
        'notes': notes[oid],
        'log': log[oid],
    })

if '--stats' in sys.argv:
    by = collections.Counter(o['recipient'] for o in out)
    print('offers', len(offers), '· read', len(out), '(' + ', '.join(f'{k} {v}' for k, v in sorted(by.items())) + ')', '· left out', dict(skipped))
    print('lines', sum(len(o['lines']) for o in out), '· without a price', sum(1 for o in out for l in o['lines'] if l['unitAmount'] is None),
          '· most lines on one', max((len(o['lines']) for o in out), default=0), '· without lines', sum(not o['lines'] for o in out))
    print('letters', sum(len(o['letters']) for o in out), 'on', sum(bool(o['letters']) for o in out), 'offers · invoiced', sum(o['invoiced'] for o in out),
          '· with dates', sum(bool(o['arrival']) for o in out), '· comments', sum(len(o['notes']) for o in out), '· work log', sum(len(o['log']) for o in out))
    print('by year', sorted(collections.Counter((o['created'] or '')[:4] for o in out).items()))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
