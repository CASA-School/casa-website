import Link from 'next/link';

import { OccupancyPlan } from './occupancy-plan';
import { DayJump } from '../../day/day-jump';
import { Icon } from '@/components/admin/icons';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { flatOccupancy } from '@/lib/admin/occupancy';
import { cn } from '@/lib/utils';

/**
 * CASA's flats, four weeks at a time (2026-10-19): who lives in which room. Reached from the Tagesplan,
 * Unterkünfte and Aufenthalte. The weeks start on the Monday of the day asked for, today's by default;
 * the arrows move them a week.
 */
const PATH = '/admin/accommodation/occupancy';
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const plus = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso: string) => plus(iso, -((noon(iso).getUTCDay() + 6) % 7));

export default async function OccupancyPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [params, , { t, lang }] = await Promise.all([searchParams, requireModule('accommodation'), getI18n()]);
  const today = berlinDay(new Date());
  const asked = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && !Number.isNaN(noon(params.date).getTime()) ? params.date : today;
  const from = mondayOf(asked);
  const to = plus(from, 27);
  const { flats, stays, holds } = await flatOccupancy(from, to);
  const thisWeek = mondayOf(today);
  const href = (monday: string) => (monday === thisWeek ? PATH : `${PATH}?date=${monday}`);
  const day = (iso: string, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });
  const step = 'inline-flex size-9 items-center justify-center rounded-full bg-white text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4';
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] text-[var(--casa-ink)]">{t('WG-Belegung', 'Flat occupancy')}</h1>
          <p className="mt-1 text-sm text-[var(--casa-muted)]">
            <span className="font-semibold text-[var(--casa-ink)]">
              {day(from, { day: 'numeric', month: 'long' })} – {day(to, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {' · '}
            {t('vier Wochen', 'four weeks')}
          </p>
        </div>
        <nav aria-label={t('Wochen wählen', 'Choose the weeks')} className="flex items-center gap-1.5">
          <Link href={href(plus(from, -7))} aria-label={t('Eine Woche zurück', 'A week back')} title={t('Eine Woche zurück', 'A week back')} className={step}>
            <span className="rotate-180">{Icon.chevronRight}</span>
          </Link>
          <Link
            href={PATH}
            aria-current={from === thisWeek ? 'date' : undefined}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-3.5 text-[0.84rem] font-semibold ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
              from === thisWeek ? 'bg-[var(--casa-ink-deep)] text-white ring-transparent' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
            )}
          >
            {t('Diese Woche', 'This week')}
          </Link>
          <Link href={href(plus(from, 7))} aria-label={t('Eine Woche vor', 'A week ahead')} title={t('Eine Woche vor', 'A week ahead')} className={step}>
            {Icon.chevronRight}
          </Link>
          <DayJump day={from} today={today} path={PATH} />
        </nav>
      </header>
      <OccupancyPlan from={from} today={today} flats={flats} stays={stays} holds={holds} />
    </>
  );
}
