import { footerConfig } from '@/config/footer';
import { toPublicPath } from '@/i18n/pathnames';
import type { ContentLocale, CourseInstanceRow, ExamSessionRow } from '@/lib/content/types';
import { getSiteUrl, toAbsoluteUrl } from '@/lib/seo';

/**
 * Structured data (schema.org JSON-LD) for search engines and AI answer engines
 * (2026-10-10).
 *
 * One organisation, identified by `@id`, that every other node points to: the
 * layout emits it with the website on every page, and a course, an exam day, a
 * job or a breadcrumb trail on a page refers to it instead of repeating a
 * second, thinner copy. The facts are CASA's own and verifiable: the address
 * and coordinates from CASA's Google Maps entry, the office hours and contact
 * from the footer, the founding year from the site. Nothing here may be
 * guessed — a wrong opening hour in a knowledge panel is worse than none.
 */

export const organizationId = () => `${getSiteUrl()}/#organization`;
export const websiteId = () => `${getSiteUrl()}/#website`;

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'Am Dobben 14–16',
  postalCode: '28203',
  addressLocality: 'Bremen',
  addressRegion: 'Bremen',
  addressCountry: 'DE',
} as const;

/** CASA's pin on Google Maps (place "CASA - Internationale Sprachschule", a language school). */
const GEO = { '@type': 'GeoCoordinates', latitude: 53.0792514, longitude: 8.8208139 } as const;
const MAPS_URL = 'https://maps.google.com/?cid=4736578749741248132';

/** Where every course and exam takes place. */
export const schoolPlace = () => ({
  '@type': 'Place',
  name: 'CASA – Internationale Sprachschule',
  address: ADDRESS,
  geo: GEO,
});

const organizationRef = () => ({ '@id': organizationId() });

export function organizationNode(locale: ContentLocale) {
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': organizationId(),
    name: 'CASA – Internationale Sprachschule',
    alternateName: ['CASA Bremen', 'CASA Internationale Sprachschule Bremen'],
    legalName: 'CASA – Internationale Sprachschule gGmbH',
    description:
      locale === 'de'
        ? 'Gemeinnützige Sprachschule in Bremen seit 1983: Deutschkurse von A1 bis C1, telc-Prüfungen B2 und C1 Hochschule, Unterkunft in CASA-WGs und Gastfamilien.'
        : 'Non-profit language school in Bremen since 1983: German courses from A1 to C1, the telc B2 and C1 Hochschule exams, and accommodation in CASA shared flats and host families.',
    url: toAbsoluteUrl('/'),
    logo: { '@type': 'ImageObject', url: toAbsoluteUrl('/brand/casa-logo.png'), width: 1155, height: 325 },
    image: toAbsoluteUrl('/brand/casa-logo.png'),
    foundingDate: '1983',
    address: ADDRESS,
    geo: GEO,
    hasMap: MAPS_URL,
    telephone: footerConfig.contact.phone.replace(/\s+/g, ''),
    email: 'info@casa-bremen.de',
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '08:30', closes: '19:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '08:30', closes: '13:00' },
    ],
    sameAs: [...footerConfig.socialLinks.map((item) => item.href.split('?')[0]), MAPS_URL],
    knowsLanguage: ['de', 'en'],
    areaServed: { '@type': 'City', name: 'Bremen' },
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': websiteId(),
    url: toAbsoluteUrl('/'),
    name: 'CASA Bremen',
    alternateName: 'CASA – Internationale Sprachschule',
    inLanguage: ['de', 'en'],
    publisher: organizationRef(),
  };
}

/** The organisation and the website, on every page of the public site. */
export function siteGraph(locale: ContentLocale) {
  return { '@context': 'https://schema.org', '@graph': [organizationNode(locale), websiteNode()] };
}

/** The public URL of an internal path in a language. */
export const pageUrl = (internalPath: string, locale: ContentLocale) => toAbsoluteUrl(toPublicPath(internalPath, locale));

export type BreadcrumbTrail = { label: string; href?: string }[];

export function breadcrumbList(items: BreadcrumbTrail, locale: ContentLocale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: pageUrl(item.href.split('#')[0], locale) } : {}),
    })),
  };
}

const DAY = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' } as const;

type DayKey = keyof typeof DAY;

function readSchedule(schedule: CourseInstanceRow['schedule']) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  const record = schedule as Record<string, unknown>;
  const days: DayKey[] = Array.isArray(record.days)
    ? record.days.filter((day): day is DayKey => typeof day === 'string' && day in DAY)
    : [];
  const [startTime, endTime] = typeof record.time === 'string' ? record.time.split('-') : [];
  return days.length && startTime && endTime ? { days, startTime, endTime } : null;
}

