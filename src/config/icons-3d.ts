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
  '/resources/language-tandem': { slug: 'globe-with-meridians', motion: 'sway' },
};

/*
 * Where else 3D icons stand (Rahman 2026-10-28): the choices and the features that say what CASA
 * is, the registration forms' choices and step headers, and the school's contact lines. Form
 * fields, search, buttons, arrows and the workspace keep their line icons.
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
/** The non-profit page's programmes and the Förderverein (components/sections/nonprofit-programs). */
export const nonprofitIcons3d = {
  freePlaces: { slug: 'handshake', motion: 'wobble' },
  meeting: { slug: 'hot-beverage', motion: 'float' },
  advice: { slug: 'light-bulb', motion: 'wobble' },
  tandem: { slug: 'globe-with-meridians', motion: 'sway' },
  foerderverein: { slug: 'seedling', motion: 'sway' },
} satisfies Record<string, Icon3D>;

/** The tandem page's two sides of a tandem (resources/language-tandem). */
export const tandemIcons3d = {
  learner: { slug: 'books', motion: 'hop' },
  bremen: { slug: 'house-with-garden', motion: 'float' },
} satisfies Record<string, Icon3D>;

/** CLARA's four starting points, in the order of her quick actions (components/assistant). */
export const claraStartIcons3d: Icon3D[] = [
  { slug: 'books', motion: 'hop' },
  { slug: 'pencil', motion: 'wobble' },
  { slug: 'house-with-garden', motion: 'hop' },
  { slug: 'speech-balloon', motion: 'float' },
];

export const personaIcons3d: Record<string, Icon3D> = {
  'new-learners': { slug: 'compass', motion: 'wobble' },
  'working-professionals': { slug: 'briefcase', motion: 'hop' },
  'exam-candidates': { slug: 'pencil', motion: 'wobble' },
  'housing-onboarding': { slug: 'luggage', motion: 'hop' },
};

/** The registration forms' kinds of course, by the course type's slug (components/registration/course-choices). */
export const courseTypeIcons3d: Record<string, Icon3D> = {
  'intensive-german': { slug: 'books', motion: 'hop' },
  'evening-german': { slug: 'crescent-moon', motion: 'float' },
  'special-courses': { slug: 'memo', motion: 'wobble' },
  'medical-german': { slug: 'stethoscope', motion: 'sway' },
  bildungszeit: { slug: 'spiral-calendar', motion: 'hop' },
  'german-for-groups': { slug: 'busts-in-silhouette', motion: 'hop' },
  'in-company': { slug: 'office-building', motion: 'hop' },
  'exam-preparation': { slug: 'pencil', motion: 'wobble' },
};

/** The exams, by the exam type's code: the exam form and the course form's added exam. */
export const examTypeIcons3d: Record<string, Icon3D> = {
  telc_b2: { slug: 'pencil', motion: 'wobble' },
  telc_c1_hochschule: { slug: 'graduation-cap', motion: 'float' },
};

/** Each form step's header (components/forms/form-styles FormStepHeader) and the course form's stay. */
export const formStepIcons3d = {
  course: { slug: 'graduation-cap', motion: 'float' },
  exam: { slug: 'memo', motion: 'wobble' },
  details: { slug: 'bust-in-silhouette', motion: 'hop' },
  review: { slug: 'clipboard', motion: 'wobble' },
  stay: { slug: 'house-with-garden', motion: 'hop' },
  message: { slug: 'speech-balloon', motion: 'float' },
} satisfies Record<string, Icon3D>;

/** The contact page's „Direkt online" links, by link. */
export const selfServiceIcons3d: Record<string, Icon3D> = {
  '/registration/course': { slug: 'graduation-cap', motion: 'float' },
  '/registration/exam': { slug: 'pencil', motion: 'wobble' },
  '/placement-test': { slug: 'compass', motion: 'wobble' },
};

/** The school's contact lines: the contact page's dark panel and the footer. */
export const contactIcons3d = {
  phone: { slug: 'telephone', motion: 'wobble' },
  email: { slug: 'envelope', motion: 'float' },
  address: { slug: 'round-pushpin', motion: 'hop' },
  hours: { slug: 'alarm-clock', motion: 'wobble' },
} satisfies Record<string, Icon3D>;

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
