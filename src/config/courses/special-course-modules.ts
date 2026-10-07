import type { SkillKey } from '@/config/brand/tokens';
import type { ContentLocale } from '@/lib/content/types';

/**
 * Special Courses module catalogue.
 *
 * "Special Courses" is one route standing in for eight distinct products. Every
 * module is a single 90-minute evening session per week over ~12 weeks at
 * EUR 192, which is why the parent course carries `pricing_mode: 'fixed'` and
 * `lessons_per_week: 2` rather than the old 8 / EUR 460.
 *
 * Verified 2026-08-12 against casa-bremen.de/sprachkurse/deutsch-spezialkurse
 * (autumn 2026 term). Dates change every term — they are the first thing to go
 * stale here, so `termLabel` exists to make that obvious in the UI.
 *
 * `skill` drives the module's accent colour via the shared skill tokens, so a
 * writing module reads teal here and in the student app.
 */
/**
 * The per-module detail the dialog shows beyond the schedule.
 *
 * `intro` carries each module's own description from the old
 * casa-bremen.de/sprachkurse/deutsch-spezialkurse page (restored 2026-10-07),
 * rewritten in the site's voice. Seven of the eight modules have one; the C1+
 * conversation module is new and the old page never described it, so it keeps
 * the dialog's general sentence. The German text is written; `en` stays unset
 * until an English description is approved, and the dialog falls back to its
 * general English sentence. Nothing here may be written from inference — a
 * module's content is a claim about what CASA teaches
 * (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md).
 *
 * The dialog renders each section only when its field is present, so filling
 * these in is a data-only change with no component work.
 */
export type SpecialCourseDetail = {
  /** What the module does, in a few sentences. */
  intro?: { en?: string; de: string };
  /** Who it suits — the sentence the doc asks for. */
  forWhom?: { en: string; de: string };
  /** What a participant practises, as short parallel phrases. */
  practises?: { en: string; de: string }[];
  /** Entry expectations beyond the CEFR level, if CASA states any. */
  requirements?: { en: string; de: string };
};

export type SpecialCourseModule = {
  id: string;
  category: { en: string; de: string };
  title: { en: string; de: string };
  /** CEFR entry requirement as CASA publishes it. */
  level: string;
  weekday: { en: string; de: string };
  time: string;
  startDate: string;
  endDate: string;
  priceEur: number;
  skill: SkillKey;
  /** See SpecialCourseDetail. */
  detail?: SpecialCourseDetail;
};

/** Constant across all eight modules, so the dialog states it once per module. */
export const SPECIAL_COURSE_CONSTANTS = {
  weeks: 12,
  minutesPerSession: 90,
  sessionsPerWeek: 1,
} as const;

export const SPECIAL_COURSE_TERM_LABEL = 'Herbst 2026';

