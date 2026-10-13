import Link from 'next/link';

import {
  Badge,
  Card,
  Cell,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  listCourseTypes,
  listUpcomingCourseInstances,
  SESSION_LABELS,
  type CourseInstanceSummary,
} from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { listBookableRooms, type Room } from '@/lib/admin/rooms';
import { CohortForm } from './cohort-form';
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
} from './list-parts';
import { RoomPicker } from './room-picker';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
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
 *
 * The cohorts read as a calendar: the month they start in a column of its
 * own, one line each, and only what differs from the normal case is marked — a cohort that
 * is full or nearly full, a status other than scheduled, a room too small.
 * The room is a value that opens the rooms as choices, not a select per row.
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const user = await requireModule('catalogue');
  const plans = canAccess(user, 'rooms', 'edit');
  const [{ error }, types, instances, rooms, levels] = await Promise.all([
    searchParams,
    listCourseTypes(),
    listUpcomingCourseInstances(20),
    plans ? listBookableRooms() : Promise.resolve([]),
    plans
      ? query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`).then((r) =>
          r.map((x) => x.code)
        )
      : Promise.resolve([]),
  ]);

  // Same-day cohorts in a fixed order, so a row does not swap places after its room changes.
  const ordered = [...instances].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
      a.courseTypeName.localeCompare(b.courseTypeName) ||
      a.id.localeCompare(b.id)
  );
  const months = groupRuns(ordered, (instance) => monthKey(instance.startDate));

  return (
    <>
      <PageHeader
        title="Courses"
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

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <Card title="Upcoming cohorts" icon={Icon.calendar} tint="blue" bleed overflow="visible">
          {instances.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--casa-text-subtle)]">No cohorts scheduled.</p>
          ) : (
            <OpenTable
              className="pb-1"
              head={[
                { label: 'Month', className: 'w-24' },
                { label: 'Course' },
                { label: 'Runs' },
                { label: 'Room', className: 'w-56' },
                { label: 'Seats', className: 'w-60' },
              ]}
            >
              {months.flatMap((month) =>
                month.items.map((instance, index) => (
                  <CohortRow
                    key={instance.id}
                    instance={instance}
                    rooms={rooms}
                    plans={plans}
                    month={index === 0 ? monthLabel(month.key) : null}
                    lastOfMonth={index === month.items.length - 1}
                  />
                ))
              )}
            </OpenTable>
          )}
        </Card>

        <Card title="Course types" icon={Icon.catalogue} tint="red" bleed>
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
            {types.map((type) => {
              const sub = [
                type.upcomingCount > 0
                  ? `${type.upcomingCount} upcoming ${type.upcomingCount === 1 ? 'cohort' : 'cohorts'}`
                  : null,
                type.isActive ? null : 'Not published',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <TableRow key={type.id}>
                  <Cell className="font-semibold">
                    <span className="block">{type.name}</span>
                    {sub ? (
                      <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                        {sub}
                      </span>
                    ) : null}
                  </Cell>
                  <Cell className="text-sm">{type.levelRange ?? '—'}</Cell>
                  <Cell className="text-sm">
                    {type.format ? (
                      sentenceCase(type.format)
                    ) : (
                      <span className="text-[var(--casa-text-subtle)]">—</span>
                    )}
                  </Cell>
                  <Cell align="right" className="text-sm">
                    {type.lessonsPerWeek || <span className="text-[var(--casa-text-subtle)]">—</span>}
                  </Cell>
                  <Cell align="right" className="text-sm">
                    {type.defaultPrice > 0 ? (
                      new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: type.currency,
                        maximumFractionDigits: 0,
                      }).format(type.defaultPrice)
                    ) : (
                      <span className="text-[var(--casa-text-subtle)]">On request</span>
                    )}
                  </Cell>
                  <Cell
                    align="right"
                    className={
                      type.registrationCount > 0
                        ? 'text-sm font-semibold'
                        : 'text-sm text-[var(--casa-text-subtle)]'
                    }
                  >
                    {type.registrationCount}
                  </Cell>
                </TableRow>
              );
            })}
          </Table>
        </Card>
      </div>
    </>
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: 'quiet' | 'neutral' | 'danger' }> = {
  cancelled: { label: 'Cancelled', tone: 'danger' },
  draft: { label: 'Draft', tone: 'quiet' },
};

/** One cohort: what it is, when, where, and how full. */
function CohortRow({
  instance,
  rooms,
  plans,
  month,
  lastOfMonth,
}: {
  instance: CourseInstanceSummary;
  rooms: Room[];
  plans: boolean;
  /** The month's label on its first row, null on the rest. */
  month: string | null;
  lastOfMonth: boolean;
}) {
  const full = instance.capacity > 0 && instance.registrationCount >= instance.capacity;
  const nearlyFull =
    instance.capacity > 0 && !full && instance.registrationCount / instance.capacity >= 0.8;
  const overRoom =
    instance.room?.capacity !== null &&
    instance.room?.capacity !== undefined &&
    instance.capacity > instance.room.capacity;

  // The subtitle carries only what the course name does not already say.
  const sub = [
    instance.title && instance.title !== instance.courseTypeName ? instance.title : null,
    instance.levelCode,
    instance.session ? SESSION_LABELS[instance.session] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const status =
    instance.status === 'scheduled'
      ? null
      : (STATUS_LABELS[instance.status] ?? { label: sentenceCase(instance.status), tone: 'neutral' });

  const endYear = new Date(instance.endDate).getFullYear() !== new Date(instance.startDate).getFullYear();

  return (
    <tr className={monthEdge(lastOfMonth)} data-cohort={instance.id}>
      <MonthCell label={month} />
      <td className="px-4 py-2.5 align-middle">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-[var(--casa-ink)]">
          {instance.courseTypeName}
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </span>
        {sub ? <span className="block text-xs text-[var(--casa-text-subtle)]">{sub}</span> : null}
      </td>
      <td className="px-4 py-2.5 align-middle text-sm whitespace-nowrap text-[var(--casa-muted)]">
        {shortDate(instance.startDate)} – {shortDate(instance.endDate, { year: endYear })}
      </td>
      <td className="px-4 py-2 align-middle">
        {plans ? (
          <RoomPicker instance={instance} rooms={rooms} />
        ) : instance.room ? (
          <Link
            href={`/admin/settings/rooms/${instance.room.id}`}
            className="text-sm font-medium text-[var(--casa-ink)] hover:underline"
          >
            {instance.room.nickname ?? instance.room.name}
          </Link>
        ) : (
          <span className="text-sm text-[var(--casa-text-subtle)]">{instance.location ?? 'No room'}</span>
        )}
        {overRoom ? (
          <span className="mt-0.5 block text-xs font-semibold text-[var(--casa-warning-text)]">
            Over room capacity
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2.5 align-middle">
        <SeatLine
          taken={instance.registrationCount}
          capacity={instance.capacity}
          label={`${instance.registrationCount} of ${instance.capacity} seats taken`}
          warn={full || nearlyFull}
          note={
            full || nearlyFull || instance.bookingCount > 0 ? (
              <>
                {instance.bookingCount > 0 ? (
                  <span className="text-[var(--casa-text-subtle)]">{instance.bookingCount} booked</span>
                ) : null}
                {full || nearlyFull ? (
                  <span className="ml-2 font-semibold text-[var(--casa-warning-text)]">
                    {full ? 'Full' : 'Nearly full'}
                  </span>
                ) : null}
              </>
            ) : null
          }
        />
      </td>
    </tr>
  );
}
