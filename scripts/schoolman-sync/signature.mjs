import { createHmac } from 'node:crypto';

/** The sync service's half of src/lib/schoolman/signature.ts: `t=<unix seconds>,v1=<HMAC-SHA256 of "<t>.<body>">`. */
export function sign(key, body, at = Math.floor(Date.now() / 1000)) {
  return `t=${at},v1=${createHmac('sha256', key).update(`${at}.${body}`).digest('hex')}`;
}
