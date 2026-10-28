import 'server-only';

import { isSchoolClosed } from '@/config/school-closures';
import { PLACEMENT_SEATS, PLACEMENT_TIMES } from '@/lib/appointments/placement-schedule';
import { isPublicHoliday } from '@/lib/appointments/schedule';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';

/**
 * Einstufungstermine in the workspace (Rahman, 2026-10-28): the in-person placement test by
 * appointment, Tuesday to Thursday, two places per time (0098, src/lib/appointments/placement-schedule.ts).
 * Learners book on the placement page; the team sees them in the Tagesplan's „Termine" panel and
 * writes in the ones made by phone or at the desk. A colleague may book any day and time, and more
 * than two people into one: the website's limit is for the website.
 *
 * Every day is `YYYY-MM-DD` on Bremen's calendar; a time is Bremen's wall time, turned into an
 * instant by Postgres (`AT TIME ZONE`), so the change to and from summer time is its business.
 */

export const PLACEMENT_STATUSES = ['booked', 'came', 'missed', 'cancelled'] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];
export const isPlacementStatus = (value: string): value is PlacementStatus => (PLACEMENT_STATUSES as readonly string[]).includes(value);

const ZONE = 'Europe/Berlin';

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type PlacementAppointment = {
  id: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  status: PlacementStatus;
  source: 'website' | 'staff';
};

export type PlacementAppointmentInput = {
  date: string;
  time: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
};

/** A day the website offers appointments on: Tuesday to Thursday, not a holiday, the school open. */
export function isPlacementWeekday(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday >= 2 && weekday <= 4 && !isPublicHoliday(date) && !isSchoolClosed(date);
}

/** How many places a placement day has: twelve times, two each. */
export const PLACEMENT_DAY_PLACES = PLACEMENT_TIMES.length * PLACEMENT_SEATS;

/** The appointments from `from` for `days` more days, in the order they happen; cancelled ones too. */
export async function placementAppointments(from: string, days: number): Promise<PlacementAppointment[]> {
  const rows = await query<{
    id: string;
    on_date: string;
    at: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    note: string | null;
    status: PlacementStatus;
    source: 'website' | 'staff';
  }>(
    `SELECT id, to_char(starts_at AT TIME ZONE $3, 'YYYY-MM-DD') AS on_date, to_char(starts_at AT TIME ZONE $3, 'HH24:MI') AS at,
            first_name, last_name, email, phone, note, status, source
       FROM placement_appointments
      WHERE (starts_at AT TIME ZONE $3)::date BETWEEN $1::date AND $1::date + $2::int
      ORDER BY starts_at, created_at`,
    [from, days, ZONE]
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.on_date,
    time: r.at,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    note: r.note,
    status: r.status,
    source: r.source,
  }));
}

export async function createPlacementAppointment(input: PlacementAppointmentInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO placement_appointments (starts_at, first_name, last_name, email, phone, note, source, created_by)
     VALUES (($1::date + $2::time) AT TIME ZONE $8, $3, $4, $5, $6, $7, 'staff', $9) RETURNING id`,
    [input.date, input.time, input.firstName, input.lastName, input.email, input.phone, input.note, ZONE, actor.id]
  );
  if (!row) return refuse('Der Termin konnte nicht gespeichert werden.', 'The appointment could not be saved.');
  await logActivity({ actor, entity: 'placement_appointment', entityId: row.id, action: 'placement_appointment_created', detail: { date: input.date, time: input.time } });
  return { ok: true, id: row.id };
}

export async function updatePlacementAppointment(id: string, input: PlacementAppointmentInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE placement_appointments
        SET starts_at = ($2::date + $3::time) AT TIME ZONE $9, first_name = $4, last_name = $5, email = $6, phone = $7, note = $8,
            updated_at = timezone('utc', now())
      WHERE id = $1 RETURNING id`,
    [id, input.date, input.time, input.firstName, input.lastName, input.email, input.phone, input.note, ZONE]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'placement_appointment', entityId: id, action: 'placement_appointment_updated', detail: { date: input.date, time: input.time } });
  return { ok: true };
}

/** Booked, came, did not come, cancelled: cancelled gives the place back to the website. */
export async function setPlacementStatus(id: string, status: PlacementStatus, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(
    `UPDATE placement_appointments SET status = $2, updated_at = timezone('utc', now()) WHERE id = $1 RETURNING id`,
    [id, status]
  );
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'placement_appointment', entityId: id, action: 'placement_appointment_status', detail: { status } });
  return { ok: true };
}

export async function deletePlacementAppointment(id: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ id: string }>(`DELETE FROM placement_appointments WHERE id = $1 RETURNING id`, [id]);
  if (!row) return refuse('Diesen Termin gibt es nicht mehr.', 'This appointment no longer exists.');
  await logActivity({ actor, entity: 'placement_appointment', entityId: id, action: 'placement_appointment_deleted' });
  return { ok: true };
}
