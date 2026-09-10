import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { livingInGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';
import { getContentLocale } from '@/lib/content/locale.server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: livingInGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
    description: livingInGermanyGuide.metaDescription,
    path: livingInGermanyGuide.path,
  });
}

export default async function LivingInGermanyResourcePage() {
  const locale = await getContentLocale();
  return <ResourceGuidePage data={livingInGermanyGuide} locale={locale} />;
}
