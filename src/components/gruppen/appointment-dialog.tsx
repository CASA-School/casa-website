'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Check } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { SlotPicker } from '@/components/appointments/slot-picker';
import type { ContentLocale } from '@/lib/content/types';
import type { AppointmentDay } from '@/lib/appointments/schedule';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

const copy = {
  en: {
    trigger: 'Book a call', title: 'Let’s plan your group’s visit',
    intro: 'Choose a time to talk with Ina Eismann about your plans, your questions and what your group needs.',
    schedule: '30 minutes · Monday–Thursday', zone: 'All times are local to Bremen.',
    date: 'Choose a day', time: 'Choose a time', next: 'Continue', back: 'Change appointment',
    previousMonth: 'Previous month', nextMonth: 'Next month', close: 'Close', loading: 'Loading appointments…',
    unavailable: 'Appointments are temporarily unavailable. Please send us an enquiry and we’ll arrange a time with you.',
    contact: 'Send an enquiry', noTimes: 'No times left on this day. Please choose another day.',
    choose: 'Select a day to see the available times.', details: 'How can Ina reach you?',
    first: 'First name', last: 'Last name', email: 'Email address', message: 'What would you like to discuss? (optional)',
    privacy: 'I have read the', privacyLink: 'privacy policy',
    note: 'Ina will confirm your appointment and how to join by email.',
    submit: 'Request appointment', sending: 'Sending…', error: 'Your request could not be sent. Please try again.',
    taken: 'Someone has just requested this time. Please choose another appointment.',
    success: 'Your request is with us', thanks: 'Thank you. Your chosen time is reserved while Ina checks your request. She’ll email you to confirm the appointment and how to join.',
    thanksUnheld: 'Thank you. Ina will check your chosen time and email you to confirm the appointment and how to join.',
    done: 'Done', weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  },
  de: {
    trigger: 'Termin buchen', title: 'Gemeinsam deine Gruppenreise planen',
    intro: 'Besprich mit Ina Eismann deine Ideen, offenen Fragen und Wünsche für deine Gruppe.',
    schedule: '30 Minuten · Montag–Donnerstag', zone: 'Alle Zeiten gelten für Bremen.',
    date: 'Tag auswählen', time: 'Uhrzeit auswählen', next: 'Weiter', back: 'Termin ändern',
    previousMonth: 'Vorheriger Monat', nextMonth: 'Nächster Monat', close: 'Schließen', loading: 'Termine werden geladen …',
    unavailable: 'Die Terminauswahl ist gerade nicht verfügbar. Schreib uns, dann vereinbaren wir gern einen Termin mit dir.',
    contact: 'Anfrage senden', noTimes: 'An diesem Tag ist leider kein Termin mehr frei. Bitte wähle einen anderen Tag.',
    choose: 'Wähle einen Tag, um die freien Uhrzeiten zu sehen.', details: 'Wie kann Ina dich erreichen?',
    first: 'Vorname', last: 'Nachname', email: 'E-Mail-Adresse', message: 'Worüber möchtest du sprechen? (optional)',
    privacy: 'Ich habe die', privacyLink: 'Datenschutzerklärung gelesen',
    note: 'Ina bestätigt dir den Termin und die Teilnahmeinformationen per E-Mail.',
    submit: 'Termin anfragen', sending: 'Wird gesendet …', error: 'Deine Anfrage konnte nicht gesendet werden. Bitte versuch es erneut.',
    taken: 'Dieser Termin wurde gerade angefragt. Bitte wähle einen anderen Termin.',
    success: 'Deine Anfrage ist angekommen', thanks: 'Vielen Dank. Deine Wunschzeit ist vorerst für dich reserviert. Ina prüft deine Anfrage und meldet sich per E-Mail mit der Terminbestätigung und den Informationen zur Teilnahme.',
    thanksUnheld: 'Vielen Dank. Ina prüft deine Wunschzeit und meldet sich per E-Mail mit der Terminbestätigung und den Informationen zur Teilnahme.',
    done: 'Fertig', weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  },
} as const;

