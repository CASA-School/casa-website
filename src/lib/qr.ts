import { encode } from 'uqr';

/**
 * A QR code as one SVG path (`uqr`, no dependencies): a square of `size` modules, the quiet zone
 * included, each dark module a 1×1 square. Drawn with `shape-rendering="crispEdges"` it stays sharp at
 * any size, on screen, on a projector and on paper.
 */
export function qrPath(text: string): { size: number; path: string } {
  const { data, size } = encode(text, { ecc: 'M', border: 2 });
  let path = '';
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    })
  );
  return { size, path };
}
