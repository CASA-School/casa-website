import React from 'react';
import { cn } from '@/lib/utils';

/**
 * The CASA site frame — WHERE the site aligns.
 *
 * This is a stable geometry contract, not a styling convenience. The same
 * ceiling is shared by page content, the navbar row, the footer, every hero,
 * the navbar dropdown clamps and the search-popover alignment, so that the
 * logo, the nav items and the first heading of a page all land on one vertical
 * line. Treat its rendered geometry as fixed.
 *
 * It deliberately does NOT vary per section. If you want a particular
 * composition to occupy less than the full width, that is a different
 * question with a different answer: wrap the composition in <ContentFrame>.
 *
 * Width, centring and gutters live in the `[data-casa-site-frame]` rule in
 * globals.css rather than in the class string here. That is not a style
 * preference — `cn()` is tailwind-merge, so a `className="max-w-4xl"` passed
 * from a call site would silently REPLACE a width utility rather than be
 * ignored. /contact shipped 400px narrow for exactly that reason. Unlayered
 * CSS outranks Tailwind's `@layer utilities`, so the contract now holds no
 * matter what a caller passes.
 *
 * `className` is still forwarded, and is the right place for layout that is
 * not width: the navbar puts `flex h-full items-center justify-between` here
 * so its row can be both the alignment frame and the flex context.
 */
export function Container({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<'div'>) {
  return (
    <div data-casa-site-frame="" className={cn(className)} {...props}>
      {children}
    </div>
  );
}
