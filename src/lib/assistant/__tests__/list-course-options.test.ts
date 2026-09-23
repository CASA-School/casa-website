import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listCourseOptions } from '@/lib/assistant/tools/list-course-options';
import { getCoursePath } from '@/lib/content/course-routes';

/*
 * The assistant's course cards against a fixed clock, in fallback mode.
 *
 * On Wednesday 23 September 2026 both evening terms (from 24 and 25 August)
 * are under way and can be joined; the card said "Nächster Start: Wird
 * angekündigt", telling a learner to wait for a course they could join today.
 */
const EVENING_HREF = getCoursePath('evening-german');

async function eveningCard(locale: 'en' | 'de') {
  const cards = await listCourseOptions({ schedule: 'evening', level: 'B1' }, locale, 6);
  return cards.find((card) => card.href === EVENING_HREF);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-23T10:00:00+02:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('assistant course card dates', () => {
  it('says an evening term under way can be joined, not that its start is to be announced', async () => {
    const de = await eveningCard('de');
    const en = await eveningCard('en');

    expect(de?.meta).toContainEqual({ label: 'Einstieg', value: 'Jederzeit möglich' });
    expect(en?.meta).toContainEqual({ label: 'Joining', value: 'Any time' });
    for (const card of [de, en]) {
      expect(JSON.stringify(card?.meta)).not.toMatch(/Nächster Start|Next start|Wird angekündigt|To be announced/);
    }
  });

  it('gives the start date before the evening term begins', async () => {
    vi.setSystemTime(new Date('2026-08-10T10:00:00+02:00'));

    expect((await eveningCard('de'))?.meta).toContainEqual({ label: 'Nächster Start', value: '24. Aug. 2026' });
  });

  it('states no date once no evening term is left to join or start', async () => {
    // Both published evening terms end by 17 December.
    vi.setSystemTime(new Date('2026-12-20T10:00:00+01:00'));

    const card = await eveningCard('en');

    expect(card).toBeDefined();
    expect(card!.meta.map((entry) => entry.label)).not.toContain('Next start');
    expect(card!.meta.map((entry) => entry.label)).not.toContain('Joining');
    expect(JSON.stringify(card!.meta)).not.toMatch(/To be announced/);
  });
});
