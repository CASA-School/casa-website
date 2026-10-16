import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { unlinkPersonAction } from '../../actions';
import { deletePersonAction } from '../actions';
import { PersonForm } from '../person-form';
import { BookingWizard } from '../../bookings/booking-wizard';
import { createBookingFromWizardAction } from '../../bookings/actions';
import { RecordFoot } from '../../bookings/record-foot';
import { courseNameResolver } from '../../registrations/course-names';
import { optionLine } from '../../registrations/option-label';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MakeOffer } from '@/components/admin/make-offer';
import { MetaItem, MetaLine, Stat, StatBar, StatePill, Timeline } from '@/components/admin/record-parts';
import { Badge, BirthDate, Button, Card, DateText, DetailList, IconChip, RecordHeader, type BadgeTone, type Tint } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { BOOKING_LIGHT_LABELS, bookingLight, OBSERVATION_REASON_LABELS, personBookings } from '@/lib/admin/bookings';
import { BookingLightPill } from '@/components/admin/booking-light';
import { listFileMakerLinks } from '@/lib/admin/filemaker-links';
import { FLAG_LABELS, listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { counted, dayRange, num, pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { personOffers } from '@/lib/admin/offers/repo';
import { OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/admin/offers/types';
import { getPerson, latestConfirmedLevel, LEARNER_STAGE_LABELS, learnerStage, listCountries, personTimeline, type LearnerStage, type TimelineItem } from '@/lib/admin/people';
import { normaliseStatus } from '@/lib/admin/queues';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

const SALUTATIONS: Record<string, Bilingual> = {
  mr: { de: 'Herr', en: 'Mr' },
  ms: { de: 'Frau', en: 'Ms' },
  mx: { de: 'Mx', en: 'Mx' },
  neutral: { de: 'Keine Anrede', en: 'No salutation' },
};

type CaseKind = TimelineItem['kind'] | 'offer' | 'booking';

/** What each kind of case is, and its meaning colour. */
const KINDS: Record<CaseKind, { label: Bilingual; icon: ReactNode; tint: Tint }> = {
  enquiry: { label: { de: 'Anfrage', en: 'Enquiry' }, icon: Icon.enquiries, tint: 'blue' },
  course: { label: { de: 'Kursanmeldung', en: 'Course registration' }, icon: Icon.registrations, tint: 'red' },
  exam: { label: { de: 'Prüfungsanmeldung', en: 'Exam registration' }, icon: Icon.registrations, tint: 'red' },
  review: { label: { de: 'Einstufung', en: 'Placement' }, icon: Icon.placement, tint: 'green' },
  offer: { label: { de: 'Angebot', en: 'Offer' }, icon: Icon.offers, tint: 'sun' },
  booking: { label: { de: 'Buchung', en: 'Booking' }, icon: Icon.bookings, tint: 'sun' },
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
 * booked, what they still owe, what is open. „Vorgänge" is everything under
 * their name in one list — enquiries, registrations, placement results, offers,
 * bookings — the open ones first, each with where it stands. A registration on
 * its own says "someone wants a B1 course"; the same registration under a person
 * who enquired twice, sat a placement and was confirmed A2.2 says something quite
 * different, and staff should not have to search five lists to find that out.
 * Beside it their details, anything that needs a look, the records linked into
 * this one, and the notes and changes in one line of time.
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
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }, user] = await Promise.all([params, searchParams, requireModule('people')]);
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
  const [timeline, confirmed, flags, activity, notes, fileMakerLinks, countries, bookings, offer, offers, courseName, stage] = await Promise.all([
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
  ]);

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
        detail: b.startDate && b.endDate ? dayRange(toDateInputValue(b.startDate), toDateInputValue(b.endDate), lang) : t('Keine Daten', 'No dates'),
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
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const openCases = cases.filter((c) => c.open);
  const pastCases = cases.filter((c) => !c.open);

  const owed = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + Math.max(0, b.charged - b.paid), 0);
  const running = bookings.filter((b) => b.status === 'reserved' || b.status === 'confirmed').length;

  return (
    <>
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
            {canEdit ? (
              <FormDialog trigger={t('Bearbeiten', 'Edit')} title={person.displayName}>
                <PersonForm person={person} countries={countries} />
              </FormDialog>
            ) : null}
            {canOffer ? <MakeOffer from={{ personId: person.id }} existing={offers} /> : null}
            {canBook && offer ? (
              <FormDialog trigger={t('Neue Buchung', 'New booking')} title={t(`${person.displayName} buchen`, `Book ${person.displayName}`)} triggerVariant="primary" width="lg">
                <BookingWizard personId={person.id} personName={person.displayName} offer={offer} returnTo={`/admin/people/${person.id}`} action={createBookingFromWizardAction} />
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
            <Stat label={t('Vorgänge', 'Cases')}>
              {openCases.length ? (
                <span>{counted(lang, openCases.length, t('offen', 'open'), t('offen', 'open'))}</span>
              ) : (
                <span className="font-semibold text-[var(--casa-muted)]">{t('nichts offen', 'nothing open')}</span>
              )}
            </Stat>
          </StatBar>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title={t('Vorgänge', 'Cases')} icon={Icon.registrations} tint="blue">
            {cases.length ? (
              <div className="-mx-4 -my-4">
                {openCases.length ? <CaseGroup label={t('Offen', 'Open')} cases={openCases} lang={lang} /> : null}
                {pastCases.length ? <CaseGroup label={t('Abgeschlossen', 'Closed')} cases={pastCases} lang={lang} quiet /> : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch keine Vorgänge.', 'No cases yet.')}</p>
            )}
          </Card>
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

          <Card title={t('Angaben', 'Details')} icon={Icon.person} tint="ink">
            <DetailList
              items={[
                ...(person.salutation && SALUTATIONS[person.salutation] ? [{ label: t('Anrede', 'Salutation'), value: pick(lang, SALUTATIONS[person.salutation]) }] : []),
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
                { label: t('Geburtsdatum', 'Date of birth'), value: person.birthDate ? <BirthDate value={person.birthDate} /> : null },
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
          </Card>

          {person.linkedDuplicates.length > 0 ? (
            <Card title={t('Verknüpfte Datensätze', 'Linked records')} icon={Icon.people} tint="ink">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {person.linkedDuplicates.map((dup) => (
                  <li key={dup.id} className="flex items-center justify-between gap-3 py-2.5">
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

      {canDelete ? (
        <RecordFoot>
          <form action={deletePersonAction}>
            <input type="hidden" name="personId" value={person.id} />
            <ConfirmSubmit
              title={t(`${person.displayName} löschen?`, `Delete ${person.displayName}?`)}
              description={t(
                'Die Person verschwindet aus allen Listen. Ihre Anmeldungen und Anfragen bleiben im Posteingang. Ein Inhaber kann den Datensatz wiederherstellen.',
                'The person disappears from every list. Their registrations and enquiries stay in the queues. An owner can restore the record.'
              )}
            >
              {t('Person löschen', 'Delete person')}
            </ConfirmSubmit>
          </form>
        </RecordFoot>
      ) : null}
    </>
  );
}

/** A group of cases — open or closed — as rows: the kind's mark, what it is, when, where it stands. */
function CaseGroup({ label, cases, lang, quiet = false }: { label: string; cases: readonly Case[]; lang: WsLang; quiet?: boolean }) {
  return (
    <section className="border-t border-ws-line-soft first:border-t-0">
      <h3 className="px-4 pt-3.5 pb-1.5 text-xs font-bold text-[var(--casa-ink)]">
        {label} <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[var(--ws-head)] px-1.5 py-px text-[0.68rem] font-semibold tabular-nums">{cases.length}</span>
      </h3>
      <ul className="pb-1.5">
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
    </section>
  );
}
