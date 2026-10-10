/**
 * Invisible slot tags.
 *
 * While a page renders for the website editor, every editable text carries its
 * slot key after it, written in characters that have no width and no glyph. The
 * editor's bridge (src/components/cms/edit-bridge.tsx) finds them in the DOM,
 * removes them and marks the element, which is how a click on any text on the
 * real page knows which slot it is, without a wrapper in a single component.
 * This is the technique the hosted content systems call content source maps.
 *
 * Tags are only ever added in draft mode, which only the editor's iframe has;
 * the public site never renders one.
 *
 * The key is UTF-8 encoded and written two bits per character, between an
 * opening and a closing pair that ordinary text never contains.
 */

const DIGITS = ['​', '‌', '‍', '⁠'] as const;
const OPEN = '⁣⁤';
const CLOSE = '⁤⁣';

const TAG = /⁣⁤([​‌‍⁠]+)⁤⁣/g;

export function encodeKey(key: string): string {
  let out = OPEN;
  for (const byte of new TextEncoder().encode(key)) {
    out += DIGITS[(byte >> 6) & 3] + DIGITS[(byte >> 4) & 3] + DIGITS[(byte >> 2) & 3] + DIGITS[byte & 3];
  }
  return out + CLOSE;
}

function decodeDigits(digits: string): string | null {
  if (digits.length % 4 !== 0) return null;
  const bytes = new Uint8Array(digits.length / 4);
  for (let i = 0; i < digits.length; i += 4) {
    let byte = 0;
    for (let j = 0; j < 4; j += 1) {
      const value = DIGITS.indexOf(digits[i + j] as (typeof DIGITS)[number]);
      if (value < 0) return null;
      byte = (byte << 2) | value;
    }
    bytes[i / 4] = byte;
  }
  return new TextDecoder().decode(bytes);
}

/** `value` with `key` hidden after it. */
export const tagText = (value: string, key: string): string => value + encodeKey(key);

export const hasTag = (text: string): boolean => text.includes(OPEN);

/** The text without its tags, and the keys they named, in order. */
export function readTags(text: string): { clean: string; keys: string[] } {
  const keys: string[] = [];
  const clean = text.replace(TAG, (_, digits: string) => {
    const key = decodeDigits(digits);
    if (key) keys.push(key);
    return '';
  });
  return { clean, keys };
}

export const stripTags = (text: string): string => text.replace(TAG, '');
