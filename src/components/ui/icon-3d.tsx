import Image from 'next/image';

import type { Icon3D as Icon3DSpec } from '@/config/icons-3d';
import { cn } from '@/lib/utils';

/**
 * A 3D icon (config/icons-3d.ts). It moves when the link or button it sits in is hovered or
 * focused: a springy lift, then the icon's own motion (globals.css, `[data-icon-3d]`). The file
 * is already 160px WebP, so it is served as it is, not through the image optimizer.
 */
export function Icon3D({ icon, className }: { icon: Icon3DSpec; className?: string }) {
  return (
    <span aria-hidden data-icon-3d={icon.motion} className={cn('inline-flex size-10 shrink-0 items-center justify-center', className)}>
      <Image src={`/media/icons/3d/${icon.slug}.webp`} alt="" width={40} height={40} unoptimized draggable={false} className="size-10 select-none" />
    </span>
  );
}
