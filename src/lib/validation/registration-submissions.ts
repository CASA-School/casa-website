import { z } from 'zod';

import { normalizeContentLocale } from '@/lib/content/locale';

type RegistrationLocale = 'en' | 'de';

const localeSchema = z.preprocess(
  (value) => normalizeContentLocale(String(value ?? 'en')),
  z.enum(['en', 'de'])
);

/**
 * The locale a submission declares, read BEFORE it is validated, so the route
 * can answer a German page's 400 in German. Same normalisation as `locale`.
 */
export function submissionLocale(body: unknown): RegistrationLocale {
  const value = body && typeof body === 'object' ? (body as { locale?: unknown }).locale : undefined;
  return normalizeContentLocale(String(value ?? 'en'));
}

/**
 * Course type slugs that require the learner to declare their current level.
 * All level-based courses are included; corporate / conversation courses are excluded
 * because they use needs-analysis intake instead of CEFR self-assessment.
 */
const LEVEL_REQUIRED_SLUGS = new Set([
  'intensive-german',
  'evening-german',
  'special-courses',
  'medical-german',
  'bildungszeit',
  'exam-preparation',
]);

/**
 * Returns true when the given course type slug requires a currentLevel selection
 * in the registration form. Use this in wizard UI logic.
 */
export function requiresLevelField(courseTypeSlug: string | null | undefined): boolean {
  if (!courseTypeSlug) return false;
  return LEVEL_REQUIRED_SLUGS.has(courseTypeSlug);
}

/**
 * Every message the registration schemas can produce, per locale. The wizard
 * renders them under the field and the API returns the first one as its 400,
 * so a German page never shows an English sentence.
 */
const REGISTRATION_MESSAGES = {
  en: {
    salutation: 'Please select a salutation.',
    course: 'Please select a course.',
    courseOption: 'Please select a course option.',
    exam: 'Please select an exam.',
    examSession: 'Please select an exam session.',
    registrationType: 'Please select a registration type.',
    firstName: 'First name is required.',
    lastName: 'Last name is required.',
    email: 'Please enter a valid email address.',
    phone: 'Phone number is required.',
    nationality: 'Nationality is required.',
    birthDate: 'Date of birth is required.',
    accommodationType: 'Please select an accommodation type.',
    officialName: 'Please confirm your official name matches your identification.',
    examPolicy: 'Please accept exam registration terms before submitting.',
    acceptTerms: 'You must accept the terms and conditions to proceed.',
    tooLong: 'This entry is too long.',
    invalid: 'Please check this entry.',
  },
  de: {
    salutation: 'Bitte wählen Sie eine Anrede aus.',
    course: 'Bitte wählen Sie einen Kurs aus.',
    courseOption: 'Bitte wählen Sie einen Starttermin aus.',
    exam: 'Bitte wählen Sie eine Prüfung aus.',
    examSession: 'Bitte wählen Sie einen Prüfungstermin aus.',
    registrationType: 'Bitte wählen Sie eine Anmeldeart aus.',
    firstName: 'Bitte geben Sie Ihren Vornamen an (mindestens 2 Zeichen).',
    lastName: 'Bitte geben Sie Ihren Nachnamen an (mindestens 2 Zeichen).',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    phone: 'Bitte geben Sie Ihre Telefonnummer an.',
    nationality: 'Bitte geben Sie Ihre Nationalität an.',
    birthDate: 'Bitte geben Sie Ihr Geburtsdatum an.',
    accommodationType: 'Bitte wählen Sie eine Wohnform aus.',
    officialName: 'Bitte bestätigen Sie, dass Ihr Name mit Ihrem amtlichen Ausweis übereinstimmt.',
    examPolicy: 'Bitte bestätigen Sie die Bedingungen der Prüfungsanmeldung.',
    acceptTerms: 'Bitte akzeptieren Sie die Allgemeinen Geschäftsbedingungen, um fortzufahren.',
    tooLong: 'Diese Angabe ist zu lang.',
    invalid: 'Bitte prüfen Sie diese Angabe.',
  },
} as const satisfies Record<RegistrationLocale, Record<string, string>>;

type RegistrationMessages = (typeof REGISTRATION_MESSAGES)[RegistrationLocale];

/*
 * Bounds are input guards, not published limits. An id is a uuid (36) or a
 * fixture slug; a birth date is YYYY-MM-DD. The birth date stays unparsed here
 * on purpose: intake keeps the raw value and flags one it cannot read
 * (`birth_date_unparsed`).
 */
const ID_MAX = 64;
const BIRTH_DATE_MAX = 32;

const requiredText = (m: RegistrationMessages, message: string, min: number, max: number) =>
  z.string({ message }).trim().min(min, message).max(max, m.tooLong);

const optionalText = (m: RegistrationMessages, max: number) =>
  z.string({ message: m.invalid }).trim().max(max, m.tooLong).optional().default('');

const requiredId = (m: RegistrationMessages, message: string) =>
  z.string({ message }).min(1, message).max(ID_MAX, m.tooLong);

