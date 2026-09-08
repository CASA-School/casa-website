import type { ReactNode } from 'react';

/**
 * Human labels for the organiser brief.
 *
 * The brief arrives as a jsonb bag whose keys are defined by
 * `organiserBriefFields()` in `src/lib/validation/contact.ts`. This maps the
 * keys it currently produces, and the detail view falls back to the raw key for
 * anything it does not know — so adding a field to the public form shows up
 * here immediately as an ugly label rather than silently disappearing. An ugly
 * label gets fixed; a missing field does not get noticed.
 */
export const ORGANISER_BRIEF_LABELS: Record<string, string> = {
  organisationName: 'Organisation',
  groupSize: 'Group size',
  participantLevels: 'Levels in the group',
  preferredDates: 'Preferred dates',
  durationWeeks: 'Duration (weeks)',
  weeklyLessons: 'Lessons per week',
  languageFocus: 'Language focus',
  invoicingParty: 'Who is invoiced',
  ageBand: 'Age band',
  accommodation: 'Accommodation',
  meals: 'Meals',
  transport: 'Transit pass',
  cultureProgramme: 'Culture programme',
  deliveryMode: 'Where lessons happen',
  schedulePreference: 'Preferred time of day',
};

/**
 * Human readings for the brief's choice vocabularies.
 *
 * The stored values are machine tokens — `half-board-plus-canteen`,
 * `public-funder`, `14-17` — chosen in `ORGANISER_CHOICES` so a brief can be
 * handed straight to the group price model without a translation layer. That
 * makes them the right thing to store and the wrong thing to print.
 *
 * Spelled out rather than de-hyphenated by rule, because the rule is wrong for
 * exactly the values a coordinator reads most: an age band `14-17` is a range
 * and loses its meaning as "14 17", and `26-plus` wants to be `26+`. One
 * shared map covers every field, since no token means two things across them.
 */
const VALUE_LABELS: Record<string, string> = {
  // Shared across every choice field.
  'not-needed': 'Not needed',
  undecided: 'Undecided',

  // languageFocus
  general: 'General German',
  'exam-preparation': 'Exam preparation',
  business: 'Business German',
  academic: 'Academic German',
  technical: 'Technical German',

  // invoicingParty
  organisation: 'The organisation',
  'public-funder': 'A public funder',
  participants: 'The participants themselves',

  // ageBand — ranges keep their hyphen.
  'under-14': 'Under 14',
  '14-17': '14–17',
  '18-25': '18–25',
  '26-plus': '26 and over',
  mixed: 'Mixed ages',

  // accommodation
  double: 'Double rooms',
  single: 'Single rooms',

  // meals
  'half-board': 'Half board',
  'half-board-plus-canteen': 'Half board plus school canteen',

  // transport
  weekly: 'Weekly transit pass',
  monthly: 'Monthly transit pass',

  // cultureProgramme
  small: 'Small programme',
  medium: 'Medium programme',
  large: 'Large programme',

  // deliveryMode
  'on-site': 'At their workplace',
  'at-casa': 'At CASA',
  online: 'Online',

  // schedulePreference
  mornings: 'Mornings',
  midday: 'Midday',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
};

export function formatBriefValue(value: unknown): ReactNode {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value !== 'string') {
    return JSON.stringify(value);
  }

  // An unmapped token is shown as it was stored, not prettified by rule. A
  // visibly raw value says "the form gained a field and nobody labelled it",
  // which is a fixable signal; a plausible-looking guess is not.
  return VALUE_LABELS[value] ?? value;
}
