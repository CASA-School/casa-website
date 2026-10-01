/**
 * The placement test itself.
 *
 * A thin server shell: it resolves the locale and hands off to the client
 * runner. Everything adaptive happens server-side behind the API, so this page
 * has no attempt state of its own — including whether the attempt is being
 * persisted, which only the write itself can answer.
 *
 * There is deliberately no page chrome here. `TestShell` (rendered by the runner)
 * owns the whole viewport as an app surface, and `SiteShell` drops the navbar,
 * footer, and assistant launcher on this route. Adding a container, a heading, or
 * a breadcrumb back would break the fixed-height layout the shell depends on.
 *
 * `noindex` — a bare test surface is not a landing page, and a search result
 * that drops someone into question one without the framing on /placement-test
 * is a worse first contact than no result at all.
 */

import type { Metadata } from 'next';
import { connection } from 'next/server';

import { PlacementRunner } from '@/components/placement/placement-runner';
import { redirectLocalized } from '@/i18n/redirect';
import { getContentLocale } from '@/lib/content/locale.server';
import { placementTestEnabled } from '@/lib/placement/availability';

export const metadata: Metadata = {
  title: 'Placement test | CASA Bremen',
  robots: { index: false, follow: false },
};

export default async function PlacementTestRunnerPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string }>;
}) {
  // Per request, never prerendered: the switch is read at runtime. Closed, the
  // runner sends people to the Klett tests rather than a chrome-less 404
  // (SiteShell drops the navbar and footer on this exact path).
  await connection();
  if (!placementTestEnabled()) await redirectLocalized('/placement-test');

  const locale = await getContentLocale();
  const { attempt } = await searchParams;

  return <PlacementRunner locale={locale} resumeToken={attempt} />;
}
