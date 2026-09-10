import type { ContentLocale } from '@/lib/content/types';
import { defaultLocale, isLocale } from './routing';

/**
 * THE URL MAP OF THE PUBLIC SITE.
 *
 * Every route has one INTERNAL path — the English path, which is also what the
 * route tree under src/app/(site)/[locale] is named after — and one German
 * public path. The German paths are the ones casa-bremen.de has used for
 * years, so a link that exists anywhere on the web keeps working, and so
 * Google.de keeps the pages it already ranks. English is served under /en.
 *
 * Code always deals in internal paths. `href="/courses/intensive-german"` in a
 * component is right in every language; the Link in src/i18n/navigation.tsx
 * turns it into /sprachkurse/deutsch-intensiv or /en/courses/intensive-german
 * at render time, and src/proxy.ts turns the incoming public URL back into the
 * internal one. Nothing else in the codebase needs to know a German slug.
 *
 * Dynamic segments carry their own aliases where the old site had a German
 * value: course slugs, exam codes and accommodation types. A segment without an
 * alias — a news slug, a placement token — passes through unchanged.
 *
 * Adding a route: add one entry here. A test walks the route tree and fails if
 * a page has no entry, so a new page cannot ship with an unmapped URL.
 * Adding a language: nothing to do here unless that language gets its own
 * slugs; English internal paths are served under the new prefix.
 */

type ParamAliases = Record<string, Record<string, string>>;

type RouteDefinition = {
  /** Internal path pattern; `[name]` marks a dynamic segment. */
  internal: string;
  /** German public path pattern, same segment names. */
  de: string;
  /** Per segment: internal value → German value. */
  params?: ParamAliases;
};

/** Public course route slugs (see src/lib/content/course-routes.ts) → the old site's German slugs. */
export const COURSE_SLUGS_DE: Record<string, string> = {
  'intensive-german': 'deutsch-intensiv',
  'evening-course': 'deutsch-am-abend',
  'special-courses': 'deutsch-spezialkurse',
  'german-for-groups': 'deutsch-fuer-gruppen',
  'german-for-medical': 'deutsch-fuer-mediziner',
  firmenunterricht: 'firmenunterricht',
  bildungszeit: 'bildungszeit-deutsch',
};

export const EXAM_CODES_DE: Record<string, string> = {
  b2: 'telc-deutsch-b2',
  c1: 'telc-deutsch-c1-hochschule',
};

export const ACCOMMODATION_TYPES_DE: Record<string, string> = {
  flat: 'die-casa-wg',
  host: 'wohnen-in-einer-gastfamilie',
};

export const routes: readonly RouteDefinition[] = [
  { internal: '/', de: '/' },
  { internal: '/about', de: '/ueber-uns/casa-leitbild' },
  { internal: '/ueber-uns/gemeinnuetzigkeit', de: '/ueber-uns/gemeinnuetzigkeit' },
  { internal: '/team', de: '/ueber-uns/casa-team' },

  { internal: '/courses', de: '/sprachkurse' },
  { internal: '/courses/[slug]', de: '/sprachkurse/[slug]', params: { slug: COURSE_SLUGS_DE } },
  { internal: '/exams', de: '/pruefungszentrum' },
  { internal: '/exams/[code]', de: '/pruefungszentrum/[code]', params: { code: EXAM_CODES_DE } },

  { internal: '/accommodation', de: '/unterkunft' },
  { internal: '/accommodation/become-host', de: '/unterkunft/gastfamilie-werden' },
  { internal: '/accommodation/[type]', de: '/unterkunft/[type]', params: { type: ACCOMMODATION_TYPES_DE } },

  { internal: '/registration/course', de: '/anmeldung/anmeldeformular' },
  { internal: '/registration/exam', de: '/anmeldung/anmeldung-zur-pruefung' },
  { internal: '/placement-test', de: '/anmeldung/einstufungstest' },
  { internal: '/placement-test/test', de: '/anmeldung/einstufungstest/test' },
  { internal: '/placement-test/result/[token]', de: '/anmeldung/einstufungstest/ergebnis/[token]' },

  { internal: '/contact', de: '/kontakt' },
  { internal: '/faq', de: '/faq' },
  { internal: '/news', de: '/aktuelles' },
  { internal: '/news/[slug]', de: '/aktuelles/[slug]' },
  { internal: '/careers', de: '/karriere' },
  { internal: '/careers/[slug]', de: '/karriere/[slug]' },
  { internal: '/calculator', de: '/kostenrechner' },
  { internal: '/search', de: '/suche' },

  { internal: '/imprint', de: '/impressum' },
  { internal: '/privacy', de: '/datenschutz' },
  { internal: '/terms', de: '/agb' },

  { internal: '/resources/study-in-germany', de: '/ratgeber/studieren-in-deutschland' },
  { internal: '/resources/living-in-germany', de: '/ratgeber/leben-in-deutschland' },
  { internal: '/resources/why-germany', de: '/ratgeber/warum-deutschland' },

  // Internal review surfaces: same path in both languages, 404 in production.
  { internal: '/design-system', de: '/design-system' },
  { internal: '/design-system/card-treatments', de: '/design-system/card-treatments' },
  { internal: '/design-system/course-format-variants', de: '/design-system/course-format-variants' },
  { internal: '/design-system/layout-patterns', de: '/design-system/layout-patterns' },
  { internal: '/design-alternatives', de: '/design-alternatives' },
  { internal: '/landing-page-alt', de: '/landing-page-alt' },
  { internal: '/homepage-reorganized', de: '/homepage-reorganized' },
];

