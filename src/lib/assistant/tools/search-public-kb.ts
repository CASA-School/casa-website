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
  { href: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte', topic: 'school', label: { en: 'Integration projects', de: 'Integrationsprojekte' } },
  { href: '/team', topic: 'school', label: { en: 'Team', de: 'Team' } },
  { href: '/courses', topic: 'courses', label: { en: 'Courses', de: 'Kurse' } },
  { href: '/placement-test', topic: 'placement', label: { en: 'Placement Test', de: 'Einstufungstest' } },
  { href: '/registration/course', topic: 'registration', label: { en: 'Course Registration', de: 'Kursanmeldung' } },
  { href: '/exams', topic: 'exams', label: { en: 'Exams', de: 'Prüfungen' } },
  { href: '/registration/exam', topic: 'registration', label: { en: 'Exam Registration', de: 'Prüfungsanmeldung' } },
  { href: '/accommodation', topic: 'accommodation', label: { en: 'Accommodation', de: 'Unterkunft' } },
  { href: '/contact', topic: 'contact', label: { en: 'Contact', de: 'Kontakt' } },
  { href: '/news', topic: 'resources', label: { en: 'News', de: 'News' } },
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
  integration: ['integrationsprojekte', 'here ahead', 'garantiefonds', 'tandem', 'community'],
  integrationsprojekte: ['integration', 'here ahead', 'garantiefonds', 'tandem', 'community'],
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

function buildPolicyPassages(): KbPassage[] {
  return [
    {
      id: 'policy-visa-en',
      locale: 'en',
      title: 'Visa policy guidance',
      url: '/courses/intensive-german',
      topic: 'visa',
      keywords: ['visa', 'course', 'intensive', '20 lessons', '3 months', 'residence permit', 'confirmation'],
      content:
        'Language visa guidance: minimum duration is usually 3 months with at least 20 lessons per week. The CASA Intensive German course (20 lessons/week, Mon–Fri) meets this requirement. After completing registration and payment, CASA can issue confirmation documents for visa applications. This is not legal advice — confirm your case with the CASA office and your embassy.',
    },
    {
      id: 'policy-visa-de',
      locale: 'de',
      title: 'Visum und Sprachkurs',
      url: '/courses/intensive-german',
      topic: 'visa',
      // ASCII spellings stay so learners typing without umlauts still match.
      keywords: ['visum', 'kurs', 'intensiv', '20 lektionen', '3 monate', 'aufenthalt', 'kursbestaetigung', 'kursbestätigung'],
      content:
        'Sprachvisumhinweis: Mindestens 3 Monate und mindestens 20 Lektionen pro Woche sind in der Regel erforderlich. Der CASA Intensivkurs (20 Lektionen/Woche, Mo–Fr) erfüllt diese Anforderung. Nach Abschluss der Anmeldung und Zahlung kann CASA Kursbestätigungen für Visumverfahren ausstellen. Kein Rechtsrat — bitte Einzelfall mit CASA und Botschaft klären.',
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
        'CASA bietet aktuell telc Deutsch B2 (190 EUR) und telc Deutsch C1 Hochschule (210 EUR) inklusive Vorbereitungskursen und Anmeldung. TestDaF wird derzeit nicht angeboten, könnte aber künftig zurückkehren — bitte CASA kontaktieren.',
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
        'CASA ist eine Sprachschule für Deutsch in Bremen, gegründet 1983. Mehr als 30.000 Lernende aus über 150 Ländern haben hier studiert. Kurse umfassen alle CEFR-Niveaus (A1–C1) in kleinen, interaktionsorientierten Gruppen. CASA ist AZAV-zertifiziert und bietet Bildungszeit-fähige Kurse. Tandem-Programme, Gemeinschaftsaktivitäten und Stadtorientierung unterstützen die soziale Integration. Die Schule liegt im Bremer Viertel Am Dobben.',
    },
    {
      id: 'school-nonprofit-en',
      locale: 'en',
      title: 'CASA non-profit status and mission',
      url: '/ueber-uns/gemeinnuetzigkeit',
      topic: 'school',
      keywords: ['nonprofit', 'non-profit', 'gGmbH', 'public benefit', 'mission', 'reinvestment', 'gemeinnuetzig'],
      content:
        'CASA is organized as CASA - Internationale Sprachschule Bremen gemeinnützige GmbH. Course fees are reinvested in teaching quality, fair pay, facilities, social education projects, tandem formats, and integration support. The non-profit mission centers education, intercultural understanding, and social integration in Bremen.',
    },
    {
      id: 'school-nonprofit-de',
      locale: 'de',
      title: 'CASA Gemeinnützigkeit und Mission',
      url: '/ueber-uns/gemeinnuetzigkeit',
      topic: 'school',
      keywords: ['gemeinnützig', 'gemeinnuetzig', 'gGmbH', 'gemeinwohl', 'mission', 'reinvestition', 'mittelverwendung'],
      content:
        'CASA ist als CASA - Internationale Sprachschule Bremen gemeinnützige GmbH organisiert. Kursgebühren werden in Unterrichtsqualität, faire Vergütung, Räume, soziale Bildungsprojekte, Tandemformate und Integrationsunterstützung reinvestiert. Die gemeinnützige Mission fokussiert Bildung, Völkerverständigung und soziale Integration in Bremen.',
    },
    {
      id: 'school-integration-projects-en',
      locale: 'en',
      title: 'CASA integration projects',
      url: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte',
      topic: 'school',
      keywords: ['integration', 'projects', 'Here Ahead', 'Garantiefonds Hochschule', 'GF-H', 'tandem', 'community'],
      content:
        'CASA integration projects connect German teaching with academic preparation, social participation, and encounter in Bremen. Programs and cooperation areas include Here Ahead, Garantiefonds Hochschule, free tandem conversation, cultural programming, and city orientation.',
    },
    {
      id: 'school-integration-projects-de',
      locale: 'de',
      title: 'CASA Integrationsprojekte',
      url: '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte',
      topic: 'school',
      keywords: ['integration', 'integrationsprojekte', 'Here Ahead', 'Garantiefonds Hochschule', 'GF-H', 'tandem', 'community'],
      content:
        'CASA Integrationsprojekte verbinden Deutschunterricht mit Studienvorbereitung, sozialer Teilhabe und Begegnung in Bremen. Programme und Kooperationen umfassen Here Ahead, Garantiefonds Hochschule, kostenfreies Tandem, Kulturprogramm und Stadtorientierung.',
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
        'CASA offers two accommodation types. Shared flat (WG): private furnished room, shared kitchen and bathroom, 580 EUR for 4 weeks, then 145 EUR per additional week. A 50 EUR non-refundable placement fee and 580 EUR refundable deposit apply. Host family: daily spoken German and cultural immersion; holiday surcharge of 145 EUR/week when applicable. Preferences (allergies, quiet hours, etc.) can be noted during registration. Accommodation is not guaranteed — confirmed case by case. Request early, as cancellations are normally planned around a 4-week window.',
    },
    {
      id: 'accommodation-detail-de',
      locale: 'de',
      title: 'Unterkunft und Preise bei CASA',
      url: '/accommodation',
      topic: 'accommodation',
      keywords: ['unterkunft', 'wg', 'gastfamilie', 'preis', '580', 'kaution', 'zimmer', 'wohnen', 'einzimmerwohnung'],
      content:
        'CASA bietet zwei Unterkunftsarten. WG (Wohngemeinschaft): möbliertes Einzelzimmer, Gemeinschaftsküche und -bad, 580 EUR für 4 Wochen, dann 145 EUR pro weitere Woche. Zusätzlich eine einmalige Vermittlungsgebühr von 50 EUR (nicht erstattungsfähig) und eine rückerstattbare Kaution von 580 EUR. Gastfamilie: tägliches Deutsch und kulturelles Eintauchen; Ferienzuschlag 145 EUR/Woche falls zutreffend. Präferenzen (Allergien, Ruhezeiten usw.) können bei der Anmeldung angegeben werden. Unterkunft ist nicht garantiert — wird individuell bestätigt. Frühzeitig anfragen, da Stornierungen normalerweise etwa 4 Wochen vorher geplant werden.',
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
        'CASA offers telc Deutsch B2 for EUR 190. Preparation course available at EUR 520 (B1–C1 level, 10 lessons/week). 2026 exam sessions: 21 Aug (deadline 20 Jul), 16 Oct (deadline 15 Sep), 13 Nov (deadline 12 Oct). Preparation includes strategy drills, timed mock sections, and individual error correction. Ideal for work, training, and daily life in Germany.',
    },
    {
      id: 'exam-telc-b2-de',
      locale: 'de',
      title: 'telc Deutsch B2 bei CASA – Termine und Kosten',
      url: '/exams/b2',
      topic: 'exams',
      keywords: ['telc', 'b2', 'prüfung', '190', 'gebühr', 'termin', 'august', 'oktober', 'november', 'vorbereitung', 'zertifikat'],
      content:
        'CASA bietet telc Deutsch B2 für 190 EUR. Vorbereitungskurs verfügbar für 520 EUR (Niveau B1–C1, 10 Lektionen/Woche). Prüfungstermine 2026: 21. Aug. (Frist 20. Jul.), 16. Okt. (Frist 15. Sep.), 13. Nov. (Frist 12. Okt.). Vorbereitung umfasst Strategietraining, Prüfungssimulationen und individuelle Fehleranalyse. Geeignet für Arbeit, Ausbildung und Alltag in Deutschland.',
    },
    {
      id: 'exam-telc-c1-en',
      locale: 'en',
      title: 'telc C1 Hochschule at CASA – dates and fees',
      url: '/exams/c1',
      topic: 'exams',
      keywords: ['telc', 'c1', 'hochschule', 'university', '210', 'fee', 'date', 'september', 'october', 'november', 'preparation', 'academic'],
      content:
        'CASA offers telc Deutsch C1 Hochschule for EUR 210. Preparation course included in Exam Preparation program (EUR 520, B1–C1). 2026 sessions: 4 Sep (deadline 3 Aug), 2 Oct (deadline 1 Sep), 30 Oct (deadline 29 Sep), 27 Nov (deadline 26 Oct). Focused on academic language, argumentation, lecture comprehension, and formal writing. Required for many German university admissions.',
    },
    {
      id: 'exam-telc-c1-de',
      locale: 'de',
      title: 'telc C1 Hochschule bei CASA – Termine und Kosten',
      url: '/exams/c1',
      topic: 'exams',
      keywords: ['telc', 'c1', 'hochschule', 'universität', '210', 'gebühr', 'termin', 'september', 'oktober', 'november', 'vorbereitung', 'akademisch'],
      content:
        'CASA bietet telc Deutsch C1 Hochschule für 210 EUR. Vorbereitungskurs im Prüfungsvorbereitungsprogramm (520 EUR, B1–C1). Termine 2026: 4. Sep. (Frist 3. Aug.), 2. Okt. (Frist 1. Sep.), 30. Okt. (Frist 29. Sep.), 27. Nov. (Frist 26. Okt.). Fokus auf Akademische Sprache, Argumentation, Vorlesungsverstehen und formales Schreiben. Für viele Hochschulzulassungen in Deutschland erforderlich.',
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
        'TestDaF wird bei CASA aktuell nicht angeboten. CASA konzentriert sich auf telc Deutsch B2 und telc C1 Hochschule. TestDaF könnte künftig wieder ins CASA-Programm aufgenommen werden. Wer gezielt TestDaF-Vorbereitung sucht, sollte direkt bei CASA nach zukünftiger Verfügbarkeit fragen.',
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
        'CASA uses CEFR levels (A1–C1) to place learners correctly. A1 = absolute beginner; A2 = elementary; B1 = intermediate; B2 = upper-intermediate; C1 = advanced. Take the placement test before registration if you have any prior German knowledge. Absolute beginners (zero German) can register directly at A1. The placement test is online at /placement-test and free to use.',
    },
    {
      id: 'placement-de',
      locale: 'de',
      title: 'Einstufungstest und CEFR-Niveaus bei CASA',
      url: '/placement-test',
      topic: 'placement',
      keywords: ['einstufung', 'einstufungstest', 'niveau', 'a1', 'a2', 'b1', 'b2', 'c1', 'cefr', 'anfänger', 'mittelstufe', 'fortgeschritten', 'welches niveau'],
      content:
        'CASA arbeitet mit CEFR-Niveaus (A1–C1) für eine präzise Einstufung. A1 = absolute Anfänger; A2 = Grundkenntnisse; B1 = Mittelstufe; B2 = Oberstufe; C1 = Fortgeschrittene. Wer bereits Deutschkenntnisse hat, sollte vor der Anmeldung den Einstufungstest absolvieren. Absolute Anfänger (keine Vorkenntnisse) können direkt im A1-Kurs starten. Der Test ist kostenlos unter /placement-test verfügbar.',
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
      keywords: ['intensive', 'german', 'course', '940', '520', 'price', 'morning', 'full time', '20 lessons', 'visa', 'monday friday'],
      content:
        'Intensive German: A1–C1, 20 lessons/week, Mon–Fri. Morning sessions 09:00–12:30; afternoon sessions 13:00–17:30. Price: EUR 520 for 4 weeks, EUR 940 for 8 weeks. Plus EUR 50 one-time enrollment fee and book costs. Next starts in 2026: 29 Jun, 31 Aug, 26 Oct (morning); 3 Aug, 28 Sep, 23 Nov (afternoon). Meets visa requirements (20+ lessons/week, 3+ months). Beginners welcome.',
    },
    {
      id: 'course-intensive-de',
      locale: 'de',
      title: 'Intensivkurs Deutsch – Stundenplan und Preise',
      url: '/courses/intensive-german',
      topic: 'courses',
      keywords: ['intensiv', 'deutsch', 'kurs', '940', '520', 'preis', 'morgens', 'vollzeit', '20 lektionen', 'visum', 'montag freitag'],
      content:
        'Intensivkurs Deutsch: A1–C1, 20 Lektionen/Woche, Mo–Fr. Morgens 09:00–12:30; nachmittags 13:00–17:30. Preis: 520 EUR für 4 Wochen, 940 EUR für 8 Wochen. Zusätzlich einmalig 50 EUR Anmeldegebühr und Lernmaterialkosten. Nächste Starts 2026: 29. Jun, 31. Aug, 26. Okt (morgens); 3. Aug, 28. Sep, 23. Nov (nachmittags). Visumstauglich (20+ Lektionen/Woche, 3+ Monate). Anfänger willkommen.',
    },
    {
      id: 'course-evening-en',
      locale: 'en',
      title: 'Evening German course – schedule and prices',
      url: '/courses/evening-course',
      topic: 'courses',
      keywords: ['evening', 'abend', 'course', '476', 'price', 'after work', 'part time', 'monday wednesday', 'tuesday thursday'],
      content:
        'Evening German: A2–C1, 4 lessons/week. Mon/Wed or Tue/Thu, 18:30–20:00. EUR 476 per term. Ideal for learners studying alongside work or other commitments. Next starts: 24 Aug (Mon/Wed) and 25 Aug (Tue/Thu) 2026.',
    },
    {
      id: 'course-evening-de',
      locale: 'de',
      title: 'Abendkurs Deutsch – Stundenplan und Preise',
      url: '/courses/evening-course',
      topic: 'courses',
      keywords: ['abend', 'abendkurs', 'kurs', '476', 'preis', 'nach der arbeit', 'teilzeit', 'montag mittwoch', 'dienstag donnerstag'],
      content:
        'Abendkurs Deutsch: A2–C1, 4 Lektionen/Woche. Mo/Mi oder Di/Do, 18:30–20:00. 476 EUR pro Semester. Ideal für Lernende neben Arbeit oder Studium. Nächste Starts: 24. Aug. (Mo/Mi) und 25. Aug. (Di/Do) 2026.',
    },
    {
      id: 'course-medical-en',
      locale: 'en',
      title: 'Medical German course at CASA',
      url: '/courses/medical-german',
      topic: 'courses',
      keywords: ['medical', 'doctor', 'healthcare', 'b2', 'c1', '400', 'professional', 'friday'],
      content:
        'German for Medical Professionals: B2–C1, 4 lessons/week, Fri 13:00–16:30. EUR 400. Designed for doctors, nurses, and healthcare workers. Small groups (max 12). Starts: 26 Jun 2026.',
    },
    {
      id: 'course-medical-de',
      locale: 'de',
      title: 'Medizinisches Deutsch bei CASA',
      url: '/courses/medical-german',
      topic: 'courses',
      keywords: ['medizin', 'arzt', 'gesundheit', 'b2', 'c1', '400', 'professionell', 'freitag'],
      content:
        'Medizinisches Deutsch: B2–C1, 4 Lektionen/Woche, Fr 13:00–16:30. 400 EUR. Für Ärztinnen/Ärzte, Pflegepersonal und Gesundheitsberufe. Kleine Gruppen (max. 12). Start: 26. Jun. 2026.',
    },
    {
      id: 'course-bildungszeit-en',
      locale: 'en',
      title: 'Bildungszeit German – AZAV-certified intensive block',
      url: '/courses/bildungszeit',
      topic: 'courses',
      keywords: ['bildungszeit', 'azav', 'funding', 'entitlement', 'employer', '640', 'intensive', 'block'],
      content:
        'Bildungszeit German: A2–C1, 40 lessons/week intensive block, EUR 640. Uses your Bildungszeit entitlement (5 days/year in most German states). CASA is AZAV-certified. Confirm eligibility with CASA and your employer before registering.',
    },
    {
      id: 'course-bildungszeit-de',
      locale: 'de',
      title: 'Bildungszeit Deutsch – AZAV-zertifizierter Intensivblock',
      url: '/courses/bildungszeit',
      topic: 'courses',
      keywords: ['bildungszeit', 'azav', 'förderung', 'arbeitgeber', '640', 'intensiv', 'block', 'freistellung'],
      content:
        'Bildungszeit Deutsch: A2–C1, 40 Lektionen/Woche Intensivblock, 640 EUR. Nutzt Ihren Bildungszeitanspruch (5 Tage/Jahr in den meisten Bundesländern). CASA ist AZAV-zertifiziert. Berechtigung bitte vor der Anmeldung mit CASA und Arbeitgeber klären.',
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
      content: `Telefon ${footerConfig.contact.phone}. Adresse ${footerConfig.contact.address}. Öffnungszeiten ${footerConfig.contact.officeHours.join('; ')}.`,
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
