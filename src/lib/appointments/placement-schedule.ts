import { isSchoolClosed } from '@/config/school-closures';

import { addDays, appointmentInstant, bremenDate, isPublicHoliday } from './schedule';

/**
 * The in-person placement test by appointment (Rahman, 2026-10-28, from his handwritten list):
 * Tuesday to Thursday, these twelve times, half an hour each, two learners at a time. No 10:30,
 * 12:30, 13:00 or 14:30. Bremen time, like every appointment.
 */
export const PLACEMENT_TIMES = ['09:30', '10:00', '11:00', '11:30', '12:00', '13:30', '14:00', '15:00', '15:30', '16:00', '16:30', '17:00'] as const;
export const PLACEMENT_SEATS = 2;
export const PLACEMENT_MINUTES = 30;
export const PLACEMENT_HORIZON_DAYS = 42;
/** Same-day booking closes two hours before a time, so the team sees it coming. */
const LEAD_MS = 2 * 3_600_000;

/** Tuesday, Wednesday, Thursday (getUTCDay of noon). */
const isPlacementWeekday = (date: string) => [2, 3, 4].includes(new Date(`${date}T12:00:00Z`).getUTCDay());

export function isPlacementDate(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const today = bremenDate(now);
  return date >= today && date <= addDays(today, PLACEMENT_HORIZON_DAYS)
    && isPlacementWeekday(date) && !isPublicHoliday(date) && !isSchoolClosed(date);
}

/** A time the website may still book: on a placement day, at a listed time, two hours ahead. */
export function isBookablePlacementTime(date: string, time: string, now = new Date()) {
  if (!isPlacementDate(date, now) || !(PLACEMENT_TIMES as readonly string[]).includes(time)) return false;
  const instant = appointmentInstant(date, time);
  return Boolean(instant && instant.getTime() - now.getTime() >= LEAD_MS);
}

export type PlacementDay = { date: string; times: string[]; left: Record<string, number> };

/** The days with a place left, each time with how many: `booked` counts by `YYYY-MM-DDTHH:MM`. */
export function placementDays(booked: ReadonlyMap<string, number>, now = new Date()): PlacementDay[] {
  const today = bremenDate(now);
  return Array.from({ length: PLACEMENT_HORIZON_DAYS + 1 }, (_, index) => addDays(today, index))
    .filter((date) => isPlacementDate(date, now))
    .map((date) => {
      const left: Record<string, number> = {};
      for (const time of PLACEMENT_TIMES) {
        const free = PLACEMENT_SEATS - (booked.get(`${date}T${time}`) ?? 0);
        if (free > 0 && isBookablePlacementTime(date, time, now)) left[time] = free;
      }
      return { date, times: Object.keys(left), left };
    })
    .filter((day) => day.times.length > 0);
}
