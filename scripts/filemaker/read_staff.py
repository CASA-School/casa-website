"""Read SchoolMan's active staff for the workspace's staff register — read-only (AppleScript).

    python3 -I scripts/filemaker/read_staff.py --stats      # counts only, nothing personal
    python3 -I scripts/filemaker/read_staff.py | node scripts/filemaker/import-staff.mjs

Rahman, 2026-10-17: the 56 colleagues SchoolMan marks as active staff, with everything — person,
contact, address, roles, contracts and hours, examiner licences, and the tax and insurance numbers
and bank details (which only `staff_private` sees in the workspace). Nothing else leaves FileMaker.

The JSON goes to stdout and straight into the importer: no personal data is written to a file.
`--stats` prints counts and the vocabularies' ids only.
"""
import collections, json, os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def ids(value):
    """A FileMaker key may hold several ids, one per line."""
    return [v.strip() for v in (value or '').split('\n') if v.strip()]


def iso(value):
    """`15.03.2021` (or a timestamp starting with it) → `2021-03-15`."""
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def split_name(forward, backward):
    """SchoolMan's search fields hold the whole name twice, `Meike Große Hundrup` and `Große Hundrup Meike`:
    the first name is what the second puts last."""
    words = forward.split()
    for i in range(1, len(words)):
        if ' '.join(words[i:] + words[:i]) == ' '.join(backward.split()):
            return ' '.join(words[:i]), ' '.join(words[i:])
    return (' '.join(words[:-1]), words[-1]) if len(words) > 1 else (forward.strip(), '')


def first(value):
    found = ids(value)
    return found[0] if found else ''


staff = [s for s in table('StaffMember', '__ID_StaffMember', '_ID_Person', '_ID_ActiveStaff', '_ID_ActiveTeacher', '_ID_ActiveAdministration', 'TeacherFirstName.Surname.Short',
                          'SearchFieldTeacherFirstName', 'SearchFieldTeacherSurName',
                          # The internal section (2026-10-22): course types taught, weekdays, times of day.
                          '_ID_CourseTypeReference', '_ID_WeekDay', '_ID_DayTimeReference')
         if first(s['_ID_ActiveStaff']) == '1']
staff_ids = {s['__ID_StaffMember'] for s in staff}
person_ids = {first(s['_ID_Person']) for s in staff if first(s['_ID_Person'])}


def mine(row):
    """The staff member a row belongs to: by its staff id, else by its person."""
    for sid in ids(row.get('_ID_StaffMember')):
        if sid in staff_ids:
            return sid
    for pid in ids(row.get('_ID_Person')):
        for s in staff:
            if first(s['_ID_Person']) == pid:
                return s['__ID_StaffMember']
    return None


persons = {p['__ID_Person']: p for p in table('Person', '__ID_Person', 'ZFirstName', 'ZSurName', 'ZSurName2', 'NickName', '_ID_GenderReference', 'DateOfBirth',
                                               'BirthPlace', 'CountryBirth_1', 'NumberTaxe', 'NumberHealthInsurance', 'NumberAgeInsurance') if p['__ID_Person'] in person_ids}
emails = [r for r in table('Email', '_ID_Person', '_ID_StaffMember', 'Email', '_ID_Use', 'TimeStampOfCreation') if mine(r)]
phones = [r for r in table('Phone', '_ID_Person', '_ID_StaffMember', 'Phone', 'AreaCode', '_ID_Use', 'TimeStampOfCreation') if mine(r)]
addresses = [r for r in table('Address', '_ID_Person', '_ID_StaffMember', 'Street', 'HouseNumber', 'ZPostCode', 'City', 'ZCountry_1', 'TimeStampOfCreation') if mine(r)]
banks = [r for r in table('BankAccount', '_ID_Person', '_ID_StaffMember', 'AccountOwner', 'IBAN.Text', 'SWIFT.Text', 'BIC', 'BankName', 'TimestampOfCreation') if mine(r)]
purviews = [r for r in table('Purview', '_ID_StaffMember', '_ID_Person', '_ID_PurviewReference', '_ID_Active', 'Z_StartDate', 'Z_EndDate') if mine(r)]
contracts = [r for r in table('DateTargetWorkTime', '_ID_StaffMember', '_ID_Person', 'ZStartDate', 'ZEndDate', 'TargetWorkTime.Week', 'TargetWorkTime.Teaching.Week', '_ID_StatusSalarylReference') if mine(r)]
licences = [r for r in table('DateValidity', '_ID_StaffMember', '_ID_Person', '_ID_LicenseReference', 'LicenseNumber', 'ZStartDate', 'ZEndDate') if first(r['_ID_LicenseReference']) and mine(r)]

today = date.today().isoformat()

