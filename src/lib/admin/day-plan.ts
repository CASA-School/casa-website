import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';
import type { AbsenceReason } from './kursplanung/types';
import type { Desk, Session, TaskStatus } from './day-plan-labels';

/**
 * The Tagesplan (Rahman, 2026-10-19; docs/ADMIN_WORKSPACE.md §Tagesplan): FileMaker's calendar — the
 * screen the team opens first, Cmd+1 — for one day. What a colleague at the desk needs on it, in the
 * order she named it: the day's tasks, who is at reception and in the office, who is away and who
 * stands in for them, the lessons by room and teacher, who is away soon, whose birthday is coming.
 *
 * Every reader takes the day as `YYYY-MM-DD` on Bremen's calendar (`berlinDay`).
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

const NAME = (alias: string) => `nullif(concat_ws(' ', ${alias}.first_name, ${alias}.last_name), '')`;

/** How far back a task written here and left open is carried onto today. SchoolMan's are not. */
const CARRY_DAYS = 14;

// ------------------------------------------------------------------ tasks

export type DayTask = {
  id: string;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  body: string;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  /** Who wrote it: a colleague here, or the name SchoolMan kept. */
  authorName: string | null;
  createdBy: string | null;
  doneByName: string | null;
  doneAt: Date | null;
  /** From an earlier day and still open: carried onto today. */
  carried: boolean;
};

type TaskRow = {
  id: string;
  on_date: string;
  starts_at: string | null;
  ends_at: string | null;
  body: string;
  status: TaskStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  author_name: string | null;
  created_by: string | null;
  done_by_name: string | null;
  done_at: Date | null;
  carried: boolean;
};

/**
 * The day's tasks, the timed ones by their time and the rest in the order they were written; on
 * today, the tasks written here on the days before and still open come first.
 */
export async function dayTasks(day: string, today: string): Promise<DayTask[]> {
  const rows = await query<TaskRow>(
    `SELECT t.id, to_char(t.on_date, 'YYYY-MM-DD') AS on_date, to_char(t.starts_at, 'HH24:MI') AS starts_at, to_char(t.ends_at, 'HH24:MI') AS ends_at,
            t.body, t.status, t.assignee_id, a.name AS assignee_name, coalesce(c.name, t.author_name) AS author_name, t.created_by,
            d.name AS done_by_name, t.done_at, t.on_date < $1::date AS carried
       FROM day_tasks t
       LEFT JOIN staff_users a ON a.id = t.assignee_id
       LEFT JOIN staff_users c ON c.id = t.created_by
       LEFT JOIN staff_users d ON d.id = t.done_by
      WHERE t.on_date = $1::date
         OR ($1::date = $2::date AND t.on_date < $1::date AND t.on_date >= $1::date - $3::int AND t.status <> 'done' AND t.filemaker_id IS NULL)
      ORDER BY carried DESC, t.on_date, t.starts_at NULLS LAST, t.created_at, t.id`,
    [day, today, CARRY_DAYS]
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.on_date,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    body: r.body,
    status: r.status,
    assigneeId: r.assignee_id,
    assigneeName: r.assignee_name,
    authorName: r.author_name,
    createdBy: r.created_by,
    doneByName: r.done_by_name,
    doneAt: r.done_at,
    carried: r.carried,
  }));
}

/** Per day of a week: how many tasks are still open, for the strip of days. */
export async function openTasksByDay(from: string, to: string): Promise<Record<string, number>> {
  const rows = await query<{ on_date: string; n: string }>(
    `SELECT to_char(on_date, 'YYYY-MM-DD') AS on_date, count(*) AS n FROM day_tasks
      WHERE on_date BETWEEN $1::date AND $2::date AND status <> 'done' GROUP BY on_date`,
    [from, to]
  );
  return Object.fromEntries(rows.map((r) => [r.on_date, Number(r.n)]));
}

export type TaskInput = { date: string; startsAt: string | null; endsAt: string | null; body: string; assigneeId: string | null };

