import 'server-only';

import { logActivity } from '../activity';
import type { StaffUser } from '../auth';
import { query, queryFirst } from '../db';
import { sessionOf } from '../waitlist';
import { levelCodeOf, levelPlace, planMonthOfStart } from './course-link';
import { addGroup } from './repo';
import { isLevel, isShift, type Level, type Shift } from './types';
import { monthStart, nextMonth } from './weeks';

/**
 * Course starts and Kursplanung, joined (2026-10-17; docs/KURSPLANUNG.md §Course starts). Nothing is
 * stored to join them: an intensive start opens a planning month (`planMonthOfStart`), and a level
 * code names a board level and phase (`levelPlace`). Reads: a start's classes with their teachers,
 * and per board group the learners booked here. One write: a group opened on a course start is
 * opened on the board too.
 */

const INTENSIVE = `SELECT ci.id, ci.start_date, to_char(ci.start_date + 14, 'YYYY-MM') AS month, ci.session, ci.schedule
                     FROM course_instances ci JOIN course_types ct ON ct.id = ci.course_type_id
                    WHERE ct.format = 'intensive' AND ci.status <> 'cancelled'`;

/** The planning month an intensive start opens and its shift, or null for any other course. */
async function startMonth(startId: string): Promise<{ month: string; shift: Shift | null } | null> {
  const row = await queryFirst<{ start_date: string; format: string; session: string | null; schedule: { time?: string } | null }>(
    `SELECT to_char(ci.start_date, 'YYYY-MM-DD') AS start_date, ct.format, ci.session, ci.schedule
       FROM course_instances ci JOIN course_types ct ON ct.id = ci.course_type_id WHERE ci.id = $1`,
    [startId]
  );
  if (!row || row.format !== 'intensive') return null;
  const session = sessionOf(row.session, row.schedule);
  return { month: planMonthOfStart(row.start_date), shift: session && isShift(session) ? session : null };
}

export type PlanTeacher = { id: string; name: string; days: number; substitute: boolean };

/** One of a start's classes in one month: the group, its pair, who teaches it. */
export type PlanClass = { groupId: string; month: string; levelCode: string; shift: Shift; groupIndex: number; pair: { id: string; name: string }[]; teachers: PlanTeacher[] };

/** A start's class over its two months: phase 1 in the first, the same group continued in the second. */
export type StartClass = { level: Level; shift: Shift; groupIndex: number; of: number; first: PlanClass | null; second: PlanClass | null };

export async function startClasses(startId: string): Promise<{ first: string; second: string; classes: StartClass[] } | null> {
  const start = await startMonth(startId);
  if (!start) return null;
  const first = start.month;
  const second = nextMonth(first);
  // The start's own shift when it has one; its classes run there in both months.
  const groups = await query<{ id: string; month: string; shift: string; level: string; phase: '1' | '2'; group_index: number; teacher_first: string | null; teacher_second: string | null }>(
    `SELECT id, to_char(month, 'YYYY-MM') AS month, shift, level, phase, group_index, teacher_first, teacher_second
       FROM course_groups
      WHERE ((month = $1::date AND phase = '1') OR (month = $2::date AND phase = '2')) AND ($3::text IS NULL OR shift = $3)
      ORDER BY group_index`,
    [`${first}-01`, `${second}-01`, start.shift]
  );
  if (!groups.length) return { first, second, classes: [] };

  const ids = groups.map((g) => g.id);
  const [names, taught] = await Promise.all([
    query<{ id: string; name: string }>(
      `SELECT m.id, concat_ws(' ', p.first_name, p.last_name) AS name FROM staff_members m JOIN people p ON p.id = m.person_id
        WHERE m.id = ANY($1::uuid[])`,
      [[...new Set(groups.flatMap((g) => [g.teacher_first, g.teacher_second]).filter((v): v is string => Boolean(v)))]]
    ),
    query<{ group_id: string; id: string; name: string; days: number; substitute: boolean }>(
      `SELECT a.group_id, a.teacher_id AS id, concat_ws(' ', p.first_name, p.last_name) AS name,
              count(*)::int AS days, bool_and(a.is_substitute) AS substitute
         FROM course_days a JOIN staff_members m ON m.id = a.teacher_id JOIN people p ON p.id = m.person_id
        WHERE a.group_id = ANY($1::uuid[]) AND NOT a.cancelled
        GROUP BY a.group_id, a.teacher_id, p.first_name, p.last_name
        ORDER BY count(*) DESC, p.last_name`,
      [ids]
    ),
  ]);
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const toClass = (g: (typeof groups)[number]): PlanClass | null =>
    isShift(g.shift) && isLevel(g.level)
      ? {
          groupId: g.id,
          month: g.month,
          levelCode: levelCodeOf(g.level, g.phase) ?? `${g.level}.${g.phase}`,
          shift: g.shift,
          groupIndex: g.group_index,
          pair: [g.teacher_first, g.teacher_second].filter((v): v is string => Boolean(v)).filter((v, i, all) => all.indexOf(v) === i).map((id) => ({ id, name: nameOf.get(id) ?? '?' })),
          teachers: taught.filter((t) => t.group_id === g.id).map(({ id, name, days, substitute }) => ({ id, name, days, substitute })),
        }
      : null;

  // One class per shift, level and index across both months — Kursplanung's continuation rule; either
  // month may not be on the board yet.
  const keys = [...new Set(groups.map((g) => `${g.shift}|${g.level}|${g.group_index}`))];
  const classes = keys.flatMap((key): StartClass[] => {
    const [shift, level, index] = key.split('|');
    if (!isShift(shift) || !isLevel(level)) return [];
    const at = (month: string) => groups.find((g) => g.month === month && `${g.shift}|${g.level}|${g.group_index}` === key);
    const own = at(first);
    const next = at(second);
    const of = Math.max(...[first, second].map((month) => groups.filter((g) => g.month === month && g.shift === shift && g.level === level).length));
    return [{ level, shift, groupIndex: Number(index), of, first: own ? toClass(own) : null, second: next ? toClass(next) : null }];
  });
  const order = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H'];
  classes.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level) || a.groupIndex - b.groupIndex);
  return { first, second, classes };
}

