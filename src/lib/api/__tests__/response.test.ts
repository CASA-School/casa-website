import { describe, expect, it } from 'vitest';

import { apiError, apiSuccess } from '@/lib/api/response';

describe('api response helpers', () => {
  it('wraps successful data in the shared API envelope', async () => {
    const response = apiSuccess({ ok: true }, 201);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      data: { ok: true },
      error: null,
    });
  });

  it('wraps errors in the shared API envelope', async () => {
    const response = apiError('bad_request', 'Invalid request.', 400);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      data: null,
      error: {
        code: 'bad_request',
        message: 'Invalid request.',
      },
    });
  });
});
