import {
  NEWS_ALLOWED_TAGS,
  NEWS_CATEGORY_KEYWORD_RULES,
  NEWS_DEFAULT_TAGS_BY_CATEGORY,
  NEWS_TAG_KEYWORDS,
  type NewsAllowedTag,
  type NewsCategory,
} from '@/config/newsTaxonomy';

type NewsSuggestionLocale = 'en' | 'de';

type BuildNewsSuggestionsInput = {
  title: string;
  summary: string;
  body: string;
  locale: NewsSuggestionLocale;
};

type BuildNewsSuggestionsOptions = {
  existingSlugs?: string[];
};

export type NewsSuggestions = {
  slug: string;
  readingMinutes: number;
  seoTitle: string;
  seoDescription: string;
  category: NewsCategory;
  tags: NewsAllowedTag[];
};

const MAX_SLUG_LENGTH = 120;
const SEO_TITLE_LIMIT = 60;
const SEO_DESCRIPTION_LIMIT = 160;
const MIN_TAGS = 5;
const MAX_TAGS = 8;

function compactSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

function truncate(value: string, maxLength: number) {
  const normalized = compactSpaces(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function ensureLocaleSuffix(slugBase: string, locale: NewsSuggestionLocale) {
  const normalized = slugBase.trim();
  if (!normalized) {
    return `post-${locale}`;
  }

  return normalized.endsWith(`-${locale}`) ? normalized : `${normalized}-${locale}`;
}

function trimSlugToLimit(value: string) {
  const raw = value.slice(0, MAX_SLUG_LENGTH);
  return raw.replace(/(^-|-$)+/g, '');
}

function toSlugSet(existingSlugs: string[]) {
  return new Set(existingSlugs.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

export function ensureUniqueLocalizedSlug(baseSlug: string, existingSlugs: string[]) {
  const existingSet = toSlugSet(existingSlugs);
  const fallbackBase = trimSlugToLimit(toSlug(baseSlug) || 'post');

  if (!existingSet.has(fallbackBase)) {
    return fallbackBase;
  }

  let index = 2;
  while (index < 1000) {
    const suffix = `-${index}`;
    const candidate = trimSlugToLimit(`${fallbackBase.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`);
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    index += 1;
  }

  return trimSlugToLimit(`${fallbackBase.slice(0, MAX_SLUG_LENGTH - 4)}-999`);
}

export function calculateReadingMinutes(body: string) {
  const words = compactSpaces(body).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function matchCategory(fullText: string) {
  const ranked = NEWS_CATEGORY_KEYWORD_RULES.map((rule) => {
    const score = rule.keywords.reduce((count, keyword) => {
      return fullText.includes(keyword) ? count + 1 : count;
    }, 0);

    return {
      category: rule.category,
      seedTags: rule.seedTags,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score === 0) {
    return {
      category: 'Updates' as const,
      seedTags: NEWS_DEFAULT_TAGS_BY_CATEGORY.Updates,
    };
  }

  return {
    category: top.category,
    seedTags: top.seedTags,
  };
}

function collectMatchedTags(fullText: string) {
  return NEWS_TAG_KEYWORDS.filter((entry) =>
    entry.keywords.some((keyword) => fullText.includes(keyword)),
  ).map((entry) => entry.tag);
}

function normalizeTagList(tags: NewsAllowedTag[]) {
  const allowedSet = new Set(NEWS_ALLOWED_TAGS);
  const unique = Array.from(new Set(tags.filter((tag) => allowedSet.has(tag))));
  return unique.slice(0, MAX_TAGS);
}

function toSuggestionTags(category: NewsCategory, seedTags: NewsAllowedTag[], fullText: string) {
  const matchedTags = collectMatchedTags(fullText);
  const categoryDefaults = NEWS_DEFAULT_TAGS_BY_CATEGORY[category] ?? [];

  const ordered = normalizeTagList([
    ...seedTags,
    ...matchedTags,
    ...categoryDefaults,
    ...NEWS_DEFAULT_TAGS_BY_CATEGORY.Updates,
  ]);

  if (ordered.length >= MIN_TAGS) {
    return ordered.slice(0, MAX_TAGS);
  }

  return normalizeTagList([...ordered, ...NEWS_DEFAULT_TAGS_BY_CATEGORY.Updates]).slice(0, MAX_TAGS);
}

export function buildNewsSuggestions(
  input: BuildNewsSuggestionsInput,
  options: BuildNewsSuggestionsOptions = {},
): NewsSuggestions {
  const title = compactSpaces(input.title);
  const summary = compactSpaces(input.summary);
  const body = compactSpaces(input.body);
  const fullText = `${title} ${summary} ${body}`.toLowerCase();

  const baseSlug = ensureLocaleSuffix(toSlug(title), input.locale);
  const slug = ensureUniqueLocalizedSlug(baseSlug, options.existingSlugs ?? []);

  const { category, seedTags } = matchCategory(fullText);
  const tags = toSuggestionTags(category, seedTags, fullText);

  const fallbackDescription = body.length > 0 ? body : title;

  return {
    slug,
    readingMinutes: calculateReadingMinutes(body),
    seoTitle: truncate(title, SEO_TITLE_LIMIT),
    seoDescription: truncate(summary || fallbackDescription, SEO_DESCRIPTION_LIMIT),
    category,
    tags,
  };
}
