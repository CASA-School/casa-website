import Link from 'next/link';

import { assignRoomAction } from '../planning/actions';
import { CatalogueTabs } from '@/components/admin/catalogue-tabs';
import {
  Badge,
  Button,
  Card,
  Cell,
  DateText,
  EmptyState,
  Meter,
  PageHeader,
  Select,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  listCourseTypes,
  listUpcomingCourseInstances,
  SESSION_LABELS,
} from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { listBookableRooms } from '@/lib/admin/rooms';
import { CohortForm } from './cohort-form';
import { FormDialog } from '@/components/admin/dialogs';
import { query } from '@/lib/admin/db';

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
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const user = await requireModule('catalogue');
  const plans = canAccess(user, 'planning', 'edit');
  const [{ error }, types, instances, rooms, levels] = await Promise.all([
    searchParams,
    listCourseTypes(),
    listUpcomingCourseInstances(20),
    plans ? listBookableRooms() : Promise.resolve([]),
    plans
      ? query<{ code: string }>(`SELECT code FROM levels ORDER BY position`).then((r) =>
          r.map((x) => x.code)
        )
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="School"
        title="Courses"
        description="What CASA publishes, and how many people have registered against each dated option."
        actions={
          plans ? (
            <FormDialog
              trigger="Schedule cohort"
              title="Schedule a cohort"
              triggerVariant="primary"
            >
              <CohortForm courseTypes={types} rooms={rooms} levels={levels} />
            </FormDialog>
          ) : null
        }
      />

      <CatalogueTabs active="courses" />

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-5">
        <Card title="Upcoming cohorts" bleed>
          {instances.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState title="No cohorts scheduled" description="Nothing is dated yet." />
            </div>
          ) : (
            <Table head={['Course', 'Runs', 'Room', 'Seats', { label: 'Status', align: 'right' }]}>
              {instances.map((instance) => {
                const full =
                  instance.capacity > 0 && instance.registrationCount >= instance.capacity;
                const nearlyFull =
                  instance.capacity > 0 &&
                  !full &&
                  instance.registrationCount / instance.capacity >= 0.8;

                return (
                  <TableRow key={instance.id}>
                    <Cell className="font-semibold">
                      <span className="block">{instance.title ?? instance.courseTypeName}</span>
                      <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                        {[
                          instance.levelCode,
                          instance.session ? SESSION_LABELS[instance.session] : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || instance.courseTypeName}
                      </span>
                    </Cell>
                    <Cell className="text-sm text-[var(--casa-muted)]">
                      <DateText value={instance.startDate} /> —{' '}
                      <DateText value={instance.endDate} />
                    </Cell>
                    <Cell className="text-sm">
                      {plans ? (
                        <form action={assignRoomAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="courseInstanceId" value={instance.id} />
                          <Select
                            name="roomId"
                            defaultValue={instance.room?.id ?? ''}
                            aria-label={`Room for ${instance.courseTypeName}`}
                            className="w-auto py-1 text-xs"
                          >
                            <option value="">No room</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.nickname ? `${room.name} · ${room.nickname}` : room.name}
                                {room.capacity !== null ? ` (${room.capacity})` : ''}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="ghost" size="sm">
                            Set
                          </Button>
                        </form>
                      ) : instance.room ? (
                        <Link
                          href={`/admin/planning/rooms/${instance.room.id}`}
                          className="font-medium hover:underline"
                        >
                          {instance.room.nickname ?? instance.room.name}
                        </Link>
                      ) : (
                        <span className="text-[var(--casa-text-subtle)]">
                          {instance.location ?? '—'}
                        </span>
                      )}
                      {instance.room?.capacity !== null &&
                      instance.room?.capacity !== undefined &&
                      instance.capacity > instance.room.capacity ? (
                        <Badge tone="warning" className="mt-1">
                          Over room capacity
                        </Badge>
                      ) : null}
                    </Cell>
                    <Cell className="text-sm font-semibold">{instance.bookingCount || '—'}</Cell>
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

        <Card title="Course types" bleed>
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
                <Cell className="text-sm text-[var(--casa-text-subtle)]">{type.format ?? '—'}</Cell>
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
