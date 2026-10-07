import { fallbackFaqByLocale, fallbackNewsByLocale } from '@/config/content/public-fixtures';
import { footerConfig } from '@/config/footer';
import { navConfig } from '@/config/nav';
import {
  getPublicPageConfig,
  type PublicRouteKey,
} from '@/config/public-page-config';
import type {
  AssistantQuickLink,
  AssistantRuntimeLocale,
} from '@/lib/assistant/types';

export type KbPassage = {
  id: string;
  locale: AssistantRuntimeLocale;
  title: string;
  url: string;
  content: string;
  topic: string;
  keywords: string[];
};

export type KbSearchResult = {
  passages: KbPassage[];
  fallbackLocaleUsed: boolean;
  routeSuggestions: AssistantQuickLink[];
  queryTokens: string[];
};

const ROUTE_META: Array<{
  href: string;
  topic: string;
  label: Record<AssistantRuntimeLocale, string>;
}> = [
  { href: '/', topic: 'home', label: { en: 'Home', de: 'Startseite' } },
  { href: '/about', topic: 'school', label: { en: 'Our School', de: 'Unsere Schule' } },
  { href: '/ueber-uns/gemeinnuetzigkeit', topic: 'school', label: { en: 'Non-profit status', de: 'Gemeinnützigkeit' } },
  { href: '/partners', topic: 'school', label: { en: 'Cooperation partners', de: 'Kooperationspartner' } },
  { href: '/team', topic: 'school', label: { en: 'Team', de: 'Team' } },
  { href: '/courses', topic: 'courses', label: { en: 'Courses', de: 'Kurse' } },
  { href: '/placement-test', topic: 'placement', label: { en: 'Placement Test', de: 'Einstufungstest' } },
  { href: '/registration/course', topic: 'registration', label: { en: 'Course Registration', de: 'Kursanmeldung' } },
  { href: '/exams', topic: 'exams', label: { en: 'Exams', de: 'Prüfungen' } },
  { href: '/registration/exam', topic: 'registration', label: { en: 'Exam Registration', de: 'Prüfungsanmeldung' } },
  { href: '/accommodation', topic: 'accommodation', label: { en: 'Accommodation', de: 'Unterkunft' } },
  { href: '/contact', topic: 'contact', label: { en: 'Contact', de: 'Kontakt' } },
  { href: '/news', topic: 'resources', label: { en: 'News', de: 'Aktuelles' } },
  { href: '/resources/study-in-germany', topic: 'resources', label: { en: 'Study & Life in Germany', de: 'Studium & Leben in Deutschland' } },
  { href: '/resources/living-in-germany', topic: 'resources', label: { en: 'Living in Germany', de: 'Leben in Deutschland' } },
  { href: '/resources/why-germany', topic: 'resources', label: { en: 'Why Germany', de: 'Warum Deutschland' } },
  { href: '/careers', topic: 'careers', label: { en: 'Careers', de: 'Karriere' } },
  { href: '/faq', topic: 'faq', label: { en: 'FAQ', de: 'FAQ' } },
];

const PUBLIC_ROUTE_TO_HREF: Record<PublicRouteKey, string> = {
  home: '/',
  about: '/about',
  team: '/team',
  courses: '/courses',
  'course-detail': '/courses',
  exams: '/exams',
  'exam-detail': '/exams',
  accommodation: '/accommodation',
  'accommodation-detail': '/accommodation',
  imprint: '/imprint',
  privacy: '/privacy',
  terms: '/terms',
  faq: '/faq',
  contact: '/contact',
};

const PUBLIC_ROUTE_KEYS: PublicRouteKey[] = [
  'home',
  'about',
  'team',
  'courses',
  'course-detail',
  'exams',
  'exam-detail',
  'accommodation',
  'accommodation-detail',
  'faq',
  'contact',
  'imprint',
  'privacy',
  'terms',
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'for',
  'of',
  'in',
  'on',
  'is',
  'are',
  'i',
  'me',
  'my',
  'you',
  'your',
  'it',
  'we',
  'our',
  'with',
  'how',
  'what',
  'where',
  'can',
  'do',
  'does',
  'ich',
  'du',
  'sie',
  'wir',
  'der',
  'die',
  'das',
  'ein',
  'eine',
  'zu',
  'und',
  'oder',
  'im',
  'am',
  'von',
  'für',
  'für',
  'mit',
  'wie',
  'was',
  'wo',
  'kann',
  'können',
  'ich',
  'bitte',
  'danke',
]);

