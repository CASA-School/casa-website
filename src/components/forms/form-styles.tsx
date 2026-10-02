/**
 * THE PUBLIC FORMS' ONE LOOK (2026-10-02).
 *
 * The contact form and the two registration wizards had drifted into two
 * designs: the contact form drew hard --casa-muted boxes under sentence-case
 * labels, the wizards drew --casa-sand outlines (1.23:1, below WCAG 1.4.11) on a
 * wash fill under uppercase eyebrow labels. Every public form now takes its
 * fields, labels, tiles and buttons from here, so a learner who writes to CASA
 * and then registers sees the same form twice.
 */
import type { Ref } from 'react';
import type { LucideIcon } from 'lucide-react';

import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import { cn } from '@/lib/utils';

export const formFieldGroupClassName = 'space-y-2';

/** A field title is a label, 14px sentence case, never an uppercase eyebrow. */
export const formLabelClassName = 'block text-sm font-semibold leading-snug text-[var(--casa-ink)]';

/**
 * Input, select trigger and date button. 48px, white, an outline that clears
 * 3:1 and darkens on hover, and the site's blue focus ring. `aria-invalid` (or
 * `data-invalid` on a button) turns it red, so an invalid field needs no
 * className of its own.
 */
export const formControlClassName = cn(
  'h-12 data-[size=default]:h-12 w-full rounded-xl border border-[color:var(--casa-field-border)] bg-white px-4',
  'text-left text-base md:text-base text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] data-[placeholder]:text-[var(--casa-muted)]',
  'shadow-none transition-[border-color,box-shadow] duration-150 hover:border-[color:var(--casa-muted)]',
  // A select's value: one line with an ellipsis. The trigger's own `flex` on it defeated line-clamp.
  '*:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate',
  'focus-visible:border-[var(--casa-accent-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/15 focus-visible:ring-offset-0',
  'aria-invalid:border-[var(--casa-danger-text)] aria-invalid:ring-[var(--casa-danger-text)]/15',
  // A plain <button> trigger (date, country) may not carry aria-invalid, so it says so with data-invalid.
  'data-[invalid=true]:border-[var(--casa-danger-text)]',
);

export const formTextareaClassName = cn(formControlClassName, 'h-auto min-h-36 py-3 leading-relaxed resize-y');

export const formErrorClassName = 'text-sm text-[var(--casa-danger-text)]';

export const formHintClassName = 'text-sm leading-relaxed text-[var(--casa-muted)]';

/** The title of a value in a summary or review tile: 12px, sentence case. */
export const formMetaLabelClassName = 'text-xs font-medium text-[var(--casa-muted)]';

/** The white sheet a form sits on, the same on every form page. */
export const formCardClassName =
  'min-w-0 rounded-3xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10';

/** A checkbox row, an optional block or a review value inside the form card. */
export const formTileClassName = 'rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-4';

/** The one primary action of a form: send, continue, submit. */
export const formPrimaryButtonClassName = 'casa-button-prism h-12 rounded-xl px-6 text-base text-white';

/** Back and "send another": the primary's size and type, outlined. */
export const formSecondaryButtonClassName =
  'h-12 rounded-xl border-[color:var(--casa-field-border)] bg-white px-5 text-[length:var(--casa-button-font-size)] font-bold text-[var(--casa-ink)] hover:border-[color:var(--casa-muted)] hover:bg-white';

export const formAlertClassName =
  'rounded-xl border border-[color:var(--casa-danger-surface)]/30 bg-[var(--casa-danger-surface)]/5 px-4 py-3 text-sm text-[var(--casa-danger-text)]';

/**
 * After the label text. Hidden from screen readers: every required control
 * carries `required` or `aria-required`, which they announce instead.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-[var(--casa-coral-text)]">
      *
    </span>
  );
}

type FormStepHeaderProps = {
  icon: LucideIcon;
  /** The logo colour of what the step is about (src/config/brand/meaning.ts). */
  meaning: Meaning;
  title: string;
  description: string;
  /** A wizard moves focus here when the step changes. */
  headingRef?: Ref<HTMLHeadingElement>;
};

/** A step's or a form's own heading: the icon in its meaning colour, the title, one line. */
export function FormStepHeader({ icon: Icon, meaning, title, description, headingRef }: FormStepHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', meaningClasses[meaning].circle)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold tracking-tight text-[var(--casa-ink)] md:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)] md:text-base">{description}</p>
      </div>
    </div>
  );
}
