import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The sync service signs every batch it sends (scripts/schoolman-sync): `t=<unix seconds>,v1=<hex>` in
 * `x-schoolman-signature`, the HMAC-SHA256 of `<t>.<body>` under `SCHOOLMAN_SYNC_KEY`. A batch older or
 * newer than five minutes is refused, so a captured request cannot be sent again later.
 */
export const SIGNATURE_HEADER = 'x-schoolman-signature';
const SKEW_SECONDS = 300;

export function sign(key: string, body: string, at: number = Math.floor(Date.now() / 1000)): string {
  return `t=${at},v1=${createHmac('sha256', key).update(`${at}.${body}`).digest('hex')}`;
}

export function verify(key: string, body: string, header: string | null, now: number = Math.floor(Date.now() / 1000)): boolean {
  const parts = new Map((header ?? '').split(',').map((p) => p.split('=', 2) as [string, string]));
  const at = Number(parts.get('t'));
  const given = parts.get('v1') ?? '';
  if (!Number.isInteger(at) || Math.abs(now - at) > SKEW_SECONDS || !/^[0-9a-f]{64}$/.test(given)) return false;
  const expected = createHmac('sha256', key).update(`${at}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(given, 'hex'));
}
