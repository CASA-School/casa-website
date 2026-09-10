import type { Metadata } from 'next';

import { ResourceGuidePage } from '@/components/resources/ResourceGuidePage';
import { getResourceGuide } from '@/content/resource-guides';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

const SLUG = 'why-germany' as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const guide = getResourceGuide(SLUG, locale);

  return createPublicMetadata({
    locale,
    title: guide.metaTitle,
    description: guide.metaDescription,
    path: guide.path,
  });
}

export default async function WhyGermanyResourcePage() {
  const locale = await getContentLocale();

  return <ResourceGuidePage data={getResourceGuide(SLUG, locale)} locale={locale} />;
}
