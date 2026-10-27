import type { ReactNode } from 'react';

import { createBookingFromWizardAction } from '../../../bookings/actions';
import { BookingWizard } from '../../../bookings/booking-wizard';
import { offerPlaceAction, takeBackOfferAction } from '../../actions';
import { CloseForm, MoveForm } from '../../waitlist-forms';
import { markCollectedAction, unassignExaminerAction } from '../actions';
import { BookingLightDot, BookingLightPill } from '@/components/admin/booking-light';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { euros } from '@/components/admin/list';
import { RecordLink } from '@/components/admin/record-link';
import { SidePanel } from '@/components/admin/side-panel';
import { Badge, Button, ButtonLink, Field, Input } from '@/components/admin/ui';
import type { StaffUser } from '@/lib/admin/auth';
import type { BookingOffer } from '@/lib/admin/booking-offer-types';
import { bookingLight, bookingLightLabel, type ObservationReason } from '@/lib/admin/bookings';
import { EXAM_OUTCOME_LABELS, EXAM_OVERALL_LABELS, EXAM_PARTS_LABELS, EXAMINER_PART_LABELS, needsLicence, overallOutcome, partsSat } from '@/lib/admin/exam-parts';
import type { ExaminerSitting, SittingExaminer } from '@/lib/admin/examiners';
import { TELC_FIELD_LABELS, type ExamSitting, type ExamWaitlistEntry, type SittingCandidate } from '@/lib/admin/exams';
import { pick, relativeDays, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import type { SentLetter } from '@/lib/admin/letters/repo';
import type { LetterKind } from '@/lib/admin/letters/types';
import { mailHref } from '@/lib/admin/mail/href';
import { owesMoney } from '@/lib/admin/open-money';
import { recordHrefFor } from '@/lib/admin/record-href';
import { WAITLIST_SOURCE_LABELS, WAITLIST_STATUS_LABELS } from '@/lib/admin/waitlist';
import { cn } from '@/lib/utils';

/**
 * The rows of an exam sitting's page and the panels they open (2026-10-27): a candidate, a person in the
 * queue, an examiner — each a short line in its tab, and a quick look at the side with what a colleague
 * does with them, so the page stays a list and nothing needs a second page to be seen.
 */

const day = (d: Date | string, lang: WsLang, year = false) =>
  new Date(d).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'Europe/Berlin' });

/** The name that opens the quick look: the row's own look, with a faint underline on pointing. */
const NAME = 'min-w-0 truncate rounded-sm text-left text-[0.88rem] font-semibold text-[var(--casa-ink)] decoration-1 underline-offset-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40';

/** A section of a side panel: its label, then what it holds. */
function PanelSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-ws-line-soft px-6 py-4 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{title}</h3>
        {action}
      </div>
      <div className="text-[0.88rem] text-[var(--casa-ink)]">{children}</div>
    </section>
  );
}

/** Label and value in two columns, a panel's facts. */
function Facts({ rows }: { rows: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-1.5">
      {rows.map((r) => [
        <dt key={`${r.label}-l`} className="text-[0.84rem] text-[var(--casa-muted)]">
          {r.label}
        </dt>,
        <dd key={`${r.label}-v`} className="min-w-0 text-[0.86rem] font-semibold text-[var(--casa-ink)] tabular-nums">
          {r.value}
        </dd>,
      ])}
    </dl>
  );
}

// ------------------------------------------------------------ candidates

/**
 * One candidate on one line (the exam-day list kept whole, each row short): the tick for the report to telc,
 * the booking's colour, the name — which opens the candidate at the side —, the parts when not all, what is
 * still owed, and telc: reported, what is missing, or the result, with its one action at the end.
 */
