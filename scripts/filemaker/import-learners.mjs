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
 * - Its money (Rahman, 2026-10-17: bring the money too), each line keeping SchoolMan's number (0054):
 *   the charges (`CostDetail`; a reversing line stays a line below zero) with their charge type, matched
 *   on `charge_types.filemaker_id`; the payments received (`PaymentIn`) with their method and what they
 *   paid; a refund to the learner (`PaymentOut`) as a payment below zero. A re-run updates them, and a
 *   line SchoolMan no longer has goes. Sums are never carried — the balance is worked out from the lines.
 * - What SchoolMan says about them (0055; Rahman: all the data related to students, including the
 *   comments about them): a booking's final note, a period's comment, the `Comment` table, the
 *   placement tests and the learning agreements become notes on the booking or the person, under the
 *   SchoolMan user who wrote them; the work log (`WorkFlow`) becomes the record's history
 *   (`schoolman_log`, read afresh each run); the letters keep their text — a kind the workspace knows
 *   keeps it (so the booking's next letter is worked out from what was sent), the rest are „schoolman";
 *   a payment's comment is its reference, a charge's comment follows its name; bank accounts as theirs.
 * - An exam booking (2026-10-18) goes on its sitting: found by SchoolMan's exam (`filemaker_exam_id`,
 *   0056), else by its exam and day, else made from SchoolMan's (a sitting from before the workspace's;
 *   never on the website, which reads those ahead) at the hours of its exam's other sittings. All parts;
 *   an exam we do not offer (TestAS, TestDaF) is left out.
 * - A booking's stays (`DateAccommodation`, 0056): dates, kind, room type, meals, called off, departure
 *   confirmed, and where — a CASA flat and its room by name, a host family not (hosts first need their
 *   own module and a privacy decision). They also fill the booking's accommodation fields, so the
 *   bookings' „Unterkunft" view and the booking page show them.
 * - Bookings without a period (not exams) are left out; what is about one goes on the person.
 */
import { getCode } from 'country-list';

import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

import { letterDocument } from './letter-document.mjs';

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
// A charge type's line kind; any other accommodation type is accommodation, the rest „other".
const KIND = { tuition: 'tuition', enrolment_fee: 'enrolment_fee', books: 'books', exam_fee: 'exam_fee', deposit: 'deposit', discount: 'discount', cancellation: 'cancellation' };
// SchoolMan's charge kinds our charge types carry no number for.
const CHARGE_EXTRA = { 21: 'cancellation' };
const METHOD_BY_LABEL = { überweisung: 'transfer', karte: 'card', bar: 'cash', übertrag: 'carryover', verrechnung: 'offset' };
const METHOD_BY_ID = { 1: 'card', 2: 'cash', 5: 'transfer', 7: 'carryover' };

const today = new Date().toISOString().slice(0, 10);
// A SchoolMan letter's kind, by the script that wrote it; any other is kept as „schoolman".
const LETTER_KIND = [
  [/^Receipt/, 'payment_receipt'],
  [/^(Confirmation\.First_Booking|ConfirmationStudentIndividual|ConfirmationAgency)/, 'booking_confirmation'],
  [/^VisaLetter/, 'visa_letter'],
  [/^MissingItem/, 'missing_items'],
  [/^ShowUp\.FirstCall/, 'showup_first_call'],
  [/^ShowUp\.LastCall/, 'showup_last_call'],
  [/^Overview\./, 'payments_overview'],
  [/Reminder/, 'payment_reminder'],
  [/^CourseStartMail\.Individual/, 'course_start'],
  [/^(Cancel|Deactivate)/, 'cancellation_confirmation'],
  [/^Confirmation\.Exam/, 'exam_confirmation'],
];
// SchoolMan's exam references → our exam types.
const EXAM_TYPE = { 3: 'telc_b2', 4: 'telc_c1_hochschule' };
const letterKind = (script) => LETTER_KIND.find(([re]) => re.test(script ?? ''))?.[1] ?? 'schoolman';
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
  skippedNoPeriod: 0, periodsNoCourse: 0, nationalityUnmatched: 0, twins: 0,
  charges: 0, chargesRemoved: 0, payments: 0, refunds: 0, paymentsRemoved: 0, zero: 0,
  notes: 0, log: 0, letters: 0, lettersOnPerson: 0, banks: 0, unchanged: 0,
  examBookings: 0, examNoKind: 0, sittingsLinked: 0, sittingsMade: 0, stays: 0, staysRemoved: 0, staysNoDates: 0,
};

