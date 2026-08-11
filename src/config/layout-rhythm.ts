export type HeroArchetype = 'A' | 'B' | 'C' | 'D' | 'E';

export type SectionPattern =
  | 'EditorialSplit'
  | 'ProofBand'
  | 'GuidedPicker'
  | 'ProcessSteps'
  | 'ComparisonModule'
  | 'CommunityStories';

export type SignatureSectionKey =
  | 'home-community-outcomes'
  | 'courses-format-selector'
  | 'course-weekly-rhythm'
  | 'accommodation-playbook'
  | 'accommodation-arrival-checklist'
  | 'exams-readiness-check'
  | 'exam-day-timeline'
  | 'about-milestones'
  | 'team-directory'
  | 'faq-topic-navigator'
  | 'legal-anchor-layout';

export type PageLayoutKey =
  | 'home'
  | 'courses-index'
  | 'course-detail'
  | 'accommodation-index'
  | 'accommodation-detail'
  | 'exams-index'
  | 'exam-detail'
  | 'about'
  | 'team'
  | 'faq'
  | 'legal';

export type LayoutRhythmSpec = {
  hero: HeroArchetype;
  patterns: SectionPattern[];
  signature: SignatureSectionKey;
  allowQuickChooser: boolean;
};

export const layoutRhythmMap: Record<PageLayoutKey, LayoutRhythmSpec> = {
  home: {
    hero: 'A',
    patterns: ['ProofBand', 'EditorialSplit', 'GuidedPicker', 'ProcessSteps', 'CommunityStories'],
    signature: 'home-community-outcomes',
    allowQuickChooser: false,
  },
  'courses-index': {
    hero: 'B',
    patterns: ['GuidedPicker', 'ComparisonModule', 'ProofBand'],
    signature: 'courses-format-selector',
    allowQuickChooser: true,
  },
  'course-detail': {
    hero: 'C',
    patterns: ['EditorialSplit', 'ProcessSteps', 'ComparisonModule'],
    signature: 'course-weekly-rhythm',
    allowQuickChooser: false,
  },
  'accommodation-index': {
    hero: 'D',
    patterns: ['GuidedPicker', 'EditorialSplit', 'ComparisonModule'],
    signature: 'accommodation-playbook',
    allowQuickChooser: false,
  },
  'accommodation-detail': {
    hero: 'C',
    patterns: ['EditorialSplit', 'ComparisonModule', 'ProcessSteps'],
    signature: 'accommodation-arrival-checklist',
    allowQuickChooser: false,
  },
  'exams-index': {
    hero: 'C',
    patterns: ['GuidedPicker', 'ProcessSteps', 'ProofBand'],
    signature: 'exams-readiness-check',
    allowQuickChooser: false,
  },
  'exam-detail': {
    hero: 'C',
    patterns: ['ProcessSteps', 'ComparisonModule', 'EditorialSplit'],
    signature: 'exam-day-timeline',
    allowQuickChooser: false,
  },
  about: {
    hero: 'B',
    patterns: ['ProofBand', 'EditorialSplit', 'CommunityStories'],
    signature: 'about-milestones',
    allowQuickChooser: false,
  },
  team: {
    hero: 'B',
    patterns: ['EditorialSplit', 'CommunityStories'],
    signature: 'team-directory',
    allowQuickChooser: false,
  },
  faq: {
    hero: 'E',
    patterns: ['ComparisonModule', 'ProcessSteps'],
    signature: 'faq-topic-navigator',
    allowQuickChooser: false,
  },
  legal: {
    hero: 'E',
    patterns: ['EditorialSplit'],
    signature: 'legal-anchor-layout',
    allowQuickChooser: false,
  },
};

export function getLayoutRhythm(key: PageLayoutKey) {
  return layoutRhythmMap[key];
}
