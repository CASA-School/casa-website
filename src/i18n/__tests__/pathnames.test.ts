import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { localizeHref, routes, toInternalPath, toPublicPath } from '../pathnames';

describe('the URL map', () => {
  it('round-trips every static route in both languages', () => {
    for (const route of routes.filter((entry) => !entry.internal.includes('['))) {
      expect(toPublicPath(route.internal, 'de')).toBe(route.de);
      expect(toInternalPath(route.de).internalPath).toBe(route.internal);
      expect(toInternalPath(route.de).locale).toBe('de');

      const english = route.internal === '/' ? '/en' : `/en${route.internal}`;
      expect(toPublicPath(route.internal, 'en')).toBe(english);
      expect(toInternalPath(english)).toEqual({ locale: 'en', internalPath: route.internal, explicitDefaultPrefix: false });
    }
  });

  it('uses the old site’s German slugs for courses, exams and accommodation', () => {
    expect(toPublicPath('/courses/intensive-german', 'de')).toBe('/sprachkurse/deutsch-intensiv');
    expect(toInternalPath('/sprachkurse/deutsch-intensiv').internalPath).toBe('/courses/intensive-german');
    expect(toPublicPath('/exams/c1', 'de')).toBe('/pruefungszentrum/telc-deutsch-c1-hochschule');
    expect(toInternalPath('/pruefungszentrum/telc-deutsch-b2').internalPath).toBe('/exams/b2');
    expect(toPublicPath('/accommodation/flat', 'de')).toBe('/unterkunft/die-casa-wg');
    expect(toInternalPath('/unterkunft/wohnen-in-einer-gastfamilie').internalPath).toBe('/accommodation/host');
    // The static route wins over the dynamic one beside it.
    expect(toPublicPath('/accommodation/become-host', 'de')).toBe('/unterkunft/gastfamilie-werden');
    expect(toInternalPath('/unterkunft/gastfamilie-werden').internalPath).toBe('/accommodation/become-host');
  });

  it('passes a segment without an alias through unchanged', () => {
    expect(toPublicPath('/news/sommerfest-2026', 'de')).toBe('/aktuelles/sommerfest-2026');
    expect(toInternalPath('/aktuelles/sommerfest-2026').internalPath).toBe('/news/sommerfest-2026');
    expect(toPublicPath('/placement-test/result/abc123', 'de')).toBe('/anmeldung/einstufungstest/ergebnis/abc123');
    expect(toPublicPath('/courses/some-new-course', 'de')).toBe('/sprachkurse/some-new-course');
  });

  it('treats /de/… as the non-canonical form of the German path', () => {
    expect(toInternalPath('/de/courses')).toEqual({ locale: 'de', internalPath: '/courses', explicitDefaultPrefix: true });
    expect(toInternalPath('/de/sprachkurse')).toEqual({ locale: 'de', internalPath: '/courses', explicitDefaultPrefix: true });
    expect(toInternalPath('/de')).toEqual({ locale: 'de', internalPath: '/', explicitDefaultPrefix: true });
  });

  it('reads an English internal path under the German root as non-canonical', () => {
    const resolved = toInternalPath('/courses');
    expect(resolved).toEqual({ locale: 'de', internalPath: '/courses', explicitDefaultPrefix: false });
    expect(toPublicPath(resolved.internalPath, resolved.locale)).toBe('/sprachkurse');
    // English slug under a German segment: canonical form differs, so the proxy redirects.
    const mixed = toInternalPath('/sprachkurse/intensive-german');
    expect(toPublicPath(mixed.internalPath, mixed.locale)).toBe('/sprachkurse/deutsch-intensiv');
  });

  it('leaves route handlers, the workspace, assets and files alone', () => {
    for (const untouched of ['/api/contact', '/admin/sign-in', '/accreditations/azav.svg', '/images/og-default.png', '/sitemap.xml', '/robots.txt', '/icon.png']) {
      expect(toPublicPath(untouched, 'en')).toBe(untouched);
      expect(toPublicPath(untouched, 'de')).toBe(untouched);
      expect(toInternalPath(untouched).internalPath).toBe(untouched);
    }
  });

  it('ignores a trailing slash', () => {
    expect(toInternalPath('/sprachkurse/').internalPath).toBe('/courses');
    expect(toPublicPath('/courses/', 'en')).toBe('/en/courses');
  });
});

describe('localizeHref', () => {
  it('keeps query and hash', () => {
    expect(localizeHref('/placement-test?persona=new-learners', 'de')).toBe('/anmeldung/einstufungstest?persona=new-learners');
    expect(localizeHref('/exams#b2', 'en')).toBe('/en/exams#b2');
    expect(localizeHref('/search?q=telc#results', 'de')).toBe('/suche?q=telc#results');
    expect(localizeHref('/#course-options', 'en')).toBe('/en#course-options');
  });

  it('leaves external hrefs, mailto, tel and bare anchors alone', () => {
    for (const href of ['https://example.org/x', 'mailto:info@casa-bremen.de', 'tel:+49421', '#top', '//cdn.example.org/a']) {
      expect(localizeHref(href, 'de')).toBe(href);
    }
  });

  it('is idempotent on an href that is already public', () => {
    expect(localizeHref('/en/courses', 'en')).toBe('/en/courses');
    expect(localizeHref('/sprachkurse', 'de')).toBe('/sprachkurse');
    expect(localizeHref('/sprachkurse', 'en')).toBe('/en/courses');
    expect(localizeHref('/en/courses', 'de')).toBe('/sprachkurse');
  });
});

describe('the route tree', () => {
  it('has an entry in the URL map for every page', () => {
    const siteRoot = path.resolve(__dirname, '../../app/(site)');
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (entry === 'page.tsx') {
          pages.push(full);
        }
      }
    };
    walk(siteRoot);
    expect(pages.length).toBeGreaterThan(20);

    const known = new Set(routes.map((route) => route.internal));
    for (const page of pages) {
      const route =
        '/' +
        path
          .relative(siteRoot, path.dirname(page))
          .split(path.sep)
          .filter((segment) => segment && segment !== '[locale]' && !segment.startsWith('('))
          .join('/');
      expect(known.has(route === '/' ? '/' : route), `${route} has no entry in src/i18n/pathnames.ts`).toBe(true);
    }
  });
});
