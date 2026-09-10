import type { ContentLocale } from '@/lib/content/types';

import { resourceGuidesEn } from './en';
import { resourceGuidesDe } from './de';
import type { ResourceGuideData, ResourceGuideSlug } from './types';

export type { ResourceGuideData, ResourceGuideSlug } from './types';

const byLocale: Record<ContentLocale, Record<ResourceGuideSlug, ResourceGuideData>> = {
  en: resourceGuidesEn,
  de: resourceGuidesDe,
};

/** One guide in the reader's language. */
export function getResourceGuide(slug: ResourceGuideSlug, locale: ContentLocale): ResourceGuideData {
  return byLocale[locale][slug];
}

/** The other two guides, for the cross-links at the end of each one. */
export function getOtherResourceGuides(slug: ResourceGuideSlug, locale: ContentLocale): ResourceGuideData[] {
  return Object.values(byLocale[locale]).filter((guide) => guide.slug !== slug);
}
