import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { mondayOf } from './cleaning-plan';
import { query, queryFirst, withTransaction } from './db';
import type { Bilingual } from './i18n';

/**
 * A CASA flat's Putzplan (2026-10-19, migration 0072; docs/ADMIN_WORKSPACE.md §WG-Belegung): its duties
 * in order, each with its tasks, and the Monday the rotation counts from. The weeks are worked out
 * (`cleaning-plan.ts`); the rooms rotate in the order of their names, as the occupancy plan lists them.
 */

type Result = { ok: true } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type CleaningDuty = { id: string; position: number; name: Bilingual; nameDe: string; nameEn: string | null; tasks: string[] };
export type FlatCleaning = {
  /** The Monday the rotation counts from; null until the flat has a plan. */
  from: string | null;
  duties: CleaningDuty[];
  rooms: { id: string; name: string }[];
  /** Who lives in a room when, for the names on the plan. */
  tenants: { roomId: string; name: string; from: string; to: string }[];
};

const dutyRow = (r: { id: string; position: number; name_de: string; name_en: string | null; tasks: string[] }): CleaningDuty => ({
  id: r.id,
  position: r.position,
  name: { de: r.name_de, en: r.name_en || r.name_de },
  nameDe: r.name_de,
  nameEn: r.name_en,
  tasks: r.tasks ?? [],
});

/** A flat's plan, and who lives in its rooms between `from` and `to`. */
export async function flatCleaning(placeId: string, from: string, to: string): Promise<FlatCleaning> {
  const [place, duties, rooms, tenants] = await Promise.all([
    queryFirst<{ cleaning_from: string | null }>(`SELECT to_char(cleaning_from, 'YYYY-MM-DD') AS cleaning_from FROM accommodations WHERE id = $1`, [placeId]),
    query<{ id: string; position: number; name_de: string; name_en: string | null; tasks: string[] }>(
      `SELECT id, position, name_de, name_en, tasks FROM cleaning_duties WHERE accommodation_id = $1 ORDER BY position, created_at`,
      [placeId]
    ),
    query<{ id: string; name: string }>(`SELECT id, coalesce(name, '—') AS name FROM accommodation_rooms WHERE accommodation_id = $1 AND is_active ORDER BY name NULLS LAST`, [placeId]),
    query<{ room_id: string; name: string; starts_on: string; ends_on: string }>(
      `SELECT s.room_id, concat_ws(' ', p.first_name, p.last_name) AS name, to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on
         FROM booking_stays s JOIN bookings b ON b.id = s.booking_id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
         JOIN people p ON p.id = b.person_id AND p.deleted_at IS NULL
        WHERE s.accommodation_id = $1 AND s.room_id IS NOT NULL AND NOT s.cancelled AND s.starts_on <= $3::date AND s.ends_on >= $2::date
        ORDER BY s.starts_on`,
      [placeId, from, to]
    ),
  ]);
  return {
    from: place?.cleaning_from ?? null,
    duties: duties.map(dutyRow),
    rooms,
    tenants: tenants.map((r) => ({ roomId: r.room_id, name: r.name, from: r.starts_on, to: r.ends_on })),
  };
}

/** Every flat's duties and rotation start, for the occupancy plan's flat panel (this week's plan). */
export async function allFlatDuties(): Promise<Record<string, { from: string | null; duties: { name: Bilingual }[] }>> {
  const rows = await query<{ accommodation_id: string; cleaning_from: string | null; name_de: string; name_en: string | null }>(
    `SELECT d.accommodation_id, to_char(a.cleaning_from, 'YYYY-MM-DD') AS cleaning_from, d.name_de, d.name_en
       FROM cleaning_duties d JOIN accommodations a ON a.id = d.accommodation_id
      ORDER BY d.accommodation_id, d.position, d.created_at`
  );
  const out: Record<string, { from: string | null; duties: { name: Bilingual }[] }> = {};
  for (const r of rows) {
    const flat = (out[r.accommodation_id] ??= { from: r.cleaning_from, duties: [] });
    flat.duties.push({ name: { de: r.name_de, en: r.name_en || r.name_de } });
  }
  return out;
}

/** The flats that have a plan another can start from. */
export async function cleaningTemplates(exceptId: string): Promise<{ id: string; name: string; duties: number }[]> {
  return (
    await query<{ id: string; name: string; duties: string }>(
      `SELECT a.id, a.name, count(d.*) AS duties FROM accommodations a JOIN cleaning_duties d ON d.accommodation_id = a.id
        WHERE a.id <> $1 GROUP BY a.id, a.name ORDER BY a.name`,
      [exceptId]
    )
  ).map((r) => ({ id: r.id, name: r.name, duties: Number(r.duties) }));
}

