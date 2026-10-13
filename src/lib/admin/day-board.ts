import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';

/**
 * The day board — what the administration team has to get done, by day.
 *
 * Five or six colleagues share the work, so every task carries an area and,
 * optionally, an owner. The board is read three ways from the same rows: the
 * chosen day, what is still open from earlier days, and what is mine.
 *
 * Nothing moves a task by itself. An unfinished task stays on its own date and
 * shows up as overdue, because a task that silently rolls forward is a task
 * nobody notices they have missed.
 */

export const TASK_AREAS = [
  'students',
  'courses',
  'accommodation',
  'exams',
  'finance',
  'other',
] as const;

export type TaskArea = (typeof TASK_AREAS)[number];

export type DayTask = {
  id: string;
  onDate: Date;
  title: string;
  detail: string | null;
  area: TaskArea;
  assignedTo: string | null;
  assigneeName: string | null;
  doneAt: Date | null;
  doneByName: string | null;
  createdByName: string | null;
};

const SELECT = `
  SELECT t.id, t.on_date, t.title, t.detail, t.area, t.assigned_to,
         a.name AS assignee_name, t.done_at, d.name AS done_by_name,
         c.name AS created_by_name
    FROM day_tasks t
    LEFT JOIN staff_users a ON a.id = t.assigned_to
    LEFT JOIN staff_users d ON d.id = t.done_by
    LEFT JOIN staff_users c ON c.id = t.created_by
`;

type Row = {
  id: string;
  on_date: Date;
  title: string;
  detail: string | null;
  area: TaskArea;
  assigned_to: string | null;
  assignee_name: string | null;
  done_at: Date | null;
  done_by_name: string | null;
  created_by_name: string | null;
};

const toTask = (r: Row): DayTask => ({
  id: r.id,
  onDate: r.on_date,
  title: r.title,
  detail: r.detail,
  area: r.area,
  assignedTo: r.assigned_to,
  assigneeName: r.assignee_name,
  doneAt: r.done_at,
  doneByName: r.done_by_name,
  createdByName: r.created_by_name,
});

/**
 * The board for one day: its own tasks, plus anything left open from before it.
 * Open tasks first, then what was finished today, so the board empties visibly.
 */
export async function dayBoard(date: string): Promise<{ today: DayTask[]; overdue: DayTask[] }> {
  const [today, overdue] = await Promise.all([
    query<Row>(
      `${SELECT} WHERE t.on_date = $1::date
        ORDER BY (t.done_at IS NOT NULL), t.area, t.created_at`,
      [date]
    ),
    query<Row>(
      `${SELECT} WHERE t.on_date < $1::date AND t.done_at IS NULL
        ORDER BY t.on_date, t.area, t.created_at`,
      [date]
    ),
  ]);
  return { today: today.map(toTask), overdue: overdue.map(toTask) };
}

/** Open tasks assigned to one person, any day. The "mine" reading. */
export async function myOpenTasks(staffUserId: string, limit = 8): Promise<DayTask[]> {
  const rows = await query<Row>(
    `${SELECT} WHERE t.assigned_to = $1 AND t.done_at IS NULL
      ORDER BY t.on_date LIMIT $2`,
    [staffUserId, limit]
  );
  return rows.map(toTask);
}

export async function createDayTask(
  input: {
    onDate: string;
    title: string;
    detail: string | null;
    area: TaskArea;
    assignedTo: string | null;
  },
  actor: StaffUser
): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO day_tasks (on_date, title, detail, area, assigned_to, created_by)
     VALUES ($1::date, $2, $3, $4, $5, $6) RETURNING id`,
    [input.onDate, input.title, input.detail, input.area, input.assignedTo, actor.id]
  );
  if (!row) throw new Error('Task was not created');
  return row.id;
}

/** Marks done, or puts it back. Both directions record who did it. */
export async function setDayTaskDone(id: string, done: boolean, actor: StaffUser): Promise<void> {
  await query(
    done
      ? `UPDATE day_tasks SET done_at = now(), done_by = $2 WHERE id = $1 AND done_at IS NULL`
      : `UPDATE day_tasks SET done_at = NULL, done_by = NULL WHERE id = $1`,
    [id, actor.id]
  );
}

export async function updateDayTask(
  id: string,
  patch: {
    onDate: string;
    title: string;
    detail: string | null;
    area: TaskArea;
    assignedTo: string | null;
  },
  actor: StaffUser
): Promise<void> {
  await query(
    `UPDATE day_tasks SET on_date = $2::date, title = $3, detail = $4, area = $5, assigned_to = $6
      WHERE id = $1`,
    [id, patch.onDate, patch.title, patch.detail, patch.area, patch.assignedTo]
  );
  await logActivity({ actor, entity: 'day_task', entityId: id, action: 'task_updated' });
}

export async function deleteDayTask(id: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM day_tasks WHERE id = $1`, [id]);
  await logActivity({ actor, entity: 'day_task', entityId: id, action: 'task_deleted' });
}

