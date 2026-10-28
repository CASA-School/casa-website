/**
 * A bridge run from the workspace's copy of SchoolMan (migration 0090) instead of FileMaker Pro on the
 * office Mac (2026-10-27): the copy is turned back into the columns the readers know (mirror-export.mjs),
 * each `read_*.py` runs on it unchanged (`FM_MIRROR`), and each importer takes its reader's output as in
 * a run from a bundle. Runs inside Azure as a Container Apps job; two runs never overlap. Counts only.
 *
 * Only what changed (2026-10-28, migration 0099; Rahman: the Azure costs). The sync endpoint starts the
 * job when a batch changed the copy, and the job's hourly start catches anything that start missed. A run
 * does a step when a SchoolMan table it read last time has changed since (each table's `version`), when
 * the bridge's code changed, or when an earlier step of the run added or removed records others link to
 * (a booking now here, its attendance with it). The tables a step reads are noted as it reads them
 * (`FM_MIRROR_USED`, fm_read.py), and only those are exported. Once a night every step runs — whatever
 * depends on today's date (who is in the sample, which sittings lie ahead) moves on then. A run that
 * finds the copy moved on while it ran goes round again before it ends.
 *
 *   DATABASE_URL=… node scripts/filemaker/bridge-mirror.mjs [--only learners,money] [--always]
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect, requireConnectionString } from '../db/client.mjs';
import { counts, importStep, printCounts } from './bridge-run.mjs';
import { BRIDGE_STEPS } from './bridge-steps.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const only = arg('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
const ALL_TABLES = Object.keys(JSON.parse(readFileSync(path.join(HERE, 'sync-layouts.json'), 'utf8')));
/** Rounds in one run at most; a copy still moving on after them waits for its next start. */
const ROUNDS = 6;

/** The bridge's code: a step whose readers or importers changed since it last ran runs again. */
const CODE = createHash('sha256')
  .update(
    readdirSync(HERE)
      .filter((f) => /\.(py|mjs|json)$/.test(f))
      .sort()
      .map((f) => f + readFileSync(path.join(HERE, f), 'utf8'))
      .join('\0')
  )
  .digest('hex')
  .slice(0, 16);

/** The records later steps attach to: a step that adds or removes any of them runs every step after it. */
const LINKED = ['staff_members', 'courses', 'course_days', 'people', 'bookings', 'booking_periods', 'organisations', 'group_visits', 'offers', 'accommodations', 'booking_stays'];

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
await lock.query(`UPDATE schoolman_bridge_state SET running_since = timezone('utc', now())`);

const linkedCounts = async () =>
  (await lock.query(`SELECT ${LINKED.map((t) => `(SELECT count(*) FROM ${t})`).join(' + ')} AS n`)).rows[0].n;

/** Every step once a night, and after a day without one whatever the hour. */
async function fullDue() {
  if (process.argv.includes('--always')) return true;
  const [{ last }] = (await lock.query(`SELECT last_full_at AS last FROM schoolman_bridge_state`)).rows;
  if (!last) return true;
  const hours = (Date.now() - last.getTime()) / 3_600_000;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' }).format(new Date()));
  return hours > 30 || (hours > 20 && hour >= 2 && hour < 6);
}

