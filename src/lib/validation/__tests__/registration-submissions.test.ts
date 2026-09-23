import { describe, expect, it } from 'vitest';

import {
  createCourseRegistrationFormSchema,
  createCourseRegistrationSubmissionSchema,
  createExamRegistrationFormSchema,
  createExamRegistrationSubmissionSchema,
  submissionLocale,
} from '@/lib/validation/registration-submissions';

const courseRegistrationFormSchema = createCourseRegistrationFormSchema('en');
const courseRegistrationSubmissionSchema = createCourseRegistrationSubmissionSchema('en');
const examRegistrationFormSchema = createExamRegistrationFormSchema('en');
const examRegistrationSubmissionSchema = createExamRegistrationSubmissionSchema('en');

const validCourseFormInput = {
  salutation: 'mr',
  courseTypeId: 'course-1',
  courseInstanceId: 'instance-1',
  firstName: 'Rahman',
  lastName: 'Shafiee',
  email: 'rahman@example.com',
  phone: '+49123456789',
  nationality: 'Iranian',
  birthDate: '1990-01-01',
  visaRequired: false,
  accommodationRequired: false,
  accommodationType: undefined,
  smoker: false,
  allergies: '',
  notes: '',
  acceptTerms: true,
};

describe('course registration schemas', () => {
  it('requires accommodation type in the form schema when accommodation is requested', () => {
    const parsed = courseRegistrationFormSchema.safeParse({
      ...validCourseFormInput,
      accommodationRequired: true,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'accommodationType')).toBe(true);
  });

  it('keeps the same accommodation validation in the submission schema', () => {
    const parsed = courseRegistrationSubmissionSchema.safeParse({
      ...validCourseFormInput,
      accommodationRequired: true,
      courseTypeLabel: 'Intensive German',
      courseInstanceLabel: 'May intake',
      locale: 'en',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'accommodationType')).toBe(true);
  });

  it('requires a valid salutation in the schema', () => {
    const parsed = courseRegistrationFormSchema.safeParse({
      ...validCourseFormInput,
      salutation: undefined,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'salutation')).toBe(true);
  });

  it('requires acceptTerms to be true in the schema', () => {
    const parsed = courseRegistrationFormSchema.safeParse({
      ...validCourseFormInput,
      acceptTerms: false,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'acceptTerms')).toBe(true);
  });

  it('keeps the honeypot so the route can see it', () => {
    const parsed = courseRegistrationSubmissionSchema.safeParse({
      ...validCourseFormInput,
      website: 'https://spam.example',
      locale: 'en',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.website).toBe('https://spam.example');
  });

  it('never fails on the honeypot, whatever a bot puts in it', () => {
    for (const website of ['x'.repeat(250), 42, { url: 'spam' }]) {
      const course = courseRegistrationSubmissionSchema.safeParse({ ...validCourseFormInput, website, locale: 'en' });
      const exam = examRegistrationSubmissionSchema.safeParse({ ...validExamFormInput, website, locale: 'en' });
      expect(course.success && exam.success).toBe(true);
      expect(course.data?.website).toBeTruthy();
      expect(exam.data?.website).toBeTruthy();
    }
    expect(courseRegistrationSubmissionSchema.parse({ ...validCourseFormInput, locale: 'en' }).website).toBe('');
  });
});

const validExamFormInput = {
  salutation: 'mr',
  examTypeId: 'exam-1',
  examSessionId: 'session-1',
  registrationType: 'full',
  firstName: 'Rahman',
  lastName: 'Shafiee',
  email: 'rahman@example.com',
  phone: '+49123456789',
  nationality: 'Iranian',
  birthDate: '1990-01-01',
  officialNameConfirmed: true,
  examPolicyAccepted: true,
  acceptTerms: true,
};

describe('exam registration schemas', () => {
  it('requires acceptTerms to be true in the form schema', () => {
    const parsed = examRegistrationFormSchema.safeParse({
      ...validExamFormInput,
      acceptTerms: false,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'acceptTerms')).toBe(true);
  });

  it('requires acceptTerms to be true in the submission schema', () => {
    const parsed = examRegistrationSubmissionSchema.safeParse({
      ...validExamFormInput,
      acceptTerms: false,
      locale: 'en',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'acceptTerms')).toBe(true);
  });
});

describe('registration messages follow the page locale', () => {
  it('answers a German page in German, field by field', () => {
    const parsed = createCourseRegistrationFormSchema('de').safeParse({
      ...validCourseFormInput,
      salutation: undefined,
      firstName: '',
      birthDate: '',
      acceptTerms: false,
    });
    const messages = Object.fromEntries(
      (parsed.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message])
    );

    expect(messages).toMatchObject({
      salutation: 'Bitte wählen Sie eine Anrede aus.',
      firstName: 'Bitte geben Sie Ihren Vornamen an (mindestens 2 Zeichen).',
      birthDate: 'Bitte geben Sie Ihr Geburtsdatum an.',
      acceptTerms: 'Bitte akzeptieren Sie die Allgemeinen Geschäftsbedingungen, um fortzufahren.',
    });
  });

  it('keeps the English messages on the English page', () => {
    const parsed = createExamRegistrationFormSchema('en').safeParse({ ...validExamFormInput, salutation: undefined });
    expect(parsed.error?.issues[0]?.message).toBe('Please select a salutation.');
  });

  it('answers a missing or malformed field in German as well', () => {
    const missing = createExamRegistrationSubmissionSchema('de').safeParse({ locale: 'de' });
    const notAnObject = createExamRegistrationSubmissionSchema('de').safeParse(null);

    for (const issue of missing.error?.issues ?? []) {
      expect(issue.message).not.toMatch(/Invalid input|expected/);
    }
    expect(notAnObject.error?.issues[0]?.message).toBe('Bitte prüfen Sie diese Angabe.');
  });

  it('reads the locale a submission declares before validating it', () => {
    expect(submissionLocale({ locale: 'de' })).toBe('de');
    expect(submissionLocale({ locale: 'de-DE' })).toBe('de');
    expect(submissionLocale({ locale: 'en' })).toBe('en');
    expect(submissionLocale({})).toBe('en');
    expect(submissionLocale(null)).toBe('en');
  });
});

describe('registration input bounds', () => {
  const huge = 'x'.repeat(2 * 1024 * 1024);

  it('refuses a multi-megabyte id or birth date in the course submission', () => {
    for (const field of ['courseTypeId', 'courseInstanceId', 'birthDate'] as const) {
      const parsed = courseRegistrationSubmissionSchema.safeParse({
        ...validCourseFormInput,
        [field]: huge,
        locale: 'en',
      });
      expect(parsed.success, field).toBe(false);
      expect(parsed.error?.issues[0]?.path[0]).toBe(field);
    }
  });

  it('refuses a multi-megabyte id or birth date in the exam submission', () => {
    for (const field of ['examTypeId', 'examSessionId', 'birthDate'] as const) {
      const parsed = examRegistrationSubmissionSchema.safeParse({
        ...validExamFormInput,
        [field]: huge,
        locale: 'en',
      });
      expect(parsed.success, field).toBe(false);
      expect(parsed.error?.issues[0]?.path[0]).toBe(field);
    }
  });

  it('still accepts a uuid id and an unparsed birth date intake will flag', () => {
    const parsed = courseRegistrationSubmissionSchema.safeParse({
      ...validCourseFormInput,
      courseTypeId: '40000000-0000-4000-8000-000000010003',
      courseInstanceId: '20000000-0000-4000-8000-000000000001',
      birthDate: '31.02.1990',
      locale: 'en',
    });
    expect(parsed.success).toBe(true);
  });
});
