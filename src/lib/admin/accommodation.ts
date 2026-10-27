import 'server-only';

import {
  roomLabel,
  type AccommodationKind,
  type MemberRole,
  type PlaceView,
  type ReservationAccepts,
  type ReservationPurpose,
  type StayView,
} from './accommodation-labels';
import { logActivity } from './activity';
import type { StaffUser } from './auth';
import type { Session } from './day-plan-labels';
import { query, queryFirst, withTransaction } from './db';
import { pick, type Bilingual, type WsLang } from './i18n';

/**
 * Accommodation (2026-10-18, migration 0060; docs/ADMIN_WORKSPACE.md §Accommodation): the places learners
 * stay — host families, CASA's flats, others — with the family who lives there (name and role only), the
 * rooms, the beds held for a group visit, and the stays at them (`booking_stays.accommodation_id`). The
 * stays list is the accommodation colleague's work list: who arrives, who is there, who leaves, who stays
 * on after the course, and who still has no place. Places from SchoolMan keep its number
 * (`filemaker_id`), which no screen shows.
 *
 * Rights: module `accommodation` — `view` reads, `edit` creates, changes and places a stay, `full` deletes.
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });
const GONE = refuse('Diese Unterkunft gibt es nicht mehr.', 'This place no longer exists.');

/** A stay that counts: not called off, its booking not cancelled or deleted, its learner not deleted. */
const LIVE_STAY = (s: string) => `NOT ${s}.cancelled AND EXISTS (
  SELECT 1 FROM bookings sb JOIN people sp ON sp.id = sb.person_id
   WHERE sb.id = ${s}.booking_id AND sb.deleted_at IS NULL AND sb.status <> 'cancelled' AND sp.deleted_at IS NULL)`;

const VIEWS: Record<PlaceView, string> = {
  all: 'true',
  host_family: `a.kind = 'host_family' AND a.is_active`,
  casa_flat: `a.kind = 'casa_flat' AND a.is_active`,
  other: `a.kind = 'other' AND a.is_active`,
  inactive: 'NOT a.is_active',
};

/** „28199 Bremen" from an address: its last line. */
const town = (address: string | null) =>
  address
    ?.split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .at(-1) ?? null;

// ----------------------------------------------------------------- the places

export type PlaceListItem = {
  id: string;
  name: string;
  kind: AccommodationKind;
  isActive: boolean;
  contactName: string | null;
  town: string | null;
  rooms: number;
  /** Learners staying there today. */
  staying: number;
  /** The next arrival, when one is booked. */
  nextArrival: Date | null;
};

const SEARCH = `(a.name ILIKE $1 OR a.contact_name ILIKE $1 OR a.address ILIKE $1 OR EXISTS (
  SELECT 1 FROM accommodation_members m WHERE m.accommodation_id = a.id AND concat_ws(' ', m.first_name, m.last_name) ILIKE $1))`;

