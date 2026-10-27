/**
 * Puts SchoolMan's group visits into `group_visits` (2026-10-18, migration 0058; docs/ADMIN_WORKSPACE.md
 * §Groups, docs/schoolman/groups.md): all 52, with the comments about them and their work log, and links
 * the participants' bookings and the group's own courses to them.
 *
 *   python3 -I scripts/filemaker/read_groups.py | DATABASE_URL=... node scripts/filemaker/import-groups.mjs [--dry-run]
 *
 * Run after the learners and the organisations (it links their bookings and names their organisations).
 * One transaction; prints counts only.
 *
 * - A visit keeps SchoolMan's number (`filemaker_group_id`). While no colleague has changed it here, a
 *   re-run takes SchoolMan's values as they are now; once someone has, SchoolMan only fills what is empty.
 * - Its school or company and its agency are the organisations linked to SchoolMan's `Corporate` and
 *   `Agency` (`filemaker_links`); its course type is matched on `course_types.filemaker_id`.
 * - A participant's booking that came across with the learners is the visit's (`bookings.group_visit_id`);
 *   so is a course of the group's we have (`courses.group_visit_id`), which also gets the visit's school
 *   or company where it names none.
 * - The comments become notes on the visit under their SchoolMan author; the work log its history
 *   (`schoolman_log`, read afresh each run).
 */
import { connect } from '../db/client.mjs';
import { historyProcesses, logDetail } from './history-line.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const groups = await readStdin();
const client = await connect();
const count = { read: groups.length, made: 0, updated: 0, keptHere: 0, organisations: 0, agencies: 0, bookings: 0, courses: 0, notes: 0, log: 0 };

try {
  await client.query('BEGIN');
  // The kinds of a history line (0094).
  const processes = await historyProcesses(client);
  const valid = new Set((await client.query(`SELECT code FROM countries`)).rows.map((r) => r.code.trim()));
  const types = new Map((await client.query(`SELECT id, filemaker_id::text AS fm FROM course_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id]));
  const organisationOf = async (layout, recordId) =>
    recordId
      ? ((
          await client.query(
            `SELECT entity_id FROM filemaker_links WHERE entity = 'organisation' AND source_database = 'SchoolMan' AND source_layout = $1 AND source_record_id = $2`,
            [layout, recordId]
          )
        ).rows[0]?.entity_id ?? null)
      : null;

  for (const g of groups) {
    const organisationId = await organisationOf('Corporate', g.company);
    const agencyId = await organisationOf('Agency', g.agency);
    if (organisationId) count.organisations++;
    if (agencyId) count.agencies++;
    let name = g.name;
    if (!name) {
      const owner = organisationId ?? agencyId;
      name = owner ? (await client.query(`SELECT name FROM organisations WHERE id = $1`, [owner])).rows[0].name : `Gruppe ${g.id}`;
    }
    const values = [
      name,
      g.status,
      organisationId,
      agencyId,
      types.get(g.courseType ?? '') ?? null,
      g.level,
      g.country && valid.has(g.country) ? g.country : null,
      g.participants,
      g.escorts,
      g.ageFrom,
      g.ageTo != null && g.ageFrom != null && g.ageTo < g.ageFrom ? g.ageFrom : g.ageTo,
      g.arrival,
      g.departure && g.arrival && g.departure < g.arrival ? g.arrival : g.departure,
      g.courseFrom,
      g.courseTo && g.courseFrom && g.courseTo < g.courseFrom ? g.courseFrom : g.courseTo,
      g.travel,
      g.ranges || null,
    ];
    const known = (
      await client.query(
        `SELECT v.id, EXISTS (SELECT 1 FROM staff_activity a WHERE a.entity = 'group_visit' AND a.entity_id = v.id AND a.action <> 'schoolman_log') AS changed_here
           FROM group_visits v WHERE v.filemaker_group_id = $1`,
        [g.id]
      )
    ).rows[0];
    let visitId = known?.id;
    if (!known) {
      visitId = (
        await client.query(
          `INSERT INTO group_visits (name, status, organisation_id, agency_id, course_type_id, level, country_code, participants, escorts, age_from, age_to,
                                     arrival, departure, course_from, course_to, travel_note, note, filemaker_group_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                   coalesce($19::timestamp AT TIME ZONE 'Europe/Berlin', timezone('utc', now())))
           RETURNING id`,
          [...values, g.id, g.created]
        )
      ).rows[0].id;
      count.made++;
    } else if (!known.changed_here) {
      await client.query(
        `UPDATE group_visits SET name = $2, status = $3, organisation_id = $4, agency_id = $5, course_type_id = $6, level = $7, country_code = $8, participants = $9,
                escorts = $10, age_from = $11, age_to = $12, arrival = $13, departure = $14, course_from = $15, course_to = $16, travel_note = $17, note = $18
          WHERE id = $1`,
        [visitId, ...values]
      );
      count.updated++;
    } else {
      // A colleague has worked on it here: SchoolMan only fills what is empty.
      await client.query(
        `UPDATE group_visits SET organisation_id = coalesce(organisation_id, $2), agency_id = coalesce(agency_id, $3), course_type_id = coalesce(course_type_id, $4),
                level = coalesce(level, $5), country_code = coalesce(country_code, $6), participants = coalesce(participants, $7), escorts = coalesce(escorts, $8),
                age_from = coalesce(age_from, $9), age_to = coalesce(age_to, $10), arrival = coalesce(arrival, $11), departure = coalesce(departure, $12),
                course_from = coalesce(course_from, $13), course_to = coalesce(course_to, $14), travel_note = coalesce(travel_note, $15), note = coalesce(note, $16)
          WHERE id = $1`,
        [visitId, ...values.slice(2)]
      );
      count.keptHere++;
    }

    count.bookings += (
      await client.query(`UPDATE bookings SET group_visit_id = $1 WHERE filemaker_booking_id = ANY($2::text[]) AND group_visit_id IS DISTINCT FROM $1`, [visitId, g.bookings])
    ).rowCount;
    if (g.courses.length) {
      count.courses += (
        await client.query(
          `UPDATE courses SET group_visit_id = $1, organisation_id = coalesce(organisation_id, $3)
            WHERE (filemaker_course_id = ANY($2::text[]) OR filemaker_group_ids && $2::text[]) AND group_visit_id IS DISTINCT FROM $1`,
          [visitId, g.courses, organisationId ?? agencyId]
        )
      ).rowCount;
    }

    for (const n of g.notes) {
      await client.query(
        `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
         VALUES ('group_visit', $1, $2, $3, $4, coalesce($5::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
           SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
        [visitId, n.body.slice(0, 20000), n.author ?? 'SchoolMan', n.ref, n.at]
      );
      count.notes++;
    }
    await client.query(`DELETE FROM staff_activity WHERE action = 'schoolman_log' AND entity = 'group_visit' AND entity_id = $1`, [visitId]);
    for (const w of g.log) {
      await client.query(
        `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail, created_at)
         VALUES ($1, 'group_visit', $2, 'schoolman_log', $3::jsonb, coalesce($4::timestamp AT TIME ZONE 'Europe/Berlin', now()))`,
        [w.author ?? 'SchoolMan', visitId, JSON.stringify(logDetail(w, processes)), w.at]
      );
      count.log++;
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
  `${count.read} group visits read: ${count.made} new, ${count.updated} updated, ${count.keptHere} changed here (only gaps filled)\n` +
    `${count.organisations} with their school or company, ${count.agencies} with their agency · ${count.bookings} participant bookings and ${count.courses} courses linked · ` +
    `${count.notes} comments · ${count.log} work-log lines`
);
