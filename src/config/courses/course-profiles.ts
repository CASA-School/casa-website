import type { ContentLocale } from '@/lib/content/types';
import type { CourseArchetypeId } from './archetypes';

/**
 * Per-course profile registry.
 *
 * The route file used to carry two hardcoded slug lookup maps, so adding a
 * course meant editing a page component, and four routed courses silently fell
 * through to a generic A1-B1 / B2-C1 fallback. Course-specific knowledge lives
 * here instead; the route only resolves and renders.
 *
 * `archetype` decides the page shape. A slug absent from this registry keeps
 * exactly the behaviour it had before the registry existed.
 */
/**
 * The named person who answers enquiries about a course format.
 *
 * Only add someone here when CASA already publishes them in that role, or when
 * staff have explicitly confirmed it. A named contact is a commitment that a
 * real person will answer, and getting it wrong sends enquiries into a void.
 * Leave a format without a contact and it falls back to the general office —
 * which is honest, and better than inventing an owner.
 */
export type CourseContact = {
  name: string;
  /** Role as CASA would describe it, not an internal job title. */
  role: { en: string; de: string };
  email: string;
  /** Where this was verified from. Keep it so the next person can re-check. */
  source: string;
};

/** Used whenever a format has no named owner yet. */
export const GENERAL_OFFICE_CONTACT: CourseContact = {
  name: 'CASA Bremen',
  role: { en: 'Course advice team', de: 'Kursberatung' },
  email: 'info@casa-bremen.de',
  source: 'casa-bremen.de contact page',
};

export type CourseProfile = {
  archetype: CourseArchetypeId;
  /** Key into the course-detail photo set in public-page-config. */
  photoKey: string;
  /** Omit until a real owner is confirmed. Never guess. */
  contact?: CourseContact;
};

export const courseProfiles: Record<string, CourseProfile> = {
  'intensive-german': { archetype: 'scheduled-cohort', photoKey: 'intensive' },
  'evening-german': { archetype: 'scheduled-cohort', photoKey: 'evening' },
  bildungszeit: { archetype: 'scheduled-cohort', photoKey: 'bildungszeit' },
  'university-prep': { archetype: 'scheduled-cohort', photoKey: 'academic' },
  'special-courses': { archetype: 'module-catalogue', photoKey: 'special' },
  'medical-german': { archetype: 'professional-track', photoKey: 'medical' },
  'business-german': { archetype: 'professional-track', photoKey: 'business' },
  'german-for-groups': {
    archetype: 'package-inquiry',
    photoKey: 'groups',
    // Published on casa-bremen.de as the contact for group quotes.
    contact: {
      name: 'Ina Eismann',
      role: { en: 'Group programmes', de: 'Gruppenprogramme' },
      email: 'i.eismann@casa-bremen.de',
      source: 'casa-bremen.de/en/language-courses/german-for-groups/ (verified 2026-08-12)',
    },
  },
  'in-company': { archetype: 'package-inquiry', photoKey: 'company' },
};

export function getCourseProfile(slug: string): CourseProfile | undefined {
  return courseProfiles[slug];
}

/** Never returns null — an unassigned format falls back to the general office. */
export function getCourseContact(slug: string): CourseContact {
  return courseProfiles[slug]?.contact ?? GENERAL_OFFICE_CONTACT;
}

/** True when a real person owns this format, rather than the shared inbox. */
export function hasNamedCourseContact(slug: string): boolean {
  return Boolean(courseProfiles[slug]?.contact);
}

export function getCoursePhotoKey(slug: string) {
  return courseProfiles[slug]?.photoKey ?? 'supportCard';
}

export type LevelGoalItem = {
  level: string;
  textbook: 'netzwerk' | 'context';
  focus: string;
};

