import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

/**
 * The share image of a page (2026-10-10): its own title on CASA's ground, with
 * the logo and the logo stripe, instead of one generic picture for every page.
 * `createPublicMetadata` points og:image and twitter:image here with the page's
 * title and language. Served as /og.png so the request router leaves it alone
 * (src/proxy.ts skips paths with a file extension).
 *
 * The headline face is the site's Playfair Display, fetched from Google Fonts
 * once per server process; if that fails the image still renders, in the
 * bundled sans.
 */

const INK = '#111827';
const MUTED = '#46536a';
const GROUND = '#f3f6f9';

let logo: Promise<string> | null = null;
let serif: Promise<ArrayBuffer | null> | null = null;

const loadLogo = () =>
  (logo ??= readFile(path.join(process.cwd(), 'public/brand/casa-logo.png')).then((file) => `data:image/png;base64,${file.toString('base64')}`));

const loadSerif = () =>
  (serif ??= (async () => {
    try {
      const css = await (await fetch('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; casa-og)' },
      })).text();
      const url = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
      return url ? await (await fetch(url)).arrayBuffer() : null;
    } catch {
      return null;
    }
  })());

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? 'CASA Bremen').slice(0, 110);
  const de = searchParams.get('locale') !== 'en';
  const [logoSrc, serifData] = await Promise.all([loadLogo(), loadSerif()]);
  const size = title.length > 70 ? 54 : title.length > 45 ? 64 : 76;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: GROUND, padding: '64px 72px 0', fontFamily: 'Geist' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img, next/image does not apply */}
        <img src={logoSrc} width={347} height={98} alt="" />
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: serifData ? 'Playfair' : 'Geist', fontSize: size, fontWeight: 600, lineHeight: 1.12, color: INK, maxWidth: 1000 }}>{title}</div>
          <div style={{ marginTop: 28, fontSize: 28, color: MUTED }}>
            {de ? 'Gemeinnützige Sprachschule in Bremen · seit 1983' : 'Non-profit language school in Bremen · since 1983'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 30, fontSize: 26, color: '#00739e' }}>
          <span>casa-bremen.de</span>
        </div>
        <div style={{ display: 'flex', height: 14, margin: '0 -72px' }}>
          <div style={{ flex: 1, background: '#e30613' }} />
          <div style={{ flex: 1, background: '#009fe3' }} />
          <div style={{ flex: 1, background: '#ffd500' }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: serifData ? [{ name: 'Playfair', data: serifData, weight: 600, style: 'normal' }] : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800' },
    }
  );
}
