'use client';

import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import styles from './bremen-musicians-hero.module.css';
import glowStyles from './hero-glow.module.css';
import { useHeroGlow } from './use-hero-glow';

/**
 * The Bremen Town Musicians, the hero picture of the group page (Ina's idea,
 * 2026-10-09): the four group packages are named after them, and in the
 * monument they stand on each other's backs — Esel at the bottom, then Hund,
 * Katze and Hahn. A sister of the income ring, the street, the staircase and
 * the telc seals: flat line art on the night hero, the warm light following the
 * pointer across the whole hero.
 *
 * Motion: the donkey walks in, head first, and stops; the dog leaps onto its back, the cat
 * onto the dog, and the rooster flies up onto the cat; each package's label
 * arrives as its animal lands, and the stack below dips a little under its
 * weight; then all four sing once, as the musicians did at the robbers'
 * window. Afterwards they stay quietly alive: now and then the donkey twitches
 * an ear, the dog wags, the cat flicks its tail, the rooster's tail sways.
 * Under prefers-reduced-motion the stack renders finished and still.
 *
 * Each animal is its package: its label names the package (the animal and the
 * package's descriptor, the same words as the card below). Hovering or
 * focusing it lights the animal in the sun's yellow; it says its line (I-aah,
 * Wau, Miau, Kikeriki), sings, and moves — the donkey's ear, the dog's tail,
 * the cat's tail, the rooster's wing — and a click opens that package's dialog
 * in the section below. The labels are the
 * links, so a keyboard reaches all four; the drawing answers the pointer too.
 *
 * The animals are drawn facing left, towards the headline, in a 580 × 410 box
 * (viewBox origin 40,80), standing on a ground line at y 470. Body paths are
 * closed; the near legs are open paths drawn after the body, so their fill
 * covers the belly line where they join and only their edges are stroked; the
 * far legs are dimmer and sit behind. Strokes do not scale (CSS), so the line
 * weights match the other coded heroes at every size.
 */
export type MusicianSlug = 'esel' | 'hund' | 'katze' | 'hahn';

export type MusicianPackage = {
  slug: MusicianSlug;
  /** The animal's name: "Hahn". */
  animal: string;
  /** The package's descriptor, as on its card: "1 Woche Entdecken". */
  descriptor: string;
  /** What the animal says when it is chosen: "Kikeriki!". */
  voice: string;
};

type BremenMusiciansHeroProps = {
  packages: readonly MusicianPackage[];
  /** Names the whole picture for assistive tech. */
  label: string;
  className?: string;
};

const VB_X = 40;
const VB_Y = 80;
const W = 580;
const H = 410;
const GROUND = 470;

const pct = (v: number, origin: number, size: number) => `${((v - origin) / size) * 100}%`;
const vars = (v: Record<string, string | number>) => v as CSSProperties;

/*
 * Where each package's label sits (its vertical centre, evenly spaced from the
 * top of the stack to the donkey) and the point on its animal its leader line
 * starts from. Labels begin at LABEL_X.
 */
const LABEL_X = 392;
const LAYOUT: Record<MusicianSlug, { row: number; anchor: [number, number]; mouth: [number, number]; voice: [number, number] }> = {
  hahn: { row: 140, anchor: [342, 145], mouth: [236, 128], voice: [226, 104] },
  katze: { row: 210, anchor: [308, 222], mouth: [231, 202], voice: [222, 188] },
  hund: { row: 280, anchor: [320, 258], mouth: [180, 229], voice: [212, 194] },
  esel: { row: 350, anchor: [371, 342], mouth: [86, 309], voice: [118, 244] },
};

const ORDER: MusicianSlug[] = ['esel', 'hund', 'katze', 'hahn'];

const STARS: [number, number][] = [
  [170, 120], [214, 98], [300, 100], [404, 98], [476, 104], [560, 94], [606, 186], [70, 210], [608, 300], [362, 90],
];

