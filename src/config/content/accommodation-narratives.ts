import type { AccommodationNarrative, ContentLocale } from '@/lib/content/types';

/**
 * What distinguishes the two options — deliberately NOT what they cost.
 *
 * The price bullets used to live here, per option, and they disagreed: the flat
 * listed "580 EUR for 4 weeks, plus 145 EUR for each additional week" and the
 * 50 EUR placement fee, while the host family listed only "holiday surcharge is
 * planned at 145 EUR per week". Same accommodation price, two different stories
 * about it, and the reader comparing them could only conclude the options were
 * priced differently.
 *
 * They are not. Cost is now stated once, for both, in
 * config/content/accommodation-costs.ts. These highlights carry the thing that
 * actually differs: a shared flat gives you your own rhythm, a host family gives
 * you German at the dinner table.
 *
 * HEADLINES ARE SHORT ON PURPOSE. `headline` and `summary` are the h1 and the
 * lead sentence of the hero on /accommodation/flat and /accommodation/host.
 * Measured at 1280x720 before this, "Shared flats for independent student life"
 * wrapped to THREE lines of 64px type — 240px of headline against the 80px a
 * course format uses — and the hero ran 210px past the fold. Every word added
 * here costs a line of the hero at desktop width, so the distinguishing detail
 * belongs in `highlights` and in the page body, not in the h1.
 */
export const accommodationNarrativesByLocale: Record<ContentLocale, AccommodationNarrative[]> = {
  en: [
    {
      id: 'flat',
      locale: 'en',
      headline: 'Shared flats',
      summary: 'Your own room and your own rhythm, alongside other international learners.',
      highlights: [
        'Private room with furnished essentials',
        'Shared kitchen and bathroom',
        'You keep your own routine — no household mealtimes to plan around',
        'Housemates are usually other international learners',
      ],
    },
    {
      id: 'host',
      locale: 'en',
      headline: 'Host families',
      summary: 'German at the dinner table, in a Bremen household that already hosts learners.',
      highlights: [
        'German spoken at home every day, not only in class',
        'A household that already hosts international learners',
        'Meals and daily rhythm shared with the family',
        'Availability and cancellation timing are confirmed before booking',
      ],
    },
  ],
  de: [
    {
      id: 'flat',
      locale: 'de',
      headline: 'CASA WGs',
      summary: 'Eigenes Zimmer, eigener Tagesrhythmus — zusammen mit anderen internationalen Lernenden.',
      highlights: [
        'Möblierte Einzelzimmer',
        'Gemeinsame Küche und Badnutzung',
        'Eigener Tagesrhythmus, keine gemeinsamen Essenszeiten',
        'Mitbewohnende sind meist andere internationale Lernende',
      ],
    },
    {
      id: 'host',
      locale: 'de',
      headline: 'Gastfamilien',
      summary: 'Deutsch am Küchentisch, in einem Bremer Haushalt mit Gastgeber-Erfahrung.',
      highlights: [
        'Deutsch wird zu Hause täglich gesprochen, nicht nur im Unterricht',
        'Ein Haushalt, der schon internationale Lernende aufnimmt',
        'Mahlzeiten und Tagesablauf werden mit der Familie geteilt',
        'Verfügbarkeit und Stornofrist werden vor Buchung bestätigt',
      ],
    },
  ],
};
