import { describe, expect, it } from 'vitest';

import { levelFree, waitingAhead, type LevelPlaces } from '../booking-offer-types';
import { freePlaces, placeForNext, sessionOf } from '../waitlist';

/**
 * The waiting list's counting (docs/ADMIN_WORKSPACE.md §Waiting list): places are groups × places
 * per group, a place offered to a learner is held for them, and nothing is stored that can be
 * counted — so these rules are the whole of "full", "free" and "who is next".
 */

describe('freePlaces', () => {
  it('is what bookings and held offers leave', () => {
    expect(freePlaces({ places: 14, booked: 12, offered: 1 })).toBe(1);
    expect(freePlaces({ places: 28, booked: 14, offered: 0 })).toBe(14);
  });

  it('is never below zero: an overbooked level is simply full', () => {
    expect(freePlaces({ places: 14, booked: 15, offered: 0 })).toBe(0);
  });

  it('is none for a closed or cancelled course, whatever its numbers (audit 2026-10-17: a closed A2.1 showed 16 free)', () => {
    expect(freePlaces({ places: 16, booked: 0, offered: 0, bookable: false })).toBe(0);
    expect(freePlaces({ places: 16, booked: 0, offered: 0, cancelled: true })).toBe(0);
    expect(freePlaces({ places: 16, booked: 0, offered: 0, closed: true })).toBe(0);
    expect(placeForNext({ places: 16, booked: 0, offered: 0, waiting: 1, bookable: false })).toBe(false);
  });
});

describe('placeForNext', () => {
  it('signals only when a place is free and someone is waiting', () => {
    expect(placeForNext({ places: 14, booked: 13, offered: 0, waiting: 2 })).toBe(true);
    expect(placeForNext({ places: 14, booked: 13, offered: 0, waiting: 0 })).toBe(false);
    expect(placeForNext({ places: 14, booked: 13, offered: 1, waiting: 2 })).toBe(false);
  });
});

describe('the wizard: a held place belongs to the learner it was offered to', () => {
  const level: LevelPlaces = { places: 3, booked: 2, offered: 1, queue: ['sofia', 'daniel'], offeredTo: ['omar'] };

  it('is free to the learner it is held for, and full to everyone else', () => {
    expect(levelFree(level, 'omar')).toBe(1);
    expect(levelFree(level, 'sofia')).toBe(0);
    expect(levelFree(level)).toBe(0);
  });

  it('counts who waits in front: nobody for the held place, their place in the queue, else the whole queue', () => {
    expect(waitingAhead(level, 'omar')).toBe(0);
    expect(waitingAhead(level, 'daniel')).toBe(1);
    expect(waitingAhead(level, 'someone-new')).toBe(2);
  });
});

describe('sessionOf', () => {
  it('takes the start’s own time of day, else reads it from the schedule', () => {
    expect(sessionOf('evening', { time: '09:00-12:30' })).toBe('evening');
    expect(sessionOf(null, { time: '09:00-12:30' })).toBe('morning');
    expect(sessionOf(null, { time: '13:00-17:30' })).toBe('afternoon');
    expect(sessionOf(null, { time: '18:30-20:00' })).toBe('evening');
    expect(sessionOf(null, null)).toBeNull();
  });
});