export async function createTask(input: TaskInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO day_tasks (on_date, starts_at, ends_at, body, assignee_id, created_by)
     VALUES ($1::date, $2::time, $3::time, $4, (SELECT id FROM staff_users WHERE id = $5::uuid AND is_active), $6) RETURNING id`,
    [input.date, input.startsAt, input.endsAt, input.body, input.assigneeId, actor.id]
  );
  if (!row) return refuse('Die Aufgabe konnte nicht gespeichert werden.', 'The task could not be saved.');
  await logActivity({ actor, entity: 'day_task', entityId: row.id, action: 'day_task_created', detail: { date: input.date } });
  return { ok: true, id: row.id };
}

export async function updateTask(id: string, input: TaskInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE day_tasks SET on_date = $2::date, starts_at = $3::time, ends_at = $4::time, body = $5,
            assignee_id = (SELECT id FROM staff_users WHERE id = $6::uuid AND is_active)
      WHERE id = $1 RETURNING id`,
    [id, input.date, input.startsAt, input.endsAt, input.body, input.assigneeId]
  );
  if (!row) return refuse('Diese Aufgabe gibt es nicht mehr.', 'This task no longer exists.');
  await logActivity({ actor, entity: 'day_task', entityId: id, action: 'day_task_updated' });
  return { ok: true };
}

/**
 * Where a task stands. Done takes who and when; reopened, the task keeps a colleague's name in `done_by`,
 * which tells the SchoolMan import (`import-day.mjs`) that the workspace has had its say and must not
 * close it again.
 */
export async function setTaskStatus(id: string, status: TaskStatus, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE day_tasks SET status = $2,
            done_by = CASE WHEN $2 = 'done' THEN $3::uuid ELSE coalesce(done_by, $3::uuid) END,
            done_at = CASE WHEN $2 = 'done' THEN now() ELSE NULL END
      WHERE id = $1 AND status IS DISTINCT FROM $2 RETURNING id`,
    [id, status, actor.id]
  );
  if (row) await logActivity({ actor, entity: 'day_task', entityId: id, action: 'day_task_status', detail: { status } });
  return { ok: true };
}

/** Gone, for a task entered by mistake; the activity log keeps that it was. */
export async function deleteTask(id: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(`DELETE FROM day_tasks WHERE id = $1 RETURNING id`, [id]);
  if (!row) return refuse('Diese Aufgabe gibt es nicht mehr.', 'This task no longer exists.');
  await logActivity({ actor, entity: 'day_task', entityId: id, action: 'day_task_deleted' });
  return { ok: true };
}

/** The colleagues a task can be for: everyone with a workspace account. */
export async function taskColleagues(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY name`);
}

// ---------------------------------------------------------------- lessons

export type DayLearner = { personId: string; name: string; email: string | null };

export type DayLesson = {
  id: string;
  courseId: string;
  groupIndex: number;
  startsAt: string | null;
  endsAt: string | null;
  session: Session | null;
  /** „B2.2", or a special course's title. */
  label: string;
  typeName: string;
  /** SchoolMan's number of the course (its group's). */
  number: string | null;
  roomId: string | null;
  roomName: string | null;
  floor: number | null;
  teacherName: string | null;
  substitute: boolean;
  replacedTeacherName: string | null;
  /** The teacher on the day is away that day and nobody stands in: SchoolMan's ConflictTeacher. */
  teacherAway: string | null;
  cancelled: boolean;
  merged: boolean;
  learners: DayLearner[];
};

const sessionOf = (session: string | null, startsAt: string | null): Session | null => {
  if (session === 'morning' || session === 'afternoon' || session === 'evening') return session;
  const hour = Number(/^(\d{1,2})/.exec(startsAt ?? '')?.[1]);
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
};

