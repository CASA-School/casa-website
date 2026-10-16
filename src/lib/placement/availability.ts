/**
 * Whether CASA's own placement test is open on this deployment.
 *
 * Decided 2026-10-01: the test is not finished, so the public site goes back to
 * the Klett placement tests and our own test stays in development. The landing
 * page at /placement-test (/anmeldung/einstufungstest) is always public and
 * shows the Klett tests; this switch guards everything that belongs to our own
 * test — the runner, the result page and all six /api/placement handlers.
 *
 * On in local development and the e2e suite, off on a production build. To open
 * it on a deployment, set CASA_ENABLE_PLACEMENT_TEST=true (read per request, no
 * rebuild); remove the variable to close it again.
 */
export function placementTestEnabled(): boolean {
  const flag = process.env.CASA_ENABLE_PLACEMENT_TEST?.trim().toLowerCase();

  if (flag) {
    return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
  }

  return process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production';
}

/**
 * Whether a deployment has opened the test on purpose (CASA_ENABLE_PLACEMENT_TEST), not by the
 * development default. The workspace shows its review queue in the rail and on the overview only
 * then (Rahman, 2026-10-16: an item for a test nobody sits is not part of the team's day), so the
 * rail on a laptop is the rail the team sees. The screens themselves stay reachable by address.
 */
export function placementTestSwitchedOn(): boolean {
  const flag = process.env.CASA_ENABLE_PLACEMENT_TEST?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
}
