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

/** `min-w-0`: in a grid, a long select value would otherwise hold its column open past the card. */
export const formFieldGroupClassName = 'min-w-0 space-y-2';

/** A field title is a label, 14px sentence case, never an uppercase eyebrow. */
export const formLabelClassName = 'block text-sm font-semibold leading-snug text-[var(--casa-ink)]';

/**
 * Input, select trigger and date button. At rest a soft well: the cool
 * --casa-field-fill, a hairline edge and a shadow inside the top edge. Active
 * (focused, or a select or picker open) it turns white with the CASA blue edge,
 * a halo and a slight lift, so the field being filled in is unmistakable.
 * `aria-invalid` (or `data-invalid` on a button) draws the edge red, so an
 * invalid field needs no className of its own.
 *
 * Every class is written out in full: Tailwind finds classes by scanning the
 * source, so a variant assembled in code would never reach the stylesheet.
 */
export const formControlClassName = cn(
  'h-12 data-[size=default]:h-12 w-full rounded-xl border border-[color:var(--casa-field-edge)] bg-[var(--casa-field-fill)] px-4',
  'text-left text-base md:text-base text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] data-[placeholder]:text-[var(--casa-muted)]',
  'shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-out',
  'hover:border-[color:var(--casa-field-edge-hover)] hover:bg-[var(--casa-field-fill-hover)]',
  // A select's value: one line with an ellipsis. The trigger's own `flex` on it defeated line-clamp.
  '*:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate',
  'focus:border-[var(--casa-blue)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--casa-blue)]/15 focus:ring-offset-0 focus:shadow-[0_10px_24px_-14px_rgba(0,111,159,0.45)]',
  'focus-visible:border-[var(--casa-blue)] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/15 focus-visible:ring-offset-0 focus-visible:shadow-[0_10px_24px_-14px_rgba(0,111,159,0.45)]',
  'data-[state=open]:border-[var(--casa-blue)] data-[state=open]:bg-white data-[state=open]:ring-4 data-[state=open]:ring-[var(--casa-blue)]/15 data-[state=open]:shadow-[0_10px_24px_-14px_rgba(0,111,159,0.45)]',
  'aria-invalid:border-[var(--casa-danger-text)] aria-invalid:focus:border-[var(--casa-danger-text)] aria-invalid:focus:ring-[var(--casa-danger-text)]/15',
  // A plain <button> trigger (date, country) may not carry aria-invalid, so it says so with data-invalid.
  'data-[invalid=true]:border-[var(--casa-danger-text)]',
);

/** The active look, for a picker that opens a panel of its own instead of a Radix select. */
export const formControlOpenClassName =
  'border-[var(--casa-blue)] bg-white ring-4 ring-[var(--casa-blue)]/15 shadow-[0_10px_24px_-14px_rgba(0,111,159,0.45)]';

export const formTextareaClassName = cn(formControlClassName, 'h-auto min-h-36 py-3 leading-relaxed resize-y');

export const formErrorClassName = 'text-sm text-[var(--casa-danger-text)]';

export const formHintClassName = 'text-sm leading-relaxed text-[var(--casa-muted)]';

/** The title of a value in a summary or review tile: 12px, sentence case. */
export const formMetaLabelClassName = 'text-xs font-medium text-[var(--casa-muted)]';

/** The white sheet a form sits on, the same on every form page. */
export const formCardClassName =
  'min-w-0 rounded-3xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10';

/**
 * A checkbox row, an optional block or a review value inside the form card:
 * raised where the fields are recessed, as the topic chips are.
 */
export const formTileClassName =
  'rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]';

/** The one primary action of a form: send, continue, submit. */
export const formPrimaryButtonClassName = 'casa-button-prism h-12 rounded-xl px-6 text-base text-white';

/** Back and "send another": the primary's size and type, outlined. */
export const formSecondaryButtonClassName =
  'h-12 rounded-xl border-[color:var(--casa-field-edge-hover)] bg-white px-5 text-[length:var(--casa-button-font-size)] font-bold text-[var(--casa-ink)] shadow-[var(--shadow-soft)] hover:border-[color:var(--casa-muted)] hover:bg-white';

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
  /** One line under the title, only where it tells the reader something the fields do not. */
  description?: string;
  /** A wizard moves focus here when the step changes. */
  headingRef?: Ref<HTMLHeadingElement>;
};

/** A step's or a form's own heading: the icon in its meaning colour, the title, one line. */
export function FormStepHeader({ icon: Icon, meaning, title, description, headingRef }: FormStepHeaderProps) {
  return (
    <div className={cn('flex gap-4', description ? 'items-start' : 'items-center')}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', meaningClasses[meaning].circle)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold tracking-tight text-[var(--casa-ink)] md:text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)] md:text-base">{description}</p> : null}
      </div>
    </div>
  );
}
