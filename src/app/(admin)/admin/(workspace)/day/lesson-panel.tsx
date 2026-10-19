'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Avatar } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import type { DayLesson } from '@/lib/admin/day-plan';
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
export function LessonPanel({ lesson, day, onClose }: { lesson: DayLesson | null; day: string; onClose: () => void }) {
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
