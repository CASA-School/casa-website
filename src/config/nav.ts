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
  'Intensive German': 'Intensiv Deutsch',
  'Fast-track German with frequent weekly classes.': 'Schneller Deutschfortschritt mit hoher Unterrichtsdichte.',
  'Evening Course': 'Abendkurs',
  'After-work classes for steady weekly progress.': 'Deutsch nach der Arbeit mit stabilem Lernrhythmus.',
  'Special Courses': 'Spezialkurse',
  'Focused modules for targeted language goals.': 'Fokussierte Module für konkrete Sprachziele.',
  'Professional & Specialized': 'Beruflich & spezialisiert',
  'German for Medical': 'Deutsch für Medizin',
  'Medical German for clinical communication needs.': 'Medizinisches Deutsch für klinische Kommunikation.',
  'German for Groups': 'Deutsch für Gruppen',
  'Tailor-made German plus culture programme for visiting groups.': 'Maßgeschneidertes Deutsch plus Kulturprogramm für Gruppen.',
  'Educational Leave': 'Bildungszeit',
  'Intensive learning blocks during approved leave.': 'Intensive Lernblöcke für genehmigte Bildungszeit.',
  Firmenunterricht: 'Firmenunterricht',
  'Custom German training for teams and workplaces.': 'Maßgeschneidertes Deutschtraining für Teams.',
  Accommodation: 'Unterkunft',
  'Housing Options': 'Wohnoptionen',
  'CASA Shared Flats': 'CASA WGs',
  'Independent student living with shared routines.': 'Eigenständiges Wohnen mit gemeinsamer Alltagsstruktur.',
  'Host Families': 'Gastfamilien',
  'Daily language immersion in a family setting.': 'Tägliche Sprachpraxis im Familienalltag.',
  'Become a Host Family': 'Gastfamilie werden',
  'Host international learners and support progress.': 'Internationale Lernende aufnehmen und begleiten.',
  Exams: 'Prüfungen',
  Certificates: 'Zertifikate',
  'Prepare and register for the telc B2 certificate.': 'telc B2 vorbereiten und anmelden.',
  'Academic German certification for university goals.': 'Akademisches Deutsch für Hochschulziele.',
  'Our School': 'Unsere Schule',
  Community: 'Community',
  'Mission & Values': 'Leitbild & Werte',
  'How CASA teaches with structure, care, and trust.': 'Wie CASA mit Struktur, Sorgfalt und Vertrauen unterrichtet.',
  'Non-profit status': 'Gemeinnützigkeit',
  'How fees support public-benefit education.': 'Wie Gebühren gemeinnützige Bildung tragen.',
  'The Team': 'Team',
  'Meet teachers and staff guiding each learner journey.': 'Lehrkräfte und Team hinter den Lernwegen kennenlernen.',
  'Tandem Program': 'Tandemprogramm',
  'Practice German through structured exchange partners.': 'Deutsch durch begleiteten Sprachaustausch üben.',
  Opportunities: 'Möglichkeiten',
  'Cost Calculator': 'Kostenrechner',
  'Estimate monthly costs for study and life in Bremen.': 'Kosten für Kurs und Leben in Bremen schätzen.',
  Careers: 'Karriere',
  'Open roles in teaching, operations, and support.': 'Offene Rollen in Unterricht, Büro und Support.',
  Resources: 'Ressourcen',
  'Latest & Practical': 'Aktuelles & Praktisches',
  News: 'News',
  'Latest updates and announcements': 'Aktuelle Hinweise und Meldungen',
  'Study & Life in Germany': 'Studium & Leben in Deutschland',
  'Applications, housing, daily life, and why Germany.': 'Bewerbung, Unterkunft, Alltag und warum Deutschland.',
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
              label: 'Intensive German',
              href: '/courses/intensive-german',
              icon: 'intensive',
              description: navDescription('Fast-track German with frequent weekly classes.'),
            },
            {
              label: 'Evening Course',
              href: '/courses/evening-course',
              icon: 'evening',
              description: navDescription('After-work classes for steady weekly progress.'),
            },
            {
              label: 'Special Courses',
              href: '/courses/special-courses',
              icon: 'special',
              description: navDescription('Focused modules for targeted language goals.'),
            },
          ],
        },
        {
          title: 'Professional & Specialized',
          items: [
            {
              label: 'German for Medical',
              href: '/courses/german-for-medical',
              icon: 'medical',
              description: navDescription('Medical German for clinical communication needs.'),
            },
            {
              label: 'German for Groups',
              href: '/courses/german-for-groups',
              icon: 'special',
              description: navDescription('Tailor-made German plus culture programme for visiting groups.'),
            },
            {
              label: 'Educational Leave',
              href: '/courses/bildungszeit',
              icon: 'bildungszeit',
              description: navDescription('Intensive learning blocks during approved leave.'),
            },
            {
              label: 'Firmenunterricht',
              href: '/courses/firmenunterricht',
              icon: 'inCompany',
              description: navDescription('Custom German training for teams and workplaces.'),
            },
          ],
        },
      ],
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
              description: navDescription('Independent student living with shared routines.'),
            },
            {
              label: 'Host Families',
              href: '/accommodation/host',
              icon: 'hostFamilies',
              description: navDescription('Daily language immersion in a family setting.'),
            },
            {
              label: 'Become a Host Family',
              href: '/accommodation/become-host',
              icon: 'becomeHost',
              description: navDescription('Host international learners and support progress.'),
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
              description: navDescription('Prepare and register for the telc B2 certificate.'),
            },
            {
              label: 'telc Deutsch C1 Hochschule',
              href: '/exams/c1',
              icon: 'telcC1',
              description: navDescription('Academic German certification for university goals.'),
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
            {
              label: 'Mission & Values',
              href: '/about#mission',
              icon: 'mission',
              description: navDescription('How CASA teaches with structure, care, and trust.'),
            },
            {
              label: 'Non-profit status',
              href: '/ueber-uns/gemeinnuetzigkeit',
              icon: 'mission',
              description: navDescription('How fees support public-benefit education.'),
            },
            {
              label: 'The Team',
              href: '/team',
              icon: 'team',
              description: navDescription('Meet teachers and staff guiding each learner journey.'),
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
              description: navDescription('Estimate monthly costs for study and life in Bremen.'),
            },
            {
              label: 'Careers',
              href: '/careers',
              icon: 'inCompany',
              description: navDescription('Open roles in teaching, operations, and support.'),
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
              description: navDescription('Latest updates and announcements'),
            },
            {
              label: 'Study & Life in Germany',
              href: '/resources/study-in-germany',
              icon: 'courses',
              description: navDescription('Applications, housing, daily life, and why Germany.'),
            },
          ],
        },
      ],
    },
  ] as (NavDropdown | NavItem)[],
};
