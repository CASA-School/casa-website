import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { livingInGermanyGuide } from '@/content/resourcesGuides.en';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: livingInGermanyGuide.metaTitle.replace(/\s\|\sCASA Bremen$/, ''),
  description: livingInGermanyGuide.metaDescription,
  path: livingInGermanyGuide.path,
});

export default function LivingInGermanyResourcePage() {
  return <ResourceGuidePage data={livingInGermanyGuide} />;
}
