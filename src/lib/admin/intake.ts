import type { PoolClient } from 'pg';

import { isOrganiserTopic, isCompanyTopic } from '@/lib/validation/contact';
import { isWorkspaceDatabaseConfigured, query, withTransaction } from './db';
import { raiseFlag, type FlagEntity } from './flags';
import {
  countryCodeFromName,
  levelCodeFrom,
  normalizeEmail,
  normalizePhone,
  parseIsoDate,
} from './normalize';

/**
 * The write path from the public site into the workspace.
 *
 * WHY THESE FUNCTIONS NEVER THROW
 *
 * Every one is called from a public route handler that has already accepted a
 * visitor's form. If storing fails — an unapplied migration, a database
 * restarting — the visitor must still get their confirmation, because the
 * webhook fan-out has already run and the enquiry is not lost. Turning a
 * storage failure into a 502 would tell someone their enquiry did not arrive
 * when it did. So each returns a boolean and logs loudly on failure.
 *
 * THE WEBHOOK STAYS. Persisting is alongside the fan-out, never instead of it.
 *
 * WHAT CHANGED WITH 0007 (docs/FILEMAKER_LESSONS.md)
 *
 * Every submission now creates a PERSON, with typed contact channels, in the
 * same transaction as the queue row — one human, one row, from first contact
 * (§1.1). Since 0076 (2026-10-21) that person is created OFF the register
 * (`listed = false`): Teilnehmende holds only those a colleague has acted on —
 * booked, put on a waiting list, linked to someone listed, or listed by hand.
 * Text that can be typed is typed; text that cannot is kept raw and
 * FLAGGED, never corrected (§2.4, §11). And when the new person looks like one
 * we already have, that is a flag for a staff member to resolve by linking —
 * intake itself never decides two rows are the same human (§1.2).
 */

type Exec = (sql: string, params: unknown[]) => Promise<unknown>;
const execOn =
  (client: PoolClient): Exec =>
  (sql, params) =>
    client.query(sql, params);

function classifyEnquiry(topicKey: string | null | undefined): 'general' | 'group' | 'company' {
  if (!isOrganiserTopic(topicKey)) return 'general';
  return isCompanyTopic(topicKey) ? 'company' : 'group';
}

function report(scope: string, error: unknown): false {
  // Name and SQLSTATE only: a pg message can quote the form values it rejected.
  console.error(`[workspace-intake] ${scope} was not stored`, {
    name: error instanceof Error ? error.name : 'UnknownError',
    code: (error as { code?: unknown } | null)?.code,
  });
  return false;
}

/**
 * Creates the person and their channels, and returns the id plus any other
 * canonical people who look like the same human. Runs inside the caller's
 * transaction, so a failed queue insert takes the person with it.
 */
