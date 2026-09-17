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

/** Tomorrow onwards gives Ina notice; six weeks keeps the temporary schedule bounded. */
export function isAppointmentDate(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const today = bremenDate(now);
  return date > today && date <= addDays(today, APPOINTMENT_HORIZON_DAYS)
    && parsed.getUTCDay() >= 1 && parsed.getUTCDay() <= 4;
}

export type AppointmentDay = { date: string; times: string[] };

export function appointmentDays(taken: ReadonlySet<string>, now = new Date(), blocked: ReadonlySet<string> = new Set()): AppointmentDay[] {
  const today = bremenDate(now);
  return Array.from({ length: APPOINTMENT_HORIZON_DAYS }, (_, index) => addDays(today, index + 1))
    .filter(date => isAppointmentDate(date, now) && !blocked.has(date))
    .map(date => ({ date, times: APPOINTMENT_TIMES.filter(time => !taken.has(`${date}T${time}`)) }));
}
