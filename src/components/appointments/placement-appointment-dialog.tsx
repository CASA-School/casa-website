'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { confirmationNotice } from '@/lib/notifications/confirmation-notice';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import type { PlacementDay } from '@/lib/appointments/placement-schedule';
import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { SlotPicker } from './slot-picker';

const copy = {
  en: {
    trigger: 'Book an appointment', eyebrow: 'Placement in person · CASA Bremen', title: 'Book your placement appointment',
    intro: 'Choose a time and come to the school. Together we’ll find your level and the course that suits you.',
    schedule: '30 minutes · Tuesday–Thursday · at the school', zone: 'All times are local to Bremen.',
    date: 'Choose a day', time: 'Choose a time', next: 'Continue', back: 'Change appointment',
    previousMonth: 'Previous month', nextMonth: 'Next month', close: 'Close', loading: 'Loading appointments…',
    unavailable: 'Appointments are temporarily unavailable. Please send us a message and we’ll arrange a time with you.',
    contact: 'Send a message', noTimes: 'No places left on this day. Please choose another day.',
    choose: 'Select a day to see the free times.', oneLeft: '1 place left',
    details: 'Your details', first: 'First name', last: 'Last name', email: 'Email address', phone: 'Phone (optional)',
    message: 'Anything we should know? (optional)', privacy: 'I have read the', privacyLink: 'privacy policy',
    note: 'You’ll receive a confirmation by email.',
    submit: 'Book appointment', sending: 'Booking…', error: 'Your appointment could not be booked. Please try again.',
    taken: 'Someone has just booked the last place at this time. Please choose another time.',
    success: 'Your appointment is booked', thanks: 'Thank you. We look forward to seeing you at the school, Am Dobben 14–16 in Bremen.',
    successUnheld: 'Your request has reached us', thanksUnheld: 'Thank you. We’ll check your chosen time and confirm the appointment by email.',
    done: 'Done', weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  },
  de: {
    trigger: 'Termin buchen', eyebrow: 'Einstufung vor Ort · CASA Bremen', title: 'Buch dir einen Einstufungstermin',
    intro: 'Wähl eine Zeit und komm zu uns in die Schule. Gemeinsam finden wir dein Niveau und den Kurs, der zu dir passt.',
    schedule: '30 Minuten · Dienstag–Donnerstag · in der Schule', zone: 'Alle Zeiten gelten für Bremen.',
    date: 'Tag auswählen', time: 'Uhrzeit auswählen', next: 'Weiter', back: 'Termin ändern',
    previousMonth: 'Vorheriger Monat', nextMonth: 'Nächster Monat', close: 'Schließen', loading: 'Termine werden geladen …',
    unavailable: 'Die Terminauswahl ist gerade nicht verfügbar. Schreib uns, dann vereinbaren wir gern einen Termin mit dir.',
    contact: 'Nachricht senden', noTimes: 'An diesem Tag ist leider kein Platz mehr frei. Bitte wähle einen anderen Tag.',
    choose: 'Wähle einen Tag, um die freien Uhrzeiten zu sehen.', oneLeft: 'noch 1 Platz',
    details: 'Deine Angaben', first: 'Vorname', last: 'Nachname', email: 'E-Mail-Adresse', phone: 'Telefon (optional)',
    message: 'Möchtest du uns noch etwas sagen? (optional)', privacy: 'Ich habe die', privacyLink: 'Datenschutzerklärung gelesen',
    note: 'Du bekommst eine Bestätigung per E-Mail.',
    submit: 'Termin buchen', sending: 'Wird gebucht …', error: 'Dein Termin konnte nicht gebucht werden. Bitte versuch es erneut.',
    taken: 'Der letzte Platz zu dieser Zeit wurde gerade gebucht. Bitte wähle eine andere Zeit.',
    success: 'Dein Termin ist gebucht', thanks: 'Vielen Dank. Wir freuen uns auf dich in der Schule, Am Dobben 14–16 in Bremen.',
    successUnheld: 'Deine Anfrage ist angekommen', thanksUnheld: 'Vielen Dank. Wir prüfen deine Wunschzeit und bestätigen dir den Termin per E-Mail.',
    done: 'Fertig', weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  },
} as const;

