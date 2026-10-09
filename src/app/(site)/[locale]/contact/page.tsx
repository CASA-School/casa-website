import type { Metadata } from 'next';
import { ArrowRight, Compass, FileCheck2, GraduationCap, type LucideIcon } from 'lucide-react';

import { ContactHelpPanel } from '@/components/forms/contact-help-panel';
import { ContactInquiryForm } from '@/components/forms/contact-inquiry-form';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { serializeJsonLd } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { Link } from '@/i18n/navigation';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Kontakt und Beratung' : 'Contact and advice',
    description: locale === 'de'
      ? 'Du hast Fragen zu Deutschkursen, Prüfungen, Unterkunft oder deinen nächsten Schritten? Das CASA-Team in Bremen nimmt sich Zeit für dich.'
      : 'Do you have questions about German courses, exams, accommodation or your next steps? The CASA team in Bremen will take the time to help you.',
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
  /** Offered only when a link asks for it with `?topic=`. */
  onlyWhenRequested?: boolean;
};

type ContactPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const topicCatalog: TopicConfig[] = [
  {
    // The new-website notice links here (src/config/site-notice.ts).
    key: 'website-feedback',
    labels: { en: 'Website feedback', de: 'Feedback zur Website' },
    aliases: ['website-feedback', 'feedback'],
    onlyWhenRequested: true,
  },
  {
    key: 'course-advice',
    labels: { en: 'Courses', de: 'Kurse' },
    aliases: ['course-advice', 'course', 'courses', 'kurs', 'kurse', 'kursberatung',
      'registration-support', 'registration', 'register', 'anmeldung',
      'placement', 'placement-test', 'placement-online', 'placement-in-person', 'einstufung',
      'bildungszeit-azav', 'bildungszeit', 'azav', 'educational-leave', 'funding',
      'medical', 'medical-german', 'medizin', 'deutsch-für-medizin', 'fsp'],
  },
  {
    key: 'exam-registration',
    labels: { en: 'Exams', de: 'Prüfungen' },
    aliases: ['exam', 'exams', 'exam-registration', 'prüfung', 'prüfungen', 'prüfungsanmeldung'],
  },
  {
    key: 'accommodation-support',
    labels: { en: 'Accommodation', de: 'Unterkunft' },
    aliases: ['accommodation-support', 'accommodation', 'housing', 'unterkunft',
      'host-family', 'host', 'become-host', 'gastfamilie', 'gastfamilie-werden'],
  },
  {
    key: 'group-booking',
    labels: { en: 'Groups', de: 'Gruppen' },
    aliases: ['group', 'group-booking', 'groups', 'gruppe', 'gruppen', 'gruppenanfrage', 'schulklasse'],
  },
  {
    key: 'company-courses',
    labels: { en: 'In-company teaching', de: 'Firmenunterricht' },
    aliases: ['company', 'company-courses', 'corporate', 'business', 'firmenunterricht', 'firmenkurse', 'firma'],
  },
  {
    key: 'other',
    labels: { en: 'Other questions', de: 'Sonstige Fragen' },
    aliases: ['other', 'agency', 'agency-partnership', 'agentur', 'agenturpartnerschaft',
      'career', 'careers', 'job', 'jobs', 'karriere', 'tandem', 'sprachtandem'],
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
    return item.aliases.some(alias => normalizeTopicValue(alias) === normalized)
      || normalizeTopicValue(localizedLabel) === normalized;
  });

  return match?.key ?? '';
}

const formCopyByLocale = {
  en: {
    formTitle: 'How can we help you?',
    formBody: 'Do you have a question, or do you already have a plan? Write to us. We’ll be glad to help.',
    submit: 'Send message',
    submitting: 'Sending your enquiry...',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Last name (optional)',
    lastNamePlaceholder: 'Mueller',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'What is it about?',
    messageLabel: 'Message',
    messagePlaceholder: 'What would you like to know?',
    successTitle: 'Enquiry received',
    successBody: 'Thank you for your message. We’ll read your enquiry and get back to you.',
    sendAnother: 'Send another enquiry',
    errorTitle: 'Your message could not be sent',
    errorBody: 'Please try again. If it’s urgent, contact the office directly.',
  },
  de: {
    formTitle: 'Wie können wir dir helfen?',
    formBody: 'Du hast eine Frage oder schon einen Plan? Schreib uns. Wir helfen dir gern weiter.',
    submit: 'Nachricht senden',
    submitting: 'Anfrage wird übermittelt...',
    firstNameLabel: 'Vorname',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Nachname (optional)',
    lastNamePlaceholder: 'Müller',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'Worum geht es?',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Was möchtest du wissen?',
    successTitle: 'Anfrage eingegangen',
    successBody: 'Vielen Dank für deine Nachricht. Wir lesen deine Anfrage und melden uns bei dir.',
    sendAnother: 'Weitere Anfrage senden',
    errorTitle: 'Übermittlung nicht möglich',
    errorBody: 'Bitte versuche es noch einmal. Wenn es eilig ist, melde dich direkt im Büro.',
  },
} as const;

