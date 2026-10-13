import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { InboundChart } from '@/components/admin/inbound-chart';
import { Avatar, ListEmpty, RecordName, Status } from '@/components/admin/list';
import { Card, Cell, PageHeader, relativeDays, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityHref, describeActivity, recentActivity, type ActivityEntry } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { getInboundByDay, getOverviewCounts, getRecentInbound } from '@/lib/admin/overview';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { cn } from '@/lib/utils';

/**
 * The full activity trail, as one feed.
 *
 * This screen exists to answer one question that FileMaker could not: *who
 * changed this, and when?* Not for surveillance — for the far more common case
 * of two people working the same queue and needing to know whether a lead has
 * already been answered.
 *
 * Grouped by day, because "what happened on Tuesday" is how people actually
 * ask. A flat list of 200 timestamps is technically the same information and
 * useless for that question. One card, a quiet header per day, and each line
 * a sentence with the colleague's initials beside it and the time at the
 * right (docs/ADMIN_WORKSPACE.md §Lists).
 *
 * It also carries the two backward-looking panels that used to sit on the home
 * screen — what arrived most recently, and the fortnight's volume. Today is for
 * the day in front of you; this screen is the record of what has already
 * happened, and those two belong with the trail rather than above it.
 *
 * Activity is open to every colleague; job applications are not. Applicants'
 * names, and every link into an application, appear here only for someone who
 * holds the Applications module. The volume chart and counts stay whole: a
 * number is not a person.
 */
export default async function ActivityPage() {
  const user = await requireModule('activity');
  const includeApplications = canAccess(user, 'applications');

  const [entries, recent, inbound, counts] = await Promise.all([
    recentActivity(200, { includeApplications }),
    getRecentInbound(8, { includeApplications }),
    getInboundByDay(14),
    getOverviewCounts(),
  ]);

  const weekDelta = counts.inboundThisWeek - counts.inboundPreviousWeek;

  const byDay = new Map<string, typeof entries>();

  for (const entry of entries) {
    const key = new Date(entry.createdAt).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }

  return (
    <>
      <PageHeader
        title="Activity"
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title="Just arrived" icon={Icon.enquiries} tint="ink" bleed>
          {recent.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--casa-text-subtle)]">Nothing has come in yet.</p>
          ) : (
            <Table
              head={[
                'From',
                { label: 'Status', className: 'hidden w-[8.5rem] md:table-cell' },
                { label: 'Received', className: 'w-[7.5rem]' },
              ]}
            >
              {recent.map((item) => {
                const status = normaliseStatus(item.status);
                return (
                  <TableRow key={`${item.kind}-${item.id}`} interactive>
                    <Cell href={item.href} className="max-w-0">
                      <RecordName
                        name={item.name || 'No name given'}
                        about={[INBOUND_LABELS[item.kind], item.summary].filter(Boolean).join(' · ')}
                      />
                    </Cell>
                    <Cell className="hidden md:table-cell">
                      <Status tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Status>
                    </Cell>
                    <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                      {capitalise(relativeDays(item.at))}
                    </Cell>
                  </TableRow>
                );
              })}
            </Table>
          )}
        </Card>

        <Card
          title="Inbound, last fortnight"
          icon={Icon.overview}
          tint="blue"
          footer={
            <p className="text-xs text-[var(--casa-text-subtle)]">
              <span className="font-semibold text-[var(--casa-ink)]">
                {counts.inboundThisWeek} this week
              </span>
              {' · '}
              {weekDelta === 0
                ? 'level with the week before'
                : `${Math.abs(weekDelta)} ${weekDelta > 0 ? 'more' : 'fewer'} than the week before`}
            </p>
          }
        >
          <InboundChart days={inbound} />
        </Card>
      </div>

      <Card bleed>
        {entries.length === 0 ? (
          <ListEmpty title="Nothing has been worked yet" />
        ) : (
          [...byDay.entries()].map(([day, dayEntries], index) => (
            <section key={day} aria-label={dayLabel(new Date(day))}>
              <h2
                className={cn(
                  'bg-[#f8fafc] px-5 pt-3 pb-2 text-xs font-bold text-[var(--casa-muted)]',
                  index > 0 && 'border-t border-ws-line-soft'
                )}
              >
                {dayLabel(new Date(day))}
                <span className="ml-1.5 font-semibold text-[var(--casa-text-subtle)] tabular-nums">{dayEntries.length}</span>
              </h2>
              <ul className="divide-y divide-ws-line-soft border-t border-ws-line-soft">
                {runsOf(dayEntries).map(({ entry, count, earliest }) => {
                  const href = activityHref(entry);
                  const time = clock(entry.createdAt);
                  const from = clock(earliest);
                  const who = entry.staffName ?? 'Someone';

                  const line = (
                    <span className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar name={who} staff size="sm" />
                      <span className="min-w-0 flex-1 text-[0.875rem] text-[#2b3546]">
                        <span className="font-semibold text-[var(--casa-ink)]">{who}</span> {describeActivity(entry)}
                        {count > 1 ? (
                          <span className="ml-2 text-xs whitespace-nowrap text-[var(--casa-text-subtle)]">
                            {count} times{from !== time ? `, from ${from}` : ''}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 self-start pt-0.5 text-xs text-[var(--casa-text-subtle)] tabular-nums">{time}</span>
                    </span>
                  );

                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link href={href} className="block transition-colors hover:bg-[#f7f9fc]">
                          {line}
                        </Link>
                      ) : (
                        line
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Card>
    </>
  );
}

/**
 * The same thing done again and again in a row — a week saved four times in
 * Kursplanung — is one line with how often, not four: the newest, counted.
 */
function runsOf(entries: readonly ActivityEntry[]) {
  const runs: { entry: ActivityEntry; count: number; earliest: Date | string }[] = [];
  const same = (a: ActivityEntry, b: ActivityEntry) =>
    a.staffName === b.staffName && a.entity === b.entity && a.entityId === b.entityId && describeActivity(a) === describeActivity(b);
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last && same(last.entry, entry)) {
      last.count += 1;
      last.earliest = entry.createdAt;
    } else runs.push({ entry, count: 1, earliest: entry.createdAt });
  }
  return runs;
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const clock = (at: Date | string) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** "Today", "Yesterday", "Tue 6 Oct"; the year only when it is not this one. */
function dayLabel(day: Date): string {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(day).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return day.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

const INBOUND_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  application: 'Job application',
};
