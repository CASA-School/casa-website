import 'server-only';

import { randomInt } from 'node:crypto';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { berlinDay } from './days';
import { query, queryFirst, withTransaction } from './db';
import type { Bilingual } from './i18n';
import { CONTENT } from '@/lib/entry-test/content';
import { finalizeOverdue, finalizeWith } from '@/lib/entry-test/attempts.server';
import { KEYS } from '@/lib/entry-test/keys.server';
import { ENTRY_TESTS, cleanAnswers, entryTestFor, scoreAnswers, slotKinds, slotLabels, type Mark } from '@/lib/entry-test/tests';
import type { Answer, AttemptStatus, EntryTestId, EntryTestVersion } from '@/lib/entry-test/types';
import { publicSiteAddress } from '@/lib/cms/origins';
import { lanAddresses } from '@/lib/dev/lan';
import { qrPath } from '@/lib/qr';

/**
 * The day-one test in the Tagesplan (docs/ENTRY_TEST.md): on the first day of an intensive course, the
 * A2, B1 and B1+ classes of the morning and of the afternoon each write their test. The office opens a
 * sitting, gives the teachers its code, sees the phones as they go, types in a paper booklet, and downloads
 * the results. A sitting exists from the moment it is first opened.
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type EntryTestSession = 'morning' | 'afternoon';

export type EntryTestClass = {
  dayId: string;
  courseId: string;
  groupIndex: number;
  label: string;
  number: string | null;
  roomName: string | null;
  teacherName: string | null;
  /** The day's teacher's e-mail address, for the mail with the codes. */
  teacherEmail: string | null;
  startsAt: string | null;
};

/** Open on its day; ready ahead of it (the code made, the phones see it from that day); closed. */
export type SittingState = 'open' | 'ready' | 'closed';

export type EntryTestSitting = {
  id: string;
  code: string;
  minutes: number;
  state: SittingState;
  openedAt: Date | null;
  running: number;
  paused: number;
  handedIn: number;
};

/** One test of one session on a day: the classes that write it, and its sitting once opened. */
export type DayEntryTest = {
  session: EntryTestSession;
  test: EntryTestId;
  title: string;
  course: string;
  checks: string;
  classes: EntryTestClass[];
  sitting: EntryTestSitting | null;
};

const SESSION_ORDER: EntryTestSession[] = ['morning', 'afternoon'];

/**
 * Open for the phones: opened, not closed, and on its own day — a day that is over is in the archive. Opened
 * ahead of its day (Rahman, 2026-10-22: the codes ready before the start), it is ready until then.
 */
function stateOf(s: { opened_at: Date | null; closed_at: Date | null }, day: string): SittingState {
  if (!s.opened_at || s.closed_at) return 'closed';
  const today = berlinDay(new Date());
  return day === today ? 'open' : day > today ? 'ready' : 'closed';
}

/**
 * The archive (Rahman, 2026-10-20: once the day is over, its tests are archived): a sitting of a past day
 * is closed at the end of its day, and a phone still writing or paused is handed in with what it saved.
 * Run before the Tagesplan and the archive are read; a deletion period can later drop old days here.
 */
export async function archivePastSittings(): Promise<void> {
  const today = berlinDay(new Date());
  await query(
    `UPDATE entry_test_sittings SET closed_at = ((on_date + 1)::timestamp AT TIME ZONE 'Europe/Berlin')
      WHERE on_date < $1::date AND closed_at IS NULL`,
    [today]
  );
  const left = await query<{ id: string }>(
    `SELECT a.id FROM entry_test_attempts a JOIN entry_test_sittings s ON s.id = a.sitting_id
      WHERE s.on_date < $1::date AND a.status IN ('running', 'paused')`,
    [today]
  );
  for (const a of left) await withTransaction((client) => finalizeWith(client, a.id, 'expired'));
}

/** The days that had a test, the latest first: the archive's list. */
export async function entryTestDays(): Promise<string[]> {
  const rows = await query<{ day: string }>(`SELECT DISTINCT to_char(on_date, 'YYYY-MM-DD') AS day FROM entry_test_sittings ORDER BY day DESC`);
  return rows.map((r) => r.day);
}

/**
 * Where the phones open the test: the public site's address (neu.casa-bremen.de until the switch,
 * casa-bremen.de after). On a laptop running `next dev` that is localhost, which a phone cannot open, so
 * there it is the laptop's address in the local network instead.
 */
