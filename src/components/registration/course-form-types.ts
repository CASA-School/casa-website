import type * as z from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import type { createCourseRegistrationFormSchema } from '@/lib/validation/registration-submissions';

type CourseRegistrationSchema = ReturnType<typeof createCourseRegistrationFormSchema>;

/** The course registration form as the wizard holds it. */
export type CourseFormData = z.input<CourseRegistrationSchema>;
export type CourseFormSubmission = z.output<CourseRegistrationSchema>;
export type CourseForm = UseFormReturn<CourseFormData, undefined, CourseFormSubmission>;
