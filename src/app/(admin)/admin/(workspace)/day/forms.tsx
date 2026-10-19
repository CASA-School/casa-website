import { deleteTaskAction, reportAbsenceAction, updateTaskAction } from './actions';
import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, DialogFooter } from '@/components/admin/dialogs';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { DayTask } from '@/lib/admin/day-plan';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { ABSENCE_LABELS, ABSENCE_REASONS } from '@/lib/admin/kursplanung/types';

type Colleague = { id: string; name: string };

/** A task changed in its dialog: the text, the day, the time, who it is for; and gone, at the foot. */
export async function EditTaskForm({ task, day, colleagues, canDelete }: { task: DayTask; day: string; colleagues: readonly Colleague[]; canDelete: boolean }) {
  const { t } = await getI18n();
  return (
    <div className="space-y-4">
      <form action={updateTaskAction} className="space-y-4">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="taskId" value={task.id} />
        <Field label={t('Aufgabe', 'Task')} htmlFor={`task-body-${task.id}`}>
          <Textarea id={`task-body-${task.id}`} name="body" rows={3} required maxLength={2000} defaultValue={task.body} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('Tag', 'Day')} htmlFor={`task-date-${task.id}`}>
            <DateFormField id={`task-date-${task.id}`} name="date" defaultValue={task.date} required />
          </Field>
          <Field label={t('Von', 'From')} htmlFor={`task-from-${task.id}`}>
            <Input id={`task-from-${task.id}`} name="startsAt" type="time" step={300} defaultValue={task.startsAt ?? ''} />
          </Field>
          <Field label={t('Bis', 'Until')} htmlFor={`task-to-${task.id}`}>
            <Input id={`task-to-${task.id}`} name="endsAt" type="time" step={300} defaultValue={task.endsAt ?? ''} />
          </Field>
        </div>
        <Field label={t('Für', 'For')} htmlFor={`task-for-${task.id}`}>
          <Select id={`task-for-${task.id}`} name="assigneeId" defaultValue={task.assigneeId ?? ''}>
            <option value="">{t('Für alle', 'For everyone')}</option>
            {colleagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <DialogFooter>
          <Button type="submit">{t('Speichern', 'Save')}</Button>
        </DialogFooter>
      </form>
      {canDelete ? (
        <form action={deleteTaskAction} className="flex justify-start">
          <input type="hidden" name="day" value={day} />
          <input type="hidden" name="taskId" value={task.id} />
          <ConfirmSubmit
            variant="ghost"
            title={t('Aufgabe löschen?', 'Delete the task?')}
            description={t('Sie verschwindet für alle aus dem Tagesplan.', 'It disappears from everyone’s day plan.')}
            confirmLabel={t('Löschen', 'Delete')}
          >
            {t('Aufgabe löschen', 'Delete task')}
          </ConfirmSubmit>
        </form>
      ) : null}
    </div>
  );
}

/** Someone ill or on holiday, from the day: who, from when to when, why. Weekdays only, as on their page. */
export async function ReportAbsenceForm({ day, colleagues }: { day: string; colleagues: readonly Colleague[] }) {
  const { t, lang } = await getI18n();
  return (
    <form action={reportAbsenceAction} className="space-y-4">
      <input type="hidden" name="day" value={day} />
      <Field label={t('Wer', 'Who')} htmlFor="away-who">
        <Select id="away-who" name="staffId" required defaultValue="">
          <option value="" disabled>
            {t('Bitte wählen', 'Choose')}
          </option>
          {colleagues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Von', 'From')} htmlFor="away-from">
          <DateFormField id="away-from" name="from" defaultValue={day} required />
        </Field>
        <Field label={t('Bis', 'Until')} htmlFor="away-to">
          <DateFormField id="away-to" name="to" />
        </Field>
      </div>
      <Field label={t('Grund', 'Reason')} htmlFor="away-reason">
        <Select id="away-reason" name="reason" defaultValue="Krank">
          {ABSENCE_REASONS.map((r) => (
            <option key={r} value={r}>
              {pick(lang, ABSENCE_LABELS[r])}
            </option>
          ))}
        </Select>
      </Field>
      <DialogFooter>
        <Button type="submit">{t('Eintragen', 'Add')}</Button>
      </DialogFooter>
    </form>
  );
}
