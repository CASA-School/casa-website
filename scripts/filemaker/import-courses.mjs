/**
 * Puts SchoolMan's courses still running or ahead into the workspace's courses (2026-10-17,
 * docs/ADMIN_WORKSPACE.md §Courses).
 *
 *   python3 -I scripts/filemaker/read_courses.py | DATABASE_URL=... node scripts/filemaker/import-courses.mjs [--dry-run]
 *
 * One transaction; prints counts only. Matched on SchoolMan's course number, then on the start and
 * level, so a second run adds nothing twice; what the workspace already has wins.
 *
 * - An intensive or an evening course lands on the start of that type with the same first day: the
 *   starts are the website's dates, read from SchoolMan already (seed 0006), and none is made here. A
 *   level SchoolMan has twice on one start is one course with two groups.
 * - An exam preparation, a special module or a company's course is its own start, made here and not
 *   on the website (`on_website`), with its course: the title, the places, the price.
 * - An intensive course that has ended, of a start the website never had (before August 2026), gets that
 *   start here, off the website (2026-10-22): Kursplanung follows a class through its earlier levels.
 * - Its level by SchoolMan's numbers, not their text copies (2026-10-27, 0093): the band, and an evening
 *   course's step through `levels.filemaker_level_step_id`. Where it runs (`locations`, through
 *   `filemaker_links`), and the teacher's note from the Klassenbuch as a note on the course. A course of its
 *   own without a title takes SchoolMan's older one (`Supplement`) — in the workspace only.
 */
import { connect } from '../db/client.mjs';

const SESSION = { 2: 'morning', 4: 'afternoon', 5: 'evening' };
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PREPARATION = { CH: 'telc Deutsch C1 Hochschule', TD: 'TestDaF', B2: 'telc Deutsch B2' };

/** SchoolMan's level steps (`LevelStepReference` numbers) → our level codes, read from `levels` below. */
const steps = new Map();
/**
 * The level a course starts at: an intensive course runs its band from the first half (`B1` → `B1.1`);
 * an evening course teaches one half a term, the step SchoolMan links it to (`A2.2`).
 */
const levelOf = (c, slug) => (slug === 'evening-german' ? steps.get(c.step ?? '') : null) ?? (/^[ABC][12]\+?$/.test(c.band ?? '') ? `${c.band}.1` : null);
/** A course of its own's title when SchoolMan gives none. */
const defaultTitle = (c, type) =>
  type.slug === 'exam-preparation' ? `${PREPARATION[c.band] ?? 'Prüfung'} – Prüfungsvorbereitung` : type.slug === 'in-company' ? 'Firmenkurs' : type.name;
