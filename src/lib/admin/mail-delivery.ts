import 'server-only';

import { query } from './db';

/**
 * The website's mails not confirmed as sent (0102): each registration raises one flag per mail — the
 * team's notice, the sender's acknowledgement — and the provider's acceptance clears it. What is left is
 * a technical log (Rahman, 2026-11-01: „keep these type of interfaces under technical logs"), on Settings →
 * Technik, never on the registration itself.
 */

export type UnconfirmedMail = {
  flagId: string;
  registrationId: string;
  name: string;
  /** `team`: the notice to CASA; `receipt`: the acknowledgement to the sender. */
  mail: 'team' | 'receipt';
  since: Date;
};

export const MAIL_FLAGS = { registration_staff_notice_unconfirmed: 'team', registration_receipt_unconfirmed: 'receipt' } as const;

export async function unconfirmedMails(limit = 100): Promise<UnconfirmedMail[]> {
  const rows = await query<{ id: string; code: keyof typeof MAIL_FLAGS; created_at: Date; registration_id: string; name: string }>(
    `SELECT f.id, f.code, f.created_at, l.registration_id, concat_ws(' ', l.first_name, l.last_name) AS name
       FROM record_flags f
       JOIN LATERAL (
         SELECT c.registration_id, c.first_name, c.last_name FROM course_registrations c WHERE f.entity = 'course_registration' AND c.id = f.entity_id
         UNION ALL
         SELECT e.registration_id, e.first_name, e.last_name FROM exam_registrations e WHERE f.entity = 'exam_registration' AND e.id = f.entity_id
       ) l ON l.registration_id IS NOT NULL
      WHERE f.resolved_at IS NULL AND f.code = ANY($1::text[])
      ORDER BY f.created_at DESC
      LIMIT $2`,
    [Object.keys(MAIL_FLAGS), limit]
  );
  return rows.map((r) => ({ flagId: r.id, registrationId: r.registration_id, name: r.name, mail: MAIL_FLAGS[r.code], since: r.created_at }));
}

/** „Geprüft": a colleague followed one up by hand. Only these two flags, never another. */
export async function settleUnconfirmedMail(flagId: string, actorId: string): Promise<void> {
  await query(`UPDATE record_flags SET resolved_at = now(), resolved_by = $2 WHERE id = $1 AND resolved_at IS NULL AND code = ANY($3::text[])`, [
    flagId,
    actorId,
    Object.keys(MAIL_FLAGS),
  ]);
}
