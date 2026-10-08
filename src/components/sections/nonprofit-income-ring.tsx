'use client';

import { useCallback, useId, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import glowStyles from './hero-glow.module.css';
import styles from './nonprofit-income-ring.module.css';
import { useHeroGlow } from './use-hero-glow';

/**
 * Where CASA's income goes, as a loop: course fees travel round a ring and come
 * back as the four things they pay for. Ported from the CASA film's non-profit
 * scene (branch claude/casa-film): CASA at the centre, a marker at each node,
 * light flowing round, on the ink ground with a warm glow behind it.
 *
 * It stands in the hero's media slot on /ueber-uns/gemeinnuetzigkeit, in place
 * of a photograph, with the ring kept round inside it and the labels around.
 *
 * Interactive: each marker and its label is one button. Hover, focus or a tap
 * makes it active: the marker lifts in a halo, its quarter of the ring traces
 * out from it in yellow both ways (as the exams seals' rims do), the other
 * labels step back, and the centre swaps CASA for that point's full sentence
 * (the page's own funding text, word for word). Leaving the ring, Escape or
 * moving focus out of it returns to CASA, and on a touch screen so does tapping
 * the point again (touch only). A mouse click or Enter only ever opens a point,
 * as the exams seals do: hover or focus has opened it already, and the click
 * must not close what the visitor came to read. The warm light follows the
 * pointer across the whole hero (use-hero-glow.ts); the ring has no box of its
 * own on the night hero.
 *
 * It shows destinations, never amounts. CASA has published no split of its
 * spending, so the ring must not grow percentages or segment sizes until CASA
 * supplies verified figures (CLAUDE.md hard rule 1).
 *
 * Motion: on load the ring draws itself, each marker and label arrive as the
 * line reaches them, the markers pulse once to say they can be pressed, and the
 * light keeps flowing. Under prefers-reduced-motion all of it renders finished
 * and still, and the glow stays put; the interaction still works.
 */
type NonprofitIncomeRingProps = {
  /** Short label at each node, clockwise from 12 o'clock. */
  nodes: readonly [string, string, string, string];
  /** The full sentence for each node, same order; shown at the centre when it is active. */
  details: readonly string[];
  /** Names the whole figure for assistive tech. */
  label: string;
  className?: string;
};

/*
 * THE GEOMETRY. The SVG has no viewBox: every position is a percentage of the
 * square ring box and every stroke is in screen pixels, so the line weights are
 * the same at every size (CODED_HERO_ILLUSTRATION_GUIDE.md §1.2 R1), on a phone
 * as on a 1920 screen. Tiers in the module CSS.
 *
 * - The track: a circle of radius TRACK % of the box round its centre.
 * - Four markers on it, at 12, 3, 6 and 9 o'clock (NODE_DEG, 0° = 3 o'clock,
 *   clockwise as SVG measures angles).
 * - The light: PARTICLES dots, a quarter's worth between two markers. They sit
 *   half a step off the markers, and every third one is large, at 15°, 45° and
 *   75° into each quarter, so the pattern is symmetric about each marker and
 *   about the middle of each quarter.
 * - The active point's arc: half a quarter each way from its marker (ARC of the
 *   circumference), drawn as two circles that start at the marker, one turning
 *   clockwise and one mirrored.
 *
 * Coordinates go through r2() so server and browser render the same strings
 * (a hydration mismatch otherwise).
 */
const TRACK = 42.5;
const NODE_DEG = [-90, 0, 90, 180] as const;
const PARTICLES = 36;
const STEP = 360 / PARTICLES;
const ARC = 1 / 8;

// Node centres as % of the ring box, on the track.
const NODE_AT: readonly CSSProperties[] = [
  { left: '50%', top: `${50 - TRACK}%` },
  { left: `${50 + TRACK}%`, top: '50%' },
  { left: '50%', top: `${50 + TRACK}%` },
  { left: `${50 - TRACK}%`, top: '50%' },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

const LIGHT = Array.from({ length: PARTICLES }, (_, i) => {
  const a = ((-90 + (i + 0.5) * STEP) * Math.PI) / 180;
  return {
    x: `${r2(50 + Math.cos(a) * TRACK)}%`,
    y: `${r2(50 + Math.sin(a) * TRACK)}%`,
    big: i % 3 === 1,
    // Where the drawing line reaches it, 0 → 1 round the ring from 12 o'clock.
    p: r2((i + 0.5) / PARTICLES),
  };
});

// Each label sits a gap off its marker's EDGE, as a share of the marker's size
// (a % margin resolves against the button's width), so the spacing keeps its
// proportion at every size. The labels' boxes are trimmed to cap height and
// baseline (.label), so the gap is measured to the letters themselves.
const LABEL_SIDE = [
  'bottom-full left-1/2 mb-[40%] -translate-x-1/2 text-center',
  'left-full top-1/2 ml-[40%] -translate-y-1/2 text-left',
  'top-full left-1/2 mt-[40%] -translate-x-1/2 text-center',
  'right-full top-1/2 mr-[40%] -translate-y-1/2 text-right',
] as const;

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function NonprofitIncomeRing({ nodes, details, label, className }: NonprofitIncomeRingProps) {
  const id = useId();
  const uid = id.replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState<number | null>(null);
  // The active point when a press began, and what pressed. A tap can focus the
  // button before it clicks, and focus already makes the point active, so a
  // tap decides from the state before it: tap once to open, again to close.
  const press = useRef<{ was: number | null; type: string } | null>(null);
  const glow = useRef<HTMLDivElement>(null);
  useHeroGlow(glow);

  const onPointerLeave = useCallback(() => setActive(null), []);

  return (
    <figure
      role="group"
      aria-label={label}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setActive(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null);
      }}
      className={cn(
        styles.panel,
        // No box of its own: the ring stands on the night hero's ground.
        // Shape per breakpoint as --ar, width capped by the hero's viewport rule (HeroSurface) at that shape, so the drawing never pushes the hero past the screen and its overlays stay aligned.
        'relative text-white [--ar:6/5] sm:[--ar:4/3] xl:[--ar:3/2] mx-auto aspect-[var(--ar)] w-[min(100%,calc(var(--hero-media-max-h)*var(--ar)))]',
        className
      )}
      data-active={active ?? undefined}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      {/* The ring box: always square and centred; its size is set in the CSS. The
          type size here is the labels', which the box's own size is measured in. */}
      <div className={cn(styles.ring, 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.75rem] sm:text-sm lg:text-[0.95rem]')}>
        <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
          <defs>
            {/* The glow round each large point of light: emitted, never cast. */}
            <radialGradient id={`${uid}-light`}>
              <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.42" />
              <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Drawn clockwise from 12 o'clock (the CSS turns its start there). */}
          <circle className={styles.track} cx="50%" cy="50%" r={`${TRACK}%`} fill="none" pathLength={1} strokeDasharray="1 1" />

          {/* The active point's quarter, traced out from its marker both ways. */}
          {NODE_DEG.map((deg, i) =>
            [1, -1].map((turn) => (
              <circle
                key={`${i}${turn}`}
                className={styles.arc}
                data-on={active === i || undefined}
                style={{ transform: `rotate(${deg}deg)${turn < 0 ? ' scaleY(-1)' : ''}` }}
                cx="50%"
                cy="50%"
                r={`${TRACK}%`}
                fill="none"
                pathLength={1}
                strokeDasharray={`${ARC} 1`}
                strokeDashoffset={ARC}
              />
            ))
          )}

          {/* Income as light, moving clockwise. Each point lights as the line reaches it. */}
          <g className={styles.flow}>
            {LIGHT.map((dot) => (
              <g key={`${dot.x}${dot.y}`} className={styles.particle} style={vars({ '--p': dot.p })}>
                {dot.big ? <circle cx={dot.x} cy={dot.y} r={8} fill={`url(#${uid}-light)`} /> : null}
                <circle className={dot.big ? styles.big : styles.small} cx={dot.x} cy={dot.y} r={dot.big ? 2.5 : 1.5} />
              </g>
            ))}
          </g>
        </svg>

        {/* The centre: CASA at rest, the active point's full sentence when one is chosen.
            Its type size is the hero headline's own (the H1's text-4xl sm:text-5xl
            lg:text-6xl in heroes/shared.tsx): the CSS caps CASA at 0.85em of it, so the
            headline leads at every width. */}
        <div
          aria-hidden="true"
          className={cn(styles.centreIn, 'pointer-events-none absolute inset-0 grid place-items-center text-center text-4xl sm:text-5xl lg:text-6xl')}
        >
          <span className={cn(styles.word, styles.swap, active !== null && styles.swapOut)}>CASA</span>
          {details.map((text, i) => (
            <span key={text} className={cn(styles.sentence, styles.swap, active !== i && styles.swapOut)}>
              {text}
            </span>
          ))}
        </div>

        {nodes.map((text, i) => (
          <button
            key={text}
            type="button"
            aria-pressed={active === i}
            aria-describedby={`${id}-detail-${i}`}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setActive(i);
            }}
            onPointerDown={(event) => {
              press.current = { was: active, type: event.pointerType };
            }}
            onFocus={() => setActive(i)}
            onClick={(event) => {
              // A keyboard click (detail 0) has no press of its own.
              const p = event.detail === 0 ? null : press.current;
              press.current = null;
              // Touch: tap again to close. Mouse and keyboard only open, as the exams seals do.
              setActive(p && p.type !== 'mouse' && p.was === i ? null : i);
            }}
            className={cn(styles.node, 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none')}
            style={{ ...NODE_AT[i], ...vars({ '--node-index': i }) }}
          >
            <span aria-hidden="true" className={styles.bead}>
              <span className={styles.beadBody}>
                <span className={styles.beadCore} />
              </span>
            </span>
            <span className={cn(styles.label, i % 2 ? styles.side : styles.end, LABEL_SIDE[i], 'absolute')}>{text}</span>
            <span id={`${id}-detail-${i}`} className="sr-only">
              {details[i]}
            </span>
          </button>
        ))}
      </div>
    </figure>
  );
}
