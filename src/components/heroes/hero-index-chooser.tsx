import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';
import { QuickChooserPanel, type QuickChooserField, type QuickChooserThumbnail } from '@/components/sections/quick-chooser-panel';

import { HeroSurface, type HeroAction, type HeroProofItem } from './shared';

type HeroIndexChooserProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  proofItems?: HeroProofItem[];
  chooser: {
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
  };
  themeClassName?: string;
};

export function HeroIndexChooser({
  eyebrow,
  title,
  description,
  ctas,
  chooser,
  themeClassName = 'hero-theme-courses',
}: HeroIndexChooserProps) {
  return (
    <HeroSurface themeClassName={themeClassName} archetype="B">
      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.08] text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
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
        />
      </div>
    </HeroSurface>
  );
}
