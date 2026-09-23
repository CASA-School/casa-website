import { describe, expect, it } from 'vitest';

import { LEGACY_REDIRECTS, legacyRedirectRules } from '../legacy-redirects';
import { routes, toInternalPath, toPublicPath } from '../pathnames';

/**
 * The route that serves an internal path, or null. A dynamic segment counts only when
 * the route lists its values (course slugs, exam codes, accommodation types): a legacy
 * target must be a page we can prove exists, and a news or career slug is data.
 */
function routeFor(internalPath: string) {
  const segments = internalPath.split('/').filter(Boolean);
  return (
    routes.find((route) => {
      const pattern = route.internal.split('/').filter(Boolean);
      if (pattern.length !== segments.length) {
        return false;
      }
      return pattern.every((part, index) => {
        const dynamic = /^\[(\w+)\]$/.exec(part);
        if (!dynamic) {
          return part === segments[index];
        }
        const values = route.params?.[dynamic[1]];
        return values ? segments[index] in values : false;
      });
    }) ?? null
  );
}

const split = (url: string) => {
  const [path, query] = url.split('?');
  return { path, query };
};

describe('legacy redirects', () => {
  it('sends every old URL to a canonical page that exists, in one hop', () => {
    const wrong = LEGACY_REDIRECTS.flatMap(([from, to]) => {
      const path = to.split('#')[0];
      const resolved = toInternalPath(path);
      const canonical = toPublicPath(resolved.internalPath, resolved.locale);
      const route = routeFor(resolved.internalPath);
      const reviewOnly = route && /^\/(design-|landing-page-alt|homepage-reorganized)/.test(route.internal);
      return canonical === path && route && !reviewOnly ? [] : [`${from} -> ${to}`];
    });
    expect(wrong).toEqual([]);
  });

  it('never names a page that exists here, in any letter case', () => {
    // Next matches redirect sources case-insensitively, before routing.
    const shadowing = LEGACY_REDIRECTS.flatMap(([from]) => {
      const { path, query } = split(from);
      if (query) {
        return [];
      }
      return routeFor(toInternalPath(path.toLowerCase()).internalPath) ? [from] : [];
    });
    expect(shadowing).toEqual([]);
  });

  it('lists each old URL once and never redirects to another old URL', () => {
    const keys = LEGACY_REDIRECTS.map(([from]) => from.toLowerCase());
    expect(keys.length - new Set(keys).size).toBe(0);

    const sources = new Set(LEGACY_REDIRECTS.map(([from]) => split(from).path.toLowerCase()));
    const chained = LEGACY_REDIRECTS.filter(([, to]) => sources.has(to.split('#')[0].toLowerCase()));
    expect(chained).toEqual([]);
  });

  it('keeps only the parameter that chose the old article', () => {
    const queries = LEGACY_REDIRECTS.map(([from]) => split(from).query).filter(Boolean) as string[];
    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect([...new URLSearchParams(query)]).toHaveLength(1);
    }
  });

  it('builds permanent Next rules that skip the admin host', () => {
    const rules = legacyRedirectRules();
    const news = LEGACY_REDIRECTS.filter(([from]) => from.includes('tx_news_pi1')).length;
    expect(rules).toHaveLength(LEGACY_REDIRECTS.length + news);
    for (const rule of rules) {
      expect(rule.permanent).toBe(true);
      expect(rule.missing).toEqual([{ type: 'host', value: 'admin[.-].*' }]);
      expect(rule.source.startsWith('/')).toBe(true);
    }

    const tandem = rules.filter((rule) => rule.source === '/aktuelles');
    expect(tandem.map((rule) => ('has' in rule ? rule.has : undefined))).toContainEqual([
      { type: 'query', key: 'amp;tx_news_pi1[news]', value: '4' },
    ]);
    expect(tandem.every((rule) => 'has' in rule)).toBe(true);
  });
});
