import Link from 'next/link';

import type { OfferStatus } from '@/lib/admin/offers/types';

const secondary =
  'inline-flex h-9 shrink-0 items-center rounded-lg border border-ws-line-firm bg-white px-4 text-sm font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]';

/**
 * "Make an offer" on a record an offer starts from — an enquiry, a learner —
 * and the latest offer already made from it. It opens the new offer's wizard
 * with the record filled in: the recipient, and for a group enquiry its brief.
 */
export function MakeOffer({
  from,
  existing,
}: {
  from: { enquiryId: string } | { personId: string };
  existing: { id: string; number: string; status: OfferStatus }[];
}) {
  const latest = existing[0];
  const href = 'enquiryId' in from ? `/admin/offers/new?enquiry=${from.enquiryId}` : `/admin/offers/new?person=${from.personId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {latest ? (
        <Link href={`/admin/offers/${latest.id}`} className={secondary}>
          Offer {latest.number}
        </Link>
      ) : null}
      <Link href={href} className={secondary}>
        {latest ? 'New offer' : 'Make an offer'}
      </Link>
    </span>
  );
}
