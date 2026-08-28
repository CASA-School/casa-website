import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

import {
  HeroBleedPhoto,
  HeroLede,
  HeroSurface,
  type HeroAction,
  type HeroFact,
  type HeroPhoto,
  type HeroProofItem,
} from './shared';

type HeroDGalleryProps = {
  eyebrow: string;
  title: string;
  description: string;
  /**
   * One photograph is rendered. The prop was a fixed 3-tuple for the old mosaic;
   * it is a plain array now so a call site passes the single image it means.
   */
  photos: HeroPhoto[];
  ctas: HeroAction[];
  /**
   * The decision figures, set as a rail under the actions. /accommodation passes
   * its four costs; /accommodation/become-host passes none, because a household
   * offering a room is not choosing between price points.
   */
  facts?: HeroFact[];
  proofItems?: HeroProofItem[];
  themeClassName?: string;
  /**
   * Forwarded to HeroSurface, which renders them above the h1 like every other
   * hero. Without this prop, /accommodation/become-host had to place its own
   * breadcrumb band BELOW the hero — so the one page using this hero put its
   * breadcrumbs in a different position from its two sibling pages.
   */
  breadcrumbs?: BreadcrumbItem[];
};

/**
 * The accommodation hero — the homepage's composition, sharing its code.
 *
 * WHAT CHANGED, AND WHY IT WAS THE SAME FIX TWICE.
 *
 * This hero used to render a three-image mosaic; that became one photograph in a
 * rounded `MediaFrame` with a caption under it. Measured against the homepage at
 * 1440px, the single frame was still the odd one out in every dimension that
 * matters: h1 51.2px against 64px, weight 900 against 700, and a photograph
 * placed ON the ground as a bordered card instead of masked INTO it. The page a
 * visitor reaches from the homepage nav looked like it came from another site.
 *
 * So the composition is not re-implemented here — it is `HeroLede` plus
 * `HeroBleedPhoto`, the same two components the homepage hero is made of, in the
 * homepage's own `0.92fr / 1.08fr` grid. The only thing this file still decides
 * is that accommodation carries a cost rail and the homepage does not.
 *
 * The photo caption is gone with the frame. A caption needs an edge to sit
 * under, and a photograph that dissolves into the page has none; the alt text
 * still describes the room.
 *
 * `photos` stays an array rather than a single `photo` prop so the archetype
 * registry and the e2e assertion are untouched (/accommodation is pinned to
 * archetype D). Only the first photograph is rendered.
 */
export function HeroDGallery({
  eyebrow,
  title,
  description,
  photos,
  ctas,
  facts,
  themeClassName = 'hero-theme-accommodation',
  breadcrumbs,
}: HeroDGalleryProps) {
  const [lead] = photos;

  return (
    <HeroSurface
      themeClassName={themeClassName}
      archetype="D"
      breadcrumbs={breadcrumbs}
      className="overflow-x-clip"
    >
      {/*
        `lg:items-stretch`, and the photograph takes the row height.

        The homepage centres its two columns because its lede is shorter than its
        photograph, so centring is what balances them. Here the cost rail makes
        the lede TALLER than a 33rem photo, and centring left the photograph
        floating in a 632px row with empty bands above and below it. Stretching
        is the same intent — the two columns read as one block — applied to a
        column that is now the taller of the two.
      */}
      <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch lg:gap-6">
        <HeroLede
          eyebrow={eyebrow}
          title={title}
          description={description}
          ctas={ctas}
          facts={facts}
          /*
            No `lg:py-6`. The homepage pads its lede to balance a column that is
            shorter than the photograph beside it; here the cost rail already
            makes this the taller column, so the same padding only adds 48px of
            hero height for nothing.
          */
        />

        {lead ? (
          <HeroBleedPhoto photo={lead} className="lg:h-full" sizes="(min-width: 1024px) 56vw, 100vw" />
        ) : null}
      </div>
    </HeroSurface>
  );
}
