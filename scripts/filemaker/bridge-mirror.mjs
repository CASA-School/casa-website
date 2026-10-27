/**
 * A bridge run from the workspace's copy of SchoolMan (migration 0090) instead of FileMaker Pro on the
 * office Mac (2026-10-27): the copy is turned back into the columns the readers know (mirror-export.mjs),
 * each `read_*.py` runs on it unchanged (`FM_MIRROR`), and each importer takes its reader's output as in
 * a run from a bundle. Runs inside Azure as a scheduled job, every few minutes; a run finds nothing to do
 * when the copy has not changed since the last one, and two never overlap. Counts only.
 *
 *   DATABASE_URL=… node scripts/filemaker/bridge-mirror.mjs [--only learners,money] [--always]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect, requireConnectionString } from '../db/client.mjs';
import { counts, importStep, printCounts } from './bridge-run.mjs';
import { BRIDGE_STEPS } from './bridge-steps.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const only = arg('--only')?.split(',').map((s) => s.trim()).filter(Boolean);

requireConnectionString();

/** A child's stdout, kept in memory; its stderr (counts) passes through. */
function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env } });
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks).toString('utf8')) : reject(new Error(`${path.basename(args.at(-1))} exited with ${code}`))));
  });
}

// One run at a time: the lock is held by this connection until the run ends.
const lock = await connect();
if (!(await lock.query(`SELECT pg_try_advisory_lock(hashtext('schoolman-bridge')) AS ok`)).rows[0].ok) {
  console.log('a bridge run is going on; this one stops');
  await lock.end();
  process.exit(0);
}

const work = mkdtempSync(path.join(tmpdir(), 'schoolman-'));
let ok = true;
async function bridge() {
  const [{ newest, last, sent }] = (
    await lock.query(
      `SELECT (SELECT max(updated_at) FROM schoolman_records) AS newest,
              (SELECT max(finished_at) FROM bridge_runs WHERE ok AND source = 'schoolman-copy') AS last,
              (SELECT max(last_batch_at) FROM schoolman_sync_tables) AS sent`
    )
  ).rows;
  if (!newest) {
    console.log('the copy of SchoolMan is empty: the sync service has not sent anything yet');
    return;
  }
  if (last && newest <= last && !process.argv.includes('--always')) {
    console.log(`nothing changed in SchoolMan since ${last.toISOString()}`);
    return;
  }
  // SchoolMan as it was when the sync service last sent: what the workspace shows as „Stand".
  const readAt = sent ?? new Date();
  const columns = path.join(work, 'columns.json');
  process.stdout.write(await run(process.execPath, [path.join(HERE, 'mirror-export.mjs'), columns]));

  const before = await counts();
  const done = [];
  for (const step of BRIDGE_STEPS.filter((s) => !only || only.includes(s.name))) {
    console.log(`== ${step.name}`);
    let input;
    try {
      input = await run('python3', ['-I', path.join(HERE, step.reader)], { FM_MIRROR: columns, TZ: 'Europe/Berlin' });
      JSON.parse(input);
    } catch (error) {
      console.error(`${step.name}: the reader failed (${error.message}); the steps after it were not run.`);
      done.push({ name: step.name, ok: false, summary: 'reader failed' });
      ok = false;
      break;
    }
    const result = await importStep(step.importer, input);
    done.push({ name: step.name, ...result });
    if (!result.ok) {
      console.error(`${step.name} failed; the steps after it were not run.`);
      ok = false;
      break;
    }
  }
  const after = await counts();
  await lock.query(`INSERT INTO bridge_runs (source, read_at, ok, steps) VALUES ('schoolman-copy', $1, $2, $3::jsonb)`, [readAt, ok, JSON.stringify(done)]);
  printCounts(before, after);
  console.log(ok ? '\nbridge run complete' : '\nbridge run FAILED');
}

try {
  await bridge();
} finally {
  rmSync(work, { recursive: true, force: true });
  await lock.end();
}
process.exit(ok ? 0 : 1);
