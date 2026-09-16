import type { CSSProperties } from 'react';

import type { Level } from './types';

/**
 * Level tints — [tint, ink]. Colour on the board means level and nothing else
 * (docs/KURSPLANUNG.md): the columns and pieces, the tray chips, the Kurse rows
 * and the dialog's level pills all draw from this one table.
 */
export const LEVEL_COLOURS: Record<Level, [string, string]> = {
  A1: ['#d9e8ff', '#1d4f9e'],
  A2: ['#d2f1e6', '#0e6a50'],
  B1: ['#dff0cc', '#3b6a10'],
  'B1+': ['#e4e0fa', '#4b3a98'],
  B2: ['#fadce3', '#9b2447'],
  C1: ['#e1e7ee', '#2e4358'],
  C1H: ['#edd8ee', '#742e7e'],
};

/** The two custom properties the stylesheets read: `--lt` (tint) and `--li` (ink). */
export const levelStyle = (level: Level) => ({ '--lt': LEVEL_COLOURS[level][0], '--li': LEVEL_COLOURS[level][1] }) as CSSProperties;
