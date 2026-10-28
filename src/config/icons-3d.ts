/**
 * The desktop menu's 3D icons (Rahman 2026-10-28, after Airbnb's): one per dropdown item, by
 * its link. The pictures are Microsoft's Fluent Emoji 3D (MIT), fetched and resized by
 * scripts/media/fetch_fluent_icons.py into public/media/icons/3d/. The phone menu shows them
 * too (where they play their motion as a panel opens); an item without an entry keeps its line icon.
 *
 * `motion` is what the icon does when its row is hovered or focused (globals.css,
 * `[data-icon-3d]`): `hop` jumps, `wobble` rocks, `float` rises and settles, `sway` bends like a
 * plant. Every motion is off under prefers-reduced-motion.
 */
export type Icon3DMotion = 'hop' | 'wobble' | 'float' | 'sway';

export type Icon3D = { slug: string; motion: Icon3DMotion };

export const menuIcons3d: Record<string, Icon3D> = {
  '/courses/intensive-german': { slug: 'books', motion: 'hop' },
  '/courses/evening-course': { slug: 'crescent-moon', motion: 'float' },
  '/courses/special-courses': { slug: 'memo', motion: 'wobble' },
  '/courses/german-for-medical': { slug: 'stethoscope', motion: 'sway' },
  '/courses/bildungszeit': { slug: 'spiral-calendar', motion: 'hop' },
  '/courses/firmenunterricht': { slug: 'office-building', motion: 'hop' },
  '/accommodation/flat': { slug: 'houses', motion: 'hop' },
  '/accommodation/host': { slug: 'house-with-garden', motion: 'hop' },
  '/accommodation/become-host': { slug: 'key', motion: 'wobble' },
  '/exams/b2': { slug: 'pencil', motion: 'wobble' },
  '/exams/c1': { slug: 'graduation-cap', motion: 'float' },
  '/about/nonprofit': { slug: 'seedling', motion: 'sway' },
  '/team': { slug: 'busts-in-silhouette', motion: 'hop' },
  '/partners': { slug: 'handshake', motion: 'wobble' },
  '/calculator': { slug: 'abacus', motion: 'wobble' },
  '/careers': { slug: 'briefcase', motion: 'hop' },
  '/contact': { slug: 'speech-balloon', motion: 'float' },
  '/news': { slug: 'newspaper', motion: 'wobble' },
  '/courses/levels': { slug: 'bar-chart', motion: 'hop' },
  '/resources/study-in-germany': { slug: 'globe-showing-europe-africa', motion: 'sway' },
};

/*
 * The card sets that show 3D icons too (Rahman 2026-10-28): the choices and the features that
 * say what CASA is. Forms, search, buttons and the workspace keep their line icons.
 */

/** „Unsere Merkmale": the five tiles without a photograph (config/content/school-features). */
export const schoolFeatureIcons3d: Record<string, Icon3D> = {
  materials: { slug: 'open-book', motion: 'hop' },
  cafeteria: { slug: 'hot-beverage', motion: 'float' },
  digital: { slug: 'desktop-computer', motion: 'hop' },
  advice: { slug: 'light-bulb', motion: 'wobble' },
  'language-cafe': { slug: 'globe-with-meridians', motion: 'sway' },
};

/** „Wo startest du?" on the homepage (components/sections/persona-pathways). */
export const personaIcons3d: Record<string, Icon3D> = {
  'new-learners': { slug: 'compass', motion: 'wobble' },
  'working-professionals': { slug: 'briefcase', motion: 'hop' },
  'exam-candidates': { slug: 'pencil', motion: 'wobble' },
  'housing-onboarding': { slug: 'luggage', motion: 'hop' },
};

/** The contact form's topics (components/forms/contact-inquiry-form). */
export const contactTopicIcons3d: Record<string, Icon3D> = {
  'website-feedback': { slug: 'laptop', motion: 'hop' },
  'course-advice': { slug: 'books', motion: 'hop' },
  'exam-registration': { slug: 'pencil', motion: 'wobble' },
  'accommodation-support': { slug: 'house-with-garden', motion: 'hop' },
  'group-booking': { slug: 'busts-in-silhouette', motion: 'hop' },
  'company-courses': { slug: 'office-building', motion: 'hop' },
  other: { slug: 'speech-balloon', motion: 'float' },
};
