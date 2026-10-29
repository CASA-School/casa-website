import type { ContentLocale } from '@/lib/content/types';

/**
 * Search titles and descriptions for the course and exam pages (2026-10-10).
 *
 * A course page used to take its bare name as the title — "Intensivkurse | CASA
 * Bremen" — with neither "Deutsch" nor "Bremen" in it, the words people search
 * for. These name the page the way it is searched ("Intensivkurs Deutsch in
 * Bremen") and stay under about 55 characters, so the full title shows with the
 * " | CASA Bremen" the metadata adds. The page's heading and copy are unchanged.
 *
 * Descriptions (2026-10-29): the course's own promise was the snippet, 77–106
 * characters with neither the level nor the city. Each now says what the course
 * is, for whom and when, in 120–160 characters, so it serves a search result and
 * an answer engine alike. A lesson count is a live value (`{course.….lessons}`),
 * filled in the page's generateMetadata like any other copy.
 */
type Localized = Record<ContentLocale, string>;
type PageSeo = { title: Localized; description?: Localized };

export const COURSE_SEO: Record<string, PageSeo> = {
  'intensive-german': {
    title: { de: 'Intensivkurs Deutsch in Bremen (A1–C1)', en: 'Intensive German course in Bremen (A1–C1)' },
    description: {
      de: 'Intensivkurs Deutsch in Bremen: {course.intensive-german.lessons} Unterrichtseinheiten pro Woche in kleinen Gruppen, vormittags oder nachmittags. Jede Niveaustufe von A1 bis C1 in 8 Wochen.',
      en: 'Intensive German course in Bremen: {course.intensive-german.lessons} lessons a week in small groups, in the morning or the afternoon. Each level from A1 to C1 takes 8 weeks.',
    },
  },
  'evening-german': {
    title: { de: 'Abendkurs Deutsch in Bremen', en: 'Evening German course in Bremen' },
    description: {
      de: 'Abendkurs Deutsch in Bremen: zweimal pro Woche am Abend, von A1 bis C1. So lernst du neben Beruf und Alltag weiter und wendest das Gelernte gleich an.',
      en: 'Evening German course in Bremen: two evenings a week, from A1 to C1. Keep learning alongside work and everyday life and use what you learn straight away.',
    },
  },
  'special-courses': {
    title: { de: 'Spezialkurse: Grammatik, Schreiben, Sprechen', en: 'Special courses: grammar, writing, speaking' },
    description: {
      de: 'Spezialkurse bei CASA in Bremen: Grammatik vertiefen, besser schreiben oder freier sprechen, von A2 bis C1, an einem Abend pro Woche. Du wählst den Schwerpunkt.',
      en: 'Special courses at CASA in Bremen: deepen your grammar, write better or speak more freely, from A2 to C1, one evening a week. You choose the focus.',
    },
  },
  'medical-german': {
    title: { de: 'Deutsch für Pflege und Medizin in Bremen', en: 'German for nursing and medicine in Bremen' },
    description: {
      de: 'Deutsch für Pflege und Medizin in Bremen: die Sprache von Klinik und Pflege, von B2 bis C1, freitags nachmittags, mit Vorbereitung auf die Fachsprachprüfung.',
      en: 'German for nursing and medicine in Bremen: the language of hospitals and care, B2 to C1, on Friday afternoons, with preparation for the medical language exam.',
    },
  },
  bildungszeit: {
    title: { de: 'Bildungszeit Bremen: Deutsch- und Englischkurse', en: 'Bildungszeit Bremen: German and English courses' },
    description: {
      de: 'Nutze deine Bildungszeit in Bremen für einen Deutsch- oder Englischkurs bei CASA. Wir beraten dich zum passenden Kurs und zu den Unterlagen für deinen Arbeitgeber.',
      en: 'Use your Bildungszeit, Bremen’s paid leave for further training, for a German or English course at CASA. We advise you on the course and the paperwork.',
    },
  },
  'german-for-groups': {
    title: { de: 'Deutschkurse für Schulklassen in Bremen', en: 'German courses for school groups in Bremen' },
    description: {
      de: 'Deutschunterricht, Gastfamilien, Mittagessen und Kulturprogramm für Schulklassen und Gruppen in Bremen, als ein Komplettpaket mit fester Ansprechperson.',
      en: 'German lessons, host families, lunch and a culture programme for school classes and groups in Bremen, as one package with one person to talk to.',
    },
  },
  'in-company': {
    title: { de: 'Firmenunterricht Deutsch in Bremen', en: 'In-company German teaching in Bremen' },
    description: {
      de: 'Firmenunterricht Deutsch in Bremen: Sprachtraining für dein Team, von A1 bis C1, abgestimmt auf euren Arbeitsalltag. Beratung und Angebot sind kostenlos und unverbindlich.',
      en: 'In-company German teaching in Bremen: language training for your team, A1 to C1, built around your working day. The consultation and the quote are free.',
    },
  },
};

export const EXAM_SEO: Record<string, PageSeo> = {
  b2: {
    title: { de: 'telc Deutsch B2: Prüfung und Termine in Bremen', en: 'telc Deutsch B2 exam in Bremen: dates and fees' },
    description: {
      de: 'telc Deutsch B2 in Bremen: Prüfungstermine, Gebühr und Anmeldung bei CASA, dem offiziellen telc-Prüfungszentrum. Wir helfen dir bei Vorbereitung und Anmeldung.',
      en: 'telc Deutsch B2 in Bremen: exam dates, the fee and registration at CASA, an official telc exam centre. We help you prepare and register.',
    },
  },
  c1: {
    title: { de: 'telc Deutsch C1 Hochschule: Prüfung in Bremen', en: 'telc Deutsch C1 Hochschule exam in Bremen' },
    description: {
      de: 'Mit telc Deutsch C1 Hochschule weist du nach, dass dein Deutsch fürs Studium reicht. Termine, Gebühr und Vorbereitungskurs bei CASA in Bremen.',
      en: 'telc Deutsch C1 Hochschule shows that your German is good enough for university. Dates, fee and the preparation course at CASA in Bremen.',
    },
  },
};
