/**
 * The import job's half of the SchoolMan bridge (2026-10-19; docs/FILEMAKER_BRIDGE.md §8): fetches the
 * sealed bundle, opens it with the run's key, and feeds each step to its importer in order, stopping at
 * the first that fails. Records the run in `bridge_runs` and deletes the bundle, whatever happened.
 * Prints counts only: the importers' own summary lines and how many rows the main tables hold.
 *
 *   DATABASE_URL=… BRIDGE_KEY=<64 hex> BRIDGE_URL=<blob SAS, read+delete> node scripts/filemaker/bridge-unpack.mjs
 *   DATABASE_URL=… BRIDGE_KEY=<64 hex> node scripts/filemaker/bridge-unpack.mjs --file <sealed.bin>
 *
 * Runs inside Azure as `db-job.sh import`, started by `infra/azure/bridge.sh`.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect, requireConnectionString } from '../db/client.mjs';
import { open } from './bridge-bundle.mjs';
import { BRIDGE_STEPS } from './bridge-steps.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--file');
const file = at > 0 ? process.argv[at + 1] : undefined;
const url = process.env.BRIDGE_URL;

requireConnectionString();
if (!file && !url) {
  console.error('Set BRIDGE_URL, or pass --file.');
  process.exit(2);
}

/** The tables a run fills, counted before and after. */
const TABLES = [
  'staff_members', 'courses', 'course_days', 'people', 'bookings', 'booking_periods', 'organisations', 'group_visits',
  'offers', 'accommodations', 'booking_stays', 'payments', 'letters', 'staff_notes', 'day_tasks',
];

async function counts() {
  const client = await connect();
  try {
    const out = {};
    for (const table of TABLES) {
      if ((await client.query('SELECT to_regclass($1) AS t', [table])).rows[0].t) {
        out[table] = Number((await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n);
      }
    }
    return out;
  } finally {
    await client.end();
  }
}

/** One importer, fed its step's input on stdin; its output is passed on and its last line kept. */
function importStep(importer, input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, importer)], { stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = [];
    const keep = (chunk, stream) => {
      stream.write(chunk);
      lines.push(...chunk.toString('utf8').split('\n').filter((l) => l.trim()));
    };
    child.stdout.on('data', (c) => keep(c, process.stdout));
    child.stderr.on('data', (c) => keep(c, process.stderr));
    child.on('close', (code) => resolve({ ok: code === 0, summary: lines.at(-1)?.slice(0, 500) ?? '' }));
    child.stdin.end(input);
  });
}

async function remove() {
  if (!url) return;
  const response = await fetch(url, { method: 'DELETE', headers: { 'x-ms-version': '2021-08-06' } }).catch(() => null);
  console.log(response?.ok || response?.status === 404 ? '  bundle deleted' : `  bundle NOT deleted (${response?.status ?? 'no answer'})`);
}

let sealed;
try {
  if (file) {
    sealed = readFileSync(file);
  } else {
    const response = await fetch(url, { headers: { 'x-ms-version': '2021-08-06' } });
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    sealed = Buffer.from(await response.arrayBuffer());
  }
} catch (error) {
  console.error(String(error));
  await remove();
  process.exit(1);
}

let bundle;
try {
  bundle = open(sealed, process.env.BRIDGE_KEY);
} finally {
  await remove();
}

console.log(`SchoolMan read at ${bundle.readAt}, ${bundle.steps.length} steps`);
const before = await counts();
const done = [];
let ok = true;
for (const step of bundle.steps) {
  // The importer comes from this image's list, never from the bundle.
  const known = BRIDGE_STEPS.find((s) => s.name === step.name);
  if (!known) {
    console.error(`Unknown step ${step.name}; stopping.`);
    done.push({ name: step.name, ok: false, summary: 'unknown step' });
    ok = false;
    break;
  }
  console.log(`== ${step.name}`);
  const result = await importStep(known.importer, step.input);
  done.push({ name: step.name, ...result });
  if (!result.ok) {
    console.error(`${step.name} failed; the steps after it were not run.`);
    ok = false;
    break;
  }
}
const after = await counts();

const client = await connect();
try {
  await client.query(`INSERT INTO bridge_runs (read_at, ok, steps) VALUES ($1, $2, $3::jsonb)`, [bundle.readAt, ok, JSON.stringify(done)]);
} finally {
  await client.end();
}

console.log('\nrows        before → after');
for (const table of Object.keys(after)) console.log(`  ${table.padEnd(16)} ${String(before[table] ?? '').padStart(7)} → ${after[table]}`);
console.log(ok ? '\nbridge run complete' : '\nbridge run FAILED');
process.exit(ok ? 0 : 1);
