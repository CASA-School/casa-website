'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { forgetPublishedPrices } from '@/lib/content/published-prices.server';
import { PRICE_UNITS, parseAmount, parseSlot, type PriceUnit } from '@/lib/admin/prices/price-list';
import { deletePriceList, preparePriceList, savePrices, type PriceChange } from '@/lib/admin/prices/repo';
import { todayInputValue } from '@/lib/dates';

/** Price list mutations. Changing prices and preparing a list need `edit`; deleting a list that has not started needs `full`. */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const BACK = '/admin/settings/prices';

function back(list: string | null, params: Record<string, string>): never {
  const query = new URLSearchParams({ ...(list ? { list } : {}), ...params });
  redirect(`${BACK}?${query}`);
}

function listOf(formData: FormData, field = 'list'): string {
  const value = String(formData.get(field) ?? '');
  if (!DATE.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

const done = () => {
  forgetPublishedPrices();
  revalidatePath(BACK);
  revalidatePath('/admin/offers', 'layout');
  revalidatePath('/admin/bookings', 'layout');
};

export async function savePricesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('prices', 'edit');
  const list = listOf(formData);

  const changes: PriceChange[] = [];
  for (const [name, value] of formData.entries()) {
    if (!name.startsWith('p:')) continue;
    const key = name.slice(2);
    const slot = parseSlot(key);
    if (!slot) throw new Error('Invalid price');
    const amount = parseAmount(String(value));
    if (amount === undefined) back(list, { error: `“${String(value).slice(0, 20)}” is not an amount.` });
    const unit = String(formData.get(`u:${key}`) ?? '');
    changes.push({ slot, amount, unit: (PRICE_UNITS as readonly string[]).includes(unit) ? (unit as PriceUnit) : undefined });
  }
  if (changes.length === 0 || changes.length > 200) throw new Error('Invalid prices');

  const result = await savePrices(list, changes, todayInputValue(), actor);
  if ('error' in result) back(list, { error: result.error });
  done();
  back(list, { saved: String(result.changed) });
}

export async function preparePriceListAction(formData: FormData): Promise<void> {
  const actor = await requireModule('prices', 'edit');
  const validFrom = listOf(formData, 'validFrom');
  const result = await preparePriceList(validFrom, todayInputValue(), actor);
  if ('error' in result) back(null, { error: result.error });
  done();
  back(validFrom, {});
}

export async function deletePriceListAction(formData: FormData): Promise<void> {
  const actor = await requireModule('prices', 'full');
  const list = listOf(formData);
  if (formData.get('confirmed') !== '1') back(list, { error: 'Deleting a price list needs a confirmation.' });
  const result = await deletePriceList(list, todayInputValue(), actor);
  if ('error' in result) back(list, { error: result.error });
  done();
  back(null, {});
}
