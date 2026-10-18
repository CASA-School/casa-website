"""Read the last of SchoolMan's smaller areas — read-only (AppleScript).

    python3 -I scripts/filemaker/read_rest.py --stats    # counts only
    python3 -I scripts/filemaker/read_rest.py | node scripts/filemaker/import-rest.mjs [--dry-run]

A group visit's programme (`SingleDateActivity`), services (`ServiceDetail`) and internship places
(`DatePlacement`); book orders to publishers (`Order`, `OrderDetail`, `Editorial`); CASA's keys (`Key`); the CASA
flats' cleaning plan (`CleaningDetail`, `SingleWeekCleaning`). Names come from their vocabularies
(`ActivityReference`, `ServiceDetailReference`, `ServiceDetailSpecificationReference`, `KeyTypeReference`).

The JSON goes to stdout and straight into the importer: nothing is written to a file.
"""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fm_read import column  # noqa: E402


def table(name, *fields):
    cols = [column(name, f) for f in fields]
    return [dict(zip(fields, row)) for row in zip(*cols)]


def first(value):
    found = [v.strip() for v in (value or '').split('\n') if v.strip()]
    return found[0] if found else ''


def iso(value):
    m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})', value or '')
    return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else None


def number(value):
    v = (value or '').strip().replace(' ', '').replace('€', '')
    if not v:
        return None
    if ',' in v:
        v = v.replace('.', '').replace(',', '.')
    try:
        return round(float(v), 2)
    except ValueError:
        return None


def whole(value):
    found = re.findall(r'\d+', value or '')
    return int(found[0]) if found else None


def names(name, idf, label):
    return {k.strip(): v.strip() for k, v in zip(column(name, idf), column(name, label)) if k.strip()}


def text(*parts):
    return ' · '.join(p.strip() for p in parts if p and p.strip())


activities = names('ActivityReference', '__ID_ActivityReference', 'ActivityReference_1')
services = names('ServiceDetailReference', '__ID_ServiceDetailReference', 'ServiceDetailReference_1')
specs = names('ServiceDetailSpecificationReference', '__ID_ServiceDetailSpecificationReference', 'ServiceDetailSpecificationReference_1')
key_kinds = names('KeyTypeReference', '__ID_KeyTypeReference', 'KeyTypeReference_1')

programme = [{'id': r['__ID_SingleDateActivity'].strip(), 'group': first(r['_ID_Group']), 'day': iso(r['ZSingleDate']), 'time': r['HourStart'].strip() or None,
              'activity': r['Activity_1'].strip() or activities.get(first(r['_ID_ActivityReference'])), 'meeting': r['MeetingPoint_1'].strip() or None}
             for r in table('SingleDateActivity', '__ID_SingleDateActivity', '_ID_Group', 'ZSingleDate', 'HourStart', 'Activity_1', '_ID_ActivityReference', 'MeetingPoint_1')
             if first(r['_ID_Group'])]
programme = [p for p in programme if p['activity']]

service_rows = [{'id': r['__ID_ServiceDetail'].strip(), 'group': first(r['_ID_Group']),
                 'service': r['ServiceDetail_1'].strip() or services.get(first(r['_ID_ServiceDetailReference'])),
                 'detail': text(specs.get(first(r['_ID_ServiceDetailSpecificationReference']), ''), r['ServiceDetailComment_1']) or None}
                for r in table('ServiceDetail', '__ID_ServiceDetail', '_ID_Group', 'ServiceDetail_1', '_ID_ServiceDetailReference', '_ID_ServiceDetailSpecificationReference',
                               'ServiceDetailComment_1')
                if first(r['_ID_Group'])]
service_rows = [s for s in service_rows if s['service']]

internships = [{'id': r['__ID_DatePlacement'].strip(), 'group': first(r['_ID_Group']), 'management': first(r['_ID_Management']) or None, 'place': r['Institution'].strip() or None,
                'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate']), 'min': whole(r['min_NumberStudent']), 'max': whole(r['max_NumberStudent'])}
               for r in table('DatePlacement', '__ID_DatePlacement', '_ID_Group', '_ID_Management', 'Institution', 'ZStartDate', 'ZEndDate', 'min_NumberStudent',
                              'max_NumberStudent')
               if first(r['_ID_Group'])]

