import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RegistrationCourseCatalog, RegistrationExamCatalog } from '@/lib/content/types';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/analytics/client', () => ({ trackCasaEvent: vi.fn() }));

import { CourseWizard } from '../course-wizard';
import { ExamWizard } from '../exam-wizard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Radix measures its checkbox; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const TYPE_ID = '40000000-0000-4000-8000-000000000001';
const OPTION_ID = '20000000-0000-4000-8000-000000000001';

const courseCatalog = {
  locale: 'de',
  courseTypes: [{ id: TYPE_ID, slug: 'evening-german', name: 'Abendkurs Deutsch', lessons_per_week: 6 }],
  optionsByCourseTypeId: {
    [TYPE_ID]: [{
      id: OPTION_ID, courseTypeId: TYPE_ID, dateRangeLabel: '02. Nov. 2026 - 17. Dez. 2026',
      startDate: '2026-11-02', endDate: '2026-12-17', scheduleLabel: 'Mo, Mi • 18:00-19:30',
      locationLabel: 'CASA Bremen', availableLevels: [],
    }],
  },
  defaultCourseTypeId: TYPE_ID,
  defaultOptionId: OPTION_ID,
} as unknown as RegistrationCourseCatalog;

const examCatalog = {
  locale: 'de',
  examTypes: [{ id: TYPE_ID, name: 'telc Deutsch B2', level: 'B2' }],
  optionsByExamTypeId: {
    [TYPE_ID]: [{
      id: OPTION_ID, examTypeId: TYPE_ID, startsAt: '2026-11-21T08:00:00Z', startsAtLabel: '21. Nov. 2026',
      locationLabel: 'CASA Bremen', deadlineLabel: 'Anmeldung bis 24. Okt. 2026',
    }],
  },
  defaultExamTypeId: TYPE_ID,
  defaultOptionId: OPTION_ID,
} as unknown as RegistrationExamCatalog;

// A type with no dates left, so step 1 fails on the date select, whose id is not its field name.
const courseCatalogWithoutDates = {
  ...courseCatalog,
  optionsByCourseTypeId: { [TYPE_ID]: [] },
  defaultOptionId: '',
} as unknown as RegistrationCourseCatalog;

const examCatalogWithoutDates = {
  ...examCatalog,
  optionsByExamTypeId: { [TYPE_ID]: [] },
  defaultOptionId: '',
} as unknown as RegistrationExamCatalog;

const STEP_ALERT = 'Bitte prüfen Sie die markierten Angaben.';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (label: string) =>
  [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(label))!;

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
  // zodResolver validates asynchronously; let it settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe.each([
  [
    'course',
    () => <CourseWizard catalog={courseCatalog} />,
    'Persönliche Angaben',
    () => <CourseWizard catalog={courseCatalogWithoutDates} />,
    '#course-option',
  ],
  [
    'exam',
    () => <ExamWizard catalog={examCatalog} />,
    'Persönliche Angaben',
    () => <ExamWizard catalog={examCatalogWithoutDates} />,
    '#exam-session',
  ],
])('%s registration wizard', (_, render, stepTwoHeading, renderWithoutDates, dateSelect) => {
  it('shows no invented availability tag for the selected option', async () => {
    await act(async () => root.render(render()));
    expect(container.textContent).not.toMatch(/Plätze frei|Nur wenige Plätze|Warteliste/);
  });

  it('moves focus to the new step heading and ties German errors to their fields', async () => {
    await act(async () => root.render(render()));

    await click(button('Weiter'));
    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe(stepTwoHeading);
    expect(document.activeElement).toBe(heading);

    await click(button('Weiter'));
    const firstName = container.querySelector<HTMLInputElement>('#firstName')!;
    expect(firstName.getAttribute('aria-required')).toBe('true');
    expect(firstName.getAttribute('aria-invalid')).toBe('true');
    expect(firstName.getAttribute('aria-describedby')).toBe('firstName-error');
    expect(container.querySelector('#firstName-error')?.textContent).toBe(
      'Bitte geben Sie Ihren Vornamen an (mindestens 2 Zeichen).'
    );
    expect(container.querySelector('#salutation-error')?.textContent).toBe('Bitte wählen Sie eine Anrede aus.');
    expect(container.textContent).not.toMatch(/is required|Please select/);

    // The salutation select has no form ref, so it is focused by its id.
    expect(document.activeElement).toBe(container.querySelector('#salutation'));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(STEP_ALERT);

    await click(button('Zurück'));
    expect(document.activeElement).toBe(container.querySelector('h2'));
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('focuses the first invalid field by its element id and announces the failed step', async () => {
    await act(async () => root.render(renderWithoutDates()));

    await click(button('Weiter'));
    expect(container.querySelector('h2')?.textContent).not.toBe(stepTwoHeading);
    expect(document.activeElement).toBe(container.querySelector(dateSelect));
    expect(container.querySelector(dateSelect)?.getAttribute('aria-describedby')).toMatch(/-error$/);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(STEP_ALERT);
  });

  it('carries a hidden honeypot field', async () => {
    await act(async () => root.render(render()));
    const honeypot = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('course registration wizard, accommodation', () => {
  it('caps allergies and notes at the schema bounds, since no step shows their errors', async () => {
    await act(async () => root.render(<CourseWizard catalog={courseCatalog} />));
    await click(button('Weiter'));
    await click(container.querySelector<HTMLButtonElement>('#accommodation')!);

    expect(container.querySelector<HTMLInputElement>('#allergies')?.maxLength).toBe(500);
    expect(container.querySelector<HTMLTextAreaElement>('#notes')?.maxLength).toBe(2000);
  });
});
