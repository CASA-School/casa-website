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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Kontakt und Beratung' : 'Contact and advice',
    description: locale === 'de'
      ? 'Fragen zu Deutschkursen, Prüfungen, Unterkunft oder Ihren nächsten Schritten? Das CASA-Team in Bremen nimmt sich Zeit für Sie.'
      : 'Questions about German courses, exams, accommodation or what comes next? Talk to the CASA team in Bremen for personal advice.',
    path: '/contact',
    keywords: ['Contact CASA', 'Admissions Bremen', 'Language school support'],
  });
}

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
    formTitle: 'Tell us how we can help',
    formBody: 'Tell us about your plans and any questions you have. If you know your German level, preferred start date or an important deadline, include it. You do not need to have everything worked out.',
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
    messagePlaceholder: 'For example: I have some German and would like to study in Bremen. Could you help me choose a course and find out about accommodation?',
    successTitle: 'Request received',
    successBody: 'Thank you for getting in touch. Our team will read your message and reply to your questions.',
    sendAnother: 'Send another request',
    errorTitle: 'Submission issue',
    errorBody: 'Please try again or contact us directly if your request is time-sensitive.',
    responseTitle: 'Speak to us directly',
    responseValue: 'During office hours',
    responseBody: 'For urgent deadlines, call the office directly during opening hours.',
    callCta: 'Call the office',
    officeDetails: 'Office details',
    officeHours: 'Office hours',
    placementPromptTitle: 'Need level advice first?',
    placementPromptBody: 'The placement test helps us recommend a suitable course.',
    placementPromptCta: 'Start the placement test',
    registrationPromptTitle: 'Already decided?',
    registrationPromptBody: 'Go directly to course registration.',
    registrationPromptCta: 'Register for a course',
  },
  de: {
    formTitle: 'Anfrage senden',
    formBody: 'Schreiben Sie uns, was Sie vorhaben und welche Fragen Sie beschäftigen. Wenn Sie Ihr Sprachniveau, einen Wunschstart oder eine wichtige Frist kennen, nennen Sie diese gern. Sie müssen noch nicht alles entschieden haben.',
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
    messagePlaceholder: 'Zum Beispiel: Ich habe erste Deutschkenntnisse und möchte in Bremen studieren. Welcher Kurs passt zu mir und können Sie mir bei der Unterkunft helfen?',
    successTitle: 'Anfrage eingegangen',
    successBody: 'Vielen Dank für Ihre Nachricht. Unser Team liest Ihre Anfrage und meldet sich bei Ihnen.',
    sendAnother: 'Weitere Anfrage senden',
    errorTitle: 'Übermittlung nicht möglich',
    errorBody: 'Bitte erneut versuchen oder bei Zeitdruck direkt im Büro melden.',
    responseTitle: 'Persönlich erreichbar',
    responseValue: 'Während unserer Bürozeiten',
    responseBody: 'Bei dringenden Fristen rufen Sie das Büro bitte direkt an.',
    callCta: 'Büro anrufen',
    officeDetails: 'Kontaktdaten',
    officeHours: 'Öffnungszeiten',
    placementPromptTitle: 'Unsicher beim Niveau?',
    placementPromptBody: 'Starten Sie zuerst mit der Einstufung.',
    placementPromptCta: 'Einstufungstest starten',
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
        cta={{ label: locale === 'de' ? 'Nachricht schreiben' : 'Write to us', href: '#contact-form', kind: 'primary' }}
        meta={hero.proofMetrics.slice(0, 1).map((item) => `${item.value} ${item.label}`)}
      />

      {/*
        Plain white, not a white -> #f8fafc fade.

        The fade spanned 4 RGB units over 600px of height, so it read as flat
        anyway, and it ended on stock Tailwind slate-50 — a palette the brand
        tokens exist to replace (PREMIUM_UI_REVIEW §2.1). White on the page canvas
        is a real 11-unit step and says the same thing honestly.
      */}
      <section className="bg-white py-16 md:py-20">
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
              <aside className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-[var(--casa-surface-wash)] p-6 sm:p-8 space-y-8 shadow-[var(--shadow-soft)]">
                {/* Speak to us directly */}
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
