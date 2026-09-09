import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  Badge,
  Button,
  Card,
  DateText,
  DetailList,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/admin/ui';
import { floorLabel, getRoom, roomCohorts, ROOM_KIND_LABELS } from '@/lib/admin/rooms';
import { updateRoomAction } from '../../actions';

/** One room: what it is, what runs in it, and the form that changes it. */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
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

        <Card title="Edit">
          <form action={updateRoomAction} className="space-y-3">
            <input type="hidden" name="roomId" value={room.id} />
            <Field label="Name" htmlFor="room-name">
              <Input id="room-name" name="name" defaultValue={room.name} required maxLength={80} />
            </Field>
            <Field label="Nickname" htmlFor="room-nickname">
              <Input
                id="room-nickname"
                name="nickname"
                defaultValue={room.nickname ?? ''}
                maxLength={40}
              />
            </Field>
            <Field label="Kind" htmlFor="room-kind">
              <Select id="room-kind" name="kind" defaultValue={room.kind}>
                {Object.entries(ROOM_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacity" htmlFor="room-capacity">
                <Input
                  id="room-capacity"
                  name="capacity"
                  type="number"
                  min={0}
                  max={500}
                  defaultValue={room.capacity ?? ''}
                />
              </Field>
              <Field label="Maximum" htmlFor="room-max">
                <Input
                  id="room-max"
                  name="capacityMax"
                  type="number"
                  min={0}
                  max={500}
                  defaultValue={room.capacityMax ?? ''}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="isBookable"
                defaultChecked={room.isBookable}
                className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              Bookable for courses
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={room.isActive}
                className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              Active
            </label>
            <Field label="Notes" htmlFor="room-notes">
              <Textarea id="room-notes" name="notes" rows={3} defaultValue={room.notes ?? ''} />
            </Field>
            <Button type="submit" className="w-full">
              Save
            </Button>
          </form>
          <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs text-[var(--casa-text-subtle)]">
            <Link href="/admin/catalogue" className="font-medium text-[var(--casa-accent-text)]">
              Assign cohorts to rooms
            </Link>{' '}
            from the courses screen.
          </p>
        </Card>
      </div>
    </>
  );
}
