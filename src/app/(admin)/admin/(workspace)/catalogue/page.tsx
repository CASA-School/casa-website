import Link from 'next/link';

import { FormDialog } from '@/components/admin/dialogs';
import { dayRange, euros, ListBar, ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  listCourseTypes,
  listUpcomingCourseInstances,
  SESSION_LABELS,
  type CourseInstanceSummary,
  type CourseTypeSummary,
} from '@/lib/admin/catalogue';
import { query } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { listBookableRooms, type Room } from '@/lib/admin/rooms';
import { toDateInputValue } from '@/lib/dates';
import { CohortForm } from './cohort-form';
import { groupRuns, monthKey, monthLabel, openCell, OpenTable, SeatLine, sentenceCase } from './list-parts';
import { RoomPicker } from './room-picker';

/**
 * Courses, with live demand against them.
 *
 * READ-ONLY, DELIBERATELY, for the course types. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`
 * is the current authority on every price and hour count on this screen,
 * verified against casa-bremen.de and carrying an explicit list of what is
 * still unverified. An edit form here before that reconciliation would let the
 * workspace quietly contradict the published facts, and the contradiction
 * would surface as a wrong price on a course page.
 *
 * What the workspace adds is the one thing the source of truth cannot hold:
 * how many people have actually registered for the cohort starting in ten days.
 *
 * One list card with two views (docs/ADMIN_WORKSPACE.md §Lists): the upcoming
 * cohorts, grouped by the month they start in, and the course types. Only
 * what differs from the normal case is marked — a cohort that is full or
 * nearly full, a status other than scheduled, a room too small. A cohort's
 * room is a value that opens the rooms as choices; an unset room is an empty
 * cell whose "Set room" appears on hover.
 */

const VIEWS = [
  { key: 'cohorts', label: 'Upcoming cohorts' },
  { key: 'types', label: 'Course types' },
] as const;

