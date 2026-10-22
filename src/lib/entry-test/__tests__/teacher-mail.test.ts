import { describe, expect, it } from 'vitest';

import { teacherMailHtml, type TeacherMailTest } from '../teacher-mail';
import { qrPng } from '@/lib/qr-png';

const test: TeacherMailTest = {
  key: 'morning-b1',
  session: 'morning',
  title: 'Einstufungstest B1 Tag 1',
  course: 'B1',
  checks: 'A2',
  minutes: 30,
  code: '4511',
  classes: [{ label: 'B1.1', group: 'Gruppe 1', room: 'Berlin', teacher: 'Tanja M.', startsAt: '09:00' }],
  qrSrc: 'cid:qr-morning-b1',
};

describe('the teachers’ mail', () => {
  it('carries the text, each test’s code and QR code, and the guide', () => {
    const html = teacherMailHtml({ subject: 'Betreff', heading: 'Einstufungstest am Montag, 26. Oktober', intro: 'Hallo zusammen,\n\nViele Grüße', tests: [test], logoSrc: 'cid:casa-logo' });
    expect(html).toContain('4511');
    expect(html).toContain('src="cid:qr-morning-b1"');
    expect(html).toContain('B1.1</b> · Gruppe 1 · Berlin · Tanja M. · 09:00');
    expect(html).toContain('Während des Tests · 30 Minuten');
    expect(html).not.toContain('kein Urteil');
  });

  it('escapes the office’s text and shows no code before the test is opened', () => {
    const html = teacherMailHtml({ subject: '<b>', heading: 'x', intro: '<script>alert(1)</script>', tests: [{ ...test, code: null }], logoSrc: 'cid:casa-logo' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('····');
  });

  it('draws the QR code as a PNG a mail client shows', () => {
    const png = Buffer.from(qrPng('https://neu.casa-bremen.de/test?kurs=b1'), 'base64');
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
  });
});
