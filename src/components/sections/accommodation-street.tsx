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

/*
 * THE STREET IS DRAWN TO SCALE. 10 viewBox units = 1 m, in a front elevation.
 *
 * - Ground floors are 3.2 m, upper floors 3.0 m, on every house, so the floor
 *   lines run straight along the whole street.
 * - Each facade is split into equal bays; a window (1.2 × 1.6 m, sill 0.9 m
 *   above the floor; 1.6 m wide in the modern block) or the door (1.1 × 2.3 m)
 *   sits on the axis of its bay. Gable windows sit on the facade's axis.
 * - Every roof and gable rises at the same 55° pitch. A stepped gable
 *   (Treppengiebel) is built on that pitch: the inner corner of every step lies
 *   exactly on the roof line, as on the Schnoor houses. The bell gable
 *   (Schweifgiebel) is mirror-symmetric about its axis inside the same envelope.
 * - The tram is a two-section car at true scale: 2.8 m tall, 2 × 11 m long.
 *
 * Coordinates are rounded to 0.01 so server and browser render the same
 * numbers (a hydration mismatch otherwise, see nonprofit-income-ring.tsx).
 */
const M = 10;
const GROUND = 392;
const STOREY_GROUND = 3.2 * M;
const STOREY = 3.0 * M;
const PITCH = Math.tan((55 * Math.PI) / 180);
const SILL = 0.9 * M;
const WINDOW_H = 1.6 * M;
const DOOR = { w: 1.1 * M, h: 2.3 * M };
const r2 = (n: number) => Math.round(n * 100) / 100;

type Roof = 'stepped' | 'pitched' | 'bell' | 'flat' | 'family';
type Spec = {
  x: number;
  width: number;
  storeys: number;
  bays: number;
  doorBay: number;
  roof: Roof;
  windowW?: number;
  kind?: 'flat' | 'host';
};

type Win = { x: number; y: number; w: number; h: number };
type House = {
  kind?: 'flat' | 'host';
  outline: string;
  windows: Win[];
  door: string;
  extra?: string;
  round?: { cx: number; cy: number; r: number };
  /** Bounding box incl. roof and eaves: the hotspot of a linked house. */
  box: { x: number; y: number; w: number; h: number };
};

// Left to right. Widths and heights in metres × M.
const SPECS: Spec[] = [
  { x: 24, width: 8.0 * M, storeys: 3, bays: 2, doorBay: 0, roof: 'stepped' },
  { x: 110, width: 6.4 * M, storeys: 3, bays: 2, doorBay: 1, roof: 'pitched' },
  { x: 180, width: 15.0 * M, storeys: 5, bays: 5, doorBay: 2, roof: 'flat', windowW: 1.6 * M, kind: 'flat' },
  { x: 336, width: 5.6 * M, storeys: 3, bays: 2, doorBay: 1, roof: 'bell' },
  { x: 446, width: 11.6 * M, storeys: 2, bays: 3, doorBay: 1, roof: 'family', kind: 'host' },
  { x: 584, width: 6.4 * M, storeys: 3, bays: 2, doorBay: 0, roof: 'stepped' },
  { x: 652, width: 6.4 * M, storeys: 3, bays: 2, doorBay: 1, roof: 'pitched' },
];

/** The y of the floor under storey k (0 = ground floor). */
const floorAt = (k: number) => (k === 0 ? GROUND : GROUND - STOREY_GROUND - (k - 1) * STOREY);