export async function listPlaces({ view, search, limit, offset }: { view: PlaceView; search?: string; limit: number; offset: number }) {
  const params: unknown[] = [];
  let where = `WHERE ${VIEWS[view]}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND ${SEARCH}`;
  }
  const total = await queryFirst<{ n: string }>(`SELECT count(*) AS n FROM accommodations a ${where}`, params);
  const rows = await query<{
    id: string;
    name: string;
    kind: AccommodationKind;
    is_active: boolean;
    contact_name: string | null;
    address: string | null;
    rooms: string;
    staying: string;
    next_arrival: Date | null;
  }>(
    `SELECT a.id, a.name, a.kind, a.is_active, a.contact_name, a.address,
            (SELECT count(*) FROM accommodation_rooms r WHERE r.accommodation_id = a.id AND r.is_active) AS rooms,
            (SELECT count(*) FROM booking_stays s WHERE s.accommodation_id = a.id AND s.starts_on <= current_date AND s.ends_on >= current_date AND ${LIVE_STAY('s')}) AS staying,
            (SELECT min(s.starts_on) FROM booking_stays s WHERE s.accommodation_id = a.id AND s.starts_on > current_date AND ${LIVE_STAY('s')}) AS next_arrival
       FROM accommodations a
       ${where}
      ORDER BY a.is_active DESC, a.kind = 'casa_flat' DESC, lower(a.name), a.id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(total?.n ?? 0),
    items: rows.map(
      (r): PlaceListItem => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        isActive: r.is_active,
        contactName: r.contact_name,
        town: town(r.address),
        rooms: Number(r.rooms),
        staying: Number(r.staying),
        nextArrival: r.next_arrival,
      })
    ),
  };
}

export async function placeCounts(): Promise<Record<PlaceView, number>> {
  const row = await queryFirst<Record<PlaceView, string>>(
    `SELECT ${(Object.keys(VIEWS) as PlaceView[]).map((v) => `count(*) FILTER (WHERE ${VIEWS[v]}) AS "${v}"`).join(', ')} FROM accommodations a`
  );
  const out = {} as Record<PlaceView, number>;
  for (const v of Object.keys(VIEWS) as PlaceView[]) out[v] = Number(row?.[v] ?? 0);
  return out;
}

// -------------------------------------------------------------- one place

export type PlaceDetail = {
  id: string;
  name: string;
  kind: AccommodationKind;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  smoker: boolean | null;
  /** Whether pets live there (0095); `pets` says which. */
  hasPets: boolean | null;
  pets: string | null;
  washingMachine: boolean | null;
  rating: number | null;
  /** The Wohnungsgeber, as on the Wohnungsgeberbestätigung: name and address, a line each (0095). */
  landlord: string | null;
  /** What the host offers (0095): vocabulary codes, and their names in the vocabulary's order. */
  offers: Record<OfferKind, { codes: string[]; names: Bilingual[] }>;
  isActive: boolean;
  note: string | null;
  fromSchoolMan: boolean;
  createdAt: Date;
};

/** What a host offers: kinds of accommodation, meals, kinds of room (0095) — each a vocabulary's codes. */
export type OfferKind = 'types' | 'catering' | 'rooms';
const OFFER_VOCABULARY: Record<OfferKind, { table: string; column: string }> = {
  types: { table: 'accommodation_types', column: 'offered_types' },
  catering: { table: 'catering_options', column: 'offered_catering' },
  rooms: { table: 'accommodation_room_types', column: 'offered_room_types' },
};
const offerNames = (kind: OfferKind) =>
  `(SELECT coalesce(json_agg(json_build_object('code', v.code, 'de', v.name_de, 'en', v.name_en) ORDER BY v.position, v.code), '[]')
      FROM ${OFFER_VOCABULARY[kind].table} v WHERE v.code = ANY(a.${OFFER_VOCABULARY[kind].column})) AS offers_${kind}`;
type OfferRow = { code: string; de: string | null; en: string | null }[];
const toOffer = (rows: OfferRow) => ({ codes: rows.map((r) => r.code), names: rows.map((r) => ({ de: r.de ?? r.en ?? r.code, en: r.en ?? r.de ?? r.code })) });

export async function getPlace(id: string): Promise<PlaceDetail | null> {
  const r = await queryFirst<{
    id: string;
    name: string;
    kind: AccommodationKind;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    description_de: string | null;
    description_en: string | null;
    smoker: boolean | null;
    has_pets: boolean | null;
    pets: string | null;
    washing_machine: boolean | null;
    rating: number | null;
    landlord: string | null;
    offers_types: OfferRow;
    offers_catering: OfferRow;
    offers_rooms: OfferRow;
    is_active: boolean;
    note: string | null;
    from_schoolman: boolean;
    created_at: Date;
  }>(
    `SELECT a.id, a.name, a.kind, a.contact_name, a.email, a.phone, a.address, a.description_de, a.description_en, a.smoker, a.has_pets, a.pets, a.washing_machine,
            a.rating, a.landlord, ${offerNames('types')}, ${offerNames('catering')}, ${offerNames('rooms')}, a.is_active, a.note,
            a.filemaker_id IS NOT NULL AS from_schoolman, a.created_at
       FROM accommodations a WHERE a.id = $1`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    descriptionDe: r.description_de,
    descriptionEn: r.description_en,
    smoker: r.smoker,
    hasPets: r.has_pets,
    pets: r.pets,
    washingMachine: r.washing_machine,
    rating: r.rating,
    landlord: r.landlord,
    offers: { types: toOffer(r.offers_types), catering: toOffer(r.offers_catering), rooms: toOffer(r.offers_rooms) },
    isActive: r.is_active,
    note: r.note,
    fromSchoolMan: r.from_schoolman,
    createdAt: r.created_at,
  };
}

/** The choices of what a host offers, for the place's form: each vocabulary in its order. */
export async function offerChoices(): Promise<Record<OfferKind, { code: string; name: Bilingual }[]>> {
  const read = async (kind: OfferKind) =>
    (await query<{ code: string; name_de: string | null; name_en: string | null }>(`SELECT code, name_de, name_en FROM ${OFFER_VOCABULARY[kind].table} ORDER BY position, code`)).map(
      (r) => ({ code: r.code, name: { de: r.name_de ?? r.name_en ?? r.code, en: r.name_en ?? r.name_de ?? r.code } })
    );
  const [types, catering, rooms] = await Promise.all([read('types'), read('catering'), read('rooms')]);
  return { types, catering, rooms };
}

export type PlaceMember = { id: string; firstName: string | null; lastName: string | null; name: string; role: MemberRole };

const ROLE_ORDER = `array_position(ARRAY['mother', 'father', 'grandmother', 'grandfather', 'daughter', 'son', 'relative', 'friend', 'other'], role)`;

export async function placeMembers(id: string): Promise<PlaceMember[]> {
  const rows = await query<{ id: string; first_name: string | null; last_name: string | null; role: MemberRole }>(
    `SELECT id, first_name, last_name, role FROM accommodation_members WHERE accommodation_id = $1 ORDER BY ${ROLE_ORDER}, lower(coalesce(first_name, last_name)), id`,
    [id]
  );
  return rows.map((r) => ({ id: r.id, firstName: r.first_name, lastName: r.last_name, name: [r.first_name, r.last_name].filter(Boolean).join(' '), role: r.role }));
}

export type PlaceRoom = {
  id: string;
  name: string | null;
  /** Its number in the place (0095): „Zimmernummer in der Wohngemeinschaft". */
  number: number | null;
  roomTypeCode: string | null;
  roomType: Bilingual | null;
  beds: number | null;
  note: string | null;
  isActive: boolean;
  /** Who stays in it today, and until when. */
  occupants: { name: string; until: Date }[];
};

export async function placeRooms(id: string): Promise<PlaceRoom[]> {
  const rows = await query<{
    id: string;
    name: string | null;
    number: number | null;
    room_type_code: string | null;
    type_de: string | null;
    type_en: string | null;
    beds: number | null;
    note: string | null;
    is_active: boolean;
    occupants: { name: string; until: string }[] | null;
  }>(
    `SELECT r.id, r.name, r.number, r.room_type_code, t.name_de AS type_de, t.name_en AS type_en, r.beds, r.note, r.is_active,
            (SELECT json_agg(json_build_object('name', btrim(p.first_name || ' ' || coalesce(p.last_name, '')), 'until', s.ends_on) ORDER BY s.ends_on)
               FROM booking_stays s JOIN bookings b ON b.id = s.booking_id JOIN people p ON p.id = b.person_id
              WHERE s.room_id = r.id AND s.starts_on <= current_date AND s.ends_on >= current_date AND ${LIVE_STAY('s')}) AS occupants
       FROM accommodation_rooms r LEFT JOIN accommodation_room_types t ON t.code = r.room_type_code
      WHERE r.accommodation_id = $1
      ORDER BY r.is_active DESC, r.number NULLS LAST, lower(coalesce(r.name, '')), r.id`,
    [id]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    number: r.number,
    roomTypeCode: r.room_type_code,
    roomType: r.type_de || r.type_en ? { de: r.type_de ?? r.type_en ?? '', en: r.type_en ?? r.type_de ?? '' } : null,
    beds: r.beds,
    note: r.note,
    isActive: r.is_active,
    occupants: (r.occupants ?? []).map((o) => ({ name: o.name, until: new Date(`${o.until}T12:00:00Z`) })),
  }));
}

export type PlaceStay = {
  stayId: string;
  bookingId: string;
  bookingNumber: string;
  personId: string;
  personName: string;
  from: string;
  to: string;
  roomName: string | null;
};

/** How many earlier stays are loaded: the tab shows today's and the coming ones, the panel these (2026-10-20). */
const EARLIER_STAYS_SHOWN = 1000;

/** The stays at a place: today's and the coming ones by arrival, then the latest earlier ones. */
export async function placeStays(id: string): Promise<{ current: PlaceStay[]; earlier: PlaceStay[]; earlierTotal: number }> {
  const select = `SELECT s.id AS stay_id, b.id AS booking_id, b.number, p.id AS person_id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
                         to_char(s.starts_on, 'YYYY-MM-DD') AS from_day, to_char(s.ends_on, 'YYYY-MM-DD') AS to_day, coalesce(r.name, s.room) AS room_name
                    FROM booking_stays s JOIN bookings b ON b.id = s.booking_id JOIN people p ON p.id = b.person_id
                    LEFT JOIN accommodation_rooms r ON r.id = s.room_id
                   WHERE s.accommodation_id = $1 AND ${LIVE_STAY('s')}`;
  type Row = { stay_id: string; booking_id: string; number: string; person_id: string; person_name: string; from_day: string; to_day: string; room_name: string | null };
  const toStay = (r: Row): PlaceStay => ({
    stayId: r.stay_id,
    bookingId: r.booking_id,
    bookingNumber: r.number,
    personId: r.person_id,
    personName: r.person_name,
    from: r.from_day,
    to: r.to_day,
    roomName: r.room_name,
  });
  const [current, earlier, total] = await Promise.all([
    query<Row>(`${select} AND s.ends_on >= current_date ORDER BY s.starts_on, person_name`, [id]),
    query<Row>(`${select} AND s.ends_on < current_date ORDER BY s.ends_on DESC, person_name LIMIT ${EARLIER_STAYS_SHOWN}`, [id]),
    queryFirst<{ n: string }>(`SELECT count(*) AS n FROM booking_stays s WHERE s.accommodation_id = $1 AND s.ends_on < current_date AND ${LIVE_STAY('s')}`, [id]),
  ]);
  return { current: current.map(toStay), earlier: earlier.map(toStay), earlierTotal: Number(total?.n ?? 0) };
}

export type Reservation = {
  id: string;
  placeId: string;
  placeName: string;
  /** For a group visit, or for the learners of a course term and its part of the day (0095). */
  purpose: ReservationPurpose;
  courseSession: Session | null;
  /** Whom the host takes for these beds. */
  accepts: ReservationAccepts | null;
  groupId: string | null;
  groupName: string | null;
  from: string;
  to: string;
  minPeople: number | null;
  maxPeople: number | null;
  roomName: string | null;
  note: string | null;
};

const RESERVATIONS = `SELECT v.id, v.accommodation_id, a.name AS place_name, v.purpose, v.course_session, v.accepts, v.group_visit_id, g.name AS group_name,
         to_char(v.starts_on, 'YYYY-MM-DD') AS from_day, to_char(v.ends_on, 'YYYY-MM-DD') AS to_day, v.min_people, v.max_people, r.name AS room_name, v.note
    FROM accommodation_reservations v
    JOIN accommodations a ON a.id = v.accommodation_id
    LEFT JOIN group_visits g ON g.id = v.group_visit_id
    LEFT JOIN accommodation_rooms r ON r.id = v.room_id`;

type ReservationRow = {
  id: string;
  accommodation_id: string;
  place_name: string;
  purpose: ReservationPurpose;
  course_session: Session | null;
  accepts: ReservationAccepts | null;
  group_visit_id: string | null;
  group_name: string | null;
  from_day: string;
  to_day: string;
  min_people: number | null;
  max_people: number | null;
  room_name: string | null;
  note: string | null;
};
const toReservation = (r: ReservationRow): Reservation => ({
  id: r.id,
  placeId: r.accommodation_id,
  placeName: r.place_name,
  purpose: r.purpose,
  courseSession: r.course_session,
  accepts: r.accepts,
  groupId: r.group_visit_id,
  groupName: r.group_name,
  from: r.from_day,
  to: r.to_day,
  minPeople: r.min_people,
  maxPeople: r.max_people,
  roomName: r.room_name,
  note: r.note,
});

/** The beds held at a place — for groups and for course terms — the latest first. */
export async function placeReservations(id: string): Promise<Reservation[]> {
  return (await query<ReservationRow>(`${RESERVATIONS} WHERE v.accommodation_id = $1 ORDER BY v.starts_on DESC, v.id`, [id])).map(toReservation);
}

/** The beds held for a group visit, by place. */
export async function groupReservations(groupId: string): Promise<Reservation[]> {
  return (await query<ReservationRow>(`${RESERVATIONS} WHERE v.group_visit_id = $1 ORDER BY lower(a.name), v.starts_on, v.id`, [groupId])).map(toReservation);
}

// --------------------------------------------------------------- the stays

export type StayListItem = {
  stayId: string;
  bookingId: string;
  bookingNumber: string;
  personId: string;
  personName: string;
  from: string;
  to: string;
  /** The last day of the booking's course, to see who stays on after it. */
  courseEnd: string | null;
  typeName: Bilingual | null;
  placeId: string | null;
  placeName: string | null;
  roomId: string | null;
  roomName: string | null;
};

const STAY_VIEWS_SQL: Record<StayView, string> = {
  arriving: `s.starts_on BETWEEN current_date AND current_date + 14`,
  now: `s.starts_on <= current_date AND s.ends_on >= current_date`,
  leaving: `s.ends_on BETWEEN current_date AND current_date + 14`,
  // More than a weekend beyond the course's last day.
  after: `s.ends_on >= current_date AND s.ends_on > (SELECT max(bd.end_date) FROM booking_days bd WHERE bd.booking_id = s.booking_id) + 2`,
  unplaced: `s.accommodation_id IS NULL AND s.ends_on >= current_date`,
};

const STAY_ORDER: Record<StayView, string> = {
  arriving: 's.starts_on, person_name',
  now: 'lower(coalesce(a.name, s.place, \'\')), person_name',
  leaving: 's.ends_on, person_name',
  after: 's.ends_on, person_name',
  unplaced: 's.starts_on, person_name',
};

/** CASA's flats or host families: a placed stay by its place, an unplaced one by the kind it asks for. */
const KIND_SQL = `coalesce(a.kind, CASE WHEN s.accommodation_type_code = 'casa_flat' THEN 'casa_flat' ELSE 'host_family' END)`;

export async function listStays({ view, kind, search }: { view: StayView; kind?: AccommodationKind; search?: string }): Promise<StayListItem[]> {
  const params: unknown[] = [];
  let where = `WHERE ${LIVE_STAY('s')} AND ${STAY_VIEWS_SQL[view]}`;
  if (kind) {
    params.push(kind);
    where += ` AND ${KIND_SQL} = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (concat_ws(' ', p.first_name, p.last_name) ILIKE $${params.length} OR b.number ILIKE $${params.length} OR a.name ILIKE $${params.length})`;
  }
  const rows = await query<{
    stay_id: string;
    booking_id: string;
    number: string;
    person_id: string;
    person_name: string;
    from_day: string;
    to_day: string;
    course_end: string | null;
    type_de: string | null;
    type_en: string | null;
    place_id: string | null;
    place_name: string | null;
    room_id: string | null;
    room_name: string | null;
  }>(
    `SELECT s.id AS stay_id, b.id AS booking_id, b.number, p.id AS person_id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
            to_char(s.starts_on, 'YYYY-MM-DD') AS from_day, to_char(s.ends_on, 'YYYY-MM-DD') AS to_day,
            (SELECT to_char(max(bd.end_date), 'YYYY-MM-DD') FROM booking_days bd WHERE bd.booking_id = b.id) AS course_end,
            t.name_de AS type_de, t.name_en AS type_en, a.id AS place_id, coalesce(a.name, s.place) AS place_name, s.room_id, coalesce(r.name, s.room) AS room_name
       FROM booking_stays s
       JOIN bookings b ON b.id = s.booking_id
       JOIN people p ON p.id = b.person_id
       LEFT JOIN accommodations a ON a.id = s.accommodation_id
       LEFT JOIN accommodation_rooms r ON r.id = s.room_id
       LEFT JOIN accommodation_types t ON t.code = s.accommodation_type_code
       ${where}
      ORDER BY ${STAY_ORDER[view]}
      LIMIT 300`,
    params
  );
  return rows.map((r) => ({
    stayId: r.stay_id,
    bookingId: r.booking_id,
    bookingNumber: r.number,
    personId: r.person_id,
    personName: r.person_name,
    from: r.from_day,
    to: r.to_day,
    courseEnd: r.course_end,
    typeName: r.type_de || r.type_en ? { de: r.type_de ?? r.type_en ?? '', en: r.type_en ?? r.type_de ?? '' } : null,
    placeId: r.place_id,
    placeName: r.place_name,
    roomId: r.room_id,
    roomName: r.room_name,
  }));
}

export async function stayCounts(): Promise<Record<StayView, number>> {
  const row = await queryFirst<Record<StayView, string>>(
    `SELECT ${(Object.keys(STAY_VIEWS_SQL) as StayView[]).map((v) => `count(*) FILTER (WHERE ${STAY_VIEWS_SQL[v]}) AS "${v}"`).join(', ')}
       FROM booking_stays s WHERE ${LIVE_STAY('s')}`
  );
  const out = {} as Record<StayView, number>;
  for (const v of Object.keys(STAY_VIEWS_SQL) as StayView[]) out[v] = Number(row?.[v] ?? 0);
  return out;
}

/** The places and their rooms a stay can be placed in: the active ones, CASA's flats first. */
export async function placementChoices(lang: WsLang): Promise<{ id: string; name: string; kind: AccommodationKind; rooms: { id: string; name: string }[] }[]> {
  const rows = await query<{
    id: string;
    name: string;
    kind: AccommodationKind;
    rooms: { id: string; name: string | null; number: number | null; type: string | null }[] | null;
  }>(
    `SELECT a.id, a.name, a.kind,
            (SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'number', r.number, 'type', t.name_de)
                    ORDER BY r.number NULLS LAST, lower(coalesce(r.name, '')), r.id)
               FROM accommodation_rooms r LEFT JOIN accommodation_room_types t ON t.code = r.room_type_code
              WHERE r.accommodation_id = a.id AND r.is_active) AS rooms
       FROM accommodations a WHERE a.is_active
      ORDER BY a.kind = 'casa_flat' DESC, lower(a.name), a.id`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    rooms: (r.rooms ?? []).map((room, i) => ({ id: room.id, name: roomLabel(lang, room) || room.type || pick(lang, { de: `Zimmer ${i + 1}`, en: `Room ${i + 1}` }) })),
  }));
}

// ------------------------------------------------------------------ writes

export type PlaceInput = {
  name: string;
  kind: AccommodationKind;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  smoker: boolean | null;
  hasPets: boolean | null;
  pets: string | null;
  washingMachine: boolean | null;
  landlord: string | null;
  offers: Record<OfferKind, string[]>;
  note: string | null;
};

const placeValues = (i: PlaceInput) => [
  i.name,
  i.kind,
  i.contactName,
  i.email,
  i.phone,
  i.address,
  i.descriptionDe,
  i.descriptionEn,
  i.smoker,
  i.pets,
  i.washingMachine,
  i.note,
  i.hasPets,
  i.landlord,
  i.offers.types,
  i.offers.catering,
  i.offers.rooms,
];

/** The codes of a vocabulary among those asked for, in its order: nothing else is ever stored. */
const offered = (kind: OfferKind, param: number) =>
  `ARRAY(SELECT v.code FROM ${OFFER_VOCABULARY[kind].table} v WHERE v.code = ANY($${param}::text[]) ORDER BY v.position, v.code)`;

export async function createPlace(input: PlaceInput, actor: StaffUser): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO accommodations (name, kind, contact_name, email, phone, address, description_de, description_en, smoker, pets, washing_machine, note, has_pets, landlord,
                                 offered_types, offered_catering, offered_room_types, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ${offered('types', 15)}, ${offered('catering', 16)}, ${offered('rooms', 17)}, $18) RETURNING id`,
    [...placeValues(input), actor.id]
  );
  await logActivity({ actor, entity: 'accommodation', entityId: row!.id, action: 'accommodation_created' });
  return row!.id;
}

