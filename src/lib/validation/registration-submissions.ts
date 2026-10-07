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
    allergyConsent: 'Please give your consent, or leave the allergies field empty.',
    officialName: 'Please confirm your official name matches your identification.',
    examPolicy: 'Please accept exam registration terms before submitting.',
    acceptTerms: 'You must accept the terms and conditions to proceed.',
    level: 'Please choose a level.',
    sameCourseTwice: 'You have already chosen this date for this course.',
    tooLong: 'This entry is too long.',
    invalid: 'Please check this entry.',
  },
  de: {
    salutation: 'Bitte wähle eine Anrede aus.',
    course: 'Bitte wähle einen Kurs aus.',
    courseOption: 'Bitte wähle einen Starttermin aus.',
    exam: 'Bitte wähle eine Prüfung aus.',
    examSession: 'Bitte wähle einen Prüfungstermin aus.',
    registrationType: 'Bitte wähle eine Anmeldeart aus.',
    firstName: 'Bitte gib deinen Vornamen an (mindestens 2 Zeichen).',
    lastName: 'Bitte gib deinen Nachnamen an (mindestens 2 Zeichen).',
    email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    phone: 'Bitte gib deine Telefonnummer an.',
    nationality: 'Bitte gib deine Nationalität an.',
    birthDate: 'Bitte gib dein Geburtsdatum an.',
    accommodationType: 'Bitte wähle eine Wohnform aus.',
    allergyConsent: 'Bitte willige ein oder lass das Feld zu Allergien leer.',
    officialName: 'Bitte bestätige, dass dein Name mit deinem amtlichen Ausweis übereinstimmt.',
    examPolicy: 'Bitte bestätige die Bedingungen der Prüfungsanmeldung.',
    acceptTerms: 'Bitte akzeptiere die Allgemeinen Geschäftsbedingungen, um fortzufahren.',
    level: 'Bitte wähle ein Niveau aus.',
    sameCourseTwice: 'Diesen Termin hast du für diesen Kurs schon gewählt.',
    tooLong: 'Diese Angabe ist zu lang.',
    invalid: 'Bitte prüfe diese Angabe.',
  },
} as const satisfies Record<RegistrationLocale, Record<string, string>>;

type RegistrationMessages = (typeof REGISTRATION_MESSAGES)[RegistrationLocale];

/** The messages in one language, for checks the wizard makes itself (a step's conditional fields). */
export function registrationMessages(locale: RegistrationLocale): RegistrationMessages {
  return REGISTRATION_MESSAGES[locale];
}

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

/** Up to three courses in one registration (CASA, 2026-10-05). */
export const MAX_REGISTRATION_COURSES = 3;

/**
 * One course of a registration. `levelRequired` is set by the wizard from the
 * course type so the step can say "choose a level"; the route recomputes it
 * from the catalogue and never trusts it.
 */
const courseItemSchema = (m: RegistrationMessages) =>
  z.object(
    {
      courseTypeId: requiredId(m, m.course),
      courseInstanceId: requiredId(m, m.courseOption),
      /** A half level ('B1.2') or, for formats sold by the level, a whole level ('A1'): lib/registration/levels. */
      level: optionalText(m, 20),
      levelRequired: z.boolean().optional().default(false),
      /** Continue up to this whole level ('B2'), one term per level: lib/registration/level-path. '' for this level alone. */
      pathTo: optionalText(m, 4),
    },
    { message: m.invalid }
  );

/** An exam booked with the courses. Checked only when `examEnabled`. */
const examAddOnSchema = (m: RegistrationMessages) =>
  z.object(
    {
      examTypeId: optionalText(m, ID_MAX),
      examSessionId: optionalText(m, ID_MAX),
      registrationType: z.enum(['full', 'written', 'oral'], { message: m.registrationType }).optional(),
    },
    { message: m.invalid }
  );

const courseRegistrationValidation =
  (m: RegistrationMessages) =>
  (
    data: {
      courses: Array<{ courseTypeId: string; courseInstanceId: string; level: string; levelRequired: boolean; pathTo: string }>;
      examEnabled: boolean;
      exam?: { examTypeId: string; examSessionId: string; registrationType?: 'full' | 'written' | 'oral' };
      officialNameConfirmed: boolean;
      examPolicyAccepted: boolean;
      accommodationRequired: boolean;
      accommodationType?: 'flat' | 'host';
      allergies: string;
      allergyConsent: boolean;
    },
    ctx: z.RefinementCtx
  ) => {
    const seen = new Set<string>();
    data.courses.forEach((course, index) => {
      if (course.levelRequired && !course.level) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.level, path: ['courses', index, 'level'] });
      }
      if (course.courseInstanceId) {
        if (seen.has(course.courseInstanceId)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.sameCourseTwice, path: ['courses', index, 'courseInstanceId'] });
        }
        seen.add(course.courseInstanceId);
      }
    });
    if (data.examEnabled) {
      if (!data.exam?.examTypeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.exam, path: ['exam', 'examTypeId'] });
      }
      if (!data.exam?.examSessionId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.examSession, path: ['exam', 'examSessionId'] });
      }
      if (!data.exam?.registrationType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.registrationType, path: ['exam', 'registrationType'] });
      }
      if (!data.officialNameConfirmed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.officialName, path: ['officialNameConfirmed'] });
      }
      if (!data.examPolicyAccepted) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m.examPolicy, path: ['examPolicyAccepted'] });
      }
    }
    if (data.accommodationRequired && !data.accommodationType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: m.accommodationType,
        path: ['accommodationType'],
      });
    }
    // Allergies are health data (Art. 9 GDPR) and go to the host family, so
    // they need their own explicit consent, not the terms box. Enforced here as
    // well as in the wizard: a stored allergy always had consent at submission.
    if (data.accommodationRequired && data.allergies && !data.allergyConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: m.allergyConsent,
        path: ['allergyConsent'],
      });
    }
  };

const courseRegistrationFormFieldsSchema = (m: RegistrationMessages) =>
  z.object(
    {
      salutation: z.enum(['mr', 'ms', 'mx', 'neutral'], { message: m.salutation }),
      courses: z.array(courseItemSchema(m), { message: m.course }).min(1, m.course).max(MAX_REGISTRATION_COURSES, m.invalid),
      examEnabled: z.boolean({ message: m.invalid }).optional().default(false),
      exam: examAddOnSchema(m).optional(),
      firstName: requiredText(m, m.firstName, 2, 80),
      lastName: requiredText(m, m.lastName, 2, 80),
      email: z.string({ message: m.email }).trim().email(m.email).max(200, m.tooLong),
      phone: requiredText(m, m.phone, 5, 60),
      nationality: requiredText(m, m.nationality, 2, 120),
      birthDate: birthDate(m),
      visaRequired: z.boolean({ message: m.invalid }),
      accommodationRequired: z.boolean({ message: m.invalid }),
      accommodationType: z.enum(['flat', 'host'], { message: m.accommodationType }).optional(),
      allergies: optionalText(m, 500),
      allergyConsent: z.boolean({ message: m.invalid }).optional().default(false),
      notes: optionalText(m, 2000),
      officialNameConfirmed: z.boolean({ message: m.invalid }).optional().default(false),
      examPolicyAccepted: z.boolean({ message: m.invalid }).optional().default(false),
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
    .extend({ locale: localeSchema })
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
