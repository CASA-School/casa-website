'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  INTEREST_ANCHOR,
  INTEREST_COURSES,
  INTEREST_DAYS,
  INTEREST_LEVELS,
  INTEREST_PROFESSIONS,
  INTEREST_TIMES,
  type InterestCourseSlug,
} from '@/config/courses/interest-list';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import { cn } from '@/lib/utils';

const copy = {
  de: {
    eyebrow: 'Interessentenliste',
    title: 'Interesse anmelden',
    intro: 'Für diesen Kurs gibt es noch keinen festen Termin. Trag dich ein, dann melden wir uns, sobald genug Interessierte zusammen sind. Der Eintrag ist unverbindlich.',
    stepOne: 'Dein Niveau und deine Zeiten',
    level: 'Dein Sprachniveau',
    profession: 'Dein Beruf (optional)',
    days: 'An welchen Tagen kannst du?',
    times: 'Zu welcher Tageszeit?',
    timesHint: 'Bisher findet der Kurs freitags von 13 bis 16:30 Uhr statt. Wenn wir wissen, wann du kannst, planen wir die Gruppe danach.',
    multiple: 'Mehrere möglich',
    next: 'Weiter',
    back: 'Angaben ändern',
    details: 'Wie erreichen wir dich?',
    first: 'Vorname', last: 'Nachname', email: 'E-Mail-Adresse', phone: 'Telefon (optional)',
    message: 'Möchtest du uns noch etwas sagen? (optional)',
    privacy: 'Ich habe die', privacyLink: 'Datenschutzerklärung gelesen',
    submit: 'Auf die Liste setzen', sending: 'Wird gesendet …',
    error: 'Deine Angaben konnten nicht gesendet werden. Bitte versuch es erneut.',
    success: 'Du stehst auf der Liste',
    thanks: 'Vielen Dank. Sobald genug Interessierte zusammen sind, legen wir die Termine fest und melden uns per E-Mail oder Telefon bei dir.',
    reference: 'Deine Referenz', done: 'Fertig', close: 'Schließen',
  },
  en: {
    eyebrow: 'Interest list',
    title: 'Register your interest',
    intro: 'This course has no fixed dates yet. Add your name and we will get in touch as soon as there are enough people for a group. It doesn’t commit you to anything.',
    stepOne: 'Your level and your times',
    level: 'Your German level',
    profession: 'Your job (optional)',
    days: 'Which days can you make?',
    times: 'What time of day?',
    timesHint: 'So far the course has run on Fridays from 13:00 to 16:30. Knowing when you can come helps us plan the group.',
    multiple: 'Choose as many as you like',
    next: 'Continue',
    back: 'Change your answers',
    details: 'How can we reach you?',
    first: 'First name', last: 'Last name', email: 'Email address', phone: 'Phone (optional)',
    message: 'Anything else you’d like to tell us? (optional)',
    privacy: 'I have read the', privacyLink: 'privacy policy',
    submit: 'Add me to the list', sending: 'Sending…',
    error: 'Your details could not be sent. Please try again.',
    success: 'You’re on the list',
    thanks: 'Thank you. As soon as there are enough people, we’ll set the dates and get in touch by email or phone.',
    reference: 'Your reference', done: 'Done', close: 'Close',
  },
} as const;

/**
 * The interest-list popup on a course without set dates (config/courses/
 * interest-list.ts). It has no trigger of its own: any link on the page to
 * `#interesse` opens it — the hero button, the next steps — and so does
 * arriving with that anchor in the address, from a mail or another page.
 * Two steps, as in Ina's appointment popup: first what CASA needs to form the
 * group (level and free times), then how to reach the person.
 */
