/**
 * Puts some of SchoolMan's learners into the workspace (2026-10-17, docs/ADMIN_WORKSPACE.md §Learners
 * from SchoolMan): the people in a course this week or starting one in the next four weeks, with their
 * e-mail addresses, phones, address and every booking with its periods.
 *
 *   python3 -I scripts/filemaker/read_learners.py | DATABASE_URL=... node scripts/filemaker/import-learners.mjs [--dry-run]
 *
 * Reads the reader's JSON from stdin — nothing personal is written to a file — and writes in one
 * transaction. Prints counts only. Run the course import and the learner counts first.
 *
 * - A person is matched on their SchoolMan person (`filemaker_links`), then their student id; never on
 *   a name or an address — a likely twin gets a `duplicate_candidate` flag for a colleague to link.
 *   What the workspace already has wins: a field is only filled where it is empty.
 * - A booking keeps SchoolMan's number (`filemaker_booking_id`, 0052): a re-run updates its status,
 *   type, visa and payer; its workspace number (B-2026-0042) is given once, in the year SchoolMan made
 *   it. *nein* and *storno* are cancelled; *u.B.* is under observation while it still runs (a
 *   colleague's own observation is kept); *ja* and *???* are confirmed, or completed once over — paid
 *   follows the money, which stays in SchoolMan.
 * - A period keeps SchoolMan's number too, on the workspace's course for SchoolMan's (its number or a
 *   group's number, which names its group, 0053); a period of a course we do not have keeps its dates
 *   without one. Its step is the
 *   course's, the `.2` in an intensive course's second half (from its fifth week; closures ignored).
 * - Exam bookings (an exam sitting is their own module) and bookings without a period are left out.
 */
import { getCode } from 'country-list';

import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const SALUTATION = { 1: 'mr', 2: 'ms', 3: 'mx' };
const EMAIL_KIND = { 1: 'personal', 2: 'work', 3: 'personal' };
const EMAIL_SKIP = new Set(['4']); // Agentur: the agency's address, not the learner's
const PHONE_KIND = { 1: 'home', 2: 'work', 3: 'mobile', 5: 'mobile' };
const PHONE_SKIP = new Set(['7']); // Fax

const today = new Date().toISOString().slice(0, 10);
const normalizeEmail = (v) => v.normalize('NFKC').trim().toLowerCase();
const normalizePhone = (v) => {
  const plus = v.normalize('NFKC').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return plus.startsWith('00') ? `+${plus.slice(2)}` : plus;
};
const deNames = new Intl.DisplayNames(['de'], { type: 'region' });
const DE_INDEX = new Map(
  Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26)))
    .map((code) => [String(deNames.of(code) ?? '').toLowerCase(), code])
    .filter(([name, code]) => name && name.toLowerCase() !== code.toLowerCase())
);
const country = (name) => {
  if (!name) return null;
  const text = name.trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  return DE_INDEX.get(text.toLowerCase()) ?? getCode(text) ?? null;
};
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
const newest = (rows) => [...rows].sort((a, b) => String(b.created ?? '').localeCompare(String(a.created ?? '')));
const berlinYear = (stamp) => Number((stamp ?? today).slice(0, 4));

const learners = await readStdin();
const client = await connect();
const count = {
  learners: learners.length, peopleNew: 0, peopleKnown: 0, emails: 0, phones: 0, addresses: 0,
  bookingsNew: 0, bookingsUpdated: 0, periodsNew: 0, periodsUpdated: 0, periodsRemoved: 0,
  skippedExam: 0, skippedNoPeriod: 0, periodsNoCourse: 0, nationalityUnmatched: 0, twins: 0,
};

