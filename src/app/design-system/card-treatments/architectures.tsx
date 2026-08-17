import type { ReactNode } from 'react';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CardRail } from '@/components/ui/card-rail';

export type PreviewCourse = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  media: { src: string; alt: string };
};

export type Architecture = {
  key: string;
  label: string;
  concept: string;
  risk: string;
  render: (courses: PreviewCourse[]) => ReactNode;
};

/**
 * Legibility scrim for type set directly on a photograph.
 *
 * Measured rather than eyeballed. Browsers composite alpha in sRGB, so the worst
 * case is a blown-out white pixel under the text: --casa-ink-deep (#111827) over
 * white needs alpha >= 0.60 for white type to clear 4.5:1 (0.58 gives 4.37 and
 * fails). The ramp therefore reaches 0.74 well above where the type starts.
 *
 * This matters here specifically because the CASA photo library is ungraded with
 * a wide luminance spread — a guessed scrim passes on the dark images and fails
 * on the bright ones.
 */
const SCRIM = {
  backgroundImage: [
    'linear-gradient(180deg,',
    'color-mix(in srgb, var(--casa-ink-deep) 0%, transparent) 0%,',
    'color-mix(in srgb, var(--casa-ink-deep) 8%, transparent) 24%,',
    'color-mix(in srgb, var(--casa-ink-deep) 30%, transparent) 42%,',
    'color-mix(in srgb, var(--casa-ink-deep) 60%, transparent) 56%,',
    'color-mix(in srgb, var(--casa-ink-deep) 80%, transparent) 74%,',
    'color-mix(in srgb, var(--casa-ink-deep) 92%, transparent) 100%)',
  ].join(' '),
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2';

export const ARCHITECTURES: Architecture[] = [
  {
    key: 'h-cover-plate',
    label: 'H · Full-bleed cover plate',
    concept:
      'The photograph IS the card. No photo well, no separate body — one portrait surface with a measured scrim and the type bottom-anchored over it. The whole plate is a single link and a single tab stop.',
    risk: 'Needs portrait crops and decent photography. A busy or blown-out source turns the upper half to mush, and the section gets tall.',
    render: (courses) => (
      <ul className="grid auto-rows-fr gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {courses.map((course, index) => (
          <li key={course.href} className="h-full">
            <Link
              href={course.href}
              aria-label={`${course.ctaLabel}: ${course.title}`}
              className={cn(
                'casa-cta-link casa-surface-dark group relative flex h-full min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-[var(--casa-ink-deep)] no-underline shadow-[var(--shadow-card)]',
                'transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[var(--shadow-hero)]',
                'motion-safe:hover:-translate-y-1 motion-reduce:transition-none',
                FOCUS_RING
              )}
            >
              <div className="absolute inset-0">
                <div className="casa-media-overlay h-full w-full">
                  <Image
                    src={course.media.src}
                    alt={course.media.alt}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 46vw, 92vw"
                    className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                  />
                </div>
              </div>

              <div aria-hidden className="pointer-events-none absolute inset-0" style={SCRIM} />

              <div className="relative">
                <div className="px-6 pb-5 md:px-7">
                  <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-eyebrow text-white/85">
                    <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                    <span className="h-px w-8 bg-white/40" aria-hidden />
                  </p>
                  <h3 className="mt-4 text-2xl font-bold text-white md:text-3xl">{course.title}</h3>
                  <p className="mt-3 max-w-measure text-[15px] leading-relaxed text-white/88">
                    {course.description}
                  </p>
                </div>

                {/*
                  The one deliberate break in the padding. Everything above and
                  below is inset; this rule bleeds to the card's left edge.
                  Symmetrical padding on all four sides is the clearest tell of a
                  component-library card — one break reads as typeset.
                */}
                <div className="flex" aria-hidden>
                  <span className="casa-tricolor-rule h-px w-16 md:w-20" />
                  <span className="h-px flex-1 bg-white/25" />
                </div>

                <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-7">
                  <span className="text-sm font-bold text-white">{course.ctaLabel}</span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/12 text-white transition-transform duration-300 motion-safe:group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'i-landscape-plate',
    label: 'I · Landscape plate',
    concept:
      'The card turns landscape: a full-bleed photographic slab flush against three edges, and a content panel beside it. The image is not inset inside the card padding — it runs to the edge, which is what stops it reading as a stock card.',
    risk: 'Halves the density. Six courses become three rows of two and the band gets roughly 40% taller.',
    render: (courses) => (
      <ul className="grid auto-rows-fr gap-5 xl:grid-cols-2">
        {courses.map((course, index) => (
          <li key={course.href} className="h-full">
            <article
              className={cn(
                'group flex h-full overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-soft)] transition-all duration-300',
                'motion-safe:hover:-translate-y-1 hover:shadow-[var(--shadow-card)]'
              )}
            >
              <div className="casa-media-overlay relative w-[38%] shrink-0 overflow-hidden">
                <Image
                  src={course.media.src}
                  alt={course.media.alt}
                  fill
                  sizes="(min-width: 1280px) 19vw, 38vw"
                  className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 md:p-7">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                  <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                </p>
                <h3 className="mt-3 text-2xl font-bold text-[var(--casa-ink)]">{course.title}</h3>
                <p className="mt-3 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
                  {course.description}
                </p>
                <Link
                  href={course.href}
                  className={cn(
                    'casa-cta-link group/cta mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[var(--casa-ink)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text)] hover:underline',
                    FOCUS_RING
                  )}
                >
                  {course.ctaLabel}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover/cta:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'j-editorial-index',
    label: 'J · Editorial index',
    concept:
      'Not a card at all. A numbered typographic index — small tabular numeral in a fixed gutter, large title, a measure-clamped description, and the CTA on the far right of the same optical baseline. Hairline rules between rows. Zero photography.',
    risk: 'Deletes the photography budget entirely. If CASA wants faces and classrooms back on this surface there is nowhere to put them, and the band loses all warmth.',
    render: (courses) => (
      <ul className="border-t border-[color:var(--casa-sand)]">
        {courses.map((course, index) => (
          <li key={course.href} className="border-b border-[color:var(--casa-sand)]">
            <Link
              href={course.href}
              aria-label={`${course.ctaLabel}: ${course.title}`}
              className={cn(
                'casa-cta-link group grid grid-cols-[3rem_1fr] items-baseline gap-x-4 gap-y-3 py-7 no-underline md:grid-cols-[4rem_minmax(0,22rem)_1fr_auto] md:gap-x-8 md:py-9',
                FOCUS_RING
              )}
            >
              <span className="text-sm font-semibold tabular-nums text-[var(--casa-muted)]">
                {String(index + 1).padStart(2, '0')}
              </span>

              <h3 className="text-2xl font-bold text-[var(--casa-ink)] transition-colors group-hover:text-[var(--casa-accent-text)] md:text-3xl">
                {course.title}
              </h3>

              <p className="col-start-2 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)] md:col-start-3">
                {course.description}
              </p>

              <span className="col-start-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--casa-ink)] md:col-start-4 md:justify-self-end">
                {course.ctaLabel}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'k-anchored-feature',
    label: 'K · Anchored feature',
    concept:
      'Not a uniform grid. The first course takes a large plate spanning four columns and two rows; the rest are compact siblings. Hierarchy comes from size, so the set reads as one composed layout rather than N equal tiles.',
    risk: 'Array order becomes an editorial decision. Whoever authors the course list is choosing what gets promoted, and an alphabetical or date sort would silently reassign it.',
    render: (courses) => (
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:auto-rows-fr xl:grid-cols-6">
        {courses.map((course, index) => {
          const isFeature = index === 0;

          return (
            <li
              key={course.href}
              className={cn('h-full', isFeature ? 'sm:col-span-2 xl:col-span-4 xl:row-span-2' : 'xl:col-span-2')}
            >
              <Link
                href={course.href}
                aria-label={`${course.ctaLabel}: ${course.title}`}
                className={cn(
                  'casa-cta-link group relative flex h-full overflow-hidden rounded-2xl no-underline shadow-[var(--shadow-soft)] transition-all duration-300',
                  'motion-safe:hover:-translate-y-1 hover:shadow-[var(--shadow-card)]',
                  isFeature
                    ? 'casa-surface-dark min-h-[24rem] flex-col justify-end bg-[var(--casa-ink-deep)]'
                    : 'flex-col bg-white',
                  FOCUS_RING
                )}
              >
                {isFeature ? (
                  <>
                    <div className="absolute inset-0">
                      <div className="casa-media-overlay h-full w-full">
                        <Image
                          src={course.media.src}
                          alt={course.media.alt}
                          fill
                          sizes="(min-width: 1280px) 62vw, 92vw"
                          className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                        />
                      </div>
                    </div>
                    <div aria-hidden className="pointer-events-none absolute inset-0" style={SCRIM} />
                    <div className="relative p-7 md:p-9">
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-white/85">
                        Most chosen
                      </p>
                      <h3 className="mt-4 text-3xl font-bold text-white md:text-4xl">{course.title}</h3>
                      <p className="mt-4 max-w-measure text-base leading-relaxed text-white/88">
                        {course.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white">
                        {course.ctaLabel}
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <p className="text-xs font-semibold uppercase tracking-eyebrow tabular-nums text-[var(--casa-muted)]">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-3 text-lg font-bold text-[var(--casa-ink)]">{course.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                      {course.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-[var(--casa-ink)]">
                      {course.ctaLabel}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    ),
  },
  {
    key: 'l-peek-rail',
    label: 'L · Filmstrip peek rail',
    concept:
      'A snapping filmstrip that runs on desktop, not only mobile. The next card is visibly cut by the edge so the row announces itself as continuous, arrows disable at each end, and the progress bar tracks real scroll position.',
    risk: 'Content below the fold of the rail is a click away rather than visible. Horizontal scrolling is still a weaker browse pattern than a grid when someone wants to compare all six at once.',
    render: (courses) => (
      <CardRail ariaLabel="Course formats">
        {courses.map((course, index) => (
          <li
            key={course.href}
            className="w-[78vw] shrink-0 snap-start sm:w-[46vw] xl:w-[30%]"
          >
            <Link
              href={course.href}
              aria-label={`${course.ctaLabel}: ${course.title}`}
              className={cn(
                'casa-cta-link casa-surface-dark group relative flex h-full min-h-[24rem] flex-col justify-end overflow-hidden rounded-2xl bg-[var(--casa-ink-deep)] no-underline shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)]',
                FOCUS_RING
              )}
            >
              <div className="absolute inset-0">
                <div className="casa-media-overlay h-full w-full">
                  <Image
                    src={course.media.src}
                    alt={course.media.alt}
                    fill
                    sizes="(min-width: 1280px) 30vw, 78vw"
                    className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                  />
                </div>
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-0" style={SCRIM} />

              {/*
                An opaque caption plate rather than type floating on the scrim:
                inset from three edges so the photograph frames it, which reads
                as a print caption instead of an overlay.
              */}
              <div className="relative m-3 rounded-xl bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-eyebrow tabular-nums text-[var(--casa-muted)]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-xl font-bold text-[var(--casa-ink)]">{course.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                  {course.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--casa-ink)]">
                  {course.ctaLabel}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </CardRail>
    ),
  },
  {
    key: 'm-progressive-reveal',
    label: 'M · Progressive reveal',
    concept:
      'Minimal at rest — photograph and title only. The description and CTA rise into view on hover or keyboard focus. The reveal is an enhancement, never the only route to the information: on touch and reduced-motion it is simply always open.',
    risk: 'Hover-dependent design is the easiest to get wrong. It also hides the thing that differentiates the courses from each other, so scanning six of them at rest tells you almost nothing.',
    render: (courses) => (
      <ul className="grid auto-rows-fr gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {courses.map((course) => (
          <li key={course.href} className="h-full">
            <Link
              href={course.href}
              aria-label={`${course.ctaLabel}: ${course.title}`}
              className={cn(
                'casa-cta-link casa-surface-dark group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl bg-[var(--casa-ink-deep)] no-underline shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)]',
                FOCUS_RING
              )}
            >
              <div className="absolute inset-0">
                <div className="casa-media-overlay h-full w-full">
                  <Image
                    src={course.media.src}
                    alt={course.media.alt}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 46vw, 92vw"
                    className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
                  />
                </div>
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-0" style={SCRIM} />

              <div className="relative p-6">
                <h3 className="text-2xl font-bold text-white">{course.title}</h3>

                {/*
                  grid-template-rows 0fr -> 1fr is the only way to animate to
                  content height without hardcoding a pixel value.

                  Three fallbacks, all deliberate: `group-focus-visible` opens it
                  for keyboard users; `[@media(hover:none)]` leaves it open on
                  touch, where hover never fires; and `motion-reduce` drops the
                  transition so a reduced-motion user gets an instant state
                  rather than no state. The content is always in the DOM, so a
                  screen reader reaches it regardless.
                */}
                <div
                  className={cn(
                    'grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out',
                    'group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]',
                    'motion-reduce:transition-none [@media(hover:none)]:grid-rows-[1fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-measure pt-3 text-sm leading-relaxed text-white/88">
                      {course.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white">
                      {course.ctaLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    ),
  },
];
