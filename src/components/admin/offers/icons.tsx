import type { ReactNode } from 'react';

import ui from './offers.module.css';

/** The offers screens' small line icons, drawn on a 16-unit grid. */
const svg = (d: ReactNode) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

export const ICONS = {
  calendar: svg(<><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 7h11M5.5 2v3M10.5 2v3" /></>),
  people: svg(<><circle cx="6" cy="5.5" r="2.3" /><path d="M2 13.5a4 4 0 0 1 8 0" /><path d="M11 4a2 2 0 0 1 0 4M12 13.5a3.5 3.5 0 0 0-1.6-2.9" /></>),
  person: svg(<><circle cx="8" cy="5.5" r="2.6" /><path d="M3 14a5 5 0 0 1 10 0" /></>),
  language: svg(<><path d="M2.5 4h7M6 2.5V4M4 4c.5 2.5 2.2 4.4 4.5 5.5M8 4c-.6 2.6-2.4 4.6-5 5.8" /><path d="M9 14l2.5-6 2.5 6M9.8 12h3.4" /></>),
  clock: svg(<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2.2 1.4" /></>),
  hourglass: svg(<><path d="M4 2h8M4 14h8M5 2c0 3 6 3 6 6s-6 3-6 6M11 2c0 3-6 3-6 6s6 3 6 6" /></>),
  pen: svg(<><path d="M10.5 2.5l3 3-8 8H2.5v-3z" /></>),
  book: svg(<><path d="M3 3.5c1.7-.8 3.4-.8 5 0v10c-1.6-.8-3.3-.8-5 0z" /><path d="M8 3.5c1.6-.8 3.3-.8 5 0v10c-1.7-.8-3.4-.8-5 0" /></>),
  layers: svg(<><path d="M8 2l6 3-6 3-6-3z" /><path d="M2 8l6 3 6-3M2 11l6 3 6-3" /></>),
  house: svg(<><path d="M2.5 7.5L8 3l5.5 4.5V13a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8z" /><path d="M6.5 13.8V10h3v3.8" /></>),
  cup: svg(<><path d="M3 5h8v4a4 4 0 0 1-8 0z" /><path d="M11 6h1a1.5 1.5 0 0 1 0 3h-1M5 2v1.5M7 2v1.5M9 2v1.5" /></>),
  tram: svg(<><rect x="3.5" y="3" width="9" height="8.5" rx="2" /><path d="M3.5 8h9M6 13.5l-1 1.2M10 13.5l1 1.2M6.5 1.5h3" /></>),
  star: svg(<><path d="M8 2l1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z" /></>),
  sparkle: svg(<><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.8 1.8M10.2 10.2L12 12M12 4l-1.8 1.8M5.8 10.2L4 12" /></>),
  package: svg(<><path d="M2.5 5L8 2.5 13.5 5v6L8 13.5 2.5 11z" /><path d="M2.5 5L8 7.5 13.5 5M8 7.5v6" /></>),
  plus: svg(<><path d="M8 3v10M3 8h10" /></>),
  minus: svg(<><path d="M3 8h10" /></>),
  share: svg(<><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="4" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3" /></>),
  search: svg(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>),
  school: svg(<><path d="M1.5 6L8 3l6.5 3L8 9z" /><path d="M4 7.3V11c1.2 1.2 2.6 1.8 4 1.8s2.8-.6 4-1.8V7.3M14.5 6v4" /></>),
  building: svg(<><rect x="3" y="2.5" width="10" height="11" rx="1" /><path d="M6 5.5h1M9 5.5h1M6 8h1M9 8h1M7 13.5v-2.5h2v2.5" /></>),
  globe: svg(<><circle cx="8" cy="8" r="5.5" /><path d="M2.5 8h11M8 2.5c1.6 1.6 2.4 3.4 2.4 5.5S9.6 11.9 8 13.5C6.4 11.9 5.6 10.1 5.6 8S6.4 4.1 8 2.5z" /></>),
  mail: svg(<><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2.5 4.5L8 8.5l5.5-4" /></>),
  repeat: svg(<><path d="M3 7a4.5 4.5 0 0 1 8-2.8M13 9a4.5 4.5 0 0 1-8 2.8" /><path d="M11 2v2.5H8.5M5 14v-2.5h2.5" /></>),
};

export type Tint = 'red' | 'blue' | 'sun' | 'ink' | 'green';

export function Chip({ tint, icon, big }: { tint: Tint; icon: ReactNode; big?: boolean }) {
  return <span className={`${big ? ui.incIcon : ui.factIcon} ${ui[`tint_${tint}`]}`}>{icon}</span>;
}
