'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, HelpCircle, Loader2, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryField } from '@/components/forms/country-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { trackCasaEvent } from '@/lib/analytics/client';
import type { ExamRegistrationOption, RegistrationExamCatalog } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { examRegistrationFormSchema } from '@/lib/validation/registration-submissions';

const registrationSchema = examRegistrationFormSchema;
type FormData = z.infer<typeof registrationSchema>;

type ExamWizardProps = {
  catalog: RegistrationExamCatalog;
};

type ExamRegistrationApiResult = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
};
const fieldClassName =
  'h-11 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-500 shadow-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';
const selectTriggerClassName =
  'h-11 data-[size=default]:h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-base sm:text-sm text-slate-900 data-[placeholder]:text-slate-500 shadow-none text-left flex items-center justify-between transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';
const labelClassName = 'block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700';
const requiredMarkClassName = 'mr-1 text-[var(--casa-coral)]';
const fieldGroupClassName = 'space-y-1.5';
const reviewTileClassName = 'rounded-lg border border-slate-200 bg-white p-4';

function AvailabilityTag({ option }: { option: ExamRegistrationOption }) {
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

export function ExamWizard({ catalog }: ExamWizardProps) {
  const isDe = catalog.locale === 'de';
  const t = (en: string, de: string) => (isDe ? de : en);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      salutation: '' as 'mr' | 'ms' | 'mx' | 'neutral',
      examTypeId: catalog.defaultExamTypeId || catalog.examTypes[0]?.id || '',
      examSessionId: catalog.defaultOptionId || '',
      registrationType: 'full',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      birthDate: '',
      officialNameConfirmed: false,
      examPolicyAccepted: false,
      acceptTerms: false,
    },
    mode: 'onChange',
  });

  const handleCloseSuccess = () => {
    setSuccess(false);
    setStep(1);
    form.reset({
      salutation: '' as 'mr' | 'ms' | 'mx' | 'neutral',
      examTypeId: catalog.defaultExamTypeId || catalog.examTypes[0]?.id || '',
      examSessionId: catalog.defaultOptionId || '',
      registrationType: 'full',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      birthDate: '',
      officialNameConfirmed: false,
      examPolicyAccepted: false,
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

  const selectedExamTypeId = watch('examTypeId');
  const selectedExamSessionId = watch('examSessionId');
  const selectedRegistrationType = watch('registrationType');

  const selectedExamType = useMemo(
    () => catalog.examTypes.find((examType) => examType.id === selectedExamTypeId) || null,
    [catalog.examTypes, selectedExamTypeId]
  );

  const selectedOptions = useMemo(
    () => catalog.optionsByExamTypeId[selectedExamTypeId] ?? [],
    [catalog.optionsByExamTypeId, selectedExamTypeId]
  );

  const selectedOption = useMemo(
    () => selectedOptions.find((option) => option.id === selectedExamSessionId) || null,
    [selectedOptions, selectedExamSessionId]
  );
  const stepItems = [
    { title: t('Exam', 'Prüfung'), description: t('Session and mode', 'Termin und Art') },
    { title: t('Personal', 'Daten'), description: t('Candidate profile', 'Kandidatenprofil') },
    { title: t('Review', 'Prüfen'), description: t('Final check', 'Letzte Kontrolle') },
  ];
  const registrationTypeLabel =
    {
      full: t('Full Exam', 'Vollprüfung'),
      written: t('Written Only', 'Nur schriftlich'),
      oral: t('Oral Only', 'Nur mündlich'),
    }[selectedRegistrationType] ?? selectedRegistrationType;

  useEffect(() => {
    if (!selectedExamTypeId) {
      return;
    }

    const options = catalog.optionsByExamTypeId[selectedExamTypeId] ?? [];
    if (options.length === 0) {
      if (selectedExamSessionId) {
        setValue('examSessionId', '', { shouldValidate: true, shouldDirty: true });
      }
      return;
    }

    if (!options.some((option) => option.id === selectedExamSessionId)) {
      setValue('examSessionId', options[0].id, { shouldValidate: true, shouldDirty: true });
    }
  }, [catalog.optionsByExamTypeId, selectedExamSessionId, selectedExamTypeId, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await fetch('/api/registration/exam', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          examTypeLabel: selectedExamType?.name ?? '',
          examSessionLabel: selectedOption
            ? `${selectedOption.startsAtLabel} | ${selectedOption.locationLabel} | ${selectedOption.deadlineLabel}`
            : '',
          locale: catalog.locale,
        }),
      });

      const result = (await response.json()) as ExamRegistrationApiResult;
      if (!response.ok || result.status !== 'accepted') {
        throw new Error(result.message || 'Registration failed. Please try again.');
      }

      setSuccess(true);
      trackCasaEvent('form_success', {
        form: 'exam_registration',
        section: 'registration-exam',
        path: '/registration/exam',
        locale: catalog.locale,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected registration error';
      setSubmissionError(message);
      trackCasaEvent('form_error', {
        form: 'exam_registration',
        reason: 'submit_failed',
        section: 'registration-exam',
        path: '/registration/exam',
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
      ['examTypeId', 'examSessionId', 'registrationType'],
      personalFields,
      [],
    ];

    const fields = fieldsByStep[step - 1] ?? [];
    const valid = fields.length === 0 ? true : await trigger(fields, { shouldFocus: true });

    if (valid) {
      setStep((current) => Math.min(current + 1, stepItems.length));
      return;
    }

    trackCasaEvent('form_error', {
      form: 'exam_registration',
      reason: 'step_validation',
      step: `step_${step}`,
      section: 'registration-exam',
      path: '/registration/exam',
      locale: catalog.locale,
    });
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 1));



  return (
    <div className="flex flex-col" data-track-section="registration-exam">
      <div className="shrink-0 pb-6 border-b border-slate-100 space-y-6">
        {/* On-Page Registration Tabs Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-slate-100/80 p-1 shadow-inner">
            <Link
              href="/registration/course"
              className={cn(
                "rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200 text-slate-700 hover:text-slate-950"
              )}
            >
              {catalog.locale === 'de' ? 'Kursanmeldung' : 'Course Registration'}
            </Link>
            <Link
              href="/registration/exam"
              className={cn(
                "rounded-lg px-5 py-2.5 text-xs font-bold transition-all duration-200",
                "bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)]"
              )}
            >
              {catalog.locale === 'de' ? 'Prüfungsanmeldung' : 'Exam Registration'}
            </Link>
          </div>
        </div>

        {/* Steps Timeline */}
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
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
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
        data-casa-track-form="exam_registration"
      >
        <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-coral)]/10 text-[var(--casa-coral)]">
                  <FileCheck2 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-coral)]">{t('Exam path', 'Prüfungsweg')}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--casa-ink)]">{t('Choose your exam', 'Prüfung auswählen')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t(
                      'Select exam type first, then choose the session that matches your preparation timeline.',
                      'Wählen Sie zuerst den Prüfungstyp und dann den Termin, der zu Ihrer Vorbereitung passt.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={fieldGroupClassName}>
                <Label htmlFor="exam-type" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Exam Type', 'Prüfungstyp')}
                </Label>
                <Select
                  onValueChange={(value) => setValue('examTypeId', value, { shouldDirty: true, shouldValidate: true })}
                  defaultValue={watch('examTypeId')}
                >
                  <SelectTrigger id="exam-type" className={selectTriggerClassName}>
                    <SelectValue placeholder={t('Select an exam...', 'Prüfung auswählen...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.examTypes.map((examType) => (
                      <SelectItem key={examType.id} value={examType.id}>
                        {examType.name} ({examType.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.examTypeId && <p className="text-sm text-rose-600">{errors.examTypeId.message}</p>}
              </div>

              <div className={fieldGroupClassName}>
                <Label htmlFor="registration-type" className={labelClassName}>
                  <span className={requiredMarkClassName}>*</span>
                  {t('Registration Type', 'Anmeldeart')}
                </Label>
                <Select
                  onValueChange={(value: 'full' | 'written' | 'oral') =>
                    setValue('registrationType', value, { shouldDirty: true, shouldValidate: true })
                  }
                  defaultValue={watch('registrationType')}
                >
                  <SelectTrigger id="registration-type" className={selectTriggerClassName}>
                    <SelectValue placeholder={t('Select type...', 'Anmeldeart auswählen...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{t('Full Exam', 'Vollprüfung')}</SelectItem>
                    <SelectItem value="written">{t('Written Only', 'Nur schriftlich')}</SelectItem>
                    <SelectItem value="oral">{t('Oral Only', 'Nur mündlich')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.registrationType && <p className="text-sm text-rose-600">{errors.registrationType.message}</p>}
              </div>
            </div>


            <div className={fieldGroupClassName}>
              <Label htmlFor="exam-session" className={labelClassName}>
                <span className={requiredMarkClassName}>*</span>
                {catalog.locale === 'de' ? 'Prüfungstermin' : 'Exam Session'}
              </Label>
              <Select
                onValueChange={(value) => setValue('examSessionId', value, { shouldDirty: true, shouldValidate: true })}
                value={selectedExamSessionId}
              >
                <SelectTrigger id="exam-session" className={selectTriggerClassName}>
                  <SelectValue placeholder={catalog.locale === 'de' ? 'Termin auswählen...' : 'Select a session...'} />
                </SelectTrigger>
                <SelectContent>
                  {selectedOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.startsAtLabel} | {option.locationLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {catalog.locale === 'de' ? 'Noch keine Termine für diesen Prüfungstyp verfügbar.' : 'No sessions published for this exam type yet. Please choose another exam type.'}
                </p>
              ) : null}
              {errors.examSessionId && <p className="text-sm text-rose-600">{errors.examSessionId.message}</p>}
            </div>

            {selectedOption ? (
              <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_6%,transparent),transparent_55%)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{t('Selected session', 'Ausgewählter Termin')}</p>
                    <h3 className="mt-1 text-base font-bold text-[var(--casa-ink)]">{selectedExamType?.name}</h3>
                  </div>
                  <AvailabilityTag option={selectedOption} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{t('Date', 'Datum')}</dt>
                    <dd className="mt-1 font-bold text-[var(--casa-ink)]">{selectedOption.startsAtLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{t('Location', 'Ort')}</dt>
                    <dd className="mt-1 font-bold text-[var(--casa-ink)]">{selectedOption.locationLabel}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{t('Deadline', 'Frist')}</dt>
                    <dd className="mt-1 font-bold text-[var(--casa-ink)]">{selectedOption.deadlineLabel}</dd>
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
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{t('Candidate profile', 'Kandidatenprofil')}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--casa-ink)]">{t('Personal information', 'Persönliche Angaben')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t('Candidate details must match your official identification.', 'Ihre Angaben müssen exakt zu Ihrem amtlichen Ausweis passen.')}
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

            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-955">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{t('This is a public launch form. CASA will confirm exam details and deadlines by email after review.', 'Dies ist ein öffentliches Startformular. CASA bestätigt Prüfungsdetails und Fristen nach Prüfung per E-Mail.')}</p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{t('Final check', 'Letzte Kontrolle')}</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--casa-ink)]">{t('Review and submit', 'Prüfen und absenden')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{t('Double-check your exam selection and candidate details.', 'Bitte prüfen Sie Prüfungsauswahl und Kandidatenangaben.')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Exam', 'Prüfung')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedExamType?.name || '-'}</p>
                  <p className="text-xs text-slate-700">{t('Mode', 'Art')}: {registrationTypeLabel}</p>
                </div>
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Session', 'Termin')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption?.startsAtLabel || '-'}</p>
                  <p className="text-xs text-slate-700">{selectedOption?.locationLabel || '-'}</p>
                </div>
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Candidate', 'Kandidat:in')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {watch('salutation') && watch('salutation') !== 'neutral' ? (watch('salutation') === 'mr' ? (catalog.locale === 'de' ? 'Herr ' : 'Mr. ') : (watch('salutation') === 'ms' ? (catalog.locale === 'de' ? 'Frau ' : 'Ms. ') : 'Mx. ')) : ''}
                    {watch('firstName')} {watch('lastName')}
                  </p>
                  <p className="text-xs text-slate-700">{watch('email')}</p>
                </div>
                <div className={reviewTileClassName}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{t('Deadline', 'Frist')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {selectedOption?.deadlineLabel || '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-700">{t('Legal and next steps', 'Rechtliches und nächste Schritte')}</p>
                <ul className="mt-2 space-y-1.5">
                  <li>- {t('By submitting, you agree to CASA terms and exam registration conditions.', 'Mit dem Absenden akzeptieren Sie die CASA AGB und Prüfungsbedingungen.')}</li>
                  <li>- {t('Session access is confirmed after payment and candidate-data checks.', 'Der Termin wird nach Zahlungs- und Kandidatendatenprüfung bestätigt.')}</li>
                </ul>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="official-name-confirmed"
                    checked={watch('officialNameConfirmed')}
                    onCheckedChange={(checked) =>
                      setValue('officialNameConfirmed', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                    }
                  />
                  <Label htmlFor="official-name-confirmed" className="cursor-pointer text-sm font-medium text-slate-800">
                    <span className={requiredMarkClassName}>*</span>
                    {t('My name and birth date match my passport or official ID exactly.', 'Name und Geburtsdatum stimmen exakt mit meinem Pass oder amtlichen Ausweis überein.')}
                  </Label>
                </div>
                {errors.officialNameConfirmed ? <p className="text-sm text-rose-600">{errors.officialNameConfirmed.message}</p> : null}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="exam-policy-accepted"
                    checked={watch('examPolicyAccepted')}
                    onCheckedChange={(checked) =>
                      setValue('examPolicyAccepted', Boolean(checked), { shouldDirty: true, shouldValidate: true })
                    }
                  />
                  <Label htmlFor="exam-policy-accepted" className="cursor-pointer text-sm font-medium text-slate-800">
                    <span className={requiredMarkClassName}>*</span>
                    {t('I understand exam seat confirmation depends on document and payment validation.', 'Ich verstehe, dass die Prüfungsbestätigung von Dokumenten- und Zahlungsprüfung abhängt.')}
                  </Label>
                </div>
                {errors.examPolicyAccepted ? <p className="text-sm text-rose-600">{errors.examPolicyAccepted.message}</p> : null}

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
              data-casa-label="Continue exam registration"
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
              data-casa-label="Submit exam registration"
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {catalog.locale === 'de' ? 'Absenden' : 'Send'}
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
              aria-label={t('Close success modal', 'Bestätigung schließen')}
            >
              <span className="text-xl font-bold">✕</span>
            </button>

            <div className="rounded-full bg-emerald-600 p-3 text-white shadow-[0_16px_34px_-24px_rgba(16,185,129,0.85)] mt-4">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>

            <h2 id="modal-title" className="text-2xl font-bold tracking-tight text-[var(--casa-ink)] mt-5">
              {catalog.locale === 'de' ? 'Prüfungsanfrage eingegangen' : 'Registration successful'}
            </h2>
            <p className="max-w-md text-sm text-slate-600 mt-2">
              {catalog.locale === 'de'
                ? 'Ihre Prüfungsanmeldung wird nun geprüft. Das CASA-Team meldet sich zeitnah per E-Mail bei Ihnen.'
                : 'Your candidate registration is received. CASA will contact you by email with confirmation and the next required steps.'}
            </p>

            <div className="w-full max-w-lg text-left mt-6">
              <NextStepsTimeline
                title={catalog.locale === 'de' ? 'Was als Nächstes passiert' : 'What happens next'}
                steps={
                  catalog.locale === 'de'
                    ? [
                        { title: 'Anmeldeprüfung', description: 'Daten und Terminverfügbarkeit werden geprüft.' },
                        { title: 'Bestätigung', description: 'Sie erhalten Fristen für Zahlung und Dokumente.' },
                        { title: 'Nächste Schritte', description: 'Wir senden die relevanten Unterlagen und Hinweise vor dem Termin per E-Mail.' },
                      ]
                    : [
                        { title: 'Candidate review', description: 'We validate details and session availability.' },
                        { title: 'Confirmation', description: 'You receive payment and document deadlines.' },
                        { title: 'Next steps', description: 'We send the required documents and exam-day guidance by email.' },
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
