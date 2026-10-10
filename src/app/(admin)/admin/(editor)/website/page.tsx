import type { Metadata } from 'next';

import { WebsiteEditor } from '@/components/admin/website/editor';
import { DEFAULT_EDITOR_PATH, EDITOR_PAGES } from '@/config/cms/editor-pages';
import { requireModule } from '@/lib/admin/guard';
import { aiEnabled } from '@/lib/cms/ai.server';
import { initialsOf } from '@/lib/cms/editor-types';
import { cmsLocales } from '@/lib/cms/locales';
import { publicSiteOrigin } from '@/lib/cms/origins';
import { createPreviewToken, safePreviewPath } from '@/lib/cms/preview-token';

export const metadata: Metadata = { title: 'Website · Workspace · CASA Bremen' };

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
  const origin = await publicSiteOrigin();
  const token = createPreviewToken(user.id);

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
    />
  );
}
