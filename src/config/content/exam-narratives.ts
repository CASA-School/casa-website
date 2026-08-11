import type { ContentLocale, ExamNarrative } from '@/lib/content/types';

export const examNarrativesByLocale: Record<ContentLocale, ExamNarrative[]> = {
  en: [
    {
      code: 'telc_b2',
      locale: 'en',
      headline: 'telc Deutsch B2 for work, training, and daily life confidence',
      summary:
        'A practical certification pathway for learners who need strong independent language use in Germany.',
      outcomes: ['Reliable reading and listening performance', 'Stronger writing structure', 'More fluent spoken interaction'],
      prepHighlights: ['Task strategy drills', 'Timed mock sections', 'Individual error correction'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'en',
      headline: 'telc C1 Hochschule for university admission',
      summary:
        'Focused preparation for academic contexts, including argumentation, text comprehension, and formal output.',
      outcomes: ['Academic language control', 'Lecture-ready listening', 'Higher confidence under exam pressure'],
      prepHighlights: ['University-style prompts', 'Exam-format simulations', 'Feedback with improvement plans'],
    },
    {
      code: 'testdaf',
      locale: 'en',
      headline: 'TestDaF preparation with measurable progress cycles',
      summary:
        'Structured exam training for students targeting higher-education access in Germany.',
      outcomes: ['Stronger cross-skill consistency', 'Improved time management', 'Reduced exam-day stress'],
      prepHighlights: ['Integrated skill sessions', 'Score-oriented checkpoints', 'Mock exam review loops'],
    },
  ],
  de: [
    {
      code: 'telc_b2',
      locale: 'de',
      headline: 'telc Deutsch B2 für Arbeit, Ausbildung und Alltag',
      summary:
        'Ein praxistauglicher Zertifikatsweg für Lernende mit dem Ziel sicherer Sprachkompetenz in Deutschland.',
      outcomes: ['Stärkeres Lese- und Hörverstehen', 'Mehr Sicherheit im Schreiben', 'Flüssigere mündliche Kommunikation'],
      prepHighlights: ['Strategietraining nach Aufgabentyp', 'Zeitgesteuerte Übungsrunden', 'Individuelle Fehleranalyse'],
    },
    {
      code: 'telc_c1_hochschule',
      locale: 'de',
      headline: 'telc C1 Hochschule für die Zulassung an Hochschulen',
      summary:
        'Gezielte Vorbereitung auf akademische Anforderungen mit Fokus auf Argumentation und Textarbeit.',
      outcomes: ['Mehr akademische Sprachsicherheit', 'Besseres Vorlesungsverstehen', 'Souveräner Umgang mit Prüfungsdruck'],
      prepHighlights: ['Hochschulnahe Aufgaben', 'Prüfungssimulationen', 'Feedback mit Entwicklungsplan'],
    },
    {
      code: 'testdaf',
      locale: 'de',
      headline: 'TestDaF-Vorbereitung mit klaren Fortschrittszyklen',
      summary:
        'Strukturiertes Training für Studienbewerberinnen und Studienbewerber mit Hochschulziel in Deutschland.',
      outcomes: ['Mehr Konsistenz in allen Fertigkeiten', 'Besseres Zeitmanagement', 'Mehr Ruhe am Prüfungstag'],
      prepHighlights: ['Verzahnte Fertigkeitstrainings', 'Leistungsorientierte Zwischenziele', 'Systematische Mock-Auswertung'],
    },
  ],
};
