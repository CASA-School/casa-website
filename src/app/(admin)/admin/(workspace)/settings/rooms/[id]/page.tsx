import { notFound } from 'next/navigation';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Badge, Card, DateText, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { floorLabel, getRoom, roomCohorts, ROOM_KIND_LABELS } from '@/lib/admin/rooms';
import { deleteRoomAction } from '../actions';
import { EditRoomForm } from '../room-forms';

/**
 * One room: what it is, what runs in it, and the form that changes it.
 *
 * The record's head carries what a colleague looks a room up for — where it
 * is, how many it seats, whether courses can be booked into it — so the
 * columns under it are what runs there and the room's remaining details.
 */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireModule('rooms')]);
  const room = await getRoom(id);
  if (!room) notFound();
  const cohorts = await roomCohorts(room.id);

  return (
    <>
      <RecordHeader
        backHref="/admin/settings/rooms"
        backLabel="All rooms"
        title={room.nickname ? `${room.name} · ${room.nickname}` : room.name}
        subtitle={ROOM_KIND_LABELS[room.kind]}
        status={
          <>
            {room.isActive ? null : <Badge tone="quiet">Inactive</Badge>}
            {room.isBookable ? (
              <Badge tone="positive">Bookable</Badge>
            ) : (
              <Badge tone="neutral">Not bookable</Badge>
            )}
          </>
        }
        actions={
          <>
            {canAccess(user, 'rooms', 'edit') ? (
              <FormDialog trigger="Edit" title={room.name}>
                <EditRoomForm room={room} />
              </FormDialog>
            ) : null}
            {canAccess(user, 'rooms', 'full') ? (
              <form action={deleteRoomAction}>
                <input type="hidden" name="roomId" value={room.id} />
                <ConfirmSubmit
                  title={`Delete ${room.name}?`}
                  description="The room is removed from the list and from every cohort that pointed at it. This cannot be undone."
                  size="md"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
        facts={[
          {
            label: 'Location',
            icon: Icon.rooms,
            tint: 'ink',
            value: room.locationName,
            sub: floorLabel(room.floor),
          },
          {
            label: 'Capacity',
            icon: Icon.people,
            tint: 'green',
            value: room.capacity ?? '—',
            sub: room.capacityMax ? `${room.capacityMax} at most` : undefined,
          },
          {
            label: 'Cohorts',
            icon: Icon.calendar,
            tint: 'blue',
            value: cohorts.length === 0 ? 'None planned' : `${cohorts.length} planned`,
          },
        ]}
      />

      {query.error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-[var(--casa-success-text)]/30 bg-[var(--casa-success-surface)]/8 px-4 py-3 text-sm text-[var(--casa-success-text)]"
        >
          Saved.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title="Cohorts" icon={Icon.catalogue} tint="red" bleed>
          {cohorts.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[var(--casa-text-subtle)]">No cohorts planned here.</p>
          ) : (
            <ul className="divide-y divide-ws-line-soft">
              {cohorts.map((c) => {
                const over = room.capacity !== null && c.capacity > room.capacity;
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-[var(--casa-ink)]">{c.courseTypeName}</span>
                      <span className="block text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={c.startDate} /> — <DateText value={c.endDate} />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                      {over ? <Badge tone="warning">Over room capacity</Badge> : null}
                      {c.registrationCount} / {c.capacity}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Details" icon={Icon.note} tint="sun">
          <DetailList
            items={[
              { label: 'Zone', value: room.zone },
              { label: 'Colour', value: room.colour },
              { label: 'Short name', value: room.shortName },
              { label: 'Notes', value: room.notes, wide: true },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
