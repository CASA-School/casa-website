import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import type { Bilingual } from './i18n';
import { SHIFT_INFO } from './kursplanung/types';
import { isSchoolClosed } from '@/config/school-closures';

/**
 * Lesson days (2026-10-17, migration 0045; docs/ADMIN_WORKSPACE.md §Lesson days), as SchoolMan keeps
 * them: a course's weekly plan — each weekday's hours, lessons, teacher and room — and from it every
 * lesson day, generated ahead; then the day is where things change. Another teacher when someone is ill
 * (who was replaced is kept), another room, a day called off. The intensive courses' days are the ones
 * Kursplanung's board plans: the same rows.
 */

type Result = { ok: true; count?: number } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** ISO weekday, 1 Monday … 7 Sunday. */
export const isoWeekday = (iso: string) => ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const hhmm = (v: string | null) => (v ? v.slice(0, 5) : null);

export type CourseInfo = {
  id: string;
  courseInstanceId: string;
  levelCode: string | null;
  title: string | null;
  label: string;
  typeSlug: string;
  typeName: string;
  intensive: boolean;
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  days: string[];
  time: string | null;
  groups: number;
  roomId: string | null;
  roomName: string | null;
  lessonsPerWeek: number;
  placesPerGroup: number;
  bookable: boolean;
  cancelled: boolean;
  /** SchoolMan's course numbers, group by group. */
  numbers: string[];
};

export async function courseInfo(courseId: string): Promise<CourseInfo | null> {
  const r = await queryFirst<{
    id: string;
    course_instance_id: string;
    level_code: string | null;
    title: string | null;
    slug: string;
    type_name: string;
    format: string;
    start_date: string;
    end_date: string;
    session: string | null;
    schedule: { days?: string[]; time?: string } | null;
    groups: number;
    room_id: string | null;
    room_name: string | null;
    lessons_per_week: number;
    places_per_group: number;
    bookable: boolean;
    status: string;
    numbers: string[] | null;
    number: string | null;
  }>(
    `SELECT c.id, c.course_instance_id, c.level_code, c.title, t.slug, coalesce(t.name_de, t.name) AS type_name, t.format,
            to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            coalesce(c.session, i.session) AS session, i.schedule, c.groups, c.room_id, coalesce(r.nickname, r.name) AS room_name,
            t.lessons_per_week, c.places_per_group, c.bookable, c.status, c.filemaker_group_ids AS numbers, c.filemaker_course_id AS number
       FROM courses c JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types t ON t.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = c.room_id
      WHERE c.id = $1`,
    [courseId]
  );
  if (!r) return null;
  const time = r.schedule?.time || null;
  const hour = Number(/^(\d{1,2})/.exec(time ?? '')?.[1]);
  const session =
    r.session === 'morning' || r.session === 'afternoon' || r.session === 'evening'
      ? r.session
      : Number.isFinite(hour)
        ? hour < 12
          ? 'morning'
          : hour < 17
            ? 'afternoon'
            : 'evening'
        : null;
  return {
    id: r.id,
    courseInstanceId: r.course_instance_id,
    levelCode: r.level_code,
    title: r.title,
    label: r.level_code ?? r.title ?? r.type_name,
    typeSlug: r.slug,
    typeName: r.type_name,
    intensive: r.format === 'intensive',
    startDate: r.start_date,
    endDate: r.end_date,
    session,
    days: Array.isArray(r.schedule?.days) ? r.schedule.days : [],
    time,
    groups: Math.max(1, r.groups),
    roomId: r.room_id,
    roomName: r.room_name,
    lessonsPerWeek: r.lessons_per_week,
    placesPerGroup: r.places_per_group,
    bookable: r.bookable,
    cancelled: r.status === 'cancelled',
    numbers: r.numbers?.length ? r.numbers : r.number ? [r.number] : [],
  };
}

// ------------------------------------------------------------ weekly plan

export type WeekPlanRow = {
  weekday: number;
  startsAt: string;
  endsAt: string;
  lessons: number;
  teacherId: string | null;
  roomId: string | null;
  /** For reading the plan; not saved. */
  teacherName?: string | null;
  roomName?: string | null;
};
export type WeekPlan = { groupIndex: number; stored: boolean; rows: WeekPlanRow[] };

