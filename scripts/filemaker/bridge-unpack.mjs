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
import { readFileSync } from 'node:fs';

import { connect, requireConnectionString } from '../db/client.mjs';
import { open } from './bridge-bundle.mjs';
import { counts, importStep, printCounts } from './bridge-run.mjs';
import { BRIDGE_STEPS } from './bridge-steps.mjs';

const at = process.argv.indexOf('--file');
const file = at > 0 ? process.argv[at + 1] : undefined;
const url = process.env.BRIDGE_URL;

requireConnectionString();
if (!file && !url) {
  console.error('Set BRIDGE_URL, or pass --file.');
  process.exit(2);
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

printCounts(before, after);
console.log(ok ? '\nbridge run complete' : '\nbridge run FAILED');
process.exit(ok ? 0 : 1);
