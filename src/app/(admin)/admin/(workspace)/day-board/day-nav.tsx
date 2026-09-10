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
    <nav aria-label="Choose a day" className="flex items-center gap-2">
      <Arrow href={shift(-1)} label="Previous week" direction="left" />

      <ol className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
        {days.map((d) => {
          const iso = toIso(d);
          const isSelected = iso === date;
          const isToday = iso === today;
          const openTasks = openCounts.get(iso) ?? 0;
          const weekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <li key={iso} className="flex-1">
              <Link
                href={href(d)}
                aria-current={isSelected ? 'date' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                  isSelected
                    ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                    : weekend
                      ? 'border-ws-line bg-ws-sunk text-[var(--casa-text-subtle)] hover:border-ws-line-firm'
                      : 'border-ws-line bg-white text-[var(--casa-ink)] hover:border-[var(--casa-blue)]/45'
                )}
              >
                <span
                  className={cn(
                    'text-[0.65rem] font-semibold uppercase',
                    isSelected ? 'text-white/70' : 'text-[var(--casa-text-subtle)]'
                  )}
                >
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span className="text-sm font-semibold tabular-nums">{d.getDate()}</span>
                <span aria-hidden="true" className="flex h-1.5 items-center">
                  {openTasks > 0 ? (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isSelected ? 'bg-white/80' : 'bg-[var(--casa-warning-text)]'
                      )}
                    />
                  ) : null}
                </span>
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
          className="ml-1 shrink-0 rounded-lg border border-ws-line-firm bg-white px-3 py-2 text-xs font-semibold text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/45"
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
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-ws-line bg-white text-[var(--casa-text-subtle)] transition-colors hover:border-ws-line-firm hover:text-[var(--casa-ink)]"
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