/**
 * What a visitor can do without writing at all. Each row in the logo colour of
 * its subject: red courses, ink exams, blue orientation (the placement page
 * with the Klett online tests).
 */
const selfServiceLinks: { href: string; icon: LucideIcon; meaning: Meaning; label: { de: string; en: string }; detail: { de: string; en: string } }[] = [
  {
    href: '/registration/course',
    icon: GraduationCap,
    meaning: 'courses',
    label: { de: 'Kursanmeldung', en: 'Course registration' },
    detail: { de: 'Kurs und Starttermin wählen', en: 'Choose a course and start date' },
  },
  {
    href: '/registration/exam',
    icon: FileCheck2,
    meaning: 'exams',
    label: { de: 'Prüfungsanmeldung', en: 'Exam registration' },
    detail: { de: 'Prüfung und Termin wählen', en: 'Choose an exam and date' },
  },
  {
    href: '/placement-test',
    icon: Compass,
    meaning: 'orientation',
    label: { de: 'Einstufungstest', en: 'Placement test' },
    detail: { de: 'Dein Niveau online herausfinden', en: 'Find your level online' },
  },
];

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const locale = await getContentLocale();
  const resolvedSearchParams = await Promise.resolve(searchParams).then((value) => value ?? {});
  const rhythm = getLayoutRhythm('legal');

  const copy = formCopyByLocale[locale];
  const topicParamValue = Array.isArray(resolvedSearchParams.topic)
    ? resolvedSearchParams.topic[0]
    : resolvedSearchParams.topic;
  const initialTopicKey = getInitialTopicKey(topicParamValue, locale);
  const topics = topicCatalog
    .filter((topic) => !topic.onlyWhenRequested || topic.key === initialTopicKey)
    .map((topic) => ({
      key: topic.key,
      label: locale === 'de' ? topic.labels.de : topic.labels.en,
    }));

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactSchema) }} />

      <section className="pb-14 pt-6 md:pb-20 md:pt-8">
        <Container>
          <Breadcrumbs items={breadcrumbs} />
          <header className="mt-4 max-w-2xl">
            <h1 className="text-3xl font-bold md:text-4xl">
              {locale === 'de' ? 'Kontakt' : 'Contact'}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {locale === 'de'
                ? 'Schreib uns, ruf an oder komm vorbei.'
                : 'Write to us, give us a call or drop by.'}
            </p>
          </header>
          <div
            id="contact-form"
            className="mt-6 grid scroll-mt-28 items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.65fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:gap-8"
          >
            <ContactInquiryForm locale={locale} topics={topics} initialTopicKey={initialTopicKey} copy={copy} />

            <div className="min-w-0 space-y-5 md:sticky md:top-28 md:self-start">
              <ContactHelpPanel
                locale={locale}
                title={locale === 'de' ? 'Lieber persönlich sprechen?' : 'Prefer to talk to someone?'}
                body={locale === 'de'
                  ? 'Ruf uns an oder schreib uns. Während der Bürozeiten kannst du auch ohne Termin vorbeikommen, wir nehmen uns Zeit für dich.'
                  : 'Call us or send us an email. During office hours you can also drop in without an appointment, and we’ll take time for you.'}
              />

              <nav
                aria-labelledby="contact-self-service"
                className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-7"
              >
                <h2 id="contact-self-service" className="text-lg font-bold text-[var(--casa-ink)]">
                  {locale === 'de' ? 'Direkt online' : 'Do it online'}
                </h2>
                <ul className="mt-3 divide-y divide-[color:var(--casa-sand)]">
                  {selfServiceLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="group flex items-center gap-3 rounded-lg py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
                        >
                          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', meaningClasses[item.meaning].circle)}>
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--casa-ink)]">{item.label[locale]}</span>
                            <span className="block text-sm text-[var(--casa-muted)]">{item.detail[locale]}</span>
                          </span>
                          <ArrowRight
                            className="size-4 shrink-0 text-[var(--casa-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--casa-ink)] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