export type DutyInput = { nameDe: string; nameEn: string | null; tasks: string[] };

/** A duty added or changed. The first one starts the flat's rotation this week. */
export async function saveDuty(placeId: string, dutyId: string | null, input: DutyInput, actor: StaffUser): Promise<Result> {
  const flat = await queryFirst<{ kind: string }>(`SELECT kind FROM accommodations WHERE id = $1`, [placeId]);
  if (!flat) return refuse('Diese Unterkunft gibt es nicht mehr.', 'This place no longer exists.');
  if (dutyId) {
    const row = await queryFirst<{ id: string }>(
      `UPDATE cleaning_duties SET name_de = $3, name_en = $4, tasks = $5 WHERE id = $2 AND accommodation_id = $1 RETURNING id`,
      [placeId, dutyId, input.nameDe, input.nameEn, input.tasks]
    );
    if (!row) return refuse('Diesen Dienst gibt es nicht mehr.', 'This duty no longer exists.');
  } else {
    await query(
      `INSERT INTO cleaning_duties (accommodation_id, position, name_de, name_en, tasks)
       VALUES ($1, coalesce((SELECT max(position) FROM cleaning_duties WHERE accommodation_id = $1), 0) + 1, $2, $3, $4)`,
      [placeId, input.nameDe, input.nameEn, input.tasks]
    );
    await query(`UPDATE accommodations SET cleaning_from = $2::date WHERE id = $1 AND cleaning_from IS NULL`, [placeId, mondayOf(todayIso())]);
  }
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'cleaning_duty_saved', detail: { duty: input.nameDe } });
  return { ok: true };
}

export async function deleteDuty(placeId: string, dutyId: string, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ name_de: string }>(`DELETE FROM cleaning_duties WHERE id = $2 AND accommodation_id = $1 RETURNING name_de`, [placeId, dutyId]);
  if (!row) return refuse('Diesen Dienst gibt es nicht mehr.', 'This duty no longer exists.');
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'cleaning_duty_deleted', detail: { duty: row.name_de } });
  return { ok: true };
}

/** A duty one place earlier or later in the order: the rotation follows it. */
export async function moveDuty(placeId: string, dutyId: string, direction: 'up' | 'down', actor: StaffUser): Promise<Result> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM cleaning_duties WHERE accommodation_id = $1 ORDER BY position, created_at FOR UPDATE`, [placeId]);
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(dutyId);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (const [k, id] of ids.entries()) await client.query(`UPDATE cleaning_duties SET position = $2 WHERE id = $1`, [id, k + 1]);
  });
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'cleaning_duty_moved' });
  return { ok: true };
}

/** Another flat's duties as this flat's plan, which then starts this week. Only for a flat without one. */
export async function copyDuties(placeId: string, fromPlaceId: string, actor: StaffUser): Promise<Result> {
  const has = await queryFirst<{ n: string }>(`SELECT count(*) AS n FROM cleaning_duties WHERE accommodation_id = $1`, [placeId]);
  if (Number(has?.n ?? 0) > 0) return refuse('Diese WG hat schon einen Putzplan.', 'This flat already has a cleaning plan.');
  const copied = await query<{ id: string }>(
    `INSERT INTO cleaning_duties (accommodation_id, position, name_de, name_en, tasks)
     SELECT $1, position, name_de, name_en, tasks FROM cleaning_duties WHERE accommodation_id = $2 RETURNING id`,
    [placeId, fromPlaceId]
  );
  if (!copied.length) return refuse('Diese WG hat keinen Putzplan zum Übernehmen.', 'That flat has no cleaning plan to take over.');
  await query(`UPDATE accommodations SET cleaning_from = $2::date WHERE id = $1`, [placeId, mondayOf(todayIso())]);
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'cleaning_plan_copied', detail: { from: fromPlaceId } });
  return { ok: true };
}

/** The rotation begins again this week: the first room has the first duty. */
export async function restartCleaning(placeId: string, actor: StaffUser): Promise<Result> {
  await query(`UPDATE accommodations SET cleaning_from = $2::date WHERE id = $1`, [placeId, mondayOf(todayIso())]);
  await logActivity({ actor, entity: 'accommodation', entityId: placeId, action: 'cleaning_plan_restarted' });
  return { ok: true };
}

const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
