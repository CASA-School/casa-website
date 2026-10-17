import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { CourseTypeSummary } from '@/lib/admin/catalogue';
import { BOOKED_INTO_OTHER_COURSES, SESSION_LABELS } from '@/lib/admin/catalogue';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import type { Room } from '@/lib/admin/rooms';
import { createCohortAction } from '../settings/rooms/actions';
import { OptionalSection } from '@/components/admin/optional-section';
import { DateFormField } from '@/components/admin/date-picker';

/** The value each day posts, as stored in the schedule, and its label in German. */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAYS_DE: Record<(typeof DAYS)[number], string> = {
  Mon: 'Mo',
  Tue: 'Di',
  Wed: 'Mi',
  Thu: 'Do',
  Fri: 'Fr',
  Sat: 'Sa',
  Sun: 'So',
};

/**
 * Schedule a cohort. Course, dates and capacity first; level, session, days,
 * time, room and title appear once the course and both dates are in — the
 * Course screen's fields, in two steps. The days are checkboxes drawn as
 * toggles, so a glance shows the week and the form still posts `days` per day.
 */
export async function CohortForm({
  courseTypes,
  rooms,
  levels,
}: {
  courseTypes: CourseTypeSummary[];
  rooms: Room[];
  levels: string[];
}) {
  const { t, lang } = await getI18n();
  return (
    <form action={createCohortAction} className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <Field label={t('Kurs', 'Course')} htmlFor="cohort-type">
          <Select id="cohort-type" name="courseTypeId" required defaultValue="">
            <option value="" disabled>
              {t('Auswählen', 'Choose')}
            </option>
            {/* Every kind with courses of its own, the website's and the workspace's (0042); not Bildungszeit. */}
            {courseTypes
              .filter((type) => !BOOKED_INTO_OTHER_COURSES.includes(type.slug))
              .map((type) => (
                <option key={type.id} value={type.id}>
                  {lang === 'de' ? type.nameDe : type.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label={t('Plätze', 'Seats')} htmlFor="cohort-capacity">
          <Input
            id="cohort-capacity"
            name="capacity"
            type="number"
            min={0}
            max={500}
            defaultValue={12}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Beginn', 'Start')} htmlFor="cohort-start">
          <DateFormField id="cohort-start" name="startDate" required />
        </Field>
        <Field label={t('Ende', 'End')} htmlFor="cohort-end">
          <DateFormField id="cohort-end" name="endDate" required />
        </Field>
      </div>

      <OptionalSection
        requires={['courseTypeId', 'startDate', 'endDate']}
        heading={t('Niveau, Zeiten und Raum', 'Level, schedule and room')}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Niveau', 'Level')} htmlFor="cohort-level">
            <Select id="cohort-level" name="levelCode" defaultValue="">
              <option value="">—</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Tageszeit', 'Session')} htmlFor="cohort-session">
            <Select id="cohort-session" name="session" defaultValue="">
              <option value="">—</option>
              {(Object.keys(SESSION_LABELS) as (keyof typeof SESSION_LABELS)[]).map((s) => (
                <option key={s} value={s}>
                  {pick(lang, SESSION_LABELS[s])}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-xs font-bold text-[var(--casa-muted)]">{t('Tage', 'Days')}</legend>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <label
                key={d}
                className="inline-flex h-9 min-w-12 cursor-pointer items-center justify-center rounded-lg border border-ws-line bg-white px-3 text-sm font-semibold transition-colors hover:border-ws-line-firm has-[:checked]:border-[var(--casa-ink-deep)] has-[:checked]:bg-[var(--casa-ink-deep)] has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/30"
              >
                <input
                  type="checkbox"
                  name="days"
                  value={d}
                  defaultChecked={d !== 'Sat' && d !== 'Sun'}
                  className="sr-only"
                />
                {t(DAYS_DE[d], d)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Uhrzeit', 'Time')} htmlFor="cohort-time">
            <Input id="cohort-time" name="time" placeholder="09:00-12:30" maxLength={40} />
          </Field>
          <Field label={t('Raum', 'Room')} htmlFor="cohort-room">
            <Select id="cohort-room" name="roomId" defaultValue="">
              <option value="">{t('Noch nicht', 'Not yet')}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nickname ? `${r.name} · ${r.nickname}` : r.name}
                  {r.capacity !== null ? ` (${r.capacity})` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('Titel', 'Title')} hint={t('optional', 'optional')} htmlFor="cohort-title">
          <Input id="cohort-title" name="title" maxLength={120} />
        </Field>
      </OptionalSection>

      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Termin planen', 'Schedule cohort')}</Button>
      </div>
    </form>
  );
}
