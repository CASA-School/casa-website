import { afterEach, describe, expect, it, vi } from 'vitest';

import { signatureFor } from '../mail-signature';

const SITE = 'https://casa-signaturen.vercel.app';
const signatures = {
  'info@casa-bremen.de': `<div>Ihr CASA-Team <img src="${SITE}/casa-logo.png"></div>`,
  'r.shafiee@casa-bremen.de': `<div>Rahman Shafiee <img src="${SITE}/casa-logo.png"> <img src="${SITE}/instagram-icon.png"></div>`,
};
const images = { 'casa-logo.png': 'iVBORlogo', 'instagram-icon.png': 'data:image/png;base64,iVBORinsta' };

function serve(ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (!ok) return new Response('', { status: 503 });
      return new Response(JSON.stringify(url.endsWith('signatures.json') ? signatures : images), { status: 200 });
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('the CASA signature for mail the workspace sends', () => {
  it('is the colleague’s own, its pictures inline for the mail and from the site for the preview', async () => {
    serve();
    const s = await signatureFor('R.Shafiee@casa-bremen.de');
    expect(s?.owner).toBe('own');
    expect(s?.html).toContain(`${SITE}/casa-logo.png`);
    expect(s?.mailHtml).toContain('cid:sig-casa-logo.png');
    expect(s?.mailHtml).toContain('cid:sig-instagram.png');
    expect(s?.mailHtml).not.toContain(SITE);
    expect(s?.attachments.map((a) => [a.contentId, a.contentBytes])).toEqual([
      ['sig-casa-logo.png', 'iVBORlogo'],
      ['sig-instagram.png', 'iVBORinsta'],
    ]);
  });

  it('is the office’s for a colleague without one, and none when the site cannot be reached', async () => {
    serve();
    expect((await signatureFor('new.colleague@casa-bremen.de'))?.owner).toBe('office');
    serve(false);
    expect(await signatureFor('r.shafiee@casa-bremen.de')).toBeNull();
  });
});
