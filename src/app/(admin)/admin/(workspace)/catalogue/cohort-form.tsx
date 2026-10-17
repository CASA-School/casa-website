'use client';

import { useActionState, useState, type ReactNode } from 'react';

import { DateField } from '@/components/admin/date-picker';
import { DialogFooter } from '@/components/admin/dialogs';
import { useWsLang } from '@/components/admin/lang';
import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import { readTimeRange, roomChoice, SESSION_TIMES, SESSIONS, WEEKDAY_CODES, type Session } from '@/lib/admin/course-starts';
import type { T } from '@/lib/admin/i18n';
import { createCohortAction, type CohortFormState } from '../settings/rooms/actions';
import { updateStartAction } from './actions';

/**
 * A course start, planned („Termin planen") or edited („Bearbeiten" on its page). The kind, its dates
 * and the places per group first; level, time of day, days, hours, room, title and the website once
 * the kind and both dates are in. The hours follow the time of day until they are typed, and a typed
 * en dash or space is read on the server (`readStartForm`). Every field is held here, so a form the
 * server sends back with its reason keeps what was entered.
 */

export type StartTypeChoice = { id: string; slug: string; label: string };
export type StartRoomChoice = { id: string; name: string; nickname: string | null; capacity: number | null };

const DAYS_DE: Record<(typeof WEEKDAY_CODES)[number], string> = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' };
const sessionLabel = (s: Session, t: T) => (s === 'morning' ? t('Vormittag', 'Morning') : s === 'afternoon' ? t('Nachmittag', 'Afternoon') : t('Abend', 'Evening'));

type Schedule = {
  startDate: string | null;
  endDate: string | null;
  session: Session | '';
  days: string[];
  time: string;
  roomId: string;
  title: string;
  onWebsite: boolean;
};