if '--stats' in sys.argv:
    print('active staff', len(staff), '· with a person', len(person_ids), '· persons found', len(persons))
    print('teachers', sum(first(s['_ID_ActiveTeacher']) == '1' for s in staff), '· office', sum(first(s['_ID_ActiveAdministration']) == '1' for s in staff))
    print('emails', len(emails), 'for', len({mine(r) for r in emails}), '· uses', collections.Counter(first(r['_ID_Use']) for r in emails).most_common())
    print('phones', len(phones), 'for', len({mine(r) for r in phones}), '· uses', collections.Counter(first(r['_ID_Use']) for r in phones).most_common())
    print('addresses', len(addresses), 'for', len({mine(r) for r in addresses}))
    print('bank accounts', len(banks), 'for', len({mine(r) for r in banks}), '· with IBAN', sum(bool(r['IBAN.Text'].strip()) for r in banks))
    print('tax ids', sum(bool(p['NumberTaxe'].strip()) for p in persons.values()), '· health', sum(bool(p['NumberHealthInsurance'].strip()) for p in persons.values()),
          '· pension', sum(bool(p['NumberAgeInsurance'].strip()) for p in persons.values()), '· birth dates', sum(bool(iso(p['DateOfBirth'])) for p in persons.values()))
    print('gender ids', collections.Counter(first(p['_ID_GenderReference']) for p in persons.values()).most_common())
    print('purviews', len(purviews), 'for', len({mine(r) for r in purviews}), '· active flag', collections.Counter(first(r['_ID_Active']) for r in purviews).most_common(),
          '· ended', sum(bool(iso(r['Z_EndDate'])) and iso(r['Z_EndDate']) < today for r in purviews), '· kinds', collections.Counter(first(r['_ID_PurviewReference']) for r in purviews).most_common())
    print('contracts', len(contracts), 'for', len({mine(r) for r in contracts}), '· kinds', collections.Counter(first(r['_ID_StatusSalarylReference']) for r in contracts).most_common(),
          '· with start', sum(bool(iso(r['ZStartDate'])) for r in contracts), '· ended', sum(bool(iso(r['ZEndDate'])) and iso(r['ZEndDate']) < today for r in contracts),
          '· running', sum((not iso(r['ZEndDate']) or iso(r['ZEndDate']) >= today) for r in contracts))
    per = collections.Counter(mine(r) for r in contracts if not iso(r['ZEndDate']) or iso(r['ZEndDate']) >= today)
    print('running contracts per person', collections.Counter(per.values()).most_common())
    print('licences', len(licences), 'for', len({mine(r) for r in licences}), '· kinds', collections.Counter(first(r['_ID_LicenseReference']) for r in licences).most_common(),
          '· with number', sum(bool(r['LicenseNumber'].strip()) for r in licences), '· ended', sum(bool(iso(r['ZEndDate'])) and iso(r['ZEndDate']) < today for r in licences))
    sys.exit(0)

out = []
for s in staff:
    sid = s['__ID_StaffMember']
    p = persons.get(first(s['_ID_Person']), {})
    rows = lambda items: [r for r in items if mine(r) == sid]
    out.append({
        'staffId': sid,
        'personId': first(s['_ID_Person']) or None,
        'teacher': first(s['_ID_ActiveTeacher']) == '1',
        'office': first(s['_ID_ActiveAdministration']) == '1',
        # SchoolMan's codes as they are: course types (1 Intensivkurs, 2 Abendkurs …), weekdays (2 Monday … 6
        # Friday), times of day (2 vormittags, 4 nachmittags, 5 abends); import-staff.mjs names them.
        'teaching': {'active': first(s['_ID_ActiveTeacher']) == '1', 'kinds': ids(s['_ID_CourseTypeReference']),
                     'weekdays': ids(s['_ID_WeekDay']), 'dayparts': ids(s['_ID_DayTimeReference'])},
        'shortName': s['TeacherFirstName.Surname.Short'].strip() or None,
        # Six colleagues have no person in SchoolMan: their names are only on the staff row, in its search fields.
        'firstName': p.get('ZFirstName', '').strip() if p else split_name(s['SearchFieldTeacherFirstName'], s['SearchFieldTeacherSurName'])[0],
        'lastName': p.get('ZSurName', '').strip() if p else split_name(s['SearchFieldTeacherFirstName'], s['SearchFieldTeacherSurName'])[1],
        'secondLastName': p.get('ZSurName2', '').strip() or None,
        'nickname': p.get('NickName', '').strip() or None,
        'gender': first(p.get('_ID_GenderReference')) or None,
        'birthDate': iso(p.get('DateOfBirth')),
        'birthPlace': p.get('BirthPlace', '').strip() or None,
        'birthCountry': p.get('CountryBirth_1', '').strip() or None,
        'taxId': p.get('NumberTaxe', '').strip() or None,
        'healthNumber': p.get('NumberHealthInsurance', '').strip() or None,
        'pensionNumber': p.get('NumberAgeInsurance', '').strip() or None,
        'emails': [{'address': r['Email'].strip(), 'use': first(r['_ID_Use']), 'created': iso(r['TimeStampOfCreation'])} for r in rows(emails) if r['Email'].strip()],
        'phones': [{'number': ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x), 'use': first(r['_ID_Use']), 'created': iso(r['TimeStampOfCreation'])} for r in rows(phones) if r['Phone'].strip()],
        'addresses': [{'street': ' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), 'postcode': r['ZPostCode'].strip(), 'city': r['City'].strip(),
                       'country': r['ZCountry_1'].strip(), 'created': iso(r['TimeStampOfCreation'])} for r in rows(addresses)],
        'banks': [{'holder': r['AccountOwner'].strip(), 'iban': r['IBAN.Text'].strip(), 'bic': (r['SWIFT.Text'] or r['BIC']).strip(), 'bank': r['BankName'].strip(),
                   'created': iso(r['TimestampOfCreation'])} for r in rows(banks) if r['IBAN.Text'].strip()],
        'roles': [{'ref': first(r['_ID_PurviewReference']), 'active': first(r['_ID_Active']), 'from': iso(r['Z_StartDate']), 'to': iso(r['Z_EndDate'])} for r in rows(purviews)],
        'contracts': [{'kind': first(r['_ID_StatusSalarylReference']), 'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate']),
                       'hours': r['TargetWorkTime.Week'].strip(), 'units': r['TargetWorkTime.Teaching.Week'].strip()} for r in rows(contracts)],
        'licences': [{'ref': first(r['_ID_LicenseReference']), 'number': r['LicenseNumber'].strip() or None, 'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate'])} for r in rows(licences)],
    })
json.dump(out, sys.stdout, ensure_ascii=False)
