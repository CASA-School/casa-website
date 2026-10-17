import { describe, expect, it } from 'vitest';

import { ADJUSTABLE, resolveAccess, roleDefault } from '../access';

/** The staff register and its private part (0039): management's, given to a colleague per person. */
describe('staff register access', () => {
  it('belongs to owners and administrators', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(roleDefault(role).staff).toBe('full');
      expect(roleDefault(role).staff_private).toBe('full');
    }
  });

  it('is closed to colleagues by default', () => {
    expect(roleDefault('staff').staff).toBe('none');
    expect(roleDefault('staff').staff_private).toBe('none');
  });

  it('is opened one part at a time on the accounts screen', () => {
    expect(ADJUSTABLE).toContain('staff');
    expect(ADJUSTABLE).toContain('staff_private');
    const finance = resolveAccess('staff', [{ module: 'staff_private', level: 'edit' }]);
    expect(finance.staff_private).toBe('edit');
    expect(finance.staff).toBe('none');
  });
});
