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

2026-10-27 (completeness review, 0092): every internship host (SchoolMan's `Internship` role, with its own
active flag — the status route found 13 of 56), the companies that commission courses (`Contractor`), whether
another party is still active (`Management._ID_Active`), who the main contact is (`Management._ID_ContactPerson`,
else `Agency._ID_ContactAgent`, else `Corporate._ID_Contact_Person`), the note on the party's own e-mail
address, its own bank accounts (no person, no host), and the address's country by its `Flag` id.

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

agencies = {r['__ID_Agency'].strip(): r for r in table('Agency', '__ID_Agency', '_ID_Management', '_ID_Institution', '_ID_Active', 'InstitutionAgency', 'Agreement',
                                                       '_ID_ContactAgent')}
corporates = {r['__ID_Corporate'].strip(): r for r in table('Corporate', '__ID_Corporate', '_ID_Management', '_ID_Active', 'HeaderCorporate.Text', '_ID_Contact_Person')}
managements = {r['__ID_Management'].strip(): r for r in table('Management', '__ID_Management', '_ID_StatusManagementReference', '_ID_Active', '_ID_ContactPerson')}
corporate_of_management = {first(c['_ID_Management']): cid for cid, c in corporates.items() if first(c['_ID_Management'])}
# A company that commissions courses (`Contractor`, „Auftraggeber") comes across with that relation; so does a
# company that takes interns (the `Internship` role on its party). Every internship host is read below.
internships = {first(r['_ID_Management']): r for r in table('Internship', '__ID_Internship', '_ID_Management', '_ID_Active') if first(r['_ID_Management'])}
also_relation = {}
for corp, active in zip(column('Contractor', '_ID_Corporate'), column('Contractor', '_ID_Active')):
    if first(corp) in corporates and first(active) != '2':
        corporate_ids.add(first(corp))
        also_relation.setdefault(first(corp), 'commissioning_body')
for mid in internships:
    if mid in corporate_of_management:
        corporate_ids.add(corporate_of_management[mid])
        also_relation.setdefault(corporate_of_management[mid], 'internship')
institutions = table('Institution', '__ID_Institution', '_ID_Management', '_ID_Corporate', '_ID_Agency', 'Institution')
inst_by_id = {r['__ID_Institution'].strip(): r for r in institutions}
inst_of_corp = {first(r['_ID_Corporate']): r for r in institutions if first(r['_ID_Corporate'])}
inst_of_agency = {first(r['_ID_Agency']): r for r in institutions if first(r['_ID_Agency'])}

def main_contact(management, *older):
    """The party's main contact person: `Management._ID_ContactPerson` since 2023, else the role's own older field."""
    return first(managements.get(management or '', {}).get('_ID_ContactPerson')) or next((first(x) for x in older if first(x)), None) or None


parties = []
for aid in sorted(agency_ids):
    a = agencies.get(aid)
    if not a:
        continue
    inst = inst_by_id.get(first(a['_ID_Institution'])) or inst_of_agency.get(aid)
    parties.append({'kind': 'agency', 'id': aid, 'management': first(a['_ID_Management']) or None, 'institution': inst['__ID_Institution'].strip() if inst else None,
                    'name': a['InstitutionAgency'].strip() or (inst['Institution'].strip() if inst else ''), 'active': first(a['_ID_Active']) != '2',
                    'agreement': a['Agreement'].strip() or None, 'main': main_contact(first(a['_ID_Management']), a['_ID_ContactAgent'])})
