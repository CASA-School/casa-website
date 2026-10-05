'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useFieldArray, useForm, Controller, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, HelpCircle, Home, Loader2, ShieldCheck, UserRound, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryField } from '@/components/forms/country-field';
import {
  formAlertClassName,
  formControlClassName,
  formErrorClassName,
  formFieldGroupClassName,
  formHintClassName,
  formLabelClassName,
  formMetaLabelClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
  formTextareaClassName,
  formTileClassName,
  FormStepHeader,
  RequiredMark,
} from '@/components/forms/form-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { courseDatesLine, CourseItemFields, ExamAddOn } from '@/components/registration/course-choices';
import type { CourseFormData, CourseFormSubmission } from '@/components/registration/course-form-types';
import { RegistrationStepper, RegistrationTabs } from '@/components/registration/registration-chrome';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { meaningClasses } from '@/config/brand/meaning';
import { footerConfig } from '@/config/footer';
import { trackCasaEvent } from '@/lib/analytics/client';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import type { RegistrationCourseCatalog, RegistrationExamCatalog } from '@/lib/content/types';
import { describeBookedLevel } from '@/lib/registration/levels';
import { cn } from '@/lib/utils';
import {
  createCourseRegistrationFormSchema,
  MAX_REGISTRATION_COURSES,
  registrationMessages,
  requiresLevelField,
} from '@/lib/validation/registration-submissions';

type FormData = CourseFormData;
type FormSubmissionData = CourseFormSubmission;

type CourseWizardProps = {
  catalog: RegistrationCourseCatalog;
  /** For an exam booked with the courses; without one the form offers none. */
  examCatalog?: RegistrationExamCatalog;
};

type CourseRegistrationApiResult = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
  confirmationSent?: boolean;
};

const PERSONAL_FIELDS: Array<keyof FormData> = [
  'salutation',
  'firstName',
  'lastName',
  'email',
  'phone',
  'nationality',
  'birthDate',
];

/** Element ids that differ from the field name, so a failed step can focus its first invalid field. */
const FIELD_ELEMENT_IDS: Partial<Record<keyof FormData, string>> = {
  accommodationRequired: 'accommodation',
  accommodationType: 'accommodation-type',
};

/** A course row as the form starts it: the catalogue's default, or empty for a further course. */
function courseRow(catalog: RegistrationCourseCatalog, typeId = '', instanceId = '') {
  const slug = catalog.courseTypes.find((courseType) => courseType.id === typeId)?.slug;
  const options = catalog.optionsByCourseTypeId[typeId] ?? [];
  return {
    courseTypeId: typeId,
    courseInstanceId: instanceId,
    level: '',
    levelRequired: requiresLevelField(slug) && (options[0]?.availableLevels.length ?? 0) > 0,
  };
}

/** The element a failed step focuses for a field path. */
function elementIdFor(path: string): string {
  const course = /^courses\.(\d+)\.(courseTypeId|courseInstanceId|level)$/.exec(path);
  if (course) {
    return `course-${course[1]}-${course[2] === 'courseTypeId' ? 'type' : course[2] === 'courseInstanceId' ? 'option' : 'level'}`;
  }
  return (
    { 'exam.examTypeId': 'exam-type', 'exam.examSessionId': 'exam-session', 'exam.registrationType': 'exam-registration-type' } as Record<string, string>
  )[path] ?? path;
}

