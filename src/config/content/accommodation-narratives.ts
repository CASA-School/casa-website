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
 */
export const accommodationNarrativesByLocale: Record<ContentLocale, AccommodationNarrative[]> = {
  en: [
    {
      id: 'flat',
      locale: 'en',
      headline: 'Shared flats for independent student life',
      summary:
        'A practical setup for students who want autonomy while staying connected to an international learning community.',
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
      headline: 'Host families for cultural immersion',
      summary:
        'Ideal for students who want daily spoken German and local cultural experience beyond the classroom.',
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
      headline: 'WGs für selbstständiges Wohnen während des Sprachkurses',
      summary:
        'Eine praktische Wohnform für Lernende, die Unabhängigkeit und internationale Gemeinschaft verbinden wollen.',
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
      headline: 'Gastfamilien für tiefe kulturelle Einblicke',
      summary:
        'Geeignet für Lernende, die Deutsch im Alltag sprechen und das Leben vor Ort intensiv erleben möchten.',
      highlights: [
        'Deutsch wird zu Hause täglich gesprochen, nicht nur im Unterricht',
        'Ein Haushalt, der schon internationale Lernende aufnimmt',
        'Mahlzeiten und Tagesablauf werden mit der Familie geteilt',
        'Verfügbarkeit und Stornofrist werden vor Buchung bestätigt',
      ],
    },
  ],
};
