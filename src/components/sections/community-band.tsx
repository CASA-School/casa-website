import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CommunityBandProps = {
  title: string;
  description: string;
  ctas: Array<{
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
  }>;
  className?: string;
};

export function CommunityBand({ title, description, ctas, className }: CommunityBandProps) {
  return (
    <section className={cn('rounded-3xl border border-[color:var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] px-6 py-7 text-white shadow-[var(--shadow-soft)] md:px-8 md:py-8', className)}>
      <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-amber)]">Community</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-sm leading-relaxed text-[var(--casa-text-subtle)] md:text-base">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3 md:justify-end">
          {ctas.map((cta) => (
            <Button
              key={`${cta.href}-${cta.label}`}
              asChild
              variant={cta.kind === 'primary' ? 'default' : 'outline'}
              className={cn(
                cta.kind === 'primary'
                  ? 'casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
                  : 'border-white/35 bg-transparent text-white hover:bg-white/10'
              )}
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
