import type { ReactNode } from 'react';

import { dayRange, euros } from '@/components/admin/list';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  CHARGE_KIND_LABELS,
  OBSERVATION_REASON_LABELS,
  OBSERVATION_REASONS,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  type BookingDetail,
  type BookingListItem,
  type CohortOption,
} from '@/lib/admin/bookings';
import type { CourseTypeSummary } from '@/lib/admin/catalogue';
import { OptionalSection } from '@/components/admin/optional-section';
import { toDateInputValue } from '@/lib/dates';
import { DateFormField } from '@/components/admin/date-picker';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  addChargeAction,
  carryOverAction,
  extendBookingAction,
  observeBookingAction,
  recordPaymentAction,
  updateBookingAction,
} from './actions';

/**
 * The booking forms, rendered inside dialogs.
 *
 * A booking itself is created by the wizard (`booking-wizard.tsx`); these
 * change one that exists. Progressive disclosure throughout: an extension asks
 * for the cohort and the dates, and its cost line appears once both dates are
 * in; a payment asks for the amount, the method and what it is for, with the
 * date and the reference under it. A form without JavaScript shows every field.
 */

const More = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <OptionalSection requires={['startDate', 'endDate']} heading={heading}>
    <div className="space-y-3">{children}</div>
  </OptionalSection>
);