/**
 * Paths that belong to no language: route handlers, the staff workspace, Next's
 * own assets, the files under public/. Never prefixed, never translated.
 */
export const NON_LOCALIZED_PREFIXES: readonly string[] = [
  '/api',
  '/admin',
  '/_next',
  '/_casa-not-found',
  '/media',
  '/images',
  '/accreditations',
  '/fonts',
];

export function isNonLocalizedPath(path: string): boolean {
  if (NON_LOCALIZED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return true;
  }

  // A file: sitemap.xml, robots.txt, favicon.ico, icon.png, anything with an extension.
  const last = path.slice(path.lastIndexOf('/') + 1);
  return /\.[a-z0-9]+$/i.test(last);
}

// ---------------------------------------------------------------------------

type Compiled = {
  def: RouteDefinition;
  internalPattern: RegExp;
  dePattern: RegExp;
  params: string[];
  /** German value → internal value, derived once from `def.params`. */
  reverse: ParamAliases;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(pattern: string): { regex: RegExp; params: string[] } {
  const params: string[] = [];
  const source = pattern
    .split('/')
    .map((segment) => {
      const match = /^\[(\w+)\]$/.exec(segment);
      if (match) {
        params.push(match[1]);
        return '([^/]+)';
      }
      return escapeRegExp(segment);
    })
    .join('/');
  return { regex: new RegExp(`^${source}$`), params };
}

const compiled: readonly Compiled[] = routes
  .map((def) => {
    const internal = compilePattern(def.internal);
    const de = compilePattern(def.de);
    const reverse: ParamAliases = {};
    for (const [name, aliases] of Object.entries(def.params ?? {})) {
      reverse[name] = Object.fromEntries(Object.entries(aliases).map(([from, to]) => [to, from]));
    }
    return { def, internalPattern: internal.regex, dePattern: de.regex, params: internal.params, reverse };
  })
  // Static routes before dynamic ones, so /accommodation/become-host is never
  // read as /accommodation/[type].
  .sort((a, b) => a.params.length - b.params.length || b.def.internal.length - a.def.internal.length);

function fill(pattern: string, values: Record<string, string>): string {
  return pattern.replace(/\[(\w+)\]/g, (_, name: string) => values[name] ?? '');
}

function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function translate(path: string, direction: 'toDe' | 'toInternal'): string {
  for (const route of compiled) {
    const pattern = direction === 'toDe' ? route.internalPattern : route.dePattern;
    const match = pattern.exec(path);
    if (!match) {
      continue;
    }
    const values: Record<string, string> = {};
    route.params.forEach((name, index) => {
      const raw = match[index + 1];
      const table = direction === 'toDe' ? route.def.params?.[name] : route.reverse[name];
      values[name] = table?.[raw] ?? raw;
    });
    return fill(direction === 'toDe' ? route.def.de : route.def.internal, values);
  }
  return path;
}

/** The path a visitor sees for an internal path in a language, prefix included. */
export function toPublicPath(internalPath: string, locale: ContentLocale): string {
  const path = stripTrailingSlash(internalPath);
  if (isNonLocalizedPath(path)) {
    return path;
  }
  if (locale === defaultLocale) {
    return translate(path, 'toDe');
  }
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export type ResolvedPath = {
  locale: ContentLocale;
  /** The path the route tree serves, English, without a language prefix. */
  internalPath: string;
  /** True for /de/…, which is never a canonical URL. */
  explicitDefaultPrefix: boolean;
};

/** A public URL path → its language and the internal path behind it. */
export function toInternalPath(publicPath: string): ResolvedPath {
  const path = stripTrailingSlash(publicPath);
  if (isNonLocalizedPath(path)) {
    return { locale: defaultLocale, internalPath: path, explicitDefaultPrefix: false };
  }
  const prefix = /^\/([a-z]{2})(?=\/|$)/.exec(path);
  if (prefix && isLocale(prefix[1])) {
    const locale = prefix[1];
    const rest = path.slice(prefix[0].length) || '/';
    if (locale === defaultLocale) {
      return { locale, internalPath: translate(rest, 'toInternal'), explicitDefaultPrefix: true };
    }
    return { locale, internalPath: rest, explicitDefaultPrefix: false };
  }
  return { locale: defaultLocale, internalPath: translate(path, 'toInternal'), explicitDefaultPrefix: false };
}

/**
 * An href as written in code → the href for a language. Keeps query and hash,
 * leaves external, mailto:, tel: and in-page anchors alone, and is safe to call
 * on an href that is already public.
 */
export function localizeHref(href: string, locale: ContentLocale): string {
  if (!href.startsWith('/') || href.startsWith('//')) {
    return href;
  }
  const cut = Math.min(...['?', '#'].map((mark) => href.indexOf(mark)).map((index) => (index === -1 ? href.length : index)));
  const path = href.slice(0, cut);
  const rest = href.slice(cut);
  return toPublicPath(toInternalPath(path).internalPath, locale) + rest;
}