const TOKEN_ALIASES: Record<string, string[]> = {
  course: ['courses', 'kurs', 'kurse', 'klasse', 'class', 'sprachkurs'],
  kurs: ['course', 'courses', 'kurse', 'sprachkurs'],
  sprachkurs: ['course', 'courses', 'kurs', 'kurse'],
  exam: ['exams', 'prüfung', 'prüfungen', 'telc', 'zertifikat', 'certificate'],
  prüfung: ['exam', 'exams', 'telc', 'zertifikat'],
  telc: ['exam', 'prüfung', 'zertifikat', 'certificate'],
  testdaf: ['exam', 'prüfung', 'b2', 'c1'],
  accommodation: ['housing', 'unterkunft', 'wg', 'host', 'gastfamilie', 'wohnen', 'zimmer'],
  unterkunft: ['accommodation', 'housing', 'wg', 'gastfamilie', 'zimmer'],
  gastfamilie: ['host family', 'accommodation', 'unterkunft', 'wg'],
  wg: ['shared flat', 'accommodation', 'unterkunft', 'gastfamilie'],
  kaution: ['deposit', 'accommodation', 'unterkunft'],
  deposit: ['kaution', 'accommodation'],
  visa: ['visum', 'residence', 'aufenthalt', 'aufenthaltstitel'],
  visum: ['visa', 'residence', 'aufenthalt'],
  placement: ['level', 'einstufung', 'einstufungstest', 'niveau', 'cefr', 'a1', 'a2', 'b1', 'b2', 'c1'],
  einstufung: ['placement', 'level', 'einstufungstest', 'niveau'],
  einstufungstest: ['placement test', 'einstufung', 'level', 'niveau'],
  registration: ['register', 'anmeldung', 'enroll', 'buchung', 'buchen'],
  anmeldung: ['registration', 'register', 'enroll', 'buchung'],
  contact: ['beratung', 'office', 'admissions', 'kontakt', 'beratung'],
  kontakt: ['contact', 'office', 'admissions', 'beratung'],
  portal: ['dashboard', 'konto', 'account', 'login'],
  dashboard: ['portal', 'account', 'konto'],
  school: ['casa', 'schule', 'sprachschule', 'institute', 'about', 'über uns'],
  about: ['school', 'casa', 'schule', 'über uns', 'about us'],
  nonprofit: ['non-profit', 'gemeinnuetzig', 'gemeinnutzig', 'ggmbh', 'public benefit'],
  'non-profit': ['nonprofit', 'gemeinnuetzig', 'gemeinnutzig', 'ggmbh', 'public benefit'],
  gemeinnuetzig: ['gemeinnutzig', 'nonprofit', 'non-profit', 'ggmbh', 'gemeinwohl'],
  gemeinnutzig: ['gemeinnuetzig', 'nonprofit', 'non-profit', 'ggmbh', 'gemeinwohl'],
  ggmbh: ['gemeinnuetzig', 'gemeinnutzig', 'nonprofit', 'non-profit'],
  integration: ['integrationsprojekte', 'kooperationspartner', 'here ahead', 'garantiefonds', 'tandem', 'community'],
  integrationsprojekte: ['integration', 'kooperationspartner', 'here ahead', 'garantiefonds', 'tandem', 'community'],
  partner: ['kooperationspartner', 'partners', 'here ahead', 'garantiefonds', 'visionskultur', 'hood training', 'tandem'],
  partners: ['kooperationspartner', 'partner', 'here ahead', 'garantiefonds', 'visionskultur', 'hood training', 'tandem'],
  kooperationspartner: ['partner', 'partners', 'kooperation', 'here ahead', 'garantiefonds', 'visionskultur', 'hood training', 'tandem'],
  garantiefonds: ['gf h', 'hochschule', 'integration', 'studium'],
  bremen: ['school', 'casa', 'city', 'germany'],
  intensive: ['intensiv', 'vollzeit', 'full time', 'morgen', 'morning'],
  intensiv: ['intensive', 'vollzeit', 'morning'],
  bildungszeit: ['azav', 'förderung', 'funding', 'entitlement'],
  azav: ['bildungszeit', 'förderung', 'funding'],
  medical: ['medizin', 'doctor', 'arzt', 'healthcare'],
  medizin: ['medical', 'doctor', 'arzt'],
  business: ['beruf', 'career', 'firmen', 'professional', 'company'],
  beruf: ['business', 'career', 'professional'],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function expandTokens(tokens: string[]) {
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    const alias = TOKEN_ALIASES[token] ?? [];
    alias.forEach((value) => expanded.add(value));
    if (token.endsWith('s')) {
      expanded.add(token.slice(0, -1));
    }
  });
  return Array.from(expanded);
}

function inferTopicFromHref(href: string) {
  const normalized = href.toLowerCase();
  if (normalized.startsWith('/courses')) return 'courses';
  if (normalized.startsWith('/exams')) return 'exams';
  if (normalized.startsWith('/accommodation')) return 'accommodation';
  if (normalized.startsWith('/registration')) return 'registration';
  if (normalized.startsWith('/contact')) return 'contact';
  if (normalized.startsWith('/resources') || normalized.startsWith('/news')) return 'resources';
  if (normalized.startsWith('/careers')) return 'careers';
  if (normalized.startsWith('/placement-test')) return 'placement';
  if (normalized.startsWith('/about') || normalized.startsWith('/team') || normalized.startsWith('/ueber-uns')) return 'school';
  return 'general';
}

function routeLabel(locale: AssistantRuntimeLocale, href: string) {
  const match = ROUTE_META.find((item) => item.href === href);
  if (match) {
    return match.label[locale];
  }

  const tokens = href
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);
  if (tokens.length === 0) {
    return locale === 'de' ? 'Startseite' : 'Home';
  }

  return tokens
    .map((token) => token.replace(/-/g, ' '))
    .join(' / ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function faqRouteHint(question: string, answer: string, category: string) {
  const source = normalizeText(`${category} ${question} ${answer}`);
  if (source.includes('visa')) return '/contact';
  if (source.includes('prüfung') || source.includes('exam') || source.includes('telc')) return '/exams';
  if (source.includes('unterkunft') || source.includes('accommodation') || source.includes('housing') || source.includes('gastfamilie')) return '/accommodation';
  if (source.includes('anmeldung') || source.includes('registration') || source.includes('reserve') || source.includes('book')) return '/registration/course';
  if (source.includes('einstufung') || source.includes('placement') || source.includes('level')) return '/placement-test';
  return '/courses';
}

