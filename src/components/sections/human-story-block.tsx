import Link from 'next/link';
import Image from 'next/image';

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
      className={cn('rounded-3xl bg-[var(--casa-warm-soft)]/32 px-6 py-8 md:px-9 md:py-10', className)}
    >
      <div
        className={cn(
          'grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]',
          mediaSide === 'right' && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
        )}
      >
        <figure className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
          <div className="casa-media-overlay relative h-72 md:h-80">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, 95vw"
              className="object-cover"
            />
          </div>
        </figure>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{eyebrow}</p>
          <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
          <h2 className="mt-3 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
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
