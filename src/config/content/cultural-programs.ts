import type { ContentLocale, CulturalProgramItem } from '@/lib/content/types';

// Destinations and meetups reflect CASA's brief. Dates vary with the programme;
// do not turn examples into a promised weekly or monthly schedule.
export const culturalProgramsByLocale: Record<ContentLocale, CulturalProgramItem[]> = {
  en: [
    {
      id: 'tandem',
      locale: 'en',
      title: 'Learning in a language tandem',
      summary: 'Practise your German and share your own language. In a tandem, two people learn from each other. You get talking, see things from a new angle and get to know people in Bremen.',
      cadence: 'Ask about current opportunities',
    },
    {
      id: 'weekend-excursions',
      locale: 'en',
      title: 'Bremen and beyond',
      summary: 'We explore Bremen together and go on trips to places such as Hamburg, Lübeck and other cities in the region. There is time to discover new places, speak German and enjoy each other’s company.',
      cadence: 'Dates depend on the current programme',
    },
    {
      id: 'community-events',
      locale: 'en',
      title: 'Meet people, make friends',
      summary: 'At our get-togethers, learners from different courses meet each other. You can share experiences, make friends and, little by little, feel at home in Bremen.',
      cadence: 'Ask for the current programme',
    },
  ],
  de: [
    {
      id: 'tandem',
      locale: 'de',
      title: 'Im Sprachtandem lernen',
      summary: 'Deutsch üben und die eigene Sprache weitergeben: Im Tandem lernen zwei Menschen voneinander. So entstehen Gespräche, neue Perspektiven und Kontakte in Bremen.',
      cadence: 'Aktuelle Möglichkeiten auf Anfrage',
    },
    {
      id: 'weekend-excursions',
      locale: 'de',
      title: 'Bremen und die Region entdecken',
      summary: 'Gemeinsam erkunden wir Bremen und unternehmen Ausflüge, zum Beispiel nach Hamburg, Lübeck und in andere Städte der Region. Dabei bleibt Zeit zum Entdecken, Deutschsprechen und Zusammensein.',
      cadence: 'Termine je nach aktuellem Programm',
    },
    {
      id: 'community-events',
      locale: 'de',
      title: 'Neue Menschen kennenlernen',
      summary: 'Bei unseren Treffen kommen Teilnehmende aus verschiedenen Kursen zusammen. Hier kannst du Erfahrungen austauschen, Freundschaften schließen und dich nach und nach in Bremen zu Hause fühlen.',
      cadence: 'Aktuelles Programm auf Anfrage',
    },
  ],
};
