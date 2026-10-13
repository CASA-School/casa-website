import { INTAKE_QUESTIONS } from '@/config/placement/intake';
import { INTAKE_LABELS } from '@/lib/admin/placement-copy';

/**
 * The intake self-report, as a teacher reads it.
 *
 * `attempt.intake` stores option values (`some_courses`, `recent`) and the
 * derived `directBeginner` flag. The values are labelled from the intake
 * questions themselves (src/config/placement/intake.ts), so a new option is
 * named without touching this file; the few options written in the learner's
 * own voice ("I use it now") are restated for a reader. Anything unknown is
 * humanised rather than printed raw.
 */

const FIELD_LABELS: Record<string, string> = {
  ...INTAKE_LABELS,
  directBeginner: 'Starts from zero',
};

/** Options whose learner-facing label is in the first person. */
const STAFF_OPTION_LABELS: Record<string, Record<string, string>> = {
  priorLearning: {
    some_courses: 'Completed one or more courses',
    years: 'Used it regularly for several years',
  },
  lastContact: {
    now: 'Uses it now',
  },
};

const ORDER = [...INTAKE_QUESTIONS.map((q) => q.id as string), 'directBeginner'];

/** `selfAssessedLevel` → "Self assessed level", `a_few_words` → "A few words". */
export function humanise(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function valueLabel(field: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return JSON.stringify(value);

  const staff = STAFF_OPTION_LABELS[field]?.[value];
  if (staff) return staff;
  const option = INTAKE_QUESTIONS.find((q) => q.id === field)?.options.find((o) => o.value === value);
  if (option) return option.label.en;
  // Free text arrives as typed; only a machine-shaped value is humanised.
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value) ? humanise(value) : value;
}

/** The intake answers as label/value pairs, in the order the test asks them. */
export function backgroundItems(intake: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!intake) return [];
  return Object.entries(intake)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .sort(([a], [b]) => {
      const ia = ORDER.indexOf(a);
      const ib = ORDER.indexOf(b);
      return (ia === -1 ? ORDER.length : ia) - (ib === -1 ? ORDER.length : ib);
    })
    .map(([key, value]) => ({
      label: FIELD_LABELS[key] ?? humanise(key),
      value: valueLabel(key, value),
    }));
}