/** Two notes rising from a mouth, up and away to the left: the animal sings. */
function Notes({ at, className, style }: { at: [number, number]; className?: string; style?: CSSProperties }) {
  const [x, y] = at;
  const note = (nx: number, ny: number, s: number) => (
    <g transform={`translate(${nx} ${ny}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={3.4} ry={2.5} transform="rotate(-22)" fill="var(--casa-sun)" />
      <path d="M3 -1 V-13 C7 -11 9 -8 7 -4" fill="none" stroke="var(--casa-sun)" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
  return (
    <g className={className} style={style}>
      {note(x - 12, y - 8, 1)}
      {note(x - 26, y - 22, 0.82)}
    </g>
  );
}

/* --- the animals --- */

function Esel() {
  const frontLeg =
    'M204 352 C204 372,202 392,202 412 C202 420,200 426,200 434 C200 446,200 454,199 460 C198 464,196 467,195 470 L210 470 C210 466,210 462,211 458 C212 448,212 438,212 430 C213 422,214 418,216 410 C220 394,226 378,228 362';
  const hindLeg =
    'M320 364 C324 382,330 400,332 414 C334 424,334 440,334 458 C334 462,333 466,332 470 L347 470 C347 466,347 462,347 458 C347 444,348 432,350 424 C354 418,356 410,356 400 C358 388,360 372,358 356';
  return (
    <>
      <g className={cn(styles.stride, styles.strideB)} style={vars({ '--ox': '236px', '--oy': '350px' })}>
        <path className={styles.far} transform="translate(22 -3)" d={`${frontLeg} Z`} />
      </g>
      <g className={cn(styles.stride, styles.strideA)} style={vars({ '--ox': '318px', '--oy': '356px' })}>
        <path className={styles.far} transform="translate(-20 -3)" d={`${hindLeg} Z`} />
      </g>
      <path className={styles.far} d="M138 252 C134 230,134 204,140 186 C143 180,148 182,148 190 C147 210,148 232,150 250 Z" />
      <path className={styles.line} d="M352 306 C362 318,368 340,366 372" />
      <path className={styles.o} d="M362 370 C356 382,358 394,365 400 C372 393,373 382,368 370 Z" />
      <g className={styles.earTwitch}>
        <path className={styles.o} d="M146 254 C148 226,156 200,166 182 C170 176,176 178,175 186 C172 206,166 230,162 256 Z" />
        <path className={styles.inner} d="M153 250 C155 228,160 208,168 192 C169 200,165 224,159 252 Z" />
      </g>
      <path
        className={styles.o}
        d="M214 298 C236 300,256 304,276 303 C298 302,318 294,336 296 C350 297,358 306,361 320 C364 334,360 348,350 358 C344 363,336 366,326 367 C300 371,262 372,238 368 C224 365,212 360,204 351 C196 342,190 332,186 320 C180 308,172 298,160 290 C154 286,150 285,147 286 C144 296,136 308,124 314 C114 320,102 322,94 318 C86 314,82 304,86 294 C92 282,112 266,128 254 C136 248,144 244,152 244 C172 250,196 276,214 298 Z"
      />
      <g className={cn(styles.stride, styles.strideA)} style={vars({ '--ox': '214px', '--oy': '350px' })}>
        <path className={styles.leg} d={frontLeg} />
      </g>
      <g className={cn(styles.stride, styles.strideB)} style={vars({ '--ox': '338px', '--oy': '356px' })}>
        <path className={styles.leg} d={hindLeg} />
      </g>
      {/* A donkey's pale muzzle and eye ring, inset from the outline so it stays whole. */}
      <path className={styles.pale} d="M107 314 C103 316,98 317,95 316 C88 312,85 304,88 295 C92 288,99 280,105 275 C100 288,102 302,107 314 Z" />
      <circle className={styles.pale} cx={131} cy={265} r={5.6} />
      <path className={cn(styles.d, styles.mane)} d="M152 238 C174 244,200 272,220 294" />
      <circle className={styles.eye} cx={131} cy={265} r={2.6} />
      <path className={styles.d} d="M125 260 q6 -5 12 0" />
      <path className={styles.d} d="M106 272 C100 286,102 302,108 316" />
      {/* Hooves. */}
      <path className={styles.d} d="M197 463 H211 M333 463 H347" />
      <path className={styles.d} d="M89 294 q3 -1 4 3" />
      <path className={styles.d} d="M90 310 q8 3 16 0" />
    </>
  );
}

function Hund() {
  const frontLeg = 'M232 264 C233 276,234 288,233 295 C233 298,232 300,231 301 L241 301 C241 298,241 296,241 293 C242 284,244 274,246 266';
  const hindLeg = 'M298 264 C304 274,308 282,305 290 C304 295,302 299,301 301 L311 301 C312 296,314 291,314 286 C316 278,318 270,316 262';
  return (
    <>
      <path className={styles.far} transform="translate(12 -1)" d={`${frontLeg} Z`} />
      <path className={styles.far} transform="translate(-11 -1)" d={`${hindLeg} Z`} />
      <g className={styles.wag}>
        <path className={styles.o} d="M315 247 C325 240,331 228,330 212 C335 222,336 238,320 252 Z" />
      </g>
      <path
        className={styles.o}
        d="M242 240 C262 236,286 238,302 242 C312 244,318 250,318 258 C318 264,314 268,308 268 C298 266,288 260,276 262 C262 266,248 270,238 268 C230 266,226 258,226 250 C224 242,220 236,214 230 C208 232,200 234,192 234 C186 234,182 231,182 227 C182 223,186 221,192 220 C198 219,204 216,207 212 C210 206,218 202,226 203 C234 206,238 222,242 240 Z"
      />
      <path className={styles.leg} d={frontLeg} />
      <path className={styles.leg} d={hindLeg} />
      <path className={styles.o} d="M220 207 C230 205,236 213,235 227 C234 233,228 233,226 228 C223 221,220 213,220 207 Z" />
      <circle className={styles.eye} cx={210} cy={214} r={2.2} />
      <circle className={styles.eye} cx={185} cy={224} r={2.6} />
      <path className={styles.d} d="M186 231 q8 1 14 -2" />
      <path className={styles.d} d="M229 250 q-3 5 -1 10 M233 256 q-2 4 0 8" />
    </>
  );
}

function Katze() {
  const frontLeg = 'M257 232 C258 237,258 241,257 245 L264 245 C264 241,264 237,265 233';
  const hindLeg = 'M296 234 C298 238,299 242,298 245 L305 245 C306 241,306 237,306 232';
  return (
    <>
      <path className={styles.far} transform="translate(8 -1)" d={`${frontLeg} Z`} />
      <path className={styles.far} transform="translate(-8 -1)" d={`${hindLeg} Z`} />
      <g className={styles.flick}>
        <path className={styles.o} d="M302 220 C314 214,319 202,314 190 C311 184,305 184,305 189 C309 192,312 200,309 207 C307 213,304 218,300 225 Z" />
      </g>
      <path
        className={styles.o}
        d="M266 216 C276 211,292 211,300 216 C306 220,308 228,305 233 C300 236,292 235,284 234 C274 234,266 236,260 234 C254 232,252 226,254 220 C256 216,260 215,266 216 Z"
      />
      <path className={styles.leg} d={frontLeg} />
      <path className={styles.leg} d={hindLeg} />
      <path
        className={styles.o}
        d="M263 208 C264 200,262 194,259 186 L254 195 C252 194,249 194,247 195 L244 186 C241 192,240 197,240 200 C237 202,234 205,234 208 C235 211,237 213,240 214 C244 218,252 220,258 217 C261 215,263 212,263 208 Z"
      />
      <circle className={styles.eye} cx={244} cy={203} r={1.8} />
      <path className={styles.d} d="M235 209 L224 206 M235 211 L225 213" />
      <path className={styles.d} d="M276 213 q2 5 0 9 M284 212 q2 5 0 9 M292 214 q2 4 0 8 M294 232 C292 226,296 220,302 222" />
    </>
  );
}

function Hahn() {
  return (
    <>
      <g className={styles.sway}>
        <path className={styles.o} d="M296 170 C302 148,318 128,338 126 C330 134,316 150,302 174 Z" />
        <path className={styles.o} d="M298 174 C310 156,328 148,342 150 C332 156,316 166,301 178 Z" />
        <path className={styles.o} d="M299 179 C312 170,326 168,338 172 C326 175,312 179,300 183 Z" />
      </g>
      <path className={styles.line} d="M272 194 L271 212 M282 195 L284 211 M265 212 L277 212 M279 211 L290 211" />
      <path
        className={styles.o}
        d="M260 131 C258 127,252 126,249 129 C247 131,247 133,246 134 L237 130 L246 137 L238 141 L247 140 C245 143,245 148,248 151 C251 153,253 149,252 145 C254 152,256 162,257 170 C258 182,264 192,276 195 C286 197,294 192,298 184 C300 178,300 174,298 170 C290 166,280 166,272 162 C266 158,263 150,263 142 C263 137,262 133,260 131 Z"
      />
      <path className={styles.comb} d="M249 129 C247 123,250 120,252 124 C252 118,256 117,257 122 C258 117,262 118,261 124 C262 125,262 128,260 131 Z" />
      <path className={styles.comb} d="M247.5 142 C245 146,246 151,249 152 C251.5 151,252 147,250.5 143 Z" />
      <path className={styles.d} d="M262 146 q4 8 2 16 M258 151 q3 8 1 15" />
      <g className={styles.wing}>
        <g className={styles.flap}>
          <path className={styles.o} d="M266 170 C274 162,290 160,298 168 C296 178,286 186,272 186 C266 182,264 176,266 170 Z" />
          <path className={styles.d} d="M272 178 C280 176,288 176,294 172 M274 183 C282 182,288 180,292 177" />
        </g>
      </g>
      <circle className={styles.eye} cx={254} cy={134} r={1.8} />
    </>
  );
}

const DRAWINGS: Record<MusicianSlug, () => ReactNode> = { esel: Esel, hund: Hund, katze: Katze, hahn: Hahn };

/*
 * How each animal arrives, as offsets the entrance animates away. They all
 * face left, so they all travel left, head first: the donkey walks in from the
 * right; the dog and the cat leap from the ground to the right of the donkey
 * (dy is their height above the ground); the rooster flies in from the sky.
 * `settled` is when the animal stands still, and its label arrives then: the
 * donkey walks through where its label goes, so its label waits for it.
 * The cat and the rooster sit 5 units higher than drawn, on the dog's back.
 */
const ENTRANCE: Record<MusicianSlug, { dx: number; dy: number; lift: number; delay: number; settled: number }> = {
  esel: { dx: 170, dy: 0, lift: 0, delay: 0.3, settled: 1.95 },
  hund: { dx: 150, dy: GROUND - 301, lift: 32, delay: 2.05, settled: 2.75 },
  katze: { dx: 140, dy: GROUND - 240, lift: 30, delay: 2.85, settled: 3.55 },
  hahn: { dx: 150, dy: -90, lift: 0, delay: 3.6, settled: 4.3 },
};

/** Opens the package's dialog in the section below: its card's own button. */
function openPackage(slug: MusicianSlug) {
  const trigger = document.querySelector<HTMLButtonElement>(`#${slug} button`);
  if (!trigger) return false;
  trigger.click();
  return true;
}

export function BremenMusiciansHero({ packages, label, className }: BremenMusiciansHeroProps) {
  const [active, setActive] = useState<MusicianSlug | null>(null);
  const glow = useRef<HTMLDivElement>(null);
  useHeroGlow(glow);

  const bySlug = new Map(packages.map((item) => [item.slug, item]));
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
        // No box of its own: the musicians stand on the night hero's ground.
        // Width capped by the hero's viewport rule (HeroSurface) at this shape, so the drawing never pushes the hero past the screen and the labels stay aligned.
        'relative text-white [--ar:580/410] mx-auto aspect-[var(--ar)] w-[min(100%,calc(var(--hero-media-max-h)*var(--ar)))]',
        className
      )}
      data-active={active ?? undefined}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      <svg viewBox={`${VB_X} ${VB_Y} ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="casa-musicians-ground" gradientUnits="userSpaceOnUse" x1={56} y1={0} x2={440} y2={0}>
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="16%" stopColor="#fff" stopOpacity="1" />
            <stop offset="84%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="casa-musicians-moon">
            <stop offset="0%" stopColor="var(--casa-sun)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--casa-sun)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className={styles.sky}>
          {STARS.map(([x, y], i) => (
            <circle key={i} className={styles.star} style={vars({ '--s': i })} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="#fff" />
          ))}
          <circle cx={98} cy={128} r={46} fill="url(#casa-musicians-moon)" />
          <circle cx={98} cy={128} r={13} fill="#fdf6d8" />
        </g>

        {/* The ground, drawn out from under the stack in both directions. */}
        <g stroke="url(#casa-musicians-ground)">
          <path className={styles.ground} d={`M248 ${GROUND} H56`} pathLength={1} />
          <path className={styles.ground} d={`M248 ${GROUND} H440`} pathLength={1} />
        </g>

        {/* Leader lines from each animal to its label. */}
        {ORDER.map((slug) => {
          const { row, anchor } = LAYOUT[slug];
          return (
            <g key={slug} className={styles.leader} data-on={active === slug || undefined} style={vars({ '--t': `${ENTRANCE[slug].settled + 0.05}s` })}>
              <path d={`M${anchor[0]} ${anchor[1]} L${LABEL_X - 6} ${row}`} pathLength={1} />
              <circle cx={anchor[0]} cy={anchor[1]} r={2.2} />
            </g>
          );
        })}

        {ORDER.map((slug) => {
          const Drawing = DRAWINGS[slug];
          const e = ENTRANCE[slug];
          const raised = slug === 'katze' || slug === 'hahn';
          return (
            <g
              key={slug}
              className={styles.animal}
              data-on={active === slug || undefined}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setActive(slug);
              }}
              onClick={() => openPackage(slug)}
            >
              <g transform={raised ? 'translate(0 -5)' : undefined}>
                <g
                  className={cn(styles.enter, styles[slug])}
                  style={vars({ '--dx': `${e.dx}px`, '--dy': `${e.dy}px`, '--lift': `${e.lift}px`, '--d': `${e.delay}s` })}
                >
                  <g className={styles.rise}>
                    <g className={styles.land}>
                      <g className={styles.carry}>
                        <Drawing />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          );
        })}

        {/* The animals sing, all four once at the end of the entrance; the chosen
            one says its line. */}
        {ORDER.map((slug, i) => (
          <Notes key={`c-${slug}`} at={LAYOUT[slug].mouth} className={styles.chorus} style={vars({ '--c': i })} />
        ))}
        {ORDER.map((slug) => {
          const voice = bySlug.get(slug)?.voice;
          if (!voice) return null;
          const [x, y] = LAYOUT[slug].voice;
          return (
            <text key={`v-${slug}`} className={cn(styles.voice, active === slug && styles.speaking)} x={x} y={y} textAnchor="end">
              {voice}
            </text>
          );
        })}
      </svg>

      {ORDER.map((slug) => {
        const item = bySlug.get(slug);
        if (!item) return null;
        return (
          <a
            key={slug}
            href={`#${slug}`}
            aria-label={`${item.animal}: ${item.descriptor}`}
            onClick={(event) => {
              if (openPackage(slug)) event.preventDefault();
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setActive(slug);
            }}
            onFocus={() => setActive(slug)}
            onBlur={() => setActive(null)}
            className={cn(styles.label, 'absolute -translate-y-1/2 focus-visible:outline-none')}
            style={{ left: pct(LABEL_X, VB_X, W), top: pct(LAYOUT[slug].row, VB_Y, H), ...vars({ '--t': `${ENTRANCE[slug].settled}s` }) }}
            data-on={active === slug || undefined}
          >
            <span className={styles.labelName}>{item.animal}</span>
            <span className={styles.labelDesc}>{item.descriptor}</span>
          </a>
        );
      })}
    </figure>
  );
}
