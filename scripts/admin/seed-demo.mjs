/**
 * Plausible records for looking at the workspace before real traffic arrives.
 *
 * NOT a seed in `db/seeds/`, and not run by `npm run db:reset`. Those seeds are
 * baseline reference data the public site needs; this is fake people, and fake
 * people in a directory that gets applied to production is how a demo enquiry
 * ends up in a real queue.
 *
 *   DATABASE_URL=... node scripts/admin/seed-demo.mjs
 *   DATABASE_URL=... node scripts/admin/seed-demo.mjs --clear
 *
 * Every row is tagged `source = 'demo-seed'`, every person `created_by =
 * 'demo-seed'`, so `--clear` can remove exactly these and nothing else.
 *
 * Since 0007 each learner is also a PERSON with typed channels, created here
 * explicitly — the same shape intake produces. One nationality is left as a
 * demonym on purpose ('Turkish'), so the `nationality_unmatched` flag path is
 * visible in the demo.
 */
import { randomUUID } from 'node:crypto';

import { connect } from '../db/client.mjs';

const TAG = 'demo-seed';
const clear = process.argv.includes('--clear');

const client = await connect();

const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

try {
  if (clear) {
    // Flags point at rows by id without a foreign key; clear them first.
    await client.query(
      `DELETE FROM record_flags WHERE entity_id IN (
         SELECT id FROM enquiries WHERE source = $1
         UNION ALL SELECT id FROM course_registrations WHERE source = $1
         UNION ALL SELECT id FROM exam_registrations WHERE source = $1)`,
      [TAG]
    );
    const results = await Promise.all([
      client.query(`DELETE FROM enquiries WHERE source = $1`, [TAG]),
      client.query(`DELETE FROM course_registrations WHERE source = $1`, [TAG]),
      client.query(`DELETE FROM exam_registrations WHERE source = $1`, [TAG]),
      // Cascades to emails and phones.
      client.query(`DELETE FROM people WHERE created_by = $1`, [TAG]),
      // Cascades to placement_responses, placement_writing_submissions and
      // placement_reviews, so the demo attempts leave nothing behind.
      client.query(`DELETE FROM placement_attempts WHERE token LIKE $1`, [`${TAG}-%`]),
    ]);

    console.log(`\nRemoved ${results.reduce((sum, r) => sum + r.rowCount, 0)} demo records.\n`);
    process.exit(0);
  }

  /** A person with typed channels — what intake makes for every submission. */
  async function newPerson({ salutation, first, last, email, phone, birth, country, at }) {
    const { rows } = await client.query(
      `INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by, created_at)
       VALUES ($1::salutation, $2, $3, $4::date, (SELECT code FROM countries WHERE lower(name_en) = lower($5)), $5, $6, $7)
       RETURNING id, nationality_code`,
      [salutation ?? null, first, last, birth ?? null, country ?? null, TAG, at]
    );
    const person = rows[0];
    if (email) {
      await client.query(
        `INSERT INTO emails (person_id, address, normalized, created_at) VALUES ($1, $2, lower(trim($2)), $3)`,
        [person.id, email, at]
      );
    }
    if (phone) {
      await client.query(
        `INSERT INTO phones (person_id, number, normalized, created_at) VALUES ($1, $2, regexp_replace($2, '[^0-9+]', '', 'g'), $3)`,
        [person.id, phone, at]
      );
    }
    return person;
  }

  const enquiries = [
    {
      kind: 'general',
      first: 'Amara',
      last: 'Okonkwo',
      email: 'amara.okonkwo@example.com',
      topic: 'Intensive course starting in October',
      message:
        'Hello,\n\nI am moving to Bremen in September for my Master’s at the university and I need B2 before the semester starts. I have finished B1.2 at a school in Lagos. Is there an intensive course starting in October, and how many weeks would it take?\n\nThank you,\nAmara',
      status: 'new',
      days: 1,
    },
    {
      kind: 'general',
      first: 'Luis',
      last: 'Ferreira',
      email: 'l.ferreira@example.com',
      topic: 'telc B1 exam date',
      message:
        'Good afternoon, I need a telc B1 certificate for my residence permit and my appointment at the Ausländerbehörde is in three months. When is your next B1 sitting and is there still space? I do not need a course, only the exam.',
      status: 'new',
      days: 4,
    },
    {
      kind: 'group',
      first: 'Sofia',
      last: 'Lindqvist',
      email: 's.lindqvist@example.org',
      topic: 'Group booking for 18 students',
      message:
        'We are a gymnasium in Uppsala planning a three-week language stay for 18 students aged 16 to 17, with two accompanying teachers. We would need host families with half board, transit passes and some cultural programme. Could you send an estimate for June?',
      status: 'in_progress',
      days: 6,
      brief: {
        organisationName: 'Katedralskolan Uppsala',
        groupSize: 18,
        participantLevels: 'A2 to B1',
        preferredDates: 'June, three weeks',
        durationWeeks: 3,
        weeklyLessons: 20,
        languageFocus: 'general',
        invoicingParty: 'organisation',
        ageBand: '14-17',
        accommodation: 'double',
        meals: 'half-board',
        transport: 'monthly',
        cultureProgramme: 'medium',
      },
    },
    {
      kind: 'company',
      first: 'Henrik',
      last: 'Baumann',
      email: 'h.baumann@example.com',
      topic: 'German for our engineering team',
      message:
        'We have six engineers who joined from India and Brazil this year and need workplace German. Ideally on our own site in Bremen-Nord, twice a week, late afternoon. Can you quote for a 12-week block?',
      status: 'waiting',
      days: 9,
      brief: {
        organisationName: 'Nordwerk Antriebstechnik GmbH',
        groupSize: 6,
        participantLevels: 'A1 to A2',
        preferredDates: 'as soon as possible',
        durationWeeks: 12,
        weeklyLessons: 4,
        languageFocus: 'technical',
        invoicingParty: 'organisation',
        deliveryMode: 'on-site',
        schedulePreference: 'afternoons',
      },
    },
    {
      kind: 'general',
      first: 'Yuki',
      last: 'Tanaka',
      email: 'yuki.tanaka@example.com',
      topic: 'Accommodation while studying',
      message:
        'I have registered for the evening course in November. Do you help with a room in a shared flat, or should I look myself? I would prefer somewhere I can walk to the school from.',
      status: 'done',
      days: 15,
    },
    {
      kind: 'general',
      first: 'Mohammed',
      last: 'Al-Rashid',
      email: 'm.alrashid@example.com',
      topic: 'Bildungszeit funding',
      message:
        'My employer in Bremen mentioned Bildungszeit. Is your intensive course recognised for it, and what do I need to give my employer?',
      status: 'new',
      days: 2,
    },
  ];

  for (const item of enquiries) {
    const at = daysAgo(item.days);
    const person = await newPerson({
      first: item.first,
      last: item.last,
      email: item.email,
      at,
    });
    await client.query(
      `INSERT INTO enquiries
         (request_id, kind, locale, first_name, last_name, email, topic, topic_key,
          message, source, organiser_brief, status, person_id, submitted_at, created_at)
       VALUES ($1, $2, 'en', $3, $4, $5, $6, $7, $8, $9, $10, $11::work_status, $12, $13, $13)`,
      [
        randomUUID(),
        item.kind,
        item.first,
        item.last,
        item.email,
        item.topic,
        item.kind === 'group'
          ? 'group-booking'
          : item.kind === 'company'
            ? 'company-courses'
            : null,
        item.message,
        TAG,
        item.brief ? JSON.stringify(item.brief) : null,
        item.status,
        person.id,
        at,
      ]
    );
  }

  // Registrations are attached to real seeded course instances where possible,
  // so the capacity meters on the Courses screen show something true.
  const instances = await client.query(
    `SELECT i.id, i.course_type_id, t.name, i.start_date
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
      ORDER BY i.start_date ASC
      LIMIT 4`
  );

  const learners = [
    [
      'ms',
      'Beatriz',
      'Almeida',
      'b.almeida@example.com',
      'Brazil',
      '1998-03-14',
      'B1.1',
      true,
      true,
      'host',
    ],
    [
      'mr',
      'Ivan',
      'Petrov',
      'i.petrov@example.com',
      'Bulgaria',
      '1995-11-02',
      'A2.2',
      false,
      false,
      null,
    ],
    [
      'ms',
      'Nadia',
      'Haddad',
      'n.haddad@example.com',
      'Lebanon',
      '2001-06-27',
      'B1.2',
      true,
      true,
      'flat',
    ],
    ['mr', 'Chen', 'Wei', 'chen.wei@example.com', 'China', '1999-01-19', 'A1.2', true, false, null],
    [
      'mx',
      'Robin',
      'Vos',
      'r.vos@example.com',
      'Netherlands (the)',
      '1993-09-08',
      'B2.1',
      false,
      false,
      null,
    ],
  ];

  for (const [index, learner] of learners.entries()) {
    const instance = instances.rows[index % Math.max(instances.rowCount, 1)];
    const [salutation, first, last, email, nationality, birth, level, visa, room, roomType] =
      learner;
    const phone = `+49 421 ${100000 + index * 1117}`;
    const at = daysAgo(index + 1, 9 + index);
    const person = await newPerson({
      salutation,
      first,
      last,
      email,
      phone,
      birth,
      country: nationality,
      at,
    });

    await client.query(
      `INSERT INTO course_registrations
         (request_id, course_type_id, course_instance_id, course_type_label,
          course_instance_label, salutation, first_name, last_name, email, phone,
          nationality_raw, nationality_code, birth_date_raw, birth_date,
          declared_level_raw, declared_level_code, visa_required,
          accommodation_required, accommodation_type, smoker, notes, locale,
          status, source, person_id, submitted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::salutation, $7, $8, $9, $10,
               $11, $12, $13, $14::date, $15, (SELECT code FROM levels WHERE code = $15), $16,
               $17, $18::accommodation_type, false, $19, 'en', $20::work_status, $21, $22, $23, $23)`,
      [
        randomUUID(),
        instance?.course_type_id ?? null,
        instance?.id ?? null,
        instance?.name ?? 'Intensive German',
        instance ? `Starts ${new Date(instance.start_date).toLocaleDateString('en-GB')}` : null,
        salutation,
        first,
        last,
        email,
        phone,
        nationality,
        person.nationality_code,
        birth,
        birth,
        level,
        visa,
        room,
        roomType,
        index === 0 ? 'Arriving two days before the course starts.' : null,
        index < 3 ? 'new' : index === 3 ? 'in_progress' : 'done',
        TAG,
        person.id,
        at,
      ]
    );
  }

  const sessions = await client.query(
    `SELECT s.id, s.exam_type_id, e.code, s.starts_at
       FROM exam_sessions s
       JOIN exam_types e ON e.id = s.exam_type_id
      ORDER BY s.starts_at ASC
      LIMIT 3`
  );

  const candidates = [
    ['mr', 'Samuel', 'Adeyemi', 's.adeyemi@example.com', 'Nigeria', '1996-04-22', 'full'],
    // Left as a demonym on purpose: this is what an unmatched nationality looks like.
    ['ms', 'Elif', 'Demir', 'e.demir@example.com', 'Turkish', '1994-12-05', 'oral'],
    ['ms', 'Marta', 'Kowalska', 'm.kowalska@example.com', 'Poland', '2000-08-30', 'full'],
  ];

  for (const [index, candidate] of candidates.entries()) {
    const session = sessions.rows[index % Math.max(sessions.rowCount, 1)];
    const [salutation, first, last, email, nationality, birth, type] = candidate;
    const phone = `+49 421 ${200000 + index * 913}`;
    const at = daysAgo(index + 2, 14);
    const person = await newPerson({
      salutation,
      first,
      last,
      email,
      phone,
      birth,
      country: nationality,
      at,
    });

    const { rows: inserted } = await client.query(
      `INSERT INTO exam_registrations
         (request_id, exam_type_id, exam_session_id, exam_type_label, exam_session_label,
          registration_type, salutation, first_name, last_name, email, phone,
          nationality_raw, nationality_code, birth_date_raw, birth_date,
          official_name_confirmed, locale, status, source, person_id, submitted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::salutation, $8, $9, $10, $11,
               $12, $13, $14, $15::date, $16, 'en', $17::work_status, $18, $19, $20, $20)
       RETURNING id`,
      [
        randomUUID(),
        session?.exam_type_id ?? null,
        session?.id ?? null,
        session?.code ?? 'telc Deutsch B1',
        session ? new Date(session.starts_at).toLocaleDateString('en-GB') : null,
        type,
        salutation,
        first,
        last,
        email,
        phone,
        nationality,
        person.nationality_code,
        birth,
        birth,
        index !== 1,
        index === 0 ? 'new' : index === 1 ? 'new' : 'in_progress',
        TAG,
        person.id,
        at,
      ]
    );
    if (!person.nationality_code) {
      await client.query(
        `INSERT INTO record_flags (entity, entity_id, code, detail) VALUES ('exam_registration', $1, 'nationality_unmatched', $2)
         ON CONFLICT (entity, entity_id, code) WHERE resolved_at IS NULL DO NOTHING`,
        [inserted[0].id, JSON.stringify({ raw: nationality })]
      );
    }
  }

  /*
   * Placement attempts.
   *
   * `decision` is written as the jsonb the engine itself produces — the same
   * shape `PlacementDecision` in src/lib/placement/finalise.ts declares — so
   * the review screen renders real fields rather than a stub. The values are
   * invented; the SHAPE is not, and a demo whose shape drifts from the engine's
   * would hide exactly the rendering bugs it exists to catch.
   */
  const attempts = [
    {
      band: 'B1.2',
      confidence: 'medium',
      confidenceScore: 0.61,
      answeredShare: 0.92,
      autoConfirmable: false,
      reviewReasons: ['shadow_mode', 'uneven_skill_profile'],
      speakingRequired: false,
      profile: [
        ['language_use', 0.74, 18],
        ['reading', 0.48, 12],
        ['listening', null, 0],
      ],
      rationale: [
        'Screener placed the learner in the B1 band.',
        'B1 module credit 0.66 clears the B1.2 threshold of 0.60.',
        'Reading trails language use by 26 points, which triggers an uneven-profile review.',
      ],
      intake: {
        priorLearning: 'Two years at a Goethe-Institut, finished B1.1',
        goal: 'University admission in Bremen',
        lastContact: 'About six months ago',
      },
      writing:
        'Ich heiße Amara und ich komme aus Nigeria. Seit zwei Jahren lerne ich Deutsch, weil ich in Bremen studieren möchte. Am Anfang war die Grammatik sehr schwierig für mich, besonders die Fälle. Jetzt kann ich einfache Texte lesen und über meinen Alltag sprechen, aber ich brauche noch mehr Wortschatz für die Universität.',
      days: 2,
    },
    {
      band: 'B2.1',
      confidence: 'low',
      confidenceScore: 0.41,
      answeredShare: 0.55,
      autoConfirmable: false,
      reviewReasons: [
        'shadow_mode',
        'above_auto_confirm_ceiling',
        'incomplete_objective_evidence',
        'speaking_required',
        'b1plus_b2_boundary',
      ],
      speakingRequired: true,
      profile: [
        ['language_use', 0.68, 11],
        ['reading', 0.71, 7],
        ['listening', null, 0],
      ],
      rationale: [
        'Screener placed the learner above B1.',
        'The boundary module did not resolve the B1+/B2 edge: 0.55 against a 0.60 threshold.',
        'Only 55% of served items were answered, so the evidence is thin.',
      ],
      intake: {
        priorLearning: 'Self-taught, plus a year living in Vienna',
        goal: 'Work — needs German for meetings',
        lastContact: 'Every day at work',
      },
      days: 5,
    },
    {
      band: 'A2.1',
      confidence: 'high',
      confidenceScore: 0.86,
      answeredShare: 1,
      autoConfirmable: false,
      reviewReasons: ['shadow_mode'],
      speakingRequired: false,
      profile: [
        ['language_use', 0.81, 16],
        ['reading', 0.78, 10],
        ['listening', null, 0],
      ],
      rationale: [
        'Screener placed the learner in the A2 band.',
        'A2 module credit 0.80 clears the A2.1 threshold comfortably.',
        'Every served item was answered.',
      ],
      intake: {
        priorLearning: 'An A1 evening course last winter',
        goal: 'Everyday life in Bremen',
        lastContact: 'Three months ago',
      },
      days: 8,
      confirm: {
        level: 'A2.1',
        note: 'Agreed with the recommendation after a short conversation.',
      },
    },
  ];

  const [owner] = (
    await client.query(`SELECT id, name FROM staff_users ORDER BY created_at ASC LIMIT 1`)
  ).rows;

  for (const [index, attempt] of attempts.entries()) {
    const decision = {
      policyVersion: 1,
      releaseMode: 'shadow',
      band: attempt.band,
      confidence: attempt.confidence,
      confidenceScore: attempt.confidenceScore,
      skillProfile: attempt.profile.map(([skill, credit, itemCount]) => ({
        skill,
        credit,
        itemCount,
      })),
      answeredShare: attempt.answeredShare,
      autoConfirmable: attempt.autoConfirmable,
      reviewReasons: attempt.reviewReasons,
      speakingRequired: attempt.speakingRequired,
      rationale: attempt.rationale,
    };

    const submitted = daysAgo(attempt.days, 11 + index);

    const inserted = await client.query(
      `INSERT INTO placement_attempts
         (token, locale, status, phase, intake, router_target_level, decision,
          created_at, submitted_at)
       VALUES ($1, 'en', 'submitted', 'complete', $2::jsonb, $3, $4::jsonb, $5, $5)
       RETURNING id`,
      [
        `${TAG}-${randomUUID()}`,
        JSON.stringify(attempt.intake),
        attempt.band.split('.')[0],
        JSON.stringify(decision),
        submitted,
      ]
    );

    const attemptId = inserted.rows[0].id;

    if (attempt.writing) {
      await client.query(
        `INSERT INTO placement_writing_submissions
           (attempt_id, prompt_id, text, word_count, submitted_at)
         VALUES ($1, 'w-b1-self-introduction', $2, $3, $4)`,
        [attemptId, attempt.writing, attempt.writing.split(/\s+/).length, submitted]
      );
    }

    if (attempt.confirm && owner) {
      await client.query(
        `INSERT INTO placement_reviews
           (attempt_id, reviewed_by, confirmed_level, note, recommended_band,
            policy_version, speaking_check_done)
         VALUES ($1, $2, $3, $4, $5, 1, true)`,
        [attemptId, owner.id, attempt.confirm.level, attempt.confirm.note, attempt.band]
      );

      await client.query(
        `INSERT INTO staff_activity
           (staff_user_id, staff_name, entity, entity_id, action, detail)
         VALUES ($1, $2, 'placement_attempt', $3, 'placement_confirmed', $4::jsonb)`,
        [
          owner.id,
          owner.name,
          attemptId,
          JSON.stringify({
            level: attempt.confirm.level,
            recommended: attempt.band,
            agreed: true,
          }),
        ]
      );
    }
  }

  console.log(
    `\nSeeded ${enquiries.length} enquiries, ${learners.length} course registrations, ${candidates.length} exam registrations and ${attempts.length} placement attempts.`
  );
  console.log('Remove them again with: node scripts/admin/seed-demo.mjs --clear\n');
} finally {
  await client.end();
}