/** The day's lessons — every course day on it with its room, teacher and learners — in the order of the day. */
export async function dayLessons(day: string): Promise<DayLesson[]> {
  const rows = await query<{
    id: string;
    course_id: string;
    group_index: number;
    starts_at: string | null;
    ends_at: string | null;
    session: string | null;
    level_code: string | null;
    title: string | null;
    type_name: string;
    number: string | null;
    room_id: string | null;
    room_name: string | null;
    floor: number | null;
    teacher_name: string | null;
    is_substitute: boolean;
    replaced_teacher_name: string | null;
    teacher_away: string | null;
    cancelled: boolean;
    merged: boolean;
  }>(
    `SELECT d.id, d.course_id, d.group_index, to_char(t.starts_at, 'HH24:MI') AS starts_at, to_char(t.ends_at, 'HH24:MI') AS ends_at,
            coalesce(c.session, i.session) AS session, c.level_code, c.title, coalesce(ty.name_de, ty.name) AS type_name,
            coalesce(c.filemaker_group_ids[d.group_index], c.filemaker_course_id) AS number,
            d.room_id, coalesce(r.nickname, r.name) AS room_name, r.floor,
            ${NAME('tp')} AS teacher_name, d.is_substitute, ${NAME('rp')} AS replaced_teacher_name,
            CASE WHEN d.is_substitute THEN NULL
                 ELSE (SELECT a.reason FROM staff_absences a WHERE a.staff_member_id = d.teacher_id AND a.on_date = d.on_date LIMIT 1) END AS teacher_away,
            d.cancelled, d.merged
       FROM course_days d
       JOIN course_day_times t ON t.id = d.id
       JOIN courses c ON c.id = d.course_id
       JOIN course_instances i ON i.id = c.course_instance_id
       JOIN course_types ty ON ty.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = d.room_id
       LEFT JOIN staff_members tm ON tm.id = d.teacher_id LEFT JOIN people tp ON tp.id = tm.person_id
       LEFT JOIN staff_members rm ON rm.id = d.replaced_teacher_id LEFT JOIN people rp ON rp.id = rm.person_id
      WHERE d.on_date = $1::date
      ORDER BY t.starts_at NULLS LAST, c.level_code NULLS LAST, d.group_index`,
    [day]
  );
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const learners = courseIds.length
    ? await query<{ course_id: string; group_index: number | null; person_id: string; name: string; email: string | null }>(
        `SELECT bp.course_id, bp.group_index, p.id AS person_id, concat_ws(' ', p.first_name, p.last_name) AS name,
                (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email
           FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id JOIN people p ON p.id = b.person_id
          WHERE bp.course_id = ANY($1::uuid[]) AND bp.start_date <= $2::date AND bp.end_date >= $2::date
            AND b.deleted_at IS NULL AND p.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed')
          ORDER BY p.last_name, p.first_name`,
        [courseIds, day]
      )
    : [];
  return rows.map((r) => {
    const own = learners.filter((l) => l.course_id === r.course_id && (l.group_index === null || l.group_index === r.group_index));
    const seen = new Set<string>();
    return {
      id: r.id,
      courseId: r.course_id,
      groupIndex: r.group_index,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      session: sessionOf(r.session, r.starts_at),
      label: r.level_code ?? r.title ?? r.type_name,
      typeName: r.type_name,
      number: r.number,
      roomId: r.room_id,
      roomName: r.room_name,
      floor: r.floor,
      teacherName: r.teacher_name,
      substitute: r.is_substitute,
      replacedTeacherName: r.replaced_teacher_name,
      teacherAway: r.teacher_away,
      cancelled: r.cancelled,
      merged: r.merged,
      learners: own
        .filter((l) => (seen.has(l.person_id) ? false : (seen.add(l.person_id), true)))
        .map((l) => ({ personId: l.person_id, name: l.name, email: l.email })),
    };
  });
}