export async function updatePlace(id: string, input: PlaceInput, actor: StaffUser): Promise<Result> {
  const rows = await query<{ id: string }>(
    `UPDATE accommodations SET name = $2, kind = $3, contact_name = $4, email = $5, phone = $6, address = $7, description_de = $8, description_en = $9,
            smoker = $10, pets = $11, washing_machine = $12, note = $13, has_pets = $14, landlord = $15, offered_types = ${offered('types', 16)},
            offered_catering = ${offered('catering', 17)}, offered_room_types = ${offered('rooms', 18)}, updated_at = timezone('utc', now())
      WHERE id = $1 RETURNING id`,
    [id, ...placeValues(input)]
  );
  if (!rows.length) return GONE;
  await logActivity({ actor, entity: 'accommodation', entityId: id, action: 'accommodation_updated' });
  return { ok: true };
}

/** No longer used, or again: everything stays; it is listed under „Inaktiv". */
export async function setPlaceActive(id: string, active: boolean, actor: StaffUser): Promise<Result> {
  const rows = await query<{ id: string }>(`UPDATE accommodations SET is_active = $2, updated_at = timezone('utc', now()) WHERE id = $1 RETURNING id`, [id, active]);
  if (!rows.length) return GONE;
  await logActivity({ actor, entity: 'accommodation', entityId: id, action: active ? 'accommodation_reactivated' : 'accommodation_deactivated' });
  return { ok: true };
}

