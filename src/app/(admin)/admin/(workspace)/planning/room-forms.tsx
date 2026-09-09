import { Button, Field, Input, Select } from '@/components/admin/ui';
import { ROOM_KIND_LABELS, type Location, type Room } from '@/lib/admin/rooms';
import { createRoomAction, updateRoomAction } from './actions';

/**
 * The two room forms, rendered inside dialogs.
 *
 * Progressive disclosure: creating asks for location and name; the rest sits
 * under "More". Editing shows everything, because someone who opened Edit on a
 * specific room has already chosen to go deeper.
 */

const checkbox = 'size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]';

export function CreateRoomForm({ locations }: { locations: Location[] }) {
  return (
    <form action={createRoomAction} className="space-y-3">
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
        <Input id="new-room-name" name="name" required maxLength={80} autoFocus />
      </Field>

      <details className="group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]">
          <span className="group-open:hidden">More</span>
          <span className="hidden group-open:inline">Less</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity" htmlFor="new-room-capacity">
              <Input id="new-room-capacity" name="capacity" type="number" min={0} max={500} />
            </Field>
            <Field label="Maximum" htmlFor="new-room-max">
              <Input id="new-room-max" name="capacityMax" type="number" min={0} max={500} />
            </Field>
          </div>
        </div>
      </details>

      <div className="flex justify-end pt-1">
        <Button type="submit">Add room</Button>
      </div>
    </form>
  );
}

export function EditRoomForm({ room }: { room: Room }) {
  return (
    <form action={updateRoomAction} className="space-y-3">
      <input type="hidden" name="roomId" value={room.id} />
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
      <div className="flex flex-wrap gap-5 pt-1">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isBookable"
            defaultChecked={room.isBookable}
            className={checkbox}
          />
          Bookable for courses
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={room.isActive}
            className={checkbox}
          />
          Active
        </label>
      </div>
      <Field label="Notes" htmlFor="room-notes">
        <Input id="room-notes" name="notes" defaultValue={room.notes ?? ''} maxLength={500} />
      </Field>
      <div className="flex justify-end pt-1">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
