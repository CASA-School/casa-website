import type { ContentLocale, CulturalProgramItem } from '@/lib/content/types';

// Destinations and meetups reflect CASA's brief. Dates vary with the programme;
// do not turn examples into a promised weekly or monthly schedule.
export const culturalProgramsByLocale: Record<ContentLocale, CulturalProgramItem[]> = {
  en: [
    {
      id: 'tandem',
      locale: 'en',
      title: 'Language exchange',
      summary: 'Practise German in conversation and share your own language with a tandem partner. It is a chance to learn from each other and get to know someone in Bremen.',
      cadence: 'Ask about current opportunities',
    },
    {
      id: 'weekend-excursions',
      locale: 'en',
      title: 'Bremen and beyond',
      summary: 'Explore Bremen together and join trips to places such as Hamburg, Lübeck and other cities in the region. Discover somewhere new, enjoy a day out and use your German along the way.',
      cadence: 'Dates depend on the current programme',
    },
    {
      id: 'community-events',
      locale: 'en',
      title: 'Meet people, make friends',
      summary: 'Our meetups bring students from different courses together. Spend time with people from around the world, share experiences and build friendships beyond your classroom.',
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
      summary: 'Bei unseren Treffen kommen Teilnehmende aus verschiedenen Kursen zusammen. Hier können Sie Erfahrungen austauschen, Freundschaften schließen und sich nach und nach in Bremen zu Hause fühlen.',
      cadence: 'Aktuelles Programm auf Anfrage',
    },
  ],
};
