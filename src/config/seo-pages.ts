import type { ContentLocale } from '@/lib/content/types';

/**
 * Search titles and descriptions for the course and exam pages (2026-10-10).
 *
 * A course page used to take its bare name as the title — "Intensivkurse | CASA
 * Bremen" — with neither "Deutsch" nor "Bremen" in it, the words people search
 * for. These name the page the way it is searched ("Intensivkurs Deutsch in
 * Bremen") and stay under about 55 characters, so the full title shows with the
 * " | CASA Bremen" the metadata adds. A description is set only where the
 * course's own promise is too long or too short for a result snippet
 * (70–160 characters). The page's heading and copy are unchanged.
 */
type Localized = Record<ContentLocale, string>;
type PageSeo = { title: Localized; description?: Localized };

export const COURSE_SEO: Record<string, PageSeo> = {
  'intensive-german': { title: { de: 'Intensivkurs Deutsch in Bremen (A1–C1)', en: 'Intensive German course in Bremen (A1–C1)' } },
  'evening-german': { title: { de: 'Abendkurs Deutsch in Bremen', en: 'Evening German course in Bremen' } },
  'special-courses': { title: { de: 'Spezialkurse: Grammatik, Schreiben, Sprechen', en: 'Special courses: grammar, writing, speaking' } },
  'medical-german': { title: { de: 'Deutsch für Pflege und Medizin in Bremen', en: 'German for nursing and medicine in Bremen' } },
  bildungszeit: { title: { de: 'Bildungszeit in Bremen: Deutsch- und Englischkurse', en: 'Bildungszeit in Bremen: German and English courses' } },
  'german-for-groups': {
    title: { de: 'Deutschkurse für Schulklassen und Gruppen in Bremen', en: 'German courses for school groups in Bremen' },
    description: {
      de: 'Deutschunterricht, Gastfamilien, Mittagessen und Kulturprogramm für Schulklassen und Gruppen in Bremen, als ein Komplettpaket mit fester Ansprechperson.',
      en: 'German lessons, host families, lunch and a culture programme for school classes and groups in Bremen, as one package with one person to talk to.',
    },
  },
  'in-company': { title: { de: 'Firmenunterricht Deutsch in Bremen', en: 'In-company German teaching in Bremen' } },
};

export const EXAM_SEO: Record<string, PageSeo> = {
  b2: { title: { de: 'telc Deutsch B2: Prüfung und Termine in Bremen', en: 'telc Deutsch B2 exam in Bremen: dates and fees' } },
  c1: {
    title: { de: 'telc Deutsch C1 Hochschule: Prüfung in Bremen', en: 'telc Deutsch C1 Hochschule exam in Bremen' },
    description: {
      de: 'Mit telc Deutsch C1 Hochschule weist du nach, dass dein Deutsch fürs Studium reicht. Termine, Gebühr und Vorbereitungskurs bei CASA in Bremen.',
      en: 'telc Deutsch C1 Hochschule shows that your German is good enough for university. Dates, fee and the preparation course at CASA in Bremen.',
    },
  },
};
