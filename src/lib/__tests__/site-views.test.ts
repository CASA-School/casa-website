import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { pageView } from '@/lib/site-views';

const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const view = (path: string, headers: Record<string, string>, method = 'GET') =>
  pageView(
    new NextRequest(`https://casa-bremen.de${path}`, {
      method,
      headers: { host: 'casa-bremen.de', 'user-agent': DESKTOP, 'sec-fetch-dest': 'document', 'accept-language': 'de-DE,de;q=0.9', ...headers },
    }),
    'de'
  );

describe('website page views (counted on the server)', () => {
  it('counts the first page of a visit with the site it came from, and nothing that identifies the reader', () => {
    expect(view('/sprachkurse/', { referer: 'https://www.google.de/', 'user-agent': PHONE, 'sec-fetch-dest': 'document' })).toEqual({
      path: '/sprachkurse',
      locale: 'de',
      device: 'mobile',
      entry: true,
      referrer: 'google.de',
      language: 'de',
      campaign: null,
      country: null,
    });
  });

  it('keeps the browser language and the campaign a visit came from, never more', () => {
    expect(view('/sprachkurse?utm_source=newsletter&utm_campaign=Herbst%202026', { 'accept-language': 'ar-EG,ar;q=0.9,en;q=0.8' })).toMatchObject({
      path: '/sprachkurse',
      language: 'ar',
      campaign: 'newsletter · Herbst 2026',
    });
    expect(view('/?gclid=abc123', {})).toMatchObject({ campaign: 'Google Ads' });
    expect(view('/kontakt?utm_source=x', { referer: 'https://casa-bremen.de/' })).toMatchObject({ entry: false, campaign: null });
  });

  it('counts a page opened from one of the site’s own pages as part of the visit', () => {
    expect(view('/kontakt', { referer: 'https://casa-bremen.de/sprachkurse', 'sec-fetch-dest': 'document' })).toMatchObject({ entry: false, referrer: null, device: 'desktop' });
  });

  it('does not count the router fetching a page, prefetches, robots, form posts or other hosts', () => {
    expect(view('/kontakt', { 'sec-fetch-dest': 'empty', referer: 'https://casa-bremen.de/sprachkurse' })).toBeNull();
    expect(view('/kontakt', { 'sec-purpose': 'prefetch' })).toBeNull();
    // A script or crawler with a browser's name: no fetch metadata, no languages.
    expect(view('/kontakt', { 'sec-fetch-dest': '', 'accept-language': '' })).toBeNull();
    expect(view('/kontakt', { 'accept-language': '' })).toBeNull();
    expect(view('/kontakt', { 'user-agent': `${PHONE} (compatible; Google-InspectionTool/1.0;)` })).toBeNull();
    expect(view('/kontakt', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })).toBeNull();
    expect(view('/kontakt', { 'user-agent': 'Mozilla/5.0 Chrome-Lighthouse' })).toBeNull();
    expect(view('/kontakt', { 'sec-fetch-dest': 'image' })).toBeNull();
    expect(view('/kontakt', {}, 'POST')).toBeNull();
    expect(view('/kontakt', { host: 'neu.casa-bremen.de' })).toBeNull();
  });
});