const weekday = (iso) => WEEK[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const money = (value) => {
  const n = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
  return value && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
/**
 * SchoolMan's places as groups and places per group: a group takes up to 16; 28 or 42 are two or three
 * groups of 14, which is how SchoolMan writes a level with parallel groups.
 */
const placesOf = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return { groups: 1, perGroup: 14 };
  if (n <= 16) return { groups: 1, perGroup: n };
  return { groups: Math.min(9, Math.round(n / 14)), perGroup: 14 };
};
const places = (value) => placesOf(value).perGroup;

/** The days a course meets: an intensive week, an evening pair, or once a week on its first day. */
function days(slug, session, start) {
  if (session === 'morning' && slug !== 'special-courses' && slug !== 'in-company') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  if (session === 'afternoon' && slug !== 'special-courses' && slug !== 'in-company') return ['Mon', 'Tue', 'Wed', 'Thu'];
  const first = weekday(start);
  if (slug === 'evening-german') return first === 'Mon' ? ['Mon', 'Wed'] : first === 'Tue' ? ['Tue', 'Thu'] : [first];
  return [first];
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const courses = await readStdin();
const client = await connect();
const count = { read: courses.length, matched: 0, created: 0, groups: 0, starts: 0, pastStarts: 0, noStart: 0, noLevel: 0, otherType: 0, located: 0, notes: 0, notesGone: 0, titled: 0 };
const today = new Date().toISOString().slice(0, 10);;

try {
  await client.query('BEGIN');
  const types = new Map((await client.query(`SELECT filemaker_id::text AS fm, id, slug, name FROM course_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r]));
  const levels = new Set((await client.query(`SELECT code FROM levels`)).rows.map((r) => r.code));
  for (const r of (await client.query(`SELECT code, filemaker_level_step_id::text AS fm FROM levels WHERE filemaker_level_step_id IS NOT NULL`)).rows) steps.set(r.fm, r.code);

  // An intensive or evening level SchoolMan has more than once on a start: parallel groups.
  const key = (c) => `${c.type}|${c.start}|${c.daytime}|${levelOf(c, types.get(c.type)?.slug)}`;
  // Their numbers, group by group (`filemaker_group_ids`): each group's lesson days land on it.
  const parallel = new Map();
  for (const c of courses) parallel.set(key(c), [...(parallel.get(key(c)) ?? []), c.id].sort((a, b) => Number(a) - Number(b)));
  const seen = new Set();

  for (const c of courses.sort((a, b) => Number(a.id) - Number(b.id))) {
    const type = types.get(c.type);
    if (!type || !c.start || !c.end) {
      count.otherType++;
      continue;
    }
    if (type.slug === 'intensive-german' || type.slug === 'evening-german') {
      const level = levelOf(c, type.slug);
      if (!level || !levels.has(level)) {
        count.noLevel++;
        continue;
      }
      let start = (
        await client.query(
          `SELECT id FROM course_instances WHERE course_type_id = $1 AND start_date = $2::date AND status <> 'cancelled' ORDER BY created_at LIMIT 1`,
          [type.id, c.start]
        )
      ).rows[0];
      // A past start's classes keep their own shift on the course (below), as a start of ours leaves to CASA.
      const past = type.slug === 'intensive-german' && c.end < today;
      if (!start && past) {
        const session = SESSION[c.daytime] ?? 'morning';
        start = (
          await client.query(
            `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, on_website)
             VALUES ($1, $2::date, $3::date, 0, $4::jsonb, 'scheduled', false) RETURNING id`,
            [type.id, c.start, c.end, JSON.stringify({ days: days(type.slug, session, c.start), time: c.hours ? `${c.hours[0]}-${c.hours[1]}` : '09:00-12:30' })]
          )
        ).rows[0];
        count.pastStarts++;
      }
      if (!start) {
        count.noStart++;
        continue;
      }
      if (seen.has(key(c))) continue;
      seen.add(key(c));
      const ids = parallel.get(key(c));
      const groups = Math.max(ids.length, placesOf(c.places).groups);
      const existing = (await client.query(`SELECT id, filemaker_course_id FROM courses WHERE course_instance_id = $1 AND level_code = $2`, [start.id, level])).rows[0];
      if (existing) {
        // The workspace's own places stay; SchoolMan's numbers and its parallel groups are added.
        const r = await client.query(
          `UPDATE courses SET filemaker_course_id = coalesce(filemaker_course_id, $2), groups = greatest(groups, $3), filemaker_group_ids = $4::text[],
                  updated_at = timezone('utc', now())
            WHERE id = $1 AND (filemaker_course_id IS NULL OR groups < $3 OR filemaker_group_ids IS DISTINCT FROM $4::text[])`,
          [existing.id, c.id, groups, ids]
        );
        count.matched++;
        if (r.rowCount && groups > 1) count.groups++;
      } else {
        await client.query(
          `INSERT INTO courses (course_instance_id, level_code, groups, places_per_group, bookable, price, filemaker_course_id, filemaker_group_ids, session)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9) ON CONFLICT DO NOTHING`,
          [start.id, level, groups, places(c.places), c.bookable && c.active, type.slug === 'evening-german' ? money(c.price) : null, c.id, ids,
           past ? (SESSION[c.daytime] ?? null) : null]
        );
        count.created++;
        if (groups > 1) count.groups++;
      }
      continue;
    }

    // A course of its own: its start, made here and not on the website, then the course.
    if ((await client.query(`UPDATE courses SET filemaker_group_ids = ARRAY[$1] WHERE filemaker_course_id = $1 AND filemaker_group_ids IS NULL`, [c.id])).rowCount ||
        (await client.query(`SELECT 1 FROM courses WHERE filemaker_course_id = $1`, [c.id])).rowCount) {
      count.matched++;
      continue;
    }
    const session = SESSION[c.daytime] ?? null;
    const title = c.title ?? defaultTitle(c, type);
    const schedule = { days: days(type.slug, session, c.start), time: c.hours ? `${c.hours[0]}-${c.hours[1]}` : '' };
    const start = (
      await client.query(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, session, title, on_website)
         VALUES ($1, $2::date, $3::date, $4, $5::jsonb, 'scheduled', $6, $7, false) RETURNING id`,
        [type.id, c.start, c.end, places(c.places), JSON.stringify(schedule), session, title]
      )
    ).rows[0];
    count.starts++;
    const level = levelOf(c, type.slug);
    await client.query(
      `INSERT INTO courses (course_instance_id, level_code, title, places_per_group, bookable, price, filemaker_course_id, filemaker_group_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ARRAY[$7])`,
      [start.id, level && levels.has(level) ? level : null, c.title ?? c.supplement ?? title, places(c.places), c.bookable && c.active, money(c.price), c.id]
    );
    count.created++;
  }

  // What SchoolMan says about each course, on the course its number names here (0093): where it runs, the
  // teacher's note, and an older title where it has none of its own — one the importer gave, never a colleague's.
  const ours = new Map();
  for (const r of (await client.query(`SELECT id, filemaker_course_id, filemaker_group_ids, title, updated_by FROM courses WHERE filemaker_course_id IS NOT NULL OR filemaker_group_ids IS NOT NULL`)).rows) {
    (r.filemaker_group_ids ?? []).forEach((fm) => ours.set(fm, r));
    if (r.filemaker_course_id && !ours.has(r.filemaker_course_id)) ours.set(r.filemaker_course_id, r);
  }
  const locations = new Map(
    (await client.query(`SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = 'location' AND source_database = 'SchoolMan' AND source_layout = 'LocationReference'`)).rows.map(
      (r) => [r.k, r.v]
    )
  );
  for (const c of courses) {
    const course = ours.get(c.id);
    if (!course) continue;
    const location = locations.get(c.location ?? '') ?? null;
    if (location) count.located += (await client.query(`UPDATE courses SET location_id = $2 WHERE id = $1 AND location_id IS DISTINCT FROM $2`, [course.id, location])).rowCount;
    const type = types.get(c.type);
    if (!c.title && c.supplement && type && !course.updated_by && course.title === defaultTitle(c, type)) {
      count.titled += (await client.query(`UPDATE courses SET title = $2 WHERE id = $1 AND updated_by IS NULL`, [course.id, c.supplement])).rowCount;
    }
    const ref = `Course.CommentOnCourse:${c.id}`;
    if (c.note) {
      count.notes += (
        await client.query(
          `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
           VALUES ('course', $1, $2, 'Klassenbuch', $3, coalesce(($4::date + time '12:00') AT TIME ZONE 'Europe/Berlin', now()))
           ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE SET entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, created_at = EXCLUDED.created_at
             WHERE (staff_notes.entity_id, staff_notes.body) IS DISTINCT FROM (EXCLUDED.entity_id, EXCLUDED.body)`,
          [course.id, c.note.slice(0, 20000), ref, c.changed]
        )
      ).rowCount;
    } else {
      count.notesGone += (await client.query(`DELETE FROM staff_notes WHERE filemaker_ref = $1`, [ref])).rowCount;
    }
  }
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.read} courses read: ${count.created} new, ${count.matched} already here · ${count.groups} with parallel groups · ${count.starts} own starts made · ${count.pastStarts} past intensive starts made · ` +
    `skipped: ${count.noStart} without a start of ours, ${count.noLevel} without a level, ${count.otherType} of a type we do not have\n` +
    `${count.located} places set · ${count.notes} teacher's notes written, ${count.notesGone} removed · ${count.titled} titles from SchoolMan's older title`
);