for cid in sorted(corporate_ids):
    c = corporates.get(cid)
    if not c:
        continue
    inst = inst_of_corp.get(cid)
    header = [x.strip() for x in (c['HeaderCorporate.Text'] or '').replace('\r', '\n').split('\n') if x.strip()]
    parties.append({'kind': 'company', 'id': cid, 'management': first(c['_ID_Management']) or None, 'institution': inst['__ID_Institution'].strip() if inst else None,
                    'name': (inst['Institution'].strip() if inst else '') or (header[0] if header else ''), 'active': first(c['_ID_Active']) != '2', 'agreement': None,
                    'main': main_contact(first(c['_ID_Management']), c['_ID_Contact_Person']), 'alsoRelation': also_relation.get(cid)})

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
for mid, m in managements.items():
    relation = next((RELATION[x] for x in ids((m['_ID_StatusManagementReference'] or '').replace('\r', '\n')) if x in RELATION), None)
    # An internship host by its `Internship` role (2026-10-27): 56 parties, of which only 9 carry status 7.
    internship = internships.get(mid)
    if internship:
        relation = 'internship'
    inst = inst_of_management.get(mid)
    if relation and mid not in taken and inst:
        # Still active: the role's own flag for an internship host, else the party's (`_ID_Active`, 2 = no; empty = yes).
        active = first((internship or m)['_ID_Active']) != '2'
        parties.append({'kind': KIND_OF.get(relation, 'other'), 'relation': relation, 'id': mid, 'management': mid, 'institution': inst['__ID_Institution'].strip(),
                        'name': inst['Institution'].strip(), 'active': active, 'agreement': None, 'main': main_contact(mid)})


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
for r in table('Email', '_ID_Person', *LINKS, 'Email', 'TimeStampOfCreation', 'CommentUseMail'):
    p = party_of(r)
    if r['Email'].strip():
        if first(r['_ID_Person']):
            person_channels[first(r['_ID_Person'])]['emails'].append((stamp(r['TimeStampOfCreation']), r['Email'].strip()))
        elif p:
            # With the note on it (`CommentUseMail`, 2026-10-27).
            own[id(p)]['emails'].append((stamp(r['TimeStampOfCreation']), r['Email'].strip(), r['CommentUseMail'].strip() or None))
for r in table('Phone', '_ID_Person', *LINKS, 'Phone', 'AreaCode', 'TimeStampOfCreation'):
    p = party_of(r)
    number = ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x)
    if number:
        if first(r['_ID_Person']):
            person_channels[first(r['_ID_Person'])]['phones'].append((stamp(r['TimeStampOfCreation']), number))
        elif p:
            own[id(p)]['phones'].append((stamp(r['TimeStampOfCreation']), number))
# A country by its `Flag` id („EG - Egypt" → EG; else its German name), not the address's label copy.
flags = {r['__ID_Flag'].strip(): r for r in table('Flag', '__ID_Flag', 'CountryLong_1', 'Country_1')}


def country_of(flag_id):
    f = flags.get(flag_id)
    if not f:
        return ''
    m = re.match(r'\s*([A-Z]{2})\s*-', f['CountryLong_1'] or '')
    return m.group(1) if m else f['Country_1'].strip()


for r in table('Address', '_ID_Person', *LINKS, 'Street', 'HouseNumber', 'ZPostCode', 'City', '_ID_Country', 'TimeStampOfCreation'):
    p = party_of(r)
    if p and not first(r['_ID_Person']) and (r['Street'].strip() or r['City'].strip()):
        own[id(p)]['addresses'].append((stamp(r['TimeStampOfCreation']), {
            'street': ' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), 'postcode': r['ZPostCode'].strip(),
            'city': r['City'].strip(), 'country': country_of(first(r['_ID_Country']))}))

# The party's own bank accounts: an account on its `Management` with no person (or one SchoolMan deleted) and no
# host or colleague on it (2026-10-27). A person's account stays the person's.
person_ids = {x.strip() for x in column('Person', '__ID_Person')}
banks_of = collections.defaultdict(list)
for r in table('BankAccount', '__ID_BankAccount', '_ID_Person', '_ID_Management', '_ID_Accommodation', '_ID_StaffMember', 'AccountOwner', 'IBAN.Text', 'SWIFT.Text',
               'BIC', 'BankName', 'Comment', 'AddressAccountOwner', 'AddressBank'):
    p = owner.get(('_ID_Management', first(r['_ID_Management'])))
    if not p or first(r['_ID_Person']) in person_ids or first(r['_ID_Accommodation']) or first(r['_ID_StaffMember']) or not r['IBAN.Text'].strip():
        continue
    banks_of[id(p)].append({'ref': r['__ID_BankAccount'].strip(), 'holder': r['AccountOwner'].strip() or None, 'iban': r['IBAN.Text'].strip(),
                            'bic': (r['SWIFT.Text'] or r['BIC']).strip() or None, 'bank': r['BankName'].strip() or None, 'note': r['Comment'].strip() or None,
                            'holderAddress': r['AddressAccountOwner'].strip() or None, 'bankAddress': r['AddressBank'].strip() or None})

