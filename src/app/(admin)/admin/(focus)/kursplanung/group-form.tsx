import { Button, Field, Input, Select } from '@/components/admin/ui';
import { SHIFT_INFO, type CourseGroup, type Teacher } from '@/lib/admin/kursplanung/types';

import { saveGroupAction } from './actions';

/** One course group: its pair, its registrations, its FileMaker id. */
export function GroupForm({ group, teachers, month, returnTo }: { group: CourseGroup; teachers: readonly Teacher[]; month: string; returnTo: string }) {
  const id = `g-${group.id.slice(0, 8)}`;
  const halves = SHIFT_INFO[group.shift].halves;
  const own = teachers.filter((t) => t.isActive && t.shifts.includes(group.shift));
  const other = teachers.filter((t) => t.isActive && !t.shifts.includes(group.shift));
  const options = (
    <>
      <option value="">—</option>
      <optgroup label={SHIFT_INFO[group.shift].label}>
        {own.map((t) => (
          <option key={t.id} value={t.id}>{t.shortName}{t.levels.includes(group.level) ? '' : ` · ${group.level}?`}</option>
        ))}
      </optgroup>
      <optgroup label="Andere Schicht (Vertretung)">
        {other.map((t) => (
          <option key={t.id} value={t.id}>{t.shortName}</option>
        ))}
      </optgroup>
    </>
  );
  return (
    <form action={saveGroupAction} className="space-y-4">
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={halves[0]} htmlFor={`${id}-first`}>
          <Select id={`${id}-first`} name="teacherFirst" defaultValue={group.teacherFirst ?? ''}>{options}</Select>
        </Field>
        <Field label={halves[1]} htmlFor={`${id}-second`}>
          <Select id={`${id}-second`} name="teacherSecond" defaultValue={group.teacherSecond ?? ''}>{options}</Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Anmeldungen" htmlFor={`${id}-reg`}>
          <Input id={`${id}-reg`} name="registrations" type="number" min={0} max={999} defaultValue={group.registrations} />
        </Field>
        <Field label="FileMaker Kurs-ID" htmlFor={`${id}-fm`}>
          <Input id={`${id}-fm`} name="filemakerCourseId" defaultValue={group.filemakerCourseId ?? ''} maxLength={40} />
        </Field>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
}
