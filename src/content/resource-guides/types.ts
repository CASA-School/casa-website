/**
 * The shape of a resource guide, shared by both languages.
 *
 * One guide is a reference DOCUMENT: facts a reader should know before
 * anything else, the steps in the order they happen, a few topics the steps
 * cannot hold in one line each, the questions people actually ask, and the
 * official sources. `src/components/resources/ResourceGuidePage.tsx` renders
 * exactly that and nothing else, so a field added here without a renderer is
 * dead weight — which is how `finalCTA` survived unrendered for months.
 */

export type ResourceGuideSlug = 'study-in-germany' | 'living-in-germany' | 'why-germany';

export type ResourceGuideCta = {
  label: string;
  href: string;
};

export type ResourceGuideStep = {
  title: string;
  text: string;
  /** The one concrete thing to do. Optional: the Why guide is a decision, not a task list. */
  action?: string;
};

export type ResourceGuideSection = {
  title: string;
  intro: string;
  bullets: string[];
  /** Where to continue: another guide, or a page on this site. */
  link?: ResourceGuideCta;
};

export type ResourceGuideFaqItem = {
  question: string;
  answer: string;
};

export type ResourceGuideOfficialLink = {
  label: string;
  description: string;
  url: string;
};

export type ResourceGuideData = {
  slug: ResourceGuideSlug;
  /** Internal path; the German URL comes from src/i18n/pathnames.ts. */
  path: string;
  metaTitle: string;
  metaDescription: string;
  hero: {
    title: string;
    /** One line, for the cross-links on the other two guides. */
    summary: string;
    lead: string;
    /** The first entry is the hero's one action. */
    ctas: ResourceGuideCta[];
  };
  quickFacts: string[];
  stepsTitle: string;
  steps: ResourceGuideStep[];
  sections: ResourceGuideSection[];
  faq: ResourceGuideFaqItem[];
  officialLinks: ResourceGuideOfficialLink[];
};
