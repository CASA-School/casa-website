import { describe, expect, it } from 'vitest';

import { resolveAccess } from '../access';
import { parseFeedbackContext, sameOrigin, workspacePath } from '../feedback';
import { buildFeedbackMail } from '../feedback-mail';
import { describeBrowser, feedbackImageType } from '../feedback-shared';
import type { FeedbackDetail } from '../feedback';

describe('feedback (0112)', () => {
  it('knows a picture by its first bytes, never by its name or declared type', () => {
    expect(feedbackImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(feedbackImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(feedbackImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
    // An SVG, an HTML page or a PDF dressed as a screenshot is refused.
    expect(feedbackImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(feedbackImageType(new TextEncoder().encode('<!doctype html>'))).toBeNull();
    expect(feedbackImageType(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
    expect(feedbackImageType(new Uint8Array([]))).toBeNull();
  });

  it('names the browser in a few words', () => {
    expect(describeBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')).toBe('Chrome 141 · macOS');
    expect(describeBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0')).toBe('Edge 141 · Windows');
    expect(describeBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15')).toBe('Safari 18 · macOS');
    expect(describeBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('Firefox 131 · Windows');
    expect(describeBrowser(undefined)).toBe('');
  });

  it('keeps only a workspace address as the page it was sent from', () => {
    expect(workspacePath('/admin/registrations/4f9c?tab=letters')).toBe('/admin/registrations/4f9c?tab=letters');
    expect(workspacePath('/admin')).toBe('/admin');
    expect(workspacePath('https://evil.example/admin')).toBeNull();
    expect(workspacePath('//evil.example/admin')).toBeNull();
    expect(workspacePath('/admin//evil.example')).toBeNull();
    expect(workspacePath('/administrator')).toBeNull();
    expect(workspacePath('/en/courses')).toBeNull();
    expect(workspacePath(42)).toBeNull();
  });

  it('reads the context field by field and drops the rest', () => {
    const context = parseFeedbackContext(
      JSON.stringify({ viewport: '1440 × 900', lang: 'de', errors: [{ message: 'boom', at: '2026-10-31T10:00:00Z' }], password: 'x', lang2: 'en' })
    );
    expect(context).toEqual({ viewport: '1440 × 900', lang: 'de', errors: [{ message: 'boom', at: '2026-10-31T10:00:00Z' }] });
    expect(parseFeedbackContext('not json')).toEqual({});
    expect(parseFeedbackContext(JSON.stringify({ lang: 'fr' }))).toEqual({});
    expect(parseFeedbackContext('x'.repeat(20_000))).toEqual({});
  });

  it('refuses a post from another site', () => {
    const request = (origin: string | null, host = 'admin.casa-bremen.de') =>
      new Request('https://admin.casa-bremen.de/admin/feedback/send', { method: 'POST', headers: { host, ...(origin ? { origin } : {}) } });
    expect(sameOrigin(request('https://admin.casa-bremen.de'))).toBe(true);
    expect(sameOrigin(request(null))).toBe(true);
    expect(sameOrigin(request('https://evil.example'))).toBe(false);
    expect(sameOrigin(request('null'))).toBe(false);
  });

  it('lets every colleague send, and opens everyone else’s only to management', () => {
    expect(resolveAccess('staff', []).feedback).toBe('none');
    expect(resolveAccess('staff', []).overview).toBe('view');
    expect(resolveAccess('admin', []).feedback).toBe('full');
    expect(resolveAccess('owner', []).feedback).toBe('full');
    expect(resolveAccess('staff', [{ module: 'feedback', level: 'edit' }]).feedback).toBe('edit');
  });

  const feedback: FeedbackDetail = {
    id: '614a9480-9146-443d-b3af-d5a5b9460f8c',
    number: 7,
    kind: 'missing',
    message: 'In FileMaker sehe ich die <Zahlungen> hier.\nZweite Zeile',
    pagePath: '/admin/bookings/123',
    pageTitle: 'Buchungen',
    context: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Safari/537.36', viewport: '1440 × 900' },
    senderId: null,
    senderName: 'Meike Muster',
    senderEmail: 'meike@casa-bremen.de',
    status: 'new',
    assignedTo: null,
    answer: null,
    answeredAt: null,
    answeredBy: null,
    senderSeenAt: null,
    mailedAt: null,
    submittedAt: new Date('2026-10-31T09:30:00Z'),
    files: [],
  };

  it('writes the mail to admin@ with the text escaped and a link onto the admin host', () => {
    const mail = buildFeedbackMail(feedback, []);
    expect(mail.subject).toBe('Feedback #7 · Fehlt hier · Buchungen');
    expect(mail.html).toContain('In FileMaker sehe ich die &lt;Zahlungen&gt; hier.<br>Zweite Zeile');
    expect(mail.html).not.toContain('<Zahlungen>');
    expect(mail.html).toContain('https://admin.casa-bremen.de/feedback/614a9480-9146-443d-b3af-d5a5b9460f8c');
    expect(mail.html).toContain('https://admin.casa-bremen.de/bookings/123');
    expect(mail.html).toContain('Chrome 141 · Windows');
    expect(mail.attachments).toEqual([]);
  });

  it('carries the screenshots inline while the mail stays small enough for Graph, and names the rest', () => {
    const picture = (bytes: number) => ({ contentType: 'image/png', bytes: Buffer.alloc(bytes, 1) });
    const mail = buildFeedbackMail(feedback, [picture(900_000), picture(900_000), picture(900_000)]);
    expect(mail.attachments.map((a) => a.contentId)).toEqual(['shot-1', 'shot-2']);
    expect(mail.html).toContain('cid:shot-1');
    expect(mail.html).toContain('Ein weiterer Screenshot im Workspace.');
  });
});