async function createPerson(
  client: PoolClient,
  input: {
    salutation?: string | null;
    firstName: string;
    lastName: string | null;
    birthDate?: string | null;
    nationalityRaw?: string | null;
    email?: string | null;
    phone?: string | null;
    createdAt: Date;
  }
): Promise<{
  personId: string;
  birthDate: string | null;
  nationalityCode: string | null;
  candidates: { id: string; name: string; reason: 'email' | 'name_and_birth_date' }[];
}> {
  const birthDate = parseIsoDate(input.birthDate);
  const nationalityCode = countryCodeFromName(input.nationalityRaw);
  const email = input.email?.trim() ? normalizeEmail(input.email) : null;

  // Look BEFORE creating, so the new row cannot match itself. Canonical rows
  // only — a duplicate already linked to a survivor shows up through the survivor.
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (email) {
    params.push(email);
    conditions.push(
      `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $${params.length})`
    );
  }
  if (input.lastName?.trim() && birthDate) {
    params.push(input.lastName.trim().toLowerCase(), birthDate);
    conditions.push(
      `(lower(p.last_name) = $${params.length - 1} AND p.birth_date = $${params.length}::date)`
    );
  }
  const candidates: { id: string; name: string; reason: 'email' | 'name_and_birth_date' }[] = [];
  if (conditions.length > 0) {
    const { rows } = await client.query<{
      id: string;
      first_name: string;
      last_name: string | null;
      by_email: boolean;
    }>(
      `SELECT p.id, p.first_name, p.last_name,
              ${email ? `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $1)` : 'false'} AS by_email
         FROM people p
        WHERE p.merged_into IS NULL AND p.deleted_at IS NULL AND (${conditions.join(' OR ')})
        ORDER BY p.created_at LIMIT 10`,
      params
    );
    for (const r of rows) {
      candidates.push({
        id: r.id,
        name: [r.first_name, r.last_name].filter(Boolean).join(' '),
        reason: r.by_email ? 'email' : 'name_and_birth_date',
      });
    }
  }

  const { rows } = await client.query<{ id: string }>(
    // Off the register until a colleague acts on the enquiry or registration (0076).
    `INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by, created_at, listed)
     VALUES ($1::salutation, $2, $3, $4::date, $5, $6, 'public-site', $7, false)
     RETURNING id`,
    [
      input.salutation || null,
      input.firstName.trim(),
      input.lastName?.trim() || null,
      birthDate,
      nationalityCode,
      input.nationalityRaw?.trim() || null,
      input.createdAt,
    ]
  );
  const personId = rows[0].id;

  if (email) {
    await client.query(
      `INSERT INTO emails (person_id, address, normalized, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [personId, input.email!.trim(), email, input.createdAt]
    );
  }
  if (input.phone?.trim()) {
    await client.query(
      `INSERT INTO phones (person_id, number, normalized, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [personId, input.phone.trim(), normalizePhone(input.phone), input.createdAt]
    );
  }

  return { personId, birthDate, nationalityCode, candidates };
}

/** The flags every intake raises for what it could not type. */
async function raiseIntakeFlags(
  exec: Exec,
  entity: FlagEntity,
  entityId: string,
  facts: {
    candidates: { id: string; name: string; reason: string }[];
    nationalityRaw?: string | null;
    nationalityCode?: string | null;
    birthDateRaw?: string | null;
    birthDate?: string | null;
    levelRaw?: string | null;
    levelCode?: string | null;
  }
): Promise<void> {
  if (facts.candidates.length > 0) {
    await raiseFlag(
      { entity, entityId, code: 'duplicate_candidate', detail: { candidates: facts.candidates } },
      exec
    );
  }
  if (facts.nationalityRaw?.trim() && !facts.nationalityCode) {
    await raiseFlag(
      { entity, entityId, code: 'nationality_unmatched', detail: { raw: facts.nationalityRaw } },
      exec
    );
  }
  if (facts.birthDateRaw?.trim() && !facts.birthDate) {
    await raiseFlag(
      { entity, entityId, code: 'birth_date_unparsed', detail: { raw: facts.birthDateRaw } },
      exec
    );
  }
  if (facts.levelRaw?.trim() && !facts.levelCode) {
    await raiseFlag(
      { entity, entityId, code: 'level_unmatched', detail: { raw: facts.levelRaw } },
      exec
    );
  }
}

export type EnquiryInput = {
  requestId: string;
  locale: 'en' | 'de';
  firstName: string;
  lastName: string | null;
  email: string;
  topic: string;
  topicKey: string | null;
  message: string;
  source: string;
  organiserBrief: Record<string, unknown> | null;
  userAgent: string | null;
  /** Looked like spam (lib/validation/spam): stored as „Spam", in no list. */
  spam?: boolean;
};

