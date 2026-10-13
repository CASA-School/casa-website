import { FormDialog } from '@/components/admin/dialogs';
import { ListBar, ListEmpty, ListGroup } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { floorLabel, listLocations, listRooms, ROOM_KIND_LABELS, type Room } from '@/lib/admin/rooms';
import { CreateRoomForm } from './room-forms';

/**
 * Rooms, by location.
 *
 * Setup, reached from Settings rather than the main rail: a room and its
 * capacity are defined once and then change rarely, so this is not a screen
 * anyone opens on a Tuesday morning. What it feeds is the catalogue's room
 * picker. Offices and meeting rooms are listed too — they exist in the
 * building and staff look for them here — but only classrooms are bookable.
 *
 * One list card (docs/ADMIN_WORKSPACE.md §Lists): the rooms in use, grouped by
 * location with the school's own building first, and the inactive ones in a
 * view of their own. Only the exception is marked: an active room that cannot
 * be booked says so beside its name.
 */

const LOCATION_KINDS: Record<string, string | null> = { site: null, client: 'Client premises', online: 'Online' };

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; view?: string }>;
}) {
  const user = await requireModule('rooms');
  const [{ error, view: rawView }, rooms, locations] = await Promise.all([searchParams, listRooms(), listLocations()]);

  const inactiveCount = rooms.filter((r) => !r.isActive).length;
  const view = rawView === 'inactive' && inactiveCount > 0 ? 'inactive' : 'active';
  const shown = rooms.filter((r) => (view === 'active' ? r.isActive : !r.isActive));

  // The school's own building first, then client premises and online.
  const groups = [...locations]
    .sort((a, b) => Number(a.kind !== 'site') - Number(b.kind !== 'site'))
    .map((location) => ({
      key: location.id,
      label: [location.name, LOCATION_KINDS[location.kind]].filter(Boolean).join(' · '),
      rows: shown.filter((r) => r.locationId === location.id),
    }))
    .filter((g) => g.rows.length > 0);

  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader
        title="Rooms"
        backHref="/admin/settings"
        backLabel="Settings"
        actions={
          canAccess(user, 'rooms', 'edit') ? (
            <FormDialog trigger="Add room" title="Add a room" triggerVariant="primary">
              <CreateRoomForm locations={locations} />
            </FormDialog>
          ) : null
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <Card bleed>
        {inactiveCount > 0 ? (
          <ListBar
            tabs={[
              { key: 'active', label: 'In use', href: '/admin/settings/rooms', count: rooms.length - inactiveCount },
              { key: 'inactive', label: 'Inactive', href: '/admin/settings/rooms?view=inactive', count: inactiveCount },
            ]}
            active={view}
          />
        ) : null}
        {groups.length === 0 ? (
          <ListEmpty title="No rooms yet" />
        ) : (
          <Table
            head={[
              'Room',
              { label: 'Floor', className: `w-[10rem] ${hide}` },
              { label: 'Kind', className: `w-[10rem] ${hide}` },
              { label: 'Seats', align: 'right', className: 'w-[6.5rem]' },
              { label: 'Cohorts', align: 'right', className: `w-[6.5rem] ${hide}` },
            ]}
          >
            {groups.map((group) => [
              <ListGroup key={group.key} label={group.label} count={group.rows.length} span={5} />,
              ...group.rows.map((room) => <RoomRow key={room.id} room={room} hide={hide} />),
            ])}
          </Table>
        )}
      </Card>
    </>
  );
}

/** One room. A nickname is the name staff use, so it sits beside the name, not in a chip. */
function RoomRow({ room, hide }: { room: Room; hide: string }) {
  const subtle = 'text-[var(--casa-text-subtle)]';
  const floor = room.floor === null ? null : floorLabel(room.floor);
  return (
    <TableRow interactive>
      <Cell href={`/admin/settings/rooms/${room.id}`} className="max-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.9rem] font-semibold">
            {room.name}
            {room.nickname ? <span className={`font-normal ${subtle}`}> · {room.nickname}</span> : null}
          </span>
          {room.isActive && !room.isBookable ? <Badge tone="quiet">Not bookable</Badge> : null}
        </span>
      </Cell>
      <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>{floor}</Cell>
      <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>{ROOM_KIND_LABELS[room.kind]}</Cell>
      <Cell align="right" className="text-[0.84rem] whitespace-nowrap tabular-nums">
        {room.capacity}
        {room.capacity !== null && room.capacityMax && room.capacityMax !== room.capacity ? (
          <span className={subtle}> / {room.capacityMax}</span>
        ) : null}
      </Cell>
      <Cell align="right" className={`text-[0.84rem] font-semibold tabular-nums ${hide}`}>
        {room.upcomingCohorts > 0 ? room.upcomingCohorts : null}
      </Cell>
    </TableRow>
  );
}
