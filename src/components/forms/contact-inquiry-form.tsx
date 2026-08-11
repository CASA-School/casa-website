'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { NextStepsTimeline } from '@/components/sections';
import { trackCasaEvent } from '@/lib/analytics/client';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';
import { contactInquirySchema } from '@/lib/validation/contact';

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

type ContactInquiryFormProps = {
  locale: ContentLocale;
  topics: readonly string[];
  initialTopic?: string;
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
};

const fieldGroupClassName = 'space-y-1.5';
const inputClassName =
  'h-11 data-[size=default]:h-11 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';
const labelTextClassName = 'block text-xs font-black uppercase tracking-[0.12em] text-slate-700';

export function ContactInquiryForm({ locale, topics, initialTopic, copy }: ContactInquiryFormProps) {
  const promptIdeas =
    locale === 'de'
      ? [
          'Ich suche einen Intensivkurs und brauche ein Startdatum.',
          'Ich bin unsicher zwischen Abendkurs und Intensivkurs.',
          'Ich möchte mich für eine telc-Prüfung anmelden.',
          'Ich benötige Hilfe bei Unterkunft in Bremen.',
        ]
      : [
          'I need an intensive course and the next available start date.',
          'I am deciding between evening and intensive format.',
          'I want to register for a telc exam and need deadlines.',
          'I need accommodation support in Bremen.',
        ];

  const normalizedTopicList = useMemo(() => topics.filter(Boolean), [topics]);
  const preferredTopic = useMemo(() => {
    if (!normalizedTopicList.length) {
      return '';
    }

    if (initialTopic && normalizedTopicList.includes(initialTopic)) {
      return initialTopic;
    }

    return normalizedTopicList[0];
  }, [initialTopic, normalizedTopicList]);

  const [fields, setFields] = useState(() => ({
    ...initialFields,
    topic: preferredTopic,
  }));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof initialFields, string>>>({});
  const messageLength = fields.message.trim().length;

  const addPromptIdea = (value: string) => {
    setFields((current) => {
      const nextMessage = current.message.trim()
        ? `${current.message.trim()}\n\n${value}`
        : value;

      return {
        ...current,
        message: nextMessage,
      };
    });
  };

  const resetForm = () => {
    setFields({
      ...initialFields,
      topic: preferredTopic,
    });
    setStatus('idle');
    setFeedbackMessage('');
    setFieldErrors({});
    setRequestId(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setFeedbackMessage('');
    setRequestId(null);
    setFieldErrors({});

    const payload = {
      ...fields,
      topic: fields.topic || preferredTopic || '',
      locale,
      source: 'contact-page',
    };

    const parsed = contactInquirySchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof typeof initialFields, string>> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof initialFields | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      setFeedbackMessage(parsed.error.issues[0]?.message || copy.errorBody);
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
      className="relative overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] p-6 shadow-[var(--shadow-card)] sm:p-10"
    >

      <div className="mb-8 border-b border-slate-100 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          {locale === 'de' ? 'CASA-Beratung' : 'CASA admissions'}
        </div>
        <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--casa-ink)] md:text-3xl">{copy.formTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{copy.formBody}</p>
      </div>

      {status === 'success' ? (
        <div className="space-y-4 rounded-3xl border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)] p-6 shadow-[0_20px_45px_-36px_rgba(16,185,129,0.7)]" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-base font-bold text-emerald-900">{copy.successTitle}</p>
              <p className="mt-1 text-sm text-emerald-800">{feedbackMessage || copy.successBody}</p>
              {requestId ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Request ID: <span className="font-mono">{requestId}</span>
                </p>
              ) : null}
            </div>
          </div>
          <NextStepsTimeline
            title={locale === 'de' ? 'Was als Nächstes passiert' : 'What happens next'}
            steps={
              locale === 'de'
                ? [
                    { title: 'Teamprüfung', description: 'Wir prüfen Ihre Anfrage und priorisieren nach Thema.' },
                    { title: 'Rückmeldung', description: 'Sie erhalten eine Antwort meist innerhalb eines Werktags.' },
                    { title: 'Nächster Schritt', description: 'Wir senden eine klare Empfehlung zu Kurs, Prüfung oder Unterkunft.' },
                  ]
                : [
                    { title: 'Team review', description: 'Our team reviews your request and prioritizes by topic.' },
                    { title: 'Reply', description: 'You usually receive a response within one business day.' },
                    { title: 'Next action', description: 'We send a clear recommendation for course, exam, or accommodation.' },
                  ]
            }
            className="border-emerald-200/90"
          />
          <Button type="button" variant="outline" className="border-emerald-300 bg-white" onClick={resetForm}>
            {copy.sendAnother}
          </Button>
        </div>
      ) : (
        <form
          id="contact-form-submit"
          className="grid gap-6 sm:grid-cols-2"
          onSubmit={submit}
          noValidate
          data-casa-track-form="contact_inquiry"
        >
          <div className={fieldGroupClassName}>
            <label htmlFor="firstName" className={labelTextClassName}>
              {copy.firstNameLabel} <span className="text-[var(--casa-coral)]">*</span>
            </label>
            <Input
              required
              id="firstName"
              className={inputClassName}
              value={fields.firstName}
              placeholder={copy.firstNamePlaceholder}
              aria-invalid={Boolean(fieldErrors.firstName)}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
            />
            {fieldErrors.firstName ? <p className="text-xs text-rose-600 mt-1">{fieldErrors.firstName}</p> : null}
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="lastName" className={labelTextClassName}>
              {copy.lastNameLabel}
            </label>
            <Input
              id="lastName"
              className={inputClassName}
              value={fields.lastName}
              placeholder={copy.lastNamePlaceholder}
              aria-invalid={Boolean(fieldErrors.lastName)}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
            />
            {fieldErrors.lastName ? <p className="text-xs text-rose-600 mt-1">{fieldErrors.lastName}</p> : null}
          </div>

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="email" className={labelTextClassName}>
              {copy.emailLabel} <span className="text-[var(--casa-coral)]">*</span>
            </label>
            <Input
              required
              id="email"
              type="email"
              inputMode="email"
              className={inputClassName}
              value={fields.email}
              placeholder={copy.emailPlaceholder}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
            {fieldErrors.email ? <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p> : null}
          </div>

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="topic" className={labelTextClassName}>
              {copy.topicLabel} <span className="text-[var(--casa-coral)]">*</span>
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
                disabled={normalizedTopicList.length === 0}
                className={cn(
                  inputClassName,
                  'w-full flex items-center justify-between text-left',
                  fieldErrors.topic && 'border-rose-300 focus-visible:ring-rose-200'
                )}
              >
                <SelectValue placeholder={copy.topicPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {normalizedTopicList.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.topic ? <p className="text-xs text-rose-600 mt-1">{fieldErrors.topic}</p> : null}
          </div>

          <div className={cn(fieldGroupClassName, 'sm:col-span-2')}>
            <label htmlFor="message" className={labelTextClassName}>
              {copy.messageLabel} <span className="text-[var(--casa-coral)]">*</span>
            </label>
            
            {/* suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--casa-text-subtle)]">
                {locale === 'de' ? 'Schnellstart:' : 'Prompts:'}
              </span>
              {promptIdeas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => addPromptIdea(idea)}
                  className="rounded-full border border-slate-200 bg-slate-50 hover:bg-[var(--casa-warm-soft)]/20 hover:border-[var(--casa-blue)]/20 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  + {idea.split(' ').slice(0, 3).join(' ')}...
                </button>
              ))}
            </div>

            <Textarea
              required
              id="message"
              rows={5}
              className={cn(
                inputClassName,
                'min-h-[140px] py-3 resize-y'
              )}
              value={fields.message}
              placeholder={copy.messagePlaceholder}
              aria-invalid={Boolean(fieldErrors.message)}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
            />
            <div className="flex justify-between items-center mt-1">
              {fieldErrors.message ? <p className="text-xs text-rose-600">{fieldErrors.message}</p> : <div />}
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--casa-text-subtle)]">
                {locale === 'de'
                  ? `${messageLength}/3000 Zeichen`
                  : `${messageLength}/3000 characters`}
              </p>
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

          <div className="sm:col-span-2 pt-2">
            <Button
              type="submit"
              variant="prism"
              disabled={status === 'submitting'}
              className="h-11 w-full rounded-lg px-6 font-semibold text-white sm:w-auto shadow-[var(--shadow-card)] shadow-[var(--casa-ink-deep)]/10"
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
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="assertive">
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
