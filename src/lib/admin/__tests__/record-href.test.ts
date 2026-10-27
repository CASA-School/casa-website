import { describe, expect, it } from 'vitest';

import { resolveAccess } from '../access';
import { recordFromPath, recordHref, recordHrefFor } from '../record-href';

const ID = '3f2b8c1e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';

describe('recordHref', () => {
  it('gives each kind of record one address', () => {
    expect(recordHref('person', ID)).toBe(`/admin/people/${ID}`);
    expect(recordHref('room', ID)).toBe(`/admin/settings/rooms/${ID}`);
    expect(recordHref('course', ID, { group: 2 })).toBe(`/admin/catalogue/courses/${ID}/2`);
    expect(recordHref('course', ID, { group: 1 })).toBe(`/admin/catalogue/courses/${ID}`);
    expect(recordHref('staff', ID, { query: 'tab=teaching' })).toBe(`/admin/staff/${ID}?tab=teaching`);
  });

  it('links only for a colleague who may open the record', () => {
    const staff = { access: resolveAccess('staff', []) };
    expect(recordHrefFor(staff, 'person', ID)).toBe(`/admin/people/${ID}`);
    // `staff` accounts do not hold Staff, Rooms or Offers by default (docs/ADMIN_WORKSPACE.md §Roles).
    expect(recordHrefFor(staff, 'staff', ID)).toBeNull();
    expect(recordHrefFor(staff, 'room', ID)).toBeNull();
    expect(recordHrefFor(staff, 'person', null)).toBeNull();
    const admin = { access: resolveAccess('admin', []) };
    expect(recordHrefFor(admin, 'room', ID)).toBe(`/admin/settings/rooms/${ID}`);
  });
});

describe('recordFromPath', () => {
  it('knows which record a page shows, most specific first', () => {
    expect(recordFromPath(`/admin/catalogue/courses/${ID}/3`)).toEqual({ kind: 'course', id: ID });
    expect(recordFromPath(`/admin/catalogue/exams/${ID}`)).toEqual({ kind: 'exam', id: ID });
    expect(recordFromPath(`/admin/catalogue/${ID}`)).toEqual({ kind: 'start', id: ID });
    expect(recordFromPath(`/admin/registrations/exam/${ID}`)).toEqual({ kind: 'exam_registration', id: ID });
    expect(recordFromPath(`/admin/people/${ID.toUpperCase()}`)).toEqual({ kind: 'person', id: ID });
  });

  it('is nothing for a list or a record’s sub-page', () => {
    expect(recordFromPath('/admin/people')).toBeNull();
    expect(recordFromPath(`/admin/bookings/${ID}/letter`)).toBeNull();
    expect(recordFromPath('/admin/catalogue/waitlist')).toBeNull();
  });
});
