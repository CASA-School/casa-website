import Link from 'next/link';

import { groupRuns, OpenTable, openCell } from './list-parts';
import { dayRange, ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, ButtonLink } from '@/components/admin/ui';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import type { CourseListRow, CoursePhase } from '@/lib/admin/course-list';
import { num, pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { cn } from '@/lib/utils';

/**
 * The courses, one row each (2026-10-17; docs/ADMIN_WORKSPACE.md §Courses): the running ones first,
 * then those ahead, under the start they belong to; the past ones on their own view. What SchoolMan's
 * course list is read for: learners now against the places, week by week, who teaches, who waits, the
 * dates — and „Buchen", which opens the course with its „Wen buchen?" (a joiner into a running course
 * starts on their own Monday).
 */

const PHASES: Record<CoursePhase, Bilingual> = {
  running: { de: 'Laufend', en: 'Running' },
  upcoming: { de: 'Kommend', en: 'Coming up' },
  past: { de: 'Vergangen', en: 'Past' },
};

const DAYS: Record<string, Bilingual> = {
  Mon: { de: 'Mo', en: 'Mon' },
  Tue: { de: 'Di', en: 'Tue' },
  Wed: { de: 'Mi', en: 'Wed' },
  Thu: { de: 'Do', en: 'Thu' },
  Fri: { de: 'Fr', en: 'Fri' },
  Sat: { de: 'Sa', en: 'Sat' },
  Sun: { de: 'So', en: 'Sun' },
};

/** Mon–Fri as „Mo–Fr", Mon and Wed as „Mo + Mi". */
function dayList(days: readonly string[], lang: WsLang): string | null {
  if (!days.length) return null;
  const order = Object.keys(DAYS);
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const run = sorted.every((d, i) => i === 0 || order.indexOf(d) === order.indexOf(sorted[i - 1]) + 1);
  const name = (d: string) => pick(lang, DAYS[d] ?? { de: d, en: d });
  return run && sorted.length > 2 ? `${name(sorted[0])}–${name(sorted[sorted.length - 1])}` : sorted.map(name).join(' + ');
}

const hide = 'hidden md:table-cell';

export function CourseList({ rows, view, canBook, today, t, lang }: { rows: CourseListRow[]; view: 'current' | 'past'; canBook: boolean; today: string; t: T; lang: WsLang }) {
  if (rows.length === 0) {
    return <ListEmpty title={view === 'past' ? t('Keine vergangenen Kurse im letzten Jahr', 'No past courses in the last year') : t('Keine Kurse geplant', 'No courses planned')} />;
  }
  const phases: CoursePhase[] = view === 'past' ? ['past'] : ['running', 'upcoming'];
  const span = canBook && view !== 'past' ? 5 : 4;
  return (
    <OpenTable
      head={[
        { label: t('Kurs', 'Course') },
        { label: t('Lehrkräfte', 'Teachers'), className: `w-[13rem] ${hide}` },
        { label: t('Teilnehmende', 'Learners'), className: 'w-[13rem]' },
        { label: t('Warteliste', 'Waiting'), className: `w-[8rem] ${hide}` },
        ...(span === 5 ? [{ label: <span className="sr-only">{t('Buchen', 'Book')}</span>, className: 'w-px' }] : []),
      ]}
    >
      {phases.flatMap((phase) => {
        const inPhase = rows.filter((r) => r.phase === phase);
        if (!inPhase.length) return [];
        return [
          <ListGroup key={phase} label={pick(lang, PHASES[phase])} count={inPhase.length} span={span} />,
          ...groupRuns(inPhase, (r) => r.courseInstanceId).flatMap((start) => [
            <StartRow key={`s-${start.key}`} row={start.items[0]} span={span} t={t} lang={lang} />,
            ...start.items.map((row) => <CourseRow key={row.courseId} row={row} canBook={span === 5} today={today} t={t} lang={lang} />),
          ]),
        ];
      })}
    </OpenTable>
  );
}

/** The start a group of courses belongs to: what it is, when, and how far it has come. */
function StartRow({ row, span, t, lang }: { row: CourseListRow; span: number; t: T; lang: WsLang }) {
  const weeks = row.weeks.length;
  const facts = [
    row.session ? pick(lang, SESSION_LABELS[row.session]) : null,
    dayList(row.days, lang),
    row.time ? row.time.replace('-', '–') : null,
  ].filter(Boolean);
  return (
    <tr data-start={row.courseInstanceId}>
      <td colSpan={span} className="border-t border-ws-line bg-ws-sunk/45 px-5 py-2">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.82rem]">
            <Link href={`/admin/catalogue/${row.courseInstanceId}`} className="font-bold text-[var(--casa-ink)] hover:underline">
              {row.startTitle && row.startTitle !== row.typeName && !row.title ? `${row.typeName} · ${row.startTitle}` : row.typeName}
            </Link>
            <span className="text-[var(--casa-muted)] tabular-nums">{dayRange(row.startDate, row.endDate, lang)}</span>
            {facts.length ? <span className="text-[var(--casa-muted)]">{facts.join(' · ')}</span> : null}
            {!row.onWebsite && row.phase !== 'past' ? <Badge tone="quiet">{t('Nicht auf der Website', 'Not on the website')}</Badge> : null}
          </span>
          {row.week ? (
            <span className="text-[0.78rem] font-semibold text-[var(--casa-ink)] tabular-nums">
              {t(`Woche ${row.week} von ${weeks}`, `Week ${row.week} of ${weeks}`)}
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}

function CourseRow({ row, canBook, today, t, lang }: { row: CourseListRow; canBook: boolean; today: string; t: T; lang: WsLang }) {
  const waiting = row.waiting + row.offered;
  const closed = !row.bookable;
  // The badge names the level; the line says what differs between the courses of a start.
  const facts = [row.groups > 1 ? t(`${row.groups} Gruppen`, `${row.groups} groups`) : t('1 Gruppe', '1 group'), row.roomName].filter(Boolean).join(' · ');
  const number = row.numbers.length ? `${t('Nr.', 'No.')} ${row.numbers.join(' · ')}` : null;
  const href = `/admin/catalogue/courses/${row.courseId}`;
  return (
    <tr className="group border-t border-ws-line-soft" data-course={row.courseId}>
      <td className={`${openCell} py-2.5 md:max-w-0`}>
        <Link href={href} className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-7 min-w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--fm-navy)] px-2 text-[0.8rem] font-extrabold text-white tabular-nums">
            {row.levelCode ?? (row.title ? row.title.slice(0, 2).toUpperCase() : '—')}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[0.86rem] font-semibold text-[var(--casa-ink)] group-hover:underline">{row.title ?? facts}</span>
              {closed ? <Badge tone="quiet">{t('Geschlossen', 'Closed')}</Badge> : null}
            </span>
            {row.title || number ? (
              <span className="mt-0.5 block truncate text-[0.76rem] text-[var(--casa-muted)]">{[row.title ? facts : null, number].filter(Boolean).join(' · ')}</span>
            ) : null}
          </span>
        </Link>
      </td>
      <td className={`${openCell} py-2.5 text-[0.82rem] text-[#2b3546] ${hide}`}>
        {row.teachers.length ? (
          <span className="block truncate" title={row.teachers.join(', ')}>
            {row.teachers.slice(0, 3).join(' · ')}
            {row.teachers.length > 3 ? <span className="text-[var(--casa-muted)]"> +{row.teachers.length - 3}</span> : null}
          </span>
        ) : null}
      </td>
      <td className={`${openCell} py-2.5`}>
        <span className="flex items-center gap-3">
          <span className="min-w-[4.5rem] text-[0.84rem] tabular-nums">
            {/* More learners than places — SchoolMan never enforced its cap — reads in amber. */}
            <b className={row.now > row.places ? 'font-bold text-[#9a5b00]' : row.now ? 'font-bold text-[var(--casa-ink)]' : 'font-semibold text-[var(--casa-text-subtle)]'}>
              {num(lang, row.now)}
            </b>
            <span className="text-[var(--casa-muted)]"> / {num(lang, row.places)}</span>
          </span>
          <WeekBars row={row} today={today} t={t} />
        </span>
      </td>
      <td className={`${openCell} py-2.5 ${hide}`}>
        {waiting ? (
          <Link
            href={`/admin/catalogue/${row.courseInstanceId}?level=${encodeURIComponent(row.levelCode ?? row.courseId)}`}
            className="inline-flex items-center rounded-full bg-[#e3f4fc] px-2 py-0.5 text-[0.74rem] font-semibold text-[#075985] tabular-nums hover:bg-[#d3edfb]"
          >
            {t(`${waiting} warten`, `${waiting} waiting`)}
          </Link>
        ) : null}
      </td>
      {canBook ? (
        <td className={`${openCell} py-2 text-right`}>
          <ButtonLink href={`${href}?book=1`} size="sm" variant="ghost">
            {t('Buchen', 'Book')}
          </ButtonLink>
        </td>
      ) : null}
    </tr>
  );
}

/**
 * The learners week by week, as SchoolMan's course list shows them: one bar a week against the places,
 * this week in ink, the weeks gone in grey-blue, those ahead pale. The number beside it is what to read;
 * the bars are its shape (a title on each names the week).
 */
const SHOWN_WEEKS = 12;

function WeekBars({ row, today, t }: { row: CourseListRow; today: string; t: T }) {
  if (row.weeks.length < 2) return null;
  // A long course (a term, a company's year) shows twelve weeks: the four before this one and what follows.
  const from = row.weeks.length <= SHOWN_WEEKS ? 0 : Math.min(Math.max(0, (row.week ?? 1) - 5), row.weeks.length - SHOWN_WEEKS);
  const shown = row.weeks.slice(from, from + SHOWN_WEEKS);
  const top = Math.max(row.places, ...shown.map((w) => w.n), 1);
  return (
    <span className="flex h-5 w-[5.25rem] shrink-0 items-end gap-[2px]" role="img" aria-label={t('Teilnehmende je Woche', 'Learners per week')}>
      {shown.map((w, j) => {
        const i = from + j;
        const current = row.week === i + 1;
        const gone = !current && w.monday < today;
        return (
          <span
            key={w.monday}
            title={`${t('KW', 'Week')} ${isoWeek(w.monday)}: ${w.n}`}
            className={cn('max-w-[5px] min-w-[2px] flex-1 rounded-[1.5px]', current ? 'bg-[var(--casa-ink-deep)]' : gone ? 'bg-[#9fb3cc]' : 'bg-[#d5deea]')}
            style={{ height: `${Math.max(2, Math.round((20 * w.n) / top))}px` }}
          />
        );
      })}
    </span>
  );
}
