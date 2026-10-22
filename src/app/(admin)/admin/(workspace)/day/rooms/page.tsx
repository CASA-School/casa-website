import { DayHeader, pickDay, weekOf } from '../day-header';
import { RoomPlan } from './room-plan';
import { dayLessons, lessonChoices, openTasksByDay, planRooms } from '@/lib/admin/day-plan';
import { canAccess } from '@/lib/admin/access';
import { hasEntryTests } from '@/lib/admin/entry-tests';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/** The rooms through the day on a page of their own (2026-10-19): SchoolMan's ClassroomToday, drawn. */
export default async function DayRoomsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('day'), getI18n()]);
  const today = berlinDay(new Date());
  const day = pickDay(params.date, today);
  const week = weekOf(day);
  const canTeacher = canAccess(user, 'kursplanung', 'edit');
  const canRoom = canAccess(user, 'rooms', 'edit');
  const [lessons, rooms, openByDay, choices, tests] = await Promise.all([
    dayLessons(day),
    planRooms(),
    openTasksByDay(week[0], week[6]),
    canTeacher || canRoom ? lessonChoices(day) : Promise.resolve(null),
    hasEntryTests(day),
  ]);
  const back = day === today ? '/admin/day/rooms' : `/admin/day/rooms?date=${day}`;
  return (
    <>
      <DayHeader view="rooms" day={day} today={today} openByDay={openByDay} lessons={lessons.length} flats={canAccess(user, 'accommodation')} tests={tests} t={t} lang={lang} />
      <RoomPlan day={day} today={today} lessons={lessons} rooms={rooms} editing={choices ? { choices, canTeacher, canRoom, back } : undefined} />
    </>
  );
}
