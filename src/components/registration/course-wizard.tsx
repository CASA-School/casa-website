'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, HelpCircle, Home, Loader2, ShieldCheck, UserRound } from 'lucide-react';

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
import { RegistrationStepper, RegistrationTabs } from '@/components/registration/registration-chrome';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { meaningClasses } from '@/config/brand/meaning';
import { footerConfig } from '@/config/footer';
import { trackCasaEvent } from '@/lib/analytics/client';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import type { RegistrationCourseCatalog } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { createCourseRegistrationFormSchema, requiresLevelField } from '@/lib/validation/registration-submissions';

type RegistrationSchema = ReturnType<typeof createCourseRegistrationFormSchema>;
type FormData = z.input<RegistrationSchema>;
type FormSubmissionData = z.output<RegistrationSchema>;

type CourseWizardProps = {
  catalog: RegistrationCourseCatalog;
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
  courseTypeId: 'course-type',
  courseInstanceId: 'course-option',
  accommodationRequired: 'accommodation',
  accommodationType: 'accommodation-type',
};

export function CourseWizard({ catalog }: CourseWizardProps) {
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
      courseTypeId: catalog.defaultCourseTypeId || catalog.courseTypes[0]?.id || '',
      courseInstanceId: catalog.defaultOptionId || '',
      currentLevel: '',
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
      courseTypeId: catalog.defaultCourseTypeId || catalog.courseTypes[0]?.id || '',
      courseInstanceId: catalog.defaultOptionId || '',
      currentLevel: '',
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

  const selectedCourseTypeId = watch('courseTypeId');
  const selectedCourseInstanceId = watch('courseInstanceId');
  const currentLevel = watch('currentLevel');
  const accommodationRequired = watch('accommodationRequired');
  const hasAllergies = Boolean(watch('allergies')?.trim());

  const selectedCourseType = useMemo(
    () => catalog.courseTypes.find((courseType) => courseType.id === selectedCourseTypeId) || null,
    [catalog.courseTypes, selectedCourseTypeId]
  );

  const selectedOptions = useMemo(
    () => catalog.optionsByCourseTypeId[selectedCourseTypeId] ?? [],
    [catalog.optionsByCourseTypeId, selectedCourseTypeId]
  );

  const selectedOption = useMemo(
    () => selectedOptions.find((option) => option.id === selectedCourseInstanceId) || null,
    [selectedOptions, selectedCourseInstanceId]
  );

  /** Whether this course type needs a CEFR level selection */
  const showLevelField = useMemo(
    () => requiresLevelField(selectedCourseType?.slug),
    [selectedCourseType]
  );

  /** The ordered level options for this course type (from the selected instance or the first option) */
  const levelOptions = useMemo(() => {
    const firstOption = selectedOptions[0];
    return firstOption?.availableLevels ?? [];
  }, [selectedOptions]);
  const stepItems = [
    { title: t('Course', 'Kurs'), description: t('Goal and start', 'Ziel und Start') },
    { title: t('Details', 'Details'), description: t('Student profile', 'Teilnehmerprofil') },
    { title: t('Review', 'Prüfen'), description: t('Final check', 'Letzte Kontrolle') },
  ];
  const fieldsByStep: Array<Array<keyof FormData>> = [
    ['courseTypeId', 'courseInstanceId'],
    accommodationRequired
      ? [...PERSONAL_FIELDS, 'accommodationRequired', 'accommodationType', 'allergies', 'allergyConsent']
      : [...PERSONAL_FIELDS, 'accommodationRequired'],
    [],
  ];
  const stepFields = fieldsByStep[step - 1] ?? [];
  const showStepAlert = stepFailures > 0 && stepFields.some((name) => errors[name]);

  useEffect(() => {
    if (!selectedCourseTypeId) {
      return;
    }

    const options = catalog.optionsByCourseTypeId[selectedCourseTypeId] ?? [];
    if (options.length === 0) {
      if (selectedCourseInstanceId) {
        setValue('courseInstanceId', '', { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    if (!options.some((option) => option.id === selectedCourseInstanceId)) {
      setValue('courseInstanceId', options[0].id, { shouldValidate: true, shouldDirty: true });
    }
  }, [catalog.optionsByCourseTypeId, selectedCourseInstanceId, selectedCourseTypeId, setValue]);

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

  // Reset level when course type changes to avoid stale value
  useEffect(() => {
    setValue('currentLevel', '', { shouldDirty: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseTypeId]);

  const onSubmit = async (data: FormSubmissionData) => {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await fetch('/api/registration/course', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          courseTypeLabel: selectedCourseType?.name ?? '',
          courseInstanceLabel: selectedOption
            ? `${selectedOption.dateRangeLabel} | ${selectedOption.scheduleLabel} | ${selectedOption.locationLabel}`
            : '',
          locale: catalog.locale,
        }),
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

  const nextStep = async () => {
    // Not `shouldFocus`: it reaches only fields with a registered ref, and the
    // selects, the country field and the date picker have none.
    const valid = stepFields.length === 0 ? true : await trigger(stepFields);

    if (valid) {
      stepChanged.current = true;
      setStepFailures(0);
      setStep((current) => Math.min(current + 1, stepItems.length));
      return;
    }

    const firstInvalid = stepFields.find((name) => form.getFieldState(name).invalid);
    invalidFieldId.current = firstInvalid ? (FIELD_ELEMENT_IDS[firstInvalid] ?? firstInvalid) : null;
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
                'Select one course and one start date. You can review everything before you submit.',
                'Wählen Sie einen Kurs und einen Starttermin. Vor dem Absenden können Sie alles prüfen.'
              )}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="course-type" className={formLabelClassName}>
                  {t('Course type', 'Kurstyp')}
                  <RequiredMark />
                </Label>
                <Select
                  onValueChange={(value) => setValue('courseTypeId', value, { shouldDirty: true, shouldValidate: true })}
                  defaultValue={watch('courseTypeId')}
                >
                  <SelectTrigger id="course-type" aria-required {...errorProps('courseTypeId')} className={formControlClassName}>
                    <SelectValue placeholder={t('Select a course...', 'Kurs auswählen...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.courseTypes.map((courseType) => (
                      <SelectItem key={courseType.id} value={courseType.id}>
                        {courseType.name} ({courseType.lessons_per_week} {t('lessons/week', 'Lektionen/Woche')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courseTypeId && <p id="courseTypeId-error" className={formErrorClassName}>{errors.courseTypeId.message}</p>}
              </div>

              <div className={formFieldGroupClassName}>
                <Label htmlFor="course-option" className={formLabelClassName}>
                  {catalog.locale === 'de' ? 'Startdatum' : 'Start date'}
                  <RequiredMark />
                </Label>
                <Select
                  onValueChange={(value) => setValue('courseInstanceId', value, { shouldDirty: true, shouldValidate: true })}
                  value={selectedCourseInstanceId}
                >
                  <SelectTrigger id="course-option" aria-required {...errorProps('courseInstanceId')} className={formControlClassName}>
                    <SelectValue placeholder={catalog.locale === 'de' ? 'Starttermin auswählen...' : 'Select a start date...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.dateRangeLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOptions.length === 0 ? (
                  <p className={formHintClassName}>
                    {catalog.locale === 'de' ? 'Noch keine Termine für diesen Kurstyp verfügbar.' : 'No scheduled options for this course type yet. Please choose another course type.'}
                  </p>
                ) : null}
                {errors.courseInstanceId && <p id="courseInstanceId-error" className={formErrorClassName}>{errors.courseInstanceId.message}</p>}
              </div>
            </div>

            {/* Conditional level / niveau field */}
            {showLevelField && levelOptions.length > 0 && (
              <div className={formFieldGroupClassName}>
                <Label htmlFor="current-level" className={formLabelClassName}>
                  {t('Your current level (Niveau)', 'Ihr aktuelles Niveau')}
                  <RequiredMark />
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue('currentLevel', value, { shouldDirty: true, shouldValidate: true })
                  }
                  value={watch('currentLevel') || ''}
                >
                  <SelectTrigger id="current-level" className={formControlClassName}>
                    <SelectValue
                      placeholder={t(
                        'Select your current level…',
                        'Aktuelles Niveau auswählen…'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/*
                  This field asks the learner to self-report a level, so it has
                  to hand them the way to find out: the placement page with the
                  Klett online tests (CASA's own test is in development, see
                  src/lib/placement/availability.ts). A new tab, because the
                  wizard keeps no draft and the learner would lose their choices.
                */}
                <p className={formHintClassName}>
                  {t('Not sure which level you are?', 'Unsicher, welches Niveau Sie haben?')}{' '}
                  <Link
                    href="/placement-test"
                    target="_blank"
                    rel="noopener"
                    className="casa-cta-link font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 decoration-[color:var(--casa-sand)] transition-colors hover:text-[var(--casa-accent-text-hover)] hover:decoration-current"
                  >
                    {t('Take a free placement test', 'Kostenlosen Einstufungstest machen')}
                  </Link>
                  {t(' — opens in a new tab, so your details here stay.', ' – öffnet sich in einem neuen Tab, Ihre Angaben hier bleiben erhalten.')}
                </p>
              </div>
            )}

            {selectedOption ? (
              <div className="relative overflow-hidden rounded-2xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-5 sm:p-6">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--casa-red)]" />
                <p className={formMetaLabelClassName}>{t('Selected session', 'Ausgewählter Termin')}</p>
                <h3 className="mt-1 text-lg font-bold text-[var(--casa-ink)]">{selectedCourseType?.name}</h3>
                <dl className="mt-4 grid gap-4 border-t border-[color:var(--casa-sand)] pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className={formMetaLabelClassName}>{t('Dates', 'Daten')}</dt>
                    <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption.dateRangeLabel}</dd>
                  </div>
                  <div>
                    <dt className={formMetaLabelClassName}>{t('Schedule', 'Zeitplan')}</dt>
                    <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption.scheduleLabel}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
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
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Course', 'Kurs')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedCourseType?.name || '-'}</p>
                  <p className="mt-0.5 text-[var(--casa-muted)]">{selectedOption?.dateRangeLabel || '-'}</p>
                </div>
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Schedule', 'Zeitplan')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption?.scheduleLabel || '-'}</p>
                </div>
                {showLevelField && currentLevel && (
                  <div className={formTileClassName}>
                    <p className={formMetaLabelClassName}>
                      {t('Current level', 'Aktuelles Niveau')}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--casa-ink)]">{currentLevel}</p>
                  </div>
                )}
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

              <div className={cn(formTileClassName, 'space-y-3 bg-white')}>
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
