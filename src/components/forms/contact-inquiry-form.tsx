'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { trackCasaEvent } from '@/lib/analytics/client';
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
  topicPlaceholder: string;
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

const fieldGroupClassName = 'space-y-1.5';
const inputClassName =
  'h-12 data-[size=default]:h-12 rounded-lg border border-[color:var(--casa-muted)] bg-white px-3.5 text-base md:text-base text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] shadow-none transition-colors focus-visible:border-[var(--casa-accent-text)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/25 focus-visible:ring-offset-0';
const labelTextClassName = 'block text-sm font-semibold text-[var(--casa-ink)]';

type OrganiserChoiceField = keyof typeof ORGANISER_CHOICES;

type OrganiserCopy = {
  legendGroup: string;
  legendCompany: string;
  intro: string;
  announcementGroup: string;
  announcementCompany: string;
  selectPlaceholder: string;
  labels: Record<OrganiserBriefField, string>;
  placeholders: Partial<Record<OrganiserBriefField, string>>;
  options: {
    [Field in OrganiserChoiceField]: Record<(typeof ORGANISER_CHOICES)[Field][number], string>;
  };
};

/**
 * Copy for the organiser brief. It lives here rather than in the page's `copy`
 * prop because it is one self-contained block, and the form already carries
 * locale-conditional copy (prompt ideas, next steps).
 */
