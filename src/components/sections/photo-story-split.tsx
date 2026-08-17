import Link from 'next/link';
import { CasaImage as Image } from '@/components/ui/casa-image';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StoryPhoto = {
  src: string;
  alt: string;
  caption: string;
};

export type StoryCta = {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
};

type PhotoStorySplitProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  photo: StoryPhoto;
  ctas?: StoryCta[];
  mediaSide?: 'left' | 'right';
  className?: string;
};

export function PhotoStorySplit({
  eyebrow,
  title,
  description,
  bullets,
  photo,
  ctas = [],
  mediaSide = 'right',
  className,
}: PhotoStorySplitProps) {
  return (
    <section className={cn('rounded-3xl bg-[var(--casa-warm-soft)]/32 px-6 py-7 md:px-8 md:py-9', className)}>
      <div className={cn('grid items-start gap-6 lg:grid-cols-2', mediaSide === 'left' && 'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1')}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

          <ul className="mt-5 space-y-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-base text-[var(--casa-ink)] md:text-lg">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {ctas.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {ctas.map((cta) => (
                <Button
                  key={`${cta.href}-${cta.label}`}
                  asChild
                  variant={cta.kind === 'primary' ? 'default' : 'outline'}
                  className={cn(
                    cta.kind === 'primary'
                      ? 'casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
                      : 'casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
                  )}
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <figure className="overflow-hidden rounded-3xl bg-white/80 shadow-[var(--shadow-card)]">
          <div className="casa-media-overlay relative h-64 md:h-80">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 45vw, 95vw"
              className="object-cover"
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
