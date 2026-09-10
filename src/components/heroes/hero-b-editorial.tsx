import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';
import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

import { HeroPhotoCard, HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroBEditorialProps = {
  eyebrow: string;
  title: string;
  description: string;
  photo: HeroPhoto;
  ctas: HeroAction[];
  proofItems?: HeroProofItem[];
  breadcrumbs?: BreadcrumbItem[];
  themeClassName?: string;
};

/**
 * Kept for /team and /ueber-uns/gemeinnuetzigkeit only.
 *
 * The `useQuickChooser` / `chooser` props are gone: /courses was their only
 * caller, and its finder now renders as its own section below the standard
 * hero rather than as the hero's right-hand column. Nothing else on the site
 * ever passed them, so the branch was unreachable the moment /courses moved.
 */

export function HeroBEditorial({
  eyebrow,
  title,
  description,
  photo,
  ctas,
  breadcrumbs,
  themeClassName = 'hero-theme-about',
}: HeroBEditorialProps) {
  return (
    <HeroSurface themeClassName={themeClassName} breadcrumbs={breadcrumbs} archetype="B">
      <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {ctas.slice(0, 3).map((cta, index) => {
              if (index === 0) {
                return (
                  <Button
                    key={`${cta.href}-${cta.label}`}
                    asChild
                    className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
                    data-casa-track="true"
                    data-casa-label={cta.label}
                  >
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                );
              }


              /*
                Every CTA after the first is a text link.
              
                There used to be a middle tier here — index 1 rendered an outline button —
                and since no `ctas` array in public-page-config.ts has more than two
                entries, this text-link branch was unreachable on every public route. So
                every hero on the site shipped exactly two button-weight controls, and the
                restrained third tier the ladder was built for never rendered once.
              */
              return (
                <TextCta
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  data-casa-track="true"
                  data-casa-label={cta.label}
                >
                  {cta.label}
                </TextCta>
              );
            })}
          </div>


        </div>

        <div className="relative lg:pt-6">
          <HeroPhotoCard photo={photo} className="min-h-[300px]" priority />
        </div>
      </div>
    </HeroSurface>
  );
}
