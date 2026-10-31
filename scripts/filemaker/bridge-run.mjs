/**
 * What a bridge run does once SchoolMan's data is in hand, whether from a sealed bundle (bridge-unpack.mjs)
 * or from the workspace's copy (bridge-mirror.mjs): each step's importer fed its input, and the main
 * tables counted before and after. Counts only.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect } from '../db/client.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The tables a run fills, counted before and after. */
const TABLES = [
  'staff_members', 'courses', 'course_days', 'people', 'bookings', 'booking_periods', 'organisations', 'group_visits',
  'offers', 'accommodations', 'booking_stays', 'payments', 'letters', 'staff_notes', 'day_tasks',
];

export async function counts() {
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
export function importStep(importer, input) {
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

/**
 * The website registrations SchoolMan has now booked (0113): every sure match linked to its booking, the
 * rest left for a colleague on the Anmeldung. At the end of every run, whichever steps ran — the learner
 * may have registered online after the booking came across. Never fails a run: the link waits for the next.
 */
export async function linkRegistrations(client) {
  try {
    if (!(await client.query(`SELECT to_regproc('link_registrations_to_schoolman') AS f`)).rows[0].f) return;
    const [{ n }] = (await client.query(`SELECT link_registrations_to_schoolman() AS n`)).rows;
    if (n) console.log(`${n} website registration line${n === 1 ? '' : 's'} linked to the SchoolMan booking made from ${n === 1 ? 'it' : 'them'}`);
  } catch (error) {
    console.error(`linking website registrations failed: ${error.message}`);
  }
}

export function printCounts(before, after) {
  console.log('\nrows        before → after');
  for (const table of Object.keys(after)) console.log(`  ${table.padEnd(16)} ${String(before[table] ?? '').padStart(7)} → ${after[table]}`);
}