/*
 * Figures in the passages below are the ones in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md
 * and nothing else. Where CASA publishes no figure (German for Medical) or a
 * figure dates quickly (start dates, exam sessions), the passage points to the
 * page that carries the current value or to the advice team instead of
 * restating it. Whether a course suits a visa is not stated per course: that is
 * unverified, and the embassy sets the requirement.
 */
function buildPolicyPassages(): KbPassage[] {
  return [
    {
      id: 'policy-visa-en',
      locale: 'en',
      title: 'Visa policy guidance',
      url: '/faq',
      topic: 'visa',
      keywords: ['visa', 'course', 'intensive', 'residence permit', 'confirmation', 'embassy'],
      content:
        'Language visa guidance: the German embassy or consulate handling your application sets how long a course must run and how many lessons a week it needs. CASA’s own guidance is in the FAQ, and the CASA advice team can tell you which course fits your case. After registration and payment for at least the first course, CASA sends the visa letter by email. This is not legal advice — confirm your case with the CASA office and your embassy.',
    },
    {
      id: 'policy-visa-de',
      locale: 'de',
      title: 'Visum und Sprachkurs',
      url: '/faq',
      topic: 'visa',
      // ASCII spellings stay so learners typing without umlauts still match.
      keywords: ['visum', 'kurs', 'intensiv', 'aufenthalt', 'botschaft', 'kursbestaetigung', 'kursbestätigung'],
      content:
        'Wie lange ein Kurs für ein Sprachvisum dauern muss und wie viele Unterrichtseinheiten pro Woche nötig sind, legt die zuständige deutsche Auslandsvertretung fest. Was CASA dazu sagt, findest du in den FAQ, und das CASA-Beratungsteam sagt dir, welcher Kurs zu deinem Fall passt. Sobald die Gebühr für mindestens den ersten Kurs eingegangen ist, schickt CASA dir den Visumsbrief per E-Mail. Das ist keine Rechtsberatung. Bitte kläre deinen Fall mit CASA und mit der Botschaft.',
    },
    {
      id: 'policy-exams-en',
      locale: 'en',
      title: 'Official exam pathways at CASA',
      url: '/exams',
      topic: 'exams',
      keywords: ['exam', 'telc', 'b2', 'c1', 'certificate', 'hochschule', 'preparation'],
      content:
        'CASA currently offers telc Deutsch B2 (EUR 190) and telc Deutsch C1 Hochschule (EUR 210), with dedicated preparation courses and registration support. TestDaF is not currently offered at CASA but may return in future — contact CASA for updates.',
    },
    {
      id: 'policy-exams-de',
      locale: 'de',
      title: 'Prüfungsangebote bei CASA',
      url: '/exams',
      topic: 'exams',
      keywords: ['prüfung', 'telc', 'b2', 'c1', 'zertifikat', 'hochschule', 'vorbereitung'],
      content:
        'Bei CASA kannst du derzeit telc Deutsch B2 (190 €) und telc Deutsch C1 Hochschule (210 €) ablegen. Für beide gibt es bei uns Vorbereitungskurse, und auch die Anmeldung läuft über uns. TestDaF bieten wir derzeit nicht an, es könnte aber künftig wieder dazukommen. Frag dafür einfach bei CASA nach.',
    },
  ];
}