/** Used by appointment intake so reservation, person and enquiry commit together. */
export async function storeEnquiryInTransaction(client: PoolClient, input: EnquiryInput): Promise<void> {
  const now = new Date();
  const person = await createPerson(client, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    createdAt: now,
  });
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO enquiries
       (request_id, kind, locale, first_name, last_name, email, topic, topic_key,
        message, source, organiser_brief, user_agent, person_id, submitted_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::work_status)
     ON CONFLICT (request_id) DO NOTHING
     RETURNING id`,
    [
      input.requestId,
      classifyEnquiry(input.topicKey),
      input.locale,
      input.firstName,
      input.lastName,
      input.email,
      input.topic,
      input.topicKey,
      input.message,
      input.source,
      input.organiserBrief ? JSON.stringify(input.organiserBrief) : null,
      input.userAgent,
      person.personId,
      now,
      input.spam ? 'spam' : 'new',
    ]
  );
  // A retried request_id inserts nothing; the person created above must not
  // outlive it. Roll the whole thing back by throwing a sentinel.
  if (rows.length === 0) throw new Duplicate();
  await raiseIntakeFlags(execOn(client), 'enquiry', rows[0].id, {
    candidates: person.candidates,
  });
}

export async function storeEnquiry(input: EnquiryInput): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) return false;
  try {
    await withTransaction(client => storeEnquiryInTransaction(client, input));
    return true;
  } catch (error) {
    if (error instanceof Duplicate) return true;
    return report('enquiry', error);
  }
}

class Duplicate extends Error {}

type CreatedPerson = Awaited<ReturnType<typeof createPerson>>;

type RegistrantInput = {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  birthDate: string;
};

const registrantPerson = (input: RegistrantInput, now: Date) => ({
  salutation: input.salutation,
  firstName: input.firstName,
  lastName: input.lastName,
  birthDate: input.birthDate,
  nationalityRaw: input.nationality,
  email: input.email,
  phone: input.phone,
  createdAt: now,
});

type CourseRowInput = {
  requestId: string;
  courseTypeId: string;
  courseInstanceId: string;
  courseTypeLabel: string;
  courseInstanceLabel: string;
  /** What the learner chose, e.g. "A1 komplett · 8 Wochen" or "B1.2". */
  levelRaw: string;
  /** The half level it starts at, the stored code; null when the raw value is not a CASA level. */
  levelCode: string | null;
};

type StayInput = {
  visaRequired: boolean;
  accommodationRequired: boolean;
  accommodationType: string | undefined;
  allergies: string;
  notes: string;
};

/**
 * The Anmeldung (0097): what one person sent at once, with its lines below. Its reference is the first
 * line's request id; null when that exists already, i.e. a retried submission.
 */
async function insertRegistration(client: PoolClient, person: CreatedPerson, requestId: string, locale: 'en' | 'de', now: Date): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO registrations (request_id, person_id, locale, submitted_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (request_id) DO NOTHING
     RETURNING id`,
    [requestId, person.personId, locale, now]
  );
  return rows[0]?.id ?? null;
}

