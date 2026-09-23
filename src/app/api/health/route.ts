import { apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * Liveness, for Container Apps HTTP probes and uptime checks. No probe points
 * here yet: infra/azure/deploy.sh configures none (docs/AZURE_DEPLOYMENT_PLAN.md).
 * On the public hosts only; the admin host rewrites it into the workspace.
 *
 * Answers from the Node process alone: no database call, so a slow or
 * unreachable database cannot take every replica out of rotation (the public
 * site runs without one), and nothing about the configuration is reported.
 */
export function GET() {
  const response = apiSuccess({ status: 'ok' });
  response.headers.set('cache-control', 'no-store');
  return response;
}
