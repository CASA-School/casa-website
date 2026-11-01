'use client';

import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Input, Select } from '@/components/admin/ui';
import { savedBookingParams, type BookingTypeChoice } from '@/lib/admin/booking-query';

type View = { id: string; name: string; params: Record<string, string> };
const EVENT = 'casa-booking-views-change';
const subscribe = (change: () => void) => {
  window.addEventListener('storage', change); window.addEventListener(EVENT, change);
  return () => { window.removeEventListener('storage', change); window.removeEventListener(EVENT, change); };
};
const href = (params: Record<string, string>) => `/admin/bookings?${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)))}`;
const signature = (params: Record<string, string>) => JSON.stringify(Object.entries(savedBookingParams(params)).filter(([key, value]) => !(key === 'filter' && value === 'current')).sort(([a], [b]) => a.localeCompare(b)));

/** Frequent filters stay in the list; saved views store only account-scoped filter choices. */
export function BookingToolbar({ values, types, levels, colleague, more }: {
  values: Record<string, string>; types: BookingTypeChoice[]; levels: readonly string[]; colleague: string; more: ReactNode;
}) {
  const { t } = useWsLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(values, (old, patch: Record<string, string>) => ({ ...old, ...patch }));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const storageKey = `casa-workspace-booking-views:${colleague}`;
  const stored = useSyncExternalStore(subscribe, () => { try { return window.localStorage.getItem(storageKey) ?? '[]'; } catch { return '[]'; } }, () => '[]');
  const saved = useMemo<View[]>(() => {
    try {
      const raw: unknown = JSON.parse(stored);
      return Array.isArray(raw) ? raw.filter((v): v is View => v && typeof v.id === 'string' && typeof v.name === 'string' && v.name.length <= 60 && v.params && typeof v.params === 'object' && !Array.isArray(v.params))
        .slice(0, 12).map(v => ({ id: v.id, name: v.name, params: savedBookingParams(v.params) })) : [];
    } catch { return []; }
  }, [stored]);
  const evening = types.find(type => type.slug === 'evening-german');
  const views: View[] = [
    ...(evening ? [{ id: 'evening', name: t('Abendkurse · Zahlung offen', 'Evening courses · unpaid'), params: { filter: 'unclear', type: evening.id } }] : []),
    { id: 'next14', name: t('Beginn: nächste 14 Tage', 'Starting in the next 14 days'), params: { filter: 'upcoming', period: 'next14' } },
    ...saved,
  ];
  const active = views.find(view => signature(view.params) === signature(values));
  const write = (next: View[]) => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); return true; }
    catch { setNotice(t('Der Browser konnte die Ansicht nicht speichern.', 'This browser could not save the view.')); return false; }
  };
  const change = (patch: Record<string, string>) => startTransition(() => { setOptimistic(patch); router.push(href({ ...values, ...patch, page: '' }), { scroll: false }); });

  return <div className="border-b border-ws-line-soft bg-[#fcfdff]">
    <div className={`grid grid-cols-2 items-center gap-2 px-4 py-3 sm:flex sm:flex-wrap sm:px-5 ${pending ? 'opacity-65' : ''}`} aria-busy={pending}>
      <label className="flex min-h-9 min-w-0 flex-col items-stretch rounded-lg sm:flex-row sm:items-center sm:gap-2 border border-ws-line bg-white px-2.5 text-xs text-[var(--casa-muted)]"><span className="pt-1 text-[0.68rem] sm:pt-0 sm:text-xs">{t('Kurs', 'Course')}</span><Select aria-label={t('Kursart', 'Course type')} value={optimistic.type ?? ''} onChange={event => change({ type: event.target.value })} className="min-w-0 flex-1 sm:w-32 [&_button]:h-8 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:text-xs"><option value="">{t('Alle Kursarten', 'All course types')}</option>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}<option value="exam">{t('Prüfungen', 'Exams')}</option></Select></label>
      <label title={t('Einstiegsniveau des gebuchten Kursabschnitts', 'Starting level of the booked course period')} className="flex min-h-9 min-w-0 flex-col items-stretch rounded-lg sm:flex-row sm:items-center sm:gap-2 border border-ws-line bg-white px-2.5 text-xs text-[var(--casa-muted)]"><span className="pt-1 text-[0.68rem] sm:pt-0 sm:text-xs">{t('Startniveau', 'Start level')}</span><Select aria-label={t('Einstiegsniveau', 'Starting level')} value={optimistic.level ?? ''} onChange={event => change({ level: event.target.value })} className="min-w-0 flex-1 sm:w-20 [&_button]:h-8 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:text-xs"><option value="">{t('Alle', 'All')}</option>{levels.map(level => <option key={level} value={level}>{level}</option>)}</Select></label>
      <label className="flex min-h-9 min-w-0 flex-col items-stretch rounded-lg sm:flex-row sm:items-center sm:gap-2 border border-ws-line bg-white px-2.5 text-xs text-[var(--casa-muted)]"><span className="pt-1 text-[0.68rem] sm:pt-0 sm:text-xs">{t('Beginn', 'Starts')}</span><Select aria-label={t('Kursbeginn', 'Course start')} value={optimistic.period || (optimistic.from || optimistic.to ? 'custom' : '')} onChange={event => change({ period: event.target.value, from: '', to: '', ...(event.target.value === 'next14' ? { filter: 'upcoming' } : {}) })} className="min-w-0 flex-1 sm:w-28 [&_button]:h-8 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:text-xs"><option value="">{t('Jederzeit', 'Any time')}</option><option value="month">{t('Dieser Monat', 'This month')}</option><option value="next14">{t('Nächste 14 Tage', 'Next 14 days')}</option>{values.from || values.to ? <option value="custom" disabled>{t('Zeitraum', 'Date range')}</option> : null}</Select></label>
      {more}
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-ws-line-soft px-4 py-2 sm:px-5">
      <Button type="button" variant="tertiary" size="sm" onClick={() => { setNaming(true); setNotice(''); }}>{Icon.plus}{t('Ansicht speichern', 'Save view')}</Button>
      <div className="order-first flex w-full min-w-0 items-center gap-1 sm:order-none sm:w-auto"><Select aria-label={t('Gespeicherte Ansichten', 'Saved views')} value={active?.id ?? ''} onChange={event => { const view = views.find(v => v.id === event.target.value); if (view) startTransition(() => router.push(href(view.params), { scroll: false })); }} className="min-w-0 w-full sm:w-56 [&_button]:h-8 [&_button]:text-xs"><option value="">{t('Gespeicherte Ansichten', 'Saved views')}</option>{views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}</Select>{active && saved.some(v => v.id === active.id) ? <Button type="button" variant="tertiary" size="sm" aria-label={t('Gespeicherte Ansicht entfernen', 'Remove saved view')} onClick={() => write(saved.filter(view => view.id !== active.id))}>{Icon.close}</Button> : null}</div>
      <span className="flex-1" />
      <Button type="button" variant="tertiary" size="sm" aria-label={t('Link zur Ansicht kopieren', 'Copy a link to this view')} onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice(t('Link zur Ansicht kopiert.', 'View link copied.')); } catch { setNotice(t('Die Adresse oben enthält alle Filter.', 'The address above contains every filter.')); } }}>{Icon.external}</Button>
    </div>
    {naming ? <form className="flex flex-wrap items-center gap-2 border-t border-ws-line-soft px-5 py-3" onSubmit={event => {
      event.preventDefault();
      if (name.trim() && write([...saved.filter(view => view.name !== name.trim()), { id: crypto.randomUUID(), name: name.trim(), params: savedBookingParams(values) }].slice(-12))) { setNaming(false); setName(''); setNotice(t('Ansicht gespeichert.', 'View saved.')); }
    }}><Input aria-label={t('Name der Ansicht', 'View name')} required maxLength={60} autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={t('Zum Beispiel: Abendkurse offen', 'For example: Unpaid evening courses')} className="h-9 w-full sm:w-64" /><Button type="submit" size="sm">{t('Speichern', 'Save')}</Button><Button type="button" variant="tertiary" size="sm" onClick={() => setNaming(false)}>{t('Abbrechen', 'Cancel')}</Button>{values.q ? <p className="w-full text-xs text-[var(--casa-muted)]">{t('Die Textsuche wird nicht mitgespeichert.', 'The text search is not saved with the view.')}</p> : null}</form> : null}
    {notice ? <p role="status" className="border-t border-ws-line-soft px-5 py-2 text-xs text-[var(--casa-muted)]">{notice}</p> : null}
  </div>;
}