export function courseNode(input: {
  locale: ContentLocale;
  path: string;
  name: string;
  description: string;
  levelMin: string | null;
  levelMax: string | null;
  /** null when the course is priced on request. */
  price: number | null;
  currency: string;
  /** The terms a learner can still book, soonest first. */
  instances: CourseInstanceRow[];
}) {
  const url = pageUrl(input.path, input.locale);
  const level = input.levelMin && input.levelMax ? (input.levelMin === input.levelMax ? input.levelMin : `${input.levelMin}–${input.levelMax}`) : null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${url}#course`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: 'de',
    teaches: input.locale === 'de' ? 'Deutsch als Fremdsprache' : 'German as a foreign language',
    ...(level ? { educationalLevel: `GER/CEFR ${level}` } : {}),
    provider: organizationRef(),
    ...(input.price !== null
      ? {
          offers: {
            '@type': 'Offer',
            category: 'Paid',
            price: input.price,
            priceCurrency: input.currency,
            url: pageUrl('/registration/course', input.locale),
          },
        }
      : {}),
    hasCourseInstance: (input.instances.length ? input.instances : [null]).slice(0, 8).map((instance) => {
      const schedule = instance ? readSchedule(instance.schedule) : null;
      return {
        '@type': 'CourseInstance',
        courseMode: 'Onsite',
        location: schoolPlace(),
        inLanguage: 'de',
        ...(instance ? { startDate: instance.start_date, endDate: instance.end_date } : {}),
        ...(schedule
          ? {
              courseSchedule: {
                '@type': 'Schedule',
                repeatFrequency: 'P1W',
                byDay: schedule.days.map((day) => `https://schema.org/${DAY[day]}`),
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                ...(instance ? { startDate: instance.start_date, endDate: instance.end_date } : {}),
              },
            }
          : {}),
      };
    }),
  };
}

/** The credential, and each bookable exam day as an Event with its fee and deadline. */
export function examGraph(input: {
  locale: ContentLocale;
  path: string;
  name: string;
  description: string;
  level: string | null;
  fee: number;
  currency: string;
  sessions: ExamSessionRow[];
}) {
  const url = pageUrl(input.path, input.locale);
  const credential = {
    '@type': 'EducationalOccupationalCredential',
    '@id': `${url}#credential`,
    name: input.name,
    description: input.description,
    url,
    credentialCategory: input.locale === 'de' ? 'Sprachzertifikat' : 'Language certificate',
    ...(input.level ? { educationalLevel: `GER/CEFR ${input.level}` } : {}),
    recognizedBy: { '@type': 'Organization', name: 'telc gGmbH', url: 'https://www.telc.net' },
  };
  const events = input.sessions.slice(0, 12).map((session) => ({
    '@type': 'Event',
    '@id': `${url}#exam-${session.id}`,
    name: input.locale === 'de' ? `${input.name}: Prüfung in Bremen` : `${input.name} exam in Bremen`,
    description: input.description,
    startDate: session.starts_at,
    endDate: session.ends_at,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'de',
    location: schoolPlace(),
    organizer: organizationRef(),
    image: toAbsoluteUrl('/brand/casa-logo.png'),
    offers: {
      '@type': 'Offer',
      price: input.fee,
      priceCurrency: input.currency,
      availability: 'https://schema.org/InStock',
      url: `${pageUrl('/registration/exam', input.locale)}?session=${session.id}`,
      ...(session.registration_deadline ? { validThrough: session.registration_deadline } : {}),
    },
    about: { '@id': `${url}#credential` },
  }));
  return { '@context': 'https://schema.org', '@graph': [credential, ...events] };
}

const EMPLOYMENT: Record<string, string> = { 'part-time': 'PART_TIME', 'full-time': 'FULL_TIME', teilzeit: 'PART_TIME', vollzeit: 'FULL_TIME' };

export function jobPostingNode(input: {
  locale: ContentLocale;
  path: string;
  title: string;
  descriptionHtml: string;
  employmentType: string | null;
  postedAt: string;
  closesAt: string | null;
}) {
  const types = Object.entries(EMPLOYMENT)
    .filter(([word]) => (input.employmentType ?? '').toLowerCase().includes(word))
    .map(([, value]) => value);
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: input.title,
    description: input.descriptionHtml,
    datePosted: input.postedAt.slice(0, 10),
    ...(input.closesAt ? { validThrough: input.closesAt } : {}),
    ...(types.length ? { employmentType: [...new Set(types)] } : {}),
    hiringOrganization: {
      '@type': 'Organization',
      '@id': organizationId(),
      name: 'CASA – Internationale Sprachschule gGmbH',
      sameAs: toAbsoluteUrl('/'),
      logo: toAbsoluteUrl('/brand/casa-logo.png'),
    },
    jobLocation: { '@type': 'Place', address: ADDRESS },
    url: pageUrl(input.path, input.locale),
  };
}
