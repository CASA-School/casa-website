/**
 * List paging.
 *
 * `LIMIT` and `OFFSET` are passed as bind parameters, never interpolated —
 * `Number(x)` on a bad query string yields `NaN`, and `LIMIT NaN` is a syntax
 * error that turns a mistyped URL into a 500. `clampPage` is the other half:
 * it makes the values safe before they reach SQL at all.
 */

export const PAGE_SIZE = 40;

export function clampPage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 10_000) : 1;
}

export const offsetFor = (page: number) => (page - 1) * PAGE_SIZE;

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

/** First value of a search param, trimmed, or undefined when empty. */
export function firstParam(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
