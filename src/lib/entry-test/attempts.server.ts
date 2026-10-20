import 'server-only';

import { createHash, randomBytes, randomInt } from 'node:crypto';

import type { PoolClient } from 'pg';

import { query, queryFirst, withTransaction } from '@/lib/admin/db';
import { berlinDay } from '@/lib/admin/days';

import { CONTENT } from './content';
import { KEYS } from './keys.server';
import { ENTRY_TESTS, GRACE_MS, cleanAnswers, entryTestFor, scoreAnswers, slotKinds } from './tests';
import type { Answer, AttemptState, AttemptStatus, Choice, ClientTask, EntryTestId, EntryTestVersion, OpenSitting, StatusReply } from './types';

/**
 * The learner's side of the day-one test (docs/ENTRY_TEST.md), ported rule for rule from the Google
 * Apps Script it replaces (examStart … examSubmit): a sitting is open for the morning or the afternoon
 * classes; the same e-mail again continues the attempt, paused, so only the teacher's code lets it go on;
 * leaving the page pauses it; three wrong codes wait a minute; the deadline is the server's and saves are
 * taken 90 seconds past it; an attempt is marked when it is handed in or its time is up. The phone holds
 * a token, the database only its hash.
 */

type AttemptRow = {
  id: string;
  sitting_id: string;
  test: EntryTestId;
  on_date: string;
  code: string;
  source: 'phone' | 'paper';
  name: string;
  email: string | null;
  person_id: string | null;
  version: EntryTestVersion;
  status: AttemptStatus;
  answers: Answer[];
  option_order: Record<string, Choice[]> | null;
  interruptions: number;
  code_tries: number;
  blocked_until: Date | null;
  deadline: Date | null;
};

const ATTEMPT = `SELECT a.id, a.sitting_id, s.test, to_char(s.on_date, 'YYYY-MM-DD') AS on_date, s.code, a.source, a.name, a.email, a.person_id,
                        a.version, a.status, a.answers, a.option_order, a.interruptions, a.code_tries, a.blocked_until, a.deadline
                   FROM entry_test_attempts a JOIN entry_test_sittings s ON s.id = a.sitting_id`;

const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const done = (status: AttemptStatus) => status === 'submitted' || status === 'expired';
const late = (row: Pick<AttemptRow, 'deadline'>) => !!row.deadline && Date.now() > row.deadline.getTime() + GRACE_MS;
const LOG = (what: string) => `log = log || jsonb_build_array(jsonb_build_object('at', now(), 'what', ${what}::text))`;

function reply(row: Pick<AttemptRow, 'status' | 'deadline'>, extra: Partial<StatusReply> = {}): StatusReply {
  return { status: row.status, deadline: row.deadline?.getTime() ?? Date.now(), now: Date.now(), ...extra };
}

