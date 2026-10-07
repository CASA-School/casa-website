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
 * VERIFIED 2026-08-18 against casa-bremen.de/ueber-uns/casa-team. Job titles
 * updated 2026-10-01 to CASA's confirmed staff list (the go-live brief): the
 * former titles described responsibilities, which stay in `areas`. `areas`
 * re-checked against the live page on 2026-10-07.
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
    // A teacher and the Studienleitung for the evening courses (Rahman,
    // 2026-10-01). On the team page only; she is not a course contact.
    id: 'mariella-baier',
    name: 'Mariella Baier',
    title: { en: 'Director of Studies, evening courses', de: 'Studienleitung Abendkurse' },
    group: 'leadership',
  },
  /*
    The five course and office colleagues, in casa-bremen.de's order and with
    its `areas`, re-checked against the live team page on 2026-10-07. These
    areas had drifted one person along (Tanja carried Meike's, Natàlia Tanja's,
    Mareike Natàlia's), and Alissa carried Mareike's medical courses. They now
    agree with the live page and with config/content/contacts.ts.
  */
  {
    id: 'meike-grosse-hundrup',
    name: 'Meike Große Hundrup',
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, partnerships, in-company teaching',
      de: 'Intensivkurse, Kooperationen, Firmenunterricht',
    },
  },
  {
    id: 'tanja-langenickel',
    name: 'Tanja Langenickel',
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, telc exams',
      de: 'Intensivkurse, telc Prüfungen',
    },
  },
  {
    id: 'natalia-sostres',
    name: 'Natàlia Sostres',
    title: { en: 'Head of Office', de: 'Büroleitung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, CASA accommodation, agencies',
      de: 'Intensivkurse, CASA Unterkunft, Agenturen',
    },
  },
  {
    id: 'mareike-thomeczek',
    name: 'Mareike Thomeczek',
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, German for nursing and medicine, quality management',
      de: 'Intensivkurse, Medizin- und Pflegekurse, Qualitätsmanagement',
    },
  },
  {
    id: 'alissa-trouillet',
    name: 'Alissa Trouillet',
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'courses',
    areas: {
      en: 'Intensive courses, evening courses, special courses, quality management',
      de: 'Intensivkurse, Abendkurse, Spezialkurse, Qualitätsmanagement',
    },
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
    title: { en: 'Accounts', de: 'Buchhaltung' },
    group: 'office',
    areas: {
      en: 'Accounts, and the contact for group course quotes',
      de: 'Buchhaltung und Ansprechpartnerin für Gruppenangebote',
    },
  },
  {
    id: 'ilka-ahrens',
    name: 'Ilka Ahrens',
    title: { en: 'Resource management', de: 'Ressourcenmanagement' },
    group: 'office',
  },
  // The Bundesfreiwilligendienst volunteers, names from Rahman 2026-10-01
  // (Lara Nobmann and Ilona Sher have left).
  {
    id: 'lisa-anh-dao',
    name: 'Lisa Anh Dao',
    title: { en: 'Federal Volunteer Service', de: 'Bundesfreiwilligendienst' },
    group: 'volunteer',
  },
  {
    id: 'maryam-trawally',
    name: 'Maryam Trawally',
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

/**
 * One roster entry by id, so a name is never re-typed elsewhere.
 *
 * config/content/contacts.ts assigns people to surfaces by id and reads the
 * spelling from here. `Natàlia Sostres` and `Meike Große Hundrup` are the reason
 * this exists: a second hand-typed copy of either name is a spelling that
 * eventually disagrees with this one.
 */
export function teamContactById(id: string): { name: string; title: { en: string; de: string } } | undefined {
  const member = TEAM.find((entry) => entry.id === id);

  return member ? { name: member.name, title: member.title } : undefined;
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
    body: 'Our teachers are native speakers with university degrees. Many of us speak several foreign languages, and most of us have lived abroad and know from experience what it means to learn a foreign language. So we know it is not always easy, and we do our best to make it as easy as possible for you.',
  },
  de: {
    title: 'Unsere Lehrkräfte',
    body: 'Unsere Lehrkräfte sind Muttersprachlerinnen und Muttersprachler mit Universitätsabschluss. Viele von uns sprechen mehrere Fremdsprachen, und die meisten haben durch Auslandsaufenthalte selbst erfahren, was es heißt, eine Fremdsprache zu lernen. Wir wissen also, dass es nicht immer leicht ist, und tun unser Bestes, um es dir so leicht wie möglich zu machen.',
  },
};