/** The rooms that can hold a lesson, floor by floor, for the room plan's rows. */
export async function planRooms(): Promise<{ id: string; name: string; floor: number | null }[]> {
  return query<{ id: string; name: string; floor: number | null }>(
    `SELECT id, coalesce(nickname, name) AS name, floor FROM rooms
      WHERE is_active AND is_bookable ORDER BY floor NULLS LAST, coalesce(nickname, name)`
  );
}

// ------------------------------------------------------------------ people

export type DeskColleague = {
  staffId: string;
  name: string;
  desk: Desk;
  /** The usual shift on this weekday. */
  shift: { from: string; to: string } | null;
  /** When they came and went, as written down. */
  presence: { from: string; to: string | null } | null;
  away: AbsenceReason | null;
  /** Their own row: they can say they are here. */
  me: boolean;
};

/** Reception and the office on a day: the usual shift, what was written down, who is away. */
export async function deskColleagues(day: string, me: StaffUser): Promise<DeskColleague[]> {
  const rows = await query<{
    id: string;
    name: string | null;
    desk: Desk;
    shift_from: string | null;
    shift_to: string | null;
    came: string | null;
    went: string | null;
    away: AbsenceReason | null;
    staff_user_id: string | null;
  }>(
    `SELECT s.id, ${NAME('p')} AS name, s.desk, to_char(sh.starts_at, 'HH24:MI') AS shift_from, to_char(sh.ends_at, 'HH24:MI') AS shift_to,
            to_char(pr.starts_at, 'HH24:MI') AS came, to_char(pr.ends_at, 'HH24:MI') AS went,
            (SELECT a.reason FROM staff_absences a WHERE a.staff_member_id = s.id AND a.on_date = $1::date LIMIT 1) AS away,
            s.staff_user_id
       FROM staff_members s
       JOIN people p ON p.id = s.person_id
       LEFT JOIN staff_shifts sh ON sh.staff_member_id = s.id AND sh.weekday = extract(isodow FROM $1::date)
       LEFT JOIN staff_presence pr ON pr.staff_member_id = s.id AND pr.on_date = $1::date
      WHERE s.is_active AND s.desk IS NOT NULL
      ORDER BY s.desk DESC, coalesce(pr.starts_at, sh.starts_at) NULLS LAST, p.first_name, p.last_name`,
    [day]
  );
  return rows.map((r) => ({
    staffId: r.id,
    name: r.name ?? '—',
    desk: r.desk,
    shift: r.shift_from && r.shift_to ? { from: r.shift_from, to: r.shift_to } : null,
    presence: r.came ? { from: r.came, to: r.went } : null,
    away: r.away,
    me: r.staff_user_id === me.id,
  }));
}

/** The colleague on the register behind a workspace account, if there is one. */
export async function ownStaffMember(user: StaffUser): Promise<string | null> {
  return (await queryFirst<{ id: string }>(`SELECT id FROM staff_members WHERE staff_user_id = $1 AND is_active LIMIT 1`, [user.id]))?.id ?? null;
}

/** „Ich bin da" and „Ich gehe": now, on Bremen's clock, for the colleague behind the account. */
export async function markPresence(user: StaffUser, what: 'came' | 'went'): Promise<Result> {
  const staffId = await ownStaffMember(user);
  if (!staffId) return refuse('Dein Zugang ist mit niemandem im Personalregister verbunden.', 'Your account is linked to nobody on the staff register.');
  if (what === 'came') {
    await query(
      `INSERT INTO staff_presence (staff_member_id, on_date, starts_at, created_by)
       VALUES ($1, (now() AT TIME ZONE 'Europe/Berlin')::date, date_trunc('minute', now() AT TIME ZONE 'Europe/Berlin')::time, $2)
       ON CONFLICT (staff_member_id, on_date) DO NOTHING`,
      [staffId, user.id]
    );
  } else {
    await query(
      `UPDATE staff_presence SET ends_at = greatest(starts_at, date_trunc('minute', now() AT TIME ZONE 'Europe/Berlin')::time), updated_at = timezone('utc', now())
        WHERE staff_member_id = $1 AND on_date = (now() AT TIME ZONE 'Europe/Berlin')::date`,
      [staffId]
    );
  }
  return { ok: true };
}

