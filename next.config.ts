import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  /*
   * Required by the container image, ignored by Vercel.
   *
   * Traces the exact files the server needs and emits `.next/standalone` with
   * its own minimal node_modules, so the runtime stage of the Dockerfile copies
   * a directory instead of installing dependencies. Without it the image has to
   * carry the full production tree.
   *
   * Vercel does not need this and does not use it — it builds with its own
   * adapter — so setting it here costs the Vercel deploy nothing while the Azure
   * Container App depends on it.
   */
  output: 'standalone',
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

