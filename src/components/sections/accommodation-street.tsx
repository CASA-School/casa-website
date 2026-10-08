'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import styles from './accommodation-street.module.css';
import glowStyles from './hero-glow.module.css';
import { useHeroGlow } from './use-hero-glow';

/**
 * A Bremen street at dusk, drawn in the line style of the CASA film — the
 * hero picture of /accommodation, the sister of the non-profit page's income
 * ring (nonprofit-income-ring.tsx) and built the same way.
 *
 * Left to right: a stepped-gable merchant house, the Mühle am Wall on its
 * bastion in a gap of the street, the CASA shared flat (the modern block), a
 * Weser Renaissance scroll gable, a street tree, a pair of Bremer Häuser (the
 * left one is the host family's), a street lamp, a second stepped gable and a
 * timber-framed house. The Dom's west towers stand behind the right-hand end.
 * Two buildings are the page's two options; each is a link to its detail page.
 * Hovering or focusing one lights it fully, the rest of the street steps back,
 * and a caption gives that option's published summary. The warm light follows
 * the pointer across the whole hero (use-hero-glow.ts); the street has no box
 * of its own on the night hero.
 *
 * Contextual, not an availability claim (CLAUDE.md hard rule 5): it shows the
 * kind of home, never a particular room.
 *
 * Motion: on load the street draws itself in one line, its structure and the
 * windows come in house by house, the markers pulse once to show they can be
 * pressed, the mill starts turning from rest, then the tram crosses and a few
 * windows go on and off now and then. Under prefers-reduced-motion everything
 * renders finished and still — the sails at rest in an X, the tram parked; the
 * links still work.
 *
 * The drawing follows docs/CODED_HERO_ILLUSTRATION_GUIDE.md: sources [Sn] and
 * the ASSUMPTION tags below refer to it.
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
 * A landmark further off keeps its own uniform scale (K_WALL, K_DOM) and every
 * dimension it has is written as metres × k.
 *
 * - Gable houses: ground floor 3.2 m, upper floors 3.0 m, eaves at 9.2 m
 *   (y 300). Historic windows stand at 1.0 × 1.8 m, sill 0.9 m, with a mullion
 *   and a transom at ⅓ [S20][S23][S24]; doors share the window heads. The
 *   modern block keeps 1.6 × 1.6 m single panes.
 * - Every gable is built on the same 55° envelope. A stepped gable's inner
 *   step corners lie on it, and each scroll-gable stage meets it where its
 *   volute runs into the wall, so the gable always hides the roof [S30].
 * - Symmetric parts are built from one half and mirrored about their axis.
 * - Four stroke tiers [S32][S33]: ground 2.4, contour 2.0, structure 1.25,
 *   material 0.75 at half strength; the far landmarks thinner again.
 *
 * Every emitted coordinate goes through r2(), so server and browser render the
 * same strings (a hydration mismatch otherwise, see nonprofit-income-ring.tsx).
 */
const M = 10;
const GROUND = 392;
const STOREY_GROUND = 3.2 * M;
const STOREY = 3.0 * M;
const PITCH = Math.tan((55 * Math.PI) / 180);
const EAVE = GROUND - STOREY_GROUND - 2 * STOREY; // 300: one eaves line along the street
const WIN = { w: 1.0 * M, h: 1.8 * M, sill: 0.9 * M };
const DOOR = { w: 1.1 * M, h: 2.7 * M }; // head on the window heads, fanlight at 2.2 m
const r2 = (n: number) => Math.round(n * 100) / 100;

/** A path string whose every number is rounded: d`M${x} ${y}`. */
const d = (parts: TemplateStringsArray, ...values: number[]) =>
  parts.reduce((out, part, i) => out + part + (i < values.length ? String(r2(values[i])) : ''), '');
