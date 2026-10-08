import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import styles from './nonprofit-income-ring.module.css';

/**
 * Where CASA's income goes, as a loop: course fees travel round a ring and come
 * back as the four things they pay for. Ported from the CASA film's non-profit
 * scene (branch claude/casa-film): CASA at the centre, a label at each node,
 * light flowing round, on the ink ground with a warm glow behind it.
 *
 * It stands in the hero's media slot on /ueber-uns/gemeinnuetzigkeit, in place
 * of a photograph, so it fills the slot the way HeroBleedPhoto does: same
 * radius, a shape per breakpoint (square on phones, 4:3, then 3:2 beside the
 * lede), with the ring kept round inside it and the labels in the margin.
 *
 * It shows destinations, never amounts. CASA has published no split of its
 * spending, so the ring must not grow percentages or segment sizes until CASA
 * supplies verified figures (CLAUDE.md hard rule 1).
 *
 * The drawing is aria-hidden; the four labels are real text, and the page's
 * funding list says the same in full. Motion: the ring draws itself on load,
 * each node and label arrive as the line reaches them, and the light keeps
 * flowing — all of it skipped under prefers-reduced-motion, which shows the
 * finished ring.
 */
type NonprofitIncomeRingProps = {
  /** Short label at each node, clockwise from 12 o'clock. */
  nodes: readonly [string, string, string, string];
  /** Read out instead of the drawing, e.g. "Where CASA's income goes: …". */
  label: string;
  className?: string;
};

const SIZE = 400;
const C = SIZE / 2;
const R = 170;
const PARTICLES = 40;

const nodeAt = (i: number) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 2;
  return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R };
};

// Nodes sit at 7.5% / 92.5% of the ring box (R / SIZE = 0.425 from centre).
// Each label stands just outside its node: above, right of, below, left of it.
const LABEL_POSITION = [
  'left-1/2 top-[7.5%] -translate-x-1/2 -translate-y-[calc(100%+0.9rem)] text-center',
  'left-[92.5%] top-1/2 -translate-y-1/2 translate-x-[0.9rem] text-left',
  'left-1/2 top-[92.5%] -translate-x-1/2 translate-y-[0.9rem] text-center',
  'left-[7.5%] top-1/2 -translate-y-1/2 -translate-x-[calc(100%+0.9rem)] text-right',
] as const;

const step = (i: number) => ({ ['--node-index' as string]: i }) as CSSProperties;

export function NonprofitIncomeRing({ nodes, label, className }: NonprofitIncomeRingProps) {
  return (
    <figure
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-[var(--casa-radius-feature)] bg-[var(--casa-ink-deep)] text-white sm:aspect-[4/3] lg:aspect-[3/2]',
        className
      )}
      aria-label={label}
      role="img"
    >
      <div aria-hidden="true" className={styles.glow} />

      {/* The ring box: always square, centred, sized by the panel's height. */}
      <div className="absolute left-1/2 top-1/2 aspect-square h-[52%] -translate-x-1/2 -translate-y-1/2 sm:h-[60%] lg:h-[64%]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full overflow-visible" focusable="false">
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
                  cx={C + Math.cos(a) * R}
                  cy={C + Math.sin(a) * R}
                  r={big ? 5.5 : 3.2}
                  fill="var(--casa-sun)"
                  fillOpacity={big ? 1 : 0.5}
                />
              );
            })}
          </g>
          {nodes.map((_, i) => {
            const { x, y } = nodeAt(i);
            return (
              <g key={i} className={styles.node} style={step(i)}>
                <circle cx={x} cy={y} r={16} fill="var(--casa-ink-deep)" stroke="var(--casa-sun)" strokeWidth={3} />
                <circle cx={x} cy={y} r={6} fill="var(--casa-sun)" />
              </g>
            );
          })}
          <text x={C} y={C} dy="0.34em" textAnchor="middle" className={styles.centre}>
            CASA
          </text>
        </svg>

        {nodes.map((text, i) => (
          <span
            key={text}
            aria-hidden="true"
            className={cn(
              styles.label,
              LABEL_POSITION[i],
              'absolute w-max text-[0.72rem] font-semibold leading-tight text-white sm:text-sm lg:text-[0.95rem]',
              i % 2 === 0 ? 'max-w-[14rem]' : 'max-w-[4.1rem] sm:max-w-[8rem] lg:max-w-[9.5rem]'
            )}
            style={step(i)}
          >
            {text}
          </span>
        ))}
      </div>
    </figure>
  );
}
