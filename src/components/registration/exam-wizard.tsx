'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, HelpCircle, Loader2, ShieldCheck, UserRound } from 'lucide-react';

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
  formTileClassName,
  FormStepHeader,
  RequiredMark,
} from '@/components/forms/form-styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { RegistrationStepper, RegistrationTabs } from '@/components/registration/registration-chrome';
import { NextStepsTimeline } from '@/components/sections/next-steps-timeline';
import { footerConfig } from '@/config/footer';
import { trackCasaEvent } from '@/lib/analytics/client';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import type { RegistrationExamCatalog } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { createExamRegistrationFormSchema } from '@/lib/validation/registration-submissions';

type RegistrationSchema = ReturnType<typeof createExamRegistrationFormSchema>;
type FormData = z.input<RegistrationSchema>;
type FormSubmissionData = z.output<RegistrationSchema>;

type ExamWizardProps = {
  catalog: RegistrationExamCatalog;
};

type ExamRegistrationApiResult = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
  confirmationSent?: boolean;
};
const FIELDS_BY_STEP: Array<Array<keyof FormData>> = [
  ['examTypeId', 'registrationType', 'examSessionId'],
  ['salutation', 'firstName', 'lastName', 'email', 'phone', 'nationality', 'birthDate'],
  [],
];

/** Element ids that differ from the field name, so a failed step can focus its first invalid field. */
const FIELD_ELEMENT_IDS: Partial<Record<keyof FormData, string>> = {
  examTypeId: 'exam-type',
  examSessionId: 'exam-session',
  registrationType: 'registration-type',
};