export async function entryTestOrigin(): Promise<string> {
  const address = await publicSiteAddress();
  if (process.env.NODE_ENV === 'production') return address;
  const url = new URL(address);
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) return address;
  const [lan] = lanAddresses();
  if (lan) url.hostname = lan;
  return url.origin;
}

/** The address a course's QR code opens: the phone page with that course's test chosen. */
export const entryTestLink = (origin: string, test: EntryTestId) => `${origin}/test?kurs=${test}`;

export type PaperTask = { n: number; kind: 'mc' | 'rf'; statements: number };

/** A day's tests as the Tagesplan and the archive show them: each with its attempts and its QR code. */
export type EntryTestView = DayEntryTest & { detail: SittingDetail | null; paper: PaperTask[]; link: string; qr: { size: number; path: string } };

export async function entryTestViews(day: string, origin: string): Promise<EntryTestView[]> {
  const tests = await dayEntryTests(day);
  return Promise.all(
    tests.map(async (test) => {
      // Read after the attempts whose time is up were handed in, so the line's counts agree with the panel.
      const detail = test.sitting ? await sittingDetail(test.sitting.id) : null;
      const count = (...statuses: string[]) => detail?.attempts.filter((a) => statuses.includes(a.status)).length ?? 0;
      const sitting = test.sitting && { ...test.sitting, running: count('running'), paused: count('paused'), handedIn: count('submitted', 'expired') };
      const link = entryTestLink(origin, test.test);
      return { ...test, sitting, detail, paper: paperLayout(test.test), link, qr: qrPath(link) };
    })
  );
}
/** A sitting with its classes, for the guide that carries its code. */
export async function sittingGuide(sittingId: string): Promise<{ day: string; test: DayEntryTest; sitting: EntryTestSitting } | null> {
  const row = await queryFirst<{ day: string; session: EntryTestSession; test: EntryTestId }>(
    `SELECT to_char(on_date, 'YYYY-MM-DD') AS day, session, test FROM entry_test_sittings WHERE id = $1`,
    [sittingId]
  );
  if (!row) return null;
  const test = (await dayEntryTests(row.day)).find((x) => x.session === row.session && x.test === row.test);
  return test?.sitting ? { day: row.day, test, sitting: test.sitting } : null;
}

const NAME = (alias: string) => `concat_ws(' ', ${alias}.first_name, ${alias}.last_name)`;

/** The first part of the levels that write a test on their first day. */
const FIRST_LEVELS = ['A2', 'A2.1', 'B1', 'B1.1', 'B1+', 'B1+.1'];

/** The days, today or later, on which an A2, B1 or B1+ intensive class has its first lesson: the next first. */
export async function upcomingEntryTestDays(from: string, limit = 4): Promise<string[]> {
  const rows = await query<{ day: string }>(
    `SELECT DISTINCT to_char(f.first_day, 'YYYY-MM-DD') AS day
       FROM (SELECT min(d.on_date) AS first_day
               FROM course_days d
               JOIN courses c ON c.id = d.course_id
               JOIN course_instances i ON i.id = c.course_instance_id
               JOIN course_types ty ON ty.id = i.course_type_id
              WHERE NOT d.cancelled AND ty.slug = 'intensive-german' AND c.level_code = ANY($2::text[])
              GROUP BY c.id) f
      WHERE f.first_day >= $1::date
      ORDER BY day LIMIT $3`,
    [from, FIRST_LEVELS, limit]
  );
  return rows.map((r) => r.day);
}

/** The next such day. */
export const nextEntryTestDay = async (from: string): Promise<string | null> => (await upcomingEntryTestDays(from, 1))[0] ?? null;

