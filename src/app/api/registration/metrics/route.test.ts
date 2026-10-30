import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn().mockResolvedValue([]), configured: vi.fn(() => true) }));
vi.mock('@/lib/admin/db', () => ({ query: db.query, isWorkspaceDatabaseConfigured: db.configured }));
vi.mock('@/lib/api/rate-limit', () => ({ rateLimit: () => null }));
import { POST } from './route';

const event = { form: 'course', locale: 'en', event: 'started', step: 'choice' };
function request(body: unknown, origin = 'https://casa-bremen.de') {
  return new Request('https://casa-bremen.de/api/registration/metrics', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'user-agent': 'iPhone' }, body: JSON.stringify(body),
  });
}
beforeEach(() => { vi.stubEnv('REGISTRATION_METRICS', 'enabled'); db.query.mockClear(); vi.spyOn(Math, 'random').mockReturnValue(1); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('registration metrics endpoint', () => {
  it('is disabled by default', async () => {
    vi.stubEnv('REGISTRATION_METRICS', '');
    expect((await POST(request(event))).status).toBe(404);
    expect(db.query).not.toHaveBeenCalled();
  });
  it('rejects cross-origin requests and personal data', async () => {
    expect((await POST(request(event, 'https://other.example'))).status).toBe(403);
    expect((await POST(request({ ...event, email: 'person@example.com' }))).status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
  it('stores only allowlisted aggregate dimensions', async () => {
    expect((await POST(request(event))).status).toBe(200);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(['course', 'en', 'mobile', 'started', 'choice', 'none']);
  });
});
