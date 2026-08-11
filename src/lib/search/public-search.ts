import type { ContentLocale } from '@/lib/content/types';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData, getExamCatalog, getFaq, getNewsList } from '@/lib/content/repository';

export type PublicSearchScope = 'all' | 'courses' | 'exams' | 'faq' | 'news';
export type PublicSearchResultType = Exclude<PublicSearchScope, 'all'>;

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  href: string;
  title: string;
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
};

const SUPPORTED_SCOPES: PublicSearchScope[] = ['all', 'courses', 'exams', 'faq', 'news'];

export function getSearchScope(scope: string | undefined): PublicSearchScope {
  if (scope && SUPPORTED_SCOPES.includes(scope as PublicSearchScope)) {
    return scope as PublicSearchScope;
  }
  return 'all';
}

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function scoreField(value: string, terms: string[]) {
  if (!value) {
    return 0;
  }

  const normalized = value.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (normalized === term) {
      score += 10;
    } else if (normalized.startsWith(term)) {
      score += 6;
    } else if (normalized.includes(term)) {
      score += 3;
    }
  }

  return score;
}

function scoreWeighted(fields: Array<{ value: string; weight: number }>, terms: string[]) {
  return fields.reduce((sum, field) => sum + scoreField(field.value, terms) * field.weight, 0);
}

function truncate(text: string, length = 160) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= length) {
    return compact;
  }

  return `${compact.slice(0, length - 1)}...`;
}

function buildSnippet(fields: string[], terms: string[]) {
  const match = fields.find((value) => scoreField(value, terms) > 0) ?? fields[0] ?? '';
  return truncate(match);
}

function emptyGroups(): PublicSearchGroups {
  return {
    courses: [],
    exams: [],
    faq: [],
    news: [],
  };
}

export async function searchPublicContent({
  locale,
  query,
  scope,
  limitPerGroup = 8,
}: {
  locale: ContentLocale;
  query: string;
  scope: PublicSearchScope;
  limitPerGroup?: number;
}): Promise<PublicSearchResponse> {
  const normalizedQuery = query.trim().toLowerCase();
  const queryTerms = tokenizeQuery(normalizedQuery);
  const groups = emptyGroups();

  if (queryTerms.length === 0) {
    return {
      query: normalizedQuery,
      scope,
      totalResults: 0,
      counts: {
        courses: 0,
        exams: 0,
        faq: 0,
        news: 0,
      },
      groups,
    };
  }

  const [finderData, examCatalog, faqItems, newsItems] = await Promise.all([
    getCourseFinderData(locale),
    getExamCatalog(locale),
    getFaq(locale),
    getNewsList(locale),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    dateStyle: 'medium',
  });
  const includeScope = (candidate: PublicSearchScope) => scope === 'all' || scope === candidate;

  const courseResults =
    includeScope('courses')
      ? finderData.courses
          .map((course) => {
            const score = scoreWeighted(
              [
                { value: course.name, weight: 5 },
                { value: course.slug, weight: 4 },
                { value: course.narrative?.promise ?? '', weight: 3 },
                { value: course.narrative?.audience ?? '', weight: 2 },
                { value: course.format ?? '', weight: 2 },
              ],
              queryTerms
            );

            return {
              result: {
                id: course.id,
                type: 'courses',
                href: getCoursePath(course.slug),
                title: course.name,
                snippet: buildSnippet(
                  [course.narrative?.promise ?? '', course.narrative?.audience ?? '', course.format ?? ''],
                  queryTerms
                ),
                badges: course.format ? [course.format] : [],
                meta: [`${locale === 'de' ? 'Niveau' : 'Level'}: ${course.level_min} - ${course.level_max}`],
              } satisfies PublicSearchResult,
              score,
              sortTitle: course.name,
            };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score || a.sortTitle.localeCompare(b.sortTitle))
      : [];

  const examResults =
    includeScope('exams')
      ? examCatalog.items
          .map((exam) => {
            const score = scoreWeighted(
              [
                { value: exam.examType.name, weight: 5 },
                { value: exam.examType.code, weight: 4 },
                { value: exam.narrative?.headline ?? '', weight: 3 },
                { value: exam.narrative?.summary ?? '', weight: 2 },
              ],
              queryTerms
            );
            const nextSession = exam.sessions[0]?.starts_at
              ? dateFormatter.format(new Date(exam.sessions[0].starts_at))
              : null;

            return {
              result: {
                id: exam.examType.id,
                type: 'exams',
                href: `/exams/${exam.anchorId}`,
                title: exam.examType.name,
                snippet: buildSnippet([exam.narrative?.summary ?? '', exam.examType.name], queryTerms),
                badges: [exam.examType.code],
                meta: nextSession ? [`${locale === 'de' ? 'Nächster Termin' : 'Next session'}: ${nextSession}`] : [],
              } satisfies PublicSearchResult,
              score,
              sortTitle: exam.examType.name,
            };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score || a.sortTitle.localeCompare(b.sortTitle))
      : [];

  const faqResults =
    includeScope('faq')
      ? faqItems
          .map((item) => {
            const score = scoreWeighted(
              [
                { value: item.question, weight: 5 },
                { value: item.answer, weight: 2 },
                { value: item.category, weight: 2 },
              ],
              queryTerms
            );

            return {
              result: {
                id: item.id,
                type: 'faq',
                href: '/faq',
                title: item.question,
                snippet: buildSnippet([item.answer], queryTerms),
                badges: [],
                meta: [item.category],
              } satisfies PublicSearchResult,
              score,
              sortTitle: item.question,
            };
          })
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score || a.sortTitle.localeCompare(b.sortTitle))
      : [];

  const newsResults =
    includeScope('news')
      ? newsItems
          .map((item) => {
            const score = scoreWeighted(
              [
                { value: item.title, weight: 5 },
                { value: item.summary, weight: 3 },
                { value: item.body, weight: 1 },
                { value: item.category, weight: 2 },
              ],
              queryTerms
            );

            return {
              result: {
                id: item.slug,
                type: 'news',
                href: `/news/${item.slug}`,
                title: item.title,
                snippet: buildSnippet([item.summary, item.body], queryTerms),
                badges: [],
                meta: [item.category],
              } satisfies PublicSearchResult,
              score,
              publishedAt: item.publishedAt,
            };
          })
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
      : [];

  groups.courses = courseResults.slice(0, limitPerGroup).map((item) => item.result);
  groups.exams = examResults.slice(0, limitPerGroup).map((item) => item.result);
  groups.faq = faqResults.slice(0, limitPerGroup).map((item) => item.result);
  groups.news = newsResults.slice(0, limitPerGroup).map((item) => item.result);

  return {
    query: normalizedQuery,
    scope,
    totalResults: courseResults.length + examResults.length + faqResults.length + newsResults.length,
    counts: {
      courses: courseResults.length,
      exams: examResults.length,
      faq: faqResults.length,
      news: newsResults.length,
    },
    groups,
  };
}
