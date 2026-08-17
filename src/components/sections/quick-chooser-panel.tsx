'use client';

import Link from 'next/link';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { useMemo, useState } from 'react';
import { ArrowRight, Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import { cn } from '@/lib/utils';

/**
 * CEFR chips take the sequential level ramp; every other field stays neutral.
 *
 * Levels are *ordered*, so the ramp reads as a progression across the row —
 * A1 (#daeafa) through C1 (#005c90) — which is the whole point of a sequential
 * scale over a categorical one. Colour never signals alone here: the chip's
 * label IS the level.
 *
 * `-ink` is stored per step rather than assumed, because the ramp crosses over
 * between B1+ and B2 (A1–B1+ carry ink, B2/C1 carry white), and `-text` is the
 * AA-safe colour for the label on an unselected white chip.
 */
function levelChipStyle(fieldKey: string, label: string, isActive: boolean) {
  if (fieldKey !== 'level') {
    return undefined;
  }

  const key = levelKeyFromLabel(label);
  if (!key) {
    return undefined;
  }

  const token = levelTokens[key];

  return isActive
    ? { background: token.surface, color: token.ink, borderColor: token.surface }
    : { color: token.text, borderColor: token.surface };
}

export type QuickChooserOption = {
  label: string;
  value: string;
  /** How many courses this option would return. Omit for a non-counting field. */
  count?: number;
  /** Set when `count` is 0 — offered but inert is worse than visibly unavailable. */
  disabled?: boolean;
};

export type QuickChooserField = {
  key: string;
  label: string;
  options: QuickChooserOption[];
};

export type QuickChooserThumbnail = {
  src: string;
  alt: string;
  caption: string;
};

type QuickChooserPanelProps = {
  title: string;
  description: string;
  fields: QuickChooserField[];
  submitLabel: string;
  submitHref: string;
  badgeLabel?: string;
  summaryLabel?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  thumbnails?: QuickChooserThumbnail[];
  initialValues?: Record<string, string>;
  className?: string;
};

function resolveChooserValues(fields: QuickChooserField[], initialValues?: Record<string, string>) {
  return fields.reduce<Record<string, string>>((accumulator, field) => {
    const initialValue = initialValues?.[field.key] ?? '';
    const hasValidInitial = field.options.some((option) => option.value === initialValue);
    accumulator[field.key] = hasValidInitial ? initialValue : field.options[0]?.value ?? '';
    return accumulator;
  }, {});
}

export function QuickChooserPanel({
  title,
  description,
  fields,
  submitLabel,
  submitHref,
  badgeLabel = 'Route planner',
  summaryLabel = 'Your route summary',
  secondaryLabel,
  secondaryHref,
  thumbnails = [],
  initialValues,
  className,
}: QuickChooserPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    resolveChooserValues(fields, initialValues)
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    if (!queryString) {
      return submitHref;
    }

    return `${submitHref}${submitHref.includes('?') ? '&' : '?'}${queryString}`;
  }, [submitHref, values]);

  const selectedSummary = useMemo(
    () =>
      fields.map((field) => {
        const selected = field.options.find((option) => option.value === values[field.key]) ?? field.options[0];
        return {
          key: field.key,
          label: field.label,
          value: selected?.label || 'Any',
        };
      }),
    [fields, values]
  );

  return (
    <aside
      data-reveal="true"
      className={cn(
        'rounded-3xl bg-white/95 p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75',
        className
      )}
      data-testid="course-finder-filter"
    >
      <p className="inline-flex items-center gap-2 rounded-full bg-[var(--casa-warm-soft)]/85 px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
        <Compass className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
        {badgeLabel}
      </p>
      <h2 className="mt-3 text-xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>
      <span className="casa-tricolor-rule mt-3 block h-1 w-20 rounded-full" aria-hidden />

      <div className="mt-5 space-y-4">
        {fields.map((field) => (
          <fieldset key={field.key} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
              {field.label}
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
              {field.options.map((option) => {
                const isActive = (values[field.key] ?? '') === option.value;
                const levelStyle = levelChipStyle(field.key, option.label, isActive);
                /*
                  A disabled chip stays visible rather than disappearing. The
                  set of levels CASA teaches is itself information, and a row
                  that silently loses chips as you filter is harder to read than
                  one where the unavailable ones are simply dimmed.

                  `aria-disabled` rather than `disabled`: the chip keeps its
                  place in the radio group so arrow-key traversal still reaches
                  it and a screen reader still announces it, while the click is
                  refused.
                */
                const isUnavailable = option.disabled === true && !isActive;
                return (
                  <button
                    key={`${field.key}-${option.value || 'any'}`}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-disabled={isUnavailable || undefined}
                    style={isUnavailable ? undefined : levelStyle}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]',
                      isActive
                        ? 'border-[color:var(--casa-blue)] bg-[var(--casa-blue)]/12 text-[var(--casa-ink)]'
                        : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-muted)]',
                      // A level chip carries its own ramp colour inline; the neutral
                      // warm hover would fight it.
                      !levelStyle && !isActive && !isUnavailable && 'hover:bg-[var(--casa-warm-soft)]',
                      isUnavailable && 'cursor-not-allowed opacity-40'
                    )}
                    onClick={() => {
                      if (isUnavailable) {
                        return;
                      }

                      setValues((current) => ({
                        ...current,
                        [field.key]: option.value,
                      }));
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/42 p-4">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{summaryLabel}</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {selectedSummary.map((item) => (
            <li key={item.key} className="text-sm text-[var(--casa-ink)]">
              <span className="font-semibold text-[var(--casa-muted)]">{item.label}:</span> {item.value}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]">
          <Link href={query}>
            {submitLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        {secondaryLabel && secondaryHref ? (
          <Button asChild variant="outline" className="casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>

      {thumbnails.length > 0 ? (
        <ul className="mt-5 grid grid-cols-3 gap-2.5" aria-label="People moments at CASA">
          {thumbnails.slice(0, 3).map((photo) => (
            <li key={`${photo.src}-${photo.caption}`}>
              <figure className="overflow-hidden rounded-xl bg-[var(--casa-warm-soft)]">
                <div className="relative h-16">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              </figure>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