export function ExamWizard({ catalog }: ExamWizardProps) {
  const isDe = catalog.locale === 'de';
  const t = (en: string, de: string) => (isDe ? de : en);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // Messages follow the page, so a German form never shows an English error.
  const registrationSchema = useMemo(() => createExamRegistrationFormSchema(catalog.locale), [catalog.locale]);
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
  const stepFields = FIELDS_BY_STEP[step - 1] ?? [];
  const showStepAlert = stepFailures > 0 && stepFields.some((name) => errors[name]);
  const registrationTypeLabel =
    {
      full: t('Full exam', 'Vollprüfung'),
      written: t('Written only', 'Nur schriftlich'),
      oral: t('Oral only', 'Nur mündlich'),
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
      const response = await fetch('/api/registration/exam', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          examTypeLabel: selectedExamType?.name ?? '',
          examSessionLabel: selectedOption
            ? `${selectedOption.startsAtLabel} | ${selectedOption.locationLabel}`
            : '',
          locale: catalog.locale,
        }),
      });

      const result = (await response.json().catch(() => null)) as ExamRegistrationApiResult | null;
      if (!response.ok || result?.status !== 'accepted') {
        throw new Error(result?.message || t('Registration failed. Please try again.', 'Die Anmeldung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'));
      }

      setConfirmationSent(result?.confirmationSent === true);
      setSuccess(true);
      trackCasaEvent('form_success', {
        form: 'exam_registration',
        section: 'registration-exam',
        path: '/registration/exam',
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
      form: 'exam_registration',
      reason: 'step_validation',
      step: `step_${step}`,
      section: 'registration-exam',
      path: '/registration/exam',
      locale: catalog.locale,
    });
  };

  const prevStep = () => {
    stepChanged.current = true;
    setStepFailures(0);
    setStep((current) => Math.max(current - 1, 1));
  };



  return (
    <div className="flex flex-col" data-track-section="registration-exam">
      <div className="shrink-0 space-y-7 border-b border-[color:var(--casa-sand)] pb-7">
        <RegistrationTabs current="exam" locale={catalog.locale} />
        <RegistrationStepper steps={stepItems} step={step} locale={catalog.locale} />
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-7"
        noValidate
        data-casa-track-form="exam_registration"
      >
        <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <FormStepHeader
              icon={FileCheck2}
              meaning="exams"
              headingRef={stepHeadingRef}
              title={t('Choose your exam', 'Prüfung auswählen')}
              description={t(
                'Choose the exam first, then the date that fits your preparation.',
                'Wählen Sie zuerst die Prüfung und dann den Termin, der zu Ihrer Vorbereitung passt.'
              )}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className={formFieldGroupClassName}>
                <Label htmlFor="exam-type" className={formLabelClassName}>
                  {t('Exam type', 'Prüfungstyp')}
                  <RequiredMark />
                </Label>
                <Select
                  onValueChange={(value) => setValue('examTypeId', value, { shouldDirty: true, shouldValidate: true })}
                  defaultValue={watch('examTypeId')}
                >
                  <SelectTrigger id="exam-type" aria-required {...errorProps('examTypeId')} className={formControlClassName}>
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
                {errors.examTypeId && <p id="examTypeId-error" className={formErrorClassName}>{errors.examTypeId.message}</p>}
              </div>

              <div className={formFieldGroupClassName}>
                <Label htmlFor="registration-type" className={formLabelClassName}>
                  {t('Registration type', 'Anmeldeart')}
                  <RequiredMark />
                </Label>
                <Select
                  onValueChange={(value: 'full' | 'written' | 'oral') =>
                    setValue('registrationType', value, { shouldDirty: true, shouldValidate: true })
                  }
                  defaultValue={watch('registrationType')}
                >
                  <SelectTrigger id="registration-type" aria-required {...errorProps('registrationType')} className={formControlClassName}>
                    <SelectValue placeholder={t('Select type...', 'Anmeldeart auswählen...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{t('Full exam', 'Vollprüfung')}</SelectItem>
                    <SelectItem value="written">{t('Written only', 'Nur schriftlich')}</SelectItem>
                    <SelectItem value="oral">{t('Oral only', 'Nur mündlich')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.registrationType && <p id="registrationType-error" className={formErrorClassName}>{errors.registrationType.message}</p>}
              </div>
            </div>


            <div className={formFieldGroupClassName}>
              <Label htmlFor="exam-session" className={formLabelClassName}>
                {catalog.locale === 'de' ? 'Prüfungstermin' : 'Exam session'}
                <RequiredMark />
              </Label>
              <Select
                onValueChange={(value) => setValue('examSessionId', value, { shouldDirty: true, shouldValidate: true })}
                value={selectedExamSessionId}
              >
                <SelectTrigger id="exam-session" aria-required {...errorProps('examSessionId')} className={formControlClassName}>
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
                <p className={formHintClassName}>
                  {catalog.locale === 'de' ? 'Noch keine Termine für diesen Prüfungstyp verfügbar.' : 'No sessions published for this exam type yet. Please choose another exam type.'}
                </p>
              ) : null}
              {errors.examSessionId && <p id="examSessionId-error" className={formErrorClassName}>{errors.examSessionId.message}</p>}
            </div>

            {selectedOption ? (
              <div className="relative overflow-hidden rounded-2xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-5 sm:p-6">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--casa-ink-deep)]" />
                <p className={formMetaLabelClassName}>{t('Selected session', 'Ausgewählter Termin')}</p>
                <h3 className="mt-1 text-lg font-bold text-[var(--casa-ink)]">{selectedExamType?.name}</h3>
                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[color:var(--casa-sand)] pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className={formMetaLabelClassName}>{t('Date', 'Datum')}</dt>
                    <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption.startsAtLabel}</dd>
                  </div>
                  <div>
                    <dt className={formMetaLabelClassName}>{t('Location', 'Ort')}</dt>
                    <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption.locationLabel}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className={formMetaLabelClassName}>{t('Deadline', 'Frist')}</dt>
                    <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption.deadlineLabel}</dd>
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
              title={t('Personal information', 'Persönliche Angaben')}
              description={t('Your details must match your official ID exactly.', 'Ihre Angaben müssen exakt zu Ihrem amtlichen Ausweis passen.')}
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
              {t('CASA reviews your registration and confirms the exam details and deadlines by email.', 'CASA prüft Ihre Anmeldung und bestätigt Prüfungsdetails und Fristen per E-Mail.')}
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <FormStepHeader
              icon={ShieldCheck}
              meaning="orientation"
              headingRef={stepHeadingRef}
              title={t('Review and submit', 'Prüfen und absenden')}
              description={t('Please check your exam choice and your details.', 'Bitte prüfen Sie Ihre Prüfungsauswahl und Ihre Angaben.')}
            />

            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Exam', 'Prüfung')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedExamType?.name || '-'}</p>
                  <p className="mt-0.5 break-words text-[var(--casa-muted)]">{t('Mode', 'Art')}: {registrationTypeLabel}</p>
                </div>
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Session', 'Termin')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">{selectedOption?.startsAtLabel || '-'}</p>
                  <p className="mt-0.5 break-words text-[var(--casa-muted)]">{selectedOption?.locationLabel || '-'}</p>
                </div>
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Candidate', 'Kandidat:in')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {watch('salutation') && watch('salutation') !== 'neutral' ? (watch('salutation') === 'mr' ? (catalog.locale === 'de' ? 'Herr ' : 'Mr. ') : (watch('salutation') === 'ms' ? (catalog.locale === 'de' ? 'Frau ' : 'Ms. ') : 'Mx. ')) : ''}
                    {watch('firstName')} {watch('lastName')}
                  </p>
                  <p className="mt-0.5 break-words text-[var(--casa-muted)]">{watch('email')}</p>
                </div>
                <div className={formTileClassName}>
                  <p className={formMetaLabelClassName}>{t('Deadline', 'Frist')}</p>
                  <p className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {selectedOption?.deadlineLabel || '-'}
                  </p>
                </div>
              </div>

              <div className={formTileClassName}>
                <p className="font-semibold text-[var(--casa-ink)]">{t('Legal and next steps', 'Rechtliches und nächste Schritte')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed text-[var(--casa-muted)]">
                  <li>{t('By submitting, you agree to CASA terms and exam registration conditions.', 'Mit dem Absenden akzeptieren Sie die CASA AGB und Prüfungsbedingungen.')}</li>
                  <li>{t('Session access is confirmed after payment and candidate-data checks.', 'Der Termin wird nach Zahlungs- und Kandidatendatenprüfung bestätigt.')}</li>
                </ul>
              </div>

              <div className={cn(formTileClassName, 'space-y-4 bg-white')}>
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
              data-casa-label="Continue exam registration"
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
              aria-label={t('Close success modal', 'Bestätigung schließen')}
            >
              <span className="text-xl font-bold">✕</span>
            </button>

            <div className="rounded-full bg-[var(--casa-success-surface)] p-3 text-white shadow-[0_16px_34px_-24px_rgba(16,185,129,0.85)] mt-4">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>

            <h2 id="modal-title" className="text-2xl font-bold tracking-tight text-[var(--casa-ink)] mt-5">
              {catalog.locale === 'de' ? 'Prüfungsanfrage eingegangen' : 'Registration successful'}
            </h2>
            <p className="max-w-md text-sm text-[var(--casa-muted)] mt-2">
              {catalog.locale === 'de'
                ? 'Ihre Prüfungsanmeldung wird nun geprüft. Das CASA-Team meldet sich zeitnah per E-Mail bei Ihnen.'
                : 'Your candidate registration is received. CASA will contact you by email with confirmation and the next required steps.'}
            </p>
            {confirmationSent ? <p className="max-w-md text-sm font-medium text-[var(--casa-ink)] mt-2">{confirmationNotice(catalog.locale)}</p> : null}

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
