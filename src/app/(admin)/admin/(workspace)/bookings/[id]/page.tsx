import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  addFollowUpAction,
  cancelBookingAction,
  completeFollowUpAction,
  deleteBookingAction,
  removeChargeAction,
  removePeriodAction,
  addSuggestedChargesAction,
  setBooksHandedOutAction,
  voidPaymentAction,
} from '../actions';
import { BookingColour } from '../booking-colour';
import { CarryOverForm, ChargeForm, EditBookingForm, ExamChangeForm, ExtendBookingForm, PaymentForm, PeriodLevelForm } from '../booking-forms';
import { RecordFoot } from '../record-foot';
import { RowMenu } from '../row-menu';
import { BookLine } from '@/components/admin/book-line';
import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MoreInPanel } from '@/components/admin/more-in-panel';
import { RecordLink } from '@/components/admin/record-link';
import { RecordTabLink, RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { MetaItem, MetaLine, Stat, StatBar, Timeline, type TimelineEvent } from '@/components/admin/record-parts';
import { dayRange } from '@/components/admin/list';
import { Badge, Button, Card, DateText, DetailList, Field, Input, RecordHeader, type BadgeTone } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { recordHref, recordHrefFor } from '@/lib/admin/record-href';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  bookingLight,
  bookingAttendance,
  bookingCourses,
  bookingFollowUps,
  bookingLedgerExtras,
  bookingStays,
  carryOverTargets,
  CHARGE_KIND_LABELS,
  getBooking,
  type BookingCharge,
  type ChargeKind,
  type Payment,
  type PaymentMethod,
  listCohortOptions,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  storedWords,
} from '@/lib/admin/bookings';
import { expectedCharges, stayVocabulary } from '@/lib/admin/booking-offer';
import { SESSION_COLOURS, SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { WEEKDAY_LABELS, WEEKDAYS } from '@/lib/admin/kursplanung/types';
import { weekdayOf } from '@/lib/admin/kursplanung/weeks';
import { commissionTerms, getOrganisation } from '@/lib/admin/organisations';
import { ORGANISATION_KIND_LABELS } from '@/lib/admin/organisation-labels';
import { listCourseTypes } from '@/lib/admin/catalogue';
import { EXAM_OUTCOME_LABELS, EXAM_OVERALL_LABELS, EXAM_PARTS_LABELS, overallOutcome } from '@/lib/admin/exam-parts';
import { sittingsOf } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { listNotes } from '@/lib/admin/notes';
import { levelCodes } from '@/lib/admin/waitlist';
import { teachingWeeks } from '@/lib/admin/offers/course';
import { toDateInputValue, todayInputValue } from '@/lib/dates';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { LetterList } from '@/components/admin/letters/letter-list';
import { bookingLetterContext } from '@/lib/admin/letters/booking-context';
import { BOOKING_LETTER_KEYS, LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForBooking } from '@/lib/admin/letters/repo';
import { suggestBookingLetters } from '@/lib/admin/letters/suggest';
import { num, pick, wsLocale, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';
import { owesMoney } from '@/lib/admin/open-money';

/** The order of the account's charges: the course and its fees, the books, the stay, the deposit, the rest, then what comes off. */
const CHARGE_ORDER: ChargeKind[] = ['tuition', 'enrolment_fee', 'exam_fee', 'books', 'accommodation', 'deposit', 'other', 'discount', 'cancellation'];

/** How a payment came, as a badge: what was paid at the desk (cash, card) stands out from a transfer. */
const METHOD_TONES: Record<PaymentMethod, BadgeTone> = {
  cash: 'positive',
  card: 'accent',
  transfer: 'neutral',
  carryover: 'quiet',
  agency: 'warning',
  offset: 'quiet',
};

/** The weekdays a teacher has a class: „Mo–Mi", or „Mo, Do". */
function dayRun(dates: readonly string[], lang: WsLang): string {
  const days = dates.map((d) => weekdayOf(d)).filter((d): d is NonNullable<typeof d> => d !== null);
  const index = days.map((d) => WEEKDAYS.indexOf(d));
  const label = (d: (typeof days)[number]) => pick(lang, WEEKDAY_LABELS[d]);
  const consecutive = index.every((n, i) => i === 0 || n === index[i - 1] + 1);
  return days.length > 1 && consecutive ? `${label(days[0])}–${label(days[days.length - 1])}` : days.map(label).join(', ');
}

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    n
  );

/**
 * A line of a ledger: what it is, its amount in a fixed column, and the slot
 * for its row menu („…"). The column widths are fixed so the amounts of every
 * line and the total in the card's foot stand under one another.
 */
function LedgerLine({
  children,
  amount,
  action,
  withAction,
  className,
}: {
  children: ReactNode;
  amount: ReactNode;
  action?: ReactNode;
  /** Whether this list has a remove column, so lines without a button keep it. */
  withAction: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="w-28 shrink-0 text-right text-sm tabular-nums">{amount}</div>
      {withAction ? <div className="flex w-6 shrink-0 justify-end">{action}</div> : null}
    </div>
  );
}

/**
 * The cost lines as the card shows them (2026-10-20): a charge and its reversal — „Kurspreis · Storno
 * Kurspreis 9 Wochen" at −1.057,50 € against „Kurspreis · 9 Wochen" at 1.057,50 € — are one line,
 * cancelled. A reversal is a line below zero of the same kind and the same amount; when several lines
 * could be the one it reverses, it is the one whose words it repeats. Where SchoolMan marked the pair
 * (`reversed`, 0094), a marked reversal only cancels a marked line. The lines that count come first,
 * in their order, then the cancelled ones; nothing is hidden, so the total adds up on the card.
 */
function foldReversals(charges: readonly BookingCharge[]): { line: BookingCharge; reversal: BookingCharge | null }[] {
  const words = (text: string) =>
    new Set(
      text
        .toLocaleLowerCase('de')
        .replace(/·/g, ' ')
        .split(/\s+/)
        .filter((w) => w && w !== 'storno')
    );
  const reversalOf = new Map<string, BookingCharge>();
  for (const minus of charges) {
    if (minus.amount >= 0) continue;
    const own = words(minus.description);
    let best: BookingCharge | null = null;
    let bestShared = -1;
    for (const plus of charges) {
      if (plus.amount <= 0 || plus.kind !== minus.kind || reversalOf.has(plus.id) || Math.abs(plus.amount + minus.amount) > 0.005) continue;
      if (minus.reversed && !plus.reversed) continue;
      const shared = [...words(plus.description)].filter((w) => own.has(w)).length;
      if (shared > bestShared) {
        best = plus;
        bestShared = shared;
      }
    }
    if (best) reversalOf.set(best.id, minus);
  }
  const reversals = new Set([...reversalOf.values()].map((c) => c.id));
  return [
    ...charges.filter((c) => !reversalOf.has(c.id) && !reversals.has(c.id)).map((line) => ({ line, reversal: null })),
    ...charges.filter((c) => reversalOf.has(c.id)).map((line) => ({ line, reversal: reversalOf.get(line.id)! })),
  ];
}

/**
 * One booking — the screen FileMaker's Booking layout becomes — in the record
 * pages' one design (2026-10-15).
 *
 * The head says what the booking is: the course, the dates and weeks, the stay,
 * who pays, with the status and the visa beside the name; its bar is the money —
 * the total, what has come in, what is still open — with a line that fills as it
 * is paid. Left: the periods when there are several, the cost lines and the
 * payments, each a ledger with its own add button, its total in the foot and its
 * own confirmation on removal. Right: what else belongs to the booking (where it
 * came from, the stay's dates, its own note) and the notes and changes in one
 * line of time. Cancelling and deleting sit at the foot of the page, quiet, away
 * from the routine actions in the head.
 */
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** `pay=1` opens „Zahlung erfassen" at once: the list's action for a booking with money open. */
  searchParams: Promise<{ error?: string; pay?: string; tab?: string }>;
}) {
  const [{ id }, { error, pay, tab }, user] = await Promise.all([
    params,
    searchParams,
    requireModule('bookings'),
  ]);
  const booking = await getBooking(id);
  if (!booking) notFound();
  const { t, lang } = await getI18n();

  const canEdit = canAccess(user, 'bookings', 'edit');
  const canFull = canAccess(user, 'bookings', 'full');
  const open = booking.status !== 'cancelled';
  // The team's colour (docs/schoolman/bookings.md): red cancelled, yellow under observation, grey
  // until paid in full, green when all is well.
  const light = bookingLight(booking);

  // A credit — paid over, or what is left of a cancelled booking — can be carried over to another
  // booking of the same learner (docs/schoolman/money.md).
  const credit = booking.balance < -0.005 ? -booking.balance : 0;

  const exam = booking.exam;
  const org = booking.payerOrganisation;
  const [notes, activity, cohorts, courseTypes, targets, levels, letters, sittings, stays, arranged, followUps, extras, attendance, courses, payerOrg, terms] = await Promise.all([
    listNotes('booking', booking.id),
    activityFor('booking', booking.id),
    canEdit && !exam ? listCohortOptions() : Promise.resolve([]),
    canEdit && !exam ? listCourseTypes() : Promise.resolve([]),
    canEdit && credit > 0 ? carryOverTargets(booking.id) : Promise.resolve([]),
    canEdit && !exam ? levelCodes() : Promise.resolve([]),
    lettersForBooking(booking.id),
    canEdit && exam && open ? sittingsOf(exam.examTypeId) : Promise.resolve([]),
    canEdit && !exam && open ? stayVocabulary() : Promise.resolve(null),
    bookingStays(booking.id),
    bookingFollowUps(booking.id),
    bookingLedgerExtras(booking.id),
    bookingAttendance(booking.id),
    exam ? Promise.resolve([]) : bookingCourses(booking.id),
    org ? getOrganisation(org.id) : Promise.resolve(null),
    org ? commissionTerms(org.id) : Promise.resolve([]),
  ]);
  // What the price list says the booking should cost and it does not show yet: the course price, the
  // level's books, the enrolment fee once per learner (2026-10-23).
  const expected =
    canEdit && open && !exam
      ? await expectedCharges({
          bookingId: booking.id,
          personId: booking.personId,
          courseTypeId: booking.courseTypeId,
          periods: courses.map((c) => ({ courseInstanceId: c.courseInstanceId, startDate: c.startDate, endDate: c.endDate, levelCode: c.levelCode })),
          levelRange: booking.levelRange,
          charges: booking.charges,
        })
      : [];
  // The stays as arranged (0056), each in words: when, what kind, where, which room, meals.
  const stayNames = arranged.length ? (stays ?? (await stayVocabulary())) : null;
  const stayName = (list: { code: string; name: { de: string; en: string } }[] | undefined, code: string | null) =>
    code ? (list?.find((v) => v.code === code)?.name[lang] ?? code) : null;
  const carriesOver = targets.length > 0;
  // The letter due now, from the booking and what was sent: the first thing the Briefe card offers.
  const letterCtx = canEdit ? await bookingLetterContext(booking.id) : null;
  const dueLetter = letterCtx
    ? (suggestBookingLetters(
        letterCtx,
        toDateInputValue(new Date()),
        letters.map((l) => ({ kind: l.kind, date: toDateInputValue(l.sentAt) }))
      )[0] ?? null)
    : null;


  // Teaching weeks: the school's closures (the Christmas break) are not weeks of the course.
  const weeks = booking.startDate && booking.endDate ? teachingWeeks(toDateInputValue(booking.startDate), toDateInputValue(booking.endDate)) : null;
  const stay = booking.accommodation;
  const removesCharges = canFull && open;
  // The account in the order finance reads it (2026-10-23): the course, its fees, the books, the stay,
  // the deposit, the rest, then what comes off — each kind in the order it was charged.
  const orderedCharges = [...booking.charges].sort(
    (a, b) => CHARGE_ORDER.indexOf(a.kind) - CHARGE_ORDER.indexOf(b.kind) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  // A cost line in words: its own text (its kind's label in this language when that is all it says),
  // and its kind when the text does not already say it.
  const chargeWords = (c: BookingCharge) => {
    const kindLabel = CHARGE_KIND_LABELS[c.kind];
    const isKind = c.description === kindLabel.en || c.description === kindLabel.de;
    const description = isKind ? pick(lang, kindLabel) : storedWords(c.description, lang);
    const said = [kindLabel.de, kindLabel.en].some((k) => description.toLocaleLowerCase('de').includes(k.toLocaleLowerCase('de')));
    return { description, kind: said ? null : pick(lang, kindLabel) };
  };
  // Removing one cost line, asked once more, from its row menu.
  const removeChargeForm = (c: BookingCharge, description: string, label: string) => (
    <form action={removeChargeAction}>
      <input type="hidden" name="bookingId" value={booking.id} />
      <input type="hidden" name="chargeId" value={c.id} />
      <ConfirmSubmit
        title={t(`„${description}“ entfernen?`, `Remove "${description}"?`)}
        description={t('Der Posten wird aus der Buchung entfernt.', 'The line is removed from the booking.')}
        confirmLabel={t('Entfernen', 'Remove')}
        variant="ghost"
      >
        {label}
      </ConfirmSubmit>
    </form>
  );
  // The payments that count are lines on the card; the voided ones open at the side, newest first.
  const received = booking.payments.filter((p) => !p.voidedAt);
  const voided = booking.payments.filter((p) => p.voidedAt).reverse();
  const voidsPayments = canFull && received.length > 0;
  // A reference SchoolMan kept twice, or in both languages on two lines, on one line.
  const paymentReference = (reference: string | null) =>
    reference ? [...new Set(reference.split('\n').map((l) => l.trim()).filter(Boolean))].join(' / ') : null;
  // A payment's day, how it came (a carry-over: the booking on its other side) and its reference.
  const paymentHow = (p: Payment) => {
    const reference = paymentReference(p.reference);
    return (
      <>
        {p.counterpart ? (
          <>
            {p.amount < 0 ? t('an ', 'to ') : t('von ', 'from ')}
            <Link href={`/admin/bookings/${p.counterpart.id}`} className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
              {p.counterpart.courseTypeName ?? t('Buchung', 'Booking')}
              {p.counterpart.startDate ? (
                <>
                  {t(' ab ', ' from ')}
                  <DateText value={p.counterpart.startDate} compact />
                </>
              ) : null}
            </Link>
          </>
        ) : (
          pick(lang, PAYMENT_METHOD_LABELS[p.method])
        )}
        {reference ? ` · ${reference}` : ''}
      </>
    );
  };
  // Beside the method's badge: a carry-over's other booking, else the cost line it settles (0094) and the reference.
  const paymentNote = (p: Payment) => {
    const reference = paymentReference(p.reference);
    const settles = p.forCharge ? t(`für ${storedWords(p.forCharge, lang)}`, `for ${storedWords(p.forCharge, lang)}`) : null;
    return p.counterpart ? paymentHow(p) : [settles, reference].filter(Boolean).join(' · ') || null;
  };
  // Who booked a payment, for its line's tooltip.
  const bookedBy = (p: Payment) => (p.recordedByName ? t(`gebucht von ${p.recordedByName}`, `booked by ${p.recordedByName}`) : null);
  const paymentWhen = (p: Payment) => (
    <>
      <DateText value={p.receivedAt} compact /> · {paymentHow(p)}
    </>
  );
  // The record's own fields, those that have a value: when it was booked is
  // in the head, so a booking with nothing else has no card for it.
  const single = booking.periods.length === 1 ? booking.periods[0] : null;
  // A period's level, set or changed in a small dialog: what the cohort's places count (the waiting list, 0031).
  const levelValue = (period: { id: string; levelCode: string | null }) => (
    <span className="flex items-center gap-2">
      {period.levelCode ? <span className="font-semibold">{period.levelCode}</span> : <span className="text-[var(--casa-text-subtle)]">—</span>}
      {canEdit && booking.status !== 'cancelled' ? (
        <FormDialog icon={Icon.bookings} tint="red" trigger={period.levelCode ? t('Ändern', 'Change') : t('Festlegen', 'Set')} title={t('Niveau', 'Level')} size="sm" triggerVariant="ghost">
          <PeriodLevelForm bookingId={booking.id} periodId={period.id} levelCode={period.levelCode} levels={levels} />
        </FormDialog>
      ) : null}
    </span>
  );
  const recordFields = [
    // How often they came, as the Klassenbuch recorded it; the days missed are on their own tab.
    attendance
      ? {
          label: t('Anwesenheit', 'Attendance'),
          wide: true,
          value: (
            <RecordTabLink to="attendance" className="text-[0.88rem] whitespace-nowrap">
              {num(lang, Math.round((attendance.present / attendance.days) * 100))} %
              <span className="font-medium text-[var(--casa-muted)]">
                {t(` · ${num(lang, attendance.present)} von ${num(lang, attendance.days)} Tagen`, ` · ${num(lang, attendance.present)} of ${num(lang, attendance.days)} days`)}
              </span>
            </RecordTabLink>
          ),
        }
      : null,
    // An exam candidate is reported to telc before the deadline; the sitting's page marks it.
    exam && open
      ? {
          label: t('Bei telc gemeldet', 'Reported to telc'),
          value: exam.filedAt ? (
            <span>
              <DateText value={exam.filedAt} />
              {exam.filedByName ? ` · ${exam.filedByName}` : ''}
            </span>
          ) : (
            <RecordLink href={recordHrefFor(user, 'exam', exam.sessionId)} className="font-medium text-[#9a5b00]">
              {t('Noch nicht', 'Not yet')}
            </RecordLink>
          ),
        }
      : null,
    // telc's result, once entered on the sitting's page, and whether it was collected.
    exam?.result
      ? {
          label: t('Ergebnis', 'Result'),
          value: (
            <span>
              <span className="font-semibold">
                {(() => {
                  const overall = overallOutcome(exam.parts, exam.result);
                  return overall ? pick(lang, EXAM_OVERALL_LABELS[overall]) : t('Unvollständig', 'Incomplete');
                })()}
              </span>
              {exam.parts === 'full'
                ? ` · ${t('schriftlich', 'written')} ${exam.result.written ? pick(lang, EXAM_OUTCOME_LABELS[exam.result.written]).toLowerCase() : '—'}, ${t('mündlich', 'oral')} ${exam.result.oral ? pick(lang, EXAM_OUTCOME_LABELS[exam.result.oral]).toLowerCase() : '—'}`
                : ''}
              {exam.result.collectedAt ? (
                <span className="block text-xs text-[var(--casa-muted)]">
                  {t('abgeholt', 'collected')} <DateText value={exam.result.collectedAt} />
                  {exam.result.collectedNote ? ` · ${exam.result.collectedNote}` : ''}
                </span>
              ) : null}
            </span>
          ),
        }
      : null,
    exam?.sourceRegistrationId && canAccess(user, 'registrations')
      ? {
          label: t('Aus der Anmeldung', 'From registration'),
          value: (
            <Link href={`/admin/registrations/exam/${exam.sourceRegistrationId}`} className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
              {t('Öffnen', 'Open')}
            </Link>
          ),
        }
      : null,
    booking.observationReason
      ? {
          label: t('Unter Beobachtung', 'Under observation'),
          wide: true,
          value: (
            <span>
              {/* A note written before the colours were simplified (2026-10-18) stays readable. */}
              {booking.observationNote ? <span className="block whitespace-pre-line">{booking.observationNote}</span> : null}
              <span className="block text-xs text-[var(--casa-muted)]">
                {t('seit', 'since')} <DateText value={booking.observedAt} />
                {booking.observedByName ? ` · ${booking.observedByName}` : ''}
              </span>
            </span>
          ),
        }
      : null,
    booking.cancelledAt
      ? {
          label: t('Storniert', 'Cancelled'),
          value: (
            <span>
              <DateText value={booking.cancelledAt} />
              {booking.cancelReason ? ` · ${storedWords(booking.cancelReason, lang)}` : ''}
            </span>
          ),
        }
      : null,
    booking.sourceRegistrationId && canAccess(user, 'registrations')
      ? {
          label: t('Aus der Anmeldung', 'From registration'),
          value: (
            <Link
              href={`/admin/registrations/course/${booking.sourceRegistrationId}`}
              className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
            >
              {t('Öffnen', 'Open')}
            </Link>
          ),
        }
      : null,
    arranged.length
      ? {
          label: arranged.length > 1 ? t('Unterkünfte', 'Stays') : t('Unterkunft', 'Stay'),
          wide: true,
          value: (
            <ul className="space-y-1">
              {arranged.map((a) => (
                <li key={a.id} className={cn('text-[0.86rem]', a.cancelled && 'text-[var(--casa-muted)] line-through')}>
                  <span className="font-semibold tabular-nums">{dayRange(a.from, a.to, lang)}</span>
                  {' · '}
                  {[stayName(stayNames?.types, a.typeCode)].filter(Boolean).join('')}
                  {a.place ? (
                    <>
                      {stayName(stayNames?.types, a.typeCode) ? ' · ' : ''}
                      {a.placeId && canAccess(user, 'accommodation') ? (
                        <Link href={`/admin/accommodation/${a.placeId}`} className="font-semibold text-[var(--fm-navy)] hover:underline">
                          {a.place}
                        </Link>
                      ) : (
                        a.place
                      )}
                    </>
                  ) : null}
                  {[a.room, stayName(stayNames?.rooms, a.roomTypeCode), stayName(stayNames?.catering, a.cateringCode)]
                    .filter(Boolean)
                    .map((part) => ` · ${part}`)
                    .join('')}
                  {a.departureConfirmed ? <span className="text-[var(--casa-muted)]"> · {t('Abreise bestätigt', 'Departure confirmed')}</span> : null}
                  {a.cancelled ? <span className="no-underline"> · {t('abgesagt', 'called off')}</span> : null}
                </li>
              ))}
            </ul>
          ),
        }
      : stay && stay.from
        ? {
            label: t('Unterkunft', 'Stay'),
            wide: true,
            value: (
              <>
                <DateText value={stay.from} /> – <DateText value={stay.to} />
              </>
            ),
          }
        : null,
  ].filter((item) => item !== null);
  // The observation in the booking's history: who set it and ended it, and a note an older one had.
  const observationEvents: TimelineEvent[] = activity
    .filter((entry) => entry.action === 'booking_observed' || entry.action === 'booking_observation_ended')
    .map((entry) => {
      const note = typeof entry.detail?.note === 'string' && entry.detail.note ? entry.detail.note : null;
      const observed = entry.action === 'booking_observed';
      return {
        id: entry.id,
        at: entry.createdAt,
        icon: observed ? Icon.attention : Icon.check,
        who: entry.staffName ?? t('Jemand', 'Someone'),
        what: observed ? t('hat die Buchung unter Beobachtung gestellt', 'put the booking under observation') : t('hat die Beobachtung beendet', 'ended the observation'),
        body: observed ? (note ?? undefined) : undefined,
        tone: observed ? ('watch' as const) : undefined,
      };
    });
  // A cohort's label is its title, or "Course · 31.08.26 – 23.10.26" built
  // from the course and dates the head already shows; only a title is news.
  const singleCohortTitle =
    single?.cohortLabel && !/\d{2}\.\d{2}\.\d{2} – \d{2}\.\d{2}\.\d{2}$/.test(single.cohortLabel)
      ? single.cohortLabel
      : null;

  // One cost line: its words (a book line red until handed out, green after, 0087), its amount, its row menu.
  const costRows = foldReversals(orderedCharges);
  const costRow = ({ line, reversal }: { line: BookingCharge; reversal: BookingCharge | null }) => {
        const { description, kind } = chargeWords(line);
        return (
          <li key={line.id} title={reversal ? `${description} · ${chargeWords(reversal).description}` : description}>
            <LedgerLine
              className="min-h-7 py-0.5"
              withAction={removesCharges}
              amount={
                reversal ? (
                  // Cancelled: the amount it was, struck through; it does not count.
                  <span className="text-[var(--casa-muted)] line-through">{money(line.amount, booking.currency)}</span>
                ) : (
                  <span className={cn('font-semibold', line.amount < 0 ? 'text-[var(--casa-danger-text)]' : '')}>
                    {money(line.amount, booking.currency)}
                  </span>
                )
              }
              action={
                removesCharges ? (
                  <RowMenu label={t(`Aktionen: ${description}`, `Actions: ${description}`)}>
                    {reversal ? (
                      <>
                        {removeChargeForm(line, description, t('Posten entfernen', 'Remove the line'))}
                        {removeChargeForm(reversal, chargeWords(reversal).description, t('Storno entfernen', 'Remove the reversal'))}
                      </>
                    ) : (
                      removeChargeForm(line, description, t('Entfernen', 'Remove'))
                    )}
                  </RowMenu>
                ) : null
              }
            >
              <span className={cn('flex min-w-0 items-center gap-1.5 text-sm', reversal && 'text-[var(--casa-muted)]')}>
                {line.books && !reversal && line.amount > 0 && booking.status !== 'cancelled' ? (
                  // The books: red until handed out, green after (0087).
                  <BookLine
                    key={`${line.id}:${line.books.handedOut}`}
                    id={line.id}
                    label={description}
                    handedOut={line.books.handedOut}
                    detail={
                      line.books.at
                        ? [line.books.at.toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }), line.books.by].filter(Boolean).join(' · ')
                        : null
                    }
                    canEdit={canEdit}
                    onSet={setBooksHandedOutAction}
                  />
                ) : (
                  <span className={cn('truncate', reversal ? 'min-w-0 font-medium line-through' : 'max-w-full shrink-0 font-semibold')}>{description}</span>
                )}
                {/* The kind only when the line's own words do not already say it. */}
                {kind ? <span className="min-w-0 truncate text-xs text-[var(--casa-muted)]">· {kind}</span> : null}
                {reversal ? <Badge tone="quiet" className="shrink-0">{t('Storniert', 'Cancelled')}</Badge> : null}
              </span>
            </LedgerLine>
          </li>
        );
  };

  // The course shown in full: the one running, else the next, else the last.
  const focusId = (courses.find((c) => c.when === 'running') ?? courses.find((c) => c.when === 'upcoming') ?? courses[courses.length - 1])?.id ?? null;
  // The booking in tabs, as the learner's page (2026-10-23, Rahman: „one of the most important interfaces,
  // for office and finance"): the account first, the rest a click away instead of a column without end.
  const hasLedgerExtras = extras.instalments.length + extras.commissions.length + extras.payouts.length + extras.invoices.length > 0;
  const tabs: RecordTab[] = [
    { id: 'overview', label: t('Übersicht', 'Overview'), icon: Icon.overview },
    ...(attendance ? [{ id: 'attendance', label: t('Anwesenheit', 'Attendance'), icon: Icon.check }] : []),
    { id: 'letters', label: t('Briefe', 'Letters'), icon: Icon.mail, count: letters.length },
    ...(hasLedgerExtras ? [{ id: 'accounting', label: t('Abrechnung', 'Accounting'), icon: Icon.statement }] : []),
    { id: 'history', label: t('Notizen und Verlauf', 'Notes and history'), icon: Icon.note, count: notes.length },
  ];

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/bookings"
        backLabel={t('Buchungen', 'Bookings')}
        // The learner's name opens the learner.
        title={<RecordLink href={recordHrefFor(user, 'person', booking.personId)} tone="plain">{booking.personName}</RecordLink>}
        trailLabel={`${booking.personName} · ${booking.number}`}
        avatar={booking.personName}
        status={
          <>
            {/* The colour, and on a click the colours to choose from: the money's own, or yellow with its reason. */}
            <BookingColour
              booking={booking}
              lang={lang}
              canEdit={canEdit}
              canCancel={canAccess(user, 'bookings', 'full')}
              variant="pill"
              detail={
                light === 'unclear' && booking.balance > 0.005
                    ? // „Offen · 2.052,98 €", „Anzahlung erhalten · 1.852,98 € offen".
                      booking.paid > 0.005
                      ? t(`${money(booking.balance, booking.currency)} offen`, `${money(booking.balance, booking.currency)} open`)
                      : money(booking.balance, booking.currency)
                    : credit > 0
                      ? t(`${money(credit, booking.currency)} Guthaben`, `${money(credit, booking.currency)} credit`)
                      : undefined
              }
            />
            {/* Confirmed is the usual state and cancelled is the red; only reserved and completed add something. */}
            {booking.status === 'reserved' || booking.status === 'completed' ? (
              <Badge tone={BOOKING_STATUS_TONES[booking.status]}>{pick(lang, BOOKING_STATUS_LABELS[booking.status])}</Badge>
            ) : null}
            {booking.visaRequired ? <Badge tone="warning">{t('Visum nötig', 'Visa required')}</Badge> : null}
          </>
        }
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {booking.courseTypeName ?? t('Buchung', 'Booking')}
              {exam && exam.parts !== 'full' ? <span className="font-medium text-[var(--casa-muted)]"> · {pick(lang, EXAM_PARTS_LABELS[exam.parts])}</span> : null}
              {/* How much of the level: „A2.1–A2.2" for a whole level, as the letters say it. */}
              {booking.levelRange ? <span className="font-medium text-[var(--casa-muted)]"> · {booking.levelRange}</span> : null}
              {singleCohortTitle ? (
                <span className="font-medium text-[var(--casa-muted)]">
                  {' · '}
                  <RecordLink href={recordHrefFor(user, 'start', single?.courseInstanceId)}>{singleCohortTitle}</RecordLink>
                </span>
              ) : null}
              {/* The number a learner writes on a transfer and finance matches payments by. */}
              <span className="ml-2 text-[0.84rem] font-semibold text-[var(--casa-muted)] tabular-nums">{booking.number}</span>
              {/* SchoolMan's own number (0052): on its receipts, so finance and learners still quote it (2026-10-21). */}
              {booking.schoolmanNumber ? (
                <span className="ml-2 text-[0.78rem] font-medium text-[var(--casa-text-subtle)] tabular-nums" title={t('Nummer in SchoolMan', 'Number in SchoolMan')}>
                  SchoolMan {booking.schoolmanNumber}
                </span>
              ) : null}
            </span>
            <MetaLine>
              {exam ? (
                // An exam's day is its sitting's, with the time it begins; the sitting has its own page.
                <MetaItem icon={Icon.calendar}>
                  <RecordLink href={recordHrefFor(user, 'exam', exam.sessionId)}>
                    {new Date(exam.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(exam.startsAt).toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit' })}
                  </RecordLink>
                </MetaItem>
              ) : (
                <MetaItem icon={Icon.calendar}>
                  {booking.startDate ? (
                    <>
                      <DateText value={booking.startDate} compact /> – <DateText value={booking.endDate} compact />
                      {weeks ? ` · ${weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`)}` : ''}
                      {booking.periods.length > 1 ? ` · ${t(`${booking.periods.length} Zeiträume`, `${booking.periods.length} periods`)}` : ''}
                    </>
                  ) : (
                    t('Noch keine Daten', 'No dates yet')
                  )}
                  {single && !single.courseInstanceId ? <Badge tone="warning" className="ml-2">{t('Noch kein Termin', 'No cohort yet')}</Badge> : null}
                </MetaItem>
              )}
              {exam && !stay ? null : (
                <MetaItem icon={Icon.rooms}>
                  {stay
                    ? [stay.typeName, stay.roomTypeName, stay.cateringName]
                        .filter((name) => name !== null)
                        .map((name) => pick(lang, name))
                        .join(' · ')
                    : t('Keine Unterkunft', 'No accommodation')}
                </MetaItem>
              )}
              <MetaItem icon={Icon.person}>
                {pick(lang, PAYER_LABELS[booking.payer])}
                {booking.payerOrganisation ? (
                  <>
                    {' · '}
                    {canAccess(user, 'organisations') ? (
                      <Link href={`/admin/organisations/${booking.payerOrganisation.id}`} className="font-semibold text-[var(--fm-navy)] hover:underline">
                        {booking.payerOrganisation.name}
                      </Link>
                    ) : (
                      booking.payerOrganisation.name
                    )}
                  </>
                ) : booking.payerName ? (
                  ` · ${booking.payerName}`
                ) : (
                  ''
                )}
              </MetaItem>
              {booking.groupVisit ? (
                <MetaItem icon={Icon.group}>
                  {canAccess(user, 'groups') ? (
                    <Link href={`/admin/groups/${booking.groupVisit.id}`} className="font-semibold text-[var(--fm-navy)] hover:underline">
                      {booking.groupVisit.name}
                    </Link>
                  ) : (
                    booking.groupVisit.name
                  )}
                </MetaItem>
              ) : null}
              {canAccess(user, 'people') ? (
                <MetaItem icon={Icon.people}>
                  <RecordLink href={recordHrefFor(user, 'person', booking.personId)} tone="strong">
                    {t('Zur Person', 'Student page')}
                  </RecordLink>
                </MetaItem>
              ) : null}
            </MetaLine>
          </>
        }
        actions={
          <>
            {canEdit && open && exam ? (
              <FormDialog icon={Icon.calendar} tint="red" trigger={t('Termin ändern', 'Change sitting')} title={t('Termin und Teile', 'Sitting and parts')} size="sm">
                <ExamChangeForm booking={booking} sittings={sittings} />
              </FormDialog>
            ) : canEdit && open ? (
              <FormDialog icon={Icon.calendar} tint="red" trigger={t('Verlängern', 'Extend')} title={t('Buchung verlängern', 'Extend the booking')}>
                <ExtendBookingForm booking={booking} cohorts={cohorts} levels={levels} />
              </FormDialog>
            ) : null}
            {canEdit ? (
              <FormDialog icon={Icon.bookings} tint="ink" trigger={t('Bearbeiten', 'Edit')} title={t('Buchung bearbeiten', 'Edit the booking')}>
                <EditBookingForm booking={booking} courseTypes={courseTypes} stays={stays} />
              </FormDialog>
            ) : null}
          </>
        }
        bar={
          <StatBar>
            <Stat label={t('Gesamt', 'Total')}>{money(booking.charged, booking.currency)}</Stat>
            <Stat label={t('Bezahlt', 'Paid')}>
              <span className="text-[#17693a]">{money(booking.paid, booking.currency)}</span>
            </Stat>
            <Stat label={booking.balance < 0 ? t('Überzahlt', 'Paid over') : t('Offen', 'Balance')}>
              <span className={owesMoney(booking.balance) ? 'text-[#9a5b00]' : booking.balance < -0.005 ? 'text-[var(--casa-danger-text)]' : 'text-[#17693a]'}>
                {Math.abs(booking.balance) < 0.005 ? t('Alles bezahlt', 'Paid in full') : money(Math.abs(booking.balance), booking.currency)}
              </span>
            </Stat>
            {booking.charged > 0 ? (
              // How much of the total has come in, as a line: settled at a glance.
              <div className="min-w-[10rem] flex-1 self-end pb-1.5" aria-hidden="true">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#dfe6ef]">
                  <div
                    className="h-full rounded-full bg-[#1f9d55]"
                    style={{ width: `${Math.max(0, Math.min(100, (booking.paid / booking.charged) * 100))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`Buchung von ${booking.personName}: Bereiche`, `Booking of ${booking.personName}: sections`)} />}
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      {/* What the office and finance need first: the account, and beside it what the booking is. */}
      <RecordTabPanel id="overview">
        {/* One column on a phone that never grows past the screen: a ledger line shortens its words instead. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
          {/* The course they are in (Rahman, 2026-10-23): the class, its part of the day in its colour, who teaches and where. */}
          {courses.length ? (
            <Card title={courses.length > 1 ? t('Kurse', 'Courses') : t('Kurs', 'Course')} icon={Icon.catalogue} tint="blue">
              <ul className="space-y-2.5">
                {courses.map((c) => {
                  const focus = c.id === focusId;
                  const colour = c.session ? SESSION_COLOURS[c.session] : null;
                  const weeks = teachingWeeks(c.startDate, c.endDate);
                  return (
                    <li
                      key={c.id}
                      // One course reads as the card's content; several are rows, the one now in full.
                      className={cn('relative overflow-hidden pl-4', courses.length > 1 && 'rounded-2xl border border-ws-line-soft py-3 pr-4', courses.length > 1 && (focus ? 'bg-white' : 'bg-ws-sunk/40'))}
                    >
                      <span aria-hidden="true" className={cn('absolute left-0 w-1 rounded-full', courses.length > 1 ? 'inset-y-0 rounded-none' : 'inset-y-0.5')} style={{ background: colour?.hex ?? '#c3cbd6' }} />
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                        <div className="min-w-0">
                          <p className={cn('font-extrabold text-[var(--casa-ink)]', focus ? 'text-[1rem]' : 'text-[0.9rem]')}>
                            {/* The class opens on its own page, its group's when it has several. */}
                            <RecordLink href={recordHrefFor(user, 'course', c.courseId, { group: c.groupIndex ?? 1 })}>
                              {c.typeName ?? t('Kurs', 'Course')}
                              {c.levelCode ? ` · ${c.levelCode}` : ''}
                            </RecordLink>
                            {c.number ? <span className="ml-2 text-[0.78rem] font-semibold text-[var(--casa-muted)] tabular-nums">#{c.number}</span> : null}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.84rem] text-[var(--casa-ink)]">
                            {c.session ? (
                              <span className={cn('rounded-md border px-1.5 py-px text-[0.74rem] font-bold', colour!.block)}>{pick(lang, SESSION_LABELS[c.session])}</span>
                            ) : null}
                            {focus && c.week?.times ? <span className="tabular-nums">{c.week.times}</span> : null}
                            <span className="text-[var(--casa-muted)] tabular-nums">
                              {dayRange(c.startDate, c.endDate, lang)}
                              {weeks ? ` · ${weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`)}` : ''}
                              {c.kind === 'extension' ? ` · ${t('Verlängerung', 'Extension')}` : ''}
                            </span>
                          </p>
                        </div>
                        <Badge tone={c.when === 'running' ? 'positive' : c.when === 'upcoming' ? 'accent' : 'quiet'}>
                          {c.when === 'running' ? t('Läuft', 'Running') : c.when === 'upcoming' ? t('Kommt', 'Upcoming') : t('Vorbei', 'Over')}
                        </Badge>
                      </div>
                      {focus ? (
                        <dl className="mt-3 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[0.86rem]">
                          <dt className="text-[var(--casa-muted)]">{c.week && c.week.teachers.length > 1 ? t('Lehrkräfte', 'Teachers') : t('Lehrkraft', 'Teacher')}</dt>
                          <dd className="font-semibold text-[var(--casa-ink)]">
                            {c.week?.teachers.length
                              ? c.week.teachers.map((w, i) => (
                                  <span key={w.name}>
                                    {i ? ', ' : ''}
                                    <RecordLink href={recordHrefFor(user, 'staff', w.id)}>{w.name}</RecordLink>
                                    {c.week!.teachers.length > 1 ? <span className="font-normal text-[var(--casa-muted)]"> ({dayRun(w.days, lang)})</span> : null}
                                    {w.substitute ? <span className="font-normal text-[#8a5a00]"> · {t('Vertretung', 'cover')}</span> : null}
                                  </span>
                                ))
                              : '—'}
                          </dd>
                          <dt className="text-[var(--casa-muted)]">{t('Raum', 'Room')}</dt>
                          <dd className="font-semibold text-[var(--casa-ink)]">
                            {c.week?.rooms.length
                              ? c.week.rooms.map((room, i) => (
                                  <span key={room.id}>
                                    {i ? ', ' : ''}
                                    <RecordLink href={recordHrefFor(user, 'room', room.id)}>{room.name}</RecordLink>
                                  </span>
                                ))
                              : '—'}
                          </dd>
                          {c.courseInstanceId ? (
                            <>
                              <dt className="pt-1 text-[var(--casa-muted)]">{t('Niveau', 'Level')}</dt>
                              <dd>{levelValue(c)}</dd>
                            </>
                          ) : null}
                        </dl>
                      ) : null}
                      {focus && (c.courseId || c.courseInstanceId) && canAccess(user, 'catalogue') ? (
                        // The class itself (its days, teachers, learners); a period not yet in a class, its start.
                        <Link
                          href={c.courseId ? recordHref('course', c.courseId, { group: c.groupIndex ?? 1 }) : recordHref('start', c.courseInstanceId!)}
                          className="mt-2.5 inline-flex items-center gap-1 text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                        >
                          {t('Zum Kurs', 'Open the course')} {Icon.chevronRight}
                        </Link>
                      ) : null}
                      {!c.courseId && !c.courseInstanceId ? <Badge tone="warning" className="mt-2">{t('Noch kein Termin', 'No cohort yet')}</Badge> : null}
                      {canFull && courses.length > 1 ? (
                        // One of several periods taken off the booking, asked once more.
                        <form action={removePeriodAction} className="mt-2 flex justify-end">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input type="hidden" name="periodId" value={c.id} />
                          <ConfirmSubmit
                            title={t('Diesen Zeitraum entfernen?', 'Remove these dates?')}
                            description={t('Der Zeitraum wird aus der Buchung entfernt.', 'The period is removed from the booking.')}
                            confirmLabel={t('Entfernen', 'Remove')}
                            variant="ghost"
                          >
                            {t('Zeitraum entfernen', 'Remove the dates')}
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {/* The charges in the order finance reads them (2026-10-23): the course, its fees, the books, the stay, the rest. */}
          <Card
            title={t('Kosten', 'Charges')}
            icon={Icon.catalogue}
            tint="red"
            // The row menus open over the lines below and past the card's foot.
            overflow="visible"
            actions={
              canEdit && open ? (
                <FormDialog icon={Icon.money} tint="green" trigger={t('Posten hinzufügen', 'Add line')} title={t('Kostenposten hinzufügen', 'Add a cost line')} size="sm">
                  <ChargeForm
                    bookingId={booking.id}
                    levels={booking.periods.map((p) => p.levelCode).filter((l): l is string => Boolean(l))}
                    charged={booking.charges.filter((c) => c.amount > 0).map((c) => c.description)}
                  />
                </FormDialog>
              ) : undefined
            }
            footer={
              <LedgerLine withAction={removesCharges && booking.charges.length > 0} amount={<span className="font-extrabold">{money(booking.charged, booking.currency)}</span>}>
                <span className="text-sm font-bold text-[var(--casa-muted)]">{t('Gesamt', 'Total')}</span>
              </LedgerLine>
            }
          >
            {booking.charges.length === 0 ? (
              <p className="text-sm text-[var(--casa-muted)]">{t('Keine Kostenposten.', 'No cost lines.')}</p>
            ) : (
              <div className="-my-2">
                <ul className="divide-y divide-ws-line-soft">{costRows.filter((r) => !r.reversal).map(costRow)}</ul>
                {costRows.some((r) => r.reversal) ? (
                  // Cancelled lines count for nothing — the line and its reversal — so they wait folded, one click away.
                  <details className="group border-t border-ws-line-soft">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 py-2 text-[0.8rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)] [&::-webkit-details-marker]:hidden">
                      <span className="transition-transform group-open:rotate-90 [&_svg]:size-3.5">{Icon.chevronRight}</span>
                      {t(`${costRows.filter((r) => r.reversal).length} stornierte Posten`, `${costRows.filter((r) => r.reversal).length} cancelled lines`)}
                    </summary>
                    <ul className="divide-y divide-ws-line-soft">{costRows.filter((r) => r.reversal).map(costRow)}</ul>
                  </details>
                ) : null}
              </div>
            )}
            {expected.length ? (
              // Predicted from the course booked: one click each, or all at once.
              <div className="mt-4 rounded-2xl border border-dashed border-[#b9cbe6] bg-[#f5f9ff] px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.8rem] font-bold text-[#1d4e96]">{t('Vorschlag aus der Preisliste', 'Suggested from the price list')}</span>
                  {expected.length > 1 ? (
                    <form action={addSuggestedChargesAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      {expected.map((e) => (
                        <input key={e.key} type="hidden" name="key" value={e.key} />
                      ))}
                      <Button type="submit" size="sm">
                        {t('Alle hinzufügen', 'Add all')}
                      </Button>
                    </form>
                  ) : null}
                </div>
                <ul className="mt-2 divide-y divide-[#dbe6f5]">
                  {expected.map((e) => (
                    <li key={e.key} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate font-semibold text-[var(--casa-ink)]">{e.description}</span>
                      <span className="shrink-0 tabular-nums text-[var(--casa-ink)]">{money(e.amount, booking.currency)}</span>
                      <form action={addSuggestedChargesAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="key" value={e.key} />
                        <Button type="submit" variant="ghost" size="sm">
                          {t('Hinzufügen', 'Add')}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {/* What has come in: the day, what for, how — at the desk in cash or by card, or by transfer — and the balance. */}
          <Card
            title={t('Zahlungen', 'Payments')}
            icon={Icon.money}
            tint="green"
            overflow="visible"
            actions={
              canEdit && (open || carriesOver || received.length > 0) ? (
                <>
                  {received.length > 0 ? (
                    <Link
                      href={`/admin/bookings/${booking.id}/letter?kind=${BOOKING_LETTER_KEYS.payment_receipt}`}
                      className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {t('Empfangsbestätigung', 'Receipt')}
                    </Link>
                  ) : null}
                  {carriesOver ? (
                    <FormDialog icon={Icon.money} tint="green"
                      trigger={t('Guthaben übertragen', 'Carry credit over')}
                      title={t(`${money(credit, booking.currency)} Guthaben übertragen`, `Carry ${money(credit, booking.currency)} credit over`)}
                      size="sm"
                      triggerVariant="primary"
                    >
                      <CarryOverForm bookingId={booking.id} credit={credit} targets={targets} />
                    </FormDialog>
                  ) : null}
                  {open ? (
                    <FormDialog icon={Icon.money} tint="green"
                      trigger={t('Zahlung erfassen', 'Record payment')}
                      title={t('Zahlung erfassen', 'Record a payment')}
                      size="sm"
                      triggerVariant={carriesOver ? 'secondary' : 'primary'}
                      defaultOpen={pay === '1'}
                    >
                      <PaymentForm bookingId={booking.id} balance={booking.balance} />
                    </FormDialog>
                  ) : null}
                </>
              ) : undefined
            }
            footer={
              <div className="space-y-1.5">
                <LedgerLine withAction={voidsPayments || removesCharges} amount={<span className="font-extrabold text-[var(--casa-success-text)]">{money(booking.paid, booking.currency)}</span>}>
                  <span className="text-sm font-bold text-[var(--casa-muted)]">{t('Eingegangen', 'Received')}</span>
                </LedgerLine>
                <LedgerLine
                  withAction={voidsPayments || removesCharges}
                  amount={
                    <span className={cn('font-extrabold', owesMoney(booking.balance) ? 'text-[#9a5b00]' : booking.balance < -0.005 ? 'text-[var(--casa-danger-text)]' : 'text-[#17693a]')}>
                      {money(Math.abs(booking.balance) < 0.005 ? 0 : Math.abs(booking.balance), booking.currency)}
                    </span>
                  }
                >
                  <span className="text-sm font-bold text-[var(--casa-ink)]">
                    {booking.balance > 0.005 ? t('Offen', 'Balance due') : booking.balance < -0.005 ? t('Guthaben', 'Credit') : t('Ausgeglichen', 'Settled')}
                  </span>
                </LedgerLine>
              </div>
            }
          >
            {received.length === 0 ? (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch nichts eingegangen.', 'Nothing received yet.')}</p>
            ) : (
              <ul className="-my-2 divide-y divide-ws-line-soft">
                {received.map((p) => {
                  const subject = storedWords(p.subject, lang);
                  return (
                    <li key={p.id} title={[subject, paymentNote(p), bookedBy(p)].filter((x) => typeof x === 'string' && x).join(' · ')}>
                      <LedgerLine
                        className="min-h-7 py-0.5"
                        withAction={voidsPayments}
                        amount={
                          <span className={cn('font-semibold', p.amount < 0 ? 'text-[var(--casa-danger-text)]' : '')}>
                            {money(p.amount, booking.currency)}
                          </span>
                        }
                        action={
                          voidsPayments ? (
                            <RowMenu label={t(`Aktionen: ${subject} ${money(p.amount, booking.currency)}`, `Actions: ${subject} ${money(p.amount, booking.currency)}`)}>
                              <form action={voidPaymentAction}>
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <input type="hidden" name="paymentId" value={p.id} />
                                <input type="hidden" name="reason" value="Voided by staff" />
                                <ConfirmSubmit
                                  title={t(`${money(p.amount, booking.currency)} stornieren?`, `Void ${money(p.amount, booking.currency)}?`)}
                                  description={
                                    p.counterpart
                                      ? t(
                                          'Die Übertragung wird auf beiden Buchungen storniert: das Guthaben ist wieder dort, wo es war.',
                                          'The carry-over is voided on both bookings: the credit is back where it was.'
                                        )
                                      : t(
                                          'Die Zahlung bleibt als storniert auf dem Datensatz und zählt nicht mehr zum Saldo.',
                                          'The payment stays on the record, marked void, and no longer counts towards the balance.'
                                        )
                                  }
                                  confirmLabel={t('Stornieren', 'Void')}
                                  variant="ghost"
                                >
                                  {t('Stornieren', 'Void')}
                                </ConfirmSubmit>
                              </form>
                            </RowMenu>
                          ) : null
                        }
                      >
                        <span className="flex min-w-0 items-center gap-3 text-sm">
                          <span className="w-[5.5rem] shrink-0 text-xs text-[var(--casa-muted)] tabular-nums">
                            <DateText value={p.receivedAt} compact />
                          </span>
                          <span className="min-w-0 truncate font-semibold">{subject}</span>
                          {p.counterpart ? null : (
                            <Badge tone={METHOD_TONES[p.method]} className="shrink-0">
                              {pick(lang, PAYMENT_METHOD_LABELS[p.method])}
                            </Badge>
                          )}
                          <span className="min-w-0 flex-1 truncate text-xs text-[var(--casa-muted)]">{paymentNote(p)}</span>
                        </span>
                      </LedgerLine>
                    </li>
                  );
                })}
              </ul>
            )}
            {voided.length ? (
              // Voided payments count for nothing: they wait at the side, each with when and why.
              <MoreInPanel
                className={cn('w-full', received.length ? 'mt-4' : 'mt-3')}
                title={t('Stornierte Zahlungen', 'Voided payments')}
                label={t('Stornierte Zahlungen', 'Voided payments')}
                icon={Icon.money}
                tint="green"
                rows={voided.map((p) => {
                  const subject = storedWords(p.subject, lang);
                  return {
                    key: p.id,
                    at: new Date(p.receivedAt).toISOString(),
                    search: [subject, pick(lang, PAYMENT_METHOD_LABELS[p.method]), paymentReference(p.reference), p.voidReason ? storedWords(p.voidReason, lang) : null, money(p.amount, booking.currency)]
                      .filter(Boolean)
                      .join(' '),
                    node: (
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{subject}</span>
                          <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                            {paymentWhen(p)}
                            {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                            {t('Storniert', 'Voided')} <DateText value={p.voidedAt} />
                            {p.voidReason ? ` · ${storedWords(p.voidReason, lang)}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-[var(--casa-muted)] tabular-nums line-through">{money(p.amount, booking.currency)}</span>
                      </div>
                    ),
                  };
                })}
              />
            ) : null}
          </Card>
          </div>

          <div className="space-y-4">
          {dueLetter ? (
            // What is due now: one click to the letter, written from the booking.
            <Link
              href={`/admin/bookings/${booking.id}/letter?kind=${BOOKING_LETTER_KEYS[dueLetter]}`}
              className="flex items-center gap-3 rounded-2xl bg-[#eef6fd] px-3.5 py-3 ring-1 ring-[#cfe5f7] transition-colors ring-inset hover:bg-[#e3f0fb]"
            >
              <LetterKindIcon kind={dueLetter} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.72rem] font-semibold text-[#065f8c]">{t('Als Nächstes', 'Next')}</span>
                <span className="block truncate text-[0.88rem] font-bold text-[var(--casa-ink)]">{pick(lang, LETTER_KIND_LABELS[dueLetter])}</span>
              </span>
              <span className="text-[#065f8c]">{Icon.chevronRight}</span>
            </Link>
          ) : null}
          {/* Who sends or pays for the learner — HERE AHEAD, an agency — and what it earns (Rahman, 2026-10-23). */}
          {org || extras.commissions.length ? (
            <Card
              title={payerOrg ? pick(lang, ORGANISATION_KIND_LABELS[payerOrg.kind]) : t('Agentur', 'Agency')}
              icon={Icon.people}
              tint="sun"
            >
              {org ? (
                canAccess(user, 'organisations') ? (
                  <Link href={`/admin/organisations/${org.id}`} className="block text-[0.95rem] leading-snug font-bold text-[var(--fm-navy)] hover:underline">
                    {org.name}
                  </Link>
                ) : (
                  <p className="text-[0.95rem] leading-snug font-bold text-[var(--casa-ink)]">{org.name}</p>
                )
              ) : (
                <p className="text-[0.95rem] leading-snug font-bold text-[var(--casa-ink)]">
                  <RecordLink href={recordHrefFor(user, 'organisation', extras.commissions[0]?.agencyId)} tone="strong">
                    {extras.commissions[0]?.agency ?? '—'}
                  </RecordLink>
                </p>
              )}
              <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[0.84rem]">
                {org ? (
                  <>
                    <dt className="text-[var(--casa-muted)]">{t('Rolle', 'Role')}</dt>
                    <dd className="font-semibold text-[var(--casa-ink)]">{booking.payer === 'self' ? t('Vermittelt', 'Refers the learner') : t('Zahlt die Buchung', 'Pays for the booking')}</dd>
                  </>
                ) : null}
                {terms.length ? (
                  <>
                    <dt className="text-[var(--casa-muted)]">{t('Provision', 'Commission')}</dt>
                    <dd className="font-semibold text-[var(--casa-ink)]">
                      {terms
                        .map((c) => `${num(lang, c.percentage)} %${c.chargeType ? ` ${t('auf', 'on')} ${pick(lang, c.chargeType)}` : ''}`)
                        .join(' · ')}
                    </dd>
                  </>
                ) : null}
                {extras.commissions.length ? (
                  <>
                    <dt className="text-[var(--casa-muted)]">{t('Diese Buchung', 'This booking')}</dt>
                    <dd className="text-[var(--casa-ink)]">
                      <span className="font-semibold tabular-nums">{money(extras.commissions.reduce((sum, c) => sum + c.amount, 0), booking.currency)}</span>
                      <span className="text-[var(--casa-muted)]">
                        {extras.commissions.every((c) => c.paid === true)
                          ? t(' · ausgezahlt', ' · paid out')
                          : extras.commissions.some((c) => c.paid === false)
                            ? t(' · noch nicht ausgezahlt', ' · not paid out yet')
                            : ''}
                      </span>
                    </dd>
                  </>
                ) : null}
              </dl>
            </Card>
          ) : null}
          {recordFields.length > 0 || booking.notes ? (
            <Card title={t('Zur Buchung', 'About the booking')} icon={Icon.bookings} tint="ink">
              {recordFields.length > 0 ? <DetailList items={recordFields} /> : null}
              {booking.notes ? (
                // The booking's own note, written in Edit.
                <blockquote
                  className={cn(
                    'max-w-prose border-l-2 border-[#d3dbe6] pl-3.5 text-[0.9rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]',
                    recordFields.length > 0 && 'mt-4'
                  )}
                >
                  {booking.notes}
                </blockquote>
              ) : null}
            </Card>
          ) : null}

          {/* When to look at it again, and why (0062; SchoolMan's Wiedervorlage). */}
          {followUps.open.length || followUps.doneTotal || canEdit ? (
            <Card
              title={t('Wiedervorlage', 'Follow-up')}
              icon={Icon.clock}
              tint="sun"
              actions={
                canEdit ? (
                  <FormDialog icon={Icon.clock} tint="sun" trigger={t('Setzen', 'Set')} title={t('Wiedervorlage', 'Follow-up')} triggerVariant="ghost" size="sm">
                    <form action={addFollowUpAction} className="space-y-3">
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <Field label={t('Am', 'On')} htmlFor="follow-up-day">
                        <DateFormField id="follow-up-day" name="dueOn" required />
                      </Field>
                      <Field label={t('Worum es geht', 'What it is about')} htmlFor="follow-up-reason">
                        <Input id="follow-up-reason" name="reason" required maxLength={300} />
                      </Field>
                      <DialogFooter>
                        <Button type="submit">{t('Setzen', 'Set')}</Button>
                      </DialogFooter>
                    </form>
                  </FormDialog>
                ) : undefined
              }
            >
              {followUps.open.length ? (
                <ul className="-my-1 divide-y divide-ws-line-soft">
                  {followUps.open.map((f) => {
                    const due = f.dueOn <= todayInputValue();
                    return (
                      <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 text-[0.86rem]">
                          <span className={cn('font-semibold tabular-nums', due ? 'text-[#9a5b00]' : 'text-[var(--casa-ink)]')}>
                            <DateText value={f.dueOn} />
                          </span>
                          <span className="block text-[var(--casa-muted)]">{[f.reason, f.createdByName].filter(Boolean).join(' · ')}</span>
                        </span>
                        {canEdit ? (
                          <form action={completeFollowUpAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="followUpId" value={f.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              {t('Erledigt', 'Done')}
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[var(--casa-muted)]">{t('Nichts offen.', 'Nothing open.')}</p>
              )}
              {followUps.doneTotal ? (
                <p className="mt-2 text-[0.78rem] text-[var(--casa-muted)]">
                  {t(`${num(lang, followUps.doneTotal)} erledigt`, `${num(lang, followUps.doneTotal)} done`)}
                  {followUps.done[0] ? t(`, zuletzt ${followUps.done[0].reason}`, `, last: ${followUps.done[0].reason}`) : ''}
                </p>
              ) : null}
            </Card>
          ) : null}

          </div>
        </div>
      </RecordTabPanel>

      {attendance ? (
        <RecordTabPanel id="attendance">
          <div className="max-w-3xl">
            <Card title={t('Anwesenheit', 'Attendance')} icon={Icon.check} tint="green">
              <p className="text-sm text-[var(--casa-ink)]">
                <span className="text-[1.15rem] font-extrabold tabular-nums">{num(lang, Math.round((attendance.present / attendance.days) * 100))} %</span>
                <span className="ml-2 text-[var(--casa-muted)]">
                  {t(`${num(lang, attendance.present)} von ${num(lang, attendance.days)} Tagen da`, `there ${num(lang, attendance.present)} of ${num(lang, attendance.days)} days`)}
                  {attendance.lateCount
                    ? t(` · ${num(lang, attendance.lateCount)}× zu spät (${num(lang, attendance.lateMinutes)} Min.)`, ` · late ${num(lang, attendance.lateCount)}× (${num(lang, attendance.lateMinutes)} min)`)
                    : ''}
                </span>
              </p>
              {attendance.absences.length ? (
                <ul className="mt-3 space-y-1 text-[0.84rem]">
                  {attendance.absences.map((a) => (
                    <li key={a.day} className="flex gap-2">
                      <span className="w-24 shrink-0 tabular-nums text-[var(--casa-muted)]">
                        <DateText value={a.day} compact />
                      </span>
                      <span className="min-w-0 text-[var(--casa-ink)]">
                        {[
                          a.absence === 'ill'
                            ? t('krank', 'ill')
                            : a.absence === 'excused'
                              ? t('entschuldigt', 'excused')
                              : a.absence === 'unexcused'
                                ? t('unentschuldigt', 'unexcused')
                                : t('ohne Grund', 'no reason'),
                          a.sickNote === 'certificate' ? t('Attest', "doctor's note") : a.sickNote === 'self' ? t('eigene Krankmeldung', 'own sick note') : null,
                          a.reported ? t('Abwesenheit gemeldet', 'absence reported') : null,
                          a.comment,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {attendance.absentTotal > attendance.absences.length ? (
                <p className="mt-2 text-[0.78rem] text-[var(--casa-muted)]">
                  {t(`Die letzten ${num(lang, attendance.absences.length)} von ${num(lang, attendance.absentTotal)} Fehltagen`, `The latest ${num(lang, attendance.absences.length)} of ${num(lang, attendance.absentTotal)} days missed`)}
                </p>
              ) : null}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="letters">
        <Card
          bleed
          title={t('Briefe', 'Letters')}
          icon={Icon.mail}
          tint="blue"
          actions={
            canEdit ? (
              <Link href={`/admin/bookings/${booking.id}/letter`} className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                {t('Brief schreiben', 'Write a letter')}
              </Link>
            ) : undefined
          }
        >
          {letters.length ? (
            <LetterList
              variant="tab"
              title={t('Briefe', 'Letters')}
              rows={letters.map((l) => ({
                id: l.id,
                kind: l.kind,
                kindLabel: pick(lang, LETTER_KIND_LABELS[l.kind]),
                subject: l.subject,
                note: l.version > 1 ? t(`Fassung ${l.version}`, `version ${l.version}`) : null,
                by: l.sentByName,
                sentAt: new Date(l.sentAt).toISOString(),
              }))}
            />
          ) : (
            <p className="px-4 py-4 text-sm text-[var(--casa-muted)]">{t('Noch kein Brief.', 'No letter yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {hasLedgerExtras ? (
        <RecordTabPanel id="accounting">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {/* The rest of SchoolMan's ledger for this booking, read as it is (0063): its payment plan, its agency's
              commission, what was paid out for it, its invoices. Finance keeps the accounts in DATEV. */}
          {extras.instalments.length ? (
            <Card title={t('Ratenplan', 'Payment plan')} icon={Icon.calendar} tint="green">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {extras.instalments.map((i) => (
                  <li key={i.id}>
                    <LedgerLine className="py-2.5" withAction={false} amount={money(i.amount, booking.currency)}>
                      <span className="block text-sm font-semibold text-[var(--casa-ink)]">{i.label ?? t('Rate', 'Instalment')}</span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        {[i.dueOn ? t(`fällig ${new Date(`${i.dueOn}T12:00:00Z`).toLocaleDateString('de-DE')}`, `due ${new Date(`${i.dueOn}T12:00:00Z`).toLocaleDateString('en-GB')}`) : null,
                          i.paidOn
                            ? t(`bezahlt am ${new Date(`${i.paidOn}T12:00:00Z`).toLocaleDateString('de-DE')}`, `paid on ${new Date(`${i.paidOn}T12:00:00Z`).toLocaleDateString('en-GB')}`)
                            : i.paid === true
                              ? t('bezahlt', 'paid')
                              : i.paid === false
                                ? t('offen', 'open')
                                : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {extras.commissions.length ? (
            <Card
              title={t('Provision der Agentur', "The agency's commission")}
              icon={Icon.money}
              tint="green"
              footer={
                <LedgerLine withAction={false} amount={<span className="font-extrabold">{money(extras.commissions.reduce((s, c) => s + c.amount, 0), booking.currency)}</span>}>
                  <span className="text-sm font-bold text-[var(--casa-muted)]">{t('Gesamt', 'Total')}</span>
                </LedgerLine>
              }
            >
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {extras.commissions.map((c) => (
                  <li key={c.id}>
                    <LedgerLine className="py-2.5" withAction={false} amount={money(c.amount, booking.currency)}>
                      <span className="block text-sm font-semibold text-[var(--casa-ink)]">
                        {[c.percentage != null ? `${num(lang, c.percentage)} %` : null, c.description].filter(Boolean).join(t(' auf ', ' on '))}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        {[c.agency, c.baseAmount != null ? t(`von ${money(c.baseAmount, booking.currency)}`, `of ${money(c.baseAmount, booking.currency)}`) : null,
                          c.paid === true ? t('ausgezahlt', 'paid out') : c.paid === false ? t('noch nicht ausgezahlt', 'not paid out yet') : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {extras.payouts.length ? (
            <Card title={t('Auszahlungen', 'Paid out')} icon={Icon.money} tint="sun">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {extras.payouts.map((p) => (
                  <li key={p.id}>
                    <LedgerLine className="py-2.5" withAction={false} amount={money(p.amount, booking.currency)}>
                      <span className="block text-sm font-semibold text-[var(--casa-ink)]">
                        {p.kind === 'host_rent'
                          ? t('Miete an Gastgeber', 'Rent to the host')
                          : p.kind === 'agency_commission'
                            ? t('Provision an Agentur', 'Commission to the agency')
                            : p.kind === 'agency_direct'
                              ? t('Direkt an Agentur', 'Straight to the agency')
                              : t('Auszahlung', 'Payout')}
                        {p.to ? (
                          <>
                            {' · '}
                            {p.toHref ? (
                              <Link href={p.toHref} className="text-[var(--fm-navy)] hover:underline">
                                {p.to}
                              </Link>
                            ) : (
                              p.to
                            )}
                          </>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        {[
                          p.period ? t(`für ${dayRange(p.period.from, p.period.to, lang)}`, `for ${dayRange(p.period.from, p.period.to, lang)}`) : null,
                          p.paidOn ? new Date(`${p.paidOn}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB') : null,
                          p.note?.split('\n')[0],
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {extras.invoices.length ? (
            <Card title={t('Rechnungen', 'Invoices')} icon={Icon.statement} tint="blue">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {extras.invoices.map((i) => (
                  <li key={i.id}>
                    <LedgerLine
                      className="py-2.5"
                      withAction={false}
                      amount={i.amount != null ? <span className={i.cancelled ? 'text-[var(--casa-muted)] line-through' : undefined}>{money(i.amount, booking.currency)}</span> : '—'}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--casa-ink)]">
                        {i.letterId ? (
                          <Link href={`/admin/letters/${i.letterId}`} className="hover:underline">
                            {t(`Rechnung ${i.number}`, `Invoice ${i.number}`)}
                          </Link>
                        ) : (
                          t(`Rechnung ${i.number}`, `Invoice ${i.number}`)
                        )}
                        {i.cancelled ? <Badge tone="danger">{t('storniert', 'cancelled')}</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        {[i.issuedOn ? new Date(`${i.issuedOn}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB') : null, i.subject].filter(Boolean).join(' · ')}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          </div>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="history">
        <div className="max-w-3xl">
          <Timeline
            canWrite={canEdit}
            entity="booking"
            id={booking.id}
            notes={notes}
            activity={activity.filter((entry) => !['booking_created', 'booking_observed', 'booking_observation_ended'].includes(entry.action))}
            events={observationEvents}
            origin={{ at: booking.createdAt, label: t('Gebucht', 'Booked'), icon: Icon.bookings }}
          />
        </div>
      </RecordTabPanel>

      {canFull ? (
        <RecordFoot>
          {open ? (
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <ConfirmSubmit
                title={t(`Buchung von ${booking.personName} stornieren?`, `Cancel ${booking.personName}'s booking?`)}
                description={t(
                  'Der Platz wird frei. Kostenposten und Zahlungen bleiben auf dem Datensatz, damit die Erstattung berechnet werden kann. Das lässt sich nicht rückgängig machen.',
                  'The place is released. Cost lines and payments stay on the record so the refund can be worked out. This cannot be undone.'
                )}
                confirmLabel={t('Buchung stornieren', 'Cancel booking')}
              >
                {t('Buchung stornieren', 'Cancel booking')}
              </ConfirmSubmit>
            </form>
          ) : null}
          <form action={deleteBookingAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <ConfirmSubmit
              title={t('Diese Buchung löschen?', 'Delete this booking?')}
              description={t(
                'Nur möglich, solange keine Zahlung erfasst ist. Die Buchung verschwindet aus allen Listen.',
                'Only possible while no payment has been recorded. The booking disappears from every list.'
              )}
            >
              {t('Buchung löschen', 'Delete booking')}
            </ConfirmSubmit>
          </form>
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}
