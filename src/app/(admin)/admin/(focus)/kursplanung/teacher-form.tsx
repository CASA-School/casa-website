import { OptionalSection } from '@/components/admin/optional-section';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import { ABSENCE_REASONS, LEVELS, SHIFT_INFO, SHIFTS, WEEKDAYS, type Absence, type Teacher } from '@/lib/admin/kursplanung/types';
import { monthLabel, weekdayOf, type PlanningWeek } from '@/lib/admin/kursplanung/weeks';

import { saveTeacherAction } from './actions';

/**
 * The teacher dialog: the rules that shape a piece, and the month's absences.
 *
 * Native checkboxes dressed as chips — the form posts without JavaScript, and
 * the chips are what the planners saw on the prototype. Absences are one row
 * per planning week: tick the days, pick the reason. Rows FileMaker wrote are
 * shown but stay the bridge's to change.
 */
function Chips({ name, options, checked, labels }: { name: string; options: readonly string[]; checked: readonly string[]; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="checkbox" name={name} value={o} defaultChecked={checked.includes(o)} className="peer sr-only" />
          <span className="inline-flex h-8 items-center rounded-lg border border-ws-line-firm bg-white px-3 text-xs font-semibold text-[var(--casa-text-subtle)] transition-colors peer-checked:border-[var(--casa-ink-deep)] peer-checked:bg-[var(--casa-ink-deep)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--casa-blue)]/30 hover:border-[var(--casa-blue)]/45">
            {labels?.[o] ?? o}
          </span>
        </label>
      ))}
    </div>
  );
}

export function TeacherForm({
  teacher,
  month,
  weeks,
  absences,
  returnTo,
}: {
  teacher: Teacher;
  month: string;
  weeks: readonly PlanningWeek[];
  absences: readonly Absence[];
  returnTo: string;
}) {
  const id = `t-${teacher.id.slice(0, 8)}`;
  const shiftLabels = { morning: SHIFT_INFO.morning.label, afternoon: SHIFT_INFO.afternoon.label };
  return (
    <form action={saveTeacherAction} className="space-y-4">
      <input type="hidden" name="teacherId" value={teacher.id} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name auf dem Brett" htmlFor={`${id}-short`}>
          <Input id={`${id}-short`} name="shortName" defaultValue={teacher.shortName} required maxLength={40} />
        </Field>
        <Field label="Vertrag" htmlFor={`${id}-contract`}>
          <Select id={`${id}-contract`} name="contract" defaultValue={teacher.contract}>
            <option value="employed">angestellt</option>
            <option value="freelance">Honorarkraft</option>
          </Select>
        </Field>
      </div>

      <Field label="Schicht" hint="darf auch in der anderen einspringen — dann gelb">
        <Chips name="shifts" options={SHIFTS} checked={teacher.shifts} labels={shiftLabels} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tage pro Woche" hint="Länge des Teils" htmlFor={`${id}-days`}>
          <Select id={`${id}-days`} name="daysPerWeek" defaultValue={String(teacher.daysPerWeek)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mögliche Wochentage">
          <Chips name="weekdays" options={WEEKDAYS} checked={teacher.weekdays} />
        </Field>
      </div>

      <Field label="Niveaus" hint="wo das Teil passt">
        <Chips name="levels" options={LEVELS} checked={teacher.levels} />
      </Field>

      <Field label="Hinweis" htmlFor={`${id}-note`}>
        <Input id={`${id}-note`} name="note" defaultValue={teacher.note ?? ''} maxLength={200} placeholder="z. B. ab Oktober freigestellt" />
      </Field>

      <OptionalSection requires={[]} heading={`Abwesenheiten ${monthLabel(month)}`} alwaysOpen>
        <div className="space-y-2">
          {weeks.map((w) => {
            const mine = absences.filter((a) => w.days.includes(a.onDate));
            const checked = mine.map((a) => weekdayOf(a.onDate)).filter((d): d is (typeof WEEKDAYS)[number] => d !== null);
            const reason = mine[0]?.reason ?? 'Urlaub';
            return (
              <div key={w.start} className="grid grid-cols-[6.5rem_1fr_9rem] items-center gap-3">
                <span className="text-sm font-semibold text-[var(--casa-ink)]">
                  KW {w.kw}
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">{w.label}</span>
                </span>
                <Chips name={`abs_${w.start}`} options={WEEKDAYS} checked={checked} />
                <Select name={`reason_${w.start}`} defaultValue={reason} aria-label={`Grund KW ${w.kw}`}>
                  {ABSENCE_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>
      </OptionalSection>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
}
