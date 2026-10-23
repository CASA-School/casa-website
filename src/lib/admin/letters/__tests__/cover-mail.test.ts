import { describe, expect, it } from 'vitest';

import { coverClosing, coverText, letterMailHtml } from '../cover-mail';

describe('the mail a letter goes out with', () => {
  it('speaks the letter’s language and names the letter', () => {
    expect(coverText('de', 'booking_confirmation', 'Bestätigung der Buchung')).toBe('im Anhang findest du unser Schreiben „Bestätigung der Buchung“ als PDF.');
    expect(coverText('de', 'offer', 'Angebot')).toBe('im Anhang findest du unser Angebot als PDF.');
    expect(coverText('en', 'booking_confirmation', 'Booking confirmation')).toBe('Please find our letter “Booking confirmation” attached as a PDF.');
    expect(coverClosing('de', 'Rahman')).toBe('Viele Grüße\nRahman');
  });

  it('opens with the letter’s salutation, names the PDF, escapes the text and ends with the signature', () => {
    const html = letterMailHtml({
      subject: 'Bestätigung',
      heading: 'Bestätigung der Buchung',
      salutation: 'Liebe Maria,',
      text: 'im Anhang <b>findest</b> du …',
      files: ['Bestätigung Maria.pdf'],
      language: 'de',
      logoSrc: 'cid:casa-logo',
      signature: '<div>SIGNATUR</div>',
    });
    expect(html.indexOf('Liebe Maria,')).toBeLessThan(html.indexOf('im Anhang'));
    expect(html).toContain('&lt;b&gt;findest&lt;/b&gt;');
    expect(html).toContain('Bestätigung Maria.pdf');
    expect(html).toContain('<div>SIGNATUR</div>');
  });
});
