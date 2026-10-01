import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

import { HeroBleedPhoto, HeroLede, HeroSurface, type HeroAction, type HeroFact, type HeroPhoto, type HeroProofItem } from './shared';

type HeroHomePhotoProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  facts?: HeroFact[];
  proofItems?: HeroProofItem[];
  themeClassName?: string;
  /**
   * Optional. The homepage passes none; a subpage using this hero needs them.
   *
   * Archetype D has forwarded breadcrumbs since /accommodation/become-host had to
   * render its own band below the hero for want of it. A needs the same for the
   * same reason: /courses/german-for-groups moved onto this hero in 41d2b05, and a
   * course page two levels deep cannot drop its breadcrumb trail on the way.
   */
  breadcrumbs?: BreadcrumbItem[];
};

/**
 * Editorial photo hero — copy left, photograph dissolving into the right edge.
 *
 * This is the site's reference hero, and it is now two shared parts rather than
 * one page's private layout: `HeroLede` owns the type scale and the CTA policy,
 * `HeroBleedPhoto` owns the photograph. /accommodation composes the same
 * two, so a change to either lands on both pages instead of on one.
 *
 * Three things were removed rather than restyled, and the removals are the
 * point:
 *
 *   - The pill chip under the description ("Course advice, telc preparation…")
 *     restated the description in a smaller, harder-to-read box.
 *   - The trust-badge row (Bremen · Community-first · Exam pathways · …) was
 *     four unlinked words that promised navigation and delivered none.
 *   - The second CTA. Two buttons do not offer a choice, they defer one — see
 *     the TextCta doc comment for the rule this site already follows.
 *
 * What is left is one eyebrow, one headline, one sentence, one button.
 */
export function HeroHomePhoto({
  eyebrow,
  title,
  description,
  ctas,
  photo,
  facts,
  themeClassName = 'hero-theme-plain',
  breadcrumbs,
}: HeroHomePhotoProps) {
  return (
    <HeroSurface
      themeClassName={themeClassName}
      archetype="A"
      breadcrumbs={breadcrumbs}
      className="overflow-x-clip"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
        <HeroLede
          eyebrow={eyebrow}
          title={title}
          description={description}
          ctas={ctas}
          facts={facts}
          className="lg:py-6"
        />

        <HeroBleedPhoto photo={photo} />
      </div>
    </HeroSurface>
  );
}
