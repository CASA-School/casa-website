/**
 * Intake — the short, unscored self-report before the test.
 *
 * ASSUMPTION (2026-08-23). The upstream package ships eight intake questions in
 * `content/intake/`, which is not present on this machine. These are authored
 * here. Fewer questions than upstream, deliberately: intake is a threshold, and
 * every question before the first item is a chance to close the tab.
 *
 * Two jobs, and only two:
 *
 *  1. Find true beginners, who are placed at A1.1 without sitting items in a
 *     language they have told us they do not have.
 *  2. Give a reviewer context for a surprising result.
 *
 * It does NOT influence the score. "Do not use an old certificate or a
 * self-reported level as the final placement" is an explicit package
 * non-decision, so nothing here reaches the engine.
 *
 * Safe on the client: no answer keys, nothing protected.
 */

export type IntakeOption = {
  value: string;
  label: { en: string; de: string };
  hint?: { en: string; de: string };
};

export type IntakeQuestion = {
  id: 'priorLearning' | 'goal' | 'lastContact';
  label: { en: string; de: string };
  help?: { en: string; de: string };
  options: readonly IntakeOption[];
};

/**
 * The value that means "no German at all".
 *
 * Kept as a named constant because the direct-beginner branch turns on it, and
 * a string literal repeated across the form, the API, and the engine is exactly
 * the kind of thing that survives a rename in only two of three places.
 */
export const NO_PRIOR_GERMAN = 'none';

export const INTAKE_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: 'priorLearning',
    label: {
      en: 'How much German have you learned so far?',
      de: 'Wie viel Deutsch haben Sie bisher gelernt?',
    },
    help: {
      en: 'Choose “None at all” only if you cannot yet form or understand a simple German sentence. Complete beginners can start directly at A1.1.',
      de: 'Wählen Sie „Noch gar kein Deutsch“ nur, wenn Sie noch keinen einfachen deutschen Satz bilden oder verstehen können. Dann beginnen Sie direkt bei A1.1.',
    },
    options: [
      {
        value: NO_PRIOR_GERMAN,
        label: { en: 'None at all', de: 'Noch gar kein Deutsch' },
        hint: {
          en: 'You will skip the test and start at A1.1.',
          de: 'Sie überspringen den Test und beginnen bei A1.1.',
        },
      },
      {
        value: 'a_few_words',
        label: { en: 'A few words and phrases', de: 'Einzelne Wörter und Sätze' },
      },
      {
        value: 'some_courses',
        label: {
          en: 'I have completed one or more German courses',
          de: 'Ich habe einen oder mehrere Deutschkurse abgeschlossen',
        },
      },
      {
        value: 'years',
        label: {
          en: 'I have used German regularly for several years',
          de: 'Ich benutze Deutsch seit mehreren Jahren regelmäßig',
        },
      },
    ],
  },
  {
    id: 'goal',
    label: {
      en: 'What is your main goal with German?',
      de: 'Was ist Ihr wichtigstes Ziel mit Deutsch?',
    },
    help: {
      en: 'Your teacher sees this when checking the recommendation. It does not change your score.',
      de: 'Ihre Lehrkraft sieht diese Angabe bei der Prüfung der Empfehlung. Sie verändert Ihr Testergebnis nicht.',
    },
    options: [
      { value: 'study', label: { en: 'Study or university entry', de: 'Studium oder Studienzugang' } },
      { value: 'work', label: { en: 'Work or professional recognition', de: 'Beruf oder Anerkennung' } },
      { value: 'life', label: { en: 'Everyday life in Germany', de: 'Alltag in Deutschland' } },
      { value: 'exam', label: { en: 'A specific exam', de: 'Eine bestimmte Prüfung' } },
    ],
  },
  {
    id: 'lastContact',
    label: {
      en: 'When did you last use German regularly?',
      de: 'Wann haben Sie zuletzt regelmäßig Deutsch benutzt?',
    },
    help: {
      en: 'A long gap is normal and does not count against you. It tells your teacher what to expect in week one.',
      de: 'Eine längere Pause ist normal und wird nicht negativ gewertet. Sie zeigt Ihrer Lehrkraft, was in der ersten Woche zu erwarten ist.',
    },
    options: [
      { value: 'now', label: { en: 'I use it now', de: 'Ich benutze es aktuell' } },
      { value: 'recent', label: { en: 'Within the last year', de: 'Im letzten Jahr' } },
      { value: 'a_while', label: { en: 'One to three years ago', de: 'Vor einem bis drei Jahren' } },
      { value: 'long_ago', label: { en: 'Longer ago than that', de: 'Noch länger her' } },
    ],
  },
] as const;

/** Whether an intake answer set means the learner should skip testing. */
export function isDirectBeginner(priorLearning: string): boolean {
  return priorLearning === NO_PRIOR_GERMAN;
}
