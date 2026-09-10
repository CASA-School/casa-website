import { FormDialog } from '@/components/admin/dialogs';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { floorLabel, listLocations, listRooms, ROOM_KIND_LABELS } from '@/lib/admin/rooms';
import { CreateRoomForm } from './room-forms';

/**
 * Rooms, by location.
 *
 * Setup, reached from Settings rather than the main rail: a room and its
 * capacity are defined once and then change rarely, so this is not a screen
 * anyone opens on a Tuesday morning. What it feeds is the catalogue's room
 * picker. Offices and meeting rooms are listed too — they exist in the
 * building and staff look for them here — but only classrooms are bookable.
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
        eyebrow="Settings"
        title="Rooms"
        backHref="/admin/settings"
        backLabel="Settings"
        description="Where courses run, and how many learners each room holds."
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
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-5">
        {locations
          .filter((l) => (byLocation.get(l.id)?.length ?? 0) > 0)
          .map((location) => {
            const list = byLocation.get(location.id) ?? [];
            const bookable = list.filter((r) => r.isBookable && r.isActive);
            const seats = bookable.reduce((n, r) => n + (r.capacity ?? 0), 0);
            return (
              <Card
                key={location.id}
                title={location.name}
                description={
                  location.kind === 'online'
                    ? 'Online'
                    : location.kind === 'client'
                      ? 'Client premises'
                      : `${bookable.length} bookable ${bookable.length === 1 ? 'room' : 'rooms'} · ${seats} seats`
                }
                bleed
              >
                <Table
                  head={[
                    'Room',
                    'Floor',
                    'Kind',
                    { label: 'Capacity', align: 'right' },
                    { label: 'Cohorts', align: 'right' },
                    { label: '', align: 'right' },
                  ]}
                >
                  {list.map((room) => (
                    <TableRow key={room.id} interactive>
                      <Cell href={`/admin/settings/rooms/${room.id}`} className="font-semibold">
                        <span className="flex items-center gap-2">
                          {room.name}
                          {room.nickname ? <Badge tone="quiet">{room.nickname}</Badge> : null}
                        </span>
                      </Cell>
                      <Cell className="text-sm text-[var(--casa-text-subtle)]">
                        {floorLabel(room.floor)}
                      </Cell>
                      <Cell className="text-sm">{ROOM_KIND_LABELS[room.kind]}</Cell>
                      <Cell align="right" className="text-sm">
                        {room.capacity ?? '—'}
                        {room.capacityMax && room.capacityMax !== room.capacity ? (
                          <span className="text-[var(--casa-text-subtle)]">
                            {' '}
                            / {room.capacityMax}
                          </span>
                        ) : null}
                      </Cell>
                      <Cell align="right" className="text-sm">
                        {room.upcomingCohorts || '—'}
                      </Cell>
                      <Cell align="right">
                        {!room.isActive ? (
                          <Badge tone="quiet">Inactive</Badge>
                        ) : room.isBookable ? (
                          <Badge tone="positive">Bookable</Badge>
                        ) : (
                          <Badge tone="neutral">Not bookable</Badge>
                        )}
                      </Cell>
                    </TableRow>
                  ))}
                </Table>
              </Card>
            );
          })}
      </div>
    </>
  );
}
