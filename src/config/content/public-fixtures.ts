import { faqByLocale } from './faq';
import type {
  ContentLocale,
  CourseInstanceRow,
  CourseTypeRow,
  ExamSessionRow,
  ExamTypeRow,
  FaqViewItem,
  NewsViewItem,
} from '@/lib/content/types';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const UPDATED_AT = '2026-01-01T00:00:00.000Z';

const COURSE_TYPES: CourseTypeRow[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'intensive-german',
    name: 'Intensive German',
    format: 'Intensive',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 20,
    default_price: 520,
    pricing_mode: 'from',
    visa_eligible: true,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    slug: 'evening-german',
    name: 'Evening German',
    format: 'Evening',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 4,
    // 476 EUR is the Herbsttrimester price CASA currently publishes, and it is a
    // per-trimester fee rather than an entry point -- so 'fixed', not 'from'.
    default_price: 476,
    pricing_mode: 'fixed',
    // 4 UE a week cannot meet the published 20-a-week visa requirement.
    visa_eligible: false,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    slug: 'special-courses',
    name: 'Special Courses',
    format: 'Modular',
    level_min: 'A2',
    level_max: 'C1',
    lessons_per_week: 2,
    default_price: 192,
    pricing_mode: 'fixed',
    visa_eligible: false,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    slug: 'medical-german',
    name: 'German for Medical',
    format: 'Professional',
    level_min: 'B2',
    level_max: 'C1',
    // CASA publishes the B2/C1 entry requirement and nothing else for this
    // course: no weekly load, no dates, no price. 0 is the "not published"
    // sentinel and the facts rail renders it as "On request", never as a zero.
    lessons_per_week: 0,
    default_price: 0,
    pricing_mode: 'on_request',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    slug: 'bildungszeit',
    name: 'Bildungszeit German',
    format: 'Intensive Block',
    // "Ab einem Niveau von B1 kannst du teilnehmen."
    level_min: 'B1',
    level_max: 'C1',
    lessons_per_week: 40,
    default_price: 280,
    pricing_mode: 'from',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    slug: 'in-company',
    name: 'Firmenunterricht',
    format: 'Custom Corporate',
    level_min: 'A1',
    level_max: 'C1',
    // By arrangement, like the price. Never publish a weekly figure here.
    lessons_per_week: 0,
    default_price: 0,
    pricing_mode: 'on_request',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    slug: 'exam-preparation',
    name: 'Exam Preparation',
    format: 'Exam Prep',
    level_min: 'B1',
    level_max: 'C1',
    lessons_per_week: 10,
    default_price: 520,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    slug: 'german-for-groups',
    name: 'German for Groups',
    format: 'Group Package',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 20,
    default_price: 0,
    pricing_mode: 'on_request',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
];

const EXAM_TYPES: ExamTypeRow[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    code: 'telc_b2',
    name: 'telc Deutsch B2',
    level: 'B2',
    default_fee: 190,
    currency: 'EUR',
    is_active: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    code: 'telc_c1_hochschule',
    name: 'telc Deutsch C1 Hochschule',
    level: 'C1',
    default_fee: 210,
    currency: 'EUR',
    is_active: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    code: 'testdaf',
    name: 'TestDaF',
    level: 'B2-C1',
    default_fee: 215,
    currency: 'EUR',
    is_active: true,
  },
];

function courseTypeId(slug: string) {
  const courseType = COURSE_TYPES.find((item) => item.slug === slug);
  if (!courseType) {
    throw new Error(`Missing fallback course type for ${slug}`);
  }

  return courseType.id;
}

function examTypeId(code: string) {
  const examType = EXAM_TYPES.find((item) => item.code === code);
  if (!examType) {
    throw new Error(`Missing fallback exam type for ${code}`);
  }

  return examType.id;
}

function courseInstance(
  idSuffix: string,
  slug: string,
  startDate: string,
  endDate: string,
  schedule: CourseInstanceRow['schedule'],
  capacity = 16,
  location = 'CASA Bremen - Am Dobben'
): CourseInstanceRow {
  return {
    id: `30000000-0000-4000-8000-${idSuffix}`,
    course_type_id: courseTypeId(slug),
    start_date: startDate,
    end_date: endDate,
    capacity,
    schedule,
    location,
    status: 'scheduled',
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  };
}

function examSession(
  idSuffix: string,
  code: string,
  startsAt: string,
  endsAt: string,
  registrationDeadline: string,
  capacity = 28
): ExamSessionRow {
  return {
    id: `40000000-0000-4000-8000-${idSuffix}`,
    exam_type_id: examTypeId(code),
    starts_at: startsAt,
    ends_at: endsAt,
    registration_deadline: registrationDeadline,
    capacity,
    fee_override: null,
    status: 'scheduled',
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  };
}

/**
 * CASA's published term table, matching db/seeds/0001_public_baseline.sql.
 *
 * Fallback mode has to show the same terms as Neon mode, so these are the dates
 * from casa-bremen.de and not a set generated relative to today. The afternoon
 * intensive runs FOUR days (Mon-Thu), not five -- getting that wrong overstates
 * the weekly commitment by a fifth.
 *
 * Deliberately absent: any instance for German for Medical. CASA publishes no
 * dates for it, and the fabricated "26 Jun - 28 Aug 2026, Fridays 13:00-16:30"
 * row that used to sit here rendered on the public site as a real course start.
 */
