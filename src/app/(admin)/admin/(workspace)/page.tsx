import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import {
  Badge,
  Card,
  DateText,
  EmptyState,
  StatBand,
  relativeDays,
} from '@/components/admin/ui';
import { describeActivity, activityHref, recentActivity } from '@/lib/admin/activity';
import { getStaffUser } from '@/lib/admin/auth';
import {
  getAttentionItems,
  getInboundByDay,
  getOverviewCounts,
  getRecentInbound,
} from '@/lib/admin/overview';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';

/**
 * The overview.
 *
 * It answers one question — *is anything waiting on me?* — and then gets out of
 * the way. Everything on this screen is either a backlog you can act on or
 * something with a deadline attached; there is no metric here for its own sake,
 * because a number nobody acts on trains people to stop reading the ones that
 * matter.
 *
 * Note what is NOT here: learner totals, countries represented, booking counts.
 * Those are the public site's reviewed aggregate claims under CLAUDE.md rule 1,
 * they change once a quarter, and they answer a marketing question rather than
 * a Tuesday-morning one.
 */
export default async function OverviewPage() {
  const user = await getStaffUser();

  const [counts, attention, inbound, recent, activity] = await Promise.all([
    getOverviewCounts(),
    getAttentionItems(),
    getInboundByDay(14),
    getRecentInbound(8),
    recentActivity(6),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name ?? '').split(/\s+/)[0];

  const totalWaiting =
    counts.enquiriesOpen +
    counts.courseRegistrationsOpen +
    counts.examRegistrationsOpen +
    counts.applicationsOpen +
    counts.placementAwaitingReview;

  const weekDelta = counts.inboundThisWeek - counts.inboundPreviousWeek;

  return (
    <div className="space-y-9">
      <header>
        <p className="text-sm text-[var(--casa-text-subtle)]">
          {now.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl leading-[1.06] tracking-[-0.02em]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--casa-text-subtle)]">
          {totalWaiting === 0
            ? 'Nothing is waiting on anyone. Every queue is clear.'
            : `${totalWaiting} ${totalWaiting === 1 ? 'record is' : 'records are'} open across the queues. The oldest and the most time-sensitive are below.`}
        </p>
      </header>

      <StatBand
        items={[
          {
            label: 'Enquiries',
            value: counts.enquiriesOpen,
            hint:
              counts.enquiriesNew > 0
                ? `${counts.enquiriesNew} not yet read`
                : 'all read',
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
            label: 'Applications',
            value: counts.applicationsOpen,
            hint: 'open in the pipeline',
            href: '/admin/applications',
            alert: true,
          },
        ]}
      />

      {attention.length > 0 ? (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-[0.65rem] font-bold tracking-eyebrow uppercase text-[var(--casa-warning-text)]">
            <span aria-hidden="true">{Icon.attention}</span>
            Time-sensitive
          </h2>
          <ul className="divide-y divide-ws-line overflow-hidden rounded-xl border border-ws-line bg-white">
            {attention.map((item, index) => (
              <li key={`${item.kind}-${index}`}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm transition-colors hover:bg-ws-sunk"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-[var(--casa-text-subtle)]">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card
          title="Just arrived"
          description="The newest records across all four queues."
          actions={
            <Link
              href="/admin/enquiries"
              className="text-xs font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
            >
              All enquiries →
            </Link>
          }
          bleed
        >
          {recent.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState
                title="Nothing has come in yet"
                description="Enquiries, registrations, placement attempts and job applications from the public site all land here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-ws-line-soft">
              {recent.map((item) => {
                const status = normaliseStatus(item.status);

                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ws-sunk/70"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.name || 'No name given'}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--casa-text-subtle)]">
                          {KIND_LABELS[item.kind]} · {item.summary}
                        </span>
                      </span>
                      <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                      <span className="w-24 shrink-0 text-right text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={item.at} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card
            title="Inbound"
            description="Everything the public site sent us, per day for a fortnight."
          >
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

          <Card title="Recent changes">
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">
                Nothing has been worked yet. Status changes, assignments and
                notes appear here against the name of whoever made them.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {activity.map((entry) => {
                  const href = activityHref(entry);
                  const line = (
                    <>
                      <span className="font-semibold text-[var(--casa-ink)]">
                        {entry.staffName ?? 'Someone'}
                      </span>{' '}
                      {describeActivity(entry)}
                      <span className="text-[var(--casa-text-subtle)]">
                        {' · '}
                        {relativeDays(entry.createdAt)}
                      </span>
                    </>
                  );

                  return (
                    <li key={entry.id} className="text-xs leading-relaxed text-[var(--casa-muted)]">
                      {href ? (
                        <Link href={href} className="hover:text-[var(--casa-accent-text)]">
                          {line}
                        </Link>
                      ) : (
                        line
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const KIND_LABELS = {
  enquiry: 'Enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  application: 'Application',
} as const;

/**
 * A fortnight of inbound volume as bars.
 *
 * Drawn as divs, not an SVG chart and certainly not a charting library. It is
 * fourteen values with no axis, no tooltip and no legend; the entire point is
 * peripheral — "was this week busier than last" — and every library that could
 * draw it would ship more JavaScript than the whole page.
 *
 * The scale is the fortnight's own maximum, with a floor of 4 so a single
 * enquiry on a quiet week does not render as a full-height bar and imply a
 * record day.
 */
function InboundChart({ days }: { days: readonly { day: Date; count: number }[] }) {
  const peak = Math.max(4, ...days.map((d) => d.count));

  return (
    <div className="flex h-24 items-end gap-1.5" role="img" aria-label={inboundSummary(days)}>
      {days.map((entry) => {
        const share = entry.count / peak;
        const isToday = new Date(entry.day).toDateString() === new Date().toDateString();

        return (
          <div
            key={new Date(entry.day).toISOString()}
            /*
             * `self-stretch`, not just `flex-1`. The row is `items-end`, which
             * shrinks every column to its own content — so the inner `h-full`
             * resolved against the height of the weekday label and every bar
             * rendered at zero. Caught by looking at it, not by the types.
             */
            className="flex flex-1 flex-col items-center gap-1.5 self-stretch"
          >
            <div className="flex min-h-0 w-full flex-1 items-end">
              {entry.count === 0 ? (
                // A zero day gets a hairline on the baseline rather than
                // nothing, so the fortnight still reads as fourteen days.
                <div className="h-px w-full rounded-full bg-ws-line-firm" />
              ) : (
                <div
                  className={
                    isToday
                      ? 'w-full rounded-t-sm bg-[var(--casa-ink-deep)]'
                      : 'w-full rounded-t-sm bg-[var(--casa-blue)]/55'
                  }
                  style={{ height: `${Math.max(share * 100, 6)}%` }}
                />
              )}
            </div>
            <span className="text-[0.6rem] text-[var(--casa-text-subtle)]">
              {new Date(entry.day).toLocaleDateString('en-GB', { weekday: 'narrow' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function inboundSummary(days: readonly { day: Date; count: number }[]): string {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return `${total} records received over the last ${days.length} days.`;
}
