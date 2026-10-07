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
  'Intensive & part-time': 'Intensiv & berufsbegleitend',
  'Intensive courses': 'Intensivkurse',
  'You have 20 lessons a week.': 'Du lernst 20 Unterrichtseinheiten pro Woche.',
  'Evening courses': 'Abendkurse',
  'You learn after work, usually twice a week.': 'Nach Feierabend lernst du meist zweimal pro Woche.',
  'Special courses': 'Spezialkurse',
  'You practise grammar, writing or speaking.': 'Du übst gezielt Grammatik, Schreiben oder Sprechen.',
  'Professional & specialised': 'Beruflich & spezialisiert',
  'German for nursing and medicine': 'Deutsch für Pflege und Medizin',
  'For everyday work in hospitals and care.': 'Für den Berufsalltag in Klinik und Pflege.',
  'Classes for groups': 'Unterricht für Gruppen',
  'Tailor-made German plus culture programme for visiting groups.': 'Maßgeschneidertes Deutsch plus Kulturprogramm für Gruppen.',
  Bildungszeit: 'Bildungszeit',
  'Learn German or English on paid training leave.': 'Lerne Deutsch oder Englisch in deiner Bildungszeit.',
  'In-company teaching': 'Firmenunterricht',
  'We plan the lessons together with your company.': 'Wir planen den Unterricht gemeinsam mit der Firma.',
  'For Companies': 'Für Firmen',
  'For groups': 'Für Gruppen',
  Accommodation: 'Unterkunft',
  'Accommodation options': 'Wohnoptionen',
  'CASA shared flats': 'CASA-WGs',
  'You share a flat with other learners.': 'Du wohnst mit anderen Lernenden in einer WG.',
  'Host families': 'Gastfamilien',
  'With a host family, you speak German every day.': 'In einer Gastfamilie sprichst du jeden Tag Deutsch.',
  'Become a host family': 'Gastfamilie werden',
  'Host learners from all over the world.': 'Nehmen Sie Lernende aus aller Welt bei sich auf.',
  Exams: 'Prüfungen',
  Certificates: 'Zertifikate',
  'Prepare for the exam and take it with us.': 'Bereite dich vor und mach die Prüfung bei uns.',
  'For your studies at a German university.': 'Für dein Studium an einer deutschen Hochschule.',
  'Our school': 'Unsere Schule',
  'About us': 'Über uns',
  'Non-profit status': 'Gemeinnützigkeit',
  'How we use your course fees for the public good.': 'So setzen wir deine Kursgebühren gemeinnützig ein.',
  Team: 'Team',
  'Meet the people who work at CASA.': 'Lerne die Menschen kennen, die bei CASA arbeiten.',
  'Cooperation partners': 'Kooperationspartner',
  'Organisations we work with in Bremen and beyond.': 'Mit wem wir in Bremen und anderswo zusammenarbeiten.',
  'Tandem Program': 'Tandemprogramm',
  'Practice German through structured exchange partners.': 'Deutsch durch begleiteten Sprachaustausch üben.',
  Opportunities: 'Möglichkeiten',
  'Cost calculator': 'Kostenrechner',
  'Get advice': 'Beratung anfragen',
  'Ask us about levels, dates, fees or your visa.': 'Frag uns nach Niveau, Terminen, Gebühren oder Visum.',
  'Estimate what your course and life in Bremen cost.': 'Schätze ab, was Kurs und Leben in Bremen kosten.',
  Careers: 'Karriere',
  'Vacancies in teaching and administration.': 'Offene Stellen im Unterricht und in der Verwaltung.',
  Resources: 'Ressourcen',
  'News & guides': 'Aktuelles & Praktisches',
  // The German site's address is /aktuelles, as on the old casa-bremen.de.
  News: 'Aktuelles',
  'What’s new at CASA, every month in our NewsFlash.': 'Jeden Monat Neues aus der Schule im NewsFlash.',
  'Study & life in Germany': 'Studium & Leben in Deutschland',
  'Tips on applications, housing and daily life.': 'Tipps für Bewerbung, Wohnen und Alltag.',
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
          title: 'Intensive & part-time',
          items: [
            {
              label: 'Intensive courses',
              href: '/courses/intensive-german',
              icon: 'intensive',
              description: 'You have 20 lessons a week.',
            },
            {
              label: 'Evening courses',
              href: '/courses/evening-course',
              icon: 'evening',
              description: 'You learn after work, usually twice a week.',
            },
            {
              label: 'Special courses',
              href: '/courses/special-courses',
              icon: 'special',
              description: 'You practise grammar, writing or speaking.',
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
              description: 'For everyday work in hospitals and care.',
            },
            {
              label: 'Bildungszeit',
              href: '/courses/bildungszeit',
              icon: 'bildungszeit',
              description: 'Learn German or English on paid training leave.',
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
              description: 'We plan the lessons together with your company.',
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
      sections: [
        {
          title: 'Accommodation options',
          items: [
            {
              label: 'CASA shared flats',
              href: '/accommodation/flat',
              icon: 'flats',
              description: 'You share a flat with other learners.',
            },
            {
              label: 'Host families',
              href: '/accommodation/host',
              icon: 'hostFamilies',
              description: 'With a host family, you speak German every day.',
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
      sections: [
        {
          title: 'Certificates',
          items: [
            {
              label: 'telc Deutsch B2',
              href: '/exams/b2',
              icon: 'telcB2',
              description: 'Prepare for the exam and take it with us.',
            },
            {
              label: 'telc Deutsch C1 Hochschule',
              href: '/exams/c1',
              icon: 'telcC1',
              description: 'For your studies at a German university.',
            },
          ],
        },
      ],
    },
    {
      trigger: 'Our school',
      href: '/about',
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
             * /ueber-uns/gemeinnuetzigkeit ("Read our mission") and from the
             * footer. Nothing about /about changed; only the duplicate way in.
             */
            {
              label: 'Non-profit status',
              href: '/ueber-uns/gemeinnuetzigkeit',
              icon: 'mission',
              description: 'How we use your course fees for the public good.',
            },
            {
              label: 'Team',
              href: '/team',
              icon: 'team',
              description: 'Meet the people who work at CASA.',
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
              label: 'Cost calculator',
              href: '/calculator',
              icon: 'calculator',
              description: 'Estimate what your course and life in Bremen cost.',
            },
            {
              label: 'Careers',
              href: '/careers',
              icon: 'inCompany',
              description: 'Vacancies in teaching and administration.',
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
              description: 'Ask us about levels, dates, fees or your visa.',
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
          title: 'News & guides',
          items: [
            {
              label: 'News',
              href: '/news',
              icon: 'news',
              description: 'What’s new at CASA, every month in our NewsFlash.',
            },
            {
              label: 'Study & life in Germany',
              href: '/resources/study-in-germany',
              icon: 'courses',
              description: 'Tips on applications, housing and daily life.',
            },
          ],
        },
      ],
    },
  ] as (NavDropdown | NavItem)[],
};