export function CandidateRow({
  candidate: c,
  sitting,
  user,
  handles,
  files,
  sat,
  t,
  lang,
}: {
  candidate: SittingCandidate;
  sitting: ExamSitting;
  user: StaffUser;
  handles: boolean;
  /** Before the exam day: the tick that marks the candidate as reported to telc. */
  files: boolean;
  /** After the exam day: the result is what is shown. */
  sat: boolean;
  t: T;
  lang: WsLang;
}) {
  const overall = c.result ? overallOutcome(c.parts, c.result) : null;
  const money = { status: c.status, observationReason: c.observationReason as ObservationReason | null, charged: c.charged, paid: c.paid };
  const light = bookingLight(money);
  const open = c.charged - c.paid;
  const missing = c.missing.map((f) => pick(lang, TELC_FIELD_LABELS[f])).join(', ');
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 px-5 py-1.5 sm:flex-nowrap">
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
      <BookingLightDot light={light} label={pick(lang, bookingLightLabel(money))} />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <CandidatePanel candidate={c} sitting={sitting} user={user} handles={handles} sat={sat} t={t} lang={lang} />
        {c.parts !== 'full' ? <span className="shrink-0 text-[0.78rem] text-[var(--casa-muted)]">{pick(lang, EXAM_PARTS_LABELS[c.parts])}</span> : null}
      </span>
      <span className="hidden w-24 shrink-0 text-[0.78rem] text-[var(--casa-muted)] tabular-nums md:inline">{c.number}</span>
      <span className="w-[6.5rem] shrink-0 text-right text-[0.8rem] tabular-nums max-sm:order-last max-sm:w-auto max-sm:pl-7 max-sm:text-left">
        {owesMoney(open) && c.status !== 'cancelled' ? <span className="font-semibold text-[#9a5b00]">{t(`${euros(open)} offen`, `${euros(open)} owed`)}</span> : null}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-[0.8rem] max-sm:w-full max-sm:pl-7 sm:w-[17rem] sm:shrink-0 sm:justify-end">
        {c.result ? (
          <>
            <span className={cn('truncate font-semibold', overall === 'passed' ? 'text-[#17693a]' : overall === 'partial' ? 'text-[#9a5b00]' : 'text-[var(--casa-ink)]')}>
              {overall ? pick(lang, EXAM_OVERALL_LABELS[overall]) : t('Ergebnis unvollständig', 'Result incomplete')}
            </span>
            {c.result.collectedAt ? (
              <span className="shrink-0 text-[var(--casa-muted)]" title={c.result.collectedNote ?? undefined}>
                · {t('abgeholt', 'collected')} {day(c.result.collectedAt, lang)}
              </span>
            ) : handles && overall !== 'absent' ? (
              <CollectedDialog candidate={c} sittingId={sitting.id} t={t} />
            ) : null}
          </>
        ) : sat ? null : c.filedAt ? (
          <>
            <span className="text-[#17693a]">
              {t('Gemeldet', 'Reported')} {day(c.filedAt, lang)}
            </span>
            {handles ? (
              // Its own form, outside the report form: a form cannot hold another.
              <button type="submit" form={`unfile-${c.bookingId}`} className="shrink-0 text-[0.76rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)] hover:underline">
                {t('Zurücknehmen', 'Undo')}
              </button>
            ) : null}
          </>
        ) : c.missing.length ? (
          <RecordLink href={`/admin/people/${c.personId}?tab=details`} title={`${t('Fehlt', 'Missing')}: ${missing}`} className="truncate font-semibold text-[#9a5b00]">
            {t('Fehlt', 'Missing')}: {missing}
          </RecordLink>
        ) : (
          <span className="text-[var(--casa-muted)]">{t('Noch nicht gemeldet', 'Not reported yet')}</span>
        )}
      </span>
    </div>
  );
}

function CollectedDialog({ candidate: c, sittingId, t }: { candidate: SittingCandidate; sittingId: string; t: T }) {
  return (
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
  );
}

