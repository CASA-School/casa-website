import Image from 'next/image';

import type { Icon3D as Icon3DSpec } from '@/config/icons-3d';
import { cn } from '@/lib/utils';

/**
 * IconBadge's two sizes, which it stands in for (`md` beside a line of text, `lg` leading a card),
 * and two for the place of a bare line icon: `xs` in the footer's contact lines, `sm` in the
 * contact page's panel.
 */
const SIZES = {
  xs: { box: 'size-5', px: 20 },
  sm: { box: 'size-6', px: 24 },
  md: { box: 'size-10', px: 40 },
  lg: { box: 'size-12', px: 48 },
} as const;

/**
 * A 3D icon (config/icons-3d.ts). It moves when the link, button or card it sits in is hovered
 * or focused: a springy lift, then the icon's own motion (globals.css, `[data-icon-3d]`). The
 * file is already 160px WebP, so it is served as it is, not through the image optimizer.
 */
export function Icon3D({ icon, size = 'md', className }: { icon: Icon3DSpec; size?: keyof typeof SIZES; className?: string }) {
  const { box, px } = SIZES[size];
  return (
    <span aria-hidden data-icon-3d={icon.motion} className={cn('inline-flex shrink-0 items-center justify-center', box, className)}>
      <Image src={`/media/icons/3d/${icon.slug}.webp`} alt="" width={px} height={px} unoptimized draggable={false} className={cn(box, 'select-none')} />
    </span>
  );
}
