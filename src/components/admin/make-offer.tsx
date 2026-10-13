import Link from 'next/link';

import { createOfferAction } from '@/app/(admin)/admin/(editor)/offers/actions';
import type { OfferKind, OfferLanguage, OfferStatus } from '@/lib/admin/offers/types';

import { Button } from './ui';

const secondary =
  'inline-flex h-9 shrink-0 items-center rounded-lg border border-ws-line-firm bg-white px-4 text-sm font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]';

/**
 * "Make an offer" on a record an offer starts from — an enquiry, a student —
 * and the latest offer already made from it. A plain form: the action creates
 * the offer, fills it from the record and opens it.
 */
export function MakeOffer({
  kind,
  language,
  enquiryId,
  personId,
  existing,
}: {
  kind: OfferKind;
  language: OfferLanguage;
  enquiryId?: string;
  personId?: string;
  existing: { id: string; number: string; status: OfferStatus }[];
}) {
  const latest = existing[0];
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {latest ? (
        <Link href={`/admin/offers/${latest.id}`} className={secondary}>
          Offer {latest.number}
        </Link>
      ) : null}
      <form action={createOfferAction}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="language" value={language} />
        {enquiryId ? <input type="hidden" name="enquiryId" value={enquiryId} /> : null}
        {personId ? <input type="hidden" name="personId" value={personId} /> : null}
        <Button type="submit" variant="secondary">
          {latest ? 'New offer' : 'Make an offer'}
        </Button>
      </form>
    </span>
  );
}
