import 'server-only';

import { dayEvents, weekFacts, type DayEvent, type DayFacts } from './day-board';
import { query, queryFirst } from './db';
import { teachingOn, type TeachingDay } from './kursplanung/day';
import { FOLLOW_UP_AFTER_DAYS } from './offers/repo';
import { officeDay, rotaSpan, type OfficeDay, type StaffAbsence } from './rota';
import { officeHoursOn } from './rota-rules';

/**
 * The control room: FileMaker's home calendar (`SingleDayCalendar_Overview`)
 * rebuilt — a week of day rows, Sunday to Saturday as the team has always
 * read it (Sunday is when people move in, Monday when they start), each day
 * with its arrivals, birthdays, the work written down for it, the rooms and
 * the teaching plan with their clashes, who is at the desk and who is away.
 *
 * Where FileMaker showed a button and left the looking to the eye, this works
 * it out: a room booked twice at once, lessons nobody teaches, office hours
 * nobody covers, a shift planned for someone who is away. One round of
 * queries for the whole week.
 */

export type Named = { title: string; detail: string | null; href: string };

export type Classroom = { course: string; time: string; room: string | null; roomId: string | null };

export type TeacherAway = { name: string; from: string; to: string; reason: string };

export type ControlDay = {
  date: string;
  /** The office is open (Monday to Friday, the public site's hours). */
  open: boolean;
  facts: DayFacts;
  events: Record<DayEvent['kind'], Named[]>;
  classrooms: Classroom[];
  /** A room two cohorts use at the same time. */
  roomClashes: { room: string; courses: string[] }[];
  office: OfficeDay | null;
  teaching: TeachingDay | null;
  teachersAway: TeacherAway[];
};

export type ControlWeek = {
  sunday: string;
  saturday: string;
  days: ControlDay[];
  /** The queues' new arrivals, for the launch row. */
  waiting: { enquiries: number; registrations: number; offers: number; applications: number; placement: number };
  /** Every absence touching the week, for the dialogs. */
  absences: StaffAbsence[];
};

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDay = (s: string, n: number) => iso(new Date(parse(s).getTime() + n * 86_400_000));

/** The Sunday that starts the week a day falls in — FileMaker's week, Sunday to Saturday. */
export const sundayOf = (s: string) => addDay(s, -parse(s).getUTCDay());

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const minutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
};

type CohortRow = {
  id: string;
  course: string;
  level: string | null;
  start_date: string;
  end_date: string;
  schedule: { days?: string[]; time?: string } | null;
  room_id: string | null;
  room: string | null;
};

/** Cohorts teaching on a day, with their rooms, and the rooms booked twice at the same time. */
function rooms(day: string, cohorts: readonly CohortRow[]): Pick<ControlDay, 'classrooms' | 'roomClashes'> {
  const dow = WEEKDAY[parse(day).getUTCDay()];
  const running = cohorts.filter(
    (c) => c.start_date <= day && c.end_date >= day && Array.isArray(c.schedule?.days) && c.schedule!.days!.includes(dow)
  );
  const classrooms = running
    .map((c) => ({
      course: [c.course, c.level].filter(Boolean).join(' '),
      time: (c.schedule?.time ?? '').replace('-', '–'),
      room: c.room,
      roomId: c.room_id,
    }))
    .sort((a, b) => a.time.localeCompare(b.time) || a.course.localeCompare(b.course));

  const clashes: ControlDay['roomClashes'] = [];
  const byRoom = new Map<string, Classroom[]>();
  for (const c of classrooms) if (c.roomId) byRoom.set(c.roomId, [...(byRoom.get(c.roomId) ?? []), c]);
  for (const list of byRoom.values()) {
    const span = (c: Classroom) => c.time.split('–').map(minutes);
    const clashing = list.filter((a) => list.some((b) => b !== a && span(a)[0] < span(b)[1] && span(b)[0] < span(a)[1]));
    if (clashing.length) clashes.push({ room: clashing[0].room ?? '', courses: clashing.map((c) => c.course) });
  }
  return { classrooms, roomClashes: clashes };
}

/** Teacher absences as spans (Friday to Monday is one span), the way the team writes them down. */
function teacherSpans(rows: readonly { name: string; on_date: string; reason: string }[]): TeacherAway[] {
  const spans: TeacherAway[] = [];
  for (const r of rows) {
    const last = spans.at(-1);
    const gap = last ? (parse(r.on_date).getTime() - parse(last.to).getTime()) / 86_400_000 : 99;
    const onlyWeekendBetween = gap > 1 && gap <= 3 && [1, 2].slice(0, gap - 1).every((i) => [0, 6].includes(parse(addDay(last!.to, i)).getUTCDay()));
    if (last && last.name === r.name && last.reason === r.reason && (gap === 1 || onlyWeekendBetween)) last.to = r.on_date;
    else spans.push({ name: r.name, from: r.on_date, to: r.on_date, reason: r.reason });
  }
  return spans;
}

