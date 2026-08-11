'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, HelpCircle, Home, Loader2, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryField } from '@/components/forms/country-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { trackCasaEvent } from '@/lib/analytics/client';
import type { CourseRegistrationOption, RegistrationCourseCatalog } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { courseRegistrationFormSchema, requiresLevelField } from '@/lib/validation/registration-submissions';

const registrationSchema = courseRegistrationFormSchema;

type FormData = z.input<typeof registrationSchema>;
type FormSubmissionData = z.output<typeof registrationSchema>;

type CourseWizardProps = {
  catalog: RegistrationCourseCatalog;
};

type CourseRegistrationApiResult = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
};

const fieldClassName =
  'h-11 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-500 shadow-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';
const selectTriggerClassName =
  'h-11 data-[size=default]:h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-base sm:text-sm text-slate-900 data-[placeholder]:text-slate-500 shadow-none text-left flex items-center justify-between transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';
const labelClassName = 'block text-xs font-black uppercase tracking-[0.12em] text-slate-700';
const requiredMarkClassName = 'mr-1 text-[var(--casa-coral)]';
const fieldGroupClassName = 'space-y-1.5';
const reviewTileClassName = 'rounded-lg border border-slate-200 bg-white p-4';

function AvailabilityTag({ option }: { option: CourseRegistrationOption }) {
  const classes =
    option.availabilityState === 'full'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : option.availabilityState === 'limited'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]', classes)}>
      {option.availabilityLabel}
    </span>
  );
}

