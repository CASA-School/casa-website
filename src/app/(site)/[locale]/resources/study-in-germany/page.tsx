import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { studyInGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';
import { getContentLocale } from '@/lib/content/locale.server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: studyInGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
    description: studyInGermanyGuide.metaDescription,
    path: studyInGermanyGuide.path,
  });
}

export default function StudyInGermanyResourcePage() {
  return <ResourceGuidePage data={studyInGermanyGuide} />;
}
