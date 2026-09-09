import { notFound } from 'next/navigation';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Badge, Card, DateText, DetailList, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { floorLabel, getRoom, roomCohorts, ROOM_KIND_LABELS } from '@/lib/admin/rooms';
import { deleteRoomAction } from '../../actions';
import { EditRoomForm } from '../../room-forms';

/** One room: what it is, what runs in it, and the form that changes it. */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams,
    requireModule('planning'),
  ]);
  const room = await getRoom(id);
  if (!room) notFound();
  const cohorts = await roomCohorts(room.id);

  return (
    <>
      <PageHeader
        backHref="/admin/planning"
        backLabel="All rooms"
        eyebrow={room.locationName}
        title={room.nickname ? `${room.name} · ${room.nickname}` : room.name}
        description={`${ROOM_KIND_LABELS[room.kind]} · ${floorLabel(room.floor)}`}
        actions={
          <div className="flex items-center gap-2">
            {canAccess(user, 'planning', 'edit') ? (
              <FormDialog trigger="Edit" title={room.name}>
                <EditRoomForm room={room} />
              </FormDialog>
            ) : null}
            {canAccess(user, 'planning', 'full') ? (
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
          </div>
        }
      />

      {query.error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-[var(--casa-success-text)]/30 bg-[var(--casa-success-surface)]/8 px-4 py-3 text-sm text-[var(--casa-success-text)]"
        >
          Saved.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Cohorts">
            {cohorts.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">No cohorts planned here.</p>
            ) : (
              <ul className="divide-y divide-ws-line-soft">
                {cohorts.map((c) => {
                  const over = room.capacity !== null && c.capacity > room.capacity;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium">{c.courseTypeName}</span>
                        <span className="block text-xs text-[var(--casa-text-subtle)]">
                          <DateText value={c.startDate} /> — <DateText value={c.endDate} />
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        {c.registrationCount} / {c.capacity}
                        {over ? <Badge tone="warning">Over room capacity</Badge> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Details">
            <DetailList
              items={[
                { label: 'Location', value: room.locationName },
                { label: 'Floor', value: floorLabel(room.floor) },
                { label: 'Zone', value: room.zone },
                { label: 'Colour', value: room.colour },
                { label: 'Short name', value: room.shortName },
              ]}
            />
          </Card>
        </div>

        <Card title="Status">
          <DetailList
            items={[
              {
                label: 'Bookable',
                value: room.isBookable ? (
                  <Badge tone="positive">Yes</Badge>
                ) : (
                  <Badge tone="neutral">No</Badge>
                ),
              },
              {
                label: 'Active',
                value: room.isActive ? (
                  <Badge tone="positive">Yes</Badge>
                ) : (
                  <Badge tone="quiet">No</Badge>
                ),
              },
              { label: 'Capacity', value: room.capacity ?? '—' },
              { label: 'Maximum', value: room.capacityMax ?? '—' },
              { label: 'Notes', value: room.notes },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
