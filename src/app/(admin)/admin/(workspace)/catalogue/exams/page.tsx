import { CatalogueTabs } from '@/components/admin/catalogue-tabs';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  Meter,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { listUpcomingExamSessions } from '@/lib/admin/catalogue';

/**
 * Exam sittings, with entries against them.
 *
 * The deadline column is the point of this screen. A telc entry cannot be filed
 * after the deadline, so a sitting with three days left and eleven of twenty
 * seats sold is a decision — chase, or hand the seats back — and it is a
 * decision nobody can make from an inbox.
 */
export default async function ExamCataloguePage() {
  const sessions = await listUpcomingExamSessions(30);

  return (
    <>
      <PageHeader
        eyebrow="School"
        title="Exams"
        description="telc sittings CASA has scheduled, and how many candidates have registered for each."
      />

      <CatalogueTabs active="exams" />

      {sessions.length === 0 ? (
        <EmptyState
          title="No exam sittings scheduled"
          description="Sittings come from the exam_sessions table. Until they are entered, the public exam pages have no dates to publish and this screen has nothing to plan against."
        />
      ) : (
        <Card bleed>
          <Table
            head={[
              'Exam',
              'Sitting',
              'Entries close',
              'Candidates',
              { label: 'Status', align: 'right' },
            ]}
          >
            {sessions.map((session) => {
              const deadline = session.registrationDeadline
                ? new Date(session.registrationDeadline)
                : null;
              const daysLeft = deadline
                ? Math.round(
                    (new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                      86_400_000
                  )
                : null;
              const closing = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const closed = daysLeft !== null && daysLeft < 0;

              return (
                <TableRow key={session.id}>
                  <Cell className="font-semibold">
                    <span className="block">{session.examCode}</span>
                    <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                      {session.examName}
                      {session.level ? ` · ${session.level}` : ''}
                    </span>
                  </Cell>
                  <Cell className="text-sm text-[var(--casa-muted)]">
                    <DateText value={session.startsAt} withTime />
                  </Cell>
                  <Cell className="text-sm">
                    {deadline ? (
                      <>
                        <DateText value={deadline} />
                        <span
                          className={
                            closing
                              ? 'mt-0.5 block text-xs font-semibold text-[var(--casa-warning-text)]'
                              : 'mt-0.5 block text-xs text-[var(--casa-text-subtle)]'
                          }
                        >
                          {closed ? 'closed' : daysLeft === 0 ? 'today' : `${daysLeft} days left`}
                        </span>
                      </>
                    ) : (
                      <span className="text-[var(--casa-text-subtle)]">not set</span>
                    )}
                  </Cell>
                  <Cell className="w-40">
                    <span className="mb-1.5 block text-sm">
                      {session.registrationCount}
                      <span className="text-[var(--casa-text-subtle)]">
                        {' / '}
                        {session.capacity || '?'}
                      </span>
                    </span>
                    <Meter
                      value={session.registrationCount}
                      max={session.capacity || session.registrationCount || 1}
                      label={`${session.registrationCount} of ${session.capacity} places taken`}
                      tone={closing ? 'warning' : 'accent'}
                    />
                  </Cell>
                  <Cell align="right">
                    <Badge tone={closed ? 'quiet' : closing ? 'warning' : 'neutral'}>
                      {closed ? 'Entries closed' : session.status}
                    </Badge>
                  </Cell>
                </TableRow>
              );
            })}
          </Table>
        </Card>
      )}
    </>
  );
}
