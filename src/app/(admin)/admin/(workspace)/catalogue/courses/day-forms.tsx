import { changeDayAction, saveWeekPlanAction } from './actions';
import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import type { CourseDay, DayChoices, WeekPlan } from '@/lib/admin/course-days';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A lesson day and a weekly plan, in dialogs (0045). Each choice of teacher says who is away or teaching
 * elsewhere at that time, each room what holds it then — the board's rule, on one day.
 */

const WEEKDAYS = [
  { n: 1, de: 'Montag', en: 'Monday' },
  { n: 2, de: 'Dienstag', en: 'Tuesday' },
  { n: 3, de: 'Mittwoch', en: 'Wednesday' },
  { n: 4, de: 'Donnerstag', en: 'Thursday' },
  { n: 5, de: 'Freitag', en: 'Friday' },
  { n: 6, de: 'Samstag', en: 'Saturday' },
];

export async function DayForm({
  courseId,
  day,
  choices,
  mayTeach,
  mayPlan,
}: {
  courseId: string;
  day: CourseDay;
  choices: DayChoices;
  mayTeach: boolean;
  mayPlan: boolean;
}) {
  const { t } = await getI18n();
  const taken = choices.taken.get(day.id) ?? new Map<string, string>();
  const away = choices.away.get(day.id) ?? new Set<string>();
  const teacherLabel = (id: string, name: string) =>
    away.has(id) ? t(`${name} · abwesend`, `${name} · away`) : taken.has(id) ? t(`${name} · unterrichtet ${taken.get(id)}`, `${name} · teaches ${taken.get(id)}`) : name;
  const roomLabel = (id: string, name: string) => (taken.has(id) ? t(`${name} · belegt: ${taken.get(id)}`, `${name} · taken: ${taken.get(id)}`) : name);
  // Free first, then the taken: the one to pick is at the top.
  const teachers = [...choices.teachers].sort((a, b) => Number(away.has(a.id) || taken.has(a.id)) - Number(away.has(b.id) || taken.has(b.id)));
  const rooms = [...choices.rooms].sort((a, b) => Number(taken.has(a.id)) - Number(taken.has(b.id)));
  return (
    <form action={changeDayAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="dayId" value={day.id} />
      <input type="hidden" name="groupIndex" value={day.groupIndex} />
      {mayTeach ? (
        <>
          <Field label={t('Lehrkraft', 'Teacher')} htmlFor={`day-teacher-${day.id}`}>
            <Select id={`day-teacher-${day.id}`} name="teacherId" defaultValue={day.teacherId ?? ''}>
              <option value="">{t('Noch offen', 'Not yet')}</option>
              {teachers.map((p) => (
                <option key={p.id} value={p.id}>
                  {teacherLabel(p.id, p.name)}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="merged" defaultChecked={day.merged} className="size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]" />
            {t('Mit einer anderen Gruppe zusammengelegt', 'Merged with another group')}
          </label>
        </>
      ) : null}
      {mayPlan ? (
        <>
          <Field label={t('Raum', 'Room')} htmlFor={`day-room-${day.id}`}>
            <Select id={`day-room-${day.id}`} name="roomId" defaultValue={day.roomId ?? ''}>
              <option value="">{t('Noch offen', 'Not yet')}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {roomLabel(r.id, r.name)}
                </option>
              ))}
            </Select>
          </Field>
          <input type="hidden" name="shownFrom" value={day.startsAt ?? ''} />
          <input type="hidden" name="shownTo" value={day.endsAt ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Beginn', 'Start')} htmlFor={`day-from-${day.id}`}>
              <Input id={`day-from-${day.id}`} name="startsAt" type="time" defaultValue={day.startsAt ?? ''} />
            </Field>
            <Field label={t('Ende', 'End')} htmlFor={`day-to-${day.id}`}>
              <Input id={`day-to-${day.id}`} name="endsAt" type="time" defaultValue={day.endsAt ?? ''} />
            </Field>
          </div>
          {/* The reason shows once the day is called off. */}
          <div className="group space-y-3">
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="cancelled" defaultChecked={day.cancelled} className="size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]" />
              {t('Fällt aus', 'Called off')}
            </label>
            <div className="hidden group-has-checked:block">
              <Field label={t('Grund', 'Reason')} htmlFor={`day-reason-${day.id}`}>
                <Input id={`day-reason-${day.id}`} name="cancelReason" maxLength={200} defaultValue={day.cancelReason ?? ''} />
              </Field>
            </div>
          </div>
          <Field label={t('Notiz', 'Note')} htmlFor={`day-note-${day.id}`}>
            <Textarea id={`day-note-${day.id}`} name="note" rows={2} maxLength={500} defaultValue={day.note ?? ''} />
          </Field>
        </>
      ) : null}
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Speichern', 'Save')}</Button>
      </div>
    </form>
  );
}

export async function WeekPlanForm({
  courseId,
  plan,
  teachers,
  rooms,
  mayTeach,
}: {
  courseId: string;
  plan: WeekPlan;
  teachers: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  mayTeach: boolean;
}) {
  const { t, lang } = await getI18n();
  const row = (n: number) => plan.rows.find((r) => r.weekday === n);
  return (
    <form action={saveWeekPlanAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="groupIndex" value={plan.groupIndex} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-[0.86rem]">
          <thead>
            <tr className="border-b border-ws-line text-xs text-[var(--casa-muted)]">
              <th className="py-2 pr-3 font-semibold">{t('Tag', 'Day')}</th>
              <th className="px-2 py-2 font-semibold">{t('Beginn', 'Start')}</th>
              <th className="px-2 py-2 font-semibold">{t('Ende', 'End')}</th>
              <th className="px-2 py-2 font-semibold">{t('UE', 'Lessons')}</th>
              <th className="px-2 py-2 font-semibold">{t('Lehrkraft', 'Teacher')}</th>
              <th className="py-2 pl-2 font-semibold">{t('Raum', 'Room')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ws-line-soft">
            {WEEKDAYS.map((d) => {
              const r = row(d.n);
              return (
                <tr key={d.n}>
                  <td className="py-2 pr-3">
                    <label className="flex items-center gap-2 font-semibold">
                      <input type="checkbox" name={`on-${d.n}`} defaultChecked={Boolean(r)} className="size-4 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]" />
                      {lang === 'de' ? d.de : d.en}
                    </label>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input name={`from-${d.n}`} type="time" defaultValue={r?.startsAt ?? plan.rows[0]?.startsAt ?? ''} aria-label={t(`${d.de}: Beginn`, `${d.en}: start`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input name={`to-${d.n}`} type="time" defaultValue={r?.endsAt ?? plan.rows[0]?.endsAt ?? ''} aria-label={t(`${d.de}: Ende`, `${d.en}: end`)} />
                  </td>
                  <td className="w-20 px-2 py-1.5">
                    <Input name={`lessons-${d.n}`} inputMode="decimal" defaultValue={r?.lessons ?? plan.rows[0]?.lessons ?? ''} aria-label={t(`${d.de}: Unterrichtseinheiten`, `${d.en}: lessons`)} />
                  </td>
                  <td className="px-2 py-1.5">
                    {mayTeach ? (
                      <Select name={`teacher-${d.n}`} defaultValue={r?.teacherId ?? ''} aria-label={t(`${d.de}: Lehrkraft`, `${d.en}: teacher`)}>
                        <option value="">{t('Noch offen', 'Not yet')}</option>
                        {teachers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <>
                        <input type="hidden" name={`keepTeacher-${d.n}`} value={r?.teacherId ?? ''} />
                        <span className="text-[var(--casa-muted)]">{teachers.find((p) => p.id === r?.teacherId)?.name ?? '—'}</span>
                      </>
                    )}
                  </td>
                  <td className="py-1.5 pl-2">
                    <Select name={`room-${d.n}`} defaultValue={r?.roomId ?? ''} aria-label={t(`${d.de}: Raum`, `${d.en}: room`)}>
                      <option value="">{t('Noch offen', 'Not yet')}</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit">{t('Wochenplan speichern', 'Save weekly plan')}</Button>
      </div>
    </form>
  );
}
