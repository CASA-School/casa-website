import 'server-only';

import { roomLabel, type ReservationPurpose } from './accommodation-labels';
import type { Session } from './day-plan-labels';
import { query } from './db';
import type { Bilingual, WsLang } from './i18n';

/**
 * The CASA flats' occupancy (Rahman, 2026-10-19: "a similar interface [to the Raumplan] for CASA WGs,
 * who is in which room … days for 4 weeks in one go"): each flat with its rooms, the learners staying
 * in them, and the rooms held for a group — for the weeks asked for. Read beside the stays list
 * (`accommodation.ts`), which is where a stay is placed.
 */

export type OccupancyRoom = { id: string; name: string; number: number | null; type: Bilingual | null; beds: number | null; active: boolean };
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
  /** The deposit (Kaution) charged on the booking, if any. */
  deposit: number | null;
};

export type OccupancyHold = {
  id: string;
  flatId: string;
  roomId: string | null;
  from: string;
  to: string;
  /** Held for a group, or for the learners of a course term and its part of the day (0095). */
  purpose: ReservationPurpose;
  courseSession: Session | null;
  groupId: string | null;
  groupName: string | null;
  people: number | null;
};

export async function flatOccupancy(from: string, to: string, lang: WsLang): Promise<{ flats: OccupancyFlat[]; stays: OccupancyStay[]; holds: OccupancyHold[] }> {
  const [rooms, stays, holds] = await Promise.all([
    query<{
      flat_id: string;
      flat: string;
      address: string | null;
      room_id: string | null;
      room: string | null;
      number: number | null;
      type_de: string | null;
      type_en: string | null;
      beds: number | null;
      active: boolean | null;
    }>(
      `SELECT a.id AS flat_id, a.name AS flat, a.address, r.id AS room_id, r.name AS room, r.number, t.name_de AS type_de, t.name_en AS type_en, r.beds, r.is_active AS active
         FROM accommodations a
         LEFT JOIN accommodation_rooms r ON r.accommodation_id = a.id
              AND (r.is_active OR EXISTS (SELECT 1 FROM booking_stays s WHERE s.room_id = r.id AND NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date))
         LEFT JOIN accommodation_room_types t ON t.code = r.room_type_code
        WHERE a.kind = 'casa_flat'
          AND (a.is_active OR EXISTS (SELECT 1 FROM booking_stays s WHERE s.accommodation_id = a.id AND NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date))
        ORDER BY a.name, r.number NULLS LAST, r.name NULLS LAST`,
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
      deposit: string | null;
    }>(
      `SELECT s.id, s.accommodation_id AS flat_id, s.room_id, b.id AS booking_id, b.number, p.id AS person_id,
              concat_ws(' ', p.first_name, p.last_name) AS name,
              to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on,
              coalesce(nullif(trim(ct.name_de), ''), ct.name) AS course,
              person_email(p.id) AS email,
              (SELECT ph.number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at LIMIT 1) AS phone,
              coalesce(s.departure_confirmed, false) AS departure_confirmed,
              (SELECT nullif(sum(c.amount), 0) FROM booking_charges c WHERE c.booking_id = b.id AND c.kind = 'deposit') AS deposit
         FROM booking_stays s
         JOIN accommodations a ON a.id = s.accommodation_id AND a.kind = 'casa_flat'
         JOIN bookings b ON b.id = s.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
         JOIN people p ON p.id = b.person_id AND p.deleted_at IS NULL
         LEFT JOIN course_types ct ON ct.id = b.course_type_id
        WHERE NOT s.cancelled AND s.starts_on <= $2::date AND s.ends_on >= $1::date
        ORDER BY s.starts_on, p.last_name`,
      [from, to]
    ),
    query<{
      id: string;
      flat_id: string;
      room_id: string | null;
      starts_on: string;
      ends_on: string;
      purpose: ReservationPurpose;
      course_session: Session | null;
      group_id: string | null;
      group_name: string | null;
      people: number | null;
    }>(
      `SELECT r.id, r.accommodation_id AS flat_id, r.room_id, to_char(r.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(r.ends_on, 'YYYY-MM-DD') AS ends_on,
              r.purpose, r.course_session, g.id AS group_id, g.name AS group_name, coalesce(r.max_people, r.min_people) AS people
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
        name: roomLabel(lang, { name: r.room, number: r.number }) ?? '—',
        number: r.number,
        type: r.type_de || r.type_en ? { de: r.type_de ?? r.type_en ?? '', en: r.type_en ?? r.type_de ?? '' } : null,
        beds: r.beds,
        active: r.active ?? true,
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
      deposit: s.deposit === null ? null : Number(s.deposit),
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
    holds: holds.map((h) => ({
      id: h.id,
      flatId: h.flat_id,
      roomId: h.room_id,
      from: h.starts_on,
      to: h.ends_on,
      purpose: h.purpose,
      courseSession: h.course_session,
      groupId: h.group_id,
      groupName: h.group_name,
      people: h.people,
    })),
  };
}

/**
 * Whether a room has a bed for a stay over its whole time: the most people in it on any night of that
 * time, the stay itself and the same learner's other stays left out, against its beds (one when unsaid).
 */
export async function roomHasBed(roomId: string, stayId: string, from: string, to: string): Promise<{ ok: boolean; beds: number }> {
  const [room, others] = await Promise.all([
    query<{ beds: number | null }>(`SELECT beds FROM accommodation_rooms WHERE id = $1`, [roomId]),
    query<{ starts_on: string; ends_on: string }>(
      `SELECT to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on
         FROM booking_stays s JOIN bookings b ON b.id = s.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
        WHERE s.room_id = $1 AND s.id <> $2 AND NOT s.cancelled AND s.starts_on < $4::date AND s.ends_on > $3::date
          AND b.person_id <> (SELECT b2.person_id FROM booking_stays s2 JOIN bookings b2 ON b2.id = s2.booking_id WHERE s2.id = $2)`,
      [roomId, stayId, from, to]
    ),
  ]);
  const beds = Math.max(1, room[0]?.beds ?? 1);
  // Each night from arrival to the night before departure: how many others sleep there.
  let most = 0;
  for (let night = from; night < to; night = new Date(Date.parse(`${night}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
    most = Math.max(most, others.filter((o) => o.starts_on <= night && o.ends_on > night).length);
    if (most >= beds) break;
  }
  return { ok: most < beds, beds };
}

export type PlaceableStay = { id: string; name: string; from: string; to: string; roomType: Bilingual | null; flatId: string | null };

/** The stays in a CASA flat still without a room — or without a flat — that a free bed can take. */
export async function placeableStays(from: string, to: string): Promise<PlaceableStay[]> {
  const rows = await query<{ id: string; name: string; starts_on: string; ends_on: string; type_de: string | null; type_en: string | null; flat_id: string | null }>(
    `SELECT s.id, concat_ws(' ', p.first_name, p.last_name) AS name, to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on,
            t.name_de AS type_de, t.name_en AS type_en, s.accommodation_id AS flat_id
       FROM booking_stays s
       JOIN bookings b ON b.id = s.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
       JOIN people p ON p.id = b.person_id AND p.deleted_at IS NULL
       LEFT JOIN accommodations a ON a.id = s.accommodation_id
       LEFT JOIN accommodation_room_types t ON t.code = s.room_type_code
      WHERE NOT s.cancelled AND s.room_id IS NULL AND s.ends_on >= $1::date AND s.starts_on <= $2::date
        AND (a.kind = 'casa_flat' OR (s.accommodation_id IS NULL AND s.accommodation_type_code = 'casa_flat'))
      ORDER BY s.starts_on, p.last_name`,
    [from, to]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    from: r.starts_on,
    to: r.ends_on,
    roomType: r.type_de || r.type_en ? { de: r.type_de ?? r.type_en ?? '', en: r.type_en ?? r.type_de ?? '' } : null,
    flatId: r.flat_id,
  }));
}

/** A stay's days, for checking a room has a bed for it. */
export async function stayDates(stayId: string): Promise<{ from: string; to: string } | null> {
  const rows = await query<{ starts_on: string; ends_on: string }>(
    `SELECT to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on FROM booking_stays WHERE id = $1 AND NOT cancelled`,
    [stayId]
  );
  return rows[0] ? { from: rows[0].starts_on, to: rows[0].ends_on } : null;
}