/** The tests of a day: the A2, B1 and B1+ intensive classes whose first lesson it is, by session and test. */
export async function dayEntryTests(day: string): Promise<DayEntryTest[]> {
  const [classes, sittings] = await Promise.all([
    query<{ day_id: string; course_id: string; group_index: number; level_code: string | null; number: string | null; room_name: string | null; teacher_name: string | null; teacher_email: string | null; starts_at: string | null; session: string | null }>(
      `SELECT d.id AS day_id, c.id AS course_id, d.group_index, c.level_code,
              coalesce(c.filemaker_group_ids[d.group_index], c.filemaker_course_id) AS number,
              coalesce(r.nickname, r.name, hr.nickname, hr.name) AS room_name, coalesce(nullif(trim(tm.short_name), ''), ${NAME('tp')}) AS teacher_name,
              (SELECT e.address FROM emails e WHERE e.person_id = tp.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS teacher_email,
              to_char(t.starts_at, 'HH24:MI') AS starts_at, coalesce(c.session, i.session) AS session
         FROM course_days d
         JOIN course_day_times t ON t.id = d.id
         JOIN courses c ON c.id = d.course_id
         JOIN course_instances i ON i.id = c.course_instance_id
         JOIN course_types ty ON ty.id = i.course_type_id
         LEFT JOIN rooms r ON r.id = d.room_id
         LEFT JOIN course_day_merges m ON m.guest_day_id = d.id
         LEFT JOIN course_days hd ON hd.id = m.host_day_id LEFT JOIN rooms hr ON hr.id = hd.room_id
         LEFT JOIN staff_members tm ON tm.id = d.teacher_id LEFT JOIN people tp ON tp.id = tm.person_id
        WHERE d.on_date = $1::date AND NOT d.cancelled AND ty.slug = 'intensive-german'
          AND c.level_code = ANY($2::text[])
          AND d.on_date = (SELECT min(x.on_date) FROM course_days x WHERE x.course_id = c.id AND NOT x.cancelled)
        ORDER BY t.starts_at NULLS LAST, level_rank(c.level_code), c.level_code, d.group_index`,
      [day, FIRST_LEVELS]
    ),
    query<{ id: string; session: EntryTestSession; test: EntryTestId; code: string; minutes: number; opened_at: Date | null; closed_at: Date | null; running: number; paused: number; handed_in: number }>(
      `SELECT s.id, s.session, s.test, s.code, s.minutes, s.opened_at, s.closed_at,
              count(a.id) FILTER (WHERE a.status = 'running')::int AS running,
              count(a.id) FILTER (WHERE a.status = 'paused')::int AS paused,
              count(a.id) FILTER (WHERE a.status IN ('submitted', 'expired'))::int AS handed_in
         FROM entry_test_sittings s LEFT JOIN entry_test_attempts a ON a.sitting_id = s.id
        WHERE s.on_date = $1::date GROUP BY s.id`,
      [day]
    ),
  ]);
  const tests = new Map<string, DayEntryTest>();
  const entry = (session: EntryTestSession, test: EntryTestId) => {
    const key = `${session}:${test}`;
    let found = tests.get(key);
    if (!found) {
      const meta = ENTRY_TESTS[test];
      found = { session, test, title: meta.title, course: meta.course, checks: meta.checks, classes: [], sitting: null };
      tests.set(key, found);
    }
    return found;
  };
  for (const c of classes) {
    const test = entryTestFor(c.level_code);
    const session = sessionOf(c.session, c.starts_at);
    if (!test || !session) continue;
    entry(session, test).classes.push({
      dayId: c.day_id,
      courseId: c.course_id,
      groupIndex: c.group_index,
      label: c.level_code ?? '',
      number: c.number,
      roomName: c.room_name,
      teacherName: c.teacher_name,
      teacherEmail: c.teacher_email,
      startsAt: c.starts_at,
    });
  }
  for (const s of sittings) {
    entry(s.session, s.test).sitting = {
      id: s.id,
      code: s.code,
      minutes: s.minutes,
      state: stateOf(s, day),
      openedAt: s.opened_at,
      running: s.running,
      paused: s.paused,
      handedIn: s.handed_in,
    };
  }
  const testOrder = Object.keys(ENTRY_TESTS);
  return [...tests.values()].sort(
    (a, b) => SESSION_ORDER.indexOf(a.session) - SESSION_ORDER.indexOf(b.session) || testOrder.indexOf(a.test) - testOrder.indexOf(b.test)
  );
}

/** Whether a day has its tests — an intensive start's first day, or a sitting: the Tagesplan's link to them. */
export async function hasEntryTests(day: string): Promise<boolean> {
  return (await dayEntryTests(day)).length > 0;
}

function sessionOf(session: string | null, startsAt: string | null): EntryTestSession | null {
  if (session === 'morning' || session === 'afternoon') return session;
  if (session === 'evening') return null;
  const hour = Number(/^(\d{1,2})/.exec(startsAt ?? '')?.[1]);
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : null;
}

// ---------------------------------------------------------------- attempts

