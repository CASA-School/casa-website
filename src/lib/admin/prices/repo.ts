import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from '../activity';
import type { StaffUser } from '../auth';
import { query, withTransaction } from '../db';
import { toDateInputValue } from '@/lib/dates';

import { listStatus, listsFromRates, priceAt, slotKey, type PriceList, type PriceUnit, type RateRow, type Slot } from './price-list';

/**
 * The price lists: read for every offer and booking, written on the Prices
 * screen (Settings → Prices, module `prices`). docs/CATALOGUE_AND_PRICING.md
 * §Price lists.
 */

/** Every list, oldest first. A few dozen rows a year. */
export async function loadPriceLists(): Promise<PriceList[]> {
  const rows = await query<{
    id: string;
    scope: RateRow['scope'];
    course_slug: string | null;
    exam_code: string | null;
    material_id: string | null;
    charge_type_code: string | null;
    parts: number | null;
    min_quantity: string | null;
    max_quantity: string | null;
    unit: string;
    amount: string;
    valid_from: Date;
  }>(
    `SELECT r.id, r.scope::text AS scope, t.slug AS course_slug, e.code AS exam_code, r.material_id, r.charge_type_code,
            r.parts, r.min_quantity, r.max_quantity, r.unit::text AS unit, r.amount, r.valid_from
       FROM rates r
       LEFT JOIN course_types t ON t.id = r.course_type_id
       LEFT JOIN exam_types e ON e.id = r.exam_type_id
      WHERE r.level_code IS NULL AND r.day_time_code IS NULL AND r.catering_code IS NULL AND r.room_type_code IS NULL
      ORDER BY r.valid_from, r.created_at`
  );
  return listsFromRates(
    rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      courseSlug: r.course_slug,
      examCode: r.exam_code,
      materialId: r.material_id,
      chargeType: r.charge_type_code,
      parts: r.parts,
      minQuantity: r.min_quantity == null ? null : Number(r.min_quantity),
      maxQuantity: r.max_quantity == null ? null : Number(r.max_quantity),
      unit: r.unit,
      amount: Number(r.amount),
      validFrom: toDateInputValue(r.valid_from),
    }))
  );
}

/** What the Prices screen lists: the courses with a price, the books, the exams. */
export async function priceListSubjects() {
  const [courses, books, exams] = await Promise.all([
    query<{ slug: string; name: string }>(
      `SELECT slug, name FROM course_types
        WHERE is_active AND pricing_mode <> 'on_request' AND slug <> 'german-for-groups'
        ORDER BY CASE slug WHEN 'intensive-german' THEN 0 WHEN 'evening-german' THEN 1 WHEN 'special-courses' THEN 2 ELSE 3 END, name`
    ),
    query<{ id: string; title: string; level_code: string | null; part: number | null }>(
      `SELECT id, title, level_code, part FROM materials WHERE is_active ORDER BY level_code NULLS LAST, part NULLS LAST, title`
    ),
    query<{ code: string; name: string }>(`SELECT code, name FROM exam_types WHERE is_active ORDER BY level NULLS LAST, name`),
  ]);
  return {
    courses,
    books: books.map((b) => ({ id: b.id, title: b.title, level: b.level_code, part: b.part })),
    exams,
  };
}

export type PriceChange = { slot: Slot; amount: number | null; unit?: PriceUnit };

/** Where a slot's row is in `rates`, as SQL over the list's date ($1) and the slot's own values ($2…). */
function slotWhere(slot: Slot): { sql: string; params: unknown[] } {
  switch (slot.kind) {
    case 'course':
      return {
        sql: `scope = 'course_type' AND course_type_id = (SELECT id FROM course_types WHERE slug = $2) AND ${slot.weeks == null ? 'min_quantity IS NULL' : 'min_quantity = $3 AND max_quantity = $3'}`,
        params: slot.weeks == null ? [slot.slug] : [slot.slug, slot.weeks],
      };
    case 'rent':
      return {
        sql: `scope = 'charge_type' AND charge_type_code = 'accommodation_rent' AND ${slot.weeks == null ? 'min_quantity IS NULL' : 'min_quantity = $2 AND max_quantity = $2'}`,
        params: slot.weeks == null ? [] : [slot.weeks],
      };
    case 'fee':
      return { sql: `scope = 'charge_type' AND charge_type_code = $2`, params: [slot.fee] };
    case 'book':
      return { sql: `scope = 'material' AND material_id = $2`, params: [slot.materialId] };
    case 'exam':
      return { sql: `scope = 'exam_type' AND exam_type_id = (SELECT id FROM exam_types WHERE code = $2) AND parts = $3`, params: [slot.code, slot.parts] };
  }
}

const NARROW = 'level_code IS NULL AND day_time_code IS NULL AND catering_code IS NULL AND room_type_code IS NULL';

