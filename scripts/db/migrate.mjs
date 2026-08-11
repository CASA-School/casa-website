/**
 * Tracked, transactional SQL migration runner.
 *
 * Modelled on the migration discipline the CASA student app gets from Alembic
 * (a version table, a migration applied exactly once, one transaction per
 * migration), implemented for this repo's Node + Neon stack.
 *
 * Replaces `apply-sql-directory.mjs` for migrations, which re-executed every
 * .sql file on every run with no tracking, no transaction, and no lock. That
 * survived only because the schema file happened to be written defensively.
 * It stops being survivable the moment a migration contains UPDATE statements:
 * re-running would silently re-apply data corrections over later staff edits.
 *
 * Seeds keep the old apply-every-time behaviour — they are written idempotently
 * with WHERE NOT EXISTS / ON CONFLICT and are meant to be re-runnable.
 *
 * Usage:
 *   node scripts/db/migrate.mjs                  apply pending migrations
 *   node scripts/db/migrate.mjs --status         list applied and pending
 *   node scripts/db/migrate.mjs --baseline=0002  record up to 0002 as applied
 *                                                WITHOUT running it, for
 *                                                adopting tracking on a
 *                                                database that already has the
 *                                                schema
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const MIGRATIONS_DIR = 'db/migrations';
/** Arbitrary but stable key so two runners cannot migrate concurrently. */
const ADVISORY_LOCK_KEY = 8_140_2026;

const args = process.argv.slice(2);
const statusOnly = args.includes('--status');
const baselineArg = args.find((a) => a.startsWith('--baseline='));
const baselineTo = baselineArg ? baselineArg.split('=')[1] : null;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

function versionOf(filename) {
  return filename.replace(/\.sql$/, '');
}

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

async function loadMigrations() {
  const dir = path.resolve(process.cwd(), MIGRATIONS_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  return Promise.all(
    files.map(async (file) => {
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      return { file, version: versionOf(file), sql, checksum: checksum(sql) };
    })
  );
}

const client = new Client({ connectionString });
let locked = false;

try {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
  locked = true;

  const migrations = await loadMigrations();
  const { rows: appliedRows } = await client.query(
    'SELECT version, checksum, applied_at FROM schema_migrations'
  );
  const applied = new Map(appliedRows.map((r) => [r.version, r]));

  // A migration edited after it was applied is a silent divergence between
  // what the repo claims the schema is and what the database actually has.
  const drifted = migrations.filter(
    (m) => applied.has(m.version) && applied.get(m.version).checksum !== m.checksum
  );

  if (drifted.length > 0) {
    console.error('\nMigration files changed after they were applied:\n');
    for (const m of drifted) {
      console.error(`  ${m.file}`);
      console.error(`    recorded ${applied.get(m.version).checksum}  now ${m.checksum}`);
    }
    console.error('\nWrite a new migration instead of editing an applied one.');
    process.exit(1);
  }

  const pending = migrations.filter((m) => !applied.has(m.version));

  if (statusOnly) {
    console.log('\nApplied:');
    for (const m of migrations.filter((x) => applied.has(x.version))) {
      console.log(`  ${m.version}  ${applied.get(m.version).applied_at.toISOString()}`);
    }
    console.log(pending.length ? '\nPending:' : '\nPending: none');
    for (const m of pending) console.log(`  ${m.version}`);
    console.log('');
    process.exit(0);
  }

  if (baselineTo) {
    const upTo = migrations.filter((m) => m.version <= baselineTo && !applied.has(m.version));
    if (upTo.length === 0) {
      console.log(`Nothing to baseline at or below ${baselineTo}.`);
    }
    for (const m of upTo) {
      await client.query(
        'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [m.version, m.checksum]
      );
      console.log(`Baselined (not executed): ${m.version}`);
    }
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log('No pending migrations.');
    process.exit(0);
  }

  for (const migration of pending) {
    process.stdout.write(`Applying ${migration.file} ... `);
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
        [migration.version, migration.checksum]
      );
      await client.query('COMMIT');
      process.stdout.write('ok\n');
    } catch (error) {
      await client.query('ROLLBACK');
      process.stdout.write('FAILED\n');
      console.error(`\n${migration.file} rolled back. Nothing was applied from it.\n`);
      throw error;
    }
  }

  console.log(`\n${pending.length} migration(s) applied.`);
} finally {
  if (locked) {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
  }
  await client.end();
}
