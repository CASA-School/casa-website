import Link from 'next/link';

import { cn } from '@/lib/utils';

export function CatalogueTabs({ active }: { active: 'courses' | 'exams' }) {
  const tabs = [
    { key: 'courses' as const, label: 'Courses', href: '/admin/catalogue' },
    { key: 'exams' as const, label: 'Exams', href: '/admin/catalogue/exams' },
  ];

  return (
    <div className="mb-5 inline-flex gap-1 rounded-xl border border-ws-line bg-white p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
            'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
            tab.key === active
              ? 'bg-[var(--casa-ink-deep)] text-white'
              : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
