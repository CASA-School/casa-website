import 'server-only';

import { deflateSync } from 'node:zlib';

import { encode } from 'uqr';

/**
 * A QR code as a PNG, base64, for a mail: mail clients do not draw SVG, so the code travels as an inline
 * picture (`cid:`). Grey-scale, `scale` pixels a module, the quiet zone included, as `qrPath` draws it.
 */
export function qrPng(text: string, scale = 8): string {
  const { data, size } = encode(text, { ecc: 'M', border: 2 });
  const px = size * scale;
  const raw = Buffer.alloc((px + 1) * px);
  for (let y = 0; y < px; y++) {
    const row = data[Math.floor(y / scale)];
    for (let x = 0; x < px; x++) raw[y * (px + 1) + 1 + x] = row[Math.floor(x / scale)] ? 0x11 : 0xff;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(px, 0);
  header.writeUInt32BE(px, 4);
  header[8] = 8; // bit depth; colour type 0 (grey), no interlace
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function chunk(type: string, body: Buffer): Buffer {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  let crc = 0xffffffff;
  for (const byte of typed) crc = CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const out = Buffer.alloc(8 + typed.length);
  out.writeUInt32BE(body.length, 0);
  typed.copy(out, 4);
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 4 + typed.length);
  return out;
}
