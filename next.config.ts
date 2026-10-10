import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { legacyRedirectRules } from './src/i18n/legacy-redirects';

/**
 * Sent on every response: pages, route handlers, `_next/static` and `public/`.
 *
 * `frame-ancestors 'none'` is the only CSP directive on purpose. A script-src
 * policy needs a nonce or hash strategy for Next's inline scripts, and a wrong
 * one breaks the site; framing is the risk that matters now, because the
 * workspace's confirmation dialogs sit on a host that could otherwise be framed.
 *
 * HSTS without `includeSubDomains`: that flag would bind every casa-bremen.de
 * subdomain, including the old site and the student app, to HTTPS for a year,
 * and none of them is this deployment's to promise.
 */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];

const EDITOR_ORIGINS = ["'self'", 'https://admin.casa-bremen.de', process.env.CMS_EDITOR_ORIGIN].filter(Boolean).join(' ');

/** Draft mode only: the editor's preview may be framed by the workspace. */
const EDITOR_FRAME_HEADERS = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: `frame-ancestors ${EDITOR_ORIGINS}` },
];

/**
 * The hosts a search engine may index, as Next matches a `host` condition: the
 * Host header without its port, lower-cased, against `^(…)$`.
 *
 * Everything else answers `noindex`: the admin host, the Container Apps FQDN
 * that keeps serving after cutover, a staging hostname, localhost. Set here
 * rather than in src/proxy.ts because the proxy matcher skips files, and
 * /robots.txt, /sitemap.xml and the images in public/ need the header too.
 */
const INDEXABLE_HOSTS = '(www\\.)?casa-bremen\\.de';

const nextConfig: NextConfig = {
  typedRoutes: false,
  poweredByHeader: false,
  /*
   * Required by the container image.
   *
   * Traces the exact files the server needs and emits `.next/standalone` with
   * its own minimal node_modules, so the runtime stage of the Dockerfile copies
   * a directory instead of installing dependencies. Without it the image has to
   * carry the full production tree. The site runs only as that image, on Azure
   * Container Apps (docs/AZURE_DEPLOYMENT_PLAN.md).
   */
  output: 'standalone',
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        source: '/:path*',
        missing: [{ type: 'host', value: INDEXABLE_HOSTS }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      /*
       * The website editor frames the public page (docs/WEBSITE_EDITOR.md). Only
       * a request in draft mode may be framed, and only by this site or the
       * workspace's host: the draft cookie exists only after /api/cms/preview
       * checked a token the workspace signed. A public visitor never has it and
       * keeps `frame-ancestors 'none'`. Listed last, so these two keys win.
       */
      {
        source: '/:path*',
        has: [{ type: 'cookie', key: '__prerender_bypass' }],
        headers: EDITOR_FRAME_HEADERS,
      },
      { source: '/api/cms/preview', headers: EDITOR_FRAME_HEADERS },
    ];
  },
  // The old casa-bremen.de's URLs → their pages here (src/i18n/legacy-redirects.ts).
  // Here rather than in the proxy: Next applies these to every path, and many old
  // URLs end in .php or .pdf, which the proxy matcher skips.
  async redirects() {
    return legacyRedirectRules();
  },
  // Next 16.3 blocks cross-origin requests to dev-server resources by default.
  // Playwright drives the dev server over 127.0.0.1:3001, which the dev server
  // treats as a different origin to localhost, so its own JS chunks get blocked
  // and every interactive test fails. Loopback only; has no effect on a build.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    /*
     * WebP only (2026-10-09). AVIF came first in this list, so every browser got
     * AVIF, and AVIF is slow to encode: on the container's 0.5 vCPU the first
     * request for one 1920px photograph took 3.8 s (then 0.15 s from the cache).
     * WebP encodes several times faster at a few KB more, and every browser we
     * support takes it. deploy.sh warms the cache after each release as well.
     */
    formats: ['image/webp'],
    /*
     * 30 is for the media halo (src/components/ui/media-frame.tsx), which
     * requests a second copy of each photograph at `sizes="64px"` purely to
     * blur it to 34px. Next 16 rejects any `quality` not listed here — without
     * the 30 entry the optimizer logs
     * `next-image-unconfigured-qualities` on every halo and serves 75 instead,
     * which is bytes nobody can see. 75 stays because it is Next's default and
     * every non-halo image relies on it.
     */
    qualities: [30, 75],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

