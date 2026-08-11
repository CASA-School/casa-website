import type { ContentLocale, CulturalProgramItem } from '@/lib/content/types';

export const culturalProgramsByLocale: Record<ContentLocale, CulturalProgramItem[]> = {
  en: [
    {
      id: 'tandem',
      locale: 'en',
      title: 'Tandem Language Partners',
      summary:
        'Students meet native or advanced speakers for guided conversation exchange and confidence building.',
      cadence: 'Weekly',
    },
    {
      id: 'weekend-excursions',
      locale: 'en',
      title: 'Weekend Excursions',
      summary:
        'Organized trips to hand-picked destinations give learners the chance to practice German in real-world settings. Highlights include the Universum Science Center Bremen (technology, nature, humankind), the Klimahaus Bremerhaven 8° Ost (a journey along the 8th meridian), Weser harbour tours, and day trips to Groningen, Hamburg, and the island of Norderney.',
      cadence: 'Twice monthly',
    },
    {
      id: 'community-events',
      locale: 'en',
      title: 'Community Culture Events',
      summary:
        'Shared events, intercultural evenings, and practical orientation activities connect students across levels.',
      cadence: 'Monthly',
    },
  ],
  de: [
    {
      id: 'tandem',
      locale: 'de',
      title: 'Tandem-Sprachpartnerschaften',
      summary:
        'Lernende treffen Muttersprachlerinnen, Muttersprachler oder Fortgeschrittene für begleitete Gesprächspraxis.',
      cadence: 'Wöchentlich',
    },
    {
      id: 'weekend-excursions',
      locale: 'de',
      title: 'Wochenend-Exkursionen',
      summary:
        'Gemeinsame Ausflüge zu ausgewählten Zielen verbinden Sprachanwendung mit Kultur und Orientierung. Auf dem Programm stehen u. a. das Universum Science Center Bremen (Technik, Natur, Mensch), das Klimahaus Bremerhaven 8° Ost (eine Reise entlang des achten Längengrads), Weser- und Hafenrundfahrten sowie Tagesausflüge nach Groningen, Hamburg und auf die Insel Norderney.',
      cadence: 'Zweimal im Monat',
    },
    {
      id: 'community-events',
      locale: 'de',
      title: 'Community- und Kulturveranstaltungen',
      summary:
        'Interkulturelle Abende und gemeinschaftliche Formate schaffen Begegnung über Kursgrenzen hinweg.',
      cadence: 'Monatlich',
    },
  ],
};
