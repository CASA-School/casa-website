import type { SkillKey } from '@/config/brand/tokens';
import type { ContentLocale } from '@/lib/content/types';

/**
 * Special Courses module catalogue.
 *
 * "Special Courses" is one route standing in for eight distinct products. Every
 * module is a single 90-minute evening session per week at €16 an evening:
 * twelve evenings and €192 for most, fewer for a module that starts later in
 * the term. The parent course carries `pricing_mode: 'fixed'` at €192 and
 * `lessons_per_week: 2` rather than the old 8 / EUR 460.
 *
 * Dates, weekdays, times and prices checked 2026-10-09 against FileMaker
 * (Spezialkurs courses 5031-5044, autumn 2026 term); four had been wrong. Dates
 * change every term — they are the first thing to go stale here, so
 * `termLabel` exists to make that obvious in the UI.
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
 * the dialog's general sentence. The English says what the German says, and a
 * module or locale without an intro falls back to that general sentence.
 * Nothing here may be written from inference — a module's content is a claim
 * about what CASA teaches (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md).
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
  /** Evenings in this term. A module that starts later has fewer, at €16 each. */
  sessions: number;
  priceEur: number;
  skill: SkillKey;
  /** See SpecialCourseDetail. */
  detail?: SpecialCourseDetail;
};

/**
 * Constant across all eight modules, so the dialog states it once per module.
 * A full module has twelve evenings at €16 (FileMaker, 2026-10-09); one that
 * starts later in the term has fewer evenings and costs less (`sessions`).
 */
export const SPECIAL_COURSE_CONSTANTS = {
  minutesPerSession: 90,
  sessionsPerWeek: 1,
  pricePerSessionEur: 16,
} as const;

export const SPECIAL_COURSE_TERM_LABEL = 'Herbst 2026';
/** The same term on the English pages. Change it together with the German label. */
export const SPECIAL_COURSE_TERM_LABEL_EN = 'autumn 2026';

