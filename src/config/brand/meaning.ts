/**
 * WHAT EACH LOGO COLOUR MEANS (2026-10-01), as on CASA's printed materials:
 * blue = orientation, exchange and tandem; red = language courses; ink =
 * exams; yellow = accommodation and arrival. The tokens and their contrast
 * ratios are in globals.css beside --casa-blue-tint.
 *
 * `bar` is the raw colour, for a card's top edge. `circle` is the icon's round
 * tinted ground with the icon in the AA text colour. `link` is the card's text
 * link. `hover` tints the card and its ring while the still frame around it (`group/lift`) is
 * hovered, so a lifting card does not slip out from under the pointer.
 */
export type Meaning = 'orientation' | 'courses' | 'exams' | 'arrival';

export const meaningClasses: Record<Meaning, { bar: string; circle: string; link: string; hover: string }> = {
  orientation: {
    bar: 'bg-[var(--casa-blue)]',
    circle: 'bg-[var(--casa-blue-tint)] text-[var(--casa-accent-text)]',
    link: 'text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]',
    hover: 'group-hover/lift:bg-[var(--casa-blue)]/5 group-hover/lift:ring-[color:var(--casa-blue)]/35',
  },
  courses: {
    bar: 'bg-[var(--casa-red)]',
    circle: 'bg-[var(--casa-red-tint)] text-[var(--casa-red-text)]',
    link: 'text-[var(--casa-red-text)] hover:text-[var(--casa-red-text-hover)]',
    hover: 'group-hover/lift:bg-[var(--casa-red)]/[0.04] group-hover/lift:ring-[color:var(--casa-red)]/30',
  },
  exams: {
    bar: 'bg-[var(--casa-ink-deep)]',
    circle: 'bg-[var(--casa-ink-tint)] text-[var(--casa-ink)]',
    link: 'text-[var(--casa-ink)] hover:text-[var(--casa-ink-deep-hover)]',
    hover: 'group-hover/lift:bg-[var(--casa-ink-deep)]/[0.03] group-hover/lift:ring-[color:var(--casa-ink-deep)]/30',
  },
  arrival: {
    bar: 'bg-[var(--casa-sun)]',
    circle: 'bg-[var(--casa-sun-tint)] text-[var(--casa-sun-text)]',
    link: 'text-[var(--casa-sun-text)] hover:text-[var(--casa-sun-text-hover)]',
    hover: 'group-hover/lift:bg-[var(--casa-sun)]/[0.06] group-hover/lift:ring-[color:var(--casa-sun)]/60',
  },
};

/** A search result's colour, by what it is (the search page and the header's search). */
export const searchResultMeaning = {
  pages: 'orientation',
  courses: 'courses',
  exams: 'exams',
  faq: 'orientation',
  news: 'orientation',
} as const satisfies Record<string, Meaning>;
