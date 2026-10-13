import { Popover, PopoverChoice } from '@/components/admin/popover';
import type { CourseInstanceSummary } from '@/lib/admin/catalogue';
import type { Room } from '@/lib/admin/rooms';
import { assignRoomAction } from '../settings/rooms/actions';

/**
 * A cohort's room as a value: the name, or "No room", which opens the rooms
 * as choices. Each choice submits `courseInstanceId` and `roomId` to
 * `assignRoomAction`, exactly what the old select-and-Set form posted; an
 * empty `roomId` clears the room.
 */
export function RoomPicker({
  instance,
  rooms,
}: {
  instance: Pick<CourseInstanceSummary, 'id' | 'courseTypeName' | 'room'>;
  rooms: readonly Room[];
}) {
  const current = instance.room;
  // A cohort can sit in a room that is no longer bookable; it stays a choice.
  const choices =
    current && !rooms.some((room) => room.id === current.id)
      ? [{ id: current.id, name: current.name, nickname: current.nickname, capacity: current.capacity }, ...rooms]
      : rooms;

  return (
    <Popover
      label={`Room for ${instance.courseTypeName}`}
      width={280}
      trigger={
        <span className="-mx-2 flex min-h-8 items-center px-2 py-1 text-sm">
          {current ? (
            <span className="truncate font-medium text-[var(--casa-ink)]">
              {current.name}
              {current.nickname ? (
                <span className="font-normal text-[var(--casa-text-subtle)]"> · {current.nickname}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-[var(--casa-text-subtle)]">No room</span>
          )}
        </span>
      }
    >
      <form action={assignRoomAction}>
        <input type="hidden" name="courseInstanceId" value={instance.id} />
        <PopoverChoice name="roomId" value="" current={!current}>
          No room
        </PopoverChoice>
        {choices.map((room) => (
          <PopoverChoice key={room.id} name="roomId" value={room.id} current={room.id === current?.id}>
            <span className="flex items-baseline gap-2">
              <span>
                {room.name}
                {room.nickname ? (
                  <span className="font-normal text-[var(--casa-text-subtle)]"> · {room.nickname}</span>
                ) : null}
              </span>
              {room.capacity !== null ? (
                <span className="text-xs font-normal whitespace-nowrap text-[var(--casa-text-subtle)] tabular-nums">
                  {room.capacity} seats
                </span>
              ) : null}
            </span>
          </PopoverChoice>
        ))}
      </form>
    </Popover>
  );
}
