'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createRate, deleteRate, endRate, type NewRate } from '@/lib/admin/configuration';
import { requireModule } from '@/lib/admin/guard';

/**
 * Setup mutations. `settings` at `full` — owner and administrator only, since
 * a rate is what every future booking will be priced from.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCOPES = new Set(['course_type', 'exam_type', 'accommodation', 'material', 'charge_type']);
const UNITS = new Set(['item', 'week', 'lesson', 'night', 'month', 'person_week']);
const CODE = /^[a-z0-9_+.-]{1,40}$/i;

const BACK = '/admin/settings/setup';

function fail(message: string): never {
  redirect(`${BACK}?error=${encodeURIComponent(message)}`);
}

function id(formData: FormData, field: string): string {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function optionalUuid(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? '');
  if (value === '') return null;
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function optionalCode(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? '').trim();
  if (value === '') return null;
  if (!CODE.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function money(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? '')
    .trim()
    .replace(',', '.');
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new Error(`Invalid ${field}`);
  return Math.round(n * 100) / 100;
}

function count(formData: FormData, field: string, max: number): number | null {
  const raw = String(formData.get(field) ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`Invalid ${field}`);
  return n;
}

export async function createRateAction(formData: FormData): Promise<void> {
  const actor = await requireModule('settings', 'full');

  const scope = String(formData.get('scope') ?? '');
  if (!SCOPES.has(scope)) fail('Choose what the price is for.');
  const unit = String(formData.get('unit') ?? 'item');
  if (!UNITS.has(unit)) throw new Error('Invalid unit');

  const amount = money(formData, 'amount');
  if (amount === null) fail('An amount is required.');

  const validFrom = String(formData.get('validFrom') ?? '');
  if (!DATE.test(validFrom)) fail('A price needs a date it starts from.');
  const validToRaw = String(formData.get('validTo') ?? '').trim();
  if (validToRaw !== '' && !DATE.test(validToRaw)) fail('That end date is not a date.');
  if (validToRaw !== '' && validToRaw < validFrom) fail('The end date is before the start.');

  const target: Pick<
    NewRate,
    'courseTypeId' | 'examTypeId' | 'materialId' | 'accommodationTypeCode' | 'chargeTypeCode'
  > = {
    courseTypeId: scope === 'course_type' ? optionalUuid(formData, 'courseTypeId') : null,
    examTypeId: scope === 'exam_type' ? optionalUuid(formData, 'examTypeId') : null,
    materialId: scope === 'material' ? optionalUuid(formData, 'materialId') : null,
    accommodationTypeCode:
      scope === 'accommodation' ? optionalCode(formData, 'accommodationTypeCode') : null,
    chargeTypeCode: scope === 'charge_type' ? optionalCode(formData, 'chargeTypeCode') : null,
  };
  if (!Object.values(target).some(Boolean)) fail('Choose which one the price is for.');

  const min = count(formData, 'minQuantity', 999);
  const max = count(formData, 'maxQuantity', 999);
  if (min !== null && max !== null && max < min) fail('The upper bound is below the lower one.');

  await createRate(
    {
      scope: scope as NewRate['scope'],
      ...target,
      levelCode: optionalCode(formData, 'levelCode'),
      dayTimeCode: optionalCode(formData, 'dayTimeCode'),
      cateringCode: optionalCode(formData, 'cateringCode'),
      roomTypeCode: optionalCode(formData, 'roomTypeCode'),
      parts: count(formData, 'parts', 2),
      minQuantity: min,
      maxQuantity: max,
      amount,
      unit,
      currency: 'EUR',
      vatRate: money(formData, 'vatRate') ?? 0,
      validFrom,
      validTo: validToRaw === '' ? null : validToRaw,
      note: (String(formData.get('note') ?? '').trim() || null)?.slice(0, 200) ?? null,
    },
    actor
  );
  revalidatePath(BACK);
  redirect(`${BACK}?tab=prices`);
}

/** Ends a price today. Confirmed, because a live price stops applying. */
export async function endRateAction(formData: FormData): Promise<void> {
  const actor = await requireModule('settings', 'full');
  if (formData.get('confirmed') !== '1') redirect(`${BACK}?tab=prices`);
  await endRate(id(formData, 'rateId'), actor);
  revalidatePath(BACK);
  redirect(`${BACK}?tab=prices`);
}

export async function deleteRateAction(formData: FormData): Promise<void> {
  const actor = await requireModule('settings', 'full');
  if (formData.get('confirmed') !== '1') redirect(`${BACK}?tab=prices`);
  const result = await deleteRate(id(formData, 'rateId'), actor);
  revalidatePath(BACK);
  if (!result.ok) fail(result.reason);
  redirect(`${BACK}?tab=prices`);
}
