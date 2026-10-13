import { Popover } from '@/components/admin/popover';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import type { Shift, StaffAbsence } from '@/lib/admin/rota';
import { ABSENCE_LABELS, officeHoursOn, SHIFT_TIMES } from '@/lib/admin/rota-rules';
import { cn } from '@/lib/utils';

import { clearShiftAction, saveShiftAction } from './actions';

/**
 * One colleague on one day: the shift as a value ("08:00–15:30", its note
 * under it), "On leave" when they are away, or an empty cell. A click opens a
 * small panel to plan it — from, to, a note — or to clear it. A shift on a day
 * its colleague is away is red: they will not be there.
 */
export function ShiftCell({
  colleague,
  day,
  week,
  shift,
  absence,
  canEdit,
  showReason,
  align,
}: {
  colleague: { id: string; name: string };
  day: string;
  week: string;
  shift: Shift | null;
  absence: StaffAbsence | null;
  canEdit: boolean;
  /** An absence's reason is personal data: only for those who plan the rota. */
  showReason: boolean;
  align: 'left' | 'right';
}) {
  const away = absence ? (showReason ? ABSENCE_LABELS[absence.reason] : 'Away') : null;

  const value = (
    <span className="flex min-h-11 flex-col justify-center px-2 py-1.5 text-left">
      {shift ? (
        <>
          <span className={cn('text-[0.84rem] font-semibold whitespace-nowrap tabular-nums', absence ? 'text-[#b91c1c] line-through decoration-1' : 'text-[var(--casa-ink)]')}>
            {shift.startsAt}–{shift.endsAt}
          </span>
          {absence ? (
            <span className="text-xs font-semibold text-[#b91c1c]">{away}</span>
          ) : shift.note ? (
            <span className="truncate text-xs text-[var(--casa-muted)]">{shift.note}</span>
          ) : null}
        </>
      ) : away ? (
        <span className="text-[0.8rem] font-medium text-[var(--casa-text-subtle)]">{away}</span>
      ) : canEdit ? (
        // An empty cell; the way to plan it shows on hover or focus, and always without hover.
        <span className="text-xs text-[var(--casa-text-subtle)] opacity-0 transition-opacity group-focus-within/cell:opacity-100 group-hover/cell:opacity-100 [@media(hover:none)]:opacity-100">
          + Shift
        </span>
      ) : null}
    </span>
  );

  if (!canEdit) return value;

  const hours = officeHoursOn(day);
  const id = `${colleague.id}-${day}`;

  return (
    <div className="group/cell">
      <Popover label={`${colleague.name}, ${new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`} trigger={value} width={300} align={align}>
        <form action={saveShiftAction} className="space-y-3 p-2">
          <input type="hidden" name="week" value={week} />
          <input type="hidden" name="staffUserId" value={colleague.id} />
          <input type="hidden" name="onDate" value={day} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="From" htmlFor={`${id}-from`}>
              <Select id={`${id}-from`} name="startsAt" defaultValue={shift?.startsAt ?? hours?.from ?? '08:30'}>
                {SHIFT_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="To" htmlFor={`${id}-to`}>
              <Select id={`${id}-to`} name="endsAt" defaultValue={shift?.endsAt ?? hours?.to ?? '17:00'}>
                {SHIFT_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Note" htmlFor={`${id}-note`}>
            <Input id={`${id}-note`} name="note" maxLength={200} defaultValue={shift?.note ?? ''} placeholder="14:00–16:30 seminar" />
          </Field>
          <Button type="submit" size="sm" className="w-full">
            {shift ? 'Save' : 'Plan the shift'}
          </Button>
        </form>
        {shift ? (
          <form action={clearShiftAction} className="px-2 pb-2">
            <input type="hidden" name="week" value={week} />
            <input type="hidden" name="staffUserId" value={colleague.id} />
            <input type="hidden" name="onDate" value={day} />
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              Clear the shift
            </Button>
          </form>
        ) : null}
      </Popover>
    </div>
  );
}
