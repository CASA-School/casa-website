import { z } from 'zod';

import { normalizeContentLocale } from '@/lib/content/locale';

/**
 * Contact topics raised by an organiser buying on behalf of other people rather
 * than by a learner buying for themselves. Both are quote-only products
 * (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md), so the extra fields below collect a
 * structured brief for staff — never a booking and never a price.
 */
const ORGANISER_TOPIC_KEYS = ['group-booking', 'company-courses'] as const;

const COMPANY_TOPIC_KEY = 'company-courses';

export const isOrganiserTopic = (topicKey: string | null | undefined) =>
  (ORGANISER_TOPIC_KEYS as readonly string[]).includes(String(topicKey ?? ''));

export const isCompanyTopic = (topicKey: string | null | undefined) => topicKey === COMPANY_TOPIC_KEY;

/** Asked of every organiser, whatever they are organising. */
const SHARED_BRIEF_FIELDS = [
  'organisationName',
  'groupSize',
  'participantLevels',
  'preferredDates',
  'durationWeeks',
  'weeklyLessons',
  'languageFocus',
  'invoicingParty',
] as const;

/**
 * Stay logistics — `group-booking` only. A group package is a stay in Bremen:
 * host-family accommodation, board, a transit pass and a culture programme are
 * priced line items (docs/GROUP_PRICING_AND_SPECIAL_COURSES.md Part 1).
 * Firmenunterricht is tuition alone, so asking a company about half board would
 * be noise.
 */
const GROUP_STAY_FIELDS = ['ageBand', 'accommodation', 'meals', 'transport', 'cultureProgramme'] as const;

/** `company-courses` only — Firmenunterricht is arranged around the workplace. */
const COMPANY_FIELDS = ['deliveryMode', 'schedulePreference'] as const;

export type OrganiserBriefField =
  | (typeof SHARED_BRIEF_FIELDS)[number]
  | (typeof GROUP_STAY_FIELDS)[number]
  | (typeof COMPANY_FIELDS)[number];

/**
 * Allowed answers per choice field. Exported so the form renders exactly the
 * values the schema accepts; the visitor-facing labels live with the form copy.
 *
 * Values deliberately mirror the group price model in
 * `src/lib/pricing/group-pricing.ts` (`RoomType`, `CultureTier`) so a brief can
 * be handed to it without a translation layer. Transit is asked as weekly vs.
 * monthly only — the student/adult fare class follows the age band and is a
 * staff decision, not a visitor one.
 */
export const ORGANISER_CHOICES = {
  languageFocus: ['general', 'exam-preparation', 'business', 'academic', 'technical', 'undecided'],
  invoicingParty: ['organisation', 'public-funder', 'participants', 'undecided'],
  ageBand: ['under-14', '14-17', '18-25', '26-plus', 'mixed'],
  accommodation: ['not-needed', 'double', 'single', 'undecided'],
  meals: ['not-needed', 'half-board', 'half-board-plus-canteen', 'undecided'],
  transport: ['not-needed', 'weekly', 'monthly', 'undecided'],
  cultureProgramme: ['not-needed', 'small', 'medium', 'large', 'undecided'],
  deliveryMode: ['on-site', 'at-casa', 'online', 'undecided'],
  schedulePreference: ['mornings', 'midday', 'afternoons', 'evenings', 'undecided'],
} as const;

/**
 * Brief fields that apply to a given topic. Returns an empty list for learner
 * topics, so a normal enquiry never carries organiser data.
 */
export function organiserBriefFields(topicKey: string | null | undefined): readonly OrganiserBriefField[] {
  if (!isOrganiserTopic(topicKey)) {
    return [];
  }

  return isCompanyTopic(topicKey)
    ? [...SHARED_BRIEF_FIELDS, ...COMPANY_FIELDS]
    : [...SHARED_BRIEF_FIELDS, ...GROUP_STAY_FIELDS];
}

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

/**
 * Optional whole number typed into a text field. An empty input stays empty
 * instead of coercing to 0, so an organiser who knows only part of the picture
 * still gets through. The bounds are input guards, not published limits.
 */
const optionalCount = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }

      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      return Number.isFinite(parsed) ? parsed : value;
    },
    z.number({ message }).int(message).min(1, message).max(max, message).optional()
  );

const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal('')]).optional().default('');

export const contactInquirySchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.').max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  topic: z.string().trim().min(2, 'Topic is required.').max(120),
  /**
   * Stable id behind the localized `topic` label, so staff routing and the
   * organiser brief do not depend on which language the visitor used.
   */
  topicKey: z.string().trim().max(60).optional().default(''),
  message: z.string().trim().min(12, 'Please add a short message (min. 12 characters).').max(3000),
  locale: z.preprocess((value) => normalizeContentLocale(String(value ?? 'en')), z.enum(['en', 'de'])),
  source: z.string().trim().max(120).default('contact-page'),
  website: z.string().trim().max(200).optional().default(''),

  // Organiser brief. Every field is optional on purpose: this is an enquiry
  // path, and a partial brief still beats the email thread it replaces.
  organisationName: optionalText(160),
  groupSize: optionalCount(500, 'Please enter the number of participants as a whole number.'),
  participantLevels: optionalText(200),
  preferredDates: optionalText(200),
  durationWeeks: optionalCount(52, 'Please enter the length in whole weeks.'),
  weeklyLessons: optionalCount(40, 'Please enter the lessons per week as a whole number.'),
  languageFocus: optionalChoice(ORGANISER_CHOICES.languageFocus),
  invoicingParty: optionalChoice(ORGANISER_CHOICES.invoicingParty),
  ageBand: optionalChoice(ORGANISER_CHOICES.ageBand),
  accommodation: optionalChoice(ORGANISER_CHOICES.accommodation),
  meals: optionalChoice(ORGANISER_CHOICES.meals),
  transport: optionalChoice(ORGANISER_CHOICES.transport),
  cultureProgramme: optionalChoice(ORGANISER_CHOICES.cultureProgramme),
  deliveryMode: optionalChoice(ORGANISER_CHOICES.deliveryMode),
  schedulePreference: optionalChoice(ORGANISER_CHOICES.schedulePreference),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
