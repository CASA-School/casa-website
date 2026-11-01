import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({getStaffUser:vi.fn(),workspaceVersion:vi.fn()}));
vi.mock('../auth',()=>({getStaffUser:mocks.getStaffUser}));
vi.mock('../app-version',()=>({workspaceVersion:mocks.workspaceVersion}));
import {GET} from '@/app/(admin)/admin/app-version/route';
beforeEach(()=>vi.resetAllMocks());
describe('private workspace version endpoint',()=>{
  it('refuses an expired or absent session and prevents cached auth responses',async()=>{
    mocks.getStaffUser.mockResolvedValue(null);
    const result=await GET();expect(result.status).toBe(401);expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect((await result.json()).data).toBeNull();expect(mocks.workspaceVersion).not.toHaveBeenCalled();
  });
  it('returns only build identity in the normal API envelope',async()=>{
    mocks.getStaffUser.mockResolvedValue({id:'staff'});mocks.workspaceVersion.mockResolvedValue('release-two');
    const result=await GET();expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(await result.json()).toEqual({data:{version:'release-two'},error:null});
  });
  it('does not expose internal failures or turn them into a new-version signal',async()=>{
    mocks.getStaffUser.mockRejectedValue(new Error('private connection details'));
    const result=await GET();expect(result.status).toBe(503);expect((await result.json()).error.message).not.toContain('private');
    expect(result.headers.get('cache-control')).toBe('private, no-store');
  });
});
