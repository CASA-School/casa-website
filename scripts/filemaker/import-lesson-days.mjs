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
 * board groups are made (0047), so Kursplanung shows its days, and learns from them (0078).
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const { classrooms, plans, days, closed } = await readStdin();
const client = await connect();
const count = { days: days.length, inserted: 0, updated: 0, matched: 0, kept: 0, noCourse: 0, plans: 0, unknownTeacher: 0, unknownRoom: 0, merges: 0, learnt: 0, unchanged: 0, differed: 0, taken: 0 };

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
  // A day as it was last time, in the same course and with the same teacher and room here, is passed over (0088).
  const changed = await changes(client, 'lesson-days');

  // SchoolMan re-plans a course by deleting its lesson days and making them again under new numbers
  // (mapping review 2026-10-26 §9). A day here keeps its place and takes the new number of SchoolMan's day
  // on its date; a future day SchoolMan no longer has goes, unless it was changed here, attendance was
  // taken on it or it is part of a merge.
  const read = days.map((d) => d.id);
  const placed = days.flatMap((d) => (courses.has(d.course) ? [[courses.get(d.course), d]] : []));
  count.relinked = (
    await client.query(
      `UPDATE course_days c SET filemaker_id = v.id, updated_at = timezone('utc', now())
         FROM unnest($1::uuid[], $2::int[], $3::date[], $4::text[]) AS v(course_id, group_index, on_date, id)
        WHERE c.course_id = v.course_id AND c.group_index = v.group_index AND c.on_date = v.on_date
          AND c.filemaker_id IS NOT NULL AND NOT (c.filemaker_id = ANY($5::text[]))
          AND NOT EXISTS (SELECT 1 FROM course_days x WHERE x.filemaker_id = v.id)`,
      [placed.map(([t]) => t.course), placed.map(([t]) => t.group), placed.map(([, d]) => d.date), placed.map(([, d]) => d.id), read]
    )
  ).rowCount;
  count.removed = (
    await client.query(
      `DELETE FROM course_days c
        WHERE c.filemaker_id IS NOT NULL AND NOT (c.filemaker_id = ANY($1::text[])) AND c.course_id = ANY($2::uuid[])
          AND c.on_date >= current_date AND c.changed_by IS NULL
          AND NOT EXISTS (SELECT 1 FROM booking_attendance a WHERE a.course_day_id = c.id)
          AND NOT EXISTS (SELECT 1 FROM course_day_merges m WHERE c.id IN (m.guest_day_id, m.host_day_id))`,
      [read, [...new Set([...courses.values()].map((t) => t.course))]]
    )
  ).rowCount;
  // What each of SchoolMan's days says here now. A day is passed over only when SchoolMan's is as last time
  // and ours still says the same: a day renumbered above keeps the teacher and room it had, and a day whose
  // writing was refused once had its fingerprint kept all the same — both had left days wrong (2026-10-27,
  // Birte Klaila and Mariella Baier swapped on A2.1 and C1.1).
  const held = new Map(
    (
      await client.query(
        `SELECT filemaker_id, changed_by IS NOT NULL AS kept,
                json_build_array(teacher_id, replaced_teacher_id, room_id, replaced_room_id, to_char(starts_at, 'HH24:MI'), to_char(ends_at, 'HH24:MI'),
                                 lessons::float8, is_substitute, cancelled, merged, note) AS says
           FROM course_days WHERE filemaker_id = ANY($1::text[])`,
        [read]
      )
    ).rows.map((r) => [r.filemaker_id, r])
  );

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
    const here = held.get(d.id);
    if (changed.same(d.id, [d, target, fields])) {
      // A day's lessons are kept to one decimal here: SchoolMan's 1.33 is 1.3.
      const says = fields.map((v, i) => (i === 6 && v !== null ? Math.round(v * 10) / 10 : v));
      if (here && (here.kept || JSON.stringify(here.says) === JSON.stringify(says))) {
        count.unchanged++;
        continue;
      }
      if (here) count.differed++;
    }

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
    if (!made.rowCount) count.taken++;
  }
  await client.query(`SELECT link_course_days()`);
  // Kursplanung learns from these days: the levels, weekdays and shifts a teacher really teaches, and
  // the pair of a group without one (0078; only ever added).
  count.learnt = (await client.query(`SELECT learn_kursplanung() AS n`)).rows[0].n;
  await changed.save();
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.days} lesson days read (${closed} in a closure left out): ${count.unchanged} as last time, ${count.inserted} new, ${count.updated} updated (${count.differed} as last time in SchoolMan, not here), ` +
    `${count.matched} on a day here already, ${count.kept} changed here and kept · ${count.plans} weekly-plan rows · ` +
    `skipped: ${count.noCourse} of a course not here, ${count.taken} on a date another of SchoolMan's days has · ` +
    `unknown: ${count.unknownTeacher} teacher, ${count.unknownRoom} room references · ${count.merges} merges linked · ` +
    `${count.learnt} Kursplanung rules or pairs learnt · re-planned in SchoolMan: ${count.relinked ?? 0} days renumbered, ${count.removed ?? 0} future days gone`
);