export type AwayColleague = {
  staffId: string;
  name: string;
  reason: AbsenceReason;
  /** The last day of this stretch away, when it goes on past the day. */
  until: string | null;
  teaches: boolean;
};

/** Away on the day — reception, office and teachers alike — and until when. */
export async function awayOn(day: string): Promise<AwayColleague[]> {
  const rows = await query<{ id: string; name: string | null; reason: AbsenceReason; days: string[]; teaches: boolean }>(
    `SELECT s.id, ${NAME('p')} AS name, a.reason,
            (SELECT array_agg(to_char(x.on_date, 'YYYY-MM-DD') ORDER BY x.on_date) FROM staff_absences x
              WHERE x.staff_member_id = s.id AND x.reason = a.reason AND x.on_date BETWEEN $1::date AND $1::date + 60) AS days,
            s.desk IS NULL AS teaches
       FROM staff_absences a JOIN staff_members s ON s.id = a.staff_member_id JOIN people p ON p.id = s.person_id
      WHERE a.on_date = $1::date AND s.is_active
      ORDER BY a.reason = 'Krank' DESC, p.first_name, p.last_name`,
    [day]
  );
  return rows.map((r) => ({ staffId: r.id, name: r.name ?? '—', reason: r.reason, until: stretchEnd(r.days ?? []), teaches: r.teaches }));
}

