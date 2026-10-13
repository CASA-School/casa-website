import { ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, Card, PageHeader } from '@/components/admin/ui';
import { listUpcomingExamSessions } from '@/lib/admin/catalogue';
import { groupRuns, monthKey, monthLabel, openCell, OpenTable, SeatLine, sentenceCase, shortDate } from '../list-parts';

/**
 * Exam sittings, with entries against them.
 *
 * The deadline column is the point of this screen. A telc entry cannot be filed
 * after the deadline, so a sitting with three days left and eleven of twenty
 * seats sold is a decision — chase, or hand the seats back — and it is a
 * decision nobody can make from an inbox.
 *
 * The sittings group by month, as on Courses (docs/ADMIN_WORKSPACE.md §Lists).
 * The days left are named only when they are near (a month or less) and turn
 * amber in the last week; a status badge appears only for a sitting that is
 * not simply scheduled, and a level only when the exam's name does not
 * already say it.
 */
export default async function ExamCataloguePage() {
  const sessions = await listUpcomingExamSessions(30);
  const months = groupRuns(sessions, (session) => monthKey(session.startsAt));
  const today = new Date().setHours(0, 0, 0, 0);
  const subtle = 'text-[var(--casa-text-subtle)]';
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader title="Exams" />

      <Card bleed>
        {sessions.length === 0 ? (
          <ListEmpty title="No sittings scheduled" />
        ) : (
          <OpenTable
            head={[
              { label: 'Exam' },
              { label: 'Sitting', className: 'w-px md:w-[11rem]' },
              { label: 'Entries close', className: `w-[12rem] ${hide}` },
              { label: 'Candidates', className: `w-[13rem] ${hide}` },
            ]}
          >
            {months.flatMap((month) => [
              <ListGroup key={month.key} label={monthLabel(month.key)} count={month.items.length} span={4} />,
              ...month.items.map((session) => {
                const startsAt = new Date(session.startsAt);
                const deadline = session.registrationDeadline ? new Date(session.registrationDeadline) : null;
                const daysLeft = deadline
                  ? Math.round((new Date(deadline).setHours(0, 0, 0, 0) - today) / 86_400_000)
                  : null;
                const closing = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                const closed = daysLeft !== null && daysLeft < 0;
                // Most exam names carry the level ("telc Deutsch B2"); say it only when not.
                const level = session.level && !session.examName.includes(session.level) ? session.level : null;

                return (
                  <tr key={session.id}>
                    <td className={`${openCell} py-3.5 md:max-w-0`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[0.9rem] font-semibold text-[var(--casa-ink)] md:truncate">
                          {session.examName}
                        </span>
                        {session.status !== 'scheduled' ? (
                          <Badge tone={session.status === 'cancelled' ? 'danger' : 'neutral'}>
                            {sentenceCase(session.status)}
                          </Badge>
                        ) : null}
                      </span>
                      {level ? <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">{level}</span> : null}
                    </td>
                    <td className={`${openCell} py-3.5 text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums`}>
                      <time dateTime={startsAt.toISOString()}>
                        {shortDate(startsAt, { weekday: true })}
                        <span className={subtle}>
                          {' · '}
                          {startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </time>
                    </td>
                    <td className={`${openCell} py-3.5 text-[0.84rem] whitespace-nowrap tabular-nums ${hide}`}>
                      {deadline ? (
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className={closed ? subtle : 'text-[#2b3546]'}>{shortDate(deadline)}</span>
                          {closed ? (
                            <span className={`text-xs ${subtle}`}>Closed</span>
                          ) : daysLeft !== null && daysLeft <= 30 ? (
                            <span className={closing ? 'text-xs font-semibold text-[#9a5b00]' : `text-xs ${subtle}`}>
                              {daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </td>
                    <td className={`${openCell} py-3.5 ${hide}`}>
                      <SeatLine
                        taken={session.registrationCount}
                        capacity={session.capacity}
                        label={`${session.registrationCount} of ${session.capacity} places taken`}
                        warn={closing}
                      />
                    </td>
                  </tr>
                );
              }),
            ])}
          </OpenTable>
        )}
      </Card>
    </>
  );
}
