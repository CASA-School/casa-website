import { cn } from '@/lib/utils';

/** The address without its scheme and query, as it is typed: „casa-bremen.de/test". */
export const shortLink = (link: string) => link.replace(/^https?:\/\//, '').replace(/\?.*$/, '');

/** A QR code drawn from its path (src/lib/qr.ts): dark squares on white, sharp at any size. */
export function QrCode({ qr, label, className }: { qr: { size: number; path: string }; label: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={cn('bg-white', className)}>
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qr.path} fill="#111827" />
    </svg>
  );
}

/**
 * The same code as a background picture, for paper: Chrome starts a new page before an <svg> or <img>
 * inside a named page (`@page entry-test`), and the code would land alone on a second sheet.
 */
export function QrPicture({ qr, label, className }: { qr: { size: number; path: string }; label: string; className?: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" shape-rendering="crispEdges"><rect width="${qr.size}" height="${qr.size}" fill="#fff"/><path d="${qr.path}" fill="#111827"/></svg>`;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('bg-white bg-contain bg-center bg-no-repeat', className)}
      style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }}
    />
  );
}
