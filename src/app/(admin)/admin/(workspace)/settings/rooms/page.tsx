import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
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
 * Only the exception is marked: an active room that cannot be booked says so
 * beside its name, and inactive rooms sit under one quiet heading, muted,
 * rather than each carrying a badge.
 */
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireModule('rooms');
  const [{ error }, rooms, locations] = await Promise.all([
    searchParams,
    listRooms(),
    listLocations(),
  ]);

  const byLocation = new Map<string, typeof rooms>();
  for (const room of rooms) {
    const list = byLocation.get(room.locationId) ?? [];
    list.push(room);
    byLocation.set(room.locationId, list);
  }

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

      <div className="space-y-4">
        {locations
          .filter((l) => (byLocation.get(l.id)?.length ?? 0) > 0)
          .map((location) => {
            const list = byLocation.get(location.id) ?? [];
            const active = list.filter((r) => r.isActive);
            const inactive = list.filter((r) => !r.isActive);
            const bookable = active.filter((r) => r.isBookable);
            const seats = bookable.reduce((n, r) => n + (r.capacity ?? 0), 0);
            return (
              <Card
                key={location.id}
                title={location.name}
                icon={Icon.rooms}
                tint="ink"
                description={[
                  location.kind === 'online'
                    ? 'Online'
                    : location.kind === 'client'
                      ? 'Client premises'
                      : null,
                  active.length === 0
                    ? 'No active rooms'
                    : location.kind !== 'site'
                      ? null
                      : bookable.length === 0
                        ? 'No bookable rooms'
                        : `${bookable.length} bookable ${bookable.length === 1 ? 'room' : 'rooms'} · ${seats} seats`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                bleed
              >
                <Table
                  head={[
                    'Room',
                    'Floor',
                    'Kind',
                    { label: 'Capacity', align: 'right' },
                    { label: 'Cohorts', align: 'right' },
                  ]}
                >
                  {active.map((room) => (
                    <RoomRow key={room.id} room={room} />
                  ))}
                  {active.length > 0 && inactive.length > 0 ? (
                    <tr className="bg-white">
                      <th
                        scope="colgroup"
                        colSpan={5}
                        className="px-4 pt-5 pb-2 text-left text-xs font-bold text-[var(--casa-muted)]"
                      >
                        Inactive
                      </th>
                    </tr>
                  ) : null}
                  {inactive.map((room) => (
                    <RoomRow key={room.id} room={room} muted />
                  ))}
                </Table>
              </Card>
            );
          })}
      </div>
    </>
  );
}

/** One room. A nickname is the name staff use, so it sits beside the name, not in a chip. */
function RoomRow({ room, muted = false }: { room: Room; muted?: boolean }) {
  const subtle = 'text-[var(--casa-text-subtle)]';
  return (
    <TableRow interactive>
      <Cell
        href={`/admin/settings/rooms/${room.id}`}
        className={muted ? `font-medium ${subtle}` : 'font-semibold'}
      >
        {room.name}
        {room.nickname ? <span className={`font-normal ${subtle}`}> · {room.nickname}</span> : null}
        {!muted && !room.isBookable ? (
          <span className={`ml-2 text-xs font-normal ${subtle}`}>Not bookable</span>
        ) : null}
      </Cell>
      <Cell className={`text-sm ${subtle}`}>{floorLabel(room.floor)}</Cell>
      <Cell className={`text-sm ${subtle}`}>{ROOM_KIND_LABELS[room.kind]}</Cell>
      <Cell align="right" className={muted ? `text-sm tabular-nums ${subtle}` : 'text-sm tabular-nums'}>
        {room.capacity ?? <span className={subtle}>—</span>}
        {room.capacityMax && room.capacityMax !== room.capacity ? (
          <span className={subtle}> / {room.capacityMax}</span>
        ) : null}
      </Cell>
      <Cell align="right" className="text-sm tabular-nums">
        {room.upcomingCohorts > 0 ? room.upcomingCohorts : <span className={subtle}>—</span>}
      </Cell>
    </TableRow>
  );
}
