import type { ContentLocale, PlacementNarrative } from '@/lib/content/types';

export const placementNarrativesByLocale: Record<ContentLocale, PlacementNarrative> = {
  en: {
    locale: 'en',
    headline: 'Start at the right level and learn faster',
    summary:
      'Placement at the right CEFR level protects motivation and helps every student join a group where progress feels realistic.',
    processSteps: [
      'Choose online or in-person assessment',
      'Receive level recommendation from CASA',
      'Join the best-fit course group',
    ],
    prepChecklist: [
      'Bring previous certificates if available',
      'Share your current language goals',
      'Tell us your preferred start timeframe',
    ],
  },
  de: {
    locale: 'de',
    headline: 'Mit dem passenden Niveau schneller vorankommen',
    summary:
      'Eine passende Einstufung schützt Motivation und sorgt dafür, dass Lernende in Gruppen mit realistischem Fortschritt starten.',
    processSteps: [
      'Online- oder Vor-Ort-Einstufung auswählen',
      'Niveaueinschätzung vom CASA-Team erhalten',
      'In die passende Kursgruppe einsteigen',
    ],
    prepChecklist: [
      'Vorhandene Zertifikate mitbringen',
      'Lernziele kurz beschreiben',
      'Wunschzeitraum für den Kursstart angeben',
    ],
  },
};
