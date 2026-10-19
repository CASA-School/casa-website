/**
 * The sealed bundle the SchoolMan bridge carries from the office Mac to the import job (2026-10-19;
 * docs/FILEMAKER_BRIDGE.md §8): the readers' output, gzipped and encrypted with AES-256-GCM under a
 * key made for that one run. Stored only while the job needs it; the key never sits next to it.
 *
 * Layout: `CASA-BRIDGE-1` · 12-byte IV · 16-byte auth tag · ciphertext.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

const MAGIC = Buffer.from('CASA-BRIDGE-1');

function keyOf(hex) {
  const key = Buffer.from(String(hex ?? ''), 'hex');
  if (key.length !== 32) throw new Error('The bridge key must be 32 bytes, as 64 hex characters.');
  return key;
}

/** `{ readAt, steps: [{ name, input }] }` → sealed bytes. */
export function seal(bundle, hexKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyOf(hexKey), iv);
  const body = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(bundle)))), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

/** Sealed bytes → the bundle; throws when the key is wrong or a byte was changed. */
export function open(sealed, hexKey) {
  const data = Buffer.from(sealed);
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a SchoolMan bridge bundle.');
  const iv = data.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = data.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const decipher = createDecipheriv('aes-256-gcm', keyOf(hexKey), iv);
  decipher.setAuthTag(tag);
  const zipped = Buffer.concat([decipher.update(data.subarray(MAGIC.length + 28)), decipher.final()]);
  return JSON.parse(gunzipSync(zipped).toString('utf8'));
}
