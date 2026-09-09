import { query, queryFirst } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';

/**
 * Rooms and locations — the planning module's data layer.
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
  /** Cohorts currently or soon running in it. */
  upcomingCohorts: number;
};

export const ROOM_KIND_LABELS: Record<RoomKind, string> = {
  classroom: 'Classroom',
  office: 'Office',
  meeting: 'Meeting room',
  other: 'Other',
};

export function floorLabel(floor: number | null): string {
  if (floor === null) return '—';
  if (floor < 0) return 'Cellar';
  if (floor === 0) return 'Ground floor';
  return `${floor}. floor`;
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
  upcoming_cohorts: string;
};

const SELECT = `
  SELECT r.id, r.location_id, l.name AS location_name, l.kind AS location_kind,
         r.name, r.short_name, r.nickname, r.floor, r.kind::text AS kind,
         r.capacity, r.capacity_max, r.is_bookable, r.is_active, r.colour, r.zone, r.notes,
         (SELECT count(*) FROM course_instances i
           WHERE i.room_id = r.id AND i.end_date >= current_date AND i.status <> 'cancelled')
           AS upcoming_cohorts
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
  upcomingCohorts: Number(r.upcoming_cohorts),
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

export type RoomCohort = {
  id: string;
  courseTypeName: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  registrationCount: number;
};

/** Cohorts planned into a room, current and future first. */
export async function roomCohorts(roomId: string): Promise<RoomCohort[]> {
  const rows = await query<{
    id: string;
    course_type_name: string;
    start_date: Date;
    end_date: Date;
    capacity: number;
    registration_count: string;
  }>(
    `SELECT i.id, t.name AS course_type_name, i.start_date, i.end_date, i.capacity,
            (SELECT count(*) FROM course_registrations r
              WHERE r.course_instance_id = i.id AND r.status <> 'spam') AS registration_count
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
      WHERE i.room_id = $1
      ORDER BY (i.end_date < current_date), i.start_date`,
    [roomId]
  );
  return rows.map((r) => ({
    id: r.id,
    courseTypeName: r.course_type_name,
    startDate: r.start_date,
    endDate: r.end_date,
    capacity: r.capacity,
    registrationCount: Number(r.registration_count),
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

/** Puts a cohort in a room, or takes it out (null). */
export async function assignRoom(
  courseInstanceId: string,
  roomId: string | null,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (roomId) {
    const room = await getRoom(roomId);
    if (!room) return { ok: false, reason: 'That room no longer exists.' };
    if (!room.isBookable || !room.isActive || room.kind !== 'classroom') {
      return { ok: false, reason: `${room.name} cannot hold a course.` };
    }
  }
  await query(`UPDATE course_instances SET room_id = $2 WHERE id = $1`, [courseInstanceId, roomId]);
  await logActivity({
    actor,
    entity: 'course_instance',
    entityId: courseInstanceId,
    action: roomId ? 'room_assigned' : 'room_unassigned',
    detail: roomId ? { room: roomId } : undefined,
  });
  return { ok: true };
}

/**
 * Removes a room. Refused while any cohort is planned into it — the cohort
 * must be moved first, so nothing loses its room silently. Rooms have no
 * history of their own, so this is a real delete; the FileMaker link goes too.
 */
export async function deleteRoom(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const room = await getRoom(id);
  if (!room) return { ok: false, reason: 'That room no longer exists.' };
  if (room.upcomingCohorts > 0) {
    return { ok: false, reason: `${room.name} still has cohorts planned. Move them first.` };
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
