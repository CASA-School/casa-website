import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { StickyInfoCard, type StickyInfoItem } from '@/components/sections/sticky-info-card';

import { HeroPhotoCard, HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroCUtilityRailProps = {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  infoTitle: string;
  infoItems: StickyInfoItem[];
  notes?: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  proofItems?: HeroProofItem[];
  themeClassName?: string;
};

export function HeroCUtilityRail({
  eyebrow,
  title,
  description,
  breadcrumbs,
  infoTitle,
  infoItems,
  notes,
  ctas,
  photo,
  themeClassName = 'hero-theme-default',
}: HeroCUtilityRailProps) {
  return (
    <HeroSurface themeClassName={themeClassName} breadcrumbs={breadcrumbs} archetype="C">
      <div className="grid items-start gap-10 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
          <HeroPhotoCard photo={photo} className="min-h-[220px] max-w-2xl" priority />
        </div>

        <div className="lg:pt-2">
          <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} ctas={ctas} className="lg:static" />
        </div>
      </div>


    </HeroSurface>
  );
}
