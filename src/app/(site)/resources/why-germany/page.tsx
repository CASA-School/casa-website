import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { whyGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: whyGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
  description: whyGermanyGuide.metaDescription,
  path: whyGermanyGuide.path,
});

export default function WhyGermanyResourcePage() {
  return <ResourceGuidePage data={whyGermanyGuide} />;
}
