'use client';

import { Fragment, useCallback, useId, useRef, useState, type CSSProperties } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import styles from './exams-hero-visual.module.css';
import glowStyles from './hero-glow.module.css';
import { useHeroGlow } from './use-hero-glow';

/**
 * The exams CASA runs, as two seals standing on a calm horizon at sunrise —
 * the hero picture of /exams, a sister of the non-profit page's income ring
 * and the accommodation page's street, built the same way (a coded drawing on
 * the night hero, the warm light following the pointer across the whole hero).
 * The courses hero is the film's staircase; this one deliberately is not.
 *
 * One seal per exam the page offers, its short name in the centre (telc, the
 * level, and "Hochschule" for C1). Round each one runs the exam's two parts,
 * written and oral, as two segments of a ring: that is the split the
 * registration form offers (Vollprüfung, nur schriftlich, nur mündlich). A
 * fine tick ring sits inside the rim. The CASA film's sun rises behind them.
 *
 * Each seal is a link to its exam's page. Hovering or focusing one lights it
 * in the sun's yellow — the rim traces round from the horizon, the ticks and
 * the parts turn yellow — the other steps back, and a caption under the
 * horizon gives the exam's published summary. A tap opens the page.
 *
 * It shows the exams, never a certificate: CASA is the exam centre, telc
 * issues the certificate, and nothing here claims otherwise. telc is always
 * written in lower case.
 *
 * Motion: the horizon draws out from the middle, each seal's rim rises from
 * the point where it stands on the horizon up both sides at once, its ticks
 * appearing as the line passes them, then the parts and the names; the sun
 * climbs out of the horizon, slips behind both seals and settles in the notch
 * between them; each seal pulses once to say it can be pressed. Under
 * prefers-reduced-motion it renders finished and still; the links still work.
 */
export type ExamSeal = {
  /** The exam's anchor id on the page: 'b2', 'c1'. */
  id: string;
  /** The full exam name, for the caption and assistive tech: "telc Deutsch B2". */
  name: string;
  /** The level in the seal's centre: "B2". */
  level: string;
  /** A word under the level, e.g. "Hochschule"; omitted when the name has none. */
  qualifier?: string;
  /** The exam's published one-line summary. */
  summary: string;
  href: string;
  cta: string;
};

type ExamsHeroVisualProps = {
  exams: readonly [ExamSeal, ExamSeal];
  /** The exam's two parts, written first: ["Schriftlich", "Mündlich"]. */
  parts: readonly [string, string];
  /** Names the whole picture for assistive tech. */
  label: string;
  locale: 'de' | 'en';
  className?: string;
};

/*
 * THE GEOMETRY, all computed from a handful of numbers in a 720 × 468 box.
 *
 * - Two seals of radius R stand on the horizon (each touches it at one point,
 *   straight below its centre), mirror-symmetric about the box's axis x 360.
 * - Inside the rim: a tick ring every 5°, a longer tick every 30°; then a band
 *   cut into two segments by two parallel cuts at 3 and 9 o'clock, written
 *   above and oral below, each label centred on the band's middle radius.
 * - The sun sits in the notch between the two seals, on the axis, the same
 *   gap from both rims: its centre is where a circle of radius
 *   R + gap + sunR round each seal centre meets the axis.
 *
 * Coordinates are rounded to 0.01 so server and browser render the same
 * numbers (a hydration mismatch otherwise, see nonprofit-income-ring.tsx).
 */
const W = 720;
const H = 468;
const AXIS = W / 2;
const HORIZON = 336;
const R = 150;
/** Half the distance between the two seal centres: a 32-unit gap between the rims. */
const HALF_SPAN = R + 16;
const CY = HORIZON - R;

const TICK_OUT = R - 5;
const TICK_IN = R - 13;
const TICK_IN_MAJOR = R - 17;
const BAND_OUT = R - 22;
const BAND_IN = R - 52;
const BAND_MID = (BAND_OUT + BAND_IN) / 2;
/** Half the width of the parallel cut between the two parts. */
const CUT = 6;

