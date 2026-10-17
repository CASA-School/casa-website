import { assignExaminerAction } from './actions';
import { Button, Field, Select } from '@/components/admin/ui';
import { EXAM_PARTS, EXAMINER_PART_LABELS } from '@/lib/admin/exam-parts';
import type { ExaminerChoice } from '@/lib/admin/examiners';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { DialogFooter } from '@/components/admin/dialogs';

/** Puts a colleague on a sitting (0039): who, and what they do. The licensed for that day come first. */
export async function ExaminerForm({ sittingId, choices }: { sittingId: string; choices: ExaminerChoice[] }) {
  const { t, lang } = await getI18n();
  const licensed = choices.filter((c) => c.licensed);
  const others = choices.filter((c) => !c.licensed);
  return (
    <form action={assignExaminerAction} className="space-y-3">
      <input type="hidden" name="sittingId" value={sittingId} />
      <Field label={t('Person', 'Person')} htmlFor="examiner-staff">
        <Select id="examiner-staff" name="staffId" required defaultValue="">
          <option value="" disabled>
            {t('Bitte wählen', 'Choose')}
          </option>
          {licensed.length ? (
            <optgroup label={t('Mit Lizenz für diese Prüfung', 'Licensed for this exam')}>
              {licensed.map((c) => (
                <option key={c.staffId} value={c.staffId}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {others.length ? (
            <optgroup label={t('Ohne Lizenz: nur Aufsicht', 'No licence: supervision only')}>
              {others.map((c) => (
                <option key={c.staffId} value={c.staffId}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
      </Field>
      <Field label={t('Aufgabe', 'Task')} htmlFor="examiner-part">
        <Select id="examiner-part" name="part" defaultValue="full">
          {EXAM_PARTS.map((p) => (
            <option key={p} value={p}>
              {pick(lang, EXAMINER_PART_LABELS[p])}
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
