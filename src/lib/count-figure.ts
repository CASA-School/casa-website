/**
 * The number inside a public figure that may count up as it comes into view („30.000+",
 * „150+ Herkunftsländer"): what comes before it, the digits as written, what follows, the value,
 * and the thousands separator the copy uses. `null` when there is nothing worth counting: no
 * number, a single digit, or a year („Seit 1983" counts nothing).
 */
type CountParts = {
  before: string;
  digits: string;
  after: string;
  to: number;
  group: string;
};

const FIGURE = /^(\D*?)(\d{1,3}(?:[.,]\d{3})+|\d+)([\s\S]*)$/;

export function countParts(value: string): CountParts | null {
  const match = FIGURE.exec(value);
  if (!match) {
    return null;
  }

  const [, before, digits, after] = match;
  const group = /[.,]/.exec(digits)?.[0] ?? '';
  const to = Number(digits.replace(/[.,]/g, ''));
  const isYear = !group && digits.length === 4 && to >= 1900 && to <= 2100;
  if (!Number.isFinite(to) || to < 10 || isYear) {
    return null;
  }

  return { before, digits, after, to, group };
}
