'use client';

import { useState, type ReactNode } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Card } from '@/components/admin/ui';
import { wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import type { StaffTime, TimeMonth } from '@/lib/admin/staff-time';
import { cn } from '@/lib/utils';

/**
 * „Stunden" on a colleague's page (Rahman, 2026-10-22): at one look, whether they are ahead or behind
 * their contract, month by month and over the year, their holidays, and how much they taught.
 *
 * Overtime and minus hours are one diverging pair — blue above the line, red below, a grey zero — checked
 * for colour blindness (dataviz validator, both pass); every number also stands as text, in the tiles and
 * in the table, so no colour carries meaning alone. One measure per chart, one axis each.
 */

const PLUS = '#2f6fd6';
const MINUS = '#d9534f';
const TAUGHT = '#5b6b82';
/** A month still ahead: its lesson days are planned, not held — the same hue, lighter. */
const PLANNED = '#b9c2cf';

export function StaffHours({ data }: { data: StaffTime }) {
  const { t, lang } = useWsLang();
  const hours = (v: number, signed = false) =>
    `${signed && v > 0 ? '+' : ''}${v.toLocaleString(wsLocale(lang), { maximumFractionDigits: 1 })} ${t('Std.', 'h')}`;
  const monthName = (m: string, style: 'short' | 'long' = 'short') =>
    new Date(`${m}-15T12:00:00Z`).toLocaleDateString(wsLocale(lang), { month: style, timeZone: 'UTC' });

  const withSheet = data.months.filter((m) => m.balance !== null || m.running !== null);
  const last = withSheet.at(-1) ?? null;
  const yearBalance = withSheet.reduce((sum, m) => sum + (m.balance ?? 0), 0);
  const today = new Date().toISOString().slice(0, 7);
  const sofar = data.months.filter((m) => m.month <= today);
  const taught = sofar.reduce((sum, m) => sum + (m.units ?? 0), 0);
  const owed = sofar.reduce((sum, m) => sum + (m.contractUnits ?? 0), 0);
  const holidaysUsed = data.holidays !== null && data.holidaysLeft !== null ? data.holidays - data.holidaysLeft : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={t('Saldo', 'Balance')} hint={last ? t(`Stand ${monthName(last.month, 'long')}`, `as of ${monthName(last.month, 'long')}`) : undefined}>
          {last?.running != null ? (
            <>
              <Big>{hours(last.running, true)}</Big>
              <Verdict value={last.running} t={t} />
            </>
          ) : (
            <Empty t={t} />
          )}
        </Tile>
        <Tile label={t(`Monate ${data.year}`, `Months of ${data.year}`)} hint={t('Summe der Plus- und Minusstunden', 'Plus and minus hours added up')}>
          {withSheet.length ? (
            <>
              <Big>{hours(yearBalance, true)}</Big>
              <Verdict value={yearBalance} t={t} />
            </>
          ) : (
            <Empty t={t} />
          )}
        </Tile>
        <Tile label={t('Urlaub', 'Holiday')} hint={data.holidays !== null ? t(`${fmt(data.holidays, lang)} Tage im Jahr`, `${fmt(data.holidays, lang)} days a year`) : undefined}>
          {data.holidaysLeft !== null ? (
            <>
              <Big>{t(`${fmt(data.holidaysLeft, lang)} Tage übrig`, `${fmt(data.holidaysLeft, lang)} days left`)}</Big>
              {data.holidays && holidaysUsed !== null ? <Meter part={holidaysUsed} whole={data.holidays} colour={TAUGHT} label={t(`${fmt(holidaysUsed, lang)} genommen`, `${fmt(holidaysUsed, lang)} taken`)} /> : null}
            </>
          ) : (
            <Empty t={t} />
          )}
        </Tile>
        <Tile label={t('Unterricht bis heute', 'Teaching so far')} hint={data.weeklyUnits ? t(`Vertrag ${fmt(data.weeklyUnits, lang)} UE die Woche`, `contract ${fmt(data.weeklyUnits, lang)} units a week`) : undefined}>
          {taught || owed ? (
            <>
              <Big>{owed ? t(`${fmt(taught, lang)} von ${fmt(owed, lang)} UE`, `${fmt(taught, lang)} of ${fmt(owed, lang)} units`) : t(`${fmt(taught, lang)} UE`, `${fmt(taught, lang)} units`)}</Big>
              {owed ? <Meter part={taught} whole={owed} colour={TAUGHT} label={`${Math.round((taught / owed) * 100)} %`} /> : null}
            </>
          ) : (
            <Empty t={t} />
          )}
        </Tile>
      </div>

      {data.hasSheet ? (
        <Card title={t('Plus- und Minusstunden je Monat', 'Plus and minus hours by month')}>
          <Diverging months={data.months} hours={hours} monthName={monthName} t={t} />
          <Legend items={[{ colour: PLUS, label: t('Überstunden', 'Overtime') }, { colour: MINUS, label: t('Minusstunden', 'Minus hours') }]} />
        </Card>
      ) : null}

      {withSheet.some((m) => m.running !== null) ? (
        <Card title={t('Saldo im Lauf des Jahres', 'Balance over the year')}>
          <RunningLine months={data.months} hours={hours} monthName={monthName} />
        </Card>
      ) : null}

      {data.months.some((m) => m.units !== null) ? (
        <Card title={t('Unterricht je Monat', 'Teaching by month')}>
          <UnitBars months={data.months} monthName={monthName} lang={lang} t={t} today={today} />
          <Legend
            items={[
              { colour: TAUGHT, label: t('Gehalten', 'Taught') },
              { colour: PLANNED, label: t('Geplant', 'Planned') },
              { colour: 'var(--casa-ink)', label: t('Laut Vertrag', 'By contract'), tick: true },
            ]}
          />
        </Card>
      ) : null}

      <details className="group rounded-2xl bg-white ring-1 ring-ws-line ring-inset">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[0.86rem] font-semibold text-[var(--casa-ink)] outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40">
          {t('Als Tabelle', 'As a table')}
        </summary>
        <div className="overflow-x-auto border-t border-ws-line-soft">
          <table className="w-full text-[0.84rem] tabular-nums">
            <thead className="text-left text-[0.75rem] text-[var(--casa-muted)]">
              <tr>
                <th className="px-5 py-2 font-semibold">{t('Monat', 'Month')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('Soll', 'Target')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('Ist', 'Worked')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('Plus/Minus', 'Plus/minus')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('Saldo', 'Balance')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('Urlaub übrig', 'Holiday left')}</th>
                <th className="px-5 py-2 text-right font-semibold">UE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ws-line-soft">
              {data.months.map((m) => (
                <tr key={m.month}>
                  <td className="px-5 py-2 font-semibold text-[var(--casa-ink)]">
                    {monthName(m.month, 'long')}
                    {m.approved ? <span className="ml-1.5 text-[0.72rem] font-medium text-[var(--casa-muted)]">{t('freigegeben', 'approved')}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right">{m.target !== null ? hours(m.target) : '—'}</td>
                  <td className="px-3 py-2 text-right">{m.worked !== null ? hours(m.worked) : '—'}</td>
                  <td className="px-3 py-2 text-right">{m.balance !== null ? hours(m.balance, true) : '—'}</td>
                  <td className="px-3 py-2 text-right">{m.running !== null ? hours(m.running, true) : '—'}</td>
                  <td className="px-3 py-2 text-right">{m.holidayLeft !== null ? fmt(m.holidayLeft, lang) : '—'}</td>
                  <td className="px-5 py-2 text-right">
                    {m.units !== null ? `${fmt(m.units, lang)}${m.contractUnits ? ` / ${fmt(m.contractUnits, lang)}` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

const fmt = (v: number, lang: WsLang) => v.toLocaleString(wsLocale(lang), { maximumFractionDigits: 1 });

function Tile({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[7.5rem] flex-col rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-ws-line ring-inset">
      <span className="text-[0.75rem] font-semibold text-[var(--casa-muted)]">{label}</span>
      <div className="mt-1.5 flex flex-1 flex-col gap-2">{children}</div>
      {hint ? <span className="mt-2 text-[0.75rem] text-[var(--casa-muted)]">{hint}</span> : null}
    </div>
  );
}

const Big = ({ children }: { children: ReactNode }) => <span className="text-[1.6rem] leading-tight font-bold tracking-tight text-[var(--casa-ink)] tabular-nums">{children}</span>;

const Empty = ({ t }: { t: T }) => <span className="text-[0.9rem] text-[var(--casa-muted)]">{t('Noch keine Angaben', 'Nothing yet')}</span>;

/** Ahead, behind or even — in words beside its colour, never colour alone. */
function Verdict({ value, t }: { value: number; t: T }) {
  const even = Math.abs(value) < 0.5;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold',
        even ? 'bg-ws-sunk text-[var(--casa-muted)]' : value > 0 ? 'bg-[#e8f0fc] text-[#1d4f9e]' : 'bg-[#fdecec] text-[#9b1c1c]'
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: even ? '#a3abb8' : value > 0 ? PLUS : MINUS }} />
      {even ? t('ausgeglichen', 'even') : value > 0 ? t('Überstunden', 'overtime') : t('Minusstunden', 'minus hours')}
    </span>
  );
}

function Meter({ part, whole, colour, label }: { part: number; whole: number; colour: string; label: string }) {
  const share = whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ws-sunk">
        <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: colour }} />
      </span>
      <span className="text-[0.75rem] font-semibold text-[var(--casa-muted)] tabular-nums">{label}</span>
    </span>
  );
}

function Legend({ items }: { items: { colour: string; label: string; tick?: boolean }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-[var(--casa-muted)]">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.tick ? <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: i.colour }} /> : <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: i.colour }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- charts */

const W = 720;
const PAD = { left: 44, right: 12, top: 14, bottom: 26 };
const plotW = W - PAD.left - PAD.right;
const slot = plotW / 12;
const xOf = (i: number) => PAD.left + slot * i + slot / 2;

/** A tooltip over the month a pointer is on; the hit area is the whole month column, wider than its mark. */
function useHover() {
  const [at, setAt] = useState<number | null>(null);
  return { at, enter: (i: number) => () => setAt(i), leave: () => setAt(null) };
}

function Tip({ index, children }: { index: number; children: ReactNode }) {
  const left = `${(xOf(index) / W) * 100}%`;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-[var(--casa-ink)] px-2.5 py-1.5 text-[0.75rem] leading-snug font-medium whitespace-nowrap text-white shadow-lg"
      style={{ left }}
    >
      {children}
    </div>
  );
}

/** Nice round gridlines for a range that includes zero. */
function ticks(min: number, max: number): number[] {
  const span = Math.max(1, max - min);
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => span / s <= 5) ?? 1000;
  const out: number[] = [];
  // From the step at or below the lowest value to the step at or above the highest: the marks stay inside.
  for (let v = Math.floor(min / step) * step; v < Math.ceil(max / step) * step + step / 2; v += step) out.push(v);
  return out;
}

function Axis({ y, values, label }: { y: (v: number) => number; values: number[]; label: (v: number) => string }) {
  return (
    <g>
      {values.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#a3abb8' : '#eef0f4'} strokeWidth={v === 0 ? 1.25 : 1} />
          <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="#7b8494">
            {label(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

function Months({ months, monthName, height }: { months: TimeMonth[]; monthName: (m: string) => string; height: number }) {
  return (
    <g>
      {months.map((m, i) => (
        <text key={m.month} x={xOf(i)} y={height - 8} textAnchor="middle" fontSize={11} fill="#7b8494">
          {monthName(m.month)}
        </text>
      ))}
    </g>
  );
}

function Diverging({ months, hours, monthName, t }: { months: TimeMonth[]; hours: (v: number, signed?: boolean) => string; monthName: (m: string, s?: 'short' | 'long') => string; t: T }) {
  const H = 220;
  const values = months.map((m) => m.balance ?? 0);
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  const grid = ticks(lo, hi);
  const top = Math.max(hi, grid.at(-1) ?? 0), bottom = Math.min(lo, grid[0] ?? 0);
  const y = (v: number) => PAD.top + ((top - v) / Math.max(1, top - bottom)) * (H - PAD.top - PAD.bottom);
  const hover = useHover();
  const bar = Math.min(28, slot * 0.56);
  const m = hover.at !== null ? months[hover.at] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t('Plus- und Minusstunden je Monat', 'Plus and minus hours by month')}>
        <Axis y={y} values={grid} label={(v) => `${v > 0 ? '+' : ''}${v}`} />
        {months.map((mo, i) => {
          if (mo.balance === null) return null;
          const v = mo.balance;
          const y0 = y(0), y1 = y(v);
          const h = Math.max(1, Math.abs(y1 - y0));
          // Rounded at the data end only, squared on the zero line it grows from.
          const r = Math.min(4, h);
          const x = xOf(i) - bar / 2;
          const path = v >= 0
            ? `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bar - r} Q${x + bar},${y1} ${x + bar},${y1 + r} V${y0} Z`
            : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + bar - r} Q${x + bar},${y1} ${x + bar},${y1 - r} V${y0} Z`;
          return <path key={mo.month} d={path} fill={v >= 0 ? PLUS : MINUS} opacity={hover.at === null || hover.at === i ? 1 : 0.45} />;
        })}
        <Months months={months} monthName={monthName} height={H} />
        {months.map((mo, i) => (
          <rect key={mo.month} x={PAD.left + slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={hover.enter(i)} onPointerLeave={hover.leave} />
        ))}
      </svg>
      {m && hover.at !== null ? (
        <Tip index={hover.at}>
          <b className="font-semibold">{monthName(m.month, 'long')}</b>
          {m.balance !== null ? <span className="block">{hours(m.balance, true)}</span> : <span className="block">{t('keine Angabe', 'no figure')}</span>}
          {m.worked !== null && m.target !== null ? <span className="block text-white/75">{t(`${hours(m.worked)} von ${hours(m.target)}`, `${hours(m.worked)} of ${hours(m.target)}`)}</span> : null}
        </Tip>
      ) : null}
    </div>
  );
}

function RunningLine({ months, hours, monthName }: { months: TimeMonth[]; hours: (v: number, signed?: boolean) => string; monthName: (m: string, s?: 'short' | 'long') => string }) {
  const H = 200;
  const points = months.map((m, i) => ({ i, v: m.running })).filter((p): p is { i: number; v: number } => p.v !== null);
  const lo = Math.min(0, ...points.map((p) => p.v)), hi = Math.max(0, ...points.map((p) => p.v));
  const grid = ticks(lo, hi);
  const top = Math.max(hi, grid.at(-1) ?? 0), bottom = Math.min(lo, grid[0] ?? 0);
  const y = (v: number) => PAD.top + ((top - v) / Math.max(1, top - bottom)) * (H - PAD.top - PAD.bottom);
  const hover = useHover();
  const d = points.map((p, k) => `${k ? 'L' : 'M'}${xOf(p.i)},${y(p.v)}`).join(' ');
  const at = hover.at !== null ? points.find((p) => p.i === hover.at) : undefined;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Saldo">
        <Axis y={y} values={grid} label={(v) => `${v > 0 ? '+' : ''}${v}`} />
        {at ? <line x1={xOf(at.i)} x2={xOf(at.i)} y1={PAD.top} y2={H - PAD.bottom} stroke="#c5cad3" strokeWidth={1} /> : null}
        <path d={d} fill="none" stroke="var(--casa-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.i} cx={xOf(p.i)} cy={y(p.v)} r={hover.at === p.i ? 5 : 4} fill={p.v >= 0 ? PLUS : MINUS} stroke="#fff" strokeWidth={2} />
        ))}
        <Months months={months} monthName={monthName} height={H} />
        {months.map((mo, i) => (
          <rect key={mo.month} x={PAD.left + slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={hover.enter(i)} onPointerLeave={hover.leave} />
        ))}
      </svg>
      {at ? (
        <Tip index={at.i}>
          <b className="font-semibold">{monthName(months[at.i].month, 'long')}</b>
          <span className="block">{hours(at.v, true)}</span>
        </Tip>
      ) : null}
    </div>
  );
}

