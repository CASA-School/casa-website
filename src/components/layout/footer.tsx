'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { footerConfig } from '@/config/footer';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';
import type { ContentLocale } from '@/lib/content/types';

const deFooterText: Record<string, string> = {
  'Consistent Help': 'Verlässliche Hilfe',
  'Ready to start German in Bremen?': 'Bereit für Deutsch in Bremen?',
  'Find my course': 'Kurs finden',
  'Talk to an advisor': 'Beratung anfragen',
  'Non-profit language school in Bremen. Since 1983.': 'Gemeinnützige Sprachschule in Bremen. Seit 1983.',
  'Office Hours': 'Öffnungszeiten',
  'Monday - Thursday: 08:30 - 19:00': 'Montag - Donnerstag: 08:30 - 19:00',
  'Friday: 08:30 - 13:00': 'Freitag: 08:30 - 13:00',
  School: 'Schule',
  'Our School': 'Unsere Schule',
  'Non-profit status': 'Gemeinnützigkeit',
  Team: 'Team',
  'Tandem program': 'Tandemprogramm',
  'Partners & agencies': 'Partner & Agenturen',
  News: 'News',
  'Careers & jobs': 'Karriere & Jobs',
  Learn: 'Lernen',
  'Intensive courses': 'Intensivkurse',
  'Evening courses': 'Abendkurse',
  'Special courses': 'Spezialkurse',
  'German for Medical': 'Deutsch für Medizin',
  'German for Groups': 'Deutsch für Gruppen',
  Bildungszeit: 'Bildungszeit',
  Firmenunterricht: 'Firmenunterricht',
  'Levels & placement': 'Niveau & Einstufung',
  Support: 'Support',
  Registration: 'Anmeldung',
  'Exam dates & registration': 'Prüfungstermine & Anmeldung',
  'Accommodation request': 'Unterkunftsanfrage',
  FAQ: 'FAQ',
  Contact: 'Kontakt',
  Imprint: 'Impressum',
  'Privacy Policy': 'Datenschutz',
  'Terms & Conditions': 'AGB',
  'All rights reserved.': 'Alle Rechte vorbehalten.',
};

function footerText(value: string, locale: ContentLocale) {
  if (locale !== 'de') {
    return value;
  }

  return deFooterText[value] ?? value;
}

type FooterProps = {
  /** Resolved on the server — see the note in Navbar about hydration. */
  contentLocale: ContentLocale;
};

export function Footer({ contentLocale: locale }: FooterProps) {
  const socialIconMap = {
    facebook: Facebook,
    instagram: Instagram,
  } as const;

  return (
    <footer className="border-t border-white/10 bg-[var(--casa-ink-deep)] text-white">
      <div className="border-b border-white/10 bg-[var(--casa-ink-panel)]">
        <Container className="py-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]/90">
                {footerText('Consistent Help', locale)}
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                {footerText('Ready to start German in Bremen?', locale)}
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="prism"
                className="rounded-lg font-bold"
              >
                <Link href="/courses">{footerText('Find my course', locale)}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-lg casa-button-outline border-white/25 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">{footerText('Talk to an advisor', locale)}</Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-16">
        {/* Mobile layout: simple footer */}
        <div className="flex flex-col gap-8 md:hidden">
          <div className="space-y-4">
            <Link
              href="/"
              aria-label="Go to CASA homepage"
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
            >
              <Logo className="h-8 w-auto" variant="white" />
            </Link>
            <p className="text-sm font-medium text-[var(--casa-text-subtle)]">
              {footerText('Non-profit language school in Bremen. Since 1983.', locale)}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-[var(--casa-amber)] mt-0.5" />
              <a
                href={footerConfig.contact.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                {footerConfig.contact.address}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 shrink-0 text-[var(--casa-amber)]" />
              <a
                href={`tel:${footerConfig.contact.phone}`}
                className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                {footerConfig.contact.phone}
              </a>
            </div>
            {footerConfig.contact.emails.map((email) => (
              <div key={email.label} className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-[var(--casa-amber)]" />
                <a
                  href={email.href}
                  className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                >
                  {email.label}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop layout: detailed footer */}
        <div className="hidden grid-cols-1 gap-12 md:grid md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="inline-flex px-1 py-1">
              <Link
                href="/"
                aria-label="Go to CASA homepage"
                className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                <Logo className="h-8 w-auto" variant="white" />
              </Link>
            </div>
            <p className="text-sm font-medium text-[var(--casa-text-subtle)]">
              {footerText('Non-profit language school in Bremen. Since 1983.', locale)}
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--casa-amber)]" />
                <a
                  href={footerConfig.contact.mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                >
                  {footerConfig.contact.address}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-[var(--casa-amber)]" />
                <a
                  href={`tel:${footerConfig.contact.phone}`}
                  className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                >
                  {footerConfig.contact.phone}
                </a>
              </div>
              <div className="space-y-2">
                {footerConfig.contact.emails.map((email) => (
                  <div key={email.label} className="flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-[var(--casa-amber)]" />
                    <a
                      href={email.href}
                      className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                    >
                      {email.label}
                    </a>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                  {footerText('Office Hours', locale)}
                </p>
                <ul className="space-y-1 text-sm text-[var(--casa-text-subtle)]">
                  {footerConfig.contact.officeHours.map((entry) => (
                    <li key={entry}>{footerText(entry, locale)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {footerConfig.columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-6 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                {footerText(col.title, locale)}
              </h4>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white hover:underline hover:decoration-[var(--casa-amber)] hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                    >
                      {footerText(item.label, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/10 pt-8 md:flex-row md:justify-between">
          <p className="text-xs text-[var(--casa-text-subtle)]">
            &copy; {new Date().getFullYear()} CASA - Internationale Sprachschule gemeinnützige GmbH. {footerText('All rights reserved.', locale)}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
            {footerConfig.legalLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                {footerText(item.label, locale)}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {footerConfig.socialLinks.map((item) => {
              const Icon = socialIconMap[item.platform];
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-[var(--casa-text-subtle)] transition-colors hover:border-[var(--casa-amber)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </Container>
    </footer>
  );
}
