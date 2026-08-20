export type ContentLocale = 'en' | 'de';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type VerificationStatus = 'verified' | 'draft';

export type ProofSourceType = 'website' | 'instagram' | 'google_reviews' | 'internal';

export type HeroVariant = 'immersive' | 'structured' | 'utility';
export type HeroThemeKey = 'home' | 'courses' | 'exams' | 'accommodation' | 'about' | 'default';
export type HeroArchetype = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type HeroPageKey =
  | 'home'
  | 'about'
  | 'courses'
  | 'course-detail'
  | 'exams'
  | 'exam-detail'
  | 'accommodation'
  | 'accommodation-detail'
  | 'contact'
  | 'faq'
  | 'news'
  | 'news-detail'
  | 'placement-test'
  | 'registration-course'
  | 'registration-exam'
  | 'imprint'
  | 'privacy'
  | 'terms';

export type HeroCta = {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
};

export type ProofMetric = {
  value: string;
  label: string;
  locale: ContentLocale;
  sourceUrl: string;
  sourceType: ProofSourceType;
  verificationStatus: VerificationStatus;
  asOf: string;
};

export type SocialProofItem = {
  id: string;
  locale: ContentLocale;
  /**
   * The text that renders: an editorially trimmed excerpt, ~100-170 characters,
   * so testimonial cards are a consistent height. See config/content/social-proof.
   */
  quote: string;
  /** Verbatim, as CASA publishes it. Kept so the excerpt stays auditable. */
  quoteFull: string;
  /** The learner's first name, as CASA publishes it. */
  personDisplay: string;
  /**
   * What the learner studied — "Evening courses A2 to B2, and the telc B2 exam".
   *
   * Named `country` because it used to hold invented nationalities alongside
   * invented quotes. CASA publishes what a learner did, not where they are from,
   * and beside a course testimonial that is the more useful attribution.
   */
  country: string;
  /** The course this testimonial is about. Absent means school-wide. */
  courseSlug?: string;
  /** The exam this learner sat, if any. Absent means they did not mention one. */
  examCode?: string;
  sourcePlatform: 'instagram' | 'google_reviews' | 'website';
  sourceUrl: string;
  verificationStatus: VerificationStatus;
};

export type HeroStorySnippet = {
  quote: string;
  personDisplay: string;
  country: string;
  roleLabel: string;
  sourcePlatform: 'instagram' | 'google_reviews' | 'website' | 'internal';
  sourceUrl: string;
  verificationStatus: VerificationStatus;
};

export type HeroSpec = {
  pageKey: HeroPageKey;
  locale: ContentLocale;
  variant: HeroVariant;
  archetype: HeroArchetype;
  themeKey: HeroThemeKey;
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctas: HeroCta[];
  proofMetrics: ProofMetric[];
  story: HeroStorySnippet;
  chips?: string[];
  visual: {
    kind: 'image' | 'illustration' | 'video';
    src: string;
    alt: string;
  };
};

export type CulturalProgramItem = {
  id: string;
  locale: ContentLocale;
  title: string;
  summary: string;
  cadence: string;
};

/**
 * A member of staff as CASA publishes them.
 *
 * `focus`, `highlight`, `bio`, `photo` and `socials` were all required, and all
 * five were therefore invented for six people who do not exist. They are now
 * optional, because casa-bremen.de publishes a name, a role and a list of
 * responsibilities and nothing else — and a required field is an instruction to
 * make something up when there is nothing to put in it.
 *
 * `photo` stays in the type for when real portraits arrive with consent. Until
 * then it is absent and the directory renders a monogram. Do not point it at the
 * synthetic images in public/media/casa/team/ (CLAUDE.md hard rule 3).
 */
export type TeamSpotlight = {
  id: string;
  locale: ContentLocale;
  name: string;
  title: string;
  /** Directory filter group, e.g. "Courses & exams". */
  role: string;
  /** Published responsibilities, e.g. "Intensive courses, telc examinations". */
  areas?: string;
  focus?: string;
  highlight?: string;
  bio?: string;
  photo?: {
    src: string;
    alt: string;
  };
  socials?: Array<{
    platform: 'linkedin' | 'instagram' | 'email';
    href: string;
    label: string;
  }>;
};

export type CourseNarrative = {
  slug: string;
  locale: ContentLocale;
  audience: string;
  promise: string;
  outcomes: string[];
  teachingStyle: string[];
  studentStory: HeroStorySnippet;
};

export type ExamNarrative = {
  code: string;
  locale: ContentLocale;
  headline: string;
  summary: string;
  outcomes: string[];
  prepHighlights: string[];
};

export type AccommodationTypeKey = 'flat' | 'host';

export type AccommodationNarrative = {
  id: AccommodationTypeKey;
  locale: ContentLocale;
  headline: string;
  summary: string;
  highlights: string[];
};

