import type { AssistantCard, AssistantCourseFilters, AssistantRuntimeLocale } from '@/lib/assistant/types';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData } from '@/lib/content/repository';

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

function dateLabel(value: string | null, locale: AssistantRuntimeLocale) {
  if (!value) {
    return locale === 'de' ? 'Wird angekündigt' : 'To be announced';
  }

  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function label(locale: AssistantRuntimeLocale, key: 'nextStart' | 'lessons' | 'price') {
  if (locale === 'de') {
    if (key === 'nextStart') {
      return 'Nächster Start';
    }
    if (key === 'lessons') {
      return 'Lektionen/Woche';
    }
    return 'Preis ab';
  }

  if (key === 'nextStart') {
    return 'Next start';
  }
  if (key === 'lessons') {
    return 'Lessons/week';
  }
  return 'Price from';
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
      meta: [
        {
          label: label(locale, 'nextStart'),
          value: dateLabel(finder.nextStartByCourseId[course.id] ?? null, locale),
        },
        {
          label: label(locale, 'lessons'),
          value: String(course.lessons_per_week),
        },
        {
          label: label(locale, 'price'),
          value: `${course.default_price} ${course.currency}`,
        },
      ],
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
    meta: [
      {
        label: label(locale, 'nextStart'),
        value: dateLabel(item.nextStart, locale),
      },
      {
        label: label(locale, 'lessons'),
        value: String(item.course.lessons_per_week),
      },
      {
        label: label(locale, 'price'),
        value: `${item.course.default_price} ${item.course.currency}`,
      },
    ],
  }));
}
