'use client';

import NextLink from 'next/link';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';
import { useMemo, type ComponentProps } from 'react';

import type { ContentLocale } from '@/lib/content/types';
import { localizeHref, toInternalPath } from './pathnames';

/**
 * Navigation for the public site. Import Link, useRouter and usePathname from
 * here, never from next/link or next/navigation, in anything the site renders.
 *
 * The language is read from the URL, not from a context, so these work in
 * every tree — including the staff workspace, where there is no intl provider
 * and the paths are not localised anyway.
 */

/** The language of the page being rendered, from its URL. */
export function useLocaleFromPath(): ContentLocale {
  const pathname = useNextPathname();
  return toInternalPath(pathname ?? '/').locale;
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href' | 'locale'> & {
  /** An internal path (`/courses/intensive-german`), or any external href. */
  href: string;
  /** Render the link in another language than the current page: the switcher. */
  locale?: ContentLocale;
};

export function Link({ href, locale, ...props }: LinkProps) {
  const current = useLocaleFromPath();
  return <NextLink href={localizeHref(href, locale ?? current)} {...props} />;
}

/** The internal path of the current page, so `pathname === '/courses'` keeps meaning what it says. */
export function usePathname(): string {
  const pathname = useNextPathname();
  return toInternalPath(pathname ?? '/').internalPath;
}

type NavigateOptions = Parameters<ReturnType<typeof useNextRouter>['push']>[1];

/** Next's router with push/replace/prefetch taking internal paths. */
export function useRouter() {
  const router = useNextRouter();
  const locale = useLocaleFromPath();

  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: NavigateOptions) => router.push(localizeHref(href, locale), options),
      replace: (href: string, options?: NavigateOptions) => router.replace(localizeHref(href, locale), options),
      prefetch: (href: string) => router.prefetch(localizeHref(href, locale)),
    }),
    [locale, router]
  );
}
