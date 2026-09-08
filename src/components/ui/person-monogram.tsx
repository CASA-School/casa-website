import { cn } from '@/lib/utils';

/**
 * A colleague's initials, standing in for a portrait.
 *
 * CASA publishes twelve real colleagues and no photographs of them. The only
 * images on hand are synthetic portraits generated for six people who do not
 * exist, and `public/media/casa/team/` is empty — see CLAUDE.md hard rule 3 and
 * the header of config/content/team-spotlights.ts. Putting a generated face
 * beside a real colleague's name would be a worse misrepresentation than the
 * invented staff this replaced, so every surface that wants an avatar shows
 * initials and waits for real portraits taken with consent.
 *
 * Lifted out of signatures/team-directory.tsx, which had this as a private
 * component. The decision rail needed the same avatar, and two implementations
 * of "what a person looks like when we have no photograph" would drift — the
 * directory and the rail now render the same mark from the same code.
 *
 * `aria-hidden`: the name is always rendered as text next to it, so announcing
 * "I E" adds nothing and interrupts the name.
 *
 * WHEN REAL PORTRAITS ARRIVE: give this an optional `src` and render the
 * photograph in place of the initials. Nothing at the call sites changes.
 */
export function PersonMonogram({
  name,
  className,
  size = 'md',
}: {
  name: string;
  className?: string;
  /** `sm` for the decision rail's inline row, `lg` for the team directory tile. */
  size?: 'sm' | 'md' | 'lg';
}) {
  /*
   * First and last initial. `slice(0, 2)` on the split parts rather than on the
   * joined string, because "Meike Große Hundrup" should read MG — the first two
   * WORDS — and a name with a particle would otherwise lose its surname.
   */
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  /*
   * `sm` grows with the viewport rather than sitting at one size.
   *
   * It was a flat h-10 (40px) with `text-xs`, which read as an icon rather than
   * as a person — too small to balance the two lines of name and role beside it.
   * 48px on a phone up to 56px from `sm` breakpoint, with the initials scaling
   * with it, so the row reads as a person on a 320px screen and on a 27" one.
   */
  const sizeClass = {
    sm: 'h-12 w-12 rounded-full text-sm sm:h-14 sm:w-14 sm:text-base',
    md: 'h-14 w-14 rounded-full text-base',
    lg: 'h-full w-full text-3xl',
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-[var(--casa-warm-soft)] font-bold tracking-tight text-[var(--casa-accent-text)]',
        sizeClass,
        className
      )}
    >
      {initials}
    </span>
  );
}