function buildCourseInstances(): CourseInstanceRow[] {
  const intensiveMorning = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' };
  const intensiveAfternoon = { days: ['Mon', 'Tue', 'Wed', 'Thu'], time: '13:00-17:30' };
  const eveningMondayWednesday = { days: ['Mon', 'Wed'], time: '18:30-20:00' };
  const eveningTuesdayThursday = { days: ['Tue', 'Thu'], time: '18:30-20:00' };
  // Two intensive courses in parallel. The schedule field takes one range, so it
  // carries the span of the teaching day; the page explains the two blocks.
  const bildungszeitFullDay = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-17:30' };

  return [
    courseInstance('000000010001', 'intensive-german', '2026-08-31', '2026-10-23', intensiveMorning, 15),
    courseInstance('000000010002', 'intensive-german', '2026-10-26', '2026-12-18', intensiveMorning, 15),
    courseInstance('000000010003', 'intensive-german', '2027-01-04', '2027-02-26', intensiveMorning, 15),
    courseInstance('000000010004', 'intensive-german', '2027-03-01', '2027-04-30', intensiveMorning, 15),
    courseInstance('000000010005', 'intensive-german', '2026-08-03', '2026-09-24', intensiveAfternoon, 15),
    courseInstance('000000010006', 'intensive-german', '2026-09-28', '2026-11-19', intensiveAfternoon, 15),
    courseInstance('000000010007', 'intensive-german', '2026-11-23', '2027-01-28', intensiveAfternoon, 15),
    courseInstance('000000010008', 'intensive-german', '2027-02-01', '2027-04-01', intensiveAfternoon, 15),
    courseInstance('000000020001', 'evening-german', '2026-08-24', '2026-12-16', eveningMondayWednesday, 12),
    courseInstance('000000020002', 'evening-german', '2026-08-25', '2026-12-17', eveningTuesdayThursday, 12),
    courseInstance('000000050001', 'bildungszeit', '2026-08-31', '2026-10-23', bildungszeitFullDay, 15),
    courseInstance('000000050002', 'bildungszeit', '2026-10-26', '2026-12-18', bildungszeitFullDay, 15),
    courseInstance('000000050003', 'bildungszeit', '2027-01-04', '2027-02-26', bildungszeitFullDay, 15),
  ];
}

/**
 * Exam days at the hours CASA publishes (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md):
 * telc B2 about 09:00-17:00, telc C1 Hochschule about 08:30-17:00, in Bremen
 * time. Stored as UTC instants, so summer dates are two hours behind the wall
 * clock and winter dates (from 25 October) one. These were 14:00-18:00.
 */
function buildExamSessions(): ExamSessionRow[] {
  return [
    examSession('000000010001', 'telc_b2', '2026-08-21T07:00:00.000Z', '2026-08-21T15:00:00.000Z', '2026-07-20'),
    examSession('000000010002', 'telc_b2', '2026-10-16T07:00:00.000Z', '2026-10-16T15:00:00.000Z', '2026-09-15'),
    examSession('000000010003', 'telc_b2', '2026-11-13T08:00:00.000Z', '2026-11-13T16:00:00.000Z', '2026-10-12'),
    examSession('000000020001', 'telc_c1_hochschule', '2026-09-04T06:30:00.000Z', '2026-09-04T15:00:00.000Z', '2026-08-03'),
    examSession('000000020002', 'telc_c1_hochschule', '2026-10-02T06:30:00.000Z', '2026-10-02T15:00:00.000Z', '2026-09-01'),
    examSession('000000020003', 'telc_c1_hochschule', '2026-10-30T07:30:00.000Z', '2026-10-30T16:00:00.000Z', '2026-09-29'),
    examSession('000000020004', 'telc_c1_hochschule', '2026-11-27T07:30:00.000Z', '2026-11-27T16:00:00.000Z', '2026-10-26'),
  ];
}

/*
 * NO FALLBACK NEWS POSTS (2026-10-02). Twelve sample articles lived here
 * (starter guides, a C1 roadmap, an onboarding checklist...) and were removed on
 * Rahman's brief: they were written for the layout, not by CASA. Their old URLs
 * redirect to /aktuelles and /en/news (src/i18n/legacy-redirects.ts). Real posts
 * come from the `news_posts` table; the monthly NewsFlash is
 * src/config/content/newsflash.ts.
 */
const NEWS_EN: NewsViewItem[] = [];
const NEWS_DE: NewsViewItem[] = [];

export const fallbackCourseTypes = COURSE_TYPES;
export const fallbackCourseInstances = buildCourseInstances();
export const fallbackExamTypes = EXAM_TYPES;
export const fallbackExamSessions = buildExamSessions();

/**
 * The FAQ moved to config/content/faq.ts.
 *
 * What used to sit here was 24 invented questions per locale with zero overlap
 * with the FAQ CASA publishes -- generic reassurance where the real answers carry
 * deadlines and euro amounts. See the header of that file.
 */
export const fallbackFaqByLocale: Record<ContentLocale, FaqViewItem[]> = {
  en: faqByLocale.en,
  de: faqByLocale.de,
};

export const fallbackNewsByLocale: Record<ContentLocale, NewsViewItem[]> = {
  en: NEWS_EN,
  de: NEWS_DE,
};