function buildSchoolPassages(): KbPassage[] {
  return [
    {
      id: 'school-overview-en',
      locale: 'en',
      title: 'About CASA language school in Bremen',
      url: '/about',
      topic: 'school',
      keywords: ['about', 'casa', 'school', 'bremen', 'founded', '1983', 'learners', 'countries', 'small classes'],
      content:
        'CASA is a German-language school in Bremen, Germany, founded in 1983. Over 30,000 learners from 150+ countries have studied here. Courses cover all CEFR levels (A1–C1) in small, interaction-focused groups. CASA is AZAV-certified and offers Bildungszeit-eligible programs. Tandem programs, community activities, and city orientation support social integration. The school is located in the Am Dobben area of Bremen.',
    },
    {
      id: 'school-overview-de',
      locale: 'de',
      title: 'Über CASA Sprachschule Bremen',
      url: '/about',
      topic: 'school',
      keywords: ['über', 'casa', 'schule', 'sprachschule', 'bremen', 'gegründet', '1983', 'lernende', 'länder', 'kleine gruppen'],
      content:
        'CASA ist eine gemeinnützige Sprachschule für Deutsch in Bremen und wurde 1983 gegründet. Mehr als 30.000 Lernende aus über 150 Ländern haben bei uns gelernt. Unsere Kurse gibt es auf allen Niveaus von A1 bis C1, und wir unterrichten in kleinen Gruppen, in denen viel gesprochen wird. CASA ist nach AZAV zertifiziert und bietet Kurse für die Bildungszeit an. Tandems, gemeinsame Aktivitäten und Hilfe bei der Orientierung in der Stadt unterstützen die soziale Integration. Die Schule liegt Am Dobben 14–16 in Bremen.',
    },
    {
      id: 'school-nonprofit-en',
      locale: 'en',
      title: 'CASA non-profit status and mission',
      url: '/ueber-uns/gemeinnuetzigkeit',
      topic: 'school',
      keywords: ['nonprofit', 'non-profit', 'gGmbH', 'public benefit', 'mission', 'reinvestment', 'gemeinnuetzig'],
      content:
        'CASA is organized as CASA – Internationale Sprachschule gGmbH. Course fees are reinvested in teaching quality, fair pay, facilities, social education projects, tandem formats, and integration support. The non-profit mission centers education, intercultural understanding, and social integration in Bremen.',
    },
    {
      id: 'school-nonprofit-de',
      locale: 'de',
      title: 'CASA Gemeinnützigkeit und Mission',
      url: '/ueber-uns/gemeinnuetzigkeit',
      topic: 'school',
      keywords: ['gemeinnützig', 'gemeinnuetzig', 'gGmbH', 'gemeinwohl', 'mission', 'reinvestition', 'mittelverwendung'],
      content:
        'Hinter CASA steht die CASA – Internationale Sprachschule gGmbH, eine gemeinnützige Gesellschaft. Die Kursgebühren fließen zurück in guten Unterricht, faire Bezahlung, unsere Räume, soziale Bildungsprojekte, Tandems und die Unterstützung bei der Integration. Im Mittelpunkt unserer gemeinnützigen Arbeit stehen Bildung, Völkerverständigung und soziale Integration in Bremen.',
    },
    {
      id: 'school-integration-projects-en',
      locale: 'en',
      title: 'CASA cooperation partners',
      url: '/partners',
      topic: 'school',
      keywords: ['integration', 'projects', 'partners', 'cooperation', 'Here Ahead', 'Garantiefonds Hochschule', 'GF-H', 'Visionskultur', 'Creative HUB', 'Hood Training', 'TANDEM', 'tandem', 'community'],
      content:
        'CASA works with partners in Bremen and beyond. HERE AHEAD, a joint academy of the state universities in Bremen, prepares international applicants for university, and CASA plans and teaches its language courses. CASA works with the Garantiefonds Hochschule educational advice service, which checks eligibility for scholarships processed by the Otto Benecke Stiftung. Further partners are Visionskultur (Creative HUB), Hood Training and TANDEM International, the network of language schools CASA belongs to. Free tandem conversation and cultural programmes complement the courses.',
    },
    {
      id: 'school-integration-projects-de',
      locale: 'de',
      title: 'CASA Kooperationspartner',
      url: '/partners',
      topic: 'school',
      keywords: ['integration', 'integrationsprojekte', 'Kooperationspartner', 'Partner', 'Here Ahead', 'Garantiefonds Hochschule', 'GF-H', 'Visionskultur', 'Creative HUB', 'Hood Training', 'TANDEM', 'tandem', 'community'],
      content:
        'CASA arbeitet mit Partnern in Bremen und darüber hinaus zusammen. HERE AHEAD, eine gemeinsame Einrichtung der staatlichen Hochschulen im Land Bremen, bereitet internationale Studieninteressierte auf ein Studium vor; CASA plant und unterrichtet die Sprachkurse. CASA kooperiert mit der Bildungsberatung Garantiefonds Hochschule, die die Voraussetzungen für Stipendien prüft; die Anträge bearbeitet die Otto Benecke Stiftung. Weitere Partner sind Visionskultur (Creative HUB), Hood Training und TANDEM International, das Netzwerk von Sprachschulen, zu dem CASA gehört. Kostenfreie Sprachtandems und Kulturprogramme ergänzen die Kurse.',
    },
  ];
}

function buildAccommodationDetailPassages(): KbPassage[] {
  return [
    {
      id: 'accommodation-detail-en',
      locale: 'en',
      title: 'Accommodation options and prices at CASA',
      url: '/accommodation',
      topic: 'accommodation',
      keywords: ['accommodation', 'flat', 'wg', 'host family', 'price', '580', 'deposit', 'kaution', 'room', 'housing'],
      content:
        'CASA offers two accommodation types, both available only to students on the intensive courses — and the shared flats only to participants of legal age. Shared flat (WG): private furnished room, shared kitchen and bathroom, WLAN, bedding provided, bring your own towels, no smoking. Host family: own furnished room, kitchen and bathroom normally shared, self-catering. Both cost 580 EUR for 4 weeks, then 145 EUR per additional week, with a 50 EUR placement fee and a 580 EUR deposit refunded if the flat and keys come back as received. The Christmas and Easter closure weeks add 145 EUR/week. A shared-flat room is not guaranteed: if none is free, CASA places the student with a host family instead. CASA cannot help with finding a flat of your own but will send useful links on request.',
    },
    {
      id: 'accommodation-detail-de',
      locale: 'de',
      title: 'Unterkunft und Preise bei CASA',
      url: '/accommodation',
      topic: 'accommodation',
      keywords: ['unterkunft', 'wg', 'gastfamilie', 'preis', '580', 'kaution', 'zimmer', 'wohnen', 'einzimmerwohnung'],
      content:
        'CASA vermittelt Unterkünfte nur an Teilnehmende der Intensivkurse, und in unsere WGs ziehen nur Volljährige. In der WG hast du ein eigenes möbliertes Zimmer und teilst dir Küche und Bad. WLAN und Bettwäsche sind da, Handtücher bringst du bitte selbst mit. Bei privaten Gastgebern in Bremen hast du ebenfalls ein eigenes möbliertes Zimmer, Küche und Bad teilst du dir in der Regel mit ihnen, und du versorgst dich selbst. Mahlzeiten und tägliche Gespräche sind dort nicht zugesichert. Beide Unterkünfte kosten 580 € für 4 Wochen und danach 145 € für jede weitere Woche. Dazu kommen einmalig 50 € Vermittlungsgebühr und 580 € Kaution. Die Kaution bekommst du nach deiner Abreise zurück, wenn Unterkunft und Schlüssel in dem Zustand sind, in dem du sie übernommen hast. Während der Schließzeiten zu Weihnachten und Ostern kommen 145 € pro Woche dazu. WG-Zimmer gibt es nur begrenzt. Ist keines frei, vermittelt CASA dir ein Zimmer bei privaten Gastgebern.',
    },
  ];
}

