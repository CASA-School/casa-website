import type { AccommodationNarrative, ContentLocale } from '@/lib/content/types';

/** Accommodation facts checked against CASA's live accommodation pages on
 * 2026-09-16. A private room and self-catering are offered; meals, organised
 * family activities and daily conversation are not included services.
 *
 * The highlights carry the live pages' own facts again (German 2026-10-07,
 * English to match the same day): where the WGs are, room sizes, bedding, house
 * rules, the host-family fallback when no WG room is free, and respect in the
 * shared home. Both languages keep the same order, so the index shows the same
 * first four of each list; the detail page shows all of them. */
export const accommodationNarrativesByLocale: Record<ContentLocale, AccommodationNarrative[]> = {
  en: [
    {
      id: 'flat',
      locale: 'en',
      headline: 'CASA shared flats',
      summary: 'In a CASA shared flat, you have a room of your own and share everyday life with other people who are learning German in Bremen.',
      highlights: [
        'Three bright flats are on the second and third floors of our school building. Each has five rooms of 14–18 m².',
        'We have three more flats elsewhere in Bremen. All of them can be reached by bus and tram.',
        'Your room is furnished, with a pillow, a duvet and bed linen ready for you. All you need to bring are towels and your personal things.',
        'You share the kitchen and bathroom with the others. The kitchen is fully equipped, and there is Wi-Fi too.',
        'As in a typical German shared flat, you do your own shopping and cooking and share the cleaning with the others. Smoking is not allowed.',
        'People from many countries live together in our flats, so respect and openness towards each other are especially important here.',
        'Rooms in our shared flats are only for intensive-course participants aged 18 or over, and we have just a few of them. If none is free when you arrive, we will find you a room with a host family.',
      ],
    },
    {
      id: 'host',
      locale: 'en',
      headline: 'Host families',
      summary: 'With a host family, you have your own room in a Bremen household. You make your first contacts straight away and can try out your German in everyday life.',
      highlights: [
        'You have your own furnished room with everything you need.',
        'You usually share the kitchen and bathroom with your hosts. You prepare your own meals in the kitchen.',
        'Guests and hosts approach each other’s culture with respect and openness, so the stay is a good experience for everyone.',
        'Rooms with host families are only for participants on our intensive courses.',
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
