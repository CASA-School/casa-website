import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPublicMetadata, getSiteUrl, toAbsoluteUrl } from '@/lib/seo';

/**
 * The old site answers on the apex and 301s www to it, so every canonical,
 * hreflang, sitemap and JSON-LD URL has to name the apex too — otherwise the
 * cutover reads to a search engine as a move to a different host.
 */
describe('the canonical origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the apex host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    expect(getSiteUrl()).toBe('https://casa-bremen.de');
    expect(toAbsoluteUrl('/sitemap.xml')).toBe('https://casa-bremen.de/sitemap.xml');
  });

  it('puts canonical, hreflang and og:url on the apex', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const metadata = createPublicMetadata({
      title: 'Deutsch intensiv',
      description: 'Intensivkurs',
      path: '/courses/intensive-german',
      locale: 'de',
    });

    expect(metadata.alternates?.canonical).toBe('https://casa-bremen.de/sprachkurse/deutsch-intensiv');
    expect(metadata.alternates?.languages).toMatchObject({
      de: 'https://casa-bremen.de/sprachkurse/deutsch-intensiv',
      en: 'https://casa-bremen.de/en/courses/intensive-german',
      'x-default': 'https://casa-bremen.de/sprachkurse/deutsch-intensiv',
    });
    expect(JSON.stringify(metadata)).not.toContain('www.casa-bremen.de');
  });

  it('still honours an override, without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.example.org/');

    expect(toAbsoluteUrl('/en')).toBe('https://staging.example.org/en');
  });
});
