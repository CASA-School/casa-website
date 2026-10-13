import Link from 'next/link';

import { OfferFrame } from '@/components/admin/offers/frame';
import ui from '@/components/admin/offers/offers.module.css';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { formatDateRange, formatMoney } from '@/lib/admin/letters/format';
import { listOffers, offerCounts, OFFER_FILTERS, type OfferListFilter } from '@/lib/admin/offers/repo';
import { OFFER_STATUS_LABELS } from '@/lib/admin/offers/types';

/**
 * Offers — what is being written, what is out, what came back. Open first:
 * drafts and offers sent without an answer. A sent offer quiet for ten days
 * says "Follow up", one past its validity "Expired" — FileMaker kept neither.
 */

const FILTER_LABELS: Record<OfferListFilter, string> = {
  open: 'Open',
  draft: 'Drafts',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  all: 'All',
};

const eur = (n: number | null) => (n == null ? '—' : formatMoney(n, 'de'));
const short = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; ok?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('offers')]);
  const filter = (OFFER_FILTERS as readonly string[]).includes(params.filter ?? '') ? (params.filter as OfferListFilter) : 'open';
  const q = params.q?.slice(0, 80) ?? '';
  const [offers, counts] = await Promise.all([listOffers({ filter, q }), offerCounts()]);
  const canWrite = canAccess(user, 'offers', 'edit');
  const href = (f: OfferListFilter) => `/admin/offers${f === 'open' ? '' : `?filter=${f}`}`;
  const chase = offers.filter((o) => o.followUp).length;

  return (
    <OfferFrame
      back={{ href: '/admin', label: 'Workspace' }}
      title="Offers"
      right={
        canWrite ? (
          <Link href="/admin/offers/new" className={ui.primary}>
            New offer
          </Link>
        ) : null
      }
    >
      <main className={ui.page}>
        <div className={ui.listHead}>
          <div style={{ flex: 1 }}>
            <h1 className={ui.pageTitle}>Offers</h1>
            <div className={ui.subtitle}>
              {counts.open} open{chase ? ` · ${chase} to follow up` : ''}
              {params.ok === 'deleted' ? ' · The offer was deleted' : ''}
            </div>
          </div>
          <form action="/admin/offers" role="search">
            {filter !== 'open' ? <input type="hidden" name="filter" value={filter} /> : null}
            <input name="q" defaultValue={q} placeholder="Search" aria-label="Search offers" className={ui.search} />
          </form>
        </div>

        <nav className={ui.filters} aria-label="Which offers">
          {OFFER_FILTERS.map((f) => (
            <Link key={f} href={href(f)} aria-current={f === filter ? 'page' : undefined} className={`${ui.filter} ${f === filter ? ui.filterOn : ''}`}>
              {FILTER_LABELS[f]} <b>{counts[f]}</b>
            </Link>
          ))}
        </nav>

        <section className={ui.card} style={{ marginTop: 14 }}>
          {offers.length === 0 ? (
            <div className={ui.emptyList}>
              <b>{q ? 'Nothing found' : filter === 'open' ? 'Nothing open' : 'No offers here'}</b>
              {q ? `No offer matches “${q}”.` : null}
            </div>
          ) : (
            <>
              <div className={ui.listCols}>
                <span>No.</span>
                <span>Offer</span>
                <span>Dates and group</span>
                <span style={{ textAlign: 'right' }}>Per person</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span>Status</span>
              </div>
              {offers.map((o) => (
                <Link key={o.id} href={`/admin/offers/${o.id}`} className={ui.listRow}>
                  <span className={ui.listNo}>{o.number}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={ui.listTitle}>{o.groupName || o.recipientName || 'Untitled'}</span>
                    <span className={ui.listSub}>{[o.groupName ? o.recipientName : null, o.title].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className={ui.listSub} style={{ color: 'var(--o-ink2)' }}>
                      {o.arrival && o.departure
                        ? formatDateRange(o.arrival, o.departure, 'de')
                        : o.course?.start && o.course.end
                          ? formatDateRange(o.course.start, o.course.end, 'de')
                          : o.kind === 'group' || o.course
                            ? 'No dates yet'
                            : 'Lines from the price list'}
                    </span>
                    {o.course?.slot ? <span className={ui.listSub}>{o.course.slot}</span> : null}
                    {o.kind === 'group' && o.participants ? (
                      <span className={ui.listSub}>
                        {o.participants} participants{o.escorts ? ` · ${o.escorts} ${o.escorts === 1 ? 'escort' : 'escorts'}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className={ui.listMoney}>{o.kind === 'group' ? eur(o.perParticipant) : ''}</span>
                  <span className={ui.listMoney}>{eur(o.groupTotal)}</span>
                  <span className={ui.listStatus}>
                    <span className={`${ui.pill} ${ui[`pill_${o.status}`]}`}>{OFFER_STATUS_LABELS[o.status]}</span>
                    {o.followUp ? (
                      <span className={o.followUp === 'expired' ? ui.expired : ui.chase}>{o.followUp === 'expired' ? 'Expired' : 'Follow up'}</span>
                    ) : (
                      <span className={ui.listSub}>{o.sentAt ? `Sent ${short(o.sentAt)}` : `${o.ownerName ?? ''} · ${short(o.updatedAt)}`}</span>
                    )}
                  </span>
                </Link>
              ))}
            </>
          )}
        </section>
      </main>
    </OfferFrame>
  );
}