function buildExamDetailPassages(): KbPassage[] {
  return [
    {
      id: 'exam-telc-b2-en',
      locale: 'en',
      title: 'telc Deutsch B2 at CASA – dates and fees',
      url: '/exams/b2',
      topic: 'exams',
      keywords: ['telc', 'b2', 'exam', '190', 'fee', 'date', 'august', 'october', 'november', 'preparation', 'certificate'],
      content:
        'CASA offers telc Deutsch B2: EUR 190 for the full exam, EUR 160 for a single written or oral part. The exam runs approx. 09:00–17:00 at the school. The preparation course costs EUR 260 (two evenings a week, Mon/Wed 18:30–20:00). Current exam dates and registration deadlines are on the exam page. Preparation includes strategy drills, timed mock sections, and individual error correction. Ideal for work, training, and daily life in Germany.',
    },
    {
      id: 'exam-telc-b2-de',
      locale: 'de',
      title: 'telc Deutsch B2 bei CASA – Termine und Kosten',
      url: '/exams/b2',
      topic: 'exams',
      keywords: ['telc', 'b2', 'prüfung', '190', 'gebühr', 'termin', 'august', 'oktober', 'november', 'vorbereitung', 'zertifikat'],
      content:
        'Bei CASA kannst du telc Deutsch B2 ablegen. Die ganze Prüfung kostet 190 €, ein einzelner schriftlicher oder mündlicher Teil 160 €. Die Prüfung dauert etwa von 09:00 bis 17:00 Uhr und findet bei uns in der Schule statt. Der Vorbereitungskurs kostet 260 € und läuft an zwei Abenden pro Woche, montags und mittwochs von 18:30 bis 20:00 Uhr. Die aktuellen Prüfungstermine und Anmeldefristen findest du auf der Prüfungsseite. In der Vorbereitung übst du Strategien für die Prüfung, schreibst Probeprüfungen und bekommst eine persönliche Rückmeldung zu deinen Fehlern. Das Zertifikat ist für Arbeit, Ausbildung und Alltag in Deutschland geeignet.',
    },
    {
      id: 'exam-telc-c1-en',
      locale: 'en',
      title: 'telc C1 Hochschule at CASA – dates and fees',
      url: '/exams/c1',
      topic: 'exams',
      keywords: ['telc', 'c1', 'hochschule', 'university', '210', 'fee', 'date', 'september', 'october', 'november', 'preparation', 'academic'],
      content:
        'CASA offers telc Deutsch C1 Hochschule: EUR 210 for the full exam, EUR 185 for a single part. It always takes place on a Friday, approx. 08:30–17:00. The preparation course is a four-week block at EUR 520, plus EUR 50 on a first registration at CASA. Current exam dates and registration deadlines are on the exam page. Focused on academic language, argumentation, lecture comprehension, and formal writing. Required for many German university admissions.',
    },
    {
      id: 'exam-telc-c1-de',
      locale: 'de',
      title: 'telc Deutsch C1 Hochschule bei CASA – Termine und Kosten',
      url: '/exams/c1',
      topic: 'exams',
      keywords: ['telc', 'c1', 'hochschule', 'universität', '210', 'gebühr', 'termin', 'september', 'oktober', 'november', 'vorbereitung', 'akademisch'],
      content:
        'Bei CASA kannst du telc Deutsch C1 Hochschule ablegen. Die ganze Prüfung kostet 210 €, ein einzelner Teil 185 €. Die Prüfung findet immer an einem Freitag statt, etwa von 08:30 bis 17:00 Uhr. Der Vorbereitungskurs ist ein Block von vier Wochen und kostet 520 €, bei deiner ersten Anmeldung bei CASA kommen 50 € dazu. Die aktuellen Prüfungstermine und Anmeldefristen findest du auf der Prüfungsseite. Im Mittelpunkt stehen akademische Sprache, Argumentieren, das Verstehen von Vorlesungen und formales Schreiben. Viele Hochschulen in Deutschland verlangen das Zertifikat für die Zulassung.',
    },
    {
      id: 'exam-testdaf-en',
      locale: 'en',
      title: 'TestDaF at CASA',
      url: '/contact',
      topic: 'exams',
      keywords: ['testdaf', 'test daf', 'daad', 'exam', 'university', 'nicht', 'not offered'],
      content:
        'TestDaF is currently not offered at CASA. CASA focuses on telc Deutsch B2 and telc C1 Hochschule. TestDaF may return to the CASA program in the future. If you are specifically looking for TestDaF preparation, contact CASA directly to ask about future availability.',
    },
    {
      id: 'exam-testdaf-de',
      locale: 'de',
      title: 'TestDaF bei CASA',
      url: '/contact',
      topic: 'exams',
      keywords: ['testdaf', 'test daf', 'daad', 'prüfung', 'hochschule', 'nicht verfügbar', 'zukunft'],
      content:
        'TestDaF bieten wir bei CASA derzeit nicht an. Bei uns kannst du telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen. TestDaF könnte künftig wieder in unser Programm kommen. Wenn du gezielt eine Vorbereitung auf TestDaF suchst, frag am besten direkt bei uns nach.',
    },
  ];
}

