import Link from 'next/link';

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
import { activityHref, describeActivity, recentActivity } from '@/lib/admin/activity';
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
 */
export default async function ActivityPage() {
  const [entries, recent, inbound, counts] = await Promise.all([
    recentActivity(200),
    getRecentInbound(8),
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
        eyebrow="Administration"
        title="Activity"
        description="Every status change, assignment, note and placement decision, against the name of whoever made it."
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <Card title="Just arrived" bleed>
          {recent.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState
                title="Nothing has come in yet"
                description="Enquiries, registrations, placement attempts and job applications from the public site all land here."
              />
            </div>
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

        <Card title="Inbound, last fortnight">
          <InboundChart days={inbound} />
          <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs text-[var(--casa-text-subtle)]">
            <span className="font-semibold text-[var(--casa-ink)]">
              {counts.inboundThisWeek} this week
            </span>
            {' · '}
            {weekDelta === 0
              ? 'level with the week before'
              : `${Math.abs(weekDelta)} ${weekDelta > 0 ? 'more' : 'fewer'} than the week before`}
          </p>
        </Card>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing has been worked yet"
          description="The trail starts the first time someone changes a status, takes ownership of a record or writes a note."
        />
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, dayEntries]) => (
            <Card
              key={day}
              title={
                <span className="flex items-baseline gap-2">
                  <DateText value={new Date(day)} />
                  <span className="font-[family-name:var(--font-sans)] text-xs font-normal text-[var(--casa-text-subtle)]">
                    {dayEntries.length} {dayEntries.length === 1 ? 'change' : 'changes'}
                  </span>
                </span>
              }
              bleed
            >
              <ul className="divide-y divide-ws-line-soft">
                {dayEntries.map((entry) => {
                  const href = activityHref(entry);
                  const time = new Date(entry.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const line = (
                    <span className="flex items-baseline gap-3 px-5 py-2.5 text-sm">
                      <span className="w-11 shrink-0 text-xs text-[var(--casa-text-subtle)]">
                        {time}
                      </span>
                      <span className="min-w-0 flex-1 text-[var(--casa-muted)]">
                        <span className="font-semibold text-[var(--casa-ink)]">
                          {entry.staffName ?? 'Someone'}
                        </span>{' '}
                        {describeActivity(entry)}
                      </span>
                    </span>
                  );

                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link href={href} className="block transition-colors hover:bg-ws-sunk/70">
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

const INBOUND_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  application: 'Job application',
};
