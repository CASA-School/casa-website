import { notFound } from 'next/navigation';

import { LetterView } from '@/components/admin/offers/letter-view';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { latestOfferLetterId, sentOfferLetter } from '@/lib/admin/letters/repo';
import { offerBookingHref } from '@/lib/admin/offers/booking-link';
import { editorOptions, getOffer, offerTexts } from '@/lib/admin/offers/repo';
import { todayInputValue } from '@/lib/dates';

/**
 * The offer's letter, full screen. A draft is written on the page itself; an
 * offer that has gone out shows the letter exactly as it was sent
 * (`letters`), `?version=N` an earlier one. docs/LETTERS.md.
 */
export default async function OfferLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; ok?: string; error?: string }>;
}) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireModule('offers')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const record = await getOffer(id);
  if (!record) notFound();

  const asked = Number(sp.version);
  const shownVersion =
    record.meta.version === 0
      ? null
      : Number.isInteger(asked) && asked >= 1 && asked <= record.meta.version
        ? asked
        : record.meta.status === 'draft'
          ? null
          : record.meta.version;
  const [options, texts, sentLetter, letterId] = await Promise.all([
    editorOptions(),
    offerTexts(),
    shownVersion ? sentOfferLetter(id, shownVersion) : Promise.resolve(null),
    canAccess(user, 'offers', 'edit') && record.meta.status !== 'draft' ? latestOfferLetterId(id) : Promise.resolve(null),
  ]);

  return (
    <LetterView
      key={`${id}:${record.meta.revision}:${shownVersion ?? 'draft'}`}
      record={record}
      options={options}
      texts={texts}
      sentLetter={sentLetter}
      shownVersion={shownVersion}
      today={todayInputValue()}
      canWrite={canAccess(user, 'offers', 'edit')}
      canDelete={canAccess(user, 'offers', 'full')}
      canSetStandard={canAccess(user, 'offers', 'full')}
      mailHref={letterId ? `/admin/letters/mail?ids=${letterId}&back=${encodeURIComponent(`/admin/offers/${id}/letter`)}` : null}
      bookHref={canAccess(user, 'bookings', 'edit') && canAccess(user, 'people') ? offerBookingHref({ ...record.meta, draft: record.draft }) : null}
      notice={{ ok: sp.ok, error: sp.error }}
    />
  );
}
