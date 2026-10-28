'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SlotDay = { date: string; times: string[] };

export type SlotPickerLabels = {
  date: string;
  time: string;
  zone: string;
  choose: string;
  noTimes: string;
  previousMonth: string;
  nextMonth: string;
  weekdays: readonly string[];
};

/**
 * A month of days and the chosen day's times, the way the appointment popups pick a time: Ina's
 * group consultations and the placement test in person. `note` writes a line under a time
 * („noch 1 Platz").
 */
export function SlotPicker({
  days,
  date,
  time,
  onDate,
  onTime,
  labels,
  language,
  note,
}: {
  days: SlotDay[];
  date: string;
  time: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  labels: SlotPickerLabels;
  language: string;
  note?: (date: string, time: string) => string | null;
}) {
  const [month, setMonth] = useState(() => (date || days[0]?.date || '').slice(0, 7));
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  const monthIndex = months.indexOf(month);
  const monthDate = new Date(`${month || '2000-01'}-01T12:00:00Z`);
  const offset = (monthDate.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const dateLabel = (value: string) => new Intl.DateTimeFormat(language, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
  const selectedDay = days.find((day) => day.date === date);

  return <div className="grid gap-7 sm:grid-cols-[1.25fr_1fr]">
    <section aria-label={labels.date}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button aria-label={labels.previousMonth} variant="ghost" size="icon-lg" disabled={monthIndex <= 0} onClick={() => setMonth(months[monthIndex - 1])}><ChevronLeft aria-hidden /></Button>
        <h3 aria-live="polite" className="text-base font-semibold">{new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)}</h3>
        <Button aria-label={labels.nextMonth} variant="ghost" size="icon-lg" disabled={monthIndex >= months.length - 1} onClick={() => setMonth(months[monthIndex + 1])}><ChevronRight aria-hidden /></Button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {labels.weekdays.map((day, index) => <span key={index} className="pb-2 text-xs text-[var(--casa-muted)]" aria-hidden>{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const value = `${month}-${String(index + 1).padStart(2, '0')}`;
          const enabled = days.some((day) => day.date === value && day.times.length);
          return <button key={value} type="button" aria-label={dateLabel(value)} aria-pressed={value === date} disabled={!enabled}
            onClick={() => onDate(value)}
            className={cn('min-h-11 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--casa-blue)] disabled:text-[var(--casa-muted)] disabled:opacity-40',
              value === date ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-ink)] enabled:hover:bg-[var(--casa-warm-soft)]')}>
            {index + 1}
          </button>;
        })}
      </div>
    </section>
    <section aria-label={labels.time} className="border-t border-[var(--casa-sand)] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-2">
      <h3 className="text-base font-semibold">{labels.time}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[var(--casa-muted)]">{labels.zone}</p>
      {date && <p className="mt-4 text-sm font-medium">{dateLabel(date)}</p>}
      <div aria-live="polite">
        {!date ? <p className="mt-5 text-sm leading-relaxed text-[var(--casa-muted)]">{labels.choose}</p> : !selectedDay?.times.length ? <p className="mt-5 text-sm text-[var(--casa-muted)]">{labels.noTimes}</p> :
          <div className="mt-4 grid grid-cols-2 gap-2">{selectedDay.times.map((slot) => {
            const line = note?.(date, slot);
            return <Button key={slot} variant={slot === time ? 'prism' : 'outline-prism'} size="lg" aria-pressed={slot === time} onClick={() => onTime(slot)}
              className={cn(line && 'h-auto flex-col gap-0 py-2')}>
              {slot}
              {line ? <span className="text-[0.7rem] font-medium opacity-75">{line}</span> : null}
            </Button>;
          })}</div>}
      </div>
    </section>
  </div>;
}
