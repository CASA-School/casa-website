"""XML2 field objects for a Sync_<Table> layout: every field in sync-layouts.json, bound by its DDR id.

    python3 gen_xml2.py <Table> [<field> …]   all of the table's fields, or only these (placed below the layout's own)

The field ids come from ddr-fields.json (ddr_fields.py, from the July 2026 DDR; FileMaker never renumbers a
field). The object is the plain field of field-template.xml2.xml with its name, bounds and id replaced.
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
table = sys.argv[1]
layouts = json.load(open(os.path.join(HERE, '..', 'sync-layouts.json')))
ids = json.load(open(os.path.join(HERE, 'ddr-fields.json')))[table]
template = open(os.path.join(HERE, 'field-template.xml2.xml')).read()
obj = re.search(r'<Object type="Field".*?</Object>', template, re.S).group(0)
fields = layouts[table]['fields']
# gen_xml2.py <Table> <ddr.json> <field> …: only these, in the rows after the layout's existing ones
start = 0
if len(sys.argv) > 2:
    extra = sys.argv[2:]
    start = len(fields) - len(extra) + 2
    fields = extra
missing = [f for f in fields if f not in ids]
if missing:
    sys.exit(f'no DDR id for {missing}')
objs, cols, w, h = [], 3, 170, 17
for i, f in enumerate(fields):
    top, left = 60 + ((start + i) // cols) * 24 + (24 if start else 0), 10 + ((start + i) % cols) * (w + 10)
    o = obj.replace('key="290"', f'key="{start + i + 1}"')
    o = re.sub(r'<Bounds [^>]*/>', f'<Bounds top="{top}.0000000" left="{left}.0000000" bottom="{top + h}.0000000" right="{left + w}.0000000"/>', o)
    o = o.replace('<Name>Agreement::_ID_Student</Name>', f'<Name>{table}::{f}</Name>')
    o = re.sub(r'<Field name="_ID_Student" id="76" repetition="1" maxRepetition="1" table="Agreement"/>',
               f'<Field name="{f}" id="{ids[f]["id"]}" repetition="1" maxRepetition="1" table="{table}"/>', o)
    assert f'table="{table}"' in o and f'{table}::{f}' in o
    objs.append(o)
bottom = 60 + ((start + len(fields) - 1) // cols) * 24 + h + (24 if start else 0)
print('<?xml version="1.0" encoding="UTF-8"?>\n<fmxmlsnippet type="LayoutObjectList">\n'
      f'<Layout enclosingRectTop="{60 + (start // cols) * 24 + (24 if start else 0)}.0000000" enclosingRectLeft="10.0000000" enclosingRectBottom="{bottom}.0000000" enclosingRectRight="{10 + cols * (w + 10) - 10}.0000000">\n'
      + '\n'.join(objs) + '\n</Layout>\n</fmxmlsnippet>')
