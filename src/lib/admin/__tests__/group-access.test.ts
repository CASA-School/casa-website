import { describe, expect, it } from 'vitest';

import { ADJUSTABLE, MODULE_LABELS, roleDefault } from '../access';

/** Group visits (0058): the team books and houses their participants — staff add and change, deleting is full. */
describe('groups access', () => {
  it('is a module with its own label', () => {
    expect(MODULE_LABELS.groups).toEqual({ de: 'Gruppen', en: 'Groups' });
  });

  it('lets colleagues add and change, and owners and administrators delete', () => {
    expect(roleDefault('staff').groups).toBe('edit');
    expect(roleDefault('admin').groups).toBe('full');
    expect(roleDefault('owner').groups).toBe('full');
  });

  it('can be adjusted per person on the accounts screen', () => {
    expect(ADJUSTABLE).toContain('groups');
  });
});
