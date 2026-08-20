import { z } from 'zod';

import { normalizeContentLocale } from '@/lib/content/locale';

const localeSchema = z.preprocess(
  (value) => normalizeContentLocale(String(value ?? 'en')),
  z.enum(['en', 'de'])
);

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

const courseRegistrationValidation = (
  data: {
    accommodationRequired: boolean;
    accommodationType?: 'flat' | 'host';
  },
  ctx: z.RefinementCtx
) => {
  if (data.accommodationRequired && !data.accommodationType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select an accommodation type.',
      path: ['accommodationType'],
    });
  }
};

const courseRegistrationFormFieldsSchema = z.object({
  salutation: z.enum(['mr', 'ms', 'mx', 'neutral'], { message: 'Please select a salutation.' }),
  courseTypeId: z.string().min(1, 'Please select a course.'),
  courseInstanceId: z.string().min(1, 'Please select a course option.'),
  /**
   * Learner's current CEFR sub-level (e.g. 'B1.2').
   * Optional at schema level — conditional requirement enforced in the wizard
   * via requiresLevelField(). Stored and forwarded on submission.
   */
  currentLevel: z.string().trim().max(20).optional().default(''),
  firstName: z.string().trim().min(2, 'First name is required.').max(80),
  lastName: z.string().trim().min(2, 'Last name is required.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  phone: z.string().trim().min(5, 'Phone number is required.').max(60),
  nationality: z.string().trim().min(2, 'Nationality is required.').max(120),
  birthDate: z.string().min(1, 'Date of birth is required.'),
  visaRequired: z.boolean(),
  accommodationRequired: z.boolean(),
  accommodationType: z.enum(['flat', 'host']).optional(),
  smoker: z.boolean().optional().default(false),
  allergies: z.string().trim().max(500).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions to proceed.'),
});

export const courseRegistrationFormSchema = courseRegistrationFormFieldsSchema.superRefine(courseRegistrationValidation);

const courseRegistrationSubmissionFieldsSchema = courseRegistrationFormFieldsSchema.extend({
  courseTypeLabel: z.string().trim().max(160).optional().default(''),
  courseInstanceLabel: z.string().trim().max(240).optional().default(''),
  locale: localeSchema,
});

export const courseRegistrationSubmissionSchema = courseRegistrationSubmissionFieldsSchema.superRefine(
  courseRegistrationValidation
);

const examRegistrationFieldsSchema = z.object({
  salutation: z.enum(['mr', 'ms', 'mx', 'neutral'], { message: 'Please select a salutation.' }),
  examTypeId: z.string().min(1, 'Please select an exam.'),
  examSessionId: z.string().min(1, 'Please select an exam session.'),
  examTypeLabel: z.string().trim().max(160).optional().default(''),
  examSessionLabel: z.string().trim().max(240).optional().default(''),
  registrationType: z.enum(['full', 'written', 'oral']),
  firstName: z.string().trim().min(2, 'First name is required.').max(80),
  lastName: z.string().trim().min(2, 'Last name is required.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  phone: z.string().trim().min(5, 'Phone number is required.').max(60),
  nationality: z.string().trim().min(2, 'Nationality is required.').max(120),
  birthDate: z.string().min(1, 'Date of birth is required.'),
  officialNameConfirmed: z
    .boolean()
    .refine((value) => value, 'Please confirm your official name matches your identification.'),
  examPolicyAccepted: z
    .boolean()
    .refine((value) => value, 'Please accept exam registration terms before submitting.'),
  acceptTerms: z
    .boolean()
    .refine((value) => value, 'You must accept the terms and conditions to proceed.'),
  locale: localeSchema,
});

export const examRegistrationFormSchema = examRegistrationFieldsSchema.omit({
  locale: true,
  examTypeLabel: true,
  examSessionLabel: true,
});

export const examRegistrationSubmissionSchema = examRegistrationFieldsSchema;

export type CourseRegistrationSubmissionInput = z.infer<typeof courseRegistrationSubmissionSchema>;
export type ExamRegistrationSubmissionInput = z.infer<typeof examRegistrationSubmissionSchema>;