function shuffled(): Choice[] {
  const ids: Choice[] = ['A', 'B', 'C', 'D'];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** The tasks as this attempt shows them: options in its own order, each with its first answer slot. */
function clientTasks(test: EntryTestId, version: EntryTestVersion, order: Record<string, Choice[]> | null): ClientTask[] {
  let slot = 0;
  return CONTENT[test][version].map((task): ClientTask => {
    if (task.type === 'mc') {
      const ids = order?.[String(task.n)] ?? (['A', 'B', 'C', 'D'] as Choice[]);
      const out: ClientTask = { type: 'mc', n: task.n, prompt: task.prompt, options: ids.map((id) => ({ id, text: task.options[id] })), slot };
      slot += 1;
      return out;
    }
    const out: ClientTask = { ...task, slot };
    slot += task.statements.length;
    return out;
  });
}

const kindsOf = (test: EntryTestId, version: EntryTestVersion) => slotKinds(CONTENT[test][version]);

/** A stored answer list, at the test's length (an old or short list is padded with blanks). */
function fullAnswers(row: Pick<AttemptRow, 'test' | 'version' | 'answers'>): Answer[] {
  const kinds = kindsOf(row.test, row.version);
  return cleanAnswers([...(Array.isArray(row.answers) ? row.answers : []), ...kinds.map(() => '')].slice(0, kinds.length), kinds) ?? kinds.map(() => '');
}

function state(row: AttemptRow, token: string): AttemptState {
  return {
    ...reply(row),
    token,
    name: row.name,
    title: ENTRY_TESTS[row.test].title,
    version: row.version,
    tasks: clientTasks(row.test, row.version, row.option_order),
    answers: fullAnswers(row),
  };
}

async function byToken(token: string): Promise<AttemptRow | null> {
  if (!TOKEN.test(token)) return null;
  return (await queryFirst<AttemptRow>(`${ATTEMPT} WHERE a.token_hash = $1`, [hashOf(token)])) ?? null;
}

// ---------------------------------------------------------------- start

/** The sittings open right now: today's, opened and not closed (never their codes). */
export async function openSittings(): Promise<OpenSitting[]> {
  const rows = await query<{ id: string; test: EntryTestId; session: 'morning' | 'afternoon'; minutes: number }>(
    `SELECT id, test, session, minutes FROM entry_test_sittings
      WHERE on_date = $1::date AND opened_at IS NOT NULL AND closed_at IS NULL ORDER BY session, test`,
    [berlinDay(new Date())]
  );
  return rows.map((r) => ({
    id: r.id,
    title: ENTRY_TESTS[r.test].title,
    course: `Kurs ${ENTRY_TESTS[r.test].course}`,
    session: r.session,
    minutes: r.minutes,
    tasks: CONTENT[r.test].A.length,
  }));
}

export type StartResult = { ok: true; state: AttemptState } | { ok: false; error: 'closed' | 'sitting' | 'done' };

export async function startAttempt(name: string, email: string, sittingId: string | undefined): Promise<StartResult> {
  const today = berlinDay(new Date());
  const token = randomBytes(32).toString('base64url');
  const outcome = await withTransaction(async (client): Promise<StartResult | { expire: string }> => {
    // One start at a time: the version alternates by the count in the sitting.
    const open = (
      await client.query<{ id: string; test: EntryTestId; minutes: number }>(
        `SELECT id, test, minutes FROM entry_test_sittings WHERE on_date = $1::date AND opened_at IS NOT NULL AND closed_at IS NULL ORDER BY session, test FOR UPDATE`,
        [today]
      )
    ).rows;
    const existing = (await client.query<AttemptRow>(`${ATTEMPT} WHERE s.on_date = $1::date AND lower(a.email) = $2 ORDER BY a.started_at DESC LIMIT 1 FOR UPDATE OF a`, [today, email])).rows[0];
    if (existing) {
      if (done(existing.status)) return { ok: false, error: 'done' };
      if (late(existing)) return { expire: existing.id };
      // The same e-mail again (a reload, another browser, another phone): it goes on, but only with the code.
      const paused = (
        await client.query<AttemptRow>(
          `UPDATE entry_test_attempts SET token_hash = $2, status = 'paused', interruptions = interruptions + 1, last_seen_at = now(), updated_at = now(),
                  ${LOG(`'neu geöffnet'`)}
            WHERE id = $1 RETURNING id`,
          [existing.id, hashOf(token)]
        )
      ).rows[0];
      if (!paused) return { ok: false, error: 'done' };
      return { ok: true, state: state({ ...existing, status: 'paused' }, token) };
    }
    if (!open.length) return { ok: false, error: 'closed' };
    const sitting = open.find((s) => s.id === sittingId) ?? (open.length === 1 ? open[0] : null);
    if (!sitting) return { ok: false, error: 'sitting' };
    const { rows: counted } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM entry_test_attempts WHERE sitting_id = $1 AND source = 'phone'`, [sitting.id]);
    const version: EntryTestVersion = counted[0].n % 2 === 0 ? 'A' : 'B';
    const order = Object.fromEntries(CONTENT[sitting.test][version].filter((t) => t.type === 'mc').map((t) => [String(t.n), shuffled()]));
    const blank = kindsOf(sitting.test, version).map(() => '');
    const { rows } = await client.query<AttemptRow>(
      `WITH made AS (
         INSERT INTO entry_test_attempts (sitting_id, source, token_hash, name, email, version, status, answers, option_order, deadline, last_seen_at, log)
         VALUES ($1, 'phone', $2, $3, $4, $5, 'running', $6::jsonb, $7::jsonb, now() + make_interval(mins => $8), now(),
                 jsonb_build_array(jsonb_build_object('at', now(), 'what', 'gestartet')))
         RETURNING *)
       SELECT m.id, m.sitting_id, $9::text AS test, $10::text AS on_date, '' AS code, m.source, m.name, m.email, m.person_id, m.version, m.status,
              m.answers, m.option_order, m.interruptions, m.code_tries, m.blocked_until, m.deadline
         FROM made m`,
      [sitting.id, hashOf(token), name, email, version, JSON.stringify(blank), JSON.stringify(order), sitting.minutes, sitting.test, today]
    );
    return { ok: true, state: state(rows[0], token) };
  });
  if ('expire' in outcome) {
    await finalize(outcome.expire, 'expired');
    return { ok: false, error: 'done' };
  }
  return outcome;
}

// ---------------------------------------------------------------- while it runs

/** Every change on the phone: all answers, while it runs and its time is not up. */
export async function saveAnswers(token: string, answers: unknown): Promise<StatusReply | null> {
  const row = await byToken(token);
  if (!row) return null;
  if (row.status !== 'running') return reply(row);
  if (late(row)) return reply({ ...row, status: await finalize(row.id, 'expired') });
  const clean = cleanAnswers(answers, kindsOf(row.test, row.version));
  if (!clean) return reply(row);
  const saved = await queryFirst<Pick<AttemptRow, 'status' | 'deadline'>>(
    `UPDATE entry_test_attempts SET answers = $2::jsonb, answered = $3, last_seen_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'running' RETURNING status, deadline`,
    [row.id, JSON.stringify(clean), clean.filter(Boolean).length]
  );
  return reply(saved ?? (await byToken(token)) ?? row);
}

/** The page was hidden or closed: paused, with the answers it sent along. */
export async function leaveAttempt(token: string, reason: 'hidden' | 'pagehide', answers: unknown): Promise<StatusReply | null> {
  const row = await byToken(token);
  if (!row) return null;
  if (row.status !== 'running') return reply(row);
  if (late(row)) return reply({ ...row, status: await finalize(row.id, 'expired') });
  const clean = answers === undefined ? null : cleanAnswers(answers, kindsOf(row.test, row.version));
  const paused = await queryFirst<Pick<AttemptRow, 'status' | 'deadline'>>(
    `UPDATE entry_test_attempts
        SET status = 'paused', interruptions = interruptions + 1, last_seen_at = now(), updated_at = now(),
            answers = coalesce($2::jsonb, answers), answered = coalesce($3, answered), ${LOG('$4')}
      WHERE id = $1 AND status = 'running' RETURNING status, deadline`,
    [row.id, clean ? JSON.stringify(clean) : null, clean ? clean.filter(Boolean).length : null, reason === 'pagehide' ? 'Seite geschlossen' : 'Seite verlassen']
  );
  return reply(paused ?? row);
}

/** The teacher's code goes on with a paused attempt; three wrong codes in a row wait a minute. */
export async function unlockAttempt(token: string, code: string): Promise<StatusReply | null> {
  if (!TOKEN.test(token)) return null;
  const outcome = await withTransaction(async (client): Promise<StatusReply | { expire: AttemptRow } | null> => {
    const row = (await client.query<AttemptRow>(`${ATTEMPT} WHERE a.token_hash = $1 FOR UPDATE OF a`, [hashOf(token)])).rows[0];
    if (!row) return null;
    if (done(row.status)) return reply(row);
    if (late(row)) return { expire: row };
    if (row.blocked_until && row.blocked_until.getTime() > Date.now()) {
      return reply(row, { problem: 'wait', waitSeconds: Math.ceil((row.blocked_until.getTime() - Date.now()) / 1000) });
    }
    if (code.trim() !== row.code) {
      const tries = row.code_tries + 1;
      await client.query(
        `UPDATE entry_test_attempts SET code_tries = $2, blocked_until = $3, updated_at = now(), ${LOG(`'falscher Code'`)} WHERE id = $1`,
        [row.id, tries >= 3 ? 0 : tries, tries >= 3 ? new Date(Date.now() + 60_000) : null]
      );
      return reply(row, { problem: 'wrong' });
    }
    if (row.status === 'running') return reply(row);
    await client.query(
      `UPDATE entry_test_attempts SET status = 'running', code_tries = 0, blocked_until = NULL, last_seen_at = now(), updated_at = now(), ${LOG(`'freigegeben'`)} WHERE id = $1`,
      [row.id]
    );
    return reply({ ...row, status: 'running' });
  });
  if (outcome && 'expire' in outcome) return reply({ ...outcome.expire, status: await finalize(outcome.expire.id, 'expired') });
  return outcome;
}

/** Polled while paused: the office can let it go on from the Tagesplan; a time that is up hands it in. */
export async function attemptStatus(token: string): Promise<StatusReply | null> {
  const row = await byToken(token);
  if (!row) return null;
  if (!done(row.status) && late(row)) return reply({ ...row, status: await finalize(row.id, 'expired') });
  return reply(row);
}

/** Handed in on the phone (or at 0:00 by the phone itself): the answers sent along count unless they come late. */
export async function submitAttempt(token: string, answers: unknown): Promise<StatusReply | null> {
  const row = await byToken(token);
  if (!row) return null;
  if (row.status !== 'running') return reply(row);
  const isLate = late(row);
  const clean = cleanAnswers(answers, kindsOf(row.test, row.version));
  if (clean && !isLate) {
    await query(`UPDATE entry_test_attempts SET answers = $2::jsonb, answered = $3, updated_at = now() WHERE id = $1 AND status = 'running'`, [
      row.id,
      JSON.stringify(clean),
      clean.filter(Boolean).length,
    ]);
  }
  return reply({ ...row, status: await finalize(row.id, isLate ? 'expired' : 'submitted') });
}

// ---------------------------------------------------------------- marking

/** Hands in every attempt of a sitting whose time is up (Google ran this every five minutes). */
export async function finalizeOverdue(sittingId: string): Promise<void> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM entry_test_attempts
      WHERE sitting_id = $1 AND status IN ('running', 'paused') AND deadline + make_interval(secs => $2) < now()`,
    [sittingId, GRACE_MS / 1000]
  );
  for (const r of rows) await finalize(r.id, 'expired');
}

/** Marks an attempt and puts the result on the learner's record. Returns the status it ends with. */
export async function finalize(attemptId: string, status: 'submitted' | 'expired'): Promise<AttemptStatus> {
  return withTransaction((client) => finalizeWith(client, attemptId, status));
}

export async function finalizeWith(client: PoolClient, attemptId: string, status: 'submitted' | 'expired'): Promise<AttemptStatus> {
  const row = (await client.query<AttemptRow>(`${ATTEMPT} WHERE a.id = $1 FOR UPDATE OF a`, [attemptId])).rows[0];
  if (!row) return status;
  if (done(row.status)) return row.status;
  const answers = fullAnswers(row);
  const score = scoreAnswers(answers, KEYS[row.test][row.version]);
  const match = row.person_id ? { person_id: row.person_id, booking_id: null } : row.email ? await matchPerson(client, row.test, row.on_date, row.email) : null;
  let personTestId: string | null = null;
  if (match) {
    const comment = [
      `Version ${row.version}`,
      `Aufgaben ${score.grammar}/${score.grammarMax}`,
      `Lesen ${score.reading}/${score.readingMax}`,
      score.blank ? `${score.blank} leer` : null,
      row.interruptions ? `${row.interruptions}× Seite verlassen` : null,
      status === 'expired' ? 'Zeit abgelaufen' : null,
    ]
      .filter(Boolean)
      .join(' · ');
    personTestId = (
      await client.query<{ id: string }>(
        `INSERT INTO person_tests (person_id, booking_id, taken_on, test, score, result, comment, author_name)
         VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8) RETURNING id`,
        [
          match.person_id,
          match.booking_id,
          row.on_date,
          ENTRY_TESTS[row.test].title,
          Math.round((score.total / Math.max(score.max, 1)) * 100),
          `${score.total}/${score.max} Punkte`,
          comment,
          row.source === 'paper' ? 'Einstufungstest (Papier)' : 'Einstufungstest (Handy)',
        ]
      )
    ).rows[0].id;
  }
  await client.query(
    `UPDATE entry_test_attempts
        SET status = $2, submitted_at = now(), updated_at = now(), answers = $3::jsonb, answered = $4,
            score = $5, max_score = $6, grammar = $7, reading = $8, blank = $9, person_id = $10, person_test_id = $11, ${LOG('$12')}
      WHERE id = $1`,
    [
      row.id,
      status,
      JSON.stringify(answers),
      answers.filter(Boolean).length,
      score.total,
      score.max,
      score.grammar,
      score.reading,
      score.blank,
      match?.person_id ?? null,
      personTestId,
      status === 'expired' ? 'Zeit abgelaufen – abgegeben' : 'abgegeben',
    ]
  );
  return status;
}

/** The levels that write a test, for finding the class an e-mail belongs to. */
const levelsOf = (test: EntryTestId) => ['A2', 'A2.1', 'B1', 'B1.1', 'B1+', 'B1+.1'].filter((level) => entryTestFor(level) === test);

/**
 * The learner an e-mail belongs to: first among the classes that write this test that day (with the
 * booking), else the one person anywhere with that address. Two candidates match nobody.
 */
async function matchPerson(client: PoolClient, test: EntryTestId, day: string, email: string): Promise<{ person_id: string; booking_id: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  const inClass = (
    await client.query<{ person_id: string; booking_id: string }>(
      `SELECT DISTINCT b.person_id, b.id AS booking_id
         FROM course_days d
         JOIN courses c ON c.id = d.course_id
         JOIN booking_periods bp ON bp.course_id = c.id AND bp.start_date <= d.on_date AND bp.end_date >= d.on_date
         JOIN bookings b ON b.id = bp.booking_id AND b.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed')
         JOIN emails e ON e.person_id = b.person_id AND e.normalized = $3
        WHERE d.on_date = $1::date AND c.level_code = ANY($2::text[])`,
      [day, levelsOf(test), normalized]
    )
  ).rows;
  if (new Set(inClass.map((r) => r.person_id)).size === 1) return inClass[0];
  if (inClass.length) return null;
  const anywhere = (
    await client.query<{ person_id: string }>(
      `SELECT DISTINCT canonical_person_id(e.person_id) AS person_id FROM emails e JOIN people p ON p.id = e.person_id AND p.deleted_at IS NULL WHERE e.normalized = $1`,
      [normalized]
    )
  ).rows;
  return anywhere.length === 1 ? { person_id: anywhere[0].person_id, booking_id: null } : null;
}
