import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { OfferPage } from '@/components/admin/offers/offer-page';
import { Timeline, type TimelineEvent } from '@/components/admin/record-parts';
import { canAccess } from '@/lib/admin/access';
import { activityFor, type ActivityEntry } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import type { T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { offerBookingHref } from '@/lib/admin/offers/booking-link';
import { courseCatalogue, learnerHistory } from '@/lib/admin/offers/course-catalogue';
import { editorOptions, getOffer, offerTexts, priceListOptions, type OfferRecord } from '@/lib/admin/offers/repo';
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
  const { t, lang } = await getI18n();
  const canWrite = canAccess(user, 'offers', 'edit');
  const [options, priceList, texts, catalogue, history, notes, activity] = await Promise.all([
    editorOptions(),
    priceListOptions(lang),
    offerTexts(),
    individual ? courseCatalogue() : Promise.resolve({ courses: [], books: [], exams: [], prices: [] }),
    individual && record.meta.personId ? learnerHistory(record.meta.personId) : Promise.resolve(null),
    listNotes('offer', id),
    activityFor('offer', id),
  ]);
  const own = offerEvents(record, activity, t);
  // An accepted offer to a learner leads to their booking: the person's wizard, at the offer's course.
  const bookHref = canAccess(user, 'bookings', 'edit') && canAccess(user, 'people') ? offerBookingHref({ ...record.meta, draft: record.draft }) : null;

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
      canWrite={canWrite}
      canDelete={canAccess(user, 'offers', 'full')}
      bookHref={bookHref}
      notice={{ ok: sp.ok, error: sp.error }}
      timeline={
        <Timeline
          canWrite={canWrite}
          entity="offer"
          id={id}
          notes={notes}
          activity={own.rest}
          events={own.events}
          origin={origin(record, t)}
        />
      }
    />
  );
}

const link = 'font-semibold text-[var(--casa-blue)] hover:underline';

/**
 * The offer's life in its own words (2026-10-15): each letter sent, as the
 * version it was, and each answer recorded, with the words that came with the
 * latest. The general log says "sent an offer" for the activity feed; on the
 * offer itself that is "sent version 2", so those entries are worded here and
 * the rest pass through as they are.
 */
function offerEvents(record: OfferRecord, activity: readonly ActivityEntry[], t: T) {
  const { meta } = record;
  const someone = t('Jemand', 'Someone');
  const events: TimelineEvent[] = record.letters.map((letter) => ({
    id: letter.id,
    at: letter.sentAt,
    icon: Icon.mail,
    who: letter.sentByName ?? someone,
    what: (
      <>
        {t('hat', 'sent')}{' '}
        <Link href={`/admin/offers/${meta.id}/letter?version=${letter.version}`} className={link}>
          {t(`Fassung ${letter.version}`, `version ${letter.version}`)}
        </Link>
        {t(' gesendet', '')}
      </>
    ),
  }));

  const decisions = activity.filter((entry) => entry.action === 'offer_accepted' || entry.action === 'offer_declined' || entry.action === 'offer_lapsed');
  // The decision's note is stored on the offer and holds for its latest answer only.
  const latest = meta.decidedAt ? decisions[0] : undefined;
  const WORDED: Record<string, { what: string; icon: TimelineEvent['icon']; tone?: 'good' }> = {
    offer_accepted: { what: t('hat es als angenommen erfasst', 'recorded it as accepted'), icon: Icon.check, tone: 'good' },
    offer_declined: { what: t('hat es als abgelehnt erfasst', 'recorded it as declined'), icon: Icon.close },
    offer_withdrawn: { what: t('hat es zurückgezogen', 'withdrew it'), icon: Icon.close },
    offer_lapsed: { what: t('hat es als unbeantwortet geschlossen', 'closed it as unanswered'), icon: Icon.close },
    offer_revised: { what: t('hat es zur Überarbeitung wieder geöffnet', 'reopened it to revise'), icon: Icon.offers },
  };
  for (const entry of activity) {
    const worded = WORDED[entry.action];
    if (!worded) continue;
    events.push({
      id: entry.id,
      at: entry.createdAt,
      icon: worded.icon,
      who: entry.staffName ?? someone,
      what: worded.what,
      tone: worded.tone,
      body: entry === latest && meta.decisionNote ? `„${meta.decisionNote}“` : undefined,
    });
  }

  // Created and sent are the origin and the letters; a copy's origin says what it repeats.
  const covered = new Set(['offer_created', 'offer_sent', 'offer_duplicated', ...Object.keys(WORDED)]);
  return { events, rest: activity.filter((entry) => !covered.has(entry.action)) };
}

/** Where the offer came from: who wrote it, and the enquiry, the learner or the earlier offer behind it. */
function origin(record: OfferRecord, t: T) {
  const { meta, draft } = record;
  const links = [
    meta.enquiryId ? (
      <Link key="enquiry" href={`/admin/enquiries/${meta.enquiryId}`} className={link}>
        {t('Aus einer Anfrage', 'From an enquiry')}
      </Link>
    ) : null,
    meta.personId ? (
      <span key="person">
        {t('Für', 'For')}{' '}
        <Link href={`/admin/people/${meta.personId}`} className={link}>
          {draft.recipientName || t('die Person', 'the person')}
        </Link>
      </span>
    ) : null,
    meta.copiedFrom ? (
      <Link key="copy" href={`/admin/offers/${meta.copiedFrom}`} className={link}>
        {t('Wiederholt ein früheres Angebot', 'Repeats an earlier offer')}
      </Link>
    ) : null,
  ].filter(Boolean);
  return {
    at: meta.createdAt,
    icon: Icon.offers,
    label: meta.createdByName ?? t('Jemand', 'Someone'),
    what: t('hat das Angebot angelegt', 'created the offer'),
    body: links.length ? (
      <span className="flex flex-wrap gap-x-3 gap-y-1">{links}</span>
    ) : undefined,
  };
}
