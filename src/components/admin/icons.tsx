/**
 * Workspace icons.
 *
 * Drawn here rather than imported, and this is the one place in the repository
 * that is deliberate about it. `lucide-react` resolves through an adapter in
 * this project (see CLAUDE.md, known open items) and its icons are drawn on a
 * 24-unit grid at a 2px stroke; a sidebar needs a 16-unit grid at 1.5px or the
 * icons sit visually heavier than the labels beside them.
 *
 * One box, one stroke width, one grid, one visual weight. Mixed icon sets are
 * the fastest way to make a dashboard look assembled rather than designed.
 */

const box = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-4 w-4',
  'aria-hidden': true,
};

export const Icon = {
  /** Four panes — the overview. */
  overview: (
    <svg {...box}>
      <rect x="2" y="2" width="5" height="5" rx="1.2" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" />
    </svg>
  ),
  /** An open envelope — someone wrote in. */
  enquiries: (
    <svg {...box}>
      <rect x="1.75" y="3.5" width="12.5" height="9" rx="1.4" />
      <path d="M2.25 5 8 8.75 13.75 5" />
    </svg>
  ),
  /** A form with a tick — a completed registration. */
  registrations: (
    <svg {...box}>
      <path d="M4.25 2.5h7.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M5.75 7.5 7.25 9l3-3.25" />
      <path d="M5.75 11.25h4.5" />
    </svg>
  ),
  /** A gauge — the placement test measures. */
  placement: (
    <svg {...box}>
      <path d="M2.25 11.5a6 6 0 1 1 11.5 0" />
      <path d="M8 11.5 10.75 6.5" />
      <circle cx="8" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** Two people — the register of everyone who has been in touch. */
  people: (
    <svg {...box}>
      <circle cx="6" cy="5.25" r="2.25" />
      <path d="M2 13.25a4 4 0 0 1 8 0" />
      <path d="M10.5 3.4a2.1 2.1 0 0 1 0 3.7" />
      <path d="M11.25 9.6a3.6 3.6 0 0 1 2.75 3.65" />
    </svg>
  ),
  /** A ticket — a booked place. */
  bookings: (
    <svg {...box}>
      <path d="M2.5 5.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1.25a1.25 1.25 0 0 0 0 2.5v1.25a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9.25a1.25 1.25 0 0 0 0-2.5V5.5Z" />
      <path d="M6.25 4.5v7" strokeDasharray="1.5 1.5" />
    </svg>
  ),
  /** A door in a wall — rooms. */
  rooms: (
    <svg {...box}>
      <path d="M2.5 13.5h11" />
      <path d="M4.5 13.5V3.4a.9.9 0 0 1 .9-.9h5.2a.9.9 0 0 1 .9.9v10.1" />
      <circle cx="9.4" cy="8.4" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** A small flag — this record needs a look. */
  flag: (
    <svg {...box}>
      <path d="M3.5 14V2.5" />
      <path d="M3.5 3h8.25l-1.5 2.75 1.5 2.75H3.5" />
    </svg>
  ),
  /** A person and a document — a job application. */
  applications: (
    <svg {...box}>
      <circle cx="6" cy="5" r="2.25" />
      <path d="M2.25 13.25a3.75 3.75 0 0 1 7.5 0" />
      <path d="M11 4.5h3M11 7h3M11 9.5h2" />
    </svg>
  ),
  /** Stacked cards — the catalogue of what CASA sells. */
  catalogue: (
    <svg {...box}>
      <rect x="2" y="4.75" width="12" height="8.5" rx="1.3" />
      <path d="M4 4.75V3.4a.9.9 0 0 1 .9-.9h6.2a.9.9 0 0 1 .9.9v1.35" />
      <path d="M2 8.25h12" />
    </svg>
  ),
  /** A calendar — dated cohorts and sittings. */
  calendar: (
    <svg {...box}>
      <rect x="2" y="3.5" width="12" height="10" rx="1.3" />
      <path d="M2 6.5h12M5.5 2.25v2.5M10.5 2.25v2.5" />
    </svg>
  ),
  /** Two people — the staff list. */
  team: (
    <svg {...box}>
      <circle cx="6" cy="5.25" r="2.1" />
      <path d="M2.25 13a3.75 3.75 0 0 1 7.5 0" />
      <path d="M10.5 3.5a2.1 2.1 0 0 1 0 4.1" />
      <path d="M11.25 9.75A3.4 3.4 0 0 1 13.75 13" />
    </svg>
  ),
  /** A cog. */
  settings: (
    <svg {...box}>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.75v1.6M8 12.65v1.6M2.25 8h1.6M12.15 8h1.6M4 4l1.15 1.15M10.85 10.85 12 12M12 4l-1.15 1.15M5.15 10.85 4 12" />
    </svg>
  ),
  /** An arrow leaving a door. */
  signOut: (
    <svg {...box}>
      <path d="M6 2.5H3.5v11H6" />
      <path d="M9.5 5.5 12 8l-2.5 2.5M12 8H6" />
    </svg>
  ),
  /** Back arrow. */
  back: (
    <svg {...box}>
      <path d="M6.5 3.5 2.5 8l4 4.5M2.5 8h11" />
    </svg>
  ),
  /** A magnifier. */
  search: (
    <svg {...box}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3.25 3.25" />
    </svg>
  ),
  /** An exclamation in a triangle — something with a clock on it. */
  attention: (
    <svg {...box}>
      <path d="M8 2.75 14 13H2L8 2.75Z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.25" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** An outward arrow — leaves the workspace. */
  external: (
    <svg {...box}>
      <path d="M6.5 3.5H3.4a.9.9 0 0 0-.9.9v7.2a.9.9 0 0 0 .9.9h7.2a.9.9 0 0 0 .9-.9V9.5" />
      <path d="M9.5 2.5h4v4M13.5 2.5 7.75 8.25" />
    </svg>
  ),
  /** A downward arrow into a tray. */
  download: (
    <svg {...box}>
      <path d="M8 2.5v7M5.25 7l2.75 2.75L10.75 7" />
      <path d="M2.75 11.5v1.1a.9.9 0 0 0 .9.9h8.7a.9.9 0 0 0 .9-.9v-1.1" />
    </svg>
  ),
  /** A speech bubble — a staff note. */
  note: (
    <svg {...box}>
      <path d="M2.5 4.4a.9.9 0 0 1 .9-.9h9.2a.9.9 0 0 1 .9.9v5.2a.9.9 0 0 1-.9.9H6.75L3.5 13.25V10.5h-.1a.9.9 0 0 1-.9-.9V4.4Z" />
    </svg>
  ),
  /** A chevron — this row opens something. */
  chevronRight: (
    <svg {...box}>
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  ),
  /** A tick in a circle. */
  check: (
    <svg {...box}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="m5.5 8.25 1.75 1.75L10.75 6.5" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof Icon;
