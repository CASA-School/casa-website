/**
 * SchoolMan's columns from the workspace's copy (migration 0090), in the text FileMaker Pro's AppleScript
 * hands the readers, so `read_*.py` run on the copy unchanged (`FM_MIRROR`, fm_read.py). The sync service
 * keeps the copy current over the Data API; this turns its values back into what AppleScript gives, by the
 * field's type (sync-layouts.json): line breaks as LF, dates DD.MM.YYYY, times and timestamps without
 * seconds when they are :00 (a timestamp at midnight as its date), numbers with a decimal comma, and the
 * records in SchoolMan's own order (the Data API's record id rises with it). AppleScript gives a number
 * as it was typed („15,00", „1.857,96") where the Data API gives its value („15", „1857.96"): the
 * readers parse both to the same number (measured 2026-10-27, every field of every Sync_ layout).
 *
 *   DATABASE_URL=… node scripts/filemaker/mirror-export.mjs <dir> [Table,Table,…]
 *
 * One file per field, `<dir>/<Table>/<field>.json` (the name as fm_read.py's `quote`), and the table's
 * record count in `<dir>/<Table>/#count`, for the tables named or all of them (2026-10-28: a run exports
 * only the tables of the steps it runs, and a reader loads only the columns it asks for — reading whole
 * tables took the learners' reader to 1.2 GB). Prints counts only.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect, requireConnectionString } from '../db/client.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAYOUTS = JSON.parse(readFileSync(path.join(HERE, 'sync-layouts.json'), 'utf8'));
const out = process.argv[2];
if (!out) {
  console.error('usage: mirror-export.mjs <dir> [Table,Table,…]');
  process.exit(2);
}
const named = process.argv[3]?.split(',').filter((t) => t in LAYOUTS);

/** A Data API value as AppleScript's `cell` gives it, by the field's type. */
function asAppleScript(value, type) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).replace(/\r\n?/g, '\n').replaceAll('\uFEFF', '');
  if (type === 'Number') return text.replaceAll('.', ',');
  if (type === 'Date' || type === 'TimeStamp') {
    return text.replace(/(\d{2})\/(\d{2})\/(\d{4})(?: (\d{1,2}:\d{2}):(\d{2}))?/g, (_, m, d, y, hm, s) =>
      `${d}.${m}.${y}${hm && !(hm === '00:00' && s === '00') ? ` ${hm}${s === '00' ? '' : `:${s}`}` : ''}`
    );
  }
  if (type === 'Time') return text.replace(/^(\d{1,2}:\d{2}):00$/, '$1');
  return text;
}

/** A field's file name: Python's `urllib.parse.quote(field, safe='')`, which fm_read.py uses. */
const fileName = (field) => encodeURIComponent(field).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

requireConnectionString();
const client = await connect();
try {
  const tables = named ?? Object.keys(LAYOUTS);
  let records = 0;
  for (const table of tables) {
    const { fields, types = {} } = LAYOUTS[table];
    const rows = (await client.query(`SELECT data FROM schoolman_records WHERE source_table = $1 ORDER BY record_id::bigint`, [table])).rows;
    records += rows.length;
    const dir = path.join(out, table);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, '#count'), String(rows.length));
    for (const f of fields) writeFileSync(path.join(dir, `${fileName(f)}.json`), JSON.stringify(rows.map((r) => asAppleScript(r.data[f], types[f]))));
  }
  console.log(`copy of SchoolMan: ${tables.length} tables, ${records} records`);
} finally {
  await client.end();
}
