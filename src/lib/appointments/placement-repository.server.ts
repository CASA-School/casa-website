import 'server-only';

import { query, withTransaction } from '@/lib/admin/db';
import { APPOINTMENT_ZONE } from './schedule';
import { PLACEMENT_SEATS } from './placement-schedule';

/** Places taken per time from now on, keyed `YYYY-MM-DDTHH:MM` in Bremen time. */
export async function bookedPlacementSeats() {
  const rows = await query<{ slot: string; taken: number }>(
    `SELECT to_char(starts_at AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') AS slot, count(*)::int AS taken
       FROM placement_appointments
      WHERE status <> 'cancelled' AND starts_at > now()
      GROUP BY 1`,
    [APPOINTMENT_ZONE]
  );
  return new Map(rows.map((row) => [row.slot, row.taken]));
}

export type PlacementBooking = {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  locale: 'de' | 'en';
  note: string | null;
};

/**
 * Books one of the time's two places, or answers null when both are gone. The lock is per time,
 * so two learners pressing at once are counted one after the other.
 */
export async function bookPlacementSeat(startsAt: Date, booking: PlacementBooking) {
  return withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('placement:' || $1::text, 0))`, [startsAt.toISOString()]);
    const taken = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM placement_appointments WHERE starts_at = $1 AND status <> 'cancelled'`,
      [startsAt]
    );
    const seat = (taken.rows[0]?.n ?? 0) + 1;
    if (seat > PLACEMENT_SEATS) return null;
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO placement_appointments (starts_at, first_name, last_name, email, phone, locale, note, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'website') RETURNING id`,
      [startsAt, booking.firstName, booking.lastName, booking.email, booking.phone, booking.locale, booking.note]
    );
    return { id: inserted.rows[0].id, seat };
  });
}
