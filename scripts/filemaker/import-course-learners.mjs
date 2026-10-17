/**
 * Puts SchoolMan's learners per course and week into `course_week_learners` (2026-10-17,
 * docs/ADMIN_WORKSPACE.md §Courses). Run the course import first: a count lands on the course whose
 * SchoolMan numbers include its course (a level's parallel groups add up).
 *
 *   python3 -I scripts/filemaker/read_course_learners.py | DATABASE_URL=... node scripts/filemaker/import-course-learners.mjs [--dry-run]
 *
 * One transaction; prints counts only. Each read replaces what the last one wrote for those courses.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const rows = await readStdin();
const client = await connect();
const count = { read: rows.length, weeks: 0, courses: 0, noCourse: 0 };

try {
  await client.query('BEGIN');
  const courses = new Map();
  for (const r of (await client.query(`SELECT id, filemaker_course_id, filemaker_group_ids FROM courses WHERE filemaker_course_id IS NOT NULL OR filemaker_group_ids IS NOT NULL`)).rows) {
    for (const fm of r.filemaker_group_ids ?? []) courses.set(fm, r.id);
    if (r.filemaker_course_id && !courses.has(r.filemaker_course_id)) courses.set(r.filemaker_course_id, r.id);
  }
  // A course's groups add up, week by week.
  const sums = new Map();
  for (const r of rows) {
    const course = courses.get(r.course);
    if (!course) {
      count.noCourse++;
      continue;
    }
    const key = `${course}|${r.monday}`;
    sums.set(key, (sums.get(key) ?? 0) + r.n);
  }
  const touched = [...new Set([...sums.keys()].map((k) => k.split('|')[0]))];
  await client.query(`DELETE FROM course_week_learners WHERE course_id = ANY($1::uuid[])`, [touched]);
  for (const [key, n] of sums) {
    const [course, monday] = key.split('|');
    await client.query(`INSERT INTO course_week_learners (course_id, monday, learners) VALUES ($1, $2::date, $3)`, [course, monday, n]);
    count.weeks++;
  }
  count.courses = touched.length;
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(`${count.read} course weeks read: ${count.weeks} written for ${count.courses} courses · skipped: ${count.noCourse} of a course not here`);
