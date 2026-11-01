'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { bookingTotalsAction } from './actions';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Select } from '@/components/admin/menu-select';
import { SidePanel } from '@/components/admin/side-panel';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { DateFormField } from '@/components/admin/date-picker';

type Totals = { year: number; owing: number; owed: number }[];

const euro = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

/**
 * The bookings list's filters, at the side (Rahman, 2026-10-21: „a cleaner button that opens the sidebar and
 * then with better filters … the amount shouldn't be just written there but calculated only if requested").
 * The year, who pays, the course type; applied as the list's address, so a filtered list can be shared and
 * the tabs keep it. What is still owed, year by year, is worked out only on „Berechnen", and only for whoever
 * holds the price list (`bookingTotalsAction`).
 */
export function BookingFilters({
  base,
  year,
  payer,
  typeId,
  programme,
  years,
  types,
  programmes,
  payers,
  canTotals,
  startFrom,
  startTo,
}: {
  /** What the filters keep: the view, the organisation from its page, the search. */
  base: Record<string, string | undefined>;
  year?: number;
  payer?: string;
  typeId?: string;
  /** The university's programme (0093); offered only when bookings are in one. */
  programme?: string;
  years: readonly number[];
  types: readonly { id: string; name: string }[];
  programmes: readonly { code: string; name: string }[];
  payers: readonly { value: string; label: string }[];
  canTotals: boolean;
  startFrom?: string;
  startTo?: string;
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const [chosenPayer, setChosenPayer] = useState(payer ?? '');
  const [datesEdited, setDatesEdited] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const [counting, startCounting] = useTransition();
  const active = [year, payer, programme, !base.period && (startFrom || startTo)].filter(Boolean).length;

  const href = (extra: Record<string, string | undefined>) => {
    const query = new URLSearchParams(Object.entries({ ...base, ...extra }).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return `/admin/bookings${query ? `?${query}` : ''}`;
  };
  const count = () =>
    startCounting(async () => {
      try {
        setFailed(false);
        setTotals(await bookingTotalsAction({ payer, typeId, programme, payerId: base.org }));
      } catch {
        setFailed(true);
      }
    });

  return (
    <SidePanel
      open={open}
      onOpenChange={next => { setOpen(next); if (next) { setChosenPayer(payer ?? ''); setDatesEdited(false); } }}
      trigger={
        <span className="inline-flex items-center gap-1.5">
          {Icon.settings}
          {t('Weitere Filter', 'More filters')}
          {active ? <span className="ml-0.5 inline-grid min-w-[1.15rem] place-items-center rounded-full bg-[var(--fm-navy)] px-1 text-[0.68rem] font-bold text-white tabular-nums">{active}</span> : null}
        </span>
      }
      triggerClassName="inline-flex h-9 items-center rounded-lg px-2 text-[0.75rem] whitespace-nowrap sm:px-2.5 sm:text-[0.82rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line transition-colors ring-inset outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5 [&_svg]:text-[var(--casa-muted)]"
      title={t('Buchungen filtern', 'Filter bookings')}
      icon={Icon.bookings}
      tint="blue"
      footer={
        <span className="flex w-full items-center justify-between gap-2">
          <Link href={href({ year: undefined, payer: undefined, type: undefined, programme: undefined, from: undefined, to: undefined, period: undefined })} className="text-[0.84rem] font-semibold text-[var(--casa-muted)] hover:text-[var(--casa-ink)]">
            {t('Zurücksetzen', 'Reset')}
          </Link>
          <Button type="submit" form="booking-filters" size="md">
            {t('Anwenden', 'Apply')}
          </Button>
        </span>
      }
    >
      <form id="booking-filters" action="/admin/bookings" method="get" onSubmit={() => setOpen(false)} className="space-y-5 px-6 py-5">
        {Object.entries(base).filter(([name]) => !['year', 'payer', 'type', 'programme', 'from', 'to', ...(datesEdited ? ['period'] : [])].includes(name)).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold text-[var(--casa-muted)]">{t('Kursbeginn', 'Course start')}</legend>
          <label className="block"><span className="mb-1 block text-xs text-[var(--casa-muted)]">{t('Von', 'From')}</span><DateFormField id="booking-start-from" name="from" defaultValue={startFrom} onChange={() => setDatesEdited(true)} /></label>
          <label className="block"><span className="mb-1 block text-xs text-[var(--casa-muted)]">{t('Bis', 'Until')}</span><DateFormField id="booking-start-to" name="to" defaultValue={startTo} onChange={() => setDatesEdited(true)} /></label>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Jahr', 'Year')}</span>
          <Select name="year" defaultValue={year ? String(year) : ''}>
            <option value="">{t('Alle Jahre', 'All years')}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </label>
        <fieldset>
          <legend className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Wer zahlt', 'Who pays')}</legend>
          <input type="hidden" name="payer" value={chosenPayer} />
          <span className="flex flex-wrap gap-1.5">
            {[{ value: '', label: t('Alle', 'All') }, ...payers].map((p) => (
              <button
                key={p.value || 'all'}
                type="button"
                aria-pressed={chosenPayer === p.value}
                onClick={() => setChosenPayer(p.value)}
                className={cn(
                  'inline-flex h-8 items-center rounded-full px-3 text-[0.82rem] font-semibold ring-1 transition-colors ring-inset outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                  chosenPayer === p.value ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[var(--casa-ink)] ring-ws-line hover:bg-ws-sunk'
                )}
              >
                {p.label}
              </button>
            ))}
          </span>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Kursart', 'Course type')}</span>
          <Select name="type" defaultValue={typeId ?? ''}>
            <option value="">{t('Alle Kursarten', 'All course types')}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
            <option value="exam">{t('Prüfungen', 'Exams')}</option>
          </Select>
        </label>
        {programmes.length ? (
          <label className="block">
            <span className="mb-1 block text-[0.75rem] font-semibold text-[var(--casa-muted)]">{t('Programm', 'Programme')}</span>
            <Select name="programme" defaultValue={programme ?? ''}>
              <option value="">{t('Alle Programme', 'All programmes')}</option>
              {programmes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </form>

      {canTotals ? (
        <section className="border-t border-ws-line-soft px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[0.84rem] font-bold text-[var(--casa-ink)]">{t('Offene Beträge', 'Amounts owed')}</h3>
            <Button type="button" variant="secondary" size="sm" onClick={count} disabled={counting}>
              {counting ? t('Wird berechnet …', 'Working it out …') : totals ? t('Neu berechnen', 'Work out again') : t('Berechnen', 'Work out')}
            </Button>
          </div>
          {failed ? <p className="mt-3 text-[0.82rem] text-[var(--casa-danger-text)]">{t('Das hat nicht geklappt.', 'That did not work.')}</p> : null}
          {totals ? (
            totals.some((y) => y.owing) ? (
              <ul className="mt-3 divide-y divide-ws-line-soft rounded-xl ring-1 ring-ws-line ring-inset">
                {totals
                  .filter((y) => y.owing)
                  .map((y) => (
                    <li key={y.year}>
                      <Link
                        href={href({ year: String(y.year), payer, type: typeId, programme, filter: 'unclear' })}
                        onClick={() => setOpen(false)}
                        className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-[0.86rem] transition-colors hover:bg-[var(--ws-row-hover)]"
                      >
                        <span className="font-semibold text-[var(--casa-ink)] tabular-nums">{y.year}</span>
                        <span className="ml-auto text-[0.76rem] text-[var(--casa-muted)] tabular-nums">
                          {y.owing === 1 ? t('1 Buchung', '1 booking') : t(`${y.owing} Buchungen`, `${y.owing} bookings`)}
                        </span>
                        <span className="w-[7.5rem] text-right font-semibold text-[#9a5b00] tabular-nums">{euro(y.owed)}</span>
                      </Link>
                    </li>
                  ))}
                <li className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-[0.86rem] font-bold text-[var(--casa-ink)]">
                  <span>{t('Zusammen', 'Together')}</span>
                  <span className="ml-auto text-right text-[#9a5b00] tabular-nums">{euro(totals.reduce((sum, y) => sum + y.owed, 0))}</span>
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-[0.84rem] text-[var(--casa-muted)]">{t('Nichts offen.', 'Nothing owed.')}</p>
            )
          ) : null}
        </section>
      ) : null}
    </SidePanel>
  );
}
