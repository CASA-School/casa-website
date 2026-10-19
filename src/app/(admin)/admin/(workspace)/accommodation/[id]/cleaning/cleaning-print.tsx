'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { useWsLang } from '@/components/admin/lang';
import { printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import type { FlatCleaning } from '@/lib/admin/cleaning';
import { weekPlan } from '@/lib/admin/cleaning-plan';
import { cn } from '@/lib/utils';

const subscribeNothing = () => () => {};
const plus = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const de = (iso: string, options: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { ...options, timeZone: 'UTC' });
function isoWeek(iso: string): number {
  const d = new Date(`${iso}T12:00:00Z`);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  const firstThursday = new Date(jan4.getTime() + (3 - ((jan4.getUTCDay() + 6) % 7)) * 86_400_000);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** Print tones, a duty each: soft enough to print, clear enough to find one's own. */
const PRINT_TONES = ['#d9f1ec', '#dce8fb', '#e7e0fa', '#ffefcc', '#fbdde4', '#e8ecf1'];

/**
 * A flat's Putzplan for its notice board (2026-10-19): A4 across, in German and English, as the learners
 * in the flats come from everywhere — four weeks, each room with who lives there and their duty, and what
 * each duty means.
 */
export function CleaningPrint({ flat, monday, plan }: { flat: string; monday: string; plan: FlatCleaning }) {
  const { t } = useWsLang();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => printLetter(`Putzplan ${flat} ${monday}`)}>
          {t('Drucken / PDF', 'Print / PDF')}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-ws-line bg-[#eef1f5] p-4 sm:p-6">
        <div className="mx-auto w-fit bg-white px-[10mm] py-[9mm] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_24px_48px_-30px_rgba(15,23,42,0.45)]">
          <Notice flat={flat} monday={monday} plan={plan} />
        </div>
      </div>
      {mounted
        ? createPortal(
            <div data-letter-print className="ws-attendance-print hidden bg-white">
              <Notice flat={flat} monday={monday} plan={plan} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Notice({ flat, monday, plan }: { flat: string; monday: string; plan: FlatCleaning }) {
  const weeks = [0, 1, 2, 3].map((w) => plus(monday, w * 7));
  const tenant = (roomId: string, week: string) => {
    const mid = plus(week, 2);
    const own = plan.tenants.filter((s) => s.roomId === roomId && s.from <= plus(week, 6) && s.to > week);
    return (own.find((s) => s.from <= mid && s.to > mid) ?? own[0])?.name ?? null;
  };
  const tone = (i: number) => PRINT_TONES[i % PRINT_TONES.length];
  return (
    <div className="w-[277mm] text-[#111827]">
      <div className="flex items-end justify-between border-b-[1.5pt] border-[#111827] pb-[2.5mm]">
        <div className="flex items-baseline gap-[4mm]">
          <span className="font-[family-name:var(--font-display)] text-[17pt] leading-none font-semibold tracking-[0.06em]">CASA</span>
          <span className="text-[13pt] font-extrabold">
            Putzplan <span className="font-semibold text-[#4b5563]">· Cleaning rota</span>
          </span>
        </div>
        <div className="text-right">
          <span className="text-[15pt] font-extrabold">{flat}</span>
          <span className="block text-[8.5pt] font-semibold text-[#4b5563]">
            {de(weeks[0], { day: '2-digit', month: '2-digit' })} – {de(plus(weeks[3], 6), { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      </div>

      <table className="mt-[5mm] w-full table-fixed border-collapse text-[9pt]">
        <thead>
          <tr>
            <th className="w-[34mm] border border-[#6b7280] bg-[#f3f4f6] px-[2mm] py-[1.5mm] text-left font-semibold">Zimmer · Room</th>
            {weeks.map((w) => (
              <th key={w} className="border border-[#6b7280] bg-[#f3f4f6] px-[2mm] py-[1.5mm] text-left font-semibold">
                KW {isoWeek(w)} <span className="font-medium text-[#4b5563]">· {de(w, { day: 'numeric', month: 'numeric' })}–{de(plus(w, 6), { day: 'numeric', month: 'numeric' })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.rooms.map((room, r) => (
            <tr key={room.id} className="h-[12mm]">
              <th className="border border-[#9ca3af] px-[2mm] text-left text-[10pt] font-bold">{room.name}</th>
              {weeks.map((w) => {
                const duty = plan.from ? weekPlan(plan.rooms, plan.duties, plan.from, w)[r] : null;
                const who = tenant(room.id, w);
                return (
                  <td key={w} className="border border-[#9ca3af] px-[2mm] py-[1mm] align-middle" style={duty ? { background: tone(plan.duties.indexOf(duty)) } : undefined}>
                    <span className="block text-[10pt] font-extrabold">{duty ? `${duty.nameDe}${duty.nameEn && duty.nameEn !== duty.nameDe ? ` · ${duty.nameEn}` : ''}` : 'frei · free'}</span>
                    <span className={cn('block truncate text-[8pt]', who ? 'text-[#374151]' : 'text-[#9ca3af]')}>{who ?? '—'}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-[6mm] grid gap-[4mm]" style={{ gridTemplateColumns: `repeat(${Math.min(plan.duties.length, 5)}, minmax(0, 1fr))` }}>
        {plan.duties.map((duty, i) => (
          <div key={duty.id} className="break-inside-avoid rounded-[2mm] border border-[#d1d5db] p-[3mm]">
            <p className="inline-block rounded-[1.5mm] px-[2mm] py-[0.5mm] text-[9.5pt] font-extrabold" style={{ background: tone(i) }}>
              {duty.nameDe}
              {duty.nameEn && duty.nameEn !== duty.nameDe ? <span className="font-semibold text-[#4b5563]"> · {duty.nameEn}</span> : null}
            </p>
            <ul className="mt-[2mm] space-y-[1mm] text-[8.5pt] leading-snug">
              {duty.tasks.map((task, k) => (
                <li key={k} className="flex gap-[1.5mm]">
                  <span aria-hidden="true">☐</span>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