const HOLDS = `SELECT (SELECT count(*) FROM booking_stays s WHERE s.accommodation_id = a.id) + (SELECT count(*) FROM accommodation_reservations v WHERE v.accommodation_id = a.id) AS held,
                      a.filemaker_id IS NOT NULL AS from_schoolman
                 FROM accommodations a WHERE a.id = $1`;

/** Whether „Löschen" can be offered: no stay or reservation names it, and it did not come from SchoolMan. */
export async function placeDeletable(id: string): Promise<boolean> {
  const row = await queryFirst<{ held: string; from_schoolman: boolean }>(HOLDS, [id]);
  return Boolean(row) && Number(row!.held) === 0 && !row!.from_schoolman;
}

/** Gone, for a place entered by mistake; one learners stayed at is set inactive instead. Its family, rooms and notes go with it. */
export async function deletePlace(id: string, actor: StaffUser): Promise<Result> {
  const outcome = await withTransaction(async (client): Promise<Result & { name?: string }> => {
    const locked = await client.query<{ name: string }>(`SELECT name FROM accommodations WHERE id = $1 FOR UPDATE`, [id]);
    if (!locked.rows[0]) return GONE;
    const h = (await client.query<{ held: string; from_schoolman: boolean }>(HOLDS, [id])).rows[0];
    if (Number(h.held) > 0 || h.from_schoolman) {
      return refuse(
        'Hier haben schon Teilnehmende gewohnt, oder sie kommt aus SchoolMan — setz sie auf inaktiv, statt sie zu löschen.',
        'Learners have stayed here, or it comes from SchoolMan — set it inactive instead of deleting it.'
      );
    }
    await client.query(`DELETE FROM staff_notes WHERE entity = 'accommodation' AND entity_id = $1`, [id]);
    await client.query(`DELETE FROM accommodations WHERE id = $1`, [id]);
    return { ok: true, name: locked.rows[0].name };
  });
  if (!outcome.ok) return outcome;
  await logActivity({ actor, entity: 'accommodation', entityId: id, action: 'accommodation_deleted', detail: { name: outcome.name } });
  return { ok: true };
}