const rect = (x: number, y: number, w: number, h: number) => d`M${x} ${y} h${w} v${h} h${-w} Z`;
const circle = (cx: number, cy: number, r: number) => d`M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

type Box = { x: number; y: number; w: number; h: number };
type Win = Box & { shape?: 'round'; bars?: boolean; dark?: boolean };
type House = {
  id: string;
  /** Left-to-right position: the entrance timing. */
  order: number;
  kind?: 'flat' | 'host';
  fill: string;
  /** T1 contour and door openings, drawn in on load. */
  outline: string;
  /** T2: cornices, bands, stage lines, timber members, stair cheeks. */
  detail?: string;
  /** T3: nosings, beam ends, course hints. */
  texture?: string;
  /** Small solids, outlined a little finer than T2 (obelisks, curls, a finial's ball). */
  ornament?: string;
  windows: Win[];
  /** The hotspot of a linked house, in viewBox units. */
  box?: Box;
};

/** The y of the floor under storey k of a gable house (0 = ground floor). */
const floorAt = (k: number) => (k === 0 ? GROUND : GROUND - STOREY_GROUND - (k - 1) * STOREY);

/** Historic windows on the bay axes of a facade, the door bay left out at the ground. */
function facadeWindows(x: number, w: number, bays: number, storeys: number, doorBay: number): Win[] {
  const out: Win[] = [];
  const bay = w / bays;
  for (let k = 0; k < storeys; k++) {
    for (let b = 0; b < bays; b++) {
      if (k === 0 && b === doorBay) continue;
      out.push({ x: x + (b + 0.5) * bay - WIN.w / 2, y: floorAt(k) - WIN.sill - WIN.h, w: WIN.w, h: WIN.h, bars: true });
    }
  }
  return out;
}

/** A plain door opening with its fanlight transom, on a bay axis. */
function historicDoor(axis: number) {
  const x = axis - DOOR.w / 2;
  const top = GROUND - DOOR.h;
  return {
    outline: d`M${x} ${GROUND} V${top} H${x + DOOR.w} V${GROUND}`,
    texture: d`M${x} ${top + 0.5 * M} H${x + DOOR.w}`,
  };
}

/*
 * Stepped gable (Treppengiebel), houses 1 and 8: three steps a side and a cap
 * of 0.2 w; each step's inner corner on the 55° line. The gable holds the loft
 * floors of a Bremen merchant house: a row of loft windows, and a hoist door
 * on the axis above (guide §3.4).
 */
type Loft = { winW: number; winH: number; hatchW: number; hatchH: number; hatchFloor: number; beam?: number };
function steppedGable(id: string, order: number, x: number, w: number, doorBay: number, loft: Loft): House {
  const bays = 2;
  const half = w / 2;
  const cx = x + half;
  const steps = 3;
  const capW = w * 0.2;
  const tread = (half - capW / 2) / steps;
  const riser = tread * PITCH;

  let path = d`M${x} ${GROUND} V${EAVE}`;
  let px = x;
  let py = EAVE;
  for (let i = 0; i < steps; i++) {
    py -= riser;
    path += d` V${py}`;
    px += tread;
    path += d` H${px}`;
  }
  py -= riser;
  const top = py;
  path += d` V${top} H${px + capW}`;
  px += capW;
  for (let i = 0; i < steps; i++) {
    py += riser;
    path += d` V${py}`;
    px += tread;
    path += d` H${px}`;
  }
  path += d` V${GROUND}`;

  const bay = w / bays;
  const door = historicDoor(x + (doorBay + 0.5) * bay);
  const windows = facadeWindows(x, w, bays, 3, doorBay);
  // Loft row 1: one window per bay axis, sill 0.6 m above the loft floor (the eaves).
  for (let b = 0; b < bays; b++) {
    windows.push({ x: x + (b + 0.5) * bay - loft.winW / 2, y: EAVE - 0.6 * M - loft.winH, w: loft.winW, h: loft.winH, bars: true });
  }
  // Loft row 2: the hoist door on the axis, dark (a store, not a room).
  const hatch = { x: cx - loft.hatchW / 2, y: EAVE - loft.hatchFloor - loft.hatchH, w: loft.hatchW, h: loft.hatchH };
  windows.push({ ...hatch, dark: true });
  let detail = rect(hatch.x, hatch.y, hatch.w, hatch.h) + d` M${cx} ${hatch.y} V${hatch.y + hatch.h}`;
  if (loft.beam !== undefined) {
    // The hoist beam seen end-on, with its hook (general knowledge for Hanseatic merchant houses).
    const by = EAVE - loft.beam;
    detail += ' ' + rect(cx - 1.5, by - 1.5, 3, 3) + d` M${cx} ${by + 1.5} v${4}`;
  }

  return {
    id,
    order,
    fill: `${path} Z`,
    outline: `${path} ${door.outline}`,
    detail,
    texture: door.texture,
    windows,
  };
}

/*
 * Weser Renaissance scroll gable (Volutengiebel), house 4 (guide §3.5): a stack
 * of gable storeys divided by projecting cornices [S25][S26], each narrower than
 * the one below. Beside each stage a volute rises from the cornice end and runs
 * into the stage wall; above it the wall's pilastered edge goes on up to the
 * next cornice; an obelisk stands on every cornice end [S29]; double pilasters
 * frame the first stage [S26]; the semicircular head, the welsche Giebel's top
 * [S28], carries a shell and a finial.
 *
 * The stage heights are the guide's (2.2 m and 1.6 m). The widths differ from
 * its table on purpose: there each stage's corner sat at the stage top, so the
 * volute had to fill the whole notch and both stages ran together into one
 * dome-like curve. Here the corner on the 55° envelope is where the volute
 * meets the wall (ASSUMPTION: 70% up the stage), so the wall edge shows above
 * the scroll and the gable still hides the roof [S30]; the head may rise a
 * little above the envelope, as a gable screen does [S29].
 */
function voluteGable(id: string, order: number): House {
  const x = 336;
  const w = 6.4 * M;
  const cx = x + w / 2; // 368
  const envelopeHalf = (yy: number) => w / 2 - (EAVE - yy) / PITCH; // the 55° envelope's half-width at height y
  const band = 0.25 * M; // cornice depth. ASSUMPTION
  const proud = 0.3 * M; // cornice projection beyond the wall below. ASSUMPTION
  const plinth = { w: 0.4 * M, h: 0.3 * M }; // ASSUMPTION: obelisk 0.4 × 1.4 m incl. a 0.3 m plinth
  const obeliskH = 1.4 * M;
  const gap = 0.05 * M; // between an obelisk's plinth and the volute's foot
  const meet = 0.7;

  type P = { x: number; y: number };
  type Seg = { to: P; c1?: P; c2?: P };

  // The main cornice on the facade, then the two stages and their cornices.
  const main = { wall: x, under: EAVE, top: EAVE - band };
  const stageTops = [EAVE - 2.2 * M, EAVE - 3.8 * M]; // 278, 262
  const stages: { base: number; top: number; meetY: number; wall: number; foot: P; obelisk: number }[] = [];
  let below = main;
  for (const top of stageTops) {
    const base = below.top;
    const meetY = base - meet * (base - top);
    const wall = cx - envelopeHalf(meetY);
    stages.push({ base, top, meetY, wall, foot: { x: below.wall + plinth.w / 2 + gap, y: base }, obelisk: below.wall });
    below = { wall, under: top, top: top - band };
  }
  const cornices = [main, ...stages.map((st) => ({ wall: st.wall, under: st.top, top: st.top - band }))];
  const headBase = cornices[2].top; // 259.5
  const crownR = cx - stages[1].wall; // the head as wide as the top stage

  /*
   * A volute from its foot F (on a cornice, beside the obelisk) up and in to H,
   * where it runs into the stage wall, by the guide's rule:
   * C (F.x, F.y − 0.55h) (H.x − 0.45t, H.y) H, its curl tangent inside the foot,
   * r = 0.12 · min(t, h).
   */
  const vols = stages.map((st) => {
    const f = st.foot;
    const h = { x: st.wall, y: st.meetY };
    const t = h.x - f.x;
    const v = f.y - h.y;
    return { to: h, c1: { x: f.x, y: f.y - 0.55 * v }, c2: { x: h.x - 0.45 * t, y: h.y }, curl: 0.12 * Math.min(t, v), f };
  });

  // The left half from the ground to the head's foot; the right half is its mirror.
  const start = { x, y: GROUND };
  const left: Seg[] = [{ to: { x, y: EAVE } }];
  for (let k = 0; k < 3; k++) {
    const c = cornices[k];
    left.push({ to: { x: c.wall - proud, y: c.under } }, { to: { x: c.wall - proud, y: c.top } });
    if (k < 2) left.push({ to: vols[k].f }, vols[k], { to: { x: stages[k].wall, y: stages[k].top } });
  }
  left.push({ to: { x: cx - crownR, y: headBase } });

  const mx = (p: P) => ({ x: 2 * cx - p.x, y: p.y });
  const seg = (sg: Seg) => (sg.c1 && sg.c2 ? d` C${sg.c1.x} ${sg.c1.y} ${sg.c2.x} ${sg.c2.y} ${sg.to.x} ${sg.to.y}` : d` L${sg.to.x} ${sg.to.y}`);
  let path = d`M${start.x} ${start.y}` + left.map(seg).join('');
  path += d` A${crownR} ${crownR} 0 0 1 ${cx + crownR} ${headBase}`;
  // Back down the mirror: each segment reversed (controls swapped) and reflected.
  const points = [start, ...left.map((sg) => sg.to)];
  for (let i = left.length - 1; i >= 0; i--) {
    const sg = left[i];
    path += sg.c1 && sg.c2 ? seg({ to: mx(points[i]), c1: mx(sg.c2), c2: mx(sg.c1) }) : seg({ to: mx(points[i]) });
  }

  const sym = (fn: (sx: (v: number) => number) => string) => fn((v) => v) + ' ' + fn((v) => 2 * cx - v);
  const crownTop = headBase - crownR;

  /*
   * T2: each cornice as a band (top and underside), double pilasters on stage 1,
   * the finial's rod. The pilaster pair stands 0.3 and 0.6 m inside the wall
   * edge, 3 u apart (guide §3.5): any closer and the outer one's 1.25 stroke
   * runs into the 2.0 contour, so the pair reads as one thick edge and a line.
   */
  const s1 = stages[0];
  const pilaster = [0.3 * M, 0.6 * M];
  const detail = [
    ...cornices.map((c) => d`M${c.wall - proud} ${c.top} H${2 * cx - c.wall + proud} M${c.wall} ${c.under} H${2 * cx - c.wall}`),
    sym((sx) => pilaster.map((o) => d`M${sx(s1.wall + o)} ${s1.base} V${s1.top}`).join(' ')),
    d`M${cx} ${crownTop} V${crownTop - 1.0 * M}`,
  ].join(' ');
  // T3: the shell in the head, seven ribs.
  const texture = [22.5, 45, 67.5, 90, 112.5, 135, 157.5]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const r0 = 0.15 * crownR;
      const r1 = crownR - 1.6;
      return d`M${cx + r0 * Math.cos(a)} ${headBase - r0 * Math.sin(a)} L${cx + r1 * Math.cos(a)} ${headBase - r1 * Math.sin(a)}`;
    })
    .join(' ');

  // Obelisks on the four cornice ends, the volutes' curls, the finial's ball.
  const obelisk = (ox: number, oy: number) =>
    rect(ox - plinth.w / 2, oy - plinth.h, plinth.w, plinth.h) + d` M${ox - 1.5} ${oy - plinth.h} L${ox} ${oy - obeliskH} L${ox + 1.5} ${oy - plinth.h} Z`;
  const ornament = [
    ...stages.map((st) => sym((sx) => obelisk(sx(st.obelisk), st.base))),
    ...vols.map((v) => sym((sx) => circle(sx(v.f.x + v.curl), v.f.y - v.curl, v.curl))),
    circle(cx, crownTop - 0.75 * M, 1.1),
  ].join(' ');

  // Ground floor: a round-arched door, 1.2 × 2.6 m, after the Stadtwaage's gates [S26].
  const doorAxis = x + 1.5 * (w / 2);
  const dw = 1.2 * M;
  const arch = GROUND - 2.6 * M + dw / 2;
  const door = d`M${doorAxis - dw / 2} ${GROUND} V${arch} A${dw / 2} ${dw / 2} 0 0 1 ${doorAxis + dw / 2} ${arch} V${GROUND}`;

  const windows = facadeWindows(x, w, 2, 3, 1);
  windows.push({ x: cx - 0.45 * M, y: s1.base - 0.3 * M - 1.4 * M, w: 0.9 * M, h: 1.4 * M, bars: true });
  const oculus = 0.4 * M;
  windows.push({ x: cx - oculus, y: (stages[1].base + stages[1].top) / 2 - oculus, w: 2 * oculus, h: 2 * oculus, shape: 'round' });

  return { id, order, fill: `${path} Z`, outline: `${path} ${door}`, detail, texture, ornament, windows };
}

/*
 * A pair of Bremer Häuser, house 5 (guide §3.6, [S19]): eaves to the street, a
 * low roof of about 27°, a raised ground floor (Hochparterre) over a Souterrain,
 * reached by an outside stair; three axes each, mirrored about the party wall.
 * The left one is the host family's house, and it alone is the link.
 */
function bremerPair(): [House, House] {
  const x0 = 446;
  const w = 6.0 * M; // ASSUMPTION: 3 axes of 2.0 m
  const wall = x0 + w; // 506, the party wall and the mirror axis
  const hp = GROUND - 1.4 * M; // 378: Souterrain floor at −1.2 m, a 2.6 m Souterrain storey (ASSUMPTION)
  const f1 = hp - 3.6 * M; // 342 [S20][S21]
  const eaves = f1 - 3.6 * M; // 306
  const cornice = eaves - 0.6 * M; // 300, the gable houses' eaves line
  const ridge = cornice - 5 * M * Math.tan((27 * Math.PI) / 180); // 274.52: 27° [S19], depth 10 m (ASSUMPTION)
  const over = 0.3 * M; // the cornice's overhang at the ends

  const hpWin = { w: 1.0 * M, h: 2.0 * M, sill: 0.85 * M }; // 1 : 2, sill 85 cm [S20]
  const souterrain = { w: 1.0 * M, h: 0.8 * M, sill: 0.2 * M };
  const door = { w: 1.1 * M, h: 2.9 * M, fan: 0.5 * M };
  const stair = { risers: 8, rise: 0.175 * M, width: 1.3 * M }; // 8 × 17.5 cm = 1.4 m, going 28 cm (2s + a = 63 cm, DIN 18065 [S38])

  const half = (side: 1 | -1) => {
    // side 1: the left house (axes left of the wall); -1: its mirror.
    const sx = (v: number) => (side === 1 ? v : 2 * wall - v);
    const axes = [x0 + 1.0 * M, x0 + 3.0 * M].map(sx); // the large room's two windows [S19]
    const doorAxis = sx(x0 + 5.0 * M); // the entrance beside the party wall
    const windows: Win[] = [];
    const hoods: string[] = [];
    for (const a of axes) {
      windows.push({ x: a - souterrain.w / 2, y: GROUND - souterrain.sill - souterrain.h, w: souterrain.w, h: souterrain.h });
      for (const floor of [hp, f1]) {
        const top = floor - hpWin.sill - hpWin.h;
        windows.push({ x: a - hpWin.w / 2, y: top, w: hpWin.w, h: hpWin.h, bars: true });
        // A cornice hood over each window, 0.2 m wider each side (ASSUMPTION: the usual stucco Verdachung).
        hoods.push(d`M${a - hpWin.w / 2 - 2} ${top - 2} H${a + hpWin.w / 2 + 2}`);
      }
    }
    // The fanlight over the door is lit; the door itself is an opening in the contour.
    const dx = doorAxis - door.w / 2;
    const dTop = hp - door.h;
    windows.push({ x: dx + 1, y: dTop + 1, w: door.w - 2, h: door.fan - 2 });
    const doorPath = d`M${dx} ${hp} V${dTop} H${dx + door.w} V${hp}`;
    const sx0 = doorAxis - stair.width / 2;
    const sx1 = doorAxis + stair.width / 2;
    const detail = [
      d`M${Math.min(sx(x0), wall)} ${hp} H${Math.max(sx(x0), wall)}`,
      d`M${Math.min(sx(x0), wall)} ${f1} H${Math.max(sx(x0), wall)}`,
      d`M${Math.min(sx(x0), wall)} ${eaves} H${Math.max(sx(x0), wall)}`,
      d`M${Math.min(sx(x0), wall)} ${cornice} H${Math.max(sx(x0), wall)}`,
      d`M${sx0} ${GROUND} V${hp} M${sx1} ${GROUND} V${hp}`,
      d`M${dx} ${dTop + door.fan} H${dx + door.w}`,
      d`M${dx - 2} ${dTop - 2} H${dx + door.w + 2}`,
      ...hoods,
    ].join(' ');
    let texture = '';
    for (let i = 1; i <= stair.risers; i++) texture += d` M${sx0} ${GROUND - i * stair.rise} H${sx1}`;
    return { windows, doorPath, detail, texture: texture.trim() };
  };

  const a = half(1);
  const b = half(-1);
  const left = x0 - over;
  const right = 2 * wall - left;
  const xr = 2 * wall - x0; // 566

  // The host family's house: its own contour, the party wall included.
  const hostPath = d`M${x0} ${GROUND} V${eaves} H${left} V${cornice} H${x0} V${ridge} H${wall} V${GROUND}`;
  const host: House = {
    id: 'bremer-host',
    order: 3,
    kind: 'host',
    fill: `${hostPath} Z`,
    outline: `${hostPath} ${a.doorPath}`,
    detail: a.detail,
    texture: a.texture,
    windows: a.windows,
    box: { x: left, y: ridge, w: wall - left, h: GROUND - ridge },
  };

  /*
   * The chimney stands on the pair's outer party wall (to the next house, not
   * drawn), flush with the end, rather than on the shared one: the host
   * family's marker label sits above its ridge and keeps 12 u clear of it.
   */
  const ch = { w: 0.9 * M, top: ridge - 1.2 * M };
  const twinRun =
    d` H${xr - ch.w} V${ch.top + 1.5} H${xr - ch.w - 1} V${ch.top} H${xr + 1} V${ch.top + 1.5} H${xr}` +
    d` V${cornice} H${right} V${eaves} H${xr} V${GROUND}`;
  const twinPath = d`M${wall} ${ridge}` + twinRun;
  // A few slate courses under the ridge, in one corner only.
  const slate = [0, 1, 2].map((i) => d`M${xr - ch.w - 2 - (3 - i) * 7} ${ridge + 4.5 + i * 5.5} H${xr - 2}`).join(' ');
  const twin: House = {
    id: 'bremer-twin',
    order: 4,
    fill: d`M${wall} ${GROUND} V${ridge}` + twinRun + ' Z',
    outline: `${twinPath} ${b.doorPath}`,
    detail: b.detail,
    texture: `${b.texture} ${slate}`,
    windows: b.windows,
  };
  return [twin, host];
}

/*
 * The timber-framed gable house at the end, house 7 (guide §3.7): a masonry
 * ground storey; framed upper storeys whose jetties show as double floor lines
 * with the beam ends between them; posts on the outer edges, the window jambs
 * and the bay line; rails at sill and head; one foot brace per outer panel
 * (ASSUMPTION: the bracing pattern); the posts run on up into the gable.
 */
function timberHouse(id: string, order: number): House {
  const x = 652;
  const w = 6.4 * M;
  const cx = x + w / 2;
  const half = w / 2;
  const rise = half * PITCH;
  const apex = EAVE - rise;
  const roofAt = (px: number) => apex + Math.abs(px - cx) * PITCH;
  const path = d`M${x} ${GROUND} V${EAVE} L${cx} ${apex} L${x + w} ${EAVE} V${GROUND}`;
  const door = historicDoor(x + 1.5 * (w / 2));
  const windows = facadeWindows(x, w, 2, 3, 1);
  const gableWin = { x: cx - 0.5 * M, y: EAVE - rise * 0.5, w: 1.0 * M, h: 1.2 * M };
  windows.push({ ...gableWin, bars: true });

  const jamb = (WIN.w + 0.2 * M) / 2; // a post 0.1 m outside each window jamb
  const axes = [x + half / 2, x + w - half / 2];
  const posts = [axes[0] - jamb, axes[0] + jamb, cx, axes[1] - jamb, axes[1] + jamb];
  const parts: string[] = [];
  const ticks: string[] = [];
  // The jetties at the two upper floors and under the gable: plate below, sill above, 4 u apart.
  for (const yf of [floorAt(1), floorAt(2), EAVE]) {
    const lo = yf + 3;
    const hi = yf - 1;
    const inset = yf === EAVE ? (EAVE - hi) / PITCH : 0; // trimmed to the roof line under the gable
    parts.push(d`M${x} ${lo} H${x + w} M${x + inset} ${hi} H${x + w - inset}`);
    for (let tx = x + 4; tx < x + w; tx += 8) ticks.push(d`M${tx} ${lo} V${hi}`);
  }
  for (const k of [1, 2]) {
    const yf = floorAt(k);
    const bottom = yf - 1;
    const top = yf - STOREY + 3;
    parts.push(d`M${x} ${yf - WIN.sill} H${x + w}`); // sill rail
    for (const p of posts) parts.push(d`M${p} ${bottom} V${top}`);
    const brace = bottom - ((bottom - top) * 2) / 3;
    parts.push(d`M${x} ${bottom} L${posts[0]} ${brace} M${x + w} ${bottom} L${posts[4]} ${brace}`);
  }
  // The gable: the posts carry on to the roof line, a king post above the window, a collar at the second loft floor.
  for (const p of [posts[0], posts[1], posts[3], posts[4]]) parts.push(d`M${p} ${EAVE - 1} V${roofAt(p)}`);
  parts.push(d`M${cx} ${gableWin.y} V${apex}`);
  const collar = EAVE - 2.6 * M;
  const collarHalf = (collar - apex) / PITCH;
  parts.push(d`M${cx - collarHalf} ${collar} H${cx + collarHalf}`);
  // Masonry ground storey: three course hints at the lower left corner.
  const courses = [6, 3.5, 6].map((len, i) => d`M${x} ${GROUND - 3.5 - i * 3.5} h${len}`);

  return {
    id,
    order,
    fill: `${path} Z`,
    outline: `${path} ${door.outline}`,
    detail: parts.join(' '),
    texture: [door.texture, ...ticks, ...courses].join(' '),
    windows,
  };
}

/* The CASA shared flat: the modern block, 15 m, five storeys, a flat roof behind a parapet. */
function casaBlock(): House {
  const x = 180;
  const w = 15.0 * M;
  const storeys = 5;
  const bays = 5;
  const doorBay = 2;
  const winW = 1.6 * M;
  const winH = 1.6 * M;
  const eave = floorAt(storeys);
  const top = eave - 0.8 * M;
  const left = x - 0.4 * M;
  const right = x + w + 0.4 * M;
  const bay = w / bays;
  const windows: Win[] = [];
  for (let k = 0; k < storeys; k++) {
    for (let b = 0; b < bays; b++) {
      if (k === 0 && b === doorBay) continue;
      windows.push({ x: x + b * bay + (bay - winW) / 2, y: floorAt(k) - WIN.sill - winH, w: winW, h: winH });
    }
  }
  const dw = 1.1 * M;
  const dx = x + doorBay * bay + (bay - dw) / 2;
  const dTop = GROUND - 2.3 * M;
  const path = d`M${x} ${GROUND} V${top} H${x + w} V${GROUND}`;
  return {
    id: 'casa-flat',
    order: 1,
    kind: 'flat',
    fill: `${path} Z`,
    // The coping 0.4 m proud, and a canopy 0.6 m wider than the door each side.
    outline: `${path} ${d`M${left} ${top} H${right}`} ${d`M${dx} ${GROUND} V${dTop} h${dw} V${GROUND}`} ${d`M${dx - 0.6 * M} ${dTop - 2} h${dw + 1.2 * M}`}`,
    detail: d`M${x} ${eave} H${x + w}`,
    windows,
    box: { x: left, y: top, w: right - left, h: GROUND - top },
  };
}

// Left to right, except that the right twin renders before the host family's
// house, so the host's party wall lies on top when it turns yellow.
const HOUSES: House[] = [
  steppedGable('gable-1', 0, 24, 8.0 * M, 0, { winW: 1.0 * M, winH: 1.4 * M, hatchW: 1.0 * M, hatchH: 1.4 * M, hatchFloor: 3.0 * M, beam: 5.2 * M }),
  casaBlock(),
  voluteGable('scroll-gable', 2),
  ...bremerPair(),
  steppedGable('gable-8', 5, 584, 6.4 * M, 0, { winW: 0.9 * M, winH: 1.3 * M, hatchW: 0.9 * M, hatchH: 1.2 * M, hatchFloor: 2.6 * M }),
  timberHouse('timber', 6),
];

/*
 * THE MÜHLE AM WALL, k = 5 u/m, on its bastion in the Wall gap between house 1
 * and the CASA flat (guide §3.3). A Galerieholländer [S8][S10]: a five-storey
 * octagonal base of clinker brick, a wooden gallery round the body, a wooden
 * octagon above it, the cap, a wind rose behind, and four shuttered sails 24 m
 * across on two stocks through the hub [S8][S9].
 */
const K_WALL = 0.5 * M;
const MILL = (() => {
  const k = K_WALL;
  const cx = 142;
  const base = 372; // the mill's ground, on top of the mound
  const y = (m: number) => base - m * k;
  const gallery = y(14); // 302. ASSUMPTION: five brick storeys of about 2.8 m
  const seat = y(26); // 242: top of the wooden octagon. ASSUMPTION
  const hub = y(27); // 237. DERIVED: gallery 14 + 1 m clearance + 12 m sail radius
  const capTop = y(29.5); // 224.5. ASSUMPTION
  const R = 12 * k; // 60: the 24 m rotor [S8]
  // Across flats, metres. ASSUMPTION: 9.0 at the foot, 6.6 at the gallery, 5.0 at the cap seat.
  const fFoot = 9.0 * k;
  const fGal = 6.6 * k;
  const fTop = 5.0 * k;
  const brickF = (py: number) => fFoot - ((fFoot - fGal) * (base - py)) / (base - gallery);
  const arris = Math.tan(Math.PI / 8) / 2; // an octagon seen square to one face: arrises at ±0.2071 F
  const foot = GROUND; // the base runs on behind the mound
  const deck = 1.8 * k; // ASSUMPTION: the gallery 1.8 m round the body
  const deckHalf = fGal / 2 + deck;
  const railing = 1.0 * k;
  const railCorner = (fGal + 2 * deck) * arris; // the railing's own octagon corners

  const body =
    d`M${cx - brickF(foot) / 2} ${foot} L${cx - fGal / 2} ${gallery} L${cx - fTop / 2} ${seat}` +
    d` H${cx + fTop / 2} L${cx + fGal / 2} ${gallery} L${cx + brickF(foot) / 2} ${foot}`;
  const arrises = [-1, 1]
    .map((s) => d`M${cx + s * brickF(foot) * arris} ${foot} L${cx + s * fGal * arris} ${gallery} L${cx + s * fTop * arris} ${seat}`)
    .join(' ');
  const strutY = gallery + 1.5 * k;
  const gal = {
    deck: rect(cx - deckHalf, gallery, 2 * deckHalf, 0.3 * k),
    rail:
      d`M${cx - deckHalf} ${gallery - railing} H${cx + deckHalf}` +
      [-deckHalf, -railCorner, railCorner, deckHalf].map((o) => d` M${cx + o} ${gallery} V${gallery - railing}`).join('') +
      [-1, 1].map((s) => d` M${cx + s * deckHalf} ${gallery + 0.3 * k} L${cx + (s * brickF(strutY)) / 2} ${strutY}`).join(''),
  };
  const capR = { x: 3.0 * k, y: capTop };
  const cap = d`M${cx - capR.x} ${seat} A${capR.x} ${seat - capTop} 0 0 1 ${cx + capR.x} ${seat} Z`;
  // The wind rose behind the cap, its wheel edge-on from the front: 3 m across (ASSUMPTION).
  const windRose = d`M${cx} ${capTop + 1.5 * k} V${capTop - 1.5 * k}`;

  /*
   * One arm, pointing up. The frame on the TRAILING side (right of the upward
   * arm), from 0.2 R to the tip, 2.0 m wide, eight rows of shutters; the leading
   * board on the other side of the stock [S14]. The sails turn ANTICLOCKWISE
   * seen from the front, as a right-handed Dutch mill does [S12][S13], so the
   * lattice trails. Ratios ASSUMPTION.
   */
  const tip = hub - R;
  const inner = hub - 0.2 * R;
  const frameW = 2.0 * k;
  const rows = 8;
  const bars = Array.from({ length: rows - 1 }, (_, i) => d`M${cx} ${tip + ((i + 1) * (inner - tip)) / rows} h${frameW}`).join(' ');
  const arm = {
    frame: rect(cx, tip, frameW, inner - tip),
    bars,
    board: d`M${cx} ${tip} h${-0.6 * k} V${inner} H${cx}`,
  };
  const stocks = d`M${cx} ${hub - R} V${hub + R} M${cx - R} ${hub} H${cx + R}`;
  // The bastion the mill stands on [S8]: it hides the mill's foot (guide R4).
  const mound = d`M104 ${GROUND} Q${cx} ${2 * base - GROUND} 180 ${GROUND}`;
  return { cx, hub, body, arrises, gal, cap, windRose, arm, stocks, mound };
})();

/*
 * THE DOM, ST. PETRI, k = 2.5 u/m, axis x 650, behind houses 8 and 9 (guide
 * §3.2). Two square towers 11 m a side [S1], 15 m apart (ASSUMPTION: the 2009
 * rope bridge's length taken as the clear gap [S1]). Rhenish helms [S1][S3]: a
 * gable on each face, four rhombic roof faces turned 45° to them [S4]. Seen
 * square-on, the side gables are edge-on, so the tower edges run straight up
 * to the gable apex height and the outer ridges run from there to the tip; the
 * front gable shows as its two rakes, the front ridge as a line on the axis.
 * Heights: gable foot 57 m (the platform sits on the gable base line [S1]),
 * gable apex 68 m (DERIVED from [S2]), tip 90.89 m, vane 2.38 m [S1]. The
 * clock is in the north (left) tower's west gable [S1]; its size is an
 * ASSUMPTION (1.8 m). Nothing between the towers: they have open air there
 * above 65 m [S1], and the west gable, rose and portals stand below the
 * street's roofline at this scale. The belfry openings are not drawn: the
 * guide lists them as unverified, and at this scale only slivers of them
 * would show round house 8's gable.
 *
 * The axis stands 2.75 u right of the guide's 650. At 650 the left tower's
 * right edge (631.25) ran 0.32 u from house 8's step riser (630.93), so the
 * two read as one line carried up onto the step corner, and its right edge sat
 * 2.25 u off the timber house's gable post. At 652.75 every tower edge is at
 * least 3 u from every step riser and 2.5 u from every post, and the gap
 * between houses 8 and 9 still opens onto the air between the towers, never a
 * tower's foot (guide R4).
 */
const K_DOM = 0.25 * M;
const DOM = (() => {
  const k = K_DOM;
  const axis = 652.75;
  const W = 11 * k;
  const gap = 15 * k;
  const y = (m: number) => GROUND - m * k;
  const foot = y(57);
  const apex = y(68);
  const tip = y(90.89);
  const vane = y(93.27);
  const towers = [axis - gap / 2 - W, axis + gap / 2].map((L) => {
    const cx = L + W / 2;
    return {
      contour: d`M${L} ${GROUND} V${apex} L${cx} ${tip} L${L + W} ${apex} V${GROUND}`,
      lines: d`M${L} ${foot} L${cx} ${apex} L${L + W} ${foot} M${cx} ${apex} V${tip}`,
      vane: d`M${cx} ${tip} V${vane} M${cx - 2} ${tip - 3.4} h${4} l${-1.2} ${-1.1}`,
      cx,
    };
  });
  // The clock at the left gable's centroid; its hands at a quarter past eight.
  const clock = { cx: towers[0].cx, cy: foot - (foot - apex) / 3, r: 1.8 * k };
  const hands = d`M${clock.cx} ${clock.cy} l${-2.2} ${0.9} M${clock.cx} ${clock.cy} l${3.2} ${0}`;
  return { towers, clock, hands };
})();

// The tram: 2.8 m body on 0.35 m wheels, two 11 m sections and a 0.8 m joint.
const TRAM = { rail: 456, height: 2.8 * M, section: 11 * M, joint: 0.8 * M, top: 456 - 0.7 * M - 2.8 * M };

// Deterministic per-window variety, in integers so server and browser agree.
const hash = (n: number) => ((n * 2654435761) >>> 0) % 1000;

const STARS = [
  [46, 46], [118, 92], [176, 34], [238, 120], [300, 58], [330, 150], [430, 108], [472, 50], [530, 128], [606, 70], [668, 38], [706, 118], [84, 160], [468, 158],
] as const;

/*
 * The sky each caption covers at its largest (measured from 640 to 1920 px in
 * DE and EN, plus 4 u): the stars there step out while that caption shows, so
 * none reads as a stray dot inside the text.
 */
const CAPTION_SKY = { host: { x0: 28, x1: 338, y1: 155 }, flat: { x0: 382, x1: 692, y1: 138 } } as const;
const starZone = (x: number, y: number) =>
  (Object.keys(CAPTION_SKY) as (keyof typeof CAPTION_SKY)[]).find((k) => x >= CAPTION_SKY[k].x0 && x <= CAPTION_SKY[k].x1 && y <= CAPTION_SKY[k].y1);

// Each linked house's hotspot is its own bounding box, as % of the drawing.
const pct = (v: number, of: number) => `${r2((v / of) * 100)}%`;
const HOTSPOT = Object.fromEntries(
  HOUSES.flatMap(({ kind, box }) =>
    kind && box ? [[kind, { left: pct(box.x, 720), top: pct(box.y, 480), width: pct(box.w, 720), height: pct(box.h, 480) }]] : []
  )
) as Record<'flat' | 'host', CSSProperties>;

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** One pane shape: a rectangle, or the scroll gable's round window. */
function Pane({ win, className, fill }: { win: Win; className?: string; fill: string }) {
  return win.shape === 'round' ? (
    <circle className={className} cx={r2(win.x + win.w / 2)} cy={r2(win.y + win.h / 2)} r={r2(win.w / 2)} fill={fill} />
  ) : (
    <rect className={className} x={r2(win.x)} y={r2(win.y)} width={r2(win.w)} height={r2(win.h)} rx={0.6} fill={fill} />
  );
}

/** Glazing bars: a mullion on the axis and a transom at a third from the top. */
const barsOf = (windows: Win[]) =>
  windows
    .filter((w) => w.bars)
    .map((w) => d`M${w.x + w.w / 2} ${w.y} V${w.y + w.h} M${w.x} ${w.y + w.h / 3} H${w.x + w.w}`)
    .join(' ');

export function AccommodationStreet({ options, label, className }: AccommodationStreetProps) {
  const [active, setActive] = useState<'flat' | 'host' | null>(null);
  const glow = useRef<HTMLDivElement>(null);
  useHeroGlow(glow);

  const onPointerLeave = useCallback(() => setActive(null), []);

  let windowIndex = 0;

  return (
    <figure
      role="group"
      aria-label={label}
      onPointerLeave={onPointerLeave}
      className={cn(
        styles.panel,
        // No box of its own: the street stands on the night hero's ground, and the
        // drawing fades out at both ends instead of stopping at an edge. Where the
        // drawing is narrow but a caption shows (sm, and lg beside the lede), the
        // figure gains a band of sky above it to hold the caption.
        'relative aspect-[3/2] w-full text-white sm:aspect-[4/3] md:aspect-[3/2] lg:aspect-[4/3] xl:aspect-[3/2]',
        className
      )}
      data-active={active ?? undefined}
    >
      <div ref={glow} aria-hidden="true" className={glowStyles.glow} />

      {/* The drawing: 3:2, standing on the bottom edge of the figure. */}
      <div className="absolute inset-x-0 bottom-0 aspect-[3/2]">
        <svg viewBox="0 0 720 480" className={cn(styles.drawing, 'absolute inset-0 h-full w-full')} aria-hidden="true" focusable="false">
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

          {/* Sky. The moon sits in the gap between the two caption positions. */}
          <circle className={styles.moon} cx={360} cy={58} r={13} fill="var(--casa-warm-soft)" />
          {STARS.map(([x, y], i) => (
            <g key={i} className={styles.starZone} data-zone={starZone(x, y)}>
              <circle className={styles.star} style={vars({ '--s': i })} cx={x} cy={y} r={hash(i + 3) > 600 ? 1.6 : 1.1} fill="#fff" />
            </g>
          ))}

          {/* Bremen behind the street, faint, each landmark at its own fixed scale. The outer
              group steps back with the street when an option is chosen; the inner one holds
              the entrance fade. */}
          <g className={styles.farDim}>
            <g className={styles.far} stroke="#fff" fill="var(--casa-ink-deep)" strokeLinejoin="round" strokeLinecap="round">
              <g strokeWidth={1}>
                {DOM.towers.map((t) => (
                  <g key={t.cx}>
                    <path d={t.contour} />
                    <path d={t.lines} fill="none" strokeWidth={0.6} />
                    <path d={t.vane} fill="none" strokeWidth={0.7} />
                  </g>
                ))}
                <circle cx={r2(DOM.clock.cx)} cy={r2(DOM.clock.cy)} r={r2(DOM.clock.r)} strokeWidth={0.6} />
                <path d={DOM.hands} fill="none" strokeWidth={0.5} />
              </g>

              <g strokeWidth={1.2}>
                <path d={MILL.windRose} fill="none" strokeWidth={0.9} />
                <path d={MILL.body} />
                <path d={MILL.arrises} fill="none" strokeWidth={0.75} />
                <path d={MILL.gal.deck} strokeWidth={0.75} />
                <path d={MILL.gal.rail} fill="none" strokeWidth={0.75} />
                <path d={MILL.cap} />
                <g className={styles.sails} style={vars({ transformOrigin: `${MILL.cx}px ${MILL.hub}px` })}>
                  <path d={MILL.stocks} fill="none" />
                  {[0, 90, 180, 270].map((a) => (
                    <g key={a} transform={`rotate(${a} ${MILL.cx} ${MILL.hub})`}>
                      <path d={MILL.arm.frame} fill="none" strokeWidth={0.75} />
                      <path d={MILL.arm.bars} fill="none" strokeWidth={0.5} />
                      <path d={MILL.arm.board} fill="none" strokeWidth={0.6} />
                    </g>
                  ))}
                  <circle cx={MILL.cx} cy={MILL.hub} r={2.4} />
                </g>
                <path d={MILL.mound} fill="var(--casa-ink-panel)" />
              </g>
            </g>
          </g>

          {/* The street's silhouette, which never dims. The landmarks run down behind the
              houses (the Dom's shafts to the pavement, the sails behind house 1 and the flat
              as they turn); when the street steps back for a chosen option, its houses fade
              but this stays solid, so nothing behind shows through them (guide R4). It
              shares the fills' entrance fade. */}
          <g>
            {HOUSES.map((house) => (
              <path key={house.id} className={styles.fill} style={vars({ '--h': house.order })} d={house.fill} fill="var(--casa-ink-panel)" />
            ))}
          </g>

          {/* The street */}
          {HOUSES.map((house) => (
            <g key={house.id} className={styles.house} data-kind={house.kind} style={vars({ '--h': house.order })}>
              {house.kind && house.box ? (
                <ellipse className={styles.spill} cx={r2(house.box.x + house.box.w / 2)} cy={GROUND} rx={r2(house.box.w * 0.75)} ry={40} fill="url(#casa-street-spill)" />
              ) : null}
              <path className={styles.fill} d={house.fill} fill="var(--casa-ink-panel)" />
              {house.windows.map((win, w) => {
                const i = windowIndex++;
                const roll = hash(i + 11);
                const mode = win.dark ? 'dark' : roll < 640 ? 'lit' : roll < 840 ? 'dark' : 'life';
                return (
                  <g key={w} style={vars({ '--in': `${(1.25 + house.order * 0.12 + w * 0.04).toFixed(2)}s`, '--life': `${9 + (roll % 9)}s`, '--life-delay': `${(roll % 70) / 10}s` })}>
                    <Pane win={win} className={styles.pane} fill="#24324a" />
                    {mode !== 'dark' ? <Pane win={win} className={cn(styles.lit, mode === 'life' && styles.life)} fill="var(--casa-amber)" /> : null}
                    {!win.dark ? <Pane win={win} className={styles.litActive} fill="var(--casa-sun)" /> : null}
                  </g>
                );
              })}
              <path className={styles.bars} d={barsOf(house.windows)} fill="none" stroke="var(--casa-ink-deep)" strokeWidth={0.75} />
              {house.texture ? <path className={styles.texture} d={house.texture} fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth={0.75} strokeLinecap="round" /> : null}
              {house.detail ? <path className={styles.detail} d={house.detail} fill="none" stroke="#fff" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" /> : null}
              {house.ornament ? <path className={styles.detail} d={house.ornament} fill="var(--casa-ink-panel)" stroke="#fff" strokeWidth={1} strokeLinejoin="round" /> : null}
              <path
                className={styles.line}
                d={house.outline}
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

          {/* A street tree (8 m, crown 2 m) between the scroll gable and the Bremer Häuser,
              and a 6.2 m street lamp on the pavement in front of the stepped gable. */}
          <g className={styles.prop} stroke="#fff" strokeWidth={2} strokeLinecap="round">
            <line x1={423} y1={GROUND} x2={423} y2={GROUND - 3.6 * M} />
            <circle cx={423} cy={GROUND - 5.8 * M} r={2.0 * M} fill="#1d2a3f" />
            <path d={`M576 ${GROUND} V${GROUND - 6.2 * M} h8`} fill="none" />
            <path d={`M580 ${GROUND - 6.2 * M} h10 l-2 6 h-6 z`} fill="var(--casa-amber)" />
            <path className={styles.lampLight} d={`M585 ${GROUND - 5.6 * M} L568 ${GROUND} H602 Z`} fill="url(#casa-street-lamp)" stroke="none" />
          </g>

          {/* Pavement edge, kerb, the tram's rail */}
          <path className={styles.groundLine} d={`M0 ${GROUND} H720`} stroke="#fff" strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" />
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
            {/* The marker sits on the roof and its label in the free sky above it. The
                WG's label runs to the right of its marker, clear of the mill's sails; the
                host family's is centred over its ridge, clear of the chimney. */}
            <span aria-hidden="true" className={cn(styles.marker, 'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2')}>
              <span className={styles.bead}>
                <span className={styles.beadCore} />
              </span>
              <span className={styles.markerLabel} data-anchor={option.id === 'flat' ? 'start' : 'centre'}>
                {option.title}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* Caption: the chosen option's published summary, on the far side of the sky from
          its building so it never covers the marker (pointer devices; a tap opens the page). */}
      <div aria-hidden="true" className={cn(styles.captions, 'pointer-events-none absolute inset-x-[4.5%] hidden sm:block')}>
        {options.map((option) => (
          <div key={option.id} className={cn(styles.caption, 'absolute top-0', option.id === 'flat' ? 'right-0' : 'left-0', active !== option.id && styles.captionOut)}>
            <p className={styles.captionTitle}>{option.title}</p>
            <p className={styles.captionText}>{option.summary}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
