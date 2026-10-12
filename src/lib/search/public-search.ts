import 'server-only';

import { loadFacts } from '@/lib/cms/facts.server';
import type { ContentLocale } from '@/lib/content/types';
import { quickAnswer, type QuickAnswer } from '@/lib/knowledge/answers';
import { snippet, type DocType, type Hit, type KnowledgeDoc } from '@/lib/knowledge/engine';
import { getKnowledgeIndex } from '@/lib/knowledge/index.server';

/**
 * The site search: one box over every page, course, exam, FAQ answer and news
 * item, from the knowledge index CLARA uses (src/lib/knowledge). Forgives
 * typos, missing umlauts, split or joined compounds and the other language;
 * answers a price, date or office-hours question directly from the live values.
 */

export type PublicSearchScope = 'all' | 'pages' | 'courses' | 'exams' | 'faq' | 'news';
export type PublicSearchResultType = Exclude<PublicSearchScope, 'all'>;

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  href: string;
  title: string;
  /** The page a section belongs to, when the title is the section's heading. */
  context?: string;
  snippet: string;
  badges: string[];
  meta: string[];
};

export type PublicSearchGroups = Record<PublicSearchResultType, PublicSearchResult[]>;

export type PublicSearchResponse = {
  query: string;
  scope: PublicSearchScope;
  totalResults: number;
  counts: Record<PublicSearchResultType, number>;
  groups: PublicSearchGroups;
  /** Groups by how well their best result matched, best first. */
  order: PublicSearchResultType[];
  /** The best few results across all groups. */
  top: PublicSearchResult[];
  answer?: QuickAnswer;
  didYouMean?: string;
};

const SUPPORTED_SCOPES: PublicSearchScope[] = ['all', 'pages', 'courses', 'exams', 'faq', 'news'];
const GROUPS: PublicSearchResultType[] = ['pages', 'courses', 'exams', 'faq', 'news'];

export function getSearchScope(scope: string | undefined): PublicSearchScope {
  if (scope && SUPPORTED_SCOPES.includes(scope as PublicSearchScope)) {
    return scope as PublicSearchScope;
  }
  return 'all';
}

const groupOf = (type: DocType): PublicSearchResultType =>
  type === 'course' ? 'courses' : type === 'exam' ? 'exams' : type === 'faq' ? 'faq' : type === 'news' ? 'news' : 'pages';

const TYPES_FOR: Record<PublicSearchResultType, DocType[]> = {
  pages: ['page', 'guide', 'accommodation', 'career'],
  courses: ['course'],
  exams: ['exam'],
  faq: ['faq'],
  news: ['news'],
};

function emptyGroups(): PublicSearchGroups {
  return { pages: [], courses: [], exams: [], faq: [], news: [] };
}

const pathOf = (url: string) => url.split('#')[0];

/** A result the reader can scan: the section's heading as title, its page as context. */
function toResult(doc: KnowledgeDoc, query: string): PublicSearchResult {
  const type = groupOf(doc.type);
  const isFaq = doc.type === 'faq';
  const title = isFaq ? doc.heading ?? doc.page : doc.heading ?? doc.page;
  return {
    id: doc.id,
    type,
    href: doc.url,
    title,
    context: !isFaq && doc.heading ? doc.page : undefined,
    snippet: snippet(doc.answer ?? doc.text, query, 200),
    badges: (doc.badges ?? []).slice(0, 2),
    meta: (doc.meta ?? []).slice(0, 2),
  };
}

export async function searchPublicContent({
  locale,
  query,
  scope,
  limitPerGroup = 8,
  prefix = false,
  pagePath,
}: {
  locale: ContentLocale;
  query: string;
  scope: PublicSearchScope;
  limitPerGroup?: number;
  /** Typing in the header: the last word may be unfinished. */
  prefix?: boolean;
  pagePath?: string;
}): Promise<PublicSearchResponse> {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ').slice(0, 200);
  const groups = emptyGroups();
  const counts = { pages: 0, courses: 0, exams: 0, faq: 0, news: 0 };
  const empty: PublicSearchResponse = { query: normalizedQuery, scope, totalResults: 0, counts, groups, order: GROUPS, top: [] };
  if (normalizedQuery.length < 2) return empty;

  const index = await getKnowledgeIndex();
  const types = scope === 'all' ? undefined : TYPES_FOR[scope];
  const hits = index.search(normalizedQuery, { locale, types, prefix });

  // One result per page section; a page's other-language twin is shown in this language.
  const sameLanguage = new Map<string, KnowledgeDoc>();
  for (const doc of index.docs) {
    if (doc.locale === locale && !sameLanguage.has(pathOf(doc.url))) sameLanguage.set(pathOf(doc.url), doc);
  }
  const best = hits[0]?.score ?? 0;
  const seen = new Set<string>();
  const kept: Array<{ hit: Hit; doc: KnowledgeDoc }> = [];
  for (const hit of hits) {
    // Weak tails are noise: a tenth of the best match, or a score that matched one stray word.
    if (hit.score < best * 0.1) break;
    const doc = hit.doc.locale === locale ? hit.doc : sameLanguage.get(pathOf(hit.doc.url)) ?? hit.doc;
    const key = doc.type === 'faq' ? doc.id : doc.type === 'page' || doc.type === 'guide' || doc.type === 'accommodation' || doc.type === 'career' ? doc.url : pathOf(doc.url);
    // Two sections of one page: keep the better one only.
    const pageKey = `${groupOf(doc.type)}|${doc.type === 'faq' ? doc.id : pathOf(doc.url)}`;
    if (seen.has(key) || seen.has(pageKey)) continue;
    seen.add(key);
    seen.add(pageKey);
    kept.push({ hit, doc });
  }

  const groupBest = new Map<PublicSearchResultType, number>();
  for (const { hit, doc } of kept) {
    const type = groupOf(doc.type);
    counts[type] += 1;
    if (groups[type].length < limitPerGroup) groups[type].push(toResult(doc, normalizedQuery));
    if (!groupBest.has(type)) groupBest.set(type, hit.score);
  }
  const order = [...GROUPS].sort((a, b) => (groupBest.get(b) ?? -1) - (groupBest.get(a) ?? -1));

  const facts = await loadFacts(locale);
  const corrected = index.didYouMean(normalizedQuery);
  // "untrekunft kosten" is answered as "Unterkunft kosten".
  const answer =
    scope === 'all' || scope === 'courses' || scope === 'exams'
      ? (quickAnswer(normalizedQuery, { locale, facts: facts.values, pagePath }) ?? (corrected ? quickAnswer(corrected, { locale, facts: facts.values, pagePath }) : null)) ?? undefined
      : undefined;

  return {
    query: normalizedQuery,
    scope,
    totalResults: kept.length,
    counts,
    groups,
    order,
    top: kept.slice(0, 5).map(({ doc }) => toResult(doc, normalizedQuery)),
    answer,
    didYouMean: corrected && corrected.toLowerCase() !== normalizedQuery.toLowerCase() ? corrected : undefined,
  };
}