/**
 * What is actually happening on a day, by name: learners whose first day it
 * is, who moves into or out of their room, courses starting and ending, exam
 * sittings, and the birthdays of learners at the school that day — the day
 * row of FileMaker's home calendar (SingleDayCalendar_Overview), read from the
 * records the team already keeps, so it is never a separate thing to maintain.
 */
export type DayEvent = {
  kind: 'course_start' | 'course_end' | 'exam' | 'arrival' | 'move_in' | 'move_out' | 'birthday';
  title: string;
  detail: string | null;
  count: number;
  href: string;
};

export async function dayEvents(date: string): Promise<DayEvent[]> {
  const rows = await query<{
    kind: DayEvent['kind'];
    title: string;
    detail: string | null;
    count: string;
    href: string;
  }>(
    `SELECT 'course_start'::text AS kind,
            coalesce(i.title, t.name) AS title,
            coalesce(i.level_code, '') || CASE WHEN r.nickname IS NOT NULL THEN ' · ' || r.nickname ELSE '' END AS detail,
            (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp
               JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.course_instance_id = i.id AND b.deleted_at IS NULL AND b.status <> 'cancelled')::text AS count,
            '/admin/catalogue' AS href
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = i.room_id
      WHERE i.start_date = $1::date AND i.status <> 'cancelled'
     UNION ALL
     SELECT 'course_end', coalesce(i.title, t.name),
            coalesce(i.level_code, ''),
            (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp
               JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.course_instance_id = i.id AND b.deleted_at IS NULL AND b.status <> 'cancelled')::text,
            '/admin/catalogue'
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
      WHERE i.end_date = $1::date AND i.status <> 'cancelled'
     UNION ALL
     SELECT 'exam', e.name, to_char(s.starts_at, 'HH24:MI'),
            (SELECT count(*) FROM exam_registrations r
              WHERE r.exam_session_id = s.id AND r.status <> 'spam')::text,
            '/admin/catalogue/exams'
       FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id
      WHERE s.starts_at::date = $1::date AND s.status <> 'cancelled'
     UNION ALL
     SELECT 'arrival', trim(p.first_name || ' ' || coalesce(p.last_name, '')),
            coalesce(ct.name, ''), '1',
            '/admin/bookings/' || b.id::text
       FROM booking_periods bp
       JOIN bookings b ON b.id = bp.booking_id
       JOIN people p ON p.id = b.person_id
       LEFT JOIN course_types ct ON ct.id = b.course_type_id
      WHERE bp.start_date = $1::date AND bp.kind = 'initial'
        AND b.deleted_at IS NULL AND b.status <> 'cancelled'
     UNION ALL
     SELECT CASE WHEN b.accommodation_from = $1::date THEN 'move_in' ELSE 'move_out' END,
            trim(p.first_name || ' ' || coalesce(p.last_name, '')),
            coalesce(at.name_en, ''), '1',
            '/admin/bookings/' || b.id::text
       FROM bookings b
       JOIN people p ON p.id = b.person_id
       LEFT JOIN accommodation_types at ON at.code = b.accommodation_type_code
      WHERE (b.accommodation_from = $1::date OR b.accommodation_to = $1::date)
        AND b.deleted_at IS NULL AND b.status <> 'cancelled'
     UNION ALL
     SELECT 'birthday', trim(p.first_name || ' ' || coalesce(p.last_name, '')),
            'turns ' || (extract(year FROM $1::date) - extract(year FROM p.birth_date))::int::text, '1',
            '/admin/people/' || p.id::text
       FROM people p
      WHERE p.deleted_at IS NULL AND p.birth_date IS NOT NULL
        AND to_char(p.birth_date, 'MM-DD') = to_char($1::date, 'MM-DD')
        AND EXISTS (SELECT 1 FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
                     WHERE b.person_id = p.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                       AND bp.start_date <= $1::date AND bp.end_date >= $1::date)
     ORDER BY 1, 2`,
    [date]
  );
  return rows.map((r) => ({
    kind: r.kind,
    title: r.title,
    detail: r.detail || null,
    count: Number(r.count),
    href: r.href,
  }));
}

