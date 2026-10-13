import Link from 'next/link';

import type { DayFacts } from '@/lib/admin/day-board';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { cn } from '@/lib/utils';

/**
 * The week at a glance — what FileMaker's home calendar gave the team before
 * they opened any day: seven days side by side, each with what it holds.
 * Learners starting, moving in and out, courses starting and ending, exams,
 * birthdays, teachers away, tasks open — and first, in amber and red, what the
 * teaching plan still lacks that day (FileMaker lit VacantTeacher and
 * ConflictTeacher orange). A day with nothing is an empty column.
 *
 * Each day is a link that opens it below, so the week is also how a day is
 * chosen: `?date=YYYY-MM-DD`, today without a parameter, back works, a URL can
 * be sent to a colleague. The chosen day is raised; today's date is blue.
 *
 * A dot's colour is the kind of thing, as on the workspace's cards: green a
 * person, blue a stay, red a course, ink the rest.
 */

type Fact = { key: keyof DayFacts; one: string; many: string; dot: string; text?: string };

const FACTS: readonly Fact[] = [
  { key: 'conflicts', one: 'plan conflict', many: 'plan conflicts', dot: 'bg-[#dc2626]', text: 'text-[#b91c1c]' },
  { key: 'unplanned', one: 'needs a teacher', many: 'need a teacher', dot: 'bg-[#d97706]', text: 'text-[#9a5b00]' },
  { key: 'firstDays', one: 'first day', many: 'first days', dot: 'bg-[#16a34a]' },
  { key: 'movingIn', one: 'moving in', many: 'moving in', dot: 'bg-[var(--casa-blue)]' },
  { key: 'movingOut', one: 'moving out', many: 'moving out', dot: 'bg-[var(--casa-blue)]' },
  { key: 'coursesStart', one: 'course starts', many: 'courses start', dot: 'bg-[#dc2626]' },
  { key: 'exams', one: 'exam', many: 'exams', dot: 'bg-[#dc2626]' },
  { key: 'coursesEnd', one: 'course ends', many: 'courses end', dot: 'bg-[#dc2626]' },
  { key: 'birthdays', one: 'birthday', many: 'birthdays', dot: 'bg-[#16a34a]' },
  { key: 'away', one: 'teacher away', many: 'teachers away', dot: 'bg-[#64748b]' },
  { key: 'tasks', one: 'task', many: 'tasks', dot: 'bg-[#64748b]' },
];

/** At most this many lines in a day; the rest is "+2 more". */
const LINES = 4;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export function WeekAtCasa({
  date,
  today,
  facts,
}: {
  /** The chosen day, `YYYY-MM-DD`. */
  date: string;
  /** Today, `YYYY-MM-DD`, resolved on the server. */
  today: string;
  facts: Map<string, DayFacts>;
}) {
  const monday = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const href = (iso: string) => (iso === today ? '/admin' : `/admin?date=${iso}`);
  const [, am, ad] = days[0].split('-').map(Number);
  const [, bm, bd] = days[6].split('-').map(Number);
  const span = am === bm ? `${ad}–${bd} ${MONTHS[bm - 1]}` : `${ad} ${MONTHS[am - 1]} – ${bd} ${MONTHS[bm - 1]}`;

  return (
    <section aria-label="The week" className="overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-ws-line px-4 py-2">
        <h2 className="text-sm font-extrabold text-[var(--casa-ink)]">
          Week {isoWeek(monday)}
          <span className="ml-2 font-semibold text-[var(--casa-text-subtle)]">{span}</span>
        </h2>
        <nav aria-label="Choose a week" className="flex items-center gap-1">
          {date !== today ? (
            <Link
              href="/admin"
              className="mr-1 flex h-8 items-center rounded-lg border border-ws-line bg-white px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] transition-colors outline-none hover:border-ws-line-firm focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
            >
              Today
            </Link>
          ) : null}
          <Arrow href={href(addDays(date, -7))} label="Previous week" direction="left" />
          <Arrow href={href(addDays(date, 7))} label="Next week" direction="right" />
        </nav>
      </header>

      <ol className="grid grid-cols-7 divide-x divide-ws-line-soft">
        {days.map((iso) => {
          const d = new Date(`${iso}T00:00:00`);
          const chosen = iso === date;
          const isToday = iso === today;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          const day = facts.get(iso);
          const lines = day ? FACTS.filter((f) => day[f.key] > 0) : [];

          return (
            <li key={iso} className="min-w-0">
              <Link
                href={href(iso)}
                aria-current={chosen ? 'date' : undefined}
                className={cn(
                  'relative flex h-full min-h-[8.5rem] flex-col gap-2 px-3 py-3 transition-colors outline-none focus-visible:bg-ws-sunk max-md:min-h-[6.5rem] max-md:items-center max-md:px-1',
                  chosen ? 'bg-[#f3f6fa]' : weekend ? 'bg-[#fbfcfd] hover:bg-[#f7f9fc]' : 'hover:bg-[#f7f9fc]'
                )}
              >
                {chosen ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-[var(--casa-ink-deep)]" /> : null}
                <span className="flex items-baseline gap-1.5 max-md:flex-col max-md:items-center max-md:gap-1">
                  <span className={cn('text-xs font-semibold', weekend ? 'text-[var(--casa-text-subtle)]' : 'text-[var(--casa-muted)]')}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span
                    className={cn(
                      'text-[1.05rem] leading-none font-extrabold tabular-nums',
                      isToday ? 'text-[var(--casa-accent-text)]' : weekend ? 'text-[var(--casa-text-subtle)]' : 'text-[var(--casa-ink)]'
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {isToday ? <span className="sr-only">Today</span> : null}
                </span>
                {lines.length ? (
                  <ul className="space-y-1">
                    {lines.slice(0, LINES).map((f) => {
                      const n = day![f.key];
                      return (
                        <li key={f.key} title={`${n} ${n === 1 ? f.one : f.many}`} className={cn('flex items-center gap-1.5 text-[0.74rem] leading-tight', f.text ?? 'text-[var(--casa-muted)]')}>
                          <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', f.dot)} />
                          <span className="truncate">
                            <b className={cn('font-bold tabular-nums', f.text ?? 'text-[var(--casa-ink)]')}>{n}</b>
                            {/* On a phone the seven days keep their dots and numbers; the chosen day's words are below. */}
                            <span className="max-md:sr-only"> {n === 1 ? f.one : f.many}</span>
                          </span>
                        </li>
                      );
                    })}
                    {lines.length > LINES ? (
                      <li className="pl-3 text-[0.72rem] text-[var(--casa-text-subtle)] max-md:pl-0">
                        +{lines.length - LINES}
                        <span className="max-md:sr-only"> more</span>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Arrow({ href, label, direction }: { href: string; label: string; direction: 'left' | 'right' }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'm6 3.5 4.5 4.5L6 12.5'} />
      </svg>
    </Link>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** The Monday of the week a day falls in; CASA's week starts on Monday. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return addDays(iso, -((d.getDay() + 6) % 7));
}
