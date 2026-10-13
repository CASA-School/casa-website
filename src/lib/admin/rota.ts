import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import { isAbsenceReason, receptionGaps, shortTime, type AbsenceReason, type Span } from './rota-rules';

/**
 * The rota (migration 0025): who is at the office desk when, and who of the
 * office team is away. Read by the Rota screen and by Today; teachers' absences
 * stay Kursplanung's.
 */

export type RotaColleague = { id: string; name: string };

export type Shift = {
  id: string;
  staffUserId: string;
  staffName: string;
  onDate: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export type StaffAbsence = {
  id: string;
  staffUserId: string;
  staffName: string;
  fromDate: string;
  toDate: string;
  reason: AbsenceReason;
  note: string | null;
};

type ShiftRow = { id: string; staff_user_id: string; staff_name: string; on_date: string; starts_at: string; ends_at: string; note: string | null };
type AbsenceRow = { id: string; staff_user_id: string; staff_name: string; from_date: string; to_date: string; reason: string; note: string | null };

const toShift = (r: ShiftRow): Shift => ({
  id: r.id,
  staffUserId: r.staff_user_id,
  staffName: r.staff_name,
  onDate: r.on_date,
  startsAt: shortTime(r.starts_at),
  endsAt: shortTime(r.ends_at),
  note: r.note,
});

const toAbsence = (r: AbsenceRow): StaffAbsence => ({
  id: r.id,
  staffUserId: r.staff_user_id,
  staffName: r.staff_name,
  fromDate: r.from_date,
  toDate: r.to_date,
  reason: isAbsenceReason(r.reason) ? r.reason : 'other',
  note: r.note,
});

const SHIFT_SELECT = `SELECT s.id, s.staff_user_id, u.name AS staff_name, to_char(s.on_date, 'YYYY-MM-DD') AS on_date,
                             s.starts_at::text AS starts_at, s.ends_at::text AS ends_at, s.note
                        FROM staff_shifts s JOIN staff_users u ON u.id = s.staff_user_id`;

const ABSENCE_SELECT = `SELECT a.id, a.staff_user_id, u.name AS staff_name, to_char(a.from_date, 'YYYY-MM-DD') AS from_date,
                               to_char(a.to_date, 'YYYY-MM-DD') AS to_date, a.reason, a.note
                          FROM staff_absences a JOIN staff_users u ON u.id = a.staff_user_id`;

/** Everything in a span of days: the active colleagues, their shifts, the absences touching it. */
export async function rotaSpan(from: string, to: string): Promise<{ staff: RotaColleague[]; shifts: Shift[]; absences: StaffAbsence[] }> {
  const [staff, shifts, absences] = await Promise.all([
    query<RotaColleague>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY lower(name)`),
    query<ShiftRow>(`${SHIFT_SELECT} WHERE s.on_date BETWEEN $1::date AND $2::date ORDER BY s.on_date, s.starts_at, lower(u.name)`, [from, to]),
    query<AbsenceRow>(`${ABSENCE_SELECT} WHERE a.to_date >= $1::date AND a.from_date <= $2::date ORDER BY a.from_date, lower(u.name)`, [from, to]),
  ]);
  return { staff, shifts: shifts.map(toShift), absences: absences.map(toAbsence) };
}

/** Absences that are not over yet, soonest first. */
export async function absencesFrom(day: string): Promise<StaffAbsence[]> {
  const rows = await query<AbsenceRow>(`${ABSENCE_SELECT} WHERE a.to_date >= $1::date ORDER BY a.from_date, lower(u.name) LIMIT 60`, [day]);
  return rows.map(toAbsence);
}

export const isAwayOn = (absences: readonly StaffAbsence[], staffUserId: string, day: string) =>
  absences.find((a) => a.staffUserId === staffUserId && a.fromDate <= day && a.toDate >= day) ?? null;

/** One day at the office, worked out: who is at the desk, who is away, what is left uncovered, who has a shift but is away. */
export type OfficeDay = { shifts: Shift[]; away: StaffAbsence[]; gaps: Span[]; clashes: Shift[] };

export function officeDay(day: string, shifts: readonly Shift[], absences: readonly StaffAbsence[]): OfficeDay {
  const onDay = shifts.filter((s) => s.onDate === day);
  const away = absences.filter((a) => a.fromDate <= day && a.toDate >= day);
  const clashes = onDay.filter((s) => away.some((a) => a.staffUserId === s.staffUserId));
  const present = onDay.filter((s) => !clashes.includes(s));
  return {
    shifts: onDay,
    away,
    gaps: receptionGaps(day, present.map((s) => ({ from: s.startsAt, to: s.endsAt }))),
    clashes,
  };
}

// ------------------------------------------------------------------ writes

export async function saveShift(
  input: { staffUserId: string; onDate: string; startsAt: string; endsAt: string; note: string | null },
  actor: StaffUser
): Promise<void> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO staff_shifts (staff_user_id, on_date, starts_at, ends_at, note, created_by)
     VALUES ($1, $2::date, $3::time, $4::time, $5, $6)
     ON CONFLICT (staff_user_id, on_date)
     DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, note = EXCLUDED.note,
                   updated_at = timezone('utc', now())
     RETURNING id`,
    [input.staffUserId, input.onDate, input.startsAt, input.endsAt, input.note, actor.id]
  );
  await logActivity({ actor, entity: 'rota', entityId: row?.id ?? null, action: 'shift_saved', detail: { onDate: input.onDate } });
}

export async function removeShift(staffUserId: string, onDate: string, actor: StaffUser): Promise<void> {
  const row = await queryFirst<{ id: string }>(
    `DELETE FROM staff_shifts WHERE staff_user_id = $1 AND on_date = $2::date RETURNING id`,
    [staffUserId, onDate]
  );
  if (row) await logActivity({ actor, entity: 'rota', entityId: row.id, action: 'shift_removed', detail: { onDate } });
}

/**
 * The week before, copied into this one: the rota repeats more than it
 * changes. A day someone already has a shift keeps it; a day they are away
 * gets none; a colleague whose account is closed is left out.
 */
export async function copyShiftsFromWeekBefore(monday: string, actor: StaffUser): Promise<number> {
  const rows = await query<{ id: string }>(
    `INSERT INTO staff_shifts (staff_user_id, on_date, starts_at, ends_at, note, created_by)
     SELECT s.staff_user_id, s.on_date + 7, s.starts_at, s.ends_at, s.note, $2
       FROM staff_shifts s JOIN staff_users u ON u.id = s.staff_user_id AND u.is_active
      WHERE s.on_date BETWEEN $1::date - 7 AND $1::date - 1
        AND NOT EXISTS (SELECT 1 FROM staff_absences a
                         WHERE a.staff_user_id = s.staff_user_id
                           AND s.on_date + 7 BETWEEN a.from_date AND a.to_date)
     ON CONFLICT (staff_user_id, on_date) DO NOTHING
     RETURNING id`,
    [monday, actor.id]
  );
  if (rows.length) await logActivity({ actor, entity: 'rota', entityId: null, action: 'shifts_copied', detail: { monday, count: rows.length } });
  return rows.length;
}

export async function saveAbsence(
  input: { id: string | null; staffUserId: string; fromDate: string; toDate: string; reason: AbsenceReason; note: string | null },
  actor: StaffUser
): Promise<void> {
  const row = input.id
    ? await queryFirst<{ id: string }>(
        `UPDATE staff_absences SET staff_user_id = $2, from_date = $3::date, to_date = $4::date, reason = $5, note = $6,
                updated_at = timezone('utc', now())
          WHERE id = $1 RETURNING id`,
        [input.id, input.staffUserId, input.fromDate, input.toDate, input.reason, input.note]
      )
    : await queryFirst<{ id: string }>(
        `INSERT INTO staff_absences (staff_user_id, from_date, to_date, reason, note, created_by)
         VALUES ($1, $2::date, $3::date, $4, $5, $6) RETURNING id`,
        [input.staffUserId, input.fromDate, input.toDate, input.reason, input.note, actor.id]
      );
  if (!row) throw new Error('The absence was not saved');
  // The reason stays out of Activity, which the whole team reads.
  await logActivity({ actor, entity: 'rota', entityId: row.id, action: 'absence_saved' });
}

export async function deleteAbsence(id: string, actor: StaffUser): Promise<void> {
  const row = await queryFirst<{ id: string }>(`DELETE FROM staff_absences WHERE id = $1 RETURNING id`, [id]);
  if (row) await logActivity({ actor, entity: 'rota', entityId: row.id, action: 'absence_deleted' });
}
