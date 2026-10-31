import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';

/**
 * A website registration and the SchoolMan booking made from it (0113, Rahman 2026-10-31). The bridge
 * links what is sure at the end of every run (`link_registrations_to_schoolman()`); what is not sure is
 * asked on the Anmeldung — „In SchoolMan gebucht?" — and answered here. One rule decides both, the
 * database's `registration_schoolman_candidates()`, and one function makes a link, `link_registration_line()`.
 * docs/ADMIN_WORKSPACE.md §Website registrations and SchoolMan bookings.
 */

export type LineKind = 'course' | 'exam';

export type SchoolmanCandidate = {
  lineKind: LineKind;
  lineId: string;
  bookingId: string;
  bookingNumber: string;
  learnerName: string;
  /** „Intensivkurs B1.1", „telc Deutsch B2". */
  what: string | null;
  from: string | null;
  to: string | null;
  /** When it was made in SchoolMan. */
  bookedAt: Date;
  byEmail: boolean;
  byBirth: boolean;
  byName: boolean;
  samePerson: boolean;
  /** The start or sitting asked for. */
  exact: boolean;
  bookedAfter: boolean;
  sure: boolean;
};

const DAY = `'YYYY-MM-DD'`;

export async function schoolmanCandidates(registrationId: string): Promise<SchoolmanCandidate[]> {
  const rows = await query<{
    line_kind: LineKind;
    line_id: string;
    booking_id: string;
    number: string;
    learner: string;
    what: string | null;
    from_day: string | null;
    to_day: string | null;
    booked_at: Date;
    by_email: boolean;
    by_birth: boolean;
    by_name: boolean;
    same_person: boolean;
    exact: boolean;
    booked_after: boolean;
    sure: boolean;
  }>(
    `SELECT c.line_kind, c.line_id, c.booking_id, b.number, concat_ws(' ', p.first_name, p.last_name) AS learner,
            coalesce(
              (SELECT x.name FROM exam_sessions s JOIN exam_types x ON x.id = s.exam_type_id WHERE s.id = b.exam_session_id),
              concat_ws(' ', coalesce(nullif(btrim(t.name_de), ''), t.name),
                        (SELECT string_agg(DISTINCT bp.level_code, ' · ') FROM booking_periods bp WHERE bp.booking_id = b.id))
            ) AS what,
            coalesce(to_char((SELECT s.starts_at AT TIME ZONE 'Europe/Berlin' FROM exam_sessions s WHERE s.id = b.exam_session_id), ${DAY}),
                     to_char((SELECT min(bp.start_date) FROM booking_periods bp WHERE bp.booking_id = b.id), ${DAY})) AS from_day,
            to_char((SELECT max(bp.end_date) FROM booking_periods bp WHERE bp.booking_id = b.id), ${DAY}) AS to_day,
            b.created_at AS booked_at, c.by_email, c.by_birth, c.by_name, c.same_person, c.exact, c.booked_after, coalesce(c.sure, false) AS sure
       FROM registration_schoolman_candidates($1) c
       JOIN bookings b ON b.id = c.booking_id
       JOIN people p ON p.id = canonical_person_id(b.person_id)
       LEFT JOIN course_types t ON t.id = b.course_type_id
      ORDER BY c.sure DESC, c.exact DESC, b.created_at DESC`,
    [registrationId]
  );
  return rows.map((r) => ({
    lineKind: r.line_kind,
    lineId: r.line_id,
    bookingId: r.booking_id,
    bookingNumber: r.number,
    learnerName: r.learner,
    what: r.what,
    from: r.from_day,
    to: r.to_day,
    bookedAt: r.booked_at,
    byEmail: r.by_email,
    byBirth: r.by_birth,
    byName: r.by_name,
    samePerson: r.same_person,
    exact: r.exact,
    bookedAfter: r.booked_after,
    sure: r.sure,
  }));
}

/** The Anmeldungen with a SchoolMan booking that may be theirs: the list marks them (0113). One query for the page. */
export async function registrationsWithSchoolmanCandidates(): Promise<Set<string>> {
  const rows = await query<{ registration_id: string }>(`SELECT DISTINCT registration_id FROM registration_schoolman_candidates()`);
  return new Set(rows.map((r) => r.registration_id));
}

/** „Verknüpfen": a colleague says this booking is the line's. Only a candidate the rule offers can be linked. */
export async function linkToSchoolmanBooking(registrationId: string, kind: LineKind, lineId: string, bookingId: string, actor: StaffUser): Promise<boolean> {
  const offered = await queryFirst(`SELECT 1 FROM registration_schoolman_candidates($1) WHERE line_id = $2 AND booking_id = $3`, [registrationId, lineId, bookingId]);
  if (!offered) return false;
  const row = await queryFirst<{ ok: boolean }>(`SELECT link_registration_line($1, $2, $3, $4, $5) AS ok`, [kind, lineId, bookingId, actor.id, actor.name]);
  return row?.ok === true;
}

/** „Nicht dieselbe": that booking is not offered for the line again. */
export async function dismissSchoolmanBooking(registrationId: string, lineId: string, bookingId: string, actor: StaffUser): Promise<void> {
  const inserted = await query(
    `INSERT INTO registration_link_dismissals (line_id, booking_id, dismissed_by)
     SELECT $2, $3, $4 WHERE EXISTS (SELECT 1 FROM registration_schoolman_candidates($1) WHERE line_id = $2 AND booking_id = $3)
     ON CONFLICT DO NOTHING RETURNING line_id`,
    [registrationId, lineId, bookingId, actor.id]
  );
  if (inserted.length) {
    await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_link_dismissed', detail: { booking: bookingId } });
  }
}

/**
 * „Verknüpfung lösen" on a line linked to a SchoolMan booking: the booking no longer points at it, the line
 * is open again, and that booking is not offered for it again — else the next run of the bridge would
 * link it back. The two people stay one; „Trennen" on the person parts them. A booking made in the
 * workspace is not unlinked here: it is the line's by having been booked from it.
 */
export async function unlinkSchoolmanBooking(registrationId: string, kind: LineKind, lineId: string, actor: StaffUser): Promise<boolean> {
  const source = kind === 'course' ? 'source_registration_id' : 'source_exam_registration_id';
  const table = kind === 'course' ? 'course_registrations' : 'exam_registrations';
  const unlinked = await withTransaction(async (client) => {
    const booking = await client.query<{ id: string; number: string }>(
      `UPDATE bookings b SET ${source} = NULL
        WHERE b.${source} = $1 AND b.filemaker_booking_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM ${table} l WHERE l.id = $1 AND l.registration_id = $2)
        RETURNING b.id, b.number`,
      [lineId, registrationId]
    );
    if (!booking.rowCount) return null;
    await client.query(`UPDATE ${table} SET status = 'new' WHERE id = $1`, [lineId]);
    await client.query(`UPDATE registrations SET status = 'in_progress' WHERE id = $1 AND status IN ('done', 'declined')`, [registrationId]);
    await client.query(
      `INSERT INTO registration_link_dismissals (line_id, booking_id, dismissed_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [lineId, booking.rows[0].id, actor.id]
    );
    return booking.rows[0];
  });
  if (!unlinked) return false;
  await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_unlinked_schoolman', detail: { number: unlinked.number } });
  return true;
}
