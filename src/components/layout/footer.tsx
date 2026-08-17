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

  const social = (
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
  );

  return (
    <footer className="bg-[var(--casa-ink-deep)] text-white">
      {/*
        The line over the footer.

        Was `border-t border-white/10` — a 1px rule in white-at-10% painted over
        the footer's own #111827, which computes to roughly #292f3d. Against the
        light page above it, that is invisible: the only thing marking the
        boundary was the raw light-to-dark tone switch.

        A 3px accent band instead, so the footer starts on a deliberate line
        rather than just going dark. Single accent, not the brand triad —
        globals.css retired the red/yellow/blue sweep for the reason recorded on
        `.casa-tricolor-rule`, and a multi-colour bar here would walk it straight
        back in. Blue fading toward the edge keeps it a mark rather than a stripe.

        The first attempt put a blue-to-sun midpoint in the gradient, which is
        why it does not: sRGB interpolation between #009FE3 and the sun yellow
        passes through green (measured: srgb 0.45 0.72 0.49). Reusing
        `.casa-tricolor-rule` avoids inventing a second rule for the same job.
      */}
      <div aria-hidden="true" className="casa-tricolor-rule h-[3px] w-full" />

      {/*
        Closing CTA. One button, one text link — it used to be two buttons of
        equal weight sitting side by side, which asked the reader to choose
        between them at the very bottom of the page. Registering is the action;
        talking to an advisor is a question, and it now reads as one.
      */}
      <div className="border-b border-white/10 bg-[var(--casa-ink-panel)]">
        <Container className="py-8">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]/90">
                {footerText('Consistent Help', locale)}
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                {footerText('Ready to start German in Bremen?', locale)}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <Button asChild variant="prism" className="rounded-lg font-bold">
                <Link href="/courses">{footerText('Find my course', locale)}</Link>
              </Button>
              <Link
                href="/contact"
                className="casa-cta-link inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-panel)]"
              >
                {footerText('Talk to an advisor', locale)}
                <svg aria-hidden="true" viewBox="0 0 22 8" fill="none" className="h-2 w-[20px] shrink-0">
                  <path
                    d="M0 4h20M16.5 0.6L20.4 4l-3.9 3.4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10 md:py-14 lg:py-16">
        {/* ---------------------------------------------------------------- */}
        {/* Mobile: identity, contact, social. No link index.                 */}
        {/*                                                                   */}
        {/* The 16 index links stay in the `md:grid` branch below, which is    */}
        {/* `display:none` here but still in the HTML — so crawlers keep every */}
        {/* internal link, and readers get a footer they can actually reach    */}
        {/* the end of. Navigation on a phone is the drawer's job.             */}
        {/*                                                                   */}
        {/* Measured: rendering the index here as a two-column list cost 559px */}
        {/* on a 375px viewport and pushed the footer to 1323px — which is the */}
        {/* overcrowding this pass exists to remove, so it came back out.      */}
        {/* What stays fixed is the spacing: the contact block below was h-5   */}
        {/* icons on `space-y-4` rows, giving four lines the footprint of a    */}
        {/* section.                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="md:hidden">
          <Link
            href="/"
            aria-label="Go to CASA homepage"
            className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
          >
            <Logo className="h-10 w-auto" variant="white" />
          </Link>
          <p className="mt-3 text-sm font-medium text-[var(--casa-text-subtle)]">
            {footerText('Non-profit language school in Bremen. Since 1983.', locale)}
          </p>

          <div className="mt-8 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-amber)]" />
              <a
                href={footerConfig.contact.mapsHref}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                {footerConfig.contact.address}
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[var(--casa-amber)]" />
              <a
                href={`tel:${footerConfig.contact.phone}`}
                className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                {footerConfig.contact.phone}
              </a>
            </div>
            {footerConfig.contact.emails.map((email) => (
              <div key={email.label} className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[var(--casa-amber)]" />
                <a
                  href={email.href}
                  className="text-sm text-[var(--casa-text-subtle)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
                >
                  {email.label}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-8">{social}</div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Desktop: the full index.                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="hidden grid-cols-1 gap-12 md:grid md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="inline-flex px-1 py-1">
              <Link
                href="/"
                aria-label="Go to CASA homepage"
                className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
              >
                <Logo className="h-10 w-auto" variant="white" />
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
      </Container>

      {/*
        Bottom bar. Moved out of the Container's padding box and onto its own
        full-width hairline, so the rule runs the width of the page the way the
        reference's does instead of stopping at the gutters. The social icons
        move up into the columns on mobile, so this row carries only the two
        things that belong in a colophon: the legal entity and the legal links.
      */}
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--casa-text-subtle)]">
            &copy; {new Date().getFullYear()} CASA - Internationale Sprachschule gemeinnützige GmbH.{' '}
            {footerText('All rights reserved.', locale)}
          </p>

          <div className="flex items-center gap-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
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
            <div className="hidden md:block">{social}</div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
