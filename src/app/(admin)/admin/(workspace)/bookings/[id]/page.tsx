import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { addNoteAction } from '../../actions';
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
import {
  Badge,
  Button,
  Card,
  DateText,
  DetailList,
  RecordHeader,
  Textarea,
  relativeDays,
} from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor, describeActivity } from '@/lib/admin/activity';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  CHARGE_KIND_LABELS,
  getBooking,
  listCohortOptions,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/admin/bookings';
import { listCourseTypes } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { listNotes } from '@/lib/admin/notes';
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
 * One booking — the screen FileMaker's Booking layout becomes.
 *
 * The head carries what the booking is: the course, the dates, the stay, who
 * pays and what is still open, with the status and the visa beside the name.
 * Left: the periods when there are several (one period is the head's dates),
 * the cost lines and the payments, each a ledger with its own add button in
 * the header, its total in the foot and its own confirmation on removal.
 * Right: the record's own fields, the notes — the booking's own among them —
 * and the history. Cancelling and deleting sit at the foot of the page, quiet,
 * away from the routine actions in the head. Everything a staff member
 * changes here is a dialog or a confirmed action; nothing is edited inline.
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

  const canEdit = canAccess(user, 'bookings', 'edit');
  const canFull = canAccess(user, 'bookings', 'full');
  const open = booking.status !== 'cancelled';

  const [notes, activity, cohorts, courseTypes] = await Promise.all([
    listNotes('booking', booking.id),
    activityFor('booking', booking.id),
    canEdit ? listCohortOptions() : Promise.resolve([]),
    canEdit ? listCourseTypes() : Promise.resolve([]),
  ]);

  const balanceTone =
    booking.balance > 0
      ? 'text-[var(--casa-warning-text)]'
      : booking.balance < 0
        ? 'text-[var(--casa-danger-text)]'
        : 'text-[var(--casa-success-text)]';

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
          label: 'Cancelled',
          value: (
            <span>
              <DateText value={booking.cancelledAt} />
              {booking.cancelReason ? ` · ${booking.cancelReason}` : ''}
            </span>
          ),
        }
      : null,
    booking.sourceRegistrationId
      ? {
          label: 'From registration',
          value: (
            <Link
              href={`/admin/registrations/course/${booking.sourceRegistrationId}`}
              className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
            >
              Open
            </Link>
          ),
        }
      : null,
    stay && stay.from
      ? {
          label: 'Stay',
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
        backLabel="All bookings"
        title={booking.personName}
        avatar={booking.personName}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <span>
              Booked <DateText value={booking.createdAt} />
            </span>
            <span aria-hidden="true">·</span>
            <Link
              href={`/admin/people/${booking.personId}`}
              className="inline-flex items-center gap-1 font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
            >
              Student page {Icon.chevronRight}
            </Link>
          </span>
        }
        status={
          <>
            <Badge tone={BOOKING_STATUS_TONES[booking.status]}>
              {BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
            {booking.visaRequired ? <Badge tone="warning">Visa required</Badge> : null}
          </>
        }
        actions={
          <>
            {canEdit && open ? (
              <FormDialog trigger="Extend" title="Extend the booking">
                <ExtendBookingForm booking={booking} cohorts={cohorts} />
              </FormDialog>
            ) : null}
            {canEdit ? (
              <FormDialog trigger="Edit" title="Edit the booking">
                <EditBookingForm booking={booking} courseTypes={courseTypes} />
              </FormDialog>
            ) : null}
          </>
        }
        facts={[
          {
            label: 'Course',
            icon: Icon.catalogue,
            tint: 'red',
            value: booking.courseTypeName,
            sub: singleCohortTitle ?? undefined,
          },
          {
            label: 'Dates',
            icon: Icon.calendar,
            tint: 'blue',
            value: booking.startDate ? (
              <>
                <DateText value={booking.startDate} compact /> –{' '}
                <DateText value={booking.endDate} compact />
              </>
            ) : null,
            sub: [
              weeks ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : null,
              booking.periods.length > 1 ? `${booking.periods.length} periods` : null,
              // One period has no card of its own (it would repeat these
              // dates), so a missing cohort is said here.
              single && !single.courseInstanceId ? 'No cohort yet' : null,
            ]
              .filter(Boolean)
              .join(' · '),
          },
          {
            label: 'Stay',
            icon: Icon.rooms,
            tint: 'blue',
            value: stay ? stay.typeName : 'None',
            sub: stay ? [stay.roomTypeName, stay.cateringName].filter(Boolean).join(' · ') : undefined,
          },
          {
            label: 'Payer',
            icon: Icon.person,
            tint: 'ink',
            value: PAYER_LABELS[booking.payer],
            sub: booking.payerName ?? undefined,
          },
          {
            label: 'Balance',
            icon: Icon.money,
            tint: booking.balance > 0 ? 'sun' : booking.balance < 0 ? 'red' : 'green',
            value: <span className={balanceTone}>{money(booking.balance, booking.currency)}</span>,
            sub: booking.balance > 0 ? 'still open' : booking.balance < 0 ? 'paid over' : 'paid in full',
          },
        ]}
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
            <Card title="Periods" icon={Icon.calendar} tint="blue">
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {booking.periods.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <DateText value={p.startDate} /> – <DateText value={p.endDate} />
                        {p.kind === 'extension' ? <Badge tone="quiet">Extension</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">
                        {p.courseInstanceId ? (
                          <Link href="/admin/catalogue" className="hover:underline">
                            {p.cohortLabel}
                          </Link>
                        ) : (
                          <Badge tone="warning">No cohort yet</Badge>
                        )}
                      </span>
                    </span>
                    {canFull && booking.periods.length > 1 ? (
                      <form action={removePeriodAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="periodId" value={p.id} />
                        <ConfirmSubmit
                          title="Remove these dates?"
                          description="The period is removed from the booking."
                          confirmLabel="Remove"
                          variant="ghost"
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card
            title="Cost"
            icon={Icon.catalogue}
            tint="red"
            actions={
              canEdit && open ? (
                <FormDialog trigger="Add line" title="Add a cost line" size="sm">
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
                <span className="text-sm font-bold text-[var(--casa-muted)]">Total</span>
              </LedgerLine>
            }
          >
            {booking.charges.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">No cost lines.</p>
            ) : (
              <ul className="-my-1.5 divide-y divide-ws-line-soft">
                {booking.charges.map((c) => (
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
                              title={`Remove "${c.description}"?`}
                              description="The line is removed from the booking."
                              confirmLabel="Remove"
                              variant="ghost"
                            >
                              Remove
                            </ConfirmSubmit>
                          </form>
                        ) : null
                      }
                    >
                      <span className="block text-sm font-semibold">{c.description}</span>
                      {/* The kind only when the line's own text does not already say it. */}
                      {CHARGE_KIND_LABELS[c.kind] !== c.description ? (
                        <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">{CHARGE_KIND_LABELS[c.kind]}</span>
                      ) : null}
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Payments"
            icon={Icon.money}
            tint="green"
            actions={
              canEdit && open ? (
                <FormDialog
                  trigger="Record payment"
                  title="Record a payment"
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
                <span className="text-sm font-bold text-[var(--casa-muted)]">Received</span>
              </LedgerLine>
            }
          >
            {booking.payments.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">Nothing received yet.</p>
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
                              title={`Void ${money(p.amount, booking.currency)}?`}
                              description="The payment stays on the record, marked void, and no longer counts towards the balance."
                              confirmLabel="Void"
                              variant="ghost"
                            >
                              Void
                            </ConfirmSubmit>
                          </form>
                        ) : null
                      }
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.subject}
                        {p.voidedAt ? <Badge tone="quiet">Voided</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={p.receivedAt} /> · {PAYMENT_METHOD_LABELS[p.method]}
                        {p.reference ? ` · ${p.reference}` : ''}
                        {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                        {p.voidReason ? ` · ${p.voidReason}` : ''}
                      </span>
                    </LedgerLine>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {recordFields.length > 0 ? (
            <Card title="Booking" icon={Icon.bookings} tint="ink">
              <DetailList items={recordFields} />
            </Card>
          ) : null}

          <Card title="Notes" icon={Icon.note} tint="sun">
            {canEdit ? (
              <form action={addNoteAction} className="space-y-2">
                <input type="hidden" name="entity" value="booking" />
                <input type="hidden" name="entityId" value={booking.id} />
                <Textarea
                  name="body"
                  rows={3}
                  required
                  placeholder="What was agreed, and what happens next?"
                  aria-label="New note"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Add note
                </Button>
              </form>
            ) : null}
            {notes.length > 0 || booking.notes ? (
              <ul
                className={cn('space-y-3', canEdit ? 'mt-4 border-t border-ws-line-soft pt-4' : '')}
              >
                {/* The booking's own note, written in Edit: kept with the
                    others rather than as a second "Notes" in the card above. */}
                {booking.notes ? (
                  <li className="rounded-xl bg-[#fffbea] px-3 py-2.5">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                      {booking.notes}
                    </p>
                    <p className="mt-1 text-xs text-[var(--casa-text-subtle)]">On the booking</p>
                  </li>
                ) : null}
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl bg-[#fffbea] px-3 py-2.5">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                      {note.body}
                    </p>
                    <p className="mt-1 text-xs text-[var(--casa-text-subtle)]">
                      {note.authorName ?? 'A former colleague'} · {relativeDays(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : !canEdit ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">No notes.</p>
            ) : null}
          </Card>

          {activity.length > 0 ? (
            <Card title="History" icon={Icon.clock} tint="ink">
              <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[4px] before:w-px before:bg-ws-line">
                {activity.map((entry) => (
                  <li key={entry.id} className="relative flex gap-3 text-xs">
                    <span
                      aria-hidden="true"
                      className="relative mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-white bg-ws-line-firm"
                    />
                    <span className="text-[var(--casa-text-subtle)]">
                      <span className="font-bold text-[var(--casa-ink)]">
                        {entry.staffName ?? 'Someone'}
                      </span>{' '}
                      {describeActivity(entry)} · {relativeDays(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      </div>

      {canFull ? (
        <RecordFoot>
          {open ? (
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <ConfirmSubmit
                title={`Cancel ${booking.personName}'s booking?`}
                description="The place is released. Cost lines and payments stay on the record so the refund can be worked out. This cannot be undone."
                confirmLabel="Cancel booking"
              >
                Cancel booking
              </ConfirmSubmit>
            </form>
          ) : null}
          <form action={deleteBookingAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <ConfirmSubmit
              title="Delete this booking?"
              description="Only possible while no payment has been recorded. The booking disappears from every list."
            >
              Delete booking
            </ConfirmSubmit>
          </form>
        </RecordFoot>
      ) : null}
    </>
  );
}
