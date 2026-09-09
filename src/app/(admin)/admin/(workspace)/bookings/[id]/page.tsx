import Link from 'next/link';
import { notFound } from 'next/navigation';

import { addNoteAction } from '../../actions';
import {
  cancelBookingAction,
  deleteBookingAction,
  removeChargeAction,
  removePeriodAction,
  voidPaymentAction,
} from '../actions';
import { ChargeForm, EditBookingForm, ExtendBookingForm, PaymentForm } from '../booking-forms';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import {
  Badge,
  Button,
  Card,
  DateText,
  DetailList,
  PageHeader,
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
 * One booking — the screen FileMaker's Booking layout becomes.
 *
 * Left: the periods (the dates, and the cohort each one sits in), the cost
 * lines and the payments, each list with its own add button in the header and
 * its own confirmation on removal. Right: who, what, the balance, notes and
 * the history. Everything a staff member changes here is a dialog or a
 * confirmed action; nothing is edited inline.
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

  return (
    <>
      <PageHeader
        backHref="/admin/bookings"
        backLabel="All bookings"
        eyebrow="Booking"
        title={booking.personName}
        description={[
          booking.courseTypeName,
          booking.startDate
            ? `${new Date(booking.startDate).toLocaleDateString('en-GB')} – ${new Date(booking.endDate!).toLocaleDateString('en-GB')}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            {canFull && open ? (
              <form action={cancelBookingAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <ConfirmSubmit
                  title={`Cancel ${booking.personName}'s booking?`}
                  description="The place is released. Cost lines and payments stay on the record so the refund can be worked out. This cannot be undone."
                  confirmLabel="Cancel booking"
                  variant="danger"
                  size="md"
                >
                  Cancel booking
                </ConfirmSubmit>
              </form>
            ) : null}
            {canFull ? (
              <form action={deleteBookingAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <ConfirmSubmit
                  title="Delete this booking?"
                  description="Only possible while no payment has been recorded. The booking disappears from every list."
                  size="md"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            ) : null}
          </div>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Dates">
            <ul className="divide-y divide-ws-line-soft">
              {booking.periods.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <DateText value={p.startDate} /> – <DateText value={p.endDate} />
                      {p.kind === 'extension' ? <Badge tone="quiet">Extension</Badge> : null}
                    </span>
                    <span className="block text-xs text-[var(--casa-text-subtle)]">
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

          <Card
            title="Cost"
            actions={
              canEdit && open ? (
                <FormDialog trigger="Add line" title="Add a cost line" size="sm">
                  <ChargeForm bookingId={booking.id} />
                </FormDialog>
              ) : undefined
            }
          >
            {booking.charges.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">No cost lines.</p>
            ) : (
              <ul className="divide-y divide-ws-line-soft">
                {booking.charges.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">{c.description}</span>
                      <span className="block text-xs text-[var(--casa-text-subtle)]">
                        {CHARGE_KIND_LABELS[c.kind]}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          c.amount < 0 ? 'text-[var(--casa-danger-text)]' : ''
                        )}
                      >
                        {money(c.amount, booking.currency)}
                      </span>
                      {canFull && open ? (
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
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex justify-between border-t border-ws-line-soft pt-3 text-sm">
              <span className="text-[var(--casa-text-subtle)]">Total</span>
              <span className="font-semibold tabular-nums">
                {money(booking.charged, booking.currency)}
              </span>
            </p>
          </Card>

          <Card
            title="Payments"
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
          >
            {booking.payments.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">Nothing received yet.</p>
            ) : (
              <ul className="divide-y divide-ws-line-soft">
                {booking.payments.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between gap-3 py-2',
                      p.voidedAt ? 'opacity-60' : ''
                    )}
                  >
                    <span className="min-w-0 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {p.subject}
                        {p.voidedAt ? <Badge tone="quiet">Voided</Badge> : null}
                      </span>
                      <span className="block text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={p.receivedAt} /> · {PAYMENT_METHOD_LABELS[p.method]}
                        {p.reference ? ` · ${p.reference}` : ''}
                        {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                        {p.voidReason ? ` · ${p.voidReason}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          p.voidedAt ? 'line-through' : ''
                        )}
                      >
                        {money(p.amount, booking.currency)}
                      </span>
                      {canFull && !p.voidedAt ? (
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
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex justify-between border-t border-ws-line-soft pt-3 text-sm">
              <span className="text-[var(--casa-text-subtle)]">Balance</span>
              <span className={cn('font-semibold tabular-nums', balanceTone)}>
                {money(booking.balance, booking.currency)}
              </span>
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Booking">
            <DetailList
              items={[
                {
                  label: 'Status',
                  value: (
                    <Badge tone={BOOKING_STATUS_TONES[booking.status]}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </Badge>
                  ),
                },
                {
                  label: 'Person',
                  value: (
                    <Link
                      href={`/admin/people/${booking.personId}`}
                      className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {booking.personName}
                    </Link>
                  ),
                },
                { label: 'Course', value: booking.courseTypeName },
                {
                  label: 'Payer',
                  value: booking.payerName
                    ? `${PAYER_LABELS[booking.payer]} · ${booking.payerName}`
                    : PAYER_LABELS[booking.payer],
                },
                {
                  label: 'Visa',
                  value: booking.visaRequired ? (
                    <Badge tone="warning">Required</Badge>
                  ) : (
                    'Not required'
                  ),
                },
                { label: 'Notes', value: booking.notes },
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
                  : { label: 'Created', value: <DateText value={booking.createdAt} /> },
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
                  : { label: 'From registration', value: null },
              ]}
            />
          </Card>

          <Card title="Notes">
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
            {notes.length > 0 ? (
              <ul
                className={cn('space-y-3', canEdit ? 'mt-4 border-t border-ws-line-soft pt-4' : '')}
              >
                {notes.map((note) => (
                  <li key={note.id}>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                      {note.body}
                    </p>
                    <p className="mt-1 text-xs text-[var(--casa-text-subtle)]">
                      {note.authorName ?? 'A former colleague'} · {relativeDays(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          {activity.length > 0 ? (
            <Card title="History">
              <ol className="space-y-2.5">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5 text-xs">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[var(--casa-text-subtle)]"
                    >
                      {Icon.check}
                    </span>
                    <span className="text-[var(--casa-text-subtle)]">
                      <span className="font-semibold text-[var(--casa-ink)]">
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
    </>
  );
}
