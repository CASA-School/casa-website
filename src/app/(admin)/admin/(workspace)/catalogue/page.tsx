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
import { listCourseTypes, listUpcomingCourseInstances } from '@/lib/admin/catalogue';

/**
 * Courses, with live demand against them.
 *
 * READ-ONLY, DELIBERATELY. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` is the
 * current authority on every price and hour count on this screen, verified
 * against casa-bremen.de and carrying an explicit list of what is still
 * unverified. An edit form here before that reconciliation would let the
 * workspace quietly contradict the published facts, and the contradiction would
 * surface as a wrong price on a course page.
 *
 * What the workspace adds is the one thing the source of truth cannot hold:
 * how many people have actually registered for the cohort starting in ten days.
 */
export default async function CataloguePage() {
  const [types, instances] = await Promise.all([
    listCourseTypes(),
    listUpcomingCourseInstances(20),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Courses"
        description="What CASA publishes, and how many people have registered against each dated option."
      />

      <CatalogueTabs active="courses" />

      <div className="space-y-5">
        <Card
          title="Upcoming cohorts"
          description="Seats taken against capacity. A registration counts here as soon as it arrives, before staff confirm it."
          bleed
        >
          {instances.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState
                title="No cohorts scheduled"
                description="Course instances come from the course_instances table. Seed or import them before staff can plan against this screen."
              />
            </div>
          ) : (
            <Table
              head={[
                'Course',
                'Runs',
                'Location',
                'Seats',
                { label: 'Status', align: 'right' },
              ]}
            >
              {instances.map((instance) => {
                const full = instance.capacity > 0 && instance.registrationCount >= instance.capacity;
                const nearlyFull =
                  instance.capacity > 0 &&
                  !full &&
                  instance.registrationCount / instance.capacity >= 0.8;

                return (
                  <TableRow key={instance.id}>
                    <Cell className="font-semibold">{instance.courseTypeName}</Cell>
                    <Cell className="text-sm text-[var(--casa-muted)]">
                      <DateText value={instance.startDate} /> —{' '}
                      <DateText value={instance.endDate} />
                    </Cell>
                    <Cell className="text-sm text-[var(--casa-text-subtle)]">
                      {instance.location ?? '—'}
                    </Cell>
                    <Cell className="w-40">
                      <span className="mb-1.5 block text-sm">
                        {instance.registrationCount}
                        <span className="text-[var(--casa-text-subtle)]">
                          {' / '}
                          {instance.capacity || '?'}
                        </span>
                      </span>
                      <Meter
                        value={instance.registrationCount}
                        max={instance.capacity || instance.registrationCount || 1}
                        label={`${instance.registrationCount} of ${instance.capacity} seats taken`}
                        tone={full || nearlyFull ? 'warning' : 'accent'}
                      />
                    </Cell>
                    <Cell align="right">
                      {full ? (
                        <Badge tone="warning">Full</Badge>
                      ) : nearlyFull ? (
                        <Badge tone="warning">Nearly full</Badge>
                      ) : (
                        <Badge tone="quiet">{instance.status}</Badge>
                      )}
                    </Cell>
                  </TableRow>
                );
              })}
            </Table>
          )}
        </Card>

        <Card
          title="Course types"
          description="The published catalogue. Prices and hours are governed by docs/COURSE_FACTS_SOURCE_OF_TRUTH.md and are not editable here."
          bleed
        >
          <Table
            head={[
              'Course',
              'Levels',
              'Format',
              { label: 'UE/week', align: 'right' },
              { label: 'Price', align: 'right' },
              { label: 'Registrations', align: 'right' },
            ]}
          >
            {types.map((type) => (
              <TableRow key={type.id}>
                <Cell className="font-semibold">
                  <span className="block">{type.name}</span>
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                    {type.upcomingCount} upcoming of {type.instanceCount}
                    {!type.isActive ? ' · not published' : ''}
                  </span>
                </Cell>
                <Cell className="text-sm">{type.levelRange ?? '—'}</Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {type.format ?? '—'}
                </Cell>
                <Cell align="right" className="text-sm">
                  {type.lessonsPerWeek || '—'}
                </Cell>
                <Cell align="right" className="text-sm">
                  {type.defaultPrice > 0
                    ? new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: type.currency,
                        maximumFractionDigits: 0,
                      }).format(type.defaultPrice)
                    : 'on request'}
                </Cell>
                <Cell align="right" className="text-sm font-semibold">
                  {type.registrationCount}
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
