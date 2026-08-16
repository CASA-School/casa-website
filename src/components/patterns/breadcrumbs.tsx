import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-6', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--casa-muted)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="rounded-sm px-1 py-0.5 transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined} className={cn(isCurrent && 'text-[var(--casa-ink)]')}>
                  {item.label}
                </span>
              )}
              {!isCurrent ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
