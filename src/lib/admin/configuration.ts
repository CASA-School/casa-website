import { query, queryFirst } from './db';
import { logActivity } from './activity';
import type { StaffUser } from './auth';

/**
 * The school's own setup: the vocabularies and the price list.
 *
 * These are values CASA sets once and leaves alone for a season, so they live
 * under Settings rather than in the main navigation. The read side is a
 * summary per vocabulary plus the rate card; the write side is limited to what
 * genuinely changes — a rate's period and amount, and whether a type is still
 * offered. Adding a new *kind* of type is a migration, on purpose.
 *
 * docs/CATALOGUE_AND_PRICING.md is the survey this model came from.
 */

export type VocabularySummary = {
  key: string;
  label: string;
  total: number;
  active: number;
  /** A few names, so the screen shows what the list contains without opening it. */
  sample: string[];
};

export async function vocabularySummaries(): Promise<VocabularySummary[]> {
  const rows = await query<{
    key: string;
    total: string;
    active: string;
    sample: string[] | null;
  }>(
    `SELECT 'charge_types' AS key, count(*)::text AS total,
            count(*) FILTER (WHERE is_active)::text AS active,
            (array_agg(name_en ORDER BY position))[1:4] AS sample FROM charge_types
     UNION ALL
     SELECT 'accommodation_types', count(*)::text, count(*) FILTER (WHERE is_bookable)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM accommodation_types
     UNION ALL
     SELECT 'catering_options', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM catering_options
     UNION ALL
     SELECT 'accommodation_room_types', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM accommodation_room_types
     UNION ALL
     SELECT 'day_times', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM day_times
     UNION ALL
     SELECT 'levels', count(*)::text, count(*)::text,
            (array_agg(code ORDER BY position))[1:4] FROM levels
     UNION ALL
     SELECT 'materials', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(title ORDER BY title))[1:3] FROM materials
     UNION ALL
     SELECT 'course_types', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(name ORDER BY name))[1:4] FROM course_types
     UNION ALL
     SELECT 'exam_types', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(name ORDER BY name))[1:4] FROM exam_types
     UNION ALL
     SELECT 'countries', count(*)::text, count(*)::text, ARRAY[]::text[] FROM countries`
  );

  const LABELS: Record<string, string> = {
    course_types: 'Course types',
    exam_types: 'Exams',
    levels: 'Levels',
    day_times: 'Day sessions',
    charge_types: 'Charge types',
    accommodation_types: 'Accommodation types',
    catering_options: 'Catering',
    accommodation_room_types: 'Accommodation rooms',
    materials: 'Books & material',
    countries: 'Countries',
  };
  const ORDER = Object.keys(LABELS);

  return rows
    .map((r) => ({
      key: r.key,
      label: LABELS[r.key] ?? r.key,
      total: Number(r.total),
      active: Number(r.active),
      sample: r.sample ?? [],
    }))
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

export type RateRow = {
  id: string;
  scope: string;
  /** What it prices, as one readable phrase. */
  target: string;
  /** The conditions that narrow it, already worded. */
  conditions: string[];
  amount: number;
  unit: string;
  currency: string;
  vatRate: number;
  validFrom: Date;
  validTo: Date | null;
  note: string | null;
  /** True when today falls inside the period. */
  isCurrent: boolean;
};

export { RATE_SCOPE_LABELS, RATE_UNIT_LABELS } from './configuration-labels';

export async function listRates(scope?: string): Promise<RateRow[]> {
  const rows = await query<{
    id: string;
    scope: string;
    target: string | null;
    level_code: string | null;
    day_time: string | null;
    catering: string | null;
    room_type: string | null;
    parts: number | null;
    min_quantity: string | null;
    max_quantity: string | null;
    amount: string;
    unit: string;
    currency: string;
    vat_rate: string;
    valid_from: Date;
    valid_to: Date | null;
    note: string | null;
    is_current: boolean;
  }>(
    `SELECT r.id, r.scope::text AS scope,
            coalesce(ct.name, et.name, m.title, at.name_en, cht.name_en) AS target,
            r.level_code, dt.name_en AS day_time, co.name_en AS catering,
            art.name_en AS room_type, r.parts, r.min_quantity, r.max_quantity,
            r.amount, r.unit::text AS unit, r.currency, r.vat_rate,
            r.valid_from, r.valid_to, r.note,
            (r.valid_from <= current_date AND (r.valid_to IS NULL OR r.valid_to >= current_date)) AS is_current
       FROM rates r
       LEFT JOIN course_types ct ON ct.id = r.course_type_id
       LEFT JOIN exam_types et ON et.id = r.exam_type_id
       LEFT JOIN materials m ON m.id = r.material_id
       LEFT JOIN accommodation_types at ON at.code = r.accommodation_type_code
       LEFT JOIN charge_types cht ON cht.code = r.charge_type_code
       LEFT JOIN day_times dt ON dt.code = r.day_time_code
       LEFT JOIN catering_options co ON co.code = r.catering_code
       LEFT JOIN accommodation_room_types art ON art.code = r.room_type_code
      WHERE ($1::text IS NULL OR r.scope::text = $1)
      ORDER BY r.scope, is_current DESC, target, r.valid_from DESC`,
    [scope ?? null]
  );

  return rows.map((r) => {
    const conditions: string[] = [];
    if (r.level_code) conditions.push(r.level_code);
    if (r.day_time) conditions.push(r.day_time);
    if (r.catering) conditions.push(r.catering);
    if (r.room_type) conditions.push(r.room_type);
    if (r.parts) conditions.push(r.parts === 1 ? 'one part' : 'both parts');
    if (r.min_quantity || r.max_quantity) {
      const lo = r.min_quantity ? Number(r.min_quantity) : null;
      const hi = r.max_quantity ? Number(r.max_quantity) : null;
      conditions.push(lo && hi ? `${lo}–${hi}` : lo ? `${lo}+` : `up to ${hi}`);
    }
    return {
      id: r.id,
      scope: r.scope,
      target: r.target ?? '—',
      conditions,
      amount: Number(r.amount),
      unit: r.unit,
      currency: r.currency,
      vatRate: Number(r.vat_rate),
      validFrom: r.valid_from,
      validTo: r.valid_to,
      note: r.note,
      isCurrent: r.is_current,
    };
  });
}

/** What a new rate can point at, for the form's selects. */
export async function rateTargets(): Promise<{
  courseTypes: { id: string; name: string }[];
  examTypes: { id: string; name: string }[];
  materials: { id: string; title: string }[];
  accommodationTypes: { code: string; name: string }[];
  chargeTypes: { code: string; name: string }[];
  levels: string[];
  dayTimes: { code: string; name: string }[];
  catering: { code: string; name: string }[];
  roomTypes: { code: string; name: string }[];
}> {
  const [
    courseTypes,
    examTypes,
    materials,
    accommodationTypes,
    chargeTypes,
    levels,
    dayTimes,
    catering,
    roomTypes,
  ] = await Promise.all([
    query<{ id: string; name: string }>(
      `SELECT id, name FROM course_types WHERE is_active ORDER BY name`
    ),
    query<{ id: string; name: string }>(
      `SELECT id, name FROM exam_types WHERE is_active ORDER BY name`
    ),
    query<{ id: string; title: string }>(
      `SELECT id, title FROM materials WHERE is_active ORDER BY title`
    ),
    query<{ code: string; name: string }>(
      `SELECT code, name_en AS name FROM accommodation_types ORDER BY position`
    ),
    query<{ code: string; name: string }>(
      `SELECT code, name_en AS name FROM charge_types WHERE is_active ORDER BY position`
    ),
    query<{ code: string }>(`SELECT code FROM levels ORDER BY position`),
    query<{ code: string; name: string }>(
      `SELECT code, name_en AS name FROM day_times ORDER BY position`
    ),
    query<{ code: string; name: string }>(
      `SELECT code, name_en AS name FROM catering_options ORDER BY position`
    ),
    query<{ code: string; name: string }>(
      `SELECT code, name_en AS name FROM accommodation_room_types ORDER BY position`
    ),
  ]);
  return {
    courseTypes,
    examTypes,
    materials,
    accommodationTypes,
    chargeTypes,
    levels: levels.map((l) => l.code),
    dayTimes,
    catering,
    roomTypes,
  };
}

export type NewRate = {
  scope: 'course_type' | 'exam_type' | 'accommodation' | 'material' | 'charge_type';
  courseTypeId: string | null;
  examTypeId: string | null;
  materialId: string | null;
  accommodationTypeCode: string | null;
  chargeTypeCode: string | null;
  levelCode: string | null;
  dayTimeCode: string | null;
  cateringCode: string | null;
  roomTypeCode: string | null;
  parts: number | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  amount: number;
  unit: string;
  currency: string;
  vatRate: number;
  validFrom: string;
  validTo: string | null;
  note: string | null;
};

export async function createRate(input: NewRate, actor: StaffUser): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO rates (scope, course_type_id, exam_type_id, material_id, accommodation_type_code,
                        charge_type_code, level_code, day_time_code, catering_code, room_type_code,
                        parts, min_quantity, max_quantity, amount, unit, currency, vat_rate,
                        valid_from, valid_to, note, created_by)
     VALUES ($1::rate_scope, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::rate_unit,
             $16, $17, $18::date, $19::date, $20, $21)
     RETURNING id`,
    [
      input.scope,
      input.courseTypeId,
      input.examTypeId,
      input.materialId,
      input.accommodationTypeCode,
      input.chargeTypeCode,
      input.levelCode,
      input.dayTimeCode,
      input.cateringCode,
      input.roomTypeCode,
      input.parts,
      input.minQuantity,
      input.maxQuantity,
      input.amount,
      input.unit,
      input.currency,
      input.vatRate,
      input.validFrom,
      input.validTo,
      input.note,
    ].concat([actor.id]) as unknown[]
  );
  if (!row) throw new Error('Rate was not created');
  await logActivity({
    actor,
    entity: 'rate',
    entityId: row.id,
    action: 'rate_created',
    detail: { scope: input.scope, amount: input.amount },
  });
  return row.id;
}

/**
 * Ends a rate today rather than deleting it: a rate that priced a booking is
 * part of that booking's provenance. Setting `valid_to` is how a price stops.
 */
export async function endRate(id: string, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE rates SET valid_to = current_date WHERE id = $1 AND (valid_to IS NULL OR valid_to > current_date)`,
    [id]
  );
  await logActivity({ actor, entity: 'rate', entityId: id, action: 'rate_ended' });
}

/** Only a rate nothing has used can be removed outright. */
export async function deleteRate(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const used = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM booking_charges WHERE rate_id = $1`,
    [id]
  );
  if (Number(used?.n ?? 0) > 0) {
    return { ok: false, reason: 'This rate has priced a booking. End it instead of deleting it.' };
  }
  await query(`DELETE FROM rates WHERE id = $1`, [id]);
  await logActivity({ actor, entity: 'rate', entityId: id, action: 'rate_deleted' });
  return { ok: true };
}