# A publisher's name is on its party's `Institution` (`InstitutionEditorial` is empty).
inst_of = {first(m): n.strip() for m, n in zip(column('Institution', '_ID_Management'), column('Institution', 'Institution')) if first(m) and n.strip()}
publishers = {r['__ID_Editorial'].strip(): {'name': r['InstitutionEditorial'].strip() or inst_of.get(first(r['_ID_Management']), ''), 'management': first(r['_ID_Management']) or None}
              for r in table('Editorial', '__ID_Editorial', 'InstitutionEditorial', '_ID_Management') if r['__ID_Editorial'].strip()}
lines = collections.defaultdict(list)
for r in table('OrderDetail', '__ID_OrderDetail', '_ID_Order', '_ID_BookReference', 'OrderDetail_OneLine', 'Unit', 'CostNetUnit', 'CostNet'):
    if first(r['_ID_Order']):
        lines[first(r['_ID_Order'])].append({'id': r['__ID_OrderDetail'].strip(), 'book': first(r['_ID_BookReference']) or None, 'title': r['OrderDetail_OneLine'].strip() or None,
                                             'quantity': number(r['Unit']), 'unit': number(r['CostNetUnit']), 'net': number(r['CostNet'])})
orders = [{'id': r['__ID_Order'].strip(), 'publisher': publishers.get(first(r['_ID_Editorial'])), 'publisherId': first(r['_ID_Editorial']) or None,
           'day': iso(r['DateOfEmission']), 'done': {'1': True, '2': False}.get(first(r['_ID_OrderDone'])), 'email': r['Email'].strip() or None,
           'by': r['UserName'].strip() or None, 'lines': lines[r['__ID_Order'].strip()]}
          for r in table('Order', '__ID_Order', '_ID_Editorial', 'DateOfEmission', '_ID_OrderDone', 'Email', 'UserName') if r['__ID_Order'].strip()]

keys = [{'id': r['__ID_Key'].strip(), 'number': r['KeyNumber'].strip() or None, 'kind': key_kinds.get(first(r['_ID_KeyTypeReference'])),
         'holder': first(r['_ID_StaffMember']) or None, 'active': first(r['_ID_Active']) != '2', 'note': r['Comment'].strip() or None}
        for r in table('Key', '__ID_Key', 'KeyNumber', '_ID_KeyTypeReference', '_ID_StaffMember', '_ID_Active', 'Comment') if r['__ID_Key'].strip()]

jobs = [{'id': r['__ID_CleaningDetail'].strip(), 'place': first(r['_ID_Accommodation']), 'ref': first(r['_ID_CleaningJobReference']) or None,
         'de': r['CleaningDetail_1'].strip(), 'en': r['CleaningDetail_2'].strip() or None}
        for r in table('CleaningDetail', '__ID_CleaningDetail', '_ID_Accommodation', '_ID_CleaningJobReference', 'CleaningDetail_1', 'CleaningDetail_2')
        if first(r['_ID_Accommodation']) and r['CleaningDetail_1'].strip()]
weeks = [{'id': r['__ID_SingleWeekCleaning'].strip(), 'place': first(r['_ID_Accommodation']), 'room': first(r['_ID_Room']) or None,
          'ref': first(r['_ID_CleaningJobReference']) or None, 'from': iso(r['ZStartDate']), 'to': iso(r['ZEndDate'])}
         for r in table('SingleWeekCleaning', '__ID_SingleWeekCleaning', '_ID_Accommodation', '_ID_Room', '_ID_CleaningJobReference', 'ZStartDate', 'ZEndDate')
         if first(r['_ID_Accommodation'])]

out = {'programme': programme, 'services': service_rows, 'internships': internships, 'orders': orders, 'keys': keys, 'jobs': jobs, 'weeks': weeks}

if '--stats' in sys.argv:
    print('programme', len(programme), '· services', len(service_rows), '· internship places', len(internships), '· orders', len(orders), 'with',
          sum(len(o['lines']) for o in orders), 'lines ·', len({o['publisherId'] for o in orders if o['publisherId']}), 'publishers · keys', len(keys),
          '· cleaning jobs', len(jobs), '· cleaning weeks', len(weeks))
    sys.exit(0)

json.dump(out, sys.stdout, ensure_ascii=False)
