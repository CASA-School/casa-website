'use client';

import { useState } from 'react';

import { DateField } from '@/components/admin/date-picker';
import { useWsLang } from '@/components/admin/lang';
import { Button, Field, Input, Select } from '@/components/admin/ui';
import { DialogFooter } from '@/components/admin/dialogs';

type ExamDefaults = { id: string; name: string; startTime: string; endTime: string; capacity: number };

/** The day before the same day a month earlier: how CASA's deadlines fall (13.11. → 12.10.). */
function deadlineFor(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 2, d - 1));
  return date.toISOString().slice(0, 10);
}

/**
 * A sitting, new or edited (0038): the exam, the day and hours, telc's deadline, the places, and
 * whether it is on the website's registration form. A new sitting starts from its exam's last one —
 * its hours and places — and the deadline follows the day until it is changed by hand.
 */
export function SittingForm({
  action,
  exams,
  sittingId,
  initial,
  examLocked = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  exams: readonly ExamDefaults[];
  sittingId?: string;
  initial?: { examTypeId: string; day: string; startTime: string; endTime: string; deadline: string | null; capacity: number; published: boolean };
  /** With bookings, the exam stays the same. */
  examLocked?: boolean;
}) {
  const { t } = useWsLang();
  const first = exams[0];
  const [examTypeId, setExamTypeId] = useState(initial?.examTypeId ?? first?.id ?? '');
  const [day, setDay] = useState<string | null>(initial?.day ?? null);
  const [deadline, setDeadline] = useState<string | null>(initial?.deadline ?? null);
  const [deadlineTouched, setDeadlineTouched] = useState(Boolean(initial));
  const [startTime, setStartTime] = useState(initial?.startTime ?? first?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? first?.endTime ?? '17:00');
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? first?.capacity ?? 20));

  const chooseExam = (id: string) => {
    setExamTypeId(id);
    // A new sitting takes the hours and places of the exam's last one.
    const defaults = exams.find((e) => e.id === id);
    if (!initial && defaults) {
      setStartTime(defaults.startTime);
      setEndTime(defaults.endTime);
      setCapacity(String(defaults.capacity));
    }
  };
  const chooseDay = (value: string | null) => {
    setDay(value);
    if (value && !deadlineTouched) setDeadline(deadlineFor(value));
  };

  return (
    <form action={action} className="space-y-3">
      {sittingId ? <input type="hidden" name="sittingId" value={sittingId} /> : null}
      <input type="hidden" name="day" value={day ?? ''} />
      <input type="hidden" name="deadline" value={deadline ?? ''} />
      <Field label={t('Prüfung', 'Exam')} htmlFor="sitting-exam">
        <Select id="sitting-exam" name="examTypeId" value={examTypeId} onChange={(e) => chooseExam(e.target.value)} disabled={examLocked}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        {/* A disabled select is not sent: the exam goes along as it is. */}
        {examLocked ? <input type="hidden" name="examTypeId" value={examTypeId} /> : null}
      </Field>
      <Field label={t('Prüfungstag', 'Exam day')} htmlFor="sitting-day">
        <DateField id="sitting-day" value={day} onChange={chooseDay} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Beginn', 'Start')} htmlFor="sitting-start">
          <Input id="sitting-start" name="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </Field>
        <Field label={t('Ende', 'End')} htmlFor="sitting-end">
          <Input id="sitting-end" name="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Anmeldeschluss', 'Entries close')} htmlFor="sitting-deadline">
          <DateField
            id="sitting-deadline"
            value={deadline}
            max={day}
            onChange={(value) => {
              setDeadline(value);
              setDeadlineTouched(true);
            }}
          />
        </Field>
        <Field label={t('Plätze', 'Places')} htmlFor="sitting-places">
          <Input id="sitting-places" name="capacity" type="number" min={1} max={500} required value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 pt-1 text-sm">
        <input type="checkbox" name="published" defaultChecked={initial ? initial.published : true} className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]" />
        {t('Auf der Website zur Anmeldung anbieten', 'Offer it for registration on the website')}
      </label>
      <DialogFooter>
        <Button type="submit" disabled={!day || !examTypeId}>
          {sittingId ? t('Speichern', 'Save') : t('Termin anlegen', 'Create sitting')}
        </Button>
      </DialogFooter>
    </form>
  );
}
