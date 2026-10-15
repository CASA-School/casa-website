import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { devLoginAllowed } from '../dev-login';

/**
 * The password-free sign-in exists only on `next dev`, with ADMIN_DEV_LOGIN
 * set, asked for as localhost from this machine. Each condition alone must keep
 * it shut, and the route must ask before it does anything.
 */
describe('dev login', () => {
  const on = { nodeEnv: 'development', flag: '1', host: 'localhost:3027', forwardedFor: '::ffff:127.0.0.1' };

  it('opens on next dev, with the flag, on localhost', () => {
    expect(devLoginAllowed(on)).toBe(true);
    expect(devLoginAllowed({ ...on, flag: 'r.shafiee@casa-bremen.de' })).toBe(true);
  });

  it('stays shut in production, whatever else is set', () => {
    expect(devLoginAllowed({ ...on, nodeEnv: 'production' })).toBe(false);
    expect(devLoginAllowed({ ...on, nodeEnv: 'test' })).toBe(false);
    expect(devLoginAllowed({ ...on, nodeEnv: undefined })).toBe(false);
  });

  it('stays shut without the flag', () => {
    expect(devLoginAllowed({ ...on, flag: undefined })).toBe(false);
    expect(devLoginAllowed({ ...on, flag: '' })).toBe(false);
    expect(devLoginAllowed({ ...on, flag: '0' })).toBe(false);
    expect(devLoginAllowed({ ...on, flag: 'false' })).toBe(false);
  });

  it('stays shut on any host but localhost — 127.0.0.1 keeps the real sign-in for the e2e suite', () => {
    expect(devLoginAllowed({ ...on, host: '127.0.0.1:3027' })).toBe(false);
    expect(devLoginAllowed({ ...on, host: 'admin.casa-bremen.de' })).toBe(false);
    expect(devLoginAllowed({ ...on, host: 'localhost.evil.example' })).toBe(false);
    expect(devLoginAllowed({ ...on, host: null })).toBe(false);
  });

  it('stays shut for a connection from the network, even one that names localhost', () => {
    expect(devLoginAllowed({ ...on, forwardedFor: '::ffff:192.168.0.124' })).toBe(false);
    expect(devLoginAllowed({ ...on, forwardedFor: '10.0.0.7, 127.0.0.1' })).toBe(false);
    expect(devLoginAllowed({ ...on, forwardedFor: null })).toBe(false);
    expect(devLoginAllowed({ ...on, forwardedFor: '::1' })).toBe(true);
  });

  it('is asked first by the route', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/app/(admin)/admin/dev-login/route.ts'), 'utf8');
    const body = source.slice(source.indexOf('export async function GET'));
    expect(body.indexOf('devLoginAllowedHere')).toBeGreaterThan(-1);
    expect(body.indexOf('devLoginAllowedHere')).toBeLessThan(body.indexOf('openSession'));
  });
});
