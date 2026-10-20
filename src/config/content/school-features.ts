import type { Meaning } from '@/config/brand/meaning';
import { say } from '@/lib/cms/copy';
import type { ContentLocale } from '@/lib/content/types';

/**
 * „Unsere Merkmale": what every course at CASA comes with, as eight cards on each course page with
 * learning goals (CASA's content review, 2026-10-20). It took the place of „Das übst du", which said
 * per course what was practised; that still shows on the course cards of the homepage and the
 * course list. One list, so the eight read the same on every page.
 *
 * Three carry one of CASA's own photographs (registered in photo-numbers.ts, already on the site):
 * the teacher at the screen with her class, the shared breakfast, the walk through Bremen. The
 * other five carry their icon in a badge of the logo colour that means the same (meaning.ts): red
 * for what belongs to the course, yellow for feeling at home, blue for orientation and exchange.
 */
export type SchoolFeatureIcon = 'teachers' | 'atmosphere' | 'materials' | 'cafeteria' | 'digital' | 'advice' | 'language-cafe' | 'culture';

export type SchoolFeature = { icon: SchoolFeatureIcon; label: string; photo?: string; meaning?: Meaning };

export function schoolFeatures(locale: ContentLocale): SchoolFeature[] {
  return [
    { icon: 'teachers', label: say(locale, 'Hochqualifizierte Lehrkräfte', 'Highly qualified teachers'), photo: '/media/casa/team-lesson-wide.webp' },
    { icon: 'atmosphere', label: say(locale, 'Familiäre Atmosphäre', 'A warm, family atmosphere'), photo: '/media/casa/community-shared-meal.webp' },
    { icon: 'materials', label: say(locale, 'CASA-eigenes Zusatzmaterial', 'CASA’s own extra materials'), meaning: 'courses' },
    { icon: 'cafeteria', label: say(locale, 'Nette Gespräche in unserer Cafeteria', 'Friendly conversations in our cafeteria'), meaning: 'arrival' },
    { icon: 'digital', label: say(locale, 'Digitale Raumausstattung', 'Digitally equipped classrooms'), meaning: 'orientation' },
    { icon: 'advice', label: say(locale, 'Persönliche Lernberatung', 'Personal learning advice'), meaning: 'courses' },
    { icon: 'language-cafe', label: say(locale, 'Kostenfreies Sprachcafé für unsere Teilnehmenden', 'A free language café for our learners'), meaning: 'orientation' },
    { icon: 'culture', label: say(locale, 'Kulturelle Angebote', 'Cultural activities'), photo: '/media/casa/group-course-walking-bremen.jpg' },
  ];
}
