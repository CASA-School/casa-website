import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query: mocks.query, queryFirst: vi.fn() }));

import { recentActivity } from '../activity';
import { getRecentInbound } from '../overview';

afterEach(() => vi.clearAllMocks());

/**
 * The Activity screen is open to every colleague and job applications are not
 * (access.ts: `staff` holds Activity, not Applications). Its two feeds leave
 * applicants out unless the caller says the viewer may see them — and leaving
 * them out is the default, so a new caller that forgets fails closed.
 */
describe('job applications on the Activity screen', () => {
  it('are left out of the arrivals list unless asked for', async () => {
    mocks.query.mockResolvedValue([]);

    await getRecentInbound(8);
    await getRecentInbound(8, { includeApplications: true });

    const [[sql, hidden], [, shown]] = mocks.query.mock.calls;
    expect(sql).toMatch(/FROM career_applications a\s+WHERE \$2::boolean/);
    expect(hidden).toEqual([8, false]);
    expect(shown).toEqual([8, true]);
  });

  it('are left out of the trail unless asked for', async () => {
    mocks.query.mockResolvedValue([]);

    await recentActivity(200);
    await recentActivity(200, { includeApplications: true });

    const [[sql, hidden], [, shown]] = mocks.query.mock.calls;
    expect(sql).toContain("WHERE $2::boolean OR entity <> 'career_application'");
    expect(hidden).toEqual([200, false]);
    expect(shown).toEqual([200, true]);
  });
});