let ok = true;
async function round(full) {
  const versions = new Map((await lock.query(`SELECT source_table, version::text FROM schoolman_sync_tables`)).rows.map((r) => [r.source_table, r.version]));
  const sum = [...versions.values()].reduce((a, v) => a + BigInt(v), 0n);
  const [{ sent }] = (await lock.query(`SELECT max(last_batch_at) AS sent FROM schoolman_sync_tables`)).rows;
  const known = new Map((await lock.query(`SELECT step, tables, code FROM schoolman_bridge_steps`)).rows.map((r) => [r.step, r]));
  const work = mkdtempSync(path.join(tmpdir(), 'schoolman-'));
  const exported = new Set();
  const exportTables = async (tables) => {
    const missing = tables.filter((t) => !exported.has(t));
    if (!missing.length) return;
    process.stdout.write(await run(process.execPath, [path.join(HERE, 'mirror-export.mjs'), work, missing.join(',')]));
    missing.forEach((t) => exported.add(t));
  };

  const before = await counts();
  const done = [];
  const skipped = [];
  let cascade = false;
  try {
    for (const step of BRIDGE_STEPS.filter((s) => !only || only.includes(s.name))) {
      const last = known.get(step.name);
      const fresh = last && last.code === CODE;
      const moved = !fresh || Object.entries(last.tables).some(([t, v]) => (versions.get(t) ?? '0') !== v);
      if (!full && !cascade && !moved && !only) {
        skipped.push(step.name);
        continue;
      }
      console.log(`== ${step.name}`);
      const used = path.join(work, `${step.name}.used`);
      let input;
      try {
        await exportTables(fresh ? Object.keys(last.tables) : ALL_TABLES);
        input = await run('python3', ['-I', path.join(HERE, step.reader)], { FM_MIRROR: work, FM_MIRROR_USED: used, TZ: 'Europe/Berlin' })
          // It read a table it did not read last time: everything is there for the second try.
          .catch(async (error) => {
            if (exported.size === ALL_TABLES.length) throw error;
            await exportTables(ALL_TABLES);
            rmSync(used, { force: true });
            return run('python3', ['-I', path.join(HERE, step.reader)], { FM_MIRROR: work, FM_MIRROR_USED: used, TZ: 'Europe/Berlin' });
          });
        JSON.parse(input);
      } catch (error) {
        console.error(`${step.name}: the reader failed (${error.message}); the steps after it were not run.`);
        done.push({ name: step.name, ok: false, summary: 'reader failed' });
        ok = false;
        break;
      }
      const linked = await linkedCounts();
      const result = await importStep(step.importer, input);
      done.push({ name: step.name, ...result });
      if (!result.ok) {
        console.error(`${step.name} failed; the steps after it were not run.`);
        ok = false;
        break;
      }
      const tables = [...new Set(readFileSync(used, 'utf8').split('\n').filter(Boolean))];
      await lock.query(
        `INSERT INTO schoolman_bridge_steps (step, tables, code) VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (step) DO UPDATE SET tables = EXCLUDED.tables, code = EXCLUDED.code, ran_at = timezone('utc', now())`,
        [step.name, JSON.stringify(Object.fromEntries(tables.map((t) => [t, versions.get(t) ?? '0']))), CODE]
      );
      if ((await linkedCounts()) !== linked) cascade = true;
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (skipped.length) console.log(`unchanged, not run: ${skipped.join(', ')}`);
  // SchoolMan as it was when the sync service last sent: what the workspace shows as „Stand".
  await lock.query(`INSERT INTO bridge_runs (source, read_at, ok, steps) VALUES ('schoolman-copy', $1, $2, $3::jsonb)`, [sent ?? new Date(), ok, JSON.stringify(done)]);
  if (done.length) printCounts(before, await counts());
  if (ok && full) await lock.query(`UPDATE schoolman_bridge_state SET last_full_at = timezone('utc', now())`);
  return sum;
}

/** Ends the run unless the copy moved on since `sum` was read; then the run goes round again. */
let ended = false;
async function finish(sum, force) {
  const result = await lock.query(
    `UPDATE schoolman_bridge_state SET running_since = NULL, requested_at = NULL
      WHERE $2 OR (SELECT coalesce(sum(version), 0) FROM schoolman_sync_tables) = $1::numeric RETURNING true`,
    [sum.toString(), force]
  );
  ended = result.rowCount > 0;
  return ended;
}

try {
  const [{ held }] = (await lock.query(`SELECT count(*)::int AS held FROM schoolman_records`)).rows;
  // Only on a whole copy: while the first read is still arriving, a learner can be here without their
  // bookings, and the importers would take what is missing for deleted in SchoolMan.
  const whole = new Set((await lock.query(`SELECT source_table FROM schoolman_sync_tables WHERE last_complete_at IS NOT NULL`)).rows.map((r) => r.source_table));
  const missing = ALL_TABLES.filter((t) => !whole.has(t));
  if (!held) console.log('the copy of SchoolMan is empty: the sync service has not sent anything yet');
  else if (missing.length) console.log(`the copy is not whole yet: ${missing.length} of ${ALL_TABLES.length} tables not read completely (${missing.slice(0, 5).join(', ')}…)`);
  else {
    let full = await fullDue();
    for (let n = 1; ; n++) {
      const sum = await round(full);
      full = false;
      if (!ok || (await finish(sum, n >= ROUNDS))) break;
      console.log('\nSchoolMan changed during the run: once more');
    }
    console.log(ok ? '\nbridge run complete' : '\nbridge run FAILED');
  }
} finally {
  if (!ended) await finish(0n, true);
  await lock.end();
}
process.exit(ok ? 0 : 1);
