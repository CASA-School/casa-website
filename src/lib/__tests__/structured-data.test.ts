import { describe, expect, it } from 'vitest';

import type { CourseInstanceRow, ExamSessionRow } from '@/lib/content/types';
import { breadcrumbList, courseNode, examGraph, jobPostingNode, organizationId, organizationNode } from '@/lib/structured-data';

const instance = (start: string, end: string, days: string[], time: string): CourseInstanceRow => ({
  id: `i-${start}`,
  course_type_id: 'c',
  start_date: start,
  end_date: end,
  capacity: 15,
  schedule: { days, time },
  location: null,
  status: 'scheduled',
  created_at: '',
  updated_at: '',
});

describe('structured data', () => {
  it('describes CASA once, with a postal address search engines can read', () => {
    const org = organizationNode('de');
    expect(org['@id']).toBe(organizationId());
    expect(org.address).toMatchObject({ streetAddress: 'Am Dobben 14–16', postalCode: '28203', addressLocality: 'Bremen', addressCountry: 'DE' });
    expect(org.geo).toMatchObject({ latitude: 53.0792514, longitude: 8.8208139 });
    expect(org.foundingDate).toBe('1983');
    expect(org.description).toMatch(/Gemeinnützige Sprachschule/);
    expect(organizationNode('en').description).toMatch(/Non-profit language school/);
  });

  it('gives a course its price and its dated, scheduled terms', () => {
    const node = courseNode({
      locale: 'de',
      path: '/courses/intensive-german',
      name: 'Intensivkurse',
      description: 'Deutsch lernen',
      levelMin: 'A1',
      levelMax: 'C1',
      price: 520,
      currency: 'EUR',
      instances: [instance('2026-10-26', '2026-12-18', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], '09:00-12:30')],
    });
    expect(node.url).toBe('https://casa-bremen.de/sprachkurse/deutsch-intensiv');
    expect(node.provider).toEqual({ '@id': organizationId() });
    expect(node.offers).toMatchObject({ category: 'Paid', price: 520, priceCurrency: 'EUR' });
    expect(node.hasCourseInstance[0]).toMatchObject({
      courseMode: 'Onsite',
      startDate: '2026-10-26',
      courseSchedule: { byDay: expect.arrayContaining(['https://schema.org/Friday']), startTime: '09:00', endTime: '12:30' },
    });
  });

  it('leaves the offer out of a course priced on request', () => {
    const node = courseNode({ locale: 'en', path: '/courses/german-for-groups', name: 'Groups', description: '', levelMin: null, levelMax: null, price: null, currency: 'EUR', instances: [] });
    expect(node).not.toHaveProperty('offers');
    expect(node.hasCourseInstance).toHaveLength(1);
  });

  it('points an exam at its public address, not the internal /exams path', () => {
    const session: ExamSessionRow = {
      id: 's1',
      exam_type_id: 'e',
      starts_at: '2026-11-13T08:00:00.000Z',
      ends_at: '2026-11-13T16:00:00.000Z',
      registration_deadline: '2026-10-12',
      capacity: 28,
      fee_override: null,
      status: 'scheduled',
      created_at: '',
      updated_at: '',
    };
    const graph = examGraph({ locale: 'de', path: '/exams/b2', name: 'telc Deutsch B2', description: '', level: 'B2', fee: 190, currency: 'EUR', sessions: [session] });
    const [credential, event] = graph['@graph'] as Record<string, unknown>[];
    expect(credential.url).toBe('https://casa-bremen.de/pruefungszentrum/telc-deutsch-b2');
    expect(event).toMatchObject({ '@type': 'Event', startDate: session.starts_at, offers: { price: 190, validThrough: '2026-10-12' } });
  });

  it('lists the breadcrumb trail with each page in its language', () => {
    const list = breadcrumbList([{ label: 'Home', href: '/' }, { label: 'Courses', href: '/courses' }, { label: 'Evening courses' }], 'en');
    expect(list.itemListElement.map((item) => ('item' in item ? item.item : null))).toEqual(['https://casa-bremen.de/en', 'https://casa-bremen.de/en/courses', null]);
  });

  it('reads part-time and full-time from the posting', () => {
    const job = jobPostingNode({ locale: 'de', path: '/careers/daf', title: 'DaF-Lehrkraft', descriptionHtml: '<p>x</p>', employmentType: 'Part-time / full-time', postedAt: '2026-08-12T00:00:00Z', closesAt: null });
    expect(job.employmentType).toEqual(['PART_TIME', 'FULL_TIME']);
    expect(job.datePosted).toBe('2026-08-12');
  });
});