/** One course_registrations row, a line of the Anmeldung, for a person created in the same transaction. Null when the request id exists. */
async function insertCourseRow(
  client: PoolClient,
  registrationId: string,
  person: CreatedPerson,
  registrant: RegistrantInput,
  stay: StayInput,
  course: CourseRowInput,
  locale: 'en' | 'de',
  now: Date
): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO course_registrations
       (request_id, course_type_id, course_instance_id, course_type_label,
        course_instance_label, salutation, first_name, last_name, email, phone,
        nationality_raw, nationality_code, birth_date_raw, birth_date,
        declared_level_raw, declared_level_code, visa_required,
        accommodation_required, accommodation_type, allergies, notes,
        locale, person_id, submitted_at, registration_id)
     VALUES ($1,
             (SELECT id FROM course_types WHERE id = $2::uuid),
             (SELECT id FROM course_instances WHERE id = $3::uuid),
             $4, $5, $6::salutation, $7, $8, $9, $10,
             $11, $12, $13, $14::date, $15, $16, $17, $18, $19::accommodation_type, $20, $21,
             $22, $23, $24, $25)
     ON CONFLICT (request_id) DO NOTHING
     RETURNING id`,
    [
      course.requestId,
      // The wizard sends whatever the catalogue gave it, and with no rows of
      // its own the catalogue serves fixtures: uuid-shaped ids with no row
      // behind them, which the FK would reject along with the whole
      // registration. So an id is stored only when its row exists (the
      // sub-selects above), a non-uuid never, and the labels carry the
      // meaning either way. Losing the join is survivable; losing the
      // registration is not.
      asUuid(course.courseTypeId),
      asUuid(course.courseInstanceId),
      course.courseTypeLabel || null,
      course.courseInstanceLabel || null,
      registrant.salutation,
      registrant.firstName,
      registrant.lastName,
      registrant.email,
      registrant.phone,
      registrant.nationality,
      person.nationalityCode,
      registrant.birthDate,
      person.birthDate,
      course.levelRaw || null,
      course.levelCode,
      stay.visaRequired,
      stay.accommodationRequired,
      stay.accommodationType ?? null,
      stay.allergies || null,
      stay.notes || null,
      locale,
      person.personId,
      now,
      registrationId,
    ]
  );
  return rows[0]?.id ?? null;
}

type ExamRowInput = {
  requestId: string;
  examTypeId: string;
  examSessionId: string;
  examTypeLabel: string;
  examSessionLabel: string;
  registrationType: string;
  officialNameConfirmed: boolean;
};

/** One exam_registrations row, a line of the Anmeldung, for a person created in the same transaction. Null when the request id exists. */
async function insertExamRow(
  client: PoolClient,
  registrationId: string,
  person: CreatedPerson,
  registrant: RegistrantInput,
  exam: ExamRowInput,
  locale: 'en' | 'de',
  now: Date
): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO exam_registrations
       (request_id, exam_type_id, exam_session_id, exam_type_label, exam_session_label,
        registration_type, salutation, first_name, last_name, email, phone,
        nationality_raw, nationality_code, birth_date_raw, birth_date,
        official_name_confirmed, locale, person_id, submitted_at, registration_id)
     VALUES ($1,
             (SELECT id FROM exam_types WHERE id = $2::uuid),
             (SELECT id FROM exam_sessions WHERE id = $3::uuid),
             $4, $5, $6, $7::salutation, $8, $9, $10, $11,
             $12, $13, $14, $15::date, $16, $17, $18, $19, $20)
     ON CONFLICT (request_id) DO NOTHING
     RETURNING id`,
    [
      exam.requestId,
      // As for courses above. Nothing seeds exam_sessions, so in database
      // mode the form still offers fixture sessions; each one is stored
      // with a null FK and its label, never refused.
      asUuid(exam.examTypeId),
      asUuid(exam.examSessionId),
      exam.examTypeLabel || null,
      exam.examSessionLabel || null,
      exam.registrationType,
      registrant.salutation,
      registrant.firstName,
      registrant.lastName,
      registrant.email,
      registrant.phone,
      registrant.nationality,
      person.nationalityCode,
      registrant.birthDate,
      person.birthDate,
      exam.officialNameConfirmed,
      locale,
      person.personId,
      now,
      registrationId,
    ]
  );
  return rows[0]?.id ?? null;
}

const personFacts = (person: CreatedPerson, registrant: RegistrantInput) => ({
  candidates: person.candidates,
  nationalityRaw: registrant.nationality,
  nationalityCode: person.nationalityCode,
  birthDateRaw: registrant.birthDate,
  birthDate: person.birthDate,
});

export async function storeCourseRegistration(input: RegistrantInput & StayInput & {
  requestId: string;
  courseTypeId: string;
  courseInstanceId: string;
  courseTypeLabel: string;
  courseInstanceLabel: string;
  currentLevel: string;
  locale: 'en' | 'de';
}): Promise<boolean> {
  return storeRegistration({
    registrant: input,
    stay: input,
    locale: input.locale,
    courses: [{
      requestId: input.requestId,
      courseTypeId: input.courseTypeId,
      courseInstanceId: input.courseInstanceId,
      courseTypeLabel: input.courseTypeLabel,
      courseInstanceLabel: input.courseInstanceLabel,
      levelRaw: input.currentLevel,
      levelCode: levelCodeFrom(input.currentLevel),
    }],
  });
}

/**
 * One registration as the learner sent it: one person, one Anmeldung (0097,
 * 2026-10-27), and below it a line per course and a line for an exam booked
 * with them, all in one transaction, each line with its own request id. The
 * learner's reference is the first line's request id, which is also the
 * Anmeldung's.
 *
 * The person's own flags (a possible duplicate, an unmatched nationality or
 * birth date) go on the first line only, so one person is flagged once; the
 * other lines carry only their level's flag.
 */