const SUN_R = 34;
const SUN_GAP = 14;
const SUN_Y = CY - Math.sqrt((R + SUN_GAP + SUN_R) ** 2 - HALF_SPAN ** 2);

const r2 = (n: number) => Math.round(n * 100) / 100;
const vars = (v: Record<string, string | number>) => v as CSSProperties;
const pct = (v: number, of: number) => `${r2((v / of) * 100)}%`;

const SEAL_X = [AXIS - HALF_SPAN, AXIS + HALF_SPAN] as const;

type Tick = { x1: number; y1: number; x2: number; y2: number; major: boolean; t: number };

/** The tick ring, with each tick's place on the rim's way up (0 at the horizon, 1 at the top). */
function ticksFor(cx: number): Tick[] {
  return Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5;
    const a = (deg * Math.PI) / 180;
    const major = deg % 30 === 0;
    const inner = major ? TICK_IN_MAJOR : TICK_IN;
    // Degrees 90 is straight down in SVG; the rim draws up both sides from there.
    const fromBottom = Math.min(Math.abs(deg - 90), 360 - Math.abs(deg - 90));
    return {
      x1: r2(cx + Math.cos(a) * TICK_OUT),
      y1: r2(CY + Math.sin(a) * TICK_OUT),
      x2: r2(cx + Math.cos(a) * inner),
      y2: r2(CY + Math.sin(a) * inner),
      major,
      t: r2(fromBottom / 180),
    };
  });
}

/** One part: the band between BAND_IN and BAND_OUT above (side -1) or below (side 1) the cut. */
function segmentPath(cx: number, side: -1 | 1) {
  const y = r2(CY + side * CUT);
  const xo = r2(Math.sqrt(BAND_OUT ** 2 - CUT ** 2));
  const xi = r2(Math.sqrt(BAND_IN ** 2 - CUT ** 2));
  const sweepOut = side === -1 ? 1 : 0;
  const sweepIn = side === -1 ? 0 : 1;
  return (
    `M${r2(cx - xo)} ${y} A${BAND_OUT} ${BAND_OUT} 0 0 ${sweepOut} ${r2(cx + xo)} ${y}` +
    ` L${r2(cx + xi)} ${y} A${BAND_IN} ${BAND_IN} 0 0 ${sweepIn} ${r2(cx - xi)} ${y} Z`
  );
}

/** The label's path along the band's middle, left to right: over the top, or under the bottom. */
function labelPath(cx: number, side: -1 | 1) {
  return `M${r2(cx - BAND_MID)} ${CY} A${BAND_MID} ${BAND_MID} 0 0 ${side === -1 ? 1 : 0} ${r2(cx + BAND_MID)} ${CY}`;
}

/** The rim as two halves, each from the point on the horizon up to the top. */
function rimHalves(cx: number) {
  const bottom = `M${cx} ${HORIZON}`;
  return [`${bottom} A${R} ${R} 0 0 1 ${cx} ${CY - R}`, `${bottom} A${R} ${R} 0 0 0 ${cx} ${CY - R}`] as const;
}

const SEALS = SEAL_X.map((cx) => ({
  cx,
  ticks: ticksFor(cx),
  segments: [segmentPath(cx, -1), segmentPath(cx, 1)] as const,
  labels: [labelPath(cx, -1), labelPath(cx, 1)] as const,
  rim: rimHalves(cx),
}));

// A few stars in the sky that the seals and the sun leave free.
const STARS = (
  [
    [22, 30], [64, 14], [12, 132], [112, 10], [262, 22], [318, 40], [402, 40], [458, 22], [610, 12], [662, 30], [706, 118], [700, 214], [18, 236],
  ] as const
).filter(([x, y]) => SEAL_X.every((cx) => Math.hypot(x - cx, y - CY) > R + 12) && Math.hypot(x - AXIS, y - SUN_Y) > SUN_R + 28);

// The sun's light on the water: five strokes under it, each shorter than the last.
const GLINTS = [52, 38, 26, 16, 8].map((w, i) => ({ w, y: HORIZON + 10 + i * 11 + i * i, o: r2(0.7 - i * 0.12) }));

