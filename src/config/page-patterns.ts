export type HeroArchetype = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type SignatureModule =
  | 'trust-proof-strip'
  | 'program-picker'
  | 'timeline-milestones'
  | 'team-filter-grid'
  | 'course-finder'
  | 'compare-toggle'
  | 'sticky-info-rail'
  | 'outcomes'
  | 'faq-accordion'
  | 'exam-chooser'
  | 'prep-pathway'
  | 'exam-timeline'
  | 'what-to-bring'
  | 'accommodation-compare'
  | 'safety-panel'
  | 'living-snapshot'
  | 'safety-checklist'
  | 'legal-minimal'
  | 'print-friendly'
  | 'utility-module';

export type SectionRhythm = 'R1' | 'R2' | 'R3' | 'R4';

export type PagePatternRouteKey =
  | 'home'
  | 'about'
  | 'courses'
  | 'course-detail'
  | 'exams'
  | 'exam-detail'
  | 'accommodation'
  | 'accommodation-detail'
  | 'imprint'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'faq'
  | 'placement-test'
  | 'registration-course'
  | 'registration-exam'
  | 'news'
  | 'news-detail';

export type PagePatternSpec = {
  routeKey: PagePatternRouteKey;
  hero: HeroArchetype;
  signatureModules: SignatureModule[];
  primaryCta: string;
  rhythm: SectionRhythm[];
};

export const pagePatternMap: Record<PagePatternRouteKey, PagePatternSpec> = {
  home: {
    routeKey: 'home',
    hero: 'A',
    signatureModules: ['trust-proof-strip', 'program-picker'],
    primaryCta: 'Find my course',
    rhythm: ['R1', 'R2', 'R3', 'R4'],
  },
  about: {
    routeKey: 'about',
    hero: 'F',
    signatureModules: ['timeline-milestones', 'team-filter-grid'],
    primaryCta: 'Contact / Explore',
    rhythm: ['R3', 'R2', 'R1', 'R4'],
  },
  courses: {
    routeKey: 'courses',
    hero: 'B',
    signatureModules: ['course-finder', 'compare-toggle'],
    primaryCta: 'Reserve course spot',
    rhythm: ['R1', 'R2', 'R3'],
  },
  'course-detail': {
    routeKey: 'course-detail',
    hero: 'E',
    signatureModules: ['sticky-info-rail', 'outcomes', 'faq-accordion'],
    primaryCta: 'Register / Request info',
    rhythm: ['R1', 'R2', 'R4'],
  },
  exams: {
    routeKey: 'exams',
    hero: 'B',
    signatureModules: ['exam-chooser', 'prep-pathway'],
    primaryCta: 'Check exam dates / reserve seat',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'exam-detail': {
    routeKey: 'exam-detail',
    hero: 'E',
    signatureModules: ['exam-timeline', 'what-to-bring'],
    primaryCta: 'Register',
    rhythm: ['R1', 'R2', 'R4'],
  },
  accommodation: {
    routeKey: 'accommodation',
    hero: 'D',
    signatureModules: ['accommodation-compare', 'safety-panel'],
    primaryCta: 'Request accommodation',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'accommodation-detail': {
    routeKey: 'accommodation-detail',
    hero: 'D',
    signatureModules: ['living-snapshot', 'safety-checklist'],
    primaryCta: 'Request accommodation',
    rhythm: ['R1', 'R2', 'R4'],
  },
  imprint: {
    routeKey: 'imprint',
    hero: 'C',
    signatureModules: ['legal-minimal', 'print-friendly'],
    primaryCta: 'Utility action',
    rhythm: ['R1', 'R2'],
  },
  privacy: {
    routeKey: 'privacy',
    hero: 'C',
    signatureModules: ['legal-minimal', 'print-friendly'],
    primaryCta: 'Utility action',
    rhythm: ['R1', 'R2'],
  },
  terms: {
    routeKey: 'terms',
    hero: 'C',
    signatureModules: ['legal-minimal', 'print-friendly'],
    primaryCta: 'Utility action',
    rhythm: ['R1', 'R2'],
  },
  contact: {
    routeKey: 'contact',
    hero: 'C',
    signatureModules: ['utility-module'],
    primaryCta: 'Get my CASA plan',
    rhythm: ['R1', 'R2', 'R4'],
  },
  faq: {
    routeKey: 'faq',
    hero: 'C',
    signatureModules: ['utility-module'],
    primaryCta: 'Get answers',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'placement-test': {
    routeKey: 'placement-test',
    hero: 'C',
    signatureModules: ['utility-module'],
    primaryCta: 'Start placement',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'registration-course': {
    routeKey: 'registration-course',
    hero: 'C',
    signatureModules: ['utility-module'],
    primaryCta: 'Register',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'registration-exam': {
    routeKey: 'registration-exam',
    hero: 'C',
    signatureModules: ['utility-module'],
    primaryCta: 'Register',
    rhythm: ['R1', 'R2', 'R4'],
  },
  news: {
    routeKey: 'news',
    hero: 'B',
    signatureModules: ['utility-module'],
    primaryCta: 'Read stories',
    rhythm: ['R1', 'R2', 'R4'],
  },
  'news-detail': {
    routeKey: 'news-detail',
    hero: 'E',
    signatureModules: ['utility-module'],
    primaryCta: 'Find my course path',
    rhythm: ['R1', 'R2', 'R4'],
  },
};

export function getPagePattern(routeKey: PagePatternRouteKey) {
  return pagePatternMap[routeKey];
}