export async function storeRegistration(input: {
  registrant: RegistrantInput;
  stay: StayInput;
  locale: 'en' | 'de';
  courses: CourseRowInput[];
  exam?: ExamRowInput;
}): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) return false;
  try {
    await withTransaction(async (client) => {
      const now = new Date();
      const person = await createPerson(client, registrantPerson(input.registrant, now));
      const exec = execOn(client);
      const reference = input.courses[0]?.requestId ?? input.exam?.requestId;
      if (!reference) return;
      // The first line's request id is the submission's: already stored means a retry.
      const registrationId = await insertRegistration(client, person, reference, input.locale, now);
      if (!registrationId) throw new Duplicate();

      for (const [index, course] of input.courses.entries()) {
        const id = await insertCourseRow(client, registrationId, person, input.registrant, input.stay, course, input.locale, now);
        if (!id) {
          if (index === 0) throw new Duplicate();
          continue;
        }
        if (index === 0) await raiseDeliveryFlags(exec, 'course_registration', id);
        await raiseIntakeFlags(exec, 'course_registration', id, {
          ...(index === 0 ? personFacts(person, input.registrant) : { candidates: [] }),
          levelRaw: course.levelRaw,
          levelCode: course.levelCode,
        });
      }

      if (input.exam) {
        const id = await insertExamRow(client, registrationId, person, input.registrant, input.exam, input.locale, now);
        if (id) await raiseIntakeFlags(exec, 'exam_registration', id, input.courses.length ? { candidates: [] } : personFacts(person, input.registrant));
      }
    });
    return true;
  } catch (error) {
    if (error instanceof Duplicate) return true;
    return report('registration', error);
  }
}

export async function storeExamRegistration(input: RegistrantInput & ExamRowInput & { locale: 'en' | 'de' }): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) return false;
  try {
    await withTransaction(async (client) => {
      const now = new Date();
      const person = await createPerson(client, registrantPerson(input, now));
      const registrationId = await insertRegistration(client, person, input.requestId, input.locale, now);
      if (!registrationId) throw new Duplicate();
      const id = await insertExamRow(client, registrationId, person, input, input, input.locale, now);
      if (!id) throw new Duplicate();
      await raiseDeliveryFlags(execOn(client), 'exam_registration', id);
      await raiseIntakeFlags(execOn(client), 'exam_registration', id, personFacts(person, input));
    });
    return true;
  } catch (error) {
    if (error instanceof Duplicate) return true;
    return report('exam registration', error);
  }
}

/** Fail safe: flags are committed with the registration before any mail attempt. */
async function raiseDeliveryFlags(exec: Exec, entity: 'course_registration' | 'exam_registration', entityId: string) {
  await raiseFlag({ entity, entityId, code: 'registration_staff_notice_unconfirmed' }, exec);
  await raiseFlag({ entity, entityId, code: 'registration_receipt_unconfirmed' }, exec);
}

/** Clear only the checks the provider accepted; an interrupted or failed update leaves a review flag. */
export async function settleRegistrationDelivery(requestId: string, kind: 'course' | 'exam', staffAccepted: boolean, receiptReached: boolean): Promise<void> {
  const codes = [
    ...(staffAccepted ? ['registration_staff_notice_unconfirmed'] : []),
    ...(receiptReached ? ['registration_receipt_unconfirmed'] : []),
  ];
  if (!codes.length) return;
  try {
    const table = kind === 'course' ? 'course_registrations' : 'exam_registrations';
    await query(
      `UPDATE record_flags SET resolved_at = now()
        WHERE entity = $1 AND entity_id = (SELECT id FROM ${table} WHERE request_id = $2::uuid)
          AND code = ANY($3::text[]) AND resolved_at IS NULL`,
      [`${kind}_registration`, requestId, codes]
    );
  } catch {
    console.error('[registration-delivery] could not settle review flags', { requestId, kind });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (value: string | null | undefined) => (value && UUID.test(value) ? value : null);
