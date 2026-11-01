import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import { needsLicence, type ExamParts } from './exam-parts';
import type { Bilingual } from './i18n';

/**
 * Examiner licences and who examines a sitting (2026-10-17, migration 0039; docs/ADMIN_WORKSPACE.md
 * §Staff). A licence is for one exam (telc Deutsch B2, C1 Hochschule …), with a number and the period
 * telc gives it. A colleague is put on a sitting for the written supervision, the oral part or both,
 * and the oral part needs a licence for that exam valid on the sitting's day: checked when they are put
 * on, and shown again if the licence has run out by the day.
 */

type Result = { ok: true } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

/** The sitting's day in Bremen, the day a licence must hold on. */
const SITTING_DAY = `(s.starts_at AT TIME ZONE 'Europe/Berlin')::date`;
const VALID_ON = (day: string) => `(l.valid_from IS NULL OR l.valid_from <= ${day}) AND (l.valid_to IS NULL OR l.valid_to >= ${day})`;

export type StaffLicence = {
  id: string;
  examTypeId: string;
  examName: string;
  number: string | null;
  validFrom: string | null;
  validTo: string | null;
  note: string | null;
  /** Valid today. */
  current: boolean;
};

export async function staffLicences(staffId: string): Promise<StaffLicence[]> {
  const rows = await query<{ id: string; exam_type_id: string; exam_name: string; licence_number: string | null; valid_from: string | null; valid_to: string | null; note: string | null; current: boolean }>(
    `SELECT l.id, l.exam_type_id, e.name AS exam_name, l.licence_number,
            to_char(l.valid_from, 'YYYY-MM-DD') AS valid_from, to_char(l.valid_to, 'YYYY-MM-DD') AS valid_to, l.note,
            ${VALID_ON('current_date')} AS current
       FROM staff_licences l JOIN exam_types e ON e.id = l.exam_type_id
      WHERE l.staff_member_id = $1
      ORDER BY (${VALID_ON('current_date')}) DESC, e.name, l.valid_to DESC NULLS FIRST`,
    [staffId]
  );
  return rows.map((r) => ({ id: r.id, examTypeId: r.exam_type_id, examName: r.exam_name, number: r.licence_number, validFrom: r.valid_from, validTo: r.valid_to, note: r.note, current: r.current }));
}

export type LicenceInput = { examTypeId: string; number: string | null; validFrom: string | null; validTo: string | null; note: string | null };

export async function saveLicence(staffId: string, licenceId: string | null, input: LicenceInput, actor: StaffUser): Promise<Result> {
  if (input.validFrom && input.validTo && input.validTo < input.validFrom) return refuse('Das Ende liegt vor dem Beginn.', 'The end is before the start.');
  const exam = await queryFirst<{ id: string }>(`SELECT id FROM exam_types WHERE id = $1`, [input.examTypeId]);
  if (!exam) return refuse('Bitte wähle die Prüfung.', 'Choose the exam.');
  if (licenceId) {
    await query(
      `UPDATE staff_licences SET exam_type_id = $3, licence_number = $4, valid_from = $5::date, valid_to = $6::date, note = $7
        WHERE id = $1 AND staff_member_id = $2`,
      [licenceId, staffId, input.examTypeId, input.number, input.validFrom, input.validTo, input.note]
    );
  } else {
    await query(
      `INSERT INTO staff_licences (staff_member_id, exam_type_id, licence_number, valid_from, valid_to, note, created_by)
       VALUES ($1, $2, $3, $4::date, $5::date, $6, $7)`,
      [staffId, input.examTypeId, input.number, input.validFrom, input.validTo, input.note, actor.id]
    );
  }
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: licenceId ? 'staff_licence_updated' : 'staff_licence_added' });
  return { ok: true };
}

