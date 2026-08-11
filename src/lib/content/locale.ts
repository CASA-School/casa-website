import type { ContentLocale } from '@/lib/content/types';

export const CONTENT_LOCALE_COOKIE = 'casa_locale';

const SUPPORTED_LOCALES: ContentLocale[] = ['en', 'de'];

export function isContentLocale(value: string | null | undefined): value is ContentLocale {
  if (!value) {
    return false;
  }

  return SUPPORTED_LOCALES.includes(value as ContentLocale);
}

export function normalizeContentLocale(value: string | null | undefined): ContentLocale {
  if (!value) {
    return 'en';
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith('de')) {
    return 'de';
  }

  return 'en';
}

export function shouldShowDraftClaims() {
  const value = process.env.NEXT_PUBLIC_SHOW_DRAFT_CLAIMS;
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}
