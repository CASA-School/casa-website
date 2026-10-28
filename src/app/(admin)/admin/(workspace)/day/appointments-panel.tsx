import type { ReactNode } from 'react';

import {
  createPlacementAppointmentAction,
  deletePlacementAppointmentAction,
  setPlacementStatusAction,
  updatePlacementAppointmentAction,
} from './actions';
import { addDays, dayLabel, viewHref, type DayView } from './day-header';
import { ChoiceMenu } from '@/components/admin/choice-menu';
import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  isPlacementWeekday,
  PLACEMENT_DAY_PLACES,
  PLACEMENT_STATUSES,
  placementAppointments,
  type PlacementAppointment,
  type PlacementStatus,
} from '@/lib/admin/placement-appointments';
import { PLACEMENT_TIMES } from '@/lib/appointments/placement-schedule';
import { cn } from '@/lib/utils';

/**
 * „Termine" in the Tagesplan (Rahman, 2026-10-28): the in-person placement tests by appointment,
 * one click from every view of the day. The plan's day first, then the next two weeks' booked days;
 * each appointment with where it stands (booked, came, did not come, cancelled) and the team's own
 * „Termin eintragen" for the ones made by phone or at the desk.
 */

const SPAN = 14;

const STATUS_LABELS: Record<PlacementStatus, Bilingual> = {
  booked: { de: 'Gebucht', en: 'Booked' },
  came: { de: 'Erschienen', en: 'Came' },
  missed: { de: 'Nicht gekommen', en: 'Did not come' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
};
const STATUS_DOTS: Record<PlacementStatus, string> = {
  booked: 'bg-[#2f6fdb]',
  came: 'bg-[#1f9d55]',
  missed: 'bg-[#d99a00]',
  cancelled: 'bg-[#98a2b3]',
};
const STATUS_CHIPS: Record<PlacementStatus, string> = {
  booked: 'bg-[#e8f0fd] text-[#1d4ea8] ring-[#c3d6f7]',
  came: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]',
  missed: 'bg-[#fff2d6] text-[#6e4700] ring-[#f1d9a6]',
  cancelled: 'bg-white text-[var(--casa-muted)] ring-ws-line',
};

/** The same pill as the day's other places (day-header.tsx): the tests' archive, the flats. */
const pill =
  'inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[0.84rem] font-semibold text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-ws-line transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]';

const fullName = (a: PlacementAppointment) => [a.firstName, a.lastName].filter(Boolean).join(' ');

