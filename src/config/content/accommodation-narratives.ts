import type { AccommodationNarrative, ContentLocale } from '@/lib/content/types';

/** Accommodation facts checked against CASA's live accommodation pages on
 * 2026-09-16. A private room and self-catering are offered; meals, organised
 * family activities and daily conversation are not included services. */
export const accommodationNarrativesByLocale: Record<ContentLocale, AccommodationNarrative[]> = {
  en: [
    {
      id: 'flat',
      locale: 'en',
      headline: 'Shared flats',
      summary: 'Your own room, a shared kitchen and people to come home to after class.',
      highlights: [
        'Private room with furnished essentials',
        'Shared kitchen and bathroom',
        'Plan your own day and cook when it suits you',
        'Housemates are usually other international learners',
      ],
    },
    {
      id: 'host',
      locale: 'en',
      headline: 'Host families',
      summary: 'A room of your own in a Bremen home, with a kitchen where you can prepare your meals.',
      highlights: [
        'Your own furnished room in a private household',
        'Kitchen and bathroom are usually shared',
        'Self-catering: you prepare your own meals',
        'Available to participants on CASA intensive courses',
      ],
    },
  ],
  de: [
    {
      id: 'flat',
      locale: 'de',
      headline: 'CASA WGs',
      summary: 'Ein eigenes Zimmer und ein gemeinsamer Alltag mit anderen Menschen, die in Bremen Deutsch lernen.',
      highlights: [
        'Möblierte Einzelzimmer',
        'Gemeinsame Küche und Badnutzung',
        'Den Tag selbst gestalten und kochen, wann es für Sie passt',
        'Sie wohnen in der Regel mit anderen internationalen Kursteilnehmenden zusammen',
      ],
    },
    {
      id: 'host',
      locale: 'de',
      headline: 'Gastfamilien',
      summary: 'Ein eigenes Zimmer in einem Bremer Haushalt. In der Küche können Sie Ihre Mahlzeiten selbst zubereiten.',
      highlights: [
        'Eigenes möbliertes Zimmer in einem privaten Haushalt',
        'Küche und Bad werden in der Regel gemeinsam genutzt',
        'Selbstverpflegung: Sie bereiten Ihre Mahlzeiten selbst zu',
        'Für Teilnehmende der CASA-Intensivkurse',
      ],
    },
  ],
};