/**
 * The plan a course's days are generated from, group by group: what is stored, else what its start
 * says — its days and hours, its type's lessons a week spread over them, its room — and, for an
 * intensive course, the board's pair: the first half of the week the first teacher's, the rest the
 * second's (Mon–Wed / Thu–Fri in the morning, Mon–Tue / Wed–Thu in the afternoon).
 */
export async function weekPlans(course: CourseInfo): Promise<WeekPlan[]> {
  const [stored, pairs] = await Promise.all([
    query<{ group_index: number; weekday: number; starts_at: string; ends_at: string; lessons: string; teacher_id: string | null; room_id: string | null }>(
      `SELECT group_index, weekday, to_char(starts_at, 'HH24:MI') AS starts_at, to_char(ends_at, 'HH24:MI') AS ends_at, lessons, teacher_id, room_id
         FROM course_week_plans WHERE course_id = $1 ORDER BY group_index, weekday`,
      [course.id]
    ),
    // The board's pair of each group, from its first month with the course.
    query<{ group_index: number; teacher_first: string | null; teacher_second: string | null; shift: string }>(
      `SELECT DISTINCT ON (group_index) group_index, teacher_first, teacher_second, shift FROM course_groups
        WHERE course_id = $1 ORDER BY group_index, month`,
      [course.id]
    ),
  ]);
  const out: WeekPlan[] = [];
  for (let g = 1; g <= course.groups; g++) {
    const rows = stored.filter((r) => r.group_index === g);
    if (rows.length) {
      out.push({
        groupIndex: g,
        stored: true,
        rows: rows.map((r) => ({ weekday: r.weekday, startsAt: r.starts_at, endsAt: r.ends_at, lessons: Number(r.lessons), teacherId: r.teacher_id, roomId: r.room_id })),
      });
      continue;
    }
    const [from, to] = (course.time ?? '').split('-').map((v) => v.trim());
    const weekdays = course.days.map((d) => WEEK.indexOf(d)).filter((n) => n >= 0).map((n) => (n === 0 ? 7 : n));
    const pair = pairs.find((p) => p.group_index === g);
    const half = pair && (pair.shift === 'morning' || pair.shift === 'afternoon') ? SHIFT_INFO[pair.shift].half : 0;
    const perDay = weekdays.length ? Math.round((course.lessonsPerWeek / weekdays.length) * 2) / 2 : 0;
    out.push({
      groupIndex: g,
      stored: false,
      rows:
        from && to
          ? weekdays.map((weekday, i) => ({
              weekday,
              startsAt: from,
              endsAt: to,
              lessons: perDay,
              teacherId: pair ? (i < half ? pair.teacher_first : pair.teacher_second) : null,
              roomId: course.roomId,
            }))
          : [],
    });
  }
  // The plan read as names: who and where, day by day.
  const rows = out.flatMap((p) => p.rows);
  const teacherIds = [...new Set(rows.map((r) => r.teacherId).filter((v): v is string => Boolean(v)))];
  const roomIds = [...new Set(rows.map((r) => r.roomId).filter((v): v is string => Boolean(v)))];
  const [teacherNames, roomNames] = await Promise.all([
    teacherIds.length
      ? query<{ id: string; name: string }>(`SELECT m.id, coalesce(${NAME('p')}, m.short_name) AS name FROM staff_members m LEFT JOIN people p ON p.id = m.person_id WHERE m.id = ANY($1::uuid[])`, [teacherIds])
      : Promise.resolve([]),
    roomIds.length ? query<{ id: string; name: string }>(`SELECT id, coalesce(nickname, name) AS name FROM rooms WHERE id = ANY($1::uuid[])`, [roomIds]) : Promise.resolve([]),
  ]);
  const teacher = new Map(teacherNames.map((r) => [r.id, r.name]));
  const room = new Map(roomNames.map((r) => [r.id, r.name]));
  for (const r of rows) {
    r.teacherName = r.teacherId ? (teacher.get(r.teacherId) ?? null) : null;
    r.roomName = r.roomId ? (room.get(r.roomId) ?? null) : null;
  }
  return out;
}

