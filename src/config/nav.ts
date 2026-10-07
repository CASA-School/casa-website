import { IconKey } from './icon-map';
import type { ContentLocale } from '@/lib/content/types';

export type NavItem = {
  label: string;
  href: string;
  description?: string;
  icon?: IconKey;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type NavDropdown = {
  trigger: string;
  href?: string;
  // Left side categories
  categories?: {
    label: string;
    id: string;
  }[];
  // Right side content
  sections: NavSection[];
};

const NAV_DROPDOWN_DESCRIPTION_MAX_CHARS = 52;

function navDescription(value: string) {
  const normalized = value.trim();
  if (normalized.length <= NAV_DROPDOWN_DESCRIPTION_MAX_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, NAV_DROPDOWN_DESCRIPTION_MAX_CHARS - 3).trimEnd()}...`;
}

const deNavText: Record<string, string> = {
  Courses: 'Kurse',
  'Intensive & Part-time': 'Intensiv & berufsbegleitend',
  'Intensive courses': 'Intensivkurse',
  'Fast-track German with frequent weekly classes.': 'Du lernst 20 Unterrichtseinheiten pro Woche.',
  'Evening courses': 'Abendkurse',
  'After-work classes for steady weekly progress.': 'Nach Feierabend lernst du meist zweimal pro Woche.',
  'Special courses': 'Spezialkurse',
  'Focused modules for targeted language goals.': 'Du übst gezielt Grammatik, Schreiben oder Sprechen.',
  'Professional & Specialized': 'Beruflich & spezialisiert',
  'German for nursing and medicine': 'Deutsch für Pflege und Medizin',
  'Medical German for clinical communication needs.': 'Für den Berufsalltag in Klinik und Pflege.',
  'Classes for groups': 'Unterricht für Gruppen',
  'Tailor-made German plus culture programme for visiting groups.': 'Maßgeschneidertes Deutsch plus Kulturprogramm für Gruppen.',
  'Educational Leave': 'Bildungszeit',
  'Intensive learning blocks during approved leave.': 'Lerne Deutsch oder Englisch in deiner Bildungszeit.',
  'In-company teaching': 'Firmenunterricht',
  'Custom German training for teams and workplaces.': 'Wir planen den Unterricht gemeinsam mit der Firma.',
  'For Companies': 'Für Firmen',
  'For Groups': 'Für Gruppen',
  Accommodation: 'Unterkunft',
  'Housing Options': 'Wohnoptionen',
  'CASA Shared Flats': 'CASA-WGs',
  'Independent student living with shared routines.': 'Du wohnst mit anderen Lernenden in einer WG.',
  'Host Families': 'Gastfamilien',
  'Daily language immersion in a family setting.': 'In einer Gastfamilie sprichst du jeden Tag Deutsch.',
  'Become a Host Family': 'Gastfamilie werden',
  'Host international learners and support progress.': 'Nehmen Sie Lernende aus aller Welt bei sich auf.',
  Exams: 'Prüfungen',
  Certificates: 'Zertifikate',
  'Prepare and register for the telc B2 certificate.': 'Bereite dich vor und mach die Prüfung bei uns.',
  'Academic German certification for university goals.': 'Für dein Studium an einer deutschen Hochschule.',
  'Our School': 'Unsere Schule',
  Community: 'Über uns',
  'Non-profit status': 'Gemeinnützigkeit',
  'How fees support public-benefit education.': 'So setzen wir deine Kursgebühren gemeinnützig ein.',
  'The Team': 'Team',
  'Meet teachers and staff guiding each learner journey.': 'Lerne die Menschen kennen, die bei CASA arbeiten.',
  'Cooperation partners': 'Kooperationspartner',
  'Organisations we work with in Bremen and beyond.': 'Mit wem wir in Bremen und anderswo zusammenarbeiten.',
  'Tandem Program': 'Tandemprogramm',
  'Practice German through structured exchange partners.': 'Deutsch durch begleiteten Sprachaustausch üben.',
  Opportunities: 'Möglichkeiten',
  'Cost Calculator': 'Kostenrechner',
  'Talk to Admissions': 'Beratung anfragen',
  'Ask about levels, dates, fees, or visa paperwork.': 'Frag uns nach Niveau, Terminen, Gebühren oder Visum.',
  'Estimate monthly costs for study and life in Bremen.': 'Schätze ab, was Kurs und Leben in Bremen kosten.',
  Careers: 'Karriere',
  'Open roles in teaching, operations, and support.': 'Offene Stellen im Unterricht und in der Verwaltung.',
  Resources: 'Ressourcen',
  'Latest & Practical': 'Aktuelles & Praktisches',
  // The German site's address is /aktuelles, as on the old casa-bremen.de.
  News: 'Aktuelles',
  'Latest updates and announcements': 'Jeden Monat Neues aus der Schule im NewsFlash.',
  'Study & Life in Germany': 'Studium & Leben in Deutschland',
  'Applications, housing, daily life, and why Germany.': 'Tipps für Bewerbung, Wohnen und Alltag.',
  'Study in Germany': 'Studieren in Deutschland',
  'Learning tips and study pathways': 'Lerntipps und Studienwege',
  'Living in Germany': 'Leben in Deutschland',
  'Housing and daily-life guidance': 'Unterkunft und Alltag in Deutschland',
  'Germany Insights': 'Deutschland verstehen',
  'Why Germany': 'Warum Deutschland',
  'Reasons to learn and grow in Germany': 'Gründe für Lernen und Entwicklung in Deutschland',
};

export function localizeNavText(value: string | undefined, locale: ContentLocale) {
  if (!value || locale !== 'de') {
    return value;
  }

  return deNavText[value] ?? value;
}

/**
 * A dropdown description in the page's language, shortened to the cap AFTER
 * translating it.
 *
 * The config below used to store each description already shortened. The
 * English text is also the key of `deNavText`, so a description over the cap
 * ("Meet teachers and staff guiding each learner journey.", 53 characters) was
 * stored as "…learner jour...", matched no key, and the German menu showed the
 * cut English. The config now holds the full English; the cut happens here.
 */
export function localizeNavDescription(value: string | undefined, locale: ContentLocale) {
  const localized = localizeNavText(value, locale);
  return localized ? navDescription(localized) : localized;
}

export const navConfig = {
  main: [
    {
      trigger: 'Courses',
      href: '/courses',
      sections: [
        {
          title: 'Intensive & Part-time',
          items: [
            {
              label: 'Intensive courses',
              href: '/courses/intensive-german',
              icon: 'intensive',
              description: 'Fast-track German with frequent weekly classes.',
            },
            {
              label: 'Evening courses',
              href: '/courses/evening-course',
              icon: 'evening',
              description: 'After-work classes for steady weekly progress.',
            },
            {
              label: 'Special courses',
              href: '/courses/special-courses',
              icon: 'special',
              description: 'Focused modules for targeted language goals.',
            },
          ],
        },
        {
          title: 'Professional & Specialized',
          items: [
            {
              label: 'German for nursing and medicine',
              href: '/courses/german-for-medical',
              icon: 'medical',
              description: 'Medical German for clinical communication needs.',
            },
            {
              label: 'Educational Leave',
              href: '/courses/bildungszeit',
              icon: 'bildungszeit',
              description: 'Intensive learning blocks during approved leave.',
            },
            /*
             * Firmenunterricht belongs in this panel, not beside it.
             *
             * It was a top-level link, which presented it as a product sitting
             * alongside the course catalogue. It is not: `/courses/firmenunterricht`
             * is a course route, `in-company` is an entry in `publicCourseOrder`
             * and in `courseProfiles`, and it already renders as one of the seven
             * format rows on /courses. The nav was the only surface still saying
             * otherwise.
             *
             * "For Companies" rather than the course's own name, which is
             * "Firmenunterricht" in both locales: it is the label a visitor has
             * been clicking, and this section already names its rows by audience
             * ("German for medical professionals").
             */
            {
              label: 'In-company teaching',
              href: '/courses/firmenunterricht',
              icon: 'inCompany',
              description: 'Custom German training for teams and workplaces.',
            },
          ],
        },
      ],
    },
    /*
     * A plain top-level link, not a dropdown: it has exactly one destination,
     * and a dropdown holding a single item costs the reader a hover and a
     * decision to reach a page the label already named.
     *
     * ONE of these, not two. "For Companies" moved into the Courses panel where
     * the rest of the catalogue lives — see the note on that entry. Gruppen
     * stays at the top level because it is the one product on this site that is
     * not a course a learner enrols in: an organiser books lessons, host
     * families, meals and a culture programme as a single trip, and the page
     * sells that rather than a level.
     *
     * Route verified against src/lib/content/course-routes.ts: `german-for-groups`
     * maps to itself.
     */
    {
      label: 'For Groups',
      href: '/courses/german-for-groups',
    },
    {
      trigger: 'Accommodation',
      href: '/accommodation',
      sections: [
        {
          title: 'Housing Options',
          items: [
            {
              label: 'CASA Shared Flats',
              href: '/accommodation/flat',
              icon: 'flats',
              description: 'Independent student living with shared routines.',
            },
            {
              label: 'Host Families',
              href: '/accommodation/host',
              icon: 'hostFamilies',
              description: 'Daily language immersion in a family setting.',
            },
            {
              label: 'Become a Host Family',
              href: '/accommodation/become-host',
              icon: 'becomeHost',
              description: 'Host international learners and support progress.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Exams',
      href: '/exams',
      sections: [
        {
          title: 'Certificates',
          items: [
            {
              label: 'telc Deutsch B2',
              href: '/exams/b2',
              icon: 'telcB2',
              description: 'Prepare and register for the telc B2 certificate.',
            },
            {
              label: 'telc Deutsch C1 Hochschule',
              href: '/exams/c1',
              icon: 'telcC1',
              description: 'Academic German certification for university goals.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Our School',
      href: '/about',
      sections: [
        {
          title: 'Community',
          items: [
            /*
             * NO "Mission & Values" ROW. It pointed at `/about#mission`, which is
             * a section of /about rather than a page of its own — and /about is
             * already where this dropdown's own trigger goes. So the panel
             * offered the same page twice, once whole and once scrolled part-way
             * down, and only the second one carried a name and an icon.
             *
             * The `#mission` anchor still exists and is still linked from
             * /ueber-uns/gemeinnuetzigkeit ("Read our mission") and from the
             * footer. Nothing about /about changed; only the duplicate way in.
             */
            {
              label: 'Non-profit status',
              href: '/ueber-uns/gemeinnuetzigkeit',
              icon: 'mission',
              description: 'How fees support public-benefit education.',
            },
            {
              label: 'The Team',
              href: '/team',
              icon: 'team',
              description: 'Meet teachers and staff guiding each learner journey.',
            },
            {
              label: 'Cooperation partners',
              href: '/partners',
              icon: 'partners',
              description: 'Organisations we work with in Bremen and beyond.',
            },
          ],
        },
        {
          title: 'Opportunities',
          items: [
            {
              label: 'Cost Calculator',
              href: '/calculator',
              icon: 'calculator',
              description: 'Estimate monthly costs for study and life in Bremen.',
            },
            {
              label: 'Careers',
              href: '/careers',
              icon: 'inCompany',
              description: 'Open roles in teaching, operations, and support.',
            },
            /*
             * /contact reached the desktop header only as a second filled
             * button beside "Register Now", and only above 1400px. The button
             * is gone; the route is not. As a dropdown item it is available at
             * every width instead of just wide ones, and talking to a human is
             * now offered at the same weight as the other ways in rather than
             * competing with registration for the same glance.
             */
            {
              label: 'Talk to Admissions',
              href: '/contact',
              icon: 'contact',
              description: 'Ask about levels, dates, fees, or visa paperwork.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Resources',
      href: '/news',
      sections: [
        {
          title: 'Latest & Practical',
          items: [
            {
              label: 'News',
              href: '/news',
              icon: 'news',
              description: 'Latest updates and announcements',
            },
            {
              label: 'Study & Life in Germany',
              href: '/resources/study-in-germany',
              icon: 'courses',
              description: 'Applications, housing, daily life, and why Germany.',
            },
          ],
        },
      ],
    },
  ] as (NavDropdown | NavItem)[],
};
