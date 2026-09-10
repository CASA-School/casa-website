import Link from 'next/link';

import { DayBoard } from './day-board/board';
import { DayNav } from './day-board/day-nav';
import { Icon } from '@/components/admin/icons';
import { Badge, Card, StatBand } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { dayBoard, dayEvents, openTaskCountsByDate, type DayEvent } from '@/lib/admin/day-board';
import { requireModule } from '@/lib/admin/guard';
import { getAttentionItems, getOverviewCounts } from '@/lib/admin/overview';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * Today — the workspace's home, and the screen the administration team opens
 * every morning.
 *
 * It answers a day's three questions in the order they get asked: what is
 * waiting on us, what have we written down for today, and what is actually
 * happening. FileMaker's home screen is the same idea — a day-by-day
 * operations calendar — which is why the team will recognise this one.
 *
 * What is deliberately NOT here: the fortnight trend and the newest inbound
 * records. Both look backwards, and both now live on Activity. A daily screen
 * that also carries last week's chart is a screen nobody reads twice.
 *
 * `force-dynamic` is inherited from the workspace layout: a cached day board
 * that still shows a finished task is worse than a slow one.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('overview')]);

  const now = new Date();
  const today = toIso(now);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : today;
  const canWrite = canAccess(user, 'overview', 'edit');

  const week = weekBounds(date);
  const [counts, attention, events, board, openCounts, staff] = await Promise.all([
    getOverviewCounts(),
    getAttentionItems(),
    dayEvents(date),
    dayBoard(date),
    openTaskCountsByDate(week.from, week.to),
    canWrite ? listAssignableStaff() : Promise.resolve([]),
  ]);

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name ?? '').split(/\s+/)[0];
  const selected = new Date(`${date}T00:00:00`);
  const isToday = date === today;

  const totalWaiting =
    counts.enquiriesOpen +
    counts.courseRegistrationsOpen +
    counts.examRegistrationsOpen +
    counts.placementAwaitingReview;

  const openToday = board.today.filter((t) => !t.doneAt).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[var(--casa-text-subtle)]">
          {selected.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl leading-[1.06] tracking-[-0.02em]">
          {isToday ? (
            <>
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </>
          ) : (
            selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
          )}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--casa-text-subtle)]">
          {summarise({ isToday, openToday, totalWaiting, events: events.length })}
        </p>
      </header>

      <DayNav date={date} today={today} openCounts={openCounts} />

      {params.error ? (
        <p
          role="alert"
          className="rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {params.error}
        </p>
      ) : null}

      <StatBand
        items={[
          {
            label: 'Enquiries',
            value: counts.enquiriesOpen,
            hint: counts.enquiriesNew > 0 ? `${counts.enquiriesNew} not yet read` : 'all read',
            href: '/admin/enquiries',
            alert: true,
          },
          {
            label: 'Registrations',
            value: counts.courseRegistrationsOpen + counts.examRegistrationsOpen,
            hint: `${counts.courseRegistrationsOpen} course · ${counts.examRegistrationsOpen} exam`,
            href: '/admin/registrations',
            alert: true,
          },
          {
            label: 'Placement reviews',
            value: counts.placementAwaitingReview,
            hint:
              counts.placementInProgress > 0
                ? `${counts.placementInProgress} still testing`
                : 'awaiting a teacher',
            href: '/admin/placement',
            alert: true,
          },
          {
            label: 'Open tasks today',
            value: openToday,
            hint:
              board.overdue.length > 0
                ? `${board.overdue.length} left from earlier`
                : 'nothing overdue',
            alert: true,
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <DayBoard
          date={date}
          today={board.today}
          overdue={board.overdue}
          staff={staff}
          canWrite={canWrite}
        />

        <div className="space-y-5">
          <Card title={isToday ? 'Happening today' : 'Happening that day'}>
            {events.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">
                No courses, exams or arrivals on this day.
              </p>
            ) : (
              <div className="space-y-4">
                {EVENT_GROUPS.map(({ kind, label }) => {
                  const rows = events.filter((e) => e.kind === kind);
                  if (rows.length === 0) return null;
                  return (
                    <section key={kind}>
                      <h3 className="mb-1.5 flex items-baseline gap-2 text-xs font-semibold text-[var(--casa-ink)]">
                        {label}
                        <span className="font-normal text-[var(--casa-text-subtle)]">
                          {rows.length}
                        </span>
                      </h3>
                      <ul className="space-y-1">
                        {rows.map((event, index) => (
                          <li key={`${kind}-${index}`}>
                            <Link
                              href={event.href}
                              className="-mx-1.5 flex items-baseline justify-between gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-ws-sunk"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm">{event.title}</span>
                                {event.detail ? (
                                  <span className="block truncate text-xs text-[var(--casa-text-subtle)]">
                                    {event.detail}
                                  </span>
                                ) : null}
                              </span>
                              {kind !== 'arrival' && event.count > 0 ? (
                                <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">
                                  {event.count} {event.count === 1 ? 'learner' : 'learners'}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Coming up"
            actions={
              attention.length > 0 ? <Badge tone="warning">{attention.length}</Badge> : undefined
            }
          >
            {attention.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">Nothing with a deadline.</p>
            ) : (
              <ul className="space-y-1">
                {attention.map((item, index) => (
                  <li key={`${item.kind}-${index}`}>
                    <Link
                      href={item.href}
                      className="-mx-1.5 flex items-baseline justify-between gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-ws-sunk"
                    >
                      <span className="min-w-0 truncate text-sm">{item.title}</span>
                      <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">
                        {item.detail}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {counts.applicationsOpen > 0 && canAccess(user, 'applications') ? (
            <Card title="Job applications">
              <Link
                href="/admin/applications"
                className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--casa-accent-text)] transition-colors hover:text-[var(--casa-accent-text-hover)]"
              >
                {counts.applicationsOpen} open in the pipeline
                <span aria-hidden="true">{Icon.chevronRight}</span>
              </Link>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EVENT_GROUPS: readonly { kind: DayEvent['kind']; label: string }[] = [
  { kind: 'course_start', label: 'Courses starting' },
  { kind: 'arrival', label: 'First day' },
  { kind: 'exam', label: 'Exams' },
  { kind: 'course_end', label: 'Courses ending' },
];

function summarise({
  isToday,
  openToday,
  totalWaiting,
  events,
}: {
  isToday: boolean;
  openToday: number;
  totalWaiting: number;
  events: number;
}): string {
  const parts: string[] = [];
  if (openToday > 0) {
    parts.push(`${openToday} ${openToday === 1 ? 'task' : 'tasks'} on the board`);
  }
  if (events > 0) {
    parts.push(`${events} ${events === 1 ? 'thing' : 'things'} in the calendar`);
  }
  if (parts.length === 0) {
    return isToday
      ? 'Nothing written down for today, and nothing in the calendar.'
      : 'Nothing written down for this day.';
  }
  const waiting = totalWaiting > 0 ? ` ${totalWaiting} records are waiting across the queues.` : '';
  return `${capitalise(parts.join(', '))}.${waiting}`;
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday to Sunday of the week containing `date`, for the strip's dots. */
function weekBounds(date: string): { from: string; to: string } {
  const d = new Date(`${date}T00:00:00`);
  const monday = new Date(d);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { from: toIso(monday), to: toIso(sunday) };
}
