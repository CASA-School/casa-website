import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/db', () => ({ query: mocks.query }));

import { requestBridgeRun } from '../bridge-trigger.server';

const JOB = '/subscriptions/s/resourceGroups/rg/providers/Microsoft.App/jobs/caj-casa-website-schoolman';

describe('starting the SchoolMan bridge when the copy changed', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('SCHOOLMAN_BRIDGE_JOB', JOB);
    vi.stubEnv('IDENTITY_ENDPOINT', 'http://identity.local/token');
    vi.stubEnv('IDENTITY_HEADER', 'h');
    vi.stubGlobal('fetch', fetchMock);
    mocks.query.mockReset();
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does nothing where the job is not configured', async () => {
    vi.stubEnv('SCHOOLMAN_BRIDGE_JOB', '');
    expect(await requestBridgeRun()).toBe('off');
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('asks Azure for no second run while one is going on or was just asked for', async () => {
    mocks.query.mockResolvedValueOnce([]);
    expect(await requestBridgeRun()).toBe('running');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts the job with the managed identity', async () => {
    mocks.query.mockResolvedValueOnce([{ ok: true }]);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't' }))).mockResolvedValueOnce(new Response('{}', { status: 202 }));
    expect(await requestBridgeRun()).toBe('started');
    expect(String(fetchMock.mock.calls[0][0])).toContain('resource=https%3A%2F%2Fmanagement.azure.com%2F');
    expect(fetchMock.mock.calls[1][0]).toBe(`https://management.azure.com${JOB}/start?api-version=2024-03-01`);
    expect(fetchMock.mock.calls[1][1].headers.authorization).toBe('Bearer t');
  });

  it('lets the next batch ask again when the start failed, without throwing', async () => {
    mocks.query.mockResolvedValue([{ ok: true }]);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't' }))).mockResolvedValueOnce(new Response('', { status: 403 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await requestBridgeRun()).toBe('failed');
    expect(mocks.query).toHaveBeenLastCalledWith('UPDATE schoolman_bridge_state SET requested_at = NULL');
  });
});
