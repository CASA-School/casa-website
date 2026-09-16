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
        'Practise the German you need in an academic setting, from understanding complex texts to presenting and discussing an argument.',
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
        'Zeigen Sie, was Sie auf Deutsch können. Wir informieren Sie über telc Deutsch B2 und unterstützen Sie bei Vorbereitung und Anmeldung.',
      outcomes: ['Stärkeres Lese- und Hörverstehen', 'Mehr Sicherheit im Schreiben', 'Flüssigere mündliche Kommunikation'],
      prepHighlights: ['Strategietraining nach Aufgabentyp', 'Üben mit den Zeitvorgaben der Prüfung', 'Individuelle Fehleranalyse'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'de',
      headline: 'telc C1 Hochschule für die Zulassung an Hochschulen',
      summary:
        'Üben Sie Deutsch für das Studium: anspruchsvolle Texte verstehen, Argumente aufbauen und eigene Standpunkte im Gespräch vertreten.',
      outcomes: ['Mehr akademische Sprachsicherheit', 'Besseres Vorlesungsverstehen', 'Souveräner Umgang mit Prüfungsdruck'],
      prepHighlights: ['Hochschulnahe Aufgaben', 'Prüfungssimulationen', 'Persönliches Feedback zum Weiterlernen'],
    },
  ],
};
