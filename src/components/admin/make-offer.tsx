import { getI18n } from '@/lib/admin/i18n.server';
import type { OfferStatus } from '@/lib/admin/offers/types';

import { ButtonLink } from './ui';

/**
 * "Make an offer" on a record an offer starts from — an enquiry, a learner —
 * and the latest offer already made from it. It opens the new offer's wizard
 * with the record filled in: the recipient, and for a group enquiry its brief.
 */
export async function MakeOffer({
  from,
  existing,
}: {
  from: { enquiryId: string } | { personId: string };
  existing: { id: string; number: string; status: OfferStatus }[];
}) {
  const { t } = await getI18n();
  const latest = existing[0];
  const href = 'enquiryId' in from ? `/admin/offers/new?enquiry=${from.enquiryId}` : `/admin/offers/new?person=${from.personId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {latest ? (
        <ButtonLink href={`/admin/offers/${latest.id}`}>{t(`Angebot ${latest.number}`, `Offer ${latest.number}`)}</ButtonLink>
      ) : null}
      <ButtonLink href={href}>{latest ? t('Neues Angebot', 'New offer') : t('Angebot erstellen', 'Make an offer')}</ButtonLink>
    </span>
  );
}
