import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { studyInGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: studyInGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
  description: studyInGermanyGuide.metaDescription,
  path: studyInGermanyGuide.path,
});

export default function StudyInGermanyResourcePage() {
  return <ResourceGuidePage data={studyInGermanyGuide} />;
}