const placeExists = async (id: string) => Boolean(await queryFirst<{ id: string }>(`SELECT id FROM accommodations WHERE id = $1`, [id]));

export type RoomInput = { name: string | null; number: number | null; roomTypeCode: string | null; beds: number | null; note: string | null; isActive: boolean };

export async function saveRoom(placeId: string, roomId: string | null, input: RoomInput, actor: StaffUser): Promise<Result> {
  if (!(await placeExists(placeId))) return GONE;
  const values = [input.name, input.roomTypeCode, input.beds, input.note, input.isActive, input.number];
  if (roomId) {
    const rows = await query<{ id: string }>(
      `UPDATE accommodation_rooms SET name = $3, room_type_code = (SELECT code FROM accommodation_room_types WHERE code = $4), beds = $5, note = $6, is_active = $7,
              number = $8
        WHERE id = $1 AND accommodation_id = $2 RETURNING id`,
      [roomId, placeId, ...values]
    );
    if (!rows.length) return refuse('Dieses Zimmer gibt es nicht mehr.', 'This room no longer exists.');
  } else {
    await query(
      `INSERT INTO accommodation_rooms (accommodation_id, name, room_type_code, beds, note, is_active, number)
       VALUES ($1, $2, (SELECT code FROM accommodation_room_types WHERE code = $3), $4, $5, $6, $7)`,
      [placeId, ...values]
    );
  }
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: roomId ? 'accommodation_room_updated' : 'accommodation_room_added' });
  return { ok: true };
}