export type EntryTestAttempt = {
  id: string;
  name: string;
  email: string | null;
  personId: string | null;
  personName: string | null;
  source: 'phone' | 'paper';
  version: EntryTestVersion;
  status: AttemptStatus;
  answered: number;
  slots: number;
  interruptions: number;
  startedAt: Date;
  submittedAt: Date | null;
  deadline: Date | null;
  score: number | null;
  max: number | null;
  grammar: number | null;
  grammarMax: number;
  reading: number | null;
  readingMax: number;
  blank: number | null;
  log: { at: string; what: string }[];
  /** Per slot: what was given and whether it was right; only once handed in. */
  marks: { label: string; given: Answer; mark: Mark; solution: string }[] | null;
  enteredBy: string | null;
};

export type SittingDetail = {
  id: string;
  day: string;
  session: EntryTestSession;
  test: EntryTestId;
  title: string;
  code: string;
  minutes: number;
  state: SittingState;
  attempts: EntryTestAttempt[];
};

/** A sitting with its attempts, newest last; first hands in every attempt whose time is up. */
export async function sittingDetail(sittingId: string): Promise<SittingDetail | null> {
  const sitting = await queryFirst<{ id: string; on_date: string; session: EntryTestSession; test: EntryTestId; code: string; minutes: number; opened_at: Date | null; closed_at: Date | null }>(
    `SELECT id, to_char(on_date, 'YYYY-MM-DD') AS on_date, session, test, code, minutes, opened_at, closed_at FROM entry_test_sittings WHERE id = $1`,
    [sittingId]
  );
  if (!sitting) return null;
  await finalizeOverdue(sitting.id);
  const rows = await query<{
    id: string;
    name: string;
    email: string | null;
    person_id: string | null;
    person_name: string | null;
    source: 'phone' | 'paper';
    version: EntryTestVersion;
    status: AttemptStatus;
    answers: Answer[];
    answered: number;
    interruptions: number;
    started_at: Date;
    submitted_at: Date | null;
    deadline: Date | null;
    score: number | null;
    max_score: number | null;
    grammar: number | null;
    reading: number | null;
    blank: number | null;
    log: { at: string; what: string }[];
    entered_by: string | null;
  }>(
    `SELECT a.id, a.name, a.email, a.person_id, ${NAME('p')} AS person_name, a.source, a.version, a.status, a.answers, a.answered, a.interruptions,
            a.started_at, a.submitted_at, a.deadline, a.score, a.max_score, a.grammar, a.reading, a.blank, a.log, u.name AS entered_by
       FROM entry_test_attempts a
       LEFT JOIN people p ON p.id = a.person_id
       LEFT JOIN staff_users u ON u.id = a.entered_by
      WHERE a.sitting_id = $1 ORDER BY a.started_at, a.name`,
    [sitting.id]
  );
  return {
    id: sitting.id,
    day: sitting.on_date,
    session: sitting.session,
    test: sitting.test,
    title: ENTRY_TESTS[sitting.test].title,
    code: sitting.code,
    minutes: sitting.minutes,
    state: stateOf(sitting, sitting.on_date),
    attempts: rows.map((r) => {
      const key = KEYS[sitting.test][r.version];
      const labels = slotLabels(CONTENT[sitting.test][r.version]);
      const handedIn = r.status === 'submitted' || r.status === 'expired';
      const marked = handedIn ? scoreAnswers(r.answers, key) : null;
      const parts = scoreAnswers([], key);
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        personId: r.person_id,
        personName: r.person_name,
        source: r.source,
        version: r.version,
        status: r.status,
        answered: r.answered,
        slots: key.length,
        interruptions: r.interruptions,
        startedAt: r.started_at,
        submittedAt: r.submitted_at,
        deadline: r.deadline,
        score: r.score,
        max: r.max_score,
        grammar: r.grammar,
        grammarMax: parts.grammarMax,
        reading: r.reading,
        readingMax: parts.readingMax,
        blank: r.blank,
        log: Array.isArray(r.log) ? r.log : [],
        marks: marked ? marked.marks.map((mark, i) => ({ label: labels[i], given: r.answers[i] ?? '', mark, solution: key[i] })) : null,
        enteredBy: r.entered_by,
      };
    }),
  };
}

/** Answer slots of a test's version, for the paper form: per task its number and its slot kinds. */
export function paperLayout(test: EntryTestId): PaperTask[] {
  return CONTENT[test].A.map((task) => (task.type === 'mc' ? { n: task.n, kind: 'mc', statements: 1 } : { n: task.n, kind: 'rf', statements: task.statements.length }));
}

