import { IconKey } from './icon-map';
import type { Meaning } from '@/config/brand/meaning';
import type { Say } from '@/lib/cms/copy';
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
  /**
   * The phone menu's first row inside this dropdown, linking to `href`. On a
   * phone the trigger opens the dropdown instead of navigating, so without it
   * /courses, /exams and /accommodation had no way in from the menu.
   */
  overview?: { label: string };
  /** The logo colour of this part of the school (config/brand/meaning.ts). */
  meaning?: Meaning;
  // Left side categories
  categories?: {
    label: string;
    id: string;
  }[];
  // Right side content
  sections: NavSection[];
};

export const deNavText: Record<string, string> = {
  Courses: 'Kurse',
  'Intensive & part-time': 'Intensiv & berufsbegleitend',
  'Intensive courses': 'Intensivkurse',
  '{course.intensive-german.lessons} lessons a week.': '{course.intensive-german.lessons} Unterrichtseinheiten pro Woche.',
  'Evening courses': 'Abendkurse',
  'Twice a week, after work.': 'Zweimal pro Woche nach Feierabend.',
  'Special courses': 'Spezialkurse',
  'Grammar, writing or speaking.': 'Grammatik, Schreiben oder Sprechen.',
  'Professional & specialised': 'Beruflich & spezialisiert',
  'German for nursing and medicine': 'Deutsch für Pflege und Medizin',
  'For work in hospitals and care.': 'Für den Alltag in Klinik und Pflege.',
  Bildungszeit: 'Bildungszeit',
  'Learn on paid training leave.': 'Sprachkurs in deiner Bildungszeit.',
  'In-company teaching': 'Firmenunterricht',
  'Lessons planned with your company.': 'Wir planen den Kurs mit deiner Firma.',
  'For groups': 'Für Gruppen',
  Accommodation: 'Unterkunft',
  'Accommodation options': 'Wohnoptionen',
  'CASA shared flats': 'CASA-WGs',
  'Live with other learners.': 'Wohnen mit anderen Lernenden.',
  'Host families': 'Gastfamilien',
  'Speak German every day.': 'Jeden Tag Deutsch sprechen.',
  'Become a host family': 'Gastfamilie werden',
  'Host learners from all over the world.': 'Lernende aus aller Welt aufnehmen.',
  Exams: 'Prüfungen',
  Certificates: 'Zertifikate',
  'Prepare and sit the exam with us.': 'Vorbereitung und Prüfung bei uns.',
  'For your studies in Germany.': 'Für dein Studium in Deutschland.',
  'Our school': 'Unsere Schule',
  'About us': 'Über uns',
  'Non-profit status': 'Gemeinnützigkeit',
  'Course fees for the public good.': 'Kursgebühren für das Gemeinwohl.',
  Team: 'Team',
  'The people at CASA.': 'Die Menschen bei CASA.',
  'Cooperation partners': 'Kooperationspartner',
  'Who we work with.': 'Mit wem wir zusammenarbeiten.',
  Opportunities: 'Möglichkeiten',
  'Cost calculator': 'Kostenrechner',
  'Get advice': 'Beratung anfragen',
  'Levels, dates, fees, visa.': 'Niveau, Termine, Gebühren, Visum.',
  'What course and living cost.': 'Was Kurs und Leben kosten.',
  Careers: 'Karriere',
  'Open positions at CASA.': 'Offene Stellen bei CASA.',
  Resources: 'Ressourcen',
  'News & guides': 'Aktuelles & Praktisches',
  // The German site's address is /aktuelles, as on the old casa-bremen.de.
  News: 'Aktuelles',
  'Every month in our NewsFlash.': 'Jeden Monat neu im NewsFlash.',
  'Language levels': 'Niveaustufen',
  'What you can do at each level.': 'Was du auf jeder Stufe kannst.',
  'Study & life in Germany': 'Studium & Leben in Deutschland',
  'Applications, housing, daily life.': 'Bewerbung, Wohnen und Alltag.',
  'All courses at a glance': 'Alle Kurse im Überblick',
  'Accommodation at a glance': 'Unterkunft im Überblick',
  'Our exam centre': 'Unser Prüfungszentrum',
  'About CASA': 'Über CASA',
};

/** The menu's words in the page's language; with `say`, the live edits. */
export function localizeNavText(value: string | undefined, locale: ContentLocale, say?: Say) {
  if (!value) return value;
  const german = deNavText[value] ?? value;
  if (say) return say(locale, german, value);
  return locale === 'de' ? german : value;
}

