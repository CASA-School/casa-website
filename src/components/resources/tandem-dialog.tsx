'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TANDEM_ANCHOR, TANDEM_LEVELS } from '@/config/content/tandem';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import { cn } from '@/lib/utils';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

const copy = {
  de: {
    eyebrow: 'Sprachtandem',
    title: 'Tandem anfragen',
    intro: 'Sag uns, welche Sprachen du sprichst und welche du üben möchtest. Wir suchen eine passende Person für dich und melden uns, sobald wir jemanden gefunden haben.',
    stepOne: 'Deine Sprachen',
    offers: 'Diese Sprache(n) sprichst du gut',
    offersHint: 'Zum Beispiel deine Muttersprache.',
    offersPlaceholder: 'z. B. Spanisch, Englisch',
    wants: 'Diese Sprache möchtest du üben',
    wantsPlaceholder: 'z. B. Deutsch',
    level: 'Dein Niveau in dieser Sprache',
    next: 'Weiter',
    back: 'Angaben ändern',
    details: 'Wie erreichen wir dich?',
    first: 'Vorname', last: 'Nachname', email: 'E-Mail-Adresse', phone: 'Telefon (optional)',
    occupation: 'Tätigkeit oder Beruf (optional)',
    interests: 'Hobbys und Interessen (optional)',
    interestsHint: 'Das hilft uns, eine Person zu finden, die zu dir passt.',
    message: 'Anmerkungen oder Wünsche (optional)',
    privacy: 'Ich habe die', privacyLink: 'Datenschutzerklärung gelesen',
    submit: 'Tandem anfragen', sending: 'Wird gesendet …',
    error: 'Deine Anfrage konnte nicht gesendet werden. Bitte versuch es erneut.',
    success: 'Deine Anfrage ist angekommen',
    thanks: 'Vielen Dank. Wir suchen eine passende Tandempartnerin oder einen passenden Tandempartner für dich und melden uns, sobald wir jemanden gefunden haben.',
    done: 'Fertig', close: 'Schließen',
  },
  en: {
    eyebrow: 'Language tandem',
    title: 'Ask for a tandem',
    intro: 'Tell us which languages you speak and which one you would like to practise. We look for someone who suits you and get in touch as soon as we have found them.',
    stepOne: 'Your languages',
    offers: 'The language(s) you speak well',
    offersHint: 'Your first language, for example.',
    offersPlaceholder: 'e.g. Spanish, English',
    wants: 'The language you would like to practise',
    wantsPlaceholder: 'e.g. German',
    level: 'Your level in that language',
    next: 'Continue',
    back: 'Change your answers',
    details: 'How can we reach you?',
    first: 'First name', last: 'Last name', email: 'Email address', phone: 'Phone (optional)',
    occupation: 'Job or occupation (optional)',
    interests: 'Hobbies and interests (optional)',
    interestsHint: 'This helps us find someone who suits you.',
    message: 'Anything else you would like us to know? (optional)',
    privacy: 'I have read the', privacyLink: 'privacy policy',
    submit: 'Ask for a tandem', sending: 'Sending…',
    error: 'Your request could not be sent. Please try again.',
    success: 'Your request has arrived',
    thanks: 'Thank you. We will look for a tandem partner who suits you and get in touch as soon as we have found someone.',
    done: 'Done', close: 'Close',
  },
} as const;

/**
 * The tandem form, as a popup on the tandem page (the old casa-bremen.de had it on its tandem page).
 * Any link to `#tandem-anfrage` opens it, and so does arriving with that anchor in the address, from
 * the homepage card or the Leitbild. Two steps, as in the interest-list popup: the languages first,
 * then how to reach the person.
 */
