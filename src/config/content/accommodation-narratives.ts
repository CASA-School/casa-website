import type { AccommodationNarrative, ContentLocale } from '@/lib/content/types';

/** Accommodation facts checked against CASA's live accommodation pages on
 * 2026-09-16. A private room and self-catering are offered; meals, organised
 * family activities and daily conversation are not included services.
 *
 * The German highlights carry the live pages' own facts again (2026-10-07):
 * where the WGs are, room sizes, bedding, house rules, the host-family fallback
 * when no WG room is free, and respect in the shared home. The index shows the
 * first four of each list; the detail page shows all of them. */
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
      headline: 'CASA-WGs',
      summary: 'In einer CASA-WG hast du ein eigenes Zimmer und teilst den Alltag mit anderen, die in Bremen Deutsch lernen.',
      highlights: [
        'Drei helle WGs liegen im zweiten und dritten Stock unseres Schulgebäudes. Jede hat fünf Zimmer zwischen 14 und 18 m².',
        'Drei weitere WGs liegen woanders in Bremen. Alle sind mit Bus und Straßenbahn zu erreichen.',
        'Dein Zimmer ist möbliert, und Kissen, Decke und Bettwäsche liegen bereit. Mitbringen musst du nur Handtücher und deine persönlichen Sachen.',
        'Küche und Bad teilst du dir mit den anderen. Die Küche ist voll ausgestattet, und WLAN gibt es auch.',
        'Wie in einer typischen WG in Deutschland versorgst du dich selbst und kümmerst dich zusammen mit den anderen um die Sauberkeit. Rauchen ist nicht erlaubt.',
        'In unseren WGs leben Menschen aus vielen Ländern zusammen. Deshalb sind Respekt und Offenheit füreinander hier besonders wichtig.',
        'WG-Zimmer gibt es nur für volljährige Teilnehmende unserer Intensivkurse, und wir haben nur wenige davon. Ist bei deiner Ankunft keins frei, vermitteln wir dir ein Zimmer bei einer Gastfamilie.',
      ],
    },
    {
      id: 'host',
      locale: 'de',
      headline: 'Gastfamilien',
      summary: 'Bei einer Gastfamilie wohnst du in einem eigenen Zimmer in einem Bremer Haushalt. So knüpfst du gleich erste Kontakte und kannst dein Deutsch direkt im Alltag ausprobieren.',
      highlights: [
        'Du wohnst in einem eigenen möblierten Zimmer, in dem du alles Nötige findest.',
        'Küche und Bad teilst du dir in der Regel mit deinen Gastgebern. In der Küche bereitest du dir deine Mahlzeiten selbst zu.',
        'Gäste und Gastgeber begegnen der Kultur des anderen mit Respekt und Offenheit. So wird der Aufenthalt für alle zu einer schönen Erfahrung.',
        'Ein Zimmer bei einer Gastfamilie gibt es nur für Teilnehmende unserer Intensivkurse.',
      ],
    },
  ],
};