export const specialCourseModules: SpecialCourseModule[] = [
  {
    id: 'aussprache-kling-gut',
    category: { en: 'Pronunciation', de: 'Aussprache' },
    title: { en: 'Kling gut! German pronunciation training', de: 'Kling gut! Aussprachetraining Deutsch!' },
    level: 'B1+',
    weekday: { en: 'Monday', de: 'Montag' },
    time: '18:30 - 20:00',
    startDate: '2026-10-05',
    endDate: '2026-12-14',
    sessions: 11,
    priceEur: 176,
    skill: 'speaking',
    detail: {
      intro: {
        en: 'In this course you work on your German pronunciation. You practise sounds, word stress, sentence melody and intonation through a variety of exercises, and you get personal feedback. That way you speak more fluently, more clearly and with more confidence, in everyday life, at work and in exams.',
        de: 'In diesem Kurs verbesserst du gezielt deine deutsche Aussprache. Du übst Laute, Wortakzent, Satzmelodie und Intonation mit abwechslungsreichen Übungen und bekommst persönliches Feedback. So sprichst du im Alltag, im Beruf und in Prüfungen flüssiger, verständlicher und mit mehr Selbstvertrauen.',
      },
    },
  },
  {
    id: 'telc-c1-hochschule-training',
    category: { en: 'Exam preparation', de: 'Prüfungsvorbereitung' },
    title: {
      en: 'telc Deutsch C1 Hochschule: spoken and written expression',
      de: 'telc C1 Hochschule – Training für den mündlichen und schriftlichen Ausdruck',
    },
    level: 'C1',
    weekday: { en: 'Monday', de: 'Montag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-14',
    endDate: '2026-12-14',
    sessions: 12,
    priceEur: 192,
    skill: 'exam',
    detail: {
      intro: {
        en: 'In this course you practise written and spoken expression with real exam tasks. You learn to express yourself better at an academic level and go into the exam with more confidence.',
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
    sessions: 12,
    priceEur: 192,
    skill: 'grammar',
    detail: {
      intro: {
        en: 'In this course we revise and consolidate the most important topics of basic grammar together. It suits you if you are learning at A2 level, and also if you are further on and want to brush up on the basics.',
        de: 'In diesem Kurs wiederholen und festigen wir gemeinsam die wichtigsten Themen der Basisgrammatik. Er passt zu dir, wenn du auf A2-Niveau lernst, und auch dann, wenn du schon weiter bist und deine Grundlagen gezielt auffrischen möchtest.',
      },
    },
  },
  {
    id: 'grammatik-kompakt',
    category: { en: 'Grammar', de: 'Grammatik' },
    title: { en: 'Compact grammar: success at B1/B2', de: 'Grammatik kompakt – Erfolgreich auf B1/B2' },
    level: 'B1/B2',
    weekday: { en: 'Thursday', de: 'Donnerstag' },
    time: '18:30 - 20:00',
    startDate: '2026-09-17',
    endDate: '2026-12-03',
    sessions: 12,
    priceEur: 192,
    skill: 'grammar',
    detail: {
      intro: {
        en: 'In this course you consolidate the most important grammar topics at levels B1 and B2, such as sentence structure, tenses, the subjunctive (Konjunktiv II), the passive, relative clauses and prepositions. We explain them clearly and practise them so that you can use them straight away. Together we lay the foundations for confident, fluent German.',
        de: 'In diesem Kurs festigst du die wichtigsten Grammatikthemen der Niveaustufen B1 und B2, zum Beispiel Satzbau, Zeiten, Konjunktiv II, Passiv, Relativsätze und Präpositionen. Wir erklären sie verständlich und üben sie so, dass du sie gleich anwenden kannst. So schaffen wir gemeinsam die Grundlagen für sicheres und flüssiges Deutsch.',
      },
    },
  },
  {
    id: 'schreiben-basal',
    category: { en: 'Writing', de: 'Schreiben' },
    title: { en: 'Writing made easy: the basics', de: 'Schreiben leicht gemacht – Basales Schreiben' },
    level: 'A2/B1',
    weekday: { en: 'Thursday', de: 'Donnerstag' },
    time: '18:00 - 19:30',
    startDate: '2026-10-22',
    endDate: '2026-12-17',
    sessions: 9,
    priceEur: 144,
    skill: 'writing',
    detail: {
      intro: {
        en: 'In this course you learn the basics of writing step by step. We practise short emails, messages, descriptions and other everyday texts, and look at text structure, word choice, typical phrases and common mistakes in grammar and spelling.',
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
    sessions: 12,
    priceEur: 192,
    skill: 'writing',
    detail: {
      intro: {
        en: 'In this course you practise writing at B level. You learn to structure emails, opinion pieces, reports and other kinds of text clearly and to write them correctly. With focused exercises, personal feedback and practical tips, you improve your writing style step by step and write with more confidence, in everyday life, at work and in exams.',
        de: 'In diesem Kurs trainierst du das Schreiben auf B-Niveau. Du lernst, E-Mails, Stellungnahmen, Berichte und andere Textsorten klar aufzubauen und sprachlich korrekt zu schreiben. Mit gezielten Übungen, persönlichem Feedback und praktischen Tipps verbesserst du Schritt für Schritt deinen Schreibstil und schreibst sicherer, im Alltag, im Beruf und in Prüfungen.',
      },
    },
  },
  {
    id: 'sprechwerkstatt-b1-b2',
    category: { en: 'Conversation', de: 'Konversation' },
    title: {
      en: 'B1/B2 speaking workshop: communicate confidently and convincingly',
      de: 'B1/B2 Sprechwerkstatt – Sicher und überzeugend kommunizieren',
    },
    level: 'B1/B2',
    weekday: { en: 'Wednesday', de: 'Mittwoch' },
    time: '18:30 - 20:00',
    startDate: '2026-10-07',
    endDate: '2026-12-16',
    sessions: 11,
    priceEur: 176,
    skill: 'speaking',
    detail: {
      intro: {
        en: 'In this course you develop your speaking skills. Together we practise presentations, discussions, debates and conversations for different occasions. Along the way you widen your vocabulary, improve how you express yourself and speak more freely and confidently, in everyday life and at work.',
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
    sessions: 12,
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
