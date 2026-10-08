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
 * of a photograph: a shape per breakpoint (square on phones, 4:3, then 3:2
 * beside the lede), with the ring kept round inside it and the labels around.
 *
 * Interactive: each marker and its label is one button. Hover, focus or a tap
 * makes it active — the marker lifts, the other labels step back, and the
 * centre swaps CASA for that point's full sentence (the page's own funding
 * text, word for word). Leaving the ring, Escape, or tapping it again returns
 * to CASA. The warm light follows the pointer across the whole hero
 * (use-hero-glow.ts); the ring has no box of its own on the night hero.
 *
 * It shows destinations, never amounts. CASA has published no split of its
 * spending, so the ring must not grow percentages or segment sizes until CASA
 * supplies verified figures (CLAUDE.md hard rule 1).
 *
 * Motion: on load the ring draws itself, each marker and label arrive as the
 * line reaches them, the markers pulse once to say they can be pressed, and the
 * light keeps flowing. Under prefers-reduced-motion all of it renders finished
 * and still, and the glow stays put; the interaction itself still works.
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

const SIZE = 400;
const C = SIZE / 2;
const R = 170;
const PARTICLES = 40;

// Node centres as % of the ring box (R / SIZE = 0.425 from the centre).
const NODE_AT: readonly CSSProperties[] = [
  { left: '50%', top: '7.5%' },
  { left: '92.5%', top: '50%' },
  { left: '50%', top: '92.5%' },
  { left: '7.5%', top: '50%' },
];

// Each label stands a fixed gap off its marker's EDGE (the marker is the
// button), so the spacing is the same at every size: above, right, below, left.
const LABEL_SIDE = [
  'bottom-full left-1/2 mb-3 -translate-x-1/2 text-center',
  'left-full top-1/2 ml-2.5 -translate-y-1/2 text-left sm:ml-3.5',
  'top-full left-1/2 mt-3 -translate-x-1/2 text-center',
  'right-full top-1/2 mr-2.5 -translate-y-1/2 text-right sm:mr-3.5',
] as const;

// Server and browser can disagree in the last float digit of a sine, and React
// then reports a hydration mismatch on the SVG; two decimals is sub-pixel.
const round = (n: number) => Math.round(n * 100) / 100;

const step = (i: number) => ({ ['--node-index' as string]: i }) as CSSProperties;

export function NonprofitIncomeRing({ nodes, details, label, className }: NonprofitIncomeRingProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
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
      className={cn(
        styles.panel,
        // No box of its own: the ring stands on the night hero's ground.
        'relative aspect-square w-full text-white sm:aspect-[4/3] lg:aspect-[3/2]',
        className
      )}
      data-active={active ?? undefined}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      {/* The ring box: always square, centred, sized by the panel's height. */}
      <div className="absolute left-1/2 top-1/2 aspect-square h-[44%] -translate-x-1/2 -translate-y-1/2 sm:h-[58%] lg:h-[62%]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
          {/* Drawn clockwise from 12 o'clock; the rotate puts the dash start there. */}
          <circle
            className={styles.track}
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth={2}
            pathLength={1}
            strokeDasharray="1 1"
            transform={`rotate(-90 ${C} ${C})`}
          />
          {/* Income as light, moving clockwise. Each dot lights as the line reaches it. */}
          <g className={styles.flow}>
            {Array.from({ length: PARTICLES }, (_, i) => {
              const a = -Math.PI / 2 + (i / PARTICLES) * 2 * Math.PI;
              const big = i % 3 === 0;
              return (
                <circle
                  key={i}
                  className={styles.particle}
                  style={{ ['--p' as string]: i / PARTICLES } as CSSProperties}
                  cx={round(C + Math.cos(a) * R)}
                  cy={round(C + Math.sin(a) * R)}
                  r={big ? 5.5 : 3.2}
                  fill="var(--casa-sun)"
                  fillOpacity={big ? 1 : 0.5}
                />
              );
            })}
          </g>
        </svg>

        {/* The centre: CASA at rest, the active point's full sentence when one is chosen. */}
        <div aria-hidden="true" className={cn(styles.centreIn, 'pointer-events-none absolute inset-[16%] grid place-items-center text-center')}>
          <span className={cn(styles.centre, styles.swap, active !== null && styles.swapOut)}>CASA</span>
          {details.map((text, i) => (
            <span
              key={text}
              className={cn(
                styles.swap,
                active !== i && styles.swapOut,
                'max-w-[11rem] text-balance text-[0.68rem] font-medium leading-snug text-white sm:max-w-[13rem] sm:text-sm lg:text-[0.95rem]'
              )}
            >
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
            onFocus={() => setActive(i)}
            onClick={() => setActive((current) => (current === i ? null : i))}
            className={cn(
              styles.node,
              'absolute h-[clamp(1.5rem,2.6vw,2.1rem)] w-[clamp(1.5rem,2.6vw,2.1rem)] -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none'
            )}
            style={{ ...NODE_AT[i], ...step(i) }}
          >
            <span aria-hidden="true" className={styles.bead}>
              <span className={styles.beadCore} />
            </span>
            <span
              className={cn(
                styles.label,
                LABEL_SIDE[i],
                'absolute w-max text-[0.72rem] font-semibold leading-tight sm:text-sm lg:text-[0.95rem]',
                i % 2 === 0 ? 'max-w-[14rem]' : 'max-w-[4.4rem] sm:max-w-[8rem] lg:max-w-[9.5rem]'
              )}
            >
              {text}
            </span>
            <span id={`${id}-detail-${i}`} className="sr-only">
              {details[i]}
            </span>
          </button>
        ))}
      </div>
    </figure>
  );
}
