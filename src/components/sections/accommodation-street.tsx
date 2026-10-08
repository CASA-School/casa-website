'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import styles from './accommodation-street.module.css';

/**
 * A Bremen street at dusk, drawn in the line style of the CASA film — the
 * hero picture of /accommodation, the sister of the non-profit page's income
 * ring (nonprofit-income-ring.tsx) and built the same way.
 *
 * Gabled houses, the Dom and the windmill on the Wall behind them, a moon, a
 * street lamp and a Bremen tram. Two buildings are the page's two options: the
 * modern block is the CASA shared flat, the house with the chimney a host
 * family. Each is a link to its detail page; hovering or focusing one lights it
 * fully, the rest of the street steps back, and a caption gives that option's
 * published summary. The warm glow leans towards the pointer.
 *
 * Contextual, not an availability claim (CLAUDE.md hard rule 5): it shows the
 * kind of home, never a particular room.
 *
 * Motion: on load the street draws itself in one line, the windows light up
 * house by house, the markers pulse once to show they can be pressed, then the
 * tram crosses and a few windows go on and off now and then. Under
 * prefers-reduced-motion everything renders finished and still, the tram
 * parked; the links still work.
 */
export type AccommodationStreetOption = {
  id: 'flat' | 'host';
  title: string;
  summary: string;
  href: string;
  cta: string;
};

type AccommodationStreetProps = {
  options: readonly [AccommodationStreetOption, AccommodationStreetOption];
  /** Names the whole picture for assistive tech. */
  label: string;
  className?: string;
};

const GROUND = 392;

type Win = { x: number; y: number; w: number; h: number };
type House = {
  kind?: 'flat' | 'host';
  outline: string;
  windows: Win[];
  door?: string;
  extra?: string;
};

const grid = (xs: number[], ys: number[], w: number, h: number): Win[] =>
  ys.flatMap((y) => xs.map((x) => ({ x, y, w, h })));

// The street, left to right. Coordinates are in the 720 × 480 viewBox, whose
// aspect the panel keeps at every width, so the HTML hotspots line up.
const HOUSES: House[] = [
  {
    outline: `M28 ${GROUND} V290 h10 v-14 h10 v-14 h10 v-14 h20 v14 h10 v14 h10 v14 h10 V${GROUND}`,
    windows: [...grid([40, 82], [300, 332], 14, 18), { x: 63, y: 258, w: 10, h: 12 }],
    door: `M62 ${GROUND} V368 h12 V${GROUND}`,
  },
  {
    outline: `M114 ${GROUND} V300 L148 252 L182 300 V${GROUND}`,
    windows: grid([124, 158], [310, 340], 14, 18),
    door: `M142 ${GROUND} V370 h12 V${GROUND}`,
  },
  {
    kind: 'flat',
    outline: `M192 ${GROUND} V206 H330 V${GROUND} M186 206 H336`,
    windows: [...grid([202, 228, 254, 280, 306], [218, 250, 282, 314], 16, 18), ...grid([202, 228, 288, 306], [348], 14, 16)],
    door: `M256 ${GROUND} V362 h20 V${GROUND} M250 360 h32`,
  },
  {
    outline: `M338 ${GROUND} V310 C338 292 352 290 352 276 H378 C378 290 392 292 392 310 V${GROUND}`,
    windows: grid([348, 370], [320, 346], 12, 16),
    door: `M360 ${GROUND} V372 h12 V${GROUND}`,
    extra: 'M370 291 a5 5 0 1 0 0.01 0',
  },
  {
    kind: 'host',
    outline: `M448 ${GROUND} V300 L505 214 L562 300 V${GROUND} M440 306 L505 208 L570 306`,
    windows: [...grid([460, 497, 534], [312], 16, 20), ...grid([460, 534], [348], 16, 20), { x: 498, y: 260, w: 14, h: 16 }],
    door: `M497 ${GROUND} V366 a8 8 0 0 1 16 0 V${GROUND} M490 ${GROUND - 1} h30`,
    extra: 'M530 262 V230 h12 V244',
  },
  {
    outline: `M572 ${GROUND} V296 h8 v-12 h9 v-12 h9 v-12 h16 v12 h9 v12 h9 v12 h8 V${GROUND}`,
    windows: grid([584, 618], [306, 338], 12, 16),
    door: `M600 ${GROUND} V368 h12 V${GROUND}`,
  },
  {
    outline: `M676 ${GROUND} V306 L708 262 L740 306 V${GROUND}`,
    windows: grid([688, 714], [316, 346], 12, 16),
  },
];

