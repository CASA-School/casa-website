import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Two tabs, above both registration queues.
 *
 * A switcher rather than two sidebar entries: they are one job ("someone
 * registered for something") split by product, and two rail items would
 * suggest two unrelated areas of work while pushing the genuinely separate
 * areas further down.
 */
export function RegistrationTabs({
  active,
  counts,
}: {
  active: 'course' | 'exam';
  counts: { course: number; exam: number };
}) {
  const tabs = [
    { key: 'course' as const, label: 'Course', href: '/admin/registrations/course' },
    { key: 'exam' as const, label: 'Exam', href: '/admin/registrations/exam' },
  ];

  return (
    <div className="mb-4 inline-flex gap-0.5 rounded-xl border border-ws-line bg-white p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-[30px] items-center gap-2 rounded-lg px-3.5 text-[0.8rem] font-bold transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
              isActive
                ? 'bg-[var(--casa-ink-deep)] text-white'
                : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
            )}
          >
            {tab.label}
            <span className={isActive ? 'text-white/70' : 'text-[var(--casa-text-subtle)]'}>
              {counts[tab.key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
