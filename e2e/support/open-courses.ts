import type pg from 'pg';

/**
 * For a test that books into the real intensive courses around today (local data imported from
 * SchoolMan): opens those it has closed and sets aside SchoolMan's learner counts (0050), so the test
 * books open, empty classes. `restore()` puts both back. A full class is tested on purpose elsewhere.
 */
export async function openCoursesAroundToday(client: pg.Client): Promise<{ restore: () => Promise<void> }> {
  const around = `SELECT c.id FROM courses c JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types t ON t.id = i.course_type_id
                   WHERE t.format = 'intensive' AND i.end_date >= current_date - 70 AND i.start_date <= current_date + 70`;
  const reopened = (await client.query<{ id: string }>(`UPDATE courses SET bookable = true WHERE id IN (${around}) AND NOT bookable RETURNING id`)).rows.map((r) => r.id);
  const counts = (
    await client.query<{ course_id: string; monday: string; learners: number }>(
      `DELETE FROM course_week_learners WHERE course_id IN (${around}) RETURNING course_id, to_char(monday, 'YYYY-MM-DD') AS monday, learners`
    )
  ).rows;
  return {
    restore: async () => {
      if (reopened.length) await client.query(`UPDATE courses SET bookable = false WHERE id = ANY($1::uuid[])`, [reopened]);
      for (const c of counts) {
        await client.query(`INSERT INTO course_week_learners (course_id, monday, learners) VALUES ($1, $2::date, $3) ON CONFLICT DO NOTHING`, [c.course_id, c.monday, c.learners]);
      }
    },
  };
}