/** The fields a start's schedule shares between planning and editing. */
function ScheduleFields({
  value,
  set,
  rooms,
  datesFixed = false,
  scheduleFixed = false,
  leading,
  levelField,
}: {
  value: Schedule;
  set: (patch: Partial<Schedule>) => void;
  rooms: readonly StartRoomChoice[];
  datesFixed?: boolean;
  scheduleFixed?: boolean;
  /** Fields before the dates: the kind and the places, when planning. */
  leading?: ReactNode;
  /** The level, when planning. */
  levelField?: ReactNode;
}) {
  const { t } = useWsLang();
  // The hours follow the time of day until they are typed.
  const [typed, setTyped] = useState(Boolean(value.time) && !Object.values(SESSION_TIMES).includes(value.time));
  const read = readTimeRange(value.time, value.session || null);
  const timeError = value.time.trim() && !read.ok ? (read.error === 'order' ? t('endet vor dem Beginn', 'ends before it begins') : t('bitte als 09:00-12:30', 'as 09:00-12:30')) : null;
  const ready = Boolean(value.startDate && value.endDate);
  const shown = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');

  return (
    <>
      {leading}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Beginn', 'Start')} htmlFor="cohort-start">
          {datesFixed ? (
            <Input id="cohort-start" value={shown(value.startDate)} disabled readOnly />
          ) : (
            <DateField id="cohort-start" value={value.startDate} onChange={(v) => set({ startDate: v, ...(v && value.endDate && value.endDate < v ? { endDate: null } : {}) })} />
          )}
        </Field>
        <Field label={t('Ende', 'End')} htmlFor="cohort-end">
          {datesFixed ? (
            <Input id="cohort-end" value={shown(value.endDate)} disabled readOnly />
          ) : (
            <DateField id="cohort-end" value={value.endDate} min={value.startDate} onChange={(v) => set({ endDate: v })} />
          )}
        </Field>
      </div>
      {/* The dates go as they are; a start whose dates are fixed shows them and sends them unchanged. */}
      <input type="hidden" name="startDate" value={value.startDate ?? ''} />
      <input type="hidden" name="endDate" value={value.endDate ?? ''} />

      <OptionalSection requires={['courseTypeId', 'startDate', 'endDate']} alwaysOpen={ready} heading={t('Niveau, Zeiten und Raum', 'Level, schedule and room')}>
        <div className="grid grid-cols-2 gap-3">
          {levelField}
          <Field label={t('Tageszeit', 'Time of day')} htmlFor="cohort-session" className={levelField ? undefined : 'col-span-2'}>
            <Select
              id="cohort-session"
              value={value.session}
              disabled={scheduleFixed}
              onChange={(e) => {
                const session = e.target.value as Session | '';
                set({ session, ...(session && !typed ? { time: SESSION_TIMES[session] } : {}) });
              }}
            >
              <option value="">—</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {sessionLabel(s, t)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <input type="hidden" name="session" value={value.session} />
        <fieldset disabled={scheduleFixed}>
          <legend className="mb-1.5 text-xs font-bold text-[var(--casa-muted)]">{t('Tage', 'Days')}</legend>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_CODES.map((d) => (
              <label
                key={d}
                className="inline-flex h-9 min-w-12 cursor-pointer items-center justify-center rounded-lg border border-ws-line bg-white px-3 text-sm font-semibold transition-colors hover:border-ws-line-firm has-[:checked]:border-[var(--casa-ink-deep)] has-[:checked]:bg-[var(--casa-ink-deep)] has-[:checked]:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/30"
              >
                <input
                  type="checkbox"
                  checked={value.days.includes(d)}
                  onChange={(e) => set({ days: e.target.checked ? [...value.days, d] : value.days.filter((x) => x !== d) })}
                  className="sr-only"
                />
                {t(DAYS_DE[d], d)}
              </label>
            ))}
          </div>
        </fieldset>
        {value.days.map((d) => (
          <input key={d} type="hidden" name="days" value={d} />
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Uhrzeit', 'Hours')} htmlFor="cohort-time">
            <Input
              id="cohort-time"
              value={value.time}
              disabled={scheduleFixed}
              placeholder={t('z. B. 09:00–12:30', 'e.g. 09:00–12:30')}
              maxLength={40}
              aria-invalid={timeError ? true : undefined}
              onChange={(e) => {
                setTyped(e.target.value.trim() !== '');
                set({ time: e.target.value });
              }}
              // Read back as it will be stored: „9 - 12.30" becomes 09:00-12:30.
              onBlur={() => {
                if (value.time.trim() && read.ok) set({ time: read.time });
              }}
            />
            {timeError ? <span className="mt-1 block text-xs font-semibold text-[var(--casa-danger-text)]">{timeError}</span> : null}
          </Field>
          <Field label={t('Raum', 'Room')} htmlFor="cohort-room">
            <Select id="cohort-room" name="roomId" value={value.roomId} onChange={(e) => set({ roomId: e.target.value })}>
              <option value="">{t('Noch offen', 'Not yet')}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {roomChoice(r)}
                  {r.capacity !== null ? ` · ${t(`${r.capacity} Plätze`, `${r.capacity} seats`)}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <input type="hidden" name="time" value={value.time} />
        <Field label={t('Titel', 'Title')} hint={t('optional', 'optional')} htmlFor="cohort-title">
          <Input id="cohort-title" name="title" maxLength={120} value={value.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2.5 pt-1 text-sm">
          <input
            type="checkbox"
            name="onWebsite"
            checked={value.onWebsite}
            onChange={(e) => set({ onWebsite: e.target.checked })}
            className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
          />
          {t('Auf der Website anbieten', 'Offer it on the website')}
        </label>
      </OptionalSection>
    </>
  );
}

function FormError({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-3 py-2 text-sm text-[var(--casa-danger-text)]">
      {error}
    </p>
  ) : null;
}

/**
 * „Termin planen": a new start of a kind, with its courses as SchoolMan plans them — an intensive start
 * one per level (or the level chosen), an evening start its level, any other kind one named course —
 * each with the places per group given. Not on the website until ticked. Opens the new start.
 */
export function CohortForm({
  courseTypes,
  rooms,
  levels,
}: {
  courseTypes: readonly StartTypeChoice[];
  rooms: readonly StartRoomChoice[];
  levels: readonly string[];
}) {
  const { t } = useWsLang();
  const [state, formAction] = useActionState<CohortFormState, FormData>(createCohortAction, { error: null });
  const [typeId, setTypeId] = useState('');
  const [places, setPlaces] = useState('14');
  const [level, setLevel] = useState('');
  const [schedule, setSchedule] = useState<Schedule>({
    startDate: null,
    endDate: null,
    session: '',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    time: '',
    roomId: '',
    title: '',
    onWebsite: false,
  });
  const set = (patch: Partial<Schedule>) => setSchedule((s) => ({ ...s, ...patch }));
  const slug = courseTypes.find((c) => c.id === typeId)?.slug ?? '';
  // An evening start without a level makes no course of its own yet: its places are set on the course
  // a booking makes. Everywhere else they are each course's places per group.
  const placesApply = !(slug === 'evening-german' && !level);
  // A typed time that cannot be read holds the form; empty hours are the server's to fill or ask for.
  const timeOk = !schedule.time.trim() || readTimeRange(schedule.time, schedule.session || null).ok;

  return (
    <form action={formAction} className="space-y-3">
      <ScheduleFields
        value={schedule}
        set={set}
        rooms={rooms}
        leading={
          <div className={placesApply ? 'grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3' : ''}>
            <Field label={t('Kurs', 'Course')} htmlFor="cohort-type">
              <Select
                id="cohort-type"
                name="courseTypeId"
                required
                value={typeId}
                onChange={(e) => {
                  setTypeId(e.target.value);
                  // The evening terms run in the evening.
                  const next = courseTypes.find((c) => c.id === e.target.value)?.slug;
                  if (next === 'evening-german' && !schedule.session) set({ session: 'evening', ...(schedule.time ? {} : { time: SESSION_TIMES.evening }) });
                }}
              >
                <option value="" disabled>
                  {t('Auswählen', 'Choose')}
                </option>
                {courseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            {placesApply ? (
              <Field label={t('Plätze pro Gruppe', 'Places per group')} htmlFor="cohort-places">
                <Input id="cohort-places" name="placesPerGroup" type="number" min={1} max={40} required value={places} onChange={(e) => setPlaces(e.target.value)} />
              </Field>
            ) : null}
          </div>
        }
        levelField={
          <Field label={t('Niveau', 'Level')} htmlFor="cohort-level">
            <Select id="cohort-level" name="levelCode" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">{slug === 'intensive-german' ? t('Alle Niveaus', 'Every level') : '—'}</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        }
      />
      <FormError error={state.error} />
      <DialogFooter>
        <Button type="submit" disabled={!typeId || !schedule.startDate || !schedule.endDate || !timeOk || !schedule.days.length}>
          {t('Termin planen', 'Schedule the start')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type StartEditValues = {
  id: string;
  startDate: string;
  endDate: string;
  session: Session | null;
  days: string[];
  time: string;
  title: string | null;
  roomId: string | null;
  onWebsite: boolean;
  datesFixed: boolean;
  scheduleFixed: boolean;
};

/** „Bearbeiten" on a start's page: its dates (while nothing hangs on them), schedule, title, room and website. */
export function StartEditForm({ start, rooms }: { start: StartEditValues; rooms: readonly StartRoomChoice[] }) {
  const { t } = useWsLang();
  const [state, formAction] = useActionState<CohortFormState, FormData>(updateStartAction, { error: null });
  const [schedule, setSchedule] = useState<Schedule>({
    startDate: start.startDate,
    endDate: start.endDate,
    session: start.session ?? '',
    days: start.days,
    time: start.time,
    roomId: start.roomId ?? '',
    title: start.title ?? '',
    onWebsite: start.onWebsite,
  });
  const set = (patch: Partial<Schedule>) => setSchedule((s) => ({ ...s, ...patch }));
  // A typed time that cannot be read holds the form; empty hours are the server's to fill or ask for.
  const timeOk = !schedule.time.trim() || readTimeRange(schedule.time, schedule.session || null).ok;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="startId" value={start.id} />
      <ScheduleFields value={schedule} set={set} rooms={rooms} datesFixed={start.datesFixed} scheduleFixed={start.scheduleFixed} />
      <FormError error={state.error} />
      <DialogFooter>
        <Button type="submit" disabled={!schedule.startDate || !schedule.endDate || !timeOk || !schedule.days.length}>
          {t('Speichern', 'Save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