const birthDate = (m: RegistrationMessages) =>
  z.string({ message: m.birthDate }).min(1, m.birthDate).max(BIRTH_DATE_MAX, m.tooLong);

const confirmed = (message: string) => z.boolean({ message }).refine((value) => value === true, message);

/**
 * Honeypot, the contact form's convention: hidden from people, filled by bots.
 * A filled one gets a success-shaped answer and nothing is stored or sent.
 * It never fails validation: an over-long or non-string value is still a
 * filled field, and a 400 would tell the bot the field is inspected.
 */
const honeypot = z
  .unknown()
  .transform((value) => (value === undefined || value === null ? '' : String(value).trim().slice(0, 200)));

const courseRegistrationValidation =
  (m: RegistrationMessages) =>
  (
    data: {
      accommodationRequired: boolean;
      accommodationType?: 'flat' | 'host';
    },
    ctx: z.RefinementCtx
  ) => {
    if (data.accommodationRequired && !data.accommodationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: m.accommodationType,
        path: ['accommodationType'],
      });
    }
  };

const courseRegistrationFormFieldsSchema = (m: RegistrationMessages) =>
  z.object(
    {
      salutation: z.enum(['mr', 'ms', 'mx', 'neutral'], { message: m.salutation }),
      courseTypeId: requiredId(m, m.course),
      courseInstanceId: requiredId(m, m.courseOption),
      /**
       * Learner's current CEFR sub-level (e.g. 'B1.2').
       * Optional at schema level — conditional requirement enforced in the wizard
       * via requiresLevelField(). Stored and forwarded on submission.
       */
      currentLevel: optionalText(m, 20),
      firstName: requiredText(m, m.firstName, 2, 80),
      lastName: requiredText(m, m.lastName, 2, 80),
      email: z.string({ message: m.email }).trim().email(m.email).max(200, m.tooLong),
      phone: requiredText(m, m.phone, 5, 60),
      nationality: requiredText(m, m.nationality, 2, 120),
      birthDate: birthDate(m),
      visaRequired: z.boolean({ message: m.invalid }),
      accommodationRequired: z.boolean({ message: m.invalid }),
      accommodationType: z.enum(['flat', 'host'], { message: m.accommodationType }).optional(),
      smoker: z.boolean({ message: m.invalid }).optional().default(false),
      allergies: optionalText(m, 500),
      notes: optionalText(m, 2000),
      acceptTerms: confirmed(m.acceptTerms),
      website: honeypot,
    },
    { message: m.invalid }
  );

export function createCourseRegistrationFormSchema(locale: RegistrationLocale) {
  const m = REGISTRATION_MESSAGES[locale];
  return courseRegistrationFormFieldsSchema(m).superRefine(courseRegistrationValidation(m));
}

export function createCourseRegistrationSubmissionSchema(locale: RegistrationLocale) {
  const m = REGISTRATION_MESSAGES[locale];
  return courseRegistrationFormFieldsSchema(m)
    .extend({
      courseTypeLabel: optionalText(m, 160),
      courseInstanceLabel: optionalText(m, 240),
      locale: localeSchema,
    })
    .superRefine(courseRegistrationValidation(m));
}

const examRegistrationFieldsSchema = (m: RegistrationMessages) =>
  z.object(
    {
      salutation: z.enum(['mr', 'ms', 'mx', 'neutral'], { message: m.salutation }),
      examTypeId: requiredId(m, m.exam),
      examSessionId: requiredId(m, m.examSession),
      examTypeLabel: optionalText(m, 160),
      examSessionLabel: optionalText(m, 240),
      registrationType: z.enum(['full', 'written', 'oral'], { message: m.registrationType }),
      firstName: requiredText(m, m.firstName, 2, 80),
      lastName: requiredText(m, m.lastName, 2, 80),
      email: z.string({ message: m.email }).trim().email(m.email).max(200, m.tooLong),
      phone: requiredText(m, m.phone, 5, 60),
      nationality: requiredText(m, m.nationality, 2, 120),
      birthDate: birthDate(m),
      officialNameConfirmed: confirmed(m.officialName),
      examPolicyAccepted: confirmed(m.examPolicy),
      acceptTerms: confirmed(m.acceptTerms),
      website: honeypot,
      locale: localeSchema,
    },
    { message: m.invalid }
  );

export function createExamRegistrationFormSchema(locale: RegistrationLocale) {
  return examRegistrationFieldsSchema(REGISTRATION_MESSAGES[locale]).omit({
    locale: true,
    examTypeLabel: true,
    examSessionLabel: true,
  });
}

export function createExamRegistrationSubmissionSchema(locale: RegistrationLocale) {
  return examRegistrationFieldsSchema(REGISTRATION_MESSAGES[locale]);
}

export type CourseRegistrationSubmissionInput = z.infer<ReturnType<typeof createCourseRegistrationSubmissionSchema>>;
export type ExamRegistrationSubmissionInput = z.infer<ReturnType<typeof createExamRegistrationSubmissionSchema>>;
