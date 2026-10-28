import 'server-only';

import { isSchoolClosed } from '@/config/school-closures';
import { PLACEMENT_SEATS, PLACEMENT_TIMES } from '@/lib/appointments/placement-schedule';
import { isPublicHoliday } from '@/lib/appointments/schedule';

import { logActivity } from './activity';
import type { AppointmentKind, AppointmentStatus } from './appointment-labels';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';
import type { AbsenceReason } from './kursplanung/types';

/**
 * Termine in the workspace (Rahman, 2026-10-28): the team's appointments (0098). The placement test
 * in person is one kind, booked by learners on the placement page; consultations, group
 * consultations and any other appointment are written in by the team. Each may be assigned to a
 * colleague — their „Meine Termine" — and everyone sees every appointment and whose it is, with a
 * mark when that colleague is away on the day, so somebody covers it.
 *
 * Ina's group consultations booked on the website stay requests on their enquiries
 * (group_appointments, 0015): they are listed beside the others, assigned to whoever owns the
 * enquiry, and changed on the enquiry, not here.
 *
 * Every day is `YYYY-MM-DD` on Bremen's calendar; a time is Bremen's wall time, turned into an
 * instant by Postgres (`AT TIME ZONE`), so the change to and from summer time is its business.
 */

const ZONE = 'Europe/Berlin';

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type Appointment = {
  id: string;
  kind: AppointmentKind;
  date: string;
  time: string;
  minutes: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  status: AppointmentStatus;
  source: 'website' | 'staff';
  assignee: { id: string; name: string } | null;
  /** The assignee's absence on the appointment's day, from the staff register. */
  assigneeAway: AbsenceReason | null;
  /** A group consultation requested on the website: its enquiry, where it is changed. */
  enquiryId: string | null;
};

export type AppointmentInput = {
  kind: AppointmentKind;
  date: string;
  time: string;
  minutes: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  assignedTo: string | null;
};

/** A day the website offers placement tests on: Tuesday to Thursday, not a holiday, the school open. */
export function isPlacementWeekday(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday >= 2 && weekday <= 4 && !isPublicHoliday(date) && !isSchoolClosed(date);
}

/** How many placement places a placement day has: twelve times, two each. */
export const PLACEMENT_DAY_PLACES = PLACEMENT_TIMES.length * PLACEMENT_SEATS;

type Row = {
  id: string;
  kind: AppointmentKind;
  on_date: string;
  at: string;
  minutes: number;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  status: AppointmentStatus;
  source: 'website' | 'staff';
  assignee_id: string | null;
  assignee_name: string | null;
  away: AbsenceReason | null;
  enquiry_id: string | null;
};

/**
 * The appointments of `days + 1` days from `from`, cancelled ones too, in the order they happen —
 * or only one colleague's (`assignedTo`), for „Meine Termine".
 */
