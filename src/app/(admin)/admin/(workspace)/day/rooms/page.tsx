import { DayHeader, pickDay, weekOf } from '../day-header';
import { RoomPlan } from './room-plan';
import { dayLessons, openTasksByDay, planRooms } from '@/lib/admin/day-plan';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/** The rooms through the day on a page of their own (2026-10-19): SchoolMan's ClassroomToday, drawn. */
export default async function DayRoomsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [params, , { t, lang }] = await Promise.all([searchParams, requireModule('day'), getI18n()]);
  const today = berlinDay(new Date());
  const day = pickDay(params.date, today);
  const week = weekOf(day);
  const [lessons, rooms, openByDay] = await Promise.all([dayLessons(day), planRooms(), openTasksByDay(week[0], week[6])]);
  return (
    <>
      <DayHeader view="rooms" day={day} today={today} openByDay={openByDay} lessons={lessons.length} t={t} lang={lang} />
      <RoomPlan day={day} today={today} lessons={lessons} rooms={rooms} />
    </>
  );
}