try {
  await client.query('BEGIN');
  const valid = new Set((await client.query(`SELECT code FROM countries`)).rows.map((r) => r.code.trim()));
  const types = new Map((await client.query(`SELECT id, filemaker_id::text AS fm FROM course_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id]));
  // SchoolMan's course numbers → ours: a course's own number, or one of its groups' (0046).
  const courses = new Map();
  for (const r of (
    await client.query(
      `SELECT k.id, k.course_instance_id, k.level_code, k.filemaker_course_id, k.filemaker_group_ids, t.format, i.course_type_id,
              to_char(i.start_date, 'YYYY-MM-DD') AS start_date
         FROM courses k JOIN course_instances i ON i.id = k.course_instance_id JOIN course_types t ON t.id = i.course_type_id
        WHERE k.filemaker_course_id IS NOT NULL OR k.filemaker_group_ids IS NOT NULL`
    )
  ).rows) {
    // A group's number names its group (0053); the course's own number alone, a course not split.
    (r.filemaker_group_ids ?? []).forEach((fm, i) => courses.set(fm, { ...r, group: (r.filemaker_group_ids.length > 1 ? i + 1 : null) }));
    if (r.filemaker_course_id && !courses.has(r.filemaker_course_id)) courses.set(r.filemaker_course_id, { ...r, group: null });
  }
  // The step a period is at: the course's, `.2` from the fifth week of an intensive course's first half.
  const step = (course, start) =>
    course.format === 'intensive' && /\.1$/.test(course.level_code ?? '') && start >= addDays(mondayOf(course.start_date), 28)
      ? `${course.level_code.slice(0, -2)}.2`
      : course.level_code;

  const link = async (entity, entityId, layout, recordId) =>
    client.query(
      `INSERT INTO filemaker_links (entity, entity_id, source_database, source_layout, source_record_id, source_primary_key)
       VALUES ($1, $2, 'SchoolMan', $3, $4, $4) ON CONFLICT DO NOTHING`,
      [entity, entityId, layout, recordId]
    );

  for (const l of learners) {
    if (!l.firstName) continue;
    // Their SchoolMan person, else their student id; else a new person, made when SchoolMan made them.
    let personId = (
      await client.query(
        `SELECT entity_id FROM filemaker_links WHERE entity = 'person' AND source_database = 'SchoolMan'
            AND ((source_layout = 'Person' AND source_record_id = $1) OR (source_layout = 'ID_Student' AND source_record_id = $2))
          ORDER BY source_layout = 'Person' DESC LIMIT 1`,
        [l.personId, l.studentId ?? '']
      )
    ).rows[0]?.entity_id;
    const nationality = country(l.nationality);
    if (l.nationality && (!nationality || !valid.has(nationality))) count.nationalityUnmatched++;
    const facts = [
      SALUTATION[l.gender] ?? null,
      l.lastName,
      l.birthDate,
      nationality && valid.has(nationality) ? nationality : null,
      nationality && valid.has(nationality) ? null : l.nationality,
      l.secondLastName,
      l.nickname,
      l.birthPlace,
      country(l.birthCountry) && valid.has(country(l.birthCountry)) ? country(l.birthCountry) : null,
      l.motherTongue,
      l.occupation,
    ];
    if (personId) {
      count.peopleKnown++;
      await client.query(
        `UPDATE people SET salutation = coalesce(salutation, $2::salutation), last_name = coalesce(last_name, $3), birth_date = coalesce(birth_date, $4::date),
                nationality_code = coalesce(nationality_code, $5), nationality_raw = coalesce(nationality_raw, $6), second_last_name = coalesce(second_last_name, $7),
                nickname = coalesce(nickname, $8), birth_place = coalesce(birth_place, $9), birth_country_code = coalesce(birth_country_code, $10),
                mother_tongue = coalesce(mother_tongue, $11), occupation = coalesce(occupation, $12)
          WHERE id = $1`,
        [personId, ...facts]
      );
    } else {
      personId = (
        await client.query(
          `INSERT INTO people (salutation, last_name, birth_date, nationality_code, nationality_raw, second_last_name, nickname, birth_place, birth_country_code,
                               mother_tongue, occupation, first_name, created_by, created_at)
           VALUES ($1::salutation, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'migration-schoolman', coalesce($13::timestamp AT TIME ZONE 'Europe/Berlin', now()))
           RETURNING id`,
          [...facts, l.firstName, l.created]
        )
      ).rows[0].id;
      count.peopleNew++;
      // A likely twin made here before (same address or same name and birth date): a colleague decides.
      const twins = await client.query(
        `SELECT p.id, concat_ws(' ', p.first_name, p.last_name) AS name,
                CASE WHEN EXISTS (SELECT 1 FROM emails e WHERE e.person_id = p.id AND e.normalized = ANY($2::text[])) THEN 'email' ELSE 'name_and_birth_date' END AS reason
           FROM people p
          WHERE p.id <> $1 AND p.merged_into IS NULL AND p.deleted_at IS NULL
            AND (EXISTS (SELECT 1 FROM emails e WHERE e.person_id = p.id AND e.normalized = ANY($2::text[]))
                 OR (lower(p.last_name) = lower($3) AND p.birth_date = $4::date))
          LIMIT 5`,
        [personId, l.emails.map((e) => normalizeEmail(e.address)), l.lastName ?? '', l.birthDate]
      );
      if (twins.rows.length) {
        await client.query(
          `INSERT INTO record_flags (entity, entity_id, code, detail) VALUES ('person', $1, 'duplicate_candidate', $2::jsonb) ON CONFLICT DO NOTHING`,
          [personId, JSON.stringify({ candidates: twins.rows })]
        );
        count.twins++;
      }
      if (l.nationality && !(nationality && valid.has(nationality))) {
        await client.query(
          `INSERT INTO record_flags (entity, entity_id, code, detail) VALUES ('person', $1, 'nationality_unmatched', $2::jsonb) ON CONFLICT DO NOTHING`,
          [personId, JSON.stringify({ raw: l.nationality })]
        );
      }
    }
    await link('person', personId, 'Person', l.personId);
    if (l.studentId) await link('person', personId, 'ID_Student', l.studentId);

    // Contact: the newest first, primary only where the person has none yet.
    const has = (await client.query(`SELECT (SELECT count(*) FROM emails WHERE person_id = $1)::int AS e, (SELECT count(*) FROM phones WHERE person_id = $1)::int AS p`, [personId])).rows[0];
    for (const [i, e] of newest(l.emails.filter((e) => !EMAIL_SKIP.has(e.use))).entries()) {
      const r = await client.query(
        `INSERT INTO emails (person_id, address, normalized, kind, is_primary, created_at) VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (person_id, normalized) DO NOTHING`,
        [personId, e.address, normalizeEmail(e.address), EMAIL_KIND[e.use] ?? 'personal', !has.e && i === 0, e.created]
      );
      count.emails += r.rowCount;
    }
    const mobileFirst = newest(l.phones.filter((p) => !PHONE_SKIP.has(p.use) && normalizePhone(p.number))).sort((a, b) => Number(PHONE_KIND[b.use] === 'mobile') - Number(PHONE_KIND[a.use] === 'mobile'));
    for (const [i, p] of mobileFirst.entries()) {
      const r = await client.query(
        `INSERT INTO phones (person_id, number, normalized, kind, is_primary, created_at) VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (person_id, normalized) DO NOTHING`,
        [personId, p.number, normalizePhone(p.number), PHONE_KIND[p.use] ?? 'mobile', !has.p && i === 0, p.created]
      );
      count.phones += r.rowCount;
    }
    // The newest abroad is their home; the newest in Germany, their address while here.
    const filled = l.addresses.filter((a) => a.street || a.city);
    const abroad = newest(filled.filter((a) => country(a.country) && country(a.country) !== 'DE'))[0];
    const inGermany = newest(filled.filter((a) => !a.country || country(a.country) === 'DE'))[0];
    for (const [kind, a] of abroad && inGermany ? [['home', abroad], ['local', inGermany]] : [['home', newest(filled)[0]]]) {
      if (!a) continue;
      const code = country(a.country);
      const r = await client.query(
        `INSERT INTO addresses (person_id, kind, street, postcode, city, country_code) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (person_id, kind) DO NOTHING`,
        [personId, kind, a.street || null, a.postcode || null, a.city || null, code && valid.has(code) ? code : null]
      );
      count.addresses += r.rowCount;
    }

    for (const b of l.bookings) {
      if (b.exam) {
        count.skippedExam++;
        continue;
      }
      const periods = b.periods.filter((p) => p.start && p.end && p.start <= p.end).sort((x, y) => x.start.localeCompare(y.start));
      if (!periods.length) {
        count.skippedNoPeriod++;
        continue;
      }
      const ours = periods.map((p) => courses.get(p.course ?? '')).find(Boolean);
      const typeId = ours?.course_type_id ?? types.get(b.type ?? '') ?? null;
      const over = periods.every((p) => p.end < today);
      const status = b.enrolment === '2' || b.enrolment === '3' ? 'cancelled' : over ? 'completed' : 'confirmed';
      const observed = b.enrolment === '4' && status === 'confirmed';
      const existing = (await client.query(`SELECT id FROM bookings WHERE filemaker_booking_id = $1`, [b.id])).rows[0];
      let bookingId;
      if (existing) {
        bookingId = existing.id;
        await client.query(
          `UPDATE bookings SET status = $2::booking_status, course_type_id = coalesce($3, course_type_id), visa_required = $4, payer = $5,
                  observation_reason = CASE WHEN observed_by IS NOT NULL THEN observation_reason WHEN $6 THEN 'other' ELSE NULL END,
                  observed_at = CASE WHEN observed_by IS NOT NULL THEN observed_at WHEN $6 THEN coalesce(observed_at, now()) ELSE NULL END
            WHERE id = $1`,
          [bookingId, status, typeId, b.visa, b.payer, observed]
        );
        count.bookingsUpdated++;
      } else {
        // Its number in the year SchoolMan made it, under the lock the numbering trigger takes.
        const year = berlinYear(b.created);
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('bookings.number'), $1)`, [year]);
        const seq = (await client.query(`SELECT coalesce(max(number_seq), 0) + 1 AS n FROM bookings WHERE number_year = $1`, [year])).rows[0].n;
        bookingId = (
          await client.query(
            `INSERT INTO bookings (person_id, course_type_id, status, payer, visa_required, observation_reason, observed_at, filemaker_booking_id,
                                   number_year, number_seq, created_at, cancelled_at)
             VALUES ($1, $2, $3::booking_status, $4, $5, $6, $7, $8, $9, $10, coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()),
                     CASE WHEN $3 = 'cancelled' THEN coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()) END)
             RETURNING id`,
            [personId, typeId, status, b.payer, b.visa, observed ? 'other' : null, observed ? new Date() : null, b.id, year, seq, b.created]
          )
        ).rows[0].id;
        count.bookingsNew++;
      }
      const seen = [];
      for (const [i, p] of periods.entries()) {
        const course = courses.get(p.course ?? '');
        if (!course) count.periodsNoCourse++;
        seen.push(p.id);
        const r = await client.query(
          `INSERT INTO booking_periods (booking_id, course_instance_id, course_id, start_date, end_date, kind, level_code, filemaker_date_booking_id, group_index)
           VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9)
           ON CONFLICT (filemaker_date_booking_id) WHERE filemaker_date_booking_id IS NOT NULL DO UPDATE
             SET booking_id = EXCLUDED.booking_id, course_instance_id = EXCLUDED.course_instance_id, course_id = EXCLUDED.course_id,
                 start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, kind = EXCLUDED.kind, level_code = EXCLUDED.level_code,
                 group_index = EXCLUDED.group_index
           RETURNING (xmax = 0) AS inserted`,
          [bookingId, course?.course_instance_id ?? null, course?.id ?? null, p.start, p.end, i === 0 ? 'initial' : 'extension', course ? step(course, p.start) : null, p.id, course?.group ?? null]
        );
        if (r.rows[0].inserted) count.periodsNew++;
        else count.periodsUpdated++;
      }
      // A period SchoolMan no longer has on this booking goes.
      const gone = await client.query(
        `DELETE FROM booking_periods WHERE booking_id = $1 AND filemaker_date_booking_id IS NOT NULL AND NOT (filemaker_date_booking_id = ANY($2::text[]))`,
        [bookingId, seen]
      );
      count.periodsRemoved += gone.rowCount;
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
  `${count.learners} learners read: ${count.peopleNew} new, ${count.peopleKnown} known · ${count.emails} e-mail, ${count.phones} phones, ${count.addresses} addresses\n` +
    `bookings ${count.bookingsNew} new, ${count.bookingsUpdated} updated · periods ${count.periodsNew} new, ${count.periodsUpdated} updated, ${count.periodsRemoved} removed\n` +
    `left out: ${count.skippedExam} exam bookings, ${count.skippedNoPeriod} without a period · ${count.periodsNoCourse} periods of a course not here · ` +
    `${count.nationalityUnmatched} nationalities not matched · ${count.twins} likely twins flagged`
);