function build(spec: Spec): House {
  const { x, width: w, storeys, bays, doorBay, roof } = spec;
  const cx = x + w / 2;
  const eave = floorAt(storeys);
  const half = w / 2;
  const bay = w / bays;
  const winW = spec.windowW ?? 1.2 * M;

  const windows: Win[] = [];
  for (let k = 0; k < storeys; k++) {
    for (let b = 0; b < bays; b++) {
      if (k === 0 && b === doorBay) continue;
      windows.push({ x: r2(x + b * bay + (bay - winW) / 2), y: r2(floorAt(k) - SILL - WINDOW_H), w: winW, h: WINDOW_H });
    }
  }

  const doorX = r2(x + doorBay * bay + (bay - DOOR.w) / 2);
  const doorTop = GROUND - DOOR.h;
  let door =
    roof === 'family'
      ? `M${doorX} ${GROUND} V${r2(doorTop + DOOR.w / 2)} a${DOOR.w / 2} ${DOOR.w / 2} 0 0 1 ${DOOR.w} 0 V${GROUND}`
      : `M${doorX} ${GROUND} V${doorTop} h${DOOR.w} V${GROUND}`;

  let outline = '';
  let extra: string | undefined;
  let round: House['round'];
  let top = eave;
  let left = x;
  let right = x + w;

  if (roof === 'pitched' || roof === 'family') {
    const rise = half * PITCH;
    top = r2(eave - rise);
    outline = `M${x} ${GROUND} V${eave} L${r2(cx)} ${top} L${x + w} ${eave} V${GROUND}`;
    if (roof === 'family') {
      // Eaves overhang 0.6 m on both sides, continuing the same pitch.
      const o = 0.6 * M;
      left = x - o;
      right = x + w + o;
      outline += ` M${left} ${r2(eave + o * PITCH)} L${r2(cx)} ${top} L${right} ${r2(eave + o * PITCH)}`;
      // Chimney on the right slope, 0.9 m wide, its foot cut by the roof line.
      const cx0 = r2(cx + w * 0.2);
      const cx1 = r2(cx0 + 0.9 * M);
      const roofAt = (px: number) => r2(top + (px - cx) * PITCH);
      extra = `M${cx0} ${roofAt(cx0)} V${r2(top + 0.6 * M)} H${cx1} V${roofAt(cx1)}`;
      // The porch step under the door.
      door += ` M${r2(doorX - 0.4 * M)} ${GROUND - 1} h${r2(DOOR.w + 0.8 * M)}`;
    }
    windows.push({ x: r2(cx - 0.5 * M), y: r2(eave - rise * 0.5), w: 1.0 * M, h: 1.2 * M });
  } else if (roof === 'stepped') {
    // Three steps a side and a cap; each step's inner corner on the 55° line.
    const steps = 3;
    const capW = w * 0.2;
    const tread = (half - capW / 2) / steps;
    const riser = tread * PITCH;
    let d = `M${x} ${GROUND} V${eave}`;
    for (let i = 0; i < steps; i++) d += ` v${r2(-riser)} h${r2(tread)}`;
    d += ` v${r2(-riser)} h${r2(capW)} v${r2(riser)}`;
    for (let i = 0; i < steps; i++) d += ` h${r2(tread)} v${r2(riser)}`;
    outline = `${d} V${GROUND}`;
    top = r2(eave - (steps + 1) * riser);
    windows.push({ x: r2(cx - 0.5 * M), y: r2(eave - riser * 2.2), w: 1.0 * M, h: 1.2 * M });
  } else if (roof === 'bell') {
    // Inside the same 55° envelope: an S-curve in to a neck, a round head.
    const rise = half * PITCH;
    const neck = w * 0.36;
    const shoulder = r2(eave - rise * 0.38);
    const neckTop = r2(eave - rise * 0.78);
    outline =
      `M${x} ${GROUND} V${eave}` +
      ` C${x} ${shoulder} ${r2(cx - neck / 2)} ${shoulder} ${r2(cx - neck / 2)} ${neckTop}` +
      ` A${r2(neck / 2)} ${r2(neck / 2)} 0 0 1 ${r2(cx + neck / 2)} ${neckTop}` +
      ` C${r2(cx + neck / 2)} ${shoulder} ${x + w} ${shoulder} ${x + w} ${eave} V${GROUND}`;
    top = r2(neckTop - neck / 2);
    round = { cx: r2(cx), cy: r2(eave - rise * 0.6), r: r2(neck * 0.24) };
  } else {
    // The modern block: a flat roof behind a parapet, the coping 0.4 m proud.
    top = eave - 0.8 * M;
    left = x - 0.4 * M;
    right = x + w + 0.4 * M;
    outline = `M${x} ${GROUND} V${top} H${x + w} V${GROUND} M${left} ${top} H${right}`;
    // A canopy over the entrance, 0.6 m wider than the door each side.
    door += ` M${r2(doorX - 0.6 * M)} ${r2(doorTop - 2)} h${r2(DOOR.w + 1.2 * M)}`;
  }

  return {
    kind: spec.kind,
    outline,
    windows,
    door,
    extra,
    round,
    box: { x: r2(left), y: r2(top), w: r2(right - left), h: r2(GROUND - top) },
  };
}

const HOUSES: House[] = SPECS.map(build);

// The tram: 2.8 m body on 0.35 m wheels, two 11 m sections and a 0.8 m joint.
const TRAM = { rail: 456, height: 2.8 * M, section: 11 * M, joint: 0.8 * M, top: 456 - 0.7 * M - 2.8 * M };

// Deterministic per-window variety, in integers so server and browser agree.
const hash = (n: number) => ((n * 2654435761) >>> 0) % 1000;

const STARS = [
  [46, 46], [118, 92], [176, 34], [238, 120], [300, 58], [330, 150], [430, 108], [472, 50], [530, 128], [606, 70], [668, 38], [690, 150], [84, 160], [444, 168],
] as const;

