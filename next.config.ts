import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

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
    ];
  },
  // Next 16.3 blocks cross-origin requests to dev-server resources by default.
  // Playwright drives the dev server over 127.0.0.1:3001, which the dev server
  // treats as a different origin to localhost, so its own JS chunks get blocked
  // and every interactive test fails. Loopback only; has no effect on a build.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
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

