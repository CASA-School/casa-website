import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { queryFirst } from './db';

/**
 * A booking's course books handed out (0087, Rahman 2026-10-23): the book line turns from red to green
 * when the colleague at the desk gives the learner their books — on the first day or a few days before —
 * and back if it was a mistake. Only a book line can be handed out.
 */
export async function setBooksHandedOut(chargeId: string, handedOut: boolean, actor: StaffUser): Promise<{ ok: boolean }> {
  const row = await queryFirst<{ booking_id: string; description: string }>(
    `UPDATE booking_charges
        SET handed_out = $2, handed_out_at = CASE WHEN $2 THEN now() END, handed_out_by = CASE WHEN $2 THEN $3::uuid END
      WHERE id = $1 AND kind = 'books'
      RETURNING booking_id, description`,
    [chargeId, handedOut, actor.id]
  );
  if (!row) return { ok: false };
  await logActivity({
    actor,
    entity: 'booking',
    entityId: row.booking_id,
    action: handedOut ? 'books_handed_out' : 'books_taken_back',
    detail: { description: row.description },
  });
  return { ok: true };
}