// Each linked house's hotspot is its own bounding box, as % of the panel.
const pct = (v: number, of: number) => `${r2((v / of) * 100)}%`;
const HOTSPOT = Object.fromEntries(
  HOUSES.filter((h) => h.kind).map((h) => [
    h.kind,
    { left: pct(h.box.x, 720), top: pct(h.box.y, 480), width: pct(h.box.w, 720), height: pct(h.box.h, 480) },
  ])
) as Record<'flat' | 'host', CSSProperties>;

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

        {/* Bremen behind the street, faint and further off (smaller scale): the Dom's
            twin west towers, symmetric about x 650, and the windmill on the Wall. */}
        <g className={styles.far} stroke="#fff" strokeWidth={1.6} fill="var(--casa-ink-deep)" strokeLinejoin="round">
          <path d={`M618 ${GROUND} V180 L630 132 L642 180 V${GROUND} M658 ${GROUND} V180 L670 132 L682 180 V${GROUND} M642 236 L650 226 L658 236`} />
          <path d={`M128 ${GROUND} L134 240 H150 L156 ${GROUND} M132 240 Q142 226 152 240`} />
          <g className={styles.sails} style={vars({ transformOrigin: '142px 234px' })}>
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a} 142 234)`}>
                <line x1={142} y1={234} x2={142} y2={190} />
                <rect x={143} y={192} width={7} height={28} fill="none" />
              </g>
            ))}
          </g>
        </g>

        {/* The street */}
        {HOUSES.map((house, h) => (
          <g key={h} className={styles.house} data-kind={house.kind} style={vars({ '--h': h })}>
            {house.kind ? (
              <ellipse className={styles.spill} cx={r2(house.box.x + house.box.w / 2)} cy={GROUND} rx={r2(house.box.w * 0.75)} ry={40} fill="url(#casa-street-spill)" />
            ) : null}
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
              d={[
                house.outline,
                house.door,
                house.extra,
                house.round && `M${r2(house.round.cx - house.round.r)} ${house.round.cy} a${house.round.r} ${house.round.r} 0 1 0 ${r2(2 * house.round.r)} 0 a${house.round.r} ${house.round.r} 0 1 0 ${r2(-2 * house.round.r)} 0`,
              ]
                .filter(Boolean)
                .join(' ')}
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

        {/* A street tree (8 m) between the bell gable and the host family's house, and a
            6 m street lamp on the pavement in front of the stepped gable. */}
        <g className={styles.prop} stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <line x1={419} y1={GROUND} x2={419} y2={GROUND - 3.6 * M} />
          <circle cx={419} cy={GROUND - 5.8 * M} r={2.2 * M} fill="#1d2a3f" />
          <path d={`M576 ${GROUND} V${GROUND - 6.2 * M} h8`} fill="none" />
          <path d={`M580 ${GROUND - 6.2 * M} h10 l-2 6 h-6 z`} fill="var(--casa-amber)" />
          <path className={styles.lampLight} d={`M585 ${GROUND - 5.6 * M} L568 ${GROUND} H602 Z`} fill="url(#casa-street-lamp)" stroke="none" />
        </g>

        {/* Pavement edge, kerb, the tram's rail */}
        <path className={styles.groundLine} d={`M0 ${GROUND} H720`} stroke="#fff" strokeWidth={2} pathLength={1} strokeDasharray="1 1" />
        <path d={`M0 ${GROUND + 12} H720`} stroke="rgba(255,255,255,0.14)" strokeWidth={1.2} />
        <path d={`M0 ${TRAM.rail} H720`} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />

        {/* A two-section Bremen tram at true scale: 2.8 m tall, 2 × 11 m. */}
        <g className={styles.tram}>
          <g stroke="#fff" strokeWidth={1.6} strokeLinejoin="round">
            <path d={`M55 ${TRAM.top} L49 ${TRAM.top - 7} L61 ${TRAM.top - 12} M47 ${TRAM.top - 12} H63`} fill="none" />
            {[0, TRAM.section + TRAM.joint].map((x0) => (
              <g key={x0}>
                <rect x={x0} y={TRAM.top} width={TRAM.section} height={TRAM.height} rx={5} fill="var(--casa-ink-panel)" />
                <line x1={x0 + 3} y1={TRAM.top + 22} x2={x0 + TRAM.section - 3} y2={TRAM.top + 22} stroke="var(--casa-sun)" strokeWidth={2} />
                {Array.from({ length: 6 }, (_, i) => (
                  <rect key={i} x={x0 + 8 + i * 16} y={TRAM.top + 5} width={12} height={10} rx={1.5} fill="var(--casa-amber)" stroke="none" />
                ))}
                {[20, 30, 80, 90].map((wx) => (
                  <circle key={wx} cx={x0 + wx} cy={TRAM.rail - 3.5} r={3.5} fill="var(--casa-ink-deep)" />
                ))}
              </g>
            ))}
            <path d={`M${TRAM.section} ${TRAM.top + 6} h${TRAM.joint} M${TRAM.section} ${TRAM.top + TRAM.height - 6} h${TRAM.joint}`} fill="none" />
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
          {/* The marker sits on the roof. The host family's label stands beside it, in
              the sky the pitched roof leaves free; the WG's flat roof has no such
              sky beside it (and the windmill stands to its left), so its label
              sits above. Both stay below the caption. */}
          <span aria-hidden="true" className={cn(styles.marker, 'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2')}>
            <span className={styles.bead}>
              <span className={styles.beadCore} />
            </span>
            <span
              className={cn(
                styles.markerLabel,
                'absolute',
                option.id === 'flat'
                  ? 'bottom-full left-1/2 mb-2 -translate-x-1/2 text-center'
                  : 'left-full top-1/2 ml-2.5 -translate-y-1/2 text-left'
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
