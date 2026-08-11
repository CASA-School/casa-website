import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  locale?: 'en' | 'de';
  align?: 'top' | 'bottom';
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Select date...',
  className,
  hasError,
  locale = 'en',
  align = 'bottom'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial date value
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month, day);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const defaultYear = parsedDate ? parsedDate.getFullYear() : currentYear - 20; // Default to 20 years ago if no date is set (reasonable for Date of Birth)
  const defaultMonth = parsedDate ? parsedDate.getMonth() : 0;

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const [prevValue, setPrevValue] = useState(value);

  // Sync state if value changes externally
  if (value !== prevValue) {
    setPrevValue(value);
    if (parsedDate) {
      setYear(parsedDate.getFullYear());
      setMonth(parsedDate.getMonth());
    }
  }

  const months = locale === 'de' ? MONTHS_DE : MONTHS_EN;
  const daysOfWeek = locale === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Years array (from 1920 to current year)
  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayOffset = useMemo(() => {
    // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const day = new Date(year, month, 1).getDay();
    // Shift so 0 is Monday, 6 is Sunday
    return day === 0 ? 6 : day - 1;
  }, [year, month]);

  const blankDays = useMemo(() => {
    return Array.from({ length: firstDayOffset });
  }, [firstDayOffset]);

  const monthDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const formatted = `${year}-${mStr}-${dStr}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const formatDateLabel = (val: string) => {
    if (!parsedDate) return val;
    // Format to DD.MM.YYYY for German / standard layout
    const dStr = String(parsedDate.getDate()).padStart(2, '0');
    const mStr = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const yStr = parsedDate.getFullYear();
    return `${dStr}.${mStr}.${yStr}`;
  };

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-4 text-left text-sm text-[var(--casa-ink)] transition-all",
          "focus:border-[var(--casa-blue)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--casa-blue)]/10",
          hasError ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10" : "",
          className
        )}
      >
        <span className={cn(!value && "text-slate-500")}>
          {value ? formatDateLabel(value) : placeholder}
        </span>
        <Calendar className="h-4.5 w-4.5 text-[var(--casa-text-subtle)]" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute left-0 z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-modal)] duration-200",
            align === 'top'
              ? "bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2"
              : "mt-2 animate-in fade-in slide-in-from-top-2"
          )}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="rounded-lg border-0 bg-transparent py-1 px-2 text-xs font-bold text-[var(--casa-ink)] hover:bg-slate-100 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="rounded-lg border-0 bg-transparent py-1 px-2 text-xs font-bold text-[var(--casa-ink)] hover:bg-slate-100 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mt-3 text-center text-[10px] uppercase font-bold tracking-[0.12em] text-[var(--casa-text-subtle)]">
              {daysOfWeek.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mt-1 text-center text-xs">
              {blankDays.map((_, idx) => (
                <div key={`blank-${idx}`} />
              ))}
              {monthDays.map((d) => {
                const isSelected = parsedDate &&
                  parsedDate.getDate() === d &&
                  parsedDate.getMonth() === month &&
                  parsedDate.getFullYear() === year;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={cn(
                      "h-8 w-8 rounded-lg font-bold transition-all",
                      isSelected
                        ? "bg-[var(--casa-accent-surface)] text-white shadow-[var(--shadow-card)] shadow-[var(--casa-blue)]/10"
                        : "text-[var(--casa-ink)] hover:bg-slate-100"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
