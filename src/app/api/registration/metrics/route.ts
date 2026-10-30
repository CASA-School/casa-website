import { registrationMetricSchema } from '@/lib/analytics/registration-metrics';
import { isWorkspaceDatabaseConfigured, query } from '@/lib/admin/db';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(request: Request) {
  if (process.env.REGISTRATION_METRICS !== 'enabled') return apiError('disabled', 'Not enabled', 404);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return apiError('origin', 'Invalid origin', 403);
  const limited = rateLimit(request, 'registration-metrics', { limit: 120, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length') ?? 0) > 512) {
    return apiError('invalid', 'Invalid request', 400);
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 512) return apiError('invalid', 'Invalid request', 400);
    body = JSON.parse(text);
  } catch { return apiError('invalid', 'Invalid request', 400); }
  const parsed = registrationMetricSchema.safeParse(body);
  if (!parsed.success) return apiError('invalid', 'Invalid request', 400);
  if (!isWorkspaceDatabaseConfigured()) return apiError('unavailable', 'Unavailable', 503);
  const { form, locale, event, step, category } = parsed.data;
  const agent = request.headers.get('user-agent') ?? '';
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent) ? 'tablet' : /Mobi|iPhone|Android/i.test(agent) ? 'mobile' : 'desktop';
  try {
    await query(`INSERT INTO registration_metric_counts (day, form, locale, device, event, step, category, count)
      VALUES ((now() AT TIME ZONE 'Europe/Berlin')::date, $1, $2, $3, $4, $5, $6, 1)
      ON CONFLICT (day, form, locale, device, event, step, category)
      DO UPDATE SET count = registration_metric_counts.count + 1`, [form, locale, device, event, step, category]);
    if (Math.random() < 0.002) await query(`DELETE FROM registration_metric_counts WHERE day < (now() AT TIME ZONE 'Europe/Berlin')::date - interval '13 months'`);
    return apiSuccess({ recorded: true });
  } catch {
    console.error('[registration metrics] could not record aggregate');
    return apiError('unavailable', 'Unavailable', 503);
  }
}