/** The last day of a run of absent days from the first, a weekend between two of them not breaking it. */
function stretchEnd(days: readonly string[]): string | null {
  let last = days[0];
  for (const d of days.slice(1)) {
    if ((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${last}T12:00:00Z`)) / 86_400_000 > 3) break;
    last = d;
  }
  return last && last !== days[0] ? last : null;
}

export type SoonAway = { staffId: string; name: string; reason: AbsenceReason; from: string; to: string };

/** Who will be away in the next two weeks after the day: one line per stretch. */
export async function awaySoon(day: string, days = 14): Promise<SoonAway[]> {
  const rows = await query<{ id: string; name: string | null; reason: AbsenceReason; on_date: string }>(
    `SELECT s.id, ${NAME('p')} AS name, a.reason, to_char(a.on_date, 'YYYY-MM-DD') AS on_date
       FROM staff_absences a JOIN staff_members s ON s.id = a.staff_member_id JOIN people p ON p.id = s.person_id
      WHERE a.on_date > $1::date AND a.on_date <= $1::date + $2::int AND s.is_active
        AND NOT EXISTS (SELECT 1 FROM staff_absences b WHERE b.staff_member_id = a.staff_member_id AND b.on_date = $1::date AND b.reason = a.reason)
      ORDER BY s.id, a.reason, a.on_date`,
    [day, days]
  );
  const out: SoonAway[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    const gap = last ? (Date.parse(`${r.on_date}T12:00:00Z`) - Date.parse(`${last.to}T12:00:00Z`)) / 86_400_000 : Infinity;
    if (last && last.staffId === r.id && last.reason === r.reason && gap <= 3) last.to = r.on_date;
    else out.push({ staffId: r.id, name: r.name ?? '—', reason: r.reason, from: r.on_date, to: r.on_date });
  }
  return out.sort((a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name));
}

export type MissingCover = { date: string; startsAt: string | null; courseId: string; groupIndex: number; label: string; teacherName: string | null; reason: AbsenceReason };

/** Lessons in the next two weeks whose teacher is away with nobody standing in yet. */
export async function missingCover(day: string, days = 14): Promise<MissingCover[]> {
  const rows = await query<{ on_date: string; starts_at: string | null; course_id: string; group_index: number; label: string; teacher_name: string | null; reason: AbsenceReason }>(
    `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, to_char(t.starts_at, 'HH24:MI') AS starts_at, d.course_id, d.group_index,
            coalesce(c.level_code, c.title, coalesce(ty.name_de, ty.name)) AS label, ${NAME('tp')} AS teacher_name, a.reason
       FROM course_days d
       JOIN course_day_times t ON t.id = d.id
       JOIN courses c ON c.id = d.course_id JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types ty ON ty.id = i.course_type_id
       JOIN staff_absences a ON a.staff_member_id = d.teacher_id AND a.on_date = d.on_date
       LEFT JOIN staff_members tm ON tm.id = d.teacher_id LEFT JOIN people tp ON tp.id = tm.person_id
      WHERE d.on_date BETWEEN $1::date AND $1::date + $2::int AND NOT d.cancelled AND NOT d.is_substitute
      ORDER BY d.on_date, t.starts_at NULLS LAST, c.level_code`,
    [day, days]
  );
  return rows.map((r) => ({ date: r.on_date, startsAt: r.starts_at, courseId: r.course_id, groupIndex: r.group_index, label: r.label, teacherName: r.teacher_name, reason: r.reason }));
}

export type Birthday = { staffId: string; name: string; date: string; inDays: number };

/** Colleagues' birthdays in the next two weeks — the day and month only; the office brings a gift. */
export async function birthdaysSoon(day: string, days = 14): Promise<Birthday[]> {
  const rows = await query<{ id: string; name: string | null; month: number; dom: number }>(
    `SELECT s.id, ${NAME('p')} AS name, extract(month FROM p.birth_date)::int AS month, extract(day FROM p.birth_date)::int AS dom
       FROM staff_members s JOIN people p ON p.id = s.person_id
      WHERE s.is_active AND p.birth_date IS NOT NULL`
  );
  const start = Date.parse(`${day}T12:00:00Z`);
  const year = Number(day.slice(0, 4));
  const out: Birthday[] = [];
  for (const r of rows) {
    for (const y of [year, year + 1]) {
      // 29 February is kept on 28 February in a year without it.
      const dom = r.month === 2 && r.dom === 29 && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1 ? 28 : r.dom;
      const when = Date.UTC(y, r.month - 1, dom, 12);
      const inDays = Math.round((when - start) / 86_400_000);
      if (inDays >= 0 && inDays <= days) {
        out.push({ staffId: r.id, name: r.name ?? '—', date: new Date(when).toISOString().slice(0, 10), inDays });
        break;
      }
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name));
}

/** Active colleagues on the register, for reporting one away from the Tagesplan. */
export async function registerColleagues(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(
    `SELECT s.id, ${NAME('p')} AS name FROM staff_members s JOIN people p ON p.id = s.person_id
      WHERE s.is_active ORDER BY p.first_name, p.last_name`
  );
}

// ---------------------------------------------------------- attendance sheet

export type AttendanceSheet = {
  courseId: string;
  label: string;
  typeName: string;
  number: string | null;
  roomName: string | null;
  teacherName: string | null;
  /** Covering for this teacher, when the day's teacher stands in. */
  replacedTeacherName: string | null;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  learners: { name: string }[];
};

/**
 * A lesson day's attendance sheet, as SchoolMan prints it (`SingleDateCourse_PresencePrint`): the
 * course, the teacher and the day; a row for each learner booked that day with Anwesenheit, Verspätung
 * and Kommentar to fill in; and boxes for what was done (Inhalt), the homework and a comment.
 */
export async function attendanceSheet(courseDayId: string): Promise<AttendanceSheet | null> {
  const head = await queryFirst<{
    course_id: string;
    group_index: number;
    on_date: string;
    starts_at: string | null;
    ends_at: string | null;
    label: string;
    type_name: string;
    number: string | null;
    room_name: string | null;
    teacher_name: string | null;
    replaced_teacher_name: string | null;
  }>(
    `SELECT d.course_id, d.group_index, to_char(d.on_date, 'YYYY-MM-DD') AS on_date,
            to_char(t.starts_at, 'HH24:MI') AS starts_at, to_char(t.ends_at, 'HH24:MI') AS ends_at,
            coalesce(c.level_code, c.title, coalesce(ty.name_de, ty.name)) AS label, coalesce(ty.name_de, ty.name) AS type_name,
            coalesce(c.filemaker_group_ids[d.group_index], c.filemaker_course_id) AS number, coalesce(r.nickname, r.name) AS room_name,
            ${NAME('tp')} AS teacher_name, CASE WHEN d.is_substitute THEN ${NAME('rp')} END AS replaced_teacher_name
       FROM course_days d
       JOIN course_day_times t ON t.id = d.id
       JOIN courses c ON c.id = d.course_id JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types ty ON ty.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = d.room_id
       LEFT JOIN staff_members tm ON tm.id = d.teacher_id LEFT JOIN people tp ON tp.id = tm.person_id
       LEFT JOIN staff_members rm ON rm.id = d.replaced_teacher_id LEFT JOIN people rp ON rp.id = rm.person_id
      WHERE d.id = $1`,
    [courseDayId]
  );
  if (!head) return null;
  const learners = await query<{ name: string }>(
    `SELECT concat_ws(', ', p.last_name, p.first_name) AS name
       FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id JOIN people p ON p.id = b.person_id
      WHERE bp.course_id = $1 AND (bp.group_index IS NULL OR bp.group_index = $2)
        AND bp.start_date <= $3::date AND bp.end_date >= $3::date
        AND b.deleted_at IS NULL AND p.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed')
      GROUP BY p.id, p.last_name, p.first_name
      ORDER BY p.last_name, p.first_name`,
    [head.course_id, head.group_index, head.on_date]
  );
  return {
    courseId: head.course_id,
    label: head.label,
    typeName: head.type_name,
    number: head.number,
    roomName: head.room_name,
    teacherName: head.teacher_name,
    replacedTeacherName: head.replaced_teacher_name,
    date: head.on_date,
    startsAt: head.starts_at,
    endsAt: head.ends_at,
    learners,
  };
}

// ------------------------------------------------------------- the desk

export type StaffDesk = { desk: Desk | null; shifts: { weekday: number; from: string; to: string }[] };

/** Where a colleague works in the office and their usual week there, for their page. */
export async function staffDesk(staffId: string): Promise<StaffDesk> {
  const [member, shifts] = await Promise.all([
    queryFirst<{ desk: Desk | null }>(`SELECT desk FROM staff_members WHERE id = $1`, [staffId]),
    query<{ weekday: number; starts_at: string; ends_at: string }>(
      `SELECT weekday, to_char(starts_at, 'HH24:MI') AS starts_at, to_char(ends_at, 'HH24:MI') AS ends_at FROM staff_shifts WHERE staff_member_id = $1 ORDER BY weekday`,
      [staffId]
    ),
  ]);
  return { desk: member?.desk ?? null, shifts: shifts.map((s) => ({ weekday: s.weekday, from: s.starts_at, to: s.ends_at })) };
}

/** Reception, the office or neither, and the usual week: a weekday left empty has no shift. */
export async function saveStaffDesk(staffId: string, input: StaffDesk, actor: StaffUser): Promise<Result> {
  const exists = await queryFirst<{ id: string }>(`UPDATE staff_members SET desk = $2 WHERE id = $1 RETURNING id`, [staffId, input.desk]);
  if (!exists) return refuse('Diese Person gibt es nicht mehr.', 'This person no longer exists.');
  await query(`DELETE FROM staff_shifts WHERE staff_member_id = $1`, [staffId]);
  for (const s of input.desk ? input.shifts : []) {
    await query(`INSERT INTO staff_shifts (staff_member_id, weekday, starts_at, ends_at) VALUES ($1, $2, $3::time, $4::time)`, [staffId, s.weekday, s.from, s.to]);
  }
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_desk_saved', detail: { desk: input.desk, shifts: input.shifts.length } });
  return { ok: true };
}
