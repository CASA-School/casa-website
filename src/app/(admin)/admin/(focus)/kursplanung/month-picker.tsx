'use client';

import { usePathname, useRouter } from 'next/navigation';

import { Select } from '@/components/admin/ui';

/** The month the module shows. A native select that navigates; the tab you are on stays. */
export function MonthPicker({ months, month, labels }: { months: readonly string[]; month: string; labels: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const all = months.includes(month) ? months : [...months, month].sort();
  return (
    <Select
      aria-label="Kursmonat"
      value={month}
      onChange={(e) => router.push(`${pathname}?month=${e.target.value}`)}
      className="h-9 w-auto min-w-[11rem] text-sm"
    >
      {all.map((m) => (
        <option key={m} value={m}>
          {labels[m] ?? m}
        </option>
      ))}
    </Select>
  );
}
