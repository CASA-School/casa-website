"""Read SchoolMan's places to stay — host families, CASA's flats — read-only (AppleScript).

    python3 -I scripts/filemaker/read_accommodation.py --stats    # counts only
    python3 -I scripts/filemaker/read_accommodation.py | node scripts/filemaker/import-accommodation.mjs [--dry-run]

Rahman, 2026-10-18: "we are fine with host family privacy" — the hosts come across. All 142
`Accommodation` records: the name (the institution's, else the host's), whether it is one of CASA's flats
(`_ID_FlatShare`; without it `_ID_SchoolFlatShare`, the type offered is „CASA – WG", or most of its stays were
booked so), another kind of place (it has an institution's name: another WG, a hotel) or a host family, the host
(`_ID_Person`, the Wohnungsgeber; a place without one has its contact the other way round, `Person::_ID_Accommodation`),
the place's own e-mail, phone and address (else the host's), the descriptions in German and English, smoker, pets
(`_ID_Animal`, else `_ID_Pet`; which animals from `AnimalAtHome`), washing machine, SchoolMan's grade (`_ID_Quality`),
active, the Wohnungsgeber printed on the Wohnungsgeberbestätigung (`Landlord` when `_ID_Landlord`, else `Header.Text`),
what the host offers (types, meals, rooms: its `Management`'s offers, else the place's own type offer); the
family — the `Person` rows of the place with a role (`_ID_Status_Family`: 1 Vater … 8 Freund), name and role only;
the rooms (`Room`: name, number in the place, `_ID_TypeRoom` 1 single, 2 double, 3 triple, beds, comment); the beds
held (`DateRent`) for a group visit or for an intensive-course term (`_ID_Session`), and whom the host takes for
them (`Comment`); the comments on the place. Never `Management`'s comments — they hold credentials (organisations.md).

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


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
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?', value or '')
    if not m:
        return ''
    hh, mm, ss = (int(m.group(4)), int(m.group(5)), int(m.group(6) or 0)) if m.group(4) else (12, 0, 0)
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}T{hh:02d}:{mm:02d}:{ss:02d}'


def text(*parts):
    return '\n'.join(p.strip() for p in parts if p and p.strip())


def yes_no(value):
    """DecisionReference: 1 ja, 2 nein."""
    return {'1': True, '2': False}.get(first(value))


def whole(value):
    found = re.findall(r'\d+', value or '')
    return int(found[0]) if found else None


ROLE = {'1': 'father', '2': 'mother', '3': 'son', '4': 'daughter', '5': 'grandfather', '6': 'grandmother', '7': 'relative', '8': 'friend'}

A = ['__ID_Accommodation', 'SearchfieldAccommodation.Institution', '_ID_FlatShare', '_ID_SchoolFlatShare', '_ID_AccommodationTypeOffer', '_ID_Person', '_ID_Active',
     '_ID_Smoker', '_ID_Animal', '_ID_Pet', '_ID_WashingMachine', '_ID_Quality', 'DescriptionAccommodation_1', 'DescriptionAccommodation_2', 'DateOfCreation',
     '_ID_Landlord', 'Landlord', 'Header.Text', '_ID_Management']
places = [a for a in table('Accommodation', *A) if a['__ID_Accommodation'].strip()]
known = {a['__ID_Accommodation'].strip() for a in places}
hosts = {first(a['_ID_Person']) for a in places if first(a['_ID_Person'])}
without_host = {a['__ID_Accommodation'].strip() for a in places if not first(a['_ID_Person'])}

# The people: the host's name, and the family — those of a place with a role. A place SchoolMan made since 2025
# names no host (`_ID_Person` is the Wohnungsgeber, set only when one is entered): its contact is the other way
# round, a person of the place with no role in a family (`Person::_ID_Accommodation`, SchoolMan's own relationship).
persons = {}
members = collections.defaultdict(list)
contacts = collections.defaultdict(list)
for p in table('Person', '__ID_Person', 'ZFirstName', 'ZSurName', '_ID_Accommodation', '_ID_Status_Family', '_ID_Student', 'TimestampCreation'):
    pid = p['__ID_Person'].strip()
    if pid in hosts:
        persons[pid] = p
    place, role = first(p['_ID_Accommodation']), first(p['_ID_Status_Family'])
    named = p['ZFirstName'].strip() or p['ZSurName'].strip()
    if place in known and role in ROLE and named:
        members[place].append({'id': pid, 'firstName': p['ZFirstName'].strip() or None, 'lastName': p['ZSurName'].strip() or None, 'role': ROLE[role]})
    elif place in without_host and not role and not first(p['_ID_Student']) and named:
        contacts[place].append((stamp(p['TimestampCreation']), int(pid) if pid.isdigit() else 0, p))

# The oldest is the place's contact; any others are of the household, role „other".
contact_of = {}
for place, found in contacts.items():
    found.sort(key=lambda c: (c[0] or '9999', c[1]))
    contact_of[place] = found[0][2]
    for _, _, p in found[1:]:
        members[place].append({'id': p['__ID_Person'].strip(), 'firstName': p['ZFirstName'].strip() or None, 'lastName': p['ZSurName'].strip() or None, 'role': 'other'})

# What a host offers — types, meals, rooms — lives on its `Management` since 2025 (the place's own type offer
# was last filled in 2024): SchoolMan's ids, mapped through the vocabularies by the importer.
offers = {m['__ID_Management'].strip(): m for m in table('Management', '__ID_Management', '_ID_AccommodationTypeOffer', '_ID_AccommodationCateringOffer',
                                                           '_ID_AccommodationRoomOffer') if m['__ID_Management'].strip()}

# The place's own channels, else its host's; the newest wins.
host_of = {a['__ID_Accommodation'].strip(): first(a['_ID_Person']) for a in places}
place_of_host = {v: k for k, v in host_of.items() if v}
channels = collections.defaultdict(lambda: {'email': [], 'phone': [], 'address': []})


def owner_of(row):
    place = first(row['_ID_Accommodation'])
    if place in known:
        return place, 0
    host = first(row['_ID_Person'])
    if host in place_of_host:
        return place_of_host[host], 1
    return None, None


for r in table('Email', '_ID_Accommodation', '_ID_Person', 'Email', 'TimeStampOfCreation'):
    place, rank = owner_of(r)
    if place and r['Email'].strip():
        channels[place]['email'].append((rank, stamp(r['TimeStampOfCreation']), r['Email'].strip()))
for r in table('Phone', '_ID_Accommodation', '_ID_Person', 'Phone', 'AreaCode', 'TimeStampOfCreation'):
    place, rank = owner_of(r)
    number = ' '.join(x for x in (r['AreaCode'].strip(), r['Phone'].strip()) if x)
    if place and number:
        channels[place]['phone'].append((rank, stamp(r['TimeStampOfCreation']), number))
for r in table('Address', '_ID_Accommodation', '_ID_Person', 'Street', 'HouseNumber', 'ZPostCode', 'City', 'TimeStampOfCreation'):
    place, rank = owner_of(r)
    line = text(' '.join(x for x in (r['Street'].strip(), r['HouseNumber'].strip()) if x), ' '.join(x for x in (r['ZPostCode'].strip(), r['City'].strip()) if x))
    if place and line:
        channels[place]['address'].append((rank, stamp(r['TimeStampOfCreation']), line))


def best(found):
    """The place's own before its host's, then the newest."""
    return max(found, key=lambda x: (-x[0], x[1]))[2] if found else None


pets = collections.defaultdict(list)
for r in table('AnimalAtHome', '_ID_Accommodation', 'Animal_1', 'Comment_1'):
    if first(r['_ID_Accommodation']) in known and (r['Animal_1'].strip() or r['Comment_1'].strip()):
        pets[first(r['_ID_Accommodation'])].append(' '.join(x for x in (r['Animal_1'].strip(), f"({r['Comment_1'].strip()})" if r['Comment_1'].strip() else '') if x))

rooms = collections.defaultdict(list)
for r in table('Room', '__ID_Room', '_ID_Accommodation', 'RoomName', '_ID_InternalRoom', '_ID_TypeRoom', 'NumberPerson', 'CommentRoom_1'):
    place = first(r['_ID_Accommodation'])
    if place in known and r['__ID_Room'].strip():
        number = whole(r['_ID_InternalRoom'])
        rooms[place].append({'id': r['__ID_Room'].strip(), 'name': r['RoomName'].strip() or None, 'number': number if number and number <= 99 else None,
                             'type': first(r['_ID_TypeRoom']) or None, 'beds': whole(r['NumberPerson']), 'note': r['CommentRoom_1'].strip() or None})

# A course term (`Session`): which part of the day its learners are taught (`_ID_DayTimeReference`).
SESSION = {'2': 'morning', '4': 'afternoon', '5': 'evening'}
sessions = {s: SESSION.get(first(d)) for s, d in zip((x.strip() for x in column('Session', '__ID_Session')), column('Session', '_ID_DayTimeReference')) if s}

# Whom the host takes for the beds (`DateRent.Comment`, one word nearly always): girls or women, boys or men,
# anyone, a group leader. A comment that says more than that stays the note.
ACCEPTS = {'mädchen': 'female', 'mädels': 'female', 'frau': 'female', 'frauen': 'female', 'jungs': 'male', 'junge': 'male', 'jungen': 'male', 'mann': 'male',
           'männer': 'male', 'egal': 'any', 'betreuer': 'group_leader', 'betreuerin': 'group_leader'}


def accepts(comment):
    """(accepts, note): the kind of guest the words name, and the comment when it holds anything else."""
    words = re.findall(r'\w+', comment.lower())
    kinds = {ACCEPTS[w] for w in words if w in ACCEPTS}
    rest = [w for w in words if w not in ACCEPTS and w not in ('oder', 'und')]
    if 'group_leader' in kinds:
        kind = 'group_leader' if kinds == {'group_leader'} else None
    elif 'any' in kinds or {'female', 'male'} <= kinds:
        kind = 'any'
    else:
        kind = next(iter(kinds)) if len(kinds) == 1 else None
    return kind, (comment.strip() or None) if rest or not kind else None


reservations = collections.defaultdict(list)
for r in table('DateRent', '__ID_DateRent', '_ID_Accommodation', '_ID_Room', '_ID_Group', '_ID_Session', 'ZStartDate', 'ZEndDate', 'min_NumberStudent',
               'max_NumberStudent', 'Comment'):
    place = first(r['_ID_Accommodation'])
    if place in known and iso(r['ZStartDate']):
        term = first(r['_ID_Session'])
        kind, note = accepts(r['Comment'])
        reservations[place].append({'id': r['__ID_DateRent'].strip(), 'room': first(r['_ID_Room']) or None, 'group': None if term else first(r['_ID_Group']) or None,
                                    'purpose': 'course_term' if term else 'group_visit', 'session': sessions.get(term) if term else None,
                                    'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate']) or iso(r['ZStartDate']),
                                    'min': whole(r['min_NumberStudent']), 'max': whole(r['max_NumberStudent']), 'accepts': kind, 'note': note})

# The comments on a place (those on a learner, a booking, a group or an offer come with them).
notes = collections.defaultdict(list)
for r in table('Comment', '__ID_Comment', '_ID_Accommodation', '_ID_Person', '_ID_Booking', '_ID_Group', '_ID_Offer', 'Subject', 'Comment_1', 'Comment_2', 'UserName',
               'TimeStampOfCreation'):
    place = first(r['_ID_Accommodation'])
    body = text(r['Subject'], r['Comment_1'], r['Comment_2'])
    if place in known and body and not (first(r['_ID_Person']) or first(r['_ID_Booking']) or first(r['_ID_Group']) or first(r['_ID_Offer'])):
        notes[place].append({'ref': f'Comment:{r["__ID_Comment"].strip()}', 'author': r['UserName'].strip() or None, 'at': stamp(r['TimeStampOfCreation']) or None, 'body': body})

def split_name(value, flat):
    """SchoolMan's search field is „Name | Person". A host family's name is its host's own, reversed
    („Meyer Anna | Anna Meyer"); another place's is an institution's („Die Walle WG | …", a hotel). Returns
    the name and whether it is an institution's. A CASA flat loses its „– CASA WG"."""
    inst, _, person = (value or '').partition('|')
    inst, person = inst.strip(), person.strip()
    if flat:
        inst = re.sub(r'\s*[–-]\s*CASA[\s-]*WG\s*$', '', inst, flags=re.I).strip()
    words = lambda v: set(re.findall(r'\w+', v.lower()))
    institution = bool(inst) and bool(person) and not words(inst) <= words(person)
    return (inst or person or (value or '').strip()), institution


