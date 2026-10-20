import type { LucideIcon } from 'lucide-react';

import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import { cn } from '@/lib/utils';

/**
 * An icon set on its own: a round ground in the tint of one logo colour, the icon in that colour's
 * text shade at half the badge's width (Rahman, 2026-10-20: „consistent but beautiful and elegant
 * iconography"). The colour is the meaning (config/brand/meaning.ts): red courses, blue orientation
 * and exchange, yellow arrival, ink exams.
 *
 * Two sizes and no others. `md` (40px, icon 20px) beside a line of text: menus, rows, choices,
 * contact cards. `lg` (48px, icon 24px) leading a card or a tile. They replaced eleven badges in
 * five sizes (32–48px), three shapes (circle, rounded square, square) and two kinds of ground
 * (the meaning tints, and translucent blue or coral mixed per call site). The line weight is the
 * same at every size: the icon set draws a 1.5px line whatever the icon's size (globals.css,
 * `[data-casa-icon]`).
 */
const SIZES = {
  md: { badge: 'size-10', icon: 'size-5' },
  lg: { badge: 'size-12', icon: 'size-6' },
} as const;

export function IconBadge({
  icon: Icon,
  meaning,
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  meaning: Meaning;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', meaningClasses[meaning].circle, SIZES[size].badge, className)}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}
