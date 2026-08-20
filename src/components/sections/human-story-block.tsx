import Link from 'next/link';
import { MediaFrame } from '@/components/ui/media-frame';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HumanStoryBlockProps = {
  eyebrow: string;
  title: string;
  quote: string;
  person: string;
  context: string;
  photo: {
    src: string;
    alt: string;
  };
  supportingText?: string;
  cta?: {
    label: string;
    href: string;
  };
  mediaSide?: 'left' | 'right';
  className?: string;
};

export function HumanStoryBlock({
  eyebrow,
  title,
  quote,
  person,
  context,
  photo,
  supportingText,
  cta,
  mediaSide = 'left',
  className,
}: HumanStoryBlockProps) {
  return (
    <section
      data-reveal="true"
      className={cn('rounded-3xl bg-[var(--casa-warm-soft)]/35 px-6 py-8 md:px-9 md:py-10', className)}
    >
      <div
        className={cn(
          'grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]',
          mediaSide === 'right' && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
        )}
      >
        {/*
          Halo, not drop shadow. The figure carried `rounded-3xl` plus
          `shadow-[var(--shadow-card)]`, which is the same neutral grey lift
          under every photograph on the site. MediaFrame paints a blurred copy
          of this photograph behind itself instead, so the surface picks up the
          image's own colours. See the `.casa-media` block in globals.css.
        */}
        <figure className="h-72 md:h-80">
          <MediaFrame
            src={photo.src}
            alt={photo.alt}
            sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, 95vw"
            className="h-full w-full"
          />
        </figure>

        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
          <h2 className="mt-3 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <blockquote className="mt-4 text-lg font-medium leading-relaxed text-[var(--casa-ink)]">
            &quot;{quote}&quot;
          </blockquote>
          <p className="mt-3 text-base font-medium text-[var(--casa-muted)]">
            {person} - {context}
          </p>
          {supportingText ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{supportingText}</p>
          ) : null}
          {cta ? (
            <Button asChild className="mt-7 h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