export async function removeLicence(staffId: string, licenceId: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM staff_licences WHERE id = $1 AND staff_member_id = $2`, [licenceId, staffId]);
  await logActivity({ actor, entity: 'staff_member', entityId: staffId, action: 'staff_licence_removed' });
}

/** A colleague's sittings from a fortnight ago on: what they examine or supervise. */
export type ExaminerSitting = { sittingId: string; examName: string; startsAt: Date; part: ExamParts; licensed: boolean; cancelled: boolean };

export async function staffSittings(staffId: string): Promise<ExaminerSitting[]> {
  const rows = await query<{ id: string; exam_name: string; starts_at: Date; part: ExamParts; licensed: boolean; status: string }>(
    `SELECT s.id, e.name AS exam_name, s.starts_at, x.part, s.status,
            EXISTS (SELECT 1 FROM staff_licences l WHERE l.staff_member_id = x.staff_member_id AND l.exam_type_id = s.exam_type_id AND ${VALID_ON(SITTING_DAY)}) AS licensed
       FROM exam_session_examiners x JOIN exam_sessions s ON s.id = x.exam_session_id JOIN exam_types e ON e.id = s.exam_type_id
      WHERE x.staff_member_id = $1 AND s.starts_at >= current_date - 14
      ORDER BY s.starts_at`,
    [staffId]
  );
  return rows.map((r) => ({ sittingId: r.id, examName: r.exam_name, startsAt: r.starts_at, part: r.part, licensed: r.licensed, cancelled: r.status === 'cancelled' }));
}

/** Who examines a sitting, and whether each one's licence holds on the day. */
export type SittingExaminer = {
  staffId: string;
  name: string;
  shortName: string;
  part: ExamParts;
  licensed: boolean;
  /** How to reach them (2026-10-27, the examiner at the side): their own address, else their account's. */
  email: string | null;
  phone: string | null;
};

export async function sittingExaminers(sittingId: string): Promise<SittingExaminer[]> {
  const rows = await query<{ staff_member_id: string; name: string; short_name: string; part: ExamParts; licensed: boolean; email: string | null; phone: string | null }>(
    `SELECT x.staff_member_id, concat_ws(' ', p.first_name, p.last_name) AS name, m.short_name, x.part,
            EXISTS (SELECT 1 FROM staff_licences l WHERE l.staff_member_id = x.staff_member_id AND l.exam_type_id = s.exam_type_id AND ${VALID_ON(SITTING_DAY)}) AS licensed,
            coalesce(person_email(p.id), u.email) AS email,
            (SELECT ph.number FROM phones ph WHERE ph.person_id = p.id ORDER BY ph.is_primary DESC, ph.created_at LIMIT 1) AS phone
       FROM exam_session_examiners x
       JOIN exam_sessions s ON s.id = x.exam_session_id
       JOIN staff_members m ON m.id = x.staff_member_id JOIN people p ON p.id = m.person_id
       LEFT JOIN staff_users u ON u.id = m.staff_user_id
      WHERE x.exam_session_id = $1
      ORDER BY CASE x.part WHEN 'full' THEN 0 WHEN 'oral' THEN 1 ELSE 2 END, p.last_name, p.first_name`,
    [sittingId]
  );
  return rows.map((r) => ({ staffId: r.staff_member_id, name: r.name, shortName: r.short_name, part: r.part, licensed: r.licensed, email: r.email, phone: r.phone }));
}

/**
 * Who can be put on a sitting: active colleagues who examine or supervise, or hold a licence for this
 * exam, not on it yet — the licensed for that day first.
 */
export type ExaminerChoice = { staffId: string; name: string; licensed: boolean };

export async function examinerChoices(sittingId: string): Promise<ExaminerChoice[]> {
  const rows = await query<{ id: string; name: string; licensed: boolean }>(
    `SELECT m.id, concat_ws(' ', p.first_name, p.last_name) AS name,
            EXISTS (SELECT 1 FROM staff_licences l WHERE l.staff_member_id = m.id AND l.exam_type_id = s.exam_type_id AND ${VALID_ON(SITTING_DAY)}) AS licensed
       FROM exam_sessions s
       JOIN staff_members m ON m.is_active
       JOIN people p ON p.id = m.person_id
      WHERE s.id = $1
        AND NOT EXISTS (SELECT 1 FROM exam_session_examiners x WHERE x.exam_session_id = s.id AND x.staff_member_id = m.id)
        AND (EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = m.id AND r.role_code IN ('examiner', 'supervision'))
             OR EXISTS (SELECT 1 FROM staff_licences l WHERE l.staff_member_id = m.id AND l.exam_type_id = s.exam_type_id))
      ORDER BY 3 DESC, p.last_name, p.first_name`,
    [sittingId]
  );
  return rows.map((r) => ({ staffId: r.id, name: r.name, licensed: r.licensed }));
}

/** Puts a colleague on a sitting, or changes what they do there. The oral part needs the licence. */
export async function assignExaminer(sittingId: string, staffId: string, part: ExamParts, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ active: boolean; licensed: boolean; exam_name: string }>(
    `SELECT m.is_active AS active, e.name AS exam_name,
            EXISTS (SELECT 1 FROM staff_licences l WHERE l.staff_member_id = m.id AND l.exam_type_id = s.exam_type_id AND ${VALID_ON(SITTING_DAY)}) AS licensed
       FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id JOIN staff_members m ON m.id = $2
      WHERE s.id = $1`,
    [sittingId, staffId]
  );
  if (!row) return refuse('Diese Person oder dieser Termin ist nicht bekannt.', 'Unknown person or sitting.');
  if (!row.active) return refuse('Diese Person ist ausgeschieden.', 'This person has left.');
  if (needsLicence(part) && !row.licensed)
    return refuse(`Für die mündliche Prüfung braucht es eine Lizenz für ${row.exam_name}, gültig am Prüfungstag.`, `The oral part needs a licence for ${row.exam_name}, valid on the day.`);
  await query(
    `INSERT INTO exam_session_examiners (exam_session_id, staff_member_id, part, created_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (exam_session_id, staff_member_id) DO UPDATE SET part = EXCLUDED.part`,
    [sittingId, staffId, part, actor.id]
  );
  await logActivity({ actor, entity: 'exam_session', entityId: sittingId, action: 'examiner_assigned', detail: { part } });
  return { ok: true };
}

export async function unassignExaminer(sittingId: string, staffId: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM exam_session_examiners WHERE exam_session_id = $1 AND staff_member_id = $2`, [sittingId, staffId]);
  await logActivity({ actor, entity: 'exam_session', entityId: sittingId, action: 'examiner_unassigned' });
}

/** The exams a licence can be for. */
export async function licenceExams(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>(`SELECT id, name FROM exam_types WHERE is_active ORDER BY name`);
}
