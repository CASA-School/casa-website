import { describe, expect, it } from 'vitest';

import { ADJUSTABLE, MODULE_LABELS, roleDefault } from '../access';

/** Accommodation (0060): the team places learners and answers where they live — staff add and change, deleting is full. */
describe('accommodation access', () => {
  it('is a module with its own label', () => {
    expect(MODULE_LABELS.accommodation).toEqual({ de: 'Unterkünfte', en: 'Accommodation' });
  });

  it('lets colleagues add and change, and owners and administrators delete', () => {
    expect(roleDefault('staff').accommodation).toBe('edit');
    expect(roleDefault('admin').accommodation).toBe('full');
    expect(roleDefault('owner').accommodation).toBe('full');
  });

  it('can be adjusted per person on the accounts screen', () => {
    expect(ADJUSTABLE).toContain('accommodation');
  });
});
