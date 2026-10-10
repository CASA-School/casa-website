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
import { registrationTypeLabels } from '@/components/registration/choice-controls';
import { coursePlan, CourseItemFields, ExamAddOn, planRowDates, planRowSchedule } from '@/components/registration/course-choices';
import type { CourseFormData, CourseFormSubmission } from '@/components/registration/course-form-types';
import { RegistrationStepper, RegistrationTabs } from '@/components/registration/registration-chrome';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { meaningClasses } from '@/config/brand/meaning';
import { footerConfig } from '@/config/footer';
import { trackCasaEvent } from '@/lib/analytics/client';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import type { RegistrationCourseCatalog, RegistrationExamCatalog } from '@/lib/content/types';
import { clockRange, formatDay } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';
import {
  createCourseRegistrationFormSchema,
  MAX_REGISTRATION_COURSES,
  registrationMessages,
  requiresLevelField,
} from '@/lib/validation/registration-submissions';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

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
    pathTo: '',
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
  const { pickTree, say } = useSiteCopy();
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

  const stepItems = [{ title: t('Course', 'Kurs') }, { title: t('Details', 'Details') }, { title: t('Review', 'Prüfen') }];
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
        throw new Error(result?.message || t('Your registration could not be sent. Please try again.', 'Die Anmeldung konnte nicht gesendet werden. Bitte versuch es noch einmal.'));
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
          : t('Your registration could not be sent. Please try again.', 'Die Anmeldung konnte nicht gesendet werden. Bitte versuch es noch einmal.');
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
            />

            <div className={formFieldGroupClassName}>
              <Label htmlFor="salutation" className={formLabelClassName}>
                {say(catalog.locale, 'Anrede', 'Salutation')}
                <RequiredMark />
              </Label>
              <Select
                onValueChange={(value) => setValue('salutation', value as 'mr' | 'ms' | 'mx' | 'neutral', { shouldDirty: true, shouldValidate: true })}
                value={watch('salutation')}
              >
                <SelectTrigger id="salutation" aria-required {...errorProps('salutation')} className={formControlClassName}>
                  <SelectValue placeholder={say(catalog.locale, 'Anrede auswählen...', 'Select salutation...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">{say(catalog.locale, 'Herr', 'Mr')}</SelectItem>
                  <SelectItem value="ms">{say(catalog.locale, 'Frau', 'Ms')}</SelectItem>
                  <SelectItem value="mx">{say(catalog.locale, 'Mx.', 'Mx')}</SelectItem>
                  <SelectItem value="neutral">{say(catalog.locale, 'Keine Angabe', 'Prefer not to say')}</SelectItem>
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="nationality" className={formLabelClassName}>
                  {t('Nationality', 'Nationalität')}
                  <RequiredMark />
                </Label>
                <CountryField
                  id="nationality"
                  locale={catalog.locale}
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
                      placeholder={say(catalog.locale, 'TT.MM.JJJJ', 'dd.mm.yyyy')}
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
                  {t('I’d like help finding accommodation', 'Ich möchte Unterstützung bei der Unterkunftssuche')}
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
            />

            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                {(() => {
                  // One tile per course, and per term of a learning path, numbered as staff will see them.
                  const tiles = courses.flatMap((course): Array<{ name: string; level: string | null; dates: string | null; schedule: string | null }> => {
                    const type = catalog.courseTypes.find((candidate) => candidate.id === course.courseTypeId);
                    const options = catalog.optionsByCourseTypeId[course.courseTypeId] ?? [];
                    const option = options.find((candidate) => candidate.id === course.courseInstanceId) ?? null;
                    const plan = type ? coursePlan({ slug: type.slug, options, option, level: course.level ?? '', pathTo: course.pathTo ?? '', locale: catalog.locale }) : null;
                    if (!plan) {
                      return [{ name: type?.name ?? '-', level: null, dates: null, schedule: null }];
                    }
                    return plan.rows.map((row) => ({
                      name: type?.name ?? '-',
                      level: row.level,
                      dates: planRowDates(row, catalog.locale),
                      schedule: row.start ? planRowSchedule(row, catalog.locale) : null,
                    }));
                  });
                  return tiles.map((tile, index) => (
                    <div key={`${tile.name}-${index}`} className={formTileClassName}>
                      <p className={formMetaLabelClassName}>
                        {tiles.length > 1 ? t(`Course ${index + 1}`, `Kurs ${index + 1}`) : t('Course', 'Kurs')}
                      </p>
                      <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                        {tile.name}
                        {tile.level ? <span className="font-normal text-[var(--casa-muted)]"> · {tile.level}</span> : null}
                      </p>
                      {tile.dates ? <p className="mt-0.5 text-[var(--casa-muted)]">{tile.dates}</p> : null}
                      {tile.schedule ? <p className="mt-0.5 text-[var(--casa-muted)]">{tile.schedule}</p> : null}
                    </div>
                  ));
                })()}
                {examEnabled && examCatalog ? (() => {
                  const examType = examCatalog.examTypes.find((candidate) => candidate.id === exam?.examTypeId);
                  const session = examCatalog.optionsByExamTypeId[exam?.examTypeId ?? '']?.find((candidate) => candidate.id === exam?.examSessionId);
                  const types = registrationTypeLabels(catalog.locale);
                  return (
                    <div className={formTileClassName}>
                      <p className={formMetaLabelClassName}>{t('Exam', 'Prüfung')}</p>
                      <p className="mt-1 font-semibold text-[var(--casa-ink)]">{examType?.name || '-'}</p>
                      {session ? <p className="mt-0.5 text-[var(--casa-muted)]">{formatDay(session.startsAt, catalog.locale)} · {clockRange(session.startsAt, session.endsAt, catalog.locale)}</p> : null}
                      {exam?.registrationType ? <p className="mt-0.5 text-[var(--casa-muted)]">{types[exam.registrationType]}</p> : null}
                    </div>
                  );
                })() : null}
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Student', 'Teilnehmer')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {watch('salutation') && watch('salutation') !== 'neutral' ? (watch('salutation') === 'mr' ? (say(catalog.locale, 'Herr ', 'Mr ')) : (watch('salutation') === 'ms' ? (say(catalog.locale, 'Frau ', 'Ms ')) : (say(catalog.locale, 'Mx. ', 'Mx ')))) : ''}
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

              <p className={cn(formHintClassName, 'flex gap-2.5')}>
                <HelpCircle className="mt-0.5 size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                {t('We’ll confirm your place by email once we have checked your registration.', 'Wir bestätigen dir deinen Platz per E-Mail, sobald wir deine Anmeldung geprüft haben.')}
              </p>

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
                        {t('My name and date of birth match my passport or official ID exactly.', 'Name und Geburtsdatum stimmen exakt mit meinem Pass oder amtlichen Ausweis überein.')}
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
                        {t('I understand that my exam place is only confirmed once my documents and my payment have been checked.', 'Ich weiß, dass mein Prüfungsplatz erst bestätigt wird, wenn meine Dokumente und meine Zahlung geprüft sind.')}
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
            <p>{t('Please check the highlighted fields.', 'Bitte prüfe die markierten Angaben.')}</p>
          </div>
        )}

        {submissionError && (
          <div className={formAlertClassName} role="alert" aria-live="assertive">
            <p>{submissionError}</p>
            <p className="mt-1">
              {t('Reach us directly:', 'So erreichst du uns direkt:')}{' '}
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
              aria-label={t('Close this message', 'Erfolgsmeldung schließen')}
            >
              <span className="text-xl font-bold">✕</span>
            </button>

            <div className="rounded-full bg-[var(--casa-success-surface)] p-3 text-white shadow-[0_16px_34px_-24px_rgba(16,185,129,0.85)] mt-4">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>

            <h2 id="modal-title" className="text-2xl font-bold tracking-tight text-[var(--casa-ink)] mt-5">
              {say(catalog.locale, 'Danke für deine Anmeldung', 'Thank you for your registration')}
            </h2>
            <p className="max-w-md text-sm text-[var(--casa-muted)] mt-2">
              {say(catalog.locale, 'Wir sehen uns deine Anmeldung jetzt an und melden uns so bald wie möglich per E-Mail bei dir.', 'We’ll look at your registration now and get back to you by email as soon as we can.')}
            </p>
            {confirmationSent ? <p className="max-w-md text-sm font-medium text-[var(--casa-ink)] mt-2">{confirmationNotice(catalog.locale)}</p> : null}

            <div className="w-full max-w-lg text-left mt-6">
              <NextStepsTimeline
                title={say(catalog.locale, 'Was als Nächstes passiert', 'What happens next')}
                steps={
                  pickTree(catalog.locale, { de: [
                        { title: 'Wir prüfen deine Anmeldung', description: 'Wir sehen uns deine Angaben an und prüfen, ob noch ein Platz frei ist und der Kurs zu dir passt.' },
                        { title: 'Du bekommst eine Rückmeldung', description: 'Darin stehen die Details zur Zahlung und zum Kursstart.' },
                        { title: 'Wir schicken dir alles Weitere', description: 'Per E-Mail bekommst du die Unterlagen und Fristen, die du brauchst.' },
                      ], en: [
                        { title: 'We check your registration', description: 'We look at your details and check that there is still a place free and that the course suits you.' },
                        { title: 'You hear back from us', description: 'Our reply includes the details of payment and of the start of your course.' },
                        { title: 'We send you everything else', description: 'You’ll receive the documents and deadlines you need by email.' },
                      ] })
                }
              />
            </div>

            <div className="mt-8 w-full max-w-xs">
              <Link
                href="/"
                className={cn(formPrimaryButtonClassName, 'flex w-full items-center justify-center')}
              >
                {say(catalog.locale, 'Zurück zur Startseite', 'Back to the home page')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