// ---------------------------------------------------------------- actions

async function freshCode(day: string): Promise<string> {
  const used = new Set((await query<{ code: string }>(`SELECT code FROM entry_test_sittings WHERE on_date = $1::date`, [day])).map((r) => r.code));
  let code: string;
  do code = String(randomInt(1000, 10000));
  while (used.has(code));
  return code;
}

/** Opens a session's test for the phones — on its day, or ahead of it (made on first opening, with its own code); reopening keeps the code. */
export async function openEntryTest(input: { day: string; session: EntryTestSession; test: EntryTestId; minutes: number }, actor: StaffUser): Promise<Result> {
  const minutes = Math.max(5, Math.min(180, Math.round(input.minutes || ENTRY_TESTS[input.test].minutes)));
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO entry_test_sittings (on_date, session, test, code, minutes, opened_at, created_by)
     VALUES ($1::date, $2, $3, $4, $5, now(), $6)
     ON CONFLICT (on_date, session, test) DO UPDATE SET opened_at = coalesce(entry_test_sittings.opened_at, now()), closed_at = NULL, minutes = EXCLUDED.minutes
     RETURNING id`,
    [input.day, input.session, input.test, await freshCode(input.day), minutes, actor.id]
  );
  if (!row) return refuse('Der Test ließ sich nicht öffnen.', 'The test could not be opened.');
  await logActivity({ actor, entity: 'entry_test', entityId: row.id, action: 'entry_test_opened', detail: { day: input.day, session: input.session, test: input.test } });
  return { ok: true, id: row.id };
}

/**
 * „Tests öffnen" on the Tagesplan and the tests page (Rahman, 2026-10-22): an intensive start's A2, B1 and
 * B1+ courses, every one or the chosen ones, one sitting per test and morning or afternoon, shared by its
 * classes — on the day, or ahead of it, so the codes are ready; the phones see a test only on its day. A
 * test already open or ready is left as it is.
 */
export async function openEntryTests(day: string, dayIds: readonly string[] | 'all', minutes: number, actor: StaffUser): Promise<Result> {
  if (day < berlinDay(new Date())) return refuse('Ein vergangener Test lässt sich nicht mehr öffnen.', 'A past test can no longer be opened.');
  const tests = (await dayEntryTests(day)).filter((x) => x.classes.length && (dayIds === 'all' || x.classes.some((c) => dayIds.includes(c.dayId))));
  if (!tests.length) return refuse('An diesem Tag beginnt keiner dieser Kurse.', 'None of these courses starts on this day.');
  for (const x of tests) {
    if (x.sitting && x.sitting.state !== 'closed') continue;
    const result = await openEntryTest({ day, session: x.session, test: x.test, minutes }, actor);
    if (!result.ok) return result;
  }
  return { ok: true };
}

/** No new starts; the phones that have started go on until they hand in or their time is up. */
export async function closeEntryTest(sittingId: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string; day: string; test: EntryTestId }>(
    `UPDATE entry_test_sittings SET closed_at = now() WHERE id = $1 AND closed_at IS NULL RETURNING id, to_char(on_date, 'YYYY-MM-DD') AS day, test`,
    [sittingId]
  );
  if (!row) return refuse('Der Test ist schon geschlossen.', 'The test is closed already.');
  await logActivity({ actor, entity: 'entry_test', entityId: sittingId, action: 'entry_test_closed', detail: { day: row.day, test: row.test } });
  return { ok: true };
}

/** A paused phone goes on without the code (the teacher is not in the room, the code is lost). */
export async function releaseAttempt(attemptId: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE entry_test_attempts SET status = 'running', code_tries = 0, blocked_until = NULL, updated_at = now(),
            log = log || jsonb_build_array(jsonb_build_object('at', now(), 'what', $2::text))
      WHERE id = $1 AND status = 'paused' RETURNING id`,
    [attemptId, `freigegeben (${actor.name})`]
  );
  return row ? { ok: true } : refuse('Dieser Test ist nicht pausiert.', 'This test is not paused.');
}

