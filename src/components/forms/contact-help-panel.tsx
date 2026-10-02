import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';

import { footerConfig } from '@/config/footer';
import type { ContentLocale } from '@/lib/content/types';

type ContactHelpPanelProps = {
  locale: ContentLocale;
  title: string;
  body: string;
};

const dayLabels: Record<string, { de: string; en: string }> = {
  'Monday - Thursday': { de: 'Montag – Donnerstag', en: 'Monday – Thursday' },
  Friday: { de: 'Freitag', en: 'Friday' },
};

/** "Monday - Thursday: 08:30 - 19:00" from the footer config, as a day and a time. */
function officeHours(locale: ContentLocale) {
  return footerConfig.contact.officeHours.map((line) => {
    const [days, ...time] = line.split(': ');
    return {
      days: dayLabels[days]?.[locale] ?? days,
      time: time.join(': ').replace(' - ', ' – '),
    };
  });
}

/**
 * The address on its lines. The config holds it as one English string for the
 * footer; a German page does not need "Germany" under a Bremen postcode.
 */
function addressLines(locale: ContentLocale) {
  const [street, city, country] = footerConfig.contact.address.split(', ');
  const lines = [street.replace(/(\d)-(\d)/, '$1–$2'), city];
  return locale === 'en' && country ? [...lines, country] : lines;
}

/**
 * The office beside a form: phone, email, address and opening hours, on the
 * dark ink panel. The contact page and both registration pages use it, so a
 * learner stuck in a form always has the person on the other end in view.
 */
export function ContactHelpPanel({ locale, title, body }: ContactHelpPanelProps) {
  const de = locale === 'de';
  const phone = footerConfig.contact.phone;
  const email = footerConfig.contact.emails[0];

  return (
    <aside className="rounded-3xl bg-[var(--casa-ink-deep)] p-6 text-white sm:p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{body}</p>

      <ul className="mt-7 space-y-5 border-t border-white/15 pt-7 text-sm">
        <li className="flex gap-3">
          <Phone className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {phone}
          </a>
        </li>
        {email ? (
          <li className="flex min-w-0 gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
            <a
              href={email.href}
              className="min-w-0 break-words font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              {email.label}
            </a>
          </li>
        ) : null}
        <li className="flex gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
          <div className="min-w-0">
            <address className="not-italic leading-relaxed text-white/85">
              {addressLines(locale).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={footerConfig.contact.mapsHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              {de ? 'Route planen' : 'Get directions'}
              <ArrowRight className="size-3.5" aria-hidden />
              <span className="sr-only">{de ? '(öffnet Google Maps in einem neuen Tab)' : '(opens Google Maps in a new tab)'}</span>
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-white">{de ? 'Öffnungszeiten' : 'Office hours'}</p>
            <dl className="mt-1.5 space-y-1 text-white/85">
              {officeHours(locale).map((row) => (
                <div key={row.days} className="flex flex-wrap justify-between gap-x-4">
                  <dt>{row.days}</dt>
                  <dd className="tabular-nums">{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </li>
      </ul>
    </aside>
  );
}
