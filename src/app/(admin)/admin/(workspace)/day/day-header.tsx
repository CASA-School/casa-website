import Link from 'next/link';

import { DayJump } from './day-jump';
import { Icon } from '@/components/admin/icons';
import { wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

/**
 * The Tagesplan's head, the same on its three pages (2026-10-19): the day written out with its week,
 * a step back and forth, today, any date; the week as a strip, each day with its open tasks; and the
 * three views of the day — the overview, the courses, the room plan — which keep the day as one moves
 * between them.
 */

export type DayView = 'overview' | 'courses' | 'rooms';

const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const addDays = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
export const isoWeekday = (iso: string) => ((noon(iso).getUTCDay() + 6) % 7) + 1;
export const dayLabel = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });

/** The day asked for, else today. */
export const pickDay = (raw: string | undefined, today: string) => (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(noon(raw).getTime()) ? raw : today);

/** The week of the day, Monday to Sunday. */
export const weekOf = (day: string) => {
  const monday = addDays(day, 1 - isoWeekday(day));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

/** ISO week number: the team counts in weeks (KW). */
function weekNumber(iso: string): number {
  const thursday = new Date(noon(iso).getTime() + (4 - isoWeekday(iso)) * 86_400_000);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  const week1Thursday = new Date(jan4.getTime() + (4 - (((jan4.getUTCDay() + 6) % 7) + 1)) * 86_400_000);
  return 1 + Math.round((thursday.getTime() - week1Thursday.getTime()) / (7 * 86_400_000));
}

const PATHS: Record<DayView, string> = { overview: '/admin/day', courses: '/admin/day/courses', rooms: '/admin/day/rooms' };

export const viewHref = (view: DayView, day: string, today: string) => (day === today ? PATHS[view] : `${PATHS[view]}?date=${day}`);

export function DayHeader({
  view,
  day,
  today,
  openByDay,
  lessons,
  flats,
  t,
  lang,
}: {
  view: DayView;
  day: string;
  today: string;
  openByDay: Record<string, number>;
  lessons: number;
  /** Who lives in which room of the CASA flats, for whoever works the accommodation. */
  flats?: boolean;
  t: T;
  lang: WsLang;
}) {
  const isToday = day === today;
  const href = (d: string) => viewHref(view, d, today);
  const views: { key: DayView; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: t('Überblick', 'Overview'), icon: Icon.overview },
    { key: 'courses', label: t('Kurse', 'Courses'), icon: Icon.catalogue, count: lessons },
    { key: 'rooms', label: t('Raumplan', 'Room plan'), icon: Icon.rooms },
  ];
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] text-[var(--casa-ink)]">{t('Tagesplan', 'Day plan')}</h1>
          <p className="mt-1 text-sm text-[var(--casa-muted)]">
            <span className="font-semibold text-[var(--casa-ink)]">{dayLabel(day, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {' · '}
            {t(`KW ${weekNumber(day)}`, `Week ${weekNumber(day)}`)}
          </p>
        </div>
        <nav aria-label={t('Tag wählen', 'Choose a day')} className="flex items-center gap-1.5">
          <StepLink href={href(addDays(day, -1))} label={t('Vortag', 'Previous day')} back />
          <Link
            href={viewHref(view, today, today)}
            aria-current={isToday ? 'date' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-3.5 text-[0.84rem] font-semibold ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
              isToday ? 'bg-[var(--casa-ink-deep)] text-white ring-transparent' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
            )}
          >
            {t('Heute', 'Today')}
          </Link>
          <StepLink href={href(addDays(day, 1))} label={t('Nächster Tag', 'Next day')} />
          <DayJump day={day} today={today} path={PATHS[view]} />
        </nav>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1 rounded-2xl bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-ws-line">
        {weekOf(day).map((d) => {
          const on = d === day;
          const open = openByDay[d] ?? 0;
          return (
            <li key={d}>
              <Link
                href={href(d)}
                aria-current={on ? 'date' : undefined}
                className={cn(
                  'relative flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                  on ? 'bg-[var(--casa-ink-deep)] text-white shadow-[0_6px_16px_-8px_rgba(13,27,51,0.6)]' : 'hover:bg-ws-sunk',
                  !on && isoWeekday(d) > 5 && 'text-[var(--casa-muted)]'
                )}
              >
                <span className={cn('text-[0.7rem] font-semibold', on ? 'text-white/70' : 'text-[var(--casa-muted)]')}>
                  {dayLabel(d, lang, { weekday: 'short' })}
                  {d === today ? <span className={cn('ml-1 inline-block size-1.5 -translate-y-px rounded-full align-middle', on ? 'bg-white' : 'bg-[var(--casa-blue)]')} aria-label={t('Heute', 'Today')} /> : null}
                </span>
                <span className="text-[1.05rem] leading-tight font-extrabold tabular-nums">{dayLabel(d, lang, { day: 'numeric' })}</span>
                <span className="mt-0.5 h-4 text-[0.66rem] font-semibold tabular-nums" title={open ? t(`${open} offene Aufgaben`, `${open} open tasks`) : undefined}>
                  {open ? <span className={cn('rounded-full px-1.5 py-px', on ? 'bg-white/20 text-white' : 'bg-ws-sunk text-[var(--casa-ink)]')}>{open}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* The three views of the day: a segmented control, the day kept; the tests' archive and the flats beside it. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <nav aria-label={t('Ansichten des Tages', 'Views of the day')} className="inline-flex rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-ws-line">
        {views.map((v) => {
          const on = v.key === view;
          return (
            <Link
              key={v.key}
              href={viewHref(v.key, day, today)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.84rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4',
                on ? 'bg-[var(--casa-ink-deep)] text-white [&_svg]:text-white/80' : 'text-[var(--casa-ink)] hover:bg-ws-sunk [&_svg]:text-[var(--casa-muted)]'
              )}
            >
              {v.icon}
              {v.label}
              {v.count ? <span className={cn('text-xs font-semibold tabular-nums', on ? 'text-white/70' : 'text-[var(--casa-muted)]')}>{v.count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <span className="flex flex-wrap gap-2">
        <Link href="/admin/day/tests" className={pill}>
          {Icon.placement}
          {t('Einstufungstests', 'Placement tests')}
        </Link>
        {flats ? (
          <Link href={`/admin/accommodation/occupancy?date=${day}`} className={pill}>
            {Icon.home}
            {t('WG-Belegung', 'Flat occupancy')}
          </Link>
        ) : null}
      </span>
      </div>
    </header>
  );
}

/** A place beside the day's views: the day-one tests' archive, the flats. */
const pill =
  'inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[0.84rem] font-semibold text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-ws-line transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]';

function StepLink({ href, label, back = false }: { href: string; label: string; back?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-full bg-white text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4"
    >
      <span className={back ? 'rotate-180' : undefined}>{Icon.chevronRight}</span>
    </Link>
  );
}
