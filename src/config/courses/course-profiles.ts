import type { CasaContactKey } from '@/config/content/contacts';
import type { ContentLocale } from '@/lib/content/types';
import type { CourseArchetypeId } from './archetypes';
import { cefrLevel } from '@/config/content/cefr-levels';
import { pick, say } from '@/lib/cms/copy';

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

/**
 * Who is being quoted, on the two archetypes that quote rather than sell.
 *
 * `package-inquiry` covers two products that ask the buyer the same question and
 * deliver very different things. A school group travelling to Bremen buys
 * lessons *plus* host families, a culture programme and a transit pass. A Bremen
 * company buys lessons for staff who already live here, and buys none of the
 * rest of it. Branching on the archetype alone made the Firmenunterricht page
 * promise "accommodation and culture programme arranged" to an HR manager.
 */
export type QuoteAudience = 'group' | 'organisation';

export type CourseProfile = {
  archetype: CourseArchetypeId;
  /** Key into the course-detail photo set in public-page-config. */
  photoKey: string;
  /** Required on `package-inquiry`; meaningless elsewhere. */
  quoteAudience?: QuoteAudience;
  /** Omit until a real owner is confirmed. Never guess. */
  /**
   * Which entry in config/content/contacts.ts answers about this format.
   *
   * This replaced a `contact?: CourseContact` object written out per profile,
   * plus its own `GENERAL_OFFICE_CONTACT` fallback. Only german-for-groups ever
   * filled it in, and once CASA named an owner for five more formats there were
   * two places holding "who answers" — one keyed by course, one keyed by
   * surface, each with its own copy of a colleague's name. Now there is one, and
   * the name is read off the verified roster rather than typed here.
   */
  contactKey?: CasaContactKey;
};

export const courseProfiles: Record<string, CourseProfile> = {
  /*
   * `contactKey` points at config/content/contacts.ts, which holds CASA's
   * 2026-09-08 allocation and reads each name off the verified roster.
   *
   * Every format now names an owner, Intensive German included — it was the one
   * gap in the first pass and CASA assigned it to Natàlia Sostres, which is also
   * what their team page already implies (intensive courses are among her
   * published areas).
   */
  'intensive-german': { archetype: 'scheduled-cohort', photoKey: 'intensive', contactKey: 'intensive' },
  'evening-german': { archetype: 'scheduled-cohort', photoKey: 'evening', contactKey: 'eveningAndSpecial' },
  bildungszeit: { archetype: 'scheduled-cohort', photoKey: 'bildungszeit', contactKey: 'professional' },
  'special-courses': { archetype: 'module-catalogue', photoKey: 'special', contactKey: 'eveningAndSpecial' },
  'medical-german': { archetype: 'professional-track', photoKey: 'medical', contactKey: 'medical' },
  'german-for-groups': {
    archetype: 'package-inquiry',
    quoteAudience: 'group',
    photoKey: 'groups',
    contactKey: 'groups',
  },
  'in-company': { archetype: 'package-inquiry', quoteAudience: 'organisation', photoKey: 'company', contactKey: 'company' },
};

export function getCourseProfile(slug: string): CourseProfile | undefined {
  return courseProfiles[slug];
}

/** Never returns null — an unassigned format falls back to the general office. */
/** The contacts.ts key for a format, if CASA named an owner for it. */
export function getCourseContactKey(slug: string): CasaContactKey | undefined {
  return courseProfiles[slug]?.contactKey;
}

export function getCoursePhotoKey(slug: string) {
  return courseProfiles[slug]?.photoKey ?? 'supportCard';
}

/**
 * Falls back to 'group', which is the safer default: group copy names concrete
 * inclusions, and an unregistered quote product is more likely to be a visiting
 * group than a corporate contract.
 */
export function getQuoteAudience(slug: string): QuoteAudience {
  return courseProfiles[slug]?.quoteAudience ?? 'group';
}

export type LevelGoalItem = {
  level: string;
  textbook: 'netzwerk' | 'kontext';
  focus: string;
};

