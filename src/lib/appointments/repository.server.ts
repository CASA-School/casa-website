import 'server-only';

import { GROUP_CONTACT_EMAIL } from '@/config/content/contacts';
import { query, withTransaction } from '@/lib/admin/db';
import { storeEnquiryInTransaction, type EnquiryInput } from '@/lib/admin/intake';
import { APPOINTMENT_ZONE } from './schedule';

/**
 * Ina's times still ahead that are taken: a website request waiting for her, or a group
 * consultation she confirmed or wrote in herself (Termine, 0101).
 */
export async function takenAppointments() {
  const rows = await query<{ slot: string }>(
    `SELECT to_char(starts_at AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') AS slot
       FROM appointments
      WHERE kind = 'group_consultation' AND status IN ('requested', 'booked') AND starts_at > now()`, [APPOINTMENT_ZONE]);
  return new Set(rows.map(row => row.slot));
}

/**
 * A request from the groups page: the enquiry with the organiser's details, and the appointment
 * in Ina's „Meine Termine" (status `requested`) that she confirms, moves or cancels. Both are
 * assigned to the workspace account with her published address; without one, to nobody (the team).
 * Returns false when the time was taken meanwhile.
 */
export async function reserveAppointment(startsAt: Date, enquiry: EnquiryInput, note: string | null) {
  return withTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('group-consultation:' || $1::text, 0))`, [startsAt.toISOString()]);
    const taken = await client.query(
      `SELECT 1 FROM appointments
        WHERE kind = 'group_consultation' AND status IN ('requested', 'booked') AND starts_at = $1 LIMIT 1`, [startsAt]);
    if (taken.rowCount) return false;
    await storeEnquiryInTransaction(client, enquiry);
    await client.query(
      `WITH host AS (
         SELECT id FROM staff_users WHERE lower(email) = lower($2) AND is_active LIMIT 1
       ), e AS (
         UPDATE enquiries SET assigned_to = COALESCE(assigned_to, (SELECT id FROM host))
          WHERE request_id = $1 RETURNING id, locale
       )
       INSERT INTO appointments (kind, starts_at, minutes, first_name, last_name, email, locale, note, status, source, assigned_to, enquiry_id)
       SELECT 'group_consultation', $3, 30, $4, $5, $6, CASE WHEN e.locale = 'de' THEN 'de' ELSE 'en' END, $7,
              'requested', 'website', (SELECT id FROM host), e.id
         FROM e`,
      [enquiry.requestId, GROUP_CONTACT_EMAIL, startsAt, enquiry.firstName, enquiry.lastName, enquiry.email, note]);
    await client.query(
      `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail)
       SELECT 'Public website', 'enquiry', id, 'appointment_requested', $2::jsonb
       FROM enquiries WHERE request_id = $1`,
      [enquiry.requestId, JSON.stringify({ startsAt: startsAt.toISOString(), timeZone: APPOINTMENT_ZONE })]);
    return true;
  });
}
