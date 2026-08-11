import { describe, expect, it } from 'vitest';

import {
  courseRegistrationFormSchema,
  courseRegistrationSubmissionSchema,
  examRegistrationFormSchema,
  examRegistrationSubmissionSchema,
} from '@/lib/validation/registration-submissions';

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