/** A room no stay names goes; one learners stayed in is set inactive instead. */
export async function removeRoom(placeId: string, roomId: string, actor: StaffUser): Promise<Result> {
  const used = await queryFirst<{ n: string }>(
    `SELECT (SELECT count(*) FROM booking_stays WHERE room_id = $1) + (SELECT count(*) FROM accommodation_reservations WHERE room_id = $1) AS n`,
    [roomId]
  );
  if (Number(used?.n ?? 0) > 0) {
    return refuse('In diesem Zimmer haben schon Teilnehmende gewohnt — setz es auf inaktiv.', 'Learners have stayed in this room — set it inactive.');
  }
  const rows = await query<{ id: string }>(`DELETE FROM accommodation_rooms WHERE id = $1 AND accommodation_id = $2 RETURNING id`, [roomId, placeId]);
  if (rows.length) await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'accommodation_room_removed' });
  return { ok: true };
}

export type MemberInput = { firstName: string | null; lastName: string | null; role: MemberRole };

export async function saveMember(placeId: string, memberId: string | null, input: MemberInput, actor: StaffUser): Promise<Result> {
  if (!(await placeExists(placeId))) return GONE;
  if (memberId) {
    const rows = await query<{ id: string }>(
      `UPDATE accommodation_members SET first_name = $3, last_name = $4, role = $5 WHERE id = $1 AND accommodation_id = $2 RETURNING id`,
      [memberId, placeId, input.firstName, input.lastName, input.role]
    );
    if (!rows.length) return refuse('Diese Person gibt es hier nicht mehr.', 'This person is no longer here.');
  } else {
    await query(`INSERT INTO accommodation_members (accommodation_id, first_name, last_name, role) VALUES ($1, $2, $3, $4)`, [
      placeId,
      input.firstName,
      input.lastName,
      input.role,
    ]);
  }
  // The trail says that the family changed, never who.
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: memberId ? 'accommodation_member_updated' : 'accommodation_member_added' });
  return { ok: true };
}

