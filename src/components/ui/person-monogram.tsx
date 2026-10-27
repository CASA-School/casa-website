import Image from 'next/image';

import { cn } from '@/lib/utils';

/**
 * A colleague's avatar: their portrait, or their initials until one is on file.
 *
 * The portraits are CASA's own 2026 team shoot, the same photos as on the team
 * page (CLAUDE.md hard rule 3); a colleague without one keeps their initials,
 * never a stand-in face.
 *
 * Lifted out of signatures/team-directory.tsx, which had this as a private
 * component. The decision rail needed the same avatar, and two implementations
 * of "what a person looks like" would drift.
 *
 * `aria-hidden` and an empty alt: the name is always rendered as text next to
 * it, so announcing the initials or "portrait of …" adds nothing and interrupts
 * the name.
 *
 * The portraits are head-and-shoulders at 2:3, so in a small circle the face
 * would be a third of its width. The photo is drawn 1.8 times larger around the
 * face, which sits at about the same height in every frame of the shoot.
 */
export function PersonMonogram({
  name,
  photo,
  className,
  size = 'md',
}: {
  name: string;
  photo?: { src: string; position?: string };
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
        'relative flex shrink-0 items-center justify-center overflow-hidden bg-[var(--casa-warm-soft)] font-bold tracking-tight text-[var(--casa-accent-text)]',
        sizeClass,
        className
      )}
    >
      {photo ? (
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="112px"
          className="scale-[1.8] object-cover"
          style={{ objectPosition: photo.position ?? 'center 25%', transformOrigin: '50% 36%' }}
        />
      ) : (
        initials
      )}
    </span>
  );
}
