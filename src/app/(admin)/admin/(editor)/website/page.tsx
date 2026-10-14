import type { Metadata } from 'next';

import { WebsiteEditor } from '@/components/admin/website/editor';
import { DEFAULT_EDITOR_PATH, EDITOR_PAGES } from '@/config/cms/editor-pages';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { aiEnabled } from '@/lib/cms/ai.server';
import { initialsOf } from '@/lib/cms/editor-types';
import { loadFacts } from '@/lib/cms/facts.server';
import { cmsLocales } from '@/lib/cms/locales';
import { publicSiteOrigin } from '@/lib/cms/origins';
import { createPreviewToken, safePreviewPath } from '@/lib/cms/preview-token';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Website · Arbeitsbereich · CASA Bremen', 'Website · Workspace · CASA Bremen') };
}

/**
 * The website editor. docs/WEBSITE_EDITOR.md explains it.
 *
 * The page renders the real public page in an iframe, in draft mode, opened
 * through a token signed here for this colleague; everything after that is the
 * client component and the actions beside it. `?path=` opens a page by its
 * German address.
 */
export default async function WebsiteEditorPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const [user, params] = await Promise.all([requireModule('website'), searchParams]);
  const [origin, de, en, { t }] = await Promise.all([publicSiteOrigin(), loadFacts('de'), loadFacts('en'), getI18n()]);
  const token = createPreviewToken(user.id);
  // Where each live value is changed, for the colleagues who may change it there.
  const dataScreens = {
    ...(canAccess(user, 'catalogue') ? { 'Course dates': { label: t('Kurse', 'Courses'), href: '/admin/catalogue' } } : {}),
    'Course types': { label: t('Listen', 'Lists'), href: '/admin/settings/setup' },
    ...(canAccess(user, 'prices') ? { Prices: { label: t('Preise', 'Prices'), href: '/admin/settings/prices' } } : {}),
  };

  return (
    <WebsiteEditor
      user={{ name: user.name, initials: initialsOf(user.name) }}
      level={user.access.website === 'full' ? 'full' : user.access.website === 'edit' ? 'edit' : 'view'}
      locales={cmsLocales()}
      pages={EDITOR_PAGES}
      publicOrigin={origin}
      previewBase={`${origin}/api/cms/preview?token=${encodeURIComponent(token)}&path=`}
      initialPath={safePreviewPath(params.path ?? DEFAULT_EDITOR_PATH)}
      aiEnabled={aiEnabled()}
      facts={{ defs: de.defs, values: { de: de.values, en: en.values } }}
      dataScreens={dataScreens}
    />
  );
}
