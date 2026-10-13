import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * The week strip — the calendar part of the daily calendar.
 *
 * Seven days at a time, because a week is the unit CASA runs on: courses start
 * on Mondays, groups arrive for one, two or four weeks. A dot marks a day with
 * unfinished tasks, so a colleague can see on Monday that Thursday already has
 * work waiting.
 *
 * Links, not a date picker: every day of the week is one click, the browser
 * back button works, and a URL can be pasted to a colleague.
 *
 * Small, in the page's head beside the greeting: a day is chosen now and then,
 * so the strip is a calendar's row of dates, not a band across the screen.
 * The chosen day is ink, today's date is blue, a weekend is quiet.
 */
export function DayNav({
  date,
  today,
  openCounts,
}: {
  /** The selected day, `YYYY-MM-DD`. */
  date: string;
  /** Today's date, `YYYY-MM-DD`, resolved on the server. */
  today: string;
  openCounts: Map<string, number>;
}) {
  const selected = new Date(`${date}T00:00:00`);
  const monday = new Date(selected);
  // getDay(): 0 = Sunday. CASA's week starts on Monday.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const href = (d: Date) => {
    const iso = toIso(d);
    return iso === today ? '/admin' : `/admin?date=${iso}`;
  };
  const shift = (weeks: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + weeks * 7 + ((selected.getDay() + 6) % 7));
    return href(d);
  };

  return (
    <nav aria-label="Choose a day" className="flex items-center gap-0.5">
      <Arrow href={shift(-1)} label="Previous week" direction="left" />

      <ol className="flex gap-0.5">
        {days.map((d) => {
          const iso = toIso(d);
          const isSelected = iso === date;
          const isToday = iso === today;
          const openTasks = openCounts.get(iso) ?? 0;
          const weekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <li key={iso}>
              <Link
                href={href(d)}
                aria-current={isSelected ? 'date' : undefined}
                className={cn(
                  'relative flex h-12 w-10 flex-col items-center justify-center rounded-xl transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                  isSelected ? 'bg-[var(--casa-ink-deep)] text-white' : 'hover:bg-white'
                )}
              >
                <span
                  className={cn(
                    'text-[0.65rem] leading-none font-semibold',
                    isSelected ? 'text-white/65' : 'text-[var(--casa-text-subtle)]'
                  )}
                >
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span
                  className={cn(
                    'mt-1 text-[0.95rem] leading-none font-bold tabular-nums',
                    isSelected
                      ? 'text-white'
                      : isToday
                        ? 'text-[var(--casa-accent-text)]'
                        : weekend
                          ? 'text-[var(--casa-text-subtle)]'
                          : 'text-[var(--casa-ink)]'
                  )}
                >
                  {d.getDate()}
                </span>
                {/* A day with open tasks: a quiet dot under its date. */}
                {openTasks > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn('absolute bottom-1 size-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-[var(--casa-text-subtle)]')}
                  />
                ) : null}
                {isToday && !isSelected ? <span className="sr-only">Today</span> : null}
              </Link>
            </li>
          );
        })}
      </ol>

      <Arrow href={shift(1)} label="Next week" direction="right" />

      {date !== today ? (
        <Link
          href="/admin"
          className="ml-1 flex h-8 shrink-0 items-center rounded-lg border border-ws-line bg-white px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] transition-colors outline-none hover:border-ws-line-firm focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
        >
          Today
        </Link>
      ) : null}
    </nav>
  );
}

function Arrow({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: 'left' | 'right';
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-12 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors outline-none hover:bg-white hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'm6 3.5 4.5 4.5L6 12.5'} />
      </svg>
    </Link>
  );
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
