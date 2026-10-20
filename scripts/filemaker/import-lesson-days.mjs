/**
 * Puts SchoolMan's weekly plans and lesson days of the courses still running or ahead into the
 * workspace (2026-10-17, docs/ADMIN_WORKSPACE.md §Lesson days). Run the course import first: a day
 * lands on the course whose SchoolMan number it carries, a parallel group's on its group.
 *
 *   python3 -I scripts/filemaker/read_lesson_days.py | DATABASE_URL=... node scripts/filemaker/import-lesson-days.mjs [--dry-run]
 *
 * One transaction; prints counts only. What the workspace has wins:
 * - a course's weekly plan comes across only for a group that has none here;
 * - a day read before is updated only while nobody here has changed it (`changed_by` empty);
 * - a day the workspace already has on that date (the board's, or made from the plan) gets SchoolMan's
 *   number and only the teacher and room it lacks.
 * A day's hours and lessons are its own only where they differ from the plan's. An intensive course's
 * board groups are made (0047), so Kursplanung shows its days.
 */
import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { classrooms, plans, days, closed } = await readStdin();
const client = await connect();
const count = { days: days.length, inserted: 0, updated: 0, matched: 0, kept: 0, noCourse: 0, plans: 0, unknownTeacher: 0, unknownRoom: 0, merges: 0 };

