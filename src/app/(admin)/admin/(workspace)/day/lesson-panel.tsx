'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { changeLessonAction } from './actions';
import { ConfirmSubmit } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Avatar } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, Select } from '@/components/admin/ui';
import type { DayLesson, LessonChoices } from '@/lib/admin/day-plan';
import { SESSION_LABELS } from '@/lib/admin/day-plan-labels';
import { pick, type T } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/** A course's own page; a parallel group has its own under it. */
export const courseHref = (l: Pick<DayLesson, 'courseId' | 'groupIndex'>) => `/admin/catalogue/courses/${l.courseId}${l.groupIndex > 1 ? `/${l.groupIndex}` : ''}`;

export const floorName = (floor: number | null, t: T) =>
  floor === null ? t('Ohne Stockwerk', 'No floor') : floor < 0 ? t('Keller', 'Basement') : floor === 0 ? t('Erdgeschoss', 'Ground floor') : t(`${floor}. Obergeschoss`, `Floor ${floor}`);

export const shortName = (name: string | null) => {
  if (!name) return '';
  const [first, ...rest] = name.split(' ');
  return rest.length ? `${first} ${rest.at(-1)![0]}.` : first;
};

/**
 * One lesson of the day at the side (2026-10-19): what, when, where, who teaches and who stands in, the
 * learners with their addresses; and what reception does with a class — its attendance sheet, an
 * email to all, its page. Shared by „Kurse" and „Raumplan".
 */
export type LessonEditing = { choices: LessonChoices; canTeacher: boolean; canRoom: boolean; lessons: DayLesson[]; back: string };

