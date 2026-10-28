/**
 * The desktop menu's 3D icons (Rahman 2026-10-28, after Airbnb's): one per dropdown item, by
 * its link. The pictures are Microsoft's Fluent Emoji 3D (MIT), fetched and resized by
 * scripts/media/fetch_fluent_icons.py into public/media/icons/3d/. An item without an entry
 * keeps its line icon; the phone menu keeps its line icons.
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
