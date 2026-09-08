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
 * One action, not two: see the note on the card below.
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
      {/*
        `minmax(0, …)` on BOTH columns, not bare `fr`.

        A bare `1.06fr` is `minmax(auto, 1.06fr)`, so a column never shrinks
        below its content's min-content width and the declared ratio is only a
        ceiling. Measured at exactly 1024px before this: five of the six course
        formats resolved 479 / 425, and Firmenunterricht resolved 528 / 353 —
        because its info card has three rows rather than five and no long date
        string, so its min-content width was smaller and the ratio stopped
        applying. Six pages one nav-click apart, and one of them laid out
        differently at one breakpoint.

        With `minmax(0, …)` the ratio is the ratio, whatever the card holds.
      */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <div>
          <HeroLede eyebrow={eyebrow} title={title} description={description} ctas={[]} />
          {/*
            No `max-w-2xl`. The cap was 42rem and this column runs to 827px from
            1440px up, so the photograph stopped 155px short of its own column
            and the hero grew a ragged right edge that widened with the screen:
            28px of dead space at 1440, 78px at 1536, 155px at 1920 and beyond.
            It fills the column now, at every width.
          */}
          {/*
            `lg:h-80` — 320px, down from HeroPhotoCard's own `md:h-96` (384px).

            The photograph was the largest single item in this column and the
            reason the hero could not fit a 720px or 768px viewport: 112px of
            section padding plus 41px of breadcrumbs plus a 615px column left
            nothing over. 64px off the photograph, with the second card button
            and the trimmed headlines, is what brings every one of these eleven
            pages inside the fold on the two commonest laptop heights.

            Only at `lg`. On a phone the columns are stacked and the photograph
            is not competing with anything, so it keeps its full height.
          */}
          <HeroPhotoCard photo={photo} className="mt-8 lg:h-80" priority />
        </div>

        <div className="lg:pt-2">
          {/*
            ONE BUTTON, and the component decides — not the call site.

            Every page on this hero passed two: Register + Request guidance,
            Reserve exam seat + Get exam guidance, Request housing match + Talk
            to admissions, Apply as host family + View accommodation. In each
            pair the second is a softer version of the first, so the card asked
            the reader to choose how to ask rather than to act — and it cost ~48px
            of card height on every one of the eleven detail pages, which is part
            of why these heroes ran past the fold.

            `slice(0, 1)` here rather than at eleven call sites, for the same
            reason `HeroLede` owns the lede's CTA policy: a rule enforced in the
            component cannot be forgotten by the next page added. Call sites keep
            passing their arrays; the secondary is simply not drawn.

            The dropped routes are not lost — /contact is in the nav, and the
            decision rail further down names the person who answers.
          */}
          <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} ctas={ctas.slice(0, 1)} className="lg:static" />
        </div>
      </div>
    </HeroSurface>
  );
}
