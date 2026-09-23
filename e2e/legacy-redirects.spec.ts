import { expect, test } from '@playwright/test';

import { LEGACY_REDIRECTS } from '../src/i18n/legacy-redirects';

/*
 * Every old casa-bremen.de URL in the map, against the running app: one 308 to
 * exactly its target, and every target a 200. The unit test proves the map is
 * well-formed; this proves Next applies it the way the map says, including the
 * dotted paths the proxy never sees and the news rules that match on a query.
 */

test('every old URL answers one permanent redirect to its page', async ({ request }) => {
  test.setTimeout(120_000);
  const wrong: string[] = [];

  for (const [from, to] of LEGACY_REDIRECTS) {
    const response = await request.get(from, { maxRedirects: 0 });
    const location = response.headers()['location'] ?? '';
    const target = new URL(location, 'http://localhost');
    const landed = decodeURIComponent(target.pathname) + target.hash;
    if (response.status() !== 308 || landed !== to) {
      wrong.push(`${from}: ${response.status()} ${location}`);
    }
  }

  expect(wrong).toEqual([]);
});

test('an HTML-escaped news link is redirected like the plain one', async ({ request }) => {
  const response = await request.get('/aktuelles?tx_news_pi1%5Baction%5D=detail&amp;tx_news_pi1%5Bnews%5D=4', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers()['location'], 'http://localhost').pathname).toBe('/ueber-uns/casa-leitbild');

  // Without the article parameter, /aktuelles is the news page itself.
  expect((await request.get('/aktuelles', { maxRedirects: 0 })).status()).toBe(200);
});

test('every redirect target is a page that answers 200 directly', async ({ request }) => {
  // Each target is rendered once; on a cold dev server that is a compile per page.
  test.setTimeout(300_000);
  const targets = [...new Set(LEGACY_REDIRECTS.map(([, to]) => to.split('#')[0]))];
  const wrong: string[] = [];

  for (const target of targets) {
    const status = (await request.get(target, { maxRedirects: 0 })).status();
    if (status !== 200) {
      wrong.push(`${target}: ${status}`);
    }
  }

  expect(wrong).toEqual([]);
});
