import type { AccommodationNarrative, ContentLocale } from '@/lib/content/types';

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
        '580 EUR for 4 weeks, plus 145 EUR for each additional week',
        '50 EUR placement fee and 580 EUR refundable deposit',
      ],
    },
    {
      id: 'host',
      locale: 'en',
      headline: 'Host families for cultural immersion',
      summary:
        'Ideal for students who want daily spoken German and local cultural experience beyond the classroom.',
      highlights: [
        'Real-life language exposure every day',
        'Supportive family environment',
        'Holiday surcharge is planned at 145 EUR per week when applicable',
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
        '580 EUR für 4 Wochen, danach 145 EUR je weitere Woche',
        '50 EUR Vermittlungsgebühr und 580 EUR rückerstattbare Kaution',
      ],
    },
    {
      id: 'host',
      locale: 'de',
      headline: 'Gastfamilien für tiefe kulturelle Einblicke',
      summary:
        'Geeignet für Lernende, die Deutsch im Alltag sprechen und das Leben vor Ort intensiv erleben möchten.',
      highlights: [
        'Tägliche Sprachpraxis im echten Alltag',
        'Persönliches Umfeld mit Orientierung',
        'Ferienzuschlag bei Bedarf: 145 EUR pro Woche',
        'Verfügbarkeit und Stornofrist werden vor Buchung bestätigt',
      ],
    },
  ],
};
