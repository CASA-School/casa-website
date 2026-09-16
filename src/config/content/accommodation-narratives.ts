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
 * actually differs: a shared flat offers life with fellow learners; a local host offers
 * everyday conversation. Meals must be agreed, never assumed.
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
      summary: 'Get to know everyday life in Bremen with local hosts and a room of your own.',
      highlights: [
        'Opportunities to speak German in everyday conversation at home',
        'A furnished room in a local household',
        'Kitchen access for preparing your own meals; agree any other arrangements with your hosts',
        'Availability and cancellation timing are confirmed before booking',
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
      summary: 'Ein eigenes Zimmer bei Bremer Gastgebern und die Gelegenheit, den Alltag vor Ort kennenzulernen.',
      highlights: [
        'Gelegenheiten, Deutsch auch zu Hause im Gespräch anzuwenden',
        'Ein möbliertes Einzelzimmer in einem privaten Haushalt',
        'Eine Küche zur Selbstverpflegung; weitere Absprachen treffen Sie mit Ihren Gastgebern',
        'Verfügbarkeit und Stornofrist werden vor Buchung bestätigt',
      ],
    },
  ],
};
