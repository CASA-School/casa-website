'use client';

import { usePathname, useRouter } from 'next/navigation';

import { useWsLang } from '@/components/admin/lang';

import ui from './ui.module.css';

/** The month the module shows. A native select that navigates; the tab you are on stays. */
export function MonthPicker({ months, month, labels }: { months: readonly string[]; month: string; labels: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useWsLang();
  const all = months.includes(month) ? months : [...months, month].sort();
  return (
    <select aria-label={t('Kursmonat', 'Course month')} value={month} onChange={(e) => router.push(`${pathname}?month=${e.target.value}`)} className={`${ui.sel} ${ui.selLg}`}>
      {all.map((m) => (
        <option key={m} value={m}>
          {labels[m] ?? m}
        </option>
      ))}
    </select>
  );
}
