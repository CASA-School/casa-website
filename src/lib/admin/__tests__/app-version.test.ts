import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const readFile=vi.hoisted(()=>vi.fn());
vi.mock('node:fs/promises',async importOriginal=>{
  const actual=await importOriginal<typeof import('node:fs/promises')>();
  const load=(...args:Parameters<typeof actual.readFile>)=>String(args[0]).endsWith('/.next/BUILD_ID')?readFile(...args):actual.readFile(...args);
  return {...actual,readFile:load,default:{...actual,readFile:load}};
});
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{vi.resetModules();readFile.mockReset();});
describe('workspace build identity',()=>{
  it('uses a stable development identity without reading an old production artifact',async()=>{
    vi.stubEnv('NODE_ENV','development');
    const {workspaceVersion}=await import('../app-version');
    expect(await workspaceVersion()).toBe('development');
    expect(readFile).not.toHaveBeenCalled();
  });
  it('reads the real immutable Next build once per process',async()=>{
    vi.stubEnv('NODE_ENV','production');readFile.mockResolvedValue('release-one\n');
    const {workspaceVersion}=await import('../app-version');
    expect(await workspaceVersion()).toBe('release-one');expect(await workspaceVersion()).toBe('release-one');
    expect(readFile).toHaveBeenCalledTimes(1);
  });
  it('leaves updates unavailable rather than inventing a version when the build file is absent',async()=>{
    vi.stubEnv('NODE_ENV','production');readFile.mockRejectedValue(new Error('missing'));
    expect(await (await import('../app-version')).workspaceVersion()).toBeNull();
  });
});