# What its stays were booked as: without SchoolMan's flag (`_ID_FlatShare`, on exactly CASA's eight flats), a
# place most of whose stays are „CASA – WG" (type 7) is one of CASA's flats.
stay_types = collections.defaultdict(collections.Counter)
for place, kind in zip(column('DateAccommodation', '_ID_Accommodation'), column('DateAccommodation', '_ID_AccommodationType')):
    if first(place) in known:
        stay_types[first(place)][first(kind)] += 1


def mostly_flat(aid):
    c = stay_types.get(aid)
    return bool(c) and c['7'] * 2 > sum(c.values())


def full_name(p):
    return ' '.join(x for x in (p['ZFirstName'].strip(), p['ZSurName'].strip()) if x) or None if p else None


def lines(value):
    return '\n'.join(x.strip() for x in (value or '').split('\n') if x.strip())[:500] or None


out = []
for a in places:
    aid = a['__ID_Accommodation'].strip()
    host = persons.get(first(a['_ID_Person']))
    m = offers.get(first(a['_ID_Management']))
    offered = (ids(m['_ID_AccommodationTypeOffer']) if m else []) or ids(a['_ID_AccommodationTypeOffer'])
    flag = first(a['_ID_FlatShare'])
    flat = flag == '1' or (not flag and (first(a['_ID_SchoolFlatShare']) == '1' or '7' in ids(a['_ID_AccommodationTypeOffer']) or mostly_flat(aid)))
    name, institution = split_name(a['SearchfieldAccommodation.Institution'], flat)
    c = channels[aid]
    kinds = ', '.join(dict.fromkeys(pets[aid])) or None
    has_pets = yes_no(a['_ID_Animal'])
    if has_pets is None:
        has_pets = yes_no(a['_ID_Pet'])
    out.append({
        'id': aid,
        'name': name or full_name(host) or f'Unterkunft {aid}',
        # A place with an institution's name (another WG, a hotel, a day-care) is not a family's home.
        'kind': 'casa_flat' if flat else 'other' if institution else 'host_family',
        'contactName': full_name(host) or full_name(contact_of.get(aid)),
        'email': best(c['email']),
        'phone': best(c['phone']),
        'address': best(c['address']),
        'descriptionDe': a['DescriptionAccommodation_1'].strip() or None,
        'descriptionEn': a['DescriptionAccommodation_2'].strip() or None,
        'smoker': yes_no(a['_ID_Smoker']),
        'hasPets': has_pets if has_pets is not None else (True if kinds else None),
        'pets': kinds,
        'washingMachine': yes_no(a['_ID_WashingMachine']),
        'rating': int(first(a['_ID_Quality'])) if first(a['_ID_Quality']).isdigit() and 1 <= int(first(a['_ID_Quality'])) <= 6 else None,
        'active': first(a['_ID_Active']) != '2',
        'created': iso(a['DateOfCreation']),
        # The Wohnungsgeber as SchoolMan prints it on the confirmation: `Landlord` when it says so, else the header.
        'landlord': (lines(a['Landlord']) if first(a['_ID_Landlord']) == '1' else None) or lines(a['Header.Text']),
        'offers': {'types': offered, 'catering': ids(m['_ID_AccommodationCateringOffer']) if m else [], 'rooms': ids(m['_ID_AccommodationRoomOffer']) if m else []},
        'members': members[aid],
        'rooms': rooms[aid],
        'reservations': reservations[aid],
        'notes': notes[aid],
    })