/** Handed in from the office with what was saved (a phone that died, a learner who had to leave). */
export async function handInAttempt(attemptId: string, actor: StaffUser): Promise<Result> {
  const status = await withTransaction(async (client) => {
    await client.query(
      `UPDATE entry_test_attempts SET log = log || jsonb_build_array(jsonb_build_object('at', now(), 'what', $2::text)) WHERE id = $1 AND status IN ('running', 'paused')`,
      [attemptId, `abgegeben vom Büro (${actor.name})`]
    );
    return finalizeWith(client, attemptId, 'submitted');
  });
  return status === 'submitted' ? { ok: true } : refuse('Dieser Test ist schon abgegeben.', 'This test is handed in already.');
}

/** A test run or a mistake: the attempt goes, and with it its result on the learner's record. */
export async function deleteAttempt(attemptId: string, actor: StaffUser): Promise<Result> {
  const row = await withTransaction(async (client) => {
    const found = (
      await client.query<{ sitting_id: string; person_test_id: string | null; day: string; test: EntryTestId }>(
        `DELETE FROM entry_test_attempts a USING entry_test_sittings s WHERE a.id = $1 AND s.id = a.sitting_id
         RETURNING a.sitting_id, a.person_test_id, to_char(s.on_date, 'YYYY-MM-DD') AS day, s.test`,
        [attemptId]
      )
    ).rows[0];
    if (found?.person_test_id) await client.query(`DELETE FROM person_tests WHERE id = $1`, [found.person_test_id]);
    return found;
  });
  if (!row) return refuse('Diesen Test gibt es nicht mehr.', 'This test no longer exists.');
  await logActivity({ actor, entity: 'entry_test', entityId: row.sitting_id, action: 'entry_test_attempt_deleted', detail: { day: row.day, test: row.test } });
  return { ok: true };
}

/** A paper booklet typed in: marked at once like a phone's, and on the learner's record when matched. */
export async function enterPaper(
  input: { sittingId: string; name: string; email: string | null; version: EntryTestVersion; answers: string[] },
  actor: StaffUser
): Promise<Result> {
  const sitting = await queryFirst<{ test: EntryTestId; day: string }>(`SELECT test, to_char(on_date, 'YYYY-MM-DD') AS day FROM entry_test_sittings WHERE id = $1`, [input.sittingId]);
  if (!sitting) return refuse('Diesen Test gibt es nicht mehr.', 'This test no longer exists.');
  const kinds = slotKinds(CONTENT[sitting.test][input.version]);
  const answers = cleanAnswers(input.answers, kinds);
  if (!answers) return refuse('Die Antworten passen nicht zu diesem Test.', 'The answers do not fit this test.');
  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const taken = await queryFirst<{ id: string }>(`SELECT id FROM entry_test_attempts WHERE sitting_id = $1 AND lower(email) = $2`, [input.sittingId, email]);
    if (taken) return refuse('Mit dieser E-Mail-Adresse gibt es in diesem Test schon ein Ergebnis.', 'There is a result with this e-mail address in this test already.');
  }
  const id = await withTransaction(async (client) => {
    const made = (
      await client.query<{ id: string }>(
        `INSERT INTO entry_test_attempts (sitting_id, source, name, email, version, status, answers, answered, entered_by, log)
         VALUES ($1, 'paper', $2, $3, $4, 'running', $5::jsonb, $6, $7, jsonb_build_array(jsonb_build_object('at', now(), 'what', $8::text)))
         RETURNING id`,
        [input.sittingId, input.name.trim(), email, input.version, JSON.stringify(answers), answers.filter(Boolean).length, actor.id, `vom Papier eingetragen (${actor.name})`]
      )
    ).rows[0];
    await finalizeWith(client, made.id, 'submitted');
    return made.id;
  });
  await logActivity({ actor, entity: 'entry_test', entityId: input.sittingId, action: 'entry_test_paper_entered', detail: { day: sitting.day, test: sitting.test } });
  return { ok: true, id };
}

// ---------------------------------------------------------------- export

export type ExportSitting = Pick<SittingDetail, 'day' | 'session' | 'title' | 'test' | 'attempts'>;

/** The sittings of a day (or one), handed in or not, for the Excel download. */
export async function exportSittings(day: string, sittingId?: string): Promise<ExportSitting[]> {
  const ids = await query<{ id: string }>(
    `SELECT id FROM entry_test_sittings WHERE on_date = $1::date AND ($2::uuid IS NULL OR id = $2::uuid) ORDER BY session, test`,
    [day, sittingId ?? null]
  );
  const out: ExportSitting[] = [];
  for (const { id } of ids) {
    const detail = await sittingDetail(id);
    if (detail) out.push(detail);
  }
  return out;
}
