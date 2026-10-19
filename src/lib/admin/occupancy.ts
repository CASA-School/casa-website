import 'server-only';

import { query } from './db';
import type { Bilingual } from './i18n';

/**
 * The CASA flats' occupancy (Rahman, 2026-10-19: "a similar interface [to the Raumplan] for CASA WGs,
 * who is in which room … days for 4 weeks in one go"): each flat with its rooms, the learners staying
 * in them, and the rooms held for a group — for the weeks asked for. Read beside the stays list
 * (`accommodation.ts`), which is where a stay is placed.
 */

export type OccupancyRoom = { id: string; name: string; type: Bilingual | null; beds: number | null };
export type OccupancyFlat = { id: string; name: string; address: string | null; rooms: OccupancyRoom[] };

export type OccupancyStay = {
  id: string;
  flatId: string;
  roomId: string | null;
  bookingId: string;
  bookingNumber: string | null;
  personId: string;
  name: string;
  from: string;
  to: string;
  course: string | null;
  email: string | null;
  phone: string | null;
  departureConfirmed: boolean;
};

export type OccupancyHold = { id: string; flatId: string; roomId: string | null; from: string; to: string; groupId: string | null; groupName: string | null; people: number | null };

export async function flatOccupancy(from: string, to: string): Promise<{ flats: OccupancyFlat[]; stays: OccupancyStay[]; holds: OccupancyHold[] }> {
  const [rooms, stays, holds] = await Promise.all([
    query<{ flat_id: string; flat: string; address: string | null; room_id: string | null; room: string | null; type_de: string | null; type_en: string | null; beds: number | null }>(
      `SELECT a.id AS flat_id, a.name AS flat, a.address, r.id AS room_id, r.name AS room, t.name_de AS type_de, t.name_en AS type_en, r.beds
         FROM accommodations a
         LEFT JOIN accommodation_rooms r ON r.accommodation_id = a.id
              AND (r.is_active OR EXISTS (SELECT 1 FROM booking_stays s WHERE s.room_id = r.id AND NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date))
         LEFT JOIN accommodation_room_types t ON t.code = r.room_type_code
        WHERE a.kind = 'casa_flat'
          AND (a.is_active OR EXISTS (SELECT 1 FROM booking_stays s WHERE s.accommodation_id = a.id AND NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date))
        ORDER BY a.name, r.name NULLS LAST`,
      [from, to]
    ),
    query<{
      id: string;
      flat_id: string;
      room_id: string | null;
      booking_id: string;
      number: string | null;
      person_id: string;
      name: string;
      starts_on: string;
      ends_on: string;
      course: string | null;
      email: string | null;
      phone: string | null;
      departure_confirmed: boolean;
    }>(
      `SELECT s.id, s.accommodation_id AS flat_id, s.room_id, b.id AS booking_id, b.number, p.id AS person_id,
              concat_ws(' ', p.first_name, p.last_name) AS name,
              to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on,
              coalesce(nullif(trim(ct.name_de), ''), ct.name) AS course,
              (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
              (SELECT ph.number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at LIMIT 1) AS phone,
              coalesce(s.departure_confirmed, false) AS departure_confirmed
         FROM booking_stays s
         JOIN accommodations a ON a.id = s.accommodation_id AND a.kind = 'casa_flat'
         JOIN bookings b ON b.id = s.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
         JOIN people p ON p.id = b.person_id AND p.deleted_at IS NULL
         LEFT JOIN course_types ct ON ct.id = b.course_type_id
        WHERE NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date
        ORDER BY s.starts_on, p.last_name`,
      [from, to]
    ),
    query<{ id: string; flat_id: string; room_id: string | null; starts_on: string; ends_on: string; group_id: string | null; group_name: string | null; people: number | null }>(
      `SELECT r.id, r.accommodation_id AS flat_id, r.room_id, to_char(r.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(r.ends_on, 'YYYY-MM-DD') AS ends_on,
              g.id AS group_id, g.name AS group_name, coalesce(r.max_people, r.min_people) AS people
         FROM accommodation_reservations r
         JOIN accommodations a ON a.id = r.accommodation_id AND a.kind = 'casa_flat'
         LEFT JOIN group_visits g ON g.id = r.group_visit_id
        WHERE r.starts_on <= $2::date AND r.ends_on >= $1::date
        ORDER BY r.starts_on`,
      [from, to]
    ),
  ]);

  const flats = new Map<string, OccupancyFlat>();
  for (const r of rooms) {
    const flat = flats.get(r.flat_id) ?? { id: r.flat_id, name: r.flat, address: r.address, rooms: [] };
    if (r.room_id) {
      flat.rooms.push({
        id: r.room_id,
        name: r.room ?? '—',
        type: r.type_de || r.type_en ? { de: r.type_de ?? r.type_en ?? '', en: r.type_en ?? r.type_de ?? '' } : null,
        beds: r.beds,
      });
    }
    flats.set(r.flat_id, flat);
  }
  // A stay extended — SchoolMan writes the next period as a stay of its own — is one bar: the same
  // learner in the same room, the next part starting within two days of the last one's end.
  const joined: OccupancyStay[] = [];
  const parts = stays
    .map((s) => ({
      id: s.id,
      flatId: s.flat_id,
      roomId: s.room_id,
      bookingId: s.booking_id,
      bookingNumber: s.number,
      personId: s.person_id,
      name: s.name,
      from: s.starts_on,
      to: s.ends_on,
      course: s.course,
      email: s.email,
      phone: s.phone,
      departureConfirmed: s.departure_confirmed,
    }))
    .sort((a, b) => `${a.personId}${a.flatId}${a.roomId ?? ''}${a.from}`.localeCompare(`${b.personId}${b.flatId}${b.roomId ?? ''}${b.from}`));
  for (const part of parts) {
    const prev = joined.at(-1);
    const gap = prev ? (Date.parse(`${part.from}T12:00:00Z`) - Date.parse(`${prev.to}T12:00:00Z`)) / 86_400_000 : Infinity;
    if (prev && prev.personId === part.personId && prev.flatId === part.flatId && prev.roomId === part.roomId && gap <= 2) {
      if (part.to > prev.to) {
        prev.to = part.to;
        prev.departureConfirmed = part.departureConfirmed;
      }
    } else joined.push({ ...part });
  }
  return {
    flats: [...flats.values()],
    stays: joined.sort((a, b) => a.from.localeCompare(b.from)),
    holds: holds.map((h) => ({ id: h.id, flatId: h.flat_id, roomId: h.room_id, from: h.starts_on, to: h.ends_on, groupId: h.group_id, groupName: h.group_name, people: h.people })),
  };
}
