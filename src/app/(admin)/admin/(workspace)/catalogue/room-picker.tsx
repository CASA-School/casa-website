import { Popover, PopoverChoice } from '@/components/admin/popover';
import type { CourseInstanceSummary } from '@/lib/admin/catalogue';
import type { Room } from '@/lib/admin/rooms';
import { assignRoomAction } from '../settings/rooms/actions';
import { getI18n } from '@/lib/admin/i18n.server';
import { roomName } from '@/lib/admin/course-starts';

/**
 * A cohort's room as a value: the name, or an empty cell with a quiet "Set
 * room" on hover, which opens the rooms as choices. Each choice submits
 * `courseInstanceId` and `roomId` to `assignRoomAction`, exactly what the old
 * select-and-Set form posted; an empty `roomId` clears the room.
 */
export async function RoomPicker({
  instance,
  rooms,
}: {
  instance: Pick<CourseInstanceSummary, 'id' | 'courseTypeName' | 'courseTypeNameDe' | 'room'>;
  rooms: readonly Room[];
}) {
  const { t } = await getI18n();
  const current = instance.room;
  // A cohort can sit in a room that is no longer bookable; it stays a choice.
  const choices =
    current && !rooms.some((room) => room.id === current.id)
      ? [{ id: current.id, name: current.name, nickname: current.nickname, capacity: current.capacity }, ...rooms]
      : rooms;

  return (
    <Popover
      label={t(`Raum für ${instance.courseTypeNameDe}`, `Room for ${instance.courseTypeName}`)}
      width={280}
      trigger={
        <span className="-mx-2 flex min-h-8 items-center px-2 py-1 text-sm">
          {current ? (
            // The team's name for the room, its city; the room's own name is in the choices.
            <span className="truncate font-medium text-[var(--casa-ink)]">{roomName(current)}</span>
          ) : (
            // An unset room is an empty cell: "No room" on every row was noise
            // (§Design standards 6). The way to set one appears on the row's hover
            // or focus, and always where there is no hover.
            <span className="text-[var(--casa-text-subtle)] opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              {t('Raum wählen', 'Set room')}
            </span>
          )}
        </span>
      }
    >
      <form action={assignRoomAction}>
        <input type="hidden" name="courseInstanceId" value={instance.id} />
        <PopoverChoice name="roomId" value="" current={!current}>
          {t('Kein Raum', 'No room')}
        </PopoverChoice>
        {choices.map((room) => (
          <PopoverChoice key={room.id} name="roomId" value={room.id} current={room.id === current?.id}>
            <span className="flex items-baseline gap-2">
              <span>
                {roomName(room)}
                {room.nickname ? <span className="font-normal text-[var(--casa-text-subtle)]"> · {room.name}</span> : null}
              </span>
              {room.capacity !== null ? (
                <span className="text-xs font-normal whitespace-nowrap text-[var(--casa-text-subtle)] tabular-nums">
                  {t(`${room.capacity} Plätze`, `${room.capacity} seats`)}
                </span>
              ) : null}
            </span>
          </PopoverChoice>
        ))}
      </form>
    </Popover>
  );
}
