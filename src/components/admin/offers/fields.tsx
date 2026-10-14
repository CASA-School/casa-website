'use client';

import { useId, useState } from 'react';

import { useWsLang } from '@/components/admin/lang';

import ui from './offers.module.css';

/**
 * The offer screens' small controls. Each one commits a value the offer can
 * hold; none keeps state the draft does not, except a number while it is typed.
 */

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <div className={ui.seg} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <label key={v}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} disabled={disabled} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}

/** "140", "140,5", "1.050,00" and "1050.00" are all numbers a colleague types. */
export function parseAmount(text: string): number | null {
  const t = text.replace(/\s|€/g, '');
  if (!t) return null;
  const normalised = /,\d{1,2}$/.test(t)
    ? t.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(\.\d{3})+$/.test(t)
      ? t.replace(/\./g, '')
      : t.replace(/,/g, '');
  const n = Number(normalised);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

const show = (n: number | null) =>
  n == null ? '' : n.toLocaleString('de-DE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/**
 * A number that is typed, then committed on leaving the field or Enter — so
 * "140," is not turned into "140" under the cursor.
 */
export function NumberInput({
  value,
  onCommit,
  className,
  placeholder,
  integer,
  ariaLabel,
  id,
  disabled,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  className?: string;
  placeholder?: string;
  integer?: boolean;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(value);
  // A new value from outside (a reset, a stepper) replaces the text, unless
  // the colleague is typing in this field right now.
  if (!focused && value !== shown) {
    setShown(value);
    setText(show(value));
  }

  const commit = () => {
    const parsed = parseAmount(text);
    const next = parsed == null ? null : integer ? Math.max(0, Math.round(parsed)) : parsed;
    if (next !== value) onCommit(next);
    setShown(next);
    setText(show(next));
  };

  return (
    <input
      id={id}
      inputMode="decimal"
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/** A whole number with − and +, typed or stepped. */
export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 999,
  disabled,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { t } = useWsLang();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <span className={ui.stepper2}>
      <button type="button" aria-label={t(`${label}: eins weniger`, `${label}: one less`)} disabled={disabled || (value ?? min) <= min} onClick={() => onChange(clamp((value ?? min) - 1))}>
        −
      </button>
      <NumberInput integer ariaLabel={label} value={value} placeholder={placeholder} disabled={disabled} onCommit={(v) => onChange(v == null ? null : clamp(v))} />
      <button type="button" aria-label={t(`${label}: eins mehr`, `${label}: one more`)} disabled={disabled || (value ?? 0) >= max} onClick={() => onChange(clamp((value ?? min - 1) + 1))}>
        +
      </button>
    </span>
  );
}
