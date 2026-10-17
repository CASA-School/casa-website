import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction } from '../../../bookings/actions';
import { BookingWizard } from '../../../bookings/booking-wizard';
import { offerPlaceAction, takeBackOfferAction } from '../../actions';
import { CloseForm, MoveForm } from '../../waitlist-forms';
import { cancelSittingAction, deleteSittingAction, fileCandidatesAction, markCollectedAction, unassignExaminerAction, unfileCandidateAction, updateSittingAction } from '../actions';
import { CandidatePicker } from '../candidate-picker';
import { ExaminerForm } from '../examiner-form';
import { SittingForm } from '../sitting-form';
import { PersonForm } from '../../../people/person-form';
import { RecordFoot } from '../../../bookings/record-foot';
import { BookingLightPill } from '@/components/admin/booking-light';
import { ConfirmSubmit, FormDialog, DialogFooter } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { Badge, Button, Card, Field, Input, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { bookingOffer } from '@/lib/admin/booking-offer';
import type { BookingOffer } from '@/lib/admin/booking-offer-types';
import { bookingLight, bookingLightLabel, type ObservationReason } from '@/lib/admin/bookings';
import { EXAM_OVERALL_LABELS, EXAM_PARTS_LABELS, EXAMINER_PART_LABELS, needsLicence, overallOutcome, SITTING_STATUS_LABELS } from '@/lib/admin/exam-parts';
import { examinerChoices, sittingExaminers } from '@/lib/admin/examiners';
import {
  freeSeats,
  getSitting,
  sittingCandidates,
  sittingDefaults,
  sittingEntries,
  sittingForEdit,
  sittingRegistrations,
  TELC_FIELD_LABELS,
  type ExamSitting,
  type ExamWaitlistEntry,
  type SittingCandidate,
} from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { listCountries } from '@/lib/admin/people';
import { capitalise, num, pick, relativeDays, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForEntries, type SentLetter } from '@/lib/admin/letters/repo';
import { WAITLIST_SOURCE_LABELS, WAITLIST_STATUS_LABELS } from '@/lib/admin/waitlist';
import { cn } from '@/lib/utils';

/**
 * One exam sitting (2026-10-17, migration 0036; docs/ADMIN_WORKSPACE.md §Exams): its candidates,
 * whether each was reported to telc and what telc still needs, its places and its waiting list.
 *
 * The head says what and when, and how many days are left before telc's deadline; its bar how the
 * sitting stands: booked, reported, waiting, free. Then the candidates — tick and mark them as
 * reported — the queue in order with each person's place, and the website registrations nobody has
 * answered yet. SchoolMan showed free places and enforced none, and a cancelled candidate stayed on
 * its telc list; here a full sitting is not booked over, and the list is the bookings that stand.
 */
export default async function ExamSittingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const { t, lang } = await getI18n();

  const seesBookings = canAccess(user, 'bookings');
  const handles = canAccess(user, 'bookings', 'edit');
  const plans = canAccess(user, 'catalogue', 'edit');
  const ends = canAccess(user, 'catalogue', 'full');
  const [candidates, entries, registrations, exams, form, examiners, choices] = await Promise.all([
    seesBookings ? sittingCandidates(id) : Promise.resolve([]),
    sittingEntries(id),
    canAccess(user, 'registrations') ? sittingRegistrations(id) : Promise.resolve([]),
    plans ? sittingDefaults() : Promise.resolve([]),
    plans ? sittingForEdit(id) : Promise.resolve(null),
    sittingExaminers(id),
    plans ? examinerChoices(id) : Promise.resolve([]),
  ]);
  const seesStaff = canAccess(user, 'staff');
  // „Buchen": a learner found by name, or a new one, then the booking wizard at this sitting.
  const books = handles && canAccess(user, 'people') && sitting.status === 'scheduled' && new Date(sitting.startsAt).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0);
  const addsPeople = books && canAccess(user, 'people', 'edit');
  const countries = addsPeople ? await listCountries() : [];
  const letters = await lettersForEntries(entries.map((e) => e.id));
  const open = entries.filter((e) => e.status === 'waiting' || e.status === 'offered');
  const closed = entries.filter((e) => e.status !== 'waiting' && e.status !== 'offered');
  const offer = handles && open.length ? await bookingOffer() : null;

  const free = freeSeats(sitting);
  const next = free > 0 ? open.find((e) => e.status === 'waiting') : undefined;
  const withPlace = new Set(open.filter((e) => e.status === 'waiting').slice(0, free).map((e) => e.id));
  const standing = candidates.filter((c) => c.status !== 'cancelled');
  const cancelled = candidates.filter((c) => c.status === 'cancelled');
  const back = `/admin/catalogue/exams/${id}`;
  const today = new Date().setHours(0, 0, 0, 0);
  const past = new Date(sitting.startsAt).getTime() < today;
  // After the exam day: telc's results are entered, and the result is handed over.
  const sat = new Date(sitting.startsAt).setHours(0, 0, 0, 0) < today;
  const daysLeft = sitting.registrationDeadline ? Math.round((new Date(sitting.registrationDeadline).setHours(0, 0, 0, 0) - today) / 86_400_000) : null;

  return (
    <>
      <RecordHeader
        backHref="/admin/catalogue/exams"
        backLabel={t('Prüfungen', 'Exams')}
        title={sitting.examName}
        status={
          <>
            {sitting.status === 'cancelled' ? <Badge tone="danger">{pick(lang, SITTING_STATUS_LABELS.cancelled)}</Badge> : null}
            {sitting.status === 'draft' ? <Badge tone="neutral">{pick(lang, SITTING_STATUS_LABELS.draft)}</Badge> : null}
            {past ? <Badge tone="quiet">{t('Vorbei', 'Past')}</Badge> : null}
          </>
        }
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.calendar}>{sittingWhen(sitting, lang)}</MetaItem>
            {sitting.registrationDeadline ? (
              <MetaItem icon={Icon.clock}>
                <span className={daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? 'font-semibold text-[#9a5b00]' : undefined}>
                  {t('Anmeldeschluss', 'Entries close')}{' '}
                  {new Date(sitting.registrationDeadline).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                  {daysLeft === null || past
                    ? ''
                    : daysLeft < 0
                      ? ` · ${t('vorbei', 'passed')}`
                      : daysLeft === 0
                        ? ` · ${t('heute', 'today')}`
                        : daysLeft <= 30
                          ? ` · ${daysLeft === 1 ? t('noch 1 Tag', '1 day left') : t(`noch ${daysLeft} Tage`, `${daysLeft} days left`)}`
                          : ''}
                </span>
              </MetaItem>
            ) : null}
          </MetaLine>
        }
        actions={
          <>
            {seesBookings && standing.length ? (
              <Link
                href={`${back}/telc`}
                className="inline-flex h-9 items-center rounded-xl border border-ws-line bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] hover:border-ws-line-firm"
              >
                {t('Liste für telc', 'List for telc')}
              </Link>
            ) : null}
            {plans && form ? (
              <FormDialog icon={Icon.calendar} tint="red" trigger={t('Bearbeiten', 'Edit')} title={t('Prüfungstermin bearbeiten', 'Edit the sitting')} triggerVariant="secondary">
                <SittingForm action={updateSittingAction} exams={exams} sittingId={id} initial={form} examLocked={sitting.booked > 0} />
              </FormDialog>
            ) : null}
            {books ? (
              <FormDialog icon={Icon.bookings} tint="red"
                trigger={t('Buchen', 'Book')}
                title={t('Wen buchen?', 'Who to book?')}
                description={`${sitting.examName} · ${sittingWhen(sitting, lang)}`}
                triggerVariant={next ? 'secondary' : 'primary'}
              >
                <CandidatePicker
                  sittingId={id}
                  newPerson={
                    addsPeople ? (
                      <PersonForm countries={countries} hidden={{ then: 'book', sitting: id }} submitLabel={t('Weiter zur Buchung', 'On to the booking')} />
                    ) : null
                  }
                />
              </FormDialog>
            ) : null}
          </>
        }
        bar={
          <StatBar>
            <Stat label={t('Gebucht', 'Booked')}>
              {num(lang, sitting.booked)}
              <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, sitting.capacity)}</span>
            </Stat>
            {seesBookings ? (
              <Stat label={t('Bei telc gemeldet', 'Reported to telc')}>
                <span className={sitting.filed < sitting.booked ? 'text-[#9a5b00]' : 'text-[#17693a]'}>{num(lang, sitting.filed)}</span>
              </Stat>
            ) : null}
            <Stat label={t('Warteliste', 'Waiting list')}>
              {open.length ? num(lang, open.length) : <span className="font-semibold text-[var(--casa-muted)]">{t('niemand', 'nobody')}</span>}
            </Stat>
            <Stat label={t('Plätze frei', 'Free places')}>
              <span className={free ? 'text-[#17693a]' : 'text-[var(--casa-muted)]'}>{num(lang, free)}</span>
            </Stat>
          </StatBar>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {next ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e9f6ee] px-4 py-3 ring-1 ring-[#b7dfc6] ring-inset">
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
                <input type="hidden" name="returnTo" value={back} />
                <Button type="submit" size="sm">
                  {t('Platz anbieten', 'Offer the place')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}

        {seesBookings ? (
          <Card
            title={t('Teilnehmende', 'Candidates')}
            icon={Icon.people}
            tint="blue"
            bleed
            actions={
              handles && standing.length ? (
                <span className="flex items-center gap-4 text-[0.8rem] font-semibold">
                  <Link href={`${back}/letters`} className="text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                    {t('Briefe an alle', 'Letters to all')}
                  </Link>
                  {sat ? (
                    <Link href={`${back}/results`} className="text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                      {t('Ergebnisse eintragen', 'Enter results')}
                    </Link>
                  ) : null}
                </span>
              ) : undefined
            }
          >
            {standing.length === 0 ? (
              <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand gebucht.', 'Nobody booked yet.')}</p>
            ) : (
              <form action={fileCandidatesAction}>
                <input type="hidden" name="sittingId" value={id} />
                <ul className="divide-y divide-ws-line-soft">
                  {standing.map((c) => (
                    <CandidateRow key={c.bookingId} candidate={c} handles={handles} files={handles && !sat} sittingId={id} t={t} lang={lang} />
                  ))}
                </ul>
                {handles && !sat && standing.some((c) => !c.filedAt) ? (
                  <div className="flex justify-end border-t border-ws-line-soft px-5 py-3">
                    <Button type="submit" size="sm" variant="secondary">
                      {t('Ausgewählte als gemeldet markieren', 'Mark the ticked as reported')}
                    </Button>
                  </div>
                ) : null}
              </form>
            )}
            {handles
              ? standing
                  .filter((c) => c.filedAt)
                  .map((c) => (
                    <form key={c.bookingId} id={`unfile-${c.bookingId}`} action={unfileCandidateAction} hidden>
                      <input type="hidden" name="sittingId" value={id} />
                      <input type="hidden" name="bookingId" value={c.bookingId} />
                    </form>
                  ))
              : null}
            {cancelled.length ? (
              <details className="group/cancelled border-t border-ws-line-soft">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[0.82rem] font-bold text-[var(--casa-muted)] select-none hover:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden">
                  <span className="transition-transform group-open/cancelled:rotate-90">{Icon.chevronRight}</span>
                  {t(`Storniert (${cancelled.length})`, `Cancelled (${cancelled.length})`)}
                </summary>
                <ul className="pb-2">
                  {cancelled.map((c) => (
                    <li key={c.bookingId}>
                      <Link href={`/admin/bookings/${c.bookingId}`} className="flex items-center justify-between gap-3 px-5 py-2 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                        <span className="truncate text-[var(--casa-muted)]">{c.personName}</span>
                        <span className="text-xs text-[var(--casa-muted)] tabular-nums">
                          {/* Reported, then cancelled: telc still has them. */}
                          {c.filedAt ? <span className="mr-2 font-semibold text-[#9a5b00]">{t('war bei telc gemeldet', 'was reported to telc')}</span> : null}
                          {c.number}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Card>
        ) : null}

        <Card
          title={t('Prüfende', 'Examiners')}
          icon={Icon.award}
          tint="green"
          bleed
          actions={
            plans && sitting.status !== 'cancelled' && choices.length ? (
              <FormDialog icon={Icon.people} tint="ink" trigger={t('Eintragen', 'Add')} title={t('Prüfende eintragen', 'Add an examiner')} triggerVariant="ghost" size="sm">
                <ExaminerForm sittingId={id} choices={choices} />
              </FormDialog>
            ) : undefined
          }
        >
          {examiners.length ? (
            <ul className="divide-y divide-ws-line-soft">
              {examiners.map((x) => (
                <li key={x.staffId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.86rem]">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    {seesStaff ? (
                      <Link href={`/admin/staff/${x.staffId}?tab=exams`} className="font-semibold text-[var(--casa-ink)] hover:underline">
                        {x.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--casa-ink)]">{x.name}</span>
                    )}
                    <span className="text-[var(--casa-muted)]">{pick(lang, EXAMINER_PART_LABELS[x.part])}</span>
                    {needsLicence(x.part) && !x.licensed ? <Badge tone="warning">{t('Keine gültige Lizenz am Prüfungstag', 'No valid licence on the day')}</Badge> : null}
                  </span>
                  {plans ? (
                    <form action={unassignExaminerAction}>
                      <input type="hidden" name="sittingId" value={id} />
                      <input type="hidden" name="staffId" value={x.staffId} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t('Austragen', 'Take off')}
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand eingetragen.', 'Nobody yet.')}</p>
          )}
        </Card>

        {entries.length ? (
          <Card title={t('Warteliste', 'Waiting list')} icon={Icon.clock} tint="sun" bleed>
            {open.length ? (
              <ol>
                {open.map((entry) => (
                  <QueueRow
                    key={entry.id}
                    entry={entry}
                    queueLength={open.length}
                    hasPlace={withPlace.has(entry.id)}
                    lastLetter={letters.find((l) => l.waitlistEntryId === entry.id) ?? null}
                    handles={handles}
                    offer={offer}
                    sitting={sitting}
                    back={back}
                    t={t}
                    lang={lang}
                  />
                ))}
              </ol>
            ) : (
              <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Niemand wartet.', 'Nobody is waiting.')}</p>
            )}
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
          </Card>
        ) : null}

        {registrations.length ? (
          <Card title={t('Anmeldungen ohne Buchung', 'Registrations not yet booked')} icon={Icon.registrations} tint="ink" bleed>
            <ul className="divide-y divide-ws-line-soft">
              {registrations.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/registrations/exam/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                    <span className="truncate font-semibold text-[var(--casa-ink)]">{r.name}</span>
                    <span className="shrink-0 text-xs text-[var(--casa-muted)]">
                      {r.parts !== 'full' && r.parts in EXAM_PARTS_LABELS ? `${pick(lang, EXAM_PARTS_LABELS[r.parts as keyof typeof EXAM_PARTS_LABELS])} · ` : ''}
                      {capitalise(relativeDays(r.submittedAt, lang))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      {ends && ((sitting.status !== 'cancelled' && !past) || (sitting.createdHere && candidates.length === 0 && entries.length === 0)) ? (
        <RecordFoot>
          {sitting.status !== 'cancelled' && !past ? (
            <form action={cancelSittingAction}>
              <input type="hidden" name="sittingId" value={id} />
              <ConfirmSubmit
                title={t('Diesen Prüfungstermin absagen?', 'Cancel this sitting?')}
                description={t('Er verschwindet von der Website und bleibt hier als abgesagt stehen.', 'It leaves the website and stays here as cancelled.')}
                confirmLabel={t('Termin absagen', 'Cancel sitting')}
              >
                {t('Termin absagen', 'Cancel sitting')}
              </ConfirmSubmit>
            </form>
          ) : null}
          {sitting.createdHere && candidates.length === 0 && entries.length === 0 ? (
            <form action={deleteSittingAction}>
              <input type="hidden" name="sittingId" value={id} />
              <ConfirmSubmit title={t('Diesen Prüfungstermin löschen?', 'Delete this sitting?')} description={t('Er verschwindet ganz.', 'It is gone for good.')}>
                {t('Termin löschen', 'Delete sitting')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </RecordFoot>
      ) : null}
    </>
  );
}

/** "Fr, 13. Nov. 2026 · 09:00–17:00". */
function sittingWhen(sitting: ExamSitting, lang: WsLang): string {
  const from = new Date(sitting.startsAt);
  const to = new Date(sitting.endsAt);
  const time = (d: Date) => d.toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit' });
  return `${from.toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${time(from)}–${time(to)}`;
}

/** One candidate: the tick for the report, the name to the booking, the parts, the money, and telc. */
function CandidateRow({
  candidate: c,
  handles,
  files,
  sittingId,
  t,
  lang,
}: {
  candidate: SittingCandidate;
  handles: boolean;
  /** Before the exam day: the tick that marks the candidate as reported to telc. */
  files: boolean;
  sittingId: string;
  t: T;
  lang: WsLang;
}) {
  const overall = c.result ? overallOutcome(c.parts, c.result) : null;
  const money = { status: c.status, observationReason: c.observationReason as ObservationReason | null, charged: c.charged, paid: c.paid };
  const light = bookingLight(money);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3">
      {files ? (
        <input
          type="checkbox"
          name="bookingIds"
          value={c.bookingId}
          disabled={Boolean(c.filedAt)}
          aria-label={t(`${c.personName} als gemeldet markieren`, `Mark ${c.personName} as reported`)}
          className="size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)] disabled:opacity-30"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <Link href={`/admin/bookings/${c.bookingId}`} className="block truncate text-[0.9rem] font-semibold text-[var(--casa-ink)] hover:underline">
          {c.personName}
        </Link>
        <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
          {c.number}
          {c.parts !== 'full' ? ` · ${pick(lang, EXAM_PARTS_LABELS[c.parts])}` : ''}
        </p>
      </div>
      <BookingLightPill light={light} label={pick(lang, bookingLightLabel(money))} />
      <span className="w-full text-[0.8rem] sm:w-56 sm:text-right">
        {c.result ? (
          // The result telc sent, then whether it was collected.
          <span className="inline-flex flex-wrap items-center gap-x-2 sm:justify-end">
            <span className={cn('font-semibold', overall === 'passed' ? 'text-[#17693a]' : overall === 'partial' ? 'text-[#9a5b00]' : 'text-[var(--casa-ink)]')}>
              {overall ? pick(lang, EXAM_OVERALL_LABELS[overall]) : t('Ergebnis unvollständig', 'Result incomplete')}
            </span>
            {c.result.collectedAt ? (
              <span className="text-[var(--casa-muted)]" title={c.result.collectedNote ?? undefined}>
                · {t('abgeholt', 'collected')} {new Date(c.result.collectedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}
              </span>
            ) : handles && overall !== 'absent' ? (
              <FormDialog icon={Icon.award} tint="ink" trigger={t('Abgeholt', 'Collected')} title={t(`Ergebnis von ${c.personName} abgeholt`, `${c.personName}'s result collected`)} size="sm" triggerVariant="ghost">
                <form action={markCollectedAction} className="space-y-3">
                  <input type="hidden" name="sittingId" value={sittingId} />
                  <input type="hidden" name="bookingId" value={c.bookingId} />
                  <Field label={t('Abgeholt von (mit Vollmacht)', 'Collected by (with authorisation)')} htmlFor={`collected-${c.bookingId}`}>
                    <Input id={`collected-${c.bookingId}`} name="note" maxLength={300} />
                  </Field>
                  <DialogFooter>
                    <Button type="submit">{t('Als abgeholt eintragen', 'Mark as collected')}</Button>
                  </DialogFooter>
                </form>
              </FormDialog>
            ) : null}
          </span>
        ) : c.filedAt ? (
          <span className="inline-flex items-center gap-2 text-[#17693a]">
            {t('Gemeldet', 'Reported')} {new Date(c.filedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}
            {handles ? (
              // Its own form, outside the report form: a form cannot hold another.
              <button type="submit" form={`unfile-${c.bookingId}`} className="text-[0.76rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)] hover:underline">
                {t('Zurücknehmen', 'Undo')}
              </button>
            ) : null}
          </span>
        ) : c.missing.length ? (
          <Link href={`/admin/people/${c.personId}?tab=details`} className="font-semibold text-[#9a5b00] hover:underline">
            {t('Fehlt', 'Missing')}: {c.missing.map((f) => pick(lang, TELC_FIELD_LABELS[f])).join(', ')}
          </Link>
        ) : (
          <span className="text-[var(--casa-muted)]">{t('Noch nicht gemeldet', 'Not reported yet')}</span>
        )}
      </span>
    </li>
  );
}

/** One person in the sitting's queue: their place, since when, how they came, and what can be done. */
function QueueRow({
  entry,
  queueLength,
  hasPlace,
  lastLetter,
  handles,
  offer,
  sitting,
  back,
  t,
  lang,
}: {
  entry: ExamWaitlistEntry;
  queueLength: number;
  hasPlace: boolean;
  lastLetter: SentLetter | null;
  handles: boolean;
  offer: BookingOffer | null;
  sitting: ExamSitting;
  back: string;
  t: T;
  lang: WsLang;
}) {
  const offered = entry.status === 'offered';
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
        </div>
        <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">
          {[
            offered && entry.offeredAt
              ? t(`angeboten ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` von ${entry.offeredByName}` : ''}`, `offered ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` by ${entry.offeredByName}` : ''}`)
              : t(`wartet seit ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`, `waiting since ${new Date(entry.joinedAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' })}`),
            entry.parts !== 'full' ? pick(lang, EXAM_PARTS_LABELS[entry.parts]) : null,
            pick(lang, WAITLIST_SOURCE_LABELS[entry.source]),
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
                preselectedExam={{ examTypeId: sitting.examTypeId, sittingId: sitting.id, parts: entry.parts }}
                sourceExamRegistrationId={entry.registrationId}
                returnTo={back}
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
          {queueLength > 1 ? (
            <FormDialog trigger={t('Verschieben', 'Move')} title={t(`${entry.personName} verschieben`, `Move ${entry.personName}`)} size="sm" triggerVariant="ghost">
              <MoveForm entry={{ id: entry.id, position: entry.position, courseInstanceId: null, levelCode: null }} queueLength={queueLength} starts={[]} levels={[]} returnTo={back} />
            </FormDialog>
          ) : null}
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