/**
 * For the board's month: per level and phase, the learners booked in the workspace, and the start a
 * shift's groups belong to. Phase 1 is the month's own start's courses; phase 2 the previous start's,
 * in their second half — every learner whose period on the course runs in the month.
 */
export type MonthStart = { id: string; date: string; shift: Shift | null };
export type MonthBookings = { startOf: (phase: '1' | '2', shift: Shift) => MonthStart | null; booked: Map<string, number> };

export async function monthBookings(month: string): Promise<MonthBookings> {
  const [y, m] = month.split('-').map(Number);
  const previous = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const [starts, rows] = await Promise.all([
    query<{ id: string; start_date: string; month: string; session: string | null; schedule: { time?: string } | null }>(
      `SELECT id, to_char(start_date, 'YYYY-MM-DD') AS start_date, month, session, schedule FROM (${INTENSIVE}) s WHERE month IN ($1, $2) ORDER BY start_date`,
      [month, previous]
    ),
    // The learners on each course of this month's start (phase 1) and the previous one's (phase 2, its
    // second half) whose period runs in the month: regular learners, joiners, Bildungszeit alike (0041).
    query<{ level_code: string; continued: boolean; n: number }>(
      `WITH starts AS (${INTENSIVE})
       SELECT c.level_code, s.month = $2 AS continued, count(DISTINCT bp.booking_id)::int AS n
         FROM courses c
         JOIN starts s ON s.id = c.course_instance_id AND s.month IN ($1, $2)
         JOIN booking_periods bp ON bp.course_id = c.id AND bp.start_date < $4::date AND bp.end_date >= $3::date
         JOIN bookings b ON b.id = bp.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
        WHERE c.level_code IS NOT NULL
        GROUP BY c.level_code, s.month = $2`,
      [month, previous, monthStart(month), monthStart(nextMonth(month))]
    ),
  ]);
  const booked = new Map<string, number>();
  for (const r of rows) {
    const place = levelPlace(r.level_code);
    if (!place) continue;
    const key = `${place.level}.${r.continued ? '2' : place.phase}`;
    booked.set(key, (booked.get(key) ?? 0) + r.n);
  }
  const known = starts.map((s) => {
    const session = sessionOf(s.session, s.schedule);
    return { id: s.id, date: s.start_date, month: s.month, shift: session && isShift(session) ? session : null };
  });
  // Phase 1 is this month's start, phase 2 the previous one's; each in its own shift.
  const startOf = (phase: '1' | '2', shift: Shift): MonthStart | null => {
    const found = known.find((s) => s.month === (phase === '1' ? month : previous) && (s.shift === null || s.shift === shift));
    return found ? { id: found.id, date: found.date, shift: found.shift } : null;
  };
  return { startOf, booked };
}

/**
 * A group opened on a course start, opened on the board: Kursplanung gets as many groups of that level
 * and phase as the start now has, in the shift its groups run in — and, for a `.1` level, the same in
 * the next month when the board already has it. A month the board has not set up is left alone.
 */
export async function openPlanGroups(startId: string, levelCode: string, actor: StaffUser): Promise<number> {
  const start = await startMonth(startId);
  const place = levelPlace(levelCode);
  if (!start || !place) return 0;
  const month = start.month;
  const want = (await queryFirst<{ groups: number }>(`SELECT groups FROM courses WHERE course_instance_id = $1 AND level_code = $2`, [startId, levelCode]))?.groups ?? 1;
  let added = 0;
  const fill = async (target: string, phase: '1' | '2') => {
    // A `.1` level and its continuation run in the start's shift; a `.2` joiner's class in whichever the board has.
    const own = place.phase === '1' ? start.shift : null;
    const existing = await query<{ shift: string }>(
      `SELECT shift FROM course_groups WHERE month = $1::date AND level = $2 AND phase = $3 AND ($4::text IS NULL OR shift = $4)`,
      [`${target}-01`, place.level, phase, own]
    );
    const shift =
      own ?? existing[0]?.shift ?? (await queryFirst<{ shift: string }>(`SELECT shift FROM course_groups WHERE month = $1::date AND phase = $2 LIMIT 1`, [`${target}-01`, phase]))?.shift;
    // Only a month the board has set up.
    if (!(await queryFirst(`SELECT 1 FROM course_groups WHERE month = $1::date LIMIT 1`, [`${target}-01`]))) return;
    if (!shift || !isShift(shift)) return;
    for (let n = existing.length; n < want; n++) {
      await addGroup(target, shift, place.level, phase);
      added++;
      await logActivity({ actor, entity: 'kursplanung.group', entityId: null, action: 'group.added', detail: { month: target, shift, level: place.level, phase, from: 'course_start' } });
    }
  };
  await fill(month, place.phase);
  if (place.phase === '1') await fill(nextMonth(month), '2');
  return added;
}
