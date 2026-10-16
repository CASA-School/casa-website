import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction } from '../../bookings/actions';
import { BookingWizard } from '../../bookings/booking-wizard';
import { offerPlaceAction, openGroupAction, takeBackOfferAction } from '../actions';
import { CloseForm, MoveForm, NewLevelForm, PlacesForm } from '../waitlist-forms';
import { BookingLightPill } from '@/components/admin/booking-light';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { Badge, Button, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { bookingOffer } from '@/lib/admin/booking-offer';
import type { BookingOffer } from '@/lib/admin/booking-offer-types';
import { BOOKING_LIGHT_LABELS, bookingLight, type ObservationReason } from '@/lib/admin/bookings';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, num, pick, relativeDays, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  freePlaces,
  getCourseStart,
  levelCodes,
  levelGroups,
  placeForNext,
  startBookings,
  startEntries,
  upcomingStarts,
  WAITLIST_SOURCE_LABELS,
  WAITLIST_STATUS_LABELS,
  type LevelGroup,
  type StartBooking,
  type WaitlistEntry,
} from '@/lib/admin/waitlist';
import { toDateInputValue } from '@/lib/dates';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForEntries, type SentLetter } from '@/lib/admin/letters/repo';
import { cn } from '@/lib/utils';

/**
 * One course start (2026-10-16): its levels, their places and their waiting lists
 * (docs/ADMIN_WORKSPACE.md §Waiting list).
 *
 * The head says what the start is and, in its bar, how it stands in all: booked, waiting, free.
 * Then one card per level — the places as a line that fills, the queue in order with each learner's
 * place, and the booked learners under it. When a place is free and someone waits, the card says
 * so first and names who is next. Offering the place, booking it, moving someone and taking them
 * off are done on the row; how many places a level has, and a second group, are the course
 * planners' (`rooms` at `edit`).
 */