/** What a day of the week holds, counted: the week at a glance on Today. */
export type DayFacts = {
  firstDays: number;
  movingIn: number;
  movingOut: number;
  coursesStart: number;
  coursesEnd: number;
  exams: number;
  birthdays: number;
  /** Teachers away (teacher_absences); read only for a colleague who holds Kursplanung. */
  away: number;
  /** Lessons nobody is planned for, and conflicts in the plan — Kursplanung's, filled in by Today. */
  unplanned: number;
  conflicts: number;
  /** The office team from the rota: colleagues away, and stretches of the office hours nobody covers — filled in by Today. */
  staffAway: number;
  receptionGaps: number;
  tasks: number;
};

/**
 * The week, day by day, in one query — FileMaker's home calendar showed the
 * team the week's shape (how many start, who has a birthday, who is away)
 * before they opened any day, and Today does the same.
 */
export async function weekFacts(from: string, to: string, { teaching }: { teaching: boolean }): Promise<Map<string, DayFacts>> {
  const rows = await query<Record<'day' | 'first_days' | 'move_in' | 'move_out' | 'course_start' | 'course_end' | 'exams' | 'birthdays' | 'away' | 'tasks', string>>(
    `SELECT to_char(g.d, 'YYYY-MM-DD') AS day,
            (SELECT count(*) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.start_date = g.d AND bp.kind = 'initial' AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS first_days,
            (SELECT count(*) FROM bookings b
              WHERE b.accommodation_from = g.d AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS move_in,
            (SELECT count(*) FROM bookings b
              WHERE b.accommodation_to = g.d AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS move_out,
            (SELECT count(*) FROM course_instances i WHERE i.start_date = g.d AND i.status <> 'cancelled') AS course_start,
            (SELECT count(*) FROM course_instances i WHERE i.end_date = g.d AND i.status <> 'cancelled') AS course_end,
            (SELECT count(*) FROM exam_sessions s WHERE s.starts_at::date = g.d AND s.status <> 'cancelled') AS exams,
            (SELECT count(*) FROM people p
              WHERE p.deleted_at IS NULL AND p.birth_date IS NOT NULL
                AND to_char(p.birth_date, 'MM-DD') = to_char(g.d, 'MM-DD')
                AND EXISTS (SELECT 1 FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
                             WHERE b.person_id = p.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                               AND bp.start_date <= g.d AND bp.end_date >= g.d)) AS birthdays,
            ${teaching ? '(SELECT count(*) FROM teacher_absences a WHERE a.on_date = g.d)' : '0'} AS away,
            (SELECT count(*) FROM day_tasks t WHERE t.on_date = g.d AND t.done_at IS NULL) AS tasks
       FROM (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS d) AS g`,
    [from, to]
  );
  return new Map(
    rows.map((r) => [
      r.day,
      {
        firstDays: Number(r.first_days),
        movingIn: Number(r.move_in),
        movingOut: Number(r.move_out),
        coursesStart: Number(r.course_start),
        coursesEnd: Number(r.course_end),
        exams: Number(r.exams),
        birthdays: Number(r.birthdays),
        away: Number(r.away),
        unplanned: 0,
        conflicts: 0,
        staffAway: 0,
        receptionGaps: 0,
        tasks: Number(r.tasks),
      },
    ])
  );
}
