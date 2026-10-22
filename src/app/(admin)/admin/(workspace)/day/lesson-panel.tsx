'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { changeLessonAction, mergeLessonAction, unmergeLessonAction } from './actions';
import { ConfirmSubmit } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Avatar } from '@/components/admin/list';
import { MenuSelect, type MenuOption } from '@/components/admin/menu-select';
import { SidePanel } from '@/components/admin/side-panel';
import { Button } from '@/components/admin/ui';
import type { DayLesson, LessonChoices } from '@/lib/admin/day-plan';
import { MERGE_REASONS, MERGE_REASON_LABELS, SESSION_LABELS, type MergeReason } from '@/lib/admin/day-plan-labels';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { WEEKDAY_LABELS, WEEKDAYS } from '@/lib/admin/kursplanung/types';
import { weekdayOf } from '@/lib/admin/kursplanung/weeks';
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
          {!l.cancelled && l.roomId && editing?.lessons.some((o) => o.id !== l.id && !o.cancelled && o.roomId === l.roomId && overlapping(l, o)) ? (
            // Two classes in one room at the same time: said, so it is fixed — by a room, or by merging them.
            <div className="px-6 pt-4">
              <p className="rounded-xl bg-[#fdecec] px-3.5 py-2.5 text-[0.84rem] font-semibold text-[#9b1c1c]">
                {t(
                  `Zur gleichen Zeit in ${l.roomName}: ${editing.lessons.filter((o) => o.id !== l.id && !o.cancelled && o.roomId === l.roomId && overlapping(l, o)).map(groupName).join(', ')}`,
                  `At the same time in ${l.roomName}: ${editing.lessons.filter((o) => o.id !== l.id && !o.cancelled && o.roomId === l.roomId && overlapping(l, o)).map(groupName).join(', ')}`
                )}
              </p>
            </div>
          ) : null}
          {!l.cancelled && (l.joins.length || l.joinedBy.length) ? (
            <MergeNote lesson={l} editing={editing} />
          ) : l.cancelled || l.teacherAway || l.merged ? (
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
          {!l.cancelled && !l.roomId && !l.joins.length ? (
            <div className="px-6 pt-4">
              <p className="rounded-xl bg-[#fff4d6] px-3.5 py-2.5 text-[0.84rem] font-semibold text-[#6b4a00]">{t('Diese Gruppe hat noch keinen Raum.', 'This group has no room yet.')}</p>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5">
            <Fact label={t('Raum', 'Room')}>
              {l.roomName ?? (l.joins.length ? l.joins.map((h) => h.roomName ?? '—').join(', ') : '—')}
              {l.floor !== null ? <span className="block text-[0.78rem] font-medium text-[var(--casa-muted)]">{floorName(l.floor, t)}</span> : null}
            </Fact>
            <Fact label={l.weekTeachers.length > 1 ? t('Lehrkräfte', 'Teachers') : t('Lehrkraft', 'Teacher')}>
              {l.weekTeachers.length ? (
                // The week's teachers, each with their days; the day's in full weight.
                l.weekTeachers.map((w) => {
                  const today = w.dates.includes(day);
                  return (
                    <span key={w.name} className={cn('block', !today && 'font-semibold text-[var(--casa-ink-soft,#3d4a5c)]')}>
                      {w.name}
                      <span className="ml-1.5 text-[0.78rem] font-medium text-[var(--casa-muted)]">
                        {dayRun(w.dates, lang)}
                        {today ? t(' · heute', ' · today') : ''}
                        {w.substitute ? t(' · Vertretung', ' · cover') : ''}
                      </span>
                    </span>
                  );
                })
              ) : (
                l.teacherName ?? (l.joins.length ? l.joins.map((h) => h.teacherName ?? '—').join(', ') : '—')
              )}
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
                {l.joins.length ? (
                  editing.canTeacher ? <UnmergeForm lesson={l} day={day} editing={editing} /> : null
                ) : (
                  <>
                    {/* Without a room, the room comes first. */}
                    {editing.canRoom && !l.roomId ? <ChangeForm lesson={l} day={day} what="room" editing={editing} /> : null}
                    {editing.canTeacher ? <ChangeForm lesson={l} day={day} what="teacher" editing={editing} /> : null}
                    {editing.canRoom && l.roomId ? <ChangeForm lesson={l} day={day} what="room" editing={editing} /> : null}
                    {editing.canTeacher && !l.joinedBy.length ? <MergeForm lesson={l} day={day} editing={editing} /> : null}
                  </>
                )}
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

/** A teacher's days in a week: „Mo–Mi" when they follow each other, else „Mo, Mi". */
function dayRun(dates: readonly string[], lang: WsLang): string {
  const days = dates.map((d) => weekdayOf(d)).filter((d): d is NonNullable<typeof d> => d !== null);
  const index = days.map((d) => WEEKDAYS.indexOf(d));
  const label = (d: (typeof days)[number]) => pick(lang, WEEKDAY_LABELS[d]);
  const consecutive = index.every((n, i) => i === 0 || n === index[i - 1] + 1);
  return days.length > 1 && consecutive ? `${label(days[0])}–${label(days[days.length - 1])}` : days.map(label).join(', ');
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
 * change is said once more, with what it means, before it is made (`changeLessonAction`). The list is
 * CASA's own menu (`MenuSelect`): rooms under their floor as in the building, the online rooms last
 * (0077), each with its seats or what is in it at that time. The free rooms that seat the group,
 * smallest first, and the first free online room are one click each beside it.
 */
function ChangeForm({ lesson: l, day, what, editing }: { lesson: DayLesson; day: string; what: 'teacher' | 'room'; editing: LessonEditing }) {
  const { t, lang } = useWsLang();
  const current = what === 'teacher' ? l.teacherId : l.roomId;
  const [value, setValue] = useState(current ?? '');
  const [scope, setScope] = useState<'day' | 'rest'>(what === 'teacher' ? 'day' : 'rest');
  const overlaps = (o: DayLesson) => o.id !== l.id && !o.cancelled && (!l.startsAt || !o.startsAt || !l.endsAt || !o.endsAt || (o.startsAt < l.endsAt && o.endsAt > l.startsAt));
  const busy = (id: string) => editing.lessons.find((o) => overlaps(o) && (what === 'teacher' ? o.teacherId === id : o.roomId === id));
  const options = what === 'teacher' ? editing.choices.teachers : editing.choices.rooms;
  const seats = (r: { capacity: number | null; capacityMax: number | null }) => r.capacity ?? r.capacityMax ?? 0;
  const free = editing.choices.rooms.filter((r) => r.id !== current && !busy(r.id));
  const fitting =
    what === 'room'
      ? [
          ...free
            .filter((r) => !r.online && (r.capacityMax ?? r.capacity ?? 0) >= Math.max(1, l.headcount))
            .sort((a, b) => seats(a) - seats(b))
            .slice(0, 3),
          ...free.filter((r) => r.online).slice(0, 1),
        ]
      : [];
  const choices: MenuOption[] = [
    ...(what === 'teacher' && !current ? [{ value: '', label: t('Keine Lehrkraft', 'No teacher') }] : []),
    ...(current && !options.some((o) => o.id === current) ? [{ value: current, label: (what === 'teacher' ? l.teacherName : l.roomName) ?? '—', detail: t('jetzt', 'now') }] : []),
    ...(what === 'teacher'
      ? editing.choices.teachers.map((o): MenuOption => {
          const away = editing.choices.away[o.id];
          const clash = busy(o.id);
          return o.id === current
            ? { value: o.id, label: o.name, detail: t('jetzt', 'now') }
            : away
              ? { value: o.id, label: o.name, detail: t(`fehlt · ${away}`, `away · ${away}`), tone: 'warn' }
              : clash
                ? { value: o.id, label: o.name, detail: t(`${clash.label} zur gleichen Zeit`, `${clash.label} at that time`), tone: 'warn' }
                : { value: o.id, label: o.name };
        })
      : editing.choices.rooms.map((r): MenuOption => {
          const clash = busy(r.id);
          const group = r.online ? t('Online', 'Online') : floorName(r.floor, t);
          return r.id === current
            ? { value: r.id, label: r.name, detail: t('jetzt', 'now'), group }
            : clash
              ? { value: r.id, label: r.name, detail: t(`belegt · ${clash.label}`, `taken · ${clash.label}`), tone: 'warn', group }
              : { value: r.id, label: r.name, detail: !r.online && seats(r) ? t(`${seats(r)} Plätze`, `${seats(r)} seats`) : undefined, group };
        })),
  ];
  const name = (id: string) => options.find((o) => o.id === id)?.name ?? (what === 'teacher' ? l.teacherName : l.roomName) ?? '—';
  const dayName = new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  const label = what === 'teacher' ? t('Lehrkraft', 'Teacher') : t('Raum', 'Room');
  const changed = value !== (current ?? '');
  const now = current ? name(current) : t('niemand', 'nobody');
  const next = value ? name(value) : t('niemand', 'nobody');
  // A first room is assigned, not changed.
  const assign = what === 'room' && !current;
  const description = assign
    ? scope === 'day'
      ? t(`Am ${dayName} ist ${l.label} in ${next}. Das gilt überall: Tagesplan, Raumplan, Kursplanung, Kurs und Anwesenheitsliste.`, `On ${dayName}, ${l.label} is in ${next}. It holds everywhere: day plan, room plan, Kursplanung, course and attendance sheet.`)
      : t(`Ab ${dayName} bis zum Kursende ist ${l.label} in ${next}, auch im Wochenplan des Kurses.`, `From ${dayName} to the end of the course, ${l.label} is in ${next}, in the course's weekly plan too.`)
    : scope === 'day'
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
      <div>
        <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</span>
        <MenuSelect name="value" value={value} onChange={setValue} options={choices} placeholder={t('Raum wählen …', 'Choose a room …')} label={label} />
      </div>
      {fitting.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Frei und passend:', 'Free and fitting:')}</span>
          {fitting.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setValue(r.id)}
              aria-pressed={value === r.id}
              className={cn(
                'inline-flex h-7 items-center rounded-full px-2.5 text-[0.78rem] font-semibold ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                value === r.id ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
              )}
            >
              {r.name}
              {!r.online && seats(r) ? <span className="ml-1 font-medium opacity-70 tabular-nums">{seats(r)}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
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
          <ConfirmSubmit
            variant="secondary"
            title={assign ? t('Raum zuweisen?', 'Assign the room?') : t(`${label} ändern?`, `Change the ${label.toLowerCase()}?`)}
            description={description}
            confirmLabel={assign ? t('Ja, zuweisen', 'Yes, assign') : t('Ja, ändern', 'Yes, change')}
          >
            {assign ? t('Raum zuweisen', 'Assign room') : t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
          </ConfirmSubmit>
        ) : (
          <Button type="button" variant="secondary" size="sm" disabled>
            {assign ? t('Raum zuweisen', 'Assign room') : t(`${label} ändern`, `Change ${label.toLowerCase()}`)}
          </Button>
        )}
      </div>
    </form>
  );
}

const dayLabel = (day: string, lang: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
export const groupName = (p: { label: string; number: string | null }) => `${p.label}${p.number ? ` #${p.number}` : ''}`;
const overlapping = (a: DayLesson, b: DayLesson) => !a.startsAt || !b.startsAt || !a.endsAt || !b.endsAt || (b.startsAt < a.endsAt && b.endsAt > a.startsAt);

/**
 * How many sit in a host's room on a merged day: its own, and a share of each group that joins it (a group
 * shared out between two hosts counts half in each, as nobody records who goes where).
 */
export function together(host: DayLesson, lessons: readonly DayLesson[] | undefined): number {
  return Math.round(host.headcount + host.joinedBy.reduce((sum, g) => sum + g.headcount / Math.max(1, lessons?.find((o) => o.id === g.dayId)?.joins.length ?? 1), 0));
}

/** Free rooms at the lesson's time that hold `needed`, the smallest first. */
function roomsThatFit(l: DayLesson, needed: number, editing: LessonEditing | undefined) {
  if (!editing) return [];
  return editing.choices.rooms
    .filter((r) => r.id !== l.roomId && (r.capacityMax ?? r.capacity ?? 0) >= needed && !editing.lessons.some((o) => o.id !== l.id && !o.cancelled && o.roomId === r.id && overlapping(l, o)))
    .sort((a, b) => (a.capacityMax ?? a.capacity ?? 0) - (b.capacityMax ?? b.capacity ?? 0))
    .slice(0, 3);
}

/** A merged day, said plainly: where the group is taught, or who joins it, why — and whether the room holds them. */
function MergeNote({ lesson: l, editing }: { lesson: DayLesson; editing?: LessonEditing }) {
  const { t, lang } = useWsLang();
  const reason = l.mergeReason ? pick(lang, MERGE_REASON_LABELS[l.mergeReason]) : null;
  const total = l.joinedBy.length ? together(l, editing?.lessons) : 0;
  const tone = total && l.roomMax && total > l.roomMax ? 'red' : total && l.roomCapacity && total > l.roomCapacity ? 'amber' : null;
  const fit = tone ? roomsThatFit(l, total, editing) : [];
  return (
    <div className="space-y-2 px-6 pt-4">
      <div className="rounded-xl bg-[#eef3fb] px-3.5 py-2.5 text-[0.84rem] text-[#1d3a6b]">
        <p className="font-semibold">
          {l.joins.length === 1
            ? t(`Zusammengelegt: bei ${groupName(l.joins[0])} · ${l.joins[0].roomName ?? '—'}`, `Merged: with ${groupName(l.joins[0])} · ${l.joins[0].roomName ?? '—'}`)
            : l.joins.length > 1
              ? t(`Aufgeteilt auf ${l.joins.map((h) => `${groupName(h)} (${h.roomName ?? '—'})`).join(' und ')}`, `Shared out to ${l.joins.map((h) => `${groupName(h)} (${h.roomName ?? '—'})`).join(' and ')}`)
              : t(`Zusammengelegt mit ${l.joinedBy.map(groupName).join(', ')}`, `Merged with ${l.joinedBy.map(groupName).join(', ')}`)}
        </p>
        {reason || l.mergeNote ? <p className="mt-0.5 text-[0.8rem]">{[reason, l.mergeNote].filter(Boolean).join(' · ')}</p> : null}
      </div>
      {tone ? (
        <p className={cn('rounded-xl px-3.5 py-2.5 text-[0.82rem] font-semibold', tone === 'red' ? 'bg-[#fdecec] text-[#9b1c1c]' : 'bg-[#fff4d6] text-[#7a5200]')}>
          {t(
            `Zusammen etwa ${total} Lernende · ${l.roomName} hat ${l.roomCapacity ?? '?'} Plätze${l.roomMax ? ` (höchstens ${l.roomMax})` : ''}.`,
            `About ${total} learners together · ${l.roomName} seats ${l.roomCapacity ?? '?'}${l.roomMax ? ` (at most ${l.roomMax})` : ''}.`
          )}
          {fit.length ? (
            <span className="mt-0.5 block font-medium">
              {t('Frei und groß genug: ', 'Free and big enough: ')}
              {fit.map((r) => `${r.name} (${r.capacityMax ?? r.capacity})`).join(', ')}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A group taught with others, from here (0074): the same level's groups at the same time, one or more —
 * a group can be shared out — on this day or up to a day (when the teacher is back, if their absence says
 * so), with a reason, preset when the teacher is away; said once more before it is done.
 */
function MergeForm({ lesson: l, day, editing }: { lesson: DayLesson; day: string; editing: LessonEditing }) {
  const { t, lang } = useWsLang();
  const candidates = editing.lessons.filter((o) => o.id !== l.id && !o.cancelled && l.level && o.level === l.level && o.roomId && !o.joins.length && overlapping(l, o));
  const [chosen, setChosen] = useState<string[]>([]);
  const awayUntil = l.teacherId ? editing.choices.awayUntil[l.teacherId] : undefined;
  const [scope, setScope] = useState<'day' | 'until'>(awayUntil && awayUntil > day ? 'until' : 'day');
  const [until, setUntil] = useState(awayUntil && awayUntil > day ? awayUntil : day);
  const away = l.teacherId ? editing.choices.away[l.teacherId] : undefined;
  const [reason, setReason] = useState<MergeReason | ''>(away === 'Krank' ? 'sick' : away === 'Urlaub' ? 'holiday' : '');
  if (!candidates.length) return null;
  const hosts = candidates.filter((c) => chosen.includes(c.id));
  const share = (c: DayLesson) => Math.round(c.headcount + l.headcount / Math.max(1, chosen.length || 1) + c.joinedBy.reduce((sum, g) => sum + g.headcount, 0));
  const span = scope === 'until' && until > day ? t(`vom ${dayLabel(day, lang)} bis ${dayLabel(until, lang)}`, `from ${dayLabel(day, lang)} to ${dayLabel(until, lang)}`) : t(`am ${dayLabel(day, lang)}`, `on ${dayLabel(day, lang)}`);
  const where = hosts.map((h) => `${groupName(h)} (${h.roomName ?? '—'})`).join(t(' und ', ' and '));
  return (
    <form action={mergeLessonAction} className="rounded-xl bg-ws-sunk/50 p-3">
      <input type="hidden" name="dayId" value={l.id} />
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="back" value={editing.back} />
      <fieldset>
        <legend className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Zusammenlegen mit', 'Merge with')}</legend>
        <ul className="space-y-1">
          {candidates.map((c) => {
            const total = share(c);
            const over = c.roomMax ? total > c.roomMax : c.roomCapacity ? total > c.roomCapacity : false;
            const tight = !over && c.roomCapacity ? total > c.roomCapacity : false;
            return (
              <li key={c.id}>
                <label className="flex items-start gap-2 rounded-lg px-1.5 py-1 text-[0.82rem] hover:bg-white">
                  <input
                    type="checkbox"
                    name="host"
                    value={c.id}
                    checked={chosen.includes(c.id)}
                    onChange={(e) => setChosen((was) => (e.target.checked ? [...was, c.id] : was.filter((id) => id !== c.id)))}
                    className="mt-0.5 accent-[var(--fm-navy)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--casa-ink)]">{groupName(c)}</span>
                    <span className="text-[var(--casa-muted)]"> · {[c.roomName, shortName(c.teacherName)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={cn('shrink-0 tabular-nums', over ? 'font-semibold text-[#b42318]' : tight ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')} title={t('Zusammen / Plätze im Raum', 'Together / seats in the room')}>
                    {total}/{c.roomCapacity ?? '?'}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {hosts.length ? (
        <div className="mt-2.5 space-y-2">
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem]">
            <legend className="sr-only">{t('Wann', 'When')}</legend>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="scope" value="day" checked={scope === 'day'} onChange={() => setScope('day')} className="accent-[var(--fm-navy)]" />
              {t(`Nur am ${dayLabel(day, lang)}`, `On ${dayLabel(day, lang)} only`)}
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="radio" name="scope" value="until" checked={scope === 'until'} onChange={() => setScope('until')} className="accent-[var(--fm-navy)]" />
              {t('Bis', 'Until')}
              <input
                type="date"
                name="until"
                min={day}
                value={until}
                onChange={(e) => {
                  setUntil(e.target.value);
                  setScope('until');
                }}
                className="h-7 rounded-md border border-ws-line bg-white px-1.5 text-[0.8rem]"
              />
            </label>
          </fieldset>
          <div>
            <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Grund', 'Reason')}</span>
            <MenuSelect
              name="reason"
              value={reason}
              onChange={(v) => setReason(v as MergeReason)}
              options={MERGE_REASONS.map((r) => ({ value: r, label: pick(lang, MERGE_REASON_LABELS[r]) }))}
              placeholder={t('Grund wählen', 'Choose a reason')}
              label={t('Grund', 'Reason')}
            />
          </div>
          <input
            name="note"
            maxLength={300}
            placeholder={t('Notiz (optional)', 'Note (optional)')}
            aria-label={t('Notiz', 'Note')}
            className="h-9 w-full rounded-lg border border-ws-line bg-white px-2.5 text-[0.84rem] outline-none placeholder:text-[var(--casa-text-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
          />
          <div className="flex justify-end">
            {/* The reason is required: until it is chosen, there is nothing to confirm. */}
            {!reason ? (
              <Button type="button" variant="secondary" size="sm" disabled>
                {t('Zusammenlegen', 'Merge')}
              </Button>
            ) : (
            <ConfirmSubmit
              variant="secondary"
              title={t('Zusammenlegen?', 'Merge?')}
              description={t(
                `${groupName(l)} wird ${span} bei ${where} unterrichtet. Raum und Lehrkraft der Gruppe ruhen und kommen zurück, wenn du die Zusammenlegung aufhebst. Die Anwesenheitslisten bleiben getrennt.`,
                `${groupName(l)} is taught ${span} with ${where}. The group's room and teacher rest and come back when you lift the merge. The attendance sheets stay separate.`
              )}
              confirmLabel={t('Ja, zusammenlegen', 'Yes, merge')}
            >
              {t('Zusammenlegen', 'Merge')}
            </ConfirmSubmit>
            )}
          </div>
        </div>
      ) : null}
    </form>
  );
}

/** A merge lifted: the group has its room and teacher back, on this day or on every merged day from it on. */
function UnmergeForm({ lesson: l, day, editing }: { lesson: DayLesson; day: string; editing: LessonEditing }) {
  const { t, lang } = useWsLang();
  const [scope, setScope] = useState<'day' | 'rest'>('day');
  return (
    <form action={unmergeLessonAction} className="rounded-xl bg-ws-sunk/50 p-3">
      <input type="hidden" name="dayId" value={l.id} />
      <input type="hidden" name="back" value={editing.back} />
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem]">
        <legend className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Zusammenlegung aufheben', 'Lift the merge')}</legend>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="scope" value="day" checked={scope === 'day'} onChange={() => setScope('day')} className="accent-[var(--fm-navy)]" />
          {t(`Nur am ${dayLabel(day, lang)}`, `On ${dayLabel(day, lang)} only`)}
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="scope" value="rest" checked={scope === 'rest'} onChange={() => setScope('rest')} className="accent-[var(--fm-navy)]" />
          {t(`Ab ${dayLabel(day, lang)} an allen Tagen`, `From ${dayLabel(day, lang)} on, every day`)}
        </label>
      </fieldset>
      <div className="mt-2.5 flex justify-end">
        <ConfirmSubmit
          variant="secondary"
          title={t('Zusammenlegung aufheben?', 'Lift the merge?')}
          description={t(
            `${groupName(l)} hat ${scope === 'day' ? `am ${dayLabel(day, lang)}` : `ab ${dayLabel(day, lang)}`} wieder ihren eigenen Raum und ihre Lehrkraft.`,
            `${groupName(l)} has its own room and teacher back ${scope === 'day' ? `on ${dayLabel(day, lang)}` : `from ${dayLabel(day, lang)} on`}.`
          )}
          confirmLabel={t('Ja, aufheben', 'Yes, lift it')}
        >
          {t('Aufheben', 'Lift')}
        </ConfirmSubmit>
      </div>
    </form>
  );
}