// Deterministic per-window variety, in integers so server and browser agree.
const hash = (n: number) => ((n * 2654435761) >>> 0) % 1000;

const STARS = [
  [46, 46], [118, 92], [176, 34], [238, 120], [300, 58], [330, 150], [430, 108], [472, 50], [530, 128], [606, 70], [668, 38], [690, 150], [84, 160], [444, 168],
] as const;

// Hotspot boxes as % of the panel (the building's footprint, roof included).
const HOTSPOT: Record<'flat' | 'host', CSSProperties> = {
  flat: { left: `${(186 / 720) * 100}%`, top: `${(200 / 480) * 100}%`, width: `${(150 / 720) * 100}%`, height: `${(192 / 480) * 100}%` },
  host: { left: `${(440 / 720) * 100}%`, top: `${(206 / 480) * 100}%`, width: `${(130 / 720) * 100}%`, height: `${(186 / 480) * 100}%` },
};

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function AccommodationStreet({ options, label, className }: AccommodationStreetProps) {
  const [active, setActive] = useState<'flat' | 'host' | null>(null);
  const panel = useRef<HTMLElement>(null);
  const followPointer = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    followPointer.current = fine && !still;
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const el = panel.current;
    if (!el || !followPointer.current) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--glow-y', `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
  }, []);

  const onPointerLeave = useCallback(() => {
    panel.current?.style.removeProperty('--glow-x');
    panel.current?.style.removeProperty('--glow-y');
    setActive(null);
  }, []);

  let windowIndex = 0;

  return (
    <figure
      ref={panel}
      role="group"
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn(
        styles.panel,
        'relative aspect-[3/2] w-full overflow-hidden rounded-[var(--casa-radius-feature)] bg-[var(--casa-ink-deep)] text-white',
        className
      )}
      data-active={active ?? undefined}
    >
      <div aria-hidden="true" className={styles.glow} />

      <svg viewBox="0 0 720 480" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="casa-street-lamp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="casa-street-spill">
            <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        {/* The moon sits in the gap between the two caption positions. */}
        <circle className={styles.moon} cx={360} cy={58} r={13} fill="var(--casa-warm-soft)" />
        {STARS.map(([x, y], i) => (
          <circle key={i} className={styles.star} style={vars({ '--s': i })} cx={x} cy={y} r={hash(i + 3) > 600 ? 1.6 : 1.1} fill="#fff" />
        ))}

        {/* Bremen behind the street, faint: the Dom's spires and the windmill on the Wall. */}
        <g className={styles.far} stroke="#fff" strokeWidth={1.6} fill="var(--casa-ink-deep)" strokeLinejoin="round">
          <path d={`M586 ${GROUND} V176 L599 124 L612 176 V${GROUND} M632 ${GROUND} V176 L645 124 L658 176 V${GROUND} M612 236 L622 226 L632 236`} />
          <path d={`M150 ${GROUND} L160 250 H180 L190 ${GROUND}`} />
          <g className={styles.sails} style={vars({ transformOrigin: '170px 244px' })}>
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a} 170 244)`}>
                <line x1={170} y1={244} x2={170} y2={198} />
                <rect x={171} y={200} width={8} height={30} fill="none" />
              </g>
            ))}
          </g>
        </g>

        {/* The street */}
        {HOUSES.map((house, h) => (
          <g key={h} className={styles.house} data-kind={house.kind} style={vars({ '--h': h })}>
            {house.kind ? <ellipse className={styles.spill} cx={house.kind === 'flat' ? 261 : 505} cy={GROUND} rx={110} ry={40} fill="url(#casa-street-spill)" /> : null}
            <path className={styles.fill} d={house.outline} fill="var(--casa-ink-panel)" />
            {house.windows.map((win, w) => {
              const i = windowIndex++;
              const roll = hash(i + 11);
              const mode = roll < 640 ? 'lit' : roll < 840 ? 'dark' : 'life';
              return (
                <g key={w} style={vars({ '--in': `${(1.25 + h * 0.12 + w * 0.05).toFixed(2)}s`, '--life': `${9 + (roll % 9)}s`, '--life-delay': `${(roll % 70) / 10}s` })}>
                  <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={1} fill="#24324a" />
                  {mode !== 'dark' ? (
                    <rect className={cn(styles.lit, mode === 'life' && styles.life)} x={win.x} y={win.y} width={win.w} height={win.h} rx={1} fill="var(--casa-amber)" />
                  ) : null}
                  <rect className={styles.litActive} x={win.x} y={win.y} width={win.w} height={win.h} rx={1} fill="var(--casa-sun)" />
                </g>
              );
            })}
            <path
              className={styles.line}
              d={[house.outline, house.door, house.extra].filter(Boolean).join(' ')}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
            />
          </g>
        ))}

        {/* Tree and lamp */}
        <g className={styles.prop} stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <line x1={418} y1={GROUND} x2={418} y2={352} />
          <circle cx={418} cy={330} r={23} fill="#1d2a3f" />
          <path d={`M660 ${GROUND} V316 h12`} fill="none" />
          <path d="M668 316 h12 l-2 7 h-8 z" fill="var(--casa-amber)" />
          <path className={styles.lampLight} d={`M670 323 L648 ${GROUND} H694 Z`} fill="url(#casa-street-lamp)" stroke="none" />
        </g>

        {/* Ground, pavement, rails */}
        <path className={styles.groundLine} d={`M0 ${GROUND} H720`} stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray="1 1" />
        <path d="M0 422 H720" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="14 12" />
        <path d="M0 452 H720 M0 458 H720" stroke="rgba(255,255,255,0.1)" strokeWidth={1.2} />

        {/* A Bremen tram crossing */}
        <g className={styles.tram}>
          <g stroke="#fff" strokeWidth={1.8} strokeLinejoin="round">
            <path d="M100 404 L92 392 L108 384 M92 392 H108" fill="none" />
            <rect x={0} y={404} width={200} height={42} rx={7} fill="var(--casa-ink-panel)" />
            <line x1={4} y1={436} x2={196} y2={436} stroke="var(--casa-sun)" strokeWidth={2.2} />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={12 + i * 26} y={412} width={18} height={14} rx={2} fill="var(--casa-amber)" stroke="none" />
            ))}
            <circle cx={34} cy={448} r={4} fill="var(--casa-ink-deep)" />
            <circle cx={64} cy={448} r={4} fill="var(--casa-ink-deep)" />
            <circle cx={136} cy={448} r={4} fill="var(--casa-ink-deep)" />
            <circle cx={166} cy={448} r={4} fill="var(--casa-ink-deep)" />
          </g>
        </g>
      </svg>

      {/* Caption: the chosen option's published summary, on the far side of the sky from
          its building so it never covers the marker (pointer devices; a tap opens the page). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[4.5%] top-[6%] hidden sm:block">
        {options.map((option) => (
          <div
            key={option.id}
            className={cn(styles.caption, 'absolute top-0 w-[43%]', option.id === 'flat' ? 'right-0' : 'left-0', active !== option.id && styles.captionOut)}
          >
            <p className="font-display text-lg font-semibold leading-tight text-white lg:text-xl">{option.title}</p>
            <p className="mt-1.5 text-[0.7rem] leading-snug text-white/80 lg:text-[0.8rem]">{option.summary}</p>
            <p className="mt-1.5 text-[0.7rem] font-semibold text-[var(--casa-sun)] lg:text-[0.8rem]">{option.cta} →</p>
          </div>
        ))}
      </div>

      {options.map((option, i) => (
        <Link
          key={option.id}
          href={option.href}
          aria-label={`${option.title}: ${option.summary}`}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setActive(option.id);
          }}
          onFocus={() => setActive(option.id)}
          onBlur={() => setActive(null)}
          className={cn(styles.hotspot, 'absolute rounded-[var(--casa-radius-control)] focus-visible:outline-none')}
          style={{ ...HOTSPOT[option.id], ...vars({ '--node-index': i }) }}
          data-current={active === option.id || undefined}
        >
          {/* The marker sits on the roof; its label stands beside it, towards the
              outside of the street, so the sky above stays free for the caption. */}
          <span aria-hidden="true" className={cn(styles.marker, 'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2')}>
            <span className={styles.bead}>
              <span className={styles.beadCore} />
            </span>
            <span
              className={cn(
                styles.markerLabel,
                'absolute top-1/2 -translate-y-1/2',
                option.id === 'flat' ? 'right-full mr-2.5 text-right' : 'left-full ml-2.5 text-left'
              )}
            >
              {option.title}
            </span>
          </span>
        </Link>
      ))}
    </figure>
  );
}