export async function appointmentsFrom(from: string, days: number, assignedTo?: string): Promise<Appointment[]> {
  const rows = await query<Row>(
    `WITH listed AS (
       SELECT a.id::text AS id, a.kind, a.starts_at, a.minutes, a.first_name, a.last_name, a.email, a.phone, a.note,
              a.status, a.source, a.assigned_to, NULL::uuid AS enquiry_id
         FROM appointments a
        WHERE (a.starts_at AT TIME ZONE $3)::date BETWEEN $1::date AND $1::date + $2::int
       UNION ALL
       SELECT 'request-' || e.id, 'group_consultation', g.starts_at, 30, e.first_name, e.last_name, e.email, NULL, NULL,
              'booked', 'website', e.assigned_to, e.id
         FROM group_appointments g JOIN enquiries e ON e.request_id = g.request_id
        WHERE (g.starts_at AT TIME ZONE $3)::date BETWEEN $1::date AND $1::date + $2::int
          AND e.status NOT IN ('declined', 'spam')
     )
     SELECT l.id, l.kind, to_char(l.starts_at AT TIME ZONE $3, 'YYYY-MM-DD') AS on_date, to_char(l.starts_at AT TIME ZONE $3, 'HH24:MI') AS at,
            l.minutes, l.first_name, l.last_name, l.email, l.phone, l.note, l.status, l.source,
            u.id AS assignee_id, u.name AS assignee_name, away.reason AS away, l.enquiry_id
       FROM listed l
       LEFT JOIN staff_users u ON u.id = l.assigned_to
       LEFT JOIN LATERAL (
         SELECT x.reason FROM staff_absences x JOIN staff_members m ON m.id = x.staff_member_id
          WHERE m.staff_user_id = l.assigned_to AND x.on_date = (l.starts_at AT TIME ZONE $3)::date
          LIMIT 1
       ) away ON true
      WHERE $4::uuid IS NULL OR l.assigned_to = $4::uuid
      ORDER BY l.starts_at, l.first_name`,
    [from, days, ZONE, assignedTo ?? null]
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    date: r.on_date,
    time: r.at,
    minutes: r.minutes,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    note: r.note,
    status: r.status,
    source: r.source,
    assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name ?? '—' } : null,
    assigneeAway: r.away,
    enquiryId: r.enquiry_id,
  }));
}

/** Who an appointment may be for: the workspace's active accounts. */
export async function appointmentColleagues(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY name`);
}

const at = `($1::date + $2::time) AT TIME ZONE '${ZONE}'`;

export async function createAppointment(input: AppointmentInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO appointments (kind, starts_at, minutes, first_name, last_name, email, phone, note, assigned_to, source, created_by)
     VALUES ($3, ${at}, $4, $5, $6, $7, $8, $9, $10, 'staff', $11) RETURNING id`,
    [input.date, input.time, input.kind, input.minutes, input.firstName, input.lastName, input.email, input.phone, input.note, input.assignedTo, actor.id]
  );
  if (!row) return refuse('Der Termin konnte nicht gespeichert werden.', 'The appointment could not be saved.');
  await logActivity({ actor, entity: 'appointment', entityId: row.id, action: 'appointment_created', detail: { kind: input.kind, date: input.date, time: input.time } });
  return { ok: true, id: row.id };
}

export async function updateAppointment(id: string, input: AppointmentInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE appointments
        SET kind = $3, starts_at = ${at}, minutes = $4, first_name = $5, last_name = $6, email = $7, phone = $8, note = $9,
            assigned_to = $10, updated_at = timezone('utc', now())
      WHERE id = $11 RETURNING id`,
    [input.date, input.time, input.kind, input.minutes, input.firstName, input.lastName, input.email, input.phone, input.note, input.assignedTo, id]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'appointment', entityId: id, action: 'appointment_updated', detail: { kind: input.kind, date: input.date, time: input.time } });
  return { ok: true };
}

/** Booked, came, did not come, cancelled: cancelling a placement test gives its place back to the website. */
export async function setAppointmentStatus(id: string, status: AppointmentStatus, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE appointments SET status = $2, updated_at = timezone('utc', now()) WHERE id = $1 RETURNING id`,
    [id, status]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'appointment', entityId: id, action: 'appointment_status', detail: { status } });
  return { ok: true };
}

/** Whose it is, chosen from the row: a colleague, or nobody (the team). */
export async function assignAppointment(id: string, staffId: string | null, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string; name: string | null }>(
    `UPDATE appointments a SET assigned_to = $2, updated_at = timezone('utc', now())
      WHERE a.id = $1
      RETURNING a.id, (SELECT name FROM staff_users WHERE id = $2) AS name`,
    [id, staffId]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'appointment', entityId: id, action: 'appointment_assigned', detail: { to: row.name } });
  return { ok: true };
}

export async function deleteAppointment(id: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(`DELETE FROM appointments WHERE id = $1 RETURNING id`, [id]);
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'appointment', entityId: id, action: 'appointment_deleted' });
  return { ok: true };
}
