import 'server-only';

import { courseSessionSql } from '../course-session';
import { query } from '../db';
import {
  learnersIn,
  SOON_DAYS,
  teamMatches,
  type AudienceSession,
  type CourseKind,
  type DayPair,
  type LearnerAudience,
  type LearnerFact,
  type TeamAudience,
  type TeamFact,
} from './audience-keys';

/**
 * Who is in a group („Rundmail", `audience-keys.ts`), read from the bookings and the staff register each
 * time. A learner is in a course when a booking that is reserved or confirmed has a period running today —
 * the register's „Im Kurs" —, and starts soon when one begins within `SOON_DAYS`. The course's kind is its
 * type (Bildungszeit sits in the intensive classes); its time of day is the course's (`courseSessionSql`);
 * its weekdays are the lesson days it has, Monday and Wednesday or Tuesday and Thursday, whichever it
 * mostly meets on, else the start's planned days. Each learner is written to at the address the rule of
 * 0114 chooses (`person_emails`): their own before an agency's.
 */

const KIND = `(CASE t.slug WHEN 'intensive-german' THEN 'intensive' WHEN 'bildungszeit' THEN 'intensive'
  WHEN 'evening-german' THEN 'evening' WHEN 'special-courses' THEN 'special' ELSE 'other' END)`;

const DAYS = `coalesce(
  (SELECT CASE WHEN count(*) FILTER (WHERE extract(isodow FROM d.on_date) IN (1, 3)) > count(*) FILTER (WHERE extract(isodow FROM d.on_date) IN (2, 4)) THEN 'mon-wed'
               WHEN count(*) FILTER (WHERE extract(isodow FROM d.on_date) IN (2, 4)) > count(*) FILTER (WHERE extract(isodow FROM d.on_date) IN (1, 3)) THEN 'tue-thu' END
     FROM course_days d WHERE d.course_id = bp.course_id AND bp.course_id IS NOT NULL),
  (SELECT CASE WHEN i.schedule->'days' ?& array['Mon', 'Wed'] AND NOT i.schedule->'days' ?| array['Tue', 'Thu'] THEN 'mon-wed'
               WHEN i.schedule->'days' ?& array['Tue', 'Thu'] AND NOT i.schedule->'days' ?| array['Mon', 'Wed'] THEN 'tue-thu' END
     FROM course_instances i WHERE i.id = coalesce(bp.course_instance_id, (SELECT c.course_instance_id FROM courses c WHERE c.id = bp.course_id))))`;

export async function learnerFacts(): Promise<LearnerFact[]> {
  const rows = await query<{ person_id: string; kind: CourseKind; session: AudienceSession | null; days: DayPair | null; now: boolean; soon: boolean }>(
    `SELECT canonical_person_id(b.person_id) AS person_id, ${KIND} AS kind,
            ${courseSessionSql('bp.course_id', 'bp.course_instance_id', 'b.course_type_id')} AS session,
            ${DAYS} AS days,
            (bp.start_date <= current_date) AS now,
            (bp.start_date > current_date) AS soon
       FROM bookings b
       JOIN booking_periods bp ON bp.booking_id = b.id
       LEFT JOIN course_types t ON t.id = b.course_type_id
      WHERE b.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed') AND b.exam_session_id IS NULL
        AND bp.end_date >= current_date AND bp.start_date <= current_date + ${SOON_DAYS}`
  );
  return rows.map((r) => ({ personId: r.person_id, kind: r.kind, session: r.session, days: r.days, now: r.now, soon: r.soon }));
}

export type AudienceMember = { name: string; email: string | null; viaAgency: boolean };

/** The learners of a group with the address each is written to. */
export async function learnerMembers(audience: LearnerAudience, facts?: LearnerFact[]): Promise<AudienceMember[]> {
  const ids = learnersIn(facts ?? (await learnerFacts()), audience);
  if (!ids.length) return [];
  const rows = await query<{ name: string; email: string | null; tier: number | null }>(
    `SELECT concat_ws(' ', p.first_name, p.last_name) AS name, c.address AS email, c.tier
       FROM people p
       LEFT JOIN LATERAL (SELECT pe.address, pe.tier FROM person_emails(p.id) pe ORDER BY pe.rank LIMIT 1) c ON true
      WHERE p.id = ANY ($1::uuid[]) AND p.deleted_at IS NULL
      ORDER BY p.last_name NULLS LAST, p.first_name`,
    [ids]
  );
  return rows.map((r) => ({ name: r.name, email: r.email, viaAgency: r.tier === 2 }));
}

export async function teamFacts(): Promise<(TeamFact & { name: string; email: string | null })[]> {
  const rows = await query<{ id: string; name: string; teaches: boolean; contract: string | null; email: string | null }>(
    `SELECT s.id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS name,
            EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = s.id AND r.role_code = 'teaching') AS teaches,
            (SELECT c.kind FROM staff_contracts c
              WHERE c.staff_member_id = s.id AND (c.valid_from IS NULL OR c.valid_from <= current_date) AND (c.valid_to IS NULL OR c.valid_to >= current_date)
              ORDER BY c.valid_from DESC NULLS LAST LIMIT 1) AS contract,
            -- Work mail to the work mailbox: the account's, a CASA address of theirs, else the rule's.
            coalesce(u.email,
                     (SELECT e.address FROM person_emails(s.person_id) e WHERE e.normalized LIKE '%@casa-bremen.de' ORDER BY e.rank LIMIT 1),
                     person_email(s.person_id)) AS email
       FROM staff_members s JOIN people p ON p.id = s.person_id LEFT JOIN staff_users u ON u.id = s.staff_user_id
      WHERE s.is_active
      ORDER BY p.last_name NULLS LAST, p.first_name`
  );
  return rows.map((r) => ({ staffId: r.id, name: r.name, teaches: r.teaches, contract: r.contract, email: r.email }));
}

export async function teamMembers(audience: TeamAudience): Promise<AudienceMember[]> {
  return (await teamFacts()).filter((f) => teamMatches(f, audience)).map((f) => ({ name: f.name, email: f.email, viaAgency: false }));
}

export type Reach = 'own' | 'agency' | 'none';

/** For each learner, whether they can be written to at an address of their own, only through an agency, or not at all. */
export async function learnerReach(ids: readonly string[]): Promise<Record<string, Reach>> {
  if (!ids.length) return {};
  const rows = await query<{ id: string; tier: number | null }>(
    `SELECT p.id, (SELECT pe.tier FROM person_emails(p.id) pe ORDER BY pe.rank LIMIT 1) AS tier FROM people p WHERE p.id = ANY ($1::uuid[])`,
    [[...new Set(ids)]]
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.tier === null ? 'none' : r.tier === 2 ? 'agency' : 'own']));
}
