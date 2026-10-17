import Link from 'next/link';

import { groupRuns } from './list-parts';
import { dayRange, ListEmpty } from '@/components/admin/list';
import { Badge, ButtonLink } from '@/components/admin/ui';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import type { CourseGroupRow, CourseListRow, CoursePhase } from '@/lib/admin/course-list';
import { num, pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { cn } from '@/lib/utils';

/**
 * The courses of one kind of work (2026-10-17; docs/ADMIN_WORKSPACE.md §Courses), Rahman: the
 * intensive courses — morning and afternoon on one page, the running ones of both at the top — the evening — level and special courses, by
 * Monday + Wednesday and Tuesday + Thursday — and the rest, each a view of its own. Under each start its
 * courses; a course's parallel groups one row each, since they sit in their own rooms with their own
 * teachers, and each is known by its course number (SchoolMan's). A row: the number, its main teachers
 * (the week's pair, at most two), its room, its learners now against its places and week by week. A
 * course's level, its waiting list and „Buchen" span its rows.
 */

export type CourseView = 'intensive' | 'evening' | 'other';

/** Which view a course belongs to: the intensive courses, the evening by its hours, the rest. */
export function viewOf(row: Pick<CourseListRow, 'format' | 'session'>): CourseView {
  if (row.format === 'intensive') return 'intensive';
  return row.session === 'evening' ? 'evening' : 'other';
}



const PHASES: Record<CoursePhase, Bilingual> = {
  running: { de: 'Laufend', en: 'Running' },
  upcoming: { de: 'Kommend', en: 'Coming up' },
  past: { de: 'Vergangen', en: 'Past' },
};

type Pair = 'mw' | 'tt' | 'other';
const PAIRS: Record<Pair, Bilingual> = {
  mw: { de: 'Montag + Mittwoch', en: 'Monday + Wednesday' },
  tt: { de: 'Dienstag + Donnerstag', en: 'Tuesday + Thursday' },
  other: { de: 'Weitere Abende', en: 'Other evenings' },
};

/** An evening course's pair of days: Mon/Wed or Tue/Thu (a one-evening special course by its day). */
function pairOf(days: readonly string[]): Pair {
  const mw = days.some((d) => d === 'Mon' || d === 'Wed');
  const tt = days.some((d) => d === 'Tue' || d === 'Thu');
  return mw && !tt ? 'mw' : tt && !mw ? 'tt' : 'other';
}

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

const PHASE_ORDER: Record<CoursePhase, number> = { running: 0, upcoming: 1, past: 2 };

export function CourseList({
  rows,
  view,
  past,
  canBook,
  today,
  t,
  lang,
}: {
  rows: CourseListRow[];
  view: CourseView;
  past: boolean;
  canBook: boolean;
  today: string;
  t: T;
  lang: WsLang;
}) {
  if (rows.length === 0) {
    return <ListEmpty title={past ? t('Keine vergangenen Kurse im letzten Jahr', 'No past courses in the last year') : t('Keine Kurse geplant', 'No courses planned')} />;
  }
  const book = canBook && !past;
  const span = book ? 7 : 6;
  // The evening by its pair of days, running first; the intensive courses and the rest by running and
  // ahead — the running morning and afternoon courses together at the top, the shift in each start's head.
  const byPhase = (list: CourseListRow[]) => [...list].sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || (past ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)));
  const sections: { key: string; label: string; rows: CourseListRow[] }[] =
    view === 'evening'
      ? (['mw', 'tt', 'other'] as Pair[]).map((pair) => ({ key: pair, label: pick(lang, PAIRS[pair]), rows: byPhase(rows.filter((r) => pairOf(r.days) === pair)) }))
      : (past ? (['past'] as CoursePhase[]) : (['running', 'upcoming'] as CoursePhase[])).map((phase) => ({
            key: phase,
            label: pick(lang, PHASES[phase]),
            rows: rows.filter((r) => r.phase === phase),
          }));

  let band = 0;
  return (
    <div className="max-md:overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--ws-head-line)] bg-[var(--ws-head)] text-left text-xs font-semibold whitespace-nowrap text-[var(--ws-head-text)]">
            <th scope="col" className="py-3 pr-3 pl-5">{t('Kurs', 'Course')}</th>
            <th scope="col" className="w-[7.5rem] px-3 py-3">{t('Kurs-Nr.', 'Course no.')}</th>
            <th scope="col" className="w-[12rem] px-3 py-3">{t('Lehrkräfte', 'Teachers')}</th>
            <th scope="col" className="hidden w-[7.5rem] px-3 py-3 lg:table-cell">{t('Raum', 'Room')}</th>
            <th scope="col" className="w-[11.5rem] px-3 py-3">{t('Teilnehmende', 'Learners')}</th>
            <th scope="col" className="hidden w-[6.5rem] px-3 py-3 md:table-cell">{t('Warteliste', 'Waiting')}</th>
            {book ? (
              <th scope="col" className="w-px py-3 pr-5 pl-3">
                <span className="sr-only">{t('Buchen', 'Book')}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        {sections
          .filter((section) => section.rows.length)
          .map((section) => (
            <tbody key={section.key}>
              <tr>
                <th colSpan={span} scope="colgroup" className="border-t border-ws-line bg-white px-5 pt-4 pb-2 text-left text-xs font-bold text-[var(--casa-ink)]">
                  {section.label}
                  <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-[var(--ws-head)] px-1.5 py-px text-[0.68rem] font-semibold tabular-nums">
                    {section.rows.length}
                  </span>
                </th>
              </tr>
              {groupRuns(section.rows, (r) => r.courseInstanceId).flatMap((start) => [
                <StartRow key={`s-${start.key}`} row={start.items[0]} span={span} showPhase={view !== 'other'} t={t} lang={lang} />,
                ...start.items.flatMap((row) => {
                  band++;
                  return row.groupRows.map((group, i) => (
                    <GroupRow key={`${row.courseId}-${group.index}`} row={row} group={group} first={i === 0} shaded={band % 2 === 0} book={book} today={today} t={t} lang={lang} />
                  ));
                }),
              ])}
            </tbody>
          ))}
      </table>
    </div>
  );
}

/** The start a set of courses belongs to: what it is, when, and how far it has come. */
function StartRow({ row, span, showPhase, t, lang }: { row: CourseListRow; span: number; showPhase: boolean; t: T; lang: WsLang }) {
  const facts = [row.session && row.format !== 'intensive' ? pick(lang, SESSION_LABELS[row.session]) : null, dayList(row.days, lang), row.time ? row.time.replace('-', '–') : null].filter(Boolean);
  const where =
    row.phase === 'running' && row.week
      ? t(`Woche ${row.week} von ${row.weeks.length}`, `Week ${row.week} of ${row.weeks.length}`)
      : showPhase && row.phase === 'upcoming'
        ? t(`ab ${shortDay(row.startDate, lang)}`, `from ${shortDay(row.startDate, lang)}`)
        : null;
  return (
    <tr data-start={row.courseInstanceId}>
      <td colSpan={span} className="border-t border-ws-line bg-ws-sunk/45 px-5 py-2">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[0.82rem]">
            <Link href={`/admin/catalogue/${row.courseInstanceId}`} className="font-bold text-[var(--casa-ink)] hover:underline">
              {row.startTitle && row.startTitle !== row.typeName && !row.title ? `${row.typeName} · ${row.startTitle}` : row.typeName}
              {row.format === 'intensive' && row.session ? ` · ${pick(lang, SESSION_LABELS[row.session])}` : null}
            </Link>
            <span className="text-[var(--casa-muted)] tabular-nums">{dayRange(row.startDate, row.endDate, lang)}</span>
            {facts.length ? <span className="text-[var(--casa-muted)]">{facts.join(' · ')}</span> : null}
            {!row.onWebsite && row.phase !== 'past' ? <Badge tone="quiet">{t('Nicht auf der Website', 'Not on the website')}</Badge> : null}
          </span>
          {where ? <span className="text-[0.78rem] font-semibold text-[var(--casa-ink)] tabular-nums">{where}</span> : null}
        </span>
      </td>
    </tr>
  );
}

const shortDay = (iso: string, lang: WsLang) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });

