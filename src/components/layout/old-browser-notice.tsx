import { say } from '@/lib/cms/copy';
import type { ContentLocale } from '@/lib/content/types';

/**
 * A line at the top of the page for a browser too old for the site.
 *
 * The site's CSS needs Safari 16.4, Chrome or Edge 111, or Firefox 128 (2023–24;
 * Tailwind 4: cascade layers, @property, color-mix). Older browsers, and Internet
 * Explorer, which Microsoft retired in 2022 and which runs none of the site's
 * JavaScript, would show a page with its styles half applied and no word why.
 * This says why. It is hidden by default; a few lines of ES5, which even IE 11
 * runs, unhide it when the browser lacks what the site needs. Inline styles,
 * because the stylesheet is exactly what such a browser cannot read.
 * docs/RESPONSIVE_AND_BROWSERS.md.
 */
const CHECK = `(function(){var el=document.getElementById('casa-old-browser');if(!el)return;try{var ok=!!(window.CSS&&CSS.supports&&CSS.supports('color','color-mix(in srgb, red 50%, blue)')&&CSS.supports('selector(:has(a))')&&typeof window.CSSPropertyRule!=='undefined');if(!ok)el.removeAttribute('hidden')}catch(e){el.removeAttribute('hidden')}})();`;

export function OldBrowserNotice({ locale }: { locale: ContentLocale }) {
  return (
    <>
      <div
        id="casa-old-browser"
        hidden
        role="alert"
        suppressHydrationWarning
        style={{
          padding: '12px 16px',
          background: '#fff4c2',
          color: '#14213d',
          font: '15px/1.5 Arial, Helvetica, sans-serif',
          textAlign: 'center',
          borderBottom: '1px solid #e8d27a',
        }}
      >
        {say(
          locale,
          'Dein Browser ist zu alt für diese Website, deshalb wird manches falsch angezeigt. Bitte aktualisiere ihn oder nutze Chrome, Edge, Firefox oder Safari.',
          'Your browser is too old for this website, so parts of it will look wrong. Please update it, or use Chrome, Edge, Firefox or Safari.'
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: CHECK }} />
    </>
  );
}