export async function controlWeek(
  anyDay: string,
  { teaching, rota }: { teaching: boolean; rota: boolean }
): Promise<ControlWeek> {
  const sunday = sundayOf(anyDay);
  const saturday = addDay(sunday, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDay(sunday, i));
  const weekdays = dates.filter((d) => officeHoursOn(d));

  const [facts, events, cohorts, rotaData, teachingWeek, teacherRows, waiting] = await Promise.all([
    weekFacts(sunday, saturday, { teaching }),
    Promise.all(dates.map((d) => dayEvents(d))),
    query<CohortRow>(
      `SELECT i.id, coalesce(i.title, t.name) AS course, nullif(i.level_code, '') AS level,
              to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
              i.schedule, i.room_id, r.name AS room
         FROM course_instances i
         JOIN course_types t ON t.id = i.course_type_id
         LEFT JOIN rooms r ON r.id = i.room_id
        WHERE i.status <> 'cancelled' AND i.start_date <= $2::date AND i.end_date >= $1::date`,
      [sunday, saturday]
    ),
    rota ? rotaSpan(sunday, saturday) : Promise.resolve(null),
    teaching ? teachingOn(weekdays) : Promise.resolve(null),
    teaching
      ? query<{ name: string; on_date: string; reason: string }>(
          `SELECT t.short_name AS name, to_char(a.on_date, 'YYYY-MM-DD') AS on_date, a.reason
             FROM teacher_absences a JOIN teachers t ON t.id = a.teacher_id
            WHERE a.teacher_id IN (SELECT teacher_id FROM teacher_absences WHERE on_date BETWEEN $1::date AND $2::date)
              AND a.on_date BETWEEN $1::date - 60 AND $2::date + 60
            ORDER BY t.short_name, a.on_date`,
          [sunday, saturday]
        )
      : Promise.resolve([]),
    queryFirst<Record<keyof ControlWeek['waiting'], string>>(
      `SELECT (SELECT count(*) FROM enquiries WHERE status = 'new') AS enquiries,
              (SELECT count(*) FROM course_registrations WHERE status = 'new')
                + (SELECT count(*) FROM exam_registrations WHERE status = 'new') AS registrations,
              (SELECT count(*) FROM offers o WHERE o.deleted_at IS NULL AND o.status = 'sent'
                 AND (o.valid_until < current_date OR o.sent_at::date <= current_date - ${FOLLOW_UP_AFTER_DAYS})) AS offers,
              (SELECT count(*) FROM career_applications WHERE status IN ('submitted', 'new')) AS applications,
              (SELECT count(*) FROM placement_attempts a LEFT JOIN placement_reviews r ON r.attempt_id = a.id
                WHERE a.decision IS NOT NULL AND r.attempt_id IS NULL) AS placement`
    ),
  ]);

  const spans = teacherSpans(teacherRows);
  const rotaPlanned = !!rotaData?.shifts.length;

  const days = dates.map((date, i): ControlDay => {
    const open = officeHoursOn(date) !== null;
    const office = rotaData ? officeDay(date, rotaData.shifts, rotaData.absences) : null;
    const f = { ...facts.get(date)! };
    const t = teachingWeek?.get(date) ?? null;
    if (t) Object.assign(f, { unplanned: t.open, conflicts: t.conflicts });
    if (office) Object.assign(f, { staffAway: open ? office.away.length : 0, receptionGaps: open && rotaPlanned ? office.gaps.length : 0 });
    const grouped = Object.fromEntries(
      (['arrival', 'move_in', 'move_out', 'course_start', 'course_end', 'exam', 'birthday'] as const).map((k) => [
        k,
        events[i].filter((e) => e.kind === k).map(({ title, detail, href }) => ({ title, detail, href })),
      ])
    ) as ControlDay['events'];
    return {
      date,
      open,
      facts: f,
      events: grouped,
      ...rooms(date, cohorts),
      office: office && rotaPlanned ? office : office && office.away.length ? { ...office, gaps: [] } : null,
      teaching: t,
      teachersAway: spans.filter((s) => s.from <= date && s.to >= date),
    };
  });

  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    sunday,
    saturday,
    days,
    waiting: {
      enquiries: n(waiting?.enquiries),
      registrations: n(waiting?.registrations),
      offers: n(waiting?.offers),
      applications: n(waiting?.applications),
      placement: n(waiting?.placement),
    },
    absences: rotaData?.absences ?? [],
  };
}