if '--stats' in sys.argv:
    print('places', len(out), '·', dict(collections.Counter(o['kind'] for o in out)), '· inactive', sum(not o['active'] for o in out),
          '· with a contact', sum(bool(o['contactName']) for o in out), '(by the place\'s person', len(contact_of), ') · e-mail', sum(bool(o['email']) for o in out),
          '· phone', sum(bool(o['phone']) for o in out), '· address', sum(bool(o['address']) for o in out), '· Wohnungsgeber', sum(bool(o['landlord']) for o in out))
    print('family members', sum(len(o['members']) for o in out), dict(collections.Counter(m['role'] for o in out for m in o['members'])))
    print('offers: types', sum(bool(o['offers']['types']) for o in out), '· catering', sum(bool(o['offers']['catering']) for o in out),
          '· rooms', sum(bool(o['offers']['rooms']) for o in out))
    print('pets: yes', sum(o['hasPets'] is True for o in out), '· no', sum(o['hasPets'] is False for o in out), '· which', sum(bool(o['pets']) for o in out))
    print('rooms', sum(len(o['rooms']) for o in out), '· with a type', sum(1 for o in out for r in o['rooms'] if r['type']),
          '· with beds', sum(1 for o in out for r in o['rooms'] if r['beds']), '· with a number', sum(1 for o in out for r in o['rooms'] if r['number']))
    rs = [r for o in out for r in o['reservations']]
    print('reservations', len(rs), '· for a group', sum(1 for r in rs if r['group']), '· for a course term', sum(1 for r in rs if r['purpose'] == 'course_term'),
          dict(collections.Counter(r['session'] for r in rs if r['purpose'] == 'course_term')), '· whom', dict(collections.Counter(r['accepts'] for r in rs if r['accepts'])),
          '· notes', sum(1 for r in rs if r['note']))
    print('descriptions', sum(bool(o['descriptionDe'] or o['descriptionEn']) for o in out), '· comments', sum(len(o['notes']) for o in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