export const navConfig = {
  main: [
    {
      trigger: 'Courses',
      href: '/courses',
      overview: { label: 'All courses at a glance' },
      meaning: 'courses',
      sections: [
        {
          title: 'Intensive & part-time',
          items: [
            {
              label: 'Intensive courses',
              href: '/courses/intensive-german',
              icon: 'intensive',
              description: '{course.intensive-german.lessons} lessons a week.',
            },
            {
              label: 'Evening courses',
              href: '/courses/evening-course',
              icon: 'evening',
              description: 'Twice a week, after work.',
            },
            {
              label: 'Special courses',
              href: '/courses/special-courses',
              icon: 'special',
              description: 'Grammar, writing or speaking.',
            },
          ],
        },
        {
          title: 'Professional & specialised',
          items: [
            {
              label: 'German for nursing and medicine',
              href: '/courses/german-for-medical',
              icon: 'medical',
              description: 'For work in hospitals and care.',
            },
            {
              label: 'Bildungszeit',
              href: '/courses/bildungszeit',
              icon: 'bildungszeit',
              description: 'Learn on paid training leave.',
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
              description: 'Lessons planned with your company.',
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
      label: 'For groups',
      href: '/courses/german-for-groups',
    },
    {
      trigger: 'Accommodation',
      href: '/accommodation',
      overview: { label: 'Accommodation at a glance' },
      meaning: 'arrival',
      sections: [
        {
          title: 'Accommodation options',
          items: [
            {
              label: 'CASA shared flats',
              href: '/accommodation/flat',
              icon: 'flats',
              description: 'Live with other learners.',
            },
            {
              label: 'Host families',
              href: '/accommodation/host',
              icon: 'hostFamilies',
              description: 'Speak German every day.',
            },
            {
              label: 'Become a host family',
              href: '/accommodation/become-host',
              icon: 'becomeHost',
              description: 'Host learners from all over the world.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Exams',
      href: '/exams',
      overview: { label: 'Our exam centre' },
      meaning: 'exams',
      sections: [
        {
          title: 'Certificates',
          items: [
            {
              label: 'telc Deutsch B2',
              href: '/exams/b2',
              icon: 'telcB2',
              description: 'Prepare and sit the exam with us.',
            },
            {
              label: 'telc Deutsch C1 Hochschule',
              href: '/exams/c1',
              icon: 'telcC1',
              description: 'For your studies in Germany.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Our school',
      href: '/about',
      overview: { label: 'About CASA' },
      meaning: 'orientation',
      sections: [
        {
          title: 'About us',
          items: [
            /*
             * NO "Mission & Values" ROW. It pointed at `/about#mission`, which is
             * a section of /about rather than a page of its own — and /about is
             * already where this dropdown's own trigger goes. So the panel
             * offered the same page twice, once whole and once scrolled part-way
             * down, and only the second one carried a name and an icon.
             *
             * The `#mission` anchor still exists and is still linked from
             * /about/nonprofit ("Read our mission") and from the
             * footer. Nothing about /about changed; only the duplicate way in.
             */
            {
              label: 'Non-profit status',
              href: '/about/nonprofit',
              icon: 'mission',
              description: 'Course fees for the public good.',
            },
            {
              label: 'Team',
              href: '/team',
              icon: 'team',
              description: 'The people at CASA.',
            },
            {
              label: 'Cooperation partners',
              href: '/partners',
              icon: 'partners',
              description: 'Who we work with.',
            },
          ],
        },
        {
          title: 'Opportunities',
          items: [
            {
              label: 'Cost calculator',
              href: '/calculator',
              icon: 'calculator',
              description: 'What course and living cost.',
            },
            {
              label: 'Careers',
              href: '/careers',
              icon: 'inCompany',
              description: 'Open positions at CASA.',
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
              label: 'Get advice',
              href: '/contact',
              icon: 'contact',
              description: 'Levels, dates, fees, visa.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Resources',
      href: '/news',
      // No overview row: /news is already the panel's first item.
      meaning: 'orientation',
      sections: [
        {
          title: 'News & guides',
          items: [
            {
              label: 'News',
              href: '/news',
              icon: 'news',
              description: 'Every month in our NewsFlash.',
            },
            {
              label: 'Language levels',
              href: '/courses/levels',
              icon: 'levels',
              description: 'What you can do at each level.',
            },
            {
              label: 'Study & life in Germany',
              href: '/resources/study-in-germany',
              icon: 'courses',
              description: 'Applications, housing, daily life.',
            },
          ],
        },
      ],
    },
  ] as (NavDropdown | NavItem)[],
};
