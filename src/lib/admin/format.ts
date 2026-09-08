/**
 * Byte sizes, for the CV column.
 *
 * Binary units with decimal names, which is what a person expects when their
 * operating system says a file is 1.2 MB. Precision drops to zero decimals
 * above 10 of a unit, because "11.4 MB" reads as more precise than the number
 * deserves and the column only exists to answer "is this a normal-sized CV".
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} kB`;
  }

  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