function PayerFields({
  payer = 'self',
  payerName = '',
  t,
  lang,
}: {
  payer?: string;
  payerName?: string;
  t: T;
  lang: WsLang;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t('Wer zahlt', 'Who pays')} htmlFor="booking-payer">
        <Select id="booking-payer" name="payer" defaultValue={payer}>
          {(Object.keys(PAYER_LABELS) as (keyof typeof PAYER_LABELS)[]).map((p) => (
            <option key={p} value={p}>
              {pick(lang, PAYER_LABELS[p])}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Name der Zahlenden', 'Payer name')} htmlFor="booking-payer-name">
        <Input id="booking-payer-name" name="payerName" defaultValue={payerName} maxLength={120} />
      </Field>
    </div>
  );
}

export async function EditBookingForm({
  booking,
  courseTypes,
}: {
  booking: BookingDetail;
  courseTypes: CourseTypeSummary[];
}) {
  const { t, lang } = await getI18n();
  return (
    <form action={updateBookingAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Kursart', 'Course type')} htmlFor="edit-type">
          <Select id="edit-type" name="courseTypeId" defaultValue={booking.courseTypeId ?? ''}>
            <option value="">—</option>
            {courseTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Status', 'Status')} htmlFor="edit-status">
          <Select id="edit-status" name="status" defaultValue={booking.status}>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {pick(lang, BOOKING_STATUS_LABELS[s])}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <PayerFields payer={booking.payer} payerName={booking.payerName ?? ''} t={t} lang={lang} />
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="visaRequired"
          defaultChecked={booking.visaRequired}
          className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
        />
        {t('Visum nötig', 'Visa required')}
      </label>
      <Field label={t('Notizen', 'Notes')} htmlFor="edit-notes">
        <Textarea id="edit-notes" name="notes" rows={3} defaultValue={booking.notes ?? ''} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

export async function ExtendBookingForm({
  booking,
  cohorts,
}: {
  booking: BookingDetail;
  cohorts: CohortOption[];
}) {
  const { t } = await getI18n();
  const last = booking.periods[booking.periods.length - 1];
  const next = last ? new Date(last.endDate) : null;
  if (next) next.setDate(next.getDate() + 1);
  return (
    <form action={extendBookingAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <Field label={t('Termin', 'Cohort')} htmlFor="extend-cohort">
        <Select id="extend-cohort" name="courseInstanceId" defaultValue="">
          <option value="">{t('Noch kein Termin – nur Daten', 'No cohort yet — dates only')}</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Von', 'From')} htmlFor="extend-start">
          <DateFormField
            id="extend-start"
            name="startDate"
            required
            defaultValue={toDateInputValue(next)}
          />
        </Field>
        <Field label={t('Bis', 'To')} htmlFor="extend-end">
          <DateFormField id="extend-end" name="endDate" required />
        </Field>
      </div>
      <More heading={t('Kostenposten', 'Cost line')}>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('Kostenposten', 'Cost line')} htmlFor="extend-tuition-label">
            <Input
              id="extend-tuition-label"
              name="tuitionLabel"
              defaultValue={t('Verlängerung', 'Extension')}
              maxLength={120}
            />
          </Field>
          <Field label={t('Betrag', 'Amount')} htmlFor="extend-tuition">
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
        <Button type="submit">{t('Verlängern', 'Extend')}</Button>
      </div>
    </form>
  );
}

export async function ChargeForm({ bookingId }: { bookingId: string }) {
  const { t, lang } = await getI18n();
  return (
    <form action={addChargeAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Field label={t('Art', 'Kind')} htmlFor="charge-kind">
          <Select id="charge-kind" name="kind" defaultValue="other">
            {(Object.keys(CHARGE_KIND_LABELS) as (keyof typeof CHARGE_KIND_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {pick(lang, CHARGE_KIND_LABELS[k])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Beschreibung', 'Description')} htmlFor="charge-desc">
          <Input id="charge-desc" name="description" required maxLength={160} />
        </Field>
      </div>
      <Field
        label={t('Betrag', 'Amount')}
        hint={t('negativ für eine Erstattung oder Stornierung', 'negative for a refund or cancellation')}
        htmlFor="charge-amount"
      >
        <Input
          id="charge-amount"
          name="amount"
          inputMode="decimal"
          required
          className="text-right"
        />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Posten hinzufügen', 'Add line')}</Button>
      </div>
    </form>
  );
}

export async function PaymentForm({ bookingId, balance }: { bookingId: string; balance: number }) {
  const { t, lang } = await getI18n();
  return (
    <form action={recordPaymentAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Betrag', 'Amount')} htmlFor="pay-amount">
          <Input
            id="pay-amount"
            name="amount"
            inputMode="decimal"
            required
            className="text-right"
            defaultValue={balance > 0 ? balance.toFixed(2) : ''}
          />
        </Field>
        <Field label={t('Zahlungsart', 'Method')} htmlFor="pay-method">
          <Select id="pay-method" name="method" defaultValue="transfer">
            {(Object.keys(PAYMENT_METHOD_LABELS) as (keyof typeof PAYMENT_METHOD_LABELS)[]).map(
              (m) => (
                <option key={m} value={m}>
                  {pick(lang, PAYMENT_METHOD_LABELS[m])}
                </option>
              )
            )}
          </Select>
        </Field>
      </div>
      <Field label={t('Wofür', 'For')} htmlFor="pay-subject">
        <Input
          id="pay-subject"
          name="subject"
          required
          maxLength={160}
          defaultValue={pick(lang, CHARGE_KIND_LABELS.tuition)}
        />
      </Field>
      <More heading={t('Datum und Referenz', 'Date and reference')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Eingegangen am', 'Received on')} htmlFor="pay-date">
            <DateFormField
              id="pay-date"
              name="receivedAt"
              defaultValue={toDateInputValue(new Date())}
              required
            />
          </Field>
          <Field label={t('Referenz', 'Reference')} htmlFor="pay-ref">
            <Input id="pay-ref" name="reference" maxLength={120} />
          </Field>
        </div>
      </More>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Zahlung erfassen', 'Record payment')}</Button>
      </div>
    </form>
  );
}

/**
 * Carry-over: the credit this booking holds goes to another booking of the same learner. Each
 * choice says what is still open there, and the amount starts at the whole credit.
 */
export async function CarryOverForm({
  bookingId,
  credit,
  targets,
}: {
  bookingId: string;
  credit: number;
  targets: BookingListItem[];
}) {
  const { t, lang } = await getI18n();
  const label = (b: BookingListItem) => {
    const from = toDateInputValue(b.startDate);
    const to = toDateInputValue(b.endDate);
    const open = b.charged - b.paid;
    return [
      b.courseTypeName ?? t('Buchung', 'Booking'),
      from && to ? dayRange(from, to, lang) : null,
      open > 0.005 ? t(`${euros(open)} offen`, `${euros(open)} open`) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };
  return (
    <form action={carryOverAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field label={t('Auf die Buchung', 'To the booking')} htmlFor="carry-target">
        <Select id="carry-target" name="targetId" required>
          {targets.map((b) => (
            <option key={b.id} value={b.id}>
              {label(b)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Betrag', 'Amount')} htmlFor="carry-amount">
        <Input id="carry-amount" name="amount" inputMode="decimal" required className="text-right" defaultValue={credit.toFixed(2)} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Guthaben übertragen', 'Carry the credit over')}</Button>
      </div>
    </form>
  );
}

/** Yellow: why the booking is under observation, and a note for the colleague who looks next. */
export async function ObservationForm({ bookingId }: { bookingId: string }) {
  const { t, lang } = await getI18n();
  return (
    <form action={observeBookingAction} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-semibold text-[var(--casa-ink)]">{t('Grund', 'Reason')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OBSERVATION_REASONS.map((reason, i) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-ws-line-firm bg-white px-3 py-2 text-[0.84rem] font-semibold text-[var(--casa-ink)] transition-colors has-[:checked]:border-[#d99a00] has-[:checked]:bg-[#fff8e6]"
            >
              <input type="radio" name="reason" value={reason} required defaultChecked={i === 0} className="accent-[#d99a00]" />
              {pick(lang, OBSERVATION_REASON_LABELS[reason])}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t('Notiz', 'Note')} hint={t('Bei „Sonstiges" nötig', 'Needed for “Other”')} htmlFor="observation-note">
        <Textarea id="observation-note" name="note" rows={3} maxLength={300} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Unter Beobachtung stellen', 'Put under observation')}</Button>
      </div>
    </form>
  );
}
