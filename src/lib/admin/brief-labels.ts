import type { ReactNode } from 'react';

import { pick, translator, type Bilingual, type WsLang } from './i18n';

/**
 * Human labels for the organiser brief, in both of the workspace's languages
 * (read with `pick`).
 *
 * The brief arrives as a jsonb bag whose keys are defined by
 * `organiserBriefFields()` in `src/lib/validation/contact.ts`. This maps the
 * keys it currently produces, and the detail view falls back to the raw key for
 * anything it does not know — so adding a field to the public form shows up
 * here immediately as an ugly label rather than silently disappearing. An ugly
 * label gets fixed; a missing field does not get noticed.
 */
export const ORGANISER_BRIEF_LABELS: Record<string, Bilingual> = {
  organisationName: { de: 'Organisation', en: 'Organisation' },
  groupSize: { de: 'Gruppengröße', en: 'Group size' },
  participantLevels: { de: 'Niveaus in der Gruppe', en: 'Levels in the group' },
  preferredDates: { de: 'Wunschzeitraum', en: 'Preferred dates' },
  durationWeeks: { de: 'Dauer (Wochen)', en: 'Duration (weeks)' },
  weeklyLessons: { de: 'Unterrichtseinheiten pro Woche', en: 'Lessons per week' },
  languageFocus: { de: 'Sprachlicher Schwerpunkt', en: 'Language focus' },
  invoicingParty: { de: 'Rechnung an', en: 'Who is invoiced' },
  ageBand: { de: 'Altersgruppe', en: 'Age band' },
  accommodation: { de: 'Unterkunft', en: 'Accommodation' },
  meals: { de: 'Verpflegung', en: 'Meals' },
  transport: { de: 'ÖPNV-Ticket', en: 'Transit pass' },
  cultureProgramme: { de: 'Kulturprogramm', en: 'Culture programme' },
  deliveryMode: { de: 'Unterrichtsort', en: 'Where lessons happen' },
  schedulePreference: { de: 'Bevorzugte Tageszeit', en: 'Preferred time of day' },
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
const VALUE_LABELS: Record<string, Bilingual> = {
  // Shared across every choice field.
  'not-needed': { de: 'Nicht nötig', en: 'Not needed' },
  undecided: { de: 'Noch offen', en: 'Undecided' },

  // languageFocus
  general: { de: 'Allgemeines Deutsch', en: 'General German' },
  'exam-preparation': { de: 'Prüfungsvorbereitung', en: 'Exam preparation' },
  business: { de: 'Berufsdeutsch', en: 'Business German' },
  academic: { de: 'Deutsch für das Studium', en: 'Academic German' },
  technical: { de: 'Fachsprache', en: 'Technical German' },

  // invoicingParty
  organisation: { de: 'Die Organisation', en: 'The organisation' },
  'public-funder': { de: 'Ein öffentlicher Träger', en: 'A public funder' },
  participants: { de: 'Die Teilnehmenden selbst', en: 'The participants themselves' },

  // ageBand — ranges keep their hyphen.
  'under-14': { de: 'Unter 14', en: 'Under 14' },
  '14-17': { de: '14–17', en: '14–17' },
  '18-25': { de: '18–25', en: '18–25' },
  '26-plus': { de: '26 und älter', en: '26 and over' },
  mixed: { de: 'Gemischte Altersgruppen', en: 'Mixed ages' },

  // accommodation
  double: { de: 'Doppelzimmer', en: 'Double rooms' },
  single: { de: 'Einzelzimmer', en: 'Single rooms' },

  // meals
  'half-board': { de: 'Halbpension', en: 'Half board' },
  'half-board-plus-canteen': { de: 'Halbpension plus Schulkantine', en: 'Half board plus school canteen' },

  // transport
  weekly: { de: 'Wochenticket', en: 'Weekly transit pass' },
  monthly: { de: 'Monatsticket', en: 'Monthly transit pass' },

  // cultureProgramme
  small: { de: 'Kleines Programm', en: 'Small programme' },
  medium: { de: 'Mittleres Programm', en: 'Medium programme' },
  large: { de: 'Großes Programm', en: 'Large programme' },

  // deliveryMode
  'on-site': { de: 'Bei ihnen vor Ort', en: 'At their workplace' },
  'at-casa': { de: 'Bei CASA', en: 'At CASA' },
  online: { de: 'Online', en: 'Online' },

  // schedulePreference
  mornings: { de: 'Vormittags', en: 'Mornings' },
  midday: { de: 'Mittags', en: 'Midday' },
  afternoons: { de: 'Nachmittags', en: 'Afternoons' },
  evenings: { de: 'Abends', en: 'Evenings' },
};

export function formatBriefValue(value: unknown, lang: WsLang): ReactNode {
  if (typeof value === 'boolean') {
    return translator(lang)(value ? 'Ja' : 'Nein', value ? 'Yes' : 'No');
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
  const label = VALUE_LABELS[value];
  return label ? pick(lang, label) : value;
}