export function AppointmentDialog({ locale }: { locale: ContentLocale }) {
  const { pickTree } = useSiteCopy();
  const [open, setOpen] = useState(false);
  const t = pickTree(locale, copy);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="prism" className="mt-4 h-11 w-full">{t.trigger}</Button>
    </DialogTrigger>
    <DialogContent closeLabel={t.close} brandStripe className="max-w-3xl">
      {open && <AppointmentFlow locale={locale} onDone={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}

function AppointmentFlow({ locale, onDone }: { locale: ContentLocale; onDone: () => void }) {
  const { intl, pickTree } = useSiteCopy();
  const t = pickTree(locale, copy);
  const language = intl(locale);
  const [days, setDays] = useState<AppointmentDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  // False without a database: the request still reaches Ina, but nothing holds the time.
  const [held, setHeld] = useState(true);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (details || reference) stepHeading.current?.focus();
  }, [details, reference]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/appointments', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('unavailable');
        const body = await response.json();
        const available: AppointmentDay[] = body.data.days;
        setDays(available);
        if (!available.length) setUnavailable(true);
      })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const dateLabel = (value: string) => new Intl.DateTimeFormat(language, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = new FormData(event.currentTarget);
    setSending(true); setError('');
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale, date, time, firstName: form.get('firstName'), lastName: form.get('lastName'),
          email: form.get('email'), message: form.get('message'), website: form.get('website'),
          privacy: form.get('privacy') === 'on',
        }),
      });
      if (response.status === 409) {
        setDays(current => current.map(day => day.date === date ? { ...day, times: day.times.filter(slot => slot !== time) } : day));
        setTime(''); setDetails(false); setError(t.taken); return;
      }
      if (!response.ok) throw new Error('failed');
      const body = await response.json();
      setConfirmationSent(body.data.confirmationSent === true);
      setHeld(body.data.held !== false);
      setReference(body.data.requestId);
    } catch { setError(t.error); }
    finally { setSending(false); }
  }

  return <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
    <header className="border-b border-[var(--casa-sand)] px-5 pb-6 pt-8 sm:px-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Ina Eismann · CASA Bremen</p>
      <DialogTitle ref={reference ? stepHeading : undefined} tabIndex={reference ? -1 : undefined} className="pr-7 text-2xl sm:text-3xl">{reference ? t.success : t.title}</DialogTitle>
      <DialogDescription className="mt-3 max-w-xl text-sm">{reference ? (held ? t.thanks : t.thanksUnheld) : t.intro}</DialogDescription>
      {reference && confirmationSent ? <p className="mt-2 max-w-xl text-sm font-medium text-[var(--casa-ink)]">{confirmationNotice(locale)}</p> : null}
      <p className="mt-4 flex items-center gap-2 text-sm text-[var(--casa-ink)]"><Clock aria-hidden className="size-4" />{t.schedule}</p>
    </header>
    <div className="p-5 sm:p-8">
      {reference ? <div role="status" className="space-y-5">
        <Check aria-hidden className="size-7 text-[var(--casa-accent-text)]" />
        <p className="font-semibold">{dateLabel(date)} · {time}</p>
        <p className="text-sm text-[var(--casa-muted)]">{t.zone}</p>
        <Button variant="prism" size="lg" onClick={onDone}>{t.done}</Button>
      </div> : loading ? <p role="status">{t.loading}</p> : unavailable ? <div role="status" className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{t.unavailable}</p>
        <Button asChild variant="prism" size="lg"><Link href="/contact?topic=group-booking">{t.contact}</Link></Button>
      </div> : <>
        {error && <p role="alert" className="mb-5 text-sm text-[var(--casa-danger-text)]">{error}</p>}
        {!details ? <>
          <SlotPicker days={days} date={date} time={time} language={language} labels={t}
            onDate={(value) => { setDate(value); setTime(''); setError(''); }} onTime={setTime} />
          <div className="mt-7 flex justify-end border-t border-[var(--casa-sand)] pt-5"><Button variant="prism" size="lg" disabled={!time} onClick={() => setDetails(true)}>{t.next}<ArrowRight aria-hidden /></Button></div>
        </> : <form onSubmit={submit} className="space-y-5">
          <div className="rounded-lg bg-[var(--casa-surface-wash)] p-4">
            <p className="text-sm font-semibold">{dateLabel(date)} · {time} · 30 min</p>
            <p className="mt-1 text-xs text-[var(--casa-muted)]">{t.zone}</p>
            <Button type="button" variant="link" className="mt-1 px-0" disabled={sending} onClick={() => setDetails(false)}>{t.back}</Button>
          </div>
          <h3 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold">{t.details}</h3>
          <fieldset disabled={sending} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium">{t.first}<Input name="firstName" autoComplete="given-name" required maxLength={100} className="h-11" /></label>
              <label className="block space-y-2 text-sm font-medium">{t.last}<Input name="lastName" autoComplete="family-name" maxLength={100} className="h-11" /></label>
            </div>
            <label className="block space-y-2 text-sm font-medium">{t.email}<Input type="email" name="email" autoComplete="email" required maxLength={254} className="h-11" /></label>
            <label className="block space-y-2 text-sm font-medium">{t.message}<Textarea name="message" maxLength={2000} rows={3} /></label>
            <div className="hidden" aria-hidden><label>Website<Input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" name="privacy" required className="mt-1 size-4 accent-[var(--casa-ink-deep)]" /><span>{t.privacy} <Link className="underline underline-offset-4" href="/privacy" target="_blank" rel="noopener noreferrer">{t.privacyLink}</Link>.</span></label>
          </fieldset>
          <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{t.note}</p>
          <Button type="submit" variant="prism" size="lg" disabled={sending} className="w-full sm:w-auto">{sending ? t.sending : t.submit}</Button>
        </form>}
      </>}
    </div>
  </div>;
}
