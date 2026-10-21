import { describe, expect, it } from 'vitest';

import { looksLikeSpam } from '../spam';

describe('what looks like spam', () => {
  it('is a message full of links', () => {
    expect(looksLikeSpam({ message: 'Buy now http://a.example http://b.example www.c.example' })).toBe(true);
    expect(looksLikeSpam({ message: 'Ich habe eine Frage zum Kurs, siehe https://casa-bremen.de' })).toBe(false);
  });

  it('is a form sent faster than anyone types it', () => {
    expect(looksLikeSpam({ message: 'Hallo', elapsedMs: 900 })).toBe(true);
    expect(looksLikeSpam({ message: 'Hallo', elapsedMs: 45_000 })).toBe(false);
    expect(looksLikeSpam({ message: 'Hallo' })).toBe(false);
  });
});
