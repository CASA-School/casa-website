import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { ContactInquiryForm } from '@/components/forms/contact-inquiry-form';
import { HeroEMinimal } from '@/components/heroes';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { footerConfig } from '@/config/footer';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPageHero } from '@/lib/content/repository';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Contact CASA',
  description: 'Contact CASA for course advice, exam registration support, and accommodation questions.',
  path: '/contact',
  keywords: ['Contact CASA', 'Admissions Bremen', 'Language school support'],
});

type TopicConfig = {
  key: string;
  labels: {
    en: string;
    de: string;
  };
  aliases: string[];
};

type ContactPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const topicCatalog: TopicConfig[] = [
  {
    key: 'course-advice',
    labels: { en: 'Course advice', de: 'Kursberatung' },
    aliases: ['course-advice', 'course', 'courses', 'kurs', 'kursberatung'],
  },
  {
    key: 'registration-support',
    labels: { en: 'Registration support', de: 'Anmeldung' },
    aliases: ['registration', 'register', 'anmeldung'],
  },
  {
    key: 'placement-test',
    labels: { en: 'Placement test', de: 'Einstufung' },
    aliases: ['placement', 'placement-test', 'placement-online', 'placement-in-person', 'einstufung'],
  },
  {
    key: 'exam-registration',
    labels: { en: 'Exam registration', de: 'Prüfungsanmeldung' },
    aliases: ['exam', 'exam-registration', 'prüfung', 'prüfungsanmeldung'],
  },
  {
    key: 'bildungszeit-azav',
    labels: { en: 'Bildungszeit / AZAV', de: 'Bildungszeit / AZAV' },
    aliases: ['bildungszeit', 'azav', 'educational-leave', 'funding'],
  },
  {
    key: 'medical-german',
    labels: { en: 'Medical German', de: 'Deutsch für Medizin' },
    aliases: ['medical', 'medical-german', 'medizin', 'deutsch-für-medizin', 'fsp'],
  },
  {
    key: 'company-courses',
    labels: { en: 'Company courses', de: 'Firmenunterricht' },
    aliases: ['company', 'company-courses', 'corporate', 'business', 'firmenunterricht', 'firma'],
  },
  {
    key: 'group-booking',
    labels: { en: 'Group booking', de: 'Gruppenanfrage' },
    aliases: ['group', 'group-booking', 'groups', 'gruppe', 'gruppen', 'gruppenanfrage', 'schulklasse'],
  },
  {
    key: 'accommodation-support',
    labels: { en: 'Accommodation support', de: 'Unterkunft' },
    aliases: ['accommodation', 'housing', 'unterkunft'],
  },
  {
    key: 'host-family',
    labels: { en: 'Host family application', de: 'Gastfamilie werden' },
    aliases: ['host-family', 'host', 'become-host', 'gastfamilie', 'gastfamilie-werden'],
  },
  {
    key: 'agency-partnership',
    labels: { en: 'Agency partnership', de: 'Agenturpartnerschaft' },
    aliases: ['agency', 'agency-partnership', 'agentur', 'agenturpartnerschaft'],
  },
  {
    key: 'careers',
    labels: { en: 'Career opportunities', de: 'Karriere' },
    aliases: ['career', 'careers', 'job', 'jobs', 'karriere'],
  },
];