export const specialCourseModules: SpecialCourseModule[] = [
  {
    id: 'aussprache-kling-gut',
    category: { en: 'Pronunciation', de: 'Aussprache' },
    title: { en: 'Kling gut! German pronunciation training', de: 'Kling gut! Aussprachetraining Deutsch!' },
    level: 'B1+',
    weekday: { en: 'Monday', de: 'Montag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-14',
    endDate: '2026-11-30',
    priceEur: 192,
    skill: 'speaking',
    detail: {
      intro: {
        de: 'In diesem Kurs verbesserst du gezielt deine deutsche Aussprache. Du übst Laute, Wortakzent, Satzmelodie und Intonation mit abwechslungsreichen Übungen und bekommst persönliches Feedback. So sprichst du im Alltag, im Beruf und in Prüfungen flüssiger, verständlicher und mit mehr Selbstvertrauen.',
      },
    },
  },
  {
    id: 'telc-c1-hochschule-training',
    category: { en: 'Exam preparation', de: 'Prüfungsvorbereitung' },
    title: {
      en: 'telc C1 Hochschule — spoken and written expression',
      de: 'telc C1 Hochschule – Training für den mündlichen und schriftlichen Ausdruck',
    },
    level: 'C1',
    weekday: { en: 'Monday', de: 'Montag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-14',
    endDate: '2026-11-30',
    priceEur: 192,
    skill: 'exam',
    detail: {
      intro: {
        de: 'In diesem Kurs trainierst du den schriftlichen und mündlichen Ausdruck mit authentischen Prüfungsaufgaben. So verbesserst du deine Ausdrucksfähigkeit auf akademischem Niveau und gehst sicherer in die Prüfung.',
      },
    },
  },
  {
    id: 'basisgrammatik',
    category: { en: 'Grammar', de: 'Grammatik' },
    title: { en: 'Basic grammar', de: 'Basisgrammatik' },
    level: 'A2/B1',
    weekday: { en: 'Monday', de: 'Montag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-14',
    endDate: '2026-11-30',
    priceEur: 192,
    skill: 'grammar',
    detail: {
      intro: {
        de: 'In diesem Kurs wiederholen und festigen wir gemeinsam die wichtigsten Themen der Basisgrammatik. Er passt zu dir, wenn du auf A2-Niveau lernst, und auch dann, wenn du schon weiter bist und deine Grundlagen gezielt auffrischen möchtest.',
      },
    },
  },
  {
    id: 'grammatik-kompakt',
    category: { en: 'Grammar', de: 'Grammatik' },
    title: { en: 'Grammar compact — succeeding at B1/B2', de: 'Grammatik kompakt – Erfolgreich auf B1/B2' },
    level: 'B1/B2',
    weekday: { en: 'Thursday', de: 'Donnerstag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-17',
    endDate: '2026-12-03',
    priceEur: 192,
    skill: 'grammar',
    detail: {
      intro: {
        de: 'In diesem Kurs festigst du die wichtigsten Grammatikthemen der Niveaustufen B1 und B2, zum Beispiel Satzbau, Zeiten, Konjunktiv II, Passiv, Relativsätze und Präpositionen. Wir erklären sie verständlich und üben sie so, dass du sie gleich anwenden kannst. So schaffen wir gemeinsam die Grundlagen für sicheres und flüssiges Deutsch.',
      },
    },
  },
  {
    id: 'schreiben-basal',
    category: { en: 'Writing', de: 'Schreiben' },
    title: { en: 'Writing made easy — foundations', de: 'Schreiben leicht gemacht – Basales Schreiben' },
    level: 'A2/B1',
    weekday: { en: 'Tuesday', de: 'Dienstag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-15',
    endDate: '2026-12-01',
    priceEur: 192,
    skill: 'writing',
    detail: {
      intro: {
        de: 'In diesem Kurs lernst du Schritt für Schritt die Grundlagen des Schreibens. Wir üben kurze E-Mails, Nachrichten, Beschreibungen und andere Alltagstexte. Dabei geht es um den Aufbau des Textes, die richtige Wortwahl, typische Redemittel und häufige Fehler in Grammatik und Rechtschreibung.',
      },
    },
  },
  {
    id: 'schreiben-b1-b2',
    category: { en: 'Writing', de: 'Schreiben' },
    title: { en: 'Writing (B1/B2)', de: 'B – Schreiben (B1/B2)' },
    level: 'B1/B2',
    weekday: { en: 'Thursday', de: 'Donnerstag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-17',
    endDate: '2026-12-03',
    priceEur: 192,
    skill: 'writing',
    detail: {
      intro: {
        de: 'In diesem Kurs trainierst du das Schreiben auf B-Niveau. Du lernst, E-Mails, Stellungnahmen, Berichte und andere Textsorten klar aufzubauen und sprachlich korrekt zu schreiben. Mit gezielten Übungen, persönlichem Feedback und praktischen Tipps verbesserst du Schritt für Schritt deinen Schreibstil und schreibst sicherer, im Alltag, im Beruf und in Prüfungen.',
      },
    },
  },
  {
    id: 'sprechwerkstatt-b1-b2',
    category: { en: 'Conversation', de: 'Konversation' },
    title: {
      en: 'B1/B2 speaking workshop — communicate clearly and convincingly',
      de: 'B1/B2 Sprechwerkstatt – Sicher und überzeugend kommunizieren',
    },
    level: 'B1/B2',
    weekday: { en: 'Wednesday', de: 'Mittwoch' },
    time: '18:30 - 20:00',
    startDate: '2026-09-16',
    endDate: '2026-12-02',
    priceEur: 192,
    skill: 'speaking',
    detail: {
      intro: {
        de: 'In diesem Kurs entwickelst du gezielt dein Sprechen weiter. Gemeinsam üben wir Präsentationen, Diskussionen, Debatten und Gespräche zu unterschiedlichen Anlässen. Dabei erweiterst du deinen Wortschatz, verbesserst deine Ausdrucksweise und sprichst im Alltag und im Beruf freier und sicherer.',
      },
    },
  },
  {
    id: 'fachliches-auftreten-c1',
    category: { en: 'Conversation', de: 'Konversation' },
    title: {
      en: 'C1+: confident professional presence in study and work',
      de: 'C1+: Sicheres fachliches Auftreten in Studium und Beruf',
    },
    level: 'C1+',
    weekday: { en: 'Tuesday', de: 'Dienstag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-15',
    endDate: '2026-12-01',
    priceEur: 192,
    skill: 'speaking',
  },
];

export function specialCourseCategories(locale: ContentLocale) {
  const seen = new Map<string, { label: string; modules: SpecialCourseModule[] }>();

  for (const courseModule of specialCourseModules) {
    const label = courseModule.category[locale] ?? courseModule.category.en;
    const entry = seen.get(label) ?? { label, modules: [] };
    entry.modules.push(courseModule);
    seen.set(label, entry);
  }

  return [...seen.values()];
}

/** Modules running on a given weekday, so a learner can check the slot fits. */
export function specialCourseModulesByWeekday(locale: ContentLocale) {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return [...specialCourseModules].sort(
    (a, b) => order.indexOf(a.weekday.en) - order.indexOf(b.weekday.en)
  ).map((courseModule) => ({
    ...courseModule,
    weekdayLabel: courseModule.weekday[locale] ?? courseModule.weekday.en,
  }));
}
