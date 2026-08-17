import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';
import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { QuickChooserPanel, type QuickChooserField, type QuickChooserThumbnail } from '@/components/sections/quick-chooser-panel';

import { HeroPhotoCard, HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroBEditorialProps = {
  eyebrow: string;
  title: string;
  description: string;
  photo: HeroPhoto;
  ctas: HeroAction[];
  proofItems?: HeroProofItem[];
  breadcrumbs?: BreadcrumbItem[];
  useQuickChooser?: boolean;
  chooser?: {
    title: string;
    description: string;
    fields: QuickChooserField[];
    submitLabel: string;
    submitHref: string;
    badgeLabel?: string;
    summaryLabel?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    thumbnails?: QuickChooserThumbnail[];
    initialValues?: Record<string, string>;
  };
  themeClassName?: string;
};

export function HeroBEditorial({
  eyebrow,
  title,
  description,
  photo,
  ctas,
  breadcrumbs,
  useQuickChooser = false,
  chooser,
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

        {useQuickChooser && chooser ? (
          <QuickChooserPanel
            title={chooser.title}
            description={chooser.description}
            fields={chooser.fields}
            submitLabel={chooser.submitLabel}
            submitHref={chooser.submitHref}
            badgeLabel={chooser.badgeLabel}
            summaryLabel={chooser.summaryLabel}
            secondaryLabel={chooser.secondaryLabel}
            secondaryHref={chooser.secondaryHref}
            thumbnails={chooser.thumbnails}
            initialValues={chooser.initialValues}
          />
        ) : (
          <div className="relative lg:pt-6">
            <HeroPhotoCard photo={photo} className="min-h-[300px]" priority />
          </div>
        )}
      </div>
    </HeroSurface>
  );
}
