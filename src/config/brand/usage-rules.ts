import type { HeroPageKey } from '@/lib/content/types';

export const ctaHierarchyByPage: Record<
  HeroPageKey,
  {
    primary: string;
    secondary: string;
    tertiary: string;
  }
> = {
  home: {
    primary: 'Find my course',
    secondary: 'Talk to an advisor',
    tertiary: 'Explore specific topic',
  },
  about: {
    primary: 'Talk to admissions',
    secondary: 'Find my course path',
    tertiary: 'Contact admissions',
  },
  courses: {
    primary: 'Reserve course spot',
    secondary: 'Get level recommendation',
    tertiary: 'Contact admissions',
  },
  'course-detail': {
    primary: 'Reserve this course',
    secondary: 'Get level recommendation',
    tertiary: 'Talk to admissions',
  },
  exams: {
    primary: 'Reserve exam seat',
    secondary: 'Check exam dates',
    tertiary: 'Contact admissions',
  },
  'exam-detail': {
    primary: 'Register for exam',
    secondary: 'Contact support',
    tertiary: 'Review exam checklist',
  },
  accommodation: {
    primary: 'Request housing match',
    secondary: 'Reserve course + housing',
    tertiary: 'Contact admissions',
  },
  'accommodation-detail': {
    primary: 'Request accommodation',
    secondary: 'Register with course',
    tertiary: 'Talk to admissions',
  },
  contact: {
    primary: 'Get my CASA plan',
    secondary: 'Get level recommendation',
    tertiary: 'Call office directly',
  },
  faq: {
    primary: 'Contact office',
    secondary: 'Get level recommendation',
    tertiary: 'Browse courses',
  },
  news: {
    primary: 'Open latest updates',
    secondary: 'Find my course path',
    tertiary: 'Contact admissions',
  },
  'news-detail': {
    primary: 'Find my course path',
    secondary: 'Get level recommendation',
    tertiary: 'Talk to admissions',
  },
  'placement-test': {
    primary: 'Request placement',
    secondary: 'Continue to registration',
    tertiary: 'Contact admissions',
  },
  'registration-course': {
    primary: 'Complete registration',
    secondary: 'Get level recommendation',
    tertiary: 'Need help from admissions',
  },
  'registration-exam': {
    primary: 'Reserve exam seat',
    secondary: 'Check exam dates',
    tertiary: 'Contact admissions',
  },
  imprint: {
    primary: 'Contact office',
    secondary: 'Review legal details',
    tertiary: 'Print page',
  },
  privacy: {
    primary: 'Contact office',
    secondary: 'Review legal details',
    tertiary: 'Print page',
  },
  terms: {
    primary: 'Contact office',
    secondary: 'Review legal details',
    tertiary: 'Print page',
  },
};

export const heroGovernanceRules = [
  'Hero layout anatomy is fixed across pages; only background surface tokens and media vary.',
  'Each hero must include one primary CTA and one secondary CTA only.',
  'Tertiary support actions belong in contextual side panels, not inside hero button groups.',
  'Hero themes must preserve contrast and readable copy on all breakpoints.',
] as const;

export const mediaRules = [
  'Prefer real CASA media with people interaction over generic stock images.',
  'Use landscape assets with clear focal subject and enough safe area for crop.',
  'Always provide meaningful alt text that describes human context, not file content.',
  'Mark temporary placeholders so they can be replaced once authentic media is available.',
] as const;

export const registrationUxStandards = [
  'Single high-contrast form column with clear next-step guidance and no account prerequisites.',
  'Inline validation should be immediate after field touch and persistent.',
  'Every submission error must include a direct support path to contact admissions.',
  'Registration routes must set expectations clearly: CASA follows up by email after review.',
  'Date fields must avoid generic OS-level date pickers. Implement custom-designed controlled calendar inputs with direct dropdown selectors for quick month/year selection.',
] as const;

export const sectionSpacingRules = [
  'Sibling sections must utilize a generous baseline padding of py-16 md:py-20 to prevent a squeezed visual rhythm.',
  'Alternate backgrounds between white (bg-white) and warm soft/slate tone (bg-slate-50/30 or bg-[var(--casa-warm-soft)]/32) to establish content boundaries.',
  'Separate sibling sections with a subtle border divider (border-t border-[color:var(--casa-sand)]/40) when background shifts.',
  'Place distinct page features inside independent <section> wrappers and <Container> components rather than nesting them in a single massive container.',
  'Avoid nested boxing: Do not nest bordered elements (cards inside cards) or place borders inside colored containers. Use flat, borderless inner panels with soft background fills instead.',
  'Border-radius: exactly 3 tiers — rounded-3xl for outer page cards and modals, rounded-xl for internal content boxes and section banners, rounded-lg for inputs, selects, and buttons. rounded-full only for circles. Do not use rounded-md or rounded-2xl in new code.',
] as const;

export const interactionRules = [
  'Letter-spacing: 2 values only — tracking-[0.12em] for primary eyebrow/overline labels, tracking-[0.08em] for secondary metadata and tiny helper text. tracking-tight is allowed on headings. Do not use tracking-wide, tracking-wider, or arbitrary values like 0.10em/0.14em/0.16em/0.18em.',
  'Transition duration: 2 values only — duration-200 for micro-interactions (hover, focus, colour, opacity), duration-300 for layout-affecting transitions (panels expanding, progress bars, slide-ins). Do not use duration-150 or duration-500 in CASA components.',
  'Button height: h-11 (44px) for all standard CTAs and form submit buttons. h-12 (48px) only for marketing/hero variant buttons (variant="marketing-*" or rounded-full hero CTAs). h-10 is reserved for compact icon-only buttons or image max-height constraints. Do not mix heights arbitrarily.',
  'Font weight: 4 values only — font-black for the page H1 and hero stat numbers, kept scarce because Plus Jakarta Sans only loads 400-800 so it renders at 800; font-bold for section headings, card titles, label values, buttons, and counters; font-semibold for eyebrows, uppercase micro-labels, badges, and inline links; font-medium for inline emphasis in body copy. Do not use font-extrabold — it has no defined role in the CASA type scale and would render identically to font-black.',
  'Focus states: all interactive elements must use focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/20 focus-visible:ring-offset-0 focus-visible:outline-none. On dark backgrounds (footer, ink panels) use focus-visible:ring-[var(--casa-sun)]/60 with ring-offset-2. Never use ring-ring (shadcn default) in CASA components.',
] as const;