const organiserCopy: Record<ContentLocale, OrganiserCopy> = {
  en: {
    legendGroup: 'Group enquiry details',
    legendCompany: 'Company training details',
    intro:
      'Every field below is optional — send what you already know and we will fill in the rest by email. This is a non-binding enquiry, not a quotation.',
    announcementGroup: 'Group enquiry details added below. All of these fields are optional.',
    announcementCompany: 'Company training details added below. All of these fields are optional.',
    selectPlaceholder: 'Optional — select if known',
    labels: {
      organisationName: 'Organisation or company',
      groupSize: 'Number of participants',
      participantLevels: 'Current German level(s)',
      preferredDates: 'Preferred dates',
      durationWeeks: 'Length in weeks',
      weeklyLessons: 'Lessons per week (UE, 45 minutes each)',
      languageFocus: 'Language focus',
      invoicingParty: 'Who receives the invoice?',
      ageBand: 'Age group',
      accommodation: 'Accommodation',
      meals: 'Meals',
      transport: 'Public transport pass',
      cultureProgramme: 'Culture programme',
      deliveryMode: 'Where the course should take place',
      schedulePreference: 'Preferred time of day',
    },
    placeholders: {
      organisationName: 'Gymnasium Beispiel / Example GmbH',
      participantLevels: 'Mixed A2-B1, or not tested yet',
      preferredDates: 'Second half of July',
    },
    options: {
      languageFocus: {
        general: 'General German',
        'exam-preparation': 'Exam preparation',
        business: 'Workplace and business German',
        academic: 'Academic or university preparation',
        technical: 'Sector-specific vocabulary',
        undecided: 'Not decided yet',
      },
      invoicingParty: {
        organisation: 'Our organisation',
        'public-funder': 'A public body or funding programme',
        participants: 'Each participant pays individually',
        undecided: 'Not decided yet',
      },
      ageBand: {
        'under-14': 'Under 14',
        '14-17': '14-17',
        '18-25': '18-25',
        '26-plus': '26 and older',
        mixed: 'Mixed ages',
      },
      accommodation: {
        'not-needed': 'Not needed',
        double: 'Host family, double room',
        single: 'Host family, single room',
        undecided: 'Not decided yet',
      },
      meals: {
        'not-needed': 'Not needed',
        'half-board': 'Half board with the host family',
        'half-board-plus-canteen': 'Half board plus lunch at the canteen',
        undecided: 'Not decided yet',
      },
      transport: {
        'not-needed': 'Not needed',
        weekly: 'Weekly pass',
        monthly: 'Monthly pass',
        undecided: 'Not decided yet',
      },
      cultureProgramme: {
        'not-needed': 'Not needed',
        small: 'Compact',
        medium: 'Standard',
        large: 'Full programme',
        undecided: 'Not decided yet',
      },
      deliveryMode: {
        'on-site': 'At our own premises',
        'at-casa': 'At CASA in Bremen',
        online: 'Online',
        undecided: 'Not decided yet',
      },
      schedulePreference: {
        mornings: 'Mornings',
        midday: 'Midday',
        afternoons: 'Afternoons',
        evenings: 'Evenings',
        undecided: 'Not decided yet',
      },
    },
  },
  de: {
    legendGroup: 'Angaben zur Gruppenanfrage',
    legendCompany: 'Angaben zum Firmenunterricht',
    intro:
      'Alle Felder unten sind optional — senden Sie, was Sie bereits wissen, den Rest klären wir per E-Mail. Dies ist eine unverbindliche Anfrage, kein Angebot.',
    announcementGroup: 'Angaben zur Gruppenanfrage wurden ergänzt. Alle Felder sind optional.',
    announcementCompany: 'Angaben zum Firmenunterricht wurden ergänzt. Alle Felder sind optional.',
    selectPlaceholder: 'Optional — falls bekannt',
    labels: {
      organisationName: 'Organisation oder Unternehmen',
      groupSize: 'Anzahl der Teilnehmenden',
      participantLevels: 'Aktuelles Deutschniveau',
      preferredDates: 'Wunschzeitraum',
      durationWeeks: 'Dauer in Wochen',
      weeklyLessons: 'Unterrichtseinheiten pro Woche (UE à 45 Minuten)',
      languageFocus: 'Sprachlicher Schwerpunkt',
      invoicingParty: 'Wer erhält die Rechnung?',
      ageBand: 'Altersgruppe',
      accommodation: 'Unterkunft',
      meals: 'Verpflegung',
      transport: 'ÖPNV-Ticket',
      cultureProgramme: 'Kulturprogramm',
      deliveryMode: 'Wo der Unterricht stattfinden soll',
      schedulePreference: 'Bevorzugte Tageszeit',
    },
    placeholders: {
      organisationName: 'Gymnasium Beispiel / Beispiel GmbH',
      participantLevels: 'Gemischt A2-B1 oder noch nicht getestet',
      preferredDates: 'Zweite Julihälfte',
    },
    options: {
      languageFocus: {
        general: 'Allgemeines Deutsch',
        'exam-preparation': 'Prüfungsvorbereitung',
        business: 'Berufs- und Arbeitsplatzdeutsch',
        academic: 'Studienvorbereitung',
        technical: 'Fachwortschatz',
        undecided: 'Noch offen',
      },
      invoicingParty: {
        organisation: 'Unsere Organisation',
        'public-funder': 'Öffentlicher Träger oder Förderprogramm',
        participants: 'Jede Person zahlt selbst',
        undecided: 'Noch offen',
      },
      ageBand: {
        'under-14': 'Unter 14',
        '14-17': '14-17',
        '18-25': '18-25',
        '26-plus': '26 und älter',
        mixed: 'Gemischte Altersgruppen',
      },
      accommodation: {
        'not-needed': 'Nicht nötig',
        double: 'Gastfamilie, Doppelzimmer',
        single: 'Gastfamilie, Einzelzimmer',
        undecided: 'Noch offen',
      },
      meals: {
        'not-needed': 'Nicht nötig',
        'half-board': 'Halbpension in der Gastfamilie',
        'half-board-plus-canteen': 'Halbpension plus Mittagessen in der Kantine',
        undecided: 'Noch offen',
      },
      transport: {
        'not-needed': 'Nicht nötig',
        weekly: 'Wochenticket',
        monthly: 'Monatsticket',
        undecided: 'Noch offen',
      },
      cultureProgramme: {
        'not-needed': 'Nicht nötig',
        small: 'Kompakt',
        medium: 'Standard',
        large: 'Volles Programm',
        undecided: 'Noch offen',
      },
      deliveryMode: {
        'on-site': 'In unseren eigenen Räumen',
        'at-casa': 'Bei CASA in Bremen',
        online: 'Online',
        undecided: 'Noch offen',
      },
      schedulePreference: {
        mornings: 'Vormittags',
        midday: 'Mittags',
        afternoons: 'Nachmittags',
        evenings: 'Abends',
        undecided: 'Noch offen',
      },
    },
  },
};

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
    <div className={fieldGroupClassName}>
      <label htmlFor={id} className={labelTextClassName}>
        {label}
      </label>
      <Input
        id={id}
        className={inputClassName}
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
        <p id={errorId} className="text-xs text-[var(--casa-danger-text)] mt-1">
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
    <div className={fieldGroupClassName}>
      <label htmlFor={id} className={labelTextClassName}>
        {label}
      </label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            inputClassName,
            'w-full flex items-center justify-between text-left',
            error && 'border-[color:var(--casa-danger-surface)]/45 focus-visible:ring-[var(--casa-danger-surface)]/25'
          )}
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
        <p id={errorId} className="text-xs text-[var(--casa-danger-text)] mt-1">
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
                firstName: 'Bitte geben Sie Ihren Vornamen an (mindestens 2 Zeichen).',
                email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
                message: 'Bitte schreiben Sie eine kurze Nachricht (12–3000 Zeichen).',
                topic: 'Bitte wählen Sie ein Thema aus.',
              } as Partial<Record<keyof typeof initialFields, string>>)[key] ?? 'Bitte prüfen Sie diese Angabe.'
            : issue.message;
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
      className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-5 sm:p-8 lg:p-10"
    >

      <div className="mb-7">
        <h2 className="text-2xl font-bold text-[var(--casa-ink)] md:text-3xl">{copy.formTitle}</h2>
        <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{copy.formBody}</p>
      </div>

      {status === 'success' ? (
        <div className="space-y-5 border-t border-[color:var(--casa-sand)] pt-6" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--casa-success-surface)] text-white">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-base font-bold text-[var(--casa-success-text)]">{copy.successTitle}</p>
              <p className="mt-1 text-sm text-[var(--casa-success-text)]">{feedbackMessage || copy.successBody}</p>
              {requestId ? (
                <p className="mt-2 text-xs font-medium text-[var(--casa-success-text)]">
                  {locale === 'de' ? 'Ihre Referenz' : 'Your reference'}: <span className="break-all font-mono">{requestId}</span>
                </p>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="outline" className="border-[color:var(--casa-success-surface)]/40 bg-white" onClick={resetForm}>
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
          <div className={fieldGroupClassName}>
            <label htmlFor="firstName" className={labelTextClassName}>
              {copy.firstNameLabel} <span className="text-[var(--casa-coral-text)]">*</span>
            </label>
            <Input
              required
              id="firstName"
              autoComplete="given-name"
              className={inputClassName}
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
            {fieldErrors.firstName ? <p id="firstName-error" className="text-xs text-[var(--casa-danger-text)] mt-1">{fieldErrors.firstName}</p> : null}
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="lastName" className={labelTextClassName}>
              {copy.lastNameLabel}
            </label>
            <Input
              id="lastName"
              autoComplete="family-name"
              className={inputClassName}
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
            {fieldErrors.lastName ? <p id="lastName-error" className="text-xs text-[var(--casa-danger-text)] mt-1">{fieldErrors.lastName}</p> : null}
          </div>

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="email" className={labelTextClassName}>
              {copy.emailLabel} <span className="text-[var(--casa-coral-text)]">*</span>
            </label>
            <Input
              required
              id="email"
              autoComplete="email"
              type="email"
              inputMode="email"
              className={inputClassName}
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
            {fieldErrors.email ? <p id="email-error" className="text-xs text-[var(--casa-danger-text)] mt-1">{fieldErrors.email}</p> : null}
          </div>

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="topic" className={labelTextClassName}>
              {copy.topicLabel} <span className="text-[var(--casa-coral-text)]">*</span>
            </label>
            <Select
              value={fields.topic || undefined}
              onValueChange={(value) =>
                setFields((current) => ({
                  ...current,
                  topic: value,
                }))
              }
            >
              <SelectTrigger
                id="topic"
                aria-label={copy.topicLabel}
                disabled={topicOptions.length === 0}
                className={cn(
                  inputClassName,
                  'w-full flex items-center justify-between text-left',
                  fieldErrors.topic && 'border-[color:var(--casa-danger-surface)]/45 focus-visible:ring-[var(--casa-danger-surface)]/25'
                )}
              >
                <SelectValue placeholder={copy.topicPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {topicOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.topic ? <p className="text-xs text-[var(--casa-danger-text)] mt-1">{fieldErrors.topic}</p> : null}
          </div>

          {/*
            Organiser brief. The live region is always mounted so that swapping
            the topic announces the new block instead of it appearing silently.
          */}
          <p className="sr-only" role="status">
            {showBrief ? (showCompanyFields ? briefCopy.announcementCompany : briefCopy.announcementGroup) : ''}
          </p>

          {showBrief ? (
            <details
              className="sm:col-span-2 border-y border-[color:var(--casa-sand)] py-4"
              open={briefOpen || organiserBriefFields(activeTopicKey).some(name => Boolean(fieldErrors[name]))}
              onToggle={event => setBriefOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-semibold text-[var(--casa-ink)] focus-visible:outline-2 focus-visible:outline-[var(--casa-blue)]">
                {locale === 'de' ? 'Weitere Angaben ergänzen (optional)' : 'Add a few details (optional)'}
              </summary>
              <fieldset className="mt-5">

              <legend className="sr-only">
                {briefLegend}
              </legend>
              <p className="mt-1 text-xs leading-relaxed text-[var(--casa-muted)]">{briefCopy.intro}</p>

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

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="message" className={labelTextClassName}>
              {copy.messageLabel} <span className="text-[var(--casa-coral-text)]">*</span>
            </label>
            
            <Textarea
              required
              id="message"
              rows={5}
              maxLength={3000}
              className={cn(
                inputClassName,
                'min-h-[140px] py-3 resize-y'
              )}
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
            <div className="flex justify-between items-center mt-1">
              {fieldErrors.message ? <p id="message-error" className="text-xs text-[var(--casa-danger-text)]">{fieldErrors.message}</p> : <div />}
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

          <div className="sm:col-span-2 flex flex-col gap-4 border-t border-[color:var(--casa-sand)] pt-6">
            <p className="text-xs leading-relaxed text-[var(--casa-muted)]">
              {locale === 'de' ? '* Pflichtfelder. Wie wir Ihre Daten verarbeiten, erfahren Sie in unseren ' : '* Required fields. Read how we handle your information in our '}
              <Link href="/privacy" className="underline underline-offset-4">{locale === 'de' ? 'Datenschutzhinweisen' : 'privacy notice'}</Link>.
            </p>
            <Button
              type="submit"
              variant="default"
              disabled={status === 'submitting'}
              className="h-12 w-full rounded-lg bg-[var(--casa-ink-deep)] px-7 font-semibold text-white sm:w-auto sm:self-start"
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
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[color:var(--casa-danger-surface)]/30 bg-[var(--casa-danger-surface)]/5 px-4 py-3 text-sm text-[var(--casa-danger-text)]" role="alert" aria-live="assertive">
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