try {
  await client.query('BEGIN');

  // SchoolMan's course numbers → a course and its group.
  const courses = new Map();
  for (const r of (await client.query(`SELECT id, filemaker_course_id, filemaker_group_ids FROM courses WHERE filemaker_course_id IS NOT NULL OR filemaker_group_ids IS NOT NULL`)).rows) {
    (r.filemaker_group_ids ?? []).forEach((fm, i) => courses.set(fm, { course: r.id, group: i + 1 }));
    if (r.filemaker_course_id && !courses.has(r.filemaker_course_id)) courses.set(r.filemaker_course_id, { course: r.id, group: 1 });
  }
  const staff = new Map((await client.query(`SELECT id, filemaker_staff_id FROM staff_members WHERE filemaker_staff_id IS NOT NULL`)).rows.map((r) => [r.filemaker_staff_id, r.id]));
  const teacher = (fm) => {
    if (!fm) return null;
    const id = staff.get(fm);
    if (!id) count.unknownTeacher++;
    return id ?? null;
  };

  // SchoolMan's classrooms → rooms here (ported in 0008): by the city name the team uses, then the
  // room's name, then its number; only where exactly one room matches.
  const rooms = (await client.query(`SELECT id, name, short_name, nickname FROM rooms`)).rows;
  const lower = (v) => (v ?? '').trim().toLowerCase();
  const only = (list) => (list.length === 1 ? list[0].id : null);
  const roomOf = new Map();
  for (const c of classrooms) {
    const id =
      (c.city && only(rooms.filter((r) => lower(r.nickname) === lower(c.city)))) ||
      (c.city && only(rooms.filter((r) => lower(r.name) === lower(c.city)))) ||
      (c.number && only(rooms.filter((r) => lower(r.short_name) === lower(c.number))));
    if (id) roomOf.set(c.id, id);
  }
  const room = (fm) => {
    if (!fm) return null;
    const id = roomOf.get(fm);
    if (!id) count.unknownRoom++;
    return id ?? null;
  };

  // Weekly plans, for a course group with none here.
  const touched = new Set();
  const planned = new Set((await client.query(`SELECT DISTINCT course_id || '|' || group_index AS key FROM course_week_plans`)).rows.map((r) => r.key));
  const seen = new Set();
  for (const p of plans) {
    const target = courses.get(p.course);
    if (!target || p.to <= p.from) continue;
    const key = `${target.course}|${target.group}`;
    if (planned.has(key) || seen.has(`${key}|${p.weekday}`)) continue;
    seen.add(`${key}|${p.weekday}`);
    await client.query(
      `INSERT INTO course_week_plans (course_id, group_index, weekday, starts_at, ends_at, lessons, teacher_id, room_id)
       VALUES ($1, $2, $3, $4::time, $5::time, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [target.course, target.group, p.weekday, p.from, p.to, p.lessons ?? 0, teacher(p.teacher), room(p.room)]
    );
    count.plans++;
  }

  // The board's groups of the intensive courses, and the board's days given their course.
  for (const d of days) if (courses.has(d.course)) touched.add(courses.get(d.course).course);
  for (const id of touched) await client.query(`SELECT make_course_board_groups($1)`, [id]);
  await client.query(`SELECT link_course_groups()`);
  await client.query(`SELECT link_course_days()`);
  // SchoolMan's „Zusammenlegung": the day without a room joins its parallel groups' days (0074).
  count.merges = (await client.query(`SELECT link_course_day_merges() AS n`)).rows[0].n;

  const plan = new Map(
    (await client.query(`SELECT course_id, group_index, weekday, to_char(starts_at, 'HH24:MI') AS f, to_char(ends_at, 'HH24:MI') AS t, lessons FROM course_week_plans WHERE course_id = ANY($1::uuid[])`, [[...touched]])).rows.map(
      (r) => [`${r.course_id}|${r.group_index}|${r.weekday}`, r]
    )
  );
  const isoWeekday = (iso) => ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

  for (const d of days) {
    const target = courses.get(d.course);
    if (!target) {
      count.noCourse++;
      continue;
    }
    const p = plan.get(`${target.course}|${target.group}|${isoWeekday(d.date)}`);
    const ownHours = d.from && d.to && d.to > d.from && (!p || p.f !== d.from || p.t !== d.to);
    const ownLessons = d.lessons !== null && (!p || Number(p.lessons) !== d.lessons);
    // SchoolMan sometimes records the teacher or room a day replaced as the same one: not a change.
    const now = { teacher: teacher(d.teacher), room: room(d.room) };
    const replaced = d.replaced && d.replaced !== d.teacher ? teacher(d.replaced) : null;
    const values = {
      teacher: now.teacher,
      replaced,
      room: now.room,
      replacedRoom: d.replacedRoom && d.replacedRoom !== d.room ? room(d.replacedRoom) : null,
      from: ownHours ? d.from : null,
      to: ownHours ? d.to : null,
      lessons: ownLessons ? d.lessons : null,
      substitute: d.mark === 'cover' || Boolean(replaced),
      cancelled: d.mark === 'off',
      merged: d.mark === 'merged',
      note: d.mark === 'moved' ? 'Verschoben' : null,
    };
    const fields = [
      values.teacher,
      values.replaced,
      values.room,
      values.replacedRoom,
      values.from,
      values.to,
      values.lessons,
      values.substitute,
      values.cancelled,
      values.merged,
      values.note,
    ];

    // Read before: updated while nobody here has changed it.
    const before = (await client.query(`SELECT changed_by FROM course_days WHERE filemaker_id = $1`, [d.id])).rows[0];
    if (before) {
      if (before.changed_by) {
        count.kept++;
        continue;
      }
      await client.query(
        `UPDATE course_days SET teacher_id = $2, replaced_teacher_id = $3, room_id = $4, replaced_room_id = $5, starts_at = $6::time, ends_at = $7::time,
                lessons = $8, is_substitute = $9, cancelled = $10, merged = $11, note = $12, updated_at = timezone('utc', now())
          WHERE filemaker_id = $1`,
        [d.id, ...fields]
      );
      count.updated++;
      continue;
    }
    // The workspace's own day on that date: SchoolMan's number, and what it lacks.
    const own = await client.query(
      `UPDATE course_days SET filemaker_id = $4, teacher_id = coalesce(teacher_id, $5), room_id = coalesce(room_id, $6), updated_at = timezone('utc', now())
        WHERE course_id = $1 AND group_index = $2 AND on_date = $3::date AND filemaker_id IS NULL`,
      [target.course, target.group, d.date, d.id, now.teacher, now.room]
    );
    if (own.rowCount) {
      count.matched++;
      continue;
    }
    const made = await client.query(
      `INSERT INTO course_days (course_id, group_index, on_date, teacher_id, replaced_teacher_id, room_id, replaced_room_id, starts_at, ends_at, lessons,
                                is_substitute, cancelled, merged, note, filemaker_id)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8::time, $9::time, $10, $11, $12, $13, $14, $15)
       ON CONFLICT DO NOTHING`,
      [target.course, target.group, d.date, ...fields, d.id]
    );
    count.inserted += made.rowCount ?? 0;
  }
  await client.query(`SELECT link_course_days()`);
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.days} lesson days read (${closed} in a closure left out): ${count.inserted} new, ${count.updated} updated, ${count.matched} on a day here already, ` +
    `${count.kept} changed here and kept · ${count.plans} weekly-plan rows · skipped: ${count.noCourse} of a course not here · ` +
    `unknown: ${count.unknownTeacher} teacher, ${count.unknownRoom} room references · ${count.merges} merges linked`
);