export function LessonPanel({ lesson, day, editing, onClose }: { lesson: DayLesson | null; day: string; editing?: LessonEditing; onClose: () => void }) {
  const { t, lang } = useWsLang();
  const l = lesson;
  const emails = l ? [...new Set(l.learners.map((p) => p.email).filter((e): e is string => Boolean(e)))] : [];
  const subject = l ? `${l.label} · ${new Date(`${day}T12:00:00Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}` : '';
  return (
    <SidePanel
      open={l !== null}
      onOpenChange={(open) => !open && onClose()}
      icon={Icon.catalogue}
      tint="blue"
      title={l ? `${l.label} · ${l.typeName}` : ''}
      subtitle={l ? [l.session ? pick(lang, SESSION_LABELS[l.session]) : null, l.startsAt && l.endsAt ? `${l.startsAt}–${l.endsAt}` : null, l.number ? `#${l.number}` : null].filter(Boolean).join(' · ') : undefined}
      footer={
        l ? (
          <span className="flex flex-wrap gap-2">
            <Link
              href={`/admin/day/attendance?course=${l.courseId}&group=${l.groupIndex}&from=${day}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--fm-navy)] px-3.5 text-[0.84rem] font-semibold text-white transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4"
            >
              {Icon.statement}
              {t('Anwesenheitsliste', 'Attendance sheet')}
            </Link>
            <Link
              href={`/admin/day/contacts?lesson=${l.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]"
            >
              {Icon.people}
              {t('Liste für die Lehrkraft', 'List for the teacher')}
            </Link>
            {emails.length ? (
              <a
                href={`mailto:?bcc=${emails.map(encodeURIComponent).join(',')}&subject=${encodeURIComponent(subject)}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]"
              >
                {Icon.mail}
                {t(`E-Mail an alle (${emails.length})`, `Email all (${emails.length})`)}
              </a>
            ) : null}
            <Link
              href={courseHref(l)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.84rem] font-semibold text-[var(--casa-accent-text)] transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
            >
              {t('Zum Kurs', 'Open the course')}
            </Link>
          </span>
        ) : null
      }
    >
      {l ? (
        <>
          {l.cancelled || l.teacherAway || l.merged ? (
            <div className="px-6 pt-4">
              <p
                className={cn(
                  'rounded-xl px-3.5 py-2.5 text-[0.84rem] font-semibold',
                  l.cancelled ? 'bg-ws-sunk text-[var(--casa-muted)]' : l.teacherAway ? 'bg-[#fdecec] text-[#9b1c1c]' : 'bg-[#eef3fb] text-[#1d3a6b]'
                )}
              >
                {l.cancelled
                  ? t('Dieser Unterricht fällt aus.', 'This lesson is cancelled.')
                  : l.teacherAway
                    ? t(`Die Lehrkraft fehlt (${l.teacherAway}) — noch keine Vertretung.`, `The teacher is away (${l.teacherAway}) — no cover yet.`)
                    : t('Mit einer anderen Gruppe zusammengelegt.', 'Merged with another group.')}
              </p>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5">
            <Fact label={t('Raum', 'Room')}>
              {l.roomName ?? '—'}
              {l.floor !== null ? <span className="block text-[0.78rem] font-medium text-[var(--casa-muted)]">{floorName(l.floor, t)}</span> : null}
            </Fact>
            <Fact label={t('Lehrkraft', 'Teacher')}>
              {l.teacherName ?? '—'}
              {l.substitute ? (
                <span className="mt-0.5 block text-[0.78rem] font-semibold text-[#8a5a00]">
                  {l.replacedTeacherName ? t(`Vertretung für ${l.replacedTeacherName}`, `Covering for ${l.replacedTeacherName}`) : t('Vertretung', 'Cover')}
                </span>
              ) : null}
            </Fact>
          </dl>
          {editing && (editing.canTeacher || editing.canRoom) && !l.cancelled ? (
            <section className="border-t border-ws-line-soft py-3">
              <h3 className="px-6 pb-2 text-[0.76rem] font-bold text-[var(--casa-muted)]">{t('Ändern', 'Change')}</h3>
              <div className="space-y-3 px-6 pb-1">
                {editing.canTeacher ? <ChangeForm lesson={l} day={day} what="teacher" editing={editing} /> : null}
                {editing.canRoom ? <ChangeForm lesson={l} day={day} what="room" editing={editing} /> : null}
              </div>
            </section>
          ) : null}
          <section className="border-t border-ws-line-soft py-3">
            <h3 className="flex items-baseline justify-between px-6 pb-1.5 text-[0.76rem] font-bold text-[var(--casa-muted)]">
              {t('Teilnehmende', 'Learners')}
              <span className="tabular-nums">{l.learners.length}</span>
            </h3>
            {l.learners.length ? (
              <ul>
                {l.learners.map((p) => (
                  <li key={p.personId}>
                    <Link href={`/admin/people/${p.personId}`} className="flex items-center gap-3 px-6 py-2 transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]">
                      <Avatar name={p.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{p.name}</span>
                        {p.email ? <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{p.email}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-2 text-[0.86rem] text-[var(--casa-muted)]">{t('Niemand gebucht.', 'Nobody booked.')}</p>
            )}
          </section>
        </>
      ) : null}
    </SidePanel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[0.95rem] font-bold text-[var(--casa-ink)]">{children}</dd>
    </div>
  );
}

/**
 * A lesson's teacher or room, changed from here: the choices say who is away that day and what else is
 * taught by them or in it at that time; on this day only, or from it to the end of the course; and the
 * change is said once more, with what it means, before it is made (`changeLessonAction`).
 */
function ChangeForm({ lesson: l, day, what, editing }: { lesson: DayLesson; day: string; what: 'teacher' | 'room'; editing: LessonEditing }) {
  const { t, lang } = useWsLang();
  const current = what === 'teacher' ? l.teacherId : l.roomId;
  const [value, setValue] = useState(current ?? '');
  const [scope, setScope] = useState<'day' | 'rest'>(what === 'teacher' ? 'day' : 'rest');
  const overlaps = (o: DayLesson) => o.id !== l.id && !o.cancelled && (!l.startsAt || !o.startsAt || !l.endsAt || !o.endsAt || (o.startsAt < l.endsAt && o.endsAt > l.startsAt));
  const busy = (id: string) => editing.lessons.find((o) => overlaps(o) && (what === 'teacher' ? o.teacherId === id : o.roomId === id));
  const options = what === 'teacher' ? editing.choices.teachers : editing.choices.rooms;
  const name = (id: string) => options.find((o) => o.id === id)?.name ?? (what === 'teacher' ? l.teacherName : l.roomName) ?? '—';
  const dayName = new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  const label = what === 'teacher' ? t('Lehrkraft', 'Teacher') : t('Raum', 'Room');
  const changed = value !== (current ?? '');
  const now = current ? name(current) : t('niemand', 'nobody');
  const next = value ? name(value) : t('niemand', 'nobody');
  const description =
    scope === 'day'
      ? what === 'teacher'
        ? t(`Am ${dayName} unterrichtet ${next} statt ${now}, als Vertretung. Das gilt überall: Tagesplan, Raumplan, Kursplanung, Kurs und Anwesenheitsliste.`, `On ${dayName}, ${next} teaches instead of ${now}, as cover. It holds everywhere: day plan, room plan, Kursplanung, course and attendance sheet.`)
        : t(`Am ${dayName} ist ${l.label} in ${next} statt ${now}. Das gilt überall: Tagesplan, Raumplan, Kursplanung, Kurs und Anwesenheitsliste.`, `On ${dayName}, ${l.label} is in ${next} instead of ${now}. It holds everywhere: day plan, room plan, Kursplanung, course and attendance sheet.`)
      : what === 'teacher'
        ? t(`Ab ${dayName} bis zum Kursende unterrichtet ${next} statt ${now}, auch im Wochenplan des Kurses.`, `From ${dayName} to the end of the course, ${next} teaches instead of ${now}, in the course's weekly plan too.`)
        : t(`Ab ${dayName} bis zum Kursende ist ${l.label} in ${next} statt ${now}, auch im Wochenplan des Kurses.`, `From ${dayName} to the end of the course, ${l.label} is in ${next} instead of ${now}, in the course's weekly plan too.`);
  return (
    <form action={changeLessonAction} className="rounded-xl bg-ws-sunk/50 p-3">
      <input type="hidden" name="dayId" value={l.id} />
      <input type="hidden" name="what" value={what} />
      <input type="hidden" name="back" value={editing.back} />
      <label className="block">
        <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</span>
        <Select name="value" value={value} onChange={(e) => setValue(e.target.value)}>
          {what === 'teacher' && !current ? <option value="">{t('Keine Lehrkraft', 'No teacher')}</option> : null}
          {current && !options.some((o) => o.id === current) ? <option value={current}>{name(current)}</option> : null}
          {options.map((o) => {
            const away = what === 'teacher' ? editing.choices.away[o.id] : undefined;
            const clash = busy(o.id);
            const note = away ? t(` — fehlt · ${away}`, ` — away · ${away}`) : clash ? t(` — ${clash.label} zur gleichen Zeit`, ` — ${clash.label} at that time`) : '';
            return (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.id === current ? t(' (jetzt)', ' (now)') : note}
              </option>
            );
          })}
        </Select>
      </label>
      <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem]">
        <legend className="sr-only">{t('Wann', 'When')}</legend>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="scope" value="day" checked={scope === 'day'} onChange={() => setScope('day')} className="accent-[var(--fm-navy)]" />
          {t(`Nur am ${dayName}`, `On ${dayName} only`)}
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="scope" value="rest" checked={scope === 'rest'} onChange={() => setScope('rest')} className="accent-[var(--fm-navy)]" />
          {t(`Ab ${dayName} bis Kursende`, `From ${dayName} to the end`)}
        </label>
      </fieldset>
      <div className="mt-2.5 flex justify-end">
        {changed ? (
          <ConfirmSubmit variant="secondary" title={t(`${label} ändern?`, `Change the ${label.toLowerCase()}?`)} description={description} confirmLabel={t('Ja, ändern', 'Yes, change')}>
            {t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
          </ConfirmSubmit>
        ) : (
          <Button type="button" variant="secondary" size="sm" disabled>
            {t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
          </Button>
        )}
      </div>
    </form>
  );
}
