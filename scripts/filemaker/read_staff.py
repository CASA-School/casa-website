"""Read SchoolMan's active staff for the workspace's staff register — read-only (AppleScript).

    python3 -I scripts/filemaker/read_staff.py --stats      # counts only, nothing personal
    python3 -I scripts/filemaker/read_staff.py | node scripts/filemaker/import-staff.mjs

Rahman, 2026-10-17: the 56 colleagues SchoolMan marks as active staff, with everything — person,
contact, address, roles, contracts and hours, examiner licences, and the tax and insurance numbers
and bank details (which only `staff_private` sees in the workspace). Nothing else leaves FileMaker.

2026-10-27 (completeness review, 0092): the levels a teacher teaches (`_ID_Level`), whether they keep a time
sheet (`_ID_TimeSheet`), their trainings (`TrainingStaffMember` with its session `SingleDateTraining`), a note on
an e-mail address, a bank account's comment and addresses, and the countries by their `Flag` ids instead of
SchoolMan's label copies.

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
                          # The internal section (2026-10-22): course types taught, weekdays, times of day; the levels and the
                          # time sheet (2026-10-27).
                          '_ID_CourseTypeReference', '_ID_WeekDay', '_ID_DayTimeReference', '_ID_Level', '_ID_TimeSheet')
         if first(s['_ID_ActiveStaff']) == '1']
staff_ids = {s['__ID_StaffMember'] for s in staff}
# Newer colleagues are linked the other way round: their staff row has no person, their person names the staff
# row (`Person::_ID_StaffMember`) — seven of them, whose birth date, salutation and contact data had stayed
# behind (2026-10-27, Rahman: Meike Große Hundrup's record half empty while SchoolMan has it all).
person_of = {}
for pid, sid in zip(column('Person', '__ID_Person'), column('Person', '_ID_StaffMember')):
    for s_id in ids(sid):
        if s_id in staff_ids and pid.strip():
            person_of.setdefault(s_id, pid.strip())
for s in staff:
    if not first(s['_ID_Person']) and s['__ID_StaffMember'] in person_of:
        s['_ID_Person'] = person_of[s['__ID_StaffMember']]
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


persons = {p['__ID_Person']: p for p in table('Person', '__ID_Person', 'ZFirstName', 'ZSurName', 'ZSurName2', 'NickName', '_ID_GenderReference', 'DateOfBirth', '_ID_Homeland',
                                               'BirthPlace', '_ID_CountryBirth', 'NumberTaxe', 'NumberHealthInsurance', 'NumberAgeInsurance') if p['__ID_Person'] in person_ids}
emails = [r for r in table('Email', '_ID_Person', '_ID_StaffMember', 'Email', '_ID_Use', 'TimeStampOfCreation', 'CommentUseMail') if mine(r)]
phones = [r for r in table('Phone', '_ID_Person', '_ID_StaffMember', 'Phone', 'AreaCode', '_ID_Use', 'TimeStampOfCreation') if mine(r)]
addresses = [r for r in table('Address', '_ID_Person', '_ID_StaffMember', 'Street', 'HouseNumber', 'ZPostCode', 'City', '_ID_Country', 'TimeStampOfCreation') if mine(r)]
banks = [r for r in table('BankAccount', '_ID_Person', '_ID_StaffMember', 'AccountOwner', 'IBAN.Text', 'SWIFT.Text', 'BIC', 'BankName', 'TimestampOfCreation',
                          'Comment', 'AddressAccountOwner', 'AddressBank') if mine(r)]
# Trainings (SchoolMan keeps them since 2026): the colleague's row, its session's title and hours, the kind on
# either (`TrainingReference`).
sessions = {r['__ID_SingleDateTraining'].strip(): r for r in table('SingleDateTraining', '__ID_SingleDateTraining', '_ID_TrainningReference', 'ZSingleDateTraining',
                                                                      'HourStart', 'HourEnd', 'TitleTraining')}
trainings = [r for r in table('TrainingStaffMember', '__ID_TrainingStaffMember', '_ID_StaffMember', '_ID_SingleDateTrainning', '_ID_TrainningReference',
                              'ZSingleDateTraining') if mine(r)]
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
    print('levels', collections.Counter(x for s in staff for x in ids(s['_ID_Level'])).most_common(), '· time sheet', collections.Counter(first(s['_ID_TimeSheet']) for s in staff).most_common(),
          '· trainings', len(trainings), 'for', len({mine(r) for r in trainings}), '· e-mail notes', sum(bool(r['CommentUseMail'].strip()) for r in emails),
          '· bank notes', sum(bool(r['Comment'].strip()) for r in banks))
    sys.exit(0)

# Nationality: the person's flag (`_ID_Homeland`), „DE - Deutschland", as for learners.
flags = {r['__ID_Flag'].strip(): r for r in table('Flag', '__ID_Flag', 'CountryLong_1', 'Country_1')}


def nationality(flag_id):
    f = flags.get(flag_id)
    if not f:
        return None
    m = re.match(r'\s*([A-Z]{2})\s*-', f['CountryLong_1'] or '')
    return m.group(1) if m else (f['Country_1'].strip() or None)


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
                     'weekdays': ids(s['_ID_WeekDay']), 'dayparts': ids(s['_ID_DayTimeReference']),
                     # `LevelReferenceSchool`: 1 A1 … 5 C1, 3,5 B1+, 6 TestDaF, 7 C1 Hochschule, 8 SK, 9 ND.
                     'levels': ids(s['_ID_Level'])},
        # Keeps a time sheet (1 yes, 2 no; empty unknown).
        'timeSheet': {'1': True, '2': False}.get(first(s['_ID_TimeSheet'])),
        'shortName': s['TeacherFirstName.Surname.Short'].strip() or None,
        # A colleague with no person either way: the name is only on the staff row, in its search fields.
        'firstName': p.get('ZFirstName', '').strip() if p else split_name(s['SearchFieldTeacherFirstName'], s['SearchFieldTeacherSurName'])[0],
        'lastName': p.get('ZSurName', '').strip() if p else split_name(s['SearchFieldTeacherFirstName'], s['SearchFieldTeacherSurName'])[1],
        'secondLastName': p.get('ZSurName2', '').strip() or None,
        'nickname': p.get('NickName', '').strip() or None,
        'gender': first(p.get('_ID_GenderReference')) or None,
        'birthDate': iso(p.get('DateOfBirth')),
        'birthPlace': p.get('BirthPlace', '').strip() or None,
        'birthCountry': nationality(first(p.get('_ID_CountryBirth'))),
        'nationality': nationality(first(p.get('_ID_Homeland'))),
        'taxId': p.get('NumberTaxe', '').strip() or None,
        'healthNumber': p.get('NumberHealthInsurance', '').strip() or None,
        'pensionNumber': p.get('NumberAgeInsurance', '').strip() or None,
        'emails': [{'address': r['Email'].strip(), 'use': first(r['_ID_Use']), 'created': iso(r['TimeStampOfCreation']), 'note': r['CommentUseMail'].strip() or None}
                   for r in rows(emails) if r['Email'].strip()],
        'phones': [{'number': ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x), 'use': first(r['_ID_Use']), 'created': iso(r['TimeStampOfCreation'])} for r in rows(phones) if r['Phone'].strip()],
        'addresses': [{'street': ' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), 'postcode': r['ZPostCode'].strip(), 'city': r['City'].strip(),
                       'country': nationality(first(r['_ID_Country'])), 'created': iso(r['TimeStampOfCreation'])} for r in rows(addresses)],
        'banks': [{'holder': r['AccountOwner'].strip(), 'iban': r['IBAN.Text'].strip(), 'bic': (r['SWIFT.Text'] or r['BIC']).strip(), 'bank': r['BankName'].strip(),
                   'note': r['Comment'].strip() or None, 'holderAddress': r['AddressAccountOwner'].strip() or None, 'bankAddress': r['AddressBank'].strip() or None,
                   'created': iso(r['TimestampOfCreation'])} for r in rows(banks) if r['IBAN.Text'].strip()],
        'trainings': [{'ref': r['__ID_TrainingStaffMember'].strip(),
                       'kind': first(r['_ID_TrainningReference']) or first(sessions.get(first(r['_ID_SingleDateTrainning']), {}).get('_ID_TrainningReference')) or None,
                       'title': sessions.get(first(r['_ID_SingleDateTrainning']), {}).get('TitleTraining', '').strip() or None,
                       'date': iso(r['ZSingleDateTraining']) or iso(sessions.get(first(r['_ID_SingleDateTrainning']), {}).get('ZSingleDateTraining')),
                       'from': sessions.get(first(r['_ID_SingleDateTrainning']), {}).get('HourStart', '').strip() or None,
                       'to': sessions.get(first(r['_ID_SingleDateTrainning']), {}).get('HourEnd', '').strip() or None} for r in rows(trainings)],
        'roles': [{'ref': first(r['_ID_PurviewReference']), 'active': first(r['_ID_Active']), 'from': iso(r['Z_StartDate']), 'to': iso(r['Z_EndDate'])} for r in rows(purviews)],
        'contracts': [{'kind': first(r['_ID_StatusSalarylReference']), 'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate']),
                       'hours': r['TargetWorkTime.Week'].strip(), 'units': r['TargetWorkTime.Teaching.Week'].strip()} for r in rows(contracts)],
        'licences': [{'ref': first(r['_ID_LicenseReference']), 'number': r['LicenseNumber'].strip() or None, 'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate'])} for r in rows(licences)],
    })
json.dump(out, sys.stdout, ensure_ascii=False)