/** One group of a course; the first carries the course's level, its waiting list and „Buchen" for all of them. */
function GroupRow({
  row,
  group,
  first,
  shaded,
  book,
  today,
  t,
  lang,
}: {
  row: CourseListRow;
  group: CourseGroupRow;
  first: boolean;
  shaded: boolean;
  book: boolean;
  today: string;
  t: T;
  lang: WsLang;
}) {
  const span = row.groupRows.length;
  const waiting = row.waiting + row.offered;
  const href = `/admin/catalogue/courses/${row.courseId}`;
  return (
    <tr className={cn('align-middle', first ? 'border-t border-ws-line-soft' : 'border-t border-dashed border-ws-line-soft', shaded ? 'bg-[var(--ws-row-alt)]' : 'bg-white')}>
      {first ? (
        <td rowSpan={span} className="py-2.5 pr-3 pl-5 align-top md:max-w-0">
          <Link href={href} className="group flex min-w-0 items-start gap-3">
            <span className="inline-flex h-7 min-w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--fm-navy)] px-2 text-[0.8rem] font-extrabold text-white tabular-nums">
              {row.levelCode ?? (row.title ? row.title.slice(0, 2).toUpperCase() : '—')}
            </span>
            <span className="min-w-0 pt-1">
              {row.title ? (
                <span className="line-clamp-2 text-[0.84rem] leading-snug font-semibold text-[var(--casa-ink)] group-hover:underline" title={row.title}>
                  {row.title}
                </span>
              ) : null}
              {!row.bookable ? (
                <span className="mt-0.5 block">
                  <Badge tone="quiet">{t('Geschlossen', 'Closed')}</Badge>
                </span>
              ) : null}
            </span>
          </Link>
        </td>
      ) : null}
      <td className="px-3 py-2.5 text-[0.86rem] font-semibold whitespace-nowrap text-[var(--casa-ink)] tabular-nums">{group.number}</td>
      <td className="max-w-0 px-3 py-2.5 text-[0.82rem] text-[#2b3546]">
        {group.teachers.length ? <span className="block truncate">{group.teachers.join(' · ')}</span> : null}
      </td>
      <td className="hidden max-w-0 px-3 py-2.5 text-[0.82rem] text-[#2b3546] lg:table-cell">
        {group.room ? <span className="block truncate">{group.room}</span> : null}
      </td>
      <td className="px-3 py-2.5">
        {group.now === null ? (
          <span className="text-[0.84rem] text-[var(--casa-muted)] tabular-nums">– / {num(lang, group.places)}</span>
        ) : (
          <span className="flex items-center gap-3">
            <span className="min-w-[3.75rem] text-[0.84rem] tabular-nums">
              {/* More learners than places — SchoolMan never enforced its cap — reads in amber. */}
              <b className={group.now > group.places ? 'font-bold text-[#9a5b00]' : group.now ? 'font-bold text-[var(--casa-ink)]' : 'font-semibold text-[var(--casa-text-subtle)]'}>
                {num(lang, group.now)}
              </b>
              <span className="text-[var(--casa-muted)]"> / {num(lang, group.places)}</span>
            </span>
            <WeekBars weeks={group.weeks} week={row.week} places={group.places} today={today} t={t} />
          </span>
        )}
      </td>
      {first ? (
        <td rowSpan={span} className="hidden px-3 py-2.5 align-top md:table-cell">
          {waiting ? (
            <Link
              href={`/admin/catalogue/${row.courseInstanceId}?level=${encodeURIComponent(row.levelCode ?? row.courseId)}`}
              className="mt-0.5 inline-flex items-center rounded-full bg-[#e3f4fc] px-2 py-0.5 text-[0.74rem] font-semibold text-[#075985] tabular-nums hover:bg-[#d3edfb]"
            >
              {t(`${waiting} warten`, `${waiting} waiting`)}
            </Link>
          ) : null}
        </td>
      ) : null}
      {book && first ? (
        <td rowSpan={span} className="py-2 pr-5 pl-3 text-right align-top">
          <ButtonLink href={`${href}?book=1`} size="sm" variant="ghost">
            {t('Buchen', 'Book')}
          </ButtonLink>
        </td>
      ) : null}
    </tr>
  );
}

const SHOWN_WEEKS = 12;

/**
 * The learners week by week, as SchoolMan's course list shows them: one bar a week against the places,
 * this week in ink, the weeks gone in grey-blue, those ahead pale. A long course (a term, a company's
 * year) shows twelve weeks: the four before this one and what follows.
 */
function WeekBars({ weeks, week, places, today, t }: { weeks: { monday: string; n: number }[]; week: number | null; places: number; today: string; t: T }) {
  if (weeks.length < 2) return null;
  const from = weeks.length <= SHOWN_WEEKS ? 0 : Math.min(Math.max(0, (week ?? 1) - 5), weeks.length - SHOWN_WEEKS);
  const shown = weeks.slice(from, from + SHOWN_WEEKS);
  const top = Math.max(places, ...shown.map((w) => w.n), 1);
  return (
    <span className="flex h-5 w-[5.25rem] shrink-0 items-end gap-[2px]" role="img" aria-label={t('Teilnehmende je Woche', 'Learners per week')}>
      {shown.map((w, j) => {
        const current = week === from + j + 1;
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