function buildPlacementPassages(): KbPassage[] {
  return [
    {
      id: 'placement-en',
      locale: 'en',
      title: 'German placement test and CEFR levels at CASA',
      url: '/placement-test',
      topic: 'placement',
      keywords: ['placement', 'level', 'test', 'a1', 'a2', 'b1', 'b2', 'c1', 'cefr', 'beginner', 'intermediate', 'advanced', 'which level'],
      content:
        'CASA uses CEFR levels (A1–C1) to place learners. A1 = absolute beginner; A2 = elementary; B1 = intermediate; B2 = upper-intermediate; C1 = advanced. If you know some German, take a free online placement test before registering: the tests are on the test portal of the publisher Klett (Netzwerk neu for A1–B1, Kontext for B1+–C1), linked from /placement-test. Always start with the A1 test, do it alone without a dictionary, enter your name and email in the test form, and send your result to online@casa-bremen.de. Absolute beginners (zero German) can register directly at A1. You can also come to the school for a personal placement during office hours, with no appointment; allow at least an hour.',
    },
    {
      id: 'placement-de',
      locale: 'de',
      title: 'Einstufungstest und CEFR-Niveaus bei CASA',
      url: '/placement-test',
      topic: 'placement',
      keywords: ['einstufung', 'einstufungstest', 'niveau', 'a1', 'a2', 'b1', 'b2', 'c1', 'cefr', 'anfänger', 'mittelstufe', 'fortgeschritten', 'welches niveau'],
      content:
        'CASA stuft nach den Niveaus des Gemeinsamen Europäischen Referenzrahmens ein, von A1 bis C1. A1 ist die Stufe für Anfängerinnen und Anfänger, A2 steht für Grundkenntnisse, B1 für die Mittelstufe, B2 für die Oberstufe und C1 für Fortgeschrittene. Zwischen B1 und B2 liegt im Intensivkurs die B1+. Sie dauert wie eine ganze Stufe etwa acht bis neun Wochen. Wenn du schon etwas Deutsch kannst, mach vor der Anmeldung einen kostenlosen Online-Einstufungstest. Die Tests liegen auf dem Testportal des Klett Verlags (Netzwerk neu für A1–B1, Kontext für B1+–C1) und sind auf unserer Seite zum Einstufungstest verlinkt. Beginne immer mit dem A1-Test, mach ihn allein und ohne Wörterbuch, trag im Testformular deinen Namen und deine E-Mail-Adresse ein und schick dein Ergebnis an online@casa-bremen.de. Wenn du noch gar kein Deutsch kannst, meldest du dich einfach direkt für einen A1-Kurs an. Zur persönlichen Einstufung kannst du während unserer Bürozeiten ohne Termin in die Schule kommen. Plane dafür mindestens eine Stunde ein.',
    },
  ];
}

