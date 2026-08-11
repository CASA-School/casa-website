'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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
      {!isRegistrationPage && <Navbar contentLocale={contentLocale} />}
      <div id="site-content" className="flex-1 flex flex-col">
        {children}
      </div>
      {!isRegistrationPage && <Footer contentLocale={contentLocale} />}
      <AssistantLauncher />
    </>
  );
}
