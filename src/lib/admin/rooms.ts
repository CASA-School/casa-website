import { query, queryFirst } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';
import type { Bilingual, WsLang } from './i18n';

/**
 * Rooms and locations — setup, not daily work.
 *
 * Ported from FileMaker's `Classroom` / `LocationReference` and cleaned on the
 * way in (db/seeds/0002_locations_and_rooms.sql). A room has a `kind`, so a
 * course can only be planned into a classroom; a `capacity` for planning and a
 * `capacity_max` as the physical ceiling; and a `nickname`, the name staff
 * actually use.
 */

export type RoomKind = 'classroom' | 'office' | 'meeting' | 'other';

export type Location = {
  id: string;
  name: string;
  shortName: string;
  kind: 'site' | 'client' | 'online';
  isActive: boolean;
  roomCount: number;
};

export type Room = {
  id: string;
  locationId: string;
  locationName: string;
  locationKind: Location['kind'];
  name: string;
  shortName: string | null;
  nickname: string | null;
  floor: number | null;
  kind: RoomKind;
  capacity: number | null;
  capacityMax: number | null;
  isBookable: boolean;
  isActive: boolean;
  colour: string | null;
  zone: string | null;
  notes: string | null;
  /** Course numbers with a lesson day in it from today on. */
  coursesAhead: number;
};

/** Read with `pick(lang, ROOM_KIND_LABELS[kind])` (docs/ADMIN_I18N.md). */
export const ROOM_KIND_LABELS: Record<RoomKind, Bilingual> = {
  classroom: { de: 'Unterrichtsraum', en: 'Classroom' },
  office: { de: 'Büro', en: 'Office' },
  meeting: { de: 'Besprechungsraum', en: 'Meeting room' },
  other: { de: 'Sonstiges', en: 'Other' },
};

export function floorLabel(floor: number | null, lang: WsLang): string {
  if (floor === null) return '—';
  if (floor < 0) return lang === 'en' ? 'Cellar' : 'Keller';
  if (floor === 0) return lang === 'en' ? 'Ground floor' : 'Erdgeschoss';
  return lang === 'en' ? `${floor}. floor` : `${floor}. Etage`;
}

type RoomRow = {
  id: string;
  location_id: string;
  location_name: string;
  location_kind: Location['kind'];
  name: string;
  short_name: string | null;
  nickname: string | null;
  floor: number | null;
  kind: RoomKind;
  capacity: number | null;
  capacity_max: number | null;
  is_bookable: boolean;
  is_active: boolean;
  colour: string | null;
  zone: string | null;
  notes: string | null;
  courses_ahead: string;
};

const SELECT = `
  SELECT r.id, r.location_id, l.name AS location_name, l.kind AS location_kind,
         r.name, r.short_name, r.nickname, r.floor, r.kind::text AS kind,
         r.capacity, r.capacity_max, r.is_bookable, r.is_active, r.colour, r.zone, r.notes,
         (SELECT count(DISTINCT (d.course_id, d.group_index)) FROM course_days d
           WHERE d.room_id = r.id AND d.on_date >= current_date AND NOT d.cancelled AND d.course_id IS NOT NULL)
           AS courses_ahead
    FROM rooms r
    JOIN locations l ON l.id = r.location_id
`;

const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  locationId: r.location_id,
  locationName: r.location_name,
  locationKind: r.location_kind,
  name: r.name,
  shortName: r.short_name,
  nickname: r.nickname,
  floor: r.floor,
  kind: r.kind,
  capacity: r.capacity,
  capacityMax: r.capacity_max,
  isBookable: r.is_bookable,
  isActive: r.is_active,
  colour: r.colour,
  zone: r.zone,
  notes: r.notes,
  coursesAhead: Number(r.courses_ahead),
});

