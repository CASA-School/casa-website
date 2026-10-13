import { Badge, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { Icon } from '@/components/admin/icons';
import { listUpcomingExamSessions } from '@/lib/admin/catalogue';
import {
  groupRuns,
  MonthCell,
  monthEdge,
  monthKey,
  monthLabel,
  OpenTable,
  SeatLine,
  sentenceCase,
  shortDate,
} from '../list-parts';

/**
 * Exam sittings, with entries against them.
 *
 * The deadline column is the point of this screen. A telc entry cannot be filed
 * after the deadline, so a sitting with three days left and eleven of twenty
 * seats sold is a decision — chase, or hand the seats back — and it is a
 * decision nobody can make from an inbox.
 *
 * The month of the sitting has a column of its own, as on Courses. The days
 * left are named only when they are near (a month or less) and turn amber in
 * the last week; a status badge appears only for a sitting that is not simply
 * scheduled, and a level only when the exam's name does not already say it.
 */
export default async function ExamCataloguePage() {
  const sessions = await listUpcomingExamSessions(30);
  const months = groupRuns(sessions, (session) => monthKey(session.startsAt));
  const today = new Date().setHours(0, 0, 0, 0);
  const subtle = 'text-[var(--casa-text-subtle)]';

  return (
    <>
      <PageHeader
        title="Exams"
        description="The telc sittings CASA has scheduled, and who has registered for each."
      />

      {sessions.length === 0 ? (
        <EmptyState title="No exam sittings scheduled" description="Nothing is dated yet." />
      ) : (
        <Card title="Upcoming sittings" icon={Icon.calendar} tint="blue" bleed>
          <OpenTable
            head={[
              { label: 'Month', className: 'w-24' },
              { label: 'Exam' },
              { label: 'Sitting' },
              { label: 'Entries close' },
              { label: 'Candidates', className: 'w-56' },
            ]}
          >
            {months.flatMap((month) =>
              month.items.map((session, index) => {
                const startsAt = new Date(session.startsAt);
                const deadline = session.registrationDeadline
                  ? new Date(session.registrationDeadline)
                  : null;
                const daysLeft = deadline
                  ? Math.round((new Date(deadline).setHours(0, 0, 0, 0) - today) / 86_400_000)
                  : null;
                const closing = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                const closed = daysLeft !== null && daysLeft < 0;
                // Most exam names carry the level ("telc Deutsch B2"); say it only when not.
                const level =
                  session.level && !session.examName.includes(session.level) ? session.level : null;

                return (
                  <tr key={session.id} className={monthEdge(index === month.items.length - 1)}>
                    <MonthCell label={index === 0 ? monthLabel(month.key) : null} />
                    <td className="px-4 py-2.5 align-middle font-semibold text-[var(--casa-ink)]">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {session.examName}
                        {session.status !== 'scheduled' ? (
                          <Badge tone={session.status === 'cancelled' ? 'danger' : 'neutral'}>
                            {sentenceCase(session.status)}
                          </Badge>
                        ) : null}
                      </span>
                      {level ? <span className={`block text-xs font-normal ${subtle}`}>{level}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 align-middle text-sm whitespace-nowrap text-[var(--casa-muted)]">
                      <time dateTime={startsAt.toISOString()}>
                        {shortDate(startsAt, { weekday: true })}
                        <span className={subtle}>
                          {' · '}
                          {startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </time>
                    </td>
                    <td className="px-4 py-2.5 align-middle text-sm whitespace-nowrap">
                      {deadline ? (
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className={closed ? subtle : 'text-[var(--casa-ink)]'}>
                            {shortDate(deadline)}
                          </span>
                          {closed ? (
                            <span className={`text-xs ${subtle}`}>Closed</span>
                          ) : daysLeft !== null && daysLeft <= 30 ? (
                            <span
                              className={
                                closing
                                  ? 'text-xs font-semibold text-[var(--casa-warning-text)]'
                                  : `text-xs ${subtle}`
                              }
                            >
                              {daysLeft === 0
                                ? 'Today'
                                : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className={subtle}>Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-middle">
                      <SeatLine
                        taken={session.registrationCount}
                        capacity={session.capacity}
                        label={`${session.registrationCount} of ${session.capacity} places taken`}
                        warn={closing}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </OpenTable>
        </Card>
      )}
    </>
  );
}
