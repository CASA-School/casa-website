import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CtaStackItem = {
  label: string;
  href: string;
  kind?: 'primary' | 'secondary';
};

type CtaStackProps = {
  items: CtaStackItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
};

export function CTAStack({ items, className, orientation = 'horizontal' }: CtaStackProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-3', orientation === 'vertical' && 'flex-col', className)}>
      {items.map((item, index) => {
        if (index >= 2) {
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="casa-cta-link inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:underline"
              data-casa-track="true"
            >
              {item.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          );
        }

        const primary = index === 0;
        return (
          <Button
            key={`${item.href}-${item.label}`}
            asChild
            variant={primary ? 'default' : 'outline'}
            className={cn(
              'rounded-lg font-semibold',
              primary
                ? 'casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]'
                : 'casa-button-outline border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)]'
            )}
            data-casa-track="true"
            data-casa-label={item.label}
          >
            <Link href={item.href}>
              {item.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
