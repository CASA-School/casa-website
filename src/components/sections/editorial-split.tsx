import { CheckCircle2 } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { MediaFrame } from '@/components/ui/media-frame';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EditorialSplitPhoto = {
  src: string;
  alt: string;
  caption: string;
};

type EditorialSplitProps = {
  /**
   * Optional. Course detail pages dropped their section eyebrows — a heading
   * that reads "How learners describe this course" does not need "STORIES" in
   * capitals above it, and 24 uppercase labels were measured on one page. Other
   * surfaces still pass one.
   */
  eyebrow?: string;
  title: string;
  /**
   * The lead beside the photograph: about 200 characters, four lines at desktop.
   * The box is as tall as its photograph, and a longer lead made the text column
   * outgrow it (2026-10-07: 587px of text beside a 368px photo on /team).
   */
  description: string;
  /** Short points, set in a row under the photograph rather than beside it. */
  bullets: string[];
  photo: EditorialSplitPhoto;
  mediaSide?: 'left' | 'right';
  /**
   * `card` (the default since 2026-10-09) stands the block on the page as a
   * white card with the card shadow; `plain` is the same composition with no
   * surface. It used to be the warm panel, but warm is the GUIDANCE surface
   * (steps, prices, what you practise — globals.css, "What each surface is
   * for"), and course pages ran three warm panels back to back: this block,
   * the steps and the story. Now the feature blocks stand up (white + shadow)
   * and the guidance lies flat (warm), so the two alternate down a page.
   */
  tone?: 'card' | 'plain';
  ctas?: Array<{
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
  }>;
  className?: string;
};

/** Three points read as a row; two and four as pairs, four in a row at full width. */
function pointColumns(count: number) {
  if (count === 3) return '@3xl:grid-cols-3';
  if (count === 2) return '@xl:grid-cols-2';
  if (count === 4) return '@xl:grid-cols-2 @5xl:grid-cols-4';
  return count > 4 ? '@xl:grid-cols-2 @5xl:grid-cols-3' : undefined;
}

export function EditorialSplit({
  eyebrow,
  title,
  description,
  bullets,
  photo,
  mediaSide = 'right',
  ctas = [],
  tone = 'card',
  className,
}: EditorialSplitProps) {
  return (
    <section
      data-reveal="true"
      className={cn(
        /*
          The inset is the same in both tones. `plain` drops the fill only:
          dropping the padding too moved the content column 36px left, so a page
          alternating filled and unfilled panels had its text edge stepping in and
          out. Measured on /accommodation/become-host — panel headings at x=76,
          unfilled ones at x=40.
        */
        'casa-editorial-measure @container px-6 py-8 md:px-9 md:py-10',
        tone === 'card' ? 'rounded-3xl bg-white shadow-[var(--shadow-card)]' : undefined,
        className
      )}
    >
      <div
        className={cn(
          'grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12',
          mediaSide === 'left' && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
        )}
      >
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
          {ctas.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {ctas.map((cta) => (
                <Button
                  key={`${cta.href}-${cta.label}`}
                  asChild
                  variant={cta.kind === 'primary' ? 'default' : 'outline'}
                  className={
                    cta.kind === 'primary'
                      ? 'casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
                      : 'casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
                  }
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/*
          Halo, not drop shadow. The figure carried `rounded-3xl` plus
          `shadow-[var(--shadow-card)]`, which is the same neutral grey lift
          under every photograph on the site. MediaFrame paints a blurred copy
          of this photograph behind itself instead, so the surface picks up the
          image's own colours. See the `.casa-media` block in globals.css.
        */}
        {/* A shape, not a height (crop pass, 2026-10-02): the fixed 360px made a
            3:2 photo a 2.4:1 band at tablet width and a square in the course
            pages' narrow column, and both cut heads. */}
        <figure className="aspect-[3/2] md:aspect-[16/9] lg:aspect-[3/2]">
          <MediaFrame
            src={photo.src}
            alt={photo.alt}
            sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 45vw, 95vw"
            className="h-full w-full"
          />
        </figure>
      </div>

      {/*
        THE POINTS GO UNDER THE PHOTOGRAPH (2026-10-07). Beside it they stacked
        under the lead until the text column ran 200-500px past the photo on
        most pages that use this box: /team, the accommodation and exam pages,
        Bildungszeit. In a row they read as what they are, separate points, and
        the box keeps its photograph's height. The columns follow the box's own
        width, because it sits both full-width and in the detail pages' column.
      */}
      {bullets.length > 0 ? (
        <ul className={cn('mt-8 grid gap-x-8 gap-y-4 border-t border-[color:var(--casa-sand)] pt-6', pointColumns(bullets.length))}>
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)] md:text-base">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-blue)] md:mt-1" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
