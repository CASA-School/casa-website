import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { unlinkPersonAction } from '../../actions';
import { deletePersonAction, removeBankAccountAction } from '../actions';
import { AddressForm, BankAccountForm, PersonForm } from '../person-form';
import { BookingWizard } from '../../bookings/booking-wizard';
import { createBookingFromWizardAction, waitlistFromWizardAction } from '../../bookings/actions';
import { RecordFoot } from '../../bookings/record-foot';
import { courseNameResolver } from '../../registrations/course-names';
import { optionLine } from '../../registrations/option-label';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MakeOffer } from '@/components/admin/make-offer';
import { MetaItem, MetaLine, Stat, StatBar, StatePill, Timeline } from '@/components/admin/record-parts';
import { RecordTabLink, RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, BirthDate, Button, Card, DateText, DetailList, IconChip, RecordHeader, type BadgeTone, type Tint } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { BOOKING_LIGHT_LABELS, bookingLight, OBSERVATION_REASON_LABELS, personBookings, type BookingListItem } from '@/lib/admin/bookings';
import { BookingLightPill } from '@/components/admin/booking-light';
import { listFileMakerLinks } from '@/lib/admin/filemaker-links';
import { FLAG_LABELS, listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { counted, dayRange, num, pick, translator, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { personOffers } from '@/lib/admin/offers/repo';
import { OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/admin/offers/types';
import {
  getPerson,
  latestConfirmedLevel,
  LEARNER_STAGE_LABELS,
  learnerStage,
  listBankAccounts,
  listCountries,
  personTimeline,
  type Address,
  type AddressKind,
  type LearnerStage,
  type TimelineItem,
} from '@/lib/admin/people';
import { normaliseStatus } from '@/lib/admin/queues';
import { personEntries, WAITLIST_STATUS_LABELS } from '@/lib/admin/waitlist';
import { personExamEntries } from '@/lib/admin/exams';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForPerson } from '@/lib/admin/letters/repo';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { toDateInputValue } from '@/lib/dates';
import { teachingWeeks } from '@/lib/admin/offers/course';
import { cn } from '@/lib/utils';

const SALUTATIONS: Record<string, Bilingual> = {
  mr: { de: 'Herr', en: 'Mr' },
  ms: { de: 'Frau', en: 'Ms' },
  mx: { de: 'Mx', en: 'Mx' },
  neutral: { de: 'Keine Anrede', en: 'No salutation' },
};

type CaseKind = TimelineItem['kind'] | 'offer' | 'booking' | 'waitlist';

/** What each kind of case is, and its meaning colour. */
const KINDS: Record<CaseKind, { label: Bilingual; icon: ReactNode; tint: Tint }> = {
  enquiry: { label: { de: 'Anfrage', en: 'Enquiry' }, icon: Icon.enquiries, tint: 'blue' },
  course: { label: { de: 'Kursanmeldung', en: 'Course registration' }, icon: Icon.registrations, tint: 'red' },
  exam: { label: { de: 'Prüfungsanmeldung', en: 'Exam registration' }, icon: Icon.registrations, tint: 'red' },
  review: { label: { de: 'Einstufung', en: 'Placement' }, icon: Icon.placement, tint: 'green' },
  offer: { label: { de: 'Angebot', en: 'Offer' }, icon: Icon.offers, tint: 'sun' },
  booking: { label: { de: 'Buchung', en: 'Booking' }, icon: Icon.bookings, tint: 'sun' },
  waitlist: { label: { de: 'Warteliste', en: 'Waiting list' }, icon: Icon.clock, tint: 'blue' },
};

const OFFER_TONES: Record<OfferStatus, BadgeTone> = {
  draft: 'neutral',
  sent: 'accent',
  accepted: 'positive',
  declined: 'quiet',
  withdrawn: 'quiet',
};

/** Where a learner stands, as a badge in the head: the new and the last course stand out. */
const STAGE_TONES: Record<LearnerStage, 'accent' | 'neutral' | 'positive' | 'quiet' | 'warning'> = {
  new: 'accent',
  in_course: 'positive',
  last: 'warning',
  coming: 'neutral',
  finished: 'quiet',
};

/** One thing under this person's name: a registration, an offer, a booking. */
type Case = {
  key: string;
  kind: CaseKind;
  title: string;
  detail: string | null;
  at: Date;
  href: string;
  open: boolean;
  state: ReactNode;
  /** A booking's balance, on the right. */
  amount?: ReactNode;
};

/** How the record came to be, as the first entry of its history. */
function origin(t: T, createdBy: string, label: string): string {
  if (createdBy === 'public-site') return t('Über die Website gekommen', 'Came through the website');
  if (createdBy.startsWith('migration-')) return t('Importiert', 'Imported');
  if (createdBy === 'demo-seed') return t('Angelegt', 'Added');
  return t(`Angelegt von ${label}`, `Added by ${label}`);
}

const euros = (lang: WsLang, value: number, currency = 'EUR') =>
  new Intl.NumberFormat(wsLocale(lang), { style: 'currency', currency }).format(value);

/**
 * One person — the hub every enquiry, registration, offer and booking leads to
 * (2026-10-15: "start with the person page"). In the inbox records' one design:
 *
 * The head names them and how to reach them, and its bar answers the first
 * questions about anyone: which level a teacher confirmed, what they have
 * booked, what they still owe, what is open. The second tab is everything under
 * their name in one list — enquiries, registrations, placement results, offers,
 * bookings — the open ones first, each with where it stands. A registration on
 * its own says "someone wants a B1 course"; the same registration under a person
 * who enquired twice, sat a placement and was confirmed A2.2 says something quite
 * different, and staff should not have to search five lists to find that out.
 *
 * In tabs under the head (2026-10-16, `record-tabs.tsx`), named in the team's
 * words: Übersicht — the course now or next, what else is open, the last closed,
 * anything to check, the notes; Anfragen & Buchungen — all of it; Persönliche
 * Daten — person, contact, addresses, the record and the records linked into it;
 * Bankverbindung — for a refund (module `private_data`, which the team holds).
 *
 * If this row was linked INTO another, `getPerson` follows `merged_into` and
 * the page renders the survivor. The rows linked into THIS one are listed with
 * an undo, because a wrong link is the one identity mistake that must stay cheap
 * to reverse.
 */
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const [{ id }, { error, tab }, user] = await Promise.all([params, searchParams, requireModule('people')]);
  const person = await getPerson(id);

  if (!person) {
    notFound();
  }
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'people', 'edit');
  const canBook = canAccess(user, 'bookings', 'edit');
  const seesBookings = canAccess(user, 'bookings');
  const seesOffers = canAccess(user, 'offers');
  const canOffer = canAccess(user, 'offers', 'edit');
  const canDelete = canAccess(user, 'people', 'full');
  // Bank accounts: the module `private_data`, which the team holds (removing one is `full`).
  const seesBank = canAccess(user, 'private_data');
  const editsBank = canAccess(user, 'private_data', 'edit');
  const removesBank = canAccess(user, 'private_data', 'full');
  const [timeline, confirmed, flags, activity, notes, fileMakerLinks, countries, bookings, offer, offers, courseName, stage, bankAccounts, waits, allLetters, examWaits] = await Promise.all([
    personTimeline(person.id, lang),
    latestConfirmedLevel(person.id),
    listFlags('person', person.id),
    activityFor('person', person.id),
    listNotes('person', person.id),
    listFileMakerLinks('person', person.id),
    canEdit ? listCountries() : Promise.resolve([]),
    seesBookings ? personBookings(person.id) : Promise.resolve([]),
    canBook ? bookingOffer() : Promise.resolve(null),
    seesOffers ? personOffers(person.id) : Promise.resolve([]),
    courseNameResolver(),
    seesBookings ? learnerStage(person.id) : Promise.resolve(null),
    seesBank ? listBankAccounts(person.id) : Promise.resolve(null),
    seesBookings ? personEntries(person.id) : Promise.resolve([]),
    seesBookings || seesOffers ? lettersForPerson(person.id) : Promise.resolve([]),
    seesBookings ? personExamEntries(person.id) : Promise.resolve([]),
  ]);
  // The letters this colleague may open: an offer's with `offers`, a registration's with
  // `registrations`, the others with `bookings`.
  const seesRegistrations = canAccess(user, 'registrations');
  const letters = allLetters.filter((l) => (l.kind === 'offer' ? seesOffers : l.kind.startsWith('registration_') ? seesRegistrations : seesBookings));

  const email = person.emails.find((e) => e.isPrimary) ?? person.emails[0];
  const phone = person.phones.find((p) => p.isPrimary) ?? person.phones[0];
  const openFlags = flags.filter((f) => !f.resolvedAt);
  const came = origin(t, person.createdBy, pick(lang, person.createdByLabel));
  const since = person.createdAt.toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric' });

  // Everything under their name as one list, the open cases first.
  const cases: Case[] = [
    ...timeline.map((item): Case => {
      const status = item.status ? normaliseStatus(item.status) : null;
      const title = item.kind === 'course' ? (courseName(item.title) ?? item.title) : item.title;
      const detail = item.kind === 'course' || item.kind === 'exam' ? optionLine(item.detail, item.kind, lang) : item.detail;
      return {
        key: `${item.kind}-${item.id}`,
        kind: item.kind,
        title,
        detail,
        at: item.at,
        href: item.href,
        open: status === 'new' || status === 'in_progress' || status === 'waiting',
        state: status ? <StatePill status={status} lang={lang} /> : null,
      };
    }),
    ...offers.map(
      (o): Case => ({
        key: `offer-${o.id}`,
        kind: 'offer',
        title: `${o.title || t('Angebot', 'Offer')} · ${o.number}`,
        detail: o.arrival && o.departure ? dayRange(toDateInputValue(o.arrival), toDateInputValue(o.departure), lang) : null,
        at: o.createdAt,
        href: `/admin/offers/${o.id}`,
        open: o.status === 'draft' || o.status === 'sent',
        state: <Badge tone={OFFER_TONES[o.status]}>{pick(lang, OFFER_STATUS_LABELS[o.status])}</Badge>,
      })
    ),
    ...bookings.map((b): Case => {
      const balance = b.charged - b.paid;
      return {
        key: `booking-${b.id}`,
        kind: 'booking',
        title: b.courseTypeName ?? t('Buchung', 'Booking'),
        detail: [b.number, b.startDate && b.endDate ? dayRange(toDateInputValue(b.startDate), toDateInputValue(b.endDate), lang) : t('Keine Daten', 'No dates')].join(' · '),
        at: b.createdAt,
        href: `/admin/bookings/${b.id}`,
        open: b.status === 'reserved' || b.status === 'confirmed' || balance > 0,
        // The booking's colour, as on its own page: red, yellow with the reason, grey until paid, green.
        state: (
          <BookingLightPill
            light={bookingLight(b)}
            label={pick(lang, BOOKING_LIGHT_LABELS[bookingLight(b)])}
            detail={b.observationReason && b.status !== 'cancelled' ? pick(lang, OBSERVATION_REASON_LABELS[b.observationReason]) : undefined}
          />
        ),
        amount:
          b.status === 'cancelled' ? null : balance > 0 ? (
            <span className="text-right">
              <span className="block text-[0.86rem] font-bold text-[#9a5b00] tabular-nums">{euros(lang, balance, b.currency)}</span>
              <span className="block text-[0.72rem] text-[var(--casa-muted)]">{t('offen', 'open')}</span>
            </span>
          ) : (
            <span className="text-right">
              <span className="block text-[0.86rem] font-bold text-[#17693a] tabular-nums">{euros(lang, b.charged, b.currency)}</span>
              <span className="block text-[0.72rem] text-[var(--casa-muted)]">{t('bezahlt', 'paid')}</span>
            </span>
          ),
      };
    }),
    // Their places in waiting lists: the queue's course and level, and where they stand in it.
    ...waits.map(
      (w): Case => ({
        key: `waitlist-${w.id}`,
        kind: 'waitlist',
        title: `${w.courseTypeName} · ${w.levelCode}`,
        detail: [
          w.session ? pick(lang, SESSION_LABELS[w.session]) : null,
          `${t('ab', 'from')} ${new Date(w.startDate).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })}`,
        ]
          .filter(Boolean)
          .join(' · '),
        at: w.joinedAt,
        href: `/admin/catalogue/${w.courseInstanceId}?level=${encodeURIComponent(w.levelCode)}`,
        open: w.status === 'waiting' || w.status === 'offered',
        state:
          w.status === 'waiting' ? (
            <Badge tone="accent">{t(`Platz ${w.position}`, `Place ${w.position}`)}</Badge>
          ) : (
            <Badge tone={w.status === 'offered' ? 'positive' : w.status === 'booked' ? 'positive' : 'quiet'}>{pick(lang, WAITLIST_STATUS_LABELS[w.status])}</Badge>
          ),
      })
    ),
    // Their places in an exam sitting's queue (0036).
    ...examWaits.map(
      (w): Case => ({
        key: `waitlist-${w.id}`,
        kind: 'waitlist',
        title: w.examName,
        detail: new Date(w.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        at: w.joinedAt,
        href: `/admin/catalogue/exams/${w.examSessionId}`,
        open: w.status === 'waiting' || w.status === 'offered',
        state:
          w.status === 'waiting' ? (
            <Badge tone="accent">{t(`Platz ${w.position}`, `Place ${w.position}`)}</Badge>
          ) : (
            <Badge tone={w.status === 'offered' || w.status === 'booked' ? 'positive' : 'quiet'}>{pick(lang, WAITLIST_STATUS_LABELS[w.status])}</Badge>
          ),
      })
    ),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const openCases = cases.filter((c) => c.open);
  const pastCases = cases.filter((c) => !c.open);

  const owed = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + Math.max(0, b.charged - b.paid), 0);
  const running = bookings.filter((b) => b.status === 'reserved' || b.status === 'confirmed').length;

  // The course they are in, or the next one: the first thing anyone asks about a learner.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // A course: an exam booking is a day, and shows among the open cases instead.
  const dated = bookings.filter((b) => !b.examSessionId && b.status !== 'cancelled' && b.startDate && b.endDate);
  const current = dated.find((b) => b.startDate! <= today && b.endDate! >= today) ?? null;
  const next = current ? null : (dated.filter((b) => b.startDate! > today).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())[0] ?? null);
  const spotlight = current ?? next;
  const overviewOpen = openCases.filter((c) => c.key !== `booking-${spotlight?.id}`);
  const recent = pastCases.slice(0, 3);

  const personDialog = (variant: 'secondary' | 'ghost') =>
    canEdit ? (
      <FormDialog trigger={t('Bearbeiten', 'Edit')} title={person.displayName} width="lg" triggerVariant={variant} size={variant === 'ghost' ? 'sm' : undefined}>
        <PersonForm person={person} countries={countries} />
      </FormDialog>
    ) : null;

  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    { id: 'cases', label: t('Anfragen & Buchungen', 'Enquiries & bookings'), icon: Icon.registrations, count: cases.length },
    { id: 'details', label: t('Persönliche Daten', 'Personal details'), icon: Icon.person },
    ...(seesBookings || seesOffers ? [{ id: 'letters', label: t('Briefe', 'Letters'), icon: Icon.mail, count: letters.length }] : []),
    ...(bankAccounts ? [{ id: 'bank', label: t('Bankverbindung', 'Bank details'), icon: Icon.money }] : []),
  ];
  // What is open, in the team's words: „1 Anmeldung · 1 Buchung".
  const OPEN_WORDS: Record<'enquiry' | 'registration' | 'review' | 'offer' | 'booking' | 'waitlist', [string, string]> = {
    enquiry: [t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries')],
    registration: [t('Anmeldung', 'registration'), t('Anmeldungen', 'registrations')],
    review: [t('Einstufung', 'placement'), t('Einstufungen', 'placements')],
    offer: [t('Angebot', 'offer'), t('Angebote', 'offers')],
    booking: [t('Buchung', 'booking'), t('Buchungen', 'bookings')],
    waitlist: [t('Warteliste', 'waiting list'), t('Wartelisten', 'waiting lists')],
  };
  const openSummary = (Object.keys(OPEN_WORDS) as (keyof typeof OPEN_WORDS)[])
    .map((word) => {
      const n = openCases.filter((c) => (c.kind === 'course' || c.kind === 'exam' ? 'registration' : c.kind) === word).length;
      return n ? counted(lang, n, ...OPEN_WORDS[word]) : null;
    })
    .filter(Boolean)
    .join(' · ');

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/people"
        backLabel={t('Teilnehmende', 'Students')}
        title={person.displayName}
        avatar={person.displayName}
        status={
          stage || openFlags.length ? (
            <>
              {stage ? <Badge tone={STAGE_TONES[stage]}>{pick(lang, LEARNER_STAGE_LABELS[stage])}</Badge> : null}
              {openFlags.length ? <Badge tone="warning">{t('Zu prüfen', 'Needs a look')}</Badge> : null}
            </>
          ) : null
        }
        subtitle={
          <>
            <span className="block text-[0.9rem] text-[var(--casa-muted)]">
              {person.id !== id
                ? t('Über einen verknüpften Datensatz geöffnet', 'Opened from a linked record')
                : t(`Bei CASA seit ${since}`, `With CASA since ${since}`)}
            </span>
            <MetaLine>
              {email ? (
                <MetaItem icon={Icon.mail}>
                  <a href={`mailto:${email.address}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {email.address}
                  </a>
                </MetaItem>
              ) : null}
              {phone ? (
                <MetaItem icon={Icon.phone}>
                  <a href={`tel:${phone.number}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {phone.number}
                  </a>
                </MetaItem>
              ) : null}
              {person.nationalityName || person.nationalityRaw ? (
                <MetaItem icon={Icon.globe}>{person.nationalityName ?? person.nationalityRaw}</MetaItem>
              ) : null}
              {person.birthDate ? (
                <MetaItem icon={Icon.calendar}>
                  {t('Geboren', 'Born')} <BirthDate value={person.birthDate} />
                </MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        actions={
          <>
            {personDialog('secondary')}
            {canOffer ? <MakeOffer from={{ personId: person.id }} existing={offers} /> : null}
            {canBook && offer ? (
              <FormDialog trigger={t('Neue Buchung', 'New booking')} title={t(`${person.displayName} buchen`, `Book ${person.displayName}`)} triggerVariant="primary" width="lg">
                <BookingWizard personId={person.id} personName={person.displayName} offer={offer} returnTo={`/admin/people/${person.id}`} action={createBookingFromWizardAction} waitlistAction={waitlistFromWizardAction} />
              </FormDialog>
            ) : null}
          </>
        }
        bar={
          <StatBar>
            <Stat label={t('Niveau', 'Level')}>
              {confirmed ? (
                <span title={`${confirmed.reviewerName ?? t('Ehemaliges Teammitglied', 'A former colleague')}`}>
                  {confirmed.level} <span className="text-[0.78rem] font-semibold text-[#17693a]">{t('bestätigt', 'confirmed')}</span>
                </span>
              ) : (
                <span className="font-semibold text-[var(--casa-muted)]">{t('nicht bestätigt', 'not confirmed')}</span>
              )}
            </Stat>
            {seesBookings ? (
              <Stat label={t('Buchungen', 'Bookings')}>
                {bookings.length ? (
                  <>
                    {num(lang, bookings.length)}
                    {running ? <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, running)} laufend`, `${num(lang, running)} current`)}</span> : null}
                  </>
                ) : (
                  <span className="font-semibold text-[var(--casa-muted)]">{t('keine', 'none')}</span>
                )}
              </Stat>
            ) : null}
            {seesBookings && bookings.length ? (
              <Stat label={t('Zu zahlen', 'Owed')}>
                {owed > 0 ? <span className="text-[#9a5b00]">{euros(lang, owed)}</span> : <span className="text-[#17693a]">{t('Alles bezahlt', 'All paid')}</span>}
              </Stat>
            ) : null}
            <Stat label={t('Offen', 'Open')}>
              {openSummary ? <span>{openSummary}</span> : <span className="font-semibold text-[var(--casa-muted)]">{t('nichts', 'nothing')}</span>}
            </Stat>
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${person.displayName}: Bereiche`, `${person.displayName}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      {/* What a colleague needs first: the course now, what is open, the notes. */}
      <RecordTabPanel id="overview">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            {spotlight ? <CourseNow booking={spotlight} running={spotlight === current} today={today} lang={lang} /> : null}
            {/* The course above is already open; „nothing open" only when nothing at all is. */}
            {overviewOpen.length || !spotlight ? (
              <Card title={t('Offen', 'Open')} icon={Icon.registrations} tint="blue" bleed>
                {overviewOpen.length ? (
                  <CaseRows cases={overviewOpen} lang={lang} />
                ) : (
                  <p className="px-4 py-4 text-sm text-[var(--casa-muted)]">{t('Nichts offen.', 'Nothing open.')}</p>
                )}
              </Card>
            ) : null}
            {recent.length ? (
              <Card
                title={t('Zuletzt abgeschlossen', 'Recently closed')}
                icon={Icon.check}
                tint="ink"
                bleed
                actions={
                  pastCases.length > recent.length ? (
                    <RecordTabLink to="cases">
                      {t('Alle anzeigen', 'Show all')} {Icon.chevronRight}
                    </RecordTabLink>
                  ) : undefined
                }
              >
                <CaseRows cases={recent} lang={lang} quiet />
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            {openFlags.length > 0 ? (
              <Card title={t('Zu prüfen', 'Needs a look')} icon={Icon.flag} tint="sun">
                <ul className="space-y-2">
                  {openFlags.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 rounded-xl bg-[#fff8e6] px-3 py-2 text-sm font-semibold ring-1 ring-[#efdca4] ring-inset">
                      <span className="text-[#9a5b00]">{Icon.flag}</span>
                      {pick(lang, FLAG_LABELS[f.code])}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
            <Timeline
              canWrite={canEdit}
              entity="person"
              id={person.id}
              notes={notes}
              activity={activity.filter((entry) => entry.action !== 'person_created')}
              origin={{ at: person.createdAt, label: came, icon: Icon.person }}
            />
          </div>
        </div>
      </RecordTabPanel>

      {/* Everything under their name: enquiries, registrations, placement results, offers, bookings. */}
      <RecordTabPanel id="cases">
        <Card>
          {cases.length ? (
            <div className="-mx-4 -my-4">
              {openCases.length ? <CaseGroup label={t('Offen', 'Open')} cases={openCases} lang={lang} /> : null}
              {pastCases.length ? <CaseGroup label={t('Abgeschlossen', 'Closed')} cases={pastCases} lang={lang} quiet /> : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--casa-muted)]">{t('Noch keine Anfragen oder Buchungen.', 'No enquiries or bookings yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {/* Who they are, how to reach them, where they live, where the record came from. */}
      <RecordTabPanel id="details">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <Card title={t('Person', 'Person')} icon={Icon.person} tint="ink" actions={personDialog('ghost')}>
              <DetailList
                items={[
                  ...(person.salutation && SALUTATIONS[person.salutation] ? [{ label: t('Anrede', 'Salutation'), value: pick(lang, SALUTATIONS[person.salutation]) }] : []),
                  ...(person.facts.nickname ? [{ label: t('Rufname', 'Nickname'), value: person.facts.nickname }] : []),
                  ...(person.facts.secondLastName ? [{ label: t('Zweiter Nachname', 'Second surname'), value: person.facts.secondLastName }] : []),
                  {
                    label: t('Geburtsdatum', 'Date of birth'),
                    value: person.birthDate ? <BirthDate value={person.birthDate} /> : person.facts.birthYear ? t(`${person.facts.birthYear} (nur das Jahr)`, `${person.facts.birthYear} (year only)`) : null,
                  },
                  { label: t('Geburtsort', 'Place of birth'), value: person.facts.birthPlace },
                  { label: t('Geburtsland', 'Country of birth'), value: person.facts.birthCountryName },
                  {
                    label: t('Nationalität', 'Nationality'),
                    value:
                      person.nationalityName ??
                      (person.nationalityRaw ? (
                        <span className="flex items-center gap-2">
                          {person.nationalityRaw}
                          <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge>
                        </span>
                      ) : null),
                  },
                  { label: t('Muttersprache', 'Mother tongue'), value: person.facts.motherTongue },
                  { label: t('Beruf', 'Occupation'), value: person.facts.occupation },
                  { label: t('Passnummer', 'Passport number'), value: person.facts.passportNumber },
                ]}
              />
            </Card>
            <Card title={t('Kontakt', 'Contact')} icon={Icon.mail} tint="blue">
              <DetailList
                items={[
                  {
                    label: t('E-Mail', 'Email'),
                    wide: true,
                    value: person.emails.length ? (
                      <ul className="space-y-0.5">
                        {person.emails.map((e) => (
                          <li key={e.address} className="truncate">
                            <a href={`mailto:${e.address}`} className="font-medium hover:underline">
                              {e.address}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null,
                  },
                  {
                    label: t('Telefon', 'Phone'),
                    wide: true,
                    value: person.phones.length ? (
                      <ul className="space-y-0.5">
                        {person.phones.map((p) => (
                          <li key={p.number}>
                            <a href={`tel:${p.number}`} className="font-medium hover:underline">
                              {p.number}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null,
                  },
                ]}
              />
            </Card>
          </div>

          <div className="space-y-4">
            {/* Where they live: at home, and in Bremen while here. Letters go to the Bremen one first. */}
            <Card title={t('Adressen', 'Addresses')} icon={Icon.rooms} tint="ink">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {(['local', 'home'] as const).map((kind: AddressKind) => {
                  const address = person.addresses.find((a) => a.kind === kind);
                  return (
                    <li key={kind} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="min-w-0 text-sm">
                        <span className="block text-xs font-medium text-[var(--casa-muted)]">{kind === 'local' ? t('In Bremen', 'In Bremen') : t('Zuhause', 'At home')}</span>
                        {address ? <AddressLines address={address} /> : <span className="block text-[var(--casa-text-subtle)]">—</span>}
                      </span>
                      {canEdit ? (
                        <FormDialog
                          trigger={address ? t('Ändern', 'Change') : t('Hinzufügen', 'Add')}
                          title={kind === 'local' ? t('Adresse in Bremen', 'Address in Bremen') : t('Adresse zuhause', 'Home address')}
                          triggerVariant="ghost"
                          size="sm"
                        >
                          <AddressForm personId={person.id} kind={kind} address={address} countries={countries} />
                        </FormDialog>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card title={t('Datensatz', 'Record')} icon={Icon.note} tint="ink">
              <DetailList
                items={[
                  { label: t('Angelegt', 'Created'), value: <DateText value={person.createdAt} /> },
                  { label: t('Herkunft', 'Source'), value: came },
                  ...(fileMakerLinks.length
                    ? [
                        {
                          label: 'FileMaker',
                          wide: true,
                          value: (
                            <ul className="space-y-0.5 text-sm">
                              {fileMakerLinks.map((link) => (
                                <li key={link.id}>
                                  {link.sourceLayout}{' '}
                                  <span className="font-mono text-xs text-[var(--casa-muted)]">{link.sourcePrimaryKey ?? `#${link.sourceRecordId}`}</span>
                                </li>
                              ))}
                            </ul>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
              {person.linkedDuplicates.length > 0 ? (
                <div className="mt-4 border-t border-ws-line-soft pt-3">
                  <span className="text-xs font-medium text-[var(--casa-muted)]">{t('Verknüpfte Datensätze', 'Linked records')}</span>
                  <ul className="mt-1 divide-y divide-ws-line-soft">
                    {person.linkedDuplicates.map((dup) => (
                      <li key={dup.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 text-sm">
                          <span className="block font-semibold">{dup.displayName}</span>
                          <span className="block text-xs text-[var(--casa-muted)]">
                            {t('Angelegt', 'Created')} <DateText value={dup.createdAt} /> · {dup.createdBy}
                          </span>
                        </span>
                        <form action={unlinkPersonAction}>
                          <input type="hidden" name="personId" value={dup.id} />
                          <input type="hidden" name="returnTo" value={`/admin/people/${person.id}`} />
                          <Button type="submit" variant="ghost" size="sm">
                            {t('Trennen', 'Unlink')}
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </RecordTabPanel>

      {/* Every letter sent to them — offers, confirmations, receipts, waiting-list letters — as it went out. */}
      {seesBookings || seesOffers ? (
        <RecordTabPanel id="letters">
          <Card
            bleed
            title={t('Briefe', 'Letters')}
            icon={Icon.mail}
            tint="blue"
            actions={
              canBook && bookings.length ? (
                <Link href={`/admin/people/${person.id}/letter`} className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                  {t('Bestätigung mehrerer Buchungen', 'Confirm several bookings')}
                </Link>
              ) : undefined
            }
          >
            {letters.length ? (
              <ul className="py-1.5">
                {letters.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/letters/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
                      <IconChip icon={Icon.mail} tint="blue" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{l.subject}</span>
                        <span className="mt-0.5 block text-[0.78rem] text-[var(--casa-muted)]">
                          {pick(lang, LETTER_KIND_LABELS[l.kind])}
                          {l.sentByName ? ` · ${l.sentByName}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.76rem] text-[var(--casa-muted)] tabular-nums">
                        <DateText value={l.sentAt} compact />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-[var(--casa-muted)]">{t('Noch kein Brief an diese Person.', 'No letter to this person yet.')}</p>
            )}
          </Card>
        </RecordTabPanel>
      ) : null}

      {/* For a refund: the learner's bank accounts. Shown with the module `private_data`, which the team holds. */}
      {bankAccounts ? (
        <RecordTabPanel id="bank">
          <Card
            title={t('Bankverbindungen', 'Bank accounts')}
            icon={Icon.money}
            tint="green"
            actions={
              editsBank ? (
                <FormDialog trigger={t('Konto hinzufügen', 'Add account')} title={t('Bankverbindung hinzufügen', 'Add a bank account')} triggerVariant="secondary" size="sm">
                  <BankAccountForm personId={person.id} holder={person.displayName} />
                </FormDialog>
              ) : undefined
            }
          >
            {bankAccounts.length ? (
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {bankAccounts.map((account) => (
                  <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="min-w-0 text-sm">
                      <span className="block font-mono text-[0.9rem] font-semibold tracking-[0.02em]">{account.iban.replace(/(.{4})/g, '$1 ').trim()}</span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">{[account.holder, account.bankName, account.bic, account.note].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {editsBank ? (
                        <FormDialog trigger={t('Ändern', 'Change')} title={t('Bankverbindung ändern', 'Change the bank account')} triggerVariant="ghost" size="sm">
                          <BankAccountForm personId={person.id} holder={person.displayName} account={account} />
                        </FormDialog>
                      ) : null}
                      {removesBank ? (
                        <form action={removeBankAccountAction}>
                          <input type="hidden" name="personId" value={person.id} />
                          <input type="hidden" name="accountId" value={account.id} />
                          <ConfirmSubmit
                            title={t('Diese Bankverbindung entfernen?', 'Remove this bank account?')}
                            description={t('Sie wird von der Person entfernt.', 'It is removed from the person.')}
                            confirmLabel={t('Entfernen', 'Remove')}
                            variant="ghost"
                          >
                            {t('Entfernen', 'Remove')}
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch keine Bankverbindung.', 'No bank account yet.')}</p>
            )}
          </Card>
        </RecordTabPanel>
      ) : null}

      {/* Not while they have bookings: their bookings and payments would drop out of every list. */}
      {canDelete && bookings.length === 0 ? (
        <RecordFoot>
          <form action={deletePersonAction}>
            <input type="hidden" name="personId" value={person.id} />
            <ConfirmSubmit
              title={t(`${person.displayName} löschen?`, `Delete ${person.displayName}?`)}
              description={t(
                'Die Person verschwindet aus allen Listen. Ihre Anmeldungen und Anfragen bleiben im Posteingang. Unter Teilnehmende → Gelöscht lässt sie sich wiederherstellen.',
                'The person disappears from every list. Their registrations and enquiries stay in the queues. Students → Deleted brings them back.'
              )}
            >
              {t('Person löschen', 'Delete person')}
            </ConfirmSubmit>
          </form>
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}

/** A group of cases — open or closed — under its label and count. */
function CaseGroup({ label, cases, lang, quiet = false }: { label: string; cases: readonly Case[]; lang: WsLang; quiet?: boolean }) {
  return (
    <section className="border-t border-ws-line-soft first:border-t-0">
      <h3 className="px-4 pt-3.5 pb-1.5 text-xs font-bold text-[var(--casa-ink)]">
        {label} <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[var(--ws-head)] px-1.5 py-px text-[0.68rem] font-semibold tabular-nums">{cases.length}</span>
      </h3>
      <CaseRows cases={cases} lang={lang} quiet={quiet} />
    </section>
  );
}

/** Cases as rows: the kind's mark, what it is, when, where it stands. */
function CaseRows({ cases, lang, quiet = false }: { cases: readonly Case[]; lang: WsLang; quiet?: boolean }) {
  return (
    <ul className="py-1.5">
      {cases.map((c) => (
        <li key={c.key}>
          <Link
            href={c.href}
            className="group flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]"
          >
            <span className={cn(quiet && 'opacity-70')}>
              <IconChip icon={KINDS[c.kind].icon} tint={KINDS[c.kind].tint} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('truncate text-[0.88rem] font-semibold', quiet ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{c.title}</span>
                {c.state}
              </span>
              <span className="mt-0.5 block truncate text-[0.78rem] text-[var(--casa-muted)]">
                {[pick(lang, KINDS[c.kind].label), c.detail].filter(Boolean).join(' · ')}
              </span>
            </span>
            {c.amount ?? (
              <span className="shrink-0 text-[0.76rem] text-[var(--casa-muted)] tabular-nums">
                <DateText value={c.at} compact />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const DAY = 86_400_000;

/**
 * The course a learner is in — which week of how many, as a line that fills — or the next one and
 * how soon it starts, with the booking's colour and what is still open on it.
 */
function CourseNow({ booking, running, today, lang }: { booking: BookingListItem; running: boolean; today: Date; lang: WsLang }) {
  const t = translator(lang);
  const start = booking.startDate!;
  const end = booking.endDate!;
  // Teaching weeks, without the school's closures: "Woche 3 von 8", not "von 10" over Christmas.
  const weeks = teachingWeeks(toDateInputValue(start), toDateInputValue(end));
  const week = Math.min(weeks, teachingWeeks(toDateInputValue(start), toDateInputValue(today < start ? start : today)));
  const inDays = Math.round((start.getTime() - today.getTime()) / DAY);
  const light = bookingLight(booking);
  const open = booking.charged - booking.paid;
  return (
    <Card
      title={running ? t('Im Kurs', 'In a course') : t('Nächster Kurs', 'Next course')}
      icon={Icon.bookings}
      tint="sun"
      actions={
        <Link href={`/admin/bookings/${booking.id}`} className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
          {t('Zur Buchung', 'Open booking')} {Icon.chevronRight}
        </Link>
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[1.15rem] leading-tight font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{booking.courseTypeName ?? t('Buchung', 'Booking')}</span>
            <BookingLightPill
              light={light}
              label={pick(lang, BOOKING_LIGHT_LABELS[light])}
              detail={booking.observationReason ? pick(lang, OBSERVATION_REASON_LABELS[booking.observationReason]) : undefined}
            />
          </div>
          <p className="mt-1 text-sm text-[var(--casa-muted)]">
            {dayRange(toDateInputValue(start), toDateInputValue(end), lang)} · {weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`)}
          </p>
        </div>
        {booking.status !== 'cancelled' && booking.charged > 0 ? (
          <div className="ml-auto text-right">
            <span className={cn('block text-[1.05rem] font-extrabold tabular-nums', open > 0.005 ? 'text-[#9a5b00]' : 'text-[#17693a]')}>
              {open > 0.005 ? euros(lang, open, booking.currency) : t('Bezahlt', 'Paid')}
            </span>
            <span className="block text-[0.72rem] text-[var(--casa-muted)]">{open > 0.005 ? t('offen', 'open') : euros(lang, booking.charged, booking.currency)}</span>
          </div>
        ) : null}
      </div>
      {running ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[0.78rem]">
            <span className="font-semibold text-[var(--casa-ink)]">{t(`Woche ${week} von ${weeks}`, `Week ${week} of ${weeks}`)}</span>
            <span className="text-[var(--casa-muted)]">
              {t('endet', 'ends')} <DateText value={end} compact />
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e7ecf3]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--fm-navy)]" style={{ width: `${Math.round((week / weeks) * 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[0.82rem] font-semibold text-[var(--casa-ink)]">
          {inDays === 1 ? t('Beginnt morgen', 'Starts tomorrow') : t(`Beginnt in ${num(lang, inDays)} Tagen`, `Starts in ${num(lang, inDays)} days`)}
        </p>
      )}
    </Card>
  );
}

/** An address in its lines: street, postcode and city, the country when it is not Germany. */
function AddressLines({ address }: { address: Address }) {
  const cityLine = [address.postcode, address.city].filter(Boolean).join(' ');
  return (
    <span className="block leading-relaxed text-[var(--casa-ink)]">
      {address.street ? <span className="block">{address.street}</span> : null}
      {cityLine ? <span className="block">{cityLine}</span> : null}
      {address.countryName && address.countryCode !== 'DE' ? <span className="block">{address.countryName}</span> : null}
    </span>
  );
}