export async function listLocations(): Promise<Location[]> {
  const rows = await query<{
    id: string;
    name: string;
    short_name: string;
    kind: Location['kind'];
    is_active: boolean;
    room_count: string;
  }>(
    `SELECT l.id, l.name, l.short_name, l.kind, l.is_active,
            (SELECT count(*) FROM rooms r WHERE r.location_id = l.id) AS room_count
       FROM locations l
      ORDER BY l.is_active DESC, l.kind, l.name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    kind: r.kind,
    isActive: r.is_active,
    roomCount: Number(r.room_count),
  }));
}

/** Every room, active first, then by location, floor and name. */
export async function listRooms(): Promise<Room[]> {
  const rows = await query<RoomRow>(
    `${SELECT} ORDER BY r.is_active DESC, l.kind, l.name, r.floor NULLS LAST, r.name`
  );
  return rows.map(toRoom);
}

/** Classrooms a cohort may be planned into. */
export async function listBookableRooms(): Promise<Room[]> {
  const rows = await query<RoomRow>(
    `${SELECT} WHERE r.is_bookable AND r.is_active AND r.kind = 'classroom'
     ORDER BY l.kind, l.name, r.floor NULLS LAST, r.name`
  );
  return rows.map(toRoom);
}

export async function getRoom(id: string): Promise<Room | null> {
  const row = await queryFirst<RoomRow>(`${SELECT} WHERE r.id = $1`, [id]);
  return row ? toRoom(row) : null;
}

export type RoomShift = 'morning' | 'afternoon' | 'evening';

/** One lesson day in a room: which course number, when, who teaches. */
export type RoomSlot = {
  date: string;
  shift: RoomShift;
  startsAt: string | null;
  endsAt: string | null;
  courseId: string | null;
  groupIndex: number;
  label: string;
  number: string | null;
  teacher: string | null;
};

const shiftOf = (startsAt: string | null): RoomShift => {
  const hour = Number(startsAt?.slice(0, 2));
  return !Number.isFinite(hour) || hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
};

/**
 * A room's week (2026-10-17): its lesson days Monday to Sunday — the course number, the hours, the
 * teacher — as the room is set on each day (docs/ADMIN_WORKSPACE.md §Lesson days), so what is free
 * reads off the gaps.
 */
export async function roomWeek(roomId: string, monday: string): Promise<RoomSlot[]> {
  const rows = await query<{
    on_date: string;
    starts_at: string | null;
    ends_at: string | null;
    course_id: string | null;
    group_index: number;
    label: string | null;
    number: string | null;
    teacher: string | null;
  }>(
    `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, to_char(d.starts_at, 'HH24:MI') AS starts_at, to_char(d.ends_at, 'HH24:MI') AS ends_at,
            d.course_id, d.group_index, coalesce(c.level_code, c.title, g.level || '.' || g.phase) AS label,
            coalesce(c.filemaker_group_ids[d.group_index], c.filemaker_course_id) AS number,
            coalesce(nullif(trim(m.short_name), ''), concat_ws(' ', p.first_name, left(p.last_name, 1))) AS teacher
       FROM course_day_times d
       LEFT JOIN courses c ON c.id = d.course_id
       LEFT JOIN course_groups g ON g.id = d.group_id
       LEFT JOIN staff_members m ON m.id = d.teacher_id LEFT JOIN people p ON p.id = m.person_id
      WHERE d.room_id = $1 AND d.on_date BETWEEN $2::date AND $2::date + 6 AND NOT d.cancelled
      ORDER BY d.on_date, d.starts_at NULLS LAST`,
    [roomId, monday]
  );
  return rows.map((r) => ({
    date: r.on_date,
    shift: shiftOf(r.starts_at),
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    courseId: r.course_id,
    groupIndex: r.group_index,
    label: r.label ?? '—',
    number: r.number,
    teacher: r.teacher,
  }));
}

/** A course number taught in a room from today on: its days there, and its learners at most (SchoolMan's, per group). */
export type RoomCourse = {
  courseId: string;
  groupIndex: number;
  label: string;
  typeName: string;
  number: string | null;
  first: string;
  last: string;
  days: number;
  learners: number | null;
};

export async function roomCourses(roomId: string, today: string): Promise<RoomCourse[]> {
  const rows = await query<{
    course_id: string;
    group_index: number;
    label: string;
    type_name: string;
    number: string | null;
    first: string;
    last: string;
    days: number;
    learners: number | null;
  }>(
    `SELECT d.course_id, d.group_index, coalesce(c.level_code, c.title, t.name) AS label, coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name,
            coalesce(c.filemaker_group_ids[d.group_index], c.filemaker_course_id) AS number,
            to_char(min(d.on_date), 'YYYY-MM-DD') AS first, to_char(max(d.on_date), 'YYYY-MM-DD') AS last, count(*)::int AS days,
            (SELECT max(l.learners) FROM course_week_learners l
              WHERE l.course_id = d.course_id AND l.group_index = d.group_index AND l.monday >= date_trunc('week', $2::date)) AS learners
       FROM course_days d
       JOIN courses c ON c.id = d.course_id
       JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types t ON t.id = i.course_type_id
      WHERE d.room_id = $1 AND d.on_date >= $2::date AND NOT d.cancelled
      GROUP BY d.course_id, d.group_index, c.level_code, c.title, t.name, t.name_de, c.filemaker_group_ids, c.filemaker_course_id
      ORDER BY min(d.on_date), label`,
    [roomId, today]
  );
  return rows.map((r) => ({
    courseId: r.course_id,
    groupIndex: r.group_index,
    label: r.label,
    typeName: r.type_name,
    number: r.number,
    first: r.first,
    last: r.last,
    days: r.days,
    learners: r.learners,
  }));
}

export async function updateRoom(
  id: string,
  patch: {
    name: string;
    nickname: string | null;
    kind: RoomKind;
    capacity: number | null;
    capacityMax: number | null;
    isBookable: boolean;
    isActive: boolean;
    notes: string | null;
  },
  actor: StaffUser
): Promise<void> {
  await query(
    `UPDATE rooms
        SET name = $2, nickname = $3, kind = $4::room_kind, capacity = $5, capacity_max = $6,
            is_bookable = $7 AND $4 = 'classroom', is_active = $8, notes = $9
      WHERE id = $1`,
    [
      id,
      patch.name,
      patch.nickname,
      patch.kind,
      patch.capacity,
      patch.capacityMax,
      patch.isBookable,
      patch.isActive,
      patch.notes,
    ]
  );
  await logActivity({ actor, entity: 'room', entityId: id, action: 'room_updated', detail: patch });
}

export async function createRoom(
  input: {
    locationId: string;
    name: string;
    nickname: string | null;
    floor: number | null;
    kind: RoomKind;
    capacity: number | null;
    capacityMax: number | null;
  },
  actor: StaffUser
): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO rooms (location_id, name, nickname, floor, kind, capacity, capacity_max, is_bookable)
     VALUES ($1, $2, $3, $4, $5::room_kind, $6, $7, $5 = 'classroom')
     RETURNING id`,
    [
      input.locationId,
      input.name,
      input.nickname,
      input.floor,
      input.kind,
      input.capacity,
      input.capacityMax,
    ]
  );
  if (!row) throw new Error('Room was not created');
  await logActivity({ actor, entity: 'room', entityId: row.id, action: 'room_created' });
  return row.id;
}

const ROOM_GONE: Bilingual = { de: 'Diesen Raum gibt es nicht mehr.', en: 'That room no longer exists.' };

/**
 * Removes a room. Refused while a lesson day ahead is planned into it — the
 * days must be moved first, so nothing loses its room silently. Rooms have no
 * history of their own, so this is a real delete; the FileMaker link goes too.
 */
export async function deleteRoom(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const room = await getRoom(id);
  if (!room) return { ok: false, reason: ROOM_GONE };
  if (room.coursesAhead > 0) {
    return {
      ok: false,
      reason: {
        de: `In ${room.name} sind noch Kurstage geplant. Verlege sie zuerst.`,
        en: `${room.name} still has lesson days planned. Move them first.`,
      },
    };
  }
  await query(`DELETE FROM filemaker_links WHERE entity = 'room' AND entity_id = $1`, [id]);
  await query(`UPDATE course_instances SET room_id = NULL WHERE room_id = $1`, [id]);
  await query(`DELETE FROM rooms WHERE id = $1`, [id]);
  await logActivity({
    actor,
    entity: 'room',
    entityId: id,
    action: 'room_deleted',
    detail: { name: room.name, location: room.locationName },
  });
  return { ok: true };
}
