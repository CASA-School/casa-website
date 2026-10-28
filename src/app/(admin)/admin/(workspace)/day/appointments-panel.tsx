import Link from 'next/link';

import {
  assignAppointmentAction,
  createAppointmentAction,
  deleteAppointmentAction,
  setAppointmentStatusAction,
  updateAppointmentAction,
} from './actions';
import { dayLabel } from './day-header';
import { Faces, PanelSection, Quiet, Tile, tileClass } from './panel-parts';
import { ChoiceMenu } from '@/components/admin/choice-menu';
import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/list';
import { OptionalSection } from '@/components/admin/optional-section';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_LENGTHS,
  APPOINTMENT_STATUSES,
  KIND_CHIPS,
  KIND_LABELS,
  STATUS_CHIPS,
  STATUS_DOTS,
  STATUS_LABELS,
  type AppointmentStatus,
} from '@/lib/admin/appointment-labels';
import { appointmentColleagues, appointmentsFrom, isPlacementWeekday, PLACEMENT_DAY_PLACES, type Appointment } from '@/lib/admin/appointments';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { ABSENCE_LABELS } from '@/lib/admin/kursplanung/types';
import { cn } from '@/lib/utils';

/**
 * Termine in the Tagesplan (Rahman, 2026-10-28): the team's appointments as a tile like the others,
 * opening a panel — the placement tests in person (booked by learners on the website), consultations,
 * group consultations and any other appointment a colleague writes in. Each may be for a colleague:
 * theirs come first, as „Meine Termine"; everyone sees all of them and whose they are, with a red mark
 * when that colleague is away on the day, so somebody covers it.
 */

const SPAN = 14;

type Colleague = { id: string; name: string };

const fullName = (a: Appointment) => [a.firstName, a.lastName].filter(Boolean).join(' ');
const active = (a: Appointment) => a.status !== 'cancelled';

/** Which appointments the panel shows when it opens from a link: everyone's, or the colleague's own. */
export type AppointmentsView = 'all' | 'mine';

