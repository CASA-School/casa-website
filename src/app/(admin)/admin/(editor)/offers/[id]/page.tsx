import { notFound } from 'next/navigation';

import { OfferPage } from '@/components/admin/offers/offer-page';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { courseCatalogue, learnerHistory } from '@/lib/admin/offers/course-catalogue';
import { editorOptions, getOffer, offerTexts, priceListOptions } from '@/lib/admin/offers/repo';
import { todayInputValue } from '@/lib/dates';

/**
 * One offer: what it is, for whom, what it costs. Full screen, like the
 * website editor; the letter is the other tab. docs/OFFERS.md.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireModule('offers')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const record = await getOffer(id);
  if (!record) notFound();
  const individual = record.draft.kind === 'individual';
  const { lang } = await getI18n();
  const [options, priceList, texts, catalogue, history] = await Promise.all([
    editorOptions(),
    priceListOptions(lang),
    offerTexts(),
    individual ? courseCatalogue() : Promise.resolve({ courses: [], books: [], exams: [], prices: [] }),
    individual && record.meta.personId ? learnerHistory(record.meta.personId) : Promise.resolve(null),
  ]);

  return (
    <OfferPage
      key={`${id}:${record.meta.revision}`}
      record={record}
      options={options}
      priceList={priceList}
      catalogue={catalogue}
      history={history}
      texts={texts}
      today={todayInputValue()}
      canWrite={canAccess(user, 'offers', 'edit')}
      canDelete={canAccess(user, 'offers', 'full')}
      notice={{ ok: sp.ok, error: sp.error }}
    />
  );
}