export function CourseWizard({ catalog, examCatalog }: CourseWizardProps) {
  const isDe = catalog.locale === 'de';
  const t = (en: string, de: string) => (isDe ? de : en);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // Messages follow the page, so a German form never shows an English error.
  const registrationSchema = useMemo(() => createCourseRegistrationFormSchema(catalog.locale), [catalog.locale]);
  // Set by a step change, so focus moves to the new step's heading but not on first render.
  const stepChanged = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  // Counts failed attempts at the current step; each one focuses the field named here once its error has rendered.
  const [stepFailures, setStepFailures] = useState(0);
  const invalidFieldId = useRef<string | null>(null);

  const form = useForm<FormData, undefined, FormSubmissionData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      salutation: '' as 'mr' | 'ms' | 'mx' | 'neutral',
      courses: [courseRow(catalog, catalog.defaultCourseTypeId || catalog.courseTypes[0]?.id || '', catalog.defaultOptionId || '')],
      examEnabled: false,
      exam: { examTypeId: '', examSessionId: '', registrationType: undefined },
      officialNameConfirmed: false,
      examPolicyAccepted: false,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      birthDate: '',
      visaRequired: false,
      accommodationRequired: false,
      accommodationType: undefined,
      allergies: '',
      allergyConsent: false,
      notes: '',
      acceptTerms: false,
      website: '',
    },
    mode: 'onChange',
  });

  const handleCloseSuccess = () => {
    setSuccess(false);
    stepChanged.current = true;
    setStep(1);
    form.reset({
      salutation: '' as 'mr' | 'ms' | 'mx' | 'neutral',
      courses: [courseRow(catalog, catalog.defaultCourseTypeId || catalog.courseTypes[0]?.id || '', catalog.defaultOptionId || '')],
      examEnabled: false,
      exam: { examTypeId: '', examSessionId: '', registrationType: undefined },
      officialNameConfirmed: false,
      examPolicyAccepted: false,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      birthDate: '',
      visaRequired: false,
      accommodationRequired: false,
      accommodationType: undefined,
      allergies: '',
      allergyConsent: false,
      notes: '',
      acceptTerms: false,
      website: '',
    });
  };

  const {
    watch,
    setValue,
    register,
    trigger,
    formState: { errors, isValid },
  } = form;

  /** Ties a field to its error message, whose id is `<name>-error`. */
  const errorProps = (name: keyof FormData) => ({
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  const accommodationRequired = watch('accommodationRequired');
  const hasAllergies = Boolean(watch('allergies')?.trim());
  const examEnabled = watch('examEnabled');
  const { fields: courseFields, append: appendCourse, remove: removeCourse } = useFieldArray({ control: form.control, name: 'courses' });
  const courses = watch('courses');
  const exam = watch('exam');

  const stepItems = [
    { title: t('Course', 'Kurs'), description: t('Goal and start', 'Ziel und Start') },
    { title: t('Details', 'Details'), description: t('Student profile', 'Teilnehmerprofil') },
    { title: t('Review', 'Prüfen'), description: t('Final check', 'Letzte Kontrolle') },
  ];
  const fieldsByStep: Array<Array<keyof FormData>> = [
    ['courses', 'examEnabled', 'exam'],
    accommodationRequired
      ? [...PERSONAL_FIELDS, 'accommodationRequired', 'accommodationType', 'allergies', 'allergyConsent']
      : [...PERSONAL_FIELDS, 'accommodationRequired'],
    [],
  ];
  const stepFields = fieldsByStep[step - 1] ?? [];
  const showStepAlert = stepFailures > 0 && (stepFields.some((name) => errors[name]) || (step === 1 && Boolean(errors.courses || errors.exam)));

  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!invalidFieldId.current) return;
    document.getElementById(invalidFieldId.current)?.focus();
    invalidFieldId.current = null;
  }, [stepFailures]);

  const onSubmit = async (data: FormSubmissionData) => {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await fetch('/api/registration/course', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        // Ids and choices only: the route names every course and the exam from its own catalogues.
        body: JSON.stringify({ ...data, locale: catalog.locale }),
      });

      const result = (await response.json().catch(() => null)) as CourseRegistrationApiResult | null;
      if (!response.ok || result?.status !== 'accepted') {
        throw new Error(result?.message || t('Registration failed. Please try again.', 'Die Anmeldung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'));
      }

      setConfirmationSent(result?.confirmationSent === true);
      setSuccess(true);
      trackCasaEvent('form_success', {
        form: 'course_registration',
        section: 'registration-course',
        path: '/registration/course',
        locale: catalog.locale,
      });
    } catch (error: unknown) {
      // A network failure's own message ("Failed to fetch") is the browser's, not ours.
      const message =
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : t('Registration failed. Please try again.', 'Die Anmeldung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
      setSubmissionError(message);
      trackCasaEvent('form_error', {
        form: 'course_registration',
        reason: 'submit_failed',
        section: 'registration-course',
        path: '/registration/course',
        locale: catalog.locale,
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Step 1's conditional fields, checked here: zod runs the schema's own
   * cross-field rules only once every field of the form is valid, and the
   * personal details of step 2 are still empty at step 1.
   */
  const stepOneIssues = (): Array<{ path: FieldPath<FormData>; message: string }> => {
    const m = registrationMessages(catalog.locale);
    const issues: Array<{ path: FieldPath<FormData>; message: string }> = [];
    courses.forEach((course, index) => {
      if (course.levelRequired && !course.level) issues.push({ path: `courses.${index}.level`, message: m.level });
    });
    const chosen = courses.map((course) => course.courseInstanceId).filter(Boolean);
    courses.forEach((course, index) => {
      if (course.courseInstanceId && chosen.indexOf(course.courseInstanceId) !== index) {
        issues.push({ path: `courses.${index}.courseInstanceId`, message: m.sameCourseTwice });
      }
    });
    if (examEnabled) {
      if (!exam?.examTypeId) issues.push({ path: 'exam.examTypeId', message: m.exam });
      if (!exam?.examSessionId) issues.push({ path: 'exam.examSessionId', message: m.examSession });
      if (!exam?.registrationType) issues.push({ path: 'exam.registrationType', message: m.registrationType });
    }
    return issues;
  };

  const nextStep = async () => {
    // Not `shouldFocus`: it reaches only fields with a registered ref, and the
    // selects, the country field and the date picker have none.
    const valid = stepFields.length === 0 ? true : await trigger(stepFields);
    const issues = step === 1 ? stepOneIssues() : [];
    issues.forEach((issue) => form.setError(issue.path, { type: 'manual', message: issue.message }));

    if (valid && issues.length === 0) {
      stepChanged.current = true;
      setStepFailures(0);
      setStep((current) => Math.min(current + 1, stepItems.length));
      return;
    }

    if (step === 1) {
      // The first course's fields, then the next course's, then the exam's: the order they appear in.
      const errorPaths = [
        ...courses.flatMap((_, index) => (['courseTypeId', 'courseInstanceId', 'level'] as const)
          .filter((field) => form.getFieldState(`courses.${index}.${field}`).invalid || issues.some((issue) => issue.path === `courses.${index}.${field}`))
          .map((field) => `courses.${index}.${field}`)),
        ...(['examTypeId', 'examSessionId', 'registrationType'] as const)
          .filter((field) => issues.some((issue) => issue.path === `exam.${field}`) || form.getFieldState(`exam.${field}`).invalid)
          .map((field) => `exam.${field}`),
      ];
      invalidFieldId.current = errorPaths[0] ? elementIdFor(errorPaths[0]) : null;
    } else {
      const firstInvalid = stepFields.find((name) => form.getFieldState(name).invalid);
      invalidFieldId.current = firstInvalid ? (FIELD_ELEMENT_IDS[firstInvalid] ?? firstInvalid) : null;
    }
    setStepFailures((count) => count + 1);

    trackCasaEvent('form_error', {
      form: 'course_registration',
      reason: 'step_validation',
      step: `step_${step}`,
      section: 'registration-course',
      path: '/registration/course',
      locale: catalog.locale,
    });
  };

  const prevStep = () => {
    stepChanged.current = true;
    setStepFailures(0);
    setStep((current) => Math.max(current - 1, 1));
  };



  return (
    <div className="flex flex-col" data-track-section="registration-course">
      <div className="shrink-0 space-y-7 border-b border-[color:var(--casa-sand)] pb-7">
        <RegistrationTabs current="course" locale={catalog.locale} />
        <RegistrationStepper steps={stepItems} step={step} locale={catalog.locale} />
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-7"
        noValidate
        data-casa-track-form="course_registration"
      >
        <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <FormStepHeader
              icon={GraduationCap}
              meaning="courses"
              headingRef={stepHeadingRef}
              title={t('Choose your course', 'Kurs auswählen')}
              description={t(
                'Choose your course and when to start. You can add more courses and an exam.',
                'Wählen Sie Ihren Kurs und den Beginn. Weitere Kurse und eine Prüfung können Sie dazubuchen.'
              )}
            />

            {courseFields.map((field, index) => (
              <section
                key={field.id}
                aria-label={t(`Course ${index + 1}`, `Kurs ${index + 1}`)}
                className={cn(index > 0 && 'rounded-2xl border border-[color:var(--casa-sand)] p-4 sm:p-5')}
              >
                {index > 0 ? (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--casa-ink)]">{t(`Course ${index + 1}`, `Kurs ${index + 1}`)}</p>
                    <button
                      type="button"
                      onClick={() => removeCourse(index)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-danger-text)] focus-visible:outline-2 focus-visible:outline-[var(--casa-blue)]"
                    >
                      <X className="size-4" aria-hidden />
                      {t('Remove', 'Entfernen')}
                    </button>
                  </div>
                ) : null}
                <CourseItemFields form={form} catalog={catalog} index={index} />
              </section>
            ))}

            {courseFields.length < MAX_REGISTRATION_COURSES ? (
              <button
                type="button"
                onClick={() => appendCourse(courseRow(catalog))}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--casa-field-edge-hover)] bg-white px-4 py-3.5 text-sm font-semibold text-[var(--casa-accent-text)] transition-colors hover:border-[var(--casa-accent-text)] hover:bg-[var(--casa-blue-tint)]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span>
                {t('Add another course', 'Noch einen Kurs hinzufügen')}
              </button>
            ) : null}

            {examCatalog ? <ExamAddOn form={form} examCatalog={examCatalog} /> : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <FormStepHeader
              icon={UserRound}
              meaning="orientation"
              headingRef={stepHeadingRef}
              title={t('Personal details', 'Persönliche Angaben')}
              description={t(
                'Your details let us prepare the registration and, if you wish, help with accommodation.',
                'Mit Ihren Angaben bereiten wir die Anmeldung vor und helfen auf Wunsch bei der Unterkunft.'
              )}
            />

            <div className={formFieldGroupClassName}>
              <Label htmlFor="salutation" className={formLabelClassName}>
                {catalog.locale === 'de' ? 'Anrede' : 'Salutation'}
                <RequiredMark />
              </Label>
              <Select
                onValueChange={(value) => setValue('salutation', value as 'mr' | 'ms' | 'mx' | 'neutral', { shouldDirty: true, shouldValidate: true })}
                value={watch('salutation')}
              >
                <SelectTrigger id="salutation" aria-required {...errorProps('salutation')} className={formControlClassName}>
                  <SelectValue placeholder={catalog.locale === 'de' ? 'Anrede auswählen...' : 'Select salutation...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">{catalog.locale === 'de' ? 'Herr' : 'Mr.'}</SelectItem>
                  <SelectItem value="ms">{catalog.locale === 'de' ? 'Frau' : 'Ms.'}</SelectItem>
                  <SelectItem value="mx">{catalog.locale === 'de' ? 'Mx.' : 'Mx.'}</SelectItem>
                  <SelectItem value="neutral">{catalog.locale === 'de' ? 'Keine Angabe' : 'Neutral / Other'}</SelectItem>
                </SelectContent>
              </Select>
              {errors.salutation && <p id="salutation-error" className={formErrorClassName}>{errors.salutation.message}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="firstName" className={formLabelClassName}>
                  {t('First name', 'Vorname')}
                  <RequiredMark />
                </Label>
                <Input id="firstName" autoComplete="given-name" aria-required {...errorProps('firstName')} className={formControlClassName} {...register('firstName')} />
                {errors.firstName && <p id="firstName-error" className={formErrorClassName}>{errors.firstName.message}</p>}
              </div>
              <div className={formFieldGroupClassName}>
                <Label htmlFor="lastName" className={formLabelClassName}>
                  {t('Last name', 'Nachname')}
                  <RequiredMark />
                </Label>
                <Input id="lastName" autoComplete="family-name" aria-required {...errorProps('lastName')} className={formControlClassName} {...register('lastName')} />
                {errors.lastName && <p id="lastName-error" className={formErrorClassName}>{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="email" className={formLabelClassName}>
                  {t('Email', 'E-Mail')}
                  <RequiredMark />
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-required
                  {...errorProps('email')}
                  className={formControlClassName}
                  {...register('email')}
                />
                {errors.email && <p id="email-error" className={formErrorClassName}>{errors.email.message}</p>}
              </div>
              <div className={formFieldGroupClassName}>
                <Label htmlFor="phone" className={formLabelClassName}>
                  {t('Phone number', 'Telefonnummer')}
                  <RequiredMark />
                </Label>
                <Input id="phone" autoComplete="tel" aria-required {...errorProps('phone')} className={formControlClassName} {...register('phone')} />
                {errors.phone && <p id="phone-error" className={formErrorClassName}>{errors.phone.message}</p>}
              </div>
            </div>

            <p className={cn(formHintClassName, 'flex gap-2.5')}>
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
              {t(
                'CASA reviews your registration and replies by email.',
                'CASA prüft Ihre Anmeldung und meldet sich per E-Mail bei Ihnen.'
              )}
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="nationality" className={formLabelClassName}>
                  {t('Nationality', 'Nationalität')}
                  <RequiredMark />
                </Label>
                <CountryField
                  id="nationality"
                  value={watch('nationality')}
                  onChange={(value) => setValue('nationality', value, { shouldDirty: true, shouldValidate: true })}
                  placeholder={t('Select nationality', 'Nationalität auswählen')}
                  searchPlaceholder={t('Search...', 'Suchen...')}
                  emptyLabel={t('No results found.', 'Keine Ergebnisse gefunden.')}
                  className={formControlClassName}
                  required
                  aria-describedby={errors.nationality ? 'nationality-error' : undefined}
                  invalid={Boolean(errors.nationality)}
                />
                {errors.nationality && <p id="nationality-error" className={formErrorClassName}>{errors.nationality.message}</p>}
              </div>
              <div className={formFieldGroupClassName}>
                <Label htmlFor="birthDate" className={formLabelClassName}>
                  {t('Date of birth', 'Geburtsdatum')}
                  <RequiredMark />
                </Label>
                <Controller
                  name="birthDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      id="birthDate"
                      aria-describedby={errors.birthDate ? 'birthDate-error' : undefined}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={catalog.locale === 'de' ? 'TT.MM.JJJJ' : 'dd.mm.yyyy'}
                      hasError={!!errors.birthDate}
                      locale={catalog.locale}
                      align="top"
                    />
                  )}
                />
                {errors.birthDate && <p id="birthDate-error" className={formErrorClassName}>{errors.birthDate.message}</p>}
              </div>
            </div>

            <div className={cn(formTileClassName, 'flex items-center gap-3')}>
              <Checkbox
                id="visa"
                checked={watch('visaRequired')}
                onCheckedChange={(checked) => setValue('visaRequired', Boolean(checked), { shouldDirty: true })}
              />
              <Label htmlFor="visa" className="cursor-pointer text-sm font-medium text-[var(--casa-ink)]">
                {t('I need a visa for Germany', 'Ich brauche ein Visum für Deutschland')}
              </Label>
            </div>

            <div className={cn(formTileClassName, 'space-y-3')}>
              <div className="flex items-center gap-3">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', meaningClasses.arrival.circle)}>
                  <Home className="size-4" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-[var(--casa-ink)]">
                  {t('Accommodation (optional)', 'Unterkunft (optional)')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accommodation"
                  checked={accommodationRequired}
                  onCheckedChange={(checked) => setValue('accommodationRequired', Boolean(checked), { shouldDirty: true })}
                />
                <Label htmlFor="accommodation" className="cursor-pointer text-sm font-medium leading-relaxed text-[var(--casa-ink)]">
                  {t('I want CASA to support my accommodation search', 'Ich möchte Unterstützung bei der Unterkunftssuche')}
                </Label>
              </div>

              {accommodationRequired && (
              <div className="space-y-5 border-t border-[color:var(--casa-sand)] pt-5">
                <div className={formFieldGroupClassName}>
                  <Label htmlFor="accommodation-type" className={formLabelClassName}>
                    {t('Type of accommodation', 'Wohnform')}
                    <RequiredMark />
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setValue('accommodationType', value as 'flat' | 'host', { shouldValidate: true, shouldDirty: true })
                    }
                    defaultValue={watch('accommodationType')}
                  >
                    <SelectTrigger id="accommodation-type" aria-required {...errorProps('accommodationType')} className={formControlClassName}>
                      <SelectValue placeholder={t('Select type...', 'Wohnform auswählen...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">{t('Shared flat (WG)', 'WG')}</SelectItem>
                      <SelectItem value="host">{t('Host family', 'Gastfamilie')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accommodationType && <p id="accommodationType-error" className={formErrorClassName}>{errors.accommodationType.message}</p>}
                </div>

                <div className={formFieldGroupClassName}>
                  <Label htmlFor="allergies" className={formLabelClassName}>{t('Allergies', 'Allergien')}</Label>
                  {/* maxLength mirrors the schema: no step validates these two, so a longer value would only disable Absenden. */}
                  <Input id="allergies" maxLength={500} className={formControlClassName} {...register('allergies')} placeholder={t('e.g. cats, nuts', 'z. B. Katzen, Nüsse')} />
                </div>

                {hasAllergies && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="allergy-consent"
                        aria-required
                        {...errorProps('allergyConsent')}
                        checked={watch('allergyConsent')}
                        onCheckedChange={(checked) =>
                          setValue('allergyConsent', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                        }
                      />
                      <Label htmlFor="allergy-consent" className="cursor-pointer text-sm font-normal leading-relaxed text-[var(--casa-ink)]">
                        {t(
                          'I consent to CASA processing my allergy information and passing it to my host family or shared flat, so that suitable accommodation can be found. I can withdraw this consent at any time.',
                          'Ich willige ein, dass CASA meine Angaben zu Allergien verarbeitet und an meine Gastfamilie oder Wohngemeinschaft weitergibt, damit eine passende Unterkunft gefunden wird. Diese Einwilligung kann ich jederzeit widerrufen.'
                        )}
                      </Label>
                    </div>
                    {errors.allergyConsent && <p id="allergyConsent-error" className={formErrorClassName}>{errors.allergyConsent.message}</p>}
                  </div>
                )}

                <div className={formFieldGroupClassName}>
                  <Label htmlFor="notes" className={formLabelClassName}>{t('Additional notes', 'Weitere Hinweise')}</Label>
                  <Textarea
                    id="notes"
                    maxLength={2000}
                    className={formTextareaClassName}
                    {...register('notes')}
                    placeholder={t('Any preferences we should know about?', 'Gibt es Wünsche, die wir kennen sollten?')}
                  />
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <FormStepHeader
              icon={ShieldCheck}
              meaning="orientation"
              headingRef={stepHeadingRef}
              title={t('Review and submit', 'Prüfen und absenden')}
              description={t(
                'Please check all details before you send your registration.',
                'Bitte prüfen Sie alle Angaben, bevor Sie Ihre Anmeldung absenden.'
              )}
            />

            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                {courses.map((course, index) => {
                  const type = catalog.courseTypes.find((candidate) => candidate.id === course.courseTypeId);
                  const option = catalog.optionsByCourseTypeId[course.courseTypeId]?.find((candidate) => candidate.id === course.courseInstanceId);
                  const level = type && option && course.level
                    ? describeBookedLevel(type.slug, course.level, option.availableLevels, catalog.locale)
                    : null;
                  return (
                    <div key={`${course.courseTypeId}-${index}`} className={formTileClassName}>
                      <p className={formMetaLabelClassName}>
                        {courses.length > 1 ? t(`Course ${index + 1}`, `Kurs ${index + 1}`) : t('Course', 'Kurs')}
                      </p>
                      <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                        {type?.name || '-'}
                        {level ? <span className="font-normal text-[var(--casa-muted)]"> · {level.label.split(' · ')[0]}</span> : null}
                      </p>
                      {option ? <p className="mt-0.5 text-[var(--casa-muted)]">{courseDatesLine(type?.slug, option, level, catalog.locale)}</p> : null}
                      {option ? <p className="mt-0.5 text-[var(--casa-muted)]">{option.scheduleLabel}</p> : null}
                    </div>
                  );
                })}
                {examEnabled && examCatalog ? (() => {
                  const examType = examCatalog.examTypes.find((candidate) => candidate.id === exam?.examTypeId);
                  const session = examCatalog.optionsByExamTypeId[exam?.examTypeId ?? '']?.find((candidate) => candidate.id === exam?.examSessionId);
                  const types = { full: t('Full exam', 'Vollprüfung'), written: t('Written only', 'Nur schriftlich'), oral: t('Oral only', 'Nur mündlich') };
                  return (
                    <div className={formTileClassName}>
                      <p className={formMetaLabelClassName}>{t('Exam', 'Prüfung')}</p>
                      <p className="mt-1 font-semibold text-[var(--casa-ink)]">{examType?.name || '-'}</p>
                      {session ? <p className="mt-0.5 text-[var(--casa-muted)]">{session.startsAtLabel}</p> : null}
                      {exam?.registrationType ? <p className="mt-0.5 text-[var(--casa-muted)]">{types[exam.registrationType]}</p> : null}
                    </div>
                  );
                })() : null}
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Student', 'Teilnehmer')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {watch('salutation') && watch('salutation') !== 'neutral' ? (watch('salutation') === 'mr' ? (catalog.locale === 'de' ? 'Herr ' : 'Mr. ') : (watch('salutation') === 'ms' ? (catalog.locale === 'de' ? 'Frau ' : 'Ms. ') : 'Mx. ')) : ''}
                    {watch('firstName')} {watch('lastName')}
                  </p>
                  <p className="mt-0.5 break-words text-[var(--casa-muted)]">{watch('email')}</p>
                </div>
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Accommodation', 'Unterkunft')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {accommodationRequired
                      ? (watch('accommodationType') === 'flat' ? t('Shared flat (WG)', 'WG') : t('Host family', 'Gastfamilie'))
                      : t('Not requested', 'Nicht angefragt')}
                  </p>
                </div>
              </div>

              <div className={formTileClassName}>
                <p className="font-semibold text-[var(--casa-ink)]">{t('Legal and next steps', 'Rechtliches und nächste Schritte')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-[var(--casa-muted)]">
                  <li>
                    {t('By submitting, you accept the CASA terms and conditions; the privacy policy explains how we handle your data.', 'Mit dem Absenden akzeptieren Sie die AGB von CASA; wie wir Ihre Daten verarbeiten, erklärt die Datenschutzerklärung.')}
                  </li>
                  <li>
                    {t('Admissions confirmation is sent after seat and profile checks.', 'Die Bestätigung erfolgt nach Anmelde- und Kursprüfung.')}
                  </li>
                </ul>
              </div>

              <div className={cn(formTileClassName, 'space-y-4 bg-white')}>
                {examEnabled ? (
                  <>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="official-name-confirmed"
                        aria-required
                        {...errorProps('officialNameConfirmed')}
                        checked={watch('officialNameConfirmed')}
                        onCheckedChange={(checked) =>
                          setValue('officialNameConfirmed', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                        }
                      />
                      <Label htmlFor="official-name-confirmed" className="block cursor-pointer text-sm font-medium leading-relaxed text-[var(--casa-ink)]">
                        {t('My name and birth date match my passport or official ID exactly.', 'Name und Geburtsdatum stimmen exakt mit meinem Pass oder amtlichen Ausweis überein.')}
                        <RequiredMark />
                      </Label>
                    </div>
                    {errors.officialNameConfirmed ? <p id="officialNameConfirmed-error" className={formErrorClassName}>{errors.officialNameConfirmed.message}</p> : null}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="exam-policy-accepted"
                        aria-required
                        {...errorProps('examPolicyAccepted')}
                        checked={watch('examPolicyAccepted')}
                        onCheckedChange={(checked) =>
                          setValue('examPolicyAccepted', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                        }
                      />
                      <Label htmlFor="exam-policy-accepted" className="block cursor-pointer text-sm font-medium leading-relaxed text-[var(--casa-ink)]">
                        {t('I understand exam seat confirmation depends on document and payment validation.', 'Ich verstehe, dass die Prüfungsbestätigung von Dokumenten- und Zahlungsprüfung abhängt.')}
                        <RequiredMark />
                      </Label>
                    </div>
                    {errors.examPolicyAccepted ? <p id="examPolicyAccepted-error" className={formErrorClassName}>{errors.examPolicyAccepted.message}</p> : null}
                  </>
                ) : null}
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="accept-terms"
                    aria-required
                    {...errorProps('acceptTerms')}
                    checked={watch('acceptTerms')}
                    onCheckedChange={(checked) =>
                      setValue('acceptTerms', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                    }
                  />
                  <Label htmlFor="accept-terms" className="block cursor-pointer text-sm font-medium leading-relaxed text-[var(--casa-ink)]">
                    {catalog.locale === 'de' ? (
                      <>
                        Ich akzeptiere die{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current">
                          Allgemeinen Geschäftsbedingungen
                        </Link>{' '}
                        und habe die{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current">
                          Datenschutzerklärung
                        </Link>{' '}
                        zur Kenntnis genommen.
                        <RequiredMark />
                      </>
                    ) : (
                      <>
                        I accept the{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current">
                          Terms and Conditions
                        </Link>{' '}
                        and have read the{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current">
                          Privacy Policy
                        </Link>
                        .
                        <RequiredMark />
                      </>
                    )}
                  </Label>
                </div>
                {errors.acceptTerms ? <p id="acceptTerms-error" className={formErrorClassName}>{errors.acceptTerms.message}</p> : null}
              </div>
            </div>
          </div>
        )}

        {showStepAlert && (
          // Keyed by attempt, so a repeated failed Weiter is announced again.
          <div key={stepFailures} className={formAlertClassName} role="alert" aria-live="assertive">
            <p>{t('Please check the highlighted fields.', 'Bitte prüfen Sie die markierten Angaben.')}</p>
          </div>
        )}

        {submissionError && (
          <div className={formAlertClassName} role="alert" aria-live="assertive">
            <p>{submissionError}</p>
            <p className="mt-1">
              {t('Reach us directly:', 'So erreichen Sie uns direkt:')}{' '}
              <a href={footerConfig.contact.emails[0].href} className="font-semibold underline underline-offset-4">
                {footerConfig.contact.emails[0].label}
              </a>
              {' · '}
              <a href={`tel:${footerConfig.contact.phone.replace(/\s+/g, '')}`} className="font-semibold underline underline-offset-4">
                {footerConfig.contact.phone}
              </a>
              {' · '}
              <Link href="/contact" className="font-semibold underline underline-offset-4">
                {t('Contact page', 'Kontaktseite')}
              </Link>
            </p>
          </div>
        )}
        </div>

        {/* Honeypot, as on the contact form: invisible to people, filled by bots. */}
        <input type="text" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" {...register('website')} />

        <div className="mt-8 flex shrink-0 items-center justify-between gap-3 border-t border-[color:var(--casa-sand)] pt-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep} disabled={submitting} className={formSecondaryButtonClassName}>
              <ArrowLeft className="mr-2 size-4" />
              {t('Back', 'Zurück')}
            </Button>
          ) : (
            <div />
          )}

          {step < stepItems.length ? (
            <Button
              type="button"
              onClick={nextStep}
              className={formPrimaryButtonClassName}
              data-casa-track="true"
              data-casa-label="Continue course registration"
            >
              {t('Continue', 'Weiter')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting || !isValid}
              className={formPrimaryButtonClassName}
              data-casa-track="true"
              data-casa-label="Submit course registration"
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('Submit', 'Absenden')}
            </Button>
          )}
        </div>
      </form>

      {success && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--casa-ink)]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-10 shadow-[var(--shadow-hero)] overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            {/* Close Button X in top corner */}
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="absolute top-4 right-4 text-[var(--casa-text-subtle)] hover:text-[var(--casa-muted)] rounded-full p-2 hover:bg-[var(--casa-surface-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
              aria-label={t('Close success modal', 'Erfolgsmeldung schließen')}
            >
              <span className="text-xl font-bold">✕</span>
            </button>

            <div className="rounded-full bg-[var(--casa-success-surface)] p-3 text-white shadow-[0_16px_34px_-24px_rgba(16,185,129,0.85)] mt-4">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>

            <h2 id="modal-title" className="text-2xl font-bold tracking-tight text-[var(--casa-ink)] mt-5">
              {catalog.locale === 'de' ? 'Registrierung erfolgreich' : 'Registration successful'}
            </h2>
            <p className="max-w-md text-sm text-[var(--casa-muted)] mt-2">
              {catalog.locale === 'de'
                ? 'Ihre Kursanmeldung wird nun geprüft. Das CASA-Team meldet sich zeitnah per E-Mail bei Ihnen.'
                : 'Your enrollment request is now in review. CASA admissions will contact you by email with availability and next steps.'}
            </p>
            {confirmationSent ? <p className="max-w-md text-sm font-medium text-[var(--casa-ink)] mt-2">{confirmationNotice(catalog.locale)}</p> : null}

            <div className="w-full max-w-lg text-left mt-6">
              <NextStepsTimeline
                title={catalog.locale === 'de' ? 'Was als Nächstes passiert' : 'What happens next'}
                steps={
                  catalog.locale === 'de'
                    ? [
                        { title: 'Anmeldeprüfung', description: 'Wir prüfen Daten, Verfügbarkeit und Kursfit.' },
                        { title: 'Bestätigung', description: 'Sie erhalten Rückmeldung mit Zahlungs- und Startdetails.' },
                        { title: 'Nächste Schritte', description: 'Wir senden Ihnen per E-Mail die benötigten Unterlagen und Fristen.' },
                      ]
                    : [
                        { title: 'Admissions review', description: 'We validate profile, availability, and course fit.' },
                        { title: 'Confirmation', description: 'You receive confirmation with payment and start details.' },
                        { title: 'Next steps', description: 'We send the required documents and deadlines by email.' },
                      ]
                }
              />
            </div>

            <div className="mt-8 w-full max-w-xs">
              <Link
                href="/"
                className={cn(formPrimaryButtonClassName, 'flex w-full items-center justify-center')}
              >
                {catalog.locale === 'de' ? 'Zurück zur Startseite' : 'Back to Home'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
