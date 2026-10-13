'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { addMonths, formatDay, isoParts, monthGrid, monthTitle, parseTypedDate, weekday, WEEKDAYS } from '@/lib/admin/calendar';
import { addDays, daysBetween } from '@/lib/admin/offers/stay';
import { todayInputValue } from '@/lib/dates';

import s from './date-picker.module.css';

/**
 * The workspace's date picker, in place of the browser's own.
 *
 * `DateInput` is a field a date is typed into — "11.4.27", "11 April",
 * "+14" — and shows it with its weekday, "Sun 11 Apr 2027", because a group
 * arrives on a Sunday. `Calendar` is a month (or two) to click, with the
 * arrow keys, Page Up/Down and Enter working on it. `DateField` is the two
 * together, the calendar in a small panel; `DateRange` is an arrival and a
 * departure on one two-month calendar, with the stay's nights and its usual
 * lengths to pick from. `DateFormField` is a `DateField` inside a server-action
 * form, under the field's `name`. All pure arithmetic is in
 * src/lib/admin/calendar.ts.
 *
 * `today` is optional: a calendar that only opens after a click reads the
 * clock in the browser, where "today" is the colleague's own.
 */

const CALENDAR_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
    <path d="M2.5 7h11M5.5 2v3M10.5 2v3" />
  </svg>
);

const inBounds = (iso: string, min?: string | null, max?: string | null) => (!min || iso >= min) && (!max || iso <= max);
const toGerman = (iso: string) => {
  const { y, m, d } = isoParts(iso);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
};

// --------------------------------------------------------------- input

export function DateInput({
  id,
  value,
  onCommit,
  today,
  min,
  max,
  placeholder = 'Type or pick a date',
  ariaLabel,
  onFocus,
  toggle,
}: {
  id?: string;
  value: string | null;
  onCommit: (iso: string | null) => void;
  today?: string;
  min?: string | null;
  max?: string | null;
  placeholder?: string;
  ariaLabel?: string;
  onFocus?: () => void;
  toggle?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    setEditing(false);
    const typed = text.trim();
    if (!typed) {
      setInvalid(false);
      if (value) onCommit(null);
      return;
    }
    const parsed = parseTypedDate(typed, today ?? todayInputValue());
    if (parsed && inBounds(parsed, min, max)) {
      setInvalid(false);
      if (parsed !== value) onCommit(parsed);
    } else {
      setInvalid(true);
    }
  };

  return (
    <span className={`${s.field} ${toggle ? s.withToggle : ''}`}>
      {CALENDAR_ICON}
      <input
        id={id}
        className={s.input}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={editing ? text : value ? formatDay(value) : ''}
        onFocus={(e) => {
          setEditing(true);
          setText(value ? toGerman(value) : '');
          onFocus?.();
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setEditing(false);
            setInvalid(false);
          }
        }}
      />
      {toggle}
    </span>
  );
}

// ------------------------------------------------------------ calendar

type Single = { mode: 'single'; value: string | null; onPick: (iso: string) => void };
type Range = { mode: 'range'; from: string | null; to: string | null; onPick: (iso: string) => void; picking: 'start' | 'end' };