export type PlacementNarrative = {
  locale: ContentLocale;
  headline: string;
  summary: string;
  processSteps: string[];
  prepChecklist: string[];
};

export type FaqViewItem = {
  id: string;
  locale: ContentLocale;
  category: string;
  question: string;
  answer: string;
};

export type NewsViewItem = {
  slug: string;
  locale: ContentLocale;
  title: string;
  summary: string;
  body: string;
  contentJson?: unknown;
  contentHtml?: string | null;
  publishedAt: string;
  category: string;
  author: string;
};

export type CareerPositionViewItem = {
  id: string;
  slug: string;
  locale: ContentLocale;
  title: string;
  team: string | null;
  location: string;
  employmentType: string;
  workMode: string;
  shortDescription: string;
  description: string | null;
  requirements: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  isFeatured: boolean;
  closesAt: string | null;
  postedAt: string;
};

export type CourseTypeRow = {
  id: string;
  slug: string;
  name: string;
  format: string | null;
  level_min: string | null;
  level_max: string | null;
  lessons_per_week: number;
  default_price: number;
  currency: string;
  /**
   * How `default_price` should be read. Omitted means `from` (legacy behaviour).
   * `on_request` products have no public price at all — the UI must show a quote
   * path instead of a number. See docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
   */
  pricing_mode?: 'fixed' | 'from' | 'on_request';
  /**
   * Explicit, staff-verified student-visa eligibility. `null`/omitted means
   * "not confirmed" and must not be presented as a Yes. Never infer this from
   * lessons_per_week — see the visa note in COURSE_FACTS_SOURCE_OF_TRUTH.md.
   */
  visa_eligible?: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseInstanceRow = {
  id: string;
  course_type_id: string;
  start_date: string;
  end_date: string;
  capacity: number;
  schedule: JsonValue;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ExamTypeRow = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  default_fee: number;
  currency: string;
  is_active: boolean;
};

export type ExamSessionRow = {
  id: string;
  exam_type_id: string;
  starts_at: string;
  ends_at: string;
  registration_deadline: string | null;
  capacity: number;
  fee_override: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RegistrationAvailabilityState = 'open' | 'limited' | 'full';
export type RegistrationDeadlineStatus = 'open' | 'closing-soon' | 'closed' | 'not-applicable';

export type CourseRegistrationOption = {
  id: string;
  courseTypeId: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  scheduleLabel: string;
  locationLabel: string;
  fee: number;
  currency: string;
  capacity: number;
  seatsLeft: number;
  availabilityState: RegistrationAvailabilityState;
  availabilityLabel: string;
  deadlineStatus: RegistrationDeadlineStatus;
  deadlineLabel: string;
  status: string;
  /** Minimum entry level for this course type (e.g. 'A1'). Null for open/corporate courses. */
  levelMin: string | null;
  /** Maximum target level for this course type (e.g. 'C1'). Null for open/corporate courses. */
  levelMax: string | null;
  /** Ordered list of CASA sub-levels the learner can select (derived from levelMin..levelMax). */
  availableLevels: string[];
};

export type ExamRegistrationOption = {
  id: string;
  examTypeId: string;
  startsAt: string;
  endsAt: string;
  startsAtLabel: string;
  registrationDeadline: string | null;
  registrationDeadlineLabel: string;
  fee: number;
  currency: string;
  capacity: number;
  seatsLeft: number;
  availabilityState: RegistrationAvailabilityState;
  availabilityLabel: string;
  deadlineStatus: RegistrationDeadlineStatus;
  deadlineLabel: string;
  locationLabel: string;
  status: string;
};

export type RegistrationCourseCatalog = {
  locale: ContentLocale;
  courseTypes: CourseTypeRow[];
  optionsByCourseTypeId: Record<string, CourseRegistrationOption[]>;
  defaultCourseTypeId?: string;
  defaultOptionId?: string;
};

export type RegistrationExamCatalog = {
  locale: ContentLocale;
  examTypes: ExamTypeRow[];
  optionsByExamTypeId: Record<string, ExamRegistrationOption[]>;
  defaultExamTypeId?: string;
  defaultOptionId?: string;
};

export type CourseWithNarrative = CourseTypeRow & {
  narrative: CourseNarrative | null;
};

export type CourseDetailModel = {
  course: CourseWithNarrative;
  instances: CourseInstanceRow[];
};

export type ExamCatalogItem = {
  examType: ExamTypeRow;
  sessions: ExamSessionRow[];
  narrative: ExamNarrative | null;
  anchorId: string;
};

export type ExamCatalogModel = {
  items: ExamCatalogItem[];
};

export type CourseFinderData = {
  courses: CourseWithNarrative[];
  nextStartByCourseId: Record<string, string | null>;
  scheduleTagsByCourseId: Record<string, string[]>;
  visaEligibleByCourseId: Record<string, boolean | null>;
};
