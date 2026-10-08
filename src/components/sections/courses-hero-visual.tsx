'use client';

import { useCallback, useId, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import styles from './courses-hero-visual.module.css';
import glowStyles from './hero-glow.module.css';
import { useHeroGlow } from './use-hero-glow';

/**
 * The level staircase from the CASA film (Journey.tsx, `Levels`), as the hero
 * picture of /courses: the sister of the non-profit page's income ring and the
 * accommodation page's Bremen street, built the same way (no box of its own on
 * the night hero, the warm light following the pointer across the whole hero).
 *
 * Six steps, A1 · A2 · B1 · B1+ · B2 · C1. On load a pen draws the stair from
 * the ground up, the sun drops onto A1 and climbs one step per beat, each step
 * lighting as it lands, and comes to rest on C1. Each step is a link: hovering
 * or focusing it lights the step, the rest of the stair steps back and the
 * caption in the sky says what that level means at CASA (the intensive course
 * page's own learning goal for the level, and how long it takes). On touch the
 * first tap shows the caption and the second, or its link, follows it.
 *
 * No telc exams on these steps: they belong to the exams hero. No prices.
 *
 * Under prefers-reduced-motion everything renders finished and still, the sun
 * already on C1; the links still work.
 */
export type CoursesStaircaseStep = {
  /** 'A1', 'B1+', … — set in the sans face. */
  level: string;
  /** What a learner can do on this level (the intensive course's learning goal). */
  focus: string;
  /** How long the level takes. */
  fact: string;
  href: string;
  cta: string;
};

type CoursesHeroVisualProps = {
  steps: readonly CoursesStaircaseStep[];
  /** The caption while no step is chosen. */
  rest: { title: string; text: string };
  /** The level the page is filtered to (?level=), lit while nothing else is. */
  current?: string;
  /** Names the whole picture for assistive tech. */
  label: string;
  className?: string;
};

/*
 * THE STAIR IS DRAWN TO SCALE, AS A REAL STAIR. 3.5 viewBox units = 1 cm, in
 * elevation.
 *
 * Riser 17 cm, tread 29 cm: the comfortable stair of German building practice,
 * and the one pair that meets all three classic rules exactly —
 *   Schrittmaßregel        2 × 17 + 29 = 63 cm (one stride)
 *   Sicherheitsregel       17 + 29     = 46 cm
 *   Bequemlichkeitsregel   29 − 17     = 12 cm
 * Every riser and every tread is the same, so the climb from A1 to C1 is one
 * straight line at 30.4° and the sun's hops are identical.
 *
 * The stair is centred on the 720-unit box. The sun (r 17) sits on the line of
 * each tread, centred on it. Coordinates are rounded to 0.01 so server and
 * browser render the same numbers (a hydration mismatch otherwise, see
 * nonprofit-income-ring.tsx).
 */
const W = 720;
const H = 480;
const CM = 3.5;
const RISER = 17 * CM;
const TREAD = 29 * CM;
const GROUND = 440;
const SUN_R = 17;
/** Height of each hop above the straight line between two treads (the film's 100 px on a 224 px step). */
const HOP = 45;
/** How far the sun falls onto A1. */
const DROP = 170;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (v: number, of: number) => `${r2((v / of) * 100)}%`;
const vars = (v: Record<string, string | number>) => v as CSSProperties;

function geometry(count: number) {
  const x0 = (W - count * TREAD) / 2;
  const left = (i: number) => r2(x0 + i * TREAD);
  const top = (i: number) => r2(GROUND - (i + 1) * RISER);

  // One pen line from the ground at A1, up every riser and along every tread, down the far side.
  let outline = `M${left(0)} ${GROUND}`;
  for (let i = 0; i < count; i++) outline += ` V${top(i)} H${left(i + 1)}`;
  outline += ` V${GROUND}`;

  // The joints between the blocks, each from the ground to the lower tread.
  let joints = '';
  for (let i = 1; i < count; i++) joints += `M${left(i)} ${GROUND} V${top(i - 1)} `;

  const column = (i: number) => `M${left(i)} ${GROUND} V${top(i)} H${left(i + 1)} V${GROUND} Z`;

  // Each step's hit area: its block and one riser of air above the tread (the sun's
  // place), so A1 is still a fair target on a phone. No two overlap.
  const hotspots = Array.from({ length: count }, (_, i) => {
    const y = top(i) - RISER;
    return {
      box: { left: pct(left(i), W), top: pct(y, H), width: pct(TREAD, W), height: pct(GROUND - y, H) },
      // The label sits in the middle of the step's own riser band, under its tread.
      labelTop: pct(1.5 * RISER, GROUND - y),
    };
  });

  // The sun's centre resting on step i: on the tread's axis, touching the line.
  const sunAt = (i: number) => ({ x: r2(x0 + (i + 0.5) * TREAD), y: r2(top(i) - SUN_R - 1) });

  /*
   * The sun's flight from each step to the next, drawn as a dotted trail. The CSS
   * motion is a straight line at constant speed plus a quadratic rise and fall of
   * HOP (y = −4·HOP·t(1−t)); a quadratic Bézier whose control point sits 2·HOP
   * above the chord's midpoint is exactly that curve, so the trail is the path
   * the sun flies, not an approximation of it.
   */
  const hops = Array.from({ length: count - 1 }, (_, k) => {
    const a = sunAt(k);
    const b = sunAt(k + 1);
    return `M${a.x} ${a.y} Q${r2((a.x + b.x) / 2)} ${r2((a.y + b.y) / 2 - 2 * HOP)} ${b.x} ${b.y}`;
  });

  const sun = sunAt(count - 1);

  return {
    outline,
    joints: joints.trim(),
    silhouette: `${outline} Z`,
    columns: Array.from({ length: count }, (_, i) => column(i)),
    hotspots,
    hops,
    sun: { cx: sun.x, cy: sun.y },
    climb: { x: r2(-(count - 1) * TREAD), y: r2((count - 1) * RISER) },
  };
}

export function CoursesHeroVisual({ steps, rest, current, label, className }: CoursesHeroVisualProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const glow = useRef<HTMLDivElement>(null);
  useHeroGlow(glow);

  // Touch: was this step already showing its caption when the finger came down?
  const lastPointer = useRef<string>('mouse');
  const wasShown = useRef(false);

  const g = geometry(steps.length);
  const currentIndex = current ? steps.findIndex((step) => step.level === current) : -1;
  const shown = active ?? (currentIndex >= 0 ? currentIndex : null);

  const onPointerLeave = useCallback((event: PointerEvent) => {
    if (event.pointerType === 'mouse') setActive(null);
  }, []);

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
        // No box of its own: the stair stands on the night hero's ground. A band of
        // sky above the drawing holds the caption on phones and narrow columns.
        'relative aspect-square w-full text-white sm:aspect-[3/2] lg:aspect-[4/3]',
        className
      )}
      data-active={shown ?? undefined}
      style={vars({
        '--hops': steps.length - 1,
        '--climb-x': `${g.climb.x}px`,
        '--climb-y': `${g.climb.y}px`,
        '--hop': `${HOP}px`,
        '--drop': `${DROP}px`,
      })}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      {/* The drawing: 3:2, standing on the bottom edge of the figure. */}
      <div className="absolute inset-x-0 bottom-0 aspect-[3/2]">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="casa-stairs-ground" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.07" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.93" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="casa-stairs-sun-glow">
              <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.42" />
              <stop offset="45%" stopColor="var(--casa-sun)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
            </radialGradient>
            {/* A lit step: the light falls from its tread and fades towards the ground. */}
            <linearGradient id="casa-stairs-lit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.3" />
              <stop offset="55%" stopColor="var(--casa-sun)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0.02" />
            </linearGradient>
            <filter id="casa-stairs-halo" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
            {/* Each hop's trail is revealed by a pen line drawn along it, behind the sun. */}
            {g.hops.map((d, k) => (
              <mask key={k} id={`casa-stairs-trail-${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                <path className={styles.trailPen} style={vars({ '--i': k })} d={d} fill="none" stroke="#fff" strokeWidth={10} pathLength={1} strokeDasharray="1 1" />
              </mask>
            ))}
          </defs>

          <path className={styles.ground} d={`M0 ${GROUND} H${W}`} stroke="url(#casa-stairs-ground)" strokeWidth={2} pathLength={1} strokeDasharray="1 1" />

          {/* The stair at rest: it steps back while one step is chosen. */}
          <g className={styles.base}>
            <path className={styles.fill} d={g.silhouette} fill="var(--casa-ink-panel)" />
            <path className={styles.joints} d={g.joints} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.4} />
            <path
              className={styles.line}
              d={g.outline}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
            />
            <g className={styles.trail} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeDasharray="0 9">
              {g.hops.map((d, k) => (
                <path key={k} d={d} mask={`url(#casa-stairs-trail-${k})`} />
              ))}
            </g>
          </g>

          {/* Each step lights once as the sun lands on it, then fades back. */}
          {g.columns.map((d, i) => (
            <path key={`flash-${i}`} className={styles.flash} style={vars({ '--i': i })} d={d} fill="url(#casa-stairs-lit)" stroke="var(--casa-sun)" strokeWidth={2} strokeLinejoin="round" />
          ))}

          {/* The chosen step, lit fully: a soft halo, the block itself, the light inside it. */}
          {g.columns.map((d, i) => (
            <g key={`lit-${i}`} className={styles.lit} data-on={shown === i || undefined}>
              <path d={d} fill="none" stroke="var(--casa-sun)" strokeWidth={5} strokeOpacity={0.55} filter="url(#casa-stairs-halo)" />
              <path d={d} fill="var(--casa-ink-panel)" />
              <path d={d} fill="url(#casa-stairs-lit)" stroke="var(--casa-sun)" strokeWidth={2.5} strokeLinejoin="round" />
            </g>
          ))}

          {/* The sun, at rest on C1. On load it falls onto A1 and climbs: one group per
              motion, so each keeps its own timing (drop, climb, hop, settle, squash). */}
          <g>
            <g className={styles.drop}>
              <g className={styles.climb}>
                <g className={styles.hop}>
                  <g className={styles.settle}>
                    <circle cx={g.sun.cx} cy={g.sun.cy} r={SUN_R * 4} fill="url(#casa-stairs-sun-glow)" />
                    <circle className={styles.squash} cx={g.sun.cx} cy={g.sun.cy} r={SUN_R} fill="var(--casa-sun)" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>

        {steps.map((step, i) => (
          <Link
            key={step.level}
            href={step.href}
            aria-label={`${step.level}: ${step.cta}`}
            aria-describedby={`${id}-step-${i}`}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setActive(i);
            }}
            onPointerDown={(event) => {
              lastPointer.current = event.pointerType;
              wasShown.current = shown === i;
            }}
            onClick={(event: MouseEvent) => {
              // A first tap shows the caption; the second (or the caption's link) goes.
              // `detail` is 0 for Enter on a focused link, which always goes.
              if (event.detail > 0 && lastPointer.current !== 'mouse' && !wasShown.current) {
                event.preventDefault();
                setActive(i);
              }
            }}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className={cn(styles.step, 'absolute focus-visible:outline-none')}
            style={{ ...g.hotspots[i].box, ...vars({ '--i': i }) }}
            data-on={shown === i || undefined}
          >
            <span className={styles.label} style={{ top: g.hotspots[i].labelTop }}>
              {step.level}
            </span>
            <span id={`${id}-step-${i}`} className="sr-only">
              {`${step.focus} ${step.fact}`}
            </span>
          </Link>
        ))}
      </div>

      {/* The caption, in the sky above the low steps: the overview at rest, the chosen
          level's goal, duration and link otherwise. All share one grid cell and cross-fade. */}
      <div aria-hidden="true" className={cn(styles.captions, 'pointer-events-none absolute inset-x-0 top-0 grid sm:inset-x-auto sm:left-[4%] sm:top-[5%] sm:w-[46%]')}>
        <div className={cn(styles.caption, shown !== null && styles.captionOut)}>
          <p className={styles.restTitle}>{rest.title}</p>
          <p className={styles.focus}>{rest.text}</p>
        </div>
        {steps.map((step, i) => (
          <div key={step.level} className={cn(styles.caption, shown !== i && styles.captionOut)}>
            <p className={styles.level}>{step.level}</p>
            <p className={styles.focus}>{step.focus}</p>
            <p className={styles.fact}>{step.fact}</p>
            <Link href={step.href} tabIndex={-1} className={cn(styles.cta, 'pointer-events-auto')}>
              {step.cta} →
            </Link>
          </div>
        ))}
      </div>
    </figure>
  );
}
