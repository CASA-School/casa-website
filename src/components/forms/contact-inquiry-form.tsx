'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  GraduationCap,
  Home,
  Loader2,
  MessageCircle,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';

import {
  formAlertClassName,
  formCardClassName,
  formControlClassName,
  formErrorClassName,
  formFieldGroupClassName,
  formHintClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
  formTextareaClassName,
  FormStepHeader,
  RequiredMark,
} from '@/components/forms/form-styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { trackCasaEvent } from '@/lib/analytics/client';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import {
  contactInquirySchema,
  isCompanyTopic,
  isOrganiserTopic,
  ORGANISER_CHOICES,
  organiserBriefFields,
  type OrganiserBriefField,
} from '@/lib/validation/contact';
import { organiserCopy, type OrganiserChoiceField, type OrganiserCopy } from '@/config/forms/organiser-brief-copy';

type ContactInquiryFormCopy = {
  formTitle: string;
  formBody: string;
  submit: string;
  submitting: string;
  firstNameLabel: string;
  firstNamePlaceholder: string;
  lastNameLabel: string;
  lastNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  topicLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  successTitle: string;
  successBody: string;
  sendAnother: string;
  errorTitle: string;
  errorBody: string;
};

type ContactTopicOption = {
  /** Stable topic id, e.g. `group-booking`. Submitted alongside the label. */
  key: string;
  label: string;
};

type ContactInquiryFormProps = {
  locale: ContentLocale;
  topics: readonly ContactTopicOption[];
  initialTopicKey?: string;
  copy: ContactInquiryFormCopy;
};

type ContactApiResult = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
  confirmationSent?: boolean;
};

const initialFields = {
  firstName: '',
  lastName: '',
  email: '',
  topic: '',
  message: '',
  website: '',
  // Organiser brief — rendered only for the group and company topics, and all
  // optional. See `organiserBriefFields` for which topic gets which.
  organisationName: '',
  groupSize: '',
  participantLevels: '',
  preferredDates: '',
  durationWeeks: '',
  weeklyLessons: '',
  languageFocus: '',
  invoicingParty: '',
  ageBand: '',
  accommodation: '',
  meals: '',
  transport: '',
  cultureProgramme: '',
  deliveryMode: '',
  schedulePreference: '',
};

/**
 * Each topic's icon in its logo colour (src/config/brand/meaning.ts): red for
 * the course formats, ink for exams, yellow for accommodation, blue for the
 * rest. A key the page adds later falls back to the blue speech bubble.
 */
const topicLook: Record<string, { icon: LucideIcon; meaning: Meaning }> = {
  'course-advice': { icon: GraduationCap, meaning: 'courses' },
  'exam-registration': { icon: FileCheck2, meaning: 'exams' },
  'accommodation-support': { icon: Home, meaning: 'arrival' },
  'group-booking': { icon: Users, meaning: 'courses' },
  'company-courses': { icon: Building2, meaning: 'courses' },
  other: { icon: MessageCircle, meaning: 'orientation' },
};
const fallbackTopicLook = { icon: MessageCircle, meaning: 'orientation' } as const;

/**
 * Option list for one choice field. `OrganiserCopy` already forces every allowed
 * value to have a label, so the widening here cannot hide a missing one.
 */