export default async function CourseStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; level?: string }>;
}) {
  const [{ id }, { error, level: focusLevel }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  const start = await getCourseStart(id);
  if (!start) notFound();
  const { t, lang } = await getI18n();

  const plans = canAccess(user, 'rooms', 'edit');
  const handles = canAccess(user, 'bookings', 'edit');
  const [groups, entries, bookings, levels, starts] = await Promise.all([
    levelGroups([id]),
    startEntries(id),
    canAccess(user, 'bookings') ? startBookings(id) : Promise.resolve([]),
    levelCodes(),
    handles ? upcomingStarts() : Promise.resolve([]),
  ]);
  // The last letter to each learner in a queue, to say on their row what they have been told.
  const letters = await lettersForEntries(entries.map((e) => e.id));
  // The wizard only where a row can be booked: an offered place, or a waiting learner with a free place.
  const bookable = handles && entries.some((e) => e.status === 'offered' || e.status === 'waiting');
  const offer = bookable ? await bookingOffer() : null;

  const booked = groups.reduce((sum, g) => sum + g.booked, 0);
  const waiting = groups.reduce((sum, g) => sum + g.waiting + g.offered, 0);
  const free = groups.reduce((sum, g) => sum + freePlaces(g), 0);
  const back = `/admin/catalogue/${id}`;
  const startLabel = (s: { courseTypeName: string; startDate: Date; session: keyof typeof SESSION_LABELS | null }) =>
    [s.courseTypeName, s.session ? pick(lang, SESSION_LABELS[s.session]) : null, new Date(s.startDate).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })]
      .filter(Boolean)
      .join(' · ');
  const startOptions = starts.map((s) => ({ id: s.id, label: startLabel(s) }));
  const weeks = Math.round((new Date(start.endDate).getTime() - new Date(start.startDate).getTime() + 86_400_000) / (7 * 86_400_000));
  const begun = new Date(start.startDate) <= new Date();

  return (
    <>
      <RecordHeader
        backHref="/admin/catalogue"
        backLabel={t('Kurse', 'Courses')}
        title={start.courseTypeName}
        status={
          <>
            {start.status === 'cancelled' ? <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge> : null}
            {begun ? <Badge tone="quiet">{t('Hat begonnen', 'Under way')}</Badge> : null}
          </>
        }
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.calendar}>
              {dayRange(toDateInputValue(start.startDate), toDateInputValue(start.endDate), lang)} · {weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`)}
            </MetaItem>
            {start.session || start.time ? (
              <MetaItem icon={Icon.clock}>
                {[start.session ? pick(lang, SESSION_LABELS[start.session]) : null, dayList(start.days, lang), start.time].filter(Boolean).join(' · ')}
              </MetaItem>
            ) : null}
            {start.roomName ? <MetaItem icon={Icon.rooms}>{start.roomName}</MetaItem> : null}
          </MetaLine>
        }
        actions={
          plans ? (
            <FormDialog trigger={t('Niveau hinzufügen', 'Add a level')} title={t('Plätze für ein Niveau', 'Places for a level')} size="sm">
              <NewLevelForm courseInstanceId={id} levels={levels.filter((code) => !groups.some((g) => g.levelCode === code))} returnTo={back} />
            </FormDialog>
          ) : null
        }
        bar={
          <StatBar>
            <Stat label={t('Gebucht', 'Booked')}>{num(lang, booked)}</Stat>
            <Stat label={t('Warteliste', 'Waiting list')}>{waiting ? num(lang, waiting) : <span className="font-semibold text-[var(--casa-muted)]">{t('niemand', 'nobody')}</span>}</Stat>
            <Stat label={t('Plätze frei', 'Free places')}>
              <span className={free ? 'text-[#17693a]' : 'text-[var(--casa-muted)]'}>{num(lang, free)}</span>
            </Stat>
            {start.withoutLevel ? (
              <Stat label={t('Ohne Niveau', 'Without a level')}>
                <span className="text-[#9a5b00]">{num(lang, start.withoutLevel)}</span>
              </Stat>
            ) : null}
          </StatBar>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--casa-muted)]">{t('In diesem Termin ist noch niemand mit Niveau gebucht, und niemand wartet.', 'Nobody is booked with a level in this start yet, and nobody is waiting.')}</p>
          </Card>
        ) : null}

        {groups.map((group) => (
          <LevelCard
            key={group.levelCode}
            group={group}
            entries={entries.filter((e) => e.levelCode === group.levelCode)}
            letters={letters}
            bookings={bookings.filter((b) => b.levelCode === group.levelCode)}
            focused={focusLevel === group.levelCode}
            plans={plans}
            handles={handles}
            offer={offer}
            startOptions={startOptions}
            levels={levels}
            back={back}
            t={t}
            lang={lang}
          />
        ))}

        {/* Booked here without a level: they hold a place no level counts until one is set on the booking. */}
        {bookings.some((b) => !b.levelCode) ? (
          <Card title={t('Ohne Niveau', 'Without a level')} icon={Icon.attention} tint="sun" bleed>
            <BookedRows bookings={bookings.filter((b) => !b.levelCode)} lang={lang} />
          </Card>
        ) : null}
      </div>
    </>
  );
}

/** One level of the start: its places, who is next for a free one, the queue, the booked learners. */
function LevelCard({
  group,
  entries,
  letters,
  bookings,
  focused,
  plans,
  handles,
  offer,
  startOptions,
  levels,
  back,
  t,
  lang,
}: {
  group: LevelGroup;
  entries: WaitlistEntry[];
  letters: SentLetter[];
  bookings: StartBooking[];
  focused: boolean;
  plans: boolean;
  handles: boolean;
  offer: BookingOffer | null;
  startOptions: { id: string; label: string }[];
  levels: string[];
  back: string;
  t: T;
  lang: WsLang;
}) {
  const open = entries.filter((e) => e.status === 'waiting' || e.status === 'offered');
  const closed = entries.filter((e) => e.status !== 'waiting' && e.status !== 'offered');
  const free = freePlaces(group);
  const full = free === 0;
  const next = placeForNext(group) ? open.find((e) => e.status === 'waiting') : undefined;
  // Waiting learners a free place is there for: the first `free` of those still waiting.
  const withPlace = new Set(open.filter((e) => e.status === 'waiting').slice(0, free).map((e) => e.id));
  const levelBack = `${back}?level=${encodeURIComponent(group.levelCode)}`;

  return (
    <section
      id={`level-${group.levelCode}`}
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-3xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        focused ? 'border-[var(--fm-navy)]/40 ring-2 ring-[var(--fm-navy)]/10' : 'border-ws-line'
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-xl bg-[var(--fm-navy)] px-2.5 text-[0.95rem] font-extrabold tracking-[-0.01em] text-white tabular-nums">
            {group.levelCode}
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.95rem] leading-tight font-extrabold text-[var(--casa-ink)]">
              {full ? t('Voll', 'Full') : t(`${num(lang, free)} ${free === 1 ? 'Platz' : 'Plätze'} frei`, `${num(lang, free)} ${free === 1 ? 'place' : 'places'} free`)}
              {open.length ? <span className="font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, open.length)} auf der Warteliste`, `${num(lang, open.length)} on the waiting list`)}</span> : null}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--casa-muted)]">
              {group.groups === 1
                ? t(`1 Gruppe · ${group.placesPerGroup} Plätze`, `1 group · ${group.placesPerGroup} places`)
                : t(`${group.groups} Gruppen à ${group.placesPerGroup} · ${group.places} Plätze`, `${group.groups} groups of ${group.placesPerGroup} · ${group.places} places`)}
            </p>
          </div>
        </div>
        {plans ? (
          <div className="flex flex-wrap items-center gap-2">
            <FormDialog trigger={t('Plätze ändern', 'Change places')} title={t(`Plätze für ${group.levelCode}`, `Places for ${group.levelCode}`)} size="sm" triggerVariant="ghost">
              <PlacesForm group={group} returnTo={levelBack} />
            </FormDialog>
            {open.length > 0 && full ? (
              <form action={openGroupAction}>
                <input type="hidden" name="courseInstanceId" value={group.courseInstanceId} />
                <input type="hidden" name="levelCode" value={group.levelCode} />
                <input type="hidden" name="returnTo" value={levelBack} />
                <ConfirmSubmit
                  title={t(`Eine ${group.groups === 1 ? 'zweite' : 'weitere'} Gruppe ${group.levelCode} eröffnen?`, `Open ${group.groups === 1 ? 'a second' : 'another'} ${group.levelCode} group?`)}
                  description={t(
                    `${group.placesPerGroup} Plätze mehr. Die Warteliste rückt nach: wer vorne steht, kann dann gebucht werden.`,
                    `${group.placesPerGroup} more places. The waiting list moves up: the first in line can then be booked.`
                  )}
                  confirmLabel={t('Gruppe eröffnen', 'Open group')}
                  variant="secondary"
                >
                  {group.groups === 1 ? t('Zweite Gruppe eröffnen', 'Open a second group') : t('Weitere Gruppe eröffnen', 'Open another group')}
                </ConfirmSubmit>
              </form>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="px-5 py-4">
        {/* The places as a line that fills: booked, then held for an offer. */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7ecf3]" aria-hidden="true">
            <div className="flex h-full">
              <div className={cn('h-full', full ? 'bg-[#d9a033]' : 'bg-[var(--fm-navy)]')} style={{ width: `${Math.min(100, (group.booked / Math.max(1, group.places)) * 100)}%` }} />
              <div className="h-full bg-[#8fb4e6]" style={{ width: `${Math.min(100, (group.offered / Math.max(1, group.places)) * 100)}%` }} />
            </div>
          </div>
          <span className="shrink-0 text-[0.82rem] text-[var(--casa-muted)] tabular-nums">
            {t(`${group.booked} von ${group.places} gebucht`, `${group.booked} of ${group.places} booked`)}
            {group.offered ? t(` · ${group.offered} angeboten`, ` · ${group.offered} offered`) : ''}
          </span>
        </div>

        {next ? (
          <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e9f6ee] px-4 py-3 ring-1 ring-[#b7dfc6] ring-inset">
            <p className="text-[0.88rem] text-[#14532d]">
              <span className="font-extrabold">{free === 1 ? t('1 Platz frei', '1 place free') : t(`${free} Plätze frei`, `${free} places free`)}</span>
              {' · '}
              {t('als Nächste dran:', 'next in line:')}{' '}
              <Link href={`/admin/people/${next.personId}`} className="font-bold underline-offset-2 hover:underline">
                {next.personName}
              </Link>
            </p>
            {handles ? (
              <form action={offerPlaceAction}>
                <input type="hidden" name="entryId" value={next.id} />
                <input type="hidden" name="returnTo" value={levelBack} />
                <Button type="submit" size="sm">
                  {t('Platz anbieten', 'Offer the place')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {open.length ? (
        <ol className="border-t border-ws-line-soft">
          {open.map((entry) => (
            <QueueRow
              key={entry.id}
              entry={entry}
              queueLength={open.length}
              hasPlace={withPlace.has(entry.id)}
              lastLetter={letters.find((l) => l.waitlistEntryId === entry.id) ?? null}
              handles={handles}
              offer={offer}
              startOptions={startOptions}
              levels={levels}
              back={levelBack}
              t={t}
              lang={lang}
            />
          ))}
        </ol>
      ) : null}

      {bookings.length ? (
        <details className="group/booked border-t border-ws-line-soft">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[0.82rem] font-bold text-[var(--casa-ink)] select-none hover:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden">
            <span className="text-[var(--casa-muted)] transition-transform group-open/booked:rotate-90">{Icon.chevronRight}</span>
            {t(`Gebucht (${bookings.length})`, `Booked (${bookings.length})`)}
          </summary>
          <BookedRows bookings={bookings} lang={lang} />
        </details>
      ) : null}

      {closed.length ? (
        <details className="group/closed border-t border-ws-line-soft">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[0.82rem] font-bold text-[var(--casa-muted)] select-none hover:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden">
            <span className="transition-transform group-open/closed:rotate-90">{Icon.chevronRight}</span>
            {t(`Von der Warteliste (${closed.length})`, `Off the waiting list (${closed.length})`)}
          </summary>
          <ul className="pb-2">
            {closed.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 text-[0.84rem]">
                <Link href={`/admin/people/${entry.personId}`} className="font-semibold text-[var(--casa-ink)] hover:underline">
                  {entry.personName}
                </Link>
                <span className="text-[0.78rem] text-[var(--casa-muted)]">
                  {pick(lang, WAITLIST_STATUS_LABELS[entry.status])}
                  {entry.closedAt ? ` · ${capitalise(relativeDays(entry.closedAt, lang))}` : ''}
                  {entry.bookingId ? (
                    <>
                      {' · '}
                      <Link href={`/admin/bookings/${entry.bookingId}`} className="font-medium text-[var(--casa-accent-text)] hover:underline">
                        {t('Buchung', 'Booking')}
                      </Link>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** One learner in the queue: their place, since when, how they came, and what can be done. */
function QueueRow({
  entry,
  queueLength,
  hasPlace,
  lastLetter,
  handles,
  offer,
  startOptions,
  levels,
  back,
  t,
  lang,
}: {
  entry: WaitlistEntry;
  queueLength: number;
  hasPlace: boolean;
  lastLetter: SentLetter | null;
  handles: boolean;
  offer: BookingOffer | null;
  startOptions: { id: string; label: string }[];
  levels: string[];
  back: string;
  t: T;
  lang: WsLang;
}) {
  const offered = entry.status === 'offered';
  const subject = offered
    ? t(`Ein Platz ist frei: ${entry.courseTypeName} ${entry.levelCode}`, `A place is free: ${entry.courseTypeName} ${entry.levelCode}`)
    : t(`Warteliste: ${entry.courseTypeName} ${entry.levelCode}`, `Waiting list: ${entry.courseTypeName} ${entry.levelCode}`);
  return (
    <li className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ws-line-soft px-5 py-3 last:border-b-0', offered && 'bg-[#f3f8ff]')}>
      <span
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.86rem] font-extrabold tabular-nums',
          offered ? 'bg-[var(--fm-navy)] text-white' : 'bg-ws-sunk text-[var(--casa-ink)]'
        )}
        aria-label={t(`Platz ${entry.position}`, `Place ${entry.position}`)}
      >
        {entry.position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/people/${entry.personId}`} className="truncate text-[0.9rem] font-semibold text-[var(--casa-ink)] hover:underline">
            {entry.personName}
          </Link>
          {offered ? <Badge tone="accent">{pick(lang, WAITLIST_STATUS_LABELS.offered)}</Badge> : null}
          {entry.email ? (
            <a
              href={`mailto:${entry.email}?subject=${encodeURIComponent(subject)}`}
              className="text-[var(--casa-muted)] hover:text-[var(--casa-ink)] [&_svg]:size-3.5"
              title={entry.email}
              aria-label={t(`E-Mail an ${entry.personName}`, `Email ${entry.personName}`)}
            >
              {Icon.mail}
            </a>
          ) : null}
        </div>
        <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">
          {[
            offered && entry.offeredAt
              ? t(`angeboten ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` von ${entry.offeredByName}` : ''}`, `offered ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` by ${entry.offeredByName}` : ''}`)
              : t(`wartet seit ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`, `waiting since ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`),
            pick(lang, WAITLIST_SOURCE_LABELS[entry.source]),
            // What they were told last, and when.
            lastLetter
              ? t(
                  `${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} gesendet ${new Date(lastLetter.sentAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`,
                  `${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} sent ${new Date(lastLetter.sentAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`
                )
              : null,
            entry.note,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {handles ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasPlace && !offered ? (
            <form action={offerPlaceAction}>
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="returnTo" value={back} />
              <Button type="submit" size="sm" variant="secondary">
                {t('Platz anbieten', 'Offer the place')}
              </Button>
            </form>
          ) : null}
          {(offered || hasPlace) && offer ? (
            <FormDialog trigger={t('Buchen', 'Book')} title={t(`${entry.personName} buchen`, `Book ${entry.personName}`)} width="lg" size="sm" triggerVariant={offered ? 'secondary' : 'ghost'}>
              <BookingWizard
                personId={entry.personId}
                personName={entry.personName}
                offer={offer}
                preselectedCohortId={entry.courseInstanceId}
                preselectedLevelCode={entry.levelCode}
                sourceRegistrationId={entry.registrationId}
                returnTo={back.split('?')[0]}
                action={createBookingFromWizardAction}
              />
            </FormDialog>
          ) : null}
          {offered ? (
            <form action={takeBackOfferAction}>
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="returnTo" value={back} />
              <Button type="submit" size="sm" variant="ghost">
                {t('Angebot zurücknehmen', 'Take back the offer')}
              </Button>
            </form>
          ) : null}
          <Link
            href={`/admin/catalogue/waitlist/${entry.id}/letter${offered ? '?kind=place_free' : ''}`}
            className="inline-flex h-8 items-center rounded-lg px-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
          >
            {t('Brief', 'Letter')}
          </Link>
          <FormDialog trigger={t('Verschieben', 'Move')} title={t(`${entry.personName} verschieben`, `Move ${entry.personName}`)} size="sm" triggerVariant="ghost">
            <MoveForm entry={entry} queueLength={queueLength} starts={startOptions} levels={levels} returnTo={back} />
          </FormDialog>
          <FormDialog
            trigger={offered ? t('Abgesagt', 'Declined') : t('Von der Liste', 'Off the list')}
            title={offered ? t(`${entry.personName} hat abgesagt`, `${entry.personName} declined`) : t(`${entry.personName} von der Warteliste nehmen`, `Take ${entry.personName} off the list`)}
            size="sm"
            triggerVariant="ghost"
          >
            <CloseForm entry={entry} returnTo={back} />
          </FormDialog>
        </div>
      ) : null}
    </li>
  );
}

/** Booked learners: the name to their booking, the booking's colour. */
function BookedRows({ bookings, lang }: { bookings: StartBooking[]; lang: WsLang }) {
  return (
    <ul className="pb-2">
      {bookings.map((b) => {
        const light = bookingLight({ status: b.status, observationReason: b.observationReason as ObservationReason | null, charged: b.charged, paid: b.paid });
        return (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-2 text-[0.86rem] transition-colors hover:bg-[var(--ws-row-hover)]">
              <span className="truncate font-medium text-[var(--casa-ink)]">{b.personName}</span>
              <BookingLightPill light={light} label={pick(lang, BOOKING_LIGHT_LABELS[light])} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_SHORT: Record<WsLang, Record<string, string>> = {
  de: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' },
  en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
};

/** "Mo–Fr" for a run of days, "Mo, Mi" otherwise. */
function dayList(days: string[], lang: WsLang): string | null {
  const sorted = days.filter((d) => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (sorted.length === 0) return null;
  const run = sorted.every((d, i) => i === 0 || DAY_ORDER.indexOf(d) === DAY_ORDER.indexOf(sorted[i - 1]) + 1);
  const short = sorted.map((d) => DAY_SHORT[lang][d]);
  return run && short.length > 2 ? `${short[0]}–${short[short.length - 1]}` : short.join(', ');
}
