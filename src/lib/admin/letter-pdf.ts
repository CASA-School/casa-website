import 'server-only';

import { headers } from 'next/headers';
import { chromium, type Browser } from 'playwright-core';

import { SESSION_COOKIE, closeRenderSession, openRenderSession, type StaffUser } from './auth';

/**
 * A letter as a PDF, exactly as „Drucken / PDF" prints it (Rahman, 2026-10-23: the letter goes with the mail
 * as a PDF). The server's own browser (Chromium, headless) opens the letter's page as the colleague who
 * sends it — a session of three minutes, closed at once — and prints it with the page's own print styles
 * (globals.css, `@page letter`). It opens the page inside the container, on `admin.localhost`, the host
 * the proxy serves the workspace on (src/proxy.ts), so no request leaves the container and every check of
 * the workspace's pages applies as it does for the colleague.
 */

async function renderOrigin(): Promise<string> {
  if (process.env.NODE_ENV === 'production') return `http://admin.localhost:${process.env.PORT ?? 3000}`;
  // `next dev`: the address the colleague's own request came in on (this laptop).
  const host = (await headers()).get('host') ?? 'localhost:3000';
  return `http://${host}`;
}

/** The PDFs of some letters, by id; the colleague must be allowed to open each one. */
export async function letterPdfs(ids: readonly string[], actor: StaffUser): Promise<Map<string, Buffer>> {
  const origin = await renderOrigin();
  const token = await openRenderSession(actor.id);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const context = await browser.newContext();
    await context.addCookies([
      { name: SESSION_COOKIE, value: token, url: origin },
      { name: 'casa_ws_lang', value: 'de', url: origin },
    ]);
    const page = await context.newPage();
    const out = new Map<string, Buffer>();
    for (const id of ids) {
      const response = await page.goto(`${origin}/admin/letters/${id}`, { waitUntil: 'networkidle', timeout: 45_000 });
      if (!response || !response.ok()) throw new Error(`letter ${id}: ${response?.status() ?? 'no answer'}`);
      await page.waitForSelector('[data-letter-print]', { state: 'attached', timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);
      out.set(id, await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    }
    return out;
  } finally {
    await browser?.close().catch(() => {});
    await closeRenderSession(token);
  }
}

/** A file name for a letter's PDF: its subject and recipient, without characters a file system refuses. */
export const pdfName = (subject: string, recipient: string) =>
  `${`${subject} ${recipient}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}.pdf`;
