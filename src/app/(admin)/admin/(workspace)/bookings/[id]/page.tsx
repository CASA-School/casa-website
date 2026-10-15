import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  cancelBookingAction,
  deleteBookingAction,
  removeChargeAction,
  removePeriodAction,
  voidPaymentAction,
} from '../actions';
import { ChargeForm, EditBookingForm, ExtendBookingForm, PaymentForm } from '../booking-forms';
import { RecordFoot } from '../record-foot';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { Badge, Card, DateText, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  CHARGE_KIND_LABELS,
  getBooking,
  listCohortOptions,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  storedWords,
} from '@/lib/admin/bookings';
import { listCourseTypes } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { listNotes } from '@/lib/admin/notes';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    n
  );

/**
 * A line of a ledger: what it is, its amount in a fixed column, and the slot
 * for its remove button. The column widths are fixed so the amounts of every
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
      {withAction ? <div className="flex w-20 shrink-0 justify-end">{action}</div> : null}
    </div>
  );
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
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }, user] = await Promise.all([
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

  const [notes, activity, cohorts, courseTypes] = await Promise.all([
    listNotes('booking', booking.id),
    activityFor('booking', booking.id),
    canEdit ? listCohortOptions() : Promise.resolve([]),
    canEdit ? listCourseTypes() : Promise.resolve([]),
  ]);


  const weeks =
    booking.startDate && booking.endDate
      ? Math.round(
          (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime() + 86_400_000) /
            (7 * 86_400_000)
        )
      : null;
  const stay = booking.accommodation;
  const removesCharges = canFull && open;
  // The record's own fields, those that have a value: when it was booked is
  // in the head, so a booking with nothing else has no card for it.
  const recordFields = [
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
    booking.sourceRegistrationId
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
    stay && stay.from
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
  const single = booking.periods.length === 1 ? booking.periods[0] : null;
  // A cohort's label is its title, or "Course · 31.08.26 – 23.10.26" built
  // from the course and dates the head already shows; only a title is news.
  const singleCohortTitle =
    single?.cohortLabel && !/\d{2}\.\d{2}\.\d{2} – \d{2}\.\d{2}\.\d{2}$/.test(single.cohortLabel)
      ? single.cohortLabel
      : null;

  return (
    <>
      <RecordHeader
        backHref="/admin/bookings"
        backLabel={t('Buchungen', 'Bookings')}
        title={booking.personName}
        avatar={booking.personName}
        status={
          <>
            <Badge tone={BOOKING_STATUS_TONES[booking.status]}>{pick(lang, BOOKING_STATUS_LABELS[booking.status])}</Badge>
            {booking.visaRequired ? <Badge tone="warning">{t('Visum nötig', 'Visa required')}</Badge> : null}
          </>
        }
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">
              {booking.courseTypeName ?? t('Buchung', 'Booking')}
              {singleCohortTitle ? <span className="font-medium text-[var(--casa-muted)]"> · {singleCohortTitle}</span> : null}
            </span>
            <MetaLine>
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
              <MetaItem icon={Icon.rooms}>
                {stay ? [stay.typeName, stay.roomTypeName, stay.cateringName].filter(Boolean).join(' · ') : t('Keine Unterkunft', 'No accommodation')}
              </MetaItem>
              <MetaItem icon={Icon.person}>
                {pick(lang, PAYER_LABELS[booking.payer])}
                {booking.payerName ? ` · ${booking.payerName}` : ''}
              </MetaItem>
              <MetaItem icon={Icon.people}>
                <Link href={`/admin/people/${booking.personId}`} className="font-semibold text-[var(--fm-navy)] hover:underline">
                  {t('Zur Person', 'Student page')}
                </Link>
              </MetaItem>
            </MetaLine>
          </>
        }
        actions={
          <>
            {canEdit && open ? (
              <FormDialog trigger={t('Verlängern', 'Extend')} title={t('Buchung verlängern', 'Extend the booking')}>
                <ExtendBookingForm booking={booking} cohorts={cohorts} />
              </FormDialog>
            ) : null}
            {canEdit ? (
              <FormDialog trigger={t('Bearbeiten', 'Edit')} title={t('Buchung bearbeiten', 'Edit the booking')}>
                <EditBookingForm booking={booking} courseTypes={courseTypes} />
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
              <span className={booking.balance > 0.005 ? 'text-[#9a5b00]' : booking.balance < -0.005 ? 'text-[var(--casa-danger-text)]' : 'text-[#17693a]'}>
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
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          {booking.periods.length > 1 ? (
            <Card title={t('Zeiträume', 'Periods')} icon={Icon.calendar} tint="blue">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {booking.periods.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <DateText value={p.startDate} /> – <DateText value={p.endDate} />
                        {p.kind === 'extension' ? <Badge tone="quiet">{t('Verlängerung', 'Extension')}</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        {p.courseInstanceId ? (
                          <Link href="/admin/catalogue" className="hover:underline">
                            {p.cohortLabel}
                          </Link>
                        ) : (
                          <Badge tone="warning">{t('Noch kein Termin', 'No cohort yet')}</Badge>
                        )}
                      </span>
                    </span>
                    {canFull && booking.periods.length > 1 ? (
                      <form action={removePeriodAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="periodId" value={p.id} />
                        <ConfirmSubmit
                          title={t('Diesen Zeitraum entfernen?', 'Remove these dates?')}
                          description={t('Der Zeitraum wird aus der Buchung entfernt.', 'The period is removed from the booking.')}
                          confirmLabel={t('Entfernen', 'Remove')}
                          variant="ghost"
                        >
                          {t('Entfernen', 'Remove')}
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card
            title={t('Kosten', 'Cost')}
            icon={Icon.catalogue}
            tint="red"
            actions={
              canEdit && open ? (
                <FormDialog trigger={t('Posten hinzufügen', 'Add line')} title={t('Kostenposten hinzufügen', 'Add a cost line')} size="sm">
                  <ChargeForm bookingId={booking.id} />
                </FormDialog>
              ) : undefined
            }
            footer={
              <LedgerLine
                withAction={removesCharges && booking.charges.length > 0}
                amount={
                  <span className="font-extrabold">{money(booking.charged, booking.currency)}</span>
                }
              >
                <span className="text-sm font-bold text-[var(--casa-muted)]">{t('Gesamt', 'Total')}</span>
              </LedgerLine>
            }
          >
            {booking.charges.length === 0 ? (
              <p className="text-sm text-[var(--casa-muted)]">{t('Keine Kostenposten.', 'No cost lines.')}</p>
            ) : (
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {booking.charges.map((c) => {
                  // A line whose text is its kind's label, in either language, reads in this one.
                  const kindLabel = CHARGE_KIND_LABELS[c.kind];
                  const isKind = c.description === kindLabel.en || c.description === kindLabel.de;
                  const description = isKind ? pick(lang, kindLabel) : storedWords(c.description, lang);
                  return (
                    <li key={c.id}>
                      <LedgerLine
                        className="py-2.5"
                        withAction={removesCharges}
                        amount={
                          <span
                            className={cn(
                              'font-semibold',
                              c.amount < 0 ? 'text-[var(--casa-danger-text)]' : ''
                            )}
                          >
                            {money(c.amount, booking.currency)}
                          </span>
                        }
                        action={
                          removesCharges ? (
                            <form action={removeChargeAction}>
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <input type="hidden" name="chargeId" value={c.id} />
                              <ConfirmSubmit
                                title={t(`„${description}“ entfernen?`, `Remove "${description}"?`)}
                                description={t('Der Posten wird aus der Buchung entfernt.', 'The line is removed from the booking.')}
                                confirmLabel={t('Entfernen', 'Remove')}
                                variant="ghost"
                              >
                                {t('Entfernen', 'Remove')}
                              </ConfirmSubmit>
                            </form>
                          ) : null
                        }
                      >
                        <span className="block text-sm font-semibold">{description}</span>
                        {/* The kind only when the line's own text does not already say it. */}
                        {!isKind ? (
                          <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">{pick(lang, kindLabel)}</span>
                        ) : null}
                      </LedgerLine>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title={t('Zahlungen', 'Payments')}
            icon={Icon.money}
            tint="green"
            actions={
              canEdit && open ? (
                <FormDialog
                  trigger={t('Zahlung erfassen', 'Record payment')}
                  title={t('Zahlung erfassen', 'Record a payment')}
                  size="sm"
                  triggerVariant="primary"
                >
                  <PaymentForm bookingId={booking.id} balance={booking.balance} />
                </FormDialog>
              ) : undefined
            }
            footer={
              <LedgerLine
                withAction={canFull && booking.payments.some((p) => !p.voidedAt)}
                amount={
                  <span className="font-extrabold text-[var(--casa-success-text)]">
                    {money(booking.paid, booking.currency)}
                  </span>
                }
              >
                <span className="text-sm font-bold text-[var(--casa-muted)]">{t('Eingegangen', 'Received')}</span>
              </LedgerLine>
            }
          >
            {booking.payments.length === 0 ? (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch nichts eingegangen.', 'Nothing received yet.')}</p>
            ) : (
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {booking.payments.map((p) => (
                  <li key={p.id} className={p.voidedAt ? 'opacity-60' : undefined}>
                    <LedgerLine
                      className="py-2.5"
                      withAction={canFull && booking.payments.some((x) => !x.voidedAt)}
                      amount={
                        <span className={cn('font-semibold', p.voidedAt ? 'line-through' : '')}>
                          {money(p.amount, booking.currency)}
                        </span>
                      }
                      action={
                        canFull && !p.voidedAt ? (
                          <form action={voidPaymentAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="paymentId" value={p.id} />
                            <input type="hidden" name="reason" value="Voided by staff" />
                            <ConfirmSubmit
                              title={t(`${money(p.amount, booking.currency)} stornieren?`, `Void ${money(p.amount, booking.currency)}?`)}
                              description={t(
                                'Die Zahlung bleibt als storniert auf dem Datensatz und zählt nicht mehr zum Saldo.',
                                'The payment stays on the record, marked void, and no longer counts towards the balance.'
                              )}
                              confirmLabel={t('Stornieren', 'Void')}
                              variant="ghost"
                            >
                              {t('Stornieren', 'Void')}
                            </ConfirmSubmit>
                          </form>
                        ) : null
                      }
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.subject}
                        {p.voidedAt ? <Badge tone="quiet">{t('Storniert', 'Voided')}</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                        <DateText value={p.receivedAt} /> · {pick(lang, PAYMENT_METHOD_LABELS[p.method])}
                        {p.reference ? ` · ${p.reference}` : ''}
                        {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                        {p.voidReason ? ` · ${storedWords(p.voidReason, lang)}` : ''}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
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

          <Timeline
            canWrite={canEdit}
            entity="booking"
            id={booking.id}
            notes={notes}
            activity={activity.filter((entry) => entry.action !== 'booking_created')}
            origin={{ at: booking.createdAt, label: t('Gebucht', 'Booked'), icon: Icon.bookings }}
          />
        </div>
      </div>

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
    </>
  );
}