/** A candidate at the side: the booking and its colour, the money, telc, the result, the letters, how to reach them. */
function CandidatePanel({
  candidate: c,
  sitting,
  user,
  handles,
  sat,
  t,
  lang,
}: {
  candidate: SittingCandidate;
  sitting: ExamSitting;
  user: StaffUser;
  handles: boolean;
  sat: boolean;
  t: T;
  lang: WsLang;
}) {
  const money = { status: c.status, observationReason: c.observationReason as ObservationReason | null, charged: c.charged, paid: c.paid };
  const open = c.charged - c.paid;
  const back = `/admin/catalogue/exams/${sitting.id}`;
  const subject = `${sitting.examName} · ${day(sitting.startsAt, lang, true)}`;
  const partLabel = { written: t('Schriftlich', 'Written'), oral: t('Mündlich', 'Oral') };
  return (
    <SidePanel
      trigger={c.personName}
      triggerClassName={NAME}
      title={c.personName}
      subtitle={[c.number, pick(lang, EXAM_PARTS_LABELS[c.parts])].join(' · ')}
      icon={Icon.person}
      tint="green"
      footer={
        <span className="flex flex-wrap gap-2">
          <ButtonLink href={`/admin/bookings/${c.bookingId}`} variant="primary">
            {t('Zur Buchung', 'Open the booking')}
          </ButtonLink>
          {c.email ? (
            <ButtonLink href={mailHref('person', c.personId, { subject, address: c.email, back })} variant="secondary">
              {Icon.mail}
              {t('E-Mail', 'E-mail')}
            </ButtonLink>
          ) : null}
          <ButtonLink href={recordHrefFor(user, 'person', c.personId) ?? `/admin/people/${c.personId}`} variant="ghost">
            {t('Zur Person', 'Open the learner')}
          </ButtonLink>
        </span>
      }
    >
      <PanelSection title={t('Buchung', 'Booking')}>
        <span className="flex flex-wrap items-center gap-2">
          <BookingLightPill light={bookingLight(money)} label={pick(lang, bookingLightLabel(money))} />
          <RecordLink href={`/admin/bookings/${c.bookingId}`} tone="strong">
            {c.number}
          </RecordLink>
        </span>
      </PanelSection>
      <PanelSection
        title={t('Zahlung', 'Payment')}
        action={
          handles && c.status !== 'cancelled' && owesMoney(open) ? (
            <RecordLink href={`/admin/bookings/${c.bookingId}?pay=1`} tone="strong" className="text-[0.8rem]">
              {t('Zahlung erfassen', 'Record payment')}
            </RecordLink>
          ) : undefined
        }
      >
        {c.charged || c.paid ? (
          <Facts
            rows={[
              { label: t('Berechnet', 'Charged'), value: euros(c.charged) },
              { label: t('Bezahlt', 'Paid'), value: euros(c.paid) },
              {
                label: open < 0 ? t('Guthaben', 'Credit') : t('Offen', 'Owed'),
                value: owesMoney(open) ? <span className="text-[#9a5b00]">{euros(open)}</span> : open < 0 ? euros(-open) : <span className="text-[#17693a]">{t('Nichts', 'Nothing')}</span>,
              },
            ]}
          />
        ) : (
          <p className="text-[var(--casa-muted)]">{t('Noch nichts berechnet', 'Nothing charged yet')}</p>
        )}
      </PanelSection>
      {c.result || sat ? (
        <PanelSection title={t('Ergebnis', 'Result')}>
          {c.result ? (
            <Facts
              rows={[
                ...partsSat(c.parts).map((part) => ({
                  label: partLabel[part],
                  value: c.result?.[part] ? pick(lang, EXAM_OUTCOME_LABELS[c.result[part]!]) : '—',
                })),
                { label: t('Abgeholt', 'Collected'), value: c.result.collectedAt ? [day(c.result.collectedAt, lang, true), c.result.collectedNote].filter(Boolean).join(' · ') : '—' },
              ]}
            />
          ) : (
            <p className="text-[var(--casa-muted)]">{t('Noch kein Ergebnis eingetragen.', 'No result entered yet.')}</p>
          )}
        </PanelSection>
      ) : (
        <PanelSection title="telc">
          {c.filedAt ? (
            <p className="font-semibold text-[#17693a]">{t(`Gemeldet am ${day(c.filedAt, lang, true)}`, `Reported on ${day(c.filedAt, lang, true)}`)}</p>
          ) : (
            <p className="text-[var(--casa-muted)]">{t('Noch nicht gemeldet', 'Not reported yet')}</p>
          )}
          {c.missing.length ? (
            <p className="mt-1.5">
              <span className="font-semibold text-[#9a5b00]">
                {t('Fehlt', 'Missing')}: {c.missing.map((f) => pick(lang, TELC_FIELD_LABELS[f])).join(', ')}
              </span>{' '}
              <RecordLink href={`/admin/people/${c.personId}?tab=details`} tone="strong" className="text-[0.8rem]">
                {t('Ergänzen', 'Fill in')}
              </RecordLink>
            </p>
          ) : null}
        </PanelSection>
      )}
      {c.letters.length ? (
        <PanelSection title={t('Briefe', 'Letters')}>
          <ul className="space-y-1">
            {c.letters.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3">
                <RecordLink href={`/admin/letters/${l.id}`}>{pick(lang, LETTER_KIND_LABELS[l.kind as LetterKind] ?? { de: l.kind, en: l.kind })}</RecordLink>
                <span className="shrink-0 text-[0.78rem] text-[var(--casa-muted)] tabular-nums">{day(l.sentAt, lang, true)}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}
      <PanelSection title={t('Kontakt', 'Contact')}>
        <Facts
          rows={[
            { label: t('E-Mail', 'E-mail'), value: c.email ? <RecordLink href={mailHref('person', c.personId, { subject, address: c.email, back })}>{c.email}</RecordLink> : '—' },
            { label: t('Telefon', 'Phone'), value: c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="underline decoration-ws-line-firm underline-offset-[3px]">{c.phone}</a> : '—' },
          ]}
        />
      </PanelSection>
    </SidePanel>
  );
}

/** A cancelled booking of the sitting, in the panel of those cancelled. */
export function CancelledLine({ candidate: c, t }: { candidate: SittingCandidate; t: T }) {
  return (
    <RecordLink href={`/admin/bookings/${c.bookingId}`} tone="plain" className="flex items-center justify-between gap-3 px-4 py-2 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
      <span className="truncate text-[var(--casa-muted)]">{c.personName}</span>
      <span className="shrink-0 text-xs text-[var(--casa-muted)] tabular-nums">
        {/* Reported, then cancelled: telc still has them. */}
        {c.filedAt ? <span className="mr-2 font-semibold text-[#9a5b00]">{t('war bei telc gemeldet', 'was reported to telc')}</span> : null}
        {c.number}
      </span>
    </RecordLink>
  );
}

// ------------------------------------------------------------ the queue

/**
 * One person in the sitting's queue: their place, the name — which opens them at the side with everything
 * the queue does —, since when and how they came, and the one step the queue is at for them as a button.
 */
export function QueueRow({
  entry,
  queueLength,
  hasPlace,
  lastLetter,
  handles,
  offer,
  sitting,
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
  t: T;
  lang: WsLang;
}) {
  const offered = entry.status === 'offered';
  const back = `/admin/catalogue/exams/${sitting.id}?tab=waiting`;
  const meta = [
    offered && entry.offeredAt
      ? t(`angeboten ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` von ${entry.offeredByName}` : ''}`, `offered ${relativeDays(entry.offeredAt, lang)}${entry.offeredByName ? ` by ${entry.offeredByName}` : ''}`)
      : t(`wartet seit ${day(entry.joinedAt, lang)}`, `waiting since ${day(entry.joinedAt, lang)}`),
    entry.parts !== 'full' ? pick(lang, EXAM_PARTS_LABELS[entry.parts]) : null,
    lastLetter ? t(`${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} ${day(lastLetter.sentAt, lang)}`, `${pick(lang, LETTER_KIND_LABELS[lastLetter.kind])} ${day(lastLetter.sentAt, lang)}`) : null,
  ].filter(Boolean);
  const offerForm = (variant: 'secondary' | 'primary') => (
    <form action={offerPlaceAction}>
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="returnTo" value={back} />
      <Button type="submit" size="sm" variant={variant}>
        {t('Platz anbieten', 'Offer the place')}
      </Button>
    </form>
  );
  const book = (variant: 'secondary' | 'ghost' | 'primary') =>
    offer ? (
      <FormDialog trigger={t('Buchen', 'Book')} title={t(`${entry.personName} buchen`, `Book ${entry.personName}`)} width="lg" size="sm" triggerVariant={variant}>
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
    ) : null;
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
          <SidePanel
            trigger={entry.personName}
            triggerClassName={NAME}
            title={entry.personName}
            subtitle={t(`Platz ${entry.position} von ${queueLength}`, `Place ${entry.position} of ${queueLength}`)}
            icon={Icon.clock}
            tint="sun"
            footer={
              <span className="flex flex-wrap gap-2">
                <ButtonLink href={`/admin/people/${entry.personId}`} variant="secondary">
                  {t('Zur Person', 'Open the learner')}
                </ButtonLink>
                {entry.email ? (
                  <ButtonLink href={mailHref('person', entry.personId, { subject: `${sitting.examName} · ${day(sitting.startsAt, lang, true)}`, address: entry.email, back })} variant="ghost">
                    {Icon.mail}
                    {t('E-Mail', 'E-mail')}
                  </ButtonLink>
                ) : null}
              </span>
            }
          >
            <PanelSection title={t('Warteliste', 'Waiting list')}>
              <Facts
                rows={[
                  { label: t('Stand', 'Status'), value: pick(lang, WAITLIST_STATUS_LABELS[entry.status]) },
                  { label: t('Seit', 'Since'), value: day(entry.joinedAt, lang, true) },
                  { label: t('Teile', 'Parts'), value: pick(lang, EXAM_PARTS_LABELS[entry.parts]) },
                  { label: t('Gekommen über', 'Came through'), value: pick(lang, WAITLIST_SOURCE_LABELS[entry.source]) },
                  ...(entry.registrationId ? [{ label: t('Anmeldung', 'Registration'), value: <RecordLink href={`/admin/registrations/exam/${entry.registrationId}`}>{t('Öffnen', 'Open')}</RecordLink> }] : []),
                ]}
              />
              {entry.note ? <p className="mt-2 rounded-lg bg-[#fff8e1] px-3 py-2 text-[0.84rem] whitespace-pre-line ring-1 ring-[#eedfa6] ring-inset">{entry.note}</p> : null}
            </PanelSection>
            {lastLetter ? (
              <PanelSection title={t('Letzter Brief', 'Last letter')}>
                <span className="flex items-baseline justify-between gap-3">
                  <RecordLink href={`/admin/letters/${lastLetter.id}`}>{pick(lang, LETTER_KIND_LABELS[lastLetter.kind])}</RecordLink>
                  <span className="text-[0.78rem] text-[var(--casa-muted)] tabular-nums">{day(lastLetter.sentAt, lang, true)}</span>
                </span>
              </PanelSection>
            ) : null}
            {handles ? (
              <PanelSection title={t('Was tun', 'What to do')}>
                <div className="flex flex-wrap gap-2">
                  {/* The row holds the step the queue is at (offer the place, or book once offered); booking straight away is here. */}
                  {hasPlace && !offered ? book('secondary') : null}
                  {offered ? (
                    <form action={takeBackOfferAction}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input type="hidden" name="returnTo" value={back} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t('Angebot zurücknehmen', 'Take back the offer')}
                      </Button>
                    </form>
                  ) : null}
                  <ButtonLink href={`/admin/catalogue/waitlist/${entry.id}/letter${offered ? '?kind=place_free' : ''}`} size="sm" variant="secondary">
                    {t('Brief', 'Letter')}
                  </ButtonLink>
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
              </PanelSection>
            ) : null}
          </SidePanel>
          {offered ? <Badge tone="accent">{pick(lang, WAITLIST_STATUS_LABELS.offered)}</Badge> : null}
        </div>
        <p className="mt-0.5 text-[0.78rem] text-[var(--casa-muted)]">{meta.join(' · ')}</p>
      </div>
      {/* The step the queue is at for this person; the rest at the side. */}
      {handles ? <div className="flex items-center gap-1.5">{hasPlace && !offered ? offerForm('secondary') : offered ? book('secondary') : null}</div> : null}
    </li>
  );
}

