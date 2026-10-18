"""Read SchoolMan's places to stay — host families, CASA's flats — read-only (AppleScript).

    python3 -I scripts/filemaker/read_accommodation.py --stats    # counts only
    python3 -I scripts/filemaker/read_accommodation.py | node scripts/filemaker/import-accommodation.mjs [--dry-run]

Rahman, 2026-10-18: "we are fine with host family privacy" — the hosts come across. All 142
`Accommodation` records: the name (the institution's, else the host's), whether it is one of CASA's flats
(`_ID_SchoolFlatShare`, the type offered is „CASA – WG", or most of its stays were booked so), another kind of place (it has an institution's
name: another WG, a hotel) or a host family, the host (`_ID_Person`), the place's own e-mail, phone and address (else the
host's), the descriptions in German and English, smoker, pets (`AnimalAtHome`, else `_ID_Pet`), washing
machine, SchoolMan's grade (`_ID_Quality`), active; the family — the `Person` rows of the place with a role
(`_ID_Status_Family`: 1 Vater … 8 Freund), name and role only; the rooms (`Room`: name, `_ID_TypeRoom`
1 single, 2 double, 3 triple, beds, comment); the beds held for groups (`DateRent`); the comments on the
place. Never `Management`'s comments — they hold credentials (organisations.md).

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

A = ['__ID_Accommodation', 'SearchfieldAccommodation.Institution', '_ID_SchoolFlatShare', '_ID_AccommodationTypeOffer', '_ID_Person', '_ID_Active', '_ID_Smoker',
     '_ID_Pet', '_ID_WashingMachine', '_ID_Quality', 'DescriptionAccommodation_1', 'DescriptionAccommodation_2', 'DateOfCreation']
places = [a for a in table('Accommodation', *A) if a['__ID_Accommodation'].strip()]
known = {a['__ID_Accommodation'].strip() for a in places}
hosts = {first(a['_ID_Person']) for a in places if first(a['_ID_Person'])}

# The people: the host's name, and the family — those of a place with a role.
persons = {}
members = collections.defaultdict(list)
for p in table('Person', '__ID_Person', 'ZFirstName', 'ZSurName', '_ID_Accommodation', '_ID_Status_Family'):
    pid = p['__ID_Person'].strip()
    if pid in hosts:
        persons[pid] = p
    place, role = first(p['_ID_Accommodation']), first(p['_ID_Status_Family'])
    if place in known and role in ROLE and (p['ZFirstName'].strip() or p['ZSurName'].strip()):
        members[place].append({'id': pid, 'firstName': p['ZFirstName'].strip() or None, 'lastName': p['ZSurName'].strip() or None, 'role': ROLE[role]})

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
for r in table('AnimalAtHome', '_ID_Accommodation', 'Animal_1'):
    if first(r['_ID_Accommodation']) in known and r['Animal_1'].strip():
        pets[first(r['_ID_Accommodation'])].append(r['Animal_1'].strip())

rooms = collections.defaultdict(list)
for r in table('Room', '__ID_Room', '_ID_Accommodation', 'RoomName', '_ID_TypeRoom', 'NumberPerson', 'CommentRoom_1'):
    place = first(r['_ID_Accommodation'])
    if place in known and r['__ID_Room'].strip():
        rooms[place].append({'id': r['__ID_Room'].strip(), 'name': r['RoomName'].strip() or None, 'type': first(r['_ID_TypeRoom']) or None,
                             'beds': whole(r['NumberPerson']), 'note': r['CommentRoom_1'].strip() or None})

reservations = collections.defaultdict(list)
for r in table('DateRent', '__ID_DateRent', '_ID_Accommodation', '_ID_Room', '_ID_Group', 'ZStartDate', 'ZEndDate', 'min_NumberStudent', 'max_NumberStudent',
               'DescriptionRent.Short'):
    place = first(r['_ID_Accommodation'])
    if place in known and iso(r['ZStartDate']):
        reservations[place].append({'id': r['__ID_DateRent'].strip(), 'room': first(r['_ID_Room']) or None, 'group': first(r['_ID_Group']) or None,
                                    'start': iso(r['ZStartDate']), 'end': iso(r['ZEndDate']) or iso(r['ZStartDate']),
                                    'min': whole(r['min_NumberStudent']), 'max': whole(r['max_NumberStudent']), 'note': r['DescriptionRent.Short'].strip() or None})

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


# What its stays were booked as: a place most of whose stays are „CASA – WG" (type 7) is one of CASA's
# flats, whatever its flag says (SchoolMan flags three; CASA rents more).
stay_types = collections.defaultdict(collections.Counter)
for place, kind in zip(column('DateAccommodation', '_ID_Accommodation'), column('DateAccommodation', '_ID_AccommodationType')):
    if first(place) in known:
        stay_types[first(place)][first(kind)] += 1


def mostly_flat(aid):
    c = stay_types.get(aid)
    return bool(c) and c['7'] * 2 > sum(c.values())


out = []
for a in places:
    aid = a['__ID_Accommodation'].strip()
    host = persons.get(first(a['_ID_Person']))
    offered = ids(a['_ID_AccommodationTypeOffer'])
    flat = first(a['_ID_SchoolFlatShare']) == '1' or '7' in offered or mostly_flat(a['__ID_Accommodation'].strip())
    name, institution = split_name(a['SearchfieldAccommodation.Institution'], flat)
    c = channels[aid]
    pet = ', '.join(dict.fromkeys(pets[aid])) or ('ja' if yes_no(a['_ID_Pet']) else None)
    out.append({
        'id': aid,
        'name': name or (' '.join(x for x in (host['ZFirstName'].strip(), host['ZSurName'].strip()) if x) if host else '') or f'Unterkunft {aid}',
        # A place with an institution's name (another WG, a hotel, a day-care) is not a family's home.
        'kind': 'casa_flat' if flat else 'other' if institution else 'host_family',
        'contactName': ' '.join(x for x in (host['ZFirstName'].strip(), host['ZSurName'].strip()) if x) or None if host else None,
        'email': best(c['email']),
        'phone': best(c['phone']),
        'address': best(c['address']),
        'descriptionDe': a['DescriptionAccommodation_1'].strip() or None,
        'descriptionEn': a['DescriptionAccommodation_2'].strip() or None,
        'smoker': yes_no(a['_ID_Smoker']),
        'pets': pet,
        'washingMachine': yes_no(a['_ID_WashingMachine']),
        'rating': int(first(a['_ID_Quality'])) if first(a['_ID_Quality']).isdigit() and 1 <= int(first(a['_ID_Quality'])) <= 6 else None,
        'active': first(a['_ID_Active']) != '2',
        'created': iso(a['DateOfCreation']),
        'members': members[aid],
        'rooms': rooms[aid],
        'reservations': reservations[aid],
        'notes': notes[aid],
    })

if '--stats' in sys.argv:
    print('places', len(out), '·', dict(collections.Counter(o['kind'] for o in out)), '· inactive', sum(not o['active'] for o in out),
          '· with a host', sum(bool(o['contactName']) for o in out), '· e-mail', sum(bool(o['email']) for o in out), '· phone', sum(bool(o['phone']) for o in out),
          '· address', sum(bool(o['address']) for o in out))
    print('family members', sum(len(o['members']) for o in out), dict(collections.Counter(m['role'] for o in out for m in o['members'])))
    print('rooms', sum(len(o['rooms']) for o in out), '· with a type', sum(1 for o in out for r in o['rooms'] if r['type']), '· with beds', sum(1 for o in out for r in o['rooms'] if r['beds']))
    print('reservations', sum(len(o['reservations']) for o in out), '· for a group', sum(1 for o in out for r in o['reservations'] if r['group']),
          '· descriptions', sum(bool(o['descriptionDe'] or o['descriptionEn']) for o in out), '· pets', sum(bool(o['pets']) for o in out),
          '· comments', sum(len(o['notes']) for o in out))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
