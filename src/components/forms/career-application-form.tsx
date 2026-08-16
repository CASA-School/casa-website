'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trackCasaEvent } from '@/lib/analytics/client';
import type { ContentLocale } from '@/lib/content/types';

type CareerApplicationFormProps = {
  locale: ContentLocale;
  positionId: string;
  positionSlug: string;
  positionTitle: string;
};

type ApiResponse = {
  status: 'accepted' | 'error';
  message: string;
  requestId?: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function CareerApplicationForm({
  locale,
  positionId,
  positionSlug,
  positionTitle,
}: CareerApplicationFormProps) {
  const copy = useMemo(
    () =>
      locale === 'de'
        ? {
            title: 'Jetzt bewerben',
            firstName: 'Vorname',
            lastName: 'Nachname',
            email: 'E-Mail',
            phone: 'Telefon (optional)',
            linkedin: 'LinkedIn URL (optional)',
            cv: 'Lebenslauf',
            cvHint: 'PDF, DOC oder DOCX, max. 8 MB',
            letter: 'Motivation',
            submit: 'Bewerbung absenden',
            submitting: 'Wird gesendet...',
            success: 'Bewerbung eingegangen',
            error: 'Bewerbung konnte nicht gesendet werden',
            requestId: 'Vorgangsnummer',
            cvRequired: 'Bitte laden Sie einen Lebenslauf hoch.',
            cvInvalid: 'Nur PDF, DOC oder DOCX bis max. 8 MB sind erlaubt.',
          }
        : {
            title: 'Apply for this role',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            phone: 'Phone (optional)',
            linkedin: 'LinkedIn URL (optional)',
            cv: 'Resume / CV',
            cvHint: 'PDF, DOC, or DOCX, max 8 MB',
            letter: 'Cover letter',
            submit: 'Submit application',
            submitting: 'Submitting...',
            success: 'Application received',
            error: 'Application could not be submitted',
            requestId: 'Request ID',
            cvRequired: 'Please upload your CV.',
            cvInvalid: 'Only PDF, DOC, or DOCX up to 8 MB are supported.',
          },
    [locale]
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);

  const validateCv = (file: File | null) => {
    if (!file) {
      return copy.cvRequired;
    }

    if (file.size > MAX_FILE_BYTES) {
      return copy.cvInvalid;
    }

    const type = file.type;
    const validMimeType =
      type === 'application/pdf' ||
      type === 'application/msword' ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!validMimeType) {
      return copy.cvInvalid;
    }

    return null;
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setLinkedinUrl('');
    setCoverLetter('');
    setCvFile(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    setRequestId(null);

    const cvValidationError = validateCv(cvFile);
    if (cvValidationError) {
      setStatus('error');
      setMessage(cvValidationError);
      trackCasaEvent('form_error', {
        form: 'career_application',
        reason: 'cv_validation',
        section: 'career-application',
      });
      return;
    }

    const formData = new FormData();
    formData.append('positionId', positionId);
    formData.append('positionSlug', positionSlug);
    formData.append('positionTitle', positionTitle);
    formData.append('locale', locale);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('linkedinUrl', linkedinUrl);
    formData.append('coverLetter', coverLetter);
    formData.append('cvFile', cvFile as File);

    try {
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ApiResponse;
      if (!response.ok || result.status !== 'accepted') {
        throw new Error(result.message || copy.error);
      }

      setStatus('success');
      setMessage(result.message || copy.success);
      setRequestId(result.requestId || null);
      resetForm();
      trackCasaEvent('form_success', {
        form: 'career_application',
        section: 'career-application',
      });
      return;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : copy.error);
      trackCasaEvent('form_error', {
        form: 'career_application',
        reason: 'submit_failed',
        section: 'career-application',
      });
    }
  };

  return (
    <aside
      className="rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] p-6 shadow-[var(--shadow-card)] sm:p-7 lg:sticky lg:top-28"
      data-track-section="career-application"
    >
      <h2 className="text-3xl font-bold text-[var(--casa-ink)]">{copy.title}</h2>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate data-casa-track-form="career_application">
        <div className="grid gap-4 2xl:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.firstName}</span>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required className="h-11" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.lastName}</span>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} required className="h-11" />
          </label>
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.email}</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11" />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.phone}</span>
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11" />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.linkedin}</span>
          <Input
            type="url"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            placeholder="https://www.linkedin.com/in/..."
            className="h-11"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.cv}</span>
          <label htmlFor="career-cv" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/35 px-4 py-3">
            <Upload className="h-4 w-4 text-[var(--casa-accent-text)]" />
            <span className="text-sm text-[var(--casa-muted)]">{cvFile ? cvFile.name : copy.cvHint}</span>
            <input
              id="career-cv"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(event) => setCvFile(event.target.files?.[0] || null)}
            />
          </label>
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.letter}</span>
          <Textarea
            rows={6}
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            required
            className="rounded-xl"
          />
        </label>

        <Button
          type="submit"
          disabled={status === 'submitting'}
          className="mt-1 h-11 w-full rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]"
          data-casa-track="true"
          data-casa-label={copy.submit}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </form>

      {status === 'success' ? (
        <div className="mt-4 rounded-xl border border-[color:var(--casa-success-surface)]/30 bg-[var(--casa-success-surface)]/8 px-3 py-2 text-sm text-[var(--casa-success-text)]" role="status" aria-live="polite">
          <p className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {message || copy.success}
          </p>
          {requestId ? (
            <p className="mt-1 text-xs text-[var(--casa-success-text)]">
              {copy.requestId}: <span className="font-mono">{requestId}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="mt-4 rounded-xl border border-[color:var(--casa-danger-surface)]/30 bg-[var(--casa-danger-surface)]/5 px-3 py-2 text-sm text-[var(--casa-danger-text)]" role="alert" aria-live="assertive">
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            {copy.error}
          </p>
          {message ? <p className="mt-1 text-xs">{message}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}
