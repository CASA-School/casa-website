/**
 * Internal review surfaces (design system showcase, design alternatives,
 * experimental landing pages) are not part of the public site.
 *
 * `noindex` metadata is a crawler hint, not access control — these routes were
 * reachable by direct URL in production. They now 404 unless explicitly enabled.
 *
 * Enabled by default on local dev and Vercel previews, so review workflows and
 * `docs/EXPERIMENTAL_LANDING_PAGES.md` keep working. To expose them on a
 * production deployment, set CASA_ENABLE_INTERNAL_SURFACES=true.
 */
export function internalSurfacesEnabled(): boolean {
  const flag = process.env.CASA_ENABLE_INTERNAL_SURFACES?.trim().toLowerCase();

  if (flag) {
    return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
  }

  return process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production';
}
