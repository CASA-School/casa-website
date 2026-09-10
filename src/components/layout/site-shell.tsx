'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

import { AssistantLauncher } from '@/components/assistant';
import { InteractionTracker } from '@/components/analytics/interaction-tracker';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { ScrollEffects } from '@/components/ui/scroll-effects';
import type { ContentLocale } from '@/lib/content/types';

type SiteShellProps = {
  children: ReactNode;
  /** Resolved on the server so navbar/footer hydrate with the right language. */
  contentLocale: ContentLocale;
};

export function SiteShell({ children, contentLocale }: SiteShellProps) {
  const pathname = usePathname();
  const isRegistrationPage = pathname?.startsWith('/registration');

  /**
   * The running placement test is an app surface, not a page.
   *
   * It drops MORE chrome than the registration wizard does, and for reasons that
   * are specific to it rather than stylistic:
   *
   *  - **No footer.** On a 375x667 phone the site footer measured 721px against a
   *    1725px page — 42% of a surface whose entire job is one question at a time.
   *  - **No site navbar.** 80px of sticky chrome, permanently, plus dropdowns to
   *    eight other destinations. The test route renders its own compact header
   *    with the one control that belongs here: leave the test.
   *  - **No assistant launcher.** It floats bottom-right, exactly where the
   *    sticky answer bar goes, and offering an AI helper during a language
   *    assessment is wrong on its own terms.
   *
   * Scoped to `/placement-test/test` only. The landing page and the result page
   * are ordinary pages and keep the full site frame — a learner reading their
   * result should be able to get to courses and registration from it.
   */
  const isFocusedTestSurface = pathname === '/placement-test/test';
  const hideSiteChrome = isRegistrationPage || isFocusedTestSurface;

  return (
    <>
      <InteractionTracker />
      <ScrollEffects />
      <a
        href="#site-content"
        className="absolute left-2 top-2 z-[9999] -translate-y-20 rounded-lg bg-[var(--casa-ink-deep)] px-3 py-2 text-sm font-bold text-white transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-sun)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--casa-ink-deep)]"
      >
        Skip to content
      </a>
      {!hideSiteChrome && <Navbar contentLocale={contentLocale} />}
      <div id="site-content" className="flex-1 flex flex-col">
        {children}
      </div>
      {!hideSiteChrome && <Footer contentLocale={contentLocale} />}
      {!isFocusedTestSurface && <AssistantLauncher />}
    </>
  );
}
