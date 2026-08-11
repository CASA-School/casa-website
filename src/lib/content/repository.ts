import { getDb } from '@/lib/db/server';
import { CASA_LEVEL_SEQUENCE } from '@/config/calculator/pricing';
import { heroSpecsByLocale } from '@/config/content/heroes';
import { proofMetricsByLocale } from '@/config/content/proof-metrics';
import { socialProofByLocale } from '@/config/content/social-proof';
import { courseNarrativesByLocale } from '@/config/content/course-narratives';
import { examNarrativesByLocale } from '@/config/content/exam-narratives';
import { accommodationNarrativesByLocale } from '@/config/content/accommodation-narratives';
import { placementNarrativesByLocale } from '@/config/content/placement-narratives';
import { culturalProgramsByLocale } from '@/config/content/cultural-programs';
import { teamSpotlightsByLocale } from '@/config/content/team-spotlights';
import { listMockRows } from '@/lib/mock/store';
import { getCourseContentSlug } from '@/lib/content/course-routes';
import {
  fallbackCourseInstances,
  fallbackCourseTypes,
  fallbackExamSessions,
  fallbackExamTypes,
  fallbackFaqByLocale,
  fallbackNewsByLocale,
} from '@/config/content/public-fixtures';
import type {
  AccommodationNarrative,
  AccommodationTypeKey,
  ContentLocale,
  CourseFinderData,
  CourseRegistrationOption,
  RegistrationCourseCatalog,
  RegistrationExamCatalog,
  CourseDetailModel,
  CourseInstanceRow,
  CourseNarrative,
  CourseTypeRow,
  CourseWithNarrative,
  ExamCatalogItem,
  ExamCatalogModel,
  ExamNarrative,
  ExamRegistrationOption,
  ExamSessionRow,
  ExamTypeRow,
  FaqViewItem,
  HeroPageKey,
  HeroSpec,
  NewsViewItem,
  CareerPositionViewItem,
  PlacementNarrative,
  ProofMetric,
  SocialProofItem,
  TeamSpotlight,
  CulturalProgramItem,
} from '@/lib/content/types';

function byLocale<T extends { locale: ContentLocale }>(items: T[], locale: ContentLocale): T[] {
  const localized = items.filter((item) => item.locale === locale);
  if (localized.length > 0) {
    return localized;
  }

  return items.filter((item) => item.locale === 'en');
}

