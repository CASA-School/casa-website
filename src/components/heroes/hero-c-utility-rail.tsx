import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { StickyInfoCard, type StickyInfoItem } from '@/components/sections/sticky-info-card';

import { HeroLede, HeroPhotoCard, HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

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

/**
 * Course and exam detail hero — copy over a photograph, facts card beside it.
 *
 * The composition is deliberately NOT the homepage's. A course page's first job
 * is to answer "how many lessons, which levels, what does it cost, and how do I
 * start", and that is the card on the right; a hero that dissolved a photograph
 * across the same space would push those four rows below the fold.
 *
 * What IS shared with the homepage and with /accommodation is the lede: the
 * eyebrow, the headline scale and the CTA policy come from `HeroLede`, so the
 * three heroes a visitor sees in one session agree with each other. This file
 * used to write its own h1 at `text-5xl font-black` with no line-height class,
 * which resolved to 51.2px / weight 900 / line-height 1.05 against the
 * homepage's 64px / 700 / 1.25.
 *
 * The actions live in the card rather than in the lede — a course page's
 * "Register" belongs next to the facts it depends on — so `HeroLede` gets none.
 */
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
        <div>
          <HeroLede eyebrow={eyebrow} title={title} description={description} ctas={[]} />
          <HeroPhotoCard photo={photo} className="mt-8 min-h-[220px] max-w-2xl" priority />
        </div>

        <div className="lg:pt-2">
          <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} ctas={ctas} className="lg:static" />
        </div>
      </div>
    </HeroSurface>
  );
}
