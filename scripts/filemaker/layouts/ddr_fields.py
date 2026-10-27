"""Field ids of every SchoolMan table from a DDR (UTF-16 XML): ddr-fields.json, which gen_xml2.py binds by.

    python3 -I ddr_fields.py <SchoolMan_DDR.xml> ddr-fields.json

Ids never change in FileMaker; a field made after the DDR was written is missing — export a new DDR then.
"""
import sys, json, xml.etree.ElementTree as ET
path, out = sys.argv[1], sys.argv[2]
tables, cur, depth = {}, None, 0
for ev, el in ET.iterparse(path, events=('start', 'end')):
    tag = el.tag
    if ev == 'start' and tag == 'BaseTable' and el.get('name'):
        cur = el.get('name'); tables.setdefault(cur, {})
    elif ev == 'start' and tag == 'Field' and cur and el.get('id') and el.get('name') and el.get('fieldType'):
        tables[cur].setdefault(el.get('name'), {'id': int(el.get('id')), 'type': el.get('dataType'), 'kind': el.get('fieldType')})
    elif ev == 'end' and tag == 'BaseTable':
        cur = None
    if ev == 'end' and tag not in ('BaseTable', 'File', 'BaseTableCatalog', 'FMPReport'):
        el.clear()
json.dump(tables, open(out, 'w'))
print(len(tables), 'tables;', sum(len(v) for v in tables.values()), 'fields')
