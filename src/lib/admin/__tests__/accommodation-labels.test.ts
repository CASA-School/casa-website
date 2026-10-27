import { describe, expect, it } from 'vitest';

import { reservationTitle, roomLabel } from '../accommodation-labels';

/** A room's number in its place (0095): shown when its name does not already say it. */
describe('roomLabel', () => {
  it('keeps a name that holds the number', () => {
    expect(roomLabel('de', { name: 'Zimmer 3', number: 3 })).toBe('Zimmer 3');
    expect(roomLabel('de', { name: 'Hof 12 Balkon', number: 12 })).toBe('Hof 12 Balkon');
    expect(roomLabel('de', { name: 'Zimmer 03', number: 3 })).toBe('Zimmer 03');
  });

  it('adds the number to a name that does not say it', () => {
    expect(roomLabel('de', { name: 'klein', number: 2 })).toBe('Zimmer 2 · klein');
    expect(roomLabel('en', { name: 'klein', number: 2 })).toBe('Room 2 · klein');
    // 12 is not 1.
    expect(roomLabel('de', { name: 'Zimmer 12', number: 1 })).toBe('Zimmer 1 · Zimmer 12');
  });

  it('names a room by its number alone, and leaves one without either as it is', () => {
    expect(roomLabel('de', { name: null, number: 4 })).toBe('Zimmer 4');
    expect(roomLabel('de', { name: null, number: null })).toBeNull();
    expect(roomLabel('de', { name: 'groß', number: null })).toBe('groß');
  });
});

/** Beds held for a group visit or for a course term (0095). */
describe('reservationTitle', () => {
  it('names a course term by its part of the day', () => {
    expect(reservationTitle('de', { purpose: 'course_term', courseSession: 'morning', groupName: null })).toBe('Kurs · Vormittag');
    expect(reservationTitle('en', { purpose: 'course_term', courseSession: 'afternoon', groupName: null })).toBe('Course · Afternoon');
    expect(reservationTitle('de', { purpose: 'course_term', courseSession: null, groupName: null })).toBe('Kurs');
  });

  it('names a group visit by its group', () => {
    expect(reservationTitle('de', { purpose: 'group_visit', courseSession: null, groupName: 'Viborg 26' })).toBe('Viborg 26');
    expect(reservationTitle('de', { purpose: 'group_visit', courseSession: null, groupName: null })).toBe('Gruppe');
  });
});
