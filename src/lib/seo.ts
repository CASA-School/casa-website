import type { Metadata } from 'next';

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
  path: string;
  keywords?: string[];
  imagePath?: string;
};

export function createPublicMetadata({
  title,
  description,
  path,
  keywords = [],
  imagePath = DEFAULT_OG_IMAGE,
}: PublicMetadataOptions): Metadata {
  const absolutePath = path.startsWith('/') ? path : `/${path}`;
  const canonical = toAbsoluteUrl(absolutePath);
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
      languages: {
        en: canonical,
        de: canonical,
      },
    },
    openGraph: {
      type: 'website',
      siteName: baseTitle,
      title: fullTitle,
      description,
      url: canonical,
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
