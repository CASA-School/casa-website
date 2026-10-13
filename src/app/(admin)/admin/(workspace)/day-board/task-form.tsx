import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import { TASK_AREAS, type DayTask } from '@/lib/admin/day-board';
import { AREA_LABELS } from './areas';
import { createDayTaskAction, updateDayTaskAction } from './actions';
import { toDateInputValue } from '@/lib/dates';
import { OptionalSection } from '@/components/admin/optional-section';
import { DateFormField } from '@/components/admin/date-picker';

/**
 * One form for writing a task and for editing it, shown in a dialog.
 *
 * Progressive: a task needs a sentence and nothing else. The area, the day and
 * whose it is open under "Where it belongs" once the sentence is written,
 * because most tasks are written for today, for whoever picks them up.
 */
export function TaskForm({
  date,
  task,
  staff,
  from,
}: {
  date: string;
  task?: DayTask;
  staff: readonly { id: string; name: string }[];
  /** `week` when written in the control room, which it then returns to. */
  from?: 'week';
}) {
  const editing = Boolean(task);
  const onDate = task ? toDateInputValue(task.onDate) : date;

  return (
    <form action={editing ? updateDayTaskAction : createDayTaskAction} className="space-y-3">
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      {from ? <input type="hidden" name="from" value={from} /> : null}

      <Field label="What needs doing" htmlFor="task-title">
        <Input
          id="task-title"
          name="title"
          required
          maxLength={200}
          defaultValue={task?.title ?? ''}
          placeholder="Send the confirmation to Beatriz"
          autoFocus
        />
      </Field>

      <OptionalSection requires={['title']} heading="Where it belongs" alwaysOpen={editing}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Part of the work" htmlFor="task-area">
            <Select id="task-area" name="area" defaultValue={task?.area ?? 'other'}>
              {TASK_AREAS.map((area) => (
                <option key={area} value={area}>
                  {AREA_LABELS[area]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Day" htmlFor="task-date">
            <DateFormField id="task-date" name="onDate" defaultValue={onDate} required />
          </Field>
        </div>
        <Field label="Who is doing it" hint="anyone, if left open" htmlFor="task-assignee">
          <Select id="task-assignee" name="assignedTo" defaultValue={task?.assignedTo ?? ''}>
            <option value="">Anyone on the team</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Anything to add" htmlFor="task-detail">
          <Textarea id="task-detail" name="detail" rows={2} defaultValue={task?.detail ?? ''} />
        </Field>
      </OptionalSection>

      <div className="flex justify-end pt-1">
        <Button type="submit">{editing ? 'Save' : 'Add to the day'}</Button>
      </div>
    </form>
  );
}
