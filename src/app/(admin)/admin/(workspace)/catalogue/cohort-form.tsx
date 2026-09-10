import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { CourseTypeSummary } from '@/lib/admin/catalogue';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import type { Room } from '@/lib/admin/rooms';
import { createCohortAction } from '../settings/rooms/actions';
import { OptionalSection } from '@/components/admin/optional-section';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Schedule a cohort. Course, dates and capacity first; level, session, days,
 * time, room and title under "More" — the Course screen's fields, in two steps.
 */
export function CohortForm({
  courseTypes,
  rooms,
  levels,
}: {
  courseTypes: CourseTypeSummary[];
  rooms: Room[];
  levels: string[];
}) {
  return (
    <form action={createCohortAction} className="space-y-3">
      <Field label="Course" htmlFor="cohort-type">
        <Select id="cohort-type" name="courseTypeId" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {courseTypes
            .filter((t) => t.isActive)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Start" htmlFor="cohort-start">
          <Input id="cohort-start" name="startDate" type="date" required />
        </Field>
        <Field label="End" htmlFor="cohort-end">
          <Input id="cohort-end" name="endDate" type="date" required />
        </Field>
        <Field label="Seats" htmlFor="cohort-capacity">
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

      <OptionalSection
        requires={['courseTypeId', 'startDate', 'endDate']}
        heading="Level, schedule and room"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Level" htmlFor="cohort-level">
            <Select id="cohort-level" name="levelCode" defaultValue="">
              <option value="">—</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Session" htmlFor="cohort-session">
            <Select id="cohort-session" name="session" defaultValue="">
              <option value="">—</option>
              {(Object.keys(SESSION_LABELS) as (keyof typeof SESSION_LABELS)[]).map((s) => (
                <option key={s} value={s}>
                  {SESSION_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--casa-ink)]">Days</p>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="days"
                  value={d}
                  defaultChecked={d !== 'Sat' && d !== 'Sun'}
                  className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time" htmlFor="cohort-time">
            <Input id="cohort-time" name="time" placeholder="09:00-12:30" maxLength={40} />
          </Field>
          <Field label="Room" htmlFor="cohort-room">
            <Select id="cohort-room" name="roomId" defaultValue="">
              <option value="">Not yet</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nickname ? `${r.name} · ${r.nickname}` : r.name}
                  {r.capacity !== null ? ` (${r.capacity})` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Title" hint="optional" htmlFor="cohort-title">
          <Input id="cohort-title" name="title" maxLength={120} />
        </Field>
      </OptionalSection>

      <div className="flex justify-end pt-1">
        <Button type="submit">Schedule cohort</Button>
      </div>
    </form>
  );
}