export function CourseWizard({ catalog }: CourseWizardProps) {
  const isDe = catalog.locale === 'de';
  const t = (en: string, de: string) => (isDe ? de : en);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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
      smoker: false,
      allergies: '',
      notes: '',
      acceptTerms: false,
    },
    mode: 'onChange',
  });

  const handleCloseSuccess = () => {
    setSuccess(false);
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
      smoker: false,
      allergies: '',
      notes: '',
      acceptTerms: false,
    });
  };

  const {
    watch,
    setValue,
    register,
    trigger,
    formState: { errors, isValid },
  } = form;

  const selectedCourseTypeId = watch('courseTypeId');
  const selectedCourseInstanceId = watch('courseInstanceId');
  const currentLevel = watch('currentLevel');
  const accommodationRequired = watch('accommodationRequired');

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

      const result = (await response.json()) as CourseRegistrationApiResult;
      if (!response.ok || result.status !== 'accepted') {
        throw new Error(result.message || 'Registration failed. Please try again.');
      }

      setSuccess(true);
      trackCasaEvent('form_success', {
        form: 'course_registration',
        section: 'registration-course',
        path: '/registration/course',
        locale: catalog.locale,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected registration error';
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
    const personalFields: Array<keyof FormData> = [
      'salutation',
      'firstName',
      'lastName',
      'email',
      'phone',
      'nationality',
      'birthDate',
    ];

    const fieldsByStep: Array<Array<keyof FormData>> = [
      ['courseTypeId', 'courseInstanceId'],
      accommodationRequired
        ? [...personalFields, 'accommodationRequired', 'accommodationType']
        : [...personalFields, 'accommodationRequired'],
      [],
    ];

    const fields = fieldsByStep[step - 1] ?? [];
    const valid = fields.length === 0 ? true : await trigger(fields, { shouldFocus: true });

    if (valid) {
      setStep((current) => Math.min(current + 1, stepItems.length));
      return;
    }

    trackCasaEvent('form_error', {
      form: 'course_registration',
      reason: 'step_validation',
      step: `step_${step}`,
      section: 'registration-course',
      path: '/registration/course',
      locale: catalog.locale,
    });
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 1));



  return (
    <div className="flex flex-col" data-track-section="registration-course">
      <div className="shrink-0 pb-6 border-b border-slate-100 space-y-6">
        {/* On-Page Registration Tabs Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-slate-100/80 p-1 shadow-inner">
            <Link
              href="/registration/course"
              className={cn(
                "rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200",
                "bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)]"
              )}
            >
              {catalog.locale === 'de' ? 'Kursanmeldung' : 'Course Registration'}
            </Link>
            <Link
              href="/registration/exam"
              className={cn(
                "rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200 text-slate-700 hover:text-slate-950"
              )}
            >
              {catalog.locale === 'de' ? 'Prüfungsanmeldung' : 'Exam Registration'}
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-6 sm:px-12">
          {/* Background line */}
          <div className="absolute left-6 right-6 sm:left-12 sm:right-12 top-[18px] h-0.5 bg-slate-100" aria-hidden="true" />
          {/* Active indicator line */}
          <div
            className="absolute left-6 sm:left-12 top-[18px] h-0.5 bg-[var(--casa-blue)] transition-all duration-300"
            style={{ width: `calc(${((step - 1) / (stepItems.length - 1)) * 100}% - ${step === 3 ? '0px' : '0px'})` }}
            aria-hidden="true"
          />

          {stepItems.map((item, index) => {
            const current = index + 1;
            const complete = current < step;
            const active = current === step;

            return (
              <div key={item.title} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black transition-all duration-300',
                    complete
                      ? 'border-[var(--casa-blue)] bg-[var(--casa-accent-surface)] text-white shadow-[var(--shadow-card)] shadow-[var(--casa-blue)]/10'
                      : active
                        ? 'border-[var(--casa-blue)] bg-white text-[var(--casa-accent-text)] shadow-[0_0_0_4px_rgba(0,159,227,0.12)]'
                        : 'border-slate-300 bg-white text-slate-600'
                  )}
                >
                  {complete ? <CheckCircle2 className="h-4.5 w-4.5" aria-hidden /> : current}
                </div>
                <span className={cn('mt-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-300', active || complete ? 'text-[var(--casa-ink)]' : 'text-slate-600')}>
                  {item.title}
                </span>
                <span className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">{item.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6"
        noValidate
        data-casa-track-form="course_registration"
      >
        <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <div className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                  <GraduationCap className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {t('Course path', 'Kursweg')}
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--casa-ink)]">
                    {t('Choose your course', 'Kurs auswählen')}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t(
                      'Select one course and one start option. You can review everything before submit.',
                      'Wählen Sie einen Kurs und einen Starttermin. Vor dem Absenden können Sie alles prüfen.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={fieldGroupClassName}>
                <Label htmlFor="course-type" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Course Type', 'Kurstyp')}
                </Label>
                <Select
                  onValueChange={(value) => setValue('courseTypeId', value, { shouldDirty: true, shouldValidate: true })}
                  defaultValue={watch('courseTypeId')}
                >
                  <SelectTrigger id="course-type" className={selectTriggerClassName}>
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
                {errors.courseTypeId && <p className="text-sm text-rose-600">{errors.courseTypeId.message}</p>}
              </div>

              <div className={fieldGroupClassName}>
                <Label htmlFor="course-option" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {catalog.locale === 'de' ? 'Startdatum' : 'Start Date'}
                </Label>
                <Select
                  onValueChange={(value) => setValue('courseInstanceId', value, { shouldDirty: true, shouldValidate: true })}
                  value={selectedCourseInstanceId}
                >
                  <SelectTrigger id="course-option" className={selectTriggerClassName}>
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
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {catalog.locale === 'de' ? 'Noch keine Termine für diesen Kurstyp verfügbar.' : 'No scheduled options for this course type yet. Please choose another course type.'}
                  </p>
                ) : null}
                {errors.courseInstanceId && <p className="text-sm text-rose-600">{errors.courseInstanceId.message}</p>}
              </div>
            </div>

            {/* Conditional level / niveau field */}
            {showLevelField && levelOptions.length > 0 && (
              <div className={fieldGroupClassName}>
                <Label htmlFor="current-level" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Your current level (Niveau)', 'Ihr aktuelles Niveau')}
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue('currentLevel', value, { shouldDirty: true, shouldValidate: true })
                  }
                  value={watch('currentLevel') || ''}
                >
                  <SelectTrigger id="current-level" className={selectTriggerClassName}>
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
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t(
                    "Not sure? Take the placement test first — link in the navigation.",
                    "Unsicher? Nutzen Sie zuerst den Einstufungstest — Link in der Navigation."
                  )}
                </p>
              </div>
            )}

            {selectedOption ? (
              <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_6%,transparent),transparent_55%)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                      {t('Selected session', 'Ausgewählter Termin')}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-[var(--casa-ink)]">{selectedCourseType?.name}</h3>
                  </div>
                  <AvailabilityTag option={selectedOption} />
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                      {t('Dates', 'Daten')}
                    </dt>
                    <dd className="mt-1 font-bold text-[var(--casa-ink)]">{selectedOption.dateRangeLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                      {t('Schedule', 'Zeitplan')}
                    </dt>
                    <dd className="mt-1 font-bold text-[var(--casa-ink)]">{selectedOption.scheduleLabel}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-coral)]/10 text-[var(--casa-coral)]">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-coral)]">
                    {t('Student profile', 'Teilnehmerprofil')}
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--casa-ink)]">
                    {t('Personal details', 'Persönliche Angaben')}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t(
                      'Share your details so we can prepare enrollment and optional accommodation support.',
                      'Teilen Sie Ihre Angaben, damit wir Anmeldung und optionale Unterkunftsunterstützung vorbereiten können.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className={fieldGroupClassName}>
              <Label htmlFor="salutation" className={labelClassName}>
                <span className={requiredMarkClassName}>*</span>
                {catalog.locale === 'de' ? 'Anrede' : 'Salutation'}
              </Label>
              <Select
                onValueChange={(value) => setValue('salutation', value as 'mr' | 'ms' | 'mx' | 'neutral', { shouldDirty: true, shouldValidate: true })}
                value={watch('salutation')}
              >
                <SelectTrigger id="salutation" className={selectTriggerClassName}>
                  <SelectValue placeholder={catalog.locale === 'de' ? 'Anrede auswählen...' : 'Select salutation...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">{catalog.locale === 'de' ? 'Herr' : 'Mr.'}</SelectItem>
                  <SelectItem value="ms">{catalog.locale === 'de' ? 'Frau' : 'Ms.'}</SelectItem>
                  <SelectItem value="mx">{catalog.locale === 'de' ? 'Mx.' : 'Mx.'}</SelectItem>
                  <SelectItem value="neutral">{catalog.locale === 'de' ? 'Keine Angabe' : 'Neutral / Other'}</SelectItem>
                </SelectContent>
              </Select>
              {errors.salutation && <p className="text-sm text-rose-600">{errors.salutation.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldGroupClassName}>
                <Label htmlFor="firstName" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('First Name', 'Vorname')}
                </Label>
                <Input id="firstName" autoComplete="given-name" className={fieldClassName} {...register('firstName')} />
                {errors.firstName && <p className="text-sm text-rose-600">{errors.firstName.message}</p>}
              </div>
              <div className={fieldGroupClassName}>
                <Label htmlFor="lastName" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Last Name', 'Nachname')}
                </Label>
                <Input id="lastName" autoComplete="family-name" className={fieldClassName} {...register('lastName')} />
                {errors.lastName && <p className="text-sm text-rose-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldGroupClassName}>
                <Label htmlFor="email" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Email', 'E-Mail')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={fieldClassName}
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
              </div>
              <div className={fieldGroupClassName}>
                <Label htmlFor="phone" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Phone Number', 'Telefonnummer')}
                </Label>
                <Input id="phone" autoComplete="tel" className={fieldClassName} {...register('phone')} />
                {errors.phone && <p className="text-sm text-rose-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-950">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                {t(
                  'This is a public launch form. CASA will follow up by email after reviewing your request.',
                  'Dies ist ein öffentliches Startformular. CASA meldet sich nach Prüfung Ihrer Anfrage per E-Mail.'
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldGroupClassName}>
                <Label htmlFor="nationality" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Nationality', 'Nationalität')}
                </Label>
                <CountryField
                  id="nationality"
                  value={watch('nationality')}
                  onChange={(value) => setValue('nationality', value, { shouldDirty: true, shouldValidate: true })}
                  searchPlaceholder={t('Search...', 'Suchen...')}
                  emptyLabel={t('No results found.', 'Keine Ergebnisse gefunden.')}
                  className={fieldClassName}
                  required
                />
                {errors.nationality && <p className="text-sm text-rose-600">{errors.nationality.message}</p>}
              </div>
              <div className={fieldGroupClassName}>
                <Label htmlFor="birthDate" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Date of Birth', 'Geburtsdatum')}
                </Label>
                <Controller
                  name="birthDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      id="birthDate"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={catalog.locale === 'de' ? 'TT.MM.JJJJ' : 'dd.mm.yyyy'}
                      hasError={!!errors.birthDate}
                      locale={catalog.locale}
                      align="top"
                    />
                  )}
                />
                {errors.birthDate && <p className="text-sm text-rose-600">{errors.birthDate.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-soft)]">
              <Checkbox
                id="visa"
                checked={watch('visaRequired')}
                onCheckedChange={(checked) => setValue('visaRequired', Boolean(checked), { shouldDirty: true })}
              />
              <Label htmlFor="visa" className="cursor-pointer">
                {t('I need a visa for Germany', 'Ich brauche ein Visum für Deutschland')}
              </Label>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] p-4">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-[var(--casa-gold-deep)]" aria-hidden />
                <p className="text-sm font-black text-slate-800">
                  {t('Accommodation support (optional)', 'Unterkunftsunterstützung (optional)')}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accommodation"
                  checked={accommodationRequired}
                  onCheckedChange={(checked) => setValue('accommodationRequired', Boolean(checked), { shouldDirty: true })}
                />
                <Label htmlFor="accommodation" className="cursor-pointer text-sm">
                  {t('I want CASA to support my accommodation search', 'Ich möchte Unterstützung bei der Unterkunftssuche')}
                </Label>
              </div>
            </div>

            {accommodationRequired && (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className={fieldGroupClassName}>
                  <Label htmlFor="accommodation-type" className={labelClassName}>
                    <span className={requiredMarkClassName}>*</span>
                    {t('Type Preference', 'Wohnform')}
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setValue('accommodationType', value as 'flat' | 'host', { shouldValidate: true, shouldDirty: true })
                    }
                    defaultValue={watch('accommodationType')}
                  >
                    <SelectTrigger id="accommodation-type" className={selectTriggerClassName}>
                      <SelectValue placeholder={t('Select type...', 'Wohnform auswählen...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">{t('Shared Flat (WG)', 'WG')}</SelectItem>
                      <SelectItem value="host">{t('Host Family', 'Gastfamilie')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accommodationType && <p className="text-sm text-rose-600">{errors.accommodationType.message}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smoker"
                    checked={watch('smoker')}
                    onCheckedChange={(checked) => setValue('smoker', Boolean(checked), { shouldDirty: true })}
                  />
                  <Label htmlFor="smoker">{t('I am a smoker', 'Ich rauche')}</Label>
                </div>

                <div className={fieldGroupClassName}>
                  <Label htmlFor="allergies" className={labelClassName}>{t('Allergies', 'Allergien')}</Label>
                  <Input id="allergies" className={fieldClassName} {...register('allergies')} placeholder={t('e.g. cats, nuts', 'z. B. Katzen, Nüsse')} />
                </div>

                <div className={fieldGroupClassName}>
                  <Label htmlFor="notes" className={labelClassName}>{t('Additional Notes', 'Weitere Hinweise')}</Label>
                  <Textarea
                    id="notes"
                    className="min-h-28 rounded-lg border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-none placeholder:text-slate-500 focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20"
                    {...register('notes')}
                    placeholder={t('Any preferences we should know about?', 'Gibt es Wünsche, die wir kennen sollten?')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-ink-deep)] text-white">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
                    {t('Final check', 'Letzte Kontrolle')}
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--casa-ink)]">
                    {t('Review and submit', 'Prüfen und absenden')}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t(
                      'Please confirm all details before sending your enrollment request.',
                      'Bitte prüfen Sie alle Angaben, bevor Sie Ihre Anfrage absenden.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Course', 'Kurs')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedCourseType?.name || '-'}</p>
                  <p className="text-xs text-slate-700">{selectedOption?.dateRangeLabel || '-'}</p>
                </div>
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Schedule', 'Zeitplan')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption?.scheduleLabel || '-'}</p>
                </div>
                {showLevelField && currentLevel && (
                  <div className={reviewTileClassName}>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                      {t('Current Level', 'Aktuelles Niveau')}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--casa-ink)]">{currentLevel}</p>
                  </div>
                )}
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Student', 'Teilnehmer')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {watch('salutation') && watch('salutation') !== 'neutral' ? (watch('salutation') === 'mr' ? (catalog.locale === 'de' ? 'Herr ' : 'Mr. ') : (watch('salutation') === 'ms' ? (catalog.locale === 'de' ? 'Frau ' : 'Ms. ') : 'Mx. ')) : ''}
                    {watch('firstName')} {watch('lastName')}
                  </p>
                  <p className="text-xs text-slate-700">{watch('email')}</p>
                </div>
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Accommodation', 'Unterkunft')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {accommodationRequired
                      ? (watch('accommodationType') === 'flat' ? t('Shared Flat (WG)', 'WG') : t('Host Family', 'Gastfamilie'))
                      : t('Not requested', 'Nicht angefragt')}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-700">{t('Legal and next steps', 'Rechtliches und nächste Schritte')}</p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    - {t('By submitting, you agree to CASA terms and privacy policy.', 'Mit dem Absenden akzeptieren Sie die CASA AGB und Datenschutzerklärung.')}
                  </li>
                  <li>
                    - {t('Admissions confirmation is sent after seat and profile checks.', 'Die Bestätigung erfolgt nach Anmelde- und Kursprüfung.')}
                  </li>
                </ul>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="accept-terms"
                    checked={watch('acceptTerms')}
                    onCheckedChange={(checked) =>
                      setValue('acceptTerms', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                    }
                  />
                  <Label htmlFor="accept-terms" className="cursor-pointer text-sm font-medium text-slate-800">
                    <span className={requiredMarkClassName}>*</span>
                    {catalog.locale === 'de' ? (
                      <>
                        Ich akzeptiere die{' '}
                        <Link href="/terms" target="_blank" className="text-[var(--casa-accent-text)] hover:underline font-bold">
                          Allgemeinen Geschäftsbedingungen
                        </Link>{' '}
                        und die{' '}
                        <Link href="/privacy" target="_blank" className="text-[var(--casa-accent-text)] hover:underline font-bold">
                          Datenschutzerklärung
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        I accept the{' '}
                        <Link href="/terms" target="_blank" className="text-[var(--casa-accent-text)] hover:underline font-bold">
                          Terms and Conditions
                        </Link>{' '}
                        and the{' '}
                        <Link href="/privacy" target="_blank" className="text-[var(--casa-accent-text)] hover:underline font-bold">
                          Privacy Policy
                        </Link>
                        .
                      </>
                    )}
                  </Label>
                </div>
                {errors.acceptTerms ? <p className="text-sm text-rose-600">{errors.acceptTerms.message}</p> : null}
              </div>
            </div>
          </div>
        )}

        {submissionError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="assertive">
            {submissionError}
          </div>
        )}
        </div>

        <div className="mt-4 flex shrink-0 justify-between border-t border-slate-200 pt-4">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep} disabled={submitting} className="h-11 rounded-lg border-slate-200 bg-white px-4">
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
              className="h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-white hover:bg-[var(--casa-ink-deep-hover)]"
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
              className="h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 text-white hover:bg-[var(--casa-ink-deep-hover)]"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-10 shadow-[var(--shadow-hero)] overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            {/* Close Button X in top corner */}
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="absolute top-4 right-4 text-[var(--casa-text-subtle)] hover:text-slate-600 rounded-full p-2 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
              aria-label={t('Close success modal', 'Erfolgsmeldung schließen')}
            >
              <span className="text-xl font-bold">✕</span>
            </button>

            <div className="rounded-full bg-emerald-600 p-3 text-white shadow-[0_16px_34px_-24px_rgba(16,185,129,0.85)] mt-4">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>

            <h2 id="modal-title" className="text-2xl font-black tracking-tight text-[var(--casa-ink)] mt-5">
              {catalog.locale === 'de' ? 'Registrierung erfolgreich' : 'Registration successful'}
            </h2>
            <p className="max-w-md text-sm text-slate-600 mt-2">
              {catalog.locale === 'de'
                ? 'Ihre Kursanmeldung wird nun geprüft. Das CASA-Team meldet sich zeitnah per E-Mail bei Ihnen.'
                : 'Your enrollment request is now in review. CASA admissions will contact you by email with availability and next steps.'}
            </p>

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
                className="flex w-full h-11 items-center justify-center rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)] font-bold text-sm transition-colors"
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