function UnitBars({ months, monthName, lang, t, today }: { months: TimeMonth[]; monthName: (m: string, s?: 'short' | 'long') => string; lang: WsLang; t: T; today: string }) {
  const H = 200;
  const hi = Math.max(1, ...months.map((m) => Math.max(m.units ?? 0, m.contractUnits ?? 0)));
  const grid = ticks(0, hi);
  const top = Math.max(hi, grid.at(-1) ?? 0);
  const y = (v: number) => PAD.top + ((top - v) / top) * (H - PAD.top - PAD.bottom);
  const hover = useHover();
  const bar = Math.min(28, slot * 0.56);
  const m = hover.at !== null ? months[hover.at] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t('Unterricht je Monat', 'Teaching by month')}>
        <Axis y={y} values={grid} label={(v) => String(v)} />
        {months.map((mo, i) => {
          const x = xOf(i) - bar / 2;
          const y1 = y(mo.units ?? 0), y0 = y(0);
          const h = y0 - y1;
          const r = Math.min(4, h);
          return (
            <g key={mo.month} opacity={hover.at === null || hover.at === i ? 1 : 0.45}>
              {mo.units ? <path d={`M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bar - r} Q${x + bar},${y1} ${x + bar},${y1 + r} V${y0} Z`} fill={mo.month > today ? PLANNED : TAUGHT} /> : null}
              {mo.contractUnits ? <line x1={x - 4} x2={x + bar + 4} y1={y(mo.contractUnits)} y2={y(mo.contractUnits)} stroke="var(--casa-ink)" strokeWidth={2} strokeLinecap="round" /> : null}
            </g>
          );
        })}
        <Months months={months} monthName={monthName} height={H} />
        {months.map((mo, i) => (
          <rect key={mo.month} x={PAD.left + slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={hover.enter(i)} onPointerLeave={hover.leave} />
        ))}
      </svg>
      {m && hover.at !== null ? (
        <Tip index={hover.at}>
          <b className="font-semibold">{monthName(m.month, 'long')}</b>
          <span className="block">
            {m.units === null
              ? t('keine Unterrichtstage hier', 'no lesson days here')
              : m.contractUnits
                ? t(`${fmt(m.units, lang)} von ${fmt(m.contractUnits, lang)} UE${m.month > today ? ' geplant' : ''}`, `${fmt(m.units, lang)} of ${fmt(m.contractUnits, lang)} units${m.month > today ? ' planned' : ''}`)
                : t(`${fmt(m.units, lang)} UE${m.month > today ? ' geplant' : ''}`, `${fmt(m.units, lang)} units${m.month > today ? ' planned' : ''}`)}
          </span>
        </Tip>
      ) : null}
    </div>
  );
}
