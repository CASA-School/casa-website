/**
 * When a booking still owes money (Rahman, 2026-10-21: „under 5 € counts as paid"). A leftover of a few
 * cents or euros — mostly SchoolMan's rounding — is not chased: it is not on „Zahlung offen", „Noch
 * offen" or in an open total, the booking's colour is not grey for it, and no reminder is suggested.
 * The booking and its letters still show the exact figure. One rule for every list, count and total;
 * without a database, so the letters and client parts use it too.
 */
export const OPEN_FROM = 5;

/** Owes money, by the rule. */
export const owesMoney = (open: number) => open >= OPEN_FROM;

/** The same rule in SQL, on a balance expression. */
export const owesSql = (balance: string) => `(${balance}) >= ${OPEN_FROM}`;
