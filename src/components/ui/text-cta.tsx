import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * A secondary call to action, set as a link rather than a button.
 *
 * The site had 39 `<Button>` call sites and no text-CTA primitive at all, so
 * every "and also…" action became another filled or outlined control. The
 * homepage alone rendered ten buttons in `<main>` across five variants and not
 * one text link — at which point nothing is emphasised, because everything is.
 *
 * The rule this exists to make easy: one solid button per decision. The action
 * a visitor came to take is a button; everything else beside it is this.
 *
 * The arrow is the same 22x8 mark used across the site's CTAs and slides on
 * hover. It is `aria-hidden` — the label already says where the link goes.
 */
export function TextCta({
  href,
  children,
  className,
  onDark = false,
  ...props
}: React.ComponentProps<typeof Link> & {
  /** Re-points the colour for use on `--casa-ink-deep` surfaces. */
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'casa-cta-link group inline-flex items-center gap-2.5 text-sm font-semibold underline-offset-4 transition-colors hover:underline',
        onDark
          ? 'text-white/85 hover:text-white'
          : 'text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 22 8"
        fill="none"
        className="h-2 w-[20px] shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1"
      >
        <path
          d="M0 4h20M16.5 0.6L20.4 4l-3.9 3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
