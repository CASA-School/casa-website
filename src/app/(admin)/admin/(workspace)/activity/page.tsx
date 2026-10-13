import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { InboundChart } from '@/components/admin/inbound-chart';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityHref, describeActivity, recentActivity, type ActivityEntry } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { getInboundByDay, getOverviewCounts, getRecentInbound } from '@/lib/admin/overview';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';

/**
 * The full activity trail.
 *
 * This screen exists to answer one question that FileMaker could not: *who
 * changed this, and when?* Not for surveillance — for the far more common case
 * of two people working the same queue and needing to know whether a lead has
 * already been answered.
 *
 * Grouped by day, because "what happened on Tuesday" is how people actually
 * ask. A flat list of 200 timestamps is technically the same information and
 * useless for that question.
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
        description="Who changed what, and when."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title="Just arrived" icon={Icon.enquiries} tint="ink" bleed>
          {recent.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[var(--casa-text-subtle)]">Nothing has come in yet.</p>
          ) : (
            <Table head={['Name', 'What', 'Status', { label: 'Received', align: 'right' }]}>
              {recent.map((item) => {
                const status = normaliseStatus(item.status);
                return (
                  <TableRow key={`${item.kind}-${item.id}`} interactive>
                    <Cell href={item.href} className="font-semibold">
                      {item.name || 'No name given'}
                    </Cell>
                    <Cell className="text-sm text-[var(--casa-text-subtle)]">
                      <span className="block truncate">
                        {INBOUND_LABELS[item.kind]} · {item.summary}
                      </span>
                    </Cell>
                    <Cell>
                      <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                    </Cell>
                    <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                      <DateText value={item.at} compact />
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

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing has been worked yet"
          description="Status changes, owners and notes appear here."
        />
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, dayEntries]) => (
            <Card
              key={day}
              icon={Icon.calendar}
              tint="blue"
              title={
                <span className="flex items-baseline gap-2">
                  <DateText value={new Date(day)} />
                  <span className="text-xs font-semibold text-[var(--casa-text-subtle)]">
                    {dayEntries.length} {dayEntries.length === 1 ? 'change' : 'changes'}
                  </span>
                </span>
              }
              bleed
            >
              <ul className="divide-y divide-ws-line-soft">
                {runsOf(dayEntries).map(({ entry, count, earliest }) => {
                  const href = activityHref(entry);
                  const clock = (at: Date | string) =>
                    new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const time = clock(entry.createdAt);
                  const from = clock(earliest);

                  const line = (
                    <span className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                      <span className="w-11 shrink-0 text-xs text-[var(--casa-text-subtle)] tabular-nums">
                        {time}
                      </span>
                      <span className="min-w-0 flex-1 text-[var(--casa-muted)]">
                        <span className="font-semibold text-[var(--casa-ink)]">
                          {entry.staffName ?? 'Someone'}
                        </span>{' '}
                        {describeActivity(entry)}
                        {count > 1 ? (
                          <span className="ml-2 text-xs text-[var(--casa-text-subtle)]">
                            {count} times{from !== time ? `, from ${from}` : ''}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  );

                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link href={href} className="block transition-colors hover:bg-[#f6f9fc]">
                          {line}
                        </Link>
                      ) : (
                        line
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
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

const INBOUND_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  application: 'Job application',
};
