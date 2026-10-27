/**
 * SchoolMan's exam sittings (`Exam`) as the workspace's (`exam_sessions`), one rule for every step that
 * meets one (2026-10-27): a learner's exam booking (import-learners), every sitting ahead (import-exams)
 * and a wait for an exam (import-intake).
 *
 * A sitting is found by SchoolMan's exam (`filemaker_exam_id`, 0056), else by its exam and day here (one
 * a colleague or the seeds made, which then takes SchoolMan's number), else made — as a draft, so a date
 * only SchoolMan knows never appears on the website until someone publishes it. An exam the catalogue does
 * not offer (TestDaF, TestAS) has none.
 */

// SchoolMan's exam references → our exam types.
export const EXAM_TYPE = { 3: 'telc_b2', 4: 'telc_c1_hochschule' };

export async function examSittings(client) {
  for (const [ref, code] of Object.entries(EXAM_TYPE)) await client.query(`UPDATE exam_types SET filemaker_id = $1 WHERE code = $2 AND filemaker_id IS NULL`, [Number(ref), code]);
  // Exam types with the hours their sittings are held at: a sitting made without hours of its own takes them.
  const types = new Map(
    (
      await client.query(
        `SELECT t.id, t.code,
                coalesce((SELECT to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') FROM exam_sessions s WHERE s.exam_type_id = t.id ORDER BY s.starts_at LIMIT 1), '09:00') AS starts,
                coalesce((SELECT to_char(s.ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') FROM exam_sessions s WHERE s.exam_type_id = t.id ORDER BY s.starts_at LIMIT 1), '17:00') AS ends
           FROM exam_types t`
      )
    ).rows.map((r) => [r.code, r])
  );
  const count = { linked: 0, made: 0 };

  /**
   * The sitting of SchoolMan's exam `{ id, ref, day, places, from?, to? }`, or null for an exam we do not
   * offer or without a day.
   */
  async function sittingFor(exam) {
    const type = types.get(EXAM_TYPE[exam.ref] ?? '');
    if (!type || !exam.day) return null;
    const known = (await client.query(`SELECT id FROM exam_sessions WHERE filemaker_exam_id = $1`, [exam.id])).rows[0];
    if (known) return { id: known.id, day: exam.day };
    const same = (
      await client.query(
        `UPDATE exam_sessions SET filemaker_exam_id = $1
          WHERE id = (SELECT id FROM exam_sessions WHERE exam_type_id = $2 AND (starts_at AT TIME ZONE 'Europe/Berlin')::date = $3::date AND filemaker_exam_id IS NULL
                       ORDER BY starts_at LIMIT 1)
          RETURNING id`,
        [exam.id, type.id, exam.day]
      )
    ).rows[0];
    if (same) {
      count.linked++;
      return { id: same.id, day: exam.day };
    }
    const timed = exam.from && exam.to && exam.to > exam.from;
    const made = (
      await client.query(
        `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, capacity, status, filemaker_exam_id)
         VALUES ($1, ($2::date + $3::time) AT TIME ZONE 'Europe/Berlin', ($2::date + $4::time) AT TIME ZONE 'Europe/Berlin', $5, 'draft', $6)
         RETURNING id`,
        [type.id, exam.day, timed ? exam.from : type.starts, timed ? exam.to : type.ends, Number(exam.places) > 0 ? Number(exam.places) : 20, exam.id]
      )
    ).rows[0];
    count.made++;
    return { id: made.id, day: exam.day };
  }

  return { types, sittingFor, count };
}
