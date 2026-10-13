import { DateFormField } from '@/components/admin/date-picker';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { RotaColleague, StaffAbsence } from '@/lib/admin/rota';
import { ABSENCE_LABELS, ABSENCE_REASONS } from '@/lib/admin/rota-rules';

import { saveAbsenceAction } from './actions';

/** One form for recording an absence and for changing one, in a dialog. */
export function AbsenceForm({
  staff,
  week,
  absence,
  firstDay,
}: {
  staff: readonly RotaColleague[];
  week: string;
  absence?: StaffAbsence;
  /** The day a new absence starts on unless changed: the first day of the week on screen. */
  firstDay: string;
}) {
  const key = absence?.id ?? 'new';
  return (
    <form action={saveAbsenceAction} className="space-y-3">
      <input type="hidden" name="week" value={week} />
      {absence ? <input type="hidden" name="id" value={absence.id} /> : null}
      <Field label="Colleague" htmlFor={`absence-${key}-who`}>
        <Select id={`absence-${key}-who`} name="staffUserId" required defaultValue={absence?.staffUserId ?? ''}>
          <option value="" disabled>
            Choose
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor={`absence-${key}-from`}>
          <DateFormField id={`absence-${key}-from`} name="fromDate" required defaultValue={absence?.fromDate ?? firstDay} />
        </Field>
        <Field label="Until" htmlFor={`absence-${key}-to`}>
          <DateFormField id={`absence-${key}-to`} name="toDate" required defaultValue={absence?.toDate ?? firstDay} />
        </Field>
      </div>
      <Field label="Reason" htmlFor={`absence-${key}-reason`}>
        <Select id={`absence-${key}-reason`} name="reason" defaultValue={absence?.reason ?? 'leave'}>
          {ABSENCE_REASONS.map((r) => (
            <option key={r} value={r}>
              {ABSENCE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note" htmlFor={`absence-${key}-note`}>
        <Input id={`absence-${key}-note`} name="note" maxLength={200} defaultValue={absence?.note ?? ''} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">{absence ? 'Save' : 'Record the absence'}</Button>
      </div>
    </form>
  );
}
