import { isSchoolClosed } from '@/config/school-closures';

/** CASA-approved hours. Dates and times always refer to Bremen, never the visitor's zone. */
export const APPOINTMENT_ZONE = 'Europe/Berlin';
export const APPOINTMENT_TIMES = ['10:00', '10:30', '13:00', '13:30'] as const;
export const APPOINTMENT_HORIZON_DAYS = 42;

export function bremenDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APPOINTMENT_ZONE }).format(now);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Resolve local wall time through Intl, including the CET/CEST transition. */
export function appointmentInstant(date: string, time: string) {
  const utc = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(utc.getTime())) return null;
  const localHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: APPOINTMENT_ZONE, hour: '2-digit', hourCycle: 'h23',
  }).format(utc));
  return new Date(utc.getTime() - (localHour - utc.getUTCHours()) * 3_600_000);
}

/** Easter Sunday in the Gregorian calendar (the anonymous algorithm), as YYYY-MM-DD. */
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((8 * b + 13) / 25) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The public holidays in Bremen, where the school is closed (2026-10-09, Rahman):
 * the nine nationwide ones and Reformationstag, a Bremen holiday since 2018.
 * Ina's own leave is not here; it goes in GROUP_APPOINTMENT_BLOCKED_DATES.
 */
export function isPublicHoliday(date: string) {
  const year = Number(date.slice(0, 4));
  const easter = easterSunday(year);
  const fixed = ['01-01', '05-01', '10-03', '10-31', '12-25', '12-26'].map((day) => `${year}-${day}`);
  const moving = [-2, 1, 39, 50].map((offset) => addDays(easter, offset));
  return fixed.includes(date) || moving.includes(date);
}

/**
 * Days Ina is away, from GROUP_APPOINTMENT_BLOCKED_DATES: single dates and
 * ranges, comma-separated, e.g. `2026-12-21..2027-01-04,2027-02-12`.
 */
export function parseBlockedDates(value: string | undefined) {
  const dates = new Set<string>();
  for (const entry of (value ?? '').split(',').map((part) => part.trim()).filter(Boolean)) {
    const [start, end] = entry.split('..').map((part) => part.trim());
    if (!end) {
      dates.add(start);
      continue;
    }
    for (let date = start, guard = 0; date <= end && guard < 400; date = addDays(date, 1), guard++) dates.add(date);
  }
  return dates;
}

/** Tomorrow onwards gives Ina notice; six weeks keeps the temporary schedule bounded. */
export function isAppointmentDate(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const today = bremenDate(now);
  // Monday to Thursday: Ina does not work Friday to Sunday.
  return date > today && date <= addDays(today, APPOINTMENT_HORIZON_DAYS)
    && parsed.getUTCDay() >= 1 && parsed.getUTCDay() <= 4 && !isPublicHoliday(date) && !isSchoolClosed(date);
}

export type AppointmentDay = { date: string; times: string[] };

export function appointmentDays(taken: ReadonlySet<string>, now = new Date(), blocked: ReadonlySet<string> = new Set()): AppointmentDay[] {
  const today = bremenDate(now);
  return Array.from({ length: APPOINTMENT_HORIZON_DAYS }, (_, index) => addDays(today, index + 1))
    .filter(date => isAppointmentDate(date, now) && !blocked.has(date))
    .map(date => ({ date, times: APPOINTMENT_TIMES.filter(time => !taken.has(`${date}T${time}`)) }));
}