export async function removeMember(placeId: string, memberId: string, actor: StaffUser): Promise<void> {
  const rows = await query<{ id: string }>(`DELETE FROM accommodation_members WHERE id = $1 AND accommodation_id = $2 RETURNING id`, [memberId, placeId]);
  if (rows.length) await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'accommodation_member_removed' });
}

/** A stay placed at a place and, when chosen, a room of it — or taken out of one. */
export async function placeStay(stayId: string, placeId: string | null, roomId: string | null, actor: StaffUser): Promise<Result> {
  if (placeId && !(await placeExists(placeId))) return GONE;
  if (roomId && placeId) {
    const room = await queryFirst<{ id: string }>(`SELECT id FROM accommodation_rooms WHERE id = $1 AND accommodation_id = $2`, [roomId, placeId]);
    if (!room) return refuse('Dieses Zimmer gehört nicht zu dieser Unterkunft.', 'That room is not at this place.');
  }
  const rows = await query<{ booking_id: string }>(
    `UPDATE booking_stays SET accommodation_id = $2, room_id = $3 WHERE id = $1 RETURNING booking_id`,
    [stayId, placeId, placeId ? roomId : null]
  );
  if (!rows.length) return refuse('Diesen Aufenthalt gibt es nicht mehr.', 'This stay no longer exists.');
  await logActivity({ actor, entity: 'booking', entityId: rows[0].booking_id, action: placeId ? 'stay_placed' : 'stay_unplaced', detail: { accommodation: placeId } });
  return { ok: true };
}

