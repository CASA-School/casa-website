import { cn } from '@/lib/utils';

export type FeeFigure = {
  label: string;
  amount: string;
  note?: string;
  /**
   * `refundable` marks money that comes BACK, set as data rather than guessed
   * from the note text.
   *
   * On /accommodation the deposit is €580 and the first four weeks are also
   * €580. Rendered at one weight, a reader scanning the strip adds
   * 580 + 145 + 50 + 580 and carries away roughly €1,355 — when they will part
   * with €775 and get €580 of it back. A deposit is a hold, not a price, and
   * showing it as a price inflates the cost in nobody's favour.
   */
  tone?: 'charge' | 'refundable';
};

/**
 * A list of published figures — the site's one way of showing what something costs.
 *
 * WHY THIS IS SHARED. Three surfaces published a fee table and each drew its own:
 * the seven course formats through CoursePracticalDetails, /accommodation/flat and
 * /accommodation/host through a `<dl>` written inline in the page file, and the
 * /accommodation index through prose cards with the amounts inside sentences. The
 * first two held the same shape — label, amount, optional note — and rendered it
 * two different ways.
 *
 * A LIST, NOT A GRID OF TILES. This went through two wrong shapes first, and both
 * failures are worth keeping written down.
 *
 *   1. TWO COLUMNS BY CATEGORY — costs on the left, conditions on the right,
 *      divided by a full-height rule. The volumes are not comparable: of the
 *      seven course formats, one has as many fees as conditions. On the Evening
 *      Course a single €476 sat opposite five bullets and 40% of the section was
 *      empty, with the divider drawn down the middle of the void.
 *   2. A GRID OF STAT TILES — label above, amount below, note under that, cells
 *      side by side. Measured on /accommodation/flat at 1440px: each cell was
 *      466px wide and its widest line used 248-355px, so 24-47% of every cell was
 *      dead space. Worse, `tabular-nums` was decorative — the amounts sat at
 *      x=40 and x=554, aligning only within a column, and a stacked cell puts no
 *      two figures in a scannable run at all.
 *
 * So the amounts live in a right-aligned column and the labels flow beside them,
 * one figure per row on a hairline. Every amount ends on the same pixel, which
 * is the column a reader actually scans and the alignment `tabular-nums` exists
 * for. The column is a shared grid track sized by its widest amount — see the
 * note on the markup for why that matters. The rows are ~64px, so the section is shorter as well as clearer,
 * and it reads identically with one figure or four — the ratio problem that broke
 * shape (1) cannot arise in a list.
 *
 * THE AMOUNT DOES NOT SHOUT. An earlier pass set it at `text-3xl`, which measured
 * 32px/700 — the same size and weight as the section's own h2, so the price
 * outranked the heading it sat under. Three reasons that is worse than a type
 * slip: a numeral set larger reads as a larger number, which maximises the one
 * impression a considered purchase does not want; four amounts at one display
 * size make a refundable deposit look like a fourth charge; and CASA is a
 * gemeinnützige GmbH whose Ad Grants review flagged the site as too commercial
 * (CLAUDE.md hard rule 7). It is 24px now, under the h2's 32px.
 *
 * ONE SIZE FOR EVERY AMOUNT, deliberately. An attempt at two tiers set the first
 * entry larger as "the" price, which holds on /accommodation ("First 4 weeks")
 * and breaks on Bildungszeit, where entries one and two are "1 week €280" and
 * "2 weeks €520" — two durations, neither subordinate. Ranking by array position
 * invents an emphasis the content does not carry. The only emphasis here is the
 * one the data states: charge or refundable.
 *
 * Figures always come from config. Never hardcode an amount at a call site.
 */
export function FeeStrip({ figures, className }: { figures: FeeFigure[]; className?: string }) {
  if (figures.length === 0) {
    return null;
  }

  return (
    /*
      ONE COLUMN TRACK FOR EVERY AMOUNT, sized by the widest of them.

      The first version gave each row its own grid with a fixed 6.5rem gutter —
      the only way separate grids can share an alignment is a hardcoded width.
      That held until a figure wider than the gutter arrived: Intensive German's
      course book is "€23.99 – €26.99", which broke after the dash and stacked
      onto two lines, while every other row on the page sat on one.

      So the <dl> is the grid, `max-content` for the amount column, and each row
      is a `subgrid` sharing that track. The column is as wide as its widest
      amount and every other amount right-aligns to the same edge — alignment by
      structure rather than by a number someone has to keep in step with the
      configs. Bildungszeit's "€46 – €54" and this page's "€117.50" and the range
      all sit on one line each.

      STACKED BELOW `sm`. A 190px range beside a 280px content column would
      leave the label 74px. On a phone the amount sits above its label instead,
      which is the ordinary price-list shape at that width and needs no gutter
      at all.
    */
    <dl
      className={cn(
        'border-b border-[color:var(--casa-sand)] sm:grid sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-5',
        className
      )}
    >
      {figures.map((figure) => {
        const isRefundable = figure.tone === 'refundable';

        return (
          <div
            key={figure.label}
            className="border-t border-[color:var(--casa-sand)] py-4 sm:col-span-2 sm:grid sm:grid-cols-subgrid sm:items-baseline"
          >
            <dd
              className={cn(
                'text-2xl font-bold leading-none tabular-nums sm:col-start-1 sm:row-start-1 sm:text-right',
                /*
                  Muted ink for money that comes back. Not colour ALONE: a
                  `refundable` figure is required to carry a note saying so — the
                  deposit's reads "Refunded when the room and the keys come back
                  as they were handed over" — so the distinction survives for a
                  reader who cannot see the difference in tone.
                */
                isRefundable ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]'
              )}
            >
              {figure.amount}
            </dd>

            <dt className="mt-2 text-base font-semibold leading-snug text-[var(--casa-ink)] sm:col-start-2 sm:row-start-1 sm:mt-0">
              {figure.label}
            </dt>

            {figure.note ? (
              <dd className="mt-1.5 text-sm leading-relaxed text-[var(--casa-muted)] sm:col-start-2 sm:row-start-2">
                {figure.note}
              </dd>
            ) : null}
          </div>
        );
      })}
    </dl>
  );
}
