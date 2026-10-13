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
 * One framed white bar, segmented like the offers list's filters: the arrows,
 * the seven days and the way back to today are all controls of the same kind,
 * so they sit in one frame rather than as nine separate boxes on the canvas.
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
    <nav
      aria-label="Choose a day"
      className="flex items-center gap-0.5 rounded-xl border border-ws-line bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
    >
      <Arrow href={shift(-1)} label="Previous week" direction="left" />

      <ol className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {days.map((d) => {
          const iso = toIso(d);
          const isSelected = iso === date;
          const isToday = iso === today;
          const openTasks = openCounts.get(iso) ?? 0;
          const weekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <li key={iso} className="min-w-16 flex-1">
              <Link
                href={href(d)}
                aria-current={isSelected ? 'date' : undefined}
                className={cn(
                  'relative flex h-11 items-center justify-center gap-1.5 rounded-lg px-2 transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                  isSelected
                    ? 'bg-[var(--casa-ink-deep)] text-white'
                    : weekend
                      ? 'bg-[#f8fafc] text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
                      : 'text-[var(--casa-ink)] hover:bg-ws-sunk',
                  isToday && !isSelected ? 'ring-1 ring-ws-line-firm ring-inset' : undefined
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isSelected ? 'text-white/70' : 'text-[var(--casa-text-subtle)]'
                  )}
                >
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span className="text-[0.95rem] font-extrabold tabular-nums">{d.getDate()}</span>
                {openTasks > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-1.5 right-1.5 size-1.5 rounded-full',
                      isSelected ? 'bg-white/80' : 'bg-[var(--casa-warning-text)]'
                    )}
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
        <>
          <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-ws-line" />
          <Link
            href="/admin"
            className="flex h-11 shrink-0 items-center rounded-lg px-3.5 text-[0.8rem] font-bold text-[var(--casa-ink)] transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
          >
            Today
          </Link>
        </>
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
      className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
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
