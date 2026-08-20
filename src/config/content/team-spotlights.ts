import type { ContentLocale, TeamSpotlight } from '@/lib/content/types';

/**
 * The CASA team, as CASA publishes it.
 *
 * WHAT CHANGED AND WHY
 *
 * This file used to contain six invented people — Anna Keller "Senior German
 * Teacher", David Stein "Academic Coordinator", Melanie Hoffmann, Kareem Yilmaz,
 * Sofia Martin, Lucas Brandt — each with a synthetic portrait, a written bio, a
 * "focus" area and LinkedIn/Instagram links pointing at the platforms' home
 * pages. None of them exist. Anna Keller was additionally rendered as the
 * teacher spotlight on every single course detail page.
 *
 * casa-bremen.de/ueber-uns/casa-team publishes twelve real people with their
 * real responsibilities. Those names and roles are public information, so using
 * them is not the decision CLAUDE.md hard rule 3 governs — that rule is about
 * the *portraits*, and it still holds.
 *
 * SO: real names and real published responsibilities, and nothing else.
 *
 * - No photographs. The files in public/media/casa/team/ are synthetic images
 *   generated for six invented people. Attaching a synthetic face to a real
 *   colleague's name is worse than the invented staff were, not better. The
 *   directory renders a monogram until real portraits are on file, with consent.
 * - No bios and no "focus" prose. CASA publishes a role and a list of areas.
 *   Anything past that would be fiction about a named person.
 * - No social links. Only one staff email is published anywhere on the site
 *   (i.eismann@casa-bremen.de, as the group-programme contact), and it already
 *   lives in config/courses/course-profiles.ts where it is actually used.
 *
 * `areas` is the responsibility list CASA prints beside a name. It is the one
 * genuinely informative field here, and it is what makes the directory useful:
 * a reader with a telc question can see who handles telc exams.
 *
 * VERIFIED 2026-08-18 against casa-bremen.de/ueber-uns/casa-team.
 * Staff change. Re-check this list before launch and at each term.
 */

type TeamMemberSource = {
  id: string;
  name: string;
  /** The job title CASA prints. German is the source; EN is our translation. */
  title: { en: string; de: string };
  /** Directory filter group. Ours, for navigation — not a CASA job grade. */
  group: 'leadership' | 'courses' | 'office' | 'volunteer';
  /** Published responsibilities, verbatim in intent. */
  areas?: { en: string; de: string };
};

const GROUP_LABELS: Record<TeamMemberSource['group'], Record<ContentLocale, string>> = {
  leadership: { en: 'Leadership', de: 'Leitung' },
  courses: { en: 'Courses & exams', de: 'Kurse & Prüfungen' },
  office: { en: 'Office & advice', de: 'Verwaltung & Beratung' },
  volunteer: { en: 'Volunteer service', de: 'Bundesfreiwilligendienst' },
};

const TEAM: TeamMemberSource[] = [
  {
    id: 'bettina-rick',
    name: 'Bettina Rick',
    title: { en: 'Managing Director', de: 'Geschäftsführerin' },
    group: 'leadership',
  },
  {
    id: 'claudia-groene',
    name: 'Claudia Gröne',
    title: { en: 'Director of Studies', de: 'Studienleitung' },
    group: 'leadership',
  },
  {
    id: 'mariella-baier',
    name: 'Mariella Baier',
    title: { en: 'Head of Evening Courses', de: 'Abendkursleitung' },
    group: 'leadership',
  },
  {
    id: 'tanja-langenickel',
    name: 'Tanja Langenickel',
    title: { en: 'Courses & partnerships', de: 'Kurse & Kooperationen' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, partnerships, in-company training',
      de: 'Intensivkurse, Kooperationen, Firmenunterricht',
    },
  },
  {
    id: 'natalia-sostres',
    name: 'Natàlia Sostres',
    title: { en: 'Courses & telc exams', de: 'Kurse & telc Prüfungen' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, telc examinations',
      de: 'Intensivkurse, telc Prüfungen',
    },
  },
  {
    id: 'mareike-thomeczek',
    name: 'Mareike Thomeczek',
    title: { en: 'Courses & accommodation', de: 'Kurse & Unterkunft' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, CASA accommodation, agencies',
      de: 'Intensivkurse, CASA Unterkunft, Agenturen',
    },
  },
  {
    id: 'alissa-trouillet',
    name: 'Alissa Trouillet',
    title: { en: 'Courses & quality management', de: 'Kurse & Qualitätsmanagement' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, evening and special courses, medical and nursing courses, quality management',
      de: 'Intensivkurse, Abendkurse, Spezialkurse, Medizin- und Pflegekurse, Qualitätsmanagement',
    },
  },
  {
    id: 'meike-grosse-hundrup',
    name: 'Meike Große Hundrup',
    title: { en: 'Administration & advice', de: 'Verwaltung/Beratung' },
    group: 'office',
  },
  {
    id: 'manuela-meerhoff',
    name: 'Manuela Meerhoff',
    title: { en: 'Accounts', de: 'Buchhaltung' },
    group: 'office',
  },
  {
    id: 'ina-eismann',
    name: 'Ina Eismann',
    title: { en: 'Accounts & group programmes', de: 'Buchhaltung & Gruppenprogramme' },
    group: 'office',
    areas: {
      en: 'Accounts, and the contact for group course quotes',
      de: 'Buchhaltung und Ansprechpartnerin für Gruppenangebote',
    },
  },
  {
    id: 'lara-nobmann',
    name: 'Lara Nobmann',
    title: { en: 'Federal Volunteer Service', de: 'Bundesfreiwilligendienst' },
    group: 'volunteer',
  },
  {
    id: 'ilona-sher',
    name: 'Ilona Sher',
    title: { en: 'Federal Volunteer Service', de: 'Bundesfreiwilligendienst' },
    group: 'volunteer',
  },
];

function toSpotlight(member: TeamMemberSource, locale: ContentLocale): TeamSpotlight {
  return {
    id: member.id,
    locale,
    name: member.name,
    title: member.title[locale],
    role: GROUP_LABELS[member.group][locale],
    areas: member.areas?.[locale],
  };
}

export const teamSpotlightsByLocale: Record<ContentLocale, TeamSpotlight[]> = {
  en: TEAM.map((member) => toSpotlight(member, 'en')),
  de: TEAM.map((member) => toSpotlight(member, 'de')),
};

/**
 * What CASA says about its teachers, collectively.
 *
 * Individual classroom teachers are not named on casa-bremen.de, so there is no
 * honest way to render a named "teacher spotlight" — which is exactly what the
 * invented Anna Keller was doing on every course page. This is the claim CASA
 * does make about its teaching staff, and it belongs to all of them.
 */
export const teachingStaffStatement: Record<ContentLocale, { title: string; body: string }> = {
  en: {
    title: 'Our teachers',
    body: 'Our teachers are native speakers with university degrees. Many of us speak several foreign languages, and most have lived or worked abroad — so we know from the inside that learning a language is not always easy, and we do our best to make it easier.',
  },
  de: {
    title: 'Unsere Lehrkräfte',
    body: 'Unsere Lehrkräfte sind Muttersprachler mit Universitätsabschluss. Viele von uns sprechen mehrere Fremdsprachen, und die meisten haben durch Auslandsaufenthalte selbst erfahren, was es heißt, eine Fremdsprache zu lernen. Wir wissen also, dass es nicht immer leicht ist — und tun unser Bestes, um es so leicht wie möglich zu machen.',
  },
};
