import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  CHARGE_KIND_LABELS,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  type BookingDetail,
  type CohortOption,
} from '@/lib/admin/bookings';
import type { CourseTypeSummary } from '@/lib/admin/catalogue';
import { OptionalSection } from '@/components/admin/optional-section';
import { toDateInputValue } from '@/lib/dates';
import {
  addChargeAction,
  extendBookingAction,
  recordPaymentAction,
  updateBookingAction,
} from './actions';

/**
 * The booking forms, rendered inside dialogs.
 *
 * Progressive disclosure throughout: a new booking asks for the cohort and
 * the dates; payer, status, visa, notes and the enrolment fee wait under
 * "More". The cohort picker carries its dates and catalogue price as data
 * attributes so a browser without JavaScript still posts a complete form —
 * the dates are simply typed.
 */

const More = ({ children }: { children: React.ReactNode }) => (
  <OptionalSection requires={['startDate', 'endDate']} heading="Cost line">
    <div className="mt-3 space-y-3">{children}</div>
  </OptionalSection>
);

function PayerFields({ payer = 'self', payerName = '' }: { payer?: string; payerName?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Who pays" htmlFor="booking-payer">
        <Select id="booking-payer" name="payer" defaultValue={payer}>
          {(Object.keys(PAYER_LABELS) as (keyof typeof PAYER_LABELS)[]).map((p) => (
            <option key={p} value={p}>
              {PAYER_LABELS[p]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Payer name" htmlFor="booking-payer-name">
        <Input id="booking-payer-name" name="payerName" defaultValue={payerName} maxLength={120} />
      </Field>
    </div>
  );
}

export function EditBookingForm({
  booking,
  courseTypes,
}: {
  booking: BookingDetail;
  courseTypes: CourseTypeSummary[];
}) {
  return (
    <form action={updateBookingAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course type" htmlFor="edit-type">
          <Select id="edit-type" name="courseTypeId" defaultValue={booking.courseTypeId ?? ''}>
            <option value="">—</option>
            {courseTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="edit-status">
          <Select id="edit-status" name="status" defaultValue={booking.status}>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <PayerFields payer={booking.payer} payerName={booking.payerName ?? ''} />
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="visaRequired"
          defaultChecked={booking.visaRequired}
          className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
        />
        Visa required
      </label>
      <Field label="Notes" htmlFor="edit-notes">
        <Textarea id="edit-notes" name="notes" rows={3} defaultValue={booking.notes ?? ''} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export function ExtendBookingForm({
  booking,
  cohorts,
}: {
  booking: BookingDetail;
  cohorts: CohortOption[];
}) {
  const last = booking.periods[booking.periods.length - 1];
  const next = last ? new Date(last.endDate) : null;
  if (next) next.setDate(next.getDate() + 1);
  return (
    <form action={extendBookingAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <Field label="Cohort" htmlFor="extend-cohort">
        <Select id="extend-cohort" name="courseInstanceId" defaultValue="">
          <option value="">No cohort yet — dates only</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor="extend-start">
          <Input
            id="extend-start"
            name="startDate"
            type="date"
            required
            defaultValue={toDateInputValue(next)}
          />
        </Field>
        <Field label="To" htmlFor="extend-end">
          <Input id="extend-end" name="endDate" type="date" required />
        </Field>
      </div>
      <More>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Cost line" htmlFor="extend-tuition-label">
            <Input
              id="extend-tuition-label"
              name="tuitionLabel"
              defaultValue="Extension"
              maxLength={120}
            />
          </Field>
          <Field label="Amount" htmlFor="extend-tuition">
            <Input
              id="extend-tuition"
              name="tuition"
              inputMode="decimal"
              className="w-28 text-right"
            />
          </Field>
        </div>
      </More>
      <div className="flex justify-end pt-1">
        <Button type="submit">Extend</Button>
      </div>
    </form>
  );
}

export function ChargeForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={addChargeAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Field label="Kind" htmlFor="charge-kind">
          <Select id="charge-kind" name="kind" defaultValue="other">
            {(Object.keys(CHARGE_KIND_LABELS) as (keyof typeof CHARGE_KIND_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {CHARGE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="charge-desc">
          <Input id="charge-desc" name="description" required maxLength={160} />
        </Field>
      </div>
      <Field label="Amount" hint="negative for a refund or cancellation" htmlFor="charge-amount">
        <Input
          id="charge-amount"
          name="amount"
          inputMode="decimal"
          required
          className="text-right"
        />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">Add line</Button>
      </div>
    </form>
  );
}

export function PaymentForm({ bookingId, balance }: { bookingId: string; balance: number }) {
  return (
    <form action={recordPaymentAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="pay-amount">
          <Input
            id="pay-amount"
            name="amount"
            inputMode="decimal"
            required
            className="text-right"
            defaultValue={balance > 0 ? balance.toFixed(2) : ''}
          />
        </Field>
        <Field label="Method" htmlFor="pay-method">
          <Select id="pay-method" name="method" defaultValue="transfer">
            {(Object.keys(PAYMENT_METHOD_LABELS) as (keyof typeof PAYMENT_METHOD_LABELS)[]).map(
              (m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              )
            )}
          </Select>
        </Field>
      </div>
      <Field label="For" htmlFor="pay-subject">
        <Input
          id="pay-subject"
          name="subject"
          required
          maxLength={160}
          defaultValue="Course price"
        />
      </Field>
      <More>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Received on" htmlFor="pay-date">
            <Input
              id="pay-date"
              name="receivedAt"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              required
            />
          </Field>
          <Field label="Reference" htmlFor="pay-ref">
            <Input id="pay-ref" name="reference" maxLength={120} />
          </Field>
        </div>
      </More>
      <div className="flex justify-end pt-1">
        <Button type="submit">Record payment</Button>
      </div>
    </form>
  );
}
