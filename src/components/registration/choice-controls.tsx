'use client';

import { CheckCircle2, type LucideIcon } from 'lucide-react';

import { formControlClassName, formErrorClassName, formFieldGroupClassName, formHintClassName, formLabelClassName, RequiredMark } from '@/components/forms/form-styles';
import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Meaning } from '@/config/brand/meaning';
import type { ContentLocale } from '@/lib/content/types';
import { clockRange, formatStart } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';
import { IconBadge } from '@/components/ui/icon-badge';
import { Icon3D } from '@/components/ui/icon-3d';
import type { Icon3D as Icon3DSpec } from '@/config/icons-3d';

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
  /** A 3D icon in place of the badge (config/icons-3d). */
  icon3d?: Icon3DSpec;
  meaning: Meaning;
  title: string;
  meta?: string;
  onSelect: () => void;
};

/** One choice as a chip, the contact form's "Worum geht es?": a native radio, so arrow keys move between them. */
export function ChoiceChip({ name, value, checked, icon: Icon, icon3d, meaning, title, meta, onSelect }: ChoiceChipProps) {
  return (
    <label
      data-icon-3d-host
      className={cn(
        'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150',
        choiceLook.focus,
        checked ? choiceLook.checked : choiceLook.idle
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      {icon3d ? <Icon3D icon={icon3d} /> : <IconBadge icon={Icon} meaning={meaning} />}
      {/* Hyphenated: in a narrow chip „Prüfungsvorbereitung" broke as „Prüfungs / vorbereit / ung", „Unterrichtseinheiten" as „Unterrichtseinhe / iten". */}
      <span className="min-w-0 leading-snug hyphens-auto">
        <span className="block text-sm font-semibold text-[var(--casa-ink)]">{title}</span>
        {meta ? <span className="block text-xs text-[var(--casa-muted)]">{meta}</span> : null}
      </span>
      {checked ? <CheckCircle2 className="ml-auto size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden /> : null}
    </label>
  );
}

export type DateTile = { id: string; date: string; note?: string };
export type DateTileGroup = { key: string; title?: string; meta?: string; tiles: DateTile[] };

type TermFieldProps = {
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
 * WHEN A COURSE STARTS, AS ONE FIELD (Rahman, 2026-10-20: the date tiles were „not elegant like our
 * website or dashboard"). They were a grid of boxed tiles per schedule, two rows of six on the
 * intensive course. Now the schedule is a switch in the look of the form's own Kursanmeldung |
 * Prüfungsanmeldung tabs („Vormittags · Mo–Fr · 09:00–12:30" | „Nachmittags …"), shown only where
 * there is more than one, and the start is a dropdown like the level's above it. Switching the
 * schedule chooses its first start. The fieldset keeps the id a failed step focuses.
 */
export function TermField({ id, name, legend, groups, value, onChange, locale, error, errorId, emptyText }: TermFieldProps) {
  const { say } = useSiteCopy();
  const legendId = `${id}-legend`;
  const group = groups.find((candidate) => candidate.tiles.some((tile) => tile.id === value)) ?? groups[0];

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-labelledby={legendId}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className={cn(formFieldGroupClassName, 'outline-none')}
    >
      <legend id={legendId} className={cn(formLabelClassName, 'mb-2')}>
        {legend}
        <RequiredMark />
      </legend>
      {groups.length === 0 && emptyText ? <p className={formHintClassName}>{emptyText}</p> : null}

      {groups.length > 1 ? (
        <div role="radiogroup" aria-label={legend} className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-[var(--casa-surface-subtle)] p-1">
          {groups.map((candidate) => {
            const checked = candidate.key === group?.key;
            return (
              <label
                key={candidate.key}
                className={cn(
                  'flex min-w-0 cursor-pointer flex-col rounded-lg px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/40 sm:px-4',
                  checked ? 'bg-white shadow-[var(--shadow-soft)]' : 'hover:bg-white/60'
                )}
              >
                <input
                  type="radio"
                  name={`${name}-slot`}
                  value={candidate.key}
                  checked={checked}
                  onChange={() => candidate.tiles[0] && onChange(candidate.tiles[0].id)}
                  className="sr-only"
                />
                <span className={cn('text-sm font-semibold', checked ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>
                  {candidate.title ?? candidate.meta}
                </span>
                {candidate.title && candidate.meta ? (
                  <span className="text-xs tabular-nums text-[var(--casa-muted)]">{candidate.meta}</span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : group && (group.title || group.meta) ? (
        <p className="mb-2 text-sm text-[var(--casa-muted)]">{[group.title, group.meta].filter(Boolean).join(' · ')}</p>
      ) : null}

      {group ? (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger
            id={`${id}-select`}
            aria-labelledby={legendId}
            aria-required
            aria-invalid={Boolean(error)}
            className={formControlClassName}
          >
            <SelectValue placeholder={say(locale, 'Beginn auswählen…', 'Choose a start…')} />
          </SelectTrigger>
          <SelectContent>
            {group.tiles.map((tile) => (
              <SelectItem key={tile.id} value={tile.id}>
                <span>{formatStart(tile.date, locale)}</span>
                {tile.note ? <span className="text-[var(--casa-muted)]"> · {tile.note}</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
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