function buildCourseDetailPassages(): KbPassage[] {
  return [
    {
      id: 'course-intensive-en',
      locale: 'en',
      title: 'Intensive German course – schedule and prices',
      url: '/courses/intensive-german',
      topic: 'courses',
      keywords: ['intensive', 'german', 'course', '940', '520', 'price', 'morning', 'full time', '20 lessons', 'monday friday'],
      content:
        'Intensive German: A1–C1, 20 lessons/week of 45 minutes. Mornings Mon–Fri 09:00–12:30, or afternoons Mon–Thu 13:00–17:30. Price: EUR 520 for 4 weeks, EUR 940 for 8 weeks, EUR 117.50 for each additional week. Plus a one-time EUR 50 enrolment fee and EUR 23.99–26.99 for the book. Current start dates are on the course page. Beginners welcome.',
    },
    {
      id: 'course-intensive-de',
      locale: 'de',
      title: 'Intensivkurs Deutsch – Stundenplan und Preise',
      url: '/courses/intensive-german',
      topic: 'courses',
      keywords: ['intensiv', 'deutsch', 'kurs', '940', '520', 'preis', 'morgens', 'vollzeit', '20 lektionen', 'montag freitag'],
      content:
        'Unsere Intensivkurse gibt es von A1 bis C1, mit 20 Unterrichtseinheiten à 45 Minuten pro Woche. Du lernst vormittags von Montag bis Freitag von 09:00 bis 12:30 Uhr oder nachmittags von Montag bis Donnerstag von 13:00 bis 17:30 Uhr. Der Kurs kostet 520 € für 4 Wochen und 940 € für 8 Wochen, jede weitere Woche 117,50 €. Dazu kommen einmalig 50 € Einschreibegebühr und 23,99–26,99 € für das Lehrbuch. Die aktuellen Starttermine findest du auf der Kursseite. Auch wer ganz neu mit Deutsch anfängt, ist willkommen.',
    },
    {
      id: 'course-evening-en',
      locale: 'en',
      title: 'Evening German course – schedule and prices',
      url: '/courses/evening-course',
      topic: 'courses',
      keywords: ['evening', 'abend', 'course', '476', 'price', 'after work', 'part time', 'monday wednesday', 'tuesday thursday'],
      content:
        'Evening German: A1–C1, 4 lessons/week. Mon/Wed or Tue/Thu, 18:30–20:00. EUR 476 per trimester plus the course book. Ideal for learners studying alongside work or other commitments. Current terms and start dates are on the course page.',
    },
    {
      id: 'course-evening-de',
      locale: 'de',
      title: 'Abendkurs Deutsch – Stundenplan und Preise',
      url: '/courses/evening-course',
      topic: 'courses',
      keywords: ['abend', 'abendkurs', 'kurs', '476', 'preis', 'nach der arbeit', 'teilzeit', 'montag mittwoch', 'dienstag donnerstag'],
      content:
        'Unsere Abendkurse gibt es von A1 bis C1, mit 4 Unterrichtseinheiten pro Woche, montags und mittwochs oder dienstags und donnerstags von 18:30 bis 20:00 Uhr. Ein Trimester kostet 476 €, dazu kommt das Lehrwerk. Der Abendkurs passt gut, wenn du nebenbei arbeitest oder studierst. Die aktuellen Trimester und Starttermine findest du auf der Kursseite.',
    },
    {
      id: 'course-medical-en',
      locale: 'en',
      title: 'Medical German course at CASA',
      url: '/courses/german-for-medical',
      topic: 'courses',
      keywords: ['medical', 'doctor', 'healthcare', 'b2', 'c1', 'fachsprachprüfung', 'fsp', 'professional'],
      content:
        'German for Medical Professionals: for doctors before and after the Fachsprachprüfung, entering at CEFR level B2 or C1. The fee, weekly hours and dates are available from the CASA advice team.',
    },
    {
      id: 'course-medical-de',
      locale: 'de',
      title: 'Deutsch für Pflege und Medizin bei CASA',
      url: '/courses/german-for-medical',
      topic: 'courses',
      keywords: ['medizin', 'arzt', 'gesundheit', 'b2', 'c1', 'fachsprachprüfung', 'fsp', 'professionell'],
      content:
        'Deutsch für Pflege und Medizin ist für Ärztinnen und Ärzte vor und nach der Fachsprachprüfung gedacht. Du steigst auf dem Niveau B2 oder C1 ein. Gebühr, Wochenstunden und Termine erfährst du bei unserem Beratungsteam.',
    },
    {
      id: 'course-bildungszeit-en',
      locale: 'en',
      title: 'Bildungszeit German – superintensive block',
      url: '/courses/bildungszeit',
      topic: 'courses',
      keywords: ['bildungszeit', 'educational leave', 'entitlement', 'employer', '280', 'intensive', 'block'],
      content:
        'Bildungszeit German: from B1, superintensive — a morning and an afternoon intensive course in parallel, 30–40 hours a week, which is what educational-leave recognition requires. EUR 280 for 1 week, EUR 520 for 2 weeks, plus books (EUR 46–54 for two) and EUR 50 on a first registration. Join any Monday. Under the Bremisches Bildungszeitgesetz, employees working in Bremen have ten days over two years. Confirm eligibility with CASA and your employer before registering.',
    },
    {
      id: 'course-bildungszeit-de',
      locale: 'de',
      title: 'Bildungszeit Deutsch – superintensiver Block',
      url: '/courses/bildungszeit',
      topic: 'courses',
      keywords: ['bildungszeit', 'bildungsurlaub', 'arbeitgeber', '280', 'intensiv', 'block', 'freistellung'],
      content:
        'Den Kurs für die Bildungszeit gibt es ab B1. Er ist superintensiv, denn du besuchst einen Intensivkurs am Vormittag und einen am Nachmittag, zusammen 30–40 Stunden pro Woche, so wie es die Anerkennung als Bildungszeit verlangt. Eine Woche kostet 280 €, zwei Wochen kosten 520 €. Dazu kommen die Lehrbücher (46–54 € für zwei) und 50 € bei deiner ersten Anmeldung. Du kannst an jedem Montag einsteigen. Nach dem Bremischen Bildungszeitgesetz haben Beschäftigte, die in Bremen arbeiten, Anspruch auf zehn Tage in zwei Jahren. Bitte kläre vor der Anmeldung mit CASA und deinem Arbeitgeber, ob du Anspruch hast.',
    },
  ];
}

function buildFaqPassages(): KbPassage[] {
  return (['en', 'de'] as AssistantRuntimeLocale[]).flatMap((locale) =>
    (fallbackFaqByLocale[locale] ?? []).map((item) => ({
      id: item.id,
      locale,
      title: item.question,
      url: faqRouteHint(item.question, item.answer, item.category),
      topic: inferTopicFromHref(faqRouteHint(item.question, item.answer, item.category)),
      keywords: [...tokenize(item.category), ...tokenize(item.question)].slice(0, 12),
      content: item.answer,
    }))
  );
}

function buildNewsPassages(): KbPassage[] {
  return (['en', 'de'] as AssistantRuntimeLocale[]).flatMap((locale) =>
    (fallbackNewsByLocale[locale] ?? [])
      .slice(0, 18)
      .map((item) => ({
        id: `news-${locale}-${item.slug}`,
        locale,
        title: item.title,
        url: `/news/${item.slug}`,
        topic: 'resources',
        keywords: [...tokenize(item.category ?? ''), ...tokenize(item.title)].slice(0, 12),
        content: `${item.summary} ${item.body}`,
      }))
  );
}

function buildRouteConfigPassages(): KbPassage[] {
  return (['en', 'de'] as AssistantRuntimeLocale[]).flatMap((locale) =>
    PUBLIC_ROUTE_KEYS.map((route) => {
      const config = getPublicPageConfig(route, locale);
      const href = PUBLIC_ROUTE_TO_HREF[route];
      const labels = config.ctas.map((cta) => cta.label).join(' | ');
      return {
        id: `route-${locale}-${route}`,
        locale,
        title: routeLabel(locale, href),
        url: href,
        topic: inferTopicFromHref(href),
        keywords: [...tokenize(route), ...tokenize(labels)],
        content: `${config.sections.join(', ')}. Primary actions: ${labels}.`,
      } satisfies KbPassage;
    })
  );
}