# The people who work there: `Person` rows linked to the party, with their job title.
contacts = collections.defaultdict(list)
main_of = {p['main']: p for p in parties if p.get('main')}
for r in table('Person', '__ID_Person', '_ID_Agency', '_ID_Corporate', '_ID_Institution', '_ID_Management', 'ZFirstName', 'ZSurName', '_ID_GenderReference',
               'Function'):
    p = party_of(r, ('_ID_Agency', '_ID_Corporate', '_ID_Institution'))
    if not p:
        # Someone at another party, by its `Management` (an agency's or a company's people come by their ids).
        q = party_of(r, ('_ID_Management',))
        p = q if q and q.get('relation') else None
    # The party's main contact is its contact even when only the party names them (2026-10-27).
    p = p or main_of.get(r['__ID_Person'].strip())
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

# Its history (2026-10-26, mapping review §8): the work-log lines that name it, about itself or about a
# learner the workspace holds. A line about someone it does not hold stays in SchoolMan.
def moment(value):
    """`15.03.2021 14:05:09` → `2021-03-15T14:05:09`; a date alone at noon."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return None
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


log_of = collections.defaultdict(list)
wf = table('WorkFlow', '__ID_Workflow', '_ID_Person', '_ID_Booking', *LINKS, 'UserName', 'TimeStampOfCreation')
for r, line, comment in zip(wf, column_chunked('WorkFlow', 'Workflow_1', 5000), column_chunked('WorkFlow', 'CommentWorkflow', 5000)):
    p = party_of(r)
    if not p:
        continue
    person = first(r['_ID_Person']) or first(bookings.get(first(r['_ID_Booking']), {}).get('_ID_Person'))
    body = '\n'.join(x.strip() for x in (line, comment) if x and x.strip())
    if body and (not person or person in chosen):
        log_of[id(p)].append({'ref': r['__ID_Workflow'].strip(), 'at': moment(r['TimeStampOfCreation']), 'author': r['UserName'].strip() or None, 'text': body[:4000]})

out = []
for p in parties:
    o = own[id(p)]
    newest_email = max(o['emails'], key=lambda x: (x[0], x[1])) if o['emails'] else None
    out.append({**p,
                'email': newest_email[1] if newest_email else None,
                'emailNote': newest_email[2] if newest_email else None,
                'banks': banks_of[id(p)],
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
                'letters': letters_of[id(p)],
                'log': sorted(log_of[id(p)], key=lambda x: (x['at'] or '', x['ref']))})

if '--stats' in sys.argv:
    print('other parties', dict(collections.Counter(p['relation'] for p in out if p.get('relation'))))
    print('sample learners', len(chosen), '· agencies', sum(p['kind'] == 'agency' for p in out), '· companies', sum(p['kind'] == 'company' for p in out),
          f'(of which {len(set(course_corporates.values()))} by a company course)')
    print('without a name', sum(not p['name'] for p in out), '· inactive', sum(not p['active'] for p in out), '· with e-mail', sum(bool(p['email']) for p in out),
          '· phone', sum(bool(p['phone']) for p in out), '· address', sum(bool(p['address']) for p in out), '· agreement', sum(bool(p['agreement']) for p in out))
    print('contacts', sum(len(p['contacts']) for p in out), '· with a job title', sum(bool(c['role']) for p in out for c in p['contacts']),
          '· commission terms', sum(len(p['commissions']) for p in out), f'(+{per_booking} on single bookings)', '· bookings named', sum(len(p['bookings']) for p in out),
          '· courses', sum(len(p['courses']) for p in out), '· letters naming them', sum(len(p['letters']) for p in out),
          '· history lines', sum(len(p['log']) for p in out))
    print('companies also', dict(collections.Counter(p.get('alsoRelation') for p in out if p.get('alsoRelation'))), '· with a main contact', sum(bool(p['main']) for p in out),
          '(among its contacts', sum(bool(p['main']) and any(c['id'] == p['main'] for c in p['contacts']) for p in out), ') · e-mail notes', sum(bool(p['emailNote']) for p in out),
          '· own bank accounts', sum(len(p['banks']) for p in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
