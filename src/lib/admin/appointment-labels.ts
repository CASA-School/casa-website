import type { Bilingual } from './i18n';

/**
 * The kinds of appointment and where one stands, with their words and colours (0098). Kept apart from
 * appointments.ts, which reaches the database, so a client component may read them.
 */

export const APPOINTMENT_KINDS = ['placement', 'consultation', 'group_consultation', 'other'] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];
export const isAppointmentKind = (value: string): value is AppointmentKind => (APPOINTMENT_KINDS as readonly string[]).includes(value);

export const KIND_LABELS: Record<AppointmentKind, Bilingual> = {
  placement: { de: 'Einstufungstest', en: 'Placement test' },
  consultation: { de: 'Beratung', en: 'Consultation' },
  group_consultation: { de: 'Gruppenberatung', en: 'Group consultation' },
  other: { de: 'Termin', en: 'Appointment' },
};

/** A kind's mark: a small tinted label beside the name. */
export const KIND_CHIPS: Record<AppointmentKind, string> = {
  placement: 'bg-[#e5f5eb] text-[#137a3c]',
  consultation: 'bg-[#e3f4fc] text-[#065f8c]',
  group_consultation: 'bg-[#fff7cc] text-[#6b5600]',
  other: 'bg-[#edf0f5] text-[#2b3546]',
};

/** `requested`: a website request waiting for its colleague, Ina's group consultations (0101). */
export const APPOINTMENT_STATUSES = ['requested', 'booked', 'came', 'missed', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const isAppointmentStatus = (value: string): value is AppointmentStatus => (APPOINTMENT_STATUSES as readonly string[]).includes(value);

export const STATUS_LABELS: Record<AppointmentStatus, Bilingual> = {
  requested: { de: 'Angefragt', en: 'Requested' },
  booked: { de: 'Gebucht', en: 'Booked' },
  came: { de: 'Erschienen', en: 'Came' },
  missed: { de: 'Nicht gekommen', en: 'Did not come' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
};
export const STATUS_DOTS: Record<AppointmentStatus, string> = {
  requested: 'bg-[#e8710a]',
  booked: 'bg-[#2f6fdb]',
  came: 'bg-[#1f9d55]',
  missed: 'bg-[#d99a00]',
  cancelled: 'bg-[#98a2b3]',
};
export const STATUS_CHIPS: Record<AppointmentStatus, string> = {
  requested: 'bg-[#fff0e6] text-[#9a3d00] ring-[#f6cfb2]',
  booked: 'bg-[#e8f0fd] text-[#1d4ea8] ring-[#c3d6f7]',
  came: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]',
  missed: 'bg-[#fff2d6] text-[#6e4700] ring-[#f1d9a6]',
  cancelled: 'bg-white text-[var(--casa-muted)] ring-ws-line',
};

/** How long an appointment the team writes in may take, in minutes. */
export const APPOINTMENT_LENGTHS = [15, 30, 45, 60, 90, 120] as const;