function normalizeCategory(input: string | null) {
  if (!input || input.trim().length === 0) {
    return 'General';
  }

  return input
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function examAnchorId(exam: { code: string | null; name: string | null }) {
  const code = exam.code?.toLowerCase() ?? '';
  const name = exam.name?.toLowerCase() ?? '';

  if (code.includes('testdaf') || name.includes('testdaf')) {
    return 'testdaf';
  }

  if (code.includes('c1') || name.includes('c1')) {
    return 'c1';
  }

  if (code.includes('b2') || name.includes('b2')) {
    return 'b2';
  }

  return code || name.replace(/[^a-z0-9]+/g, '-');
}

function attachCourseNarratives(courses: CourseTypeRow[], locale: ContentLocale): CourseWithNarrative[] {
  const localizedNarratives = courseNarrativesByLocale[locale] ?? courseNarrativesByLocale.en;
  const fallbackNarratives = courseNarrativesByLocale.en;

  return courses.map((course) => {
    const narrative =
      localizedNarratives.find((item) => item.slug === course.slug) ??
      fallbackNarratives.find((item) => item.slug === course.slug) ??
      null;

    return {
      ...course,
      narrative,
    };
  });
}

const sparseCourseTopUpSlugs = [
  'intensive-german',
  'evening-german',
  'special-courses',
  'german-for-groups',
  'medical-german',
  'in-company',
] as const;

const hiddenPublicCourseSlugs = new Set([
  'exam-preparation',
  'summer-intensive',
  'integration-german',
]);

const publicExamCodes = new Set([
  'telc_b2',
  'telc_c1_hochschule',
]);

const publicCourseDisplayNames: Partial<Record<string, Record<ContentLocale, string>>> = {
  'intensive-german': {
    en: 'Intensive German',
    de: 'Intensiv Deutsch',
  },
  'evening-german': {
    en: 'Evening Course',
    de: 'Abendkurs',
  },
  'german-for-groups': {
    en: 'German for Groups',
    de: 'Deutsch für Gruppen',
  },
  'medical-german': {
    en: 'German for Medical',
    de: 'Deutsch für Medizin',
  },
  'in-company': {
    en: 'Firmenunterricht',
    de: 'Firmenunterricht',
  },
};

function filterPublicCourseTypes(courses: CourseTypeRow[]) {
  return courses.filter((course) => !hiddenPublicCourseSlugs.has(course.slug));
}

function applyPublicCourseDisplayNames(courses: CourseTypeRow[], locale: ContentLocale) {
  return courses.map((course) => ({
    ...course,
    name: publicCourseDisplayNames[course.slug]?.[locale] ?? course.name,
  }));
}

function applyPublicCourseDisplayName(course: CourseTypeRow, locale: ContentLocale) {
  return applyPublicCourseDisplayNames([course], locale)[0];
}

function filterPublicExamTypes(examTypes: ExamTypeRow[]) {
  return examTypes.filter((examType) => publicExamCodes.has(examType.code));
}

function filterSessionsByType<T extends { exam_type_id: string }>(sessions: T[], examTypes: ExamTypeRow[]) {
  const publicExamTypeIds = new Set(examTypes.map((examType) => examType.id));

  return sessions.filter((session) => publicExamTypeIds.has(session.exam_type_id));
}

function fillSparseCourseTypes(courses: CourseTypeRow[], minimumCount = 6) {
  if (courses.length === 0 || courses.length >= minimumCount) {
    return courses;
  }

  const existingSlugs = new Set(courses.map((course) => course.slug));
  const fallbackBySlug = new Map(fallbackCourseTypes.map((course) => [course.slug, course]));
  const preferredFallbacks = sparseCourseTopUpSlugs
    .map((slug) => fallbackBySlug.get(slug))
    .filter((course): course is CourseTypeRow => {
      if (!course) {
        return false;
      }

      return !existingSlugs.has(course.slug);
    });
  const remainingFallbacks = fallbackCourseTypes
    .filter((course) => !existingSlugs.has(course.slug) && !sparseCourseTopUpSlugs.includes(course.slug as (typeof sparseCourseTopUpSlugs)[number]))
    .sort((a, b) => b.lessons_per_week - a.lessons_per_week);
  const fallbackAdditions = [...preferredFallbacks, ...remainingFallbacks]
    .slice(0, minimumCount - courses.length);

  return [...courses, ...fallbackAdditions];
}

function localeTag(locale: ContentLocale) {
  return locale === 'de' ? 'de-DE' : 'en-GB';
}

function formatDateLabel(value: string | Date, locale: ContentLocale) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateRangeLabel(start: string, end: string, locale: ContentLocale) {
  const startLabel = formatDateLabel(start, locale);
  const endLabel = formatDateLabel(end, locale);
  return `${startLabel} - ${endLabel}`;
}

function formatDateTimeLabel(startsAt: string, endsAt: string, locale: ContentLocale) {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  const dateLabel = formatDateLabel(starts, locale);
  const timeFormatter = new Intl.DateTimeFormat(localeTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateLabel}, ${timeFormatter.format(starts)} - ${timeFormatter.format(ends)}`;
}

function normalizeScheduleDays(days: string[]) {
  return days
    .map((day) => day.trim())
    .filter(Boolean)
    .join(', ');
}

function formatScheduleLabel(schedule: unknown, locale: ContentLocale) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return locale === 'de' ? 'Zeitplan wird bestätigt' : 'Schedule to be confirmed';
  }

  const rawDays = (schedule as { days?: unknown }).days;
  const rawTime = (schedule as { time?: unknown }).time;
  const days = Array.isArray(rawDays) ? rawDays.filter((item): item is string => typeof item === 'string') : [];
  const time = typeof rawTime === 'string' ? rawTime : '';

  const daysLabel = days.length > 0 ? normalizeScheduleDays(days) : locale === 'de' ? 'Tage tbd' : 'Days tbd';
  if (!time) {
    return daysLabel;
  }

  return `${daysLabel} • ${time}`;
}

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function estimateSeatsLeft(capacity: number, seed: string) {
  if (capacity <= 0) {
    return 0;
  }

  const ratio = stableHash(seed) % 100;
  if (ratio > 92) {
    return 0;
  }
  if (ratio > 68) {
    return Math.max(1, Math.round(capacity * 0.2));
  }

  return Math.max(2, Math.round(capacity * 0.55));
}

function getAvailabilityState(seatsLeft: number) {
  if (seatsLeft <= 0) {
    return 'full' as const;
  }
  if (seatsLeft <= 3) {
    return 'limited' as const;
  }
  return 'open' as const;
}

function availabilityLabel(state: 'open' | 'limited' | 'full', locale: ContentLocale) {
  if (locale === 'de') {
    if (state === 'full') {
      return 'Warteliste';
    }
    if (state === 'limited') {
      return 'Nur wenige Plätze';
    }
    return 'Plätze frei';
  }

  if (state === 'full') {
    return 'Waitlist';
  }
  if (state === 'limited') {
    return 'Limited seats';
  }
  return 'Open seats';
}

function courseDeadlineStatus(startDate: string) {
  const now = new Date();
  const startsAt = toDateOnly(startDate);
  const days = daysBetween(now, startsAt);

  if (days < 0) {
    return 'closed' as const;
  }
  if (days <= 10) {
    return 'closing-soon' as const;
  }
  return 'open' as const;
}

function examDeadlineStatus(deadline: string | null) {
  if (!deadline) {
    return 'not-applicable' as const;
  }

  const now = new Date();
  const dueDate = toDateOnly(deadline);
  const days = daysBetween(now, dueDate);

  if (days < 0) {
    return 'closed' as const;
  }
  if (days <= 7) {
    return 'closing-soon' as const;
  }
  return 'open' as const;
}

function deadlineLabel(status: 'open' | 'closing-soon' | 'closed' | 'not-applicable', locale: ContentLocale) {
  if (locale === 'de') {
    if (status === 'closed') {
      return 'Frist abgelaufen';
    }
    if (status === 'closing-soon') {
      return 'Frist endet bald';
    }
    if (status === 'open') {
      return 'Anmeldung offen';
    }
    return 'Frist wird veröffentlicht';
  }

  if (status === 'closed') {
    return 'Deadline passed';
  }
  if (status === 'closing-soon') {
    return 'Deadline soon';
  }
  if (status === 'open') {
    return 'Registration open';
  }
  return 'Deadline to be published';
}

/**
 * Returns the ordered slice of CASA_LEVEL_SEQUENCE between levelMin and levelMax
 * (inclusive, case-insensitive prefix match). Returns an empty array if either
 * bound is null, meaning the course type has no fixed level range.
 */
function getAvailableLevels(levelMin: string | null, levelMax: string | null): string[] {
  if (!levelMin && !levelMax) return [];

  const normalize = (raw: string) => raw.trim().toUpperCase();
  const minNorm = levelMin ? normalize(levelMin) : null;
  const maxNorm = levelMax ? normalize(levelMax) : null;

  // Find the first index where the level starts with the min prefix
  const startIndex = minNorm
    ? CASA_LEVEL_SEQUENCE.findIndex((l) => l.toUpperCase().startsWith(minNorm))
    : 0;
  // Find the last index where the level starts with the max prefix
  const endIndex = maxNorm
    ? [...CASA_LEVEL_SEQUENCE].reverse().findIndex((l) => l.toUpperCase().startsWith(maxNorm))
    : -1;
  const resolvedEnd = endIndex === -1 ? CASA_LEVEL_SEQUENCE.length - 1 : CASA_LEVEL_SEQUENCE.length - 1 - endIndex;

  if (startIndex === -1) return [];
  return Array.from(CASA_LEVEL_SEQUENCE).slice(startIndex, resolvedEnd + 1);
}

function buildCourseRegistrationOption(
  instance: CourseInstanceRow,
  courseType: CourseTypeRow,
  locale: ContentLocale
): CourseRegistrationOption {
  const seatsLeft = estimateSeatsLeft(instance.capacity, `${courseType.id}-${instance.id}`);
  const availabilityState = getAvailabilityState(seatsLeft);
  const status = courseDeadlineStatus(instance.start_date);

  return {
    id: instance.id,
    courseTypeId: courseType.id,
    dateRangeLabel: formatDateRangeLabel(instance.start_date, instance.end_date, locale),
    startDate: instance.start_date,
    endDate: instance.end_date,
    scheduleLabel: formatScheduleLabel(instance.schedule, locale),
    locationLabel: instance.location || (locale === 'de' ? 'CASA Bremen Campus' : 'CASA Bremen Campus'),
    fee: courseType.default_price,
    currency: courseType.currency,
    capacity: instance.capacity,
    seatsLeft,
    availabilityState,
    availabilityLabel: availabilityLabel(availabilityState, locale),
    deadlineStatus: status,
    deadlineLabel: deadlineLabel(status, locale),
    status: instance.status,
    levelMin: courseType.level_min,
    levelMax: courseType.level_max,
    availableLevels: getAvailableLevels(courseType.level_min, courseType.level_max),
  };
}

function buildExamRegistrationOption(
  session: ExamSessionRow,
  examType: ExamTypeRow,
  locale: ContentLocale
): ExamRegistrationOption {
  const seatsLeft = estimateSeatsLeft(session.capacity, `${examType.id}-${session.id}`);
  const availabilityState = getAvailabilityState(seatsLeft);
  const status = examDeadlineStatus(session.registration_deadline);

  return {
    id: session.id,
    examTypeId: examType.id,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    startsAtLabel: formatDateTimeLabel(session.starts_at, session.ends_at, locale),
    registrationDeadline: session.registration_deadline,
    registrationDeadlineLabel: session.registration_deadline ? formatDateLabel(session.registration_deadline, locale) : '',
    fee: session.fee_override ?? examType.default_fee,
    currency: examType.currency,
    capacity: session.capacity,
    seatsLeft,
    availabilityState,
    availabilityLabel: availabilityLabel(availabilityState, locale),
    deadlineStatus: status,
    deadlineLabel: deadlineLabel(status, locale),
    locationLabel: locale === 'de' ? 'CASA Bremen Prüfungszentrum' : 'CASA Bremen Exam Center',
    status: session.status,
  };
}

function getDatabaseClient() {
  return getDb();
}

type DatabaseClient = NonNullable<ReturnType<typeof getDb>>;

async function queryRows<T>(db: DatabaseClient, query: string, params: unknown[] = []) {
  return (await db.query(query, params)) as T[];
}

async function queryFirst<T>(db: DatabaseClient, query: string, params: unknown[] = []) {
  const [row] = await queryRows<T>(db, query, params);
  return row;
}

export function getPageHero(pageKey: HeroPageKey, locale: ContentLocale): HeroSpec {
  const localized = heroSpecsByLocale[locale] ?? heroSpecsByLocale.en;
  const fallback = heroSpecsByLocale.en;
  return localized[pageKey] ?? fallback[pageKey];
}

export function getProofMetrics(locale: ContentLocale): ProofMetric[] {
  return proofMetricsByLocale[locale] ?? proofMetricsByLocale.en;
}

export function getSocialProof(locale: ContentLocale): SocialProofItem[] {
  return socialProofByLocale[locale] ?? socialProofByLocale.en;
}

export function getCourseNarrative(slug: string, locale: ContentLocale): CourseNarrative | null {
  const localized = courseNarrativesByLocale[locale] ?? courseNarrativesByLocale.en;
  return localized.find((entry) => entry.slug === slug) ?? courseNarrativesByLocale.en.find((entry) => entry.slug === slug) ?? null;
}

export function getExamNarrative(code: string, locale: ContentLocale): ExamNarrative | null {
  const localized = examNarrativesByLocale[locale] ?? examNarrativesByLocale.en;
  return localized.find((entry) => entry.code === code) ?? examNarrativesByLocale.en.find((entry) => entry.code === code) ?? null;
}

export function getAccommodationNarratives(locale: ContentLocale): AccommodationNarrative[] {
  return accommodationNarrativesByLocale[locale] ?? accommodationNarrativesByLocale.en;
}

export function getPlacementNarrative(locale: ContentLocale): PlacementNarrative {
  return placementNarrativesByLocale[locale] ?? placementNarrativesByLocale.en;
}

export function getCulturalPrograms(locale: ContentLocale): CulturalProgramItem[] {
  return culturalProgramsByLocale[locale] ?? culturalProgramsByLocale.en;
}

export function getTeamSpotlights(locale: ContentLocale): TeamSpotlight[] {
  return teamSpotlightsByLocale[locale] ?? teamSpotlightsByLocale.en;
}

export async function getCourses(locale: ContentLocale): Promise<CourseWithNarrative[]> {
  const db = getDatabaseClient();
  let courses: CourseTypeRow[] = [];

  if (db) {
    try {
      const rows = await queryRows<CourseTypeRow>(
        db,
        `
          SELECT
            id,
            slug,
            name,
            format,
            level_min,
            level_max,
            lessons_per_week,
            default_price,
            pricing_mode,
            visa_eligible,
            currency,
            is_active,
            created_at,
            updated_at
          FROM course_types
          WHERE is_active = true
          ORDER BY lessons_per_week DESC
        `
      );

      if (rows.length > 0) {
        courses = rows;
      }
    } catch {
      courses = [];
    }
  }

  if (courses.length === 0) {
    courses = [...fallbackCourseTypes].sort((a, b) => b.lessons_per_week - a.lessons_per_week);
  } else {
    courses = fillSparseCourseTypes(courses);
  }

  courses = filterPublicCourseTypes(courses);
  if (courses.length === 0) {
    courses = filterPublicCourseTypes([...fallbackCourseTypes].sort((a, b) => b.lessons_per_week - a.lessons_per_week));
  }

  courses = applyPublicCourseDisplayNames(courses, locale);

  return attachCourseNarratives(courses, locale);
}

/**
 * Student-visa eligibility is a regulated claim, so it is never inferred.
 *
 * This previously guessed from `format` strings, a `lessons_per_week >= 15`
 * threshold, and schedule tags. That threshold sat below CASA's own published
 * guidance — the assistant knowledge base states a minimum of 20 lessons per
 * week — so the heuristic could tell a visitor a course qualified when it did
 * not, and any edit to a course's weekly hours silently changed the claim.
 *
 * `null` means "no staff confirmation on file" and must be surfaced as an
 * invitation to ask, never as a Yes or a No.
 */
function resolveVisaEligibility(course: CourseTypeRow): boolean | null {
  return course.visa_eligible ?? null;
}

function scheduleTagsFromOptions(options: CourseRegistrationOption[]) {
  const tags = new Set<string>();

  for (const option of options) {
    const label = option.scheduleLabel.toLowerCase();
    if (label.includes('mon') || label.includes('tue') || label.includes('wed') || label.includes('thu') || label.includes('fri')) {
      tags.add('weekdays');
    }
    if (label.includes('18:') || label.includes('19:') || label.includes('evening')) {
      tags.add('evening');
    }
    if (label.includes('09:') || label.includes('10:') || label.includes('morning')) {
      tags.add('morning');
    }
    if (label.includes('hybrid')) {
      tags.add('hybrid');
    }
  }

  return tags.size > 0 ? Array.from(tags) : ['scheduled'];
}

export async function getCourseFinderData(locale: ContentLocale): Promise<CourseFinderData> {
  const [courses, catalog] = await Promise.all([
    getCourses(locale),
    getCourseRegistrationCatalog(locale),
  ]);

  const nextStartByCourseId: Record<string, string | null> = {};
  const scheduleTagsByCourseId: Record<string, string[]> = {};
  const visaEligibleByCourseId: Record<string, boolean | null> = {};

  for (const course of courses) {
    const options = catalog.optionsByCourseTypeId[course.id] ?? [];
    nextStartByCourseId[course.id] = options[0]?.startDate ?? null;
    const scheduleTags = scheduleTagsFromOptions(options);
    scheduleTagsByCourseId[course.id] = scheduleTags;
    visaEligibleByCourseId[course.id] = resolveVisaEligibility(course);
  }

  return {
    courses,
    nextStartByCourseId,
    scheduleTagsByCourseId,
    visaEligibleByCourseId,
  };
}

export async function getCourseDetail(slug: string, locale: ContentLocale): Promise<CourseDetailModel | null> {
  const contentSlug = getCourseContentSlug(slug);

  if (hiddenPublicCourseSlugs.has(contentSlug)) {
    return null;
  }

  const db = getDatabaseClient();
  let course: CourseTypeRow | null = null;
  let instances: CourseInstanceRow[] = [];

  if (db) {
    try {
      const row = await queryFirst<CourseTypeRow>(
        db,
        `
          SELECT
            id,
            slug,
            name,
            format,
            level_min,
            level_max,
            lessons_per_week,
            default_price,
            pricing_mode,
            visa_eligible,
            currency,
            is_active,
            created_at,
            updated_at
          FROM course_types
          WHERE slug = $1
            AND is_active = true
          LIMIT 1
        `,
        [contentSlug]
      );

      if (row) {
        course = row;

        const instanceRows = await queryRows<CourseInstanceRow>(
          db,
          `
            SELECT
              id,
              course_type_id,
              start_date,
              end_date,
              capacity,
              schedule,
              location,
              status,
              created_at,
              updated_at
            FROM course_instances
            WHERE course_type_id = $1
              AND start_date >= CURRENT_DATE
            ORDER BY start_date ASC
          `,
          [row.id]
        );

        if (instanceRows.length > 0) {
          instances = instanceRows;
        }
      }
    } catch {
      course = null;
      instances = [];
    }
  }

  if (!course) {
    course = fallbackCourseTypes.find((item) => item.slug === contentSlug) ?? null;
  }

  if (!course) {
    return null;
  }

  course = applyPublicCourseDisplayName(course, locale);

  if (instances.length === 0) {
    instances = fallbackCourseInstances
      .filter((item) => item.course_type_id === course.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  const narrative = getCourseNarrative(contentSlug, locale);

  return {
    course: {
      ...course,
      narrative,
    },
    instances,
  };
}

export async function getCourseRegistrationCatalog(
  locale: ContentLocale,
  defaultInstanceId?: string
): Promise<RegistrationCourseCatalog> {
  const db = getDatabaseClient();
  let courseTypes: CourseTypeRow[] = [];
  let instances: CourseInstanceRow[] = [];
  let selectedOptionId = defaultInstanceId;
  let selectedCourseTypeId: string | undefined;

  if (db) {
    try {
      const courseRows = await queryRows<CourseTypeRow>(
        db,
        `
          SELECT
            id,
            slug,
            name,
            format,
            level_min,
            level_max,
            lessons_per_week,
            default_price,
            pricing_mode,
            visa_eligible,
            currency,
            is_active,
            created_at,
            updated_at
          FROM course_types
          WHERE is_active = true
          ORDER BY lessons_per_week DESC
        `
      );

      if (courseRows.length > 0) {
        courseTypes = courseRows;
      }

      if (courseTypes.length > 0) {
        const typeIds = courseTypes.map((courseType) => courseType.id);
        const instanceRows = await queryRows<CourseInstanceRow>(
          db,
          `
            SELECT
              id,
              course_type_id,
              start_date,
              end_date,
              capacity,
              schedule,
              location,
              status,
              created_at,
              updated_at
            FROM course_instances
            WHERE course_type_id = ANY($1::uuid[])
              AND start_date >= CURRENT_DATE
              AND status = 'scheduled'
            ORDER BY start_date ASC
          `,
          [typeIds]
        );

        if (instanceRows.length > 0) {
          instances = instanceRows;
        }
      }

      if (defaultInstanceId) {
        const instance = await queryFirst<{ id: string; course_type_id: string }>(
          db,
          `
            SELECT id, course_type_id
            FROM course_instances
            WHERE id = $1::uuid
            LIMIT 1
          `,
          [defaultInstanceId]
        );

        if (instance) {
          selectedCourseTypeId = instance.course_type_id;
          selectedOptionId = instance.id;
        }
      }
    } catch {
      courseTypes = [];
      instances = [];
      selectedCourseTypeId = undefined;
      selectedOptionId = undefined;
    }
  }

  if (courseTypes.length === 0) {
    courseTypes = [...fallbackCourseTypes].sort((a, b) => b.lessons_per_week - a.lessons_per_week);
  }

  courseTypes = filterPublicCourseTypes(courseTypes);
  if (courseTypes.length === 0) {
    courseTypes = filterPublicCourseTypes([...fallbackCourseTypes].sort((a, b) => b.lessons_per_week - a.lessons_per_week));
  }

  courseTypes = applyPublicCourseDisplayNames(courseTypes, locale);

  if (selectedCourseTypeId && !courseTypes.some((courseType) => courseType.id === selectedCourseTypeId)) {
    selectedCourseTypeId = undefined;
    selectedOptionId = undefined;
  }

  if (instances.length === 0) {
    instances = [...fallbackCourseInstances]
      .filter((item) => item.status === 'scheduled')
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  const publicCourseTypeIds = new Set(courseTypes.map((courseType) => courseType.id));
  instances = instances.filter((instance) => publicCourseTypeIds.has(instance.course_type_id));

  if (instances.length === 0) {
    const fallbackPublicCourseTypes = filterPublicCourseTypes([...fallbackCourseTypes].sort((a, b) => b.lessons_per_week - a.lessons_per_week));
    const fallbackPublicCourseTypeIds = new Set(fallbackPublicCourseTypes.map((courseType) => courseType.id));
    const fallbackPublicInstances = [...fallbackCourseInstances]
      .filter((item) => item.status === 'scheduled' && fallbackPublicCourseTypeIds.has(item.course_type_id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    if (fallbackPublicCourseTypes.length > 0 && fallbackPublicInstances.length > 0) {
      courseTypes = applyPublicCourseDisplayNames(fallbackPublicCourseTypes, locale);
      instances = fallbackPublicInstances;
      selectedCourseTypeId = undefined;
      selectedOptionId = undefined;
    }
  }

  if (defaultInstanceId && !selectedCourseTypeId) {
    const instance = instances.find((item) => item.id === defaultInstanceId);
    if (instance) {
      selectedCourseTypeId = instance.course_type_id;
      selectedOptionId = instance.id;
    }
  }

  const optionsByCourseTypeId: Record<string, CourseRegistrationOption[]> = {};
  courseTypes.forEach((courseType) => {
    const options = instances
      .filter((instance) => instance.course_type_id === courseType.id)
      .map((instance) => buildCourseRegistrationOption(instance, courseType, locale))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    optionsByCourseTypeId[courseType.id] = options;
  });

  const fallbackCourseTypeId =
    courseTypes.find((courseType) => (optionsByCourseTypeId[courseType.id] ?? []).length > 0)?.id ??
    courseTypes[0]?.id;

  const resolvedCourseTypeId = selectedCourseTypeId ?? fallbackCourseTypeId;
  const resolvedOptionId =
    selectedOptionId && Object.values(optionsByCourseTypeId).flat().some((option) => option.id === selectedOptionId)
      ? selectedOptionId
      : resolvedCourseTypeId
        ? optionsByCourseTypeId[resolvedCourseTypeId]?.[0]?.id
        : undefined;

  return {
    locale,
    courseTypes,
    optionsByCourseTypeId,
    defaultCourseTypeId: resolvedCourseTypeId,
    defaultOptionId: resolvedOptionId,
  };
}

export async function getExamRegistrationCatalog(
  locale: ContentLocale,
  defaultSessionId?: string
): Promise<RegistrationExamCatalog> {
  const db = getDatabaseClient();
  let examTypes: ExamTypeRow[] = [];
  let sessions: ExamSessionRow[] = [];
  let selectedOptionId = defaultSessionId;
  let selectedExamTypeId: string | undefined;

  if (db) {
    try {
      const [examTypeRows, sessionRows] = await Promise.all([
        queryRows<ExamTypeRow>(
          db,
          `
            SELECT
              id,
              code,
              name,
              level,
              default_fee,
              currency,
              is_active
            FROM exam_types
            WHERE is_active = true
            ORDER BY name ASC
          `
        ),
        queryRows<ExamSessionRow>(
          db,
          `
            SELECT
              id,
              exam_type_id,
              starts_at,
              ends_at,
              registration_deadline,
              capacity,
              fee_override,
              status,
              created_at,
              updated_at
            FROM exam_sessions
            WHERE starts_at >= timezone('utc', now())
              AND status = 'scheduled'
            ORDER BY starts_at ASC
          `
        ),
      ]);

      if (examTypeRows.length > 0) {
        examTypes = examTypeRows;
      }

      if (sessionRows.length > 0) {
        sessions = sessionRows;
      }

      if (defaultSessionId) {
        const matchedSession = sessionRows.find((session) => session.id === defaultSessionId);

        if (matchedSession) {
          selectedExamTypeId = matchedSession.exam_type_id;
          selectedOptionId = matchedSession.id;
        } else {
          const selectedSession = await queryFirst<{ id: string; exam_type_id: string }>(
            db,
            `
              SELECT id, exam_type_id
              FROM exam_sessions
              WHERE id = $1::uuid
              LIMIT 1
            `,
            [defaultSessionId]
          );

          if (selectedSession) {
            selectedExamTypeId = selectedSession.exam_type_id;
            selectedOptionId = selectedSession.id;
          }
        }
      }
    } catch {
      examTypes = [];
      sessions = [];
      selectedOptionId = undefined;
      selectedExamTypeId = undefined;
    }
  }

  if (examTypes.length === 0) {
    examTypes = [...fallbackExamTypes].sort((a, b) => a.name.localeCompare(b.name));
  }

  examTypes = filterPublicExamTypes(examTypes);
  if (examTypes.length === 0) {
    examTypes = filterPublicExamTypes([...fallbackExamTypes].sort((a, b) => a.name.localeCompare(b.name)));
  }

  if (sessions.length === 0) {
    sessions = [...fallbackExamSessions]
      .filter((session) => session.status === 'scheduled')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  sessions = filterSessionsByType(sessions, examTypes);

  if (sessions.length === 0) {
    const fallbackPublicExamTypes = filterPublicExamTypes([...fallbackExamTypes].sort((a, b) => a.name.localeCompare(b.name)));
    const fallbackPublicSessions = filterSessionsByType(
      [...fallbackExamSessions]
        .filter((session) => session.status === 'scheduled')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      fallbackPublicExamTypes
    );

    if (fallbackPublicExamTypes.length > 0 && fallbackPublicSessions.length > 0) {
      examTypes = fallbackPublicExamTypes;
      sessions = fallbackPublicSessions;
      selectedExamTypeId = undefined;
      selectedOptionId = undefined;
    }
  }

  if (selectedExamTypeId && !examTypes.some((examType) => examType.id === selectedExamTypeId)) {
    selectedExamTypeId = undefined;
    selectedOptionId = undefined;
  }

  if (defaultSessionId && !selectedExamTypeId) {
    const matchedSession = sessions.find((session) => session.id === defaultSessionId);
    if (matchedSession) {
      selectedExamTypeId = matchedSession.exam_type_id;
      selectedOptionId = matchedSession.id;
    }
  }

  const optionsByExamTypeId: Record<string, ExamRegistrationOption[]> = {};
  examTypes.forEach((examType) => {
    const options = sessions
      .filter((session) => session.exam_type_id === examType.id)
      .map((session) => buildExamRegistrationOption(session, examType, locale))
      .filter((option) => option.deadlineStatus !== 'closed')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    optionsByExamTypeId[examType.id] = options;
  });

  const fallbackExamTypeId =
    examTypes.find((examType) => (optionsByExamTypeId[examType.id] ?? []).length > 0)?.id ??
    examTypes[0]?.id;
  const resolvedExamTypeId = selectedExamTypeId ?? fallbackExamTypeId;
  const resolvedOptionId =
    selectedOptionId && Object.values(optionsByExamTypeId).flat().some((option) => option.id === selectedOptionId)
      ? selectedOptionId
      : resolvedExamTypeId
        ? optionsByExamTypeId[resolvedExamTypeId]?.[0]?.id
        : undefined;

  return {
    locale,
    examTypes,
    optionsByExamTypeId,
    defaultExamTypeId: resolvedExamTypeId,
    defaultOptionId: resolvedOptionId,
  };
}

// Backward-compatible helpers used by existing route logic.
export async function getCourseRegistrationData(
  defaultInstanceId?: string
): Promise<{ courseTypes: CourseTypeRow[]; defaultCourseTypeId?: string; defaultInstanceId?: string }> {
  const catalog = await getCourseRegistrationCatalog('en', defaultInstanceId);
  return {
    courseTypes: catalog.courseTypes,
    defaultCourseTypeId: catalog.defaultCourseTypeId,
    defaultInstanceId: catalog.defaultOptionId,
  };
}

export async function getExamRegistrationData(): Promise<ExamTypeRow[]> {
  const catalog = await getExamRegistrationCatalog('en');
  return catalog.examTypes;
}

export async function getExamCatalog(locale: ContentLocale): Promise<ExamCatalogModel> {
  const db = getDatabaseClient();
  let examTypes: ExamTypeRow[] = [];
  let sessions: ExamSessionRow[] = [];

  if (db) {
    try {
      const [typeRows, sessionRows] = await Promise.all([
        queryRows<ExamTypeRow>(
          db,
          `
            SELECT
              id,
              code,
              name,
              level,
              default_fee,
              currency,
              is_active
            FROM exam_types
            WHERE is_active = true
            ORDER BY name ASC
          `
        ),
        queryRows<ExamSessionRow>(
          db,
          `
            SELECT
              id,
              exam_type_id,
              starts_at,
              ends_at,
              registration_deadline,
              capacity,
              fee_override,
              status,
              created_at,
              updated_at
            FROM exam_sessions
            WHERE starts_at >= timezone('utc', now())
            ORDER BY starts_at ASC
          `
        ),
      ]);

      if (typeRows.length > 0) {
        examTypes = typeRows;
      }

      if (sessionRows.length > 0) {
        sessions = sessionRows;
      }
    } catch {
      examTypes = [];
      sessions = [];
    }
  }

  if (examTypes.length === 0) {
    examTypes = [...fallbackExamTypes];
  }

  examTypes = filterPublicExamTypes(examTypes);
  if (examTypes.length === 0) {
    examTypes = filterPublicExamTypes([...fallbackExamTypes]);
  }

  if (sessions.length === 0) {
    sessions = [...fallbackExamSessions];
  }

  sessions = filterSessionsByType(sessions, examTypes);

  const sessionsByType = sessions.reduce<Record<string, ExamSessionRow[]>>((acc, session) => {
    const bucket = acc[session.exam_type_id] ?? [];
    bucket.push(session);
    acc[session.exam_type_id] = bucket;
    return acc;
  }, {});

  const items: ExamCatalogItem[] = examTypes.map((examType) => ({
    examType,
    sessions: (sessionsByType[examType.id] ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    narrative: getExamNarrative(examType.code, locale),
    anchorId: examAnchorId({ code: examType.code, name: examType.name }),
  }));

  return { items };
}

function normalizeExamCode(code: string) {
  const value = code.trim().toLowerCase();
  if (value === 'b2') {
    return 'telc_b2';
  }
  if (value === 'c1') {
    return 'telc_c1_hochschule';
  }
  return value;
}

export async function getExamDetail(code: string, locale: ContentLocale): Promise<ExamCatalogItem | null> {
  const normalizedCode = normalizeExamCode(code);
  const catalog = await getExamCatalog(locale);

  return (
    catalog.items.find((item) => item.examType.code.toLowerCase() === normalizedCode) ??
    catalog.items.find((item) => item.anchorId.toLowerCase() === code.trim().toLowerCase()) ??
    null
  );
}

export async function getAccommodationDetail(
  type: AccommodationTypeKey,
  locale: ContentLocale
): Promise<AccommodationNarrative | null> {
  const narratives = getAccommodationNarratives(locale);
  return narratives.find((item) => item.id === type) ?? null;
}

export async function getFaq(locale: ContentLocale): Promise<FaqViewItem[]> {
  const db = getDatabaseClient();
  let faqItems: FaqViewItem[] = [];

  if (db) {
    try {
      const rows = await queryRows<{
        id: string;
        locale: string;
        category: string | null;
        question: string;
        answer: string;
        display_order: number;
      }>(
        db,
        `
          SELECT
            id,
            locale,
            category,
            question,
            answer,
            display_order
          FROM faq_items
          WHERE is_published = true
            AND locale ILIKE $1
          ORDER BY display_order ASC, created_at ASC
        `,
        [`${locale}%`]
      );

      if (rows.length > 0) {
        faqItems = rows.map((item) => ({
          id: item.id,
          locale,
          category: normalizeCategory(item.category),
          question: item.question,
          answer: item.answer,
        }));
      }
    } catch {
      faqItems = [];
    }
  }

  if (faqItems.length === 0) {
    faqItems = fallbackFaqByLocale[locale] ?? fallbackFaqByLocale.en;
  }

  return faqItems;
}

function inferNewsCategory(item: NewsViewItem) {
  return item.category?.trim() ? item.category : 'News';
}

function summarize(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= 160) {
    return compact;
  }

  return `${compact.slice(0, 157)}...`;
}

function normalizeNewsRows(
  rows: Array<{
    slug: string;
    locale: string;
    title: string;
    summary: string | null;
    body: string;
    content_json?: unknown;
    content_html?: string | null;
    published_at: string | null;
  }>,
  locale: ContentLocale,
): NewsViewItem[] {
  return rows.map((item) => ({
    slug: item.slug,
    locale,
    title: item.title,
    summary: item.summary?.trim() || summarize(item.body),
    body: item.body,
    contentJson: item.content_json,
    contentHtml: item.content_html ?? null,
    publishedAt: item.published_at || new Date().toISOString(),
    category: 'News',
    author: 'CASA Team',
  }));
}

type CareerPositionRow = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  team: string | null;
  location: string | null;
  employment_type: string | null;
  work_mode: string | null;
  short_description: string | null;
  description: string | null;
  requirements: string | null;
  apply_url: string | null;
  apply_email: string | null;
  is_published: boolean;
  is_featured: boolean;
  posted_at: string | null;
  closes_at: string | null;
  created_at: string | null;
};

function toContentLocale(input: string): ContentLocale {
  return input.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function normalizeCareerRow(item: CareerPositionRow): CareerPositionViewItem {
  return {
    id: item.id,
    slug: item.slug,
    locale: toContentLocale(item.locale),
    title: item.title,
    team: item.team,
    location: item.location || 'Bremen',
    employmentType: item.employment_type || 'Full-time',
    workMode: item.work_mode || 'On-site',
    shortDescription: item.short_description || '',
    description: item.description,
    requirements: item.requirements,
    applyUrl: item.apply_url,
    applyEmail: item.apply_email,
    isFeatured: item.is_featured,
    closesAt: item.closes_at,
    postedAt: item.posted_at || item.created_at || new Date().toISOString(),
  };
}

function normalizeCareerRows(rows: CareerPositionRow[], locale: ContentLocale): CareerPositionViewItem[] {
  const mapped = rows
    .filter((item) => item.is_published !== false)
    .map((item) => normalizeCareerRow(item));

  const localized = mapped.filter((item) => item.locale === locale);
  const selected = localized.length > 0 ? localized : mapped.filter((item) => item.locale === 'en');

  return selected.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    return b.postedAt.localeCompare(a.postedAt);
  });
}

export async function getCareerPositions(locale: ContentLocale): Promise<CareerPositionViewItem[]> {
  const db = getDatabaseClient();

  if (db) {
    try {
      const rows = await queryRows<CareerPositionRow>(
        db,
        `
          SELECT
            id,
            slug,
            locale,
            title,
            team,
            location,
            employment_type,
            work_mode,
            short_description,
            description,
            requirements,
            apply_url,
            apply_email,
            is_published,
            is_featured,
            posted_at,
            closes_at,
            created_at
          FROM career_positions
          WHERE is_published = true
          ORDER BY is_featured DESC, posted_at DESC, created_at DESC
        `
      );

      if (rows.length > 0) {
        return normalizeCareerRows(rows, locale);
      }
    } catch {
      // fallback to mock data in local/demo mode
    }
  }

  const mockRows = listMockRows('career_positions', 'posted_at') as CareerPositionRow[];
  return normalizeCareerRows(mockRows, locale);
}

export async function getCareerPositionBySlug(
  slug: string,
  locale: ContentLocale
): Promise<CareerPositionViewItem | null> {
  const db = getDatabaseClient();

  if (db) {
    const localeOrder: ContentLocale[] = locale === 'de' ? ['de', 'en'] : ['en', 'de'];

    for (const candidateLocale of localeOrder) {
      try {
        const row = await queryFirst<CareerPositionRow>(
          db,
          `
            SELECT
              id,
              slug,
              locale,
              title,
              team,
              location,
              employment_type,
              work_mode,
              short_description,
              description,
              requirements,
              apply_url,
              apply_email,
              is_published,
              is_featured,
              posted_at,
              closes_at,
              created_at
            FROM career_positions
            WHERE is_published = true
              AND slug = $1
              AND locale ILIKE $2
            LIMIT 1
          `,
          [slug, `${candidateLocale}%`]
        );

        if (row) {
          return normalizeCareerRow(row);
        }
      } catch {
        // fallback to mock rows below
      }
    }
  }

  const rows = listMockRows('career_positions', 'posted_at') as CareerPositionRow[];
  const normalized = rows.filter((item) => item.is_published !== false).map((item) => normalizeCareerRow(item));

  return (
    normalized.find((item) => item.slug === slug && item.locale === locale) ??
    normalized.find((item) => item.slug === slug) ??
    null
  );
}

export async function getNewsList(locale: ContentLocale): Promise<NewsViewItem[]> {
  const db = getDatabaseClient();
  let posts: NewsViewItem[] = [];

  if (db) {
    try {
      const rows = await queryRows<{
        slug: string;
        locale: string;
        title: string;
        summary: string | null;
        body: string;
        content_json?: unknown;
        content_html?: string | null;
        published_at: string | null;
      }>(
        db,
        `
          SELECT
            slug,
            locale,
            title,
            summary,
            body,
            content_json,
            content_html,
            published_at
          FROM news_posts
          WHERE status = 'published'::news_status
            AND published_at IS NOT NULL
            AND published_at <= timezone('utc', now())
            AND locale ILIKE $1
          ORDER BY published_at DESC
          LIMIT 24
        `,
        [`${locale}%`]
      );

      if (rows.length > 0) {
        posts = normalizeNewsRows(rows, locale);
      }
    } catch {
      posts = [];
    }
  }

  if (posts.length === 0) {
    posts = fallbackNewsByLocale[locale] ?? fallbackNewsByLocale.en;
  }

  return [...posts]
    .map((item) => ({ ...item, category: inferNewsCategory(item) }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNewsPost(slug: string, locale: ContentLocale): Promise<NewsViewItem | null> {
  const db = getDatabaseClient();

  if (db) {
    try {
      const localeOrder: ContentLocale[] = locale === 'de' ? ['de', 'en'] : ['en', 'de'];
      let data:
        | {
            slug: string;
            locale: string;
            title: string;
            summary: string | null;
            body: string;
            content_json?: unknown;
            content_html?: string | null;
            published_at: string | null;
          }
        | null = null;

      for (const candidateLocale of localeOrder) {
        const candidate = await queryFirst<{
          slug: string;
          locale: string;
          title: string;
          summary: string | null;
          body: string;
          content_json?: unknown;
          content_html?: string | null;
          published_at: string | null;
        }>(
          db,
          `
            SELECT
              slug,
              locale,
              title,
              summary,
              body,
              content_json,
              content_html,
              published_at
            FROM news_posts
            WHERE status = 'published'::news_status
              AND published_at IS NOT NULL
              AND published_at <= timezone('utc', now())
              AND slug = $1
              AND locale ILIKE $2
            LIMIT 1
          `,
          [slug, `${candidateLocale}%`]
        );

        if (candidate) {
          data = candidate;
          break;
        }
      }

      if (data) {
        return {
          slug: data.slug,
          locale: toContentLocale(data.locale),
          title: data.title,
          summary: data.summary?.trim() || summarize(data.body),
          body: data.body,
          contentJson: data.content_json,
          contentHtml: data.content_html ?? null,
          publishedAt: data.published_at || new Date().toISOString(),
          category: 'News',
          author: 'CASA Team',
        };
      }
    } catch {
      // no-op, fallback below
    }
  }

  const localized = fallbackNewsByLocale[locale] ?? fallbackNewsByLocale.en;
  const fallback = fallbackNewsByLocale.en;

  return (
    localized.find((item) => item.slug === slug) ??
    fallback.find((item) => item.slug === slug) ??
    null
  );
}

export function getRelatedNews(slug: string, locale: ContentLocale, limit = 2): NewsViewItem[] {
  const localized = fallbackNewsByLocale[locale] ?? fallbackNewsByLocale.en;
  return localized.filter((item) => item.slug !== slug).slice(0, limit);
}

export function getLocalizedFallbackNews(locale: ContentLocale): NewsViewItem[] {
  return fallbackNewsByLocale[locale] ?? fallbackNewsByLocale.en;
}

export function getLocalizedFallbackFaq(locale: ContentLocale): FaqViewItem[] {
  return fallbackFaqByLocale[locale] ?? fallbackFaqByLocale.en;
}

export function getLocalizedCourseCatalog(locale: ContentLocale): CourseWithNarrative[] {
  return attachCourseNarratives(
    applyPublicCourseDisplayNames(filterPublicCourseTypes(fallbackCourseTypes), locale),
    locale
  );
}

export function getLocalizedExamCatalog(locale: ContentLocale): ExamCatalogModel {
  const examTypes = filterPublicExamTypes(fallbackExamTypes);
  const sessionsByType = filterSessionsByType(fallbackExamSessions, examTypes).reduce<Record<string, ExamSessionRow[]>>((acc, session) => {
    const bucket = acc[session.exam_type_id] ?? [];
    bucket.push(session);
    acc[session.exam_type_id] = bucket;
    return acc;
  }, {});

  return {
    items: examTypes.map((examType) => ({
      examType,
      sessions: sessionsByType[examType.id] ?? [],
      narrative: getExamNarrative(examType.code, locale),
      anchorId: examAnchorId({ code: examType.code, name: examType.name }),
    })),
  };
}

export function getLocalizedCourseInstances(courseTypeId: string): CourseInstanceRow[] {
  return fallbackCourseInstances
    .filter((instance) => instance.course_type_id === courseTypeId)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function getLocalizedSocialProof(locale: ContentLocale): SocialProofItem[] {
  const localized = socialProofByLocale[locale] ?? socialProofByLocale.en;
  return byLocale(localized, locale);
}
