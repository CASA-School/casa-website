import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';

import { ContactInquiryForm } from '@/components/forms/contact-inquiry-form';
import { HeroEMinimal } from '@/components/heroes';
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
    formBody: 'Have a question or a plan in mind? Write to us — we’ll help you find your next step.',
    submit: 'Send message',
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
    messagePlaceholder: 'What would you like to know?',
    successTitle: 'Request received',
    successBody: 'Thank you for getting in touch. Our team will read your message and reply to your questions.',
    sendAnother: 'Send another request',
    errorTitle: 'Submission issue',
    errorBody: 'Please try again or contact us directly if your request is time-sensitive.',
  },
  de: {
    formTitle: 'Wie können wir Ihnen helfen?',
    formBody: 'Sie haben eine Frage oder schon einen Plan? Schreiben Sie uns – wir helfen Ihnen gerne weiter.',
    submit: 'Nachricht senden',
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
    messagePlaceholder: 'Was möchten Sie gerne wissen?',
    successTitle: 'Anfrage eingegangen',
    successBody: 'Vielen Dank für Ihre Nachricht. Unser Team liest Ihre Anfrage und meldet sich bei Ihnen.',
    sendAnother: 'Weitere Anfrage senden',
    errorTitle: 'Übermittlung nicht möglich',
    errorBody: 'Bitte erneut versuchen oder bei Zeitdruck direkt im Büro melden.',
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

      <section className="bg-[var(--casa-canvas)] py-12 md:py-16">
        <Container>
          <div
            id="contact-form"
            className="grid max-w-[88rem] scroll-mt-28 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
          >
            <ContactInquiryForm locale={locale} topics={topics} initialTopicKey={initialTopicKey} copy={copy} />

            <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">
              <aside className="rounded-3xl bg-[var(--casa-ink-deep)] p-6 text-white sm:p-8">
                <h2 className="text-2xl font-bold text-white">
                  {locale === 'de' ? 'Lieber persönlich sprechen?' : 'Prefer to talk?'}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {locale === 'de'
                    ? 'Rufen Sie uns während unserer Bürozeiten an oder schreiben Sie uns eine E-Mail. Wir nehmen uns Zeit für Ihre Fragen.'
                    : 'Call us during office hours or send us an email. We’re happy to talk through your questions.'}
                </p>
                <ul className="mt-7 space-y-6 border-t border-white/20 pt-7 text-sm">
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
                    <a href={`tel:${footerConfig.contact.phone}`} className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                      {footerConfig.contact.phone}
                    </a>
                  </li>
                  <li className="flex min-w-0 gap-3">
                    <Mail className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
                    <a href={footerConfig.contact.emails[0]?.href || 'mailto:info@casa-bremen.de'} className="min-w-0 break-words font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                      {footerConfig.contact.emails[0]?.label || 'info@casa-bremen.de'}
                    </a>
                  </li>
                  <li className="flex gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--casa-sun)]" aria-hidden />
                    <span className="leading-relaxed text-white/85">{footerConfig.contact.address}</span>
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
