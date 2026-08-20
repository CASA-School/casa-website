import Link from 'next/link';
import { MediaFrame } from '@/components/ui/media-frame';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EditorialSplitPhoto = {
  src: string;
  alt: string;
  caption: string;
};

type EditorialSplitProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  photo: EditorialSplitPhoto;
  mediaSide?: 'left' | 'right';
  ctas?: Array<{
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
  }>;
  className?: string;
};

export function EditorialSplit({
  eyebrow,
  title,
  description,
  bullets,
  photo,
  mediaSide = 'right',
  ctas = [],
  className,
}: EditorialSplitProps) {
  return (
    <section data-reveal="true" className={cn('rounded-3xl bg-[var(--casa-warm-soft)]/35 px-6 py-8 md:px-9 md:py-10', className)}>
      <div
        className={cn(
          'grid items-start gap-10 lg:grid-cols-[1fr_1fr]',
          mediaSide === 'left' && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
        )}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-base text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {ctas.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-3">
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
        <figure className="h-64 md:h-[360px]">
          <MediaFrame
            src={photo.src}
            alt={photo.alt}
            sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 45vw, 95vw"
            className="h-full w-full"
          />
        </figure>
      </div>
    </section>
  );
}
