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
import type { StayVocabulary } from '@/lib/admin/booking-offer';
import { stayFor } from '@/lib/admin/booking-levels';
import { OptionalSection } from '@/components/admin/optional-section';
import { toDateInputValue } from '@/lib/dates';
import { DateFormField } from '@/components/admin/date-picker';
import { pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { EXAM_PARTS, EXAM_PARTS_LABELS } from '@/lib/admin/exam-parts';
import { freeSeats, type ExamSitting } from '@/lib/admin/exams';
import {
  addChargeAction,
  carryOverAction,
  changeExamAction,
  extendBookingAction,
  observeBookingAction,
  recordPaymentAction,
  setPeriodLevelAction,
  updateBookingAction,
} from './actions';
import { DialogFooter } from '@/components/admin/dialogs';
import { PaymentAmountField, PaymentSubjectField } from './payment-fields';

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
  stays,
}: {
  booking: BookingDetail;
  courseTypes: CourseTypeSummary[];
  /** The accommodation vocabulary: a course booking's stay is changed here, its rent priced again. */
  stays: StayVocabulary | null;
}) {
  const { t, lang } = await getI18n();
  // Once a period is on a course of a start, the course type is the start's: it is not changed here.
  const typeLocked = booking.periods.some((p) => p.courseInstanceId);
  const stay = booking.accommodation;
  const editsStay = Boolean(stays) && !booking.exam && booking.status !== 'cancelled';
  // A new stay starts around the course: the day before it, to the Saturday after.
  const around = stayFor(toDateInputValue(booking.startDate) || null, toDateInputValue(booking.endDate) || null);
  const stayFrom = stay ? toDateInputValue(stay.from) : (around?.from ?? '');
  const stayTo = stay ? toDateInputValue(stay.to) : (around?.to ?? '');
  return (
    <form action={updateBookingAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <div className="grid grid-cols-2 gap-3">
        {/* An exam booking has no course type: its exam and sitting change under "Termin ändern". */}
        {booking.exam ? null : typeLocked ? (
          <Field label={t('Kursart', 'Course type')} htmlFor="edit-type">
            <input type="hidden" name="courseTypeId" value={booking.courseTypeId ?? ''} />
            <Select id="edit-type" defaultValue={booking.courseTypeId ?? ''} disabled>
              <option value={booking.courseTypeId ?? ''}>{booking.courseTypeName ?? '—'}</option>
            </Select>
          </Field>
        ) : (
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
        )}
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
      {editsStay && stays ? (
        <>
          <input type="hidden" name="stayFields" value="1" />
          <Field label={t('Unterkunft', 'Accommodation')} htmlFor="edit-stay">
            <Select id="edit-stay" name="accommodationTypeCode" defaultValue={stay?.typeCode ?? ''}>
              <option value="">{t('Keine', 'None')}</option>
              {stays.types
                .filter((type) => type.bookable || type.code === stay?.typeCode)
                .map((type) => (
                  <option key={type.code} value={type.code}>
                    {pick(lang, type.name)}
                  </option>
                ))}
            </Select>
          </Field>
          <OptionalSection requires={['accommodationTypeCode']} heading={t('Zimmer, Verpflegung und Daten', 'Room, meals and dates')}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Zimmer', 'Room')} htmlFor="edit-stay-room">
                <Select id="edit-stay-room" name="roomTypeCode" defaultValue={stay?.roomTypeCode ?? ''}>
                  <option value="">{t('Nicht angegeben', 'Not specified')}</option>
                  {stays.rooms.map((r) => (
                    <option key={r.code} value={r.code}>
                      {pick(lang, r.name)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Verpflegung', 'Catering')} htmlFor="edit-stay-catering">
                <Select id="edit-stay-catering" name="cateringCode" defaultValue={stay?.cateringCode ?? ''}>
                  <option value="">{t('Nicht angegeben', 'Not specified')}</option>
                  {stays.catering.map((c) => (
                    <option key={c.code} value={c.code}>
                      {pick(lang, c.name)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Anreise', 'Arrival')} htmlFor="edit-stay-from">
                <DateFormField id="edit-stay-from" name="accommodationFrom" defaultValue={stayFrom} />
              </Field>
              <Field label={t('Abreise', 'Departure')} htmlFor="edit-stay-to">
                <DateFormField id="edit-stay-to" name="accommodationTo" defaultValue={stayTo} />
              </Field>
            </div>
          </OptionalSection>
        </>
      ) : null}
      <Field label={t('Notizen', 'Notes')} htmlFor="edit-notes">
        <Textarea id="edit-notes" name="notes" rows={3} defaultValue={booking.notes ?? ''} />
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function ExtendBookingForm({
  booking,
  cohorts,
  levels,
}: {
  booking: BookingDetail;
  cohorts: CohortOption[];
  levels: readonly string[];
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
      {/* The level of the new period: what the cohort's places count, and what closes a place in its waiting list. */}
      <Field label={last?.levelCode ? t(`Niveau (zuletzt ${last.levelCode})`, `Level (last ${last.levelCode})`) : t('Niveau', 'Level')} htmlFor="extend-level">
        <Select id="extend-level" name="levelCode" defaultValue="">
          <option value="">{t('Noch offen', 'Not decided yet')}</option>
          {levels.map((code) => (
            <option key={code} value={code}>
              {code}
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
      <DialogFooter>
        <Button type="submit">{t('Verlängern', 'Extend')}</Button>
      </DialogFooter>
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
      <DialogFooter>
        <Button type="submit">{t('Posten hinzufügen', 'Add line')}</Button>
      </DialogFooter>
    </form>
  );
}

export async function PaymentForm({ bookingId, balance }: { bookingId: string; balance: number }) {
  const { t, lang } = await getI18n();
  return (
    <form action={recordPaymentAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 items-start gap-3">
        <Field label={t('Betrag', 'Amount')} htmlFor="pay-amount">
          <PaymentAmountField id="pay-amount" open={balance} />
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
      <PaymentSubjectField />
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
      <DialogFooter>
        <Button type="submit">{t('Zahlung erfassen', 'Record payment')}</Button>
      </DialogFooter>
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
      b.number,
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
      <DialogFooter>
        <Button type="submit">{t('Guthaben übertragen', 'Carry the credit over')}</Button>
      </DialogFooter>
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
      <DialogFooter>
        <Button type="submit">{t('Unter Beobachtung stellen', 'Put under observation')}</Button>
      </DialogFooter>
    </form>
  );
}

/** A period's level: set or corrected, so the cohort's places for that level count the learner. */
export async function PeriodLevelForm({ bookingId, periodId, levelCode, levels }: { bookingId: string; periodId: string; levelCode: string | null; levels: readonly string[] }) {
  const { t } = await getI18n();
  return (
    <form action={setPeriodLevelAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="periodId" value={periodId} />
      <Field label={t('Niveau', 'Level')} htmlFor={`period-level-${periodId}`}>
        <Select id={`period-level-${periodId}`} name="levelCode" defaultValue={levelCode ?? ''}>
          <option value="">{t('Kein Niveau', 'No level')}</option>
          {levels.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}

/** An exam booking's sitting — another of the same exam with a place — and its parts. */
export async function ExamChangeForm({ booking, sittings }: { booking: BookingDetail; sittings: readonly ExamSitting[] }) {
  const { t, lang } = await getI18n();
  const exam = booking.exam;
  if (!exam) return null;
  const day = (d: Date) => new Date(d).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <form action={changeExamAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={booking.id} />
      <Field label={t('Termin', 'Sitting')} htmlFor="exam-sitting">
        <Select id="exam-sitting" name="examSessionId" defaultValue={exam.sessionId}>
          {/* The booking's own sitting is always a choice, even when it has passed. */}
          {sittings.some((s) => s.id === exam.sessionId) ? null : <option value={exam.sessionId}>{day(exam.startsAt)}</option>}
          {sittings.map((s) => {
            const own = s.id === exam.sessionId;
            const free = freeSeats(s);
            return (
              <option key={s.id} value={s.id} disabled={!own && free === 0}>
                {day(s.startsAt)}
                {own ? ` · ${t('jetzt gebucht', 'booked now')}` : free === 0 ? ` · ${t('voll', 'full')}` : ` · ${free === 1 ? t('1 Platz frei', '1 place free') : t(`${free} Plätze frei`, `${free} places free`)}`}
              </option>
            );
          })}
        </Select>
      </Field>
      <Field label={t('Teile', 'Parts')} htmlFor="exam-parts">
        <Select id="exam-parts" name="examParts" defaultValue={exam.parts}>
          {EXAM_PARTS.map((p) => (
            <option key={p} value={p}>
              {pick(lang, EXAM_PARTS_LABELS[p])}
            </option>
          ))}
        </Select>
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </DialogFooter>
    </form>
  );
}
