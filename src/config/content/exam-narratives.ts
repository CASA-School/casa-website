import type { ContentLocale, ExamNarrative } from '@/lib/content/types';

export const examNarrativesByLocale: Record<ContentLocale, ExamNarrative[]> = {
  en: [
    {
      code: 'telc_b2',
      locale: 'en',
      headline: 'telc Deutsch B2 for work, training and everyday life',
      summary:
        'With telc Deutsch B2 you show what you can do in German. We explain how the exam works and help you prepare and register.',
      outcomes: ['Better reading and listening comprehension', 'More confidence in writing', 'More fluent spoken communication'],
      prepHighlights: ['Strategies for each type of task', 'Practice with the exam time limits', 'Individual analysis of your mistakes'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'en',
      headline: 'telc Deutsch C1 Hochschule for university admission',
      // Who the exam is for, after the old casa-bremen.de page, as in German.
      summary:
        'telc Deutsch C1 Hochschule tests your German at a very advanced level, as you need it for university. The exam is for you if you want to prove your German because you plan to study at a German-speaking university, are already a student or work in an academic profession.',
      outcomes: ['More confidence with academic German', 'Better understanding of lectures', 'Staying calm under exam pressure'],
      prepHighlights: ['University-style tasks', 'Mock exams', 'Personal feedback on what to work on next'],
    },
  ],
  de: [
    {
      code: 'telc_b2',
      locale: 'de',
      headline: 'telc Deutsch B2 für Arbeit, Ausbildung und Alltag',
      summary:
        'Mit telc Deutsch B2 zeigst du, was du auf Deutsch kannst. Wir erklären dir, wie die Prüfung abläuft, und helfen dir bei der Vorbereitung und bei der Anmeldung.',
      outcomes: ['Stärkeres Lese- und Hörverstehen', 'Mehr Sicherheit im Schreiben', 'Flüssigere mündliche Kommunikation'],
      prepHighlights: ['Strategietraining nach Aufgabentyp', 'Üben mit den Zeitvorgaben der Prüfung', 'Individuelle Fehleranalyse'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'de',
      headline: 'telc C1 Hochschule für die Zulassung an Hochschulen',
      // Who the exam is for, after the old casa-bremen.de page (2026-10-07).
      summary:
        'telc Deutsch C1 Hochschule prüft Deutschkenntnisse für die Hochschule auf weit fortgeschrittenem Niveau. Die Prüfung ist für dich, wenn du an einer deutschsprachigen Hochschule studieren möchtest, schon studierst oder in einem akademischen Beruf arbeitest und deine Deutschkenntnisse nachweisen möchtest.',
      outcomes: ['Mehr akademische Sprachsicherheit', 'Besseres Vorlesungsverstehen', 'Souveräner Umgang mit Prüfungsdruck'],
      prepHighlights: ['Hochschulnahe Aufgaben', 'Prüfungssimulationen', 'Persönliches Feedback zum Weiterlernen'],
    },
  ],
};