/** Someone who left the queue: booked, withdrawn, without a place, when. */
export function ClosedEntryLine({ entry, t, lang }: { entry: ExamWaitlistEntry; t: T; lang: WsLang }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[0.84rem]">
      <RecordLink href={`/admin/people/${entry.personId}`} tone="plain" className="font-semibold text-[var(--casa-ink)]">
        {entry.personName}
      </RecordLink>
      <span className="text-[0.78rem] text-[var(--casa-muted)]">
        {pick(lang, WAITLIST_STATUS_LABELS[entry.status])}
        {entry.closedAt ? ` · ${day(entry.closedAt, lang, true)}` : ''}
        {entry.bookingId ? (
          <>
            {' · '}
            <RecordLink href={`/admin/bookings/${entry.bookingId}`}>{t('Buchung', 'Booking')}</RecordLink>
          </>
        ) : null}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ examiners

/** An examiner on one line — the name opens them at the side —, what they do, a licence that does not hold. */
export function ExaminerRow({
  examiner: x,
  sitting,
  others,
  user,
  plans,
  t,
  lang,
}: {
  examiner: SittingExaminer;
  sitting: ExamSitting;
  /** Their other sittings from a fortnight ago on. */
  others: ExaminerSitting[];
  user: StaffUser;
  plans: boolean;
  t: T;
  lang: WsLang;
}) {
  const staffHref = recordHrefFor(user, 'staff', x.staffId);
  const back = `/admin/catalogue/exams/${sitting.id}?tab=examiners`;
  const unlicensed = needsLicence(x.part) && !x.licensed;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-[0.86rem]">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
        <SidePanel
          trigger={x.name}
          triggerClassName={NAME}
          title={x.name}
          subtitle={pick(lang, EXAMINER_PART_LABELS[x.part])}
          icon={Icon.award}
          tint="green"
          footer={
            <span className="flex flex-wrap items-center gap-2">
              {staffHref ? (
                <ButtonLink href={`${staffHref}?tab=exams`} variant="secondary">
                  {t('Zum Profil', 'Open the profile')}
                </ButtonLink>
              ) : null}
              {x.email ? (
                <ButtonLink href={mailHref('staff', x.staffId, { subject: `${sitting.examName} · ${day(sitting.startsAt, lang, true)}`, address: x.email, back })} variant="ghost">
                  {Icon.mail}
                  {t('E-Mail', 'E-mail')}
                </ButtonLink>
              ) : null}
              {plans ? (
                <form action={unassignExaminerAction} className="ml-auto">
                  <input type="hidden" name="sittingId" value={sitting.id} />
                  <input type="hidden" name="staffId" value={x.staffId} />
                  <ConfirmSubmit
                    title={t(`${x.name} austragen?`, `Take ${x.name} off?`)}
                    description={t('Die Person steht dann nicht mehr bei diesem Termin.', 'They are then no longer on this sitting.')}
                    confirmLabel={t('Austragen', 'Take off')}
                    variant="ghost"
                    size="md"
                  >
                    {t('Austragen', 'Take off')}
                  </ConfirmSubmit>
                </form>
              ) : null}
            </span>
          }
        >
          <PanelSection title={t('Bei diesem Termin', 'At this sitting')}>
            <Facts
              rows={[
                { label: t('Aufgabe', 'Task'), value: pick(lang, EXAMINER_PART_LABELS[x.part]) },
                {
                  label: t('Lizenz', 'Licence'),
                  value: !needsLicence(x.part) ? (
                    <span className="font-normal text-[var(--casa-muted)]">{t('Für die Aufsicht nicht nötig', 'Not needed to supervise')}</span>
                  ) : x.licensed ? (
                    <span className="text-[#17693a]">{t('Gültig am Prüfungstag', 'Valid on the day')}</span>
                  ) : (
                    <span className="text-[#9a5b00]">{t('Keine gültige Lizenz am Prüfungstag', 'No valid licence on the day')}</span>
                  ),
                },
              ]}
            />
          </PanelSection>
          <PanelSection title={t('Kontakt', 'Contact')}>
            <Facts
              rows={[
                { label: t('E-Mail', 'E-mail'), value: x.email ? <RecordLink href={mailHref('staff', x.staffId, { address: x.email, back })}>{x.email}</RecordLink> : '—' },
                { label: t('Telefon', 'Phone'), value: x.phone ? <a href={`tel:${x.phone.replace(/[^\d+]/g, '')}`} className="underline decoration-ws-line-firm underline-offset-[3px]">{x.phone}</a> : '—' },
              ]}
            />
          </PanelSection>
          {others.length ? (
            <PanelSection title={t('Weitere Termine', 'Other sittings')}>
              <ul className="space-y-1">
                {others.map((o) => (
                  <li key={o.sittingId} className="flex items-baseline justify-between gap-3">
                    <RecordLink href={`/admin/catalogue/exams/${o.sittingId}`} className={o.cancelled ? 'line-through' : undefined}>
                      {o.examName}
                    </RecordLink>
                    <span className="shrink-0 text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
                      {day(o.startsAt, lang, true)} · {pick(lang, EXAMINER_PART_LABELS[o.part])}
                    </span>
                  </li>
                ))}
              </ul>
            </PanelSection>
          ) : null}
        </SidePanel>
        <span className="text-[var(--casa-muted)]">{pick(lang, EXAMINER_PART_LABELS[x.part])}</span>
        {unlicensed ? <Badge tone="warning">{t('Keine gültige Lizenz am Prüfungstag', 'No valid licence on the day')}</Badge> : null}
      </span>
    </li>
  );
}
