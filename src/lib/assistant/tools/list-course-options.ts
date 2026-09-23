import type { AssistantCard, AssistantCourseFilters, AssistantRuntimeLocale } from '@/lib/assistant/types';
import { coursePriceLabel, formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData } from '@/lib/content/repository';
import type { CourseTypeRow } from '@/lib/content/types';

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

function levelRank(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const normalized = value.trim().toUpperCase();
  const index = CEFR_ORDER.indexOf(normalized as (typeof CEFR_ORDER)[number]);
  return index === -1 ? 0 : index;
}

function levelMatches(level: NonNullable<AssistantCourseFilters['level']>, min: string | null, max: string | null) {
  const target = levelRank(level);
  const lower = levelRank(min ?? 'A1');
  const upper = levelRank(max ?? 'C1');
  return target >= lower && target <= upper;
}

function scheduleMatches(schedule: NonNullable<AssistantCourseFilters['schedule']>, tags: string[]) {
  if (schedule === 'flexible') {
    return true;
  }

  if (schedule === 'intensive') {
    return tags.includes('weekdays') || tags.includes('morning');
  }

  return tags.includes('evening');
}

function goalMatches(goal: NonNullable<AssistantCourseFilters['goal']>, slug: string) {
  const normalized = slug.toLowerCase();

  if (goal === 'exam') {
    return normalized.includes('exam') || normalized.includes('university');
  }

  if (goal === 'medical') {
    return normalized.includes('medical');
  }

  if (goal === 'career') {
    return normalized.includes('business') || normalized.includes('company') || normalized.includes('in-company');
  }

  return true;
}

function dateLabel(value: string, locale: AssistantRuntimeLocale) {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}

// "Einstieg" / "Joining" for a term under way, as the course page labels it.
const labels = {
  de: { nextStart: 'Nächster Start', joining: 'Einstieg', lessons: 'Lektionen/Woche' },
  en: { nextStart: 'Next start', joining: 'Joining', lessons: 'Lessons/week' },
} as const;

function label(locale: AssistantRuntimeLocale, key: keyof (typeof labels)['de']) {
  return labels[locale][key];
}

/**
 * The facts a card states, and only the ones CASA publishes.
 *
 * A zero is how the course data says "not published" (German for Medical has
 * no public load, dates or fee; Firmenunterricht is by arrangement), so a zero
 * weekly load or list price is left off rather than shown as a number. A quoted
 * product says "on request" instead of a price, through the same formatter the
 * course pages use — this read "Preis ab 0 EUR" for German for Groups.
 *
 * An evening term under way has no start ahead of it but can be joined today,
 * so it says so; it read "Nächster Start: Wird angekündigt". With neither a term
 * to join nor a start ahead, the card states no date at all.
 */
function courseMeta(
  course: Pick<CourseTypeRow, 'lessons_per_week' | 'default_price' | 'currency' | 'pricing_mode'>,
  nextStart: string | null,
  joinableNow: boolean,
  locale: AssistantRuntimeLocale
): AssistantCard['meta'] {
  const meta: AssistantCard['meta'] = [];

  if (joinableNow) {
    meta.push({ label: label(locale, 'joining'), value: locale === 'de' ? 'Jederzeit möglich' : 'Any time' });
  } else if (nextStart) {
    meta.push({ label: label(locale, 'nextStart'), value: dateLabel(nextStart, locale) });
  }

  if (Number(course.lessons_per_week) > 0) {
    meta.push({ label: label(locale, 'lessons'), value: String(course.lessons_per_week) });
  }

  if (isQuoteOnly(course) || Number(course.default_price) > 0) {
    meta.push({ label: coursePriceLabel(course, locale), value: formatCoursePrice(course, locale) });
  }

  return meta;
}

export async function listCourseOptions(
  filters: AssistantCourseFilters,
  locale: AssistantRuntimeLocale,
  maxItems = 3
): Promise<AssistantCard[]> {
  const finder = await getCourseFinderData(locale);

  const ranked = finder.courses
    .map((course) => {
      const tags = finder.scheduleTagsByCourseId[course.id] ?? [];
      const nextStart = finder.nextStartByCourseId[course.id] ?? null;

      let score = 0;

      if (filters.level && levelMatches(filters.level, course.level_min, course.level_max)) {
        score += 3;
      }

      if (filters.schedule && scheduleMatches(filters.schedule, tags)) {
        score += 2;
      }

      if (filters.goal && goalMatches(filters.goal, course.slug)) {
        score += 2;
      }

      if (filters.startDate && nextStart && new Date(nextStart).getTime() >= new Date(filters.startDate).getTime()) {
        score += 1;
      }

      if (!filters.level && !filters.schedule && !filters.goal && !filters.startDate) {
        score += 1;
      }

      return {
        course,
        score,
        nextStart,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.nextStart && b.nextStart) {
        return new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime();
      }

      return b.course.lessons_per_week - a.course.lessons_per_week;
    })
    .slice(0, Math.max(1, Math.min(maxItems, 6)));

  if (ranked.length === 0) {
    return finder.courses.slice(0, maxItems).map((course) => ({
      type: 'course',
      id: course.id,
      title: course.name,
      description:
        course.narrative?.promise ||
        (locale === 'de'
          ? 'Praxisnahe Lernziele mit klarer Struktur.'
          : 'Practical outcomes with a clear learning structure.'),
      href: getCoursePath(course.slug),
      badges: [course.level_min ?? 'A1', course.level_max ?? 'C1'],
      meta: courseMeta(
        course,
        finder.nextStartByCourseId[course.id] ?? null,
        finder.joinableNowByCourseId[course.id] ?? false,
        locale
      ),
    }));
  }

  return ranked.map((item) => ({
    type: 'course',
    id: item.course.id,
    title: item.course.name,
    description:
      item.course.narrative?.promise ||
      (locale === 'de'
        ? 'Praxisnahe Lernziele mit klarer Struktur.'
        : 'Practical outcomes with a clear learning structure.'),
    href: getCoursePath(item.course.slug),
    badges: [item.course.level_min ?? 'A1', item.course.level_max ?? 'C1'],
    meta: courseMeta(item.course, item.nextStart, finder.joinableNowByCourseId[item.course.id] ?? false, locale),
  }));
}
