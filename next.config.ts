import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  // Next 16.3 blocks cross-origin requests to dev-server resources by default.
  // Playwright drives the dev server over 127.0.0.1:3001, which the dev server
  // treats as a different origin to localhost, so its own JS chunks get blocked
  // and every interactive test fails. Loopback only; has no effect on a build.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

