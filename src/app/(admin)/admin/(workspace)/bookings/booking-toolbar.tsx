'use client';

import { useOptimistic, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ListFilterField, ListFilters } from '@/components/admin/list-bar';
import { Select } from '@/components/admin/menu-select';
import { useWsLang } from '@/components/admin/lang';
import { adjustBookingContext, BOOKING_CATEGORIES, contextFacets, type BookingFacet } from '@/lib/admin/booking-context';
import { SESSION_LABELS, type Session } from '@/lib/admin/day-plan-labels';
import { pick, wsLocale } from '@/lib/admin/i18n';

export function BookingToolbar({ values, facets, today, summary }: {
  values: Record<string, string>; facets: readonly BookingFacet[]; today: string; summary: ReactNode;
}) {
  const { t, lang } = useWsLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(values);
  const category = BOOKING_CATEGORIES.find(c => c === optimistic.category) ?? 'all';
  const session = optimistic.session as Session | undefined;
  const inCategory = contextFacets(facets, { category }, optimistic.type);
  const inSession = contextFacets(inCategory, { session });
  const inLevel = contextFacets(inSession, { level: optimistic.level });
  const sessions = (['morning', 'afternoon', 'evening'] as const).filter(s => inCategory.some(f => f.session === s));
  const levels = [...new Set(inSession.flatMap(f => f.level ? [f.level, f.level.split('.')[0]] : []))].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  const months = [...new Set(inLevel.flatMap(f => f.start ? [f.start.slice(0, 7)] : []))].sort();
  const starts = [...new Set(contextFacets(inLevel, { month: optimistic.month }).flatMap(f => f.start ? [f.start] : []))].sort();
  const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString(wsLocale(lang), { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  const change = (extra: Record<string, string>) => startTransition(() => {
    const next = adjustBookingContext(optimistic, extra, facets);
    setOptimistic(next);
    router.push(`/admin/bookings?${new URLSearchParams(Object.entries(next).filter(([, v]) => Boolean(v)))}`, { scroll: false });
  });
  return <ListFilters pending={pending}>
    {category !== 'exam' && sessions.length > 0 ? <ListFilterField label={t('Tageszeit', 'Time of day')}>
      <Select menuFit="content" aria-label={t('Tageszeit', 'Time of day')} value={optimistic.session ?? ''} onChange={e => change({ session: e.target.value })}>
        <option value="">{t('Alle Zeiten', 'All times')}</option>
        {sessions.map(s => <option key={s} value={s}>{pick(lang, SESSION_LABELS[s])}</option>)}
      </Select>
    </ListFilterField> : null}
    {levels.length > 0 || optimistic.level ? <ListFilterField label={t('Startniveau', 'Starting level')}>
      <Select menuFit="content" aria-label={t('Startniveau', 'Starting level')} value={optimistic.level ?? ''} onChange={e => change({ level: e.target.value })}>
        <option value="">{t('Alle Niveaus', 'All levels')}</option>
        {optimistic.level && !levels.includes(optimistic.level) ? <option value={optimistic.level}>{optimistic.level}</option> : null}
        {levels.map(level => <option key={level} value={level}>{level}</option>)}
      </Select>
    </ListFilterField> : null}
    <ListFilterField label={t('Startmonat', 'Start month')}>
      <Select menuFit="content" aria-label={t('Startmonat', 'Start month')} value={optimistic.month ?? ''} onChange={e => change({ month: e.target.value })}>
        <option value="">{t('Alle Monate', 'All months')}</option>
        {optimistic.month && !months.includes(optimistic.month) ? <option value={optimistic.month}>{monthName(optimistic.month)}</option> : null}
        <optgroup label={t('Ab diesem Monat', 'This month onward')}>{months.filter(m => m >= today.slice(0, 7)).map(m => <option key={m} value={m}>{monthName(m)}</option>)}</optgroup>
        <optgroup label={t('Frühere Monate', 'Earlier months')}>{months.filter(m => m < today.slice(0, 7)).reverse().map(m => <option key={m} value={m}>{monthName(m)}</option>)}</optgroup>
      </Select>
    </ListFilterField>
    {optimistic.month || optimistic.start ? <ListFilterField label={t('Kursbeginn', 'Course start')}>
      <Select menuFit="content" aria-label={t('Kursbeginn', 'Course start')} value={optimistic.start ?? ''} onChange={e => change({ start: e.target.value })}>
        <option value="">{t('Alle Termine', 'All dates')}</option>
        {starts.map(day => <option key={day} value={day}>{new Date(`${day}T12:00:00Z`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })}</option>)}
      </Select>
    </ListFilterField> : null}
    <p role="status" className="ml-auto text-xs text-[var(--casa-muted)] tabular-nums">{summary}</p>
  </ListFilters>;
}
