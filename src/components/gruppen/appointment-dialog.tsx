'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';
import type { AppointmentDay } from '@/lib/appointments/schedule';

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
    privacy: 'I have read the', privacyLink: 'privacy notice',
    note: 'Ina will confirm your appointment and how to join by email.',
    submit: 'Request appointment', sending: 'Sending…', error: 'Your request could not be sent. Please try again.',
    taken: 'Someone has just requested this time. Please choose another appointment.',
    success: 'Your request is with us', thanks: 'Thank you. Your chosen time is reserved while Ina checks your request. She’ll email you to confirm the appointment and how to join.',
    reference: 'Your reference', done: 'Done', weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  },
  de: {
    trigger: 'Termin buchen', title: 'Gemeinsam Ihre Gruppenreise planen',
    intro: 'Besprechen Sie mit Ina Eismann Ihre Ideen, offenen Fragen und Wünsche für Ihre Gruppe.',
    schedule: '30 Minuten · Montag–Donnerstag', zone: 'Alle Zeiten gelten für Bremen.',
    date: 'Tag auswählen', time: 'Uhrzeit auswählen', next: 'Weiter', back: 'Termin ändern',
    previousMonth: 'Vorheriger Monat', nextMonth: 'Nächster Monat', close: 'Schließen', loading: 'Termine werden geladen …',
    unavailable: 'Die Terminauswahl ist gerade nicht verfügbar. Schreiben Sie uns – wir vereinbaren gerne einen Termin mit Ihnen.',
    contact: 'Anfrage senden', noTimes: 'An diesem Tag ist leider kein Termin mehr frei. Bitte wählen Sie einen anderen Tag.',
    choose: 'Wählen Sie einen Tag, um die freien Uhrzeiten zu sehen.', details: 'Wie kann Ina Sie erreichen?',
    first: 'Vorname', last: 'Nachname', email: 'E-Mail-Adresse', message: 'Worüber möchten Sie sprechen? (optional)',
    privacy: 'Ich habe die', privacyLink: 'Datenschutzhinweise gelesen',
    note: 'Ina bestätigt Ihnen den Termin und die Teilnahmeinformationen per E-Mail.',
    submit: 'Termin anfragen', sending: 'Wird gesendet …', error: 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
    taken: 'Dieser Termin wurde gerade angefragt. Bitte wählen Sie einen anderen Termin.',
    success: 'Ihre Anfrage ist angekommen', thanks: 'Vielen Dank. Ihre Wunschzeit ist vorerst für Sie reserviert. Ina prüft Ihre Anfrage und meldet sich per E-Mail mit der Terminbestätigung und den Informationen zur Teilnahme.',
    reference: 'Ihre Referenz', done: 'Fertig', weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  },
} as const;