function choiceOptions(field: OrganiserChoiceField, copy: OrganiserCopy) {
  const labels: Record<string, string> = copy.options[field];

  return (ORGANISER_CHOICES[field] as readonly string[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

type BriefTextFieldProps = {
  id: OrganiserBriefField;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  /** Whole-number field. `max` mirrors the schema bound. */
  max?: number;
  onChange: (value: string) => void;
};

function BriefTextField({ id, label, value, placeholder, error, max, onChange }: BriefTextFieldProps) {
  const errorId = `${id}-error`;
  const numeric = typeof max === 'number';

  return (
    <div className={formFieldGroupClassName}>
      <label htmlFor={id} className={formLabelClassName}>
        {label}
      </label>
      <Input
        id={id}
        className={formControlClassName}
        value={value}
        placeholder={placeholder}
        type={numeric ? 'number' : 'text'}
        inputMode={numeric ? 'numeric' : undefined}
        min={numeric ? 1 : undefined}
        max={max}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className={formErrorClassName}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BriefSelectFieldProps = {
  id: OrganiserBriefField;
  label: string;
  placeholder: string;
  value: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  onChange: (value: string) => void;
};

function BriefSelectField({ id, label, placeholder, value, options, error, onChange }: BriefSelectFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={formFieldGroupClassName}>
      <label htmlFor={id} className={formLabelClassName}>
        {label}
      </label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={formControlClassName}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p id={errorId} className={formErrorClassName}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContactInquiryForm({ locale, topics, initialTopicKey, copy }: ContactInquiryFormProps) {
  const topicOptions = useMemo(() => topics.filter((option) => option.key && option.label), [topics]);
  const preferredTopic = useMemo(() => {
    if (!topicOptions.length) {
      return '';
    }

    if (initialTopicKey && topicOptions.some((option) => option.key === initialTopicKey)) {
      return initialTopicKey;
    }

    return topicOptions[0].key;
  }, [initialTopicKey, topicOptions]);

  const [fields, setFields] = useState(() => ({
    ...initialFields,
    topic: preferredTopic,
  }));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof initialFields, string>>>({});
  const [briefOpen, setBriefOpen] = useState(false);
  const messageLength = fields.message.trim().length;

  const activeTopicKey = fields.topic || preferredTopic;
  const activeTopicLabel = topicOptions.find((option) => option.key === activeTopicKey)?.label ?? '';
  const briefCopy = organiserCopy[locale];
  const showBrief = isOrganiserTopic(activeTopicKey);
  const showCompanyFields = isCompanyTopic(activeTopicKey);
  const briefLegend = showCompanyFields ? briefCopy.legendCompany : briefCopy.legendGroup;

  const setField = (name: OrganiserBriefField, value: string) => {
    setFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFields({
      ...initialFields,
      topic: preferredTopic,
    });
    setBriefOpen(false);
    setStatus('idle');
    setFeedbackMessage('');
    setFieldErrors({});
    setRequestId(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    const form = event.currentTarget;
    setStatus('submitting');
    setFeedbackMessage('');
    setRequestId(null);
    setFieldErrors({});

    // Only the brief fields that belong to the selected topic travel with the
    // request, so switching topic mid-form cannot leak stale answers.
    const brief = Object.fromEntries(
      organiserBriefFields(activeTopicKey).map((name) => [name, fields[name]])
    );

    const payload = {
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      message: fields.message,
      website: fields.website,
      topic: activeTopicLabel,
      topicKey: activeTopicKey,
      locale,
      source: 'contact-page',
      ...brief,
    };

    const parsed = contactInquirySchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof typeof initialFields, string>> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof initialFields | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = locale === 'de'
            ? ({
                firstName: 'Bitte gib deinen Vornamen an (mindestens 2 Zeichen).',
                email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
                message: 'Bitte schreib uns eine kurze Nachricht (12–3000 Zeichen).',
                topic: 'Bitte wähle ein Thema aus.',
              } as Partial<Record<keyof typeof initialFields, string>>)[key] ?? 'Bitte prüfe diese Angabe.'
            : ({
                firstName: 'Please enter your first name (at least 2 characters).',
                email: 'Please enter a valid email address.',
                message: 'Please write us a short message (12–3,000 characters).',
                topic: 'Please choose a topic.',
              } as Partial<Record<keyof typeof initialFields, string>>)[key] ?? issue.message;
        }
      }

      setFieldErrors(nextErrors);
      setFeedbackMessage(Object.values(nextErrors)[0] || copy.errorBody);
      requestAnimationFrame(() => {
        const firstInvalid = Object.keys(nextErrors)[0];
        form.querySelector<HTMLElement>(`[id="${firstInvalid}"]`)?.focus();
      });
      setStatus('error');
      trackCasaEvent('form_error', {
        form: 'contact_inquiry',
        reason: 'validation',
        step: 'submit',
        section: 'contact-form',
        locale,
        path: '/contact',
      });
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      });

      const result = (await response.json()) as ContactApiResult;

      if (!response.ok || result.status !== 'accepted') {
        throw new Error(result.message || copy.errorBody);
      }

      setFeedbackMessage(result.message || copy.successBody);
      setRequestId(result.requestId || null);
      setConfirmationSent(result.confirmationSent === true);
      setStatus('success');
      setFields({
        ...initialFields,
        topic: preferredTopic,
      });
      trackCasaEvent('form_success', {
        form: 'contact_inquiry',
        section: 'contact-form',
        locale,
        path: '/contact',
      });
      return;
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : copy.errorBody);
      setStatus('error');
      trackCasaEvent('form_error', {
        form: 'contact_inquiry',
        reason: 'request_failed',
        step: 'submit',
        section: 'contact-form',
        locale,
        path: '/contact',
      });
    }
  };

  return (
    <section
      id="contact-form-panel"
      data-track-section="contact-form"
      className={formCardClassName}
    >
      <div className="mb-8">
        <FormStepHeader icon={MessageCircle} meaning="orientation" title={copy.formTitle} description={copy.formBody} />
      </div>

      {status === 'success' ? (
        <div className="rounded-2xl border border-[color:var(--casa-success-surface)]/25 bg-[var(--casa-success-surface)]/[0.06] p-5 sm:p-6" role="status" aria-live="polite">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--casa-success-surface)] text-white">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-[var(--casa-success-text)]">{copy.successTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--casa-ink)]">{feedbackMessage || copy.successBody}</p>
              {confirmationSent ? <p className="mt-1 text-sm leading-relaxed text-[var(--casa-ink)]">{confirmationNotice(locale)}</p> : null}
              {requestId ? (
                <p className="mt-3 text-xs font-medium text-[var(--casa-muted)]">
                  {locale === 'de' ? 'Deine Referenz' : 'Your reference'}: <span className="break-all font-mono">{requestId}</span>
                </p>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="outline" className={cn(formSecondaryButtonClassName, 'mt-5')} onClick={resetForm}>
            {copy.sendAnother}
          </Button>
        </div>
      ) : (
        <form
          id="contact-form-submit"
          className="grid gap-x-5 gap-y-6 sm:grid-cols-2"
          onSubmit={submit}
          noValidate
          data-casa-track-form="contact_inquiry"
        >
          <div className={formFieldGroupClassName}>
            <label htmlFor="firstName" className={formLabelClassName}>
              {copy.firstNameLabel}<RequiredMark />
            </label>
            <Input
              required
              id="firstName"
              autoComplete="given-name"
              className={formControlClassName}
              value={fields.firstName}
              placeholder={copy.firstNamePlaceholder}
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
            />
            {fieldErrors.firstName ? <p id="firstName-error" className={formErrorClassName}>{fieldErrors.firstName}</p> : null}
          </div>

          <div className={formFieldGroupClassName}>
            <label htmlFor="lastName" className={formLabelClassName}>
              {copy.lastNameLabel}
            </label>
            <Input
              id="lastName"
              autoComplete="family-name"
              className={formControlClassName}
              value={fields.lastName}
              placeholder={copy.lastNamePlaceholder}
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
            />
            {fieldErrors.lastName ? <p id="lastName-error" className={formErrorClassName}>{fieldErrors.lastName}</p> : null}
          </div>

          <div className={cn(formFieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="email" className={formLabelClassName}>
              {copy.emailLabel}<RequiredMark />
            </label>
            <Input
              required
              id="email"
              autoComplete="email"
              type="email"
              inputMode="email"
              className={formControlClassName}
              value={fields.email}
              placeholder={copy.emailPlaceholder}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
            {fieldErrors.email ? <p id="email-error" className={formErrorClassName}>{fieldErrors.email}</p> : null}
          </div>

          {/*
            The topic as six chips, not a dropdown: the choice is the first thing
            the form asks, and a closed select hid the six answers behind a click.
            Native radios, so arrow keys move between them and the browser
            announces "1 of 6".
          */}
          <fieldset id="topic" tabIndex={-1} className={cn(formFieldGroupClassName, 'min-w-0 sm:col-span-2')}>
            <legend className={cn(formLabelClassName, 'mb-2')}>
              {copy.topicLabel}<RequiredMark />
            </legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {topicOptions.map((option) => {
                const look = topicLook[option.key] ?? fallbackTopicLook;
                const TopicIcon = look.icon;
                const checked = activeTopicKey === option.key;

                return (
                  <label
                    key={option.key}
                    className={cn(
                      'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold leading-snug text-[var(--casa-ink)] transition-[border-color,background-color,box-shadow] duration-150',
                      'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--casa-blue)]/20',
                      checked
                        ? 'border-[var(--casa-accent-text)] bg-[var(--casa-blue-tint)]/45 shadow-[inset_0_0_0_1px_var(--casa-accent-text)]'
                        : 'border-[color:var(--casa-sand)] shadow-[var(--shadow-soft)] hover:border-[color:var(--casa-field-edge-hover)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="topic"
                      value={option.key}
                      checked={checked}
                      disabled={status === 'submitting'}
                      onChange={() =>
                        setFields((current) => ({
                          ...current,
                          topic: option.key,
                        }))
                      }
                      className="sr-only"
                    />
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', meaningClasses[look.meaning].circle)}>
                      <TopicIcon className="size-[1.125rem]" aria-hidden />
                    </span>
                    <span className="min-w-0">{option.label}</span>
                    {checked ? <CheckCircle2 className="ml-auto size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden /> : null}
                  </label>
                );
              })}
            </div>
            {fieldErrors.topic ? <p className={formErrorClassName}>{fieldErrors.topic}</p> : null}
          </fieldset>

          {/*
            Organiser brief. The live region is always mounted so that swapping
            the topic announces the new block instead of it appearing silently.
          */}
          <p className="sr-only" role="status">
            {showBrief ? (showCompanyFields ? briefCopy.announcementCompany : briefCopy.announcementGroup) : ''}
          </p>

          {showBrief ? (
            <details
              className="group sm:col-span-2 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] open:bg-white"
              open={briefOpen || organiserBriefFields(activeTopicKey).some(name => Boolean(fieldErrors[name]))}
              onToggle={event => setBriefOpen(event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-[var(--casa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)] [&::-webkit-details-marker]:hidden">
                {locale === 'de' ? 'Weitere Angaben ergänzen (optional)' : 'Add a few details (optional)'}
                <ChevronDown className="size-4 shrink-0 text-[var(--casa-accent-text)] transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <fieldset className="border-t border-[color:var(--casa-sand)] px-4 pb-5 pt-4">

              <legend className="sr-only">
                {briefLegend}
              </legend>
              <p className={formHintClassName}>{briefCopy.intro}</p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <BriefTextField
                  id="organisationName"
                  label={briefCopy.labels.organisationName}
                  placeholder={briefCopy.placeholders.organisationName}
                  value={fields.organisationName}
                  error={fieldErrors.organisationName}
                  onChange={(value) => setField('organisationName', value)}
                />
                <BriefTextField
                  id="groupSize"
                  label={briefCopy.labels.groupSize}
                  value={fields.groupSize}
                  error={fieldErrors.groupSize}
                  max={500}
                  onChange={(value) => setField('groupSize', value)}
                />
                <BriefTextField
                  id="participantLevels"
                  label={briefCopy.labels.participantLevels}
                  placeholder={briefCopy.placeholders.participantLevels}
                  value={fields.participantLevels}
                  error={fieldErrors.participantLevels}
                  onChange={(value) => setField('participantLevels', value)}
                />
                <BriefTextField
                  id="preferredDates"
                  label={briefCopy.labels.preferredDates}
                  placeholder={briefCopy.placeholders.preferredDates}
                  value={fields.preferredDates}
                  error={fieldErrors.preferredDates}
                  onChange={(value) => setField('preferredDates', value)}
                />
                <BriefTextField
                  id="durationWeeks"
                  label={briefCopy.labels.durationWeeks}
                  value={fields.durationWeeks}
                  error={fieldErrors.durationWeeks}
                  max={52}
                  onChange={(value) => setField('durationWeeks', value)}
                />
                <BriefTextField
                  id="weeklyLessons"
                  label={briefCopy.labels.weeklyLessons}
                  value={fields.weeklyLessons}
                  error={fieldErrors.weeklyLessons}
                  max={40}
                  onChange={(value) => setField('weeklyLessons', value)}
                />
                <BriefSelectField
                  id="languageFocus"
                  label={briefCopy.labels.languageFocus}
                  placeholder={briefCopy.selectPlaceholder}
                  value={fields.languageFocus}
                  options={choiceOptions('languageFocus', briefCopy)}
                  error={fieldErrors.languageFocus}
                  onChange={(value) => setField('languageFocus', value)}
                />
                <BriefSelectField
                  id="invoicingParty"
                  label={briefCopy.labels.invoicingParty}
                  placeholder={briefCopy.selectPlaceholder}
                  value={fields.invoicingParty}
                  options={choiceOptions('invoicingParty', briefCopy)}
                  error={fieldErrors.invoicingParty}
                  onChange={(value) => setField('invoicingParty', value)}
                />

                {showCompanyFields ? (
                  <>
                    <BriefSelectField
                      id="deliveryMode"
                      label={briefCopy.labels.deliveryMode}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.deliveryMode}
                      options={choiceOptions('deliveryMode', briefCopy)}
                      error={fieldErrors.deliveryMode}
                      onChange={(value) => setField('deliveryMode', value)}
                    />
                    <BriefSelectField
                      id="schedulePreference"
                      label={briefCopy.labels.schedulePreference}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.schedulePreference}
                      options={choiceOptions('schedulePreference', briefCopy)}
                      error={fieldErrors.schedulePreference}
                      onChange={(value) => setField('schedulePreference', value)}
                    />
                  </>
                ) : (
                  <>
                    <BriefSelectField
                      id="ageBand"
                      label={briefCopy.labels.ageBand}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.ageBand}
                      options={choiceOptions('ageBand', briefCopy)}
                      error={fieldErrors.ageBand}
                      onChange={(value) => setField('ageBand', value)}
                    />
                    <BriefSelectField
                      id="accommodation"
                      label={briefCopy.labels.accommodation}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.accommodation}
                      options={choiceOptions('accommodation', briefCopy)}
                      error={fieldErrors.accommodation}
                      onChange={(value) => setField('accommodation', value)}
                    />
                    <BriefSelectField
                      id="meals"
                      label={briefCopy.labels.meals}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.meals}
                      options={choiceOptions('meals', briefCopy)}
                      error={fieldErrors.meals}
                      onChange={(value) => setField('meals', value)}
                    />
                    <BriefSelectField
                      id="transport"
                      label={briefCopy.labels.transport}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.transport}
                      options={choiceOptions('transport', briefCopy)}
                      error={fieldErrors.transport}
                      onChange={(value) => setField('transport', value)}
                    />
                    <BriefSelectField
                      id="cultureProgramme"
                      label={briefCopy.labels.cultureProgramme}
                      placeholder={briefCopy.selectPlaceholder}
                      value={fields.cultureProgramme}
                      options={choiceOptions('cultureProgramme', briefCopy)}
                      error={fieldErrors.cultureProgramme}
                      onChange={(value) => setField('cultureProgramme', value)}
                    />
                  </>
                )}
              </div>
              </fieldset>
            </details>
          ) : null}

          <div className={cn(formFieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="message" className={formLabelClassName}>
              {copy.messageLabel}<RequiredMark />
            </label>
            
            <Textarea
              required
              id="message"
              rows={5}
              maxLength={3000}
              className={formTextareaClassName}
              value={fields.message}
              placeholder={copy.messagePlaceholder}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'message-error' : undefined}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
            />
            <div className="flex items-center justify-between">
              {fieldErrors.message ? <p id="message-error" className={formErrorClassName}>{fieldErrors.message}</p> : <div />}
              {messageLength >= 2700 && <p className="text-xs text-[var(--casa-muted)]">
                {messageLength}/3000
              </p>}
            </div>
          </div>

          <input
            type="text"
            className="hidden"
            value={fields.website}
            tabIndex={-1}
            autoComplete="off"
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                website: event.target.value,
              }))
            }
            aria-hidden="true"
          />

          <div className="flex flex-col gap-5 border-t border-[color:var(--casa-sand)] pt-6 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-relaxed text-[var(--casa-muted)]">
              {locale === 'de' ? '* Pflichtfelder. Wie wir deine Daten verarbeiten, erfährst du in unserer ' : '* Required fields. Read how we handle your information in our '}
              <Link href="/privacy" className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current">{locale === 'de' ? 'Datenschutzerklärung' : 'privacy policy'}</Link>.
            </p>
            <Button
              type="submit"
              disabled={status === 'submitting'}
              className={cn(formPrimaryButtonClassName, 'w-full shrink-0 sm:w-auto')}
              data-casa-track="true"
              data-casa-label={copy.submit}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                <>
                  {copy.submit}
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {status === 'error' ? (
        <div className={cn(formAlertClassName, 'mt-5 flex items-start gap-2')} role="alert" aria-live="assertive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{copy.errorTitle}</p>
            <p className="mt-0.5">{feedbackMessage || copy.errorBody}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
