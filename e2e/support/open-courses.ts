import type pg from 'pg';

/**
 * For a test that books into the real intensive courses around today (local data imported from
 * SchoolMan): opens those it has closed and sets aside SchoolMan's learner counts (0050) and the
 * learners brought across from it (0052, put aside as deleted), so the test books open, empty classes.
 * `restore()` puts all of it back. A full class is tested on purpose elsewhere.
 */
export async function openCoursesAroundToday(client: pg.Client): Promise<{ restore: () => Promise<void> }> {
  const around = `SELECT c.id FROM courses c JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types t ON t.id = i.course_type_id
                   WHERE t.format = 'intensive' AND i.end_date >= current_date - 70 AND i.start_date <= current_date + 70`;
  const reopened = (await client.query<{ id: string }>(`UPDATE courses SET bookable = true WHERE id IN (${around}) AND NOT bookable RETURNING id`)).rows.map((r) => r.id);
  const counts = (
    await client.query<{ course_id: string; group_index: number; monday: string; learners: number }>(
      `DELETE FROM course_week_learners WHERE course_id IN (${around}) RETURNING course_id, group_index, to_char(monday, 'YYYY-MM-DD') AS monday, learners`
    )
  ).rows;
  const imported = (
    await client.query<{ id: string }>(
      `UPDATE bookings SET deleted_at = now() WHERE filemaker_booking_id IS NOT NULL AND deleted_at IS NULL
          AND id IN (SELECT booking_id FROM booking_periods WHERE course_id IN (${around})) RETURNING id`
    )
  ).rows.map((r) => r.id);
  return {
    restore: async () => {
      if (imported.length) await client.query(`UPDATE bookings SET deleted_at = NULL WHERE id = ANY($1::uuid[])`, [imported]);
      if (reopened.length) await client.query(`UPDATE courses SET bookable = false WHERE id = ANY($1::uuid[])`, [reopened]);
      for (const c of counts) {
        await client.query(`INSERT INTO course_week_learners (course_id, group_index, monday, learners) VALUES ($1, $2, $3::date, $4) ON CONFLICT DO NOTHING`, [
          c.course_id,
          c.group_index,
          c.monday,
          c.learners,
        ]);
      }
    },
  };
}
