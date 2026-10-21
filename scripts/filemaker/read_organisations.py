"""Read the agencies and companies the learner sample depends on — read-only (AppleScript).

    python3 -I scripts/filemaker/read_organisations.py --stats    # counts only
    python3 -I scripts/filemaker/read_organisations.py | node scripts/filemaker/import-organisations.mjs [--dry-run]

Rahman, 2026-10-18: focus on corporate, management, agencies — there are dependencies there.
SchoolMan's party is a `Management` record; its roles are `Agency` (a language-travel agency) and
`Corporate` (a company as client), with the name in `Institution`. This reads the agencies and
companies the sample's bookings name (`Booking._ID_Agency`, `_ID_Corporate`), the companies of the
company courses still running or ahead (`Course._ID_Corporate`), and those of the group visits
(`Group._ID_Corporate`, `_ID_Agency`; `read_groups.py` links them) and of the offers (`Offer._ID_Agency`,
`_ID_Corporate`; `read_offers.py`): the party's name, whether it is
active, an agency's agreement, its own e-mail, phone and address (the rows of no person), the people
who work there with their job title and their e-mail and phone, an agency's commission terms
(`CommissionDetail`), which sample booking each pays, and the letters that name it. Never `Management`'s comments — they hold
credentials (docs/schoolman/organisations.md).

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


def ids(value):
    return [v.strip() for v in (value or '').split('\n') if v.strip()]


def first(value):
    found = ids(value)
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def stamp(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else ''


today = date.today()
bookings = {b['__ID_Booking'].strip(): b for b in table('Booking', '__ID_Booking', '_ID_Person', '_ID_EnrolmentDone', '_ID_Agency', '_ID_Corporate', '_ID_Group',
                                                         '_ID_PaymentThird') if b['__ID_Booking'].strip()}
periods = table('DateBooking', '_ID_Booking', 'ZStartDate', 'ZEndDate')
chosen = sample_persons(bookings, periods, today)
theirs = [b for b in bookings.values() if first(b['_ID_Person']) in chosen]

agency_ids = {first(b['_ID_Agency']) for b in theirs if first(b['_ID_Agency'])}
corporate_ids = {first(b['_ID_Corporate']) for b in theirs if first(b['_ID_Corporate'])}
# The companies of company courses still running or ahead (their course is the workspace's).
course_corporates = {}
for cid, corp, end in zip(column('Course', '__ID_Course'), column('Course', '_ID_Corporate'), column('Course', 'ZEndDate')):
    if first(corp) and iso(end) and iso(end) >= today.isoformat():
        course_corporates[cid.strip()] = first(corp)
corporate_ids |= set(course_corporates.values())
# The schools, companies and agencies of the group visits, all 52 of them.
for corp, agency in zip(column('Group', '_ID_Corporate'), column('Group', '_ID_Agency')):
    if first(corp):
        corporate_ids.add(first(corp))
    if first(agency):
        agency_ids.add(first(agency))
# The agencies and companies the offers were made to (templates aside).
for corp, agency, template in zip(column('Offer', '_ID_Corporate'), column('Offer', '_ID_Agency'), column('Offer', '_ID_ActiveTemplate')):
    if first(template) == '1':
        continue
    if first(corp):
        corporate_ids.add(first(corp))
    if first(agency):
        agency_ids.add(first(agency))

agencies = {r['__ID_Agency'].strip(): r for r in table('Agency', '__ID_Agency', '_ID_Management', '_ID_Institution', '_ID_Active', 'InstitutionAgency', 'Agreement')}
corporates = {r['__ID_Corporate'].strip(): r for r in table('Corporate', '__ID_Corporate', '_ID_Management', '_ID_Active', 'HeaderCorporate.Text')}
institutions = table('Institution', '__ID_Institution', '_ID_Management', '_ID_Corporate', '_ID_Agency', 'Institution')
inst_by_id = {r['__ID_Institution'].strip(): r for r in institutions}
inst_of_corp = {first(r['_ID_Corporate']): r for r in institutions if first(r['_ID_Corporate'])}
inst_of_agency = {first(r['_ID_Agency']): r for r in institutions if first(r['_ID_Agency'])}

parties = []
for aid in sorted(agency_ids):
    a = agencies.get(aid)
    if not a:
        continue
    inst = inst_by_id.get(first(a['_ID_Institution'])) or inst_of_agency.get(aid)
    parties.append({'kind': 'agency', 'id': aid, 'management': first(a['_ID_Management']) or None, 'institution': inst['__ID_Institution'].strip() if inst else None,
                    'name': a['InstitutionAgency'].strip() or (inst['Institution'].strip() if inst else ''), 'active': first(a['_ID_Active']) != '2',
                    'agreement': a['Agreement'].strip() or None})
for cid in sorted(corporate_ids):
    c = corporates.get(cid)
    if not c:
        continue
    inst = inst_of_corp.get(cid)
    header = [x.strip() for x in (c['HeaderCorporate.Text'] or '').replace('\r', '\n').split('\n') if x.strip()]
    parties.append({'kind': 'company', 'id': cid, 'management': first(c['_ID_Management']) or None, 'institution': inst['__ID_Institution'].strip() if inst else None,
                    'name': (inst['Institution'].strip() if inst else '') or (header[0] if header else ''), 'active': first(c['_ID_Active']) != '2', 'agreement': None})

# The other parties (2026-10-18, 0061): a `Management` record that is an organisation with a relation to
# CASA (`_ID_StatusManagementReference`) — it takes interns, sends learners our way, runs an activity,
# supplies something, insures, partners in a tandem, rebuilds, or is the Förderverein — and has an
# organisation's name (`Institution`). People (colleagues, teachers, friends, tenants) stay out; so does a
# party that is already an agency, a company or a host.
RELATION = {'1': 'tandem_school', '7': 'internship', '10': 'multiplier', '15': 'activity', '19': 'supplier', '20': 'health_insurer', '22': 'association',
            '23': 'contractor'}
KIND_OF = {'tandem_school': 'school', 'health_insurer': 'public_body'}
taken = {p['management'] for p in parties if p['management']}
for name in ('Agency', 'Corporate', 'Accommodation'):
    taken |= {first(x) for x in column(name, '_ID_Management') if first(x)}
inst_of_management = {}
for r in institutions:
    if first(r['_ID_Management']) and r['Institution'].strip():
        inst_of_management.setdefault(first(r['_ID_Management']), r)
for mid, status in zip(column('Management', '__ID_Management'), column('Management', '_ID_StatusManagementReference')):
    mid = mid.strip()
    relation = next((RELATION[x] for x in ids((status or '').replace('\r', '\n')) if x in RELATION), None)
    inst = inst_of_management.get(mid)
    if relation and mid not in taken and inst:
        parties.append({'kind': KIND_OF.get(relation, 'other'), 'relation': relation, 'id': mid, 'management': mid, 'institution': inst['__ID_Institution'].strip(),
                        'name': inst['Institution'].strip(), 'active': True, 'agreement': None})


def link_keys(p):
    """The ids that point at this party from a channel or a person (another party has no agency or company id)."""
    own = set() if p.get('relation') else {('_ID_Agency' if p['kind'] == 'agency' else '_ID_Corporate', p['id'])}
    return own | ({('_ID_Institution', p['institution'])} if p['institution'] else set()) | ({('_ID_Management', p['management'])} if p['management'] else set())


owner = {}
for p in parties:
    for key in link_keys(p):
        owner.setdefault(key, p)


def party_of(row, fields=('_ID_Agency', '_ID_Corporate', '_ID_Institution', '_ID_Management')):
    for f in fields:
        for v in ids(row.get(f)):
            if (f, v) in owner:
                return owner[(f, v)]
    return None


# The party's own channels: rows that name it and no person; the newest wins.
LINKS = ('_ID_Agency', '_ID_Corporate', '_ID_Institution', '_ID_Management')
own = collections.defaultdict(lambda: {'emails': [], 'phones': [], 'addresses': []})
person_channels = collections.defaultdict(lambda: {'emails': [], 'phones': []})
for r in table('Email', '_ID_Person', *LINKS, 'Email', 'TimeStampOfCreation'):
    p = party_of(r)
    if r['Email'].strip():
        if first(r['_ID_Person']):
            person_channels[first(r['_ID_Person'])]['emails'].append((stamp(r['TimeStampOfCreation']), r['Email'].strip()))
        elif p:
            own[id(p)]['emails'].append((stamp(r['TimeStampOfCreation']), r['Email'].strip()))
for r in table('Phone', '_ID_Person', *LINKS, 'Phone', 'AreaCode', 'TimeStampOfCreation'):
    p = party_of(r)
    number = ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x)
    if number:
        if first(r['_ID_Person']):
            person_channels[first(r['_ID_Person'])]['phones'].append((stamp(r['TimeStampOfCreation']), number))
        elif p:
            own[id(p)]['phones'].append((stamp(r['TimeStampOfCreation']), number))
for r in table('Address', '_ID_Person', *LINKS, 'Street', 'HouseNumber', 'ZPostCode', 'City', 'ZCountry_1', 'TimeStampOfCreation'):
    p = party_of(r)
    if p and not first(r['_ID_Person']) and (r['Street'].strip() or r['City'].strip()):
        own[id(p)]['addresses'].append((stamp(r['TimeStampOfCreation']), {
            'street': ' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), 'postcode': r['ZPostCode'].strip(),
            'city': r['City'].strip(), 'country': r['ZCountry_1'].strip()}))

# The people who work there: `Person` rows linked to the party, with their job title.
contacts = collections.defaultdict(list)
for r in table('Person', '__ID_Person', '_ID_Agency', '_ID_Corporate', '_ID_Institution', '_ID_Management', 'ZFirstName', 'ZSurName', '_ID_GenderReference',
               'Function'):
    p = party_of(r, ('_ID_Agency', '_ID_Corporate', '_ID_Institution'))
    if not p:
        # Someone at another party, by its `Management` (an agency's or a company's people come by their ids).
        q = party_of(r, ('_ID_Management',))
        p = q if q and q.get('relation') else None
    if p and (r['ZFirstName'].strip() or r['ZSurName'].strip()):
        pid = r['__ID_Person'].strip()
        ch = person_channels.get(pid, {'emails': [], 'phones': []})
        contacts[id(p)].append({'id': pid, 'firstName': r['ZFirstName'].strip() or None, 'lastName': r['ZSurName'].strip() or None,
                                'gender': first(r['_ID_GenderReference']) or None, 'role': r['Function'].strip() or None,
                                'email': max(ch['emails'])[1] if ch['emails'] else None, 'phone': max(ch['phones'])[1] if ch['phones'] else None})

# An agency's commission: its general terms (a term on one booking is that booking's, left for the money module).
commissions = collections.defaultdict(list)
per_booking = 0
for r in table('CommissionDetail', '__ID_CommissionDetail', '_ID_Agency', '_ID_Booking', 'Percentage', '_ID_CostDetailReference', 'CommentPercentage'):
    p = owner.get(('_ID_Agency', first(r['_ID_Agency'])))
    if not p:
        continue
    if first(r['_ID_Booking']):
        per_booking += 1
        continue
    pct = r['Percentage'].strip().replace(',', '.').replace('%', '')
    try:
        value = round(float(pct), 2)
    except ValueError:
        continue
    commissions[id(p)].append({'id': r['__ID_CommissionDetail'].strip(), 'percentage': value * 100 if 0 < value <= 1 else value,
                               'chargeRef': first(r['_ID_CostDetailReference']) or None, 'note': r['CommentPercentage'].strip() or None})

# The letters that name it (the importer links those that came across with the learners).
letters_of = collections.defaultdict(list)
for lid, agency, corp in zip(column('Letter', '__ID_Letter'), column('Letter', '_ID_Agency'), column('Letter', '_ID_Corporate')):
    p = owner.get(('_ID_Agency', first(agency))) or owner.get(('_ID_Corporate', first(corp)))
    if p:
        letters_of[id(p)].append(lid.strip())

out = []
for p in parties:
    o = own[id(p)]
    out.append({**p,
                'email': max(o['emails'])[1] if o['emails'] else None,
                'phone': max(o['phones'])[1] if o['phones'] else None,
                'address': max(o['addresses'], key=lambda x: x[0])[1] if o['addresses'] else None,
                'contacts': contacts[id(p)],
                'commissions': commissions[id(p)],
                # The sample's bookings it is named on, and its company courses (another party has neither).
                # The bookings it pays — a company not where „Zahlung durch Dritte" says Nein (2026-10-21).
                'bookings': [] if p.get('relation') else sorted(
                    b['__ID_Booking'].strip() for b in theirs
                    if first(b['_ID_Agency' if p['kind'] == 'agency' else '_ID_Corporate']) == p['id'] and (p['kind'] == 'agency' or first(b['_ID_PaymentThird']) != '2')),
                'courses': sorted(c for c, corp in course_corporates.items() if p['kind'] == 'company' and not p.get('relation') and corp == p['id']),
                'letters': letters_of[id(p)]})

if '--stats' in sys.argv:
    print('other parties', dict(collections.Counter(p['relation'] for p in out if p.get('relation'))))
    print('sample learners', len(chosen), '· agencies', sum(p['kind'] == 'agency' for p in out), '· companies', sum(p['kind'] == 'company' for p in out),
          f'(of which {len(set(course_corporates.values()))} by a company course)')
    print('without a name', sum(not p['name'] for p in out), '· inactive', sum(not p['active'] for p in out), '· with e-mail', sum(bool(p['email']) for p in out),
          '· phone', sum(bool(p['phone']) for p in out), '· address', sum(bool(p['address']) for p in out), '· agreement', sum(bool(p['agreement']) for p in out))
    print('contacts', sum(len(p['contacts']) for p in out), '· with a job title', sum(bool(c['role']) for p in out for c in p['contacts']),
          '· commission terms', sum(len(p['commissions']) for p in out), f'(+{per_booking} on single bookings)', '· bookings named', sum(len(p['bookings']) for p in out),
          '· courses', sum(len(p['courses']) for p in out), '· letters naming them', sum(len(p['letters']) for p in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