export function getCourseLevelGoals(slug: string, locale: ContentLocale) {
  const fallback = {
    title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
    description:
      say(locale, 'Strukturierter Lernweg mit klar definierten Kommunikationszielen.', 'Structured learning path with clearly defined communication goals.'),
    levels: [
      { level: 'A1-B1', textbook: 'netzwerk' as const, focus: say(locale, 'Grundlagen aufbauen mit dem Lehrwerk Netzwerk neu', 'Build the foundations with the Netzwerk neu textbook') },
      { level: 'B2-C1', textbook: 'kontext' as const, focus: say(locale, 'Ausdrucksweise verfeinern mit dem Lehrwerk Kontext', 'Refine how you express yourself with the Kontext textbook') },
    ],
  };

  /*
   * The formats that teach whole levels say what each level means in the words
   * of the levels page (config/content/cefr-levels.ts, the old casa-bremen.de
   * „Niveaustufen"), and the section links there for the full text (2026-10-12).
   * Groups, in-company teaching, the special courses and German for nursing and
   * medicine keep their own lines: they say what that course does at a level.
   */
  const levelRows = (labels: string[]): LevelGoalItem[] =>
    labels.flatMap((label) => {
      const level = cefrLevel(label);
      return level ? [{ level: level.label, textbook: level.textbook, focus: pick(locale, level.summary) }] : [];
    });

  const goals: Record<string, { title: string; description: string; levels: LevelGoalItem[] }> = {
    'intensive-german': {
      title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
      description:
        say(locale, 'Die Inhalte der Niveaustufen richten sich nach dem Gemeinsamen Europäischen Referenzrahmen für Sprachen (GER). Für jede Kursstufe haben wir ein passendes Lehrwerk ausgewählt, das wir durchgängig mit unseren eigens erstellten Materialien ergänzen.', 'The content of each level follows the Common European Framework of Reference for Languages (CEFR). For every level we have chosen a suitable textbook, which we supplement throughout with materials we create ourselves.'),
      levels: levelRows(['A1', 'A2', 'B1', 'B1+', 'B2', 'C1']),
    },
    'evening-german': {
      title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
      description:
        say(locale, 'Auch am Abend lernst du mit den Lehrwerken Netzwerk neu und Kontext, in jedem Trimester eine halbe Niveaustufe.', 'In the evenings, too, you learn with the Netzwerk neu and Kontext textbooks, completing half a level each trimester.'),
      levels: levelRows(['A1', 'A2', 'B1', 'B2', 'C1']),
    },
    'german-for-groups': {
      title: say(locale, 'Unterricht nach Gruppenniveau', 'Lessons matched to your group'),
      description:
        say(locale, 'Gruppen kommen mit gemischten Niveaus. Wir stufen zu Beginn ein und richten Inhalte, Tempo und Schwerpunkte nach der Gruppe aus.', 'Groups arrive with mixed levels. We place learners at the start and shape the content, pace and focus around the group.'),
      levels: [
        { level: 'A1-A2', textbook: 'netzwerk', focus: say(locale, 'Alltagssprache für Ausflüge, Gastfamilie und Orientierung in Bremen', 'Everyday language for excursions, the host family and getting around Bremen') },
        { level: 'B1-B2', textbook: 'netzwerk', focus: say(locale, 'Freies Sprechen zu Themen, die die Gruppe selbst mitbringt', 'Speaking freely about topics the group brings along') },
        { level: 'C1', textbook: 'kontext', focus: say(locale, 'Vertiefung nach Absprache, etwa Projektarbeit oder Fachthemen', 'Deeper work by arrangement, such as project work or subject-specific topics') },
      ],
    },
    'medical-german': {
      title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
      description:
        say(locale, 'Du lernst die Fachsprache der Medizin auf den Niveaustufen B2 und C1, mit Blick auf den Klinikalltag und die Kommunikation im Team.', 'You learn the specialist language of medicine at levels B2 and C1, with a focus on everyday hospital work and communication within the team.'),
      levels: [
        { level: 'B2', textbook: 'kontext', focus: say(locale, 'Du führst Anamnesegespräche, klärst Patientinnen und Patienten auf und dokumentierst.', 'You take patient histories, explain treatment to patients and write up your documentation.') },
        { level: 'C1', textbook: 'kontext', focus: say(locale, 'Du führst Fachgespräche mit Kolleginnen und Kollegen, schreibst Arztbriefe und übst Visiten.', 'You hold professional discussions with colleagues, write medical reports and practise ward rounds.') },
      ],
    },
    /*
     * Bildungszeit was falling through to the generic fallback, which opens
     * "A1-B1: build core foundations using Netzwerk". The course starts at B1
     * (level_min in the catalogue, and the live site says so plainly), so the
     * page was telling an A1 reader they could join a course that does not admit
     * them. Levels here match the catalogue range, B1 to C1.
     */
    bildungszeit: {
      title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
      description:
        say(locale, 'Mit zwei Intensivkursen am Tag hast du doppelt so viel Unterricht wie in einem einzelnen Intensivkurs. Einsteigen kannst du ab B1.', 'With two intensive courses a day, you have twice as many lessons as in a single intensive course. You can join from B1.'),
      levels: levelRows(['B1', 'B1+', 'B2', 'C1']),
    },
    /*
     * Also previously on the A1-B1 fallback, while the catalogue's own modules
     * run A2/B1 to C1+. A module page should state the module range, not a
     * course range it does not have.
     */
    'special-courses': {
      title: say(locale, 'Was die Module abdecken', 'What the modules cover'),
      description:
        say(locale, 'Die Module gibt es auf verschiedenen Niveaus, von A2/B1 bis C1+.', 'The modules are offered at different levels, from A2/B1 to C1+.'),
      levels: [
        { level: 'A2/B1', textbook: 'netzwerk', focus: say(locale, 'Du wiederholst und festigst die Grundlagen der Grammatik und lernst, einfache Alltagstexte zu schreiben.', 'You revise and consolidate the basics of grammar and learn to write simple everyday texts.') },
        { level: 'B1/B2', textbook: 'kontext', focus: say(locale, 'Du trainierst gezielt Grammatik, Aussprache, Schreiben oder freies Sprechen.', 'You focus on grammar, pronunciation, writing or speaking freely.') },
        { level: 'C1', textbook: 'kontext', focus: say(locale, 'Du trainierst den mündlichen und schriftlichen Ausdruck für telc Deutsch C1 Hochschule.', 'You practise spoken and written expression for telc Deutsch C1 Hochschule.') },
      ],
    },
    'in-company': {
      title: say(locale, 'Lernziele nach Niveaustufen', 'Learning goals by level'),
      description:
        say(locale, 'Die Kursziele stimmen wir auf das Sprachniveau deines Teams ab.', 'We match the course goals to your team\'s language level.'),
      levels: [
        { level: 'A1-B1', textbook: 'netzwerk', focus: say(locale, 'Grundlegende Arbeitsplatzkommunikation, E-Mail-Korrespondenz und Telefonate', 'Basic workplace communication, emails and phone calls') },
        { level: 'B2-C1', textbook: 'kontext', focus: say(locale, 'Meetings moderieren, Verhandlungen führen, Präsentationen auf Deutsch', 'Chairing meetings, leading negotiations and giving presentations in German') },
      ],
    },
  };

  return goals[slug] ?? fallback;
}
