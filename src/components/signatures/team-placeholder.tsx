/*
 * A friendly stand-in for a colleague whose photo is not on file yet
 * (2026-10-07): one of the Bremer Stadtmusikanten, drawn flat in the card's
 * 4:5 frame, so the team grid stays even. An animal, never a face: a made-up
 * portrait beside a real name would say something untrue about a real person.
 * The group packages already use the same four animals.
 */
import type { TeamPlaceholderAnimal } from '@/lib/content/types';

type Palette = { ground: string; main: string; dark: string; light: string };

const PALETTES: Record<TeamPlaceholderAnimal, Palette> = {
  katze: { ground: '#e3f4fc', main: '#f2b27d', dark: '#d98c52', light: '#fde3cc' },
  hund: { ground: '#fff3cc', main: '#c99a6b', dark: '#8b5e3c', light: '#f4e4cf' },
  hahn: { ground: '#fde8e9', main: '#ffffff', dark: '#e30613', light: '#ffc83d' },
  esel: { ground: '#e7eef1', main: '#a7b2bd', dark: '#76828f', light: '#eef1f4' },
};

const INK = '#1e293b';

function Eyes({ y, spread = 40 }: { y: number; spread?: number }) {
  return (
    <g>
      <ellipse cx={200 - spread} cy={y} rx="9" ry="12" fill={INK} />
      <ellipse cx={200 + spread} cy={y} rx="9" ry="12" fill={INK} />
      <circle cx={200 - spread + 3} cy={y - 4} r="3" fill="#ffffff" />
      <circle cx={200 + spread + 3} cy={y - 4} r="3" fill="#ffffff" />
    </g>
  );
}

function Cheeks({ y, spread = 62 }: { y: number; spread?: number }) {
  return (
    <g fill="#f4a3a8" opacity="0.55">
      <ellipse cx={200 - spread} cy={y} rx="14" ry="9" />
      <ellipse cx={200 + spread} cy={y} rx="14" ry="9" />
    </g>
  );
}

function Katze({ p }: { p: Palette }) {
  return (
    <g>
      <polygon points="112,236 132,138 186,196" fill={p.main} />
      <polygon points="288,236 268,138 214,196" fill={p.main} />
      <polygon points="127,214 138,162 168,195" fill="#f6b8bd" />
      <polygon points="273,214 262,162 232,195" fill="#f6b8bd" />
      <circle cx="200" cy="292" r="104" fill={p.main} />
      <path d="M158 206 q42 -22 84 0 q-42 14 -84 0z" fill={p.dark} opacity="0.5" />
      <ellipse cx="200" cy="330" rx="58" ry="40" fill={p.light} />
      <Eyes y={284} />
      <Cheeks y={322} spread={66} />
      <path d="M190 312 h20 l-10 11z" fill="#e8838b" />
      <path d="M200 323 q-6 12 -18 8 M200 323 q6 12 18 8" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <line x1="136" y1="318" x2="96" y2="310" />
        <line x1="136" y1="328" x2="98" y2="332" />
        <line x1="264" y1="318" x2="304" y2="310" />
        <line x1="264" y1="328" x2="302" y2="332" />
      </g>
    </g>
  );
}

function Hund({ p }: { p: Palette }) {
  return (
    <g>
      <ellipse cx="112" cy="262" rx="40" ry="80" fill={p.dark} transform="rotate(18 112 262)" />
      <ellipse cx="288" cy="262" rx="40" ry="80" fill={p.dark} transform="rotate(-18 288 262)" />
      <circle cx="200" cy="282" r="100" fill={p.main} />
      <ellipse cx="236" cy="252" rx="30" ry="26" fill={p.dark} opacity="0.55" />
      <ellipse cx="200" cy="324" rx="60" ry="44" fill={p.light} />
      <Eyes y={262} spread={38} />
      <ellipse cx="200" cy="304" rx="21" ry="15" fill={INK} />
      <ellipse cx="194" cy="299" rx="6" ry="4" fill="#ffffff" opacity="0.7" />
      <path d="M200 319 v10 M200 329 q-12 12 -24 4 M200 329 q12 12 24 4" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M188 337 h24 v12 a12 12 0 0 1 -24 0z" fill="#ef7d86" />
    </g>
  );
}

function Hahn({ p }: { p: Palette }) {
  return (
    <g>
      <circle cx="166" cy="196" r="26" fill={p.dark} />
      <circle cx="200" cy="182" r="31" fill={p.dark} />
      <circle cx="234" cy="196" r="26" fill={p.dark} />
      <circle cx="200" cy="292" r="98" fill={p.main} stroke="#f1c7cb" strokeWidth="4" />
      <path d="M118 340 q-26 30 -6 64 q20 -24 46 -30z" fill="#f1c7cb" />
      <path d="M282 340 q26 30 6 64 q-20 -24 -46 -30z" fill="#f1c7cb" />
      <Eyes y={280} spread={36} />
      <Cheeks y={312} spread={60} />
      <polygon points="182,300 218,300 200,330" fill={p.light} />
      <polygon points="182,300 218,300 200,312" fill="#f0a91b" />
      <ellipse cx="200" cy="348" rx="13" ry="19" fill={p.dark} />
    </g>
  );
}

function Esel({ p }: { p: Palette }) {
  return (
    <g>
      <ellipse cx="146" cy="160" rx="25" ry="84" fill={p.main} transform="rotate(-18 146 160)" />
      <ellipse cx="254" cy="160" rx="25" ry="84" fill={p.main} transform="rotate(18 254 160)" />
      <ellipse cx="148" cy="168" rx="11" ry="58" fill={p.light} transform="rotate(-18 148 168)" />
      <ellipse cx="252" cy="168" rx="11" ry="58" fill={p.light} transform="rotate(18 252 168)" />
      <ellipse cx="122" cy="88" rx="13" ry="19" fill={p.dark} transform="rotate(-18 122 88)" />
      <ellipse cx="278" cy="88" rx="13" ry="19" fill={p.dark} transform="rotate(18 278 88)" />
      <ellipse cx="200" cy="300" rx="92" ry="124" fill={p.main} />
      <path d="M172 190 l12 -30 l14 24 l12 -28 l14 32z" fill={p.dark} />
      <ellipse cx="200" cy="368" rx="76" ry="58" fill={p.light} />
      <Eyes y={272} spread={42} />
      <ellipse cx="176" cy="360" rx="9" ry="12" fill={p.dark} />
      <ellipse cx="224" cy="360" rx="9" ry="12" fill={p.dark} />
      <path d="M176 392 q24 14 48 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

const ANIMALS: Record<TeamPlaceholderAnimal, (props: { p: Palette }) => React.JSX.Element> = {
  katze: Katze,
  hund: Hund,
  hahn: Hahn,
  esel: Esel,
};

/** Fills its 4:5 parent; decorative, as the card names the person. */
export function TeamPlaceholder({ animal }: { animal: TeamPlaceholderAnimal }) {
  const palette = PALETTES[animal];
  const Animal = ANIMALS[animal];

  return (
    <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <rect width="400" height="500" fill={palette.ground} />
      <circle cx="200" cy="290" r="150" fill="#ffffff" opacity="0.35" />
      <Animal p={palette} />
    </svg>
  );
}