function normalizeTopicValue(value: string | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves `?topic=` to a catalog key. Returns an empty string when nothing
 * matches; the form then falls back to its first option.
 */
function getInitialTopicKey(rawTopic: string | undefined, locale: 'en' | 'de') {
  const normalized = normalizeTopicValue(rawTopic);
  if (!normalized) {
    return '';
  }

  const match = topicCatalog.find((item) => {
    const localizedLabel = locale === 'de' ? item.labels.de : item.labels.en;
    return item.aliases.includes(normalized) || normalizeTopicValue(localizedLabel) === normalized;
  });

  return match?.key ?? '';
}

const formCopyByLocale = {
  en: {
    formTitle: 'Send your request',
    formBody: 'Tell us your current level, target, preferred start date, and whether exam, visa, Bildungszeit/AZAV, or housing deadlines matter. We will answer with a clear next step.',
    submit: 'Send',
    submitting: 'Sending your request...',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Last name (optional)',
    lastNamePlaceholder: 'Mueller',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'Topic',
    topicPlaceholder: 'Select a topic',
    messageLabel: 'Message',
    messagePlaceholder: 'Example: I am currently A2, need evening classes, want to start in August, and may need telc B2 or housing support.',
    successTitle: 'Request received',
    successBody: 'Thank you. CASA usually replies within one business day with a concrete recommendation.',
    sendAnother: 'Send another request',
    errorTitle: 'Submission issue',
    errorBody: 'Please try again or contact us directly if your request is time-sensitive.',
    responseTitle: 'Response promise',
    responseValue: 'Usually within 1 business day',
    responseBody: 'For urgent deadlines, call the office directly during opening hours.',
    callCta: 'Call the office',
    officeDetails: 'Office details',
    officeHours: 'Office hours',
    placementPromptTitle: 'Need level advice first?',
    placementPromptBody: 'Take the placement test before registration.',
    placementPromptCta: 'Start level check',
    registrationPromptTitle: 'Already decided?',
    registrationPromptBody: 'Go directly to course registration.',
    registrationPromptCta: 'Reserve course spot',
  },
  de: {
    formTitle: 'Anfrage senden',
    formBody: 'Nennen Sie bitte Ihr aktuelles Niveau, Ziel, Wunschstart und ob Prüfung, Visum, Bildungszeit/AZAV oder Unterkunft wichtig sind. Wir antworten mit einem klaren nächsten Schritt.',
    submit: 'Senden',
    submitting: 'Anfrage wird übermittelt...',
    firstNameLabel: 'Vorname',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Nachname (optional)',
    lastNamePlaceholder: 'Müller',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'Thema',
    topicPlaceholder: 'Thema auswählen',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Beispiel: Ich bin aktuell A2, suche Abendkurse, möchte im August starten und brauche eventuell telc B2 oder Unterkunft.',
    successTitle: 'Anfrage eingegangen',
    successBody: 'Vielen Dank. CASA meldet sich in der Regel innerhalb eines Werktages mit einer konkreten Empfehlung.',
    sendAnother: 'Weitere Anfrage senden',
    errorTitle: 'Übermittlung nicht möglich',
    errorBody: 'Bitte erneut versuchen oder bei Zeitdruck direkt im Büro melden.',
    responseTitle: 'Antwortzeit',
    responseValue: 'Meist innerhalb eines Werktags',
    responseBody: 'Bei dringenden Fristen rufen Sie das Büro bitte direkt an.',
    callCta: 'Büro anrufen',
    officeDetails: 'Kontaktdaten',
    officeHours: 'Öffnungszeiten',
    placementPromptTitle: 'Unsicher beim Niveau?',
    placementPromptBody: 'Starten Sie zuerst mit der Einstufung.',
    placementPromptCta: 'Level-Check starten',
    registrationPromptTitle: 'Schon entschieden?',
    registrationPromptBody: 'Direkt zur Kursanmeldung wechseln.',
    registrationPromptCta: 'Zur Kursanmeldung',
  },
} as const;

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const locale = await getContentLocale();
  const resolvedSearchParams = await Promise.resolve(searchParams).then((value) => value ?? {});
  const rhythm = getLayoutRhythm('legal');
  const hero = getPageHero('contact', locale);

  const copy = formCopyByLocale[locale];
  const topics = topicCatalog.map((topic) => ({
    key: topic.key,
    label: locale === 'de' ? topic.labels.de : topic.labels.en,
  }));
  const topicParamValue = Array.isArray(resolvedSearchParams.topic)
    ? resolvedSearchParams.topic[0]
    : resolvedSearchParams.topic;
  const initialTopicKey = getInitialTopicKey(topicParamValue, locale);

  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'CASA Contact',
    url: toAbsoluteUrl('/contact'),
  };

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Kontakt' : 'Contact' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />

      <HeroEMinimal
        eyebrow={hero.eyebrow}
        title={hero.headline}
        description={hero.subheadline}
        breadcrumbs={breadcrumbs}
        cta={{ label: locale === 'de' ? 'CASA-Plan anfragen' : 'Get my CASA plan', href: '#contact-form', kind: 'primary' }}
        meta={hero.proofMetrics.slice(0, 1).map((item) => `${item.value} ${item.label}`)}
      />

      <section className="bg-[linear-gradient(180deg,var(--casa-bg)_0%,#f8fafc_100%)] py-16 md:py-20">
        {/*
          `max-w-7xl` used to sit on this Container. Because `cn` is
          tailwind-merge, that REPLACED the site ceiling rather than layering on
          it, so /contact silently rendered 160px narrower than every other page
          — and 400px narrower once the ceiling moved to 1680.

          The override is gone, but the aside is now capped instead: a form plus
          an icon-and-text contact list stretched across 1600px reads as broken,
          and the fractional `0.85fr` column would have grown to ~740px. The row
          keeps a comfortable measure and sits left rather than being centred by
          a container that lied about the page width.
        */}
        <Container>
          <div
            id="contact-form"
            className="grid max-w-[88rem] scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,26rem)]"
          >
            <ContactInquiryForm locale={locale} topics={topics} initialTopicKey={initialTopicKey} copy={copy} />

            <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">
              <aside className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-[var(--casa-surface-wash)]/50 p-6 sm:p-8 space-y-8 shadow-[var(--shadow-soft)]">
                {/* Response promise */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                      <Clock className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">{copy.responseTitle}</p>
                      <p className="mt-0.5 text-xl font-bold text-[var(--casa-ink)]">{copy.responseValue}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{copy.responseBody}</p>
                </div>

                <hr className="border-[color:var(--casa-sand)]/40" />

                {/* Office Details */}
                <div className="space-y-5">
                  <h3 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">{copy.officeDetails}</h3>
                  <ul className="space-y-4 text-sm text-[var(--casa-ink)]">
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                      <span className="leading-relaxed">{footerConfig.contact.address}</span>
                    </li>
                    <li className="flex gap-3">
                      <Phone className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                      <a href={`tel:${footerConfig.contact.phone}`} className="font-semibold text-[var(--casa-ink)] hover:text-[var(--casa-accent-text)] hover:underline">
                        {footerConfig.contact.phone}
                      </a>
                    </li>
                    <li className="flex gap-3">
                      <Mail className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
                      <a href={footerConfig.contact.emails[0]?.href || 'mailto:info@casa-bremen.de'} className="font-semibold text-[var(--casa-ink)] hover:text-[var(--casa-accent-text)] hover:underline">
                        {footerConfig.contact.emails[0]?.label || 'info@casa-bremen.de'}
                      </a>
                    </li>
                  </ul>
                </div>

                <hr className="border-[color:var(--casa-sand)]/40" />

                {/* CTA Action */}
                <div className="pt-2">
                  <Button asChild variant="prism" className="h-11 w-full rounded-lg px-4 shadow-[var(--shadow-card)] shadow-[var(--casa-ink-deep)]/10">
                    <a href={`tel:${footerConfig.contact.phone}`}>
                      <Phone className="h-4 w-4" />
                      {copy.callCta}
                    </a>
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
