import Link from 'next/link';

import { Badge } from '@/components/admin/ui';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';
import { cn } from '@/lib/utils';

import { MonthPicker } from './month-picker';

/**
 * Three tabs above the module: the board, the groups, the teachers.
 *
 * A switcher rather than three rail entries — they are one job seen from
 * three sides — and the month travels with the tab so nobody lands on a
 * different month than the one they were planning.
 */
export function KursplanungTabs({
  active,
  month,
  months,
  notice,
}: {
  active: 'puzzle' | 'kurse' | 'lehrkraefte';
  month: string;
  months: readonly string[];
  notice?: { ok?: string; error?: string };
}) {
  const labels = Object.fromEntries([...months, month].map((m) => [m, monthLabel(m)]));
  const q = `?month=${month}`;
  const tabs = [
    { key: 'puzzle' as const, label: 'Puzzle', href: `/admin/kursplanung${q}` },
    { key: 'kurse' as const, label: 'Kurse', href: `/admin/kursplanung/kurse${q}` },
    { key: 'lehrkraefte' as const, label: 'Lehrkräfte', href: `/admin/kursplanung/lehrkraefte${q}` },
  ];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="inline-flex gap-1 rounded-xl border border-ws-line bg-white p-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                isActive ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <MonthPicker months={months} month={month} labels={labels} />
      {notice?.ok ? <Badge tone="positive">{notice.ok}</Badge> : null}
      {notice?.error ? <Badge tone="danger">{notice.error}</Badge> : null}
    </div>
  );
}
