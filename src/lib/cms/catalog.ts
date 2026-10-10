import { COURSE_PAGE_COPY } from '@/config/cms/course-page-copy';
import COPY_CATALOG from '@/config/cms/copy-catalog.json';
import { FOOTER_TEXT_DE } from '@/config/footer-text';
import { deNavText, navConfig } from '@/config/nav';

import { copyKey } from './copy-key';
import { KIND_MAX, type SlotKind } from './slot-kinds';

/**
 * Every slot the website editor can change, with its default in each language.
 *
 * Three sources:
 *
 * - The site's copy, extracted from the source by scripts/cms/extract-copy.mjs
 *   into src/config/cms/copy-catalog.json: every German/English pair a page
 *   resolves through `say`, `pick` or `pickTree`, keyed by the pair itself
 *   (copy-key.ts), with the pages that render it.
 * - The menu and the footer, whose German is a dictionary keyed by the English
 *   (config/nav.ts, config/footer-text.ts).
 * - The course page's shared words, which have hand-made keys
 *   (config/cms/course-page-copy.ts).
 *
 * Built once per process: it is the repository's text, so it only changes with
 * a deploy.
 */

export type CatalogSlot = {
  key: string;
  label: string;
  section: string;
  kind: SlotKind;
  max: number;
  /** Where it shows: one page's name, several, or every page. */
  scope: string;
  /** The internal path of the one page it belongs to, when there is one. */
  path: string | null;
  defaults: Partial<Record<string, string>>;
};

export const ALL_COURSE_PAGES = 'Every course page';
export const EVERY_PAGE = 'Every page';

/** The pages, by their internal route, with the names staff use for them. */
export const PAGE_NAMES: Record<string, string> = {
  '/': 'Startseite',
  '/courses': 'Sprachkurse',
  '/courses/[slug]': ALL_COURSE_PAGES,
  '/exams': 'Prüfungszentrum',
  '/exams/[code]': 'Every exam page',
  '/accommodation': 'Unterkunft',
  '/accommodation/[type]': 'Every accommodation page',
  '/accommodation/become-host': 'Gastfamilie werden',
  '/about': 'Leitbild',
  '/team': 'Team',
  '/ueber-uns/gemeinnuetzigkeit': 'Gemeinnützigkeit',
  '/partners': 'Kooperationspartner',
  '/careers': 'Karriere',
  '/careers/[slug]': 'Every job posting',
  '/contact': 'Kontakt',
  '/faq': 'FAQ',
  '/news': 'Aktuelles',
  '/news/[slug]': 'Every news post',
  '/calculator': 'Kostenrechner',
  '/placement-test': 'Einstufungstest',
  '/registration/course': 'Anmeldeformular',
  '/registration/exam': 'Anmeldung zur Prüfung',
  '/resources/why-germany': 'Warum Deutschland',
  '/resources/study-in-germany': 'Studieren in Deutschland',
  '/resources/living-in-germany': 'Leben in Deutschland',
  '/search': 'Suche',
  '*': EVERY_PAGE,
  '404': 'Error pages',
};

export function slotMax(kind: SlotKind, defaults: readonly (string | undefined)[], explicit?: number): number {
  const longest = Math.max(0, ...defaults.map((value) => value?.length ?? 0));
  return Math.max(explicit ?? KIND_MAX[kind], Math.ceil(longest * 1.15));
}

const kindFor = (text: string): SlotKind => (text.length <= 32 ? 'label' : text.length <= 120 ? 'lead' : 'paragraph');

const excerpt = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return `„${clean.length > 46 ? `${clean.slice(0, 44).trimEnd()}…` : clean}“`;
};

const humanize = (file: string) => {
  const base = file.split('/').pop()!.replace(/\.(tsx?|json)$/, '');
  const words = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase();
  return words === 'faq' ? 'FAQ' : words.charAt(0).toUpperCase() + words.slice(1);
};

function sectionFor(files: readonly string[]): string {
  // The site's frame names a shared wording best, then a component, then a page.
  const file =
    files.find((candidate) => candidate.includes('/components/layout/')) ??
    files.find((candidate) => !candidate.endsWith('/page.tsx')) ??
    files[0] ??
    '';
  const page = /src\/app\/\(site\)\/\[locale\](.*)\/page\.tsx$/.exec(file);
  if (page) return PAGE_NAMES[page[1] || '/'] ?? 'Page';
  return humanize(file);
}

function scopeFor(pages: readonly string[]): { scope: string; path: string | null } {
  if (pages.includes('*')) return { scope: EVERY_PAGE, path: null };
  const names = pages.map((page) => PAGE_NAMES[page] ?? page);
  if (pages.length === 1) return { scope: names[0], path: /[[*]|^404$/.test(pages[0]) ? null : pages[0] };
  if (pages.length === 0) return { scope: 'Shared', path: null };
  if (pages.length <= 3) return { scope: names.join(' · '), path: null };
  return { scope: `${pages.length} pages`, path: null };
}

type Extracted = { de: string; en: string; files: string[]; pages: string[] };

let memo: Map<string, CatalogSlot> | null = null;

export function catalog(): Map<string, CatalogSlot> {
  if (memo) return memo;
  const slots = new Map<string, CatalogSlot>();

  const addPair = (de: string, en: string, section: string, where: { scope: string; path: string | null }) => {
    const key = copyKey(de, en);
    if (slots.has(key)) return;
    const kind = kindFor(de.length >= en.length ? de : en);
    slots.set(key, {
      key,
      label: excerpt(de),
      section,
      kind,
      max: slotMax(kind, [de, en]),
      scope: where.scope,
      path: where.path,
      defaults: { de, en },
    });
  };

  for (const [key, entry] of Object.entries(COURSE_PAGE_COPY)) {
    slots.set(key, {
      key,
      label: entry.label,
      section: entry.section,
      kind: entry.kind,
      max: slotMax(entry.kind, [entry.de, entry.en], 'max' in entry ? (entry.max as number) : undefined),
      scope: ALL_COURSE_PAGES,
      path: null,
      defaults: { de: entry.de, en: entry.en },
    });
  }

  // The menu: every English string in the config, with its German.
  const everyPage = { scope: EVERY_PAGE, path: null };
  const navStrings = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === 'string') navStrings.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      for (const [name, inner] of Object.entries(value)) if (!['href', 'icon', 'id', 'meaning'].includes(name)) collect(inner);
    }
  };
  collect(navConfig);
  for (const english of navStrings) if (/\p{L}{2,}/u.test(english)) addPair(deNavText[english] ?? english, english, 'Main menu', everyPage);
  for (const [english, german] of Object.entries(FOOTER_TEXT_DE)) addPair(german, english, 'Footer', everyPage);

  // After the menu and the footer, so a wording they share with a page is named after them.
  for (const entry of Object.values(COPY_CATALOG as Record<string, Extracted>)) {
    addPair(entry.de, entry.en, sectionFor(entry.files), scopeFor(entry.pages));
  }

  memo = slots;
  return slots;
}

export const slotFor = (key: string): CatalogSlot | undefined => catalog().get(key);