async function insertRow(client: PoolClient, validFrom: string, validTo: string | null, slot: Slot, amount: number, unit: PriceUnit, actor: StaffUser) {
  const base = [validFrom, validTo, amount, unit, actor.id];
  switch (slot.kind) {
    case 'course':
      await client.query(
        `INSERT INTO rates (scope, course_type_id, min_quantity, max_quantity, valid_from, valid_to, amount, unit, created_by)
         SELECT 'course_type', id, $6, $6, $1, $2, $3, $4::rate_unit, $5 FROM course_types WHERE slug = $7`,
        [...base, slot.weeks, slot.slug]
      );
      return;
    case 'rent':
      await client.query(
        `INSERT INTO rates (scope, charge_type_code, min_quantity, max_quantity, valid_from, valid_to, amount, unit, created_by)
         VALUES ('charge_type', 'accommodation_rent', $6, $6, $1, $2, $3, $4::rate_unit, $5)`,
        [...base, slot.weeks]
      );
      return;
    case 'fee':
      await client.query(
        `INSERT INTO rates (scope, charge_type_code, valid_from, valid_to, amount, unit, created_by)
         VALUES ('charge_type', $6, $1, $2, $3, $4::rate_unit, $5)`,
        [...base, slot.fee]
      );
      return;
    case 'book':
      await client.query(
        `INSERT INTO rates (scope, material_id, vat_rate, valid_from, valid_to, amount, unit, created_by)
         VALUES ('material', $6, 7.00, $1, $2, $3, $4::rate_unit, $5)`,
        [...base, slot.materialId]
      );
      return;
    case 'exam':
      await client.query(
        `INSERT INTO rates (scope, exam_type_id, parts, valid_from, valid_to, amount, unit, created_by)
         SELECT 'exam_type', id, $6, $1, $2, $3, $4::rate_unit, $5 FROM exam_types WHERE code = $7`,
        [...base, slot.parts, slot.code]
      );
      return;
  }
}

/**
 * Changes prices in one list: a new amount updates the row, a price the list
 * did not have adds one, an emptied price removes it. A list that has ended
 * is history and is refused. An offer or booking already made keeps the
 * amounts it was made with.
 */
export async function savePrices(validFrom: string, changes: readonly PriceChange[], today: string, actor: StaffUser): Promise<{ changed: number } | { error: string }> {
  const lists = await loadPriceLists();
  const list = lists.find((l) => l.validFrom === validFrom);
  if (!list) return { error: 'This price list no longer exists.' };
  if (listStatus(list, today) === 'past') return { error: 'A price list that has ended cannot be changed.' };

  const real = changes.filter((c) => {
    const held = priceAt(list, c.slot);
    return (held?.amount ?? null) !== c.amount || (c.amount != null && c.unit != null && held?.unit != null && held.unit !== c.unit);
  });
  if (!real.length) return { changed: 0 };

  await withTransaction(async (client) => {
    for (const change of real) {
      const where = slotWhere(change.slot);
      const held = priceAt(list, change.slot);
      if (change.amount == null) {
        await client.query(`DELETE FROM rates WHERE valid_from = $1 AND ${NARROW} AND ${where.sql}`, [validFrom, ...where.params]);
      } else if (held?.id) {
        await client.query(`UPDATE rates SET amount = $2, unit = coalesce($3::rate_unit, unit) WHERE id = $1`, [held.id, change.amount, change.unit ?? null]);
      } else {
        await insertRow(client, validFrom, list.validTo, change.slot, change.amount, change.unit ?? (change.slot.kind === 'rent' && change.slot.weeks == null ? 'week' : 'item'), actor);
      }
    }
  });
  await logActivity({
    actor,
    entity: 'price_list',
    entityId: null,
    action: 'prices_changed',
    detail: {
      list: validFrom,
      changes: real.map((c) => ({ slot: slotKey(c.slot), from: priceAt(list, c.slot)?.amount ?? null, to: c.amount })),
    },
  });
  return { changed: real.length };
}

/** Each list closes the day before the next one starts; the newest stays open. */
async function closeLists(client: PoolClient) {
  await client.query(
    `UPDATE rates r SET valid_to = n.next_from - 1
       FROM (SELECT valid_from, lead(valid_from) OVER (ORDER BY valid_from) AS next_from
               FROM (SELECT DISTINCT valid_from FROM rates) d) n
      WHERE r.valid_from = n.valid_from AND r.valid_to IS DISTINCT FROM (n.next_from - 1)`
  );
}

/**
 * Next year's list: a copy of the newest list, valid from `validFrom`, which
 * closes the newest the day before. Its prices are then changed where they
 * change; until its date nothing is priced from it.
 */
export async function preparePriceList(validFrom: string, today: string, actor: StaffUser): Promise<{ ok: true } | { error: string }> {
  if (validFrom <= today) return { error: 'A new price list starts after today.' };
  const lists = await loadPriceLists();
  const newest = lists[lists.length - 1];
  if (!newest) return { error: 'There is no price list to start from.' };
  if (validFrom <= newest.validFrom) return { error: `A new list starts after ${newest.validFrom}, when the newest one does.` };

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO rates (scope, course_type_id, exam_type_id, material_id, accommodation_type_code, catering_code, room_type_code,
                          charge_type_code, level_code, day_time_code, min_quantity, max_quantity, parts,
                          amount, unit, currency, vat_rate, valid_from, note, created_by)
       SELECT scope, course_type_id, exam_type_id, material_id, accommodation_type_code, catering_code, room_type_code,
              charge_type_code, level_code, day_time_code, min_quantity, max_quantity, parts,
              amount, unit, currency, vat_rate, $1::date, 'Copied from the list of ' || to_char($2::date, 'DD.MM.YYYY'), $3
         FROM rates WHERE valid_from = $2::date`,
      [validFrom, newest.validFrom, actor.id]
    );
    await closeLists(client);
  });
  await logActivity({ actor, entity: 'price_list', entityId: null, action: 'price_list_prepared', detail: { list: validFrom } });
  return { ok: true };
}

/** A list that has not started yet, removed; the one before it is open again. */
export async function deletePriceList(validFrom: string, today: string, actor: StaffUser): Promise<{ ok: true } | { error: string }> {
  if (validFrom <= today) return { error: 'Only a list that has not started yet can be deleted.' };
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM rates WHERE valid_from = $1`, [validFrom]);
    await closeLists(client);
  });
  await logActivity({ actor, entity: 'price_list', entityId: null, action: 'price_list_deleted', detail: { list: validFrom } });
  return { ok: true };
}
