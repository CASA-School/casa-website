import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveAccess } from '@/lib/admin/access';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  file: vi.fn(),
  log: vi.fn(),
  configured: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({ getStaffUser: mocks.user }));
vi.mock('@/lib/admin/careers', () => ({ getApplicationFile: mocks.file }));
vi.mock('@/lib/admin/activity', () => ({ logActivity: mocks.log }));
vi.mock('@/lib/admin/db', () => ({ isWorkspaceDatabaseConfigured: mocks.configured }));

import { GET } from './route';

const ID = '79b868c5-c66b-4288-9be6-000000000099';

const staffUser = (
  role: StaffRole,
  exceptions: { module: string; level: string }[] = []
): StaffUser => ({
  id: 'u1',
  email: 'colleague@casa-bremen.de',
  name: 'Colleague',
  role,
  access: resolveAccess(role, exceptions),
});

const download = () =>
  GET(new Request(`http://localhost/admin/applications/${ID}/cv`), {
    params: Promise.resolve({ id: ID }),
  });

beforeEach(() => {
  mocks.configured.mockReturnValue(true);
  mocks.log.mockResolvedValue(undefined);
  mocks.file.mockResolvedValue({
    fileName: 'Lebenslauf Müller.pdf',
    mimeType: 'application/pdf',
    content: Buffer.from('%PDF-1.7\n'),
  });
});

afterEach(() => vi.clearAllMocks());

describe('CV download', () => {
  it('is not found for a colleague without the Applications module', async () => {
    // The `staff` default: Activity at edit, which lists applications, and
    // Applications at none.
    mocks.user.mockResolvedValue(staffUser('staff'));

    const response = await download();

    expect(response.status).toBe(404);
    expect(mocks.file).not.toHaveBeenCalled();
    expect(mocks.log).not.toHaveBeenCalled();
  });

  it('serves the file, and logs it, once the module is granted', async () => {
    mocks.user.mockResolvedValue(
      staffUser('staff', [{ module: 'applications', level: 'view' }])
    );

    const response = await download();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'cv_downloaded' }));
  });

  it('names the download after what the bytes are, not what the uploader called it', async () => {
    mocks.user.mockResolvedValue(staffUser('admin'));
    mocks.file.mockResolvedValue({
      fileName: 'Lebenslauf.pdf.exe',
      mimeType: 'application/pdf',
      content: Buffer.from('MZ\x00\x00'),
    });

    const disposition = (await download()).headers.get('content-disposition') ?? '';

    expect(disposition).toContain('attachment;');
    expect(disposition).toContain('filename="Lebenslauf.pdf.bin"');
    expect(disposition).not.toContain('.exe');
  });

  it('keeps an umlaut in the RFC 5987 name and never lets a quote into the header', async () => {
    mocks.user.mockResolvedValue(staffUser('owner'));
    mocks.file.mockResolvedValue({
      fileName: 'CV "Jörg"\r\nX-Injected: 1.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('%PDF-1.4\n'),
    });

    const disposition = (await download()).headers.get('content-disposition') ?? '';

    expect(disposition).toBe(
      `attachment; filename="CV _J_rg_X-Injected_ 1.pdf"; filename*=UTF-8''${encodeURIComponent('CV _Jörg_X-Injected_ 1.pdf')}`
    );
  });
});