export async function AppointmentsPanel({ day, today, view }: { day: string; today: string; view: DayView }) {
  const [user, { t, lang }] = await Promise.all([requireModule('day'), getI18n()]);
  const canEdit = canAccess(user, 'day', 'edit');
  const canDelete = canAccess(user, 'day', 'full');
  const appointments = await placementAppointments(day, SPAN);
  const back = viewHref(view, day, today);

  const active = (a: PlacementAppointment) => a.status !== 'cancelled';
  const onDay = appointments.filter((a) => a.date === day && active(a)).length;
  const dates = [...new Set([...(isPlacementWeekday(day) ? [day] : []), ...appointments.map((a) => a.date)])].sort();

  return (
    <SidePanel
      triggerClassName={pill}
      trigger={
        <>
          {Icon.calendar}
          {t('Termine', 'Appointments')}
          {onDay ? <span className="text-xs font-semibold text-[var(--casa-muted)] tabular-nums">{onDay}</span> : null}
        </>
      }
      title={t('Einstufungstermine', 'Placement appointments')}
      subtitle={t('Dienstag bis Donnerstag · 2 Plätze je Termin', 'Tuesday to Thursday · 2 places per time')}
      icon={Icon.placement}
      tint="blue"
      width="lg"
      footer={
        canEdit ? (
          <FormDialog trigger={t('Termin eintragen', 'Add an appointment')} triggerVariant="primary" size="sm" icon={Icon.placement} tint="blue" title={t('Termin eintragen', 'Add an appointment')}>
            <AppointmentForm day={day} back={back} canDelete={false} />
          </FormDialog>
        ) : undefined
      }
    >
      {dates.length ? (
        dates.map((date) => {
          const rows = appointments.filter((a) => a.date === date);
          const taken = rows.filter(active).length;
          return (
            <section key={date} className="border-b border-ws-line-soft py-3 last:border-b-0">
              <h3 className="flex items-baseline gap-3 px-6 pb-1.5">
                <span className="text-[0.84rem] font-bold text-[var(--casa-ink)]">
                  {date === today ? `${t('Heute', 'Today')}, ` : null}
                  {dayLabel(date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                {isPlacementWeekday(date) ? (
                  <span className="ml-auto text-[0.76rem] font-semibold whitespace-nowrap text-[var(--casa-muted)] tabular-nums">
                    {t(`${taken} von ${PLACEMENT_DAY_PLACES} Plätzen`, `${taken} of ${PLACEMENT_DAY_PLACES} places`)}
                  </span>
                ) : null}
              </h3>
              {rows.length ? (
                <ul>
                  {rows.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} day={day} back={back} t={t} lang={lang} canEdit={canEdit} canDelete={canDelete} />
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-2 text-[0.86rem] text-[var(--casa-muted)]">{t('Noch keine Termine an diesem Tag.', 'No appointments on this day yet.')}</p>
              )}
            </section>
          );
        })
      ) : (
        <p className="px-6 py-5 text-[0.86rem] text-[var(--casa-muted)]">{t('Keine Termine in den nächsten zwei Wochen.', 'No appointments in the next two weeks.')}</p>
      )}
    </SidePanel>
  );
}

function AppointmentRow({
  appointment: a,
  day,
  back,
  t,
  lang,
  canEdit,
  canDelete,
}: {
  appointment: PlacementAppointment;
  day: string;
  back: string;
  t: T;
  lang: WsLang;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const cancelled = a.status === 'cancelled';
  const reach = [a.phone, a.email].filter(Boolean).join(' · ');
  return (
    <li className="group flex items-start gap-3 px-6 py-2.5">
      <span className={cn('w-[3rem] shrink-0 pt-px text-[0.86rem] font-bold tabular-nums', cancelled ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{a.time}</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[0.88rem] font-semibold', cancelled ? 'text-[var(--casa-muted)] line-through decoration-[var(--casa-muted)]/50' : 'text-[var(--casa-ink)]')}>{fullName(a)}</span>
        {reach ? <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{reach}</span> : null}
        {a.note ? <span className="mt-0.5 line-clamp-2 block text-[0.76rem] whitespace-pre-line text-[var(--casa-muted)]">{a.note}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {canEdit ? (
          <span className="transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
            <FormDialog trigger={t('Ändern', 'Edit')} triggerVariant="ghost" size="sm" icon={Icon.placement} tint="blue" title={fullName(a)}>
              <AppointmentForm appointment={a} day={day} back={back} canDelete={canDelete} />
            </FormDialog>
          </span>
        ) : null}
        {canEdit ? (
          <ChoiceMenu
            action={setPlacementStatusAction}
            fields={{ appointmentId: a.id }}
            name="status"
            label={t('Stand', 'Status')}
            align="end"
            triggerClassName="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
            trigger={<StatusChip status={a.status} lang={lang} />}
            choices={PLACEMENT_STATUSES.map((s) => ({
              value: s,
              label: pick(lang, STATUS_LABELS[s]),
              current: s === a.status,
              icon: <span aria-hidden="true" className={cn('size-2.5 rounded-full', STATUS_DOTS[s])} />,
            }))}
          />
        ) : (
          <StatusChip status={a.status} lang={lang} />
        )}
      </span>
    </li>
  );
}

function StatusChip({ status, lang }: { status: PlacementStatus; lang: WsLang }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset', STATUS_CHIPS[status])}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', STATUS_DOTS[status])} />
      {pick(lang, STATUS_LABELS[status])}
    </span>
  );
}

/** One appointment written in or changed: when, who, how to reach them; and gone, at the foot. */
async function AppointmentForm({ appointment: a, day, back, canDelete }: { appointment?: PlacementAppointment; day: string; back: string; canDelete: boolean }) {
  const { t } = await getI18n();
  const key = a?.id ?? 'new';
  // A time the team set outside the usual twelve stays choosable on its own appointment.
  const times: readonly string[] = a && !(PLACEMENT_TIMES as readonly string[]).includes(a.time) ? [...PLACEMENT_TIMES, a.time].sort() : PLACEMENT_TIMES;
  const fields: ReactNode = (
    <>
      <input type="hidden" name="back" value={back} />
      {a ? <input type="hidden" name="appointmentId" value={a.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Tag', 'Day')} htmlFor={`pa-date-${key}`}>
          <DateFormField id={`pa-date-${key}`} name="date" defaultValue={a?.date ?? nextPlacementDay(day)} required />
        </Field>
        <Field label={t('Uhrzeit', 'Time')} htmlFor={`pa-time-${key}`}>
          <Select id={`pa-time-${key}`} name="time" required defaultValue={a?.time ?? ''}>
            <option value="" disabled>
              {t('Bitte wählen', 'Choose')}
            </option>
            {times.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Vorname', 'First name')} htmlFor={`pa-first-${key}`}>
          <Input id={`pa-first-${key}`} name="firstName" required maxLength={100} autoComplete="off" defaultValue={a?.firstName ?? ''} />
        </Field>
        <Field label={t('Nachname', 'Last name')} htmlFor={`pa-last-${key}`}>
          <Input id={`pa-last-${key}`} name="lastName" maxLength={100} autoComplete="off" defaultValue={a?.lastName ?? ''} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Telefon', 'Phone')} htmlFor={`pa-phone-${key}`}>
          <Input id={`pa-phone-${key}`} name="phone" type="tel" maxLength={40} autoComplete="off" defaultValue={a?.phone ?? ''} />
        </Field>
        <Field label={t('E-Mail', 'Email')} htmlFor={`pa-email-${key}`}>
          <Input id={`pa-email-${key}`} name="email" type="email" maxLength={254} autoComplete="off" defaultValue={a?.email ?? ''} />
        </Field>
      </div>
      <Field label={t('Notiz', 'Note')} htmlFor={`pa-note-${key}`}>
        <Textarea id={`pa-note-${key}`} name="note" rows={2} maxLength={1000} defaultValue={a?.note ?? ''} />
      </Field>
    </>
  );
  return (
    <div className="space-y-4">
      <form action={a ? updatePlacementAppointmentAction : createPlacementAppointmentAction} className="space-y-4">
        {fields}
        <DialogFooter>
          <Button type="submit">{a ? t('Speichern', 'Save') : t('Eintragen', 'Add')}</Button>
        </DialogFooter>
      </form>
      {a && canDelete ? (
        <form action={deletePlacementAppointmentAction} className="flex justify-start">
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="appointmentId" value={a.id} />
          <ConfirmSubmit
            variant="ghost"
            title={t('Termin löschen?', 'Delete the appointment?')}
            description={t('Er verschwindet aus dem Tagesplan, und der Platz ist wieder frei.', 'It disappears from the day plan, and the place is free again.')}
            confirmLabel={t('Löschen', 'Delete')}
          >
            {t('Termin löschen', 'Delete appointment')}
          </ConfirmSubmit>
        </form>
      ) : null}
    </div>
  );
}

/** A new appointment starts on the plan's day when it is a placement day, else on the next one. */
function nextPlacementDay(day: string) {
  for (let d = day, i = 0; i < 14; d = addDays(d, 1), i++) if (isPlacementWeekday(d)) return d;
  return day;
}
