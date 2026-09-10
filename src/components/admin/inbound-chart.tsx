/**
 * A fortnight of inbound volume as bars.
 *
 * Drawn as divs, not an SVG chart and certainly not a charting library. It is
 * fourteen values with no axis, no tooltip and no legend; the entire point is
 * peripheral — "was this week busier than last" — and every library that could
 * draw it would ship more JavaScript than the whole page.
 *
 * The scale is the fortnight's own maximum, with a floor of 4 so a single
 * enquiry on a quiet week does not render as a full-height bar and imply a
 * record day.
 *
 * It lives on Activity rather than on Today: a trend is a backward-looking
 * question, and the daily screen answers forward-looking ones.
 */
export function InboundChart({ days }: { days: readonly { day: Date; count: number }[] }) {
  const peak = Math.max(4, ...days.map((d) => d.count));

  return (
    <div className="flex h-24 items-end gap-1.5" role="img" aria-label={inboundSummary(days)}>
      {days.map((entry) => {
        const share = entry.count / peak;
        const isToday = new Date(entry.day).toDateString() === new Date().toDateString();

        return (
          <div
            key={new Date(entry.day).toISOString()}
            /*
             * `self-stretch`, not just `flex-1`. The row is `items-end`, which
             * shrinks every column to its own content — so the inner `h-full`
             * resolved against the height of the weekday label and every bar
             * rendered at zero. Caught by looking at it, not by the types.
             */
            className="flex flex-1 flex-col items-center gap-1.5 self-stretch"
          >
            <div className="flex min-h-0 w-full flex-1 items-end">
              {entry.count === 0 ? (
                // A zero day gets a hairline on the baseline rather than
                // nothing, so the fortnight still reads as fourteen days.
                <div className="h-px w-full rounded-full bg-ws-line-firm" />
              ) : (
                <div
                  className={
                    isToday
                      ? 'w-full rounded-t-sm bg-[var(--casa-ink-deep)]'
                      : 'w-full rounded-t-sm bg-[var(--casa-blue)]/55'
                  }
                  style={{ height: `${Math.max(share * 100, 6)}%` }}
                />
              )}
            </div>
            <span className="text-[0.6rem] text-[var(--casa-text-subtle)]">
              {new Date(entry.day).toLocaleDateString('en-GB', { weekday: 'narrow' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function inboundSummary(days: readonly { day: Date; count: number }[]): string {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return `${total} records received over the last ${days.length} days.`;
}
