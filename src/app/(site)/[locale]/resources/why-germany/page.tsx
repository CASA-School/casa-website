import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { whyGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';
import { getContentLocale } from '@/lib/content/locale.server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: whyGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
    description: whyGermanyGuide.metaDescription,
    path: whyGermanyGuide.path,
  });
}

export default function WhyGermanyResourcePage() {
  return <ResourceGuidePage data={whyGermanyGuide} />;
}
