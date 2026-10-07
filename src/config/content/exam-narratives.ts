import type { ContentLocale, ExamNarrative } from '@/lib/content/types';

export const examNarrativesByLocale: Record<ContentLocale, ExamNarrative[]> = {
  en: [
    {
      code: 'telc_b2',
      locale: 'en',
      headline: 'telc Deutsch B2 for your next step',
      summary:
        'Show what you can do in German. We help you understand the telc Deutsch B2 exam, prepare for its tasks and plan your registration.',
      outcomes: ['Practice in reading and listening', 'Stronger writing structure', 'More confidence in speaking'],
      prepHighlights: ['Strategies for each task', 'Practice with exam time limits', 'Individual error correction'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'en',
      headline: 'telc C1 Hochschule for university admission',
      summary:
        'Practise the German you need for university: understanding demanding texts, building an argument and making your case in speech and in writing.',
      outcomes: ['More confidence with academic German', 'Practice understanding academic speech', 'Higher confidence under exam pressure'],
      prepHighlights: ['Academic reading and writing tasks', 'Exam-format simulations', 'Personal feedback on what to work on next'],
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
