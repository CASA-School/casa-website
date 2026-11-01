import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin/guard', () => ({ requireModule: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/admin/i18n.server', () => ({ getI18n: async () => ({ lang: 'en', t: (_de: string, en: string) => en }) }));
vi.mock('@/lib/admin/site-stats', () => ({
  STAT_RANGES: [7, 30, 90],
  siteTotals: async () => ({ visits: 10, mobileShare: 0.5 }),
  viewsByDay: async () => [], topPages: async () => [], sources: async () => [], languages: async () => [],
  campaigns: async () => [], visitorCountries: async () => [], displayedLanguages: async () => [{ locale: 'en', count: 8 }],
  leads: async () => [{ kind: 'course', count: 3 }, { kind: 'exam', count: 2 }],
  registrants: async () => ({ ages: [], nationalities: [] }),
  registrationMetrics: async () => [],
}));
import StatisticsPage from './page';

describe('statistics', () => {
  it('shows recorded registrations while disabled tracking is not a zero funnel', async () => {
    vi.stubEnv('REGISTRATION_METRICS', '');
    try {
      const markup = renderToStaticMarkup(await StatisticsPage({ searchParams: Promise.resolve({}) }));
      expect(markup).toContain('Course registrations');
      expect(markup).toContain('Exam registrations');
      expect(markup).toContain('Step measurement is not enabled');
      expect(markup).toContain('Displayed website language');
      expect(markup).not.toContain('Visits ending in an enquiry');
    } finally { vi.unstubAllEnvs(); }
  });
});
