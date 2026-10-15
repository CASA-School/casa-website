"""Profile one SchoolMan table, live and read-only: how full each stored field is.

    python3 scripts/filemaker/profile_table.py Person --ddr <ddr_field_catalog.csv>

Stored fields come from the DDR field catalogue (calculations and globals are
skipped: unstored calculations time out and say nothing about the data). For
each field it records filled and distinct counts; a value distribution only for
id fields and short vocabularies, never for names, numbers, addresses or
comments. The JSON goes to output/filemaker/ (gitignored).
"""
import argparse, collections, csv, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from fm_read import column  # noqa: E402

PERSONAL = re.compile(r'name|search|first|sur|nick|mail|phone|street|passport|number|account|token|comment|birth|value|iban|bic|tax', re.I)


def stored_fields(ddr: str, table: str):
    for r in csv.DictReader(open(ddr, encoding='utf-8')):
        if r['database'] == 'SchoolMan' and r['baseTable'] == table and r['fieldType'] == 'Normal' and r['storageGlobal'] != 'true':
            derived = any(r[k] == 'true' for k in ('autoEnterCalculation', 'autoEnterLookup'))
            yield {'name': r['fieldName'], 'type': r['dataType'], 'derived': derived}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('table')
    ap.add_argument('--ddr', required=True)
    ap.add_argument('--out', default='output/filemaker')
    args = ap.parse_args()
    fields, rows, result = list(stored_fields(args.ddr, args.table)), None, {}
    for f in fields:
        try:
            vals = column(args.table, f['name'])
        except RuntimeError as e:
            result[f['name']] = {'error': str(e)[:120]}
            continue
        rows = rows or len(vals)
        filled = [v for v in vals if v.strip()]
        values = collections.Counter(filled)
        entry = {'type': f['type'], 'derived': f['derived'], 'filled': len(filled), 'distinct': len(values)}
        idlike = f['name'].startswith('_ID_') or re.fullmatch(r'_\d+', f['name'])
        if idlike or (len(values) <= 12 and f['type'] != 'Date' and not PERSONAL.search(f['name'])):
            entry['top'] = values.most_common(8)
        result[f['name']] = entry
        print(f"{f['name']:<34}{len(filled):>7}/{len(vals)}  distinct {len(values)}", flush=True)
    os.makedirs(args.out, exist_ok=True)
    path = os.path.join(args.out, f'{args.table}.profile.json')
    json.dump({'table': args.table, 'rows': rows, 'fields': result}, open(path, 'w'), ensure_ascii=False, indent=1)
    print('→', path)


if __name__ == '__main__':
    main()
