import { notFound } from 'next/navigation';

import { CleaningPrint } from './cleaning-print';
import { PageHeader } from '@/components/admin/ui';
import { getPlace } from '@/lib/admin/accommodation';
import { flatCleaning } from '@/lib/admin/cleaning';
import { mondayOf } from '@/lib/admin/cleaning-plan';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/** A flat's Putzplan to print for its notice board, four weeks from this one (2026-10-19). */
export default async function CleaningPrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams, requireModule('accommodation')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const place = await getPlace(id);
  if (!place || place.kind !== 'casa_flat') notFound();
  const monday = mondayOf(from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : berlinDay(new Date()));
  const end = new Date(Date.parse(`${monday}T12:00:00Z`) + 27 * 86_400_000).toISOString().slice(0, 10);
  const plan = await flatCleaning(id, monday, end);
  const { t } = await getI18n();
  return (
    <>
      <PageHeader backHref={`/admin/accommodation/${id}?tab=cleaning`} backLabel={place.name} title={t(`Putzplan ${place.name}`, `Cleaning plan ${place.name}`)} />
      <CleaningPrint flat={place.name} monday={monday} plan={plan} />
    </>
  );
}