export function Calendar({
  today: givenToday,
  min,
  max,
  months = 1,
  compact,
  ...pick
}: (Single | Range) & { today?: string; min?: string | null; max?: string | null; months?: 1 | 2; compact?: boolean }) {
  const today = givenToday ?? todayInputValue();
  const anchor = (pick.mode === 'single' ? pick.value : pick.from) ?? (min && min > today ? min : today);
  const [view, setView] = useState(() => {
    const { y, m } = isoParts(anchor);
    return { y, m };
  });
  const [focus, setFocus] = useState(anchor);
  const [hover, setHover] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const keyed = useRef(false);

  // A value set from outside (typed, or a quick choice) brings its month into view.
  const [shown, setShown] = useState(anchor);
  if (shown !== anchor) {
    setShown(anchor);
    const { y, m } = isoParts(anchor);
    const last = addMonths(view.y, view.m, months - 1);
    const visible = (y > view.y || (y === view.y && m >= view.m)) && (y < last.y || (y === last.y && m <= last.m));
    if (!visible) setView({ y, m });
    setFocus(anchor);
  }

  useEffect(() => {
    if (!keyed.current) return;
    keyed.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus();
  }, [focus, view]);

  const moveFocus = (next: string) => {
    keyed.current = true;
    setFocus(next);
    const { y, m } = isoParts(next);
    const last = addMonths(view.y, view.m, months - 1);
    if (y < view.y || (y === view.y && m < view.m)) setView({ y, m });
    else if (y > last.y || (y === last.y && m > last.m)) setView(addMonths(y, m, -(months - 1)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in steps) {
      e.preventDefault();
      moveFocus(addDays(focus, steps[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const { y, m, d } = isoParts(focus);
      const to = addMonths(y, m, e.key === 'PageUp' ? -1 : 1);
      const day = Math.min(d, new Date(Date.UTC(to.y, to.m, 0)).getUTCDate());
      moveFocus(`${to.y}-${String(to.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      moveFocus(addDays(focus, e.key === 'Home' ? -weekday(focus) : 6 - weekday(focus)));
    }
  };

  const range = pick.mode === 'range' ? pick : null;
  const previewEnd = range && range.picking === 'end' && range.from && hover && hover > range.from ? hover : null;

  const classFor = (iso: string) => {
    const c = [s.day];
    if (weekday(iso) >= 5) c.push(s.weekend);
    if (iso === today) c.push(s.today);
    if (pick.mode === 'single') {
      if (iso === pick.value) c.push(s.selected);
    } else {
      const end = previewEnd ?? pick.to;
      if (iso === pick.from) c.push(s.start);
      if (end && iso === end && !previewEnd) c.push(s.end);
      if (previewEnd && iso === previewEnd) c.push(s.end);
      if (pick.from && end && iso > pick.from && iso < end) c.push(previewEnd ? s.preview : s.inRange);
    }
    return c.join(' ');
  };

  return (
    <div className={`${s.cal} ${compact ? s.compact : ''}`} onMouseLeave={() => setHover(null)}>
      <button type="button" className={`${s.nav} ${s.prev}`} aria-label="Previous month" onClick={() => setView((v) => addMonths(v.y, v.m, -1))}>
        ‹
      </button>
      <button type="button" className={`${s.nav} ${s.next}`} aria-label="Next month" onClick={() => setView((v) => addMonths(v.y, v.m, 1))}>
        ›
      </button>
      <div className={s.months} ref={grid} onKeyDown={onKey}>
        {Array.from({ length: months }, (_, i) => addMonths(view.y, view.m, i)).map(({ y, m }) => (
          <div key={`${y}-${m}`} className={s.month}>
            <div className={s.title}>{monthTitle(y, m)}</div>
            <div className={s.grid} role="grid" aria-label={monthTitle(y, m)}>
              <div className={s.row} role="row">
                {WEEKDAYS.map((w) => (
                  <span key={w} className={s.wd} role="columnheader">
                    {w}
                  </span>
                ))}
              </div>
              {monthGrid(y, m).map((week, i) => (
                <div key={i} className={s.row} role="row">
                  {week.map((iso, j) =>
                    iso ? (
                      <button
                        key={iso}
                        type="button"
                        role="gridcell"
                        data-iso={iso}
                        tabIndex={iso === focus ? 0 : -1}
                        aria-selected={pick.mode === 'single' ? iso === pick.value : iso === pick.from || iso === pick.to}
                        aria-label={formatDay(iso)}
                        disabled={!inBounds(iso, min, max)}
                        className={classFor(iso)}
                        onMouseEnter={() => setHover(iso)}
                        onFocus={() => setFocus(iso)}
                        onClick={() => pick.onPick(iso)}
                      >
                        {isoParts(iso).d}
                      </button>
                    ) : (
                      <span key={`b${j}`} className={s.blank} />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------ in a panel of its own

export type QuickDate = { label: string; value: string };

/** A date typed or picked, where the panel around it is already open: the offer's validity. */
export function InlineDatePicker({
  value,
  onChange,
  today,
  min,
  max,
  quick = [],
  ariaLabel,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  today: string;
  min?: string | null;
  max?: string | null;
  quick?: QuickDate[];
  ariaLabel?: string;
}) {
  return (
    <div className={s.range}>
      <DateInput value={value} onCommit={onChange} today={today} min={min} max={max} ariaLabel={ariaLabel} />
      <Calendar mode="single" value={value} onPick={onChange} today={today} min={min} max={max} compact />
      {quick.length ? (
        <div className={s.foot}>
          {quick.map((q) => (
            <button key={q.label} type="button" className={`${s.chip} ${q.value === value ? s.chipOn : ''}`} onClick={() => onChange(q.value)}>
              {q.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------- field with a calendar

export function DateField({
  id,
  value,
  onChange,
  today,
  min,
  max,
  quick = [],
  ariaLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  today?: string;
  min?: string | null;
  max?: string | null;
  quick?: QuickDate[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  // Near the foot of the window the calendar opens upwards, not off the screen.
  const show = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (box) setUp(window.innerHeight - box.bottom < 400 && box.top > window.innerHeight - box.bottom);
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const choose = (iso: string | null) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <DateInput
        id={id}
        value={value}
        onCommit={onChange}
        today={today}
        min={min}
        max={max}
        ariaLabel={ariaLabel}
        onFocus={show}
        toggle={
          <button type="button" className={s.toggle} aria-label="Open the calendar" aria-expanded={open} onClick={() => (open ? setOpen(false) : show())}>
            {CALENDAR_ICON}
          </button>
        }
      />
      {open ? (
        <div className={`${s.pop} ${up ? s.popUp : ''}`} role="dialog" aria-label="Pick a date">
          <Calendar mode="single" value={value} onPick={choose} today={today} min={min} max={max} compact />
          {quick.length ? (
            <div className={s.foot} style={{ marginTop: 10 }}>
              {quick.map((q) => (
                <button key={q.label} type="button" className={`${s.chip} ${q.value === value ? s.chipOn : ''}`} onClick={() => choose(q.value)}>
                  {q.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------- a stay's dates

/**
 * Arrival and departure on one calendar. The first click is the arrival and
 * proposes the departure (`suggestEnd`, a package's own length); the next
 * click, after it, is the departure. Under the calendar: the nights, and one
 * to four weeks from the arrival — Sunday to Saturday, as groups travel.
 */
export function DateRange({
  from,
  to,
  onChange,
  today,
  suggestEnd,
  months = 2,
  compact,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  today?: string;
  suggestEnd?: (from: string) => string | null;
  months?: 1 | 2;
  compact?: boolean;
}) {
  const [picking, setPicking] = useState<'start' | 'end'>(from && !to ? 'end' : 'start');
  const id = useId();
  const nights = from && to && to > from ? daysBetween(from, to) : null;

  const pickDay = (iso: string) => {
    if (picking === 'end' && from && iso > from) {
      onChange(from, iso);
      setPicking('start');
    } else {
      onChange(iso, suggestEnd?.(iso) ?? (to && to > iso ? to : null));
      setPicking('end');
    }
  };

  return (
    <div className={s.range}>
      <div className={s.ends}>
        <div>
          <label htmlFor={`${id}-from`}>Arrival</label>
          <DateInput
            id={`${id}-from`}
            value={from}
            today={today}
            onFocus={() => setPicking('start')}
            onCommit={(v) => {
              onChange(v, v && to && to > v ? to : v ? (suggestEnd?.(v) ?? null) : to);
              setPicking(v ? 'end' : 'start');
            }}
          />
        </div>
        <div>
          <label htmlFor={`${id}-to`}>Departure</label>
          <DateInput
            id={`${id}-to`}
            value={to}
            today={today}
            min={from ? addDays(from, 1) : null}
            onFocus={() => setPicking('end')}
            onCommit={(v) => {
              onChange(from, v);
              setPicking('start');
            }}
          />
        </div>
      </div>
      <Calendar mode="range" from={from} to={to} picking={picking} onPick={pickDay} today={today} months={months} compact={compact} />
      <div className={s.foot}>
        <span>
          {nights != null
            ? `${nights} ${nights === 1 ? 'night' : 'nights'} · ${formatDay(from!).slice(0, 3)} to ${formatDay(to!).slice(0, 3)}`
            : picking === 'end' && from
              ? 'Now the departure'
              : 'Pick the arrival'}
        </span>
        {from
          ? [1, 2, 3, 4].map((w) => {
              const end = addDays(from, w * 7 - 1);
              return (
                <button key={w} type="button" className={`${s.chip} ${to === end ? s.chipOn : ''}`} onClick={() => onChange(from, end)}>
                  {w} {w === 1 ? 'week' : 'weeks'}
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------- in a form

/**
 * A date inside a server-action form: the field and its calendar, posting
 * `YYYY-MM-DD` under `name`. `required` is kept by a 1px field under the
 * input, so the browser's own "fill this in" points at the date. A change is
 * announced like a typed one, so `OptionalSection` and anything else listening
 * to the form sees it.
 */
export function DateFormField({
  id,
  name,
  defaultValue,
  required,
  min,
  max,
  quick,
  onChange,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  min?: string | null;
  max?: string | null;
  quick?: QuickDate[];
  onChange?: (iso: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>(defaultValue || null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.dispatchEvent(new Event('change', { bubbles: true }));
  }, [value]);
  return (
    <div style={{ position: 'relative' }}>
      <DateField
        id={id}
        value={value}
        min={min}
        max={max}
        quick={quick}
        onChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
      />
      <input
        ref={field}
        name={name}
        value={value ?? ''}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        style={{ position: 'absolute', left: 12, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
