import type { Metadata } from 'next';

import { toPublicPath } from '@/i18n/pathnames';
import { defaultLocale, localeTags, locales } from '@/i18n/routing';
import type { ContentLocale } from '@/lib/content/types';

const DEFAULT_SITE_URL = 'https://www.casa-bremen.de';
const DEFAULT_OG_IMAGE = '/images/og-default.png';

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getSiteUrl() {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
}

export function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

type PublicMetadataOptions = {
  title: string;
  description: string;
  /** The INTERNAL path (`/courses/intensive-german`); the public URL per language is derived here. */
  path: string;
  /** The language this page is being rendered in. */
  locale: ContentLocale;
  keywords?: string[];
  imagePath?: string;
};

/**
 * Metadata for one public page in one language.
 *
 * The canonical URL is the public path of THIS language, and hreflang lists the
 * public path of EVERY language plus x-default on the German root. Until
 * 2026-09-10 both languages pointed at one URL, which told search engines the
 * German page did not exist.
 */
export function createPublicMetadata({
  title,
  description,
  path,
  locale,
  keywords = [],
  imagePath = DEFAULT_OG_IMAGE,
}: PublicMetadataOptions): Metadata {
  const internalPath = path.startsWith('/') ? path : `/${path}`;
  const canonical = toAbsoluteUrl(toPublicPath(internalPath, locale));
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((entry) => [localeTags[entry].hreflang, toAbsoluteUrl(toPublicPath(internalPath, entry))])
  );
  languages['x-default'] = toAbsoluteUrl(toPublicPath(internalPath, defaultLocale));
  const imageUrl = toAbsoluteUrl(imagePath);
  const baseTitle = 'CASA Bremen';
  const fullTitle = `${title} | ${baseTitle}`;

  return {
    title: fullTitle,
    description,
    keywords,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: baseTitle,
      title: fullTitle,
      description,
      url: canonical,
      locale: localeTags[locale].openGraph,
      alternateLocale: locales.filter((entry) => entry !== locale).map((entry) => localeTags[entry].openGraph),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}
