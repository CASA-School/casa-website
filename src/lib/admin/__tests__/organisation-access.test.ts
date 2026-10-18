import { describe, expect, it } from 'vitest';

import { ADJUSTABLE, MODULE_LABELS, roleDefault } from '../access';

/** Organisations (0057): the team's daily work — staff add and change, deleting is full. */
describe('organisations access', () => {
  it('is a module with its own label', () => {
    expect(MODULE_LABELS.organisations).toEqual({ de: 'Organisationen', en: 'Organisations' });
  });

  it('lets colleagues add and change, and owners and administrators delete', () => {
    expect(roleDefault('staff').organisations).toBe('edit');
    expect(roleDefault('admin').organisations).toBe('full');
    expect(roleDefault('owner').organisations).toBe('full');
  });

  it('can be adjusted per person on the accounts screen', () => {
    expect(ADJUSTABLE).toContain('organisations');
  });
});
