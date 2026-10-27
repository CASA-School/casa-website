import type { ContentLocale, TeamPlaceholderAnimal, TeamSpotlight } from '@/lib/content/types';
import { pick, say } from '@/lib/cms/copy';

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
 * - Photographs only of real colleagues who agreed. The portraits are CASA's
 *   own team shoot of 2026-09-10, chosen and named by Rahman (2026-10-27), cropped
 *   and resized for the web in the site's warm editorial grade, light and colour only
 *   (scripts/media/build_team_portraits.py): public/media/casa/team/. The six synthetic images
 *   that once sat there are gone: a made-up face beside a real colleague's name
 *   is never acceptable. Without a portrait the card shows one of the Bremer
 *   Stadtmusikanten (components/signatures/team-placeholder.tsx). A colleague
 *   may stand in with a picture of their own choosing (Müzeyyen's seagull);
 *   its `alt` then says what it shows.
 * - Teachers who were photographed appear under „Lehrkräfte" (2026-10-27),
 *   their surname initial from the workspace's staff register.
 * - Staff appear by their full name. Teachers appear by their first name and
 *   the initial of their last name („Vorname N."), as the teachers asked; that
 *   is for teachers only (Rahman, 2026-10-08).
 * - No bios and no "focus" prose of our own. CASA publishes a role and a list
 *   of areas; anything past that would be fiction about a named person. A bio
 *   is the colleague's own text (2026-10-27): only what they wrote or approved,
 *   and none at all for those who would rather not. Every card opens the same
 *   popup, so a card without a bio looks no different from one with.
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
  /** The full name, as staff appear on the site. */
  name: string;
  /**
   * Teachers only: the first name and the initial of the last name, with a
   * period („Vorname N."), as the teachers asked. Written out, not derived: a
   * name like „Lisa Anh Dao" defeats any rule about which word is the last name.
   */
  shortName?: string;
  /**
   * A portrait in public/media/casa/team/, only with the person's consent.
   * `position` is the CSS object-position that keeps the face in the square crop.
   * `alt` only for a picture that is not their portrait.
   */
  photo?: { file: string; position?: string; alt?: { en: string; de: string } };
  /** The job title CASA prints. German is the source; EN is our translation. */
  title: { en: string; de: string };
  /** Directory filter group. Ours, for navigation — not a CASA job grade. */
  group: 'leadership' | 'office' | 'finance' | 'teachers' | 'volunteer';
  /** Published responsibilities, verbatim in intent. */
  areas?: { en: string; de: string };
  /**
   * In the colleague's own words, one entry per paragraph; only what they wrote
   * or approved. Shown when their card is opened.
   */
  bio?: Array<{ en: string; de: string }>;
  /** The languages they speak, if they want it said. */
  languages?: { en: string; de: string };
};

const GROUP_LABELS: Record<TeamMemberSource['group'], Record<ContentLocale, string>> = {
  leadership: { en: 'Leadership', de: 'Leitung' },
  // Rahman, 2026-10-27: the office and course administration are one team; finance and resources another.
  office: { en: 'Office & advice', de: 'Verwaltung & Beratung' },
  finance: { en: 'Finance & resource management', de: 'Finanz- und Ressourcenmanagement' },
  teachers: { en: 'Teachers', de: 'Lehrkräfte' },
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
    photo: { file: 'claudia-groene.webp' },
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
    The five course and office colleagues, one team since 2026-10-27 (Rahman):
    Natàlia, who leads the office, first, then casa-bremen.de's order, with
    its `areas`, re-checked against the live team page on 2026-10-07. These
    areas had drifted one person along (Tanja carried Meike's, Natàlia Tanja's,
    Mareike Natàlia's), and Alissa carried Mareike's medical courses. They now
    agree with the live page and with config/content/contacts.ts.
  */
  {
    id: 'natalia-sostres',
    name: 'Natàlia Sostres',
    photo: { file: 'natalia-sostres.webp' },
    title: { en: 'Head of Office', de: 'Büroleitung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, CASA accommodation, agencies',
      de: 'Intensivkurse, CASA Unterkunft, Agenturen',
    },
  },
  {
    id: 'meike-grosse-hundrup',
    name: 'Meike Große Hundrup',
    photo: { file: 'meike-grosse-hundrup.webp' },
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, partnerships, in-company teaching',
      de: 'Intensivkurse, Kooperationen, Firmenunterricht',
    },
  },
  {
    id: 'tanja-langenickel',
    name: 'Tanja Langenickel',
    photo: { file: 'tanja-langenickel.webp' },
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, telc exams',
      de: 'Intensivkurse, telc Prüfungen',
    },
  },
  {
    id: 'mareike-thomeczek',
    name: 'Mareike Thomeczek',
    photo: { file: 'mareike-thomeczek.webp' },
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, German for nursing and medicine, quality management',
      de: 'Intensivkurse, Medizin- und Pflegekurse, Qualitätsmanagement',
    },
  },
  {
    id: 'alissa-trouillet',
    name: 'Alissa Trouillet',
    photo: { file: 'alissa-trouillet.webp' },
    title: { en: 'Course administration', de: 'Kursverwaltung' },
    group: 'office',
    areas: {
      en: 'Intensive courses, evening courses, special courses, quality management',
      de: 'Intensivkurse, Abendkurse, Spezialkurse, Qualitätsmanagement',
    },
  },
  {
    id: 'manuela-meerhoff',
    name: 'Manuela Meerhoff',
    title: { en: 'Accounts', de: 'Buchhaltung' },
    group: 'finance',
  },
  {
    id: 'ina-eismann',
    name: 'Ina Eismann',
    photo: { file: 'ina-eismann.webp' },
    title: { en: 'Accounts', de: 'Buchhaltung' },
    group: 'finance',
    areas: {
      en: 'Accounts, and the contact for group course quotes',
      de: 'Buchhaltung und Ansprechpartnerin für Gruppenangebote',
    },
  },
  {
    id: 'ilka-ahrens',
    name: 'Ilka Ahrens',
    title: { en: 'Resource management', de: 'Ressourcenmanagement' },
    group: 'finance',
  },
  // Teachers with a portrait from the 2026 team shoot (Rahman, 2026-10-27).
  {
    id: 'alina-baldowski',
    name: 'Alina Baldowski',
    shortName: 'Alina B.',
    photo: { file: 'alina-baldowski.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'christian-hetzner',
    name: 'Christian Hetzner',
    shortName: 'Christian H.',
    photo: { file: 'christian-hetzner.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'helmut-kehlenbeck',
    name: 'Helmut Kehlenbeck',
    shortName: 'Helmut K.',
    photo: { file: 'helmut-kehlenbeck.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'maria-alexeew',
    name: 'Maria Alexeew',
    shortName: 'Maria A.',
    photo: { file: 'maria-alexeew.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'mikis-weber',
    name: 'Mikis Weber',
    shortName: 'Mikis W.',
    photo: { file: 'mikis-weber.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'muezeyyen-ege',
    name: 'Müzeyyen Ege',
    shortName: 'Müzeyyen E.',
    photo: {
      file: 'muezeyyen-ege.webp',
      position: 'center 62%',
      alt: { de: 'Eine Plüschmöwe auf einer Holzbank', en: 'A toy seagull on a wooden bench' },
    },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
  },
  {
    id: 'stella-dreifke',
    name: 'Stella Dreifke',
    shortName: 'Stella D.',
    photo: { file: 'stella-dreifke.webp' },
    title: { en: 'Teacher', de: 'Lehrkraft' },
    group: 'teachers',
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

/* The stand-ins take turns, so two neighbours rarely share an animal. */
const PLACEHOLDERS: TeamPlaceholderAnimal[] = ['katze', 'hund', 'hahn', 'esel'];
const placeholderFor = new Map(
  TEAM.filter((member) => !member.photo).map((member, index) => [member.id, PLACEHOLDERS[index % PLACEHOLDERS.length]] as const),
);

/** Staff by their full name; teachers by first name and initial. */
function publicName(member: TeamMemberSource) {
  return member.group === 'teachers' ? (member.shortName ?? member.name) : member.name;
}

function toSpotlight(member: TeamMemberSource, locale: ContentLocale): TeamSpotlight {
  const name = publicName(member);

  return {
    id: member.id,
    locale,
    name,
    title: pick(locale, member.title),
    role: pick(locale, GROUP_LABELS[member.group]),
    areas: (member.areas ? pick(locale, member.areas) : undefined),
    bio: member.bio?.map((paragraph) => pick(locale, paragraph)),
    languages: member.languages ? pick(locale, member.languages) : undefined,
    photo: member.photo
      ? {
          src: `/media/casa/team/${member.photo.file}`,
          alt: member.photo.alt
            ? pick(locale, member.photo.alt)
            : say(locale, 'Porträt von {name}', 'Portrait of {name}', { name }),
          position: member.photo.position,
        }
      : undefined,
    placeholder: member.photo ? undefined : placeholderFor.get(member.id),
  };
}

/**
 * One roster entry by id, so a name is never re-typed elsewhere.
 *
 * config/content/contacts.ts assigns people to surfaces by id and reads the
 * spelling from here. `Natàlia Sostres` and `Meike Große Hundrup` are the reason
 * this exists: a second hand-typed copy of either name is a spelling that
 * eventually disagrees with this one. The portrait comes along for the
 * contact's avatar, the same photo as on the team page.
 */
export function teamContactById(
  id: string,
): { name: string; title: { en: string; de: string }; photo?: { src: string; position?: string } } | undefined {
  const member = TEAM.find((entry) => entry.id === id);
  if (!member) return undefined;

  // The public name, as on the team page.
  return {
    name: publicName(member),
    title: member.title,
    photo: member.photo ? { src: `/media/casa/team/${member.photo.file}`, position: member.photo.position } : undefined,
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
    body: 'Our teachers are native speakers with university degrees. Many of us speak several foreign languages, and most of us have lived abroad and know from experience what it means to learn a foreign language. So we know it is not always easy, and we do our best to make it as easy as possible for you.',
  },
  de: {
    title: 'Unsere Lehrkräfte',
    body: 'Unsere Lehrkräfte sind Muttersprachlerinnen und Muttersprachler mit Universitätsabschluss. Viele von uns sprechen mehrere Fremdsprachen, und die meisten haben durch Auslandsaufenthalte selbst erfahren, was es heißt, eine Fremdsprache zu lernen. Wir wissen also, dass es nicht immer leicht ist, und tun unser Bestes, um es dir so leicht wie möglich zu machen.',
  },
};
