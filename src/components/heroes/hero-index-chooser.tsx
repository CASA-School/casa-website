import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.08] text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

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

              if (index === 1) {
                return (
                  <Button
                    key={`${cta.href}-${cta.label}`}
                    asChild
                    variant="outline"
                    className="casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]"
                    data-casa-track="true"
                    data-casa-label={cta.label}
                  >
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                );
              }

              return (
                <Link
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  className="casa-cta-link text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:underline"
                  data-casa-track="true"
                >
                  {cta.label}
                </Link>
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