/** The placement test in person, by appointment (2026-10-28): pick a time, leave a name, come over. */
export function PlacementAppointmentDialog({ locale, className }: { locale: ContentLocale; className?: string }) {
  const { pickTree } = useSiteCopy();
  const [open, setOpen] = useState(false);
  const t = pickTree(locale, copy);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="prism" size="lg" className={className}>{t.trigger}</Button>
    </DialogTrigger>
    <DialogContent closeLabel={t.close} brandStripe className="max-w-3xl">
      {open && <BookingFlow locale={locale} onDone={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}

function BookingFlow({ locale, onDone }: { locale: ContentLocale; onDone: () => void }) {
  const { intl, pickTree } = useSiteCopy();
  const t = pickTree(locale, copy);
  const language = intl(locale);
  const [days, setDays] = useState<PlacementDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  // False without a database: the request still reaches CASA, but nothing books the place.
  const [held, setHeld] = useState(true);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (details || booked) stepHeading.current?.focus();
  }, [details, booked]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/placement-appointments', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable');
        const body = await response.json();
        const available: PlacementDay[] = body.data.days;
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
      const response = await fetch('/api/placement-appointments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locale, date, time, firstName: form.get('firstName'), lastName: form.get('lastName'),
          email: form.get('email'), phone: form.get('phone'), message: form.get('message'),
          website: form.get('website'), privacy: form.get('privacy') === 'on',
        }),
      });
      if (response.status === 409) {
        setDays((current) => current.map((day) => day.date === date ? { ...day, times: day.times.filter((slot) => slot !== time) } : day));
        setTime(''); setDetails(false); setError(t.taken); return;
      }
      if (!response.ok) throw new Error('failed');
      const body = await response.json();
      setConfirmationSent(body.data.confirmationSent === true);
      setHeld(body.data.held !== false);
      setBooked(true);
    } catch { setError(t.error); }
    finally { setSending(false); }
  }

  return <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)]">
    <header className="border-b border-[var(--casa-sand)] px-5 pb-6 pt-8 sm:px-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{t.eyebrow}</p>
      <DialogTitle ref={booked ? stepHeading : undefined} tabIndex={booked ? -1 : undefined} className="pr-7 text-2xl sm:text-3xl">
        {booked ? (held ? t.success : t.successUnheld) : t.title}
      </DialogTitle>
      <DialogDescription className="mt-3 max-w-xl text-sm">{booked ? (held ? t.thanks : t.thanksUnheld) : t.intro}</DialogDescription>
      {booked && confirmationSent ? <p className="mt-2 max-w-xl text-sm font-medium text-[var(--casa-ink)]">{confirmationNotice(locale)}</p> : null}
      <p className="mt-4 flex items-center gap-2 text-sm text-[var(--casa-ink)]"><Clock aria-hidden className="size-4" />{t.schedule}</p>
    </header>
    <div className="p-5 sm:p-8">
      {booked ? <div role="status" className="space-y-5">
        <Check aria-hidden className="size-7 text-[var(--casa-accent-text)]" />
        <p className="font-semibold">{dateLabel(date)} · {time}</p>
        <p className="text-sm text-[var(--casa-muted)]">{t.zone}</p>
        <Button variant="prism" size="lg" onClick={onDone}>{t.done}</Button>
      </div> : loading ? <p role="status">{t.loading}</p> : unavailable ? <div role="status" className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{t.unavailable}</p>
        <Button asChild variant="prism" size="lg"><Link href="/contact?topic=placement-in-person">{t.contact}</Link></Button>
      </div> : <>
        {error && <p role="alert" className="mb-5 text-sm text-[var(--casa-danger-text)]">{error}</p>}
        {!details ? <>
          <SlotPicker days={days} date={date} time={time} language={language} labels={t}
            onDate={(value) => { setDate(value); setTime(''); setError(''); }} onTime={setTime}
            note={(day, slot) => days.find((item) => item.date === day)?.left[slot] === 1 ? t.oneLeft : null} />
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium">{t.email}<Input type="email" name="email" autoComplete="email" required maxLength={254} className="h-11" /></label>
              <label className="block space-y-2 text-sm font-medium">{t.phone}<Input type="tel" name="phone" autoComplete="tel" maxLength={40} pattern="[\+\(\)0-9\s\/\-]*" className="h-11" /></label>
            </div>
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