/** The kinds of room a room can be (single, double …), for the room form. */
export async function roomTypes(): Promise<{ code: string; name: Bilingual }[]> {
  const rows = await query<{ code: string; name_de: string; name_en: string }>(`SELECT code, name_de, name_en FROM accommodation_room_types ORDER BY filemaker_id NULLS LAST, code`);
  return rows.map((r) => ({ code: r.code, name: { de: r.name_de, en: r.name_en } }));
}

export type PlacePayout = { id: string; paidOn: string | null; amount: number; bookingId: string | null; bookingNumber: string | null; personName: string | null; note: string | null };

/** The rent paid to a place (0063, SchoolMan's `PaymentOut`), the latest first. */
export async function placePayouts(id: string): Promise<PlacePayout[]> {
  const rows = await query<{ id: string; paid_on: string | null; amount: string; booking_id: string | null; number: string | null; person_name: string | null; note: string | null }>(
    `SELECT p.id, to_char(p.paid_on, 'YYYY-MM-DD') AS paid_on, p.amount, b.id AS booking_id, b.number,
            btrim(pe.first_name || ' ' || coalesce(pe.last_name, '')) AS person_name, p.note
       FROM payouts p LEFT JOIN bookings b ON b.id = p.booking_id LEFT JOIN people pe ON pe.id = b.person_id
      WHERE p.accommodation_id = $1
      ORDER BY p.paid_on DESC NULLS LAST, p.id`,
    [id]
  );
  return rows.map((r) => ({ id: r.id, paidOn: r.paid_on, amount: Number(r.amount), bookingId: r.booking_id, bookingNumber: r.number, personName: r.person_name, note: r.note }));
}