export function TandemDialog({ locale }: { locale: ContentLocale }) {
  const { pickTree } = useSiteCopy();
  const [open, setOpen] = useState(false);
  const t = pickTree(locale, copy);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash === `#${TANDEM_ANCHOR}`) setOpen(true);
    });
    // Capture phase, before the router handles the link: the anchor opens the popup, it does not scroll.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!link || !link.getAttribute('href')?.endsWith(`#${TANDEM_ANCHOR}`)) return;
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
        if (!next && window.location.hash === `#${TANDEM_ANCHOR}`) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }}
    >
      <DialogContent closeLabel={t.close} brandStripe className="max-w-2xl">
        {open && <TandemFlow locale={locale} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TandemFlow({ locale, onDone }: { locale: ContentLocale; onDone: () => void }) {
  const { pickTree } = useSiteCopy();
  const t = pickTree(locale, copy);
  const [offers, setOffers] = useState('');
  const [wants, setWants] = useState('');
  const [level, setLevel] = useState('');
  const [details, setDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (details || reference) stepHeading.current?.focus();
  }, [details, reference]);

  const ready = offers.trim().length >= 2 && wants.trim().length >= 2 && Boolean(level);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/tandem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale, offers, wants, level,
          firstName: form.get('firstName'), lastName: form.get('lastName'), email: form.get('email'),
          phone: form.get('phone'), occupation: form.get('occupation'), interests: form.get('interests'),
          message: form.get('message'), website: form.get('website'),
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
        <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{t.eyebrow}</p>
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
            <p className="font-semibold">{offers} · {wants} ({level})</p>
            <Button variant="prism" size="lg" onClick={onDone}>{t.done}</Button>
          </div>
        ) : !details ? (
          <>
            <h3 className="sr-only">{t.stepOne}</h3>
            <div className="space-y-6">
              <label className="block space-y-2 text-sm font-semibold text-[var(--casa-ink)]">
                {t.offers}
                <span className="block text-xs font-normal text-[var(--casa-muted)]">{t.offersHint}</span>
                <Input value={offers} onChange={(event) => setOffers(event.target.value)} placeholder={t.offersPlaceholder} maxLength={120} className="h-11 font-normal" />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-[var(--casa-ink)]">
                {t.wants}
                <Input value={wants} onChange={(event) => setWants(event.target.value)} placeholder={t.wantsPlaceholder} maxLength={120} className="h-11 font-normal" />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-[var(--casa-ink)]">{t.level}</legend>
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t.level}>
                  {TANDEM_LEVELS.map((option) => {
                    const on = level === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setLevel(option)}
                        className={cn(
                          'min-h-11 min-w-14 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--casa-blue)]',
                          on
                            ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                            : 'border-[var(--casa-sand)] bg-white text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            <div className="mt-8 flex justify-end border-t border-[var(--casa-sand)] pt-5">
              <Button variant="prism" size="lg" disabled={!ready} onClick={() => setDetails(true)}>
                {t.next}
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <p role="alert" className="text-sm text-[var(--casa-danger-text)]">{error}</p>}
            <div className="rounded-lg bg-[var(--casa-warm-soft)] p-4 ring-1 ring-[color:var(--casa-sand)] text-sm">
              <p className="font-semibold">{offers} · {wants} ({level})</p>
              <Button type="button" variant="link" className="mt-1 h-auto px-0 font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 hover:text-[var(--casa-accent-text-hover)]" disabled={sending} onClick={() => setDetails(false)}>{t.back}</Button>
            </div>
            <h3 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none">{t.details}</h3>
            <fieldset disabled={sending} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">{t.first}<Input name="firstName" autoComplete="given-name" required maxLength={100} className="h-11" /></label>
                <label className="block space-y-2 text-sm font-medium">{t.last}<Input name="lastName" autoComplete="family-name" required maxLength={100} className="h-11" /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">{t.email}<Input type="email" name="email" autoComplete="email" required maxLength={254} className="h-11" /></label>
                <label className="block space-y-2 text-sm font-medium">{t.phone}<Input type="tel" name="phone" autoComplete="tel" maxLength={40} className="h-11" /></label>
              </div>
              <label className="block space-y-2 text-sm font-medium">{t.occupation}<Input name="occupation" autoComplete="organization-title" maxLength={120} className="h-11" /></label>
              <label className="block space-y-2 text-sm font-medium">
                {t.interests}
                <span className="block text-xs font-normal text-[var(--casa-muted)]">{t.interestsHint}</span>
                <Textarea name="interests" maxLength={1000} rows={2} />
              </label>
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
