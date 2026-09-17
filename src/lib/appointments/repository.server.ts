import 'server-only';

import { query, withTransaction } from '@/lib/admin/db';
import { storeEnquiryInTransaction, type EnquiryInput } from '@/lib/admin/intake';
import { APPOINTMENT_ZONE } from './schedule';

export async function takenAppointments() {
  const rows = await query<{ slot: string }>(
    `SELECT to_char(starts_at AT TIME ZONE $1, 'YYYY-MM-DD"T"HH24:MI') AS slot
       FROM group_appointments WHERE starts_at > now()`, [APPOINTMENT_ZONE]);
  return new Set(rows.map(row => row.slot));
}

export async function reserveAppointment(startsAt: Date, enquiry: EnquiryInput) {
  return withTransaction(async client => {
    const result = await client.query(
      `INSERT INTO group_appointments (request_id, starts_at) VALUES ($1, $2)
       ON CONFLICT (starts_at) DO NOTHING RETURNING request_id`, [enquiry.requestId, startsAt]);
    if (!result.rowCount) return false;
    await storeEnquiryInTransaction(client, enquiry);
    await client.query(
      `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail)
       SELECT 'Public website', 'enquiry', id, 'appointment_requested', $2::jsonb
       FROM enquiries WHERE request_id = $1`,
      [enquiry.requestId, JSON.stringify({ startsAt: startsAt.toISOString(), timeZone: APPOINTMENT_ZONE })]);
    return true;
  });
}
