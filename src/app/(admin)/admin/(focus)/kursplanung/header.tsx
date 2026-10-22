import Link from 'next/link';
import type { ReactNode } from 'react';

import { getI18n } from '@/lib/admin/i18n.server';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

import { MonthPicker } from './month-picker';
import ui from './ui.module.css';

/**
 * The module's top row: the title, the month, the two tabs — then whatever
 * the screen puts at the right (the board its undo and copy buttons, Kurse the
 * next-month button) and the outcome of the last form.
 *
 * Split in two so the board, a client component, can lay its own buttons in
 * the same row: it receives `HeaderStart` as a node and renders the row itself.
 * The tabs are one job seen from two sides, and the month travels with them
 * so nobody lands on a different month than the one they were planning.
 */
type Active = 'puzzle' | 'kurse';
type Notice = { ok?: string; error?: string };

export async function HeaderStart({ active, month, months }: { active: Active; month: string; months: readonly string[] }) {
  const { t, lang } = await getI18n();
  const labels = Object.fromEntries([...months, month].map((m) => [m, monthLabel(m, lang)]));
  const q = `?month=${month}`;
  const tabs = [
    { key: 'puzzle' as const, label: 'Puzzle', href: `/admin/kursplanung${q}` },
    { key: 'kurse' as const, label: t('Kurse', 'Courses'), href: `/admin/kursplanung/kurse${q}` },
  ];
  return (
    <>
      <h1 className={ui.h1}>Kursplanung</h1>
      <MonthPicker months={months} month={month} labels={labels} />
      <nav className={ui.tabs} aria-label={t('Bereiche', 'Sections')}>
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} aria-current={tab.key === active ? 'page' : undefined} className={`${ui.tab} ${tab.key === active ? ui.tabOn : ''}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function NoticeText({ notice }: { notice?: Notice }) {
  if (notice?.error) return <span className={`${ui.status} ${ui.statusBad}`}>{notice.error}</span>;
  if (notice?.ok) return <span className={`${ui.status} ${ui.statusOk}`}>{notice.ok}</span>;
  return null;
}

export function Header({ active, month, months, notice, children }: { active: Active; month: string; months: readonly string[]; notice?: Notice; children?: ReactNode }) {
  return (
    <div className={ui.top}>
      <HeaderStart active={active} month={month} months={months} />
      <span className={ui.spacer} />
      {children}
      <NoticeText notice={notice} />
    </div>
  );
}