export function InterestDialog({ course, locale }: { course: InterestCourseSlug; locale: ContentLocale }) {
  const [open, setOpen] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    // Arriving with the anchor in the address opens it, after the first paint.
    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash === `#${INTEREST_ANCHOR}`) setOpen(true);
    });
    // Capture phase, before the router handles the link: the anchor opens the popup, it does not scroll.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link || !link.getAttribute('href')?.endsWith(`#${INTEREST_ANCHOR}`)) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Closing clears the anchor, so a reload does not reopen it.
        if (!next && window.location.hash === `#${INTEREST_ANCHOR}`) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }}
    >
      <DialogContent closeLabel={t.close} brandStripe className="max-w-2xl">
        {open && <InterestFlow course={course} locale={locale} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

type Choice = { value: string; label: Record<ContentLocale, string> };

function Chips({
  legend, hint, options, selected, onToggle, locale, multiple,
}: {
  legend: string; hint?: string; options: readonly Choice[]; selected: readonly string[];
  onToggle: (value: string) => void; locale: ContentLocale; multiple?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[var(--casa-ink)]">{legend}</legend>
      {hint ? <p className="mt-1 text-xs text-[var(--casa-muted)]">{hint}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'} aria-label={legend}>
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={() => onToggle(option.value)}
              className={cn(
                'min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]',
                on
                  ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                  : 'border-[var(--casa-sand)] bg-white text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
              )}
            >
              {option.label[locale]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function InterestFlow({ course, locale, onDone }: { course: InterestCourseSlug; locale: ContentLocale; onDone: () => void }) {
  const t = copy[locale];
  const [level, setLevel] = useState('');
  const [profession, setProfession] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [details, setDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (details || reference) stepHeading.current?.focus();
  }, [details, reference]);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const ready = Boolean(level) && days.length > 0 && times.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          course, locale, level, profession: profession || undefined, days, times,
          firstName: form.get('firstName'), lastName: form.get('lastName'), email: form.get('email'),
          phone: form.get('phone'), message: form.get('message'), website: form.get('website'),
          privacy: form.get('privacy') === 'on',
        }),
      });
      if (!response.ok) throw new Error('failed');
      const body = await response.json();
      setConfirmationSent(body.data.confirmationSent === true);
      setReference(body.data.requestId);
    } catch {
      setError(t.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
      <header className="border-b border-[var(--casa-sand)] px-5 pb-6 pt-8 sm:px-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {t.eyebrow} · {INTEREST_COURSES[course][locale]}
        </p>
        <DialogTitle ref={reference ? stepHeading : undefined} tabIndex={reference ? -1 : undefined} className="pr-7 text-2xl sm:text-3xl">
          {reference ? t.success : t.title}
        </DialogTitle>
        <DialogDescription className="mt-3 max-w-xl text-sm">{reference ? t.thanks : t.intro}</DialogDescription>
        {reference && confirmationSent ? <p className="mt-2 max-w-xl text-sm font-medium text-[var(--casa-ink)]">{confirmationNotice(locale)}</p> : null}
      </header>

      <div className="p-5 sm:p-8">
        {reference ? (
          <div role="status" className="space-y-5">
            <Check aria-hidden className="size-7 text-[var(--casa-accent-text)]" />
            <p className="font-semibold">{INTEREST_COURSES[course][locale]}</p>
            <p className="break-all text-xs text-[var(--casa-muted)]">{t.reference}: {reference}</p>
            <Button variant="prism" size="lg" onClick={onDone}>{t.done}</Button>
          </div>
        ) : !details ? (
          <>
            <h3 className="sr-only">{t.stepOne}</h3>
            <div className="space-y-7">
              <Chips legend={t.level} options={INTEREST_LEVELS} selected={[level]} onToggle={setLevel} locale={locale} />
              <Chips
                legend={t.profession}
                options={INTEREST_PROFESSIONS}
                selected={[profession]}
                onToggle={(value) => setProfession((current) => (current === value ? '' : value))}
                locale={locale}
              />
              <Chips legend={t.days} hint={t.multiple} options={INTEREST_DAYS} selected={days} onToggle={(value) => setDays((current) => toggle(current, value))} locale={locale} multiple />
              <Chips legend={t.times} hint={t.timesHint} options={INTEREST_TIMES} selected={times} onToggle={(value) => setTimes((current) => toggle(current, value))} locale={locale} multiple />
            </div>
            <div className="mt-8 flex justify-end border-t border-[var(--casa-sand)] pt-5">
              <Button variant="prism" size="lg" disabled={!ready} onClick={() => setDetails(true)}>
                {t.next}
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <p role="alert" className="text-sm text-[var(--casa-danger-text)]">{error}</p>}
            <div className="rounded-lg bg-[var(--casa-surface-wash)] p-4 text-sm">
              <p className="font-semibold">
                {[
                  INTEREST_LEVELS.find((option) => option.value === level)?.label[locale],
                  ...days.map((day) => INTEREST_DAYS.find((option) => option.value === day)?.label[locale]),
                ].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-xs text-[var(--casa-muted)]">
                {times.map((time) => INTEREST_TIMES.find((option) => option.value === time)?.label[locale]).join(', ')}
              </p>
              <Button type="button" variant="link" className="mt-1 px-0" disabled={sending} onClick={() => setDetails(false)}>{t.back}</Button>
            </div>
            <h3 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold">{t.details}</h3>
            <fieldset disabled={sending} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">{t.first}<Input name="firstName" autoComplete="given-name" required maxLength={100} className="h-11" /></label>
                <label className="block space-y-2 text-sm font-medium">{t.last}<Input name="lastName" autoComplete="family-name" required maxLength={100} className="h-11" /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">{t.email}<Input type="email" name="email" autoComplete="email" required maxLength={254} className="h-11" /></label>
                <label className="block space-y-2 text-sm font-medium">{t.phone}<Input type="tel" name="phone" autoComplete="tel" maxLength={40} className="h-11" /></label>
              </div>
              <label className="block space-y-2 text-sm font-medium">{t.message}<Textarea name="message" maxLength={2000} rows={3} /></label>
              <div className="hidden" aria-hidden><label>Website<Input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <input type="checkbox" name="privacy" required className="mt-1 size-4 accent-[var(--casa-ink-deep)]" />
                <span>{t.privacy} <Link className="underline underline-offset-4" href="/privacy" target="_blank" rel="noopener noreferrer">{t.privacyLink}</Link>.</span>
              </label>
            </fieldset>
            <Button type="submit" variant="prism" size="lg" disabled={sending} className="w-full sm:w-auto">{sending ? t.sending : t.submit}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
