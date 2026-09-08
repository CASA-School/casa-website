import { isOrganiserTopic, isCompanyTopic } from '@/lib/validation/contact';
import { isWorkspaceDatabaseConfigured, query } from './db';

/**
 * The write path from the public site into the workspace queues.
 *
 * WHY THESE FUNCTIONS NEVER THROW
 *
 * Every one is called from a public route handler that has already accepted a
 * visitor's form. If storing the record fails — an unapplied migration, a
 * database restarting, a full disk — the visitor must still get their
 * confirmation, because the webhook fan-out has already run and the enquiry is
 * not lost. Turning a storage failure into a 502 would tell someone their
 * enquiry did not arrive when it did, and they would either give up or send it
 * four more times.
 *
 * So each returns a boolean and logs loudly on failure. The route reports
 * `stored: false` in its own response and the server log names the cause.
 *
 * THE WEBHOOK STAYS. Adding storage does not replace the fan-out. CASA may have
 * automations wired to those webhooks that nobody has inventoried, and silently
 * cutting them off in the same change that adds a dashboard would be a
 * regression disguised as progress.
 */

/**
 * Derived at write time, not read time. The `topic` a visitor sees is localized
 * and the `topicKey` behind it is not, so classifying on the key here means a
 * German-language group enquiry and an English one land in the same bucket.
 */
function classifyEnquiry(topicKey: string | null | undefined): 'general' | 'group' | 'company' {
  if (!isOrganiserTopic(topicKey)) {
    return 'general';
  }

  return isCompanyTopic(topicKey) ? 'company' : 'group';
}

function report(scope: string, error: unknown): false {
  console.error(`[workspace-intake] ${scope} was not stored`, {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  return false;
}

export async function storeEnquiry(input: {
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
}): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) {
    return false;
  }

  try {
    await query(
      `INSERT INTO enquiries
         (request_id, kind, locale, first_name, last_name, email, topic, topic_key,
          message, source, organiser_brief, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (request_id) DO NOTHING`,
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
      ]
    );

    return true;
  } catch (error) {
    return report('enquiry', error);
  }
}

export async function storeCourseRegistration(input: {
  requestId: string;
  courseTypeId: string;
  courseInstanceId: string;
  courseTypeLabel: string;
  courseInstanceLabel: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  birthDate: string;
  currentLevel: string;
  visaRequired: boolean;
  accommodationRequired: boolean;
  accommodationType: string | undefined;
  smoker: boolean;
  allergies: string;
  notes: string;
  locale: 'en' | 'de';
}): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) {
    return false;
  }

  try {
    await query(
      `INSERT INTO course_registrations
         (request_id, course_type_id, course_instance_id, course_type_label,
          course_instance_label, salutation, first_name, last_name, email, phone,
          nationality, birth_date, current_level, visa_required,
          accommodation_required, accommodation_type, smoker, allergies, notes, locale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (request_id) DO NOTHING`,
      [
        input.requestId,
        // The public wizard sends whatever the catalogue gave it. If the
        // catalogue was served from fixtures the id is not a uuid and the FK
        // would reject the whole row — so a non-uuid is stored as null and the
        // labels carry the meaning. Losing the join is survivable; losing the
        // registration is not.
        asUuid(input.courseTypeId),
        asUuid(input.courseInstanceId),
        input.courseTypeLabel || null,
        input.courseInstanceLabel || null,
        input.salutation,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.nationality,
        input.birthDate,
        input.currentLevel || null,
        input.visaRequired,
        input.accommodationRequired,
        input.accommodationType ?? null,
        input.smoker,
        input.allergies || null,
        input.notes || null,
        input.locale,
      ]
    );

    return true;
  } catch (error) {
    return report('course registration', error);
  }
}

export async function storeExamRegistration(input: {
  requestId: string;
  examTypeId: string;
  examSessionId: string;
  examTypeLabel: string;
  examSessionLabel: string;
  registrationType: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  birthDate: string;
  officialNameConfirmed: boolean;
  locale: 'en' | 'de';
}): Promise<boolean> {
  if (!isWorkspaceDatabaseConfigured()) {
    return false;
  }

  try {
    await query(
      `INSERT INTO exam_registrations
         (request_id, exam_type_id, exam_session_id, exam_type_label, exam_session_label,
          registration_type, salutation, first_name, last_name, email, phone,
          nationality, birth_date, official_name_confirmed, locale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (request_id) DO NOTHING`,
      [
        input.requestId,
        asUuid(input.examTypeId),
        asUuid(input.examSessionId),
        input.examTypeLabel || null,
        input.examSessionLabel || null,
        input.registrationType,
        input.salutation,
        input.firstName,
        input.lastName,
        input.email,
        input.phone,
        input.nationality,
        input.birthDate,
        input.officialNameConfirmed,
        input.locale,
      ]
    );

    return true;
  } catch (error) {
    return report('exam registration', error);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuid = (value: string | null | undefined) =>
  value && UUID.test(value) ? value : null;
