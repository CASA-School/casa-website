import type { MetadataRoute } from 'next';

/*
 * The web app manifest: the name and icon a phone shows when someone adds the site to their
 * home screen, and what Android and search engines read as the site's identity. The icons are
 * built by scripts/media/build_icons.py from the logo's sail, sun and wave.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CASA Bremen – Internationale Sprachschule',
    short_name: 'CASA Bremen',
    description:
      'Gemeinnützige Sprachschule in Bremen: Deutschkurse von A1 bis C1, telc-Prüfungen und Unterkunft.',
    lang: 'de',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#009fe3',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
