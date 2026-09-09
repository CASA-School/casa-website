import {
  Badge,
  Button,
  Card,
  Cell,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { floorLabel, listLocations, listRooms, ROOM_KIND_LABELS } from '@/lib/admin/rooms';
import { createRoomAction } from './actions';

/**
 * Rooms, by location.
 *
 * The planning module's first screen. A course is planned into a classroom
 * with a capacity, so this is the table the catalogue's room picker draws on.
 * Offices and meeting rooms are listed too — they exist in the building and
 * staff look for them here — but only classrooms are bookable.
 */
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
        eyebrow="Planning"
        title="Rooms"
        description="Where courses run, and how many learners each room holds."
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
                      <Cell href={`/admin/planning/rooms/${room.id}`} className="font-semibold">
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

        <Card title="Add a room">
          <form action={createRoomAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <Field label="Location" htmlFor="new-room-location">
                <Select id="new-room-location" name="locationId" required defaultValue="">
                  <option value="" disabled>
                    Choose
                  </option>
                  {locations
                    .filter((l) => l.isActive)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Name" htmlFor="new-room-name">
                <Input id="new-room-name" name="name" required maxLength={80} />
              </Field>
              <Button type="submit" variant="secondary">
                Add room
              </Button>
            </div>

            {/* Progressive disclosure: these refine the room and can be set later
                on its own page. Collapsed by default, no JavaScript needed. */}
            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]">
                <span className="group-open:hidden">More</span>
                <span className="hidden group-open:inline">Less</span>
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Nickname" htmlFor="new-room-nickname">
                  <Input id="new-room-nickname" name="nickname" maxLength={40} />
                </Field>
                <Field label="Floor" htmlFor="new-room-floor">
                  <Input id="new-room-floor" name="floor" type="number" min={-3} max={30} />
                </Field>
                <Field label="Kind" htmlFor="new-room-kind">
                  <Select id="new-room-kind" name="kind" defaultValue="classroom">
                    {Object.entries(ROOM_KIND_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Capacity" htmlFor="new-room-capacity">
                  <Input id="new-room-capacity" name="capacity" type="number" min={0} max={500} />
                </Field>
                <Field label="Maximum" htmlFor="new-room-max">
                  <Input id="new-room-max" name="capacityMax" type="number" min={0} max={500} />
                </Field>
              </div>
            </details>
          </form>
        </Card>
      </div>
    </>
  );
}
