import Link from 'next/link';

import { Card, DateText, EmptyState, PageHeader } from '@/components/admin/ui';
import { activityHref, describeActivity, recentActivity } from '@/lib/admin/activity';

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
 */
export default async function ActivityPage() {
  const entries = await recentActivity(200);

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