export function AppointmentDialog({ locale }: { locale: ContentLocale }) {
  const [open, setOpen] = useState(false);
  const t = copy[locale];
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="prism" className="mt-4 h-11 w-full">{t.trigger}</Button>
    </DialogTrigger>
    <DialogContent closeLabel={t.close} className="max-w-3xl">
      {open && <AppointmentFlow locale={locale} onDone={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}

function AppointmentFlow({ locale, onDone }: { locale: ContentLocale; onDone: () => void }) {
  const t = copy[locale];
  const language = locale === 'de' ? 'de-DE' : 'en-GB';
  const [days, setDays] = useState<AppointmentDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
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
        setMonth(available[0]?.date.slice(0, 7) ?? '');
        if (!available.length) setUnavailable(true);
      })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const months = [...new Set(days.map(day => day.date.slice(0, 7)))];
  const monthIndex = months.indexOf(month);
  const monthDate = new Date(`${month || '2000-01'}-01T12:00:00Z`);
  const offset = (monthDate.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const dateLabel = (value: string) => new Intl.DateTimeFormat(language, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
  const selectedDay = days.find(day => day.date === date);

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
      setReference(body.data.requestId);
    } catch { setError(t.error); }
    finally { setSending(false); }
  }

  return <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
    <header className="border-b border-[var(--casa-sand)] px-5 pb-6 pt-8 sm:px-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Ina Eismann · CASA Bremen</p>
      <DialogTitle ref={reference ? stepHeading : undefined} tabIndex={reference ? -1 : undefined} className="pr-7 text-2xl sm:text-3xl">{reference ? t.success : t.title}</DialogTitle>
      <DialogDescription className="mt-3 max-w-xl text-sm">{reference ? t.thanks : t.intro}</DialogDescription>
      <p className="mt-4 flex items-center gap-2 text-sm text-[var(--casa-ink)]"><Clock aria-hidden className="size-4" />{t.schedule}</p>
    </header>
    <div className="p-5 sm:p-8">
      {reference ? <div role="status" className="space-y-5">
        <Check aria-hidden className="size-7 text-[var(--casa-accent-text)]" />
        <p className="font-semibold">{dateLabel(date)} · {time}</p>
        <p className="text-sm text-[var(--casa-muted)]">{t.zone}</p>
        <p className="break-all text-xs text-[var(--casa-muted)]">{t.reference}: {reference}</p>
        <Button variant="prism" size="lg" onClick={onDone}>{t.done}</Button>
      </div> : loading ? <p role="status">{t.loading}</p> : unavailable ? <div role="status" className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{t.unavailable}</p>
        <Button asChild variant="prism" size="lg"><Link href="/contact?topic=group-booking">{t.contact}</Link></Button>
      </div> : <>
        {error && <p role="alert" className="mb-5 text-sm text-[var(--casa-danger-text)]">{error}</p>}
        {!details ? <>
          <div className="grid gap-7 sm:grid-cols-[1.25fr_1fr]">
            <section aria-label={t.date}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <Button aria-label={t.previousMonth} variant="ghost" size="icon-lg" disabled={monthIndex <= 0} onClick={() => setMonth(months[monthIndex - 1])}><ChevronLeft aria-hidden /></Button>
                <h3 aria-live="polite" className="text-base font-semibold">{new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)}</h3>
                <Button aria-label={t.nextMonth} variant="ghost" size="icon-lg" disabled={monthIndex >= months.length - 1} onClick={() => setMonth(months[monthIndex + 1])}><ChevronRight aria-hidden /></Button>
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {t.weekdays.map((day, index) => <span key={index} className="pb-2 text-xs text-[var(--casa-muted)]" aria-hidden>{day}</span>)}
                {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
                {Array.from({ length: dayCount }, (_, index) => {
                  const value = `${month}-${String(index + 1).padStart(2, '0')}`;
                  const enabled = days.some(day => day.date === value && day.times.length);
                  return <button key={value} type="button" aria-label={dateLabel(value)} aria-pressed={value === date} disabled={!enabled}
                    onClick={() => { setDate(value); setTime(''); setError(''); }}
                    className={cn('min-h-11 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--casa-blue)] disabled:text-[var(--casa-muted)] disabled:opacity-40',
                      value === date ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-ink)] enabled:hover:bg-[var(--casa-warm-soft)]')}>
                    {index + 1}
                  </button>;
                })}
              </div>
            </section>
            <section aria-label={t.time} className="border-t border-[var(--casa-sand)] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-2">
              <h3 className="text-base font-semibold">{t.time}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--casa-muted)]">{t.zone}</p>
              {date && <p className="mt-4 text-sm font-medium">{dateLabel(date)}</p>}
              <div aria-live="polite">
                {!date ? <p className="mt-5 text-sm leading-relaxed text-[var(--casa-muted)]">{t.choose}</p> : !selectedDay?.times.length ? <p className="mt-5 text-sm text-[var(--casa-muted)]">{t.noTimes}</p> :
                  <div className="mt-4 grid grid-cols-2 gap-2">{selectedDay.times.map(slot => <Button key={slot} variant={slot === time ? 'prism' : 'outline-prism'} size="lg" aria-pressed={slot === time} onClick={() => setTime(slot)}>{slot}</Button>)}</div>}
              </div>
            </section>
          </div>
          <div className="mt-7 flex justify-end border-t border-[var(--casa-sand)] pt-5"><Button variant="prism" size="lg" disabled={!time} onClick={() => setDetails(true)}>{t.next}<ChevronRight aria-hidden /></Button></div>
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