try {
  await client.query('BEGIN');
  const valid = new Set((await client.query(`SELECT code FROM countries`)).rows.map((r) => r.code.trim()));
  const types = new Map((await client.query(`SELECT id, filemaker_id::text AS fm FROM course_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.id]));
  const chargeTypes = await client.query(`SELECT code, category_code, name_de, filemaker_id::int::text AS fm FROM charge_types`);
  const chargeType = new Map(chargeTypes.rows.filter((r) => r.fm).map((r) => [r.fm, r]));
  const chargeByCode = new Map(chargeTypes.rows.map((r) => [r.code, r]));
  const typeOfCharge = (ref) => chargeType.get(ref ?? '') ?? chargeByCode.get(CHARGE_EXTRA[ref] ?? '') ?? null;
  const method = (p) => METHOD_BY_LABEL[(p.methodLabel ?? '').trim().toLowerCase()] ?? METHOD_BY_ID[p.method] ?? 'transfer';

  // Exam types by SchoolMan's reference, with the hours their sittings are held at.
  for (const [ref, code] of Object.entries(EXAM_TYPE)) await client.query(`UPDATE exam_types SET filemaker_id = $1 WHERE code = $2 AND filemaker_id IS NULL`, [Number(ref), code]);
  const examTypes = new Map(
    (
      await client.query(
        `SELECT t.id, t.code,
                coalesce((SELECT to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') FROM exam_sessions s WHERE s.exam_type_id = t.id ORDER BY s.starts_at LIMIT 1), '09:00') AS starts,
                coalesce((SELECT to_char(s.ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') FROM exam_sessions s WHERE s.exam_type_id = t.id ORDER BY s.starts_at LIMIT 1), '17:00') AS ends
           FROM exam_types t`
      )
    ).rows.map((r) => [r.code, r])
  );
  /**
   * The sitting an exam booking is on: SchoolMan's own, else the same exam that day here, else made — as
   * a draft, so a date only SchoolMan knows never appears on the website until someone publishes it.
   */
  async function sittingFor(exam) {
    const type = examTypes.get(EXAM_TYPE[exam.ref] ?? '');
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
      count.sittingsLinked++;
      return { id: same.id, day: exam.day };
    }
    const made = (
      await client.query(
        `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, capacity, status, filemaker_exam_id)
         VALUES ($1, ($2::date + $3::time) AT TIME ZONE 'Europe/Berlin', ($2::date + $4::time) AT TIME ZONE 'Europe/Berlin', $5, 'draft', $6)
         RETURNING id`,
        [type.id, exam.day, type.starts, type.ends, Number(exam.places) > 0 ? Number(exam.places) : 20, exam.id]
      )
    ).rows[0];
    count.sittingsMade++;
    return { id: made.id, day: exam.day };
  }

  // The stays' vocabularies by SchoolMan's ids.
  const byFilemaker = async (table) => new Map((await client.query(`SELECT code, filemaker_id::int::text AS fm FROM ${table} WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.code]));
  const stayTypes = await byFilemaker('accommodation_types');
  const roomTypes = await byFilemaker('accommodation_room_types');
  const caterings = await byFilemaker('catering_options');
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

  // A learner as they were last time is passed over (0088): their data, what their periods are matched to
  // here, whether each booking is over, and the vocabularies everything is matched through.
  const changed = await changes(client, 'learners');
  const vocabularies = [[...valid].sort(), [...types], chargeTypes.rows, [...examTypes], [...stayTypes], [...roomTypes], [...caterings]];
  const matched = (l) =>
    l.bookings.map((b) => [
      b.exam ? (b.exam.day ?? '') < today : (b.periods ?? []).every((p) => !p.end || p.end < today),
      (b.periods ?? []).map((p) => {
        const c = courses.get(p.course ?? '');
        return c ? [c.id, c.group, c.level_code, c.start_date, c.format] : null;
      }),
    ]);

  for (const l of learners) {
    if (!l.firstName) continue;
    if (changed.same(l.personId, [l, matched(l), vocabularies])) continue;
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
    // SchoolMan's customer number (0061): what the workspace has wins.
    if (l.customerNumber) await client.query(`UPDATE people SET customer_number = coalesce(customer_number, $2) WHERE id = $1`, [personId, l.customerNumber]);
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

    // SchoolMan's booking number → ours, for what is said about a booking.
    const bookingOf = new Map();
    for (const b of l.bookings) {
      // An exam booking is on its sitting and has no period of its own.
      const sitting = b.exam ? await sittingFor(b.exam) : null;
      if (b.exam && !sitting) {
        count.examNoKind++;
        continue;
      }
      const periods = b.exam ? [] : b.periods.filter((p) => p.start && p.end && p.start <= p.end).sort((x, y) => x.start.localeCompare(y.start));
      if (!b.exam && !periods.length) {
        count.skippedNoPeriod++;
        continue;
      }
      const ours = periods.map((p) => courses.get(p.course ?? '')).find(Boolean);
      const typeId = sitting ? null : (ours?.course_type_id ?? types.get(b.type ?? '') ?? null);
      const over = sitting ? sitting.day < today : periods.every((p) => p.end < today);
      if (sitting) count.examBookings++;
      const status = b.enrolment === '2' || b.enrolment === '3' ? 'cancelled' : over ? 'completed' : 'confirmed';
      const observed = b.enrolment === '4' && status === 'confirmed';
      const existing = (await client.query(`SELECT id FROM bookings WHERE filemaker_booking_id = $1`, [b.id])).rows[0];
      let bookingId = existing?.id;
      if (existing) {
        bookingId = existing.id;
        await client.query(
          // The learner pays (self): no organisation pays it, though one paid it on an earlier run (2026-10-21).
          `UPDATE bookings SET status = $2::booking_status, course_type_id = CASE WHEN $7::uuid IS NULL THEN coalesce($3, course_type_id) END, visa_required = $4, payer = $5,
                  payer_organisation_id = CASE WHEN $5 = 'self' THEN NULL ELSE payer_organisation_id END,
                  observation_reason = CASE WHEN observed_by IS NOT NULL THEN observation_reason WHEN $6 THEN 'other' ELSE NULL END,
                  observed_at = CASE WHEN observed_by IS NOT NULL THEN observed_at WHEN $6 THEN coalesce(observed_at, now()) ELSE NULL END,
                  exam_session_id = $7, exam_parts = CASE WHEN $7::uuid IS NULL THEN NULL ELSE coalesce(exam_parts, 'full') END
            WHERE id = $1`,
          [bookingId, status, typeId, b.visa, b.payer, observed, sitting?.id ?? null]
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
                                   number_year, number_seq, created_at, cancelled_at, exam_session_id, exam_parts)
             VALUES ($1, $2, $3::booking_status, $4, $5, $6, $7, $8, $9, $10, coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()),
                     CASE WHEN $3 = 'cancelled' THEN coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()) END, $12, CASE WHEN $12::uuid IS NOT NULL THEN 'full' END)
             RETURNING id`,
            [personId, typeId, status, b.payer, b.visa, observed ? 'other' : null, observed ? new Date() : null, b.id, year, seq, b.created, sitting?.id ?? null]
          )
        ).rows[0].id;
        count.bookingsNew++;
      }
      bookingOf.set(b.id, bookingId);
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

      // Its money, line by line.
      const charges = [];
      for (const c of b.charges ?? []) {
        if (!c.amount) {
          count.zero++;
          continue;
        }
        const type = typeOfCharge(c.ref);
        const kind = (type && KIND[type.code]) ?? (type?.category_code === 'accommodation' || /miete|unterkunft/i.test(c.label ?? '') ? 'accommodation' : 'other');
        charges.push(c.id);
        await client.query(
          // Books handed out (0087): SchoolMan's green comes across; a tick made in the workspace is never undone by it.
          `INSERT INTO booking_charges (booking_id, kind, description, amount, charge_type_code, quantity, unit_amount, filemaker_cost_detail_id, created_at, handed_out)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::timestamp AT TIME ZONE 'Europe/Berlin', now()), $10 AND $2 = 'books')
           ON CONFLICT (filemaker_cost_detail_id) WHERE filemaker_cost_detail_id IS NOT NULL DO UPDATE
             SET booking_id = EXCLUDED.booking_id, kind = EXCLUDED.kind, description = EXCLUDED.description, amount = EXCLUDED.amount,
                 charge_type_code = EXCLUDED.charge_type_code, quantity = EXCLUDED.quantity, unit_amount = EXCLUDED.unit_amount,
                 handed_out = booking_charges.handed_out OR EXCLUDED.handed_out`,
          [
            bookingId,
            kind,
            [c.label ?? type?.name_de ?? 'SchoolMan', c.comment && c.comment !== c.label ? c.comment : null].filter(Boolean).join(' · '),
            c.amount,
            type?.code ?? null,
            c.units && c.units > 0 ? c.units : 1,
            c.unitAmount,
            c.id,
            c.created,
            c.delivered === true,
          ]
        );
        count.charges++;
      }
      count.chargesRemoved += (
        await client.query(
          `DELETE FROM booking_charges WHERE booking_id = $1 AND filemaker_cost_detail_id IS NOT NULL AND NOT (filemaker_cost_detail_id = ANY($2::text[]))`,
          [bookingId, charges]
        )
      ).rowCount;
      const payments = [];
      for (const p of b.payments ?? []) {
        if (!p.amount) {
          count.zero++;
          continue;
        }
        payments.push(p.id);
        await client.query(
          `INSERT INTO payments (booking_id, amount, method, received_at, subject, filemaker_payment_id, created_at, reference)
           VALUES ($1, $2, $3, coalesce($4::date, ($6::timestamp)::date, current_date), $5, $7, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()), $8)
           ON CONFLICT (filemaker_payment_id) WHERE filemaker_payment_id IS NOT NULL DO UPDATE
             SET booking_id = EXCLUDED.booking_id, amount = EXCLUDED.amount, method = EXCLUDED.method, received_at = EXCLUDED.received_at,
                 subject = EXCLUDED.subject, reference = EXCLUDED.reference`,
          [bookingId, p.amount, method(p), p.date, p.for ?? typeOfCharge(p.ref)?.name_de ?? 'Zahlung', p.created, p.id, p.comment ?? null]
        );
        if (p.amount < 0 && p.id.startsWith('PaymentOut:')) count.refunds++;
        else count.payments++;
      }
      count.paymentsRemoved += (
        await client.query(
          `DELETE FROM payments WHERE booking_id = $1 AND filemaker_payment_id IS NOT NULL AND NOT (filemaker_payment_id = ANY($2::text[]))`,
          [bookingId, payments]
        )
      ).rowCount;

      // Its stays, and from them the booking's own accommodation fields.
      const stays = [];
      const held = [];
      for (const st of b.stays ?? []) {
        if (!st.start || !st.end || st.end < st.start) {
          count.staysNoDates++;
          continue;
        }
        const stay = {
          type: stayTypes.get(st.type ?? '') ?? null,
          room: roomTypes.get(st.room ?? '') ?? null,
          catering: caterings.get(st.catering ?? '') ?? null,
          cancelled: st.enrolment === '2' || st.enrolment === '3',
        };
        stays.push(st.id);
        if (!stay.cancelled) held.push({ ...st, ...stay });
        await client.query(
          `INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_type_code, room_type_code, catering_code, place, room, cancelled, departure_confirmed,
                                      filemaker_id, filemaker_place_id, filemaker_room_id)
           VALUES ($1, $2::date, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
             SET booking_id = EXCLUDED.booking_id, starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, accommodation_type_code = EXCLUDED.accommodation_type_code,
                 room_type_code = EXCLUDED.room_type_code, catering_code = EXCLUDED.catering_code, place = EXCLUDED.place, room = EXCLUDED.room,
                 cancelled = EXCLUDED.cancelled, departure_confirmed = EXCLUDED.departure_confirmed, filemaker_place_id = EXCLUDED.filemaker_place_id,
                 filemaker_room_id = EXCLUDED.filemaker_room_id`,
          [
            bookingId,
            st.start,
            st.end,
            stay.type,
            stay.room,
            stay.catering,
            st.flat ? st.placeName : null,
            st.flat ? st.roomName : null,
            stay.cancelled,
            st.departure === '1' ? true : st.departure === '2' ? false : null,
            st.id,
            st.place,
            st.roomId,
          ]
        );
        count.stays++;
      }
      count.staysRemoved += (
        await client.query(`DELETE FROM booking_stays WHERE booking_id = $1 AND filemaker_id IS NOT NULL AND NOT (filemaker_id = ANY($2::text[]))`, [bookingId, stays])
      ).rowCount;
      if (held.length) {
        held.sort((x, y) => x.start.localeCompare(y.start));
        await client.query(
          `UPDATE bookings SET accommodation_type_code = $2, accommodation_room_type_code = $3, accommodation_catering_code = $4,
                  accommodation_from = $5::date, accommodation_to = $6::date
            WHERE id = $1`,
          [bookingId, held[0].type, held[0].room, held[0].catering, held[0].start, held.map((x) => x.end).sort().pop()]
        );
      }
    }

    // What SchoolMan says about them: notes, on the booking where we have it, else on the person.
    const on = (booking) => (booking && bookingOf.get(booking) ? ['booking', bookingOf.get(booking)] : ['person', personId]);
    for (const n of l.notes ?? []) {
      const [entity, entityId] = on(n.booking);
      await client.query(
        `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
         VALUES ($1, $2, $3, $4, $5, coalesce($6::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
           SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
        [entity, entityId, n.body.slice(0, 20000), n.author ?? 'SchoolMan', n.ref, n.at]
      );
      count.notes++;
    }
    // Their tests (0066): a record each, no longer a note.
    for (const test of l.tests ?? []) {
      await client.query(
        `INSERT INTO person_tests (person_id, booking_id, taken_on, test, level, score, result, comment, author_name, filemaker_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
           SET person_id = EXCLUDED.person_id, booking_id = EXCLUDED.booking_id, taken_on = EXCLUDED.taken_on, test = EXCLUDED.test, level = EXCLUDED.level,
               score = EXCLUDED.score, result = EXCLUDED.result, comment = EXCLUDED.comment, author_name = EXCLUDED.author_name`,
        [
          personId,
          test.booking ? (bookingOf.get(test.booking) ?? null) : null,
          test.day,
          test.test,
          ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2'].includes(test.level ?? '') ? test.level : null,
          test.score,
          test.result ?? (test.level && !['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2'].includes(test.level) ? test.level : null),
          test.comment,
          test.author ?? 'SchoolMan',
          test.ref,
          test.created,
        ]
      );
      count.tests = (count.tests ?? 0) + 1;
    }
    await client.query(`DELETE FROM staff_notes WHERE filemaker_ref = ANY($1::text[])`, [(l.tests ?? []).map((test) => `TestStudent:${test.ref}`)]);
    // The work log: read afresh, as SchoolMan has it now.
    await client.query(`DELETE FROM staff_activity WHERE action = 'schoolman_log' AND entity_id = ANY($1::uuid[])`, [[personId, ...bookingOf.values()]]);
    for (const w of l.log ?? []) {
      const [entity, entityId] = on(w.booking);
      await client.query(
        `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail, created_at)
         VALUES ($1, $2, $3, 'schoolman_log', $4::jsonb, coalesce($5::timestamp AT TIME ZONE 'Europe/Berlin', now()))`,
        [w.author ?? 'SchoolMan', entity, entityId, JSON.stringify({ text: w.text.slice(0, 4000), ref: w.ref }), w.at]
      );
      count.log++;
    }
    // The letters, oldest first, each kind's versions in the order they went.
    for (const letter of [...(l.letters ?? [])].sort((a, b) => String(a.sent ?? '').localeCompare(String(b.sent ?? '')))) {
      const bookingId = letter.booking ? (bookingOf.get(letter.booking) ?? null) : null;
      const mapped = letterKind(letter.script);
      const kind = mapped !== 'schoolman' && bookingId ? mapped : 'schoolman';
      if (!bookingId) count.lettersOnPerson++;
      const doc = letterDocument(letter, kind);
      const known = (await client.query(`SELECT id FROM letters WHERE filemaker_letter_id = $1`, [letter.ref])).rows[0];
      if (known) {
        // A letter the offers' import made an offer's version stays the offer's.
        await client.query(`UPDATE letters SET document = $2::jsonb, subject = $3, email = $4, recipient_name = $5 WHERE id = $1 AND offer_id IS NULL`, [
          known.id,
          JSON.stringify(doc),
          doc.subject.title || 'Brief',
          letter.email,
          doc.recipient[0] ?? [l.firstName, l.lastName].filter(Boolean).join(' '),
        ]);
      } else {
        const version = bookingId
          ? (await client.query(`SELECT coalesce(max(version), 0) + 1 AS v FROM letters WHERE booking_id = $1 AND kind = $2`, [bookingId, kind])).rows[0].v
          : 1;
        await client.query(
          `INSERT INTO letters (kind, version, language, person_id, booking_id, recipient_name, email, subject, document, source, sent_at, filemaker_letter_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, coalesce($11::timestamp AT TIME ZONE 'Europe/Berlin', now()), $12)`,
          [
            kind,
            version,
            doc.language,
            personId,
            bookingId,
            doc.recipient[0] ?? [l.firstName, l.lastName].filter(Boolean).join(' '),
            letter.email,
            doc.subject.title || 'Brief',
            JSON.stringify(doc),
            JSON.stringify({ schoolman: { script: letter.script, author: letter.author } }),
            letter.sent,
            letter.ref,
          ]
        );
      }
      count.letters++;
    }
    for (const a of l.banks ?? []) {
      const iban = a.iban.replace(/\s+/g, '').toUpperCase();
      const twin = (await client.query(`SELECT 1 FROM bank_accounts WHERE person_id = $1 AND replace(upper(iban), ' ', '') = $2 AND filemaker_ref IS DISTINCT FROM $3`, [personId, iban, a.ref])).rows.length;
      if (twin) continue;
      await client.query(
        `INSERT INTO bank_accounts (person_id, holder, iban, bic, bank_name, filemaker_ref) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE SET holder = EXCLUDED.holder, iban = EXCLUDED.iban, bic = EXCLUDED.bic, bank_name = EXCLUDED.bank_name`,
        [personId, a.holder, iban, a.bic, a.bank, a.ref]
      );
      count.banks++;
    }
  }
  count.unchanged = changed.unchanged;
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
  `${count.learners} learners read: ${count.unchanged ?? 0} as last time, ${count.peopleNew} new, ${count.peopleKnown} known · ${count.emails} e-mail, ${count.phones} phones, ${count.addresses} addresses\n` +
    `bookings ${count.bookingsNew} new, ${count.bookingsUpdated} updated · periods ${count.periodsNew} new, ${count.periodsUpdated} updated, ${count.periodsRemoved} removed\n` +
    `left out: ${count.skippedNoPeriod} without a period · ${count.periodsNoCourse} periods of a course not here · ` +
    `${count.nationalityUnmatched} nationalities not matched · ${count.twins} likely twins flagged\n` +
    `money: ${count.charges} charges, ${count.payments} payments, ${count.refunds} refunds · ${count.zero} lines of no amount left out · ` +
    `${count.chargesRemoved} charges and ${count.paymentsRemoved} payments no longer in SchoolMan removed\n` +
    `about them: ${count.notes} notes, ${count.tests ?? 0} tests, ${count.log} log lines, ${count.letters} letters (${count.lettersOnPerson} on the person only), ${count.banks} bank accounts\n` +
    `exams: ${count.examBookings} bookings · ${count.sittingsLinked} sittings linked, ${count.sittingsMade} made · ${count.examNoKind} of an exam we do not offer left out\n` +
    `stays: ${count.stays} · ${count.staysRemoved} no longer in SchoolMan removed · ${count.staysNoDates} without dates left out`
);