const hide = 'hidden md:table-cell';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; view?: string }>;
}) {
  const user = await requireModule('catalogue');
  const plans = canAccess(user, 'rooms', 'edit');
  const [{ error, view: rawView }, types, instances, rooms, levels] = await Promise.all([
    searchParams,
    listCourseTypes(),
    listUpcomingCourseInstances(20),
    plans ? listBookableRooms() : Promise.resolve([]),
    plans
      ? query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`).then((r) => r.map((x) => x.code))
      : Promise.resolve([]),
  ]);
  const view = rawView === 'types' ? 'types' : 'cohorts';

  return (
    <>
      <PageHeader
        title="Courses"
        actions={
          plans ? (
            <FormDialog trigger="Schedule cohort" title="Schedule a cohort" triggerVariant="primary">
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

      <Card bleed overflow={view === 'cohorts' ? 'visible' : 'hidden'}>
        <ListBar
          tabs={VIEWS.map((v) => ({
            key: v.key,
            label: v.label,
            href: `/admin/catalogue${v.key === 'cohorts' ? '' : `?view=${v.key}`}`,
          }))}
          active={view}
        />
        {view === 'cohorts' ? <Cohorts instances={instances} rooms={rooms} plans={plans} /> : <CourseTypes types={types} />}
      </Card>
    </>
  );
}

function Cohorts({ instances, rooms, plans }: { instances: CourseInstanceSummary[]; rooms: Room[]; plans: boolean }) {
  if (instances.length === 0) return <ListEmpty title="No cohorts scheduled" />;

  // Same-day cohorts in a fixed order, so a row does not swap places after its room changes.
  const ordered = [...instances].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
      a.courseTypeName.localeCompare(b.courseTypeName) ||
      a.id.localeCompare(b.id)
  );
  const months = groupRuns(ordered, (instance) => monthKey(instance.startDate));

  return (
    <OpenTable
      head={[
        { label: 'Course' },
        { label: 'Runs', className: 'w-px md:w-[13.5rem]' },
        { label: 'Room', className: `w-[15rem] ${hide}` },
        { label: 'Seats', className: `w-[15rem] ${hide}` },
      ]}
    >
      {months.flatMap((month) => [
        <ListGroup key={month.key} label={monthLabel(month.key)} count={month.items.length} span={4} />,
        ...month.items.map((instance) => (
          <CohortRow key={instance.id} instance={instance} rooms={rooms} plans={plans} />
        )),
      ])}
    </OpenTable>
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: 'quiet' | 'neutral' | 'danger' }> = {
  cancelled: { label: 'Cancelled', tone: 'danger' },
  draft: { label: 'Draft', tone: 'quiet' },
};

/** One cohort: what it is, when, where, and how full. */
function CohortRow({ instance, rooms, plans }: { instance: CourseInstanceSummary; rooms: Room[]; plans: boolean }) {
  const full = instance.capacity > 0 && instance.registrationCount >= instance.capacity;
  const nearlyFull = instance.capacity > 0 && !full && instance.registrationCount / instance.capacity >= 0.8;
  const overRoom =
    instance.room?.capacity !== null &&
    instance.room?.capacity !== undefined &&
    instance.capacity > instance.room.capacity;

  // The line under the name carries only what the course name does not already say.
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

  return (
    <tr className="group" data-cohort={instance.id}>
      <td className={`${openCell} py-3 md:max-w-0`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[0.9rem] font-semibold text-[var(--casa-ink)] md:truncate">{instance.courseTypeName}</span>
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </span>
        {sub ? <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--casa-muted)]">{sub}</span> : null}
      </td>
      <td className={`${openCell} py-3 text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums`}>
        {/* The month group above says the year; the range names one only when it crosses into another. */}
        {dayRange(toDateInputValue(instance.startDate), toDateInputValue(instance.endDate), new Date(instance.startDate).getFullYear())}
      </td>
      <td className={`${openCell} py-1.5 ${hide}`}>
        {plans ? (
          <RoomPicker instance={instance} rooms={rooms} />
        ) : instance.room ? (
          <Link
            href={`/admin/settings/rooms/${instance.room.id}`}
            className="text-[0.84rem] font-medium text-[var(--casa-ink)] hover:underline"
          >
            {instance.room.nickname ?? instance.room.name}
          </Link>
        ) : instance.location ? (
          <span className="text-[0.84rem] text-[var(--casa-muted)]">{instance.location}</span>
        ) : null}
        {overRoom ? <span className="mt-0.5 block text-xs font-semibold text-[#9a5b00]">Room too small</span> : null}
      </td>
      <td className={`${openCell} py-3 ${hide}`}>
        <SeatLine
          taken={instance.registrationCount}
          capacity={instance.capacity}
          label={`${instance.registrationCount} of ${instance.capacity} seats taken`}
          warn={full || nearlyFull}
          note={
            full || nearlyFull ? (
              <span className="font-semibold text-[#9a5b00]">{full ? 'Full' : 'Nearly full'}</span>
            ) : instance.bookingCount > 0 ? (
              <span className="text-[var(--casa-text-subtle)]">{instance.bookingCount} booked</span>
            ) : null
          }
        />
      </td>
    </tr>
  );
}

function CourseTypes({ types }: { types: CourseTypeSummary[] }) {
  if (types.length === 0) return <ListEmpty title="No course types" />;
  return (
    <Table
      head={[
        'Course',
        { label: 'Levels', className: `w-[8rem] ${hide}` },
        { label: 'Format', className: `w-[11rem] ${hide}` },
        { label: 'UE / week', align: 'right', className: `w-[7rem] ${hide}` },
        { label: 'Price', align: 'right', className: 'w-[7rem]' },
        { label: 'Registrations', align: 'right', className: `w-[8rem] ${hide}` },
      ]}
    >
      {types.map((type) => (
        <TableRow key={type.id}>
          <Cell className="max-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[0.9rem] font-semibold">{type.name}</span>
              {type.isActive ? null : <Badge tone="quiet">Not published</Badge>}
            </span>
            {type.upcomingCount > 0 ? (
              <span className="mt-0.5 block text-[0.8rem] text-[var(--casa-muted)]">
                {type.upcomingCount} upcoming {type.upcomingCount === 1 ? 'cohort' : 'cohorts'}
              </span>
            ) : null}
          </Cell>
          <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] ${hide}`}>{type.levelRange}</Cell>
          <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>{type.format ? sentenceCase(type.format) : null}</Cell>
          <Cell align="right" className={`text-[0.84rem] text-[#2b3546] tabular-nums ${hide}`}>
            {type.lessonsPerWeek || null}
          </Cell>
          <Cell align="right" className="font-semibold whitespace-nowrap tabular-nums">
            {type.defaultPrice > 0
              ? type.currency === 'EUR'
                ? euros(type.defaultPrice)
                : new Intl.NumberFormat('de-DE', { style: 'currency', currency: type.currency }).format(type.defaultPrice)
              : null}
          </Cell>
          <Cell align="right" className={`font-semibold tabular-nums ${hide}`}>
            {type.registrationCount > 0 ? type.registrationCount : null}
          </Cell>
        </TableRow>
      ))}
    </Table>
  );
}