export async function saveWeekPlan(courseId: string, groupIndex: number, rows: WeekPlanRow[], actor: StaffUser): Promise<Result> {
  if (rows.some((r) => r.endsAt <= r.startsAt)) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM course_week_plans WHERE course_id = $1 AND group_index = $2`, [courseId, groupIndex]);
    for (const r of rows) {
      await client.query(
        `INSERT INTO course_week_plans (course_id, group_index, weekday, starts_at, ends_at, lessons, teacher_id, room_id, updated_by)
         VALUES ($1, $2, $3, $4::time, $5::time, $6, $7, $8, $9)`,
        [courseId, groupIndex, r.weekday, r.startsAt, r.endsAt, r.lessons, r.teacherId, r.roomId, actor.id]
      );
    }
  });
  await logActivity({ actor, entity: 'course', entityId: courseId, action: 'week_plan_saved', detail: { group: groupIndex, days: rows.length } });
  return { ok: true };
}

// ------------------------------------------------------------ lesson days

/**
 * The days a course is still missing, made from its plan: every date from its start to its end on a
 * planned weekday, the school's closures left out. A day that exists is left as it is — a board's
 * teacher, a changed room, a day called off stay. A planned teacher away that day is not put on it.
 */
export async function generateDays(courseId: string, actor: StaffUser): Promise<Result> {
  const course = await courseInfo(courseId);
  if (!course) return refuse('Diesen Kurs gibt es nicht mehr.', 'That course no longer exists.');
  const plans = await weekPlans(course);
  if (!plans.some((p) => p.rows.length)) return refuse('Erst den Wochenplan anlegen: Tage und Zeiten.', 'Set up the weekly plan first: days and hours.');
  const away = new Set(
    (
      await query<{ key: string }>(
        `SELECT staff_member_id || '|' || to_char(on_date, 'YYYY-MM-DD') AS key FROM staff_absences WHERE on_date BETWEEN $1::date AND $2::date`,
        [course.startDate, course.endDate]
      )
    ).map((r) => r.key)
  );
  let made = 0;
  await withTransaction(async (client) => {
    for (const plan of plans) {
      for (let day = course.startDate; day <= course.endDate; day = addDays(day, 1)) {
        const row = plan.rows.find((r) => r.weekday === isoWeekday(day));
        if (!row || isSchoolClosed(day)) continue;
        const teacher = row.teacherId && !away.has(`${row.teacherId}|${day}`) ? row.teacherId : null;
        const r = await client.query(
          `INSERT INTO course_days (course_id, group_index, on_date, teacher_id, room_id, changed_by)
           VALUES ($1, $2, $3::date, $4, $5, $6)
           ON CONFLICT (course_id, group_index, on_date) WHERE course_id IS NOT NULL DO NOTHING`,
          [courseId, plan.groupIndex, day, teacher, row.roomId, actor.id]
        );
        made += r.rowCount ?? 0;
      }
    }
    // An intensive course's days are the board's: its two months get their groups (0047), so
    // Kursplanung shows what was made here.
    await client.query(`SELECT make_course_board_groups($1)`, [courseId]);
    await client.query(`SELECT link_course_groups()`);
    await client.query(`SELECT link_course_days()`);
  });
  await logActivity({ actor, entity: 'course', entityId: courseId, action: 'course_days_generated', detail: { made } });
  return { ok: true, count: made };
}

/**
 * The plan's teacher or room put on the days still ahead, weekday by weekday (SchoolMan's SetIDTeacher
 * and SetIDClassRoom): what was changed on a single day is overwritten, a day called off stays off.
 */
export async function applyPlan(courseId: string, groupIndex: number, what: 'teacher' | 'room', actor: StaffUser): Promise<Result> {
  const course = await courseInfo(courseId);
  if (!course) return refuse('Diesen Kurs gibt es nicht mehr.', 'That course no longer exists.');
  const plan = (await weekPlans(course)).find((p) => p.groupIndex === groupIndex);
  if (!plan?.rows.length) return refuse('Dieser Gruppe fehlt ein Wochenplan.', 'This group has no weekly plan.');
  let changed = 0;
  await withTransaction(async (client) => {
    for (const row of plan.rows) {
      const r =
        what === 'teacher'
          ? await client.query(
              `UPDATE course_days SET teacher_id = $4, replaced_teacher_id = NULL, is_substitute = false, merged = false, changed_by = $5, updated_at = timezone('utc', now())
                WHERE course_id = $1 AND group_index = $2 AND extract(isodow FROM on_date) = $3 AND on_date >= current_date AND NOT cancelled
                  AND (teacher_id IS DISTINCT FROM $4 OR merged)`,
              [courseId, groupIndex, row.weekday, row.teacherId, actor.id]
            )
          : await client.query(
              `UPDATE course_days SET room_id = $4, replaced_room_id = NULL, changed_by = $5, updated_at = timezone('utc', now())
                WHERE course_id = $1 AND group_index = $2 AND extract(isodow FROM on_date) = $3 AND on_date >= current_date AND NOT cancelled
                  AND room_id IS DISTINCT FROM $4`,
              [courseId, groupIndex, row.weekday, row.roomId, actor.id]
            );
      changed += r.rowCount ?? 0;
    }
  });
  await logActivity({ actor, entity: 'course', entityId: courseId, action: what === 'teacher' ? 'plan_teacher_applied' : 'plan_room_applied', detail: { group: groupIndex, changed } });
  return { ok: true, count: changed };
}

export type CourseDay = {
  id: string;
  groupIndex: number;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  lessons: number | null;
  /** The day's own hours, not the plan's. */
  ownHours: boolean;
  teacherId: string | null;
  teacherName: string | null;
  /** The board's short name („Claudia G"), for the week grid. */
  teacherShort: string | null;
  replacedTeacherName: string | null;
  replacedTeacherShort: string | null;
  substitute: boolean;
  tentative: boolean;
  roomId: string | null;
  roomName: string | null;
  replacedRoomName: string | null;
  cancelled: boolean;
  cancelReason: string | null;
  /** Taught together with another group that day (SchoolMan's Zusammenlegung, 0048). */
  merged: boolean;
  /** On a merged day (0074): the groups it joins and their rooms, or the groups that join it. */
  mergedInto: string | null;
  mergedRoom: string | null;
  joinedBy: string | null;
  note: string | null;
  /** On Kursplanung's board. */
  onBoard: boolean;
  /** The day's teacher is away that day (`staff_absences`): the reason, as stored (Krank, Urlaub …). */
  teacherAway: string | null;
};

const NAME = (alias: string) => `nullif(concat_ws(' ', ${alias}.first_name, ${alias}.last_name), '')`;

export async function listCourseDays(courseId: string): Promise<CourseDay[]> {
  const rows = await query<{
    id: string;
    group_index: number;
    on_date: string;
    starts_at: string | null;
    ends_at: string | null;
    lessons: string | null;
    own_hours: boolean;
    teacher_id: string | null;
    teacher_name: string | null;
    teacher_short: string | null;
    replaced_teacher_name: string | null;
    replaced_teacher_short: string | null;
    is_substitute: boolean;
    is_tentative: boolean;
    room_id: string | null;
    room_name: string | null;
    replaced_room_name: string | null;
    cancelled: boolean;
    cancel_reason: string | null;
    merged: boolean;
    merged_into: string | null;
    merged_room: string | null;
    joined_by: string | null;
    note: string | null;
    on_board: boolean;
    teacher_away: string | null;
  }>(
    `SELECT d.id, d.group_index, to_char(d.on_date, 'YYYY-MM-DD') AS on_date, to_char(t.starts_at, 'HH24:MI') AS starts_at, to_char(t.ends_at, 'HH24:MI') AS ends_at,
            t.lessons, d.starts_at IS NOT NULL AS own_hours, d.teacher_id, ${NAME('tp')} AS teacher_name, tm.short_name AS teacher_short,
            ${NAME('rp')} AS replaced_teacher_name, rm.short_name AS replaced_teacher_short,
            d.is_substitute, d.is_tentative, d.room_id, coalesce(r.nickname, r.name) AS room_name, coalesce(rr.nickname, rr.name) AS replaced_room_name,
            d.cancelled, d.cancel_reason, d.merged, d.note, d.group_id IS NOT NULL AS on_board,
            (SELECT string_agg('#' || coalesce(hc.filemaker_group_ids[h.group_index], hc.filemaker_course_id, hc.level_code), ', ')
               FROM course_day_merges m JOIN course_days h ON h.id = m.host_day_id JOIN courses hc ON hc.id = h.course_id WHERE m.guest_day_id = d.id) AS merged_into,
            (SELECT string_agg(coalesce(hr.nickname, hr.name), ', ')
               FROM course_day_merges m JOIN course_days h ON h.id = m.host_day_id LEFT JOIN rooms hr ON hr.id = h.room_id WHERE m.guest_day_id = d.id) AS merged_room,
            (SELECT string_agg('#' || coalesce(gc.filemaker_group_ids[g.group_index], gc.filemaker_course_id, gc.level_code), ', ')
               FROM course_day_merges m JOIN course_days g ON g.id = m.guest_day_id JOIN courses gc ON gc.id = g.course_id WHERE m.host_day_id = d.id) AS joined_by,
            (SELECT a.reason FROM staff_absences a WHERE a.staff_member_id = d.teacher_id AND a.on_date = d.on_date LIMIT 1) AS teacher_away
       FROM course_days d
       JOIN course_day_times t ON t.id = d.id
       LEFT JOIN staff_members tm ON tm.id = d.teacher_id LEFT JOIN people tp ON tp.id = tm.person_id
       LEFT JOIN staff_members rm ON rm.id = d.replaced_teacher_id LEFT JOIN people rp ON rp.id = rm.person_id
       LEFT JOIN rooms r ON r.id = d.room_id LEFT JOIN rooms rr ON rr.id = d.replaced_room_id
      WHERE d.course_id = $1
      ORDER BY d.group_index, d.on_date`,
    [courseId]
  );
  return rows.map((r) => ({
    id: r.id,
    groupIndex: r.group_index,
    date: r.on_date,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    lessons: r.lessons === null ? null : Number(r.lessons),
    ownHours: r.own_hours,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    teacherShort: r.teacher_short,
    replacedTeacherName: r.replaced_teacher_name,
    replacedTeacherShort: r.replaced_teacher_short,
    substitute: r.is_substitute,
    tentative: r.is_tentative,
    roomId: r.room_id,
    roomName: r.room_name,
    replacedRoomName: r.replaced_room_name,
    cancelled: r.cancelled,
    cancelReason: r.cancel_reason,
    merged: r.merged,
    mergedInto: r.merged_into,
    mergedRoom: r.merged_room,
    joinedBy: r.joined_by,
    note: r.note,
    onBoard: r.on_board,
    teacherAway: r.teacher_away,
  }));
}

/**
 * For a course's days from last week on: the teachers and rooms to choose from, and per day who is away
 * and what is taken at that time — another lesson day of any course, overlapping in hours.
 */
export type DayChoices = {
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  /** Per day: teacher or room id → what they are teaching or holding then. */
  taken: Map<string, Map<string, string>>;
  /** Per day: the teachers away. */
  away: Map<string, Set<string>>;
};

export async function courseDayChoices(courseId: string): Promise<DayChoices> {
  const [teachers, rooms, clashes, absences] = await Promise.all([
    query<{ id: string; name: string }>(
      `SELECT m.id, ${NAME('p')} AS name FROM staff_members m JOIN people p ON p.id = m.person_id
        WHERE m.is_active AND EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = m.id AND r.role_code = 'teaching')
        ORDER BY p.first_name, p.last_name`
    ),
    query<{ id: string; name: string }>(
      `SELECT r.id, coalesce(r.nickname, r.name) AS name FROM rooms r JOIN locations l ON l.id = r.location_id
        WHERE r.is_active AND r.is_bookable AND r.kind = 'classroom' ORDER BY l.kind = 'online', r.name`
    ),
    // „Online" (0077) holds any number of classes at once: it is never taken.
    query<{ day_id: string; teacher_id: string | null; room_id: string | null; label: string | null }>(
      `SELECT d.id AS day_id, o.teacher_id,
              CASE WHEN EXISTS (SELECT 1 FROM rooms r JOIN locations l ON l.id = r.location_id WHERE r.id = o.room_id AND l.kind = 'online') THEN NULL ELSE o.room_id END AS room_id,
              coalesce(c.title, c.level_code, g.level || '.' || g.phase) AS label
         FROM course_day_times d
         JOIN course_day_times o ON o.on_date = d.on_date AND o.id <> d.id AND NOT o.cancelled
              AND (d.starts_at IS NULL OR o.starts_at IS NULL OR (o.starts_at < d.ends_at AND o.ends_at > d.starts_at))
         LEFT JOIN courses c ON c.id = o.course_id
         LEFT JOIN course_groups g ON g.id = o.group_id
        WHERE d.course_id = $1 AND d.on_date >= current_date - 7`,
      [courseId]
    ),
    query<{ day_id: string; teacher_id: string }>(
      `SELECT d.id AS day_id, a.staff_member_id AS teacher_id
         FROM course_days d JOIN staff_absences a ON a.on_date = d.on_date
        WHERE d.course_id = $1 AND d.on_date >= current_date - 7`,
      [courseId]
    ),
  ]);
  const taken = new Map<string, Map<string, string>>();
  for (const c of clashes) {
    const map = taken.get(c.day_id) ?? new Map<string, string>();
    if (c.teacher_id) map.set(c.teacher_id, c.label ?? '—');
    if (c.room_id) map.set(c.room_id, c.label ?? '—');
    taken.set(c.day_id, map);
  }
  const away = new Map<string, Set<string>>();
  for (const a of absences) away.set(a.day_id, (away.get(a.day_id) ?? new Set<string>()).add(a.teacher_id));
  return { teachers, rooms, taken, away };
}

export type DayPatch = {
  teacherId?: string | null;
  roomId?: string | null;
  cancelled?: boolean;
  cancelReason?: string | null;
  merged?: boolean;
  note?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

/**
 * One day changed. Another teacher than the plan's is a substitution and the plan's teacher is kept as
 * the one replaced; back to the plan's, and it is not. The same for the room.
 */
export async function changeDay(dayId: string, patch: DayPatch, actor: StaffUser): Promise<Result> {
  const day = await queryFirst<{ course_id: string | null; group_index: number; weekday: number; plan_teacher: string | null; plan_room: string | null; course_room: string | null }>(
    `SELECT d.course_id, d.group_index, extract(isodow FROM d.on_date)::int AS weekday, p.teacher_id AS plan_teacher, p.room_id AS plan_room, c.room_id AS course_room
       FROM course_days d
       LEFT JOIN course_week_plans p ON p.course_id = d.course_id AND p.group_index = d.group_index AND p.weekday = extract(isodow FROM d.on_date)
       LEFT JOIN courses c ON c.id = d.course_id
      WHERE d.id = $1`,
    [dayId]
  );
  if (!day) return refuse('Diesen Tag gibt es nicht mehr.', 'That day no longer exists.');
  if (patch.startsAt && patch.endsAt && patch.endsAt <= patch.startsAt) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  const sets: string[] = [];
  const params: unknown[] = [dayId];
  const set = (sql: string, value: unknown) => {
    params.push(value);
    sets.push(sql.replace('?', `$${params.length}`));
  };
  if (patch.teacherId !== undefined) {
    const planned = day.plan_teacher;
    set('teacher_id = ?', patch.teacherId);
    set('replaced_teacher_id = ?', planned && patch.teacherId !== planned ? planned : null);
    set('is_substitute = ?', Boolean(planned && patch.teacherId && patch.teacherId !== planned));
  }
  if (patch.roomId !== undefined) {
    const planned = day.plan_room ?? day.course_room;
    set('room_id = ?', patch.roomId);
    set('replaced_room_id = ?', planned && patch.roomId !== planned ? planned : null);
  }
  if (patch.cancelled !== undefined) {
    set('cancelled = ?', patch.cancelled);
    set('cancel_reason = ?', patch.cancelled ? (patch.cancelReason ?? null) : null);
  }
  if (patch.merged !== undefined) set('merged = ?', patch.merged);
  if (patch.note !== undefined) set('note = ?', patch.note);
  if (patch.startsAt !== undefined) set('starts_at = ?::time', patch.startsAt);
  if (patch.endsAt !== undefined) set('ends_at = ?::time', patch.endsAt);
  if (!sets.length) return { ok: true };
  set('changed_by = ?', actor.id);
  await query(`UPDATE course_days SET ${sets.join(', ')}, updated_at = timezone('utc', now()) WHERE id = $1`, params);
  await logActivity({ actor, entity: 'course', entityId: day.course_id, action: 'course_day_changed', detail: { day: dayId, ...patch } });
  return { ok: true };
}

/** A day away from now, for the screens: „Mo 31.08." */
export const hours = (d: Pick<CourseDay, 'startsAt' | 'endsAt'>) => (d.startsAt && d.endsAt ? `${hhmm(d.startsAt)}–${hhmm(d.endsAt)}` : null);
