import 'server-only';

import { query } from './db';
import type { Bilingual } from './i18n';

/**
 * What a registration needs besides the course — a room, a visa — and how far each has come (2026-10-31,
 * Rahman: „unterkunft should have an identifying color and even its own section and visum as well"). Read
 * from the bookings made from its lines: the stay booked and the place it was given, the letter for the
 * embassy sent.
 */

export type BookedStay = {
  bookingId: string;
  number: string;
  type: Bilingual | null;
  from: string | null;
  to: string | null;
  /** The host family or flat it was given, once given. */
  place: string | null;
};

export type VisaProgress = {
  /** The first booking made from the registration: its embassy letter is written from there. */
  bookingId: string | null;
  /** When the letter for the embassy went, if it did. */
  embassyLetterAt: Date | null;
};

const DAY = `'YYYY-MM-DD'`;

/** The stays of these bookings: what was booked, and where. */
export async function bookedStays(bookingIds: readonly string[]): Promise<BookedStay[]> {
  if (!bookingIds.length) return [];
  const rows = await query<{ id: string; number: string; de: string | null; en: string | null; from_day: string | null; to_day: string | null; place: string | null }>(
    `SELECT b.id, b.number, at.name_de AS de, at.name_en AS en,
            to_char(coalesce(s.starts_on, b.accommodation_from), ${DAY}) AS from_day, to_char(coalesce(s.ends_on, b.accommodation_to), ${DAY}) AS to_day,
            coalesce(a.name, nullif(btrim(s.place), '')) AS place
       FROM bookings b
       LEFT JOIN LATERAL (SELECT * FROM booking_stays x WHERE x.booking_id = b.id AND NOT coalesce(x.cancelled, false) ORDER BY x.starts_on LIMIT 1) s ON true
       LEFT JOIN accommodation_types at ON at.code = coalesce(s.accommodation_type_code, b.accommodation_type_code)
       LEFT JOIN accommodations a ON a.id = s.accommodation_id
      WHERE b.id = ANY($1::uuid[]) AND b.deleted_at IS NULL AND b.status <> 'cancelled'
        AND (s.id IS NOT NULL OR b.accommodation_type_code IS NOT NULL)
      ORDER BY from_day NULLS LAST`,
    [[...bookingIds]]
  );
  return rows.map((r) => ({
    bookingId: r.id,
    number: r.number,
    type: r.de || r.en ? { de: r.de ?? r.en ?? '', en: r.en ?? r.de ?? '' } : null,
    from: r.from_day,
    to: r.to_day,
    place: r.place,
  }));
}

/** Where a visa case stands: the booking its embassy letter belongs to, and whether that letter went. */
export async function visaProgress(bookingIds: readonly string[]): Promise<VisaProgress> {
  if (!bookingIds.length) return { bookingId: null, embassyLetterAt: null };
  const [row] = await query<{ sent_at: Date | null }>(
    `SELECT max(l.sent_at) AS sent_at FROM letters l
      WHERE l.kind = 'visa_letter'
        AND (l.booking_id = ANY($1::uuid[]) OR l.id IN (SELECT lb.letter_id FROM letter_bookings lb WHERE lb.booking_id = ANY($1::uuid[])))`,
    [[...bookingIds]]
  );
  return { bookingId: bookingIds[0], embassyLetterAt: row?.sent_at ?? null };
}