export async function AppointmentsPanel({ day, today, open }: { day: string; today: string; open: AppointmentsView | null }) {
  const [user, { t, lang }] = await Promise.all([requireModule('day'), getI18n()]);
  const canEdit = canAccess(user, 'day', 'edit');
  const canDelete = canAccess(user, 'day', 'full');
  const [appointments, colleagues] = await Promise.all([appointmentsFrom(day, SPAN), canEdit ? appointmentColleagues() : Promise.resolve([])]);
  const view: AppointmentsView = open ?? 'all';
  const href = (v: AppointmentsView) => `/admin/day?${day === today ? '' : `date=${day}&`}termine=${v === 'mine' ? 'mine' : '1'}`;
  const back = href(view);

  const onDay = appointments.filter((a) => a.date === day);
  const live = onDay.filter(active);
  const mine = appointments.filter((a) => a.assignee?.id === user.id);
  const mineToday = live.filter((a) => a.assignee?.id === user.id);
  const shown = view === 'mine' ? mine : appointments;
  const later = shown.filter((a) => a.date > day);
  const laterDates = [...new Set(later.map((a) => a.date))];
  const cover = live.filter((a) => a.assigneeAway).length;
  const placementTaken = live.filter((a) => a.kind === 'placement').length;
  const longDay = dayLabel(day, lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const short = (date: string) => dayLabel(date, lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const row = (a: Appointment) => (
    <AppointmentRow key={a.id} appointment={a} back={back} colleagues={colleagues} me={user.id} t={t} lang={lang} canEdit={canEdit} canDelete={canDelete} />
  );
  const firstDay = shown.filter((a) => a.date === day);

  return (
    <SidePanel
      triggerClassName={tileClass}
      trigger={
        <Tile
          icon={Icon.clock}
          tint="green"
          label={t('Termine', 'Appointments')}
          value={live.length ? (live.length === 1 ? t('1 Termin', '1 appointment') : t(`${live.length} Termine`, `${live.length} appointments`)) : '—'}
          detail={
            mineToday.length
              ? t(`Für dich: ${mineToday.length} · ab ${mineToday[0].time}`, `Yours: ${mineToday.length} · from ${mineToday[0].time}`)
              : live.length
                ? t(`Ab ${live[0].time} Uhr`, `From ${live[0].time}`)
                : t('Keine an diesem Tag', 'None on this day')
          }
          alert={cover ? { tone: 'red', text: cover === 1 ? t('Vertretung nötig', 'Needs cover') : t(`${cover}× Vertretung nötig`, `${cover}× needs cover`) } : undefined}
        >
          <Faces names={[...new Set(live.map((a) => a.assignee?.name).filter((n): n is string => Boolean(n)))]} />
        </Tile>
      }
      defaultOpen={open !== null}
      title={t('Termine', 'Appointments')}
      subtitle={longDay}
      icon={Icon.clock}
      tint="green"
      width="lg"
      footer={
        canEdit ? (
          <FormDialog trigger={t('Termin eintragen', 'Add an appointment')} triggerVariant="primary" size="sm" width="lg" icon={Icon.clock} tint="green" title={t('Termin eintragen', 'Add an appointment')}>
            <AppointmentForm day={day} back={back} colleagues={colleagues} me={user.id} canDelete={false} />
          </FormDialog>
        ) : undefined
      }
    >
      {/* Everyone's or one's own: a colleague away is covered because all see all, and whose each is. */}
      <nav aria-label={t('Welche Termine', 'Which appointments')} className="border-b border-ws-line-soft px-6 py-3">
        <span className="inline-flex rounded-full bg-ws-sunk p-1">
          {(['all', 'mine'] as const).map((v) => (
            <Link
              key={v}
              href={href(v)}
              replace
              scroll={false}
              aria-current={v === view ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                v === view ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
              )}
            >
              {v === 'all' ? t('Alle', 'All') : t('Meine', 'Mine')}
              {v === 'mine' && mine.filter(active).length ? <span className="text-[0.72rem] tabular-nums opacity-70">{mine.filter(active).length}</span> : null}
            </Link>
          ))}
        </span>
      </nav>

      <PanelSection
        title={day === today ? t('Heute', 'Today') : longDay}
        aside={view === 'all' && isPlacementWeekday(day) ? t(`Einstufung: ${placementTaken} von ${PLACEMENT_DAY_PLACES} Plätzen`, `Placement: ${placementTaken} of ${PLACEMENT_DAY_PLACES} places`) : undefined}
      >
        {firstDay.length ? (
          <ul>{firstDay.map(row)}</ul>
        ) : (
          <Quiet>{view === 'mine' ? t('An diesem Tag hast du keinen Termin.', 'You have no appointments on this day.') : t('An diesem Tag ist kein Termin eingetragen.', 'No appointments on this day.')}</Quiet>
        )}
      </PanelSection>

      <PanelSection title={t('Nächste Tage', 'The days ahead')}>
        {laterDates.length ? (
          laterDates.map((date) => (
            <div key={date}>
              <p className="px-6 pt-2 pb-0.5 text-[0.76rem] font-semibold text-[var(--casa-ink)]">{short(date)}</p>
              <ul>{later.filter((a) => a.date === date).map(row)}</ul>
            </div>
          ))
        ) : (
          <Quiet>{view === 'mine' ? t('Dir ist in den nächsten zwei Wochen kein Termin zugeteilt.', 'No appointments are yours in the next two weeks.') : t('Keine Termine in den nächsten zwei Wochen.', 'No appointments in the next two weeks.')}</Quiet>
        )}
      </PanelSection>
    </SidePanel>
  );
}

function AppointmentRow({
  appointment: a,
  back,
  colleagues,
  me,
  t,
  lang,
  canEdit,
  canDelete,
}: {
  appointment: Appointment;
  back: string;
  colleagues: Colleague[];
  me: string;
  t: T;
  lang: WsLang;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const cancelled = a.status === 'cancelled';
  const reach = [a.phone, a.email].filter(Boolean).join(' · ');
  const request = Boolean(a.enquiryId);
  const owner = (
    <span className="inline-flex items-center gap-1.5">
      {a.assignee ? <Avatar name={a.assignee.name} staff size="sm" /> : <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-dashed border-ws-line text-[var(--casa-text-subtle)] [&_svg]:size-3">{Icon.person}</span>}
      <span className={cn('text-[0.78rem] font-semibold', a.assignee ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>
        {a.assignee ? (a.assignee.id === me ? t('Du', 'You') : a.assignee.name) : t('Team', 'Team')}
      </span>
    </span>
  );
  return (
    <li className="group flex items-start gap-3 px-6 py-2.5">
      <span className="w-[3.4rem] shrink-0 pt-px tabular-nums">
        <span className={cn('block text-[0.86rem] font-bold', cancelled ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{a.time}</span>
        <span className="block text-[0.7rem] text-[var(--casa-muted)]">{t(`${a.minutes} Min.`, `${a.minutes} min`)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn('truncate text-[0.88rem] font-semibold', cancelled ? 'text-[var(--casa-muted)] line-through decoration-[var(--casa-muted)]/50' : 'text-[var(--casa-ink)]')}>{fullName(a)}</span>
          <span className={cn('inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[0.68rem] font-bold', KIND_CHIPS[a.kind])}>{pick(lang, KIND_LABELS[a.kind])}</span>
        </span>
        {reach ? <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{reach}</span> : null}
        {a.note ? <span className="mt-0.5 line-clamp-2 block text-[0.76rem] whitespace-pre-line text-[var(--casa-muted)]">{a.note}</span> : null}
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          {canEdit && !request ? (
            <ChoiceMenu
              action={assignAppointmentAction}
              fields={{ appointmentId: a.id }}
              name="assignedTo"
              label={t('Für wen', 'Whose')}
              triggerClassName="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
              trigger={owner}
              choices={[
                ...colleagues.map((c) => ({ value: c.id, label: c.id === me ? t(`${c.name} (du)`, `${c.name} (you)`) : c.name, current: c.id === a.assignee?.id, icon: <Avatar name={c.name} staff size="sm" /> })),
                { value: 'none', label: t('Team (niemand bestimmtes)', 'Team (nobody in particular)'), current: !a.assignee },
              ]}
            />
          ) : (
            owner
          )}
          {a.assigneeAway && active(a) ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-md bg-[#fdecec] px-1.5 text-[0.68rem] font-bold text-[#9b1c1c]">
              {pick(lang, ABSENCE_LABELS[a.assigneeAway])} · {t('Vertretung nötig', 'needs cover')}
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {request ? (
          <Link
            href={`/admin/enquiries/${a.enquiryId}`}
            className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-[0.76rem] font-semibold whitespace-nowrap text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset hover:bg-ws-sunk"
          >
            {t('Anfrage öffnen', 'Open enquiry')}
          </Link>
        ) : (
          <>
            {canEdit ? (
              <span className="transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                <FormDialog trigger={t('Ändern', 'Edit')} triggerVariant="ghost" size="sm" width="lg" icon={Icon.clock} tint="green" title={fullName(a)}>
                  <AppointmentForm appointment={a} day={a.date} back={back} colleagues={colleagues} me={me} canDelete={canDelete} />
                </FormDialog>
              </span>
            ) : null}
            {canEdit ? (
              <ChoiceMenu
                action={setAppointmentStatusAction}
                fields={{ appointmentId: a.id }}
                name="status"
                label={t('Stand', 'Status')}
                align="end"
                triggerClassName="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                trigger={<StatusChip status={a.status} lang={lang} />}
                choices={APPOINTMENT_STATUSES.map((s) => ({
                  value: s,
                  label: pick(lang, STATUS_LABELS[s]),
                  current: s === a.status,
                  icon: <span aria-hidden="true" className={cn('size-2.5 rounded-full', STATUS_DOTS[s])} />,
                }))}
              />
            ) : (
              <StatusChip status={a.status} lang={lang} />
            )}
          </>
        )}
      </span>
    </li>
  );
}

function StatusChip({ status, lang }: { status: AppointmentStatus; lang: WsLang }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset', STATUS_CHIPS[status])}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', STATUS_DOTS[status])} />
      {pick(lang, STATUS_LABELS[status])}
    </span>
  );
}

/** One appointment written in or changed: what, whose, when, with whom; and gone, at the foot. */
async function AppointmentForm({
  appointment: a,
  day,
  back,
  colleagues,
  me,
  canDelete,
}: {
  appointment?: Appointment;
  day: string;
  back: string;
  colleagues: Colleague[];
  me: string;
  canDelete: boolean;
}) {
  const { t, lang } = await getI18n();
  const key = a?.id ?? 'new';
  return (
    <div className="space-y-4">
      <form action={a ? updateAppointmentAction : createAppointmentAction} className="space-y-4">
        <input type="hidden" name="back" value={back} />
        {a ? <input type="hidden" name="appointmentId" value={a.id} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Art', 'Kind')} htmlFor={`ap-kind-${key}`}>
            <Select id={`ap-kind-${key}`} name="kind" required defaultValue={a?.kind ?? 'placement'}>
              {APPOINTMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {pick(lang, KIND_LABELS[k])}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Für wen', 'Whose')} htmlFor={`ap-owner-${key}`}>
            <Select id={`ap-owner-${key}`} name="assignedTo" defaultValue={a ? (a.assignee?.id ?? '') : me}>
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id === me ? t(`${c.name} (du)`, `${c.name} (you)`) : c.name}
                </option>
              ))}
              <option value="">{t('Team (niemand bestimmtes)', 'Team (nobody in particular)')}</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
          <Field label={t('Tag', 'Day')} htmlFor={`ap-date-${key}`}>
            <DateFormField id={`ap-date-${key}`} name="date" defaultValue={a?.date ?? day} required />
          </Field>
          <Field label={t('Uhrzeit', 'Time')} htmlFor={`ap-time-${key}`}>
            <Input id={`ap-time-${key}`} name="time" type="time" step={300} required defaultValue={a?.time ?? ''} />
          </Field>
          <Field label={t('Dauer', 'Length')} htmlFor={`ap-minutes-${key}`}>
            <Select id={`ap-minutes-${key}`} name="minutes" defaultValue={String(a?.minutes ?? 30)}>
              {APPOINTMENT_LENGTHS.map((m) => (
                <option key={m} value={m}>
                  {t(`${m} Minuten`, `${m} minutes`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Mit wem: Vorname', 'With: first name')} htmlFor={`ap-first-${key}`}>
            <Input id={`ap-first-${key}`} name="firstName" required maxLength={100} autoComplete="off" defaultValue={a?.firstName ?? ''} />
          </Field>
          <Field label={t('Nachname', 'Last name')} htmlFor={`ap-last-${key}`}>
            <Input id={`ap-last-${key}`} name="lastName" maxLength={100} autoComplete="off" defaultValue={a?.lastName ?? ''} />
          </Field>
        </div>
        <OptionalSection requires={['firstName']} heading={t('Kontakt und Notiz', 'Contact and note')} alwaysOpen={Boolean(a)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('Telefon', 'Phone')} htmlFor={`ap-phone-${key}`}>
              <Input id={`ap-phone-${key}`} name="phone" type="tel" maxLength={40} autoComplete="off" defaultValue={a?.phone ?? ''} />
            </Field>
            <Field label={t('E-Mail', 'Email')} htmlFor={`ap-email-${key}`}>
              <Input id={`ap-email-${key}`} name="email" type="email" maxLength={254} autoComplete="off" defaultValue={a?.email ?? ''} />
            </Field>
          </div>
          <Field label={t('Notiz', 'Note')} htmlFor={`ap-note-${key}`}>
            <Textarea id={`ap-note-${key}`} name="note" rows={2} maxLength={1000} defaultValue={a?.note ?? ''} />
          </Field>
        </OptionalSection>
        <DialogFooter>
          <Button type="submit">{a ? t('Speichern', 'Save') : t('Eintragen', 'Add')}</Button>
        </DialogFooter>
      </form>
      {a && canDelete ? (
        <form action={deleteAppointmentAction} className="flex justify-start">
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="appointmentId" value={a.id} />
          <ConfirmSubmit
            variant="ghost"
            title={t('Termin löschen?', 'Delete the appointment?')}
            description={t('Er verschwindet aus dem Tagesplan und aus „Meine Termine".', 'It disappears from the day plan and from “My appointments”.')}
            confirmLabel={t('Löschen', 'Delete')}
          >
            {t('Termin löschen', 'Delete appointment')}
          </ConfirmSubmit>
        </form>
      ) : null}
    </div>
  );
}