function buildNavPassages(): KbPassage[] {
  const dropdowns = navConfig.main.filter((item): item is Extract<(typeof navConfig.main)[number], { sections: unknown }> => 'sections' in item);
  return dropdowns.flatMap((dropdown) =>
    dropdown.sections.flatMap((section) =>
      section.items.map((item) => {
        const content = `${section.title}. ${item.description ?? item.label}.`;
        const keywords = [dropdown.trigger, section.title, item.label, item.href];
        return {
          id: `nav-en-${item.href}`,
          locale: 'en' as const,
          title: item.label,
          url: item.href,
          topic: inferTopicFromHref(item.href),
          keywords: keywords.flatMap((token) => tokenize(token)),
          content,
        } satisfies KbPassage;
      })
    )
  );
}

function buildFooterPassages(): KbPassage[] {
  return [
    {
      id: 'footer-contact-en',
      locale: 'en',
      title: 'CASA office contact',
      url: '/contact',
      topic: 'contact',
      keywords: ['contact', 'office', 'phone', 'address', 'email'],
      content: `Phone ${footerConfig.contact.phone}. Address ${footerConfig.contact.address}. Office hours ${footerConfig.contact.officeHours.join('; ')}.`,
    },
    {
      id: 'footer-contact-de',
      locale: 'de',
      title: 'CASA Kontakt',
      url: '/contact',
      topic: 'contact',
      keywords: ['kontakt', 'telefon', 'adresse', 'email', 'büro'],
      content: `Du erreichst uns telefonisch unter ${footerConfig.contact.phone}. Unsere Adresse ist Am Dobben 14–16, 28203 Bremen. Wir sind montags bis donnerstags von 08:30 bis 19:00 Uhr und freitags von 08:30 bis 13:00 Uhr für dich da.`,
    },
  ];
}

const KB_PASSAGES: KbPassage[] = [
  ...buildPolicyPassages(),
  ...buildSchoolPassages(),
  ...buildAccommodationDetailPassages(),
  ...buildExamDetailPassages(),
  ...buildPlacementPassages(),
  ...buildCourseDetailPassages(),
  ...buildRouteConfigPassages(),
  ...buildNavPassages(),
  ...buildFaqPassages(),
  ...buildNewsPassages(),
  ...buildFooterPassages(),
];

function scorePassage(query: string, tokens: string[], passage: KbPassage) {
  if (!query || tokens.length === 0) {
    return 0;
  }

  const normalizedTitle = normalizeText(passage.title);
  const normalizedContent = normalizeText(passage.content);
  const normalizedKeywords = normalizeText(passage.keywords.join(' '));
  const normalizedUrl = normalizeText(passage.url.replace(/\//g, ' '));

  let score = 0;
  let hits = 0;
  tokens.forEach((token) => {
    const inTitle = normalizedTitle.includes(token);
    const inKeywords = normalizedKeywords.includes(token);
    const inContent = normalizedContent.includes(token);
    const inUrl = normalizedUrl.includes(token);

    if (inTitle) score += 3.6;
    if (inKeywords) score += 2.1;
    if (inContent) score += 1.35;
    if (inUrl) score += 1.5;
    if (inTitle || inKeywords || inContent || inUrl) hits += 1;
  });

  if (query.length > 5 && normalizedContent.includes(query)) {
    score += 4.5;
  }
  if (query.length > 5 && normalizedTitle.includes(query)) {
    score += 5;
  }

  const hitRatio = hits / tokens.length;
  if (hitRatio > 0.7) {
    score += 2.2;
  } else if (hitRatio > 0.4) {
    score += 1.2;
  }

  return score;
}

export function searchPublicKB(
  query: string,
  locale: AssistantRuntimeLocale,
  maxPassages = 4
): KbSearchResult {
  const normalizedQuery = normalizeText(query);
  const queryTokens = expandTokens(tokenize(normalizedQuery));

  if (!normalizedQuery || queryTokens.length === 0) {
    return {
      passages: [],
      fallbackLocaleUsed: false,
      routeSuggestions: [],
      queryTokens: [],
    };
  }

  const scored = KB_PASSAGES
    .map((entry) => ({
      entry,
      score: scorePassage(normalizedQuery, queryTokens, entry),
    }))
    .filter((item) => item.score > 1.2)
    .sort((a, b) => b.score - a.score);

  const primary = scored.filter((item) => item.entry.locale === locale);
  const fallbackLocale = locale === 'de' ? 'en' : 'de';
  const fallback = scored.filter((item) => item.entry.locale === fallbackLocale);
  const selected = (primary.length > 0 ? primary : fallback).slice(
    0,
    Math.max(1, Math.min(maxPassages, 6))
  );

  const passages = selected.map((item) => item.entry);
  const routeSuggestions = Array.from(
    new Map(
      selected
        .map((item) => item.entry.url)
        .concat(passages[0]?.url ?? [])
        .filter(Boolean)
        .map((href) => [href, { href, label: routeLabel(locale, href) }])
    ).values()
  ).slice(0, 3);

  return {
    passages,
    fallbackLocaleUsed: primary.length === 0 && fallback.length > 0,
    routeSuggestions,
    queryTokens,
  };
}
