import Link from 'next/link';

import { DayBoard } from './day-board/board';
import { DayNav } from './day-board/day-nav';
import { Icon } from '@/components/admin/icons';
import { Owner, RecordName } from '@/components/admin/list';
import { Received } from '@/components/admin/queue-toolbar';
import { Card } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { dayBoard, dayEvents, openTaskCountsByDate, type DayEvent } from '@/lib/admin/day-board';
import { requireModule } from '@/lib/admin/guard';
import { getAttentionItems, getOverviewCounts, getWaiting } from '@/lib/admin/overview';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * Today — the workspace's home, the screen the team opens every morning.
 *
 * It answers the day's questions in the order they get asked, and nothing
 * else. Who is waiting for an answer from us — by name, the longest wait first,
 * because a person is what a colleague acts on and a count is not. What we
 * wrote down to do. What is happening at the school today, and what is coming
 * with a date on it. The day is chosen in the head, a calendar's row of dates.
 *
 * What is deliberately NOT here: a wall of numbers (the queues' totals are one
 * quiet line under the waiting list), a yellow band for what is late (its date
 * is amber, that is enough), the fortnight trend and the newest arrivals (both
 * on Activity). A home screen people like opening is calm.
 *
 * `force-dynamic` is inherited from the workspace layout: a cached task list
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
  const holds = (module: Parameters<typeof canAccess>[1]) => canAccess(user, module);
  const isToday = date === today;

  const week = weekBounds(date);
  const [counts, waiting, attention, events, board, openCounts, staff] = await Promise.all([
    getOverviewCounts(),
    getWaiting(holds),
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
  const longDate = selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // The queues' totals, one quiet line under the waiting list — only the queues this colleague opens.
  const queues = [
    { label: 'Enquiries', count: counts.enquiriesOpen, href: '/admin/enquiries', module: 'enquiries' as const },
    { label: 'Registrations', count: counts.courseRegistrationsOpen + counts.examRegistrationsOpen, href: '/admin/registrations', module: 'registrations' as const },
    { label: 'Placement', count: counts.placementAwaitingReview, href: '/admin/placement', module: 'placement' as const },
    { label: 'Applications', count: counts.applicationsOpen, href: '/admin/applications', module: 'applications' as const },
  ].filter((q) => q.count > 0 && holds(q.module));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
            {isToday ? `${greeting}${firstName ? `, ${firstName}` : ''}` : longDate}
          </h1>
          <p className="mt-1 text-sm font-medium text-[var(--casa-muted)]">
            {isToday ? longDate : selected < now ? 'An earlier day' : 'A day ahead'}
          </p>
        </div>
        <DayNav date={date} today={today} openCounts={openCounts} />
      </header>

      {params.error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {params.error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-5">
          {isToday ? (
            <Card
              title="Waiting for an answer"
              icon={Icon.mail}
              tint="green"
              bleed
              actions={waiting.total ? <span className="text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">{waiting.total}</span> : undefined}
              footer={
                queues.length ? (
                  <nav aria-label="Queues" className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs">
                    {queues.map((q) => (
                      <Link key={q.href} href={q.href} className="font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)]">
                        {q.label} <span className="ml-0.5 text-[var(--casa-text-subtle)] tabular-nums">{q.count}</span>
                      </Link>
                    ))}
                  </nav>
                ) : undefined
              }
            >
              {waiting.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[var(--casa-text-subtle)]">Nobody is waiting for an answer.</p>
              ) : (
                <ul className="divide-y divide-ws-line-soft">
                  {waiting.items.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#f7f9fc]">
                        <span className="min-w-0 flex-1">
                          <RecordName name={item.name || 'No name'} about={item.about} />
                        </span>
                        <span className="flex w-6 shrink-0 justify-center">
                          <Owner name={item.owner} />
                        </span>
                        <span className="shrink-0 text-right text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] sm:w-24">
                          <Received at={item.since} status="new" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <DayBoard date={date} today={board.today} overdue={board.overdue} staff={staff} canWrite={canWrite} />
        </div>

        <div className="space-y-5">
          <Card title={isToday ? 'At CASA today' : 'At CASA that day'} icon={Icon.calendar} tint="blue" bleed>
            {events.length === 0 ? (
              <p className="px-5 py-5 text-sm text-[var(--casa-text-subtle)]">Nothing on the calendar.</p>
            ) : (
              EVENT_GROUPS.map(({ kind, label }) => {
                const rows = events.filter((e) => e.kind === kind);
                if (rows.length === 0) return null;
                return (
                  <section key={kind} className="border-b border-ws-line-soft last:border-b-0">
                    <h3 className="border-b border-ws-line-soft bg-[#f8fafc] px-5 pt-3 pb-2 text-xs font-bold text-[var(--casa-muted)]">
                      {label}
                      <span className="ml-1.5 font-semibold text-[var(--casa-text-subtle)]">{rows.length}</span>
                    </h3>
                    <ul className="divide-y divide-ws-line-soft">
                      {rows.map((event, index) => (
                        <li key={`${kind}-${index}`}>
                          <Link href={event.href} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#f7f9fc]">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{event.title}</span>
                              {event.detail ? (
                                <span className="block truncate text-xs text-[var(--casa-muted)]">{event.detail}</span>
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
              })
            )}
          </Card>

          {isToday && attention.length > 0 ? (
            <Card title="Coming up" icon={Icon.clock} tint="sun" bleed>
              <ul className="divide-y divide-ws-line-soft">
                {attention.map((item, index) => (
                  <li key={`${item.kind}-${index}`}>
                    <Link href={item.href} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[#f7f9fc]">
                      <DayTile on={item.on} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{item.title}</span>
                        <span className="block truncate text-xs text-[var(--casa-muted)]">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A day as a calendar leaf: the month over the date. */
function DayTile({ on }: { on: Date }) {
  return (
    <span aria-hidden="true" className="flex w-10 shrink-0 flex-col items-center overflow-hidden rounded-lg bg-white ring-1 ring-ws-line ring-inset">
      <span className="w-full bg-[#fdecee] py-0.5 text-center text-[0.6rem] leading-tight font-bold text-[#a3050f]">
        {on.toLocaleDateString('en-GB', { month: 'short' })}
      </span>
      <span className="py-1 text-[0.95rem] leading-none font-bold text-[var(--casa-ink)] tabular-nums">{on.getDate()}</span>
    </span>
  );
}

const EVENT_GROUPS: readonly { kind: DayEvent['kind']; label: string }[] = [
  { kind: 'course_start', label: 'Courses starting' },
  { kind: 'arrival', label: 'First day' },
  { kind: 'exam', label: 'Exams' },
  { kind: 'course_end', label: 'Courses ending' },
];

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
