import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';

import { JsonLdScript } from '@/components/seo/json-ld';
import type { ContentLocale } from '@/lib/content/types';
import { breadcrumbList } from '@/lib/structured-data';
import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * The visible trail, and the same trail as schema.org BreadcrumbList, so every
 * page that shows breadcrumbs gives search engines its place in the site.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const locale = useLocale() as ContentLocale;
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-6', className)}>
      <JsonLdScript id="breadcrumb-schema" data={breadcrumbList(items, locale)} />
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--casa-muted)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="rounded-lg px-1 py-0.5 transition-colors hover:text-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
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