export function getCourseLevelGoals(slug: string, locale: ContentLocale) {
  const fallback = {
    title: locale === 'de' ? 'Lernziele nach Niveaustufen' : 'Learning goals by level',
    description:
      locale === 'de'
        ? 'Strukturierter Lernweg mit klar definierten Kommunikationszielen.'
        : 'Structured learning path with clearly defined communication goals.',
    levels: [
      { level: 'A1-B1', textbook: 'netzwerk' as const, focus: locale === 'de' ? 'Grundlagen aufbauen mit dem Lehrwerk Netzwerk' : 'Build core foundations using Netzwerk textbook' },
      { level: 'B2-C1', textbook: 'context' as const, focus: locale === 'de' ? 'Ausdrucksweise verfeinern mit dem Lehrwerk Context' : 'Refine vocabulary and communication using Context textbook' },
    ],
  };

  const goals: Record<string, { title: string; description: string; levels: LevelGoalItem[] }> = {
    'intensive-german': {
      title: locale === 'de' ? 'Lernziele nach Niveaustufen' : 'Learning goals by level',
      description:
        locale === 'de'
          ? 'Unser Unterricht folgt den anerkannten Lehrwerken Netzwerk und Context für einen strukturierten Fortschritt.'
          : 'Our classes follow the recognized Netzwerk and Context textbooks for structured progress.',
      levels: [
        { level: 'A1', textbook: 'netzwerk', focus: locale === 'de' ? 'Sich vorstellen, einfache Fragen stellen, Alltagsgespräche führen' : 'Introduce yourself, ask simple questions, hold basic conversations' },
        { level: 'A2', textbook: 'netzwerk', focus: locale === 'de' ? 'Über Erfahrungen berichten, einfache Mitteilungen verfassen' : 'Share personal experiences, write simple messages' },
        { level: 'B1', textbook: 'netzwerk', focus: locale === 'de' ? 'Meinungen ausdrücken, längere Texte verstehen, Präsentationen halten' : 'Express opinions, understand longer texts, give presentations' },
        { level: 'B2', textbook: 'context', focus: locale === 'de' ? 'Komplexe Argumente verstehen, an Fachdiskussionen teilnehmen' : 'Understand complex arguments, participate in specialized discussions' },
        { level: 'C1', textbook: 'context', focus: locale === 'de' ? 'Fließende, spontane Gesprächsführung, akademische Texte analysieren' : 'Fluent, spontaneous speaking, analyze academic texts' },
      ],
    },
    'evening-german': {
      title: locale === 'de' ? 'Lernziele nach Niveaustufen' : 'Learning goals by level',
      description:
        locale === 'de'
          ? 'Kontinuierlicher Lernweg am Abend mit den bewährten Lehrwerken Netzwerk und Context.'
          : 'Continuous learning path in the evening using the proven Netzwerk and Context textbooks.',
      levels: [
        { level: 'A1', textbook: 'netzwerk', focus: locale === 'de' ? 'Einfache Sätze verstehen, Grundwortschatz für den Alltag aufbauen' : 'Understand simple sentences, build core vocabulary for daily life' },
        { level: 'A2', textbook: 'netzwerk', focus: locale === 'de' ? 'Alltagssituationen bewältigen, kurze Berichte schreiben' : 'Handle routine situations, write short descriptions' },
        { level: 'B1', textbook: 'netzwerk', focus: locale === 'de' ? 'Hauptpunkte bei vertrauten Themen verstehen, eigene Meinungen begründen' : 'Understand main points on familiar topics, justify personal opinions' },
        { level: 'B2', textbook: 'context', focus: locale === 'de' ? 'Komplexe Texte verstehen, spontane Gespräche im Beruf führen' : 'Understand complex texts, hold spontaneous conversations at work' },
        { level: 'C1', textbook: 'context', focus: locale === 'de' ? 'Anspruchsvolle Texte lesen, flexibler Sprachgebrauch im Beruf' : 'Read demanding texts, use language flexibly in professional contexts' },
      ],
    },
    'german-for-groups': {
      title: locale === 'de' ? 'Unterricht nach Gruppenniveau' : 'Lessons matched to your group',
      description:
        locale === 'de'
          ? 'Gruppen kommen mit gemischten Niveaus. Wir stufen zu Beginn ein und richten Inhalte, Tempo und Schwerpunkte nach der Gruppe aus.'
          : 'Groups arrive with mixed levels. We place learners at the start and shape content, pace, and focus around the group.',
      levels: [
        { level: 'A1-A2', textbook: 'netzwerk', focus: locale === 'de' ? 'Alltagssprache für Ausflüge, Gastfamilie und Orientierung in Bremen' : 'Everyday language for excursions, the host family, and getting around Bremen' },
        { level: 'B1-B2', textbook: 'netzwerk', focus: locale === 'de' ? 'Freies Sprechen zu Themen, die die Gruppe selbst mitbringt' : 'Free speaking on topics the group brings with them' },
        { level: 'C1', textbook: 'context', focus: locale === 'de' ? 'Vertiefung nach Absprache, etwa Projektarbeit oder Fachthemen' : 'Deeper work by arrangement, such as project work or subject-specific topics' },
      ],
    },
    'medical-german': {
      title: locale === 'de' ? 'Lernziele nach Niveaustufen' : 'Learning goals by level',
      description:
        locale === 'de'
          ? 'Fachsprache Medizin auf den Niveaus B2 und C1 mit Fokus auf Klinikalltag und Fachkommunikation.'
          : 'Medical German terminology at levels B2 and C1 focusing on hospital routines and professional communication.',
      levels: [
        { level: 'B2', textbook: 'context', focus: locale === 'de' ? 'Anamnesegespräche führen, Patientenaufklärung und Dokumentation' : 'Conduct anamnesis interviews, patient explanations and documentation' },
        { level: 'C1', textbook: 'context', focus: locale === 'de' ? 'Kollegiale Fachgespräche führen, Ärztebriefe verfassen, Visiten simulieren' : 'Lead professional consultations with colleagues, write medical reports, simulate ward rounds' },
      ],
    },
    'in-company': {
      title: locale === 'de' ? 'Lernziele nach Niveaustufen' : 'Learning goals by level',
      description:
        locale === 'de'
          ? 'Maßgeschneiderte Kursziele angepasst an das Sprachniveau Ihres Teams.'
          : 'Tailored course goals adapted to your team\'s specific language levels.',
      levels: [
        { level: 'A1-B1', textbook: 'netzwerk', focus: locale === 'de' ? 'Grundlegende Arbeitsplatzkommunikation, E-Mail-Korrespondenz und Telefonate' : 'Basic workplace communication, email correspondence, and phone calls' },
        { level: 'B2-C1', textbook: 'context', focus: locale === 'de' ? 'Meetings moderieren, Verhandlungen führen, Präsentationen auf Deutsch' : 'Moderate meetings, lead negotiations, deliver presentations in German' },
      ],
    },
  };

  return goals[slug] ?? fallback;
}
