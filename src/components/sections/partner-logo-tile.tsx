import Image from 'next/image';

import type { PartnerProgramme } from '@/config/content/partners';
import { cn } from '@/lib/utils';

type PartnerLogoTileProps = {
  partner: Pick<PartnerProgramme, 'name' | 'logo'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClassName = {
  sm: 'h-16 w-full',
  md: 'h-20 w-52',
  lg: 'h-24 w-60',
} as const;

/**
 * A partner's logo on its own tile, white or ink, so every mark sits on the
 * ground it was drawn for (src/config/content/partners.ts). Renders nothing for
 * a partner without a logo.
 */
export function PartnerLogoTile({ partner, size = 'md', className }: PartnerLogoTileProps) {
  if (!partner.logo) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center rounded-xl px-5',
        sizeClassName[size],
        size === 'sm' && 'justify-center px-4',
        partner.logo.onDark ? 'bg-[var(--casa-ink-deep)]' : 'bg-white ring-1 ring-[color:var(--casa-sand)]',
        className
      )}
    >
      <Image
        src={partner.logo.src}
        alt={partner.name}
        width={partner.logo.width}
        height={partner.logo.height}
        className={cn('max-h-[70%] w-full object-contain', size === 'sm' ? 'object-center' : 'object-left')}
      />
    </div>
  );
}
