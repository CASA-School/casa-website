'use client';

import { CheckCircle2, type LucideIcon } from 'lucide-react';

import { formErrorClassName, formFieldGroupClassName, formHintClassName, formLabelClassName, RequiredMark } from '@/components/forms/form-styles';
import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import type { ContentLocale } from '@/lib/content/types';
import { clockRange, dateTileParts } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';

/*
 * The registration forms' choices (2026-10-05): chips for a kind of course or
 * exam, tiles for its dates, pills for a short required choice. Native radios
 * throughout, so a keyboard moves through them with the arrow keys, and one
 * look for "chosen": the CASA blue edge on a blue tint.
 */

export const choiceLook = {
  idle: 'border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-soft)] hover:border-[color:var(--casa-field-edge-hover)]',
  checked: 'border-[var(--casa-accent-text)] bg-[var(--casa-blue-tint)]/45 shadow-[inset_0_0_0_1px_var(--casa-accent-text)]',
  focus: 'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--casa-blue)]/20',
};

type ChoiceChipProps = {
  name: string;
  value: string;
  checked: boolean;
  icon: LucideIcon;
  meaning: Meaning;
  title: string;
  meta?: string;
  onSelect: () => void;
};

/** One choice as a chip, the contact form's "Worum geht es?": a native radio, so arrow keys move between them. */
export function ChoiceChip({ name, value, checked, icon: Icon, meaning, title, meta, onSelect }: ChoiceChipProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150',
        choiceLook.focus,
        checked ? choiceLook.checked : choiceLook.idle
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', meaningClasses[meaning].circle)}>
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <span className="min-w-0 leading-snug">
        <span className="block text-sm font-semibold text-[var(--casa-ink)]">{title}</span>
        {meta ? <span className="block text-xs text-[var(--casa-muted)]">{meta}</span> : null}
      </span>
      {checked ? <CheckCircle2 className="ml-auto size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden /> : null}
    </label>
  );
}

export type DateTile = { id: string; date: string; note?: string };
export type DateTileGroup = { key: string; title?: string; meta?: string; tiles: DateTile[] };

type DateTilesProps = {
  /** The group's id, which a failed step focuses. */
  id: string;
  name: string;
  legend: string;
  groups: DateTileGroup[];
  value: string;
  onChange: (id: string) => void;
  locale: ContentLocale;
  error?: string;
  errorId: string;
  /** Said in place of the tiles when there are none. */
  emptyText?: string;
};

/**
 * Dates as tiles, a large day over its month, under the schedule they share,
 * said once ("Vormittags · Mo–Fr · 09:00–12:30"). Native radios, one group.
 */
export function DateTiles({ id, name, legend, groups, value, onChange, locale, error, errorId, emptyText }: DateTilesProps) {
  const legendId = `${id}-legend`;

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-required
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className={cn(formFieldGroupClassName, 'outline-none')}
    >
      <legend id={legendId} className={cn(formLabelClassName, 'mb-2')}>
        {legend}
        <RequiredMark />
      </legend>
      {groups.length === 0 && emptyText ? <p className={formHintClassName}>{emptyText}</p> : null}
      <div className="space-y-4">
        {groups.map((group) => {
          const heading = [group.title, group.meta].filter(Boolean).join(' · ');
          return (
            <div key={group.key} role={heading ? 'group' : undefined} aria-label={heading || undefined}>
              {heading ? (
                <p aria-hidden="true" className="mb-2 text-sm leading-snug">
                  {group.title ? <span className="font-semibold text-[var(--casa-ink)]">{group.title}</span> : null}
                  {group.title && group.meta ? <span className="text-[var(--casa-muted)]"> · </span> : null}
                  {group.meta ? <span className="text-[var(--casa-muted)]">{group.meta}</span> : null}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {group.tiles.map((tile) => {
                  const parts = dateTileParts(tile.date, locale);
                  const checked = tile.id === value;
                  return (
                    <label
                      key={tile.id}
                      className={cn(
                        'flex min-w-[5.5rem] cursor-pointer flex-col items-center rounded-xl border px-3 pb-2.5 pt-2 text-center transition-[border-color,background-color,box-shadow] duration-150',
                        choiceLook.focus,
                        checked ? choiceLook.checked : choiceLook.idle
                      )}
                    >
                      <input type="radio" name={name} value={tile.id} checked={checked} onChange={() => onChange(tile.id)} className="sr-only" />
                      <span className="sr-only">{tile.note ? `${parts.full}, ${tile.note}` : parts.full}</span>
                      <span
                        aria-hidden="true"
                        className={cn('text-2xl font-bold leading-tight tabular-nums', checked ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-ink)]')}
                      >
                        {parts.day}
                      </span>
                      <span aria-hidden="true" className="text-xs font-medium text-[var(--casa-muted)]">{parts.monthYear}</span>
                      {tile.note ? (
                        <span aria-hidden="true" className="mt-1 text-[0.6875rem] font-semibold leading-none text-[var(--casa-accent-text)]">{tile.note}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p id={errorId} className={formErrorClassName}>{error}</p> : null}
    </fieldset>
  );
}

type PillChoicesProps = {
  id: string;
  name: string;
  legend: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorId: string;
};

/** A short required choice as pills: one click, where a select took two. */
export function PillChoices({ id, name, legend, options, value, onChange, error, errorId }: PillChoicesProps) {
  const legendId = `${id}-legend`;

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-required
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className={cn(formFieldGroupClassName, 'outline-none')}
    >
      <legend id={legendId} className={cn(formLabelClassName, 'mb-2')}>
        {legend}
        <RequiredMark />
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-[border-color,background-color,box-shadow] duration-150',
                choiceLook.focus,
                checked ? cn(choiceLook.checked, 'text-[var(--casa-accent-text)]') : cn(choiceLook.idle, 'text-[var(--casa-ink)]')
              )}
            >
              <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? <p id={errorId} className={formErrorClassName}>{error}</p> : null}
    </fieldset>
  );
}

export const REGISTRATION_TYPES = ['full', 'written', 'oral'] as const;

export const registrationTypeLabels = (locale: ContentLocale): Record<(typeof REGISTRATION_TYPES)[number], string> =>
  locale === 'de'
    ? { full: 'Vollprüfung', written: 'Nur schriftlich', oral: 'Nur mündlich' }
    : { full: 'Full exam', written: 'Written only', oral: 'Oral only' };

/** A sitting's hours and its registration deadline, the two facts its tile does not show. */
export function sittingFacts(session: { startsAt: string; endsAt: string; registrationDeadlineLabel: string }, locale: ContentLocale) {
  const hours = session.startsAt && session.endsAt ? clockRange(session.startsAt, session.endsAt, locale) : null;
  const deadline = session.registrationDeadlineLabel
    ? `${locale === 'de' ? 'Anmeldeschluss' : 'Registration closes'} ${session.registrationDeadlineLabel}`
    : null;
  return [hours, deadline].filter(Boolean).join(' · ');
}