/** Digits in the sans: Playfair's 1 reads as an l. */
function SansDigits({ text }: { text: string }) {
  return text.split(/(\d+)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="font-sans">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function ExamsHeroVisual({ exams, parts, label, locale, className }: ExamsHeroVisualProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState<string | null>(null);
  const glow = useRef<HTMLDivElement>(null);
  useHeroGlow(glow);

  const onPointerLeave = useCallback(() => setActive(null), []);
  const partLabels = parts.map((part) => part.toLocaleUpperCase(locale));

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
        // No box of its own: the seals stand on the night hero's ground.
        'relative aspect-[720/468] w-full text-white',
        className
      )}
      data-active={active ?? undefined}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.34" />
            <stop offset="45%" stopColor="var(--casa-sun)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
          </radialGradient>
          {/* The light round a lit seal: it starts at the rim, so it reads as a halo. */}
          <radialGradient id={`${uid}-spill`}>
            <stop offset={r2(R / (R + 60))} stopColor="var(--casa-sun)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-horizon`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="14%" stopColor="#fff" stopOpacity="1" />
            <stop offset="86%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-water`} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2={HORIZON + 96}>
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`${uid}-fade`} maskUnits="userSpaceOnUse" x="0" y={HORIZON} width={W} height={H - HORIZON}>
            <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${uid}-water)`} />
          </mask>
          {/* The sky: the sun rises out of the horizon, never through the water. */}
          <clipPath id={`${uid}-sky`}>
            <rect x={-W} y={-H} width={W * 3} height={H + HORIZON} />
          </clipPath>
          {SEALS.map((seal, i) =>
            seal.labels.map((d, p) => <path key={`${i}-${p}`} id={`${uid}-label-${i}-${p}`} d={d} fill="none" />)
          )}
        </defs>

        {STARS.map(([x, y], i) => (
          <circle key={i} className={styles.star} style={vars({ '--s': i })} cx={x} cy={y} r={i % 4 === 0 ? 1.6 : 1.1} fill="#fff" />
        ))}

        {/* The sun, behind everything it passes. */}
        <g clipPath={`url(#${uid}-sky)`}>
          <g className={styles.sun}>
            <circle cx={AXIS} cy={r2(SUN_Y)} r={140} fill={`url(#${uid}-halo)`} />
            <circle className={styles.sunDisc} cx={AXIS} cy={r2(SUN_Y)} r={SUN_R} fill="var(--casa-sun)" />
          </g>
        </g>

        {/* The water: the seals' rims mirrored in it, fading, and the sun's light on it. */}
        <g className={styles.waterDim}>
          <g className={styles.water}>
            <g mask={`url(#${uid}-fade)`} className={styles.reflection}>
              <g transform={`translate(0 ${2 * HORIZON}) scale(1 -1)`} fill="none" stroke="#fff" strokeWidth={2}>
                {SEALS.map((seal) => (
                  <circle key={seal.cx} cx={seal.cx} cy={CY} r={R} />
                ))}
              </g>
            </g>
            {GLINTS.map((g, k) => (
              <line
                key={g.y}
                className={styles.glint}
                style={vars({ '--g': `${k * 0.35}s` })}
                x1={AXIS - g.w / 2}
                x2={AXIS + g.w / 2}
                y1={g.y}
                y2={g.y}
                stroke="var(--casa-sun)"
                strokeOpacity={g.o}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </g>
        </g>

        {/* The horizon, drawn out from the middle in both directions. */}
        <g stroke={`url(#${uid}-horizon)`} strokeWidth={2} fill="none">
          <path className={styles.horizon} d={`M${AXIS} ${HORIZON} H0`} pathLength={1} strokeDasharray="1 1" />
          <path className={styles.horizon} d={`M${AXIS} ${HORIZON} H${W}`} pathLength={1} strokeDasharray="1 1" />
        </g>

        {SEALS.map((seal, i) => {
          const exam = exams[i];
          const on = active === exam.id;
          return (
            <g key={exam.id} className={styles.seal} data-on={on || undefined} style={vars({ '--i': i })}>
              <circle className={styles.spill} cx={seal.cx} cy={CY} r={R + 60} fill={`url(#${uid}-spill)`} />
              <circle className={styles.fill} cx={seal.cx} cy={CY} r={R} fill="var(--casa-ink-panel)" />

              <g className={styles.ticks} stroke="#fff" strokeLinecap="round">
                {seal.ticks.map((t, k) => (
                  <line
                    key={k}
                    className={cn(styles.tick, t.major && styles.major)}
                    style={vars({ '--t': t.t })}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                  />
                ))}
              </g>

              <g className={styles.parts} stroke="#fff" strokeLinejoin="round">
                {seal.segments.map((d, p) => (
                  <path key={p} className={styles.segment} style={vars({ '--p': p })} d={d} pathLength={1} strokeDasharray="1 1" />
                ))}
                {[-1, 1].map((side) => (
                  <circle key={side} className={styles.cut} cx={r2(seal.cx + side * BAND_MID)} cy={CY} r={2.6} stroke="none" />
                ))}
              </g>

              {partLabels.map((text, p) => (
                <text key={p} className={styles.partLabel} textAnchor="middle" style={vars({ '--p': p })}>
                  <textPath href={`#${uid}-label-${i}-${p}`} startOffset="50%">
                    <tspan dy="0.37em">{text}</tspan>
                  </textPath>
                </text>
              ))}

              <g className={styles.names} textAnchor="middle">
                <text className={styles.brand} x={seal.cx} y={CY - 44}>
                  telc
                </text>
                <text className={styles.level} x={seal.cx} y={CY + 25}>
                  {exam.level}
                </text>
                {exam.qualifier ? (
                  <text className={styles.qualifier} x={seal.cx} y={CY + 56}>
                    {exam.qualifier}
                  </text>
                ) : null}
              </g>

              <g fill="none" strokeLinecap="round">
                {seal.rim.map((d, h) => (
                  <path key={h} className={styles.rim} d={d} stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray="1 1" />
                ))}
                {/* Lit: the rim traces round in yellow, up both sides from the horizon. */}
                {seal.rim.map((d, h) => (
                  <path key={`t${h}`} className={styles.trace} d={d} stroke="var(--casa-sun)" strokeWidth={3} pathLength={1} strokeDasharray="1 1" />
                ))}
                <circle className={styles.invite} cx={seal.cx} cy={CY} r={R} stroke="var(--casa-sun)" strokeWidth={2} />
              </g>
            </g>
          );
        })}
      </svg>

      {/* Caption: the chosen exam's published summary, in the water under the seals
          (pointer devices; a tap opens the page). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[5%] hidden sm:grid" style={{ top: pct(HORIZON + 18, H) }}>
        {exams.map((exam) => (
          <div key={exam.id} className={cn(styles.caption, 'text-center [grid-area:1/1]', active !== exam.id && styles.captionOut)}>
            <p className="font-display text-lg font-semibold leading-tight text-white xl:text-xl">
              <SansDigits text={exam.name} />
            </p>
            <p className="mx-auto mt-1.5 max-w-[33rem] text-pretty text-[0.74rem] leading-snug text-white/80 xl:text-[0.82rem]">
              {exam.summary} <span className="whitespace-nowrap font-semibold text-[var(--casa-sun)]">{exam.cta} →</span>
            </p>
          </div>
        ))}
      </div>

      {exams.map((exam, i) => (
        <Link
          key={exam.id}
          href={exam.href}
          aria-label={`${exam.name}: ${exam.summary}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setActive(exam.id);
          }}
          onFocus={() => setActive(exam.id)}
          onBlur={() => setActive(null)}
          className={cn(styles.hotspot, 'absolute rounded-full focus-visible:outline-none')}
          style={{
            left: pct(SEAL_X[i] - R, W),
            top: pct(CY - R, H),
            width: pct(2 * R, W),
            height: pct(2 * R, H),
          }}
          data-current={active === exam.id || undefined}
        />
      ))}
    </figure>
  );
}
