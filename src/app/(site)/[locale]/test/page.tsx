/**
 * The test on the first day of an intensive course (Einstufungstest Tag 1), on the learner's phone.
 *
 * Learners type casa-bremen.de/test from the board, so the address is the same in German and as
 * the internal path. A thin server shell: the runner talks to /api/entry-test and keeps the
 * answers in memory only.
 *
 * No page chrome: `SiteShell` drops the navbar, footer, CLARA and the notices on this path, and the
 * runner owns the viewport. German only, and in „Sie", word for word as the old Apps Script page the
 * director tested on a phone (like the placement test's own screens, an exception to the site's
 * „du"), so the copy is not routed through the website editor.
 *
 * `noindex`, and left out of the sitemap, llms.txt and the knowledge index: a test page is not a
 * page anyone should land on from a search.
 */

import type { Metadata, Viewport } from 'next';

import { EntryTestRunner } from '@/components/entry-test/entry-test-runner';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return {
    ...createPublicMetadata({
      locale,
      title: 'Einstufungstest',
      description: 'Der Einstufungstest am ersten Kurstag der CASA Internationale Sprachschule Bremen.',
      path: '/test',
    }),
    robots: { index: false, follow: false },
  };
}

/** The page reaches under the notch and the home indicator; the runner pads by the safe-area insets. */
export const viewport: Viewport = { viewportFit: 'cover' };

export default function EntryTestPage() {
  return <EntryTestRunner />;
}
